// Read-only client for the data.gov.uk catalogue API (CKAN action API).
// Base URL is configurable because the live endpoint is not verified from the build environment (open item O-01).
import { CLASS_NAMES, rules, validateRecord, type ValidationResult } from "./mem.js";

export const VERSION = "0.2.0";
export const DEFAULT_BASE = "https://www.data.gov.uk/api/action";
const USER_AGENT = `ndl-pubsec-mcp/${VERSION} (+https://github.com/cyberdudeuk/ndl-pubsec-mcp)`;

export type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

export interface CkanOptions {
  baseUrl?: string;
  fetcher?: Fetcher;
  timeoutMs?: number;
}

export class CatalogueError extends Error {
  constructor(message: string, readonly kind: "network" | "http" | "api" | "not-found" | "shape") {
    super(message);
  }
}

interface CkanEnvelope<T> {
  success: boolean;
  result?: T;
  error?: { message?: string; __type?: string };
}

export interface CkanResource {
  id?: string;
  name?: string;
  format?: string;
  url?: string;
  description?: string;
  last_modified?: string;
  mimetype?: string;
}

export interface CkanPackage {
  id: string;
  name: string;
  title?: string;
  notes?: string;
  license_id?: string;
  license_title?: string;
  license_url?: string;
  metadata_modified?: string;
  metadata_created?: string;
  organization?: { name?: string; title?: string } | null;
  resources?: CkanResource[];
  tags?: { name?: string }[];
  // maintainer / author fields exist upstream but are deliberately never read (privacy: roles, not names)
}

export class CkanClient {
  readonly baseUrl: string;
  private readonly fetcher: Fetcher;
  private readonly timeoutMs: number;

  constructor(opts: CkanOptions = {}) {
    this.baseUrl = (opts.baseUrl ?? process.env.NDL_MCP_CKAN_BASE ?? DEFAULT_BASE).replace(/\/+$/, "");
    if (!/^https:\/\//.test(this.baseUrl)) throw new CatalogueError("The catalogue base URL must use https", "shape");
    this.fetcher = opts.fetcher ?? ((u, i) => fetch(u, i));
    this.timeoutMs = opts.timeoutMs ?? 15000;
  }

  private async call<T>(action: string, params: Record<string, string | number | undefined>): Promise<T> {
    const url = new URL(`${this.baseUrl}/${action}`);
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
    let res: Response;
    try {
      res = await this.fetcher(url.toString(), { headers: { accept: "application/json", "user-agent": USER_AGENT }, signal: ctrl.signal });
    } catch (e) {
      throw new CatalogueError(`Could not reach the catalogue (${(e as Error).name === "AbortError" ? "timed out" : "network error"})`, "network");
    } finally {
      clearTimeout(timer);
    }
    if (res.status === 404) throw new CatalogueError("Not found in the catalogue", "not-found");
    if (!res.ok) throw new CatalogueError(`The catalogue answered with HTTP ${res.status}`, "http");
    let body: CkanEnvelope<T>;
    try {
      body = (await res.json()) as CkanEnvelope<T>;
    } catch {
      throw new CatalogueError("The catalogue did not return JSON", "shape");
    }
    if (!body.success || body.result === undefined) {
      if (body.error?.__type === "Not Found Error") throw new CatalogueError("Not found in the catalogue", "not-found");
      throw new CatalogueError(`The catalogue reported an error: ${body.error?.message ?? "unknown"}`, "api");
    }
    return body.result;
  }

  async search(query: string, opts: { organisation?: string; limit?: number; offset?: number } = {}) {
    const fq = opts.organisation ? `organization:${opts.organisation.replace(/[^a-z0-9-]/gi, "")}` : undefined;
    const result = await this.call<{ count: number; results: CkanPackage[] }>("package_search", {
      q: query,
      fq,
      rows: opts.limit ?? 10,
      start: opts.offset ?? 0
    });
    if (!Array.isArray(result.results)) throw new CatalogueError("Unexpected search response", "shape");
    return { total: result.count, results: result.results.map(summarise) };
  }

  async describe(id: string) {
    const pkg = await this.call<CkanPackage>("package_show", { id });
    return pkg;
  }
}

export function datasetUrl(p: Pick<CkanPackage, "id" | "name">): string {
  return `https://www.data.gov.uk/dataset/${encodeURIComponent(p.id)}/${encodeURIComponent(p.name)}`;
}

export function summarise(p: CkanPackage) {
  const formats = [...new Set((p.resources ?? []).map((r) => (r.format ?? "").trim().toUpperCase()).filter(Boolean))];
  return {
    id: p.id,
    name: p.name,
    title: p.title ?? p.name,
    publisher: p.organization?.title ?? null,
    publisherSlug: p.organization?.name ?? null,
    licence: p.license_title ?? p.license_id ?? null,
    modified: p.metadata_modified ? p.metadata_modified.slice(0, 10) : null,
    formats,
    url: datasetUrl(p)
  };
}

const orgSet = new Set(rules.enums["OrganisationValues"] ?? []);

/**
 * Drafts an xGov MEM Dataset record from a catalogue entry and validates it.
 * Only fields that can be read from the entry are filled. Nothing is guessed: fields the
 * catalogue does not hold (security classification, contact point, update frequency, version)
 * are left out so the validation shows exactly what a publisher still has to supply.
 */
export function crosswalkToMem(p: CkanPackage): { record: Record<string, unknown>; notes: string[]; validation: ValidationResult } {
  const notes: string[] = [];
  const record: Record<string, unknown> = {
    identifier: datasetUrl(p),
    type: rules.classes["Dataset"]?.classUri ?? "dcat:Dataset",
    title: p.title ?? p.name
  };
  if (p.notes) record.description = p.notes;
  if (p.license_url) record.licence = p.license_url;
  else if (p.license_id) notes.push(`Licence is given only as the code "${p.license_id}"; xGov MEM expects a URI.`);
  if (p.metadata_modified) record.modified = p.metadata_modified.slice(0, 10);
  if (p.metadata_created) record.issued = p.metadata_created.slice(0, 10);
  const slug = p.organization?.name;
  if (slug && orgSet.has(slug)) {
    record.publisher = slug;
    record.creator = [slug];
    notes.push("Creator is assumed to be the publisher; confirm with the publisher.");
  } else if (slug) {
    notes.push(`Publisher "${slug}" is not in the xGov MEM organisation list, so it was left out.`);
  }
  const keywords = (p.tags ?? []).map((t) => t.name).filter((t): t is string => Boolean(t));
  if (keywords.length) record.keyword = keywords;
  const dists = (p.resources ?? []).map((r) => r.url).filter((u): u is string => Boolean(u));
  if (dists.length) record.distribution = dists;
  notes.push("Not held by the catalogue, so not drafted: accessRights, securityClassification, contactPoint, updateFrequency, version.");
  return { record, notes, validation: validateRecord(record, "Dataset") };
}

export { CLASS_NAMES };
