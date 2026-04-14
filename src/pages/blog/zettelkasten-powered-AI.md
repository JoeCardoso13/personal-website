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

---

## The Second Round: Making the Retrieval Real

Shipping the MVP was the easy part in one sense: the hard tradeoffs are invisible when the system is untested under real queries. The moment I started using it seriously, shortcomings 1, 3, and 4 from the list above became impossible to ignore. The retrieval was shallow. The tests did not cover the system as a whole. And when something went wrong at runtime, there was no signal — just a response that may or may not have been grounded in my notes at all.

I came back to those three together, in that order, because they are tightly coupled. Better retrieval is only trustworthy if you can test it. Tests for retrieval quality are only useful if you can also observe what the system actually does in production. You cannot do one of these properly without the other two.

### Replacing Fuzzy Matching with TF-IDF

The original retrieval step was `difflib` fuzzy matching against note titles. It worked well enough to demo, but it was shallow in a specific way: it could only retrieve notes whose titles overlapped with the user's phrasing. A question like "how do I wrap a function to modify its behavior" has almost no title overlap with the `Decorator` note, so the system would miss it. The Zettelkasten was technically being used, but the selection was so brittle that calling it grounded was generous.

The replacement is a small TF-IDF index built at startup over the full note content — title plus body, with wikilink brackets stripped so link text is searchable. The title is repeated three times in the indexed text to create a bounded but meaningful title boost, so a query like "what is a for loop" still finds `For loop` without drowning out notes where the topic is covered in the body. IDF is computed over the full 127-note corpus, which means common Python words like "function" or "return" contribute less than vocabulary that actually distinguishes one note from another.

The design is deliberately minimal. There is no stemming, no embeddings, no external search library. Everything is standard library math: term frequency, inverse document frequency, cosine similarity. That is partly a cost decision and partly a correctness one — a system this size does not need a vector database, and keeping the retrieval logic in a single file with no dependencies makes it much easier to test, understand, and improve incrementally.

### Writing Tests That Can Actually Fail

The testing strategy for this round followed red-green TDD. Before writing any retrieval code, I wrote tests that asserted what I wanted the retrieval to do: specific queries should retrieve specific notes, scores should clear a confidence threshold, and the system prompt passed to Claude should actually contain the right note content. All of them failed first, which is the point. A test that passes before the code exists is not a test, it is a coincidence.

One category worth describing in more detail is the diverse-phrasing tests. For any topic I cared about, I wrote multiple differently-phrased questions that should all ground on the same note. "How does a for loop work", "iterating over a list with a loop", "what is the syntax for looping through a sequence" — all three should retrieve `For loop`. These tests are more demanding than a single exact match, and some of them fail.

The failures are marked `xfail` rather than deleted, which is a deliberate choice. An `xfail` in pytest is a documented known weakness: the test describes something the system should do, is expected to fail for now, and will automatically turn into an unexpected pass the moment retrieval improves enough to handle it. It is a better artifact than a comment. It runs on every CI pass, and if it ever starts passing, the suite tells you.

The tests that xfail cluster around two root causes. First, notes with very thin prose are under-retrievable. The `Decorator` note is a single sentence: "They are Methods that modify other Methods." The word "decorator" does not appear in it. A query phrased as "how do decorators work" shares almost no vocabulary with the note body and loses to notes that happen to have more word overlap. Title boost helps for direct queries but cannot rescue indirect ones. Second, closely-named notes compete against each other in ways that are hard to resolve without richer content. "What is a class?" retrieves `Class method` rather than `Class` because `Class method` has more occurrences of relevant tokens and the margin is narrow.

### End-to-End Tests Through the HTTP Layer

The integration tests operate directly against the TF-IDF index. They are fast and useful, but they do not exercise the actual request path: FastAPI validation, middleware, the lifespan-built state, the system prompt construction, the response shape. I added a second layer of tests that go through the HTTP stack using FastAPI's `TestClient` with the real 127-note corpus. The Anthropic client is mocked — these tests are about retrieval grounding, not about what Claude says — but everything else is real.

The key assertion in these tests is not just "did the endpoint return 200". It is: does the `system` argument that gets passed to the Claude API call actually contain content from the expected note? That is the chain we care about. A test that only checks the HTTP response shape is not testing whether the Zettelkasten is being leveraged at all.

These tests also caught something the integration tests missed. One integration test checked whether `Inheritance` appeared in the top 3 retrieval results for "how does inheritance work" — and it did, in third place. But `ask()` uses `k=1`: it takes only the top result. Third place never reaches the system prompt. The test was passing for the wrong reason. The e2e test, which checked the actual system prompt content, caught the bug immediately.

### Adding Observability

The last piece was logging. Before this round, the only runtime signal was the HTTP status code and response latency. There was no way to know which note the system had retrieved, what score it had received, or whether the retrieval had fallen back entirely.

The logging added in this round emits two lines per request. The first comes from the agent layer when retrieval runs:

```
retrieval topic='Decorator' score=0.309 neighbors=6 question='What is this decorator thing?'
```

The second comes from the API layer after the response is returned:

```
chat user=b8861b07 q_len=63 tokens=3122+60 2.5s topic='Decorator' score=0.309 neighbors=6
```

This gives enough signal to answer the question I actually cared about: for a given user question, did the system ground the tutor in the right note? The score is interpretable — above 0.10 is confident, below 0.10 means the match is marginal and the grounding may be unreliable. The topic is auditable against the question in plain text.

### What Production Actually Showed

I deployed, opened the frontend on my browser, and watched `fly logs` in a terminal. The first question — a natural phrasing about decorators — retrieved `Decorator` at score 0.309 with 6 neighbors. That is a confident grounding, and the note content was in the system prompt. The retrieval worked.

The second question — "what's the deal with subclasses and superclasses?" — retrieved `Self` at score 0.094. The score alone flags it: below the confidence threshold, wrong note. This is exactly the indirect-phrasing failure the xfails document. It is not surprising, but seeing it in production against a real question I actually typed makes it concrete in a way that a test output does not.

The third question was meant to be a safer phrasing: "how does inheritance work?" The logs showed `Implicit coercion` at score 0.091. That was genuinely surprising. Locally, a test for this exact query was passing — but the test had been checking the top-3 results while `ask()` only uses the top-1. `Inheritance` was sitting at rank 3, invisible to the actual code path. The test was lying. The log caught it.

That last one is the most honest summary of what this round of work was really for. The retrieval is better than it was. The tests are more honest than they were. And the observability means that when the system fails in production — and it will fail — there is now enough signal to understand why.
