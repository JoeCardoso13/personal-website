---
layout: ../../layouts/BlogPost.astro
title: "Claude Code Tidbits: MCP, the open standard for agent tooling"
date: "April 4, 2026"
description: "The origin, the spec, and the nitty-gritty of how an MCP server actually works in practice."
banner: /claude-tidbits-logo.svg
---

---
(Reference Material - Development Only)

## Origin Story

The Model Context Protocol was publicly announced by Anthropic on **November 25, 2024**, created by engineers **David Soria Parra** and **Justin Spahr-Summers**.

The problem it targeted: the **M×N integration problem**. Before MCP, connecting M AI models to N tools meant building M×N custom connectors. Every model had its own API, every tool integration had to be written separately for every client. The origin story is grounded: David Soria Parra got tired of copying the same connector code between Claude Desktop and his IDE.

MCP's design is explicitly inspired by the [Language Server Protocol](https://microsoft.github.io/language-server-protocol/) — the same idea that standardized how editors talk to language-specific tools (go-to-definition, autocomplete, diagnostics) across the entire editor ecosystem. MCP does the same for AI ↔ tool connections.

---

## Governance

In **December 2025**, Anthropic transferred MCP to the **Agentic AI Foundation (AAIF)**, a directed fund under the **Linux Foundation**, co-founded by Anthropic, Block, and OpenAI. This moved MCP from a vendor-controlled standard to a community-managed one.

Industry adoption before the transfer:
- **OpenAI**: adopted in March 2025, integrated into ChatGPT desktop
- **Google DeepMind**: announced support in April 2025
- **Developer tools**: Replit, Sourcegraph, Zed, Cursor, and many others

SDKs exist for Python, TypeScript, Go, Java, Kotlin, C#, Ruby, Rust, PHP, Perl.

---

## Architecture: Three Actors

```
Host (e.g., Claude Code)
  └── Client (connector inside the host)
        └── Server (the MCP server process/service)
```

- **Host**: the LLM application. Initiates connections, owns the user interaction.
- **Client**: the connector embedded in the host. Manages the protocol lifecycle with one specific server.
- **Server**: exposes capabilities. Can be a local subprocess or a remote HTTP service.

A host can have multiple clients, each connected to a different server simultaneously.

---

## The Three Server Primitives

**Tools** — functions the model can call. Model-controlled: the LLM decides when to invoke them based on context. Example: `get_weather`, `run_sql_query`, `create_github_issue`.

**Resources** — data/context the host can inject. User or model-controlled. Think: file contents, database records, API responses. Not invocable — they're read, not called.

**Prompts** — parameterized message templates. User-controlled. Think: slash commands or workflows a user triggers explicitly. Example: a "summarize PR" prompt that takes a PR number and produces a structured prompt for the model.

---

## Connection Lifecycle

Every MCP connection follows the same handshake regardless of transport:

1. **Client → Server**: `initialize` request (client sends its protocol version + capabilities)
2. **Server → Client**: `InitializeResult` (server responds with its protocol version + capabilities)
3. **Client → Server**: `notifications/initialized` (client acknowledges, session is live)
4. Normal operation begins

**Capability negotiation** happens here. The client declares what it supports (sampling, roots, elicitation); the server declares what it exposes (tools, resources, prompts). Neither side is required to support everything.

---

## Transports

### stdio (local servers)

The client **spawns the MCP server as a subprocess**. Messages go over stdin/stdout as newline-delimited JSON-RPC 2.0. Logs go to stderr. Nothing else touches stdout — any non-MCP output from the server breaks the protocol.

```
Client
  ├── writes JSON-RPC to server's stdin
  ├── reads JSON-RPC from server's stdout
  └── optionally reads logs from server's stderr
```

This is the recommended transport for local servers. Claude Code uses this to run `npx`, `python`, or binary MCP servers as subprocesses.

### Streamable HTTP (remote servers)

The current HTTP transport (replaced the old HTTP+SSE from spec version `2024-11-05`). The server exposes a single endpoint (e.g., `https://example.com/mcp`) that handles both POST and GET:

