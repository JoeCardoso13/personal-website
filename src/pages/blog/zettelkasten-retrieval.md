---
layout: ../../layouts/BlogPost.astro
title: "Zettelkasten powered AI tutor: improving retrieval"
date: "April 15, 2026"
description: "The Python tutor was live but the retrieval was broken. Here's how I fixed it and the tests that made the fix trustworthy."
---

## Intro

The previous post shipped the Python tutor: a FastAPI service that grounds Claude in my Obsidian notes by fuzzy-matching user questions against note titles. Observability analysis showed the match failing often — when it did, the graph had nothing to expand from, and the model answered from its own training data instead of my vault. This post covers the fix.

### Replacing Fuzzy Matching with TF-IDF

The original retrieval step was using fuzzy matching (`difflib`) to compare the user's question against note titles. Under the hood, `difflib` computes a ratio by finding the longest common substring between two strings, recursively matching the flanking leftovers, then dividing matched characters by total characters. Against the title `Decorator`, a query like "how do I wrap a function to modify its behavior" shares almost no character runs — the score lands around 0.2, below the 0.6 threshold `get_close_matches` requires. No match means no note, no graph traversal, and no vault content injected into the system prompt.

The replacement is a small TF-IDF (term frequency-inverse document frequency). It works by using an index of vectorized notes (each Zettelkasten note becomes a vector) and ranking the result of a cosine similarity search against the user query <a href="#fn-1" id="fn-1-ref" class="fn-num">(1)</a>. Wikilink brackets were stripped so the linked terms remained searchable. The title was repeated three times in the indexed text to create a bounded but meaningful title boost. Against the same query, TF-IDF returns `Decorator` as the top result with a cosine similarity of roughly 0.38. The note body uses "wrap", "function", and "behavior" — none present in the four-character title — and those terms drive the score above threshold. Before: `difflib` scored 0.2 on the title alone and returned nothing. After: TF-IDF scores across the full note body and retrieves the right note.

The TF-IDF is used **underneath** the pre-existing graph layer. It handles the similarity search — finding the most relevant note — while the graph leverages the wikilinks to expand on what was found. Semantic retrieval with embeddings was the obvious alternative, but it wasn't worth it here. Chunking, embedding, and persisting vectors would have added infrastructure cost and complexity to a service running on a small Fly.io machine. TF-IDF runs in memory, rebuilds instantly on startup, and adds no external dependencies. For a 127-note corpus, it's more than enough.

### Writing Integration Tests That Can Actually Fail

It's worth describing in more detail the diverse-phrasing tests. I wrote multiple differently-phrased questions that should all ground on the same note. "How does a for loop work", "iterating over a list with a loop", "what is the syntax for looping through a sequence" — all three should retrieve `For loop`. These tests are more demanding than a single exact match, and some of them fail.

The failures are marked `xfail` rather than deleted, which is a deliberate choice. An `xfail` in pytest is a documented known weakness: the test describes something the system should do, is expected to fail for now, and will automatically turn into an unexpected pass the moment retrieval improves enough to handle it. It is a better artifact than a comment.

Let's not forget the markdown notes grounding this retrieval are far from neat. Those are messy texts, haphazardly written while I skimmed through some Python basics lessons. They can even contain mistakes. But that certainly reflects how data is represented out there in the wild — laying dormant, waiting for someone to build a clever enough system to put it to use.

### Catching Bugs With End-to-End Tests

I added a second layer of tests that go through the HTTP stack using FastAPI's `TestClient` with the real 127-note corpus. The Anthropic client is mocked — these tests are about retrieval grounding, not about what Claude says — but everything else is real. The key assertion: does the `system` argument passed to the Claude API call actually contain relevant content from the notes?

These e2e tests caught something the integration tests missed. One integration test checked whether `Inheritance` appeared in the top 3 retrieval results for "how does inheritance work" — and it did, in third place, so the test passed. But the prompt building code was taking only the top result. Third place never reached the system prompt. So the same query was passing the integration test but failing the e2e test.

### Adding Observability

I finally added logging and re-ran some of the same queries from e2e and integration testing with `curl` commands, as a sort of ultimate deployed e2e testing. The logging emitted two lines per request: what was **going** to the Claude API and what was **coming** from it. I deployed, opened the frontend on my browser, and watched `fly logs` in a terminal.

These confirmed everything the e2e tests had shown. They also illustrated something easy to overlook: when you build on top of an external API, you are routing real user input through someone else's infrastructure.

<div class="appendix">

<a href="#fn-1-ref" id="fn-1" class="fn-num">(1)</a> The replacement is a small TF-IDF index — term frequency-inverse document frequency. At a high level, TF-IDF turns each note into a weighted word vector. First, it builds a shared vocabulary from the full note corpus. Then, for each note, it measures how often each vocabulary term appears in that note. That is the term-frequency part. It also computes how distinctive each term is across the corpus by checking how many notes contain it. That is the inverse-document-frequency part. Common words are not manually removed; they just matter less because they appear everywhere.

Multiplying those two signals produces one TF-IDF vector per note. A user query is treated like a tiny document and mapped into the same vector space, using the same vocabulary and IDF weights. The query vector is then compared against every note vector with cosine similarity, and the highest-scoring note becomes the retrieval starting point.

The graph still exists. TF-IDF replaced the brittle title-matching step, but once it selects a note, the app still uses the note graph to gather linked neighbors and inject that surrounding context into the system prompt. On the implementation side, wikilink brackets were stripped so linked terms remained searchable, and the title was repeated three times in the indexed text to create a bounded title boost.

This was intentionally lighter than semantic retrieval with embeddings or a vector database. A system this size does not need that extra infrastructure, and keeping retrieval dependency-free made it easier to test, understand, and deploy cheaply on Fly.io.

</div>
