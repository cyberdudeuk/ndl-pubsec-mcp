// MCP server: four read-only discoverability tools and two reference resources.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import standards from "./data/standards.json" with { type: "json" };
import { CatalogueError, CkanClient, crosswalkToMem, summarise, VERSION, type CkanOptions } from "./lib/ckan.js";
import { CLASS_NAMES, rules, validateRecord } from "./lib/mem.js";

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true } as const;
const MAX_TEXT = 4000;

function reply(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }], structuredContent: data as Record<string, unknown> };
}

function failure(message: string, hint?: string) {
  const data = { ok: false, message, ...(hint ? { hint } : {}) };
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }], structuredContent: data, isError: true };
}

function clip(text: string | undefined, n = MAX_TEXT): string | undefined {
  if (!text) return text;
  return text.length > n ? `${text.slice(0, n)}… (cut at ${n} characters)` : text;
}

const catalogueHint = (e: CatalogueError) =>
  e.kind === "network" ? "Check the network, or set NDL_MCP_CKAN_BASE to a reachable data.gov.uk API base URL." : undefined;

export const TOOL_NAMES = ["catalogue_search", "dataset_describe", "metadata_validate", "standard_explain"] as const;

export function createServer(opts: CkanOptions = {}): McpServer {
  const server = new McpServer({ name: "ndl-pubsec-mcp", version: VERSION });
  const ckan = new CkanClient(opts);

  server.registerTool(
    "catalogue_search",
    {
      title: "Search data.gov.uk",
      description:
        "Search the data.gov.uk catalogue of UK public sector datasets. Returns titles, publishers, licences, formats, last-modified dates and links. Read-only; no personal data is returned.",
      inputSchema: {
        query: z.string().trim().min(2).max(200).describe("What to look for, in plain words, for example 'school census' or 'flood risk'"),
        organisation: z
          .string()
          .regex(/^[a-z0-9-]+$/)
          .max(120)
          .optional()
          .describe("Optional publisher slug from data.gov.uk, for example 'department-for-education'"),
        limit: z.number().int().min(1).max(20).default(10).describe("How many results to return (1 to 20)"),
        offset: z.number().int().min(0).max(1000).default(0).describe("How many results to skip, for paging")
      },
      annotations: { ...READ_ONLY, openWorldHint: true }
    },
    async ({ query, organisation, limit, offset }) => {
      try {
        const r = await ckan.search(query, { organisation, limit, offset });
        return reply({ ok: true, source: ckan.baseUrl, query, total: r.total, returned: r.results.length, results: r.results });
      } catch (e) {
        if (e instanceof CatalogueError) return failure(e.message, catalogueHint(e));
        throw e;
      }
    }
  );

  server.registerTool(
    "dataset_describe",
    {
      title: "Describe a dataset and check it against xGov MEM",
      description:
        "Get one data.gov.uk dataset: its description, publisher, licence and distributions, plus a draft UK Cross-Government Metadata Exchange Model (xGov MEM) record and what that record still lacks. Nothing is guessed: fields the catalogue does not hold are reported as missing.",
      inputSchema: {
        id: z
          .string()
          .trim()
          .regex(/^[A-Za-z0-9_-]{2,100}$/)
          .describe("The dataset id or name (slug) from data.gov.uk")
      },
      annotations: { ...READ_ONLY, openWorldHint: true }
    },
    async ({ id }) => {
      try {
        const p = await ckan.describe(id);
        const summary = summarise(p);
        const mem = crosswalkToMem(p);
        return reply({
          ok: true,
          source: ckan.baseUrl,
          dataset: {
            ...summary,
            description: clip(p.notes) ?? null,
            distributions: (p.resources ?? []).slice(0, 50).map((r) => ({
              title: r.name ?? null,
              format: r.format ?? null,
              url: r.url ?? null,
              lastModified: r.last_modified ? r.last_modified.slice(0, 10) : null
            }))
          },
          xgovMem: {
            draftRecord: mem.record,
            notes: mem.notes,
            valid: mem.validation.valid,
            missingOrInvalid: mem.validation.findings
          }
        });
      } catch (e) {
        if (e instanceof CatalogueError) return failure(e.message, catalogueHint(e));
        throw e;
      }
    }
  );

  server.registerTool(
    "metadata_validate",
    {
      title: "Validate metadata against xGov MEM",
      description: `Check a metadata record against the UK Cross-Government Metadata Exchange Model (xGov MEM, commit ${rules.generatedFrom.commit.slice(
        0,
        7
      )}). Classes: ${CLASS_NAMES.join(", ")}. Returns errors (must fix) and warnings (recommended), each with the attribute path.`,
      inputSchema: {
        record: z.record(z.string(), z.unknown()).describe("The metadata record as a JSON object, using xGov MEM attribute names"),
        className: z
          .enum(CLASS_NAMES as [string, ...string[]])
          .optional()
          .describe("Which xGov MEM class to validate against. If left out, it is read from the record's type, for example dcat:Dataset")
      },
      annotations: { ...READ_ONLY, openWorldHint: false }
    },
    async ({ record, className }) => reply({ ok: true, ...validateRecord(record, className) })
  );

  server.registerTool(
    "standard_explain",
    {
      title: "Explain an open data standard",
      description:
        "Explain open data standards used across UK government (xGov MEM, DCAT, ATRS, BODS, CSV, OpenAPI and others): purpose, status, licence and link, each with its provenance label and check date. Leave id out to list them all.",
      inputSchema: {
        id: z.string().trim().max(60).optional().describe("Standard id, for example 'xgov-mem', 'dcat' or 'bods'. Leave out to list all")
      },
      annotations: { ...READ_ONLY, openWorldHint: false }
    },
    async ({ id }) => {
      const list = standards.standards;
      if (!id) return reply({ ok: true, asOf: standards.asOf, note: standards.note, catalogue: standards.catalogue, standards: list });
      const key = id.toLowerCase();
      const hit = list.find((s) => s.id === key || s.name.toLowerCase().includes(key));
      if (!hit) return failure(`No standard matches "${id}"`, `Known ids: ${list.map((s) => s.id).join(", ")}`);
      return reply({ ok: true, asOf: standards.asOf, note: standards.note, standard: hit });
    }
  );

  server.registerResource(
    "xgov-mem-rules",
    "ndl-pubsec-mcp://xgov-mem/rules",
    { title: "xGov MEM rule set", description: "The compiled xGov MEM classes, attributes and permitted values this server validates against", mimeType: "application/json" },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify({ ...rules, enums: { ...rules.enums, OrganisationValues: `${rules.enums["OrganisationValues"]?.length ?? 0} organisation slugs` } }, null, 2) }] })
  );

  server.registerResource(
    "open-standards",
    "ndl-pubsec-mcp://standards",
    { title: "Open data standards register", description: "The standards this server can explain, with provenance", mimeType: "application/json" },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(standards, null, 2) }] })
  );

  return server;
}
