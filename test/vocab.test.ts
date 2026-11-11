// The term layer: certification is reported, never granted (BOT H0 to H5 review model).
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { certify, loadVocabulary, parseVocabulary, searchTerms, summariseVocabulary } from "../src/lib/vocab.js";
import bundled from "../src/data/vocabulary.json" with { type: "json" };

const base = { term_id: "T-1", preferred_label: "Data owner", definition: "Accountable for a data domain." };
const dirs: string[] = [];
afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

describe("certify", () => {
  it("certifies only an endorsed term reviewed at H2 or above", () => {
    expect(certify({ ...base, status: "endorsed", review_level: "H2" }).certified).toBe(true);
    expect(certify({ ...base, status: "endorsed", review_level: "H5" }).certified).toBe(true);
  });
  it("refuses endorsed terms with no recorded review level", () => {
    const c = certify({ ...base, status: "endorsed" });
    expect(c.certified).toBe(false);
    expect(c.reviewLevel).toBe("unknown");
    expect(c.reason).toMatch(/not recorded/);
  });
  it("refuses endorsed terms reviewed below H2", () => {
    for (const lvl of ["H0", "H1"]) expect(certify({ ...base, status: "endorsed", review_level: lvl }).certified).toBe(false);
  });
  it("refuses drafts and proposals whatever their review level", () => {
    for (const status of ["draft", "proposed", "deprecated"]) expect(certify({ ...base, status, review_level: "H5" }).certified).toBe(false);
  });
  it("never trusts an unrecognised drafted_by or review_level value", () => {
    const c = certify({ ...base, status: "endorsed", review_level: "h3", drafted_by: "robot" });
    expect(c).toMatchObject({ certified: false, reviewLevel: "unknown", draftedBy: "unknown" });
  });
});

describe("vocabulary files", () => {
  it("reads an R2-shaped register and splits multi-valued fields", () => {
    const v = parseVocabulary({ terms: [{ ...base, alt_labels: "Information asset owner; IAO", semantic_bindings: "dept.assets.owner_role", status: "endorsed", review_level: "H3", drafted_by: "human" }] }, "test");
    expect(v.terms[0]).toMatchObject({ altLabels: ["Information asset owner", "IAO"], bindings: ["dept.assets.owner_role"], certification: { certified: true } });
  });
  it("rejects a file with no terms array, and a term with no definition", () => {
    expect(() => parseVocabulary({}, "x")).toThrow(/terms/);
    expect(() => parseVocabulary({ terms: [{ term_id: "a", preferred_label: "b" }] }, "x")).toThrow(/definition/);
  });
  it("loads from disk", () => {
    const d = mkdtempSync(join(tmpdir(), "vocab-"));
    dirs.push(d);
    const p = join(d, "v.json");
    writeFileSync(p, JSON.stringify({ terms: [base] }));
    expect(loadVocabulary(p).terms).toHaveLength(1);
  });
  it("searches labels before definitions", () => {
    const v = parseVocabulary({ terms: [{ ...base, term_id: "A", preferred_label: "Steward", definition: "Looks after the data owner's assets" }, base] }, "t");
    expect(searchTerms(v, "data owner").map((t) => t.id)).toEqual(["T-1", "A"]);
  });
  it("the bundled glossary is all draft, AI-assisted and unreviewed, so nothing in it is certified", () => {
    const v = parseVocabulary(bundled, "bundled");
    const s = summariseVocabulary(v);
    expect(s.terms).toBeGreaterThan(10);
    expect(s.certified).toBe(0);
    expect(s.byStatus).toEqual({ draft: s.terms });
    expect(s.byDraftedBy).toEqual({ "ai-assisted": s.terms });
  });
});