- **POST**: client sends a JSON-RPC request. Server responds with either `application/json` (single response) or `text/event-stream` (SSE stream for multi-message responses).
- **GET**: client opens a long-lived SSE stream to receive server-initiated messages (notifications, requests).

Session management: the server can issue an `Mcp-Session-Id` header at initialization. The client includes it on all subsequent requests. Sessions can be terminated with HTTP DELETE.

Resumability: servers can attach `id` to SSE events; clients can reconnect with `Last-Event-ID` to replay missed messages.

**Security note**: Streamable HTTP servers must validate the `Origin` header to prevent DNS rebinding attacks, and should bind to `127.0.0.1` (not `0.0.0.0`) when running locally.

### Legacy HTTP+SSE (deprecated)

The original HTTP transport from the `2024-11-05` spec. Separate SSE endpoint for server→client and POST endpoint for client→server. Still supported for backwards compatibility but replaced by Streamable HTTP.

---

## How Tools Actually Work (Protocol Level)

**Discovery**: client sends `tools/list`, server returns an array of tool definitions with name, description, and JSON Schema for inputs.

```json
// tools/list response (abbreviated)
{
  "tools": [{
    "name": "get_weather",
    "description": "Get current weather for a location",
    "inputSchema": {
      "type": "object",
      "properties": { "location": { "type": "string" } },
      "required": ["location"]
    }
  }]
}
```

**Invocation**: client sends `tools/call` with the tool name and arguments.

```json
// tools/call request
{ "method": "tools/call", "params": { "name": "get_weather", "arguments": { "location": "Lisbon" } } }

// response
{ "result": { "content": [{ "type": "text", "text": "22°C, partly cloudy" }], "isError": false } }
```

Tool results can be text, images, audio, resource links, or embedded resources — all typed content blocks. Errors come in two flavors: **protocol errors** (JSON-RPC error objects, for unknown tools or bad arguments) and **execution errors** (`isError: true` in the result body, for things like API failures).

If the server's tool list changes at runtime, it sends `notifications/tools/list_changed` and the client re-fetches.

---

## Client Capabilities (Servers Can Call Back)

The protocol is bidirectional. Servers can request things from clients:

- **Sampling**: server asks the client to run an LLM inference on its behalf. Enables server-side agentic behavior without the server having direct API access.
- **Roots**: server asks what filesystem/URI boundaries it's allowed to operate in.
- **Elicitation**: server requests additional information from the user mid-operation.

This is how MCP enables more than just "call a function" — servers can participate in multi-step agentic workflows.

---

## Security Considerations

The spec is explicit: MCP gives servers access to arbitrary data and code execution paths. Key attack vectors identified in April 2025 security research:

- **Prompt injection**: malicious content in tool results injecting instructions into the model's context
- **Tool poisoning**: a tool's `description` or `annotations` influencing the model to misuse it (annotations must be treated as untrusted unless the server itself is trusted)
- **Data exfiltration**: overly permissive tool permissions enabling silent data leaks
- **DNS rebinding**: local HTTP servers accessible from remote websites if not bound to localhost

The spec's position: these can't be enforced at the protocol level. Hosts are responsible for consent flows, confirmation prompts, and access controls.

---

## Relevant Sources

- [MCP Specification (2025-11-25)](https://modelcontextprotocol.io/specification/2025-11-25)
- [MCP Transports — modelcontextprotocol.io](https://modelcontextprotocol.io/docs/concepts/transports)
- [MCP Tools — modelcontextprotocol.io](https://modelcontextprotocol.io/docs/concepts/tools)
- [Model Context Protocol — Wikipedia](https://en.wikipedia.org/wiki/Model_Context_Protocol)
- [MCP History — MCP Server Spot](https://www.mcpserverspot.com/learn/fundamentals/mcp-history)
- [A Year of MCP — Pento](https://www.pento.ai/blog/a-year-of-mcp-2025-review)
- [MCP Protocol: a new AI dev tools building block — The Pragmatic Engineer](https://newsletter.pragmaticengineer.com/p/mcp)
