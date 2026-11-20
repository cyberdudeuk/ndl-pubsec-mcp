// MCP server: read-only tools (data, API and server discoverability, standards, terms, federation) and reference resources.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import standards from "./data/standards.json" with { type: "json" };
import federation from "./data/federation.json" with { type: "json" };
import servers from "./data/servers.json" with { type: "json" };
import { API_SOURCES, searchApis } from "./lib/apis.js";
import { EXCHANGE_ABOUT, EXCHANGE_REGISTER, EXCHANGES, searchExchanges } from "./lib/exchanges.js";
import bundledVocabulary from "./data/vocabulary.json" with { type: "json" };
import { CatalogueError, CkanClient, crosswalkToMem, summarise, VERSION, type CkanOptions } from "./lib/ckan.js";
import { CLASS_NAMES, rules, validateRecord } from "./lib/mem.js";
import { loadVocabulary, parseVocabulary, searchTerms, summariseVocabulary, type Vocabulary } from "./lib/vocab.js";

/** The largest metadata record metadata_validate accepts, in characters of JSON. */
export const MAX_RECORD_CHARS = 100_000;

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

export const TOOL_NAMES = ["catalogue_search", "dataset_describe", "metadata_validate", "standard_explain", "term_lookup", "domain_list", "api_search", "server_search", "exchange_search"] as const;

/** Ready-made tasks (MCP prompts) that chain the tools above. Each is declarative text: it asks, it does not act. */
export const PROMPT_NAMES = ["journey-exchanges", "standards-for-a-service", "check-a-catalogue-record"] as const;

export interface ServerOptions extends CkanOptions {
  /** A vocabulary file in the R2 register shape. Defaults to NDL_MCP_VOCAB_PATH, then the bundled example. */
  vocabPath?: string;
}

