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
- The corpus is small (32 records). Agreement on real catalogue records is not yet measured (open item O-05).

The upstream examples are read from a checkout and never copied into this repository, because they contain real contact details.
