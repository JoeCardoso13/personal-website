---
layout: ../../layouts/BlogPost.astro
title: "Zettelkasten powered AI tutor: defining user session"
date: "April 19, 2026"
description: "How AI agentic engineering works: build and ship fast, then iterate."
---

## Intro

In the [Zettelkasten powered AI tutor: shipping an MVP]() post, I built the first version of a Zettelkasten-powered Python tutor — a tool that reads my own notes and uses them to coach me through topics. The MVP shipped fast, but fast shipping left something behind: +the agent had made a set of design decisions I hadn't explicitly authorized (not completely authorized is true, but maybe not the best way to put it... I had actually - in a way - chosen to neglect it, in order to speed up an MVP live on my website)+. This post is about finding that, understanding why it happened, and correcting it.

## The slop

I shipped it. To any visitor, the tutor works — questions answered, responses on-screen, nothing visibly broken. +But then I went back and read what had been built (it's good, but I gotta hint somehow that my senior engineer gut knew this was advisable, i.e. only by being a brilliant engineer I knew that although it all looked good on the surface it probably wasn't under the hood)+. 

Token budgets were tracked in SQLite, keyed by a `user_id` the frontend generated. Rate limiting via `slowapi`, keyed by client IP. Neither had been justified.

In hindsight, it makes sense that this is what the agent got most wrong. +It's the less black-and-white, of the system design decision made+. It reminds me of the tradeoffs discussed in *Designing Data-Intensive Applications* by Martin Kleppmann where there's no objectively correct answer. Agents seem work best in a right-or-wrong world.

From a design standpoint the question was "what is this system actually trying to defend against?" For this use case... not much. It's an anonymous Python tutor on a personal portfolio website. Someone burning through my prepaid Anthropic API balance is the only thing worth considering. Rate limiting at 10 requests per minute per IP was solving a problem I didn't have.

In truth, the agent had already built an SQLite budget system. It's just that the implemention did not make any sense. Each user would get a token ceiling; once they hit it, they stop. Fine so far. The problem was that the persistence layer was self-contradictory: SQLite is a durable store, but the identity keying into it — a UUID stored in the browser's localStorage — is not. The database was faithfully tracking usage for an identity that would inevitably disappear, and stacking rows upon rows of ephemeral, meaningless data. A lesson in AI sloppiness.

## Re-Design

The fix follows directly from the diagnosis. For this use case we can just keep the identity is ephemeral, and let the budget be too. Dropping SQLite entirely, and replacing it with a plain Python dict on the application state has the added benefit of reducing infrastructure and complexity. When the server restarts, budgets reset. When a user clears their localStorage, they get a new UUID and a fresh budget. These are fine tradeoffs for now. The stakes do not require anything stronger.

When implementing the re-design, `db.py` went away entirely — about 90 lines of SQLite setup, connection management, and row-factory logic that existed solely to serve a use case that could be covered by a 30-line module with no dependencies. `slowapi` dropped from the dependencies. The `/api/usage/{user_id}` endpoint was removed. What remained was a small `budget.py` with three functions, a plain dict as state, and a lifespan that no longer needed to open or close a database connection.

The budget defaults were also corrected. The original values — 2 million input tokens and 500,000 output tokens per user — were larger than the entire prepaid balance of $5. The new values, 250,000 input and 60,000 output, are calibrated against actual Sonnet pricing. A user who burns through both limits costs roughly $1.65. That is a defensible worst case for a portfolio product.

## Conclusion

[Let's condense and completely revamp this section]

What I find most interesting about this round is not the code. The code is small. What is interesting is the step where the framing had to change. The guidance document diagnosed the right symptom — inconsistency between two identity schemes — but the natural next move was to design a better identity system. That would have produced a more sophisticated answer to a question the product was not actually asking. The better move was to stop and ask what the product actually needed, and then be willing to delete things that were answering the wrong question.

Nothing in this post is worth bragging about, implementation-wise. It exposed some AI slop, then landed on a solution so simple it would be laughed out of any serious engineering org. Shipping fast is a legitimate engineering decision. So is going back. The skill is in doing both consciously: knowing when good enough is good enough, and knowing when to return, read the system critically, and correct it with precision. That is what this post actually demonstrates — not a clever implementation, but the judgment to move through the phases of software development with clarity. Agents can assist each phase. They cannot navigate between them. That remains a human job.
