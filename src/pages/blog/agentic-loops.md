---
layout: ../../layouts/BlogPost.astro
title: "Claude Code Tidbits: using agents to build better agents with loops"
date: "March 13, 2026"
description: "Working on the contributor-toolkit GitHub repo from NimbleBrain's Open Source codebase, I engineered an agentic feedback loop to improve their auto-onboarding process."
banner: /claude-tidbits-logo.svg
---

> Open Source auto-onboarding codebase: [contributor-toolkit](https://github.com/NimbleBrainInc/contributor-toolkit)

## Intro

( This topic has a lot to do with what I have specialized during my Mechanical Engineering studies: Feedback Control. This theory is based on a system that feeds itself from its errors - defined as the distance between the actual and desired output. The agentic learning loop immediately hits home to me. )


( As of this date, I am the #1 contributor to this repo. )

+++BEGIN+++
---
(Reference Material - Development Only)

## The Evaluator-Optimizer Pattern

From [Anthropic's Building Effective Agents](https://www.anthropic.com/research/building-effective-agents):

> "One LLM call generates a response while another provides evaluation and feedback in a loop."

Two roles:
- **Generator**: produces an output (code, text, a skill file)
- **Evaluator**: critiques the output against clear criteria

The loop continues until the evaluator is satisfied or a turn limit is hit. This mirrors how a human writer works: draft → review → revise → repeat.

Works best when:
1. Clear evaluation criteria exist (tests pass, style matches, output format is correct)
2. Iterative refinement demonstrably improves outcomes
3. The evaluator has enough context to give actionable feedback

---

## The Learnings Loop (Skill Self-Improvement)

From [MindStudio's writeup on the learnings loop](https://www.mindstudio.ai/blog/learnings-loop-claude-code-skills-self-improvement):

The mechanism:
1. Claude runs a skill
2. User identifies what was wrong
3. Claude writes corrections directly into the skill's `SKILL.md`
4. Those corrections persist across sessions
5. Each correction compounds — the skill gets measurably better over time

Three things this is **not**:
- **Not in-context learning**: feedback disappears when the session ends; the learnings loop persists indefinitely
- **Not fine-tuning**: no retraining, no data science — it's instruction editing
- **Not manual editing**: updates happen through natural conversation

What makes feedback effective:
- Specific rules: "Format dates as YYYY-MM-DD" vs. "the format was wrong"
- Conditional statements: "when input is empty, do X"
- Desired outcomes, not just complaints
- Priority marking: critical fixes vs. preferences

---

## Using Agents to Write Skills (The Meta Layer)

This is the core idea of the post. Steps:

1. **Describe the skill you want** — in plain language, tell Claude what workflow it should capture
2. **Claude generates the SKILL.md** — it writes the frontmatter, the instructions, possibly supporting files
3. **Run the skill** — invoke it on a real task and observe the output
4. **Feed back** — tell Claude what was wrong; it updates the skill's instructions
5. **Repeat** — the skill improves through iterations until it matches your intent

This is the evaluator-optimizer loop applied to skill authorship. You're the evaluator; Claude is the generator.

The key difference from writing a skill manually: **Claude can observe the skill's actual output and self-correct** in a way a human writing instructions in isolation can't. It closes the loop between "what the instructions say" and "what the instructions produce."

## The Onboarding Repo to Which I'm the #1 Contributor

From [Contributor Toolkit GitHub Repo](https://github.com/NimbleBrainInc/contributor-toolkit):

---

## Progressive Disclosure

### The UX Origin

From [Progressive Disclosure — Jakob Nielsen, NNGroup (2006)](https://www.nngroup.com/articles/progressive-disclosure/):

> "Initially, show users only a few of the most important options. Offer a larger set of specialized options upon request."

The classic UX principle: manage complexity by revealing it in layers, not all at once. Two requirements: knowing which features are primary vs. secondary, and providing clear pathways to access depth.

---

### The Agent Engineering Translation

From [Building an internal agent: Progressive disclosure and handling large files — Will Larson](https://lethain.com/agents-large-files/):

> "Progressive disclosure is the practice of limiting what is added to the context window to the minimum necessary amount, and adding more detail over time as necessary."

Larson applies the pattern to agents: give the agent metadata first (IDs, names, sizes), then load detail on demand via tools. His framing: the glue layer between LLMs and tools is "a complex, sophisticated application layer rather than merely glue" — structuring *what* the agent sees *when* is real engineering work.

---

### Context Engineering as the Discipline

From [Effective context engineering for AI agents — Anthropic Engineering Blog (September 29, 2025)](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents):

> "Context engineering refers to the set of strategies for curating and maintaining the optimal set of tokens (information) during LLM inference."

Key ideas:
- **Just-in-time loading**: agents "maintain lightweight identifiers and use these references to dynamically load data into context at runtime using tools"
- **Progressive discovery**: "allows agents to incrementally discover relevant context through exploration — each interaction yields context that informs the next decision"
- Human cognition analogy: "we generally don't memorize entire corpuses of information, but rather introduce external organization and indexing systems... to retrieve relevant information on demand"

---

### The AI-Specific Framing

From [Progressive Disclosure: the technique that helps control context (and tokens) in AI agents — Marta Fernández García, Medium (February 24, 2026)](https://medium.com/@martia_es/progressive-disclosure-the-technique-that-helps-control-context-and-tokens-in-ai-agents-8d6108b09289):

> "Progressive Disclosure is a pattern borrowed from UI design that manages context in AI agents by revealing information in layers rather than loading everything upfront."

> "The main goal is not simply saving tokens; cost reduction is a consequence of better context management. Models perform better when they receive the relevant information at the right moment."

The point is not cost optimization — it's reasoning quality. A 6,600-token skill loaded upfront isn't just wasteful, it degrades the agent's ability to navigate the task.

---

### What the Existing Writing Misses

None of these sources discuss using **phase gates** as part of the pattern — explicit checkpoints between phases that enforce correctness before the agent loads the next chunk of context. That's where the evaluator-optimizer pattern intersects with the structural design.

---

## Relevant Sources

- [Building effective agents — Anthropic](https://www.anthropic.com/research/building-effective-agents)
- [The Learnings Loop — MindStudio](https://www.mindstudio.ai/blog/learnings-loop-claude-code-skills-self-improvement)
- [2026 Agentic Coding Trends Report — Anthropic](https://resources.anthropic.com/2026-agentic-coding-trends-report)
- [Progressive Disclosure — Jakob Nielsen, NNGroup](https://www.nngroup.com/articles/progressive-disclosure/)
- [Building an internal agent: Progressive disclosure and handling large files — Will Larson](https://lethain.com/agents-large-files/)
- [Effective context engineering for AI agents — Anthropic Engineering Blog](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [Progressive Disclosure: the technique that helps control context (and tokens) in AI agents — Marta Fernández García](https://medium.com/@martia_es/progressive-disclosure-the-technique-that-helps-control-context-and-tokens-in-ai-agents-8d6108b09289)

+++END+++
