# Contributing to NDL PubSec MCP

Thank you for your interest in contributing. This is a personal portfolio project and experiment — built in the open to invite collaboration, scrutiny, and co-design.

## How to contribute

We welcome contributions from many different backgrounds. You do not need to be a developer to contribute.

### Domain experts
If you work in welfare rights, housing law, social care, early years, energy advice, climate policy, or legal aid, your review of tool accuracy in your domain is invaluable. Please raise an issue describing the inaccuracy and the correct information with its source.

### Community co-designers
If you have lived experience of any of the six domains (energy poverty, benefit navigation, housing disrepair, social care, developmental concerns in children, flood risk), and are willing to share your perspective on how tools could work better, please get in touch via the email address in SECURITY.md.

### Technical contributors
If you want to build MCP tools in TypeScript alongside us:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/energy-check-eligibility`)
3. Follow the coding standards below
4. Write or update tests
5. Open a pull request with a clear description of the change

### Reporting issues
Use GitHub Issues. Please be specific about which domain, which tool, and what the expected vs actual behaviour is.

## Coding standards

This project follows [GDS Way](https://gds-way.digital.cabinet-office.gov.uk/) engineering standards:

- TypeScript with strict mode enabled
- Zod for all input schema validation
- Every tool output must cite its data source
- Plain English quality gate: FK Grade ≤6 for 'simple' mode outputs
- WCAG 2.2 AA compliance is a build requirement, not a nice-to-have
- No secrets, API keys, or credentials in code (use environment variables)
- Meaningful commit messages explaining why, not just what

## Branch protection

The `main` branch is protected. All changes require a pull request with at least one review.

## Licence

By contributing, you agree that your contributions will be licensed under the MIT Licence (for code) and the Open Government Licence v3 (for documentation).

## Code of conduct

This project uses the [alphagov Code of Conduct](https://github.com/alphagov/.github/blob/main/CODE_OF_CONDUCT.md). We are committed to providing a welcoming and inclusive environment.

## Questions

Raise a GitHub Discussion or Issue. Response time is best-effort — this is a one-person project at discovery stage.
