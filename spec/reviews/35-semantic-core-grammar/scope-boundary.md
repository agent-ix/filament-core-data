---
id: SR-042
title: "Scope review of the semantic-core L3 declaration grammar"
type: SpecReview
analysis: scope-boundary
scope: "spec/spec.md sections 2 and 4, US-007, FR-031..034, NFR-014, docs/semantic-data-system/metamodel.md (ARCH-005 kernel section), docs/semantic-data-system/adr/0002-generated-package-ownership.md"
review_set: all
---
# Scope and boundary review

## Summary

Issue #35 owns the semantic-core L3 declaration grammar in TypeSpec under
`packages/semantic-core/` (`Multiplicity`, `TypeRef`, `FieldDecl`,
`ConstraintDecl`, `RelationDecl`, `OperationDecl`, `ClauseRef`, `EnumValue`),
the closed `KernelScalar` library and its representation table, the emitted
JSON Schema projection produced by the official `@typespec/json-schema`
emitter with the pinned issue #31 `$id` normalization, the `lowering.json`
table from every grammar property to its IR v1.1 node, and one lowered
FR-006 `ConfigVersion` fixture that proves the table. It also owns a
one-paragraph amendment each to ARCH-005 and ADR-0002 saying that "small"
includes the declaration grammar and that domain vocabulary stays in modules.
It does not own publication of `@agent-ix/semantic-core` (issue #11), the
spec-bundle extraction frontend that executes the lowering (issue #36), clause
parsing or typechecking (`agent-ix/quire-contract-ir#52`), the FR-040 verb
and category vocabulary (quire-rs), any module archetype (Wave 4 tickets,
`agent-ix/quoin#286`, `agent-ix/quoin#293`), the frozen spike, any backend,
or any corpus repository; config-service FR-006 is a read-only fixture, and
no custom emitter is admitted. `spec.md` sections 2.1, 2.2, and 4, US-007's
constraints, and NFR-014's permitted and prohibited lists state these outer
boundaries consistently. The findings below concern two lines inside the
ticket that are not allocated, the kernel-inventory allowlist that NFR-014
gates but nobody enumerates, and the lowering-table rows and emitted `$id`
values that reach across into issues #36 and #11.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-187 | high | The kernel inventory allowlist is unallocated. NFR-014 gates "kernel models outside the ARCH-005 list plus the nine grammar models and four support types" at zero via a compiled-program inventory, but the ARCH-005 list is six prose bullets (semantic and version references, temporal instants and intervals and clocks, provenance and evidence references, availability and staleness and support and loss states, namespaced extensions and annotations, typed result shapes), not model names, and FR-031 declares none of them. No requirement says whether `packages/semantic-core/` is the whole ARCH-005 kernel (in which case the ARCH-005 models are missing from FR-031..032 and owned by nobody) or only the grammar (in which case the NFR-014 allowlist should not name the ARCH-005 list at all). NFR-014-AC-1 cannot be evaluated until one owner enumerates the allowed model names. | NFR-014 Statement, NFR-014 Measurement, NFR-014-AC-1, FR-031-AC-2, ARCH-005 "Reusable semantic kernel" |
| FND-188 | medium | The `ClauseRef` → `clauses[]` lowering row straddles the #35/#36 boundary. FR-034 lowers `pre`/`post` clause identities to `clauses[]` "with their `text` supplied by the extractor", the extractor is issue #36, and the FR-006 fixture carries no operation or clause, so within this ticket the row's `loss: none` verdict rests on a property (`clauses[].text`) that no grammar model declares and no artifact in the ticket produces. Neither FR-034 nor FR-034-CON-1 says how the table records a property the frontend supplies rather than the grammar, or which owner asserts that row. | FR-034 Behavior, FR-034-CON-1, FR-034-AC-1, `fixtures/semantic/v1/positive/config-version-v1-1.json` |
| FND-189 | medium | Three closed vocabularies owned elsewhere are restated a second time in this repository with no contract test between the copies. `RelationDecl.category` restates the FR-040 seven-value set (quire-rs) already restated in the IR schema by FR-028, `ConstraintDecl` restates the FR-029 eleven-keyword set with per-keyword operands, and `ClauseLanguage` restates the FR-028 core language set whose ownership SR-033 FND-091 already left open. FR-031-AC-3 and FR-031-AC-4 test "exactly seven" and "exactly eleven" against a literal count, not against the IR schema enumeration or the quire-rs vocabulary, so the TypeSpec grammar, the IR schema, and quire-rs become three authorities for each set. | FR-031 Behavior, FR-031-AC-3, FR-031-AC-4, FR-028, FR-029, `ix://agent-ix/quire-rs/FR-040`, SR-033 FND-090 |
| FND-190 | medium | The extension identifiers the lowering depends on have no named owner. FR-034 lowers `FieldDecl.identity` to a namespaced `agent-ix:identity` extension, `FieldDecl.doc` to "the field's documentation extension" (unnamed), and `Decimal` to a `decimal` extension (un-namespaced, though FR-020's extension mechanism is namespaced); FR-032 lists "the quire-contract-ir bounded-type requirements" as an input for the same precision, scale, and length policies. Whether this ticket, FR-020, or `agent-ix/quire-contract-ir#53` registers those extension names is unstated, and FR-034-AC-3 excludes exactly those extensions from its fixture comparison, so the boundary is untested from both sides. | FR-034 Behavior, FR-034-AC-3, FR-034-AC-5, FR-032 Inputs, FR-032 Behavior (`Decimal`) |
| FND-191 | low | Publication concerns from issue #11 are baked into bytes this ticket commits. FR-033 fixes every emitted `$id` under `https://schemas.agent-ix.org/semantic-core/<version>/` while FR-031 keeps the package `private` until issue #11, and US-007-EX-1 has a module "importing `@agent-ix/semantic-core`", which requires the publication #11 owns. Nothing says whether the `$id` host and `<version>` segment are #35's decision or #11's, so a later publication choice would break FR-033-AC-4 byte identity retroactively. FR-033-CON-2 likewise assigns the removal of the #31 normalization to "the build" when issue #31 closes, with no ticket named as owner. | FR-031 Outputs, FR-033 Outputs, FR-033-AC-1, FR-033-AC-4, FR-033-CON-2, US-007-EX-1 |
| FND-192 | low | NFR-014's permitted-path list cannot be evaluated mechanically. It permits `reviews/**` although reviews live under `spec/reviews/**` (already covered by `spec/**`), permits both `test/**` and `tests/**` without saying which exists, and the FR-006 `FieldDecl[]` fixture that FR-032-AC-5 and FR-033-AC-2 depend on is named by role only, with no path, so the changed-path gate cannot confirm it lands inside a permitted directory. | NFR-014 Scope, NFR-014-AC-3, FR-033-AC-2, FR-032-AC-5 |

## Boundary Allocation

| Concern | Owner | Class |
|---|---|---|
| L3 declaration grammar models in `AgentIx.Semantic.Core` and the `@versioned` `Versions` enum (FR-031) | filament-core-data issue #35 | core |
| `Identifier`, `SemanticId`, `UnitSymbol`, `SourceLocus` support scalars and models (FR-031) | filament-core-data issue #35 | core |
| `KernelScalar` closed set and `kernel-scalars.json` representation table (FR-032) | filament-core-data issue #35 | core |
| Compatibility classification of a `KernelScalar` member change (FR-032-CON-1) | filament-core-data FR-025 classifier, exercised by #35 corpus entry | core |
| JSON Schema projection via the official emitter, `$id` normalization, `check` script, negative fixtures (FR-033) | filament-core-data issue #35 | infrastructure |
| `lowering.json` table and the lowered FR-006 `1.1.0` fixture (FR-034) | filament-core-data issue #35 | core |
| UCUM `UnitSymbol` pattern (FR-034) | filament-core-data issue #35 | core |
| ARCH-005 and ADR-0002 one-paragraph amendments (NFR-014-AC-2) | filament-core-data issue #35 | cross-cutting |
| Kernel scope gate, spike byte-identity, prohibited-path gate, official-emitter check (NFR-014) | filament-core-data issue #35 | cross-cutting |
| Kernel inventory allowlist by model name | Unallocated, see FND-187 | core |
| ARCH-005 kernel models other than the grammar (provenance, availability, result shapes, temporal intervals) | Unallocated, see FND-187 | core |
| `clauses[].text` for lowered clause references | Issue #36 extractor, see FND-188 | external to this ticket |
| Extension identifiers `agent-ix:identity`, documentation, `decimal` | Unallocated, see FND-190 | core |
| Lowering execution, `source.dialect: spec-bundle` producer | Issue #36 extraction frontend | external to this ticket |
| Publication of `@agent-ix/semantic-core`, `$id` host ownership | Issue #11, see FND-191 | external to this ticket |
| Clause text parsing, normalization, typechecking | `agent-ix/quire-contract-ir#52` frontends | external |
| Bounded-type requirements consumed by `KernelScalar` policies | `agent-ix/quire-contract-ir#53` | external |
| Relationship verb vocabulary and `EdgeCategory` closed set | quire-rs FR-040, restated here, see FND-189 | external |
| Constraint keyword set and operand schemas | filament-core-data FR-029 (issue #34), restated here, see FND-189 | core, prior ticket |
| IR v1.1 node shapes and readers (FR-027..030) | filament-core-data issue #34 | core, prior ticket |
| Module archetypes that import the grammar (`Entity`, `Endpoint`, `Process`, `Requirement`) | Wave 4 module tickets, `agent-ix/quoin#286` | external |
| `data_schema` by path and digest, module catalog | `agent-ix/quoin#293` | external |
| Quire parsing, validation, extraction, byte-splice | quire-rs | external |
| config-service FR-006 `ConfigVersion` | config-service corpus, read-only fixture | external |
| Frozen TypeSpec spike, `src/`, Avro schema, generated language packages, catalog pins | Prior and later tickets, frozen for #35 | external to this ticket |
| Issue #31 `$id` alias defect and its eventual removal | Issue #31, see FND-191 | external to this ticket |

## External Dependencies

| Dependency | Type | Assumed or Guaranteed | Contract |
|---|---|---|---|
| Pinned TypeSpec compiler and `@typespec/json-schema` emitter (ADR-0005) | Toolchain | Guaranteed | FR-031-AC-1 zero diagnostics, FR-033-AC-4 byte identity, FR-033-AC-5 recorded manifest |
| Issue #31 `$id` normalization | Pinned post-processing step | Guaranteed | FR-033-AC-5 manifest, FR-033-CON-2 removal rule (owner unstated, FND-191) |
| IR v1.1 schema and readers (FR-027..030) | Lowering target | Guaranteed | FR-034-AC-2 validation and zero reader diagnostics, FR-034-AC-3 fixture equality |
| FR-029 closed keyword set | Restated enumeration | Assumed (FND-189) | FR-031-AC-3 literal count only |
| quire-rs FR-040 edge categories | Cross-repo closed enumeration | Assumed (FND-189) | `ix://agent-ix/quire-rs/FR-040`, FR-031-AC-4 literal count only |
| FR-028 core clause language set | Restated enumeration | Assumed (FND-189, SR-033 FND-091) | None named |
| Issue #36 extraction frontend | Future consumer of the lowering table, supplier of `clauses[].text` | Assumed (FND-188) | FR-034 Behavior prose only |
| `agent-ix/quire-contract-ir#53` bounded-type requirements | Input to `KernelScalar` bounds policy | Assumed (FND-190) | None named |
| Issue #11 publication | Future publisher of the package and `$id` host | Assumed (FND-191) | FR-031 `private` flag, FR-033 `$id` prefix |
| Wave 4 module tickets, `agent-ix/quoin#293` | Downstream importers of `FieldDecl.json` | Assumed | US-007-EX-1 illustrative only |
| config-service FR-006 `ConfigVersion` | Read-only worked example | Assumed | NFR-014-AC-3 changed-path gate, FR-032-AC-5 analysis |
| Frozen spike and v1 fixtures | Regression baseline | Guaranteed | NFR-014 `spike:typespec:check` byte comparison, NFR-013 suite |

The out-of-scope list in `spec.md` section 2.2, the US-007 constraints, and
the NFR-014 prohibited list agree with each other and with the boundary facts
above; no finding moves work into or out of issue #35. FND-187 and FND-190
are allocations missing inside the repository, FND-188 and FND-191 are rows
and bytes that reach into issues #36 and #11, FND-189 repeats the SR-033
pattern of a closed set stated here but owned elsewhere, and FND-192 is a
path-list hygiene issue on the gate itself.
