# Changelog

## Unreleased

### Fixed

- `api_search` now reads both files of the government API catalogue and holds 269 APIs instead of 231, including DWP's 48 (D-044, check C-37). The ecosystem diagram's API count now comes from the data.
- The Digital Economy Act register figures are reported with what they do and do not show: 194 of the 667 agreements are still active; each records one main method, so API use is a floor (three Warm Home Discount helpline agreements that record file-based methods also give access to DWP's Citizen API); and the register counts agreements, not volume. Added the prescription charge exemption exchange (DWP and NHS, real-time API).
- Deliberate-break tests no longer copy git-ignored screenshots (D-045, check C-38).
- Exchange cards no longer show unrelated APIs as related (for example Bathing Water for water poverty): every suggested query is now scoped to a provider that is a party to the exchange, and queries with no relevant match were removed (D-046, check C-40).

### Added

- **Exchanges feed** (`exchanges.json` on the site): every exchange with its related APIs, portal link and the register counts, generated from the master for other portals and catalogues to harvest rather than copy, with a caution that related is not the same as used (check C-39).
- **Standards register extended to the wider public sector**: 41 standards in 8 areas (data and metadata, APIs and integration, identifiers and reference data, cyber security, digital services and accessibility, identity, health and care, procurement and transparency), each saying how firmly it applies (Mandatory to Proposed), who it applies to and who publishes it. `standard_explain` can list one area. BODS is recorded as v0.3, as the DSA list shows.
- **Exchanges and journeys**: `exchange_search` and a new page section map 18 data exchanges between organisations by citizen or business journey (registering a death, claiming Universal Credit, buying a home, setting up a company, exporting and more), with parties, what moves, how, shared identifiers, legal basis, related APIs and sources. Counts come from the 667 agreements on the Digital Economy Act register, read on 20 November 2026: 11 record an API as their method (a floor; see Fixed).
- **Search or ask across the portal** (press /): ranks passages from every section against a question in plain English and can turn them into a prompt for your own AI assistant. No AI runs on the page and nothing leaves the browser.
- **MCP prompts** for agents: `journey-exchanges`, `standards-for-a-service` and `check-a-catalogue-record`; an `llms.txt` description for AI agents; exchanges in the knowledge graph.
- **New here? Start here**: the portal explained with no prior knowledge assumed, ten new plain-English glossary terms with tooltips, and what NDL stands for.
- **Safeguards for AI use**: the guardrails built into the server, for AI model and MCP developers. New roles for trade analysts, researchers and journalists, and AI developers.
- Checks C-33 (every tool has a filter job, D-040), C-34 (hero-only button style, D-041) and C-35 (every tool input bounded; `metadata_validate` records capped at 100 KB, D-042).

- Monthly refresh of the API catalogue pin: a scheduled workflow re-pins co-cddo/api-catalogue, recompiles, rebuilds and verifies, then opens a pull request for a person to merge. Check C-32 warns once the pin is 35 days old and fails the build at 100, and the worked example says how old the pin was when the page was built.

### Added

- `api_search`: finds UK public sector APIs in the government API catalogue (pinned at co-cddo/api-catalogue b239f15, 2 November 2026, 231 APIs) and two HMRC APIs the catalogue lacks, each result with where it came from. It never calls the APIs.
- `server_search`: finds MCP servers in the estate and candidates awaiting review, each with its status and the date it was checked.
- An interactive ecosystem view in the Estate map, also published on its own as `ecosystem.html`: every component links to its home, and hovering or focusing one highlights what it connects to.
- Worked examples "What could connect UK Export Finance and HMRC?" and "Find an MCP server for UK legislation", with results produced by the tools when the page is built; a tour stop, a tip, a guide answer and glossary terms (API catalogue, Data service, Shared identifier).
- Check C-31 (defect D-039); the visual inspection now also covers the standalone ecosystem page and the map's hover state.

### Changed

- Licence: the repository's own content (documentation, website, user guide and toolkit) is now © 2026 Emanuel Silva under Creative Commons Attribution 4.0, and code stays under MIT with the owner as copyright holder (ADR 0007, check C-29). The vendored xGov MEM files stay © Crown copyright under OGL v3.0, with their licence text moved to `vendor/xgov-mem/LICENCE-OGL`.
- The fixed Top button no longer covers the footer colophon on phones (D-037, check C-30).
- Open item O-18: plan for DCAT-AP-UK superseding xGov MEM.
- Open item O-19: finding APIs and MCP servers, from the UKEF and HMRC assessment.

### Fixed

- Code in "How to use it" was illegible in the light theme: the inline-code background was painted over the dark code block (D-026, check C-19).
- Below 961 px wide, the contents drawer floated over the page text, because the narrow-screen rule came before the rule it overrides (D-027, check C-20).
- The bug report form now offers every tool, including `term_lookup` and `domain_list` (D-028, check C-21).
- Found by visual inspection: the copy button no longer covers code on phones (D-029, C-25); "Last updated" now shows the release date, with the standards check date labelled separately (D-030, C-23); the estate map and effort curves keep readable labels and scroll sideways on phones (D-031, C-24); tab bars wrap so no tab is hidden (D-032, C-26); pill and inactive-letter colours meet WCAG AA in both themes (D-033, C-22); a worked example now names every attribute tied for most often missing (D-034, C-27). Provenance tags meet AA contrast in both themes (D-036, C-22). Bar chart labels are no longer cut off, and the charts keep a readable size on phones (D-035, C-28). The footer barcode is larger on phones.

### Added

- `npm run visual` (`tools/visual_inspect.py`): renders the page at three widths in light and dark, saves a screenshot of every section for a person to look at, and fails on contrast, overflow, clipping or script errors.
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
