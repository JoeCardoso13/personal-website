---
layout: ../../layouts/BlogPost.astro
title: "Zettelkasten powered AI tutor: improving retrieval"
date: "April 15, 2026"
description: "The Python tutor was live but the retrieval was broken. Here's how I fixed it and the tests that made the fix trustworthy."
---

## Intro

The previous post shipped the Python tutor MVP: a FastAPI service that grounds Claude in my Obsidian notes by fuzzy-matching user questions against note titles. However, observability analysis showed the match failing often — when it did, the graph had nothing to expand from, and the model answered from its own training data instead of my vault. +This post covers the fix.+

### Replacing Fuzzy Matching with TF-IDF

The original retrieval step was using fuzzy matching (`difflib`) to compare the user's question against note titles. Under the hood, `difflib` computes a ratio by finding the longest common substring between two strings, recursively matching the flanking leftovers, then dividing matched characters by total characters. Against the title `Decorator`, a query like "how do I wrap a function to modify its behavior" shares almost no character runs — the score lands around 0.2, below the 0.6 threshold `get_close_matches` requires. No match means no note, no graph traversal, and no vault content injected into the system prompt.

The replacement is a small TF-IDF (term frequency-inverse document frequency) <a href="#fn-1" id="fn-1-ref" class="fn-num">(1)</a>. It works by using an index of vectorized notes (each Zettelkasten note becomes a vector) and ranking the result of a cosine similarity search against the user query. Wikilink brackets were stripped so the linked terms remained searchable. The title was repeated three times in the indexed text to create a bounded but meaningful title boost. Against the same query, TF-IDF returns `Decorator` as the top result with a cosine similarity of roughly 0.38. The note body uses "wrap", "function", and "behavior" — none present in the four-character title — and those terms drive the score above threshold. Before: `difflib` scored 0.2 on the title alone and returned nothing. After: TF-IDF scores across the full note body and retrieves the right note.

Here is how both systems performed across four real queries against the 127-note vault:

| Query | difflib top match (score) | difflib result | TF-IDF result | TF-IDF score |
|---|---|---|---|---|
| "how do I wrap a function to modify its behavior" | `Function definition` (0.46) | no match | `Decorator` ✓ | 0.38 |
| "What is this decorator thing?" | `Arithmetic operation` (0.49) | no match | `Decorator` ✓ | 0.31 |
| "what's the deal with subclasses and superclasses?" | `Explicit coercion` (0.27) | no match | `Self` ✗ | 0.09 |
| "how does inheritance work?" | `Inheritance` (0.60) | no match | `Implicit coercion` ✗ | 0.09 |

The second row is worth pausing on: `difflib` ranked `Arithmetic operation` above `Decorator` for a query that contains the word "decorator". Character-level matching is semantically blind. The last two rows are where TF-IDF also fails — but notice the scores: 0.09, just slightly below the 0.10 confidence floor the system uses to decide whether to trust a match. Unlike `difflib`, which either returns something or nothing, TF-IDF fails with a signal.

The TF-IDF is used **underneath** the pre-existing **graph** layer. It handles the similarity search — finding the most relevant note — while the graph leverages the wikilinks to expand on what was found. Semantic retrieval with embeddings is a valid choice for this. But I don't feel it's worth at this stage. Chunking, embedding, and persisting vectors would have added infrastructure cost and complexity to a service running on a small Fly.io machine. TF-IDF runs in memory, rebuilds instantly on startup, and adds no external dependencies. For a 128-note corpus, it's more than enough.

## Observability & Debugging

### Writing Integration Tests That Can Actually Fail

Each note has several differently-phrased queries that should all ground on it — "how does a for loop work", "iterating over a list with a loop", "what is the syntax for looping through a sequence" all targeting `For loop`. Some pass, some don't. The failures cluster around two root causes: notes thin enough that the right terms never appear in the body (the `Decorator` note is a single sentence and the word "decorator" isn't in it), and closely-named competing notes (`Class method` outscoring `Class` for "what is a class?"). Those tests are marked `xfail` rather than deleted — a documented known weakness waiting for the moment retrieval improves enough to handle it.

### Catching Bugs With End-to-End Tests

I added a second layer of tests that go through the HTTP stack using FastAPI's `TestClient` with the real 127-note corpus. The Anthropic client is mocked — these tests are about retrieval grounding, not about what Claude says — but everything else is real. The key assertion: does the `system` argument passed to the Claude API call actually contain relevant content from the notes?

One integration test checked whether `Inheritance` appeared in the top 3 retrieval results for "how does inheritance work" — and it did, in third place, so the test passed. But `ask()` only takes `k=1`. Third place never reached the system prompt. This only became visible through `fly logs` in production, where the same query was returning `Implicit coercion` at score 0.091. The integration test was checking top-3 while the real code path used top-1 — a false pass. The fix was to demote that test to `xfail`, same as the other inheritance cases. The retrieval weakness is real and documented; the test now says so honestly.

### Adding Observability

I finally added logging and re-ran some of the same queries from e2e and integration testing with `curl` commands, as a sort of ultimate deployed e2e testing. The logging emitted two lines per request: what was **going** to the Claude API and what was **coming** from it. I deployed, opened the frontend on my browser, and watched `fly logs` in a terminal.

These confirmed everything the e2e tests had shown. They also illustrated something easy to overlook: when you build on top of an external API, you are routing real user input through someone else's infrastructure.

<div class="appendix">

<a href="#fn-1-ref" id="fn-1" class="fn-num">(1)</a> TF-IDF turns each note into a weighted word vector. First, it builds a shared vocabulary from the full note corpus. Then, for each note, it measures how often each vocabulary term appears in that note. That is the term-frequency part. It also computes how distinctive each term is across the corpus by checking how many notes contain it, the inverse-document-frequency part. Common words are not manually removed; they just matter less because they appear everywhere.

Multiplying those two signals produces one TF-IDF vector per note. A user query is treated like a tiny document and mapped into the same vector space, using the same vocabulary and IDF weights. The query vector is then compared against every note vector with cosine similarity, and the highest-scoring note becomes the retrieval starting point.

</div>
