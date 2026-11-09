# ADR 0002: one official repository, one personal experiment

- Status: accepted
- Date: 8 November 2026
- Decider: repository owner

## Context

Version 0.1 called itself a personal portfolio project and also claimed Crown copyright for "work produced in an official capacity". These cannot both be true. The companion private repository held the owner's personal development plan and backlog.

## Decision

- **`ndl-pubsec-mcp` (this repository) is official work.** It is coded in the open under Crown copyright, with code under MIT and documentation under OGL v3.0. Contact is through the repository's issue form, and security reports go through private vulnerability reporting. It is built to the public-sector profile at grade G3.
- **`ndl-pubsec-mcp-private` is the owner's personal experiment.** It holds the citizen-domain research, the personal development plan and the backlog. It carries no government brand and is marked as not an official service or policy. It stays private, and propriety and ethics are consulted before anything is published.

## Consequences

- The licence and attribution contradiction is resolved (defect D-007).
- When the owner's organisation is ready, this repository can move to a government GitHub organisation such as `gds-dtx`, alongside the co-cddo migration, without changing its content. Open item O-06.
- Material moves only one way, from personal to official, and only after review.
