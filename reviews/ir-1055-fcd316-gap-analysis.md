---
id: SR-16458
title: "IR-1055 PR #316 gap-analysis review"
type: SpecReview
analysis: gap-analysis
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
| FND-001 | medium | TC-1276 proves only an in-memory synthetic list, while TC-1799 lifts a single-supertype fixture. No end-to-end two-supertype test backs IR-1055’s inherited binder-order scenario. | crates/extraction-frontend/tests/document.rs:408-435 |
| FND-002 | high | TC-1277 binds AC-5 but supplies a filtered IDENTITY_SETS override. The actual FR-050 normalizeIr default still reorders fields, so the tagged evidence does not exercise the named contract. | crates/extraction-frontend/tests/common/mod.rs:307-318 |

## Coverage

Examined: FR-097-AC-4, FR-097-AC-5, FR-050-AC-7; QSpec FR-154-AC-32 and FR-432 against exact 2b991805; Rust canonical writer, JavaScript normalizer/fingerprint, TC-1276, TC-1277, TC-1799. Plan completion: not assessed. Matrix: FR-097 AC-4/5 tagged; FR-050-AC-7 untagged. No build or aggregate gate was run because host I/O wait was high.

## Dispositions

| FND | outcome | reason |
| --- | --- | --- |
| FND-001 | fixed | tc_1276_a_lift_with_two_supertypes_writes_supertypes_and_fields_in_authored_order writes and reads a two-supertype source fixture and asserts authored order plus normalized fixed points. |
| FND-002 | fixed | common::normalize_ir calls m.normalizeIr(doc) with default IDENTITY_SETS, whose fields entry was removed; TC-1277 now exercises the real FR-050 default oracle. |
