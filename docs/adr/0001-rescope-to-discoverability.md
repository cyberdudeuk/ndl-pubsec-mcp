# ADR 0001: re-scope from citizen advice to data discoverability

- Status: accepted
- Date: 8 November 2026
- Decider: repository owner

## Context

Version 0.1 (June 2026) set out 36 citizen-facing tools across six National Data Library kickstarter domains, covering energy support, benefits, legal rights, social care, flood risk and early years. No code was written in five months. A review found:

- **The work sat outside the owner's remit.** The owner's remit is data cataloguing and metadata management. The policy owners for benefits, justice and care advice are other departments.
- **The risk was high.** AI-generated advice to vulnerable people needs clinical, legal and safeguarding sign-off, a DPIA, an algorithmic transparency record and AI assurance before any alpha.
- **Some framing diverged from the official kickstarters.** The legal kickstarter is about making National Archives legal data AI-ready for small businesses, not citizen rights advice.
- **The intended NDL contacts have left,** and NDL ownership is currently unassigned.

## Options

1. **Keep the citizen scope.** High public value if delivered, but depends on owners and approvals outside the team's control, and nothing has shipped.
2. **Re-scope to data discoverability (chosen).** Read-only tools over the national catalogue and the xGov MEM standard, which the owner authored and the team supports.
3. **Archive.** Loses a working vehicle for evidence on discoverability.

## Decision

Option 2. Build a small, read-only MCP server for data discoverability and metadata quality. Citizen tools may plug in later if a policy owner sponsors them.

## Consequences

- The work can ship and be tested within the team's own remit, using only public, non-personal data.
- It gives working evidence for GDS discoverability work and for publishers preparing DAM returns.
- The citizen-domain research moves to the owner's personal experiment repository (ADR 0002).
- Being clearly read-only, open-data-only and advisory keeps the risk low.
