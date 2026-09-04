---
id: SR-038
title: "Integrity review of the semantic-core L3 declaration grammar"
type: SpecReview
analysis: integrity
scope: "spec/usecase/US-007-*.md, spec/functional/FR-031-*.md..FR-034-*.md, spec/non-functional/NFR-014-*.md, spec/tests.md TC-248..276, spec/spec.md, spec/index.md"
review_set: all
---
# Integrity review

## Summary

US-007 is elaborated by FR-031..034 and constrained by NFR-014 under StR-001.
Every acceptance criterion and named constraint maps to TC-248..276, IDs are
unique, and the dependency graph is acyclic. The grammar is not yet
single-interpretation against the IR v1.1 it lowers to (FR-027..030, landed in
PR #38): the lowering table is property-to-property, but the IR requires
properties the grammar never supplies (`identity`, `origin`, `nullable`,
`defaultKind`, clause `text`, the document envelope), field constraints have
no field-level home in the IR so `appliesTo` on the field's type identity
constrains every use of a kernel scalar, and the `decimal` extension FR-032
requires has no slot on `TypeRef`. Each of those makes FR-034-AC-3 (equality
with `fixtures/semantic/v1/positive/config-version-v1-1.json`) unreachable as
written. Nine medium findings are ambiguities or textual contradictions
(schema-inexpressible multiplicity check, UCUM-by-regex, an inventory that
excludes models FR-031 requires, a lost `returns.unit`, no enum/alias
declaration, unnamed extension identities, an unproduced `FieldDecl[]`
fixture, a classifier with no IR input, and a grammar narrower than the IR).
No spec artifact was edited by this review.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-141 | high | The lowering has no stated source for properties the IR v1.1 schema requires on every node: field `identity`, `origin`, `nullable`, `defaultKind`; relationship, operation, and clause `identity` and `origin`; clause `text` (required by `semantic-ir.schema.json`, "supplied by the extractor" that issue #36 has not built); and the document envelope (`contractVersion`, `source.dialect` — `typespec` for grammar input versus `spec-bundle` in the target fixture — `source.digest`, `package`). FR-034 Inputs list only the four declaration arrays, so FR-034-AC-2 (validates, zero diagnostics) and FR-034-AC-3 (normalized equality with `config-version-v1-1.json`) cannot both be met without an unstated identity-minting rule and envelope source; EC-034 names the clause case but no Behavior bullet closes it. | FR-034, FR-034-AC-2, FR-034-AC-3, FR-028, EC-034, TC-268, TC-269 |
| FND-142 | high | `ConstraintDecl` lowers "to `constraint` with `appliesTo` set to the field's type identity". The IR `field` node carries no `constraints[]`, so a `FieldDecl { type: Integer, constraints: [min 1] }` attaches to the kernel `Integer` type definition and constrains every `Integer` field in the package. The target fixture expresses the FR-006 bound on an `alias` type `VersionNumber` (FR-029-AC-6), which the grammar has no model to declare, so FR-034-AC-3 is unreachable and the stated lowering is semantically wrong for any shared target. | FR-034, FR-031, FR-029-AC-6, TC-269 |
| FND-143 | high | FR-032 requires `Decimal` precision/scale "carried on the `TypeRef` as a `decimal` extension" and FR-032-AC-2 fails a `TypeRef` without it, but FR-031's `TypeRef { target, multiplicity?, unit? }` has no extension property, FR-031-AC-2 fixes the model count at nine so no `DecimalSpec` model can be added, and FR-031-CON-2 forbids an untyped payload. FR-034 then places the extension on the `scalar: number` type definition, where per-use precision/scale cannot live. TC-256 and TC-271 have no expressible input. | FR-031, FR-031-AC-2, FR-031-CON-2, FR-032, FR-032-AC-2, FR-034-AC-5, TC-256, TC-271 |
| FND-144 | medium | US-007-EX-4 and TC-263 expect the emitted `FieldDecl.json` to reject `multiplicity { lower: 1, upper: 0 }`. JSON Schema 2020-12 from the official emitter cannot express a cross-property comparison, and FR-031's `Multiplicity` states only `lower` at least 0: neither `upper >= lower` nor FR-027's `ordered`/`unique` with `upper <= 1` rule is restated for the grammar, so whether they hold at authoring time or only after lowering has two readings. | US-007-EX-4, FR-031, FR-033-AC-3, TC-263 |
| FND-145 | medium | `UnitSymbol` is "pattern-constrained" and FR-034 says the pattern "SHALL accept only case-sensitive UCUM unit symbols", while FR-034-AC-4 requires `kilograms` rejected and `kg`, `m/s`, `ms` accepted. A regex cannot decide UCUM membership (the IR uses `^[!-~]+$`, which accepts both `Kg` and `kilograms`); an enumerated symbol table or a UCUM parser is needed and neither is specified, so TC-270 has no defined oracle. | FR-031, FR-034, FR-034-AC-4, FR-027, TC-270, ERR-049 |
| FND-146 | medium | The allowed kernel inventory is not enumerable: FR-031-AC-2 says "exactly the nine grammar models plus the four support scalars/models", which excludes `EdgeCategory`, `ClauseLanguage`, and the `Versions` enum that FR-031 Behavior also requires; NFR-014 adds "the ARCH-005 list", but ARCH-005 lists concepts (semantic references, temporal instants, provenance, ...) not model names. TC-249 and TC-273 fail a conforming package or pass a non-conforming one depending on the reading. | FR-031, FR-031-AC-2, NFR-014, NFR-014-AC-1, TC-249, TC-273, EC-035 |
| FND-147 | medium | `OperationDecl.returns` is a `TypeRef`, so it may carry `unit`, but the IR `returns` object is `{ typeRef, multiplicity, nullable }` with no `unit`; that row must record `loss`, contradicting FR-034-AC-1, while `returns.nullable` has no grammar source. | FR-031, FR-028, FR-034, FR-034-AC-1, TC-267 |
| FND-148 | medium | No grammar model declares a type definition: `EnumValue` lowers to `variant` on an enum-kind type definition, but nothing holds an `EnumValue[]`, no alias or record declaration exists, and the "one archetype instance" that FR-034 takes as input is undefined. How a module declares the enum or alias types its fields reference is unspecified. | FR-031, FR-034, US-007 |
| FND-149 | medium | FR-034 names `agent-ix:identity` and "the field's documentation extension", but an IR `extension` requires `identity` (an `ix://` semantic identity), `version`, `required`, and `payload`. Neither extension's identity, version, `required` flag, nor payload shape is stated, so the exception clause of FR-034-AC-3 cannot be normalized. | FR-034, FR-034-AC-3, FR-020, TC-269 |
| FND-150 | medium | FR-033-AC-2 validates "the FR-006 `ConfigVersion` `FieldDecl[]` fixture" and FR-032-AC-5 analyses its rows, but no requirement produces it, no path or owner is stated (NFR-014 permits both `packages/semantic-core/**` and `fixtures/semantic/v1/**`), and an array cannot validate against the single-model `FieldDecl.json` without an unstated per-item rule. | FR-033, FR-033-AC-2, FR-034, FR-032-AC-5, TC-259, TC-262 |
| FND-151 | medium | FR-032-CON-1 requires the FR-025 compatibility classifier to classify a `KernelScalar` member addition or removal, but the classifier operates on IR documents in the compatibility corpus and the semantic-core package itself is never lowered to IR; the artifact the classifier compares is unstated. | FR-032-CON-1, FR-025, TC-260 |
| FND-152 | medium | `FieldDecl` cannot express `nullable`, a default, or a per-field namespaced extension (FR-027 routes quantity kind through one), so the grammar is strictly narrower than the IR it is the authoring grammar for; whether that narrowing is intended is not stated, and US-007 claims "nothing is dropped". | FR-031, FR-027, US-007-EX-2 |
| FND-153 | low | The `$id` base `https://schemas.agent-ix.org/semantic-core/<version>/` does not say whether `<version>` is a `Versions` member or the package semver; FR-031-AC-6 and TC-253 depend on it. The nine negative fixtures and the lowered FR-006 document have no stated location. | FR-033, FR-033-AC-1, FR-031-AC-6, FR-034, TC-253, TC-261, TC-263 |
| FND-154 | low | FR-032 asserts `String` `maxLength` is counted in code points and `Bytes` in length, a unit FR-029's `minLength`/`maxLength` operand never states; the two contracts can disagree on the same constraint. | FR-032, FR-029 |
| FND-155 | low | FR-034 says a `KernelScalar` "becomes the identity of a kernel scalar type definition", but `JsonObject` lowers to a record-kind definition; the identity scheme for kernel definitions in a package (`ix://<package>/type/UUID` in the fixture) is unstated, which is the double-declaration EC-033 names. | FR-034, FR-032, EC-033, TC-268 |
| FND-156 | low | The NFR-014 metric "`spike:typespec:check` diff = empty" has no case in TC-273..276 (only NFR-013's TC-234 runs it); FR-032-AC-4 rejects "a tenth member proposed as `Any`" without saying how the proposal is exercised (mutated program, fixture, or review); FR-034-AC-2's "both IR readers" is not defined in FR-031..034. | NFR-014, TC-273..276, FR-032-AC-4, TC-258, FR-034-AC-2 |
| FND-157 | low | Traceability housekeeping: FR-031 and FR-034 name FR-029 upstream in prose but not in frontmatter; FR-032 does the same for FR-020; FR-033 declares `depends_on` FR-030 with no stated reason; `spec/index.md` description still ends at "IR v1.1". | FR-031, FR-032, FR-033, FR-034, spec/index.md |

## Traceability Matrix

| US | FR/NFR | StR | Verification |
|---|---|---|---|
| US-007 (EX-1..4) | FR-031 (AC-1..6, CON-1..2) | StR-001 | TC-248..254 |
| US-007 | FR-032 (AC-1..5, CON-1) | StR-001 | TC-255..260 |
| US-007 | FR-033 (AC-1..5, CON-1..2) | StR-001 | TC-261..266 |
| US-007 | FR-034 (AC-1..5, CON-1) | StR-001 | TC-267..272 |
| US-007 | NFR-014 (AC-1..4, 5 metrics) | StR-001 | TC-273..276; spike-diff metric unmapped (FND-156) |

## Coverage Result

| Scope | Obligations | Matrix cases | Result |
|---|---|---|---|
| Issue #35 semantic-core grammar | 21 FR criteria, 6 FR constraints, 4 NFR criteria, 5 NFR metrics | TC-248..276 | Mapped except NFR-014 spike-diff metric; 3 high, 9 medium interpretation defects |
| Existing corpus | 247 cases | TC-001..247 | Untouched |
