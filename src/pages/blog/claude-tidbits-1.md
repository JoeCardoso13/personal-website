---
layout: ../../layouts/BlogPost.astro
title: "Claude Code Tidbits: extending Claude with skills"
date: "January 26, 2026"
description: "Exploring the fundamentals of Claude Code's skill commands."
banner: /claude-tidbits-logo.svg
---

## Intro

This is a short, practical intro to [Claude Code skills](https://code.claude.com/docs/en/skills). I give a focused explanation followed by a hands-on example from my own experience. It is a very simple use-case indeed, but that's precisely why it's well suited for introductory learning.

Fundamentally, a skill is just a [markdown file with instructions](https://agentskills.io/specification) for Claude. It saves you from having to repeat the same workflows over and over - you write them once, invoke them by name, and Claude follows the instructions. It's a bridge between the LLM's generic capabilities and your specific needs.

## Anatomy of a Skill

Released by Anthropic as an [open standard](https://agentskills.io/) on December 18, 2025, skills are a format that any AI agent can adopt. Here we'll focus on how they work in Claude Code, where each skill lives as a named directory in `~/.claude/skills/` with a `SKILL.md` file inside. The directory name must match the skill's `name` field:

```
skill-name/
└── SKILL.md          # Required
```

The `SKILL.md` starts with YAML frontmatter - only `name` and `description` are required - followed by the skill's instructions in Markdown:

```yaml
---
name: my-command
description: What this command does
---

Instructions for Claude go here.
When invoked, Claude receives these instructions
along with any $ARGUMENTS you passed.
```

To use a skill, type `/` and its name in Claude Code - autocomplete will help you find it. Anything after the command name becomes `$ARGUMENTS`, which gets substituted directly into the skill's instructions. No type checking, no parsing - just string replacement. Here's an example:

```
---
name: fix-issue
description: Fix a specific GitHub issue.
---

Fix GitHub issue $ARGUMENTS following our standards.
```

Running `/fix-issue 123` makes Claude receive:
```
Fix GitHub issue 123 following our standards.
```

That's the core of it. Beyond `name` and `description`, there are a few optional frontmatter fields worth mentioning:
- `argument-hint`: tells the CLI what to show during autocomplete, so users know what parameters to pass (e.g., `[filename] [format]`).
- `metadata`: a key-value map for things like authorship and versioning (e.g., `author: "my-org"`, `version: "1.0"`).
- `allowed-tools`: a space-delimited list of tools the skill is pre-approved to use (e.g., `Bash(git:*) Read`).

## Example

### /sync-medium

I write my blog posts on my personal website ([joecardoso.dev](https://joecardoso.dev)) first, then cross-post them to Medium. Edits happen after publishing though, and manually syncing changes across both platforms gets old fast.

Medium makes it easy to import a post from a URL — but only at publish time. Once the post is live on both platforms, there's no built-in way to sync subsequent edits. So I built a skill called `/sync-medium` to solve that.

Designing the skill meant breaking the problem into clear steps: fetch the article from Medium, compare it against the local `.md` file, and apply any differences. A small pipeline, but a real one.

Implementation surfaced a few details the design didn't anticipate. Medium blocks bot requests, so the skill fetches through `scribe.rip` instead. The frontmatter — publish date, layout, description — also needed to be preserved during syncing. Small issues, but the kind that only show up when you start turning a plan into working code.


## Have A Blast

Now that you've got the fundamentals down, go explore. The [Anthropic skills repository](https://github.com/anthropics/skills) has a curated collection of official skills, and community-driven registries like [claude-plugins.dev](https://claude-plugins.dev/skills) are popping up with all sorts of creative contributions — someone even built a skill that [browses and installs other skills](https://claude-plugins.dev/skills/@Kamalnrf/claude-plugins/skills-discovery) for you.

Want to build your own? You already know how. A folder, a `SKILL.md`, and whatever workflow you've been doing manually. And if you're proud of what you've made, publish it — the ecosystem is early enough that your contribution could become someone else's favorite tool. The format is open, the community is growing, and Claude Code is ready when you are.
