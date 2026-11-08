# Defect register

Internal working record. Every defect has a root cause and a check that would catch it again. The check suite never shrinks.

| Id | Found | Defect | Root cause | Check | Status |
|---|---|---|---|---|---|
| D-001 | 2026-11-08 | The upstream xGov MEM model fails strict YAML 1.2 parsing (model.yaml line 348) | A double-quoted description continues on an unindented line. PyYAML accepts it; strict parsers do not | Compiled with PyYAML, as LinkML does. T-compile drift gate in CI (`compile_mem.py --check`). Reported upstream as O-12 | Worked around; upstream fix open |
| D-002 | 2026-11-08 | The CI workflow never ran | The file was named `CI` with no `.yml` extension, which GitHub ignores | C-03 | Fixed |
| D-003 | 2026-11-08 | An email placeholder in README and SECURITY broke the contact-by-form rule | The template assumed an email contact | C-01 | Fixed |
| D-004 | 2026-11-08 | Unfilled user-name placeholders in the README and set-up script | The set-up script was never run | C-04 | Fixed |
| D-005 | 2026-11-08 | Tools specified in documents had no code or tests (version 0.1) | Documents ran ahead of the build | C-05 | Fixed |
| D-006 | 2026-11-08 | Defects could be recorded without a check | No gate tied the register to checks | C-06 | Fixed |
| D-007 | 2026-11-08 | The licence statement contradicted itself (personal project and Crown copyright "as a DSIT officer"), and the department was out of date | Written before the role and machinery-of-government changes | C-07, ADR 0002 | Fixed |
| D-008 | 2026-11-08 | The conformance page stated 13 valid and 19 invalid cases; the run had 12 and 20 | Counts typed by hand instead of read from the run | C-08 | Fixed |
| D-009 | 2026-11-08 | Pages published the repository root (the README) instead of the documentation | The Jekyll source was `./` while the documents were in a nested folder | T-site: CI rebuilds the site and diffs `docs/index.html`; the Pages workflow uploads `docs/` | Fixed |
| D-010 | 2026-11-08 | Check C-05 could be fooled: a tool counted as tested if its name appeared anywhere in a test file, including the break test's own source | The check matched the bare name, not a call | C-05 now needs `name: "<tool>"` in a call; vaccination test in `test/repo-checks.test.ts` | Fixed |
| D-011 | 2026-11-08 | Test labels that joined a rule name and a path ending in `.email` with an at sign looked like email addresses to C-01 (`.email` is a real top-level domain) | The test label format used `@` | C-01 left strict; test labels now use "at" | Fixed |
| D-012 | 2026-11-08 | Raising the result limit from 20 to 2000 went undetected | The input test sent two faults at once, so the short query masked the limit | T-mutation: `tools/mutation.py` in CI; the input test now sends one fault per call | Fixed |
| D-013 | 2026-11-08 | The site build id stayed the same when only the page template, styles or script changed, so two different pages could share an id | Only the data was hashed | C-09 | Fixed |
| D-014 | 2026-11-08 | Dates on the page mixed 8 November 2026 and 2026-11-08 | Raw ISO dates were printed in visible text | T-site: all visible dates go through `longDate`; reviewed in a screenshot | Fixed |
| D-015 | 2026-11-08 | Pull request #6 could not merge: the repository ruleset requires checks named `build-and-test (20)` and `build-and-test (22)`, but the CI job was renamed `verify` | The required check names live in repository settings, which the rewrite did not consult | C-10 | Fixed |
