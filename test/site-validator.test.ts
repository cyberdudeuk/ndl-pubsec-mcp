// The in-page checker runs docs/assets/mem.js, a bundle of the server's validator made by tools/build-site.mjs.
// It must reach exactly the same results as the server for the same records (D-024 follow-up: one validator, two places).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { validateRecord } from "../src/lib/mem.js";
import { validDataset } from "./fixtures.js";

const ROOT = join(import.meta.dirname, "..");
type Mem = { validateRecord: typeof validateRecord; CLASS_NAMES: string[] };
function load(): Mem {
  const window: Record<string, unknown> = {};
  runInNewContext(readFileSync(join(ROOT, "docs", "assets", "mem.js"), "utf8"), { window });
  return window.NDLMEM as Mem;
}

describe("browser bundle of the validator", () => {
  const mem = load();
  const cases: Array<[string, unknown, string | undefined]> = [
    ["complete dataset", validDataset, "Dataset"],
    ["missing attributes", { ...validDataset, version: undefined, updateFrequency: undefined }, "Dataset"],
    ["misspelt attribute", { ...validDataset, license: "x" }, undefined],
    ["not an object", 42, undefined],
    ["empty record", {}, undefined]
  ];
  for (const [name, record, cls] of cases) {
    it(`agrees with the server on: ${name}`, () => {
      const a = JSON.parse(JSON.stringify(mem.validateRecord(record, cls)));
      expect(a).toEqual(JSON.parse(JSON.stringify(validateRecord(record, cls))));
    });
  }
  it("offers every class the server knows", () => {
    expect([...mem.CLASS_NAMES]).toEqual(Object.keys(JSON.parse(readFileSync(join(ROOT, "src", "generated", "mem-rules.json"), "utf8")).classes));
  });
  it("fails this test when the bundle drifts (vaccination)", () => {
    const window: Record<string, unknown> = {};
    const broken = readFileSync(join(ROOT, "docs", "assets", "mem.js"), "utf8").replace('severity: "error", path: at(slot.name), rule: "required"', 'severity: "warning", path: at(slot.name), rule: "required"');
    runInNewContext(broken, { window });
    const drifted = (window.NDLMEM as Mem).validateRecord({}, "Dataset");
    expect(drifted.valid).not.toBe(validateRecord({}, "Dataset").valid);
  });
});
