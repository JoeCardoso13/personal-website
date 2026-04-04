---
layout: ../../layouts/BlogPost.astro
title: "Claude Code Tidbits: MCPB, the MCP bundle standard"
date: "April 4, 2026"
description: "A look at MCPB — the self-contained bundle format for shipping MCP servers."
banner: /claude-tidbits-logo.svg
---

---
(Reference Material - Development Only)

## What MCPB Is

MCPB (MCP Bundles) is an open standard for packaging and distributing local MCP servers. A `.mcpb` file is a ZIP archive containing the server code, all its dependencies, and a `manifest.json` that describes what it does and how to run it.

The analogy from the official docs is apt: it's the `.crx` of Chrome extensions or the `.vsix` of VS Code extensions — a self-contained artifact users can install with one click, without touching a terminal.

It lives at [github.com/modelcontextprotocol/mcpb](https://github.com/modelcontextprotocol/mcpb) and is part of the Model Context Protocol project.

---

## History: DXT → MCPB

MCPB started as an internal Anthropic project called **DXT** (Desktop Extensions), built specifically for Claude for macOS and Windows. Anthropic later donated it to the MCP project and renamed it to MCPB to signal it was a cross-client standard, not a Claude-specific thing.

If you see references to `.dxt` files, the `dxt` CLI, or `@anthropic-ai/dxt` — that's the old name. Everything is now `.mcpb`, `mcpb` CLI, `@anthropic-ai/mcpb`.

---

## Bundle Structure

Three runtime flavors, all the same outer wrapper:

**Node.js bundle** (recommended):
```
manifest.json
server/index.js
node_modules/       ← vendored, no npm install at runtime
icon.png
```

**Python bundle:**
```
manifest.json
server/main.py
server/lib/         ← bundled packages (or venv/)
requirements.txt
```

**Binary bundle:**
```
manifest.json
server/my-server        ← Unix
server/my-server.exe    ← Windows
```

**UV (experimental, v0.4+):** Python via UV — the host manages the Python runtime and dependencies, declared in `pyproject.toml`. No bundling needed.

Node.js is recommended for distribution because Claude for macOS and Windows ships with Node, so users have zero extra installs. Python bundles hit a hard wall with compiled dependencies (e.g., pydantic) that can't be portably bundled.

---

## The manifest.json

The only required file. Current spec is **v0.3** (updated December 2025). Key fields:

```json
{
  "manifest_version": "0.3",
  "name": "my-server",
  "display_name": "My Server",
  "version": "1.0.0",
  "description": "...",
  "author": { "name": "...", "email": "..." },
  "server": {
    "type": "node",
    "entry_point": "server/index.js"
  },
  "mcp_config": {
    "command": "node",
    "args": ["${__dirname}/server/index.js"],
    "env": { "HOME": "${HOME}" }
  },
  "tools": [...],
  "user_config": {...}
}
```

**`mcp_config`** is how the host launches the server. Supports variable substitution: `${__dirname}` resolves to the installation directory, `${user_config.*}` injects values the user provided at install time.

**`user_config`** defines what the host asks the user during installation — API keys, directories, booleans, etc. Sensitive values (API keys) are stored in the OS keychain, not in plaintext config files.

**`tools` / `prompts` / `resources`**: declare what the server exposes statically. If the server generates tools dynamically at runtime, set `tools_generated: true` instead.

**`compatibility`**: client version constraints, platform requirements (`darwin`, `win32`, `linux`), runtime version floors.

**`platform_overrides`**: OS-specific server config — different entry points or args per platform.

---

## CLI

```bash
npm install -g @anthropic-ai/mcpb

# Generate manifest.json interactively
mcpb init

# Package into .mcpb
mcpb pack

# Validate a bundle without installing
mcpb validate my-server.mcpb
```

---

## What Happens at Install Time

When a user opens a `.mcpb` file in a supporting client (Claude Desktop, Claude Code, MCP for Windows):

1. Client extracts the ZIP archive
2. Prompts for any `user_config` values
3. Stores sensitive values in OS keychain
4. Launches the server via `mcp_config` command/args
5. Registers the declared tools and prompts

No network calls. No package manager. The bundle is inert — it runs exactly what was packaged.

---

## Relationship to mpak

MCPB is the **format**. mpak is a **registry** that hosts `.mcpb` files and adds security scanning on top. You can create and distribute `.mcpb` files without mpak entirely — upload to GitHub releases, host anywhere. mpak just gives you discovery, trust scores, and a verified install path via its CLI.

The `mcpb-pack` GitHub Action (by NimbleBrain) automates building `.mcpb` files in CI and optionally publishing to mpak.

---

## Supported Clients (as of 2026)

- Claude for macOS
- Claude for Windows
- Claude Code
- MCP for Windows
- Any client that implements the MCPB install spec

---

## Relevant Sources

- [github.com/modelcontextprotocol/mcpb](https://github.com/modelcontextprotocol/mcpb)
- [Adopting the MCP Bundle format — MCP Blog](https://blog.modelcontextprotocol.io/posts/2025-11-20-adopting-mcpb/)
- [.mcpb File Reference — mcpbundles.com](https://www.mcpbundles.com/docs/concepts/mcpb-files)
- [NimbleBrainInc/mcpb-pack — GitHub Action](https://github.com/NimbleBrainInc/mcpb-pack)
- [@anthropic-ai/mcpb — npm](https://www.npmjs.com/package/@anthropic-ai/mcpb)
