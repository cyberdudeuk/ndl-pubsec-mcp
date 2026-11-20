// The API catalogue compiler: RFC 4180 parsing, email removal and the compiled file's provenance.
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error plain JavaScript module
import { compile, parseCsv } from "../tools/compile_api_catalogue.mjs";
import compiled from "../src/generated/api-catalogue.json" with { type: "json" };

describe("api catalogue compiler", () => {
  it("parses quoted fields with commas, doubled quotes and line breaks", () => {
    const rows = parseCsv('a,b\n"x, y","he said ""hi""\nand left"\n');
    expect(rows).toEqual([{ a: "x, y", b: 'he said "hi"\nand left' }]);
  });

  it("drops the maintainer field and removes addresses from descriptions", () => {
    const dir = mkdtempSync(join(tmpdir(), "apicat-"));
    try {
      mkdirSync(join(dir, "data"));
      writeFileSync(join(dir, "data", "catalogue.csv"), 'name,description,url,documentation,maintainer,provider,dateAdded,dateUpdated\nThing,"Ask team@example.org for access",https://a.example.org/,mailto:x@example.org,owner@example.org,org-a,2020-01-01,2021-01-01\n');
      writeFileSync(join(dir, "data", "organisation.csv"), "id,name\norg-a,Org A\n");
      writeFileSync(join(dir, "data", "catalogue-from-json-source.csv"), "name,description,url,documentation,maintainer,provider,dateAdded,dateUpdated\n");
      const out = compile(dir, "a".repeat(40), "2026-11-02");
      const text = JSON.stringify(out);
      expect(text).not.toMatch(/@example\.org/);
      expect(out.apis[0]).toMatchObject({ name: "Thing", provider: "Org A", documentation: "", description: "Ask [address removed] for access" });
      expect(out.apis[0]).not.toHaveProperty("maintainer");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reads both catalogue files, de-duplicates by name and URL, and maps provider names to ids (D-044)", () => {
    const dir = mkdtempSync(join(tmpdir(), "apicat-"));
    try {
      mkdirSync(join(dir, "data"));
      const head = "name,description,url,documentation,maintainer,provider,dateAdded,dateUpdated\n";
      writeFileSync(join(dir, "data", "catalogue.csv"), `${head}Thing,One,https://a.example.org/,,,org-a,2020-01-01,2021-01-01\n`);
      writeFileSync(join(dir, "data", "catalogue-from-json-source.csv"), `${head}Thing,One again,https://a.example.org/,,,Org A,2020-01-01,2021-01-01\nOther,Two,https://a.example.org/,,,Org A,2020-01-01,2021-01-01\n`);
      writeFileSync(join(dir, "data", "organisation.csv"), "id,name\norg-a,Org A\n");
      const out = compile(dir, "a".repeat(40), "2026-11-02");
      expect(out.count).toBe(2);
      expect(out.apis.map((a: { name: string }) => a.name).sort()).toEqual(["Other", "Thing"]);
      expect(out.apis.every((a: { providerId: string }) => a.providerId === "org-a")).toBe(true);
      expect(out.source.files).toEqual(["data/catalogue.csv", "data/catalogue-from-json-source.csv"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("the compiled catalogue includes DWP's APIs from the second file (D-044)", () => {
    expect(compiled.apis.some((a) => a.name === "Get Citizen Income Information API" && a.providerId === "department-for-work-and-pensions")).toBe(true);
  });

  it("the compiled file names its pinned source and licence", () => {
    expect(compiled.source.repository).toBe("https://github.com/co-cddo/api-catalogue");
    expect(compiled.source.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(compiled.source.licence).toMatch(/Open Government Licence/);
    expect(compiled.count).toBe(compiled.apis.length);
    expect(compiled.count).toBeGreaterThan(100);
  });
});
