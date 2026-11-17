# Secrets scan audit

Scanned on 17 November 2026 with detect-secrets 1.5.0 over every tracked file (excluding `node_modules`,
`vendor` and lock files). The results are recorded in [`.secrets.baseline`](../../.secrets.baseline).

- Candidates found: 2
- Audited as real secrets: 0

Each candidate was read in context and judged not to be a secret:

Content hashes in `docs/conformance-result.json` and `src/generated/mem-rules.json`.

New commits are checked by the detect-secrets pre-commit hook against this baseline. If the hook flags a
new string, read it, and either remove it or audit it into the baseline with `detect-secrets audit .secrets.baseline`.
Never audit a real credential as a false positive: remove it and rotate it.
