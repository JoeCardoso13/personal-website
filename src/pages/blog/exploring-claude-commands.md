---
layout: ../../layouts/BlogPost.astro
title: "Exploring Claude Code Slash Commands"
date: "TBD"
description: "A conversation exploring how Claude Code slash commands work, their structure, and the skills system."
---

## Background

I was exploring Claude Code's slash commands to potentially write a blog post about them. This is a raw conversation capture that I'll structure later.

---

**Joe:** Could you explain me what's going on?

**Claude:** The `/statusline` command triggered a specialized agent to configure a custom status line for Claude Code based on your shell's PS1 prompt configuration.

**What it does:**
- The status line appears at the bottom of Claude Code's interface
- It can show useful info like your username, hostname, current directory, git branch, etc.
- The agent read your `~/.bashrc` to match your existing terminal prompt style (green `user@host`, blue `/path`)

**What you need to do:**
If you want this feature, you'd add the `statusLine` configuration to your `~/.claude/settings.json` file using one of the two options the agent provided.

**If you didn't mean to run this:**
No worries - nothing was changed. The `/statusline` command was triggered (possibly accidentally), and the agent just provided instructions. You can ignore it if you're not interested in customizing the status line.

Want me to help you set it up, or shall we move on to something else?

The `/statusline` command is a feature in Claude Code that lets you customize the status line at the bottom of the terminal interface.

**What just happened:**
1. The `/statusline` command was triggered (possibly by accident when you typed something)
2. It launched a specialized agent that read your bash configuration (`~/.bashrc`) to see how your terminal prompt looks
3. The agent provided instructions to make Claude Code's status line match your terminal style (green `user@host:` blue `/path`)

**What the status line is:**
It's the info bar at the bottom of Claude Code that can show things like:
- Current directory
- Git branch
- Model being used
- Context usage
- Or custom info matching your terminal prompt

**Nothing was changed** - the agent just gave you instructions. If you want to set it up, you'd manually add the config to `~/.claude/settings.json`. If you don't care about it, just ignore it.

Was this triggered by accident, or are you interested in customizing your status line?

---

**Joe:** It was no accident. The thing is that I'm a bit wary of changing things globally, so when the interface asked me to approve global changes I just couldn't say yes right away on the spot like that. If I'm going to edit a file, say, `~/.claude/settings.json` I need to know exactly what I'm doing before taking any steps.

But I am indeed interested in customize the status line at the bottom of the terminal interface. I have some ideas of what I want there. First, could you explain me what we'd be doing?

**Claude:** Totally reasonable approach. Let me explain what we're dealing with.

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

The `command` runs in your shell and whatever it outputs becomes the status line content. You can include ANSI color codes for styling.

**What's the risk?**
Very low. If the status line config is broken or you don't like it:
- Claude Code will still work fine
- You just remove or edit the `statusLine` property
- Worst case: delete the whole settings.json and Claude Code regenerates defaults

**What are your ideas?**
You mentioned you have some ideas for what you want there. What would you like to display? Common options include:
- Current directory
- Git branch
- Username/hostname
- Date/time
- Custom text
- Any combination with colors

Once you tell me what you want, I can help you craft the command and show you exactly what would go in the file before you make any changes.

---

**Joe:** Does my prompt explaining what I want for the status line goes after the `/statusline` command, e.g. `/statusline I want this, this and that`?

**Claude:** You don't need to use the `/statusline` command at all. Just tell me what you want and I can help you directly.

The `/statusline` command is a shortcut that spawns a specialized agent with a default prompt (to read your PS1 config). But since we're already talking about it, just describe what you want here and I'll:

1. Show you the exact JSON that would go in your settings file
2. Explain what each part does
3. Let you review it before making any changes

So - what would you like your status line to show?

---

**Joe:** Humm... Honestly, I as much want to change my status line, as I am actually practicing some Claude commands in order to - maybe - write a blog post about them in the future...

**Claude:** That makes sense! In that case, let me answer your original question properly:

**Yes**, you can pass your requirements after the command. For example:

```
/statusline I want to show the current git branch, the model name, and context usage percentage
```

The agent will then use your description to craft the appropriate configuration.

**Other useful commands to explore for your blog post:**

- `/help` - shows available commands
- `/model` - switch models mid-conversation
- `/clear` - clear conversation history
- `/compact` - manually trigger context compaction
- `/cost` - show session cost
- `/config` - view/edit configuration

Feel free to experiment with `/statusline` using your actual requirements. When the agent returns with the configuration, you'll see exactly what it proposes - and you can still decline to apply it if you want. Nothing changes until you explicitly approve edits to the settings file.

Go ahead and try it with what you actually want for your status line!

---

**Joe:** Is this a pattern for claude 'slash' commands? Like, how claude defines arity? The 'slash' command is like a function call/invocation and if it takes any argument, these go right in front of it, and after the arguments whatever is written is interpreted as the prompt for Claude to act upon the command???

**Claude:** Honestly, I'm not 100% certain about the universal pattern across all slash commands. Different commands seem to work differently:

- **No arguments**: `/help`, `/clear`, `/cost`, `/compact` - just execute
- **Simple arguments**: `/model sonnet` - takes a model name
- **Prompt-style**: `/statusline <your description>` - passes text to a specialized agent

I don't want to give you inaccurate information for a blog post. Want me to look into the Claude Code documentation to get you accurate details on how slash commands and their arguments/prompts are structured? That way you'd have solid technical info to write about.

---

**Joe:** I've looked into the 'documentation' myself. I think calling it a 'documentation' is very generous... It's pretty much a super light basic description at best

**Claude:** Ha, fair point! The docs are pretty minimal.

If you're researching for a blog post, I can spawn an agent that has access to more detailed Claude Code information - it might be able to dig up specifics about the slash command patterns.

[Agent spawned and returned detailed information]

That's a lot more detail. Here's the key takeaway:

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

**Joe:** SKILL.md??? Never heard about it!

What exactly is the difference between a 'hardcoded' command and a 'skill-based' one, as you say?

**Claude:** Good question! Let me break it down:

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

---

## Notes for Future Editing

- Need to add introduction explaining what Claude Code is
- Should structure this more as a tutorial/guide rather than raw conversation
- Could add code examples of creating custom skills
- Might want to include screenshots of the status line in action
- Need to verify technical details about built-in vs skill-based commands
- Add conclusion about the flexibility of the skills system
