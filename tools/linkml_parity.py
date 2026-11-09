#!/usr/bin/env python3
"""Differential test: this validator against the official linkml-validate (open item O-02, defect D-019).

It builds a valid record per xGov MEM class, then many variants that each break or stretch one rule
(base records in test/parity-base.json; drop each required attribute, wrong enum, impossible date, bare value for a list, list for a single
value, unknown attribute, wrong type, bad nested contact, plain-text identifier). Both validators run
on every variant; any difference in the valid/invalid verdict fails the run.

Needs: npm run build; pip install linkml pyyaml. Run: python3 tools/linkml_parity.py <path-to-mem-checkout>
"""
import copy
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RULES = json.loads((ROOT / "src" / "generated" / "mem-rules.json").read_text(encoding="utf-8"))

BASE = json.loads((ROOT / "test" / "parity-base.json").read_text(encoding="utf-8"))


def variants():
    out = []
    for cls, base in BASE.items():
        slots = RULES["classes"][cls]["slots"]
        out.append((f"{cls}: valid base", cls, copy.deepcopy(base)))
        for name, slot in slots.items():
            if name in base:
                v = copy.deepcopy(base); del v[name]
                out.append((f"{cls}: without {name}", cls, v))
            if slot["multivalued"] and isinstance(base.get(name), list):
                v = copy.deepcopy(base); v[name] = base[name][0]
                out.append((f"{cls}: bare value for list {name}", cls, v))
            if not slot["multivalued"] and name in base and not isinstance(base[name], dict):
                v = copy.deepcopy(base); v[name] = [base[name], base[name]]
                out.append((f"{cls}: list for single {name}", cls, v))
            rng = slot["ranges"][0]["range"]
            if rng in RULES["enums"] and name in base:
                v = copy.deepcopy(base); v[name] = "NOT-A-PERMITTED-VALUE"
                out.append((f"{cls}: bad enum {name}", cls, v))
            if rng == "date" and name in base:
                for bad in ("2026-02-30", "01/11/2026"):
                    v = copy.deepcopy(base); v[name] = bad
                    out.append((f"{cls}: bad date {name}={bad}", cls, v))
        v = copy.deepcopy(base); v["license"] = "https://example.org/l"
        out.append((f"{cls}: unknown attribute", cls, v))
    v = copy.deepcopy(BASE["Dataset"]); v["identifier"] = "not a uri at all"
    out.append(("Dataset: plain-text identifier", "Dataset", v))
    v = copy.deepcopy(BASE["Dataset"]); v["type"] = "Dataset"
    out.append(("Dataset: bare type", "Dataset", v))
    v = copy.deepcopy(BASE["Dataset"]); v["contactPoint"] = {**BASE["ContactPoint"], "email": "no-at-sign"}
    out.append(("Dataset: bad nested email", "Dataset", v))
    v = copy.deepcopy(BASE["Dataset"]); v["contactPoint"] = BASE["ContactPoint"]["email"]
    out.append(("Dataset: contact point as text", "Dataset", v))
    v = copy.deepcopy(BASE["Dataset"]); v["licence"] = "DATA_SHARE_AGREEMENT"
    out.append(("Dataset: licence alternative", "Dataset", v))
    return out


def ours(cases):
    script = (
        "import('" + (ROOT / "dist" / "lib" / "mem.js").as_uri() + "').then(m=>{let d='';process.stdin.on('data',c=>d+=c);"
        "process.stdin.on('end',()=>{const cs=JSON.parse(d);console.log(JSON.stringify(cs.map(c=>m.validateRecord(c.record,c.cls).valid)))})})"
    )
    res = subprocess.run(["node", "-e", script], input=json.dumps([{"cls": c, "record": r} for _, c, r in cases]),
                         capture_output=True, text=True, check=True)
    return json.loads(res.stdout)


def theirs(cases, mem):
    from linkml.validator import validate
    schema = str(Path(mem) / "src" / "model" / "uk_cross_government_metadata_exchange_model.yaml")
    return [len(validate(r, schema, target_class=c).results) == 0 for _, c, r in cases]


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    cases = variants()
    a, b = ours(cases), theirs(cases, sys.argv[1])
    diff = 0
    for (label, _, _), x, y in zip(cases, a, b):
        same = x == y
        diff += not same
        print(f"{'SAME' if same else 'DIFF'}  {label}: this={'valid' if x else 'invalid'} linkml={'valid' if y else 'invalid'}")
    print(f"\n{len(cases) - diff} of {len(cases)} variants agree with linkml-validate")
    sys.exit(1 if diff else 0)


if __name__ == "__main__":
    main()
