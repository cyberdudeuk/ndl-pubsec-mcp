# Open register

Items design cannot close on its own. Each names who must act.

| Id | Item | Who acts |
|---|---|---|
| O-01 | Live data.gov.uk API not called from the build environment. The endpoint and response shape are as documented for CKAN (K), and tests use stubs. Run a live smoke test: `npm run inspector`, then `catalogue_search` with "school census" | Owner or any developer with internet access |
| O-02 | Two validator simplifications: `uriorcurie` is not syntax-checked, and a single value for a multi-valued slot is a warning. Confirm both against `linkml-validate` | Developer |
| O-03 | User needs are assumed, not researched. Run 5 to 8 sessions with publishers and catalogue managers | User researcher with the Data Management Team |
| O-04 | Standards register entries labelled S or U need re-reading at the primary pages; the DSA catalogue page was last updated 25 October 2023 | Owner, every 3 months |
| O-05 | Agreement on real catalogue records is unmeasured. Sample 50 data.gov.uk entries and compare with LinkML | Developer |
| O-06 | Possible move to a government GitHub organisation (for example `gds-dtx`) alongside the co-cddo migration | Owner, with the organisation's admins |
| O-07 | A hosted streamable HTTP mode, if users need it (needs hosting, authentication and a security review) | Team decision |
| O-08 | Raise with xGov MEM maintainers: allow a contact form URL as a contact point | Owner (as xGov MEM author) |
| O-09 | Confirm the DPIA and ATRS screening outcomes | Data protection lead |
| O-10 | Manual accessibility check of the documentation page with assistive technology | Accessibility specialist |
| O-11 | Repository settings: enable private vulnerability reporting, branch protection on `main` (review required), and Pages from Actions | Owner (settings cannot be changed from code) |
| O-12 | Report D-001 upstream: model.yaml line 348 is not strictly valid YAML | Owner |
| O-13 | Next tools: `repo_find` (GitHub Repos Asset Catalogue, public edition) and `cda_lookup` (open edition of the critical data assets register) | Owner, once open editions are confirmed |
