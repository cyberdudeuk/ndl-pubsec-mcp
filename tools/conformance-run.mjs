// Reads conformance cases on stdin (from tools/conformance.py) and checks each against the built validator.
import { validateRecord } from "../dist/lib/mem.js";

const chunks = [];
for await (const c of process.stdin) chunks.push(c);
const cases = JSON.parse(Buffer.concat(chunks).toString("utf8"));

let failed = 0;
for (const c of cases) {
  const r = validateRecord(c.record, c.className);
  const ok = r.valid === c.expectValid;
  if (!ok) failed++;
  const why = r.findings.filter((f) => f.severity === "error").map((f) => `${f.rule}@${f.path}`).join(", ");
  console.log(`${ok ? "PASS" : "FAIL"}  ${c.file}  expected ${c.expectValid ? "valid" : "invalid"}, got ${r.valid ? "valid" : "invalid"}${why ? `  [${why}]` : ""}`);
}
console.log(`\n${cases.length - failed} of ${cases.length} conformance cases agree with the xGov MEM corpus`);
const byClass = {};
for (const c of cases) {
  const k = (byClass[c.className] ??= { valid: 0, validAgree: 0, invalid: 0, invalidAgree: 0 });
  const r = validateRecord(c.record, c.className);
  if (c.expectValid) { k.valid++; if (r.valid) k.validAgree++; } else { k.invalid++; if (!r.valid) k.invalidAgree++; }
}
if (process.env.CONFORMANCE_REPORT) {
  const { writeFileSync } = await import("node:fs");
  const { rules } = await import("../dist/lib/mem.js");
  writeFileSync(process.env.CONFORMANCE_REPORT, JSON.stringify({ model: rules.generatedFrom, cases: cases.length, agree: cases.length - failed, byClass }, null, 2) + "\n");
}
process.exit(failed ? 1 : 0);
