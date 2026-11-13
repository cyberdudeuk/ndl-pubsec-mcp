# Governance screening

Self-assessed by the build team on 8 November 2026. These screenings are not audits; they need confirming by the people named in each row of the open register.

## Data protection (UK GDPR and the Data Protection Act 2018)

- **Personal data processed:** none by design. Catalogue maintainer and author fields are never read (tested in `test/ckan.test.ts`). Validated records are processed in memory and not stored.
- **Possible incidental personal data:** a user could paste a metadata record containing a named contact into `metadata_validate`. It is processed locally on the user's machine, not sent anywhere, and not logged.
- **Screening outcome:** a full DPIA is not needed at this stage. Revisit if the server is hosted, logs requests or reads non-public catalogues. *To be confirmed by the team's data protection lead (O-09).*

## Algorithmic transparency (ATRS)

- The tools make no decisions about people, and there is no machine-learning model in the server. The validator applies published rules deterministically.
- **Screening outcome:** no ATRS record is needed for the server itself. An AI assistant that uses these tools is the deploying organisation's responsibility. *To be confirmed (O-09).*

## Accessibility

- The server has no user interface; text output is plain English.
- The documentation page uses GOV.UK Frontend styles, is checked automatically, and has an accessibility statement. Manual testing with assistive technology has not been done (O-10).

## Security

- Read-only. One outbound https host (configurable). No secrets.
- Inputs are validated with Zod. Identifiers and organisation filters are restricted to safe characters.
- CodeQL, Dependabot, dependency review on every pull request (fails on a moderate or worse known vulnerability) and a weekly OpenSSF Scorecard are enabled through workflows. The owner must still turn on private vulnerability reporting and branch protection in the repository settings (O-11).

## Records and classification

- Content is OFFICIAL at most and published openly. No OFFICIAL-SENSITIVE material may be added.
- The repository history is the record, and the changelog and ADRs explain changes.
