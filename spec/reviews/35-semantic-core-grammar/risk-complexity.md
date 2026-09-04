---
id: SR-041
title: "Risk and complexity review of the semantic-core L3 declaration grammar"
type: SpecReview
analysis: risk-complexity
scope: "US-007, FR-031..034, NFR-014, spec/tests.md TC-248..276"
review_set: all
---
# Risk and complexity review

## Summary

Issue #35 adds a production TypeSpec package under `packages/semantic-core/`
(nine grammar models, a closed `KernelScalar` set, an official JSON Schema
projection with the issue #31 `$id` normalization, and a zero-loss lowering
table to IR v1.1) while leaving the frozen spike, every backend, and every
corpus repository untouched. The largest technical risks are acceptance
criteria that assign the official `@typespec/json-schema` emitter behaviour it
does not have (per-version output, cross-property validation, an
`additionalProperties: false` seal), a lowering fixture whose target document
already contains shapes the grammar cannot declare, and an inventory count that
the compiled program cannot meet. The largest volatility is in the four
vocabularies the kernel copies from contracts owned elsewhere and in the
toolchain layout (no pnpm workspace exists yet) that NFR-014 assumes.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-176 | high | FR-031-AC-6 / TC-253 require that a grammar addition under a new `Versions` member leaves "the prior version's emitted schema" byte-identical, but the pinned `@typespec/json-schema` 1.15.0 emitter is not version-aware: the frozen spike's `generated/official/json-schema/semantic.json` carries the v2-only `legacyLabel` in its single `artifact` schema, and `dist/src/json-schema-emitter.js` has no versioning hook. One emitted set per package means any addition changes the only schema there is; a per-version projection needs custom emitter code that NFR-014-AC-4 / TC-276 forbid. Decide the `<version>` semantics of the `$id` base (package semver vs `Versions` member) and reword AC-6 before plan generation. | FR-031 Behavior, FR-031-AC-6, FR-033 Outputs, NFR-014-AC-4, TC-253, TC-264, TC-276 |
| FND-177 | high | Two acceptance criteria put cross-property validation into the emitted schema that neither TypeSpec decorators nor the official emitter can produce: `TypeRef` targeting `Decimal` without a `decimal` extension must fail `TypeRef.json` (FR-032-AC-2 / TC-256), and `Multiplicity { lower: 1, upper: 0 }` must fail `FieldDecl.json` (US-007-EX-4 / TC-263). Worse, `TypeRef { target; multiplicity?; unit? }` as declared in FR-031 has no property that could carry the decimal `precision`/`scale`, so there is nothing for a schema to require even by hand. Either the grammar gains an `extensions` carrier and the checks move to a validator (a second reader the plan must build), or the two criteria are demoted to reader tests. | FR-031 Behavior, FR-032 Behavior, FR-032-AC-2, FR-034-AC-5, US-007-EX-4, TC-256, TC-263, TC-271 |
| FND-178 | high | TC-269 requires the lowered FR-006 document to equal `fixtures/semantic/v1/positive/config-version-v1-1.json` in normalized form, but that fixture already contains three shapes the grammar cannot declare: a type-level OCL clause (`config-version-immutable`) on a record with zero operations, while the grammar reaches `clauses[]` only through `OperationDecl.pre`/`post`; an `alias` type `VersionNumber` carrying a `min` constraint, while the grammar has no alias declaration and FR-034 lowers field constraints to `appliesTo` = the field's shared type identity (which would constrain every `Integer` field, not one); and kernel scalars re-declared as `ix://agent-ix/config-service/type/UUID` etc. under an unstated identity-minting rule. The parity test is unreachable from the grammar as written. | FR-031 Behavior, FR-034 Behavior, FR-034-AC-3, TC-268, TC-269, EC-033 |
| FND-179 | medium | FR-033 encodes two emitter behaviours the pinned toolchain does not exhibit: (a) "SHALL set `additionalProperties: false` on every model (`seal-object-schemas`)", while the official seal emits `unevaluatedProperties: {"not": {}}` (spike `Relation`, `Provenance`); (b) "including the shared `Record<string>` helper after the pinned #31 normalization", while no FR-031 model uses `Record<string>` (FR-031-CON-2 forbids it and `JsonObject` is an enum member), so the helper is never emitted and TC-265 / TC-266 pin a step that rewrites nothing. A literal test of (a) fails on day one; fixing it inside the normalization step turns a validation-only alias into a schema rewrite, which FR-033-CON-2 says must be removed, not grown. | FR-033 Behavior, FR-033-CON-2, FR-033-AC-2, TC-262, TC-265, TC-266, EC-032 |
| FND-180 | medium | `ConstraintDecl` "as a union discriminated on the FR-029 keyword set" has two TypeSpec encodings with different emitted shapes: a `union` declaration emits `anyOf` of eleven variants with no `discriminator`, while a `@discriminator("keyword")` model hierarchy emits `oneOf` under `polymorphic-models-strategy` with the discriminator property forced into `required`. The IR groups the same keywords into five operand-shape `oneOf` branches. Keyword names and operand shapes are therefore copied by hand from FR-029 and `semantic-ir.schema.json` into a third place with no contract test comparing them, unlike the category set (FR-028-AC-12). | FR-031 Behavior, FR-031-AC-3, FR-029 Behavior, FR-034 Behavior, TC-250 |
| FND-181 | medium | FR-031-AC-2 and NFR-014 count "exactly the nine grammar models plus the four support scalars/models", but compiling the grammar necessarily declares more: `Versions`, `EdgeCategory`, `ClauseLanguage`, and (under either FND-180 encoding) eleven per-keyword variant models and their operand models. TC-249 / TC-273 as worded fail immediately, and the only way to pass is to widen the allowed inventory by hand, which is exactly the "support type" smuggling channel EC-035 names. The inventory must be an explicit list, not a count. | FR-031-AC-2, NFR-014 Measurement, NFR-014-AC-1, TC-249, TC-273, EC-035 |
| FND-182 | medium | NFR-014 permits `package.json`/`pnpm-lock.yaml` changes "only for the `packages/semantic-core` workspace entry", but the repository has no `pnpm-workspace.yaml` and a single lockfile importer (`.`) whose devDependencies include `file:spikes/typespec-feasibility/emitter`. Creating a workspace adds a file outside the permitted list and re-resolves the lockfile for the spike's `file:` importer, and `test/typespec-feasibility.test.ts` (TC-123..124) hard-codes an allowed-path list without `packages/`, so the branch trips the existing guard before TC-275 runs. The alternative (a plain subdirectory compiled with the root's pinned compiler) satisfies FR-031-CON-1 without a workspace at all. | NFR-014 Scope, NFR-014-AC-3, FR-031 Outputs, FR-031-CON-1, TC-254, TC-275 |
| FND-183 | medium | FR-034 is specified as a table plus a fixture, but TC-268 and TC-269 need a lowered document that "both IR readers" accept, and no requirement asks anyone to build the lowerer that produces it. A hand-authored lowered fixture is not evidence that the table is complete; the IR-required properties with no grammar source (`identity`, `origin`, `presence`, `nullable`, `defaultKind`, `diagnosticCode`, `returns.nullable`, `clause.text`) are synthesized by whatever writes that file, and FR-034-CON-1 checks only the grammar-to-IR direction. | FR-034 Outputs, FR-034-AC-1, FR-034-AC-2, FR-034-CON-1, TC-267, TC-268, TC-269, EC-034 |
| FND-184 | medium | Four vocabularies the kernel closes are owned elsewhere or not yet stable: `EdgeCategory` (quire-rs FR-040), the `ClauseLanguage` core set (`agent-ix/quire-contract-ir#52`, unbuilt), the `KernelScalar` bounds policy ("quire-contract-ir bounded-type requirements", #53, unbuilt), and a UCUM `UnitSymbol` regex that no standard supplies. Each is frozen into a `@versioned` package whose additive/breaking classification (FR-032-CON-1) lives in test code, so every upstream change is a package version plus a classifier case, and the first module tickets (`quoin#286`) consume the package before those contracts exist. | FR-031 Behavior, FR-032 Inputs, FR-032-CON-1, FR-034 Behavior, FR-034-AC-4, TC-251, TC-260, TC-270 |
| FND-185 | low | FR-031 lists `SourceLocus` and `SemanticId` as support types without shapes. The spike precedent defines `SourceLocus { repository; revision; path; line? }` and `SemanticId` as `^[a-z][a-z0-9-]*:\S+$`, while IR v1.1 requires `sourceLocus { sourceIdentity; path; startLine; startColumn }` and identities matching `^ix://`. Carrying the spike shapes forward makes `ClauseRef.sourceSpan` and every `target` lossy, which FR-034-CON-1 would report as `loss` and fail. | FR-031 Behavior, FR-034 Behavior, FR-034-CON-1, TC-267, TC-270 |
| FND-186 | low | FR-033-CON-1 promises byte-for-byte reproducibility "on any host", but TC-264 regenerates twice on one host; nothing exercises a second platform, and the emitter's file ordering and `$id` derivation are pinned only by the same lockfile that the FND-182 workspace change re-resolves. Inspection-strength until the plan runs the `check` script in CI. | FR-033-CON-1, FR-033-AC-4, TC-264 |

## Risk Register

| Req | Tech Risk | Volatility | Drivers | Mitigation |
|---|---|---|---|---|
| US-007 | Medium | Medium | Aggregates FR-031..034; EX-2 and EX-4 assume schema-side checks the emitter cannot make | Re-illustrate EX-2/EX-4 against a reader, not `FieldDecl.json` (FND-177) |
| FR-031 | High | Medium | Version-unaware emitter vs AC-6; `ConstraintDecl` encoding choice; inventory count; borrowed `EdgeCategory`/`ClauseLanguage` | Decide `$id` version semantics and the union encoding first (FND-176, FND-180); replace the model count with an explicit allowed-inventory list (FND-181); contract test both copied vocabularies against FR-029/FR-028 |
| FR-032 | Medium | High | `Decimal` extension has no carrier on `TypeRef`; bounds policy references unbuilt quire-contract-ir requirements; classifier in test code | Add the extension carrier or move AC-2 to a reader test (FND-177); record bounds as this package's own policy until #53 exists (FND-184) |
| FR-033 | High | Low | Seal keyword and #31 helper assumptions contradict the spike output; cross-host reproducibility untested | Reword the seal clause to the emitter's actual keyword and scope the #31 step to "if emitted" (FND-179); run `check` in CI on two platforms (FND-186) |
| FR-034 | High | Low | Fixture contains type-level clause, alias constraint, and package-local kernel identities the grammar cannot express; no lowerer is specified; support-type shapes lossy | Choose the fixture-parity target before writing the table: either extend the grammar (type-level `ClauseDecl`, alias/`TypeDecl`) or write a new FR-006 fixture from the grammar (FND-178); name the lowerer and the synthesis rules (FND-183); define `SourceLocus`/`SemanticId` in IR form (FND-185) |
| NFR-014 | Medium | Medium | No workspace exists; existing allowed-path guard lacks `packages/`; inventory metric is a count | Prefer a non-workspace subdirectory under the root's pinned compiler (FND-182); allowed-inventory list (FND-181) |

## Top hazards

1. FND-176 - the official emitter emits one schema set across all `Versions` members; FR-031-AC-6 is unsatisfiable without custom emitter code that NFR-014 prohibits.
2. FND-178 - the parity fixture already holds a type-level clause, an alias constraint, and package-local kernel identities the grammar cannot produce; TC-269 fails by construction.
3. FND-177 - two schema-side rejections (`Decimal` extension, `upper < lower`) have no expressible schema and, for `Decimal`, no property to carry the extension.
4. FND-181 / FND-182 - two gates that fail on day one for structural reasons: the model count and the existing changed-path allowlist.
5. FND-184 - four borrowed vocabularies frozen into a versioned kernel ahead of the contracts that own them.

## Risk Ranking

| Rank | Area | Control |
|---:|---|---|
| 1 | Versioned emission under a version-unaware emitter | `$id` version semantics decided and AC-6 reworded before Plan generation |
| 2 | Lowering fixture parity | Fixture-parity target chosen; grammar extended or fixture regenerated from the grammar; lowerer named |
| 3 | Schema-side validation the emitter cannot produce | Extension carrier on `TypeRef`; cross-property checks moved to reader tests |
| 4 | Inventory and changed-path gates | Explicit allowed-inventory list; `packages/` path decision reconciled with `test/typespec-feasibility.test.ts` |
| 5 | Emitter-behaviour assumptions in FR-033 | Seal keyword and #31 step reworded against the spike output |
| 6 | Borrowed vocabularies | Contract tests against FR-028/FR-029; bounds recorded as package-owned until #53 lands |

## Failure-domain gaps

The issue-#35 failure-domain review (SR-037,
`spec/reviews/35-semantic-core-grammar/failure-domain.md`) records FND-130..140.
The gaps that also raise risk here are FND-130/131/136 (identity minting and
constraint scope, FND-178), FND-132 (schema-side cross-property checks,
FND-177), FND-133/134 (IR-required properties without grammar source and
clause reconstitution, FND-183), FND-138 (#31 helper never emitted, FND-179),
and FND-139/140 (version-to-`$id` binding and UCUM regex, FND-176 and
FND-184). SR-037 FND-139 states the emitter "writes one directory per
version"; the spike output on disk shows a single schema set carrying the
v2-only `legacyLabel`, which is the basis for FND-176 here. Edge cases
EC-032..035 in `spec/tests.md` remain open pending implementation.
