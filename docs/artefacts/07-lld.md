---
artefact:id: P07-LLD-001
artefact:version: 1.0.0
artefact:as-of: 2026-11-20
artefact:review-date: 2027-02-20
project: P07 NDL PubSec MCP server
grade: G3
profile: public sector > central > work (independent prototype, ADR 0006)
---

# Low-level design (LLD): NDL PubSec MCP server

> **How to read this.** Facts marked V were read from this repository on 20 November 2026. Assumptions, measures and risks are proposals written for this kit, not findings. U means unconfirmed. Where another document in this repository already covers a topic, this one links to it rather than repeating it.

## Build and check commands (V: README)
```
npm ci
npm test
node tools/conformance-run.mjs
```

## Scripts (V: file tree)
- `tools/build-site.mjs`
- `tools/build-vocab.mjs`
- `tools/check-repo.mjs`
- `tools/compile_mem.py`
- `tools/conformance-run.mjs`
- `tools/conformance.py`
- `tools/linkml_parity.py`
- `tools/live-smoke.mjs`
- `tools/live_parity.py`
- `tools/mutation.py`
- `tools/visual_inspect.py`

## Tests (V: file tree)
- `test/ckan.test.ts`
- `test/fixtures.ts`
- `test/mem.test.ts`
- `test/repo-checks.test.ts`
- `test/server.test.ts`
- `test/site-validator.test.ts`
- `test/vocab.test.ts`

## Workflows (V: .github/workflows)
- `ci.yml`
- `codeql.yml`
- `dependency-review.yml`
- `live-smoke.yml`
- `pages.yml`
- `scorecard.yml`

## Repository size
98 files tracked on 20 November 2026.

## Documentation kit
- `docs/artefacts/manifest.yaml` lists every core document, where it is, and its review date.
- `tools/artefact_check.py` checks the kit (rules AC-01 to AC-08, each with a negative test). Run `python3 tools/artefact_check.py --self-test` then `python3 tools/artefact_check.py .`.

## Handover
Someone new can rebuild and verify with the commands above, then read [docs/prd.md](../../docs/prd.md) and [docs/architecture.md](../../docs/architecture.md).
