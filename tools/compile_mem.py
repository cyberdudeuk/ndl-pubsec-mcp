#!/usr/bin/env python3
"""Compile the vendored xGov MEM LinkML model into the rule set the validator uses.

Single source of truth: vendor/xgov-mem/*.yaml (byte-identical copies of the upstream files).
Never edit src/generated/mem-rules.json by hand; run `npm run compile:mem`.

Python (PyYAML) is used because the upstream model is not strictly valid YAML 1.2:
a double-quoted description continues on an unindented line (model.yaml line 348).
Strict parsers reject it; PyYAML, which LinkML itself uses, accepts it. See defect D-001.

Usage: python3 tools/compile_mem.py [--check]
  --check  exit 1 if the committed JSON differs from a fresh compile (CI drift gate)
"""
import json
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
VENDOR = ROOT / "vendor" / "xgov-mem"
OUT = ROOT / "src" / "generated" / "mem-rules.json"


def load(name):
    with open(VENDOR / name, encoding="utf-8") as f:
        return yaml.safe_load(f)


def first_line(text):
    return (text or "").strip().split("\n")[0]


def compile_rules():
    model = load("model.yaml")
    orgs = load("uk-gov-orgs.yaml")
    source = json.loads((VENDOR / "source.json").read_text(encoding="utf-8"))
    default_range = model.get("default_range", "string")

    enums = {}
    for name, e in {**model.get("enums", {}), **orgs.get("enums", {})}.items():
        enums[name] = list((e.get("permissible_values") or {}).keys())

    def slot_def(name, usage):
        base = model["slots"].get(name)
        if base is None:
            raise SystemExit(f"Slot {name} is used but not defined in the model")
        merged = {**base, **(usage or {})}
        if "any_of" in merged:
            ranges = [{"range": a.get("range", "string"), "pattern": a.get("pattern")} for a in merged["any_of"]]
        else:
            ranges = [{"range": merged.get("range", default_range), "pattern": merged.get("pattern")}]
        return {
            "name": name,
            "uri": merged.get("slot_uri"),
            "required": merged.get("required") is True,
            "recommended": merged.get("recommended") is True,
            "multivalued": merged.get("multivalued") is True,
            "designatesType": merged.get("designates_type") is True,
            "ranges": ranges,
            "description": first_line(merged.get("description")),
        }

    def class_slots(name):
        c = model["classes"][name]
        # usage accumulated down the inheritance chain; the child wins
        chain = []
        k = c
        while k is not None:
            chain.insert(0, k)
            k = model["classes"].get(k["is_a"]) if k.get("is_a") else None
        slots, usage = [], {}
        for k in chain:
            for s in k.get("slots", []) or []:
                if s not in slots:
                    slots.append(s)
            for s, u in (k.get("slot_usage") or {}).items():
                usage[s] = {**usage.get(s, {}), **(u or {})}
        return {s: slot_def(s, usage.get(s)) for s in slots}

    classes = {}
    for name, c in model["classes"].items():
        if c.get("abstract"):
            continue
        classes[name] = {
            "classUri": c.get("class_uri"),
            "description": first_line(c.get("description")),
            "slots": class_slots(name),
        }

    return {
        "generatedFrom": source,
        "modelId": model.get("id"),
        "modelLicence": model.get("license"),
        "enums": enums,
        "classes": classes,
    }


def main():
    rules = compile_rules()
    text = json.dumps(rules, indent=2, ensure_ascii=False) + "\n"
    if "--check" in sys.argv:
        current = OUT.read_text(encoding="utf-8") if OUT.exists() else ""
        if current != text:
            print("mem-rules.json is out of date: run npm run compile:mem", file=sys.stderr)
            sys.exit(1)
        print("mem-rules.json matches the vendored model")
        return
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(text, encoding="utf-8")
    print(f"compiled {len(rules['classes'])} classes and {len(rules['enums'])} enums "
          f"from xGov MEM @ {rules['generatedFrom']['commit'][:7]}")


if __name__ == "__main__":
    main()
