---
layout: ../../layouts/BlogPost.astro
title: "Zettelkasten powered AI tutor: defining user session"
date: "April 19, 2026"
description: "How AI agentic engineering works: build and ship fast, then iterate."
---

## Intro

(a recap from previous episode: `./zettelkasten-mvp.md`)

What happened here was agent autonomy in its best. The agentic bias - rooted in its LLM training data - took care of the implementation without regard for the design contract - or lack thereof. And by doing things that 'people normally do', the agent missed my use case completely. This is a good lesson in AI Agentic engineering: the more common/established your actions, the better the agent is in assisting you - this comes directly from how they're built, i.e. their LLM training data biases (their matrixes' weights for the nerdies out there). Anyways, in the end this diagnosis meant that to fix this issue, we need to get back to the design phase, because that's where it went wrong.

## Serving 2 Masters

(talk about how you found this issue, it bears significance. I'm an engineer: I evaluate the tradeoff between shipping speed and product readiness; I did ship this and for the layman there was absolutely nothing wrong with it, only my engineer eyes could see, under the hood, the absolute innadequacy of some of its system components; my engineer skills were - moreover - able to then go back 'to the drawing board' and design fixes/corrections, much like the first implementation, following the 4 phases of SWE from my custom made skill)

+The original abuse-control and user identification system had two mechanisms that did not know about each other - both innadequate, btw. Token budgets were tracked in SQLite, keyed by a `user_id` that the frontend generated and sent in the request body. Rate limiting was handled by `slowapi`, keyed by client IP. They used different identity signals, answered different questions, and had been bolted together without anyone asking whether they needed to coexist - or just to exist at all.+

The right question from a design standpoint was "what is this system actually trying to defend against?". A quintessential design decision. And for my use-case I'd say: "Not much". I'm not worried about DDoS attacks, and my Claude API tokens are prepaid so, if they ever cross the $5 threshold of credits I put there months ago, then I'll start thinking about it (very unlikely at the time of this writing). It's kind of not surprising this is the part where the agent got more wrong when you think about it. This is the most essentially human-centric decision. This is like a business decision, like those engineering tradeoffs from the book "Designing Data Intensive Applications" from Martin (Something). There's no right/wrong answer. Of course it's the hardest type of question for an agent.

+For a public, anonymous Python tutor on a personal portfolio site, the answer I found is this: someone burning through a prepaid Anthropic API balance is the only thing that bears consideration. That is the whole threat model. Not DDoS. Not credential stuffing. Not session hijacking. Someone — probably not even maliciously — hammers the endpoint and I wake up to an empty account.+

And what was it that the agent had already built without my consent? Rate limiting at 10 requests per minute per IP! Oh yes, it is solving a problem that this product is not close to have. +If someone is genuinely trying to exhaust my API budget, rotating their IP defeats the rate limiter anyway. And if they are not trying to do that — if they are just a curious visitor — a rate limiter is a bad experience for no gain.+

The SQLite budget system was less out of place, but implemented in a way that did not make any sense. Here's how it was implemented: each user gets a token ceiling, and once they hit it they stop. Until now it's alright, right? Well, the problem was the persistence layer was self-contradictory. SQLite is a durable store. But the identity keying into it — a UUID stored in the browser's localStorage — is not durable at all. Clear your browser storage, reload the page, and you have a fresh identity with a fresh budget, and a brand new row in the SQLite table. The database was faithfully tracking usage for an identity that would inevitably disappear, and stacking rows upon rows of ephemeral, meaningless data. It was fake.

## Re-Design

(let's nail down the design more firmly, the next paragraph kind of talks about the design decisions but always from the perspective of implementation, we could sort of reflect it here, but at a more abstract, high-level way. Thinking in terms of boxes and arrows kind of stuff.)

The fix follows directly from the diagnosis. The identity is ephemeral, so the budget should be too. Drop SQLite entirely, replace it with a plain Python dict on the application state. When the server restarts, budgets reset. When a user clears their localStorage, they get a new UUID and a fresh budget. Both of these are fine. The stakes do not require anything stronger. What matters is that one active session cannot exhaust the balance before someone else gets to use it — and a per-UUID in-memory ceiling handles that correctly and honestly.

The diff was mostly deletions. `db.py` went away entirely — about 90 lines of SQLite setup, connection management, and row-factory logic that existed solely to serve a use case that could be covered by a 30-line module with no dependencies. `slowapi` came out of the dependencies. The `/api/usage/{user_id}` endpoint was removed — it had never been called by the frontend, confirmed by reading the actual client code. What remained was a small `budget.py` with three functions, a plain dict as state, and a lifespan that no longer needed to open or close a database connection.

The budget defaults were also corrected. The original values — 2 million input tokens and 500,000 output tokens per user — were larger than the entire prepaid balance. A single user hitting the ceiling would cost more than the total account credit. The new values, 250,000 input and 60,000 output, are calibrated against actual Sonnet pricing: a user who burns through both limits costs roughly $1.65. That is a defensible worst case for a portfolio product, and it leaves room for multiple people to use the thing before the balance is gone.

What I find most interesting about this round is not the code. The code is small. What is interesting is the step where the framing had to change. The guidance document diagnosed the right symptom — inconsistency between two identity schemes — but the natural next move was to design a better identity system. That would have produced a more sophisticated answer to a question the product was not actually asking. The better move was to stop and ask what the product actually needed, and then be willing to delete things that were answering the wrong question.

That is a different engineering judgment than making something more robust. It is the judgment to make something more honest, even when honesty means less code.

## Conclusion

This entire post didn't bring up anything to be proud of, in terms of implementation. It first showed some shameful AI slop, and by the end, it implemented a ridiculously simple solution that wouldn't be applicable for any business, or serious enterprise. What's rich about this experience is the engineering displayed. It takes a highly skilled SWE to control with such degree of clarity the different stages of software development, balancing tradeoffs so consciously. It is still - and perhaps more than ever - an extremely valuable skill. AI can't nor will it ever be able to do that. If there's one thing that these agents lack is agency. They really can't make decisions that are human-centric by nature.
