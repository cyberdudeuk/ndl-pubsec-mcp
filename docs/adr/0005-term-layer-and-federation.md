# ADR 0005: a term layer with reported certification, and an estate register of MCP servers

- Status: accepted
- Date: 11 November 2026
- Decider: repository owner

## Context

- AI agents increasingly answer questions from business definitions served over MCP. NVIDIA Auto Ontology, Databricks Genie Ontology, Snowflake semantic views, Fabric IQ and others all do this. In most of them, certification is a yes/no flag with no record of who reviewed a definition or how.
- The owner's estate already holds a governed vocabulary (R2, in MEASR) and a graded human-review model (H0 to H5, in the AI capability governance toolkit).
- The estate also has a second MCP server (`dqkit`, in dq-commons). It and this server did not know about each other.

## Decision

1. **Add `term_lookup`.** It reads a vocabulary in the R2 register shape and reports each term's certification state.
    - A term is certified only when the register marks it endorsed after review at H2 or above.
    - Anything unrecorded is reported as unknown, never inferred.
2. **The vocabulary file is configured, not vendored.** R2 is official-sensitive in the govukOS register, so it is never copied into this public repository.
3. **The bundled default is this repository's own glossary.** It is generated from `docs/glossary.md` and honestly marked draft, AI-assisted and unreviewed.
4. **Add `domain_list` and a federation register.** It records each other server's manifest with `owner/repo@commit` and a check date. This server does not call other servers.

## Considered options

- **Adopt NVIDIA Auto Ontology.** Rejected for now. It is a full service with its own model endpoints and a single-database scope. Its certification is a boolean with no reviewer or level, which is the gap this decision fills.
- **Bundle R2.** Rejected: it is marked official-sensitive.
- **Text-to-SQL.** Out of scope. It would run queries against data, which goes beyond the current DPIA and ATRS screening (open item O-09).

## Consequences

- Agents can tell a certified definition from a draft and say why.
- The bindings field is reported as it stands. R2 binds 0 of its 127 terms today, so no agent can ground SQL in it yet.
- Manifests in the estate are checked against their servers (C-13), so the next drift is caught.
