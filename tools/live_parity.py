#!/usr/bin/env python3
"""Open item O-05: run real catalogue records through the crosswalk, then through this validator
and the official linkml-validate, and report where the verdicts or the missing attributes differ.

Input is a JSON list of CKAN packages (for example concatenated package_search results).
Needs: npm run build; pip install linkml pyyaml.
Run: python3 tools/live_parity.py <packages.json> <path-to-mem-checkout> [--report docs/live-parity-result.json]
"""
import collections
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def crosswalk(packages):
    script = (
        "import('" + (ROOT / "dist" / "lib" / "ckan.js").as_uri() + "').then(m=>{let d='';process.stdin.on('data',c=>d+=c);"
        "process.stdin.on('end',()=>{console.log(JSON.stringify(JSON.parse(d).map(p=>m.crosswalkToMem(p))))})})"
    )
    res = subprocess.run(["node", "-e", script], input=json.dumps(packages), capture_output=True, text=True, check=True)
    return json.loads(res.stdout)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) < 2:
        raise SystemExit(__doc__)
    report = sys.argv[sys.argv.index("--report") + 1] if "--report" in sys.argv else None
    if report:
        args = [a for a in args if a != report]
    packages = json.loads(Path(args[0]).read_text(encoding="utf-8"))
    from linkml.validator import validate
    schema = str(Path(args[1]) / "src" / "model" / "uk_cross_government_metadata_exchange_model.yaml")

    rows, ours_rules = [], collections.Counter()
    for pkg, cw in zip(packages, crosswalk(packages)):
        v = cw["validation"]
        theirs = validate(cw["record"], schema, target_class="Dataset").results
        for f in v["findings"]:
            if f["severity"] == "error":
                ours_rules[f["rule"]] += 1
        ours_missing = sorted(f["path"] for f in v["findings"] if f["severity"] == "error" and f["rule"] == "required")
        ours_other = sorted(f["path"] for f in v["findings"] if f["severity"] == "error" and f["rule"] != "required")
        theirs_missing = sorted({m for r in theirs for m in re.findall(r"'(\w+)' is a required property", r.message)})
        theirs_other = [r.message[:120] for r in theirs if "required property" not in r.message]
        rows.append({"name": pkg["name"], "publisher": (pkg.get("organization") or {}).get("name"),
                     "ours": {"valid": v["valid"], "errors": v["errors"]},
                     "linkml": {"valid": not theirs, "errors": len(theirs)},
                     "missing": ours_missing,
                     "agree": v["valid"] == (not theirs) and ours_missing == theirs_missing and not ours_other and not theirs_other})
    agree = sum(r["agree"] for r in rows)
    for r in rows:
        if not r["agree"]:
            print(f"DIFF  {r['name']}: this={r['ours']} linkml={r['linkml']}")
    summary = {
        "records": len(rows), "agree": agree,
        "agreeMeans": "same valid/invalid verdict and the same set of missing required attributes, with no other errors on either side",
        "missingRequired": dict(collections.Counter(m for r in rows for m in r["missing"]).most_common()),
        "validHere": sum(r["ours"]["valid"] for r in rows), "validInLinkml": sum(r["linkml"]["valid"] for r in rows),
        "errorRulesHere": dict(ours_rules.most_common()), "rows": rows,
    }
    print(f"{agree} of {len(rows)} real records get the same verdict and the same missing attributes; valid here {summary['validHere']}, in linkml {summary['validInLinkml']}")
    print("error rules here:", dict(ours_rules.most_common()))
    if report:
        Path(report).write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    sys.exit(0 if agree == len(rows) else 1)


if __name__ == "__main__":
    main()
