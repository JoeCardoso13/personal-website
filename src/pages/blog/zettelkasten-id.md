---
layout: ../../layouts/BlogPost.astro
title: "Zettelkasten powered AI tutor: defining user session"
date: "April 19, 2026"
description: "How AI agentic engineering works: build and ship fast, then iterate."
---

## Intro

In the [Zettelkasten powered AI tutor: shipping an MVP]() post, I built the first version of a Zettelkasten-powered Python tutor — a tool that reads my own notes and uses them to coach me through topics. The MVP shipped fast, but speed left something behind: the agent had filled in design decisions I'd left deliberately open — the price of moving fast. This post is about finding that, understanding why it happened, and correcting it.

## The Slop(s)

I shipped it. To any visitor, the tutor works — questions answered, responses on-screen, nothing visibly broken. But then I went back and read what had been built. That instinct — to audit what you shipped, not just admire it — is what separates true engineering from vibing. 

Token budgets were tracked in SQLite, keyed by a `user_id` the frontend generated. Rate limiting via `slowapi`, keyed by client IP. Neither had been justified.

In hindsight, of course this is where the agent stumbled most. It's the kind of decision where correctness depends on context the agent had no way to fully grasp. It reminds me of the tradeoffs discussed in *Designing Data-Intensive Applications* by Martin Kleppmann where there's no objectively correct answer. Agents seem to work best in a right-or-wrong world.

From a design standpoint the question was "what is this system actually trying to defend against?" For this use case... not much. It's an anonymous Python tutor on a personal portfolio website. Someone burning through my prepaid Anthropic API balance is the only thing worth considering. Rate limiting at 10 requests per minute per IP was solving a problem I didn't have.

In truth, the agent had already built an SQLite budget system. It's just that the implementation did not make any sense. Each user would get a token ceiling; once they hit it, they stop. Fine so far. The problem was that the persistence layer was self-contradictory: SQLite is a durable store, but the identity keying into it — a UUID stored in the browser's localStorage — is not. The database was faithfully tracking usage for an identity that would inevitably disappear, and stacking rows upon rows of ephemeral, meaningless data. A lesson in AI sloppiness.

The budget defaults were also corrected. The original values — 2 million input tokens and 500,000 output tokens per user — were larger than the entire prepaid balance of $5. The new values, 250,000 input and 60,000 output, are calibrated against actual Sonnet pricing. A user who burns through both limits costs roughly $1.65. That is a defensible worst case for a portfolio product.

## Re-Design

The fix follows directly from the diagnosis. For this use case we can just let the identity be ephemeral, and let the budget be too. Dropping SQLite entirely and replacing it with a plain Python dict also cut infrastructure and complexity. When the server restarts, budgets reset. When a user clears their localStorage, they get a new UUID and a fresh budget. These are fine tradeoffs for now. The stakes do not require anything stronger.

When implementing the re-design, `db.py` went away entirely — about 90 lines of SQLite setup, connection management, and row-factory logic that existed solely to serve a use case that could be covered by a 30-line module with no dependencies. `slowapi` dropped from the dependencies. The `/api/usage/{user_id}` endpoint was removed. What remained was a small `budget.py` with three functions, a plain dict as state, and a lifespan that no longer needed to open or close a database connection.

## Conclusion

What's worth noting isn't the implementation — it's the step before it. A better identity system would have been a more sophisticated answer to the wrong question. The solution followed immediately from asking the right question. Shipping fast is a decision. So is going back. The harder skill is knowing which problem you're actually solving.
