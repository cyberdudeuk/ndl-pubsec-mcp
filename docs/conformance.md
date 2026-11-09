# Conformance with the xGov MEM test corpus

Run on 8 November 2026 against `co-cddo/ukgov-metadata-exchange-model` at commit `d6d9a24` (1 June 2026). CI runs it again on every change.

**Result: 32 of 32 cases agree.** All 12 valid examples pass, and all 20 invalid examples fail.

| Class | Valid examples passed | Invalid examples rejected |
|---|---|---|
| ContactPoint | 1 of 1 | 2 of 2 |
| DataService | 5 of 5 | 9 of 9 |
| Dataset | 2 of 2 | 5 of 5 |
| Distribution | 4 of 4 | 4 of 4 |

## What this does and does not show

- It shows the validator reaches the same pass or fail verdict as the upstream LinkML tests on every example.
- It does **not** show that the validator always fails for the reason the example was written for. Several upstream invalid DataService examples break more than one rule (for example, a plain-text contact point and a bare `DataService` type), so they would fail even if the targeted rule were missing. The unit tests in `test/mem.test.ts` test each rule on its own to close that gap.
- The corpus is small (32 records). The real-record sample below covers that gap.

The upstream examples are read from a checkout and never copied into this repository, because they contain real contact details.

## Real catalogue records (open item O-05)

On 9 November 2026, 50 entries were taken from data.gov.uk (`package_search`, sorted by name, 10 each from offsets 0, 1,000, 5,000, 12,000 and 25,000). Each was run through the `dataset_describe` crosswalk, then through this validator and `linkml-validate` 1.12.1. `tools/live_parity.py` does this; the weekly live workflow repeats it on fresh records, and the result is recorded in `docs/live-parity-result.json`.

**50 of 50 real records agree**: the same valid or invalid verdict and the same set of missing required attributes, with no other errors on either side.

No record is a valid xGov MEM Dataset from the catalogue entry alone. These required attributes were missing:

| Attribute | Records missing it |
|---|---|
| accessRights | 50 of 50 |
| contactPoint | 50 of 50 |
| securityClassification | 50 of 50 |
| version | 50 of 50 |
| updateFrequency | 47 of 50 |
| creator | 36 of 50 |
| publisher | 36 of 50 |
| licence | 27 of 50 |

What this means for users:

- Access rights, contact point, security classification and version are never in these catalogue entries, so a publisher always has to supply them. The crosswalk leaves them out instead of guessing.
- Most update frequencies are `notPlanned`, which has no xGov MEM equivalent, so they are left out with a note.
- Publisher and creator are left out when the publisher is not in the xGov MEM organisation list.

Limits: 50 records from five points in a name-sorted list is not a random sample, and the descriptions are not checked for quality. The finding that matters, that several required attributes are never held in the catalogue, did not vary across the 11 publishers in the sample.
