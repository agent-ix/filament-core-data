---
id: SR-191
title: "Code review and gap analysis — AGE-2228 canonical decimal-string integer bounds (PR #264)"
type: SpecReview
analysis: code-review
scope: "agent-ix/filament-core-data@02a1df0ccb0eec4ae8cc5ed6f54d8cf392938222; AGE-2228 diff: crates/semantic-ir/src/rules.rs (is_canonical_integer, constraint_rules), crates/semantic-ir/src/lib.rs (tc_1825), crates/semantic-ir/RULES.md, src/compiler/ir/reader.mjs, conformance/oracle/oracle.mjs, conformance/cases/constraint/CONS-006.json, src/compiler/backends/{rust-serde/constraints.mjs,typescript-v1/validators.mjs,json-schema-v1/index.mjs}, spec/functional/FR-050, docs/semantic-data-system/contracts-v1.md"
review_set: subset
relationships:
  - target: "ix://agent-ix/filament-core-data/FR-050"
    type: reviews
  - target: "ix://agent-ix/filament-core-data/FR-036"
    type: references
---

# Code review and gap analysis — AGE-2228

## Summary

Ticket: AGE-2228, folded into PR #264. This file is the code review with a
gap-analysis pass over the same diff (Rust and Node lanes). Plan completion:
not assessed.

The three readers agree on the operand rule. `is_canonical_integer` (Rust)
and `/^(0|-?[1-9][0-9]*)$/` (Node reader and oracle) accept `0` or an
optional `-` and digits with no leading zero, on `integer` only. A `number`
scalar keeps the JSON-number rule. Measured with a Node probe on the
`core-2-0` base:

- The Node reader and the oracle both accept `"18446744073709551615"`, `"0"`, `"-5"` and `7`.
- Both raise `INVALID_OPERAND` for `"007"`, `"01"`, `"+1"`, `" 1"`, `"-0"`, `""` and `"zero"`.

The Rust tests cover all four keywords. CONS-006 now uses `"zero"`, so the
corpus still pins the refusal.

Backends: the Rust backend emits a string bound verbatim as an `i64` literal
when it fits and refuses it when it does not. That is correct, and it never
corrupts a value. The TypeScript and JSON Schema backends convert the string
with `Number(value)`, which silently rounds past 2^53. Exactness belongs to
AGE-2229, but until then #264 should refuse those values rather than write a
different bound.

## Verdict

**FAIL** — one high: two backends silently change a bound they cannot
represent instead of refusing it.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-1681 | high | The TypeScript validator and JSON Schema backends write a string integer bound as `Number(value)`, so a bound past 2^53 is silently changed: `max: "18446744073709551615"` becomes `18446744073709552000` (looser) and `"9007199254740993"` becomes `9007199254740992` (tighter). The Rust backend refuses past i64. These two should refuse when `!Number.isSafeInteger(Number(value))` until AGE-2229 lands | src/compiler/backends/typescript-v1/validators.mjs:187-190, src/compiler/backends/json-schema-v1/index.mjs:164-171 |
| FND-1682 | medium | FR-050-AC-14 says `""` raises `INVALID_OPERAND`, but TC-1825 asserts `SCHEMA_VIOLATION` for `""` in the Rust reader. The Node reader and the oracle (decided without schema rows) raise `INVALID_OPERAND`. The AC and its test contradict each other | spec/functional/FR-050-validate-and-normalize-the-emitted-ir.md:117, crates/semantic-ir/src/lib.rs:484-488 |
| FND-1683 | medium | FR-050 is the Node compiler's reader (`src/compiler/ir/reader.mjs`), but its new AC-14 is traced only to the Rust test `tc_1825`. No Node test covers `operandAdmitted` in the reader or the oracle, or the three backends' string-bound paths; only CONS-006's `"zero"` refusal is pinned | spec/functional/FR-050-validate-and-normalize-the-emitted-ir.md:117, spec/tests.md:1773, src/compiler/ir/reader.mjs:777-791, conformance/oracle/oracle.mjs:1501-1515 |
| FND-1684 | low | Compatibility classification reads a bound only through `as_f64` (Rust `compat::operand_move`), so any move involving a string-form bound, including a relaxation (`max` 5 → `"10"`) or a respelling (`5` → `"5"`), classifies as `conditional` instead of `additive` or `patch`. Conservative, not corrupting | crates/semantic-ir/src/compat.rs:258-284 |

