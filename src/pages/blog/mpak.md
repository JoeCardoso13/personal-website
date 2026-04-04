---
layout: ../../layouts/BlogPost.astro
title: "Claude Code Tidbits: mpak and the MCP registry"
date: "April 4, 2026"
description: "A look at mpak, the registry for MCP servers, and how it fits into the broader agentic tooling ecosystem."
banner: /claude-tidbits-logo.svg
---

---
(Reference Material - Development Only)

## What mpak Is

[mpak](https://mpak.dev/) is an open-source package registry purpose-built for the MCP ecosystem, built by NimbleBrain. It hosts two things:

- **Bundles** — pre-packaged MCP servers in MCPB format (more on that in the MCPB post). Self-contained ZIPs with the server binary, all dependencies, and a manifest. No runtime network calls, no version drift.
- **Skills** — Markdown-based agent skills following the Agent Skills open standard. Cross-compatible with Claude Code, Cursor, Gemini CLI, etc.

Free for users and publishers. Apache 2.0 licensed. Self-hostable.

---

## mpak vs. the MCP Registry

Important distinction — they're not the same thing:

- **mpak** is a *package registry*: it hosts actual bundles with security scanning, verified checksums, and trust scores. You install from it.
- **The [MCP Registry](https://registry.modelcontextprotocol.io/)** (modelcontextprotocol.io) is a *metaregistry*: it aggregates server listings from multiple sources. It can reference mpak as a source. Think of it like PyPI vs. a curated package index.

The MCP Registry is the official community-driven index. mpak is opinionated and curated — currently ~50 servers, all verified to actually deploy and respond correctly. Their own data: 20% of listed MCP servers can't be deployed to production. mpak only lists what they've end-to-end tested.

---

## CLI

```bash
npm install -g @nimblebrain/mpak

# Install a bundle (MCP server)
mpak bundle pull @scope/bundle-name

# Install a skill
mpak skill install @scope/skill-name

# Search
mpak search [query]
```

After a bundle is installed, you add it to Claude Code via the standard MCP CLI:

```bash
claude mcp add <server-name> --transport stdio -- <command>
# or for HTTP transport:
claude mcp add <server-name> --transport http <url>
```

---

## Security Model

Every bundle published to mpak is scanned with **25 security controls across 5 domains**. Key properties:

- **Inert packages**: bundles are ZIPs with pre-installed dependencies. No PyPI calls, no npm installs at runtime — "exactly what's in the ZIP" runs.
- **SHA256 checksums**: verified before deployment
- **Signed artifacts**: verified provenance
- **Permission analysis**: what the server can access is audited at publish time
- **Trust scores**: L1 through L4 certification levels, visible on every package listing

Cold starts under 5 seconds because there's nothing to resolve at runtime.

---

## Publishing

Two files needed in your repo:

1. `manifest.json` — describes the bundle (name, runtime, entry point, permissions)
2. The `mcpb-pack` GitHub Action — on every release, it builds the MCPB bundle, attaches it to the GitHub release, runs security scans, and registers with mpak automatically

The full publish flow is automated. Create a release → action builds and scans → bundle appears in registry with trust score.

---

## Self-Hosting

mpak is Apache 2.0 and designed to be self-hosted. Enterprise features:
- **Federation**: sync with the public registry or other private instances
- **Custom policies**: enforce which servers are allowed in your org
- **Audit logging**: full trail of installs and publishes

This matters for regulated environments where you can't pull from a public registry — you run your own mpak instance, publish internal MCP servers to it, and enforce via managed settings in Claude Code.

---

## Why It Exists

The MCP ecosystem grew fast enough that the discovery problem became real. There are 3,000+ MCP servers floating around GitHub, but no way to know which ones actually work, which ones are safe to install, or which ones will break on your machine. mpak's answer is: don't index everything, only index what's verified.

The MCPB format is the packaging primitive that makes this possible — a server that ships as a self-contained bundle is testable in a way a server that requires `npm install` at runtime isn't.

---

## Relevant Sources

- [mpak.dev](https://mpak.dev/)
- [How We Built a Production MCP Registry — NimbleBrain](https://nimblebrain.ai/blog/production-mcp-server-registry/)
- [Official MCP Registry — modelcontextprotocol.io](https://registry.modelcontextprotocol.io/)
- [NimbleBrainInc/mcpb-pack — GitHub Action](https://github.com/NimbleBrainInc/mcpb-pack)
- [Connect Claude Code to tools via MCP — Claude Code Docs](https://code.claude.com/docs/en/mcp)
