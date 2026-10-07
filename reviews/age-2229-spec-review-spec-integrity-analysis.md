---
id: SR-192
title: "Spec review (integrity) — PR #265 FR-144 exact numeric scalars and amendments"
type: SpecReview
analysis: integrity
scope: "agent-ix/filament-core-data@05f29b8ba33ce250da3ea57a6f293901fe5db44a; spec/functional/FR-144, FR-029, FR-032, FR-034, FR-046, FR-050, FR-051, FR-053, FR-054, FR-057, FR-064, FR-066, FR-092, FR-093, FR-100, spec/spec.md, spec/log.md, docs/semantic-data-system/contracts-v1.md; context FR-031, FR-138, NFR-044, spec/tests.md, kernel-scalars.json, semantic-ir.schema.json, quire-spec-language@1372b151 FR-056/FR-091/FR-092, quire-specification@74645130 FR-140"
review_set: subset
relationships:
  - target: "ix://agent-ix/filament-core-data/FR-144"
    type: reviews
  - target: "ix://agent-ix/filament-core-data/FR-050"
    type: reviews
  - target: "ix://agent-ix/filament-core-data/FR-051"
    type: reviews
  - target: "ix://agent-ix/filament-core-data/FR-054"
    type: reviews
  - target: "ix://agent-ix/filament-core-data/FR-064"
    type: reviews
  - target: "ix://agent-ix/filament-core-data/FR-066"
    type: reviews
  - target: "ix://agent-ix/filament-core-data/FR-100"
    type: reviews
  - target: "ix://agent-ix/filament-core-data/NFR-044"
    type: references
---

# Spec review (integrity) — PR #265

## Summary

Ticket: AGE-2229 (rows 1, 2, 3 and 5; row 4 is deliberately absent and not
reviewed). Sub-analysis: integrity, covering consistency across FR-144 and
every amended FR, agreement with quire-spec-language and QSpec, and
self-consistency of the spec where the schema, `kernel-scalars.json`,
`RULES.md` and the fixtures are left for the code PR.

Agreement with QSL and QSpec holds on every point checked:

- The canonical integer string matches QSL FR-092's `integer` literal
  spelling and QSpec `IntegerString`.
- The i128 ceiling and the `INTEGER_OUTSIDE_I128` payload (value as written,
  limit crossed) match QSL FR-091.
- The two exact-number cases match QSL FR-056's `noncanonical_wire` causes,
  including the 2^53 boundary, the `inexact-integer` precedence for a number
  that fits both cases, and `0.1`, `1.0` and `-0` being exact.
- The decimal policy `{p, s}` mapped to QSpec FR-140 `Decimal[-(10^p-1),
  10^p-1; s, s]` admits exactly the policy's values under FR-140's membership
  rule. The omitted rounding spelling selects strict `exact`.
- The native names `Float32` and `Float64` match QSL FR-056.

QSL FR-056 still refuses a `Decimal` typeRef (FR-056:355-358) and a float
field (FR-056:381). FR-144 says QSL adapts in the same round, which is QSL's
work, so it is not a finding here.

Specs left for the code PR: the schema still lists `number`,
`kernel-scalars.json` still maps `Decimal` to `number`, and `RULES.md` still
reads an integer bound as a number. spec.md §6 says FR-144 lands ahead of its
code, so that gap is declared. No test parses FR text that this PR changes in
a way that breaks it: `test-matrix-summary.mjs --check`,
`build-compiler-docs.mjs --check` and `build-compatibility-cases.mjs --check`
all pass at the head, and the spec-reading tests (`issue-backing-register`,
`semantic-contract`, `compiler` Outputs ledger) do not touch the changed
text. `quire validate` passes FR-144, FR-032, FR-050 and FR-051.

Internal consistency is where it fails. FR-144 decides the wire form and Rust
type per *subject*, which is normally a minted alias. But the backend FRs it
amends still render an alias as its target's type, substitute `defaultValue`
verbatim, and compare `enumValues` and `unique` by canonical form. NFR-044
still requires every published `2.0.0` fixture to keep its reader verdict,
which FR-144 changes.

