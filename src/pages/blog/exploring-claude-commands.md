---
layout: ../../layouts/BlogPost.astro
title: "Claude Code Tidbits: extending Claude with skills"
date: "January 26, 2026"
description: "Exploring the fundamentals of Claude Code's skill commands."
---

## Intro

This is a short, practical intro to Claude Code skills. I give a focused explanation followed by a hands-on example from my own experience. It is a very simple use-case indeed, but that's precisely why it's well suited for introductory learning.

Fundamentally, a skill is just a markdown file with instructions for Claude. It saves you from having to repeat the same workflows over and over - you write them once, invoke them by name, and Claude follows the instructions. It's a bridge between the LLM's generic capabilities and your specific needs.

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

+++BEGIN+++

## Example

### /sync-medium

I write my blog posts locally in markdown, but I also cross-post them to Medium. Sometimes I make edits on Medium (typos, better phrasing) and want to sync those changes back to my codebase. This was a manual copy-paste workflow, so I asked Claude to turn it into a skill.

**Me:** See this workflow where I copy-paste a Medium article and you compare it with the codebase version? I want to turn that into a skill.

**Claude:** Created `~/.claude/skills/sync-medium/SKILL.md` with instructions for receiving pasted content, finding the matching blog post, and applying updates.

**Me:** What if we could fetch the Medium article from a URL instead of copy-pasting?

**Claude:** Let me try WebFetch...
```
WebFetch: https://medium.com/@joecardoso1312/my-article
Error: 403 Forbidden
```

**Claude:** Medium blocks direct fetches. Let me try scribe.rip, a Medium mirror...
```
WebFetch: https://scribe.rip/@joecardoso1312/my-article
Result: [summarized content]
```

**Me:** It worked but WebFetch summarizes the content. Can't you just fetch the raw HTML?

**Claude:** You're right - I can use curl instead.
```bash
curl -s "https://scribe.rip/@joecardoso1312/my-article"
```
Returns full HTML with all the article content intact.

**Me:** What about curling the original Medium URL?

**Claude:**
```bash
curl -s "https://medium.com/@joecardoso1312/my-article"
```
Returns Cloudflare challenge page: "Enable JavaScript and cookies to continue." Medium blocks automated requests, which is why scribe.rip is the workaround.

**The final skill workflow:**
1. User provides Medium URL
2. Claude converts `medium.com` → `scribe.rip`
3. Fetches raw HTML with curl
4. Parses content and compares with blog post
5. Applies updates while preserving frontmatter and relative links

**Me:** Eventually if we realize anything can be improved we can always tweak that SKILL.md, right?

**Claude:** Exactly. It's just a markdown file.

## Have A Blast

Now that you're equipped with the knowledge to have control over it, go ahead and browse and install any skill that you want! You can do so +here and here+. There's even a skill to browse and discover skills! Feel free to create your own as well, I think that's a super valid option! Hell, you may even upload yours and make publicly available if you want!

+++END+++
