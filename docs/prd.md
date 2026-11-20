# Product requirements: NDL PubSec MCP discoverability server

| | |
|---|---|
| Identifier | ndl-pubsec-mcp/prd |
| Version | 0.2 |
| Owner | Repository owner (independent prototype, see ADR 0006) |
| First published | 8 November 2026 |
| Last updated | 20 November 2026 |
| Review by | 8 February 2027 |

## The name

NDL stands for the **National Data Library**, the UK government's programme to make public sector data easier to find and use; since early 2026 data.gov.uk has been turning into it. PubSec means **public sector**. MCP is the **Model Context Protocol**, an open way for AI assistants to use outside tools.

## Problem

People who need government data, and the AI assistants they increasingly use, cannot easily find out what data exists, who publishes it, or whether its metadata is good enough to rely on. Catalogues hold metadata of uneven quality. The cross-government standard for exchanging it, xGov MEM, is endorsed but has no easy way to be checked in day-to-day work.

## Intent

Give any MCP-capable assistant a small, trustworthy set of read-only tools to:
- search the national catalogue
- see how far a dataset's metadata is from xGov MEM
- validate a metadata record against xGov MEM
- explain the open standards involved

The aim is to inform GDS work on data discoverability and the DAM (critical data assets) policy rollout with working evidence, not slides.

## Users and needs

| User | Need |
|---|---|
| Data publisher or catalogue manager in a department | Check my metadata against xGov MEM before I publish or return it, so that it is accepted first time |
| Data cataloguing and metadata community | See what fields are missing across catalogue entries, so that we can target support |
| Analyst or developer using an AI assistant | Find relevant government datasets and their licences, so that I can use the right data legally |
| Export finance or trade analyst (for example at UK Export Finance) | Know which HMRC and other published APIs could help check exporters and size markets, and which data needs a legal route, so that I can act now rather than wait for a new platform |
| Researcher, journalist, civil society or any organisation outside government | Understand what public data exists, how it moves between organisations and which rules apply, with sources I can cite |
| AI model or MCP developer | A ready-made, read-only way to reach UK government data resources, with safeguards, sources and provenance on every answer |
| Architects working on discoverability | Test what a machine interface over catalogues needs, so that the platform design is grounded in evidence |

These needs have been raised repeatedly in the forums the owner runs or takes part in. The UK Export Finance and HMRC need was raised in one of them, and the person who raised it followed up with the owner on 20 November 2026 asking for it (owner, stated). That makes the need observed and urgent: it cannot wait for future discoverability services. The needs have **not yet been tested in formal user research** (open item O-03).

## Scope

**In scope for 0.2:** the four tools in the [data dictionary](data-dictionary.md); data.gov.uk as the only catalogue; xGov MEM pinned at commit `d6d9a24`.

**Next, subject to sources being open:**
- `repo_find` over the GitHub Repos Asset Catalogue (public edition)
- `cda_lookup` over the open edition of the Critical Data Assets register
- departmental DCAT catalogues

**Out of scope:** citizen advice on benefits, legal rights or care; personal data; writing to any catalogue. The citizen-domain research lives in the owner's separate personal experiment (ADR 0002).

## Success measures

| Measure | Target for alpha | How measured |
|---|---|---|
| Validator agreement with the xGov MEM test corpus | 100% | `tools/conformance.py` in CI |
| Publishers who find the validation useful | At least 5 of 8 in testing say it saved them time | Usability sessions (not yet run) |
| Wrong "valid" verdicts found in real records | None open | Bug reports and the defect register |

## Theory of change (short)

If metadata can be checked against the standard where people already work (in their AI assistant), then more records will meet xGov MEM. Better records make data easier to find and reuse across government. **Assumptions that could break it:**
- people use MCP-capable assistants at work (licence availability varies)
- xGov MEM stays the endorsed model
- data.gov.uk keeps a public API

## Constraints

- Read-only, no personal data, no credentials.
- Plain English in every tool description and message.
- Built to the GDS Way and the Technology Code of Practice.
