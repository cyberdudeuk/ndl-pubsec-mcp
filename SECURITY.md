# Security

## Report a vulnerability privately

Do not report security problems in public issues.

Use GitHub's private vulnerability reporting: [report a vulnerability](https://github.com/cyberdudeuk/ndl-pubsec-mcp/security/advisories/new). Only the repository owner can see the report.

Include what you found, how to reproduce it and the likely impact. We aim to acknowledge reports within 5 working days.

## What the server does, and does not do

- All four tools are read-only. The server never writes to any catalogue or system.
- It calls one outside service: the data.gov.uk catalogue API (configurable with `NDL_MCP_CKAN_BASE`, which must use https).
- It handles no personal data. Maintainer and author fields in catalogue entries are never read or returned.
- It needs no credentials or secrets.

## In scope

- The server code in `src/` and the tools in `tools/`
- Injection through tool inputs, and anything that makes a tool return misleading results
- The documentation site in `docs/`

## Out of scope

- data.gov.uk and other government services. Report problems with them to their owners.
- GitHub's own infrastructure.