## Verdict

**FAIL**: four high findings. Each is a contradiction between FR-144 and a
requirement the PR leaves unamended (FR-054, FR-064, FR-066, FR-100,
NFR-044). Each one gives a wrong result on the main path once the code lands.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-1687 | high | FR-144 picks the wire form and Rust/TS type per subject: safe vs wide `integer`, and the `decimal` scale. A bound or policy normally sits on a minted alias over the unbounded kernel `Integer` or the policy-free kernel `Decimal`. But FR-064:102 renders an alias as "a type alias to its `target`", FR-054:83 renders it as a `#[serde(transparent)]` newtype over the target's Rust type, and FR-100:116 renders the target's schema. A `uint64` or `max "9007199254740993"` alias therefore becomes `number`/`i64`/`{"type":"integer"}`, contradicting FR-144-AC-13/14/15, and a decimal alias has no scale to type its `Decimal` at | spec/functional/FR-064-lower-ir-type-definitions-to-typescript.md:102, spec/functional/FR-054-map-the-semantic-ir-to-rust-serde-declarations.md:83, spec/functional/FR-100-map-semantic-ir-to-json-schema.md:116, spec/functional/FR-144-carry-exact-numeric-scalars-under-one-literal-encoding.md:261-309 |
| FND-1688 | high | FR-144 makes every integer `defaultValue` a canonical integer string and every decimal default a canonical decimal string ("42", "1.5"). FR-066:168-169 substitutes the `defaultValue` verbatim and then validates it against the field's type. A safe `integer` field's default "42" is a string where the instance wire requires a JSON number, so every integer default is reported as a defect. A decimal default "1.5" at scale 2 differs from the "1.50" the Rust backend writes. No FR says the default is converted to the subject's instance wire form | spec/functional/FR-066-generate-runtime-validators.md:168-169, spec/functional/FR-144-carry-exact-numeric-scalars-under-one-literal-encoding.md:159-174, spec/functional/FR-144-carry-exact-numeric-scalars-under-one-literal-encoding.md:267-275 |
| FND-1689 | high | FR-144:274-275 says decimal instance values are "equal, ordered, and unique by their mathematical value", so "1.1" and "1.10" are one value. FR-066 still decides `enumValues` by "membership in the declared set" (FR-066:102) and `unique` by FR-069 canonical form (FR-066:104, 163), which keeps the two strings distinct. FR-100:136-142 maps `enumValues` and unique collections to JSON Schema `enum`/`uniqueItems`, which compare strings, and FR-144 refuses only decimal *bounds* there. FR-057:115 still states IEEE-754 equality for numeric `enumValues`/`unique`. The backends will disagree on a decimal enum or unique collection (NFR-009), and FR-066-AC-18 (ajv agrees with the validator) cannot hold for both | spec/functional/FR-144-carry-exact-numeric-scalars-under-one-literal-encoding.md:274-275, spec/functional/FR-066-generate-runtime-validators.md:102-104, spec/functional/FR-066-generate-runtime-validators.md:163, spec/functional/FR-100-map-semantic-ir-to-json-schema.md:136-142, spec/functional/FR-057-enforce-constraints-in-generated-rust.md:115 |
| FND-1690 | high | NFR-044's statement and NFR-044-AC-1 require every published `contractVersion` `2.0.0` fixture to keep its reader verdict and canonical bytes. FR-144 refuses `scalar: "number"` and an integer bound written as a JSON number, both still present in published 2.0.0 fixtures: `config-version-v2.json` has `"value": 1` on a `min`, and `semantic-ir-v2-constructs.json` has `"scalar": "number"`. Either the verdicts change or the fixtures' bytes change. NFR-044 is not amended or scoped, so it contradicts FR-144. This is not a compat request: NFR-044's scope exclusion already lists FR-139/141/142 changes and needs FR-144 added | spec/non-functional/NFR-044-preserve-semantic-ir-revision-compatibility.md:20-23, spec/non-functional/NFR-044-preserve-semantic-ir-revision-compatibility.md:60, spec/functional/FR-144-carry-exact-numeric-scalars-under-one-literal-encoding.md:84-88, spec/functional/FR-144-carry-exact-numeric-scalars-under-one-literal-encoding.md:175-176 |
| FND-1691 | medium | An `integer` subject with no bound has three readings. FR-032:35 says `Integer` is "bounded only by its declared bounds". FR-144:261-264 gives a missing bound the instance domain ±(2^53-1), which every validator enforces. The QSL mapping (FR-144:335-337) covers only "an `integer` subject with bounds" "as written", and says nothing for a missing bound or for `exclusiveMin`/`exclusiveMax`. So QSL models an unbounded or exclusive-bounded field over a different domain than FCD validates | spec/functional/FR-032-define-the-kernel-scalar-library.md:35, spec/functional/FR-144-carry-exact-numeric-scalars-under-one-literal-encoding.md:115-117, spec/functional/FR-144-carry-exact-numeric-scalars-under-one-literal-encoding.md:261-264, spec/functional/FR-144-carry-exact-numeric-scalars-under-one-literal-encoding.md:335-337 |
| FND-1692 | medium | Widening an `integer` bound across ±(2^53-1), for example `max "100"` to `max "18446744073709551615"` or removing a bound that made the subject safe, flips the instance wire from JSON number to string. FR-144-AC-13 has the wide field reject the JSON number `5`, so every existing instance becomes invalid, and the TS type changes from `number` to `string`. FR-051 classifies this "Scalar domain widened" as `conditional` and has no row for a safe/wide flip | spec/functional/FR-051-diff-and-evolve-the-semantic-ir.md:58-60, spec/functional/FR-144-carry-exact-numeric-scalars-under-one-literal-encoding.md:265-268, spec/functional/FR-144-carry-exact-numeric-scalars-under-one-literal-encoding.md:326-328 |
| FND-1693 | medium | The lifting table makes the TypeSpec frontend write width bounds for a member typed `int8`..`uint64` or `safeint`. A constraint can sit only on a type definition (FR-053:71), and a directly typed member references the one package-local `Integer` kernel definition shared by every integer member (FR-046:79). FR-053:72 mints an alias only when a constraint decorator is applied. FR-144 does not say where an undecorated `int8` member's bounds go (mint an alias? a per-width definition?), and FR-144-AC-11 does not pin it | spec/functional/FR-144-carry-exact-numeric-scalars-under-one-literal-encoding.md:216-231, spec/functional/FR-046-lower-typespec-to-contract-ir.md:79, spec/functional/FR-053-declare-the-typespec-semantic-vocabulary.md:71-72 |
| FND-1694 | medium | The effective range takes `lo` from "its `min`, or its `exclusiveMin` plus one" and does not say what happens when both are present. FR-144:229-231 makes this common: it writes one bound *per keyword*, so `uint64` with `@maxValueExclusive(100)` carries `max "18446744073709551615"` and `exclusiveMax "100"`. One implementer reads `hi` from `max` (wide, string wire, `u64`) and another takes the tighter (safe, number wire, `i64`). The backends would disagree on wire form | spec/functional/FR-144-carry-exact-numeric-scalars-under-one-literal-encoding.md:229-231, spec/functional/FR-144-carry-exact-numeric-scalars-under-one-literal-encoding.md:261-264 |
| FND-1695 | medium | Every binary64 value of magnitude at least 2^53 is whole, so the INEXACT_INTEGER case refuses every `float32`/`float64` value site beyond ±2^53, for example `1e20` or binary32 max `3.4028234663852886e38`, even though RFC 8785 spells them exactly. The float value-site rules (FR-144:164-169) never say a float bound, default or enumerated value is limited to ±2^53. The description's reason ("No JSON number ... may lack an exact RFC 8785 spelling") is wrong for this case. QSL FR-056 refuses the same numbers, so this is a limit to state, not a disagreement | spec/functional/FR-144-carry-exact-numeric-scalars-under-one-literal-encoding.md:62-66, spec/functional/FR-144-carry-exact-numeric-scalars-under-one-literal-encoding.md:164-169, spec/functional/FR-144-carry-exact-numeric-scalars-under-one-literal-encoding.md:186-189 |
| FND-1696 | medium | FR-144-CON-2 forbids holding any integer value as a binary double "at any step", and FR-144-AC-16 forbids converting an integer value site to a JavaScript `number`. FR-144's own safe-integer rules need exactly that. The JSON Schema backend writes `"minimum": lo` as a JSON number (FR-144:303-304), and the TS backend types a safe subject as `number` and compares its bounds (FR-144:297). Read literally, CON-2/AC-16 cannot pass. They need a safe-range exemption, or must say how the bound is emitted without a `number` | spec/functional/FR-144-carry-exact-numeric-scalars-under-one-literal-encoding.md:351, spec/functional/FR-144-carry-exact-numeric-scalars-under-one-literal-encoding.md:374, spec/functional/FR-144-carry-exact-numeric-scalars-under-one-literal-encoding.md:297, spec/functional/FR-144-carry-exact-numeric-scalars-under-one-literal-encoding.md:303-304 |
| FND-1697 | medium | FR-100:139-142 still maps `min`/`max`/`exclusiveMin`/`exclusiveMax` to their JSON Schema counterparts. FR-144 renders a wide `integer` as `{"type":"string","pattern":P}`, and JSON Schema's `minimum` does not apply to a string. If the bound is emitted as written it is silently unchecked. FR-100 should say a wide subject's bounds are folded into `P`, and that a safe subject's string operand is emitted as a number | spec/functional/FR-100-map-semantic-ir-to-json-schema.md:139-142, spec/functional/FR-144-carry-exact-numeric-scalars-under-one-literal-encoding.md:303-306 |
| FND-1698 | low | A `decimal128` member with `@decimal` precision above 34 raises `agent-ix.compiler.DECIMAL_POLICY_MISSING`, but the policy is present, not missing. That code names a different condition | spec/functional/FR-144-carry-exact-numeric-scalars-under-one-literal-encoding.md:234-237 |
| FND-1699 | low | FR-053 now bounds `@decimal` to precision `1..=38` and scale `0..=precision`, but FR-031:42 still declares `DecimalPolicy` as `{ precision: int32; scale: int32 }` with no range. A semantic-core `(39, 2)` or `(0, 0)` lowers to an IR the reader refuses with `SCHEMA_VIOLATION`, and the grammar refuses nothing | spec/functional/FR-031-define-the-semantic-core-declaration-grammar.md:42, spec/functional/FR-053-declare-the-typespec-semantic-vocabulary.md:54 |
| FND-1700 | low | For a constrained `Decimal` member, the TypeSpec frontend puts `decimal` on the decorated field (FR-144:232-233, with the constraint on the FR-053 alias). The spec-bundle and semantic-core paths put it on the minted alias (FR-144:241-243, 251-253). Both are valid IR, but FR-098's cross-frontend structural projection would see the same declaration lifted two ways | spec/functional/FR-144-carry-exact-numeric-scalars-under-one-literal-encoding.md:232-233, spec/functional/FR-144-carry-exact-numeric-scalars-under-one-literal-encoding.md:241-243 |
| FND-1701 | low | FR-144's Dependencies list FR-139 as upstream, and its Behavior relies on FR-139 (`any` default) and FR-138 (SysML diagnostic). Its frontmatter `relationships` carry neither, so the graph misses the edges the prose states | spec/functional/FR-144-carry-exact-numeric-scalars-under-one-literal-encoding.md:5-25, spec/functional/FR-144-carry-exact-numeric-scalars-under-one-literal-encoding.md:378-379 |
| FND-1702 | low | spec/tests.md still describes TC-1825 as "An integer bound accepts a canonical decimal string beyond 2^53", traced to FR-050-AC-14 and marked passed, and lists it under FR-064. The PR rewrote FR-050-AC-14 and FR-064-AC-27 and dropped their TC-1825 tags. The row now describes behaviour FR-144 deletes (`INTEGER_BOUND_NOT_EXACT`, number bounds). The hand-kept status and summary columns are a tracking ledger. The computed `quire matrix` should carry this | spec/tests.md:235, spec/tests.md:240, spec/tests.md:1773 |
