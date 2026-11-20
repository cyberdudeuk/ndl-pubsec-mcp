---
artefact:id: P07-TOC-001
artefact:version: 1.0.0
artefact:as-of: 2026-11-20
artefact:review-date: 2027-02-20
project: P07 NDL PubSec MCP server
grade: G3
profile: public sector > central > work (independent prototype, ADR 0006)
---

# Theory of change: NDL PubSec MCP server

> **How to read this.** Facts marked V were read from this repository on 20 November 2026. Assumptions, measures and risks are proposals written for this kit, not findings. U means unconfirmed. Where another document in this repository already covers a topic, this one links to it rather than repeating it.

## Problem
AI assistants cannot reliably find UK public sector data or tell whether its metadata meets the cross-government model.

## Long-term outcome
Assistants find public sector data and explain what its metadata lacks, with every answer traceable to its source.

## Chain

| Inputs | Activities | Outputs | Short-term outcomes | Medium-term outcomes |
|---|---|---|---|---|
| data.gov.uk CKAN API; xGov MEM (vendored); open standards register; glossary; the AI capability governance review model (H0 to H5) | Provide read-only MCP tools: catalogue_search, dataset_describe, metadata_validate, standard_explain, term_lookup, domain_list | An MCP server (TypeScript, stdio); a website with an in-browser metadata checker; conformance and parity reports | Users get correct search results and validation messages with paths | Metadata quality on data.gov.uk improves where publishers act on the drafts |

## Assumptions (proposed; each one testable)

| # | Assumption | How to test it | Evidence today |
|---|---|---|---|
| A1 | MCP will remain a widely supported protocol | Track client support quarterly | ADR 0003 |
| A2 | Drafted MEM records help publishers fix metadata | Trial with 3 publishers | Not tested |

## Measures (proposed)
- Conformance run passes (tools/conformance-run.mjs)
- Live smoke against data.gov.uk passes weekly (live-smoke workflow)
- LinkML parity holds (tools/linkml_parity.py)

No target is set before a baseline exists.

## What would prove this wrong
If assistants gain native catalogue access with MEM validation, retire the server and keep the validator as a library.

## Status
Independent prototype 0.4.0, 20 Nov 2026; not a government service (V: README). Live site: https://cyberdudeuk.github.io/ndl-pubsec-mcp/
