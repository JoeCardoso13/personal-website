---
layout: ../../layouts/BlogPost.astro
title: "Claude Code Tidbits"
date: "TBD"
description: "In the first episode of the series, we explore the fundamentals of Claude Code's slash commmands."
---

## Intro

Assisted coding: important, improves productivity, one-way future road.

Current scenario = learn by doing, not much documentation available, all very fresh 

## Skill vs Hardcoded

- **No arguments**: `/help`, `/clear`, `/cost`, `/compact` - just execute
- **Simple arguments**: `/model sonnet` - takes a model name
- **Prompt-style**: `/statusline <your description>` - passes text to a specialized agent

**There's no strict "arity" definition.** The pattern is simple:

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

**Built-in commands** like `/help`, `/clear`, `/model` are different - they're hardcoded, not skill-based.

So it's less like typed function calls and more like "command + free-form text that gets templated in." Pretty flexible but also pretty loose.

---
**Hardcoded commands:**
- Built into Claude Code's binary (the application itself)
- Examples: `/help`, `/clear`, `/model`, `/cost`, `/compact`, `/config`
- You can't modify or customize them
- They do specific fixed things

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

**Where does `/statusline` fit?**
Based on what the agent found, `/statusline` appears to be either a built-in command or a pre-installed skill that spawns a specialized agent to configure your status line.

## Skills: Custom vs Built-in

## Examples

### /statusline

```
/statusline I want to show the current git branch, the model name, and context usage percentage
```

The `/statusline` command triggered a specialized agent to configure a custom status line for Claude Code based on your shell's PS1 prompt configuration.

**What it does:**
- The status line appears at the bottom of Claude Code's interface
- It can show useful info like your username, hostname, current directory, git branch, etc.
- The agent read your `~/.bashrc` to match your existing terminal prompt style (green `user@host`, blue `/path`)

**What you need to do:**
If you want this feature, you'd add the `statusLine` configuration to your `~/.claude/settings.json` file using one of the two options the agent provided.

**What is the status line?**
It's the bar at the very bottom of the Claude Code terminal interface. By default it shows things like the model name, cost, and context usage. You can customize it to show whatever you want.

**Where is it configured?**
In `~/.claude/settings.json` - this is your user-level Claude Code settings file. It affects Claude Code globally (all projects), not just this one.

**What would we change?**
We'd add a `statusLine` property to that JSON file. It looks something like:
```json
{
  "statusLine": {
    "type": "command",
    "command": "some shell command that outputs text"
  }
}
```

**Claude:** You don't need to use the `/statusline` command at all. Just tell me what you want and I can help you directly.

The `/statusline` command is a shortcut that spawns a specialized agent with a default prompt (to read your PS1 config). But since we're already talking about it, just describe what you want here and I'll:
