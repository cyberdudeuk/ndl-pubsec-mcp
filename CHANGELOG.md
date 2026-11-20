# Changelog

## Unreleased

### Fixed

- Code in "How to use it" was illegible in the light theme: the inline-code background was painted over the dark code block (D-026, check C-19).
- Below 961 px wide, the contents drawer floated over the page text, because the narrow-screen rule came before the rule it overrides (D-027, check C-20).
- The bug report form now offers every tool, including `term_lookup` and `domain_list` (D-028, check C-21).

### Added

- Who it is for: seven proto-personas (roles, not people), each linked to a journey, a first tutorial and the worked examples that fit. Labelled as assumptions to test (open item O-03).
- A guided tour of the page, which also works as a plain list of links without JavaScript.
- How to use it is now in tabs: quick start, five tutorials, a user guide (questions and answers) and filterable hints and tips. Also published as `docs/user-guide.md`.
- Eight worked examples with copyable prompts. Validator results shown with them come from the validator at build time, and the live-catalogue comparison from the recorded run, never typed in.
- A toolkit generated with the page: a Dataset record template and a readiness checklist, both generated from the model, plus a prompt library, a show-and-tell and co-design session plan, a champion pack, and the personas and blueprints as a document (`docs/toolkit/`).
- Contribute and champion: a route for each kind of contribution, and what happens to it.
- Journeys and service blueprints for five journeys, with modelled effort curves.
- Personas, journeys, tutorials, examples and toolkit items in the knowledge graph, and five new glossary terms.
- Links into a tab or an accordion now open it.

## 0.4.0 (20 November 2026)

### Changed (independent prototype, ADR 0006)

- The website is rebuilt with its own design instead of GOV.UK styles, so it is not mistaken for a government service. It says plainly that this is an independent prototype, not endorsed by any government department. The README, product requirements, contact form and citation no longer name a team or a government publisher (D-024).
- ADR 0006 supersedes the wording of ADR 0002 that described this repository as official. Copyright and licences are unchanged.

### Added

- An in-browser metadata checker on the website. It runs the server's own validator, bundled at build time, so nothing pasted leaves the browser. A test proves the bundle agrees with the server.
- Website: light and dark themes, a retractable contents drawer with item counts and new-section flags, filters and search for tools, standards, documents, open items, defects and the glossary, glossary tooltips, conformance charts for the model's tests and for 50 real records, an estate map, set-up tabs for Claude Desktop and VS Code with copy buttons, a release timeline and the open register.
- Repository checks C-16 (no team name, claims of official status, GOV.UK styles or government publisher), C-17 (the independent-prototype statement on the page and README) and C-18 (unique ids and no dangling references on the page), each with a negative test (D-024, D-025).

### Removed

- The dependency on the GOV.UK front-end package, and its stylesheet.

### Added (repository standards for the move to gds-dtx, 17 November 2026)

- The Cabinet Office vulnerability disclosure route in `SECURITY.md`.
- Pre-commit hooks: detect-secrets against a new `.secrets.baseline`, YAML and JSON checks, whitespace fixes, and gitlint for GDS Way commit messages (`.gitlint`).
- `.secrets.baseline` with every candidate audited, and the audit recorded in `docs/compliance/secrets-audit.md`.

### Changed

- `codeql.yml` sets read-only permissions at the top level; the analyze job keeps the permissions it needs.

### Fixed
- The parity tools pair results with `zip(..., strict=True)`, so a length mismatch fails instead of passing silently (D-023).

### Changed
- CI lints the Python tools with Ruff and fails on any finding; repository check C-15 keeps it there (D-023). Part of applying the secure development standard to every project.
- Re-vendored the Data Quality Commons manifest at `dq-commons@76386f8`: `domain_list` now reports all 15 of its tools (closes O-16; D-021 resolved upstream in dq-commons#41).

## 0.3.0 (11 November 2026)

### Added
- `term_lookup`: business terms with their certification state (status, drafted by a person or AI, review level H0 to H5). Certified only when endorsed after H2 or above (ADR 0005).
- `domain_list` and the `ndl-pubsec-mcp://federation` resource: the other MCP servers in the estate, starting with the Data Quality Commons (`dqkit`), with provenance.
- `integrations/ndl-mcp-domain.json`: this server's own manifest, in the same shape as dq-commons'.
- `tools/build-vocab.mjs`: generates the public example vocabulary from `docs/glossary.md`.
- Checks C-12 (vocabulary generated, claims no review) and C-13 (manifests match the registered tools; vendored manifests carry provenance), each with deliberate-break tests.

### Defects
- D-021: the estate's two MCP servers did not reference each other, and the dq-commons manifest listed 12 of its 15 tools.

## 0.2.0 (8 November 2026)

The repository is re-scoped from a citizen-advice experiment to an official data discoverability server (ADR 0001 and 0002).

### Added
- MCP server with four read-only tools: `catalogue_search`, `dataset_describe`, `metadata_validate` and `standard_explain`, plus two resources.
- An xGov MEM validator compiled from the upstream LinkML model at commit `d6d9a24`. It agrees with all 32 cases in the upstream test corpus.
- A data.gov.uk to xGov MEM crosswalk that drafts only what the catalogue holds.
- Tests (unit, protocol end-to-end, and a deliberate-break test for every repository check), CI, Pages, Dependabot and CODEOWNERS.
- The usual document set at G3: PRD, architecture, data dictionary, glossary, knowledge graph, ADRs, governance screening, and defect, open and case-against registers.
- A contact issue form, and private vulnerability reporting in place of an email address.

### Checked against the official validator
- `tools/linkml_parity.py`: 45 varied records give the same verdict here as in `linkml-validate` 1.12.1; runs in CI (O-02).
- `tools/live_parity.py`: 50 real data.gov.uk records, crosswalked, get the same verdict and missing attributes in both; repeated weekly (O-05).
- Standards register re-read at primary pages: five entries are now verified (O-04).

### Fixed
- A bare value for a list is now an error, as in LinkML (D-019).
- `metadata_validate` returns at most 100 findings, with exact counts and an `omitted` total, so a hostile record cannot inflate the reply (D-020).

### Changed
- Flattened the layout: the nested `ndl-pubsec-mcp/` folder is gone.
- Licence holder corrected to Crown copyright (Government Digital Service). The earlier "as a DSIT officer" and personal-project statements contradicted each other (defect D-007).

### Removed
- The six citizen-domain scopes, theory of change, user research bundle and portfolio pages. They moved to the owner's separate personal experiment repository and remain in this repository's history before 0.2.0.
- The broken `CI` workflow (no `.yml` extension, so it never ran) and the Jekyll Pages workflow that published the wrong folder.

## 0.1.0 (11 June 2026)

The initial upload: programme documents and an empty TypeScript scaffold.
