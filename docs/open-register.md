# Open register

Items design cannot close on its own. Each names who must act.

| Id | Item | Who acts |
|---|---|---|
| O-01 | **Closed 8 November 2026.** Live API checked through a browser: `www.data.gov.uk/api/action` redirects to `ckan.publishing.service.gov.uk/api/action`; the envelope, `package_search`, `package_show` and 404 Not Found responses match the client. Findings fixed as D-017 and D-018. A weekly live smoke workflow now guards against API drift | Done |
| O-02 | Two validator simplifications: `uriorcurie` is not syntax-checked, and a single value for a multi-valued slot is a warning. Confirm both against `linkml-validate` | Developer |
| O-03 | User needs are assumed, not researched. Run 5 to 8 sessions with publishers and catalogue managers | User researcher with the Data Management Team |
| O-04 | Standards register entries labelled S or U need re-reading at the primary pages; the DSA catalogue page was last updated 25 October 2023 | Owner, every 3 months |
| O-05 | Agreement on real catalogue records is unmeasured. Sample 50 data.gov.uk entries and compare with LinkML | Developer |
| O-06 | Possible move to a government GitHub organisation (for example `gds-dtx`) alongside the co-cddo migration | Owner, with the organisation's admins |
| O-07 | A hosted streamable HTTP mode, if users need it (needs hosting, authentication and a security review) | Team decision |
| O-08 | Raise with the xGov MEM maintainers: allow a contact form URL as a contact point. Comment drafted for upstream issue #71 (contactPoint definition) | Owner (post) |
| O-09 | Confirm the DPIA and ATRS screening outcomes | Data protection lead |
| O-10 | Manual accessibility check of the documentation page with assistive technology | Accessibility specialist |
| O-11 | Repository settings, checked 8 November 2026: **done:** private vulnerability reporting (already on) and Pages switched to the GitHub Actions source. **Branch protection:** the existing ruleset requires the build-and-test and CodeQL checks. Required reviews are deliberately not added: with a single maintainer they would block every merge | Owner, if a second maintainer joins |
| O-12 | Report D-001 upstream: the issue is written and pre-filled on co-cddo/ukgov-metadata-exchange-model and needs the owner's click to post. Text kept in the private repository's drafts | Owner (post) |
| O-13 | Next tools: `repo_find` (GitHub Repos Asset Catalogue, public edition) and `cda_lookup` (open edition of the critical data assets register) | Owner, once open editions are confirmed |
| O-14 | The ruleset requires `Analyze (javascript-typescript)`, but CodeQL default setup only analyses Actions, because `main` has no TypeScript yet. This blocks pull request #6. **Owner action:** Settings, then Advanced Security, then CodeQL analysis, then Switch to advanced. The committed `codeql.yml` then produces the check. Automation was not allowed to switch a security control off, even briefly | Owner (settings) |
