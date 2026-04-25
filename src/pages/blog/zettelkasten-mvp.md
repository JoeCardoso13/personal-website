---
layout: ../../layouts/BlogPost.astro
title: "Zettelkasten powered AI tutor: shipping an MVP"
date: "April 13, 2026"
description: "How AI agentic engineering works: build and ship fast, then iterate."
---

## Intro

Sometime around 2023, at a study session led by [JD Fortune](https://www.linkedin.com/in/jondfortune/), I learned about the Zettelkasten note-taking method. This system of atomic notes, linked to each other, was a living brain-map, always being rewritten. Using Obsidian and building up vaults — folders full of Markdown files — had the side effect of turning those links into a visual graph.

By 2026, that old note-taking habit started to look like infrastructure. Those vaults were all filled with Markdown files, and AI agents love that format. The structure I'd been building for myself as a learning tool was quietly also a knowledge base. It was screaming for an AI on top of it.

## Building It

So I built the Python tutor with agents, using [joedevflow](https://github.com/JoeCardoso13/devflow) as the guardrail: design, test, implement, observe, repeat. Simply put, a user asks a question, the backend looks through my Obsidian vault, and the model answers using whatever notes it finds. If the app could not find the right notes, it was not a Zettelkasten tutor.

I treated the vault like what it already was: a graph. Obsidian notes link to each other with `[[wikilinks]]`, so each note became a node and each link became an edge. The app parses them into a NetworkX directed graph, tries to match a user question to a note via `difflib` fuzzy matching on note titles, then gathers nearby linked notes through a 1-hop traversal of that same graph.

When a match is found, the retrieval layer collects both the note's outgoing links and any notes that point back to it. That 1-hop neighborhood is assembled into a context block and injected into the system prompt, giving the model a small but topically relevant slice of the vault. No embeddings, no vector database, just graph traversal.

## Shipping It

Design the API surface, write tests against it, implement, deploy. The backend is a FastAPI service containerized with Docker — notes baked right into the image, so the vault travels with the code. It runs on Fly.io on a shared-CPU, 512 MB machine that auto-stops when idle and wakes on the first request. No traffic, nearly no cost. Redeploying was a single `fly deploy` — fast enough that iterating felt cheap.

The frontend work was augmenting the existing Astro site. Astro doesn't ship interactive components out of the box, so I added a Svelte island for the tutor UI — a small, self-contained page that handles user input and streams responses from the backend.

## Conclusion

After 2 days it was live — the UI held up, the tutor answered questions, it looked like a working product. Looking under the hood, two components were quietly broken, and one natural expansion was already within reach.

- **Retrieval was brittle.** It only worked when the user's phrasing happened to fuzzy-match a note title. When it missed, the graph had nothing to traverse and the model answered from its own training data. [→]()
- **User identity was a contradiction.** SQLite tracking browser-session UUIDs, rate limiting keyed by IP, token budgets sized larger than the entire prepaid API balance. The agent had built real infrastructure to solve problems this product didn't have. [→]()
- **One tutor was an artificial constraint.** I already had vaults for Ruby and JavaScript — same structure, same format. One shared engine, three corpora, zero new retrieval logic. Most of the work was already done.
