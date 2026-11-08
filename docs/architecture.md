# Architecture: SAD, HLD and LLD

Version 0.2, 8 November 2026. Review by 8 February 2027.

## Solution architecture (SAD)

```
 MCP client (AI assistant)
        │  stdio, JSON-RPC (Model Context Protocol)
        ▼
 ┌──────────────────────────── ndl-pubsec-mcp ────────────────────────────┐
 │ server.ts   4 tools + 2 resources, Zod input schemas, read-only hints   │
 │   ├─ lib/ckan.ts   data.gov.uk client, summariser, xGov MEM crosswalk   │
 │   ├─ lib/mem.ts    xGov MEM validator (interprets generated rules)       │
 │   └─ data/standards.json   open standards register with provenance      │
 └────────────────────────────────────────────────────────────────────────┘
        │ https GET (package_search, package_show)        ▲ build time only
        ▼                                                 │
 data.gov.uk catalogue API                 vendor/xgov-mem/*.yaml (upstream, pinned)
                                           → tools/compile_mem.py → src/generated/mem-rules.json
```

- **Hosting:** none. Users run it locally, or in their own environment, as an MCP server process.
- **Trust boundary:** tool inputs come from an AI model and are untrusted. Every input is schema-checked with Zod before use, and catalogue responses are treated as untrusted data.
- **Dependencies:** `@modelcontextprotocol/sdk` 1.32.2 and `zod` 4.6.7 at run time, pinned to exact versions. CI fails on any known vulnerability (`npm audit`).

## High-level design (HLD)

| Component | Responsibility | Key decisions |
|---|---|---|
| Server | Registers the tools and resources; turns results into text plus structured content; turns catalogue failures into tool errors with hints | ADR 0003 |
| Catalogue client | Builds the CKAN action API calls; enforces https and a 15-second timeout; maps failures to typed errors; never reads maintainer or author fields | Privacy by design |
| Crosswalk | Drafts an xGov MEM Dataset record from a catalogue entry. It fills only fields the entry holds: licence URL, the publisher's DCAT dates where harvested, version, and update frequency where an exact GEMINI-to-Dublin Core mapping exists. It lists the rest as missing | Never guess (ADR 0004). Built from live record shapes (D-017, D-018) |
| Validator | Interprets the compiled rule set: required, recommended, unknown attributes, ranges, enums, patterns, dates, type designators, nested classes, single and multi-valued | The model is the source of truth (ADR 0004) |
| Rule compiler | Turns the LinkML model into JSON. CI fails if the committed JSON drifts from the vendored model | Python, because the upstream YAML is not strictly valid (D-001) |
| Standards register | Static JSON with provenance labels and check dates | Re-verify on a cadence (O-04) |

## Low-level design (LLD)

**Validation algorithm** (`validateObject`):
1. Any key not defined for the class is an error, `unknown-attribute` (this catches misspellings such as `license`).
2. For each slot:
   - a missing or empty value is an error if the slot is required, or a warning if recommended
   - a list given for a single-valued slot is an error
   - a single value given for a multi-valued slot is a warning
3. Each value is checked against the slot's ranges (any one of them may match):
   - class ranges recurse into the nested object
   - enums must match a permitted value
   - `date` must be a real calendar date in `YYYY-MM-DD` form
   - `uri` must be absolute
   - strings must match the slot's pattern, if it has one
4. A type-designator slot (`type`) must equal the class URI, for example `dcat:Dataset`.
5. Each finding gives a severity, a path (for example `contactPoint.email`), a rule id and a plain-English message.

**Known simplifications** (open item O-02):
- `uriorcurie` is not syntax-checked, matching the upstream corpus, which accepts bare identifiers.
- A single value given for a multi-valued slot is accepted with a warning. The upstream LinkML behaviour for this case is not confirmed.

**Error handling:** catalogue errors become `isError` tool results with a message and, for network failures, a hint. Unexpected exceptions are left to the SDK, which reports them as tool errors.

**Live API facts (checked 8 November 2026):**
- `www.data.gov.uk/api/action` redirects to `ckan.publishing.service.gov.uk/api/action`. `fetch` follows the redirect.
- Licence fields may be `null`, empty, or given only as free text in `extras`.
- Harvested records carry `frequency-of-update`, `dcat_issued` and `dcat_modified` in `extras`.

**Output limits:** descriptions are cut at 4,000 characters, and at most 50 distributions are listed.