## New findings (disposition pass 1)

Reviewed at `d840ff2901c25b4a6c3c004542734371a2cfa170`.

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-1685 | low | The TypeScript backend's new loss is half-registered: `loss.d.mts` declares neither `LOSS_CODES.INTEGER_BOUND_NOT_EXACT` nor the new export `inexactIntegerBound`, and FR-064, the TypeScript backend's requirement, does not state the loss (only FR-050-AC-14 names it) | src/compiler/backends/typescript-v1/loss.d.mts:9-14, src/compiler/backends/typescript-v1/loss.mjs:67-71, src/compiler/backends/typescript-v1/loss.mjs:222-230 |
| FND-1686 | low | The rust-serde backend's string-bound path (emit an `i64` literal when it fits, refuse past i64) has no test; `test/integer-bounds.test.ts` covers the reader, the oracle, and the TypeScript and JSON Schema backends only | src/compiler/backends/rust-serde/constraints.mjs:177-193, test/integer-bounds.test.ts |

## Dispositions

Round 1, reviewed at `d840ff2901c25b4a6c3c004542734371a2cfa170`. Gates: `cargo test -p agent-ix-semantic-ir` in debug passes, 48 + 1 tests (the whole lib binary, including `tc_1821_decide_on_100000_types_is_linear`, takes 28.6 s single-threaded). The conformance-adapter corpus and extraction-frontend identity tests pass. vitest on `test/integer-bounds.test.ts`, `test/typescript-backend.test.ts` and `test/compiler-core.test.ts` passes, 174 tests. Differential conformance: all 4 adapters match 115 of 115, and `coverage.json` is unchanged.

| FND | outcome | sha/reason |
| --- | --- | --- |
| FND-1681 | fixed c3106ee7 | The TypeScript backend records the blocking loss `INTEGER_BOUND_NOT_EXACT` (registered in `LOSS_CODES` and `TARGET_LOSSES`) for any ordering-keyword bound that is a canonical decimal string with `!Number.isSafeInteger(Number(value))`, on both type and field constraints. JSON Schema returns `unsupported` with `UNDECLARED_LOSS`. 2^53 itself is refused, a conservative edge that is exact but not safe. 66eb2a84 also fixed `typescript-v1/admit.mjs` `operandDefect`, which had refused every string bound for both backends; it now admits exactly the canonical regex on `integer` and still refuses on `number` and on non-canonical strings |
| FND-1682 | fixed 66eb2a84 | FR-050-AC-14 now lists `"01"`, `"+1"`, `" 1"`, `"-0"` and `"1.0"` under `INVALID_OPERAND`, and an empty string or a boolean under `SCHEMA_VIOLATION`, matching TC-1825 |
| FND-1683 | fixed e02ab9c8 | `test/integer-bounds.test.ts` (TC-1825, FR-050-AC-14) covers the Node reader and the oracle on 4 accepted and 8 refused values, and the TypeScript and JSON Schema backends on a safe bound (emitted) and a bound past 2^53 (refused). The untested rust-serde path is FND-1686 |
| FND-1684 | fixed c3106ee7 | `compat::operand_move` reads a canonical string or integer number as `i128` (`Bound::Integer`), compares exactly past 2^53, and falls back to `f64` only for a non-integer number; covered by `tc_1825_a_decimal_string_bound_classifies_as_an_integer` |
