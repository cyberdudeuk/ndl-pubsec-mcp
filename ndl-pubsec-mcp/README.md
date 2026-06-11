# NDL PubSec MCP Platform

> An AI Engineering experiment in citizen-facing public service transformation — building the Model Context Protocol (MCP) layer for the UK's National Data Library.

[![Status: Discovery / Alpha](https://img.shields.io/badge/status-discovery%2Falpha-yellow)](https://www.gov.uk/service-manual/agile-delivery)
[![Licence: MIT (code) / OGL v3 (docs)](https://img.shields.io/badge/licence-MIT%20%2F%20OGL%20v3-green)](LICENCE)
[![GDS Service Standard](https://img.shields.io/badge/standard-GDS%20Service%20Standard-blue)](https://www.gov.uk/service-manual/service-standard)

---

> **Personal portfolio project and experiment.** This repository is a personal learning project and portfolio contribution by a DSIT officer. It is not an official government product, does not represent official DSIT or GDS policy, and has not passed a GDS service assessment. It is published in the spirit of [coding in the open](https://technology.blog.gov.uk/2016/05/31/how-we-use-git-at-the-government-digital-service/) to invite collaboration, scrutiny, and contribution. If this programme advances to official programme status, it will move to an appropriate government GitHub organisation.

---

## What this does

The UK's National Data Library (NDL) is connecting government data across six kickstarter domains — energy bill support, long-term health conditions, adult social care, AI-powered legal guidance, weather and climate resilience, and early years interventions.

This repository builds the **citizen-facing intelligence layer**: an MCP server that enables AI assistants to help citizens — particularly vulnerable and underrepresented groups — navigate the support they are entitled to, understand their rights, and access services that the current fragmented system makes nearly impossible to find.

The tools are built on UK government public APIs (GOV.UK Content API, Environment Agency Flood Risk API, CQC Provider API, legislation.gov.uk API), synthesise content to Flesch-Kincaid Grade 6 or below, and are designed to meet WCAG 2.2 AA accessibility standards from the first build.

## Status

| Stage | Status |
|-------|--------|
| Discovery / scoping | ✅ Complete |
| Cross-cutting analysis | ✅ Complete |
| User research strategy | ✅ Complete |
| Theory of change | ✅ Complete |
| Foundation modules | 🔨 Sprint 1 — building |
| Energy domain (first build) | 🔨 Sprint 1 — building |
| LTC + Legal first builds | 📋 Sprint 2-3 — planned |
| Alpha testing | 📋 Planned |

## Repository structure

```
ndl-pubsec-mcp/
├── docs/
│   ├── programme/          # Theory of change, cross-cutting analysis, UR bundle
│   ├── domains/            # Six domain scope documents (personas, TypeScript interfaces, data architecture)
│   └── portfolio/          # Public portfolio, showcase, document library
├── src/
│   ├── foundation/         # Shared platform modules (built in Sprint 1)
│   └── tools/              # Domain-specific MCP tools (built Sprint 1 onwards)
├── LICENCE                 # MIT licence for code
├── LICENCE-OGL             # Open Government Licence v3 for documentation
├── CONTRIBUTING.md         # How to contribute
├── SECURITY.md             # Security disclosure policy
└── .github/                # Issue templates, PR template, CI workflows
```

## The six domains

| Domain | Priority | Status | First tool |
|--------|----------|--------|------------|
| Energy bill support | 3 (first build) | 🔨 Building | `energy_explain_scheme` |
| Long-term conditions | 2 | 📋 Scoped | `ltc_explain_benefit` |
| AI-powered legal guidance | 1 | 📋 Scoped | `legal_explain_rights` |
| Adult social care | 4 | 📋 Scoped | `care_explain_rights` |
| Early years interventions | 5 | 📋 Scoped | `eyfs_check_development` |
| Weather & climate resilience | 6 | 📋 Scoped | `climate_check_flood_risk` |

## Shared platform foundation

Ten shared modules serve all six domains — built once, reused across every domain tool:

1. UK Services API Client (GOV.UK Content + Search API wrapper)
2. Plain English Synthesis Engine (FK Grade ≤6 quality gate)
3. Postcode Intelligence Layer (postcodes.io, devolved nation detection)
4. DEIA Compliance Layer (WCAG 2.2 AA, reading level enforcement)
5. UK Benefits Reference Knowledge Base (UC, PIP, ESA, PC, CA, DLA...)
6. Eligibility Assessment Engine (benefits crosswalk, 5 domains)
7. Local Services Finder (web search + Citizens Advice network)
8. Advocacy Router (always-available human route)
9. Deadline & Time Limit Manager (MR 30 days, ET 3 months, EHCP 20 weeks...)
10. Multilingual Translation Layer (Welsh statutory, Urdu, Somali, Polish, Bengali, Punjabi, Arabic)

## Technical stack

- **Runtime**: Node.js / TypeScript
- **MCP SDK**: `@modelcontextprotocol/sdk`
- **Schema validation**: Zod
- **APIs**: GOV.UK Content API, GOV.UK Search API, EA Flood Risk API, CQC Provider API, legislation.gov.uk, postcodes.io
- **Testing**: MCP Inspector (`npx @modelcontextprotocol/inspector`)
- **Development**: Claude Code (AI-assisted vibe-coding)

## Getting started

```bash
# Clone the repository
git clone https://github.com/[username]/ndl-pubsec-mcp.git
cd ndl-pubsec-mcp

# Install dependencies
npm install

# Test with MCP Inspector (once first tool is built)
npx @modelcontextprotocol/inspector
```

## Running the first tool

> Available in Sprint 1. Watch this space.

```typescript
// energy_explain_scheme will be the first working tool
// GOV.UK Content API → LLM synthesis → FK Grade ≤6 structured output
```

## Programme documentation

All programme documentation is in the `docs/` folder and [published as a portfolio](https://[username].github.io/ndl-pubsec-mcp/).

| Document | Description |
|----------|-------------|
| [Theory of Change](docs/programme/theory_of_change.html) | Causal chain, evidence base, assumptions, risks, measurement framework |
| [Cross-Cutting Analysis](docs/programme/cross_cutting_analysis.html) | Shared foundation, priority ranking, DSIT frontier opportunities, ARI alignment |
| [User Research Bundle](docs/programme/user_research_bundle.html) | UR strategy, participant profiles, 15 blindspot analyses, evidence base by domain |
| [Energy scope](docs/domains/energy_support_mcp_scope.html) | Personas, 6 tools with TypeScript interfaces, data architecture, build order |
| [LTC scope](docs/domains/ltc_mcp_scope.html) | As above for long-term conditions |
| [Social care scope](docs/domains/social_care_mcp_scope.html) | As above for adult social care |
| [Legal scope](docs/domains/legal_guidance_mcp_scope.html) | As above for AI-powered legal guidance |
| [Climate scope](docs/domains/climate_resilience_mcp_scope.html) | As above for climate resilience |
| [Early years scope](docs/domains/early_years_mcp_scope.html) | As above for early years interventions |

## DEIA commitments

All tools are designed to:

- Work at Flesch-Kincaid Grade 6 or below in 'simple' mode
- Meet WCAG 2.2 AA accessibility standards
- Support Welsh (statutory), Urdu, Somali, Polish, Bengali, Punjabi and Arabic
- Require no login for initial guidance
- Always provide a route to a human
- Be co-designed with communities, not just about them

## Contributing

We welcome contributions from domain experts, user researchers, TypeScript developers, community co-designers, policy colleagues, and academic collaborators. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidance on how to get involved.

If you have lived experience of any of the six domains and want to contribute to co-design, please [get in touch](#contact).

## Security

Please do not raise security issues in public GitHub issues. See [SECURITY.md](SECURITY.md) for the responsible disclosure process.

## Alignment to government standards and programmes

This project is designed to align with:

- [GDS Service Standard](https://www.gov.uk/service-manual/service-standard) (14 points)
- [Blueprint for Modern Digital Government](https://www.gov.uk/government/publications/blueprint-for-modern-digital-government) (January 2025)
- [AI Opportunities Action Plan](https://www.gov.uk/government/publications/ai-opportunities-action-plan) (January 2025)
- [National Data Library](https://www.gov.uk/government/news/national-data-library) kickstarter programme
- [Government open source guidance](https://www.gov.uk/government/publications/open-source-guidance)
- [GDS Way](https://gds-way.digital.cabinet-office.gov.uk/) engineering standards

## Contact

- **Security reports**: [ADD SECURITY EMAIL]@[domain].gov.uk
- **Programme enquiries**: via LinkedIn or DSIT internal channels
- **GitHub**: raise an issue or open a discussion

## Licence

The code in this repository is released under the [MIT Licence](LICENCE).

The documentation (all files in the `docs/` folder and this README) is released under the [Open Government Licence v3.0](LICENCE-OGL), except where otherwise stated.

© Crown copyright 2026 — work produced in an official capacity as a DSIT officer.
