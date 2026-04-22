---
layout: ../../layouts/BlogPost.astro
title: "Zettelkasten powered AI tutor: improving retrieval"
date: "April 15, 2026"
description: "How AI agentic engineering works: build and ship fast, then iterate."
---

## Making the Retrieval Real

### Replacing Fuzzy Matching with TF-IDF

The original retrieval step was using `difflib` fuzzy matching to compare the user's question against note titles. It could only retrieve notes whose titles overlapped with the user's phrasing. A question like "how do I wrap a function to modify its behavior" has almost no title overlap with the `Decorator` note, so the system would miss it.

The replacement is a small TF-IDF (term frequency-inverse document frequency). It works by using an index of vectorized notes (each Zettelkasten note becomes a vector) and ranking the result of a cosine similarity search against the user query. For a more detailed explanation see below (1). The wikilink brackets were stripped so link text were searchable. The title was repeated three times in the indexed text to create a bounded but meaningful title boost.

The TF-IDF is used underneath the pre-existing graph layer. It works on the retrieval, or similarity search, per se, while the graph leverages the wikilinks from the Zettelkasten notes to expand that. This solution was chosen over a vector database with semantic retrieval due to being litghter and simpler. Chunking, embedding, and storing tokenized vectors would be overkill, and it would likely nudge up the costs of the fly.io deployment.

### Writing Integration Tests That Can Actually Fail

It's worth describing in more detail the diverse-phrasing tests. I wrote multiple differently-phrased questions that should all ground on the same note. "How does a for loop work", "iterating over a list with a loop", "what is the syntax for looping through a sequence" — all three should retrieve `For loop`. These tests are more demanding than a single exact match, and some of them fail.

The failures are marked `xfail` rather than deleted, which is a deliberate choice. An `xfail` in pytest is a documented known weakness: the test describes something the system should do, is expected to fail for now, and will automatically turn into an unexpected pass the moment retrieval improves enough to handle it. It is a better artifact than a comment.

Let's not forget the markdown notes grounding this retrieval are far from neat. Those are messy texts, haphazardly written while I skimmed through some Python basics lessons. They can even contain mistakes. But that certainly reflects how other data is represented out there, laying dormant waiting for some apt engineer figure out a clever system to feed them to AI.

### Catching Bugs With End-to-End Tests

I added a second layer of tests that go through the HTTP stack using FastAPI's `TestClient` with the real 127-note corpus. The Anthropic client is mocked — these tests are about retrieval grounding, not about what Claude says — but everything else is real. The key assertion in these tests is does the `system` argument that gets passed to the Claude API call actually contain relevant content from the notes?

These e2e tests caught something the integration tests missed. One integration test checked whether `Inheritance` appeared in the top 3 retrieval results for "how does inheritance work" — and it did, in third place, so the test passed. But the prompt building code was taking only the top result. Third place never reached the system prompt. So the same query was passing the integration test but failing the e2e test. 

### Adding Observability

I finally added logging and re-ran some of the same queries from e2e and integration testings with `curl` commands, as a sort of ultimate deployed e2e testing. The logging emited two lines per request. Showing what was **going** to Claude API and what was **coming** from it. I deployed, opened the frontend on my browser, and watched `fly logs` in a terminal.

These confirmed everything the e2e tests had shown. They also illustrated the how critical is to be aware of the responsibility of the developer when building on top of an API and ending user data to it.
