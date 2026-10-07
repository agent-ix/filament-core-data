---
id: SR-190
title: "Spec review — PR #264 FR-036, FR-059, FR-095, FR-141 and contracts-v1 changes"
type: SpecReview
analysis: integrity
scope: "agent-ix/filament-core-data@29858a01dca8b685fb0587822c407999f6cf5b6c; spec/functional/FR-036, FR-059, FR-095, FR-141, docs/semantic-data-system/contracts-v1.md, schema/semantic/v1/{common,semantic-ir}.schema.json, crates/semantic-ir/RULES.md; context FR-068, conformance/oracle/oracle.mjs"
review_set: subset
relationships:
  - target: "ix://agent-ix/filament-core-data/FR-036"
    type: reviews
  - target: "ix://agent-ix/filament-core-data/FR-059"
    type: reviews
  - target: "ix://agent-ix/filament-core-data/FR-095"
    type: reviews
  - target: "ix://agent-ix/filament-core-data/FR-141"
    type: reviews
  - target: "ix://agent-ix/filament-core-data/FR-068"
    type: references
---

# Spec review — PR #264

## Summary

Ticket: AGE-2224 (primary), with AGE-2225 and AGE-2226. Sub-analyses applied:
integrity (cross-FR consistency), EARS (the new statements), and object
review (the new schema members). Examined the changed FR statements and ACs,
the contracts-v1 identity prose and safety paragraph, the identity table, and
the schema members.

AGE-2225 is correct: the identity prose now names only fields, operations and
operation parameters as nested, and relationships and clauses as their own
slots, which agrees with the identity table and FR-095's slot list. The new
members are closed and agree across the JSON Schema (`textProfile` enum in
`common.schema.json`, the `allOf` scalar-string guard, `redefines` on
`operation`), FR-141, the contracts-v1 member table, and the Rust schema
layer. No compatibility layer.

On the 256 bound in FR-068 and the Node `admitIr`/oracle: AGE-2224's
deliverables are all in `semantic-ir`, the crate QSL consumes, so removing
the Node bound is not required by that ticket. But this PR changes the
contract to say graph depth carries no implementation limit, and changes
FR-036 to say the oracle reports a cycle of any length. Both claims are now
false against code and an FR in this same repo. Either scope the sentences
to the Rust reader, or file the Node ticket (FR-068, `admitIr`,
`src/compiler/ir/reader.mjs`, `conformance/oracle/oracle.mjs`) and cite it.

## Verdict

**FAIL** — two high findings: spec statements this PR adds contradict
FR-068 and the oracle code in the same repo.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-1675 | high | FR-036's new sentence "A cycle is reported whatever its length" is false for the oracle: `checkComposite`'s recursive `visit` emits `DEPTH_LIMIT_EXCEEDED` at depth 257 and returns without marking the node, so a 300-type composite ring yields no `COMPOSITE_CYCLE` (the package walk is the same). The Rust reader now reports `COMPOSITE_CYCLE` for that input, a new Rust/oracle divergence with no corpus case and no AC | spec/functional/FR-036-implement-the-independent-semantic-oracle.md:55, conformance/oracle/oracle.mjs:686-712, conformance/oracle/oracle.mjs:764-792 |
| FND-1676 | high | contracts-v1 now says "Graph depth and reference expansion carry no implementation limit", but FR-068 still says "The declared graph-depth bound SHALL be 256" (and FR-068-AC-22), and the Node reader refuses past `maxDepth` 128 (`LIMIT_MAX_DEPTH`). The normative contract contradicts an FR and an implementation in the same repo, with no tracking ticket | docs/semantic-data-system/contracts-v1.md:496-503, spec/functional/FR-068-decide-and-report-ir-admissibility.md:200, src/compiler/ir/reader.mjs:742, src/compiler/diagnostics.mjs:203 |
| FND-1677 | medium | FR-095 says the value-type constraint form "never meets the field form", but `<Name>` is a verbatim artifact id that may carry `-`: value type `A-b` with `min` and record `A` field `b` with `min` both mint `constraint/A-b-min`. `DUPLICATE_IDENTITY` catches the clash, but the FR states a uniqueness that does not hold | spec/functional/FR-095-mint-package-identity-and-provenance.md:111 |
| FND-1678 | medium | The contracts-v1 table and the AGE-2226 ticket say a *text* field carries `textProfile`, but the FR-141 statement and the schema admit it on any field (an `Integer` field with `textProfile: nfc` is accepted), while the type-definition form is held to scalar `string`. Two implementers would read "text field" differently | spec/functional/FR-141-carry-the-model-members-in-the-semantic-ir.md:72, docs/semantic-data-system/contracts-v1.md:288, schema/semantic/v1/semantic-ir.schema.json:434 |
| FND-1679 | low | FR-141 says an operation's `redefines` compares return multiplicity, but says nothing when only one side declares `returns`; the reader silently accepts a redefinition that drops or adds a return | spec/functional/FR-141-carry-the-model-members-in-the-semantic-ir.md:71, crates/semantic-ir/src/constructs.rs:633-648 |

## Dispositions

Round 1, reviewed at `02a1df0ccb0eec4ae8cc5ed6f54d8cf392938222`.

| FND | outcome | sha/reason |
| --- | --- | --- |
| FND-1675 | fixed ea5a6f5f | FR-036 now says the oracle keeps the 256 bound for composite and package rings: a ring longer than 256 reports `DEPTH_LIMIT_EXCEEDED`, while the Rust reader (FR-059) reports the cycle at any length. The claim is limited to the Rust reader, as decided |
| FND-1676 | fixed ea5a6f5f | contracts-v1 now limits "no limit on graph depth or reference expansion" to the Rust reader (`semantic-ir`), and says the Node reader and the oracle keep FR-068's bound (256 for `admitIr`, 128 for `maxDepth`). It no longer contradicts FR-068, as decided |
| FND-1677 | fixed ea5a6f5f | The value-type form is now `constraint/<Name>/<keyword>` in FR-095, the contracts-v1 table, the Rust minter (`id_segment`/`slug`, with `/`) and the Node `typeConstraint` slot. The shared table carries the `A-b`/`min` and `A`/`b`/`min` rows as distinct identities |
| FND-1678 | fixed b3f96e25 | FR-141 now requires a field's `typeRef` to resolve through aliases to a scalar of `string`. The reader (`rules.rs` `field_rules`, ea5a6f5f) raises `SCHEMA_VIOLATION` at `textProfile` otherwise, and `tc_1824_a_text_profile_on_a_non_text_field_is_refused` covers both sides |
| FND-1679 | fixed b3f96e25 | FR-141 now states that an operation with no `returns` returns `0..0`, so a redefinition with `returns` on only one side is `INVALID_REDEFINITION`, and two that both return nothing agree. Implemented in `constructs.rs` (ea5a6f5f) and tested by `tc_1823_a_redefinition_agrees_with_the_redefined_operation_on_returning` |
