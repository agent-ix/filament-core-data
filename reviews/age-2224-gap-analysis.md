---
id: SR-189
title: "Gap analysis — PR #264 semantic-ir arbitrary depth, operation redefines, text profile, value-type constraint identity"
type: SpecReview
analysis: gap-analysis
scope: "agent-ix/filament-core-data@29858a01dca8b685fb0587822c407999f6cf5b6c; FR-059-AC-17..21, FR-141-AC-10..11, FR-095-AC-18 against crates/semantic-ir, crates/extraction-frontend, crates/conformance-adapter, spec/tests.md"
review_set: subset
relationships:
  - target: "ix://agent-ix/filament-core-data/FR-059"
    type: reviews
  - target: "ix://agent-ix/filament-core-data/FR-141"
    type: reviews
  - target: "ix://agent-ix/filament-core-data/FR-095"
    type: reviews
---

# Gap analysis — PR #264

## Summary

Ticket: AGE-2224 (primary), with AGE-2225 and AGE-2226. Planless.
Plan completion: not assessed.

Each new AC was traced to the test tagged with it and to the code it
exercises:

- FR-059-AC-17 → `json.rs` `tc_1820_reads_clones_compares_writes_and_drops_a_million_levels`, `tc_1820_debug_matches_a_derived_debug_in_both_forms`, `tc_1820_a_malformed_deep_document_refuses_on_a_small_stack` (real 1,000,000-level input on a 256 KiB thread).
- FR-059-AC-18 → `tc_1820_a_configured_depth_limit_refuses_with_a_typed_error`, `tc_1820_a_configured_byte_limit_refuses_with_a_typed_error`.
- FR-059-AC-19 → `rules.rs` `tc_1821_a_composite_cycle_of_300_types_is_reported`, `tc_1821_a_composite_cycle_of_100000_types_is_reported_on_a_small_stack`, `tc_1821_a_package_cycle_of_any_length_is_reported`.
- FR-059-AC-20 → `tc_1821_an_alias_chain_resolves_at_any_length_unless_a_limit_is_configured`.
- FR-059-AC-21 → `lib.rs` `tc_1822_decides_a_bundle_nested_a_million_levels_deep_on_a_small_stack`.
- FR-141-AC-10 → `tc_1823_an_operation_redefines_a_supertype_operation`.
- FR-141-AC-11 → `tc_1824_a_text_field_and_a_text_value_type_carry_a_text_profile`.
- FR-095-AC-18 → the shared identity table row, asserted by `crates/extraction-frontend/tests/identity.rs` against Rust and the Node harness.

Every AC has a tagged test that can fail and asserts the stated behaviour.
No stubs. The conformance adapter configures the corpus `depthLimit`, so the
corpus still decides under the bound it states. A probe outside the repo
decided a schema-valid bundle carrying a 1,000,000-level extension `payload`
on a 512 KiB thread: `Success`, no overflow.

## Verdict

**PASS WITH FINDINGS** — no high. The AC-to-test trace is complete. Two low
gaps, listed below.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-1673 | low | `PackageIdentity::type_constraint_identity` has no production caller: `lower.rs` mints only field constraints (`constraint_identity`), so the FR-095 value-type constraint form exists only in the minter and the identity table, and FR-095-AC-18 tests a function no lowering path reaches | crates/extraction-frontend/src/identity.rs:223-231, crates/extraction-frontend/src/lower.rs:950-953 |
| FND-1674 | low | TC-1822 decides a deep value only where the schema layer rejects it, so the rules, normalize and compat layers never see a deep value in a committed test; a schema-valid bundle with a deep extension `payload` (admitted by `common.schema.json#/$defs/extension`) is the case that reaches them | crates/semantic-ir/src/lib.rs:155-182 |
