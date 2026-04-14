# Building a Zettelkasten-Powered AI Tutor

So I recently had a Take Home exercise, as part of my Job Hunt, that was to be done in Python, fully closed book. Naturally, I leaned on my agents to help me brush up my Python skills. It helped that I had already created a good repository of markdown files, consisting of atomic notes, using the Zettelkasten method, in an Obsidian vault. So I just threw my agent in there, asked to surface links between concepts and leveraged the Zettelkasten structure already there. I also used the prompting I've very fond of, ensuring a very interactive study session. It worked better than I anticipated, and I decided to host a remote one on my website.

I built and shipped a small AI tutoring product around the idea of turning my own Zettelkasten notes into a live teaching interface. The result was a working MVP now plugged into my website: a static Astro frontend with a Svelte page talking to a Python backend deployed separately on Fly.io.

From an engineering point of view, the intent at first was less about building a polished product and more about getting a full vertical slice live: notes on disk, retrieval logic, prompt construction, API surface, deployment, and a frontend that made the whole thing feel like a coherent experience. This is a software product deployed, reachable from my site, and built around constraints that actual software has: cost sensitivity, routing, cross-origin requests, token accounting, and the awkward compromises that come with shipping an MVP before every architectural question is fully resolved.

At the heart of this app lies the retrieval mechanism. To start things simple, I took the fateful design decision of using a graph based retrieval. The app parses my Markdown notes into a graph, tries to match a user question to a note, gathers nearby linked notes, injects that context into the system prompt, and sends the request to the model. That proved to work extraordinarily well. The system is live, it answers questions, and the overall architecture is clean enough that I can now evolve it into something broader, including JavaScript and Ruby versions built on other note vaults.

The current MVP still has two obvious weak spots:

1. The retrieval layer is still shallow. It does ground the model in my notes, but the first retrieval step is mostly exact note-title matching plus `difflib` fuzzy matching. That is enough for a proof of concept, but not enough for a retrieval design I would feel comfortable defending as particularly robust or professional.
2. Identity and abuse-control are inconsistent. Token usage is tracked in SQLite by a client-provided `user_id`, while rate limiting is keyed by IP address. For a low-traffic anonymous MVP, that is acceptable, but it is still a smell: the product does not yet have one coherent story for what a “user” actually is.

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

