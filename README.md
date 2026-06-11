# NDL PubSec MCP

> Citizen-facing AI tools for UK public services — built on the Model Context Protocol for the National Data Library.

[![CI](https://github.com/cyberdudeuk/ndl-pubsec-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/cyberdudeuk/ndl-pubsec-mcp/actions/workflows/ci.yml)
[![CodeQL](https://github.com/cyberdudeuk/ndl-pubsec-mcp/actions/workflows/codeql.yml/badge.svg)](https://github.com/cyberdudeuk/ndl-pubsec-mcp/actions/workflows/codeql.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](ndl-pubsec-mcp/LICENCE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![MCP SDK](https://img.shields.io/badge/MCP%20SDK-1.x-purple.svg)](https://modelcontextprotocol.io/)
[![Status: Discovery / Alpha](https://img.shields.io/badge/status-discovery%2Falpha-yellow)](https://www.gov.uk/service-manual/agile-delivery)
[![GDS Service Standard](https://img.shields.io/badge/standard-GDS%20Service%20Standard-blue)](https://www.gov.uk/service-manual/service-standard)

---

> **⚠️ Personal portfolio project.** This is a personal learning project and portfolio contribution by a DSIT officer. It is not an official government product, does not represent DSIT or GDS policy, and has not passed a GDS service assessment. Published in the spirit of [coding in the open](https://technology.blog.gov.uk/2016/05/31/how-we-use-git-at-the-government-digital-service/).

---

## The problem

Millions of UK citizens miss out on support they're entitled to because government services are fragmented across dozens of websites, agencies, and departments. A person struggling with energy bills may also qualify for benefits, social care, and legal protections — but discovering this requires navigating multiple systems, each with its own language, eligibility rules, and application process.

## What this does

This project builds an [MCP server](https://modelcontextprotocol.io/) that gives AI assistants the tools to help citizens — particularly vulnerable and underrepresented groups — find, understand, and access public services across six domains:

| Domain | First tool | Data sources |
|--------|-----------|--------------|
| 🔌 Energy bill support | `energy_explain_scheme` | GOV.UK Content API |
| 🏥 Long-term conditions | `ltc_explain_benefit` | GOV.UK, NHS API |
| ⚖️ Legal guidance | `legal_explain_rights` | legislation.gov.uk |
| 🏠 Adult social care | `care_explain_rights` | CQC Provider API |
| 🌍 Climate resilience | `climate_check_flood_risk` | EA Flood Risk API |
| 👶 Early years | `eyfs_check_development` | GOV.UK, Ofsted |

Every tool output is synthesised to **Flesch-Kincaid Grade 6 or below**, meets **WCAG 2.2 AA** accessibility standards, and always provides a route to a human.

## Quick start

```bash
git clone https://github.com/cyberdudeuk/ndl-pubsec-mcp.git
cd ndl-pubsec-mcp/ndl-pubsec-mcp

npm install
npm run build
npm run typecheck
npm run lint
npm test
