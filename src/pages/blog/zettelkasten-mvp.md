---
layout: ../../layouts/BlogPost.astro
title: "Zettelkasten powered AI tutor: shipping an MVP"
date: "April 13, 2026"
description: "How AI agentic engineering works: build and ship fast, then iterate."
---

## Intro

Sometime around 2023 I was at a study session ministered by [JD Fortune](https://www.linkedin.com/in/jondfortune/) about studying and note-taking methods/strategies. I was in search of a way to take notes that'd feel natural, and that's when I was presented with the Zettelkasten method. It forced me to writing things down, therefore reflecting upon what I was assimilating and, at the same time, kept from being boring by inducing thoughts of connections between concepts. This system of atomic notes, linking to each other, was always rewritten and updated. Using Obsidian and building up Vaults created some nice graphical representation of my mental maps.

Fast forward to 2026, as I gained experience with orchestrating and using AI agents to do SWE work, a thought ocurred to me. Those Vaults were all filled with markdown files and AI agents seem to love this format... Agents consume context as structured text — and Obsidian Vaults are exactly that: hundreds of small, well-titled markdown files cross-referencing each other. The structure I'd been building for myself as a learning tool was quietly also a knowledge base. It felt like a waste not to put an AI on top of it.

## Building With Agents

One of the artifacts of my experience in AI agentic engineering is the [joedevflow](https://github.com/JoeCardoso13/devflow) skill. I wrote it to codify how I work with AI agents. It structures development into four strict modes: Design, Test (Red), Implement (Green), and Observe & Debug. Using this skill helped keeping the agents intentional and accountable.

At the heart of this app lies the retrieval mechanism. To keep things simple, I built it around a graph — a natural fit for markdown notes that already link to each other. The app parses them into a NetworkX directed graph, tries to match a user question to a note via `difflib` fuzzy matching on note titles, then gathers nearby linked notes through a 1-hop traversal of that same graph.

The graph's edges come directly from Obsidian's `[[wikilink]]` syntax — each reference between notes becomes a directed edge. When a match is found, the retrieval layer collects both the note's outgoing links and any notes that point back to it. That 1-hop neighborhood is assembled into a context block and injected into the system prompt, giving the model a small but topically relevant slice of the vault.

No embeddings, no vector database, just graph traversal. The weak point is obvious in hindsight: the fuzzy title match is super brittle and, if it fails, the graph never gets traversed at all. The model receives no grounding from the vault.

## Shipping It

The backend went through the full devflow loop: design the API surface, write tests against it, implement, deploy. It's a FastAPI service running in Docker on Fly.io — a small machine, cheap to run, and quick to redeploy when things changed. +Expand (read /home/joe/JobHunt/brush-up/backend and let's flesh out the description of this system, especially how it is deployed)+

The frontend was a matter of augmenting the existing Astro site. Astro doesn't ship interactive components out of the box, so I added a Svelte island for the tutor UI — a small, self-contained page that handles user input and streams responses from the backend.

## Conclusion

After shipping it in 2 days, it looked great on the surface. It was live on my website, the UI was okay, and the tutor answered each question zealously. However, looking under the hood at the components of the system 2 defects were glaring.

The first was the retrieval layer. This actually was a deficiency from my design. On paper it should ground the model in my Zettelkasten notes. In practice, it only worked when a user's query happened to fuzzy-match a note title for `difflib` to catch it. That's a narrow window. Observability analysis (mode 4 of [joedevflow](https://github.com/JoeCardoso13/devflow)) showed the match often failed, and the graph expansion step had nothing to expand from. When this happened the model answered from its own training data without context of my vault.

Now the user tracking system never had much input from me, and it turned out to be just purely smoke-and-mirrors. It exposed the patterns that the agents get addicted to. That gets repeated a lot in their LLM's training data. Token usage was logged against a `user_id` stored in SQLite, but that ID was browser-session based — ephemeral by definition. Imagine going through the ordeal of creating (and deploying) a database to store browser-session data? It did so despite being aware of user IPs. It was using them for rate limiting. It decided, without consultation, that this portfolio website needed some DDoS security! 

Looking at the components of the system I could see how to expand it. The MVP launched as a single Python tutor, but I also had vaults for Ruby and JavaScript notes. All structured the same way. I could keep three tutors, one mechanism, zero new retrieval logic. Most of the work was in writing the notes themselves — and that work was already done.
