# ADR 0003: TypeScript, the official MCP SDK and stdio transport

- Status: accepted
- Date: 8 November 2026

## Options

1. **TypeScript with `@modelcontextprotocol/sdk` over stdio (chosen).** The reference SDK, with Zod schemas, and it runs locally without hosting.
2. **Python with the MCP Python SDK.** Equally capable, and LinkML is Python, but the team's earlier scaffold and CI were TypeScript.
3. **A hosted HTTP server.** Easier for some clients, but needs hosting, authentication, monitoring and a security review. Not proportionate for an alpha.

## Decision

Option 1. Dependencies are pinned to exact versions. A hosted, streamable HTTP mode is a possible later step (open item O-07).

## Consequences

- Users must run Node.js 20 or later.
- No hosting or credentials, so a smaller attack surface.
