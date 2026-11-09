#!/usr/bin/env python3
"""Conformance run: the validator must agree with the xGov MEM's own test corpus.

Every file in <mem>/src/data/<Class>/valid must pass and every file in .../invalid must fail,
mirroring the upstream Makefile's linkml-validate tests. The corpus is read from a checkout of
co-cddo/ukgov-metadata-exchange-model at the vendored commit and is never copied into this
repository (the upstream examples contain real contact addresses).

Usage: python3 tools/conformance.py <path-to-mem-checkout> [--report]   (needs `npm run build` first)
  --report  write docs/conformance-result.json, which docs/conformance.md and the site must match (check C-08)
"""
import datetime
import json
import subprocess
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent


def to_jsonable(v):
    if isinstance(v, (datetime.date, datetime.datetime)):
        return v.isoformat()
    if isinstance(v, dict):
        return {k: to_jsonable(x) for k, x in v.items()}
    if isinstance(v, list):
        return [to_jsonable(x) for x in v]
    return v


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    data = Path(sys.argv[1]) / "src" / "data"
    cases = []
    for class_dir in sorted(p for p in data.iterdir() if p.is_dir()):
        for expect in ("valid", "invalid"):
            for f in sorted((class_dir / expect).glob("*.yaml")):
                record = to_jsonable(yaml.safe_load(f.read_text(encoding="utf-8")))
                cases.append({"file": f"{class_dir.name}/{expect}/{f.name}", "className": class_dir.name,
                              "expectValid": expect == "valid", "record": record})
    runner = ROOT / "tools" / "conformance-run.mjs"
    import os
    env = dict(os.environ)
    if "--report" in sys.argv:
        env["CONFORMANCE_REPORT"] = str(ROOT / "docs" / "conformance-result.json")
    res = subprocess.run(["node", str(runner)], input=json.dumps(cases), capture_output=True, text=True, env=env)
    if res.returncode not in (0, 1):
        print(res.stderr, file=sys.stderr)
        raise SystemExit(2)
    print(res.stdout, end="")
    sys.exit(res.returncode)


if __name__ == "__main__":
    main()
