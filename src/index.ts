#!/usr/bin/env node
// Entry point: runs the discoverability MCP server over stdio.
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

const server = createServer();
await server.connect(new StdioServerTransport());
// stdout carries the protocol; diagnostics go to stderr only
console.error("ndl-pubsec-mcp running on stdio");
