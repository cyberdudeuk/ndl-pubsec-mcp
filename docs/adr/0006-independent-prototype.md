# ADR 0006: present this repository as an independent prototype

- Status: accepted
- Date: 20 November 2026
- Decider: repository owner
- Supersedes: the "official work" wording of [ADR 0002](0002-official-and-personal-repositories.md). The split between this repository and the private one stands.
- Partly superseded by: [ADR 0007](0007-licence-cc-by.md), for copyright and the content licence

## Context

The published page and the README described this repository as the official work of a named team in a government directorate. The page also used GOV.UK Frontend styles, a phase banner, and structured data naming a government organisation as publisher. Together these made the prototype look like an official government project or service. It is not one: no department has endorsed it, it has had no service assessment, and it sets no policy.

## Decision

- Present the repository, the README and the page as an **independent prototype**, with one plain statement wherever it is published: it is not a government service, is not endorsed by any government department, and does not set or represent government policy.
- Name no team, directorate or department as owner, publisher or contact. Contact stays the repository's issue form, and security reports stay with private vulnerability reporting.
- Give the page its own visual identity. It no longer uses GOV.UK Frontend, its styles or its patterns, so it cannot be mistaken for a GOV.UK service.
- Keep the legal facts as they are: the copyright notice in `LICENCE` (Crown copyright), code under MIT, and documentation under OGL v3.0. Saying who holds copyright does not claim endorsement.

## Consequences

- Repository checks C-16 and C-17 keep the team name, "official work" claims, GOV.UK Frontend and a government publisher off published material, and require the independent-prototype statement on the page and in the README (defect D-024).
- A future move to a government GitHub organisation (open item O-06) would need its own decision. Moving does not by itself make the work official or endorsed.
