---
id: SR-028
title: "Failure-domain review of the semantic IR v1.1 revision"
type: SpecReview
analysis: failure-domain
scope: "US-006, FR-027..030, FR-020 (amended), NFR-013, spec/tests.md TC-203..236"
review_set: all
---
# Failure-domain review

## Summary

The v1.1 revision adds five node shapes (multiplicity/unit, relationships,
operations, clauses, typed constraints) and two enumeration bindings (source
dialect, manifest targets) on top of the v1 baseline in
`schema/semantic/v1/semantic-ir.schema.json` and
`docs/semantic-data-system/contracts-v1.md`. Negative paths for the values each
node carries are well covered (ERR-032..039, TC-205..207, TC-211..216,
TC-220..222, TC-228..229). The gaps are between nodes rather than inside them:
what the normalized form materializes for derived views, which key an operation
binds a clause by, how a validator learns the structural kind of a `typeRef` it
must inspect, what a constraint keyword means against a scalar that cannot hold
its operand, and how the compatibility classifier reads the new nodes. One
finding is high because it can change the semantic bytes of every existing v1
package.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-044 | high | The normalized serialization does not state whether derived views (`presence`, and `multiplicity` derived under FR-027-CON-1) are materialized. If they are, a v1 document read under v1.1 gains bytes, so its fingerprint and `lockDigest` change while NFR-013 classifies the revision `additive`; if they are not, FR-027-AC-1 "byte-identical" round-trip holds only for documents that omit the derived view. Either answer must be written down or FR-020-AC-8's two readers will disagree. | FR-027-CON-1, FR-027-AC-1, FR-020-AC-7, FR-021-AC-7, NFR-013-AC-1, TC-203, TC-208, TC-233 |
| FND-045 | medium | `clauses[]` entries carry `identity` and `clauseId` and both are called "clause identity"; FR-028 does not say which key `pre[]`/`post[]` reference, and declares no uniqueness rule for `clauseId` within a type definition. EC-029 names the duplicate-`clauseId` case but no behavior or TC resolves it. | FR-028, FR-028-AC-4, EC-029, TC-213 |
| FND-046 | medium | FR-028 says the IR "carries clause text opaquely" but the `clauses[]` property list has no text carrier, and `sourceSpan` is a `sourceLocus` while `origin` may be `generated` (no source bytes). A generated-origin clause has nothing to resolve to. Define whether text is inline, span-resolved, or both, and what a generated clause's `sourceSpan` denotes. | FR-028, FR-028-AC-5, US-006-EX-3, TC-214 |
| FND-047 | medium | `relationships[].target` must be a semantic identity, and FR-028 Outputs promise "diagnostics for unresolved targets", but no Behavior clause, AC, ERR row, or TC says what happens when the identity is absent from `types[]` and not imported. Cross-package targets are not mentioned at all. | FR-028, FR-021, TC-210 |
| FND-048 | medium | `unit` is legal only when the referenced type "has structural kind `scalar`", and `ordered`/`unique` only on collection multiplicities, yet a validator can only know the kind by resolving `typeRef` (local, `alias` chain to a scalar, or imported). Alias-of-scalar, unresolved, and imported `typeRef` cases are undefined, and multiplicity `upper > 1` on a `sequence`- or `map`-kind `typeRef` (collection of collections, with `ordered`/`unique` overlapping the sequence's own semantics) has no stated meaning. | FR-027, FR-027-CON-2, FR-027-AC-5, TC-204, TC-207 |
| FND-049 | medium | The closed keyword set types operands but not applicability: `min`/`max` take `{ value: number }` regardless of whether the constrained scalar is `string`, `date`, `datetime`, `duration`, or `bytes`; `minLength` on `integer` and `enumValues` items of any JSON type are accepted. A temporal lower bound is therefore unrepresentable and a mistyped keyword/kind pair passes IR validation and surfaces only as a target-side `unsupported`/`lossy` verdict, if at all. `pattern.regex` syntax validity against `ecma-262` is likewise not checked anywhere. | FR-029, FR-029-AC-5, FR-020-CON-2, TC-219, TC-221 |
| FND-050 | medium | `composite: true` relationships form an ownership graph, and FR-028 states no acyclicity rule. `A composite→ B composite→ A` (or a composite self-edge) validates. EC-028 protects the non-composite self-reference; the composite cycle needs the opposite disposition. | FR-028, FR-028-AC-1, EC-028 |
| FND-051 | medium | FR-030 says the retired dialect constant fails on "v1.1 documents only", and NFR-013-AC-1 says every v1 positive fixture validates under the v1.1 schema; the v1 positive fixture carries that constant. The v1.1 schema must therefore condition the dialect rule on `contractVersion`, and neither FR-030 nor FR-019-CON-2 names the discriminator or the v1.1 `contractVersion` value. As written TC-208 and TC-228 can only both pass by an unstated rule. | FR-030, FR-030-CON-1, FR-030-AC-2, NFR-013-AC-1, TC-208, TC-228, TC-231 |
| FND-052 | medium | The compatibility classifier gains new inputs without rules: multiplicity narrowing (`0..1` → `1..1`) versus widening, `unit` change, `ordered`/`unique` change, relationship or operation add/remove, and clause change. Only keyword add/remove is classified (FR-029-CON-2). NFR-013 classifies the schema revision; per-package v1.1 diffs are unclassified and will default to whatever FR-025 does with unknown node types. | FR-025, FR-029-CON-2, NFR-013-AC-3, TC-225, TC-235 |
| FND-053 | low | `lower: 0, upper: 0` is declared a valid "empty-only multiplicity" (tests.md boundary row for TC-206). A field that can never hold a value has no target representation; FR-027 should either reject `upper: 0` or route it to an `unsupported`/`lossy` disposition under FR-020-CON-2. `operations[].returns` also lacks `nullable`, so a nullable return is unrepresentable while a nullable field is. | FR-027, FR-028, FR-020-CON-2, TC-206 |
| FND-054 | low | Uniqueness keys for the new arrays are unstated: `relationships[]`, `operations[]`, `clauses[]` by `identity`, and `operations[].params[]` by `name`. Duplicate entries validate today; the `semanticIdentity` pattern makes global uniqueness plausible but no rule says so. | FR-028, FR-020 |

## Failure Dispositions

| Failure | Required disposition |
|---|---|
| Derived view stated and contradicting multiplicity | Fail at the field locus (ERR-032); the normalized form must declare which of the two is emitted |
| Clause referenced by an operation but absent, duplicated, or in another type | Fail at the operation locus (ERR-035); duplicate key must fail at the clause locus |
| Relationship target unresolved in the package graph | Fail at the relationship locus; never accept a display name or path as a fallback |
| `unit`, `ordered`, or `unique` on a `typeRef` whose kind cannot be resolved | Fail with an unresolved-type diagnostic, not a silent pass |
| Constraint keyword inapplicable to the constrained scalar kind | Fail at the constraint locus, or declare the loss under FR-020-CON-2; never emit an unenforced constraint |
| Composite ownership cycle | Reject at every edge in the cycle; non-composite self-reference stays valid (EC-028) |
| Retired dialect constant on a `contractVersion: "1.0.0"` document under the v1.1 schema | Accept; on any later `contractVersion` fail citing ADR-0005 (ERR-038) |
| v1.1 node changed between package versions | Classified by FR-025 with a written rule per node; unknown-node default is not an acceptable classification |
