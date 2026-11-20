# ADR 0007: license this repository's own content under CC BY 4.0, © Emanuel Silva

- Status: accepted
- Date: 20 November 2026
- Decider: repository owner
- Supersedes: the "keep the legal facts as they are" bullet of [ADR 0006](0006-independent-prototype.md), for copyright and the content licence only

## Context

ADR 0006 presented the repository as an independent prototype but kept "© Crown copyright" and documentation under the Open Government Licence (OGL) v3.0. The owner's rule is that the text and content of their repositories are not OGL unless they specifically concern work-related or GOV.UK content.

Crown copyright and OGL go together. The National Archives' guidance is that OGL is the default licence for Crown copyright, that the Keeper of Public Records decides whether Crown copyright material can be offered on other terms, and that Crown bodies need a Delegation of Authority from the Keeper to use another licence. So the content licence could not change while the copyright notice said "Crown copyright".

## Options

1. **Keep Crown copyright and OGL.** Correct if the work was made in the course of the owner's employment; contrary to the owner's rule for non-work content.
2. **© Emanuel Silva; content under CC BY 4.0; code under MIT.** Correct if the work is the owner's own. CC BY 4.0 is the international licence OGL was designed to be compatible with, so re-users keep the same freedoms.
3. **© Emanuel Silva; everything under MIT.** Simplest, but MIT is written for software and fits prose and data less well.

## Decision

Option 2. The owner confirmed (20 November 2026) that copyright in this repository's own content is theirs: it is independent work, not made in the course of their employment. Code stays under MIT, with the copyright line changed to the owner. Documentation, the website and its generated content (user guide, toolkit) are under CC BY 4.0. The citation file lists both licences.

Third-party material keeps its own licence and is labelled as such: the vendored xGov MEM files are © Crown copyright under OGL v3.0 (their OGL text moves to `vendor/xgov-mem/LICENCE-OGL`), and the licences of standards and catalogue records are reported as their publishers state them.

## Consequences

- Check C-29 keeps the repository's own copyright and content licence statements consistent, and allows "Crown copyright" only beside the xGov MEM material it belongs to.
- The attestation of ownership is the owner's ("confirmed by owner"). If anything in the repository was in fact made in the course of employment, that part is Crown copyright whatever this ADR says, and would need to be identified and relicensed under OGL.
- A future move to a government GitHub organisation (open item O-06) would need its own decision about copyright and licence.
