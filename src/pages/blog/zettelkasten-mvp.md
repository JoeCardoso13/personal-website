---
layout: ../../layouts/BlogPost.astro
title: "Zettelkasten powered AI tutor: shipping an MVP"
date: "April 13, 2026"
description: "How AI agentic engineering works: build and ship fast, then iterate."
---

## Intro

Sometime around 2023 I was at a study session ministered by [JD Fortune](https://www.linkedin.com/in/jondfortune/) where he was listing methods for note-taking while studying programming fundamentals. It was tricky to absorb the material in a way that would stick in memory, and writing things down helped — but Zettelkasten made writing itself a system: atomic notes, linking to each other, always rewritten and updated as my understanding grew. I paired it with Obsidian and built up Vaults of mental maps.

Given that those Vaults were all filled with markdown files, and I'd seen how AI agents are enamored with this format, I always had that feeling that something could be made out of it.

Agents consume context as structured text — and Obsidian Vaults are exactly that: hundreds of small, well-titled markdown files cross-referencing each other. The structure I'd been building for myself as a learning tool was quietly also a knowledge base. It felt like a waste not to put an AI on top of it.

+++BEGIN+++

I recently had a Take Home exercise in Python, fully closed book. Naturally, I leaned on my agents to help me brush up my Python skills. I already had an Obsidian Vault of notes taken in Zettelkasten style: atomic and cross-referencing. So I threw my agent in there. It worked better than I anticipated, why not host it on my website? The result was a working MVP plugged into my website: a static Astro frontend with a Svelte page talking to a Python backend deployed separately on Fly.io.

+++END+++

## Building With Agents

The real unlock was building [joedevflow](https://github.com/JoeCardoso13/devflow) — a skill I wrote to codify how I work with AI agents. It structures development into four strict modes: Design, Test (Red), Implement (Green), and Observe & Debug. Each mode has a clear goal, forbidden actions, and a handoff artifact that carries context into the next. Agents don't skip to implementation before the spec is solid; they don't touch tests during the green phase. What used to feel like AI-assisted guesswork started feeling like a reliable production process. With that in place, the tutor idea — dormant for months — finally felt worth shipping.

With the workflow locked in, the real design work began — starting with the core of the app: retrieval.

At the heart of this app lies the retrieval mechanism. To keep things simple, I built it around a graph — a natural fit for markdown notes that already link to each other. The app parses them into a NetworkX directed graph, tries to match a user question to a note via `difflib` fuzzy matching on note titles, then gathers nearby linked notes through a 1-hop traversal of that same graph.

The graph's edges come directly from Obsidian's `[[wikilink]]` syntax — each reference between notes becomes a directed edge. When a match is found, the retrieval layer collects both the note's outgoing links and any notes that point back to it. That 1-hop neighborhood is assembled into a context block and injected into the system prompt, giving the model a small but topically relevant slice of the vault.

No embeddings, no vector database, just graph traversal. The weak point is obvious in hindsight: if the fuzzy title match fails, the graph never gets traversed at all, and the model receives no grounding from the vault.

+++BEGIN+++

The intent at first was about getting a full vertical slice live: notes on disk, retrieval logic, prompt construction, API surface, deployment, and a frontend that made the whole thing feel like a coherent experience.

It injects that context into the system prompt, and sends the request to the model. This went live in 2-3 days, working fine.

But building things fast with agents, even using the [TDD agent skill that I built](), does come with tradeoffs. After inspecting the system under the hood, it was clear 2 major components were quite substandard - I'd even go as far to say they were mostly smoke-and-mirrors:

1. The retrieval layer: It did ground the model in my notes, but only at a very rudimentary level. The first retrieval step was just exact note-title matching plus `difflib` fuzzy matching - for matching user query vs Zettelkasten notes. Rarely effective in providing the model with useful context. The subsequent graph expansion step doesn't help when no node was found.
2. The user tracking system: Token usage was tracked by storing a `user_id` in a SQLite database. But this `user_id` was browser-session based. Meanwhile rate limiting was keyed by IP address. Now this is just a mess. For a portfolio website, I don't think I need rate-limiting at this time. And the token consumption has to be tracked but faking state persistence by storing session data on a database is definitely **not** the way to go.

Agents don't help only with shipping an MVP - if aptly used they can augment virtually any type of intellectual work. So they also contributed tackling these 2 issues.

+++END+++

## Shipping It

The backend went through the full devflow loop: design the API surface, write tests against it, implement, deploy. It's a FastAPI service running in Docker on Fly.io — a small machine, cheap to run, and quick to redeploy when things changed.

The frontend was a matter of augmenting the existing Astro site. Astro doesn't ship interactive components out of the box, so I added a Svelte island for the tutor UI — a small, self-contained page that handles user input and streams responses from the backend.

## Conclusion

Shipping fast with agents is real. But speed has a tax, and here it showed up in two places.

The first was the retrieval layer. On paper it grounded the model in my Zettelkasten notes — in practice, it only worked when a user's query happened to fuzzy-match a note title closely enough for `difflib` to catch it. That's a narrow window. When the match failed, the graph expansion step had nothing to expand from, and the model answered from its own training data instead of my vault. The whole retrieval system was load-bearing in theory and decorative in practice.

The user tracking system was more confused than broken. Token usage was logged against a `user_id` stored in SQLite, but that ID was browser-session based — ephemeral by definition. Rate limiting ran on a completely different key: IP address. Two mismatched systems producing neither good rate limiting nor real persistence. For a portfolio site, rate limiting is overkill to begin with. Token tracking is worth doing — just not by mistaking session data for state.

Fixing what was broken was one kind of work. The next step was a different kind: not repair, but expansion. The MVP launched as a single Python tutor, but the vault had always covered more ground — Ruby and JavaScript notes had been growing in parallel, written the same way, structured the same way. Bringing them online meant reorganizing the notes into language subdirectories and letting the backend build one graph per folder at startup. Each tutor now loads its own isolated NetworkX graph and TF-IDF index; the API routes questions to whichever language the user selects. Three tutors, one mechanism, zero new retrieval logic. The work was in the notes themselves — and that work was already done.
