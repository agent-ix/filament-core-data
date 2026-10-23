---
id: SR-16307
title: IR-990 PR307 incremental gap analysis
type: SpecReview
analysis: gap-analysis
scope: "agent-ix/filament-core-data PR307; crates/semantic-ir/src/rules.rs; crates/semantic-ir/tests/model_document.rs; FR-146-AC-1 and field-only intake boundary"
review_set: subset
---

## Summary

Incremental requirement-to-code-to-test analysis at `785ad79a25e103f5c384cf121d2c29070da1e471` against `13e05e837ab4130156af2659171f15eb829b59fc`. Plan completion: not assessed. The computed Quire matrix marks FR-146-AC-1 tagged by `a_clock_field_is_admitted_without_a_declared_type`; FR-146-AC-2 remains untagged, consistent with the separately assigned IR-991 scope.

## Verdict

PASS — The positive field test backs the targeted admission and the negative control backs the field-only refusal boundary. Exact FR-146-AC-2 diagnostics and shape checks remain IR-991 work.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | low | No findings (placeholder) | - |

## Coverage

The positive test constructs an inline `Call` record with a single `Clock` field, canonical multiplicity, required presence, nonnullable and no default, then asserts zero diagnostics through the real `decide` entry point. It declares no Clock type. The changed rule gives Clock field-only special admission. The negative test routes an operation parameter through the same `field_rules` routine and asserts exactly one refusal at the parameter's `typeRef`. The production branch retains the previous `UNRESOLVED_TYPE_REF` code; the test does not pin that code, but IR-990 asks only for refusal outside fields and IR-991 owns the exact `CLOCK_OUTSIDE_FIELD` replacement. No new scalar/node admission or general-purpose native resolution was observed. The whole-repository gap baseline was not adjudicated in this incremental review.

## Examined units

- FR-146-AC-1 (examined): A document of package `acme/rpc` whose object type `Call` has a field `x` typed `ix://quire/native/Clock` with multiplicity `{1, 1, false, false}`, presence `required`, nullable `false` and defaultKind `none` is accepted by every reader with no diagnostic, and no `types[]` node is declared for the clock; every reader's native set is the `kernel-scalars.json` names plus `Text` and `Clock`, and `kernel-scalars.json` has no `Clock` entry.
- FR-146-AC-2 (context_only): `ix://quire/native/Clock` outside a definition field refuses exactly `CLOCK_OUTSIDE_FIELD` at its member pointer; invalid clock-field shape refuses exactly `INVALID_CLOCK_FIELD` at affected members. Full implementation is assigned to IR-991.
- FR-050-AC-11 (context_only): Every rule of the cross-field code table fires on a constructed document and produces exactly its named code.

## Review evidence

`quire matrix --scope . --format json` completed successfully at the PR head; retained at `qualification-logs/ir990-pr307-review/matrix.json`. Read-only source and diff inspection only; no aggregate gate, Cargo test, or author-branch edit ran.
