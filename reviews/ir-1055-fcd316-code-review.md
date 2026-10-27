---
id: SR-16457
title: "IR-1055 PR #316 code-review review"
type: SpecReview
analysis: code-review
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
| FND-001 | high | Test removes fields from IDENTITY_SETS while production normalizeIr still sorts them; emitted field order fails the declared FR-050 identity and fingerprint collisions hide a semantic change. Require the real FR-050 normalizer and fingerprint contract repaired in this PR. | crates/extraction-frontend/tests/common/mod.rs:307-318 |
| FND-002 | medium | The new order test directly calls sort_node_lists on synthetic JSON; no two-supertype source fixture is lifted and read back, so IR-1055’s inherited-order condition remains unverified. | crates/extraction-frontend/tests/document.rs:408-435 |
| FND-003 | medium | Operation params remain identity-sorted although QSpec FR-154 and FR-432 make their declaration order positional. Separate FCD repair is tracked by IR-1056, owned by titan:QSL:code; IR-874 signature retention remains open. | crates/extraction-frontend/src/canonical.rs:85-86 |

## Coverage

Examined: FR-097-AC-4, FR-097-AC-5, FR-050-AC-7; QSpec FR-154-AC-32 and FR-432 against exact 2b991805; Rust canonical writer, JavaScript normalizer/fingerprint, TC-1276, TC-1277, TC-1799. Plan completion: not assessed. Matrix: FR-097 AC-4/5 tagged; FR-050-AC-7 untagged. No build or aggregate gate was run because host I/O wait was high.

## New findings (disposition pass 1)

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-004 | medium | The independent TypeScript backend default canonicalize still sorts `/types/*/fields` via IDENTITY_SET_PATHS, and FR-069/FR-067 still claim fields are fingerprint sets. Measured `fingerprintIrForTarget` and CLI use `sets:false`, so actual lockFingerprint is order-sensitive; IR-1058 owns the separate backend/spec correction. | src/compiler/backends/typescript-v1/canonical.mjs:40-53 |

## Dispositions

| FND | outcome | reason |
| --- | --- | --- |
| FND-001 | fixed | src/compiler/ir/normalize.mjs removes `/types/*/fields` from IDENTITY_SETS; common::normalize_ir calls m.normalizeIr(doc) without overriding sets; FR-050 and AC-7 now preserve authored fields and require order-sensitive fingerprint. |
| FND-002 | fixed | tc_1276_a lifts a modified business fixture with VO_003 then VO_002 specializes edges, asserts two supertypes and fields [sku, quantity, kind], then checks normalized and Rust canonical fixed points. |
| FND-003 | deferred | IR-1056 owns FCD operation parameter declaration-order repair; QSpec FR-154/FR-432 positional signature retention remains open. |
| FND-004 | deferred | IR-1058 owns the independent TypeScript backend canonical set and FR-069/FR-067 fingerprint contract. CLI lockFingerprint currently uses fingerprintIrForTarget via sets:false and is field-order-sensitive, so IR-1055 lift/readback is not blocked. |
