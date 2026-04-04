---
layout: ../../layouts/BlogPost.astro
title: "Claude Code Tidbits: using agents to build better agents with loops"
date: "April 4, 2026"
description: "Exploring the idea of using agents to write skills for other agents, and iterating with feedback to improve them over time."
banner: /claude-tidbits-logo.svg
---

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

## Relevant Sources

- [Building effective agents — Anthropic](https://www.anthropic.com/research/building-effective-agents)
- [The Learnings Loop — MindStudio](https://www.mindstudio.ai/blog/learnings-loop-claude-code-skills-self-improvement)
- [2026 Agentic Coding Trends Report — Anthropic](https://resources.anthropic.com/2026-agentic-coding-trends-report)
