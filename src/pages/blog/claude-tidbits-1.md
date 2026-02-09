---
layout: ../../layouts/BlogPost.astro
title: "Claude Code Tidbits: extending Claude with skills"
date: "January 26, 2026"
description: "Exploring the fundamentals of Claude Code's skill commands."
banner: /claude-tidbits-logo.svg
---

## Intro

This post covers the fundamentals of [Claude Code skills](https://code.claude.com/docs/en/skills) and walks through a real example of one I built for syncing blog posts to Medium. A simple one, because the goal is to learn the format, not to impress with complexity.

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

That's the core of it — but the [full specification](https://agentskills.io/specification) goes much further. Beyond additional frontmatter fields for licensing, compatibility, and tool permissions, skills can include entire directory structures with scripts, reference docs, and assets. The spec also defines a progressive disclosure model that keeps context usage efficient as skills grow in complexity. It's well worth a read once you're comfortable with the basics.

## Example

### /sync-medium

I write my blog posts on my personal website ([joecardoso.dev](https://joecardoso.dev)) first, then cross-post them to Medium. Edits happen after publishing though, and manually syncing changes across both platforms gets old fast.

Medium makes it easy to import a post from a URL — but only at publish time. Once the post is live on both platforms, there's no built-in way to sync subsequent edits. So I built a skill called `/sync-medium` to solve that.

Designing the skill meant breaking the problem into clear steps: fetch the article from Medium, compare it against the local `.md` file, and apply any differences. A small pipeline, but a real one.

Implementation surfaced a few details the design didn't anticipate. Medium blocks automated requests, so the skill fetches articles through `scribe.rip`, an alternative frontend that serves the same content without that restriction. Frontmatter needed special attention too — without explicit instructions, Claude Code will try to update fields like the publish date when syncing, so the skill has to tell it to leave them alone. Small issues, but the kind that only show up when you start turning a plan into working code.


## Go explore

Now that you've got the fundamentals down, go explore. The [Anthropic skills repository](https://github.com/anthropics/skills) has a curated collection of official skills, and community-driven registries like [claude-plugins.dev](https://claude-plugins.dev/skills) are popping up with all sorts of creative contributions — someone even built a skill that [browses and installs other skills](https://claude-plugins.dev/skills/@Kamalnrf/claude-plugins/skills-discovery) for you.

Want to build your own? You already know how. A folder, a `SKILL.md`, and whatever workflow you've been doing manually. And if you're proud of what you've made, publish it — the ecosystem is early enough that your contribution could become someone else's favorite tool. The format is open, the community is growing, and Claude Code is ready when you are.
