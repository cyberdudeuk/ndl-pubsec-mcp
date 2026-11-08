import { describe, expect, it, vi } from "vitest";
import { CatalogueError, CkanClient, crosswalkToMem, summarise } from "../src/lib/ckan.js";
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
