import { describe, expect, it, vi } from "vitest";
import { CatalogueError, CkanClient, crosswalkToMem, GEMINI_FREQUENCY, summarise } from "../src/lib/ckan.js";
import { ckanPackage, jsonResponse } from "./fixtures.js";

describe("CkanClient", () => {
  it("builds a package_search request with paging and a sanitised organisation filter", async () => {
    const fetcher = vi.fn(async () => jsonResponse({ success: true, result: { count: 1, results: [ckanPackage()] } }));
    const c = new CkanClient({ fetcher, baseUrl: "https://ckan.example.org/api/action/" });
    const r = await c.search("school census", { organisation: "department-for-education\" OR *", limit: 5, offset: 10 });
    const url = new URL(fetcher.mock.calls[0]![0] as string);
    expect(url.pathname).toBe("/api/action/package_search");
    expect(url.searchParams.get("q")).toBe("school census");
    expect(url.searchParams.get("fq")).toBe("organization:department-for-educationOR");
    expect(url.searchParams.get("rows")).toBe("5");
    expect(url.searchParams.get("start")).toBe("10");
    expect(r.total).toBe(1);
    expect(r.results[0]?.formats).toEqual(["CSV", "PDF"]);
  });

  it("never returns maintainer or author names or addresses", async () => {
    const fetcher = vi.fn(async () => jsonResponse({ success: true, result: { count: 1, results: [ckanPackage()] } }));
    const r = await new CkanClient({ fetcher }).search("x y");
    const text = JSON.stringify(r);
    expect(text).not.toMatch(/@example\.org/);
    expect(text).not.toContain("A Person");
  });

  it("maps HTTP, API, not-found, shape and network failures to CatalogueError", async () => {
    const cases: [() => Promise<Response>, CatalogueError["kind"]][] = [
      [async () => new Response("down", { status: 503 }), "http"],
      [async () => new Response("", { status: 404 }), "not-found"],
      [async () => jsonResponse({ success: false, error: { __type: "Not Found Error" } }), "not-found"],
      [async () => jsonResponse({ success: false, error: { message: "bad query" } }), "api"],
      [async () => new Response("<html>", { status: 200 }), "shape"],
      [async () => { throw new TypeError("fetch failed"); }, "network"]
    ];
    for (const [impl, kind] of cases) {
      const c = new CkanClient({ fetcher: vi.fn(impl) });
      await expect(c.describe("abc")).rejects.toMatchObject({ kind });
    }
  });

  it("times out slow responses", async () => {
    const fetcher = (_u: string, init?: RequestInit) =>
      new Promise<Response>((_, reject) => init?.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" }))));
    await expect(new CkanClient({ fetcher, timeoutMs: 20 }).describe("abc")).rejects.toThrow(/timed out/);
  });

  it("refuses a non-https base URL", () => {
    expect(() => new CkanClient({ baseUrl: "http://insecure.example.org" })).toThrow(CatalogueError);
  });
});

describe("summarise and crosswalkToMem", () => {
  it("summarises without personal fields", () => {
    const s = summarise(ckanPackage());
    expect(s).toMatchObject({ publisher: "Department for Education", modified: "2026-10-30", licence: "Open Government Licence" });
    expect(Object.keys(s)).not.toContain("maintainer");
  });

  it("drafts only what the catalogue holds and reports the rest as missing", () => {
    const m = crosswalkToMem(ckanPackage());
    expect(m.record).toMatchObject({ type: "dcat:Dataset", publisher: "department-for-education", modified: "2026-10-30" });
    expect(m.record).not.toHaveProperty("securityClassification");
    expect(m.record).not.toHaveProperty("contactPoint");
    const missing = m.validation.findings.filter((f) => f.rule === "required").map((f) => f.path).sort();
    expect(missing).toEqual(["accessRights", "contactPoint", "securityClassification", "updateFrequency", "version"]);
    expect(m.validation.valid).toBe(false);
  });

  it("leaves out publishers that are not in the xGov MEM organisation list", () => {
    const m = crosswalkToMem(ckanPackage({ organization: { name: "made-up-council", title: "Made Up Council" }, license_url: undefined }));
    expect(m.record).not.toHaveProperty("publisher");
    expect(m.notes.join(" ")).toMatch(/not in the xGov MEM organisation list/);
    expect(m.notes.join(" ")).toMatch(/expects a URI/);
  });
});

// Shapes observed in the live data.gov.uk API on 8 November 2026 (defects D-017, D-018). Values are synthetic.
describe("crosswalk against live record shapes", () => {
  it("treats null and blank licences as absent, never as an empty string", () => {
    for (const blank of [null, "", "  "]) {
      const p = ckanPackage({ license_id: blank, license_title: blank, license_url: blank });
      expect(summarise(p).licence).toBeNull();
      const m = crosswalkToMem(p);
      expect(m.record).not.toHaveProperty("licence");
      expect(m.notes.join(" ")).toMatch(/No licence is given/);
    }
  });

  it("notes a licence given only as free text in harvested extras", () => {
    const p = ckanPackage({ license_id: null, license_title: null, license_url: null, extras: [{ key: "licence", value: '["Open Government Licence"]' }] });
    expect(crosswalkToMem(p).notes.join(" ")).toMatch(/only as free text/);
  });

  it("maps harvested GEMINI update frequencies exactly, and leaves unmappable ones out with a note", () => {
    expect(crosswalkToMem(ckanPackage({ extras: [{ key: "frequency-of-update", value: "asNeeded" }] })).record.updateFrequency).toBe("freq:irregular");
    expect(crosswalkToMem(ckanPackage({ extras: [{ key: "frequency-of-update", value: "fortnightly" }] })).record.updateFrequency).toBe("freq:biweekly");
    const np = crosswalkToMem(ckanPackage({ extras: [{ key: "frequency-of-update", value: "notPlanned" }] }));
    expect(np.record).not.toHaveProperty("updateFrequency");
    expect(np.notes.join(" ")).toMatch(/"notPlanned" has no equivalent/);
  });

  it("only maps to frequency terms that xGov MEM permits", async () => {
    const { rules } = await import("../src/lib/mem.js");
    const allowed = new Set(rules.enums["FrequencyValues"]);
    for (const v of Object.values(GEMINI_FREQUENCY)) expect(allowed.has(v)).toBe(true);
  });

  it("prefers the publisher's DCAT dates over the catalogue's record dates", () => {
    const m = crosswalkToMem(ckanPackage({ extras: [{ key: "dcat_issued", value: "2019-08-07T12:56:58" }, { key: "dcat_modified", value: "2024-03-01" }] }));
    expect(m.record.issued).toBe("2019-08-07");
    expect(m.record.modified).toBe("2024-03-01");
  });

  it("drafts version when the catalogue holds one, and reports only what is truly absent", () => {
    const m = crosswalkToMem(ckanPackage({ version: "2.1", extras: [{ key: "frequency-of-update", value: "monthly" }] }));
    expect(m.record.version).toBe("2.1");
    const missing = m.validation.findings.filter((f) => f.rule === "required").map((f) => f.path).sort();
    expect(missing).toEqual(["accessRights", "contactPoint", "securityClassification"]);
    expect(m.notes.join(" ")).toMatch(/not drafted: accessRights, securityClassification, contactPoint\./);
  });
});

