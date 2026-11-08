# NDL PubSec MCP: a discoverability server for UK public sector data

An open-source [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server. It lets any MCP-capable AI assistant find UK public sector data and check that data's metadata against the UK Cross-Government Metadata Exchange Model (xGov MEM).

> **Status: alpha, version 0.2.0 (8 November 2026).** This is official work of the Data Management Team, Government Data directorate, Government Digital Service (GDS). It is a prototype to inform cross-government work on data discoverability. It is not a live service, and it has not been through a service assessment.
>
> Build standard: public-sector profile, UK central government, official work, **grade G3** (shared code others may rely on; no personal data). See [ADR 0002](docs/adr/0002-official-and-personal-repositories.md).

## What it does

| Tool | What it does | Data source |
|---|---|---|
| `catalogue_search` | Searches the data.gov.uk catalogue and returns titles, publishers, licences, formats and links | data.gov.uk API |
| `dataset_describe` | Describes one dataset and drafts an xGov MEM record from it, showing exactly what the record still lacks | data.gov.uk API and xGov MEM |
| `metadata_validate` | Checks any metadata record against xGov MEM and lists errors and warnings with their paths | xGov MEM (vendored) |
| `standard_explain` | Explains open data standards used in government, each with a provenance label | Register in `src/data/standards.json` |

All tools are read-only. No personal data is read or returned.

The validator is compiled from the xGov MEM model itself, pinned to upstream commit `d6d9a24`. It agrees with all 32 cases in the model's own test corpus (see [conformance](docs/conformance.md)).

## Use it

You need Node.js 20 or later.

```bash
git clone https://github.com/cyberdudeuk/ndl-pubsec-mcp.git
cd ndl-pubsec-mcp
npm ci
pip install pyyaml        # only needed to recompile the xGov MEM rules
npm run build
```

Add it to an MCP client. For example, in a client that takes a JSON server list:

```json
{
  "mcpServers": {
    "ndl-pubsec-mcp": { "command": "node", "args": ["/path/to/ndl-pubsec-mcp/dist/index.js"] }
  }
}
```

Try it in the MCP Inspector with `npm run inspector`.

Settings:

| Variable | Default | Purpose |
|---|---|---|
| `NDL_MCP_CKAN_BASE` | `https://www.data.gov.uk/api/action` | The catalogue API base URL. Must use https. |

## Develop

`npm run verify` runs everything CI runs except the conformance step:
- the rule compile
- typecheck and lint
- the tests
- the build
- the repository checks (no email addresses, decks or films, broken workflows or placeholders; every tool tested and documented; every defect has a check)
- the site build

Two further steps also run in CI:
- **Conformance** needs a checkout of the xGov MEM repository: `python3 tools/conformance.py <path-to-checkout>`.
- **Mutation** (`npm run mutation`) breaks each safeguard in turn and fails if any break goes unnoticed by the tests.

## Documents

- [Product requirements (PRD)](docs/prd.md)
- [Architecture: SAD, HLD and LLD](docs/architecture.md)
- [Data dictionary](docs/data-dictionary.md) and [glossary](docs/glossary.md)
- [Knowledge graph (JSON-LD)](docs/knowledge-graph.jsonld)
- [Architecture decision records](docs/adr/)
- [Governance: data protection, algorithmic transparency and accessibility screening](docs/governance.md)
- [Conformance report](docs/conformance.md)
- [Defect register](docs/defect-register.md), [open register](docs/open-register.md) and [case against](docs/case-against.md) (internal working records)
- [Changelog](CHANGELOG.md)

## Contact

Use the [contact form](https://github.com/cyberdudeuk/ndl-pubsec-mcp/issues/new?template=contact.yml). For security problems, use [private vulnerability reporting](SECURITY.md).

## Licence

Code: [MIT Licence](LICENCE). Documentation: [Open Government Licence v3.0](LICENCE-OGL). The vendored xGov MEM files in `vendor/xgov-mem/` are © Crown copyright under the Open Government Licence v3.0.

© Crown copyright 2026.
