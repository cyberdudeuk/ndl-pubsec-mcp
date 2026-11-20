# NDL PubSec MCP: a discoverability server for UK public sector data

An open-source [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server. It lets any MCP-capable AI assistant find UK public sector data and check that data's metadata against the UK Cross-Government Metadata Exchange Model (xGov MEM).

> **Status: independent prototype, version 0.4.0 (20 November 2026).** It is not a government service, is not endorsed by any government department, and does not set or represent government policy. It is a prototype to explore data discoverability across the public sector, and it has not been through a service assessment.
>
> Build standard: public-sector profile, UK central government subject matter, independent prototype, **grade G3** (shared code others may rely on; no personal data). See [ADR 0006](docs/adr/0006-independent-prototype.md).
>
> Website: [cyberdudeuk.github.io/ndl-pubsec-mcp](https://cyberdudeuk.github.io/ndl-pubsec-mcp/), with an in-browser metadata checker.

## In plain English

**The name.** NDL stands for the **National Data Library**, the UK government's programme to make public sector data easier to find and use; since early 2026 the data.gov.uk website has been turning into it. PubSec means **public sector**. MCP stands for **Model Context Protocol**, an open way for AI assistants such as Claude or ChatGPT to use outside tools.

**What it is.** A small piece of software that an AI assistant can plug in. Once plugged in, you can ask the assistant ordinary questions, such as "what data does government publish about road traffic?", "which open standards must a council website meet?" or "what data moves between organisations when someone dies?", and it answers from public sources, saying where each answer came from.

**What it is not.** It is not a government service and does not speak for government. It only reads public information: it never changes data, never logs in anywhere, never calls the APIs it lists and never takes part in the data exchanges it describes.

**Why it was started.** People who need government data, and the AI assistants they increasingly use, cannot easily tell what data exists, who publishes it, or whether its description is good enough to rely on. This project tests, with working software rather than slides, what a machine-friendly front door to the National Data Library would need.

## What it does

| Tool | What it does | Data source |
|---|---|---|
| `catalogue_search` | Searches the data.gov.uk catalogue and returns titles, publishers, licences, formats and links | data.gov.uk API |
| `dataset_describe` | Describes one dataset and drafts an xGov MEM record from it, showing exactly what the record still lacks | data.gov.uk API and xGov MEM |
| `metadata_validate` | Checks any metadata record against xGov MEM and lists errors and warnings with their paths | xGov MEM (vendored) |
| `standard_explain` | Explains the open standards recommended or required across government and the wider public sector (data, APIs, identifiers, cyber security, digital services, identity, health, procurement), with how firmly each applies and a provenance label; can list one domain | Register in `src/data/standards.json` |
| `term_lookup` | Looks up business terms and reports, for each, who drafted it (person or AI), the review level it passed (H0 to H5) and whether that makes it certified | The vocabulary named in `NDL_MCP_VOCAB_PATH`, else this repository's own glossary |
| `domain_list` | Lists the other MCP servers in the same estate, starting with the Public Sector Data Quality Commons, with their tools and safety statements | `src/data/federation.json` |
| `api_search` | Finds UK public sector APIs by name, provider or description, with endpoint and documentation links and the source of each entry. Lists APIs; never calls them | The UK public sector API catalogue at a pinned commit (`src/generated/api-catalogue.json`), plus APIs added by name after checking them (`src/data/api-sources-extra.json`) |
| `server_search` | Finds MCP servers to use alongside this one: the estate's servers and public candidates awaiting review, each with its status and when it was checked. Never calls them | `src/data/federation.json`, `src/data/servers.json` |
| `exchange_search` | Finds data exchanges between public sector organisations by journey (for example registering a death or setting up a company), organisation or identifier: who shares what, how, the identifiers and standards involved, the legal basis and sources. Includes counts from the Digital Economy Act register. Never takes part in any exchange | `src/data/exchanges.json` |

A term counts as certified only when its register marks it endorsed after review at H2 (peer check) or above, using the review model in the [AI capability governance toolkit](https://github.com/cyberdudeuk/ai-capability-governance). Anything not recorded is reported as unknown. The bundled glossary was drafted with AI assistance and has not been reviewed, so nothing in it is certified ([ADR 0005](docs/adr/0005-term-layer-and-federation.md)).

All tools are read-only. No personal data is read or returned.

Three **MCP prompts** (`journey-exchanges`, `standards-for-a-service`, `check-a-catalogue-record`) give assistants ready-made tasks that chain these tools. They are text that asks; they do not act.

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
| `NDL_MCP_VOCAB_PATH` | (bundled glossary) | A vocabulary JSON file in the R2 register shape (`terms[]` with `term_id`, `preferred_label`, `definition`, and optionally `status`, `drafted_by`, `review_level`, `semantic_bindings`). Read once at start; never copied into the repository. |

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

A **live smoke test** against the real data.gov.uk API runs weekly and on demand (`npm run live`).

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

Code: [MIT Licence](LICENCE). Documentation, the website and its generated content: [Creative Commons Attribution 4.0 International](LICENCE-CC-BY-4.0) (CC BY 4.0). © 2026 Emanuel Silva. See [ADR 0007](docs/adr/0007-licence-cc-by.md).

Third-party material keeps its own licence. The compiled API catalogue in `src/generated/api-catalogue.json` is © Crown copyright under the Open Government Licence v3.0, from [co-cddo/api-catalogue](https://github.com/co-cddo/api-catalogue). The vendored xGov MEM files in `vendor/xgov-mem/` are © Crown copyright under the [Open Government Licence v3.0](vendor/xgov-mem/LICENCE-OGL), and catalogue records, standards and their licences are described as their publishers state them.

The exchange counts in `src/data/exchanges.json` come from the Digital Economy Act register of information sharing agreements, published by the Cabinet Office under the Open Government Licence v3.0; contact details on that register were not copied.
