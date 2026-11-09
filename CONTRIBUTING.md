# Contributing

Thank you for helping. This project is built in the open, following the [GDS Way](https://gds-way.digital.cabinet-office.gov.uk/).

## Ways to help

- **Use it and tell us what went wrong or what is missing.** Use the [contact form](https://github.com/cyberdudeuk/ndl-pubsec-mcp/issues/new?template=contact.yml) or a bug report.
- **Metadata and catalogue specialists:** check the xGov MEM validation against your own records and tell us where it disagrees with the standard.
- **Developers:** see below.

Only collaborators the owner has invited can push or review. Unexpected collaborator requests are refused.

## Making a change

1. Fork, then branch from `main`.
2. Run `npm ci` and `pip install pyyaml`.
3. Make the change with tests. Every defect you fix needs a check that would have caught it, in the same pull request, with a row in `docs/defect-register.md`.
4. Run `npm run verify`. It must pass.
5. Open a pull request. The owner reviews every change.

## Rules

- TypeScript in strict mode, Zod for every tool input.
- Tools stay read-only, and say where every result came from.
- No personal data, email addresses, secrets, decks or films in the repository. `npm run check:repo` enforces this.
- Never edit `src/generated/mem-rules.json` or `docs/index.html` by hand. Run `npm run compile:mem` and `npm run site`.
- Plain English and sentence case in all text.

## Licence

By contributing, you agree that code is licensed under the MIT Licence and documentation under the Open Government Licence v3.0.
