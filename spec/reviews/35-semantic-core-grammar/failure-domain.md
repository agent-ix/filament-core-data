---
id: SR-037
title: "Failure-domain review of the semantic-core L3 declaration grammar"
type: SpecReview
analysis: failure-domain
scope: "US-007, FR-031..034, NFR-014, spec/tests.md TC-248..276"
review_set: all
---
# Failure-domain review

## Summary

Issue #35 adds one authoring grammar (`FieldDecl`, `TypeRef`, `Multiplicity`,
`ConstraintDecl`, `RelationDecl`, `OperationDecl`, `ClauseRef`, `EnumValue`,
`KernelScalar`) and one lowering table from it to the IR v1.1 node shapes that
PR #38 landed in `schema/semantic/v1/semantic-ir.schema.json`. The positive
paths are well pinned: exact model inventory (TC-249, TC-273), closed
enumerations (TC-250, TC-251), byte-stable emission (TC-253, TC-264), and the
FR-006 `ConfigVersion` round trip (TC-268, TC-269). The gaps sit at the seam
between the two layers. The grammar declares fewer properties than the IR
requires (`identity`, `origin`, `presence`, `nullable`, `defaultKind`,
`diagnosticCode`, `text`), so the lowering must synthesize them, and FR-034's
`loss` column only looks in the other direction. Three findings are high: how
lowered nodes get their `ix://` identities, what a field-level constraint
applies to once it reaches a type-level `constraints[]`, and whether the
official emitter can produce the schema US-007-EX-4 and FR-032-AC-2 demand.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-130 | high | Every lowered IR node (`field`, `constraint`, `relationship`, `operation`, `clause`, `variant`, kernel scalar `typeDefinition`) requires an `identity` matching `^ix://…`, but no grammar model carries one and FR-034 states no minting rule. `FieldDecl.name` and `OperationDecl.name` are `Identifier`, not `SemanticId`; deriving identity from them collides with FR-020-CON-1 (generated names are not identity) and makes FR-034-AC-3 equality with `config-version-v1-1.json` depend on an unstated `ix://<package>/type/<Name>` convention. The `SemanticId` pattern itself is "pattern-constrained" but unstated; the spike precedent (`^[a-z][a-z0-9-]*:[^\s]+$`) does not match the IR `semanticIdentity` pattern, so a grammar-valid `TypeRef.target` can lower to an IR-invalid `typeRef`. | FR-031, FR-034, FR-034-AC-2, FR-034-AC-3, FR-020-CON-1, TC-268, TC-269 |
| FND-131 | high | `FieldDecl.constraints[]` lowers to `constraint` with `appliesTo` "the field's type identity", but IR constraints live on `typeDefinition.constraints[]` and `appliesTo` names a type. A `min` on field `versionNumber: Integer` therefore constrains the package's kernel `Integer` definition, i.e. every integer field. The fixture avoids this only by declaring an `alias` `VersionNumber` that owns the constraint; the grammar has no alias declaration and FR-034 does not say the lowering mints one. Two fields with different constraints on the same kernel scalar are unrepresentable or silently merged. | FR-034, FR-034-AC-1, FR-034-AC-3, FR-029, TC-267, TC-269 |
| FND-132 | high | US-007-EX-4 and TC-263 require the emitted `FieldDecl.json` to reject `Multiplicity { lower: 1, upper: 0 }`, and FR-032-AC-2/TC-256 require `TypeRef.json` to reject `target: Decimal` without a `decimal` extension. Neither is expressible from a plain TypeSpec model through the official `@typespec/json-schema` emitter (no cross-property `upper >= lower`, no conditional on `target`), and FR-033 forbids a custom emitter while `TypeRef` in FR-031 has no extension slot to be conditionally required. As written the two negative fixtures can only pass by a hand-edited schema, which FR-033-AC-4 then rejects as a byte difference. | US-007-EX-4, FR-031, FR-032-AC-2, FR-033, FR-033-AC-3, FR-033-AC-4, TC-256, TC-263 |
| FND-133 | medium | FR-034-CON-1 checks grammar → IR coverage only. IR-required properties with no grammar source (`origin`, `presence`, `nullable`, `defaultKind`/`defaultValue`, `constraint.diagnosticCode`, `clause.text`, `relationship.composite`/`multiplicity` defaults) are synthesized by unstated rules and never appear in `lowering.json`, so a `loss: none` table proves nothing about them. The grammar cannot express a nullable field, a semantic default, or a `presence: optional` field whose `multiplicity` is absent (FR-027-CON-1's derivation has no input). | FR-034, FR-034-CON-1, FR-034-AC-1, FR-031, FR-027-CON-1, TC-267 |
| FND-134 | medium | The grammar has `ClauseRef` (language, clauseId, sourceSpan) but no clause declaration; `clauses[]` entries are reconstituted from the refs in `pre[]`/`post[]` with `text` "supplied by the extractor". Two refs sharing a `clauseId` with different `language` or `sourceSpan` (one in `pre`, one in `post`, or across two operations) have no merge rule and lower into the FR-028-AC-11 duplicate rejection; a ref whose span the extractor cannot read has no `text` and no stated disposition; a `generated`-origin clause cannot be declared because `sourceSpan` is mandatory. | FR-031, FR-034, FR-028-AC-4, FR-028-AC-11, TC-268 |
| FND-135 | medium | Uniqueness keys inside every grammar array are unstated: `FieldDecl[]` by `name`, `OperationDecl[]` by `name`, `RelationDecl[]` by (`verb`, `target`) or by something else, `EnumValue[]` by `value`, `OperationDecl.params[]` by `name`. JSON Schema `uniqueItems` compares whole items, so the emitted schema accepts duplicates and the failure surfaces only after lowering, at the IR identity check, with an IR locus rather than a declaration locus. `FieldDecl.identity: true` on more than one field, on a `lower: 0` field, or on a `JsonObject`-typed field also has no rule. | FR-031, FR-033, FR-034, FR-028, TC-262, TC-263 |
| FND-136 | medium | `KernelScalar` lowers to "the identity of a kernel scalar type definition in the package", so every package re-declares `UUID`, `String`, … under its own identity (the fixture's `ix://agent-ix/config-service/type/UUID`). Cross-package equivalence of kernel scalars is then by name convention, `kernel-scalars.json` maps members to IR scalars but not to identities, and FR-032-CON-1's additive/breaking classification has no per-package identity to key on. A module importing two packages sees two `UUID` definitions. | FR-032, FR-032-AC-3, FR-032-CON-1, FR-034, FR-025, TC-257, TC-260 |
| FND-137 | medium | Bounds are documented, not enforced: `Integer` "documents" a 64-bit range, `String` and `Bytes` are bounded only when a `maxLength` constraint is present, `Timestamp` precision and `Decimal` are carried in extensions whose names, `version`, and `required` flag are unstated (the IR `extension` node requires all three plus an `ix://` identity, so `agent-ix:identity` and `decimal` are not valid extension identities as written). An unbounded `String` or `Bytes` field is grammar-valid and reaches quire-contract-ir's bounded-type requirement with no `lossy`/`unsupported` disposition declared. | FR-032, FR-032-AC-2, FR-034, FR-034-AC-5, FR-020-CON-2, TC-256, TC-271 |
| FND-138 | medium | FR-033 mandates applying the pinned issue #31 `$id` normalization to "the shared `Record<string>` helper", but no FR-031 model uses `Record<string>` (FR-031-CON-2 forbids untyped records and `JsonObject` is an enum member, not a record). The step's behavior when the bundle contains zero relative `$id` values (no-op, or fail because the pin no longer describes the output) is unstated, and TC-266's "raw bundle valid" test has no defined subject. | FR-033, FR-033-CON-2, FR-033-AC-5, FR-031-CON-2, TC-265, TC-266 |
| FND-139 | low | The `Versions` enum and the `$id` base `https://schemas.agent-ix.org/semantic-core/<version>/` are not tied together: `<version>` is either the package semver or the `Versions` member, the emitter writes one directory per version while FR-033 promises "one file per model", and quoin#293's `data_schema` by path + digest needs to know which. FR-031-AC-6 "prior version's emitted schema is unchanged" is unverifiable until the layout is fixed. | FR-031, FR-031-AC-6, FR-033, FR-033-AC-1, TC-253, TC-261 |
| FND-140 | low | `UnitSymbol` "SHALL accept only case-sensitive UCUM unit symbols" by pattern, but UCUM is a grammar of atoms, prefixes, and exponents that a regular expression can only approximate; `xyz` and `Kilograms` pass any shape regex that admits `m/s`. The IR pattern is the looser `^[!-~]+$`, so nothing downstream catches it. FR-034-AC-4 samples five symbols; the requirement should name the pattern it actually enforces (shape) rather than the standard it cannot. | FR-034, FR-034-AC-4, FR-027, TC-270 |

## Failure Dispositions

| Failure | Required disposition |
|---|---|
| Lowered node needs an `identity` the grammar did not declare | Mint under one written `ix://<package>/<kind>/<Name>` rule recorded in `lowering.json`; never derive from a generated-language name (FR-020-CON-1) |
| `SemanticId` valid in the grammar but invalid as an IR `semanticIdentity` | Fail at the declaration locus; the grammar pattern must be a subset of the IR pattern |
| Field-level constraint on a kernel scalar target | Mint an anonymous `alias` type definition per (field, constraint set), or reject; never attach to the shared kernel scalar |
| `upper < lower`, or `Decimal` without `decimal` extension, in the emitted schema | Reject in the emitted schema by a model shape the official emitter can express (a `DecimalRef` variant of `TypeRef`; `upper` validated post-emission with a named step), or move the check to lowering and rewrite US-007-EX-4 |
| Duplicate `clauseId` across `pre`/`post` refs with differing language or span | Fail at the operation locus before lowering; a matching duplicate collapses to one `clauses[]` entry |
| Clause span unreadable by the extractor | Fail the lowering; never emit a `clause` with empty or placeholder `text` |
| Duplicate `name`/`value` inside a grammar array | Fail at the declaration locus with the declaration's span, not at the IR identity check |
| Unbounded `String`/`Bytes`, or extension name not an `ix://` identity | Declare the `lossy`/`unsupported` verdict under FR-020-CON-2, or require the bound in the grammar; name every extension's identity and `required` flag in `lowering.json` |
| #31 normalization finds nothing to normalize | Fail the build naming the pin as stale; the step is removed by FR-033-CON-2, never left as a silent no-op |
