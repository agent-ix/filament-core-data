---
id: SR-16459
title: "IR-1055 PR #316 spec-review-base review"
type: SpecReview
analysis: base
scope: "agent-ix/filament-core-data; PR #316; spec/functional/FR-097-normalize-validate-and-write-the-lifted-document.md; crates/extraction-frontend; src/compiler/ir/normalize.mjs"
review_set: subset
---

## Summary

Independent review of PR #316 at 3889ecc70ce06bac264cb5f1c3af83cbf65f4f12 against FCD FR-097/FR-050 and QSpec 2b991805. Ticket: IR-1055.

## Verdict

**FAIL** — Findings require same-PR repair or the recorded IR-1056 follow-up.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | high | AC-5 changes the oracle to an overridden normalization set, while FR-050 still declares fields identity-keyed and fingerprintIr digests that normalization. The two requirements now contradict each other and authored field order is erased from fingerprints; update FR-050 and the default normalizer in this PR. | spec/functional/FR-097-normalize-validate-and-write-the-lifted-document.md:127 |
| FND-002 | medium | AC-4 states fields and supertypes retain authored order but the QSpec-aligned inherited-order condition needs an end-to-end two-supertype control; no criterion or test currently asserts that complete path. | spec/functional/FR-097-normalize-validate-and-write-the-lifted-document.md:126 |

## Coverage

Examined: FR-097-AC-4, FR-097-AC-5, FR-050-AC-7; QSpec FR-154-AC-32 and FR-432 against exact 2b991805; Rust canonical writer, JavaScript normalizer/fingerprint, TC-1276, TC-1277, TC-1799. Plan completion: not assessed. Matrix: FR-097 AC-4/5 tagged; FR-050-AC-7 untagged. No build or aggregate gate was run because host I/O wait was high.

## Dispositions

| FND | outcome | reason |
| --- | --- | --- |
| FND-001 | fixed | FR-050 Normalization removes fields from identity-keyed sets; FR-050-AC-7 now requires field and supertype permutations to change fingerprintIr; test/compiler-core.test.ts asserts both. |
| FND-002 | fixed | TC-1276 has a new end-to-end two-supertype lift/write/readback control over a source fixture, with exact authored supertype and field order assertions. |
