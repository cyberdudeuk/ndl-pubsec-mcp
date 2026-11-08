# ADR 0004: the xGov MEM model is the source of truth, and nothing is guessed

- Status: accepted
- Date: 8 November 2026

## Context

A hand-written validator drifts from the standard it checks. A crosswalk that fills gaps with plausible defaults would hide the very gaps publishers need to see.

## Decision

1. The validator never encodes xGov MEM rules by hand. `tools/compile_mem.py` compiles the vendored, byte-identical upstream LinkML files into `src/generated/mem-rules.json`. CI fails if the JSON drifts from the model, and the validator must agree with the upstream test corpus.
2. To move to a new xGov MEM version: update `vendor/xgov-mem/` and `source.json`, recompile, then run the tests and conformance. This is a reviewed change.
3. The data.gov.uk crosswalk fills only fields the catalogue entry holds. Everything else is reported as missing, with a note saying why. For example, security classification is never assumed.

## A conflict, stated

xGov MEM requires an email address in every contact point. The owner's build standard says artefacts never disclose an email address, and a contact form should be used instead. These apply to different things: the standard governs metadata records that publishers send, while the build rule governs this repository and its pages. The validator applies the standard faithfully. This repository contains no addresses: test fixtures use reserved example domains, and the upstream examples are never copied in. Whether xGov MEM should allow a contact form URL is a question for the model's maintainers (open item O-08).
