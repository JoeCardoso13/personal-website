---
layout: ../../layouts/BlogPost.astro
title: "Claude Code Tidbits: building a Zettelkasten powered AI tutor"
date: "March 26, 2026"
description: "How AI agentic engineering works: build and ship fast, then iterate."
banner: /claude-tidbits-logo.svg
---

## Why not?

I recently had a Take Home exercise in Python, fully closed book. Naturally, I leaned on my agents to help me brush up my Python skills. I already had an Obsidian Vault of notes taken in Zettelkasten style: atomic and cross-referencing. So I threw my agent in there. It worked better than I anticipated, why not host it on my website? The result was a working MVP plugged into my website: a static Astro frontend with a Svelte page talking to a Python backend deployed separately on Fly.io.

## Shipping the MVP in 3 days

The intent at first was about getting a full vertical slice live: notes on disk, retrieval logic, prompt construction, API surface, deployment, and a frontend that made the whole thing feel like a coherent experience.

At the heart of this app lies the retrieval mechanism. To start things simple, I took the fateful design decision of using a graph based system for leveraging my markdown notes. The app parses them into a graph (technology?), tries to match a user question to a note (fuzzy finding title of markdowns), then gathers nearby linked notes (how, same tech?). It injects that context into the system prompt, and sends the request to the model. This went live in 2-3 days, working fine.

But building things fast with agents, even using the [TDD agent skill that I built](), does come with tradeoffs. After inspecting the system under the hood, it was clear 2 major components were quite substandard - I'd even go as far to say they were mostly smoke-and-mirrors:

1. The retrieval layer: It did ground the model in my notes, but only at a very rudimentary level. The first retrieval step was just exact note-title matching plus `difflib` fuzzy matching - for matching user query vs Zettelkasten notes. Rarely effective in providing the model with useful context. The subsequent graph expansion step doesn't help when no node was found.
2. The user tracking system: Token usage was tracked by storing a `user_id` in a SQLite database. But this `user_id` was browser-session based. Meanwhile rate limiting was keyed by IP address. Now this is just a mess. For a portfolio website, I don't think I need rate-limiting at this time. And the token consumption has to be tracked but faking state persistence by storing session data on a database is definitely **not** the way to go.

Agents don't help only with shipping an MVP - if aptly used they can augment virtually any type of intellectual work. So they also contributed tackling these 2 issues.

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

## The Third Round: Making Identity Honest

The original abuse-control story had two mechanisms that did not know about each other. Token budgets were tracked in SQLite, keyed by a `user_id` that the frontend generated and sent in the request body. Rate limiting was handled by `slowapi`, keyed by client IP. They used different identity signals, answered different questions, and had been bolted together without anyone asking whether they needed to coexist.

The guidance document I started from called this an "identity problem." It suggested comparing approaches: server-issued session tokens, IP hashing, stable frontend UUIDs. All reasonable things to evaluate. But the framing was slightly off, and it took a few exchanges to get to the right question.

The right question was not "what is a better identity model?" It was "what is this system actually trying to defend against?"

For a public, anonymous Python tutor on a personal portfolio site, the answer is exactly one thing: someone burning through a prepaid Anthropic API balance that I cannot replenish automatically. That is the whole threat model. Not DDoS. Not credential stuffing. Not session hijacking. Someone — probably not even maliciously — hammers the endpoint and I wake up to an empty account.

Once the threat is stated that plainly, the existing architecture looks very different. Rate limiting at 10 requests per minute per IP is solving a problem that this product does not have. If someone is genuinely trying to exhaust my API budget, rotating their IP defeats the rate limiter anyway. And if they are not trying to do that — if they are just a curious visitor — a rate limiter is a bad experience for no gain. The mechanism was real code, with real tests, adding real operational surface area, and it was defending against a threat that was not there.

The SQLite budget system was the right tool for the right job, just implemented in a way that did not quite make sense. The idea was: each user gets a token ceiling, and once they hit it they stop. That is a sensible answer to the one threat that matters. The problem was the persistence layer. SQLite is a durable store. But the identity keying into it — a UUID stored in the browser's localStorage — is not durable at all. Clear your browser storage, reload the page, and you have a fresh identity with a fresh budget. The database was faithfully tracking usage for an identity that could disappear at any moment. It was persistence in service of something ephemeral.

The fix follows directly from the diagnosis. The identity is ephemeral, so the budget should be too. Drop SQLite entirely, replace it with a plain Python dict on the application state. When the server restarts, budgets reset. When a user clears their localStorage, they get a new UUID and a fresh budget. Both of these are fine. The stakes do not require anything stronger. What matters is that one active session cannot exhaust the balance before someone else gets to use it — and a per-UUID in-memory ceiling handles that correctly and honestly.

The diff was mostly deletions. `db.py` went away entirely — about 90 lines of SQLite setup, connection management, and row-factory logic that existed solely to serve a use case that could be covered by a 30-line module with no dependencies. `slowapi` came out of the dependencies. The `/api/usage/{user_id}` endpoint was removed — it had never been called by the frontend, confirmed by reading the actual client code. What remained was a small `budget.py` with three functions, a plain dict as state, and a lifespan that no longer needed to open or close a database connection.

The budget defaults were also corrected. The original values — 2 million input tokens and 500,000 output tokens per user — were larger than the entire prepaid balance. A single user hitting the ceiling would cost more than the total account credit. The new values, 250,000 input and 60,000 output, are calibrated against actual Sonnet pricing: a user who burns through both limits costs roughly $1.65. That is a defensible worst case for a portfolio product, and it leaves room for multiple people to use the thing before the balance is gone.

What I find most interesting about this round is not the code. The code is small. What is interesting is the step where the framing had to change. The guidance document diagnosed the right symptom — inconsistency between two identity schemes — but the natural next move was to design a better identity system. That would have produced a more sophisticated answer to a question the product was not actually asking. The better move was to stop and ask what the product actually needed, and then be willing to delete things that were answering the wrong question.

That is a different engineering judgment than making something more robust. It is the judgment to make something more honest, even when honesty means less code.

---

## Conclusion & Next Step: AI helps prototype + hone & Amplify w/ Ruby and JavaScript


Also, a next step I'm positive I'll do, is adding support for Ruby and JavaScript, since the Zettelkasten notes for them were already taken. This is a single-tutor architecture. That was the fastest way to ship, but it means the backend currently assumes one notes corpus, one prompt, and one tutoring flow. Expanding it into Python, JavaScript, and Ruby without multiplying Fly.io costs will require turning it into one shared tutor engine serving multiple corpora inside the same deployed app.
