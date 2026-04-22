---
layout: ../../layouts/BlogPost.astro
title: "Zettelkasten powered AI tutor: defining user session"
date: "April 19, 2026"
description: "How AI agentic engineering works: build and ship fast, then iterate."
---

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
