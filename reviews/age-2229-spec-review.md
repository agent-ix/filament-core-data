---
id: SR-193
title: "Spec review (testability) — PR #265 FR-144 acceptance criteria"
type: SpecReview
analysis: base
scope: "agent-ix/filament-core-data@05f29b8ba33ce250da3ea57a6f293901fe5db44a; spec/functional/FR-144 (Behavior, CON-1..4, AC-1..16), amended ACs FR-032-AC-4/6, FR-034-AC-5, FR-050-AC-14, FR-051-AC-18, FR-054-AC-2/18, FR-064-AC-2/27, FR-066-AC-21, FR-093-AC-4, FR-100-AC-1; context FR-138"
review_set: subset
relationships:
  - target: "ix://agent-ix/filament-core-data/FR-144"
    type: reviews
  - target: "ix://agent-ix/filament-core-data/FR-138"
    type: references
---

# Spec review (testability) — PR #265

## Summary

Ticket: AGE-2229. This is the core spec-review pass over whether the
acceptance criteria can fail and cover the Behavior they claim. Consistency
findings are in SR-192.

FR-144-AC-1 to AC-15 are concrete and falsifiable. Each names exact inputs,
the expected code and pointer, and accepted and refused values on both sides
of every boundary (i128 ±1, 2^53, precision 0/39, binary32 exactness of
`0.1`). The arithmetic in them is right: `0.10000000149011612` is the
binary64 shortest spelling of binary32 `0.1`; `10^38-1` fits i128 and
`10^39-1` does not; `(5,2)` to `(7,3)` is a widening and `(5,2)` to `(5,3)`
a narrowing; AC-13's four effective ranges map to `i64`, `i64`, `u64` and
`i128`. AC-16 is Inspection, which fits a "no source converts" rule. The
amended ACs in FR-032, FR-034, FR-050, FR-051, FR-054, FR-064, FR-066, FR-093
and FR-100 match FR-144, and their scalar counts are right: twelve scalars
with `any`, eleven without it, and eleven `KernelScalar` members, so a
twelfth fails the inventory.

## Verdict

**PASS WITH FINDINGS**: no high findings. Several Behavior bullets have no
AC, and the SysML bullet is ambiguous.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-1703 | medium | The SysML bullet says the target "SHALL emit an FR-138 diagnostic naming the decimal policy or float width it cannot carry". It does not say whether the diagnostic blocks, and it names no code. Under FR-138:57 and FR-138-AC-6 a node with no mapping writes no file, so one reading forbids SysML output for any document with a `decimal` or float field and the other emits it with a warning. No FR-144 AC covers the SysML mapping | spec/functional/FR-144-carry-exact-numeric-scalars-under-one-literal-encoding.md:318-320, spec/functional/FR-138-emit-the-sysml-v2-textual-target.md:57, spec/functional/FR-138-emit-the-sysml-v2-textual-target.md:92 |
| FND-1704 | medium | No AC covers these Behavior bullets: `decimal128` with precision above 34 (234-237); frontend rounding of an authored `float32` value to nearest binary32, ties to even (167-169); a parsed-value reader entry point skipping only the two exact-number cases (203-204); `float32` instance overflow rejection in Rust/TS (278-281, 301-302); a decimal instance `"-0"`/`"-0.00"` refused while `"1.10"` is admitted (269-271); and the ±2^53 counter cap on `line`/`column`/`precision`/`scale` (AC-9 tests only `multiplicity.upper` and `maxLength`) | spec/functional/FR-144-carry-exact-numeric-scalars-under-one-literal-encoding.md:167-169, spec/functional/FR-144-carry-exact-numeric-scalars-under-one-literal-encoding.md:199-204, spec/functional/FR-144-carry-exact-numeric-scalars-under-one-literal-encoding.md:234-237, spec/functional/FR-144-carry-exact-numeric-scalars-under-one-literal-encoding.md:269-281 |
| FND-1705 | low | FR-144-AC-8 has the four readers agree (CON-1) but leaves out the inputs where their JSON parsers differ most: `1e400`/`-1e400` (no finite double: `JSON.parse` gives Infinity, Python `inf`, serde an error), `5e-324` (exact) and `9.007199254740993e15` (whole beyond 2^53 in decimal form). QSL FR-056-AC-13/14 lists them | spec/functional/FR-144-carry-exact-numeric-scalars-under-one-literal-encoding.md:366 |
| FND-1706 | low | FR-144-AC-3 gives the refusal pointer as `/values/1`. Everywhere else, codes are raised at an RFC 6901 pointer into the document, here `.../operands/values/1` under the constraint. A test could assert either form | spec/functional/FR-144-carry-exact-numeric-scalars-under-one-literal-encoding.md:361 |
