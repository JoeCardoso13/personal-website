---
layout: ../../layouts/BlogPost.astro
title: "Zettelkasten powered AI tutor: improving retrieval"
date: "April 15, 2026"
description: "The Python tutor was live but the retrieval was broken. Here's how I fixed it and the tests that made the fix trustworthy."
---

## Intro

The [previous post]() shipped the Python tutor MVP: a FastAPI service that grounds Claude in my Obsidian notes by fuzzy-matching user questions against note titles. However, observability analysis showed the match failing often — when it did, the graph had nothing to expand from, and the model answered from its own training data instead of my vault. The retrieval needed a rewrite.

## From Fuzzy Matching to TF-IDF

The original retrieval step was using fuzzy matching (`difflib`) to compare the user's question against note titles. Under the hood, `difflib` computes a ratio by finding the longest common substring between two strings, recursively matching the flanking leftovers, then dividing matched characters by total characters. Against the title `Decorator`, a query like "how do I wrap a function to modify its behavior" shares almost no character runs — the score lands around 0.2, below the 0.6 threshold the algorithm requires. No match means no note, no graph traversal, and no vault content injected into the system prompt.

The replacement is a small TF-IDF (term frequency-inverse document frequency) <a href="#fn-1" id="fn-1-ref" class="fn-num">(1)</a>. It works by using an index of vectorized notes (each Zettelkasten note becomes a vector) and ranking the result of a cosine similarity search against the user query. Wikilink brackets were stripped so the linked terms remained searchable. The title was repeated three times in the indexed text to create a bounded but meaningful title boost.

```python
def _searchable_content(title: str, content: str) -> str:
    cleaned_content = WIKILINK_RE.sub(r"\1", content)
    return f"{title} {title} {title} {cleaned_content}"
```

Here is how both systems performed across four real queries against the 127-note vault:

| Query | difflib top match (score) | difflib result | TF-IDF result | TF-IDF score |
|---|---|---|---|---|
| "how do I wrap a function to modify its behavior" | `Function definition` (0.46) | no match | `Decorator` ✓ | 0.38 |
| "What is this decorator thing?" | `Arithmetic operation` (0.49) | no match | `Decorator` ✓ | 0.31 |
| "what's the deal with subclasses and superclasses?" | `Explicit coercion` (0.27) | no match | `Self` ✗ | 0.09 |
| "how do I loop over a list?" | `Method resolution order` (0.41) | no match | `For loop` ✓ | 0.32 |
| "how do I make a copy of a list without changing the original?" | `Ordered comparison` (0.30) | no match | `Shallow copy` ✓ | 0.29 |
| "what does super() do?" | `Arithmetic operation` (0.39) | no match | `Super` ✓ | 0.39 |
| "how do I define a class that inherits from another?" | `Ordered comparison` (0.35) | no match | `Inheritance` ✓ | 0.17 |

The second row is worth pausing on: `difflib` ranked `Arithmetic operation` above `Decorator` for a query that contains the word "decorator". Character-level matching is semantically blind. Every difflib score in the table falls below its 0.6 cutoff — so the result column is all no matches. The third row is where TF-IDF also fails — but notice the score: 0.09, below TF-IDF's 0.10 confidence floor.

Semantic retrieval with embeddings would work well here. Chunking, embedding, and persisting vectors would have added too much infrastructure cost and complexity to a service running on a small [fly.io](https://fly.io/) machine. TF-IDF runs in memory, rebuilds instantly on startup, and adds no external dependencies. For now that's enough, but revamping the retrieval to use embeddings is something I'd definitely like to try.

## Testing & Debugging

### Writing Tests That Can Fail

That `Self` ✗ in the table above — score 0.09, below the 0.10 confidence floor — points to a piece of engineering worth mentioning. The classification of a failure itself can be an engineering decision — "is this a bug or not?" is one example. A failure can be a regression — something broke — or it can be a known limitation of the current design. The `Self` result isn't wrong because the code is broken; it's wrong because TF-IDF on a thin corpus has gaps. Naming that distinction, and documenting it in the test suite rather than deleting the test or silently lowering the threshold, is the proper engineering call.

`pytest.mark.xfail` does exactly this. If retrieval ever improves enough to handle the case, pytest will flag it as an unexpected pass. Until then, it counts as documented, expected behavior — not a failure of the suite, but a fact about the system.

```python
@pytest.mark.xfail(
    reason="Inheritance ranks 3rd (score 0.078) behind Implicit coercion and MRO. "
    "Test was passing by checking top-3, but ask() uses k=1. Retrieval improvement needed.",
    strict=False,
)
def test_inheritance_direct(self, real_index):
    results = real_index.search("how does inheritance work", k=1)
    assert results[0][0] == "Inheritance", (
        f"Expected 'Inheritance' at top-1, got {results[0][0]!r}"
    )
```

### What the Logs Caught

As per the directives in my [joedevflow](https://github.com/JoeCardoso13/joedevflow) skill, after the system is built and properly tested, a maintenance phase follows. It's characterized by cycles of logging, finding, and fixing. Here the integration test for `Inheritance` had been passing. It shouldn't have.

The AI agent had committed the classic slop: writing lenient tests. The testing code called `index.search(query, k=3)`, asserting `Inheritance` appeared somewhere in the top three results. It did — at rank 3. But in the implementation code `ask()` calls `index.search(question, k=1)`. One result. Top of the list. Integration tests never touched prompt building, so the test never saw the gap. The e2e test did. By sending a real HTTP request through the whole stack and asserting on the actual `system` argument passed to the mocked Claude client, it added the necessary layer of visibility. Here's what the logs around the Claude API calls showed:

```
2026-04-14T12:37:02Z app[148e03d7f09018] ewr [info] retrieval topic='Implicit coercion' score=0.091 neighbors=6 question='how does inheritance work?'
2026-04-14T12:37:06Z app[148e03d7f09018] ewr [info] chat user=b8861b07 q_len=26 tokens=2335+125 3.9s topic='Implicit coercion' score=0.091 neighbors=6
```

I fixed the test from `k=3` to `k=1`, which makes it correctly fail, then marked it `xfail`. The full suite ended up here:

| Suite | Passed | Xfailed | Total |
|---|---|---|---|
| Unit (`test_retrieval.py`) | 99 | 0 | 99 |
| Integration (`test_integration.py`) | 34 | 9 | 43 |
| e2e (`test_e2e.py`) | 35 | 7 | 42 |
| **Total** | **168** | **16** | **184** |

Sixteen known gaps out of 184 tests — 8.7%. For a retrieval system running on natural language against hand-written notes, that's within range.

<div class="appendix">

<a href="#fn-1-ref" id="fn-1" class="fn-num">(1)</a> TF-IDF turns each note into a weighted word vector. First, it builds a shared vocabulary from the full note corpus. Then, for each note, it measures how often each vocabulary term appears in that note. That is the term-frequency part. It also computes how distinctive each term is across the corpus by checking how many notes contain it, the inverse-document-frequency part. Common words are not manually removed; they just matter less because they appear everywhere.

Multiplying those two signals produces one TF-IDF vector per note. A user query is treated like a tiny document and mapped into the same vector space, using the same vocabulary and IDF weights. The query vector is then compared against every note vector with cosine similarity, and the highest-scoring note becomes the retrieval starting point.

</div>
