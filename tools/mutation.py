#!/usr/bin/env python3
"""Mutation run: each mutant deliberately breaks one safeguard; the tests must fail for every one.
Add a mutant whenever a safeguard is added. Exit 1 if any mutant survives (defect D-012).
Usage: python3 tools/mutation.py   (after npm ci)
"""
import subprocess, pathlib, sys
root = pathlib.Path(__file__).resolve().parent.parent
mutants = [
 ("src/lib/mem.ts", "if (slot.required) {", "if (false) {", "required check removed"),
 ("src/lib/mem.ts", "        out.push({ severity: \"error\", path: at(slot.name), rule: \"multivalued\"", "        out.push({ severity: \"warning\", path: at(slot.name), rule: \"multivalued\"", "bare value for a list downgraded to a warning"),
 ("src/lib/mem.ts", "if (this.kept.length < MAX_FINDINGS) this.kept.push(f);", "this.kept.push(f);", "findings cap removed"),
 ("src/lib/mem.ts", "if (!cls.slots[key]) {", "if (false) {", "unknown-attribute check removed"),
 ("src/lib/mem.ts", "if (v !== expected) {", "if (false) {", "type designator check removed"),
 ("src/lib/mem.ts", "return typeof value === \"string\" && set.has(value) ? null", "return typeof value === \"string\" ? null", "enum check removed"),
 ("src/lib/mem.ts", "&& isRealDate(value) ? null", "? null", "date check removed"),
 ("src/lib/mem.ts", "if (!slot.multivalued) {", "if (false) {", "single-valued check removed"),
 ("src/lib/mem.ts", "if (pattern && !new RegExp(pattern).test(value))", "if (false)", "pattern check removed"),
 ("src/lib/mem.ts", "validateObject(value as Record<string, unknown>, range, path, out);", "", "nested class validation removed"),
 ("src/lib/ckan.ts", "    publisher: p.organization?.title ?? null,", "    publisher: p.organization?.title ?? null, maintainerEmail: (p as unknown as Record<string, unknown>).maintainer_email,", "privacy: maintainer email leaked"),
 ("src/lib/ckan.ts", 'if (!/^https:\\/\\//.test(this.baseUrl))', "if (false)", "https enforcement removed"),
 ("src/lib/ckan.ts", "  if (modified) record.modified", "  record.securityClassification = \"OFFICIAL\";\n  if (modified) record.modified", "crosswalk guesses a classification"),
 ("src/lib/ckan.ts", "const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);", "const timer = setTimeout(() => {}, this.timeoutMs);", "timeout removed"),
 ("src/server.ts", ".max(20)", ".max(2000)", "limit cap raised"),
 ("src/lib/ckan.ts", "  return t ? t : null;", "  return t;", "blank strings no longer treated as absent"),
 ("src/lib/ckan.ts", '  asNeeded: "freq:irregular",', '  asNeeded: "freq:asNeeded",', "frequency mapped to a term xGov MEM does not permit"),
 ("src/lib/ckan.ts", 'isoDate(extra(p, "dcat_modified")) ?? ', "", "publisher DCAT dates ignored"),
 ("src/lib/ckan.ts", "  if (version) record.version = version;", "", "catalogue version not drafted"),
 ("src/server.ts", '.regex(/^[A-Za-z0-9_-]{2,100}$/)', "", "id restriction removed"),
]
killed = 0
for f, old, new, label in mutants:
    p = root / f; orig = p.read_text()
    assert old in orig, (label, old)
    p.write_text(orig.replace(old, new, 1))
    try:
        r = subprocess.run(["npx", "vitest", "run", "test/mem.test.ts", "test/ckan.test.ts", "test/server.test.ts"], cwd=root, capture_output=True, text=True, timeout=300)
        dead = r.returncode != 0
    finally:
        p.write_text(orig)
    killed += dead
    print(("KILLED  " if dead else "SURVIVED") , label)
print(f"{killed} of {len(mutants)} mutants killed")
sys.exit(0 if killed == len(mutants) else 1)
