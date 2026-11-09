// End-to-end over the MCP protocol, using the SDK's in-memory transport and a stubbed catalogue.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { beforeEach, describe, expect, it } from "vitest";
import { createServer, TOOL_NAMES } from "../src/server.js";
import { ckanPackage, jsonResponse, validDataset } from "./fixtures.js";

let client: Client;

async function connect(fetcher: (u: string) => Promise<Response>) {
  const server = createServer({ fetcher, baseUrl: "https://ckan.example.org/api/action" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(a);
  const c = new Client({ name: "test", version: "0" });
  await c.connect(b);
  return c;
}

const data = (r: unknown) => (r as { structuredContent: Record<string, unknown> }).structuredContent;

beforeEach(async () => {
  client = await connect(async (u) =>
    u.includes("package_search")
      ? jsonResponse({ success: true, result: { count: 2, results: [ckanPackage(), ckanPackage({ id: "b", name: "b" })] } })
      : jsonResponse({ success: true, result: ckanPackage() })
  );
});

describe("MCP server", () => {
  it("lists exactly the four read-only tools", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([...TOOL_NAMES].sort());
    for (const t of tools) {
      expect(t.annotations?.readOnlyHint).toBe(true);
      expect(t.annotations?.destructiveHint).toBe(false);
      expect(t.description?.length).toBeGreaterThan(40);
    }
  });

  it("catalogue_search returns summarised results", async () => {
    const r = data(await client.callTool({ name: "catalogue_search", arguments: { query: "school census", limit: 2 } }));
    expect(r.ok).toBe(true);
    expect(r.returned).toBe(2);
    expect(JSON.stringify(r)).not.toMatch(/@example\.org/);
  });

  it("catalogue_search rejects each bad input on its own, before calling the catalogue", async () => {
    // one fault per call, so one rule cannot mask another (defect D-012)
    for (const args of [{ query: "x" }, { query: "flood risk", limit: 21 }, { query: "flood risk", limit: 0 }, { query: "flood risk", offset: -1 }, { query: "flood risk", organisation: "Bad Slug!" }]) {
      const r = await client.callTool({ name: "catalogue_search", arguments: args });
      expect(r.isError, JSON.stringify(args)).toBe(true);
    }
    const ok = await client.callTool({ name: "catalogue_search", arguments: { query: "flood risk", limit: 20 } });
    expect(ok.isError).toBeFalsy();
  });

  it("dataset_describe returns the dataset and its xGov MEM gaps", async () => {
    const r = data(await client.callTool({ name: "dataset_describe", arguments: { id: "school-census-example" } }));
    const mem = r.xgovMem as { valid: boolean; draftRecord: Record<string, unknown> };
    expect(mem.valid).toBe(false);
    expect(mem.draftRecord.type).toBe("dcat:Dataset");
    expect(JSON.stringify(r)).not.toMatch(/@example\.org/);
  });

  it("dataset_describe refuses ids that are not slugs", async () => {
    const r = await client.callTool({ name: "dataset_describe", arguments: { id: "../../etc/passwd" } });
    expect(r.isError).toBe(true);
  });

  it("metadata_validate validates a record", async () => {
    const ok = data(await client.callTool({ name: "metadata_validate", arguments: { record: validDataset } }));
    expect(ok.valid).toBe(true);
    const bad = data(await client.callTool({ name: "metadata_validate", arguments: { record: { ...validDataset, accessRights: "nope" } } }));
    expect(bad.valid).toBe(false);
  });

  it("standard_explain lists all and finds one, and says what it knows when it cannot", async () => {
    const all = data(await client.callTool({ name: "standard_explain", arguments: {} }));
    expect((all.standards as unknown[]).length).toBeGreaterThanOrEqual(5);
    const one = data(await client.callTool({ name: "standard_explain", arguments: { id: "xgov-mem" } }));
    expect((one.standard as { provenance: string }).provenance).toMatch(/^[VSKU]$/);
    const none = await client.callTool({ name: "standard_explain", arguments: { id: "nothing-like-this" } });
    expect(none.isError).toBe(true);
  });

  it("reports catalogue outages as tool errors with a hint", async () => {
    const down = await connect(async () => { throw new TypeError("fetch failed"); });
    const r = await down.callTool({ name: "catalogue_search", arguments: { query: "flood risk" } });
    expect(r.isError).toBe(true);
    expect(JSON.stringify(r)).toMatch(/NDL_MCP_CKAN_BASE/);
  });

  it("exposes the rule set and standards register as resources", async () => {
    const { resources } = await client.listResources();
    expect(resources.map((r) => r.uri).sort()).toEqual(["ndl-pubsec-mcp://standards", "ndl-pubsec-mcp://xgov-mem/rules"]);
    const r = await client.readResource({ uri: "ndl-pubsec-mcp://xgov-mem/rules" });
    expect((r.contents[0] as { text: string }).text).toContain("Dataset");
  });
});
