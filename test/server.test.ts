// End-to-end over the MCP protocol, using the SDK's in-memory transport and a stubbed catalogue.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
  it("lists exactly the six read-only tools", async () => {
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
    expect(resources.map((r) => r.uri).sort()).toEqual(["ndl-pubsec-mcp://federation", "ndl-pubsec-mcp://standards", "ndl-pubsec-mcp://xgov-mem/rules"]);
    const r = await client.readResource({ uri: "ndl-pubsec-mcp://xgov-mem/rules" });
    expect((r.contents[0] as { text: string }).text).toContain("Dataset");
  });

  it("term_lookup summarises the bundled vocabulary and certifies nothing in it", async () => {
    const r = data(await client.callTool({ name: "term_lookup", arguments: {} }));
    const v = r.vocabulary as { certified: number; terms: number };
    expect(r.ok).toBe(true);
    expect(v.terms).toBeGreaterThan(10);
    expect(v.certified).toBe(0);
  });

  it("term_lookup finds a term with its certification state", async () => {
    const r = data(await client.callTool({ name: "term_lookup", arguments: { query: "DCAT" } }));
    const t = (r.terms as { label: string; certification: { certified: boolean; reviewLevel: string } }[])[0];
    expect(t.label).toBe("DCAT");
    expect(t.certification).toMatchObject({ certified: false, reviewLevel: "unknown" });
  });

  it("term_lookup reads a configured register and reports a certified term", async () => {
    const dir = mkdtempSync(join(tmpdir(), "r2-"));
    const path = join(dir, "glossary.json");
    writeFileSync(path, JSON.stringify({ terms: [{ term_id: "EX-001", preferred_label: "Data owner", definition: "Accountable for a data domain.", status: "endorsed", drafted_by: "human", review_level: "H3", semantic_bindings: "dept.assets.owner" }] }));
    const server = createServer({ vocabPath: path, fetcher: async () => jsonResponse({ success: true, result: {} }) });
    const [a, b] = InMemoryTransport.createLinkedPair();
    await server.connect(a);
    const c = new Client({ name: "test", version: "0" });
    await c.connect(b);
    const r = data(await c.callTool({ name: "term_lookup", arguments: { id: "EX-001" } }));
    expect(r.term).toMatchObject({ bindings: ["dept.assets.owner"], certification: { certified: true, reviewLevel: "H3" } });
    rmSync(dir, { recursive: true, force: true });
  });

  it("term_lookup reports an unreadable register as an error, not as an empty vocabulary", async () => {
    const server = createServer({ vocabPath: "/nonexistent/glossary.json", fetcher: async () => jsonResponse({ success: true, result: {} }) });
    const [a, b] = InMemoryTransport.createLinkedPair();
    await server.connect(a);
    const c = new Client({ name: "test", version: "0" });
    await c.connect(b);
    const r = await c.callTool({ name: "term_lookup", arguments: { query: "owner" } });
    expect(r.isError).toBe(true);
  });

  it("term_lookup rejects bad input before searching", async () => {
    for (const args of [{ query: "x" }, { id: "bad id!" }, { query: "dcat", limit: 26 }]) {
      const r = await client.callTool({ name: "term_lookup", arguments: args });
      expect(r.isError, JSON.stringify(args)).toBe(true);
    }
  });

  it("domain_list names the data quality commons with its provenance", async () => {
    const r = data(await client.callTool({ name: "domain_list", arguments: {} }));
    const domains = r.domains as { domain: string; self: boolean; vendoredFrom?: string; tools: string[] }[];
    expect(domains.find((d) => d.self)?.tools.sort()).toEqual([...TOOL_NAMES].sort());
    const dq = domains.find((d) => d.domain === "data-quality");
    expect(dq?.vendoredFrom).toMatch(/^cyberdudeuk\/dq-commons@[0-9a-f]{7}/);
    expect(dq?.tools).toContain("check_data");
    // D-021: the vendored manifest once listed 12 of the 15 tools dq-commons serves (fixed in dq-commons#41)
    expect(dq?.tools).toHaveLength(15);
    expect(dq?.tools).toEqual(expect.arrayContaining(["playbook", "estimate_effort", "weave_rules"]));
  });
});
