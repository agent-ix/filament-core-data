---
id: SR-16306
title: IR-990 PR307 code and Rust review
type: SpecReview
analysis: code-review
scope: "agent-ix/filament-core-data PR307; crates/semantic-ir/src/rules.rs; crates/semantic-ir/tests/model_document.rs; IR-990"
review_set: subset
---

## Summary

Independent diff review at `785ad79a25e103f5c384cf121d2c29070da1e471` against `13e05e837ab4130156af2659171f15eb829b59fc`. The Rust reader's field and operation-parameter call sites, native resolution inventory, field rule, positive fixture, and refusal fixture were inspected. No spec, schema, registry, gate, dependency, or workflow file changed. IR-991 owns the larger exact diagnostic and shape contract.

## Verdict

PASS — No production or Rust-style defect found within the IR-990 field-intake scope. This does not certify full FR-146-AC-2 implementation or the author's final aggregate gate.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | low | No findings (placeholder) | - |

## Coverage

The added `CLOCK_TYPE_REF` is checked only when `field_rules` receives `FieldContext::DefinitionField`; the same routine receives `OperationParameter` for params. `resolves`, `native_scalar`, `NATIVE_SCALARS`, and `Document::resolve` are unchanged, so Clock does not become a scalar, a document node, or a general type reference. The return, alias/reference, sequence/map, variant and constraint positions retain their prior resolution paths. No unsafe, panic, new public API, copied upstream artifact, or narrowed gate was introduced.

## Examined units

- FR-146-AC-1 (examined): A document of package `acme/rpc` whose object type `Call` has a field `x` typed `ix://quire/native/Clock` with multiplicity `{1, 1, false, false}`, presence `required`, nullable `false` and defaultKind `none` is accepted by every reader with no diagnostic, and no `types[]` node is declared for the clock; every reader's native set is the `kernel-scalars.json` names plus `Text` and `Clock`, and `kernel-scalars.json` has no `Clock` entry.
- FR-146-AC-2 (context_only): Clock outside definition fields requires `CLOCK_OUTSIDE_FIELD`, and invalid clock field shape requires `INVALID_CLOCK_FIELD`, with exact pointers and no competing diagnostics. The full contract is owned by IR-991.
- FR-050-AC-11 (context_only): Every rule of the cross-field code table fires on a constructed document and produces exactly its named code.

## Review evidence

Read-only diff and source inspection at the exact PR head; computed Quire matrix records FR-146-AC-1 tagged to the new positive test and FR-146-AC-2 untagged. No aggregate gate, Cargo test, or author-branch edit ran in this review.
