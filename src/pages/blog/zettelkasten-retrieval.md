---
layout: ../../layouts/BlogPost.astro
title: "Zettelkasten powered AI tutor: improving retrieval"
date: "April 15, 2026"
description: "The Python tutor was live but the retrieval was broken. Here's how I fixed it and the tests that made the fix trustworthy."
---

## Intro

The previous post shipped the Python tutor MVP: a FastAPI service that grounds Claude in my Obsidian notes by fuzzy-matching user questions against note titles. However, observability analysis showed the match failing often — when it did, the graph had nothing to expand from, and the model answered from its own training data instead of my vault. This post covers what changed and why.

## From Fuzzy Matching to TF-IDF

The original retrieval step was using fuzzy matching (`difflib`) to compare the user's question against note titles. Under the hood, `difflib` computes a ratio by finding the longest common substring between two strings, recursively matching the flanking leftovers, then dividing matched characters by total characters. Against the title `Decorator`, a query like "how do I wrap a function to modify its behavior" shares almost no character runs — the score lands around 0.2, below the 0.6 threshold `get_close_matches` requires. No match means no note, no graph traversal, and no vault content injected into the system prompt.

The replacement is a small TF-IDF (term frequency-inverse document frequency) <a href="#fn-1" id="fn-1-ref" class="fn-num">(1)</a>. It works by using an index of vectorized notes (each Zettelkasten note becomes a vector) and ranking the result of a cosine similarity search against the user query. Wikilink brackets were stripped so the linked terms remained searchable. The title was repeated three times in the indexed text to create a bounded but meaningful title boost.

```python
def _searchable_content(title: str, content: str) -> str:
    cleaned_content = WIKILINK_RE.sub(r"\1", content)
    return f"{title} {title} {title} {cleaned_content}"
```

Against the same query, TF-IDF returns `Decorator` as the top result with a cosine similarity of roughly 0.38. The note body uses "wrap", "function", and "behavior" — none present in the four-character title — and those terms drive the score above threshold. Before: `difflib` scored 0.2 on the title alone and returned nothing. After: TF-IDF scores across the full note body and retrieves the right note.

Here is how both systems performed across four real queries against the 127-note vault:

| Query | difflib top match (score) | difflib result | TF-IDF result | TF-IDF score |
|---|---|---|---|---|
| "how do I wrap a function to modify its behavior" | `Function definition` (0.46) | no match | `Decorator` ✓ | 0.38 |
| "What is this decorator thing?" | `Arithmetic operation` (0.49) | no match | `Decorator` ✓ | 0.31 |
| "what's the deal with subclasses and superclasses?" | `Explicit coercion` (0.27) | no match | `Self` ✗ | 0.09 |
| "how does inheritance work?" | `Inheritance` (0.60) | no match | `Implicit coercion` ✗ | 0.09 |

The second row is worth pausing on: `difflib` ranked `Arithmetic operation` above `Decorator` for a query that contains the word "decorator". Character-level matching is semantically blind. The last two rows are where TF-IDF also fails — but notice the scores: 0.09, just slightly below the 0.10 confidence floor the system uses to decide whether to trust a match. Unlike `difflib`, which either returns something or nothing, TF-IDF fails with a signal.

The TF-IDF is used **underneath** the pre-existing **graph** layer. It handles the similarity search — finding the most relevant note — while the graph leverages the wikilinks to expand on what was found. Semantic retrieval with embeddings is a valid choice for this. But not worth at this stage. Chunking, embedding, and persisting vectors would have added infrastructure cost and complexity to a service running on a small Fly.io machine. TF-IDF runs in memory, rebuilds instantly on startup, and adds no external dependencies. For a 128-note corpus, it's more than enough.

## Observability & Debugging

[We need to organize more, more coherently, these 3 subsections below (if they are to remain so)]

The test suite throws multiple phrasings at each note — "how does a for loop work", "iterating over a list with a loop", "what is the syntax for looping through a sequence" should all retrieve `For loop`. Some do. Some don't. The failures cluster around two root causes: notes thin enough that the right terms never appear in the body (the `Decorator` note is a single sentence and the word "decorator" isn't in it), and closely-named competing notes (`Class method` outscoring `Class` for "what is a class?"). Those tests are marked `xfail` rather than deleted — a documented known weakness waiting for the moment retrieval improves enough to handle it.

Here is something that can happen: an integration test passes, an e2e test on the same query fails. Not a fluke — they are checking different things. The integration test calls the retrieval index and checks whether the right note appeared anywhere in the top 3 results. The e2e test goes further: it sends a real HTTP request through the whole stack and checks whether that note's content actually made it into Claude's `system` argument. The Anthropic client is mocked, but everything up to that call is real — HTTP handling, prompt building, all of it.

`ask()` — the function that handles a user question end-to-end — calls `index.search(question, k=1)`. One result, top of the list, that's what goes into the system prompt. The integration test for "how does inheritance work" was calling `index.search(query, k=3)` and asserting that `Inheritance` appeared somewhere in the top three. It did, at rank 3. Test passed. But `ask()` never sees rank 3 — it had already stopped at rank 1. The e2e test, asserting on the actual `system` argument passed to the mocked Claude client, caught the discrepancy immediately.

The fix was two steps. First, correct the test: change `k=3` to `k=1` so it measures what production actually does. With `k=1`, it correctly fails — `Inheritance` isn't rank 1 for that query. Second, mark it `xfail`: the retrieval weakness is real, documented, and waiting for a future improvement to resolve it. The e2e test for the same query is also `xfail`. Both now say the same honest thing.

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

I finally added logging and re-ran some of the same queries from e2e and integration testing with `curl` commands, as a sort of ultimate deployed e2e testing. The logging emitted two lines per request: what was **going** to the Claude API and what was **coming** from it. I deployed, opened the frontend on my browser, and watched `fly logs` in a terminal.

| Suite | Passed | Xfailed | Total |
|---|---|---|---|
| Unit (`test_retrieval.py`) | 99 | 0 | 99 |
| Integration (`test_integration.py`) | 34 | 9 | 43 |
| e2e (`test_e2e.py`) | 35 | 7 | 42 |
| **Total** | **168** | **16** | **184** |

The logs told the story plainly. Asking "how does inheritance work?" in the deployed app produced:

```
2026-04-14T12:37:02Z app[148e03d7f09018] ewr [info] retrieval topic='Implicit coercion' score=0.091 neighbors=6 question='how does inheritance work?'
2026-04-14T12:37:06Z app[148e03d7f09018] ewr [info] chat user=b8861b07 q_len=26 tokens=2335+125 3.9s topic='Implicit coercion' score=0.091 neighbors=6
```

Wrong topic, score below the 0.10 confidence floor. The retrieval weakness the tests had been documenting was now visible in production, on a real query.

<div class="appendix">

<a href="#fn-1-ref" id="fn-1" class="fn-num">(1)</a> TF-IDF turns each note into a weighted word vector. First, it builds a shared vocabulary from the full note corpus. Then, for each note, it measures how often each vocabulary term appears in that note. That is the term-frequency part. It also computes how distinctive each term is across the corpus by checking how many notes contain it, the inverse-document-frequency part. Common words are not manually removed; they just matter less because they appear everywhere.

Multiplying those two signals produces one TF-IDF vector per note. A user query is treated like a tiny document and mapped into the same vector space, using the same vocabulary and IDF weights. The query vector is then compared against every note vector with cosine similarity, and the highest-scoring note becomes the retrieval starting point.

</div>
