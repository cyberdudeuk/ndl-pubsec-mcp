---
artefact:id: P07-FTIR-001
artefact:version: 1.0.0
artefact:as-of: 2026-11-20
artefact:review-date: 2027-02-20
project: P07 NDL PubSec MCP server
grade: G3
profile: public sector > central > work (independent prototype, ADR 0006)
---

# Functional, technical and integration requirements (FTIR): NDL PubSec MCP server

> **How to read this.** Facts marked V were read from this repository on 20 November 2026. Assumptions, measures and risks are proposals written for this kit, not findings. U means unconfirmed. Where another document in this repository already covers a topic, this one links to it rather than repeating it.

Requirements are stated once, in [docs/prd.md](../../docs/prd.md). This document says how each is met and checked.

## Functional

| ID | Requirement | Priority | Verified by | State |
|---|---|---|---|---|
| F01 | catalogue_search over data.gov.uk | Must | test/ckan.test.ts | Has a check |
| F02 | dataset_describe drafts a MEM record and lists what is missing | Must | test/mem.test.ts | Has a check |
| F03 | metadata_validate lists errors and warnings with paths | Must | test/mem.test.ts | Has a check |
| F04 | standard_explain with provenance labels | Should | test/server.test.ts | Has a check |
| F05 | term_lookup reports drafter and review level; only H2+ endorsed terms are certified | Must | test/vocab.test.ts | Has a check |
| F06 | domain_list of sibling servers with safety statements | Could | test/server.test.ts | Has a check |
| F07 | All tools read-only; no personal data | Must | test/server.test.ts (U: confirm) | Check named; coverage unconfirmed (U) |

## Technical

| ID | Requirement | State |
|---|---|---|
| T01 | Code scanning | Present (V: .github/workflows) |
| T02 | Dependency review on pull requests | Present (V: .github/workflows) |
| T03 | OpenSSF Scorecard | Present (V: .github/workflows) |
| T04 | Automated release | Not present |
| T05 | Published by workflow (Pages) | Present (V: .github/workflows) |
| T06 | Documentation kit checked in CI | Present (V: .github/workflows) |

Workflows present (V): `ci.yml`, `codeql.yml`, `dependency-review.yml`, `live-smoke.yml`, `pages.yml`, `scorecard.yml`.

Tests present (V): `ckan.test.ts`, `fixtures.ts`, `mem.test.ts`, `repo-checks.test.ts`, `server.test.ts`, `site-validator.test.ts`, `vocab.test.ts`.

## Integration

| ID | Integration | Direction | State |
|---|---|---|---|
| I01 | data.gov.uk CKAN API | Inbound read | Live |
| I02 | xGov MEM | Vendored model | Live |
| I03 | Public Sector Data Quality Commons MCP | Federation | Listed |
| I04 | AI capability governance toolkit | Review model H0 to H5 | Referenced |
