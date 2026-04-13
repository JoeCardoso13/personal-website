# Building a Zettelkasten-Powered AI Tutor

I recently built and shipped a small AI tutoring product around an idea I had been curious about for a while: can I turn my own Zettelkasten notes into a live teaching interface? The result was a working MVP now plugged into my website: a static Astro frontend with a Svelte page talking to a Python backend deployed separately on Fly.io.

From an engineering point of view, the project was less about building a polished product and more about getting a full vertical slice live: notes on disk, retrieval logic, prompt construction, API surface, deployment, and a frontend that made the whole thing feel like a coherent experience. I used agentic engineering throughout, which made it possible to move quickly from idea to something publicly accessible, while still leaving behind enough structure, tests, and design notes to iterate on it seriously.

What I like most about the project is that it is real. It is not a toy script living in a local folder. It is deployed, reachable from my site, and built around constraints that actual software has: cost sensitivity, routing, cross-origin requests, token accounting, and the awkward compromises that come with shipping an MVP before every architectural question is fully resolved.

The backend itself is a lightweight tutoring engine. It parses my Markdown notes into a graph, tries to match a user question to a note, gathers nearby linked notes, injects that context into the system prompt, and sends the request to the model. That much works. The system is live, it answers questions, and the overall architecture is clean enough that I can now evolve it into something broader, including JavaScript and Ruby versions built on other note vaults.

The main shortcomings are clear too, and that is part of the value of the project. The current MVP still has five obvious weak spots:

1. The retrieval layer is still shallow. It does ground the model in my notes, but the first retrieval step is mostly exact note-title matching plus `difflib` fuzzy matching. That is enough for a proof of concept, but not enough for a retrieval design I would feel comfortable defending as particularly robust or professional.
2. Identity and abuse-control are inconsistent. Token usage is tracked in SQLite by a client-provided `user_id`, while rate limiting is keyed by IP address. For a low-traffic anonymous MVP, that is acceptable, but it is still a smell: the product does not yet have one coherent story for what a “user” actually is.
3. The testing story is strong at the unit level but still needs more explicit integration coverage for the system as a whole.
4. Observability is thin, which makes it harder than it should be to explain why the system selected a topic, fell back, or behaved a certain way at runtime.

Also, a next step I'm positive I'll do, is adding support for Ruby and JavaScript, since the Zettelkasten notes for them were already taken. This is a single-tutor architecture. That was the fastest way to ship, but it means the backend currently assumes one notes corpus, one prompt, and one tutoring flow. Expanding it into Python, JavaScript, and Ruby without multiplying Fly.io costs will require turning it into one shared tutor engine serving multiple corpora inside the same deployed app.

That combination is exactly why I think the project is worth writing about. It demonstrates that I can take an idea from concept to deployment, but it also gives me a concrete engineering diary of what the first version got right, what it deliberately faked, and what the next round of work should improve.
