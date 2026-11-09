// Validator for the UK Cross-Government Metadata Exchange Model (xGov MEM).
// It interprets the rule set compiled from the vendored LinkML model (src/generated/mem-rules.json),
// so the model, not this file, is the source of truth for slots, ranges, enums and patterns.
import rulesJson from "../generated/mem-rules.json" with { type: "json" };

export type Severity = "error" | "warning";

export interface Finding {
  severity: Severity;
  path: string;
  rule: string;
  message: string;
}

export interface ValidationResult {
  className: string;
  valid: boolean;
  errors: number;
  warnings: number;
  findings: Finding[];
  /** Findings left out of `findings` because of the cap (defect D-020). Counts above are exact. */
  omitted: number;
  model: { repository: string; commit: string; commitDate: string };
}

/** At most this many findings are returned, so a hostile record cannot inflate the reply (defect D-020). */
export const MAX_FINDINGS = 100;

/** Somewhere findings go: a plain array, or the capped collector used at the top level. */
interface Sink {
  push(...f: Finding[]): unknown;
}

class CappedFindings implements Sink {
  readonly kept: Finding[] = [];
  errors = 0;
  warnings = 0;
  push(...fs: Finding[]): void {
    for (const f of fs) {
      if (f.severity === "error") this.errors++;
      else this.warnings++;
      if (this.kept.length < MAX_FINDINGS) this.kept.push(f);
    }
  }
}

interface Range {
  range: string;
  pattern: string | null;
}
interface SlotRule {
  name: string;
  uri: string | null;
  required: boolean;
  recommended: boolean;
  multivalued: boolean;
  designatesType: boolean;
  ranges: Range[];
  description: string;
}
interface ClassRule {
  classUri: string | null;
  description: string;
  slots: Record<string, SlotRule>;
}
interface Rules {
  generatedFrom: { repository: string; commit: string; commitDate: string };
  modelId: string;
  modelLicence: string;
  enums: Record<string, string[]>;
  classes: Record<string, ClassRule>;
}

export const rules = rulesJson as unknown as Rules;
export const CLASS_NAMES = Object.keys(rules.classes);
const enumSets = new Map(Object.entries(rules.enums).map(([k, v]) => [k, new Set(v)]));

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/;
const URI_RE = /^[A-Za-z][A-Za-z0-9+.-]*:[^\s]+$/;

function isRealDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** Returns null when the value fits the range, otherwise a short reason. */
function checkRange(value: unknown, r: Range, path: string, out: Sink): string | null {
  const { range, pattern } = r;
  if (rules.classes[range]) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return `expected an object of class ${range}`;
    }
    validateObject(value as Record<string, unknown>, range, path, out);
    return null;
  }
  const set = enumSets.get(range);
  if (set) {
    return typeof value === "string" && set.has(value) ? null : `not a permitted value of ${range}`;
  }
  switch (range) {
    case "integer":
      return Number.isInteger(value) ? null : "expected an integer";
    case "boolean":
      return typeof value === "boolean" ? null : "expected true or false";
    case "date":
      return typeof value === "string" && isRealDate(value) ? null : "expected a date in YYYY-MM-DD form";
    case "datetime":
      return typeof value === "string" && DATETIME_RE.test(value) ? null : "expected an ISO 8601 date-time";
    case "uri":
      return typeof value === "string" && URI_RE.test(value) ? null : "expected an absolute URI";
    case "uriorcurie":
    case "string":
    default: {
      if (typeof value !== "string") return "expected text";
      if (pattern && !new RegExp(pattern).test(value)) return `does not match the pattern ${pattern}`;
      return null;
    }
  }
}

function validateObject(record: Record<string, unknown>, className: string, base: string, out: Sink): void {
  const cls = rules.classes[className];
  if (!cls) {
    out.push({ severity: "error", path: base || "$", rule: "class", message: `Unknown class ${className}` });
    return;
  }
  const at = (slot: string) => (base ? `${base}.${slot}` : slot);

  for (const key of Object.keys(record)) {
    if (!cls.slots[key]) {
      out.push({
        severity: "error",
        path: at(key),
        rule: "unknown-attribute",
        message: `${key} is not an attribute of ${className} in xGov MEM. Check the spelling.`
      });
    }
  }

  for (const slot of Object.values(cls.slots)) {
    const raw = record[slot.name];
    const missing = raw === undefined || raw === null || raw === "" || (Array.isArray(raw) && raw.length === 0);
    if (missing) {
      if (slot.required) {
        out.push({ severity: "error", path: at(slot.name), rule: "required", message: `${slot.name} is required for ${className}` });
      } else if (slot.recommended) {
        out.push({ severity: "warning", path: at(slot.name), rule: "recommended", message: `${slot.name} is recommended for ${className}` });
      }
      continue;
    }

    let values: unknown[];
    if (Array.isArray(raw)) {
      if (!slot.multivalued) {
        out.push({ severity: "error", path: at(slot.name), rule: "single-valued", message: `${slot.name} takes one value, not a list` });
        continue;
      }
      values = raw;
    } else {
      if (slot.multivalued) {
        // linkml-validate rejects a bare value here (checked against 1.12.1, defect D-019), so this is an error.
        out.push({ severity: "error", path: at(slot.name), rule: "multivalued", message: `${slot.name} takes a list; give the value as a one-item list` });
      }
      values = [raw];
    }

    values.forEach((v, i) => {
      const p = Array.isArray(raw) ? `${at(slot.name)}[${i}]` : at(slot.name);
      if (slot.designatesType) {
        const expected = cls.classUri;
        if (v !== expected) {
          out.push({ severity: "error", path: p, rule: "designates-type", message: `${slot.name} must be ${expected} for ${className}` });
        }
        return;
      }
      const nested: Finding[] = [];
      const reasons = slot.ranges.map((r) => checkRange(v, r, p, nested));
      if (reasons.some((x) => x === null)) {
        out.push(...nested);
      } else {
        out.push({ severity: "error", path: p, rule: "range", message: `${slot.name}: ${reasons.join("; or ")}` });
      }
    });
  }
}

export function inferClass(record: Record<string, unknown>): string | null {
  const t = record["type"];
  for (const [name, c] of Object.entries(rules.classes)) {
    if (c.classUri && c.classUri === t) return name;
  }
  return null;
}

export function validateRecord(record: unknown, className?: string): ValidationResult {
  const findings = new CappedFindings();
  let target = className ?? null;
  if (typeof record !== "object" || record === null || Array.isArray(record)) {
    findings.push({ severity: "error", path: "$", rule: "shape", message: "The record must be a single JSON object" });
    target = target ?? "unknown";
  } else {
    target = target ?? inferClass(record as Record<string, unknown>);
    if (!target) {
      findings.push({
        severity: "error",
        path: "type",
        rule: "class",
        message: `Cannot tell which class to validate against. Give className, or set type to one of: ${Object.values(rules.classes)
          .map((c) => c.classUri)
          .join(", ")}`
      });
      target = "unknown";
    } else {
      validateObject(record as Record<string, unknown>, target, "", findings);
    }
  }
  return {
    className: target,
    valid: findings.errors === 0,
    errors: findings.errors,
    warnings: findings.warnings,
    findings: findings.kept,
    omitted: findings.errors + findings.warnings - findings.kept.length,
    model: rules.generatedFrom
  };
}
