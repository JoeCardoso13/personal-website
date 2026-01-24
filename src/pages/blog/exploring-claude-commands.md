---
layout: ../../layouts/BlogPost.astro
title: "Claude Code Tidbits: extending Claude with skills"
date: "January 26, 2026"
description: "Exploring the fundamentals of Claude Code's skill commmands."
---

## Intro

As using Claude Code for assisted coding increases in popularity, the restless developer community does what it can't help but do: automate workflows, build things around, create tools to make smooth transitions, etc. One thing that's becoming more established at the time of this writing is the so-called agentic skill. It consists of a tiny package of knowledge to serve as preparation for the LLM to conduct a certain task. It's essentially a way to save time and effort so that you don't have to keep repeating yourself, and memorizing every detail, everytime you need Claude to do a certain task.

Here we'll first delve into what Claude's skills are, explaining its more general aspects, and then we'll create 1 simple skills that'll serve as example to help consolidate the concept.

## Skill

(Use the fact that this is an open source pattern created by Anthropic - https://agentskills.io/home - and explain the concept of Agents and how it connects to skills)

The pattern is simple:

```
/command-name [everything after is $ARGUMENTS]
```

**How it works:**
1. Everything after the command name becomes `$ARGUMENTS`
2. The skill's `SKILL.md` file contains instructions with `$ARGUMENTS` placeholder
3. Claude receives the instructions with your arguments substituted in
4. No type checking, no formal separation between "arguments" and "prompt" - it's all just a string

**Example:**
If a skill's SKILL.md says:
```
Fix GitHub issue $ARGUMENTS following our standards.
```

And you run `/fix-issue 123`, Claude receives:
```
Fix GitHub issue 123 following our standards.
```

**The `argument-hint` field** in skill frontmatter is just for autocomplete hints - it documents what arguments are expected but doesn't enforce anything.

**Skills (skill-based commands):**
- Custom commands that live in `.claude/skills/` directory
- Each skill is a folder with a `SKILL.md` file inside
- You (or others) can create custom skills
- Skills define instructions that get sent to Claude when invoked

**Structure of a skill:**
```
.claude/skills/my-command/
└── SKILL.md
```

**Inside SKILL.md:**
```yaml
---
name: my-command
description: What this command does
argument-hint: [optional arguments]
---

Instructions for Claude go here.
When invoked, Claude receives these instructions
along with any $ARGUMENTS you passed.
```

**Example - Creating your own command:**

Create `.claude/skills/summarize-changes/SKILL.md`:
```yaml
---
name: summarize-changes
description: Summarize git changes
argument-hint: [branch-name]
---

Please summarize the git changes in $ARGUMENTS branch
compared to main. Be concise.
```

Then you can run: `/summarize-changes feature-branch`

## Examples

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
