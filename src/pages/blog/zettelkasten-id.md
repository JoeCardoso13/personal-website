---
layout: ../../layouts/BlogPost.astro
title: "Zettelkasten powered AI tutor: defining user session"
date: "April 19, 2026"
description: "How AI agentic engineering works: build and ship fast, then iterate."
---

## Intro

In the [Zettelkasten powered AI tutor: shipping an MVP]() post, I built the first version of a Zettelkasten-powered Python tutor — a tool that reads my own notes and uses them to coach me through topics. The MVP shipped fast, but fast shipping left something behind: +the agent had made a set of design decisions I hadn't explicitly authorized (not completely authorized is true, but maybe not the best way to put it... I had actually - in a way - chosen to neglect it, in order to speed up an MVP live on my website)+. This post is about finding that, understanding why it happened, and correcting it.

+What happened here was agent autonomy at its best. The agentic bias - rooted in its LLM training data - took care of the implementation without regard for the design contract - or lack thereof. And by doing things that 'people normally do', the agent missed my use case completely. This is a good lesson in AI Agentic engineering: the more common/established your actions, the better the agent is in assisting you - this comes directly from how they're built, i.e. their LLM training data biases. Anyway, in the end this diagnosis meant that to fix this issue, we needed to get back to the design phase, because that's where it went wrong.(this entire paragraph feels off/sloppy, let's try to rewrite it completely? Maybe anchoring in the "lesson in AI agentic engineering"? About 80% of this paragraph needs to be changed and/or eliminated)(also, the next paragraph/section begins with "I shipped it.". What would go well with that? Ending this paragraph?)+

## The slop

I shipped it. To any visitor, the tutor works — questions answered, responses on-screen, nothing visibly broken. +But then I went back and read what had been built (it's good, but I gotta hint somehow that my senior engineer gut knew this was advisable, i.e. only by being a brilliant engineer I knew that although it all looked good on the surface it probably wasn't under the hood)+. +Two components caught my eye immediately. The components that handle abuse control and user identity didn't make sense. They were structurally wrong in ways that only matter if you care about what the code is actually doing — and I do. (alright, this needs to be reworded on a more professional tone)(moreover, let's be careful with being confusing: 2 components is usually how I refer to the user id system - I lump the DDoS prevention and token cap together - and the poor retrieval. Here is more like 2 slops, 2 things... Perhaps is best not to number it at all, so it doesn't get confused with the 2 components I just mentioned)+

Token budgets were tracked in SQLite, keyed by a `user_id` the frontend generated. Rate limiting via `slowapi`, keyed by client IP. Neither had been justified.

In hindsight, it makes sense that this is what the agent got most wrong. It's the less black-and-white, of the system design decision made. It reminds me of the tradeoffs discussed in *Designing Data-Intensive Applications* by Martin Kleppmann. There's no objectively correct answer. Agents work best in a right-or-wrong world, this is why I built the [joedevflow]() skill, leveraging TDD so that implementation becomes a red-to-green flip.

The right question from a design standpoint was "what is this system actually trying to defend against?" — and for this use case, the answer was: not much. +I'm not worried about DDoS attacks, and my Claude API tokens are prepaid so, if they ever cross the $5 threshold of credits I put there months ago, then I'll start thinking about it (very unlikely at the time of this writing) (can we add a more professional tone here?)+.

For a public, anonymous Python tutor on a personal portfolio site, the answer is this: someone burning through a prepaid Anthropic API balance is the only thing worth considering. And what was it that the agent had already built without my consent? Rate limiting at 10 requests per minute per IP — solving a problem this product doesn't come close to having.

The SQLite budget system was less out of place, but implemented in a way that did not make any sense. Each user gets a token ceiling; once they hit it, they stop. Fine so far. The problem was the persistence layer was self-contradictory. SQLite is a durable store. But the identity keying into it — a UUID stored in the browser's localStorage — is not durable at all. Clear your browser storage, reload the page, and you have a fresh identity with a fresh budget, and a brand new row in the SQLite table. The database was faithfully tracking usage for an identity that would inevitably disappear, and stacking rows upon rows of ephemeral, meaningless data. It was fake.

## Re-Design

The redesigned system has two components and one rule. The browser holds a UUID — ephemeral by nature. The server holds a dictionary of UUID → tokens consumed — ephemeral by choice. The rule is: if tokens consumed exceeds the ceiling, stop. Nothing persists across server restarts. Nothing survives a cleared localStorage. That is the design. The rest is implementation.

The fix follows directly from the diagnosis. The identity is ephemeral, so the budget should be too. Drop SQLite entirely, replace it with a plain Python dict on the application state. When the server restarts, budgets reset. When a user clears their localStorage, they get a new UUID and a fresh budget. Both of these are fine. The stakes do not require anything stronger. What matters is that one active session cannot exhaust the balance before someone else gets to use it — and a per-UUID in-memory ceiling handles that correctly and honestly.

The diff was mostly deletions. `db.py` went away entirely — about 90 lines of SQLite setup, connection management, and row-factory logic that existed solely to serve a use case that could be covered by a 30-line module with no dependencies. `slowapi` came out of the dependencies. The `/api/usage/{user_id}` endpoint was removed — it had never been called by the frontend, confirmed by reading the actual client code. What remained was a small `budget.py` with three functions, a plain dict as state, and a lifespan that no longer needed to open or close a database connection.

The budget defaults were also corrected. The original values — 2 million input tokens and 500,000 output tokens per user — were larger than the entire prepaid balance. A single user hitting the ceiling would cost more than the total account credit. The new values, 250,000 input and 60,000 output, are calibrated against actual Sonnet pricing: a user who burns through both limits costs roughly $1.65. That is a defensible worst case for a portfolio product, and it leaves room for multiple people to use the thing before the balance is gone.

## Conclusion

What I find most interesting about this round is not the code. The code is small. What is interesting is the step where the framing had to change. The guidance document diagnosed the right symptom — inconsistency between two identity schemes — but the natural next move was to design a better identity system. That would have produced a more sophisticated answer to a question the product was not actually asking. The better move was to stop and ask what the product actually needed, and then be willing to delete things that were answering the wrong question.

That is a different engineering judgment than making something more robust. It is the judgment to make something more honest, even when honesty means less code.

Nothing in this post is worth bragging about, implementation-wise. It exposed some AI slop, then landed on a solution so simple it would be laughed out of any serious engineering org. Shipping fast is a legitimate engineering decision. So is going back. The skill is in doing both consciously: knowing when good enough is good enough, and knowing when to return, read the system critically, and correct it with precision. That is what this post actually demonstrates — not a clever implementation, but the judgment to move through the phases of software development with clarity. Agents can assist each phase. They cannot navigate between them. That remains a human job.
