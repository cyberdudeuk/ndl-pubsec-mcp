# Open register

Items design cannot close on its own. Each names who must act.

| Id | Item | Who acts |
|---|---|---|
| O-01 | **Closed 8 November 2026.** Live API checked through a browser: `www.data.gov.uk/api/action` redirects to `ckan.publishing.service.gov.uk/api/action`; the envelope, `package_search`, `package_show` and 404 Not Found responses match the client. Findings fixed as D-017 and D-018. A weekly live smoke workflow now guards against API drift | Done |
| O-02 | **Closed 8 November 2026.** Checked against `linkml-validate` 1.12.1. `uriorcurie` is not syntax-checked there either, so this server matches it. A bare value for a list is an error there, so it is now an error here (D-019). `tools/linkml_parity.py` runs in CI to catch any further drift: 45 of 45 variants agree | Done |
| O-03 | User needs are assumed, not researched. Run 5 to 8 sessions with publishers and catalogue managers | User researcher with the Data Management Team |
| O-04 | Re-verified 8 November 2026: ATRS, BODS, CSV, OpenAPI 3 and Open Referral UK are now V, read at the primary pages. xGov MEM endorsement wording is still S, because it is not in the catalogue page. The catalogue was last updated 25 October 2023, so re-read every 3 months | Owner, every 3 months |
| O-05 | **Closed 9 November 2026.** 50 real data.gov.uk records crosswalked and checked by both validators: 50 of 50 agree on verdict and on missing attributes. None is valid from the catalogue alone; access rights, contact point, security classification and version are always missing. See `docs/conformance.md`. Repeated weekly by the live workflow | Done |
| O-06 | Possible move to a government GitHub organisation (for example `gds-dtx`) alongside the co-cddo migration | Owner, with the organisation's admins |
| O-07 | A hosted streamable HTTP mode, if users need it (needs hosting, authentication and a security review) | Team decision |
| O-08 | Raise with the xGov MEM maintainers: allow a contact form URL as a contact point. Comment drafted for upstream issue #71 (contactPoint definition) | Owner (post) |
| O-09 | Confirm the DPIA and ATRS screening outcomes | Data protection lead |
| O-10 | Manual accessibility check of the documentation page with assistive technology | Accessibility specialist |
| O-11 | Repository settings, rechecked 13 November 2026. **Done:** private vulnerability reporting, Pages from GitHub Actions, CodeQL advanced setup (default setup off). **Ruleset on `main`:** pull requests only (squash), required checks `build-and-test (20)`, `build-and-test (22)`, `Analyze (actions)` and `Analyze (javascript-typescript)`, branches up to date, code scanning gate, linear history, no deletion or force-push. **Actions policy:** actions must be pinned to a full commit SHA (D-022, check C-14). Required reviews are deliberately not added: with a single maintainer they would block every merge | Owner, if a second maintainer joins |
| O-12 | Report D-001 upstream: the issue is written and pre-filled on co-cddo/ukgov-metadata-exchange-model and needs the owner's click to post. Text kept in the private repository's drafts | Owner (post) |
| O-13 | Next tools: `repo_find` (GitHub Repos Asset Catalogue, public edition) and `cda_lookup` (open edition of the critical data assets register) | Owner, once open editions are confirmed |
| O-14 | **Closed 9 November 2026.** The owner turned CodeQL default setup off; the committed advanced workflow now produces `Analyze (javascript-typescript)` and `Analyze (actions)`, and #6 merged | Done |
| O-15 | Point a deployment at the R2 register with `NDL_MCP_VOCAB_PATH` once R2 records `drafted_by` and `review_level` (govukOS change proposed 11 November 2026), and bind the endorsed terms | Owner, with the MEASR register |
| O-16 | **Closed 11 November 2026.** dq-commons#41 regenerated its manifest (15 tools) and added a guard test; re-vendored at `dq-commons@76386f8` | Done |
| O-17 | **Test before trusting** (issue #17). If an Auto Ontology-style semantic layer or text-to-SQL is ever piloted, first run the upstream evaluation harness on our own data and record the result here. Its name is unsettled: `ontology-sql-eval` in the README, `auto-ontology-eval` elsewhere (U). Assume no accuracy gain until measured. Text-to-SQL also needs DPIA and ATRS re-screening (O-09). Related: O-13 (next tools), O-15 (R2 vocabulary), ADR 0005 | Owner, before any pilot |
