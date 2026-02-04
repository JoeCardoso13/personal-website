---
layout: ../../layouts/BlogPost.astro
title: "Claude Code Tidbits: extending Claude with skills"
date: "January 26, 2026"
description: "Exploring the fundamentals of Claude Code's skill commmands."
---

## Intro

This is meant to be a short post +for those delving into assisted coding+. The idea is to first provide a distilled, focused conceptual explanation of what skills are, covering all its essentials, including how they're made, and then give one simple example to drive it home. The example is a description of my little hands-on experience writing a skill, which is a very simple use-case indeed, but that's precisely why it's well suited for introductory learning.

A skill consists of a tiny package of knowledge that serves as preparation for the LLM to conduct a certain task. It's essentially a way to save time and effort +so that you don't have to keep repeating yourself and memorizing every detail of the procedure you want to describe, everytime you need Claude to do a certain task+. It's a bridge between the generic capabilities of the LLM, and the more specific user needs.

## The Skill Structure

(Use the fact that this is an open source pattern created by Anthropic - https://agentskills.io/home - and explain the concept of Agents and how it connects to skills Launch date: December 18, 2025 (open standard announcement))

Anthropic released the Agent Skills format as an [open standard](https://agentskills.io/) on December 18, 2025. It defines the minimal requirements of a skill as follows. It consists of a directory containing at least one `SKILL.md` file:

```
skill-name/
└── SKILL.md          # Required
```

The `SKILL.md` must have a frontmatter in YAML format followed by the skill's content in Markdown, only `name` and `description` are strictly necessary attributes:

```yaml
---
name: my-command
description: What this command does
---

Instructions for Claude go here.
When invoked, Claude receives these instructions
along with any $ARGUMENTS you passed.
```

Using the above, in the Claude Code CLI, if you start typing `/my-command` in the terminal Claude will autocomplete for you and show `What this command does` in the right hand side of the screen. And when you use the invocation pattern:

```
/command-name [everything after is $ARGUMENTS]
```

Everything after the command name becomes `$ARGUMENTS`. The skill's `SKILL.md` file contains instructions that may use the `$ARGUMENTS` placeholder. If so, Claude receives the instructions with your arguments substituted in. But bear in mind that there's no type checking, no formal separation between "arguments" and "prompt" - it's all just a string.

So if a skill's SKILL.md says:
```
---
name: fix-issue
description: Fix a specific GitHub issue.
---

Fix GitHub issue $ARGUMENTS following our standards.
```

And you run `/fix-issue 123`, Claude receives:
```
Fix GitHub issue 123 following our standards.
```

### Aditional Fields

The `argument-hint` field in skill frontmatter is for autocomplete hints - it documents what arguments are expected. +Expand+

The `metadata` field is helpful for authorship and versioning. +Expand+

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

Now that you're equiped with the knowledge to have control over it, go ahead and browse and install any skill that you want! You can do so +here and here+. There's even a skill to browse and discover skills! Feel free to create your own as well, I think that's a super valid option! Hell, you may even upload yours and make puclicly available if you want!
