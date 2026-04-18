---
layout: ../../layouts/BlogPost.astro
title: "Claude Code Tidbits: understanding plugins"
date: "April 18, 2026"
description: "Learning how Claude Code plugins bundle skills, commands, agents, and other extensions."
banner: /claude-tidbits-logo.svg
---

## Intro

In the first [Claude Code Tidbits](/blog/claude-tidbits-1), I looked at skills. What's interesting about them is not just that they are useful, but that they were built around an [open spec](https://agentskills.io/specification): a small, file-based format that other agents can plausibly adopt.

Plugins are Anthropic's opinionated package that can contain skills, and in simple cases they may look like a [folder of skills with extra metadata](https://code.claude.com/docs/en/plugins-reference). But the important distinction is that a plugin usually contains a bundle of assumptions about the host environment.

I'll give an example here of how a skill workflow can work cleanly in Claude Code but behave differently in Codex. And that's not because the model could not read or interpret the Markdown, but because the surrounding harness was different. The model is at the core of agentic AI, of course. But when comparing models from the same generation - say Opus 4.6 and Codex 5.3 - the runtime around the model can matter more than the model itself. It's what decides how instructions are discovered, invoked, permissioned, delegated, and connected to tools. As models become more capable, these product-layer differences overshadow the model's nuances.

Anthropic documents Claude Code plugins as a Claude Code-specific packaging layer for skills, commands, agents, hooks, MCP and LSP servers, monitors, executable tools, and settings. There is no official open, cross-agent plugin specification analogous to the Agent Skills spec. The open standards show up, though, as the pieces a plugin can contain, like [Agent Skills](https://code.claude.com/docs/en/skills) and [MCP](https://code.claude.com/docs/en/mcp), rather than the plugin container itself.

## What a Plugin Adds

A standalone skill gives Claude a reusable instruction file. A plugin gives Claude Code a namespaced bundle.

That bundle entry point is a `.claude-plugin/plugin.json` file and can include several kinds of components:

- `skills/` for reusable Markdown-based workflows
- `commands/` for slash commands
- `agents/` for specialized subagents
- `hooks/` for lifecycle automation
- `.mcp.json` for MCP servers
- `.lsp.json` for language servers
- `monitors/`, `bin/`, `settings.json`, and output styles for deeper integration

## Example

Folks at [NeoLab](https://neolab.finance/) have created a [marketplace](https://cek.neolab.finance/) with several plugins. A particular interesting one is the [TDD](https://cek.neolab.finance/plugins/tdd). How awesome would it be to have an agent infused with the decades of engineering practice drenched into the classics [Test Driven Development: By Example](https://www.oreilly.com/library/view/test-driven-development/0321146530/) and [Refactoring: Improving the Design of Existing Code](https://martinfowler.com/books/refactoring.html)? Well, this is what the [this plugin claims](https://cek.neolab.finance/plugins/tdd#foundational-works) to be about. Let's install and check it out (it's free)!

First Claude Code needs to know about a marketplace:

```bash
/plugin marketplace add NeoLabHQ/context-engineering-kit
```

A marketplace is a catalog. In this case, the catalog is the [Context Engineering Kit](https://cek.neolab.finance/) curated repository, and its marketplace file lists several plugins, including `tdd`.

Then you install one plugin from that catalog:

```bash
/plugin install tdd@NeoLabHQ/context-engineering-kit
```

That resolves to the `tdd` entry in the marketplace, it does not install every plugin in the repository, only the one named `tdd`.

For the TDD plugin, the source directory currently looks roughly like this:

```text
plugins/tdd/
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

## Namespaced Skills

If you install a standalone skill named `write-tests`, you expect to invoke it directly as something like:

```bash
/write-tests
```

But inside a plugin named `tdd`, you use the plugin namespace:

```bash
/tdd:write-tests
```

This plugin has three skills:

- `tdd:test-driven-development`
- `tdd:write-tests`
- `tdd:fix-tests`

The first one is the core philosophy, and arguably the most important: no production code without a failing test first. The other two are about operational workflows for adding missing tests and fixing failing tests.

Those operational workflows are written for Claude Code's world. For instance, when making complex code changes, the instructions tell the agent to dispatch specialized subagents: reviewers to identify coverage gaps, developers to write tests, and reviewers again to verify the result. But that doesn't work for a Codex, it can only dispatch subagents from a user's specific prompting.

## Harness

A model can understand the words in a skill perfectly and still behave differently if the harness gives it different tools or different constraints. The product layer around the model is the new playground for engineers: the filesystem conventions, command system, permission model, tool access, plugin loader, subagent support, and rules for how context is injected.

Coming from a SWE world where writing code was so expensive, it's easy to underestimate the importance of harness - the world before AI agents took over. We used to be more aware of opinions embedded in our design choices when time to iterate was longer and solutions abound.

## Takeaway

Assuming that most plugins don't go much further beyond simply packaging a bunch of skills, it bears to mind the cognition that the distance between agents skills, as an open spec, and plugins, a Claude specific standard, resonates with how the industry converges and diverges upon conventions in this new agentic AI Cambrian explosion.
