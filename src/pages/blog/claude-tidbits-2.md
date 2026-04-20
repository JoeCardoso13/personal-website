---
layout: ../../layouts/BlogPost.astro
title: "Claude Code Tidbits: understanding plugins"
date: "April 18, 2026"
description: "Learning how Claude Code plugins bundle skills, commands, agents, and other extensions."
banner: /claude-tidbits-logo.svg
---

## Intro

In the first [Claude Code Tidbits](/blog/claude-tidbits-1), I looked at skills. What's interesting about them is not just that they are useful, but that they became an [open spec](https://agentskills.io/specification): a small, file-based format that other agents can plausibly adopt.

[Plugins](https://claude.com/plugins) are Anthropic's opinionated package format that can contain skills, and in simple cases they may look like a [folder of skills with extra metadata](https://code.claude.com/docs/en/plugins-reference). But the important distinction is that a plugin usually contains a bundle of assumptions about the host environment.

In this post I'll give an example of how a plugin workflow can work cleanly in **Claude Code** but behave differently in **Codex**, not because the model could not read or interpret the Markdown, but because the surrounding [harness](https://martinfowler.com/articles/harness-engineering.html) was different.

## What a Plugin Adds

A plugin gives Claude Code a namespaced bundle. That bundle entry point is a `.claude-plugin/plugin.json` file and can include several kinds of components:

- `skills/` for reusable Markdown-based workflows
- `commands/` for slash commands
- `agents/` for specialized subagents
- `hooks/` for lifecycle automation
- `.mcp.json` for MCP servers
- `.lsp.json` for language servers
- `monitors/`, `bin/`, `settings.json`, and output styles for deeper integration

The LLM model is at the core of agentic AI. But when comparing models from the same generation - say Opus 4.6 and  GPT-5.3-Codex - the [runtime around the model]() sometimes matters more than the model itself. It's what decides how instructions are discovered, invoked, permissioned, delegated, and connected to tools.

Anthropic documents [Claude Code plugins](https://claude.com/plugins) as their specific packaging layer for skills, commands, agents, hooks, MCP and LSP servers, monitors, executable tools, and settings. There is no official open, cross-agent plugin specification analogous to the [Agent Skills spec](https://agentskills.io/specification). The open standards show up, though, as the pieces a plugin can contain, like [Agent Skills](https://code.claude.com/docs/en/skills) and [MCP](https://code.claude.com/docs/en/mcp), rather than the plugin container itself.

## Example

### /context-engineering-kit

Folks at [NeoLab](https://neolab.finance/) have created a [marketplace](https://cek.neolab.finance/) with several plugins. Let's take a look at their [TDD plugin](https://cek.neolab.finance/plugins/tdd). How awesome would it be to have an agent infused with the decades of engineering practice drenched into the classics [Test Driven Development: By Example](https://www.oreilly.com/library/view/test-driven-development/0321146530/) and [Refactoring: Improving the Design of Existing Code](https://martinfowler.com/books/refactoring.html)? Well, this is what the [this plugin claims](https://cek.neolab.finance/plugins/tdd#foundational-works) to do. Let's install and check it out (it's free)!

First, Claude Code needs to know about the marketplace:

```bash
/plugin marketplace add NeoLabHQ/context-engineering-kit
```

A marketplace is a catalog. In this case, the catalog is the [Context Engineering Kit](https://cek.neolab.finance/) curated repository, and its  file lists several plugins, including `tdd`.

Your global Claude settings know about the marketplace itself here:

```
  "extraKnownMarketplaces": {
    "context-engineering-kit": {
      "source": {
        "source": "github",
        "repo": "NeoLabHQ/context-engineering-kit"
      }
    }
  }
```

Then you install one plugin from that catalog:

```bash
/plugin install tdd@NeoLabHQ/context-engineering-kit
```

Throughout the CLI propts you choose how to install, e.g. if local to project or globally available. I chose the former and this popped up in my `./.claude/settings.local.json`:

```
  "enabledPlugins": {
    "tdd@context-engineering-kit": true
  }
```

Claude keeps two related copies/records. The marketplace clone is here:

```
~/.claude/plugins/marketplaces/context-engineering-kit/plugins/tdd
```

The installed plugin cache is here:

```
/home/joe/.claude/plugins/cache/context-engineering-kit/tdd/1.1.0
```

The installed plugin cache is the clearest place to inspect what got installed:

```text
~/.claude/plugins/cache/context-engineering-kit/tdd/1.1.0
├── .claude-plugin/
│   └── plugin.json
├── README.md
└── skills/
    ├── fix-tests/
    │   └── SKILL.md
    ├── test-driven-development/
    │   └── SKILL.md
    └── write-tests/
        └── SKILL.md
```

### Namespaced Skills

If you install a standalone skill named `write-tests`, you expect to invoke it directly as something like:

```bash
/write-tests
```

But inside a plugin named `tdd`, you use the plugin namespace:

```bash
/tdd:write-tests
```

This plugin has three skills (although it calls the last 2 as 'slash commands'):

- `tdd:test-driven-development`
- `tdd:write-tests`
- `tdd:fix-tests`

The first one is the core philosophy, and arguably the most important: no production code without a failing test first. The other two are about operational workflows for adding missing tests and fixing failing tests.

## Go Explore

I have used the `test-driven-development` skill and it worked like a charm! It helped me expand my [Brush Up Python app](https://www.joecardoso.dev/brush-up-py) into a [Brush Up Ruby app](https://www.joecardoso.dev/brush-up-rb) and [Brush Up JavaScript app](https://www.joecardoso.dev/brush-up-js), using the same backend. Since I had the notes written for the other 2 topics in the same Zettelkasten format already, I just had to adapt the backend and my app multiplied to 3! The TDD skill helped my agents be very intentional about the implementation, stay on track, and subdivide the problem into bitesized chunks.

It's important to note that the TDD plugin assumes a particular control system around the model. Since [plugins](https://code.claude.com/docs/en/plugins) are not an open spec in the same way skills are, they carry Claude Code's design opinions with them. For example, when making complex code changes, the instructions tell the agent to **dispatch specialized subagents**. That does not transfer one-to-one to Codex, where subagents can only be dispatched from a user's explicit prompting. This is a solid example of [harness](https://martinfowler.com/articles/harness-engineering.html) coming into play.