function openVocabulary(path: string | undefined): { vocab?: Vocabulary; error?: string } {
  try {
    return { vocab: path ? loadVocabulary(path) : parseVocabulary(bundledVocabulary, "bundled example (docs/glossary.md)") };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export function createServer(opts: ServerOptions = {}): McpServer {
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
        // Bounded so one oversized record cannot tie up the server (defect D-042, check C-35).
        record: z
          .record(z.string(), z.unknown())
          .refine((r) => JSON.stringify(r).length <= MAX_RECORD_CHARS, { message: `The record is too large: keep it under ${MAX_RECORD_CHARS / 1000} KB of JSON` })
          .describe("The metadata record as a JSON object, using xGov MEM attribute names (up to 100 KB)"),
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
        "Explain the open standards recommended or required across UK government and the wider public sector, for data, APIs, identifiers, cyber security, digital services, identity, health and procurement: purpose, how firmly it applies, who it applies to, status, licence and link, each with its provenance label and check date. Leave id out to list them all, optionally for one domain.",
      inputSchema: {
        id: z.string().trim().max(60).optional().describe("Standard id, for example 'xgov-mem', 'dcat' or 'bods'. Leave out to list all"),
        domain: z.enum(standards.domains as [string, ...string[]]).optional().describe("List only the standards in this domain, for example 'Cyber security'")
      },
      annotations: { ...READ_ONLY, openWorldHint: false }
    },
    async ({ id, domain }) => {
      const list = domain ? standards.standards.filter((s) => s.domain === domain) : standards.standards;
      if (!id) return reply({ ok: true, asOf: standards.asOf, note: standards.note, catalogue: standards.catalogue, domains: standards.domains, domain, standards: list });
      const key = id.toLowerCase();
      const hit = list.find((s) => s.id === key || s.name.toLowerCase().includes(key));
      if (!hit) return failure(`No standard matches "${id}"`, `Known ids: ${list.map((s) => s.id).join(", ")}`);
      return reply({ ok: true, asOf: standards.asOf, note: standards.note, standard: hit });
    }
  );

  const vocabPath = opts.vocabPath ?? process.env["NDL_MCP_VOCAB_PATH"];
  const { vocab, error: vocabError } = openVocabulary(vocabPath);

  server.registerTool(
    "term_lookup",
    {
      title: "Look up a business term and whether it is certified",
      description:
        "Find business terms in the configured vocabulary and report, for each, its definition, its status, who drafted it (person or AI), the review level it passed (H0 to H5) and whether that makes it certified. A term counts as certified only when it is endorsed after H2 review or above; anything unrecorded is reported as unknown, never assumed. Leave query and id out for a summary of the vocabulary.",
      inputSchema: {
        query: z.string().trim().min(2).max(100).optional().describe("Words to look for in term labels, alternative labels and definitions"),
        id: z.string().trim().regex(/^[A-Za-z0-9_-]{2,60}$/).optional().describe("An exact term id, for example 'NDL-GLO-007'"),
        limit: z.number().int().min(1).max(25).default(10).describe("How many terms to return (1 to 25)")
      },
      annotations: { ...READ_ONLY, openWorldHint: false }
    },
    async ({ query, id, limit }) => {
      if (!vocab) return failure(`The vocabulary could not be read: ${vocabError}`, "Check NDL_MCP_VOCAB_PATH points at a JSON file with a terms array in the R2 register shape.");
      const summary = summariseVocabulary(vocab);
      if (id) {
        const t = vocab.terms.find((x) => x.id === id);
        return t ? reply({ ok: true, vocabulary: summary, term: t }) : failure(`No term has id "${id}"`, "Search with query instead.");
      }
      if (!query) return reply({ ok: true, about: vocab.about, vocabulary: summary });
      const hits = searchTerms(vocab, query);
      return reply({ ok: true, vocabulary: summary, query, total: hits.length, returned: Math.min(hits.length, limit), terms: hits.slice(0, limit) });
    }
  );

  server.registerTool(
    "domain_list",
    {
      title: "List the MCP servers in this estate",
      description:
        "List the MCP servers that work alongside this one (for example the Public Sector Data Quality Commons), with what each is for, its tools, its safety statement and where its manifest came from. This server does not call them.",
      inputSchema: {},
      annotations: { ...READ_ONLY, openWorldHint: false }
    },
    async () => reply({ ok: true, ...federation })
  );

  server.registerTool(
    "api_search",
    {
      title: "Find UK public sector APIs",
      description:
        "Search UK public sector APIs by words in their name, provider or description, optionally for one provider. Draws on the UK public sector API catalogue at a pinned commit, plus APIs added by name after checking them at the publisher's page (each says which). Returns name, provider, description, endpoint and documentation links, and the source of each entry. Read-only: this server lists APIs and never calls them, holds no keys and passes no data. Listing is not endorsement, and using an API may need its own sign-up or a legal basis.",
      inputSchema: {
        query: z.string().trim().min(2).max(200).describe("Words to look for, for example 'VAT number', 'trade statistics' or 'EORI'"),
        provider: z.string().trim().min(2).max(120).regex(/^[\p{L}\p{N} &'(),.-]+$/u).optional().describe("Optional provider name or id, for example 'HM Revenue & Customs' or 'hm-revenue-customs'"),
        limit: z.number().int().min(1).max(25).default(10).describe("How many APIs to return (1 to 25)")
      },
      annotations: { ...READ_ONLY, openWorldHint: false }
    },
    async ({ query, provider, limit }) => {
      const hits = searchApis(query, { provider });
      return reply({
        ok: true,
        query,
        provider,
        sources: API_SOURCES,
        total: hits.length,
        returned: Math.min(hits.length, limit),
        apis: hits.slice(0, limit),
        note: "Entries come from the sources named on each. This server does not call the APIs. Check the documentation link before relying on one."
      });
    }
  );

  server.registerTool(
    "server_search",
    {
      title: "Find MCP servers for UK public sector work",
      description:
        "List or search MCP servers an agent might use alongside this one: the estate's own servers (with their manifests or repositories) and public candidates awaiting the owner's review. Each entry says its status, where it was checked and when. Candidates are not endorsed. This server never calls any of them.",
      inputSchema: {
        query: z.string().trim().min(2).max(100).optional().describe("Words to look for in a server's name or description; leave out to list all")
      },
      annotations: { ...READ_ONLY, openWorldHint: false }
    },
    async ({ query }) => {
      const all = [
        ...federation.domains.map((d) => ({ id: d.domain, title: d.title, status: d.self ? "this server" : "estate, from its manifest", repository: d.repository, description: d.description, tools: d.tools })),
        ...servers.estate.map((s) => ({ id: s.id, title: s.title, status: "estate", repository: `${s.repository}/tree/${s.commit.slice(0, 7)}/${s.path}`, description: s.description, tools: s.tools, transport: s.transport, checked: s.checked })),
        ...servers.candidates.map((s) => ({ id: s.id, title: s.title, status: s.status, url: s.url, description: s.description, transport: s.transport, checked: s.checked, provenance: s.provenance }))
      ];
      const q = (query ?? "").toLowerCase().split(/\s+/).filter((w) => w.length > 1);
      const hits = q.length ? all.filter((s) => q.every((w) => `${s.title} ${s.description}`.toLowerCase().includes(w))) : all;
      return reply({ ok: true, about: servers.about, asOf: servers.asOf, query, total: hits.length, servers: hits });
    }
  );

  server.registerTool(
    "exchange_search",
    {
      title: "Find data exchanges between public sector organisations",
      description:
        "Find data exchanges between UK public sector organisations by journey (for example 'register a death', 'claim universal credit', 'set up a limited company'), organisation or identifier. Each result gives the parties, what flows, how, the shared identifiers, the standards involved, the legal basis where known, suggested api_search queries and sources with a provenance label. Also returns counts from the Digital Economy Act register of information sharing agreements. Descriptive only: this server never takes part in an exchange.",
      inputSchema: {
        query: z.string().trim().min(2).max(200).optional().describe("Words for a journey, organisation, data item or identifier; leave out to list all"),
        party: z.string().trim().max(80).regex(/^[\p{L}\p{N} &'(),.-]+$/u).optional().describe("Only exchanges involving this organisation, for example 'HMRC'"),
        audience: z.enum(["Citizen", "Business", "Public body"]).optional().describe("Only journeys for this audience")
      },
      annotations: { ...READ_ONLY, openWorldHint: false }
    },
    async ({ query, party, audience }) => {
      const hits = searchExchanges(query, { party, audience });
      return reply({ ok: true, ...EXCHANGE_ABOUT, query, party, audience, total: hits.length, exchanges: hits, register: EXCHANGE_REGISTER });
    }
  );

  server.registerPrompt(
    "journey-exchanges",
    {
      title: "Map the data exchanges behind a journey",
      description: "Asks the assistant to find the exchanges, APIs and standards behind a citizen or business journey, and to say what is missing.",
      argsSchema: { journey: z.string().trim().min(3).max(120).describe("The journey, for example 'register a death'") }
    },
    ({ journey }) => ({
      messages: [{ role: "user", content: { type: "text", text: `Using the NDL PubSec MCP tools, map the data exchanges behind this journey: "${journey}".\n1. Call exchange_search with the journey words.\n2. For each exchange, call api_search with its suggested queries and list the APIs that exist, with their documentation links.\n3. Call standard_explain for each standard it names.\n4. Say which steps still rely on email, files or paper, and which identifiers join the data.\nCite every source and provenance label the tools return. Do not claim anything the tools did not return.` } }]
    })
  );

  server.registerPrompt(
    "standards-for-a-service",
    {
      title: "List the standards a public sector service must meet",
      description: "Asks the assistant to list the mandatory, endorsed and recommended standards for a service, grouped by domain.",
      argsSchema: { service: z.string().trim().min(3).max(160).describe("What the service does and who runs it, for example 'a council website for blue badge applications'") }
    },
    ({ service }) => ({
      messages: [{ role: "user", content: { type: "text", text: `Using standard_explain from the NDL PubSec MCP server, list the standards that apply to this service: "${service}". Group them by domain, put Mandatory first, say who each applies to, and quote the provenance label and check date for each. Flag anything only Proposed or In review. Do not add standards the tool did not return; if you know of others, list them separately as unverified.` } }]
    })
  );

  server.registerPrompt(
    "check-a-catalogue-record",
    {
      title: "Check a dataset's metadata against xGov MEM",
      description: "Asks the assistant to find a dataset, compare its metadata with xGov MEM and draft the fixes.",
      argsSchema: { dataset: z.string().trim().min(2).max(160).describe("Words to find the dataset on data.gov.uk") }
    },
    ({ dataset }) => ({
      messages: [{ role: "user", content: { type: "text", text: `Using the NDL PubSec MCP tools: search data.gov.uk for "${dataset}" with catalogue_search, pick the best match, run dataset_describe on it, then list each xGov MEM gap with a suggested fix. Mark every suggested value as a draft for the publisher to confirm.` } }]
    })
  );

  server.registerResource(
    "exchanges",
    "ndl-pubsec-mcp://exchanges",
    { title: "Public sector data exchanges and journeys", description: "Exchanges between organisations, the journeys they serve, and Digital Economy Act register counts", mimeType: "application/json" },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify({ ...EXCHANGE_ABOUT, register: EXCHANGE_REGISTER, exchanges: EXCHANGES }, null, 2) }] })
  );

  server.registerResource(
    "federation",
    "ndl-pubsec-mcp://federation",
    { title: "Estate MCP domains", description: "The MCP servers in the same estate and their manifests", mimeType: "application/json" },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(federation, null, 2) }] })
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
