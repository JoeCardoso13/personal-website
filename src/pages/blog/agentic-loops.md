---
layout: ../../layouts/BlogPost.astro
title: "Claude Code Tidbits: using agents to build better agents with loops"
date: "April 4, 2026"
description: "Exploring the idea of using agents to write skills for other agents, and iterating with feedback to improve them over time."
banner: /claude-tidbits-logo.svg
---

---
(Reference Material - Development Only)

## The Core Agentic Loop

Every Claude Code agent follows the same cycle, from the [Agent SDK docs](https://platform.claude.com/docs/en/agent-sdk/agent-loop):

> receive prompt → evaluate → execute tools → observe results → repeat

Claude doesn't stop after one step. It keeps calling tools and processing results until the task is done. Each full cycle is one **turn**. A simple task might take two turns; a complex refactor can chain dozens.

The loop can be capped with `max_turns` or `max_budget_usd`. Without limits, it runs until Claude finishes on its own — fine for scoped tasks, dangerous for open-ended ones like "improve this codebase."

Key insight: **the loop is not a feature, it's the architecture.** Everything else — skills, subagents, hooks — builds on top of this loop.

---

## The /loop Skill (The Polling Primitive)

From the [skills docs](https://code.claude.com/docs/en/skills):

> `/loop [interval] <prompt>` — Run a prompt repeatedly on an interval while the session stays open. Useful for polling a deployment, babysitting a PR, or periodically re-running another skill.

Example: `/loop 5m check if the deploy finished`

This is the simplest form of an agentic loop: a scheduled prompt that re-runs itself. The interval is human-readable (`5m`, `30s`). The prompt can invoke *another skill*, which is where things get interesting — `/loop` becomes an orchestrator for other agents.

---

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

---

## The /simplify Skill as a Real Example

From the skills docs, `/simplify` is a bundled skill that demonstrates this pattern in action:

> "Review your recently changed files for code reuse, quality, and efficiency issues, then fix them. Spawns **three review agents in parallel**, aggregates their findings, and applies fixes."

This is an agentic loop:
- Three agents run concurrently, each evaluating the code from a different angle
- Their findings are aggregated by an orchestrator
- The orchestrator applies fixes

The parallel evaluation + aggregation + apply pattern is directly applicable to skill improvement: spawn multiple evaluator agents on a skill's output, aggregate feedback, rewrite the skill.

---

## Key Technical Details (for accuracy in the post)

**Skills live at:**
- `~/.claude/skills/<name>/SKILL.md` (personal, all projects)
- `.claude/skills/<name>/SKILL.md` (project-scoped)

**The description field is load-bearing:**
> Claude uses the description to decide when to auto-invoke a skill. If the description is vague or too long (capped at 250 chars in the listing), the skill won't trigger reliably.

**context: fork** runs a skill in an isolated subagent. The subagent doesn't inherit the parent's conversation history — it starts clean. This is important for evaluation agents: you want them to evaluate the output in isolation, not be influenced by the generation conversation.

**Shell injection in skills** (`` !`command` ``) executes before Claude sees the prompt. This means a skill can fetch live data (test results, CI status, diff) and inject it into its own instructions — a form of self-contextualization.

---

## Relevant Sources

- [How the agent loop works — Claude Agent SDK](https://platform.claude.com/docs/en/agent-sdk/agent-loop)
- [Extend Claude with skills — Claude Code Docs](https://code.claude.com/docs/en/skills)
- [Building effective agents — Anthropic](https://www.anthropic.com/research/building-effective-agents)
- [The Learnings Loop — MindStudio](https://www.mindstudio.ai/blog/learnings-loop-claude-code-skills-self-improvement)
- [Claude Code: How to Write, Eval, and Iterate on a Skill — mager.co](https://www.mager.co/blog/2026-03-08-claude-code-eval-loop/)
- [Claude Code Agent Skills 2.0 — Towards AI](https://pub.towardsai.net/claude-code-agent-skills-2-0-from-custom-instructions-to-programmable-agents-ab6e4563c176)
- [What Is the Agentic OS Architecture? — MindStudio](https://www.mindstudio.ai/blog/agentic-os-architecture-claude-code-skills)
- [2026 Agentic Coding Trends Report — Anthropic](https://resources.anthropic.com/2026-agentic-coding-trends-report)
