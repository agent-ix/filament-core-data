---
id: SR-16506
title: QSL-2737 PR 361 code-review
type: SpecReview
analysis: code-review
scope: "agent-ix/filament-core-data@35a1af39f6fc87f9ddface92b7c1d140844ec82d; PR 361; crates/semantic-ir/src/constructs.rs, crates/semantic-ir/tests/model_document.rs, crates/semantic-ir/RULES.md, conformance/diagnostic-codes.json, docs/semantic-data-system/contracts-v1.md"
review_set: subset
---

## Summary

Ticket: QSL-2737. Code review of `git diff origin/main...HEAD` at the frozen
head 35a1af39, with the rust-review and rust-style lane folded in. The change
widens the Rust reader's `subsets` resolution in `features`
(crates/semantic-ir/src/constructs.rs:746-757) from the transitive ancestors'
fields to the owning type's own fields chained with them. `redefines` for
fields (constructs.rs:759-776) and for operations (`redefined_operations`)
still resolve against `inherited` / ancestor operations only, matching the
arch ruling that redefines stays ancestors-only.

Checked: `ancestors` (constructs.rs:340) seeds `seen` with the type's own
identity, so `inherited` never contains the owner and the chain does not
double-count; a supertype cycle cannot bring the owner back in. `items` returns
a borrowed slice, so re-reading the own fields per entry allocates nothing.
The `narrows_something` guard and its comment remain accurate, since own-field
resolution needs no supertype walk. The diagnostic message now matches the
rule. No other reader emits `UNRESOLVED_FEATURE_REF` (grep over src/, test/,
tests/, python_backend/, packages/); FR-142 makes the Rust reader the sole
authority, so no Node/Python reader needs the same change. The Rust, TS and
Python backends map a subsets identity through a document-wide field-name map
(src/compiler/constructs.mjs:619, python_backend/runner/constructs.py:217), so
an owning-type target renders without change.

The contract-row edits keep the corpus citation check satisfied: the new
diagnostic-codes.json citation "Fields of the owning type or a supertype whose
values include this field's values" is a verbatim substring of
contracts-v1.md:316 (checked by test/conformance-corpus.test.ts:738 and
tests/test_conformance_corpus.py:285), and the RULES.md row cites that quote
and the unchanged redefines quote at contracts-v1.md:317.

Tests (crates/semantic-ir/tests/model_document.rs:46-164): owner subsets in
both field orders (forward reference), subsets and redefines through a
two-level supertype chain, refusal of a foreign type's field, an unknown field
and a type identity at `/ir/types/0/fields/0/subsets/0`, and a redefines of an
own field still refused at `.../redefines`. Each test asserts the exact
diagnostic list. The helpers are small and typed (`FieldLink` enum rather than
a bool flag).

Test evidence was not run locally (the brief forbids local cargo). Reported by
the brief at the exact head on draco: `cargo test --locked -p
agent-ix-semantic-ir --test model_document -- field_feature_` 4 passed, and
`--lib -- tc_1823` 2 passed, both exit 0. Recorded as reported, not
reproduced by this reviewer.

## Verdict

PASS. No code or Rust defects in the diff. The trace attribution of the new
tests and the owning-requirement text are recorded under the gap-analysis
(SR-16507) and spec-review (SR-16508) artifacts.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | low | No findings (placeholder) | - |
