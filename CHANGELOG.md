# Changelog

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
