import { describe, expect, it } from "vitest";
import { CLASS_NAMES, MAX_FINDINGS, inferClass, rules, validateRecord } from "../src/lib/mem.js";
import { validDataset } from "./fixtures.js";

const rulesOf = (r: ReturnType<typeof validateRecord>) => r.findings.filter((f) => f.severity === "error").map((f) => `${f.rule} at ${f.path}`);

describe("xGov MEM rule set", () => {
  it("is compiled from the pinned upstream commit", () => {
    expect(rules.generatedFrom.commit).toMatch(/^d6d9a24/);
    expect(CLASS_NAMES).toEqual(expect.arrayContaining(["Dataset", "DataService", "Distribution", "ContactPoint"]));
    expect(rules.enums["OrganisationValues"]?.length).toBeGreaterThan(1000);
  });
});

describe("validateRecord", () => {
  it("accepts a complete Dataset", () => {
    const r = validateRecord(validDataset);
    expect(r.className).toBe("Dataset");
    expect(rulesOf(r)).toEqual([]);
    expect(r.valid).toBe(true);
  });

  it("reports a missing required attribute", () => {
    const rec: Record<string, unknown> = { ...validDataset };
    delete rec.updateFrequency;
    expect(rulesOf(validateRecord(rec))).toEqual(["required at updateFrequency"]);
  });

  it("rejects an attribute the model does not have (catches misspellings)", () => {
    const { licence, ...rest } = validDataset;
    expect(rulesOf(validateRecord({ ...rest, license: licence }))).toEqual(["unknown-attribute at license", "required at licence"]);
  });

  it("checks enumerations", () => {
    expect(rulesOf(validateRecord({ ...validDataset, accessRights: "PUBLIC" }))).toEqual(["range at accessRights"]);
    expect(rulesOf(validateRecord({ ...validDataset, publisher: "not-a-real-organisation" }))).toEqual(["range at publisher"]);
  });

  it("checks real calendar dates", () => {
    expect(rulesOf(validateRecord({ ...validDataset, modified: "2026-02-30" }))).toEqual(["range at modified"]);
    expect(rulesOf(validateRecord({ ...validDataset, modified: "01/11/2026" }))).toEqual(["range at modified"]);
  });

  it("checks the type designator against the class", () => {
    expect(rulesOf(validateRecord({ ...validDataset, type: "Dataset" }, "Dataset"))).toEqual(["designates-type at type"]);
  });

  it("rejects a list where one value is allowed", () => {
    expect(rulesOf(validateRecord({ ...validDataset, updateFrequency: ["freq:monthly", "freq:daily"] }))).toEqual(["single-valued at updateFrequency"]);
  });

  it("validates nested contact points, including the email pattern", () => {
    const r = validateRecord({ ...validDataset, contactPoint: { contactName: "Data team", email: "no-at-sign" } });
    expect(rulesOf(r)).toEqual(["range at contactPoint.email"]);
    expect(rulesOf(validateRecord({ ...validDataset, contactPoint: "data-team at example.org" }))).toEqual(["range at contactPoint"]);
  });

  it("accepts the DATA_SHARE_AGREEMENT licence alternative and rejects other bare words", () => {
    expect(rulesOf(validateRecord({ ...validDataset, licence: "DATA_SHARE_AGREEMENT" }))).toEqual([]);
    expect(rulesOf(validateRecord({ ...validDataset, licence: 42 }))).toEqual(["range at licence"]);
  });

  it("rejects a bare value where a list is required, as linkml-validate does (D-019)", () => {
    expect(rulesOf(validateRecord({ ...validDataset, creator: "government-digital-service" }))).toEqual(["multivalued at creator"]);
  });

  it("caps returned findings but keeps exact counts, so a hostile record cannot inflate the reply (D-020)", () => {
    const r = validateRecord({ ...validDataset, creator: Array(5000).fill(12345) });
    expect(r.valid).toBe(false);
    expect(r.errors).toBe(5000);
    expect(r.findings).toHaveLength(MAX_FINDINGS);
    expect(r.omitted).toBe(5000 + r.warnings - MAX_FINDINGS);
    expect(JSON.stringify(r).length).toBeLessThan(50_000);
  });

  it("reports nothing omitted for an ordinary record", () => {
    expect(validateRecord(validDataset).omitted).toBe(0);
  });

  it("warns, but does not fail, on missing recommended attributes", () => {
    const r = validateRecord(validDataset);
    expect(r.valid).toBe(true);
    expect(r.findings.filter((f) => f.severity === "warning").map((f) => f.rule)).toContain("recommended");
  });

  it("checks Distribution media types against the model's pattern", () => {
    const dist = { identifier: "https://example.org/d.csv", type: "dcat:Distribution", title: "CSV", licence: "https://example.org/l", mediaType: "csv" };
    expect(rulesOf(validateRecord(dist))).toEqual(["range at mediaType"]);
    expect(rulesOf(validateRecord({ ...dist, mediaType: "text/csv" }))).toEqual([]);
  });

  it("explains when the class cannot be inferred, and rejects non-objects", () => {
    expect(inferClass({ type: "dcat:Dataset" })).toBe("Dataset");
    expect(validateRecord({ title: "x" }).findings[0]?.rule).toBe("class");
    expect(validateRecord([1, 2] as unknown).valid).toBe(false);
    expect(validateRecord(null).valid).toBe(false);
  });
});
