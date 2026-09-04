---
id: SR-033
title: "Scope review of the semantic IR v1.1 node shapes"
type: SpecReview
analysis: scope-boundary
scope: "spec/spec.md sections 2 and 4, US-006, FR-027..030, FR-020 (amended), NFR-013"
review_set: all
---
# Scope and boundary review

## Summary

Issue #34 owns the additive v1 → v1.1 revision of the semantic IR in
`filament-core-data`: the `field` multiplicity and unit shape, first-class
`relationships[]`, `operations[]`, and opaque `clauses[]` nodes, the closed
constraint keyword vocabulary, the `source.dialect` and manifest-target
bindings, and the golden and negative fixtures that pin each of them. It does
not own clause parsing (`agent-ix/quire-contract-ir#52`), verb vocabularies
(module repositories, quire-rs FR-040), the semantic-core TypeSpec models
(`agent-ix/filament-core-data#35`), the spec-bundle extraction frontend (issue
#36), any backend, the frozen TypeSpec spike, or any corpus repository;
config-service FR-006 is a read-only fixture. The ownership table in `spec.md`
section 4 and the out-of-scope list in section 2.2 state these boundaries
consistently. One boundary inside the repository is not allocated: the line
between the v1 schema and the v1.1 schema, which two acceptance criteria
currently pull in opposite directions.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-089 | high | The v1/v1.1 schema boundary is unallocated. The v1 positive fixture `fixtures/semantic/v1/positive/semantic-ir.json` carries the JSON Schema URI as `source.dialect`; FR-030-AC-2 rejects that value "under v1.1" while FR-027-AC-6 and NFR-013-AC-1 require every v1 positive fixture to validate unchanged under the v1.1 schema. No requirement names the discriminator (`contractVersion` `1.0.0` vs `1.1.0`, a second schema file, or a conditional) or says which file under `schema/semantic/v1/` is "the v1.1 schema"; NFR-013 permits edits only to `schema/semantic/v1/*.schema.json`, whose `contractVersion` const is `1.0.0`. | FR-030-CON-1, FR-030-AC-2, FR-027-AC-6, NFR-013-AC-1, NFR-013 Scope |
| FND-090 | medium | FR-028 copies the quire-rs FR-040 closed edge-category set verbatim into this repository's IR schema. The dependency is assumed, not guaranteed: no acceptance criterion, fixture, or integration test compares the IR enumeration with the FR-040 vocabulary as published by quire-rs, so a change on either side silently creates two authorities for the same closed set. | FR-028, spec.md section 4, `ix://agent-ix/quire-rs/FR-040` |
| FND-091 | medium | Ownership of the clause `language` registry is not allocated. The IR closes the set to `ocl`, `sysml`, `fretish` plus namespaced extensions, yet clause semantics and the frontends that read them belong to `agent-ix/quire-contract-ir#52`. Adding a first-class frontend language therefore requires an IR contract revision in this repository rather than a frontend addition in that one, and neither the requirement nor section 4 says which owner decides. | FR-028, FR-028-AC-6, spec.md section 2.2 |
| FND-092 | low | The three `Analysis`-verified criteria that express config-service FR-006 with zero declared loss have no named home artifact. The read-only boundary on the corpus is explicit, but where the worked-example evidence is recorded (a review under `spec/reviews/34-semantic-ir-v1-1/`, a docs page, or a fixture comment) is unstated, so the boundary between "corpus untouched" and "analysis delivered" cannot be checked by path. | FR-027-AC-7, FR-028-AC-8, FR-029-AC-6, US-006 |
| FND-093 | low | NFR-013's permitted-scope list is partly open-ended: "FR-020 and its sibling requirements" does not enumerate FR-027..030, and `contracts-v1.md` is named without its path (`docs/semantic-data-system/contracts-v1.md`). The changed-path gate in the Measurement table can therefore not be evaluated mechanically for the permitted side. | NFR-013 Scope, NFR-013-AC-4 |

## Boundary Allocation

| Concern | Owner | Class |
|---|---|---|
| IR v1.1 `field.multiplicity`, `field.unit`, derived `presence`/`nullable` (FR-027) | filament-core-data issue #34 | core |
| IR v1.1 `relationships[]`, `operations[]`, `clauses[]` node shapes and their diagnostics (FR-028) | filament-core-data issue #34 | core |
| Closed constraint keyword enumeration and per-keyword operand schemas (FR-029) | filament-core-data issue #34 | core |
| `source.dialect` enumeration and the single shared target enumeration (FR-030) | filament-core-data issue #34 | core |
| FR-020 type-system amendments that point at FR-027..029 | filament-core-data issue #34 | core |
| Golden and negative fixtures, existing-fixture suite, compatibility corpus entry v1 → v1.1 (NFR-013) | filament-core-data issue #34 | infrastructure |
| Additive-revision gate: spike byte-identity, backend and corpus changed-path gate (NFR-013) | filament-core-data issue #34 | cross-cutting |
| Clause text parsing, normalization, typechecking, clause ASTs | `agent-ix/quire-contract-ir#52` frontends | external |
| Relationship verb vocabularies | Module repositories, per quire-rs FR-040 | external |
| Edge category closed set | quire-rs FR-040 (restated here, see FND-090) | external |
| Semantic-core L3 TypeSpec grammar (`FieldDecl`, `RelationDecl`, `OperationDecl`, `ClauseRef`) | `agent-ix/filament-core-data#35` | external to this ticket |
| Spec-bundle extraction frontend that emits `source.dialect: spec-bundle` | Issue #36 | external to this ticket |
| Module contract and catalog behavior | `agent-ix/quoin#293` | external |
| Quire parsing, validation, extraction, byte-splice | quire-rs | external |
| config-service FR-006 `ConfigVersion` | config-service corpus, read-only fixture | external |
| Frozen TypeSpec spike, compiler backends, generated packages | Prior tickets and later tickets, frozen for #34 | external to this ticket |

## External Dependencies

| Dependency | Type | Assumed or Guaranteed | Contract |
|---|---|---|---|
| quire-rs FR-040 edge-category vocabulary | Cross-repo closed enumeration | Assumed (see FND-090) | `ix://agent-ix/quire-rs/FR-040`, no contract test named |
| quire-contract-ir#52 clause frontends | Downstream consumer of opaque `clauses[]` | Assumed | `sourceSpan` reuses common `sourceLocus`; FR-028-CON-2 forbids an AST in the IR |
| semantic-core grammar (#35) | Downstream consumer of the node shapes | Assumed | Shared golden and negative fixtures, FR-020-AC-8 |
| Issue #36 extraction frontend | Future producer of `source.dialect: spec-bundle` | Assumed | FR-030 enumeration value declared ahead of the producer |
| ADR-0005 TypeSpec structural source | Accepted decision | Guaranteed | FR-030-AC-2 diagnostic cites ADR-0005 |
| v1 positive fixtures and frozen spike | Regression baseline | Guaranteed | NFR-013-AC-1, NFR-013-AC-2 existing-fixture suite and byte comparison |
| config-service FR-006 | Read-only worked example | Assumed | NFR-013-AC-4 changed-path gate |

The out-of-scope list in `spec.md` section 2.2 and the NFR-013 prohibited list
agree with each other and with the boundary facts above. The findings concern
allocation inside the ticket (FND-089, FND-092, FND-093) and two places where a
closed vocabulary is stated in this repository but owned elsewhere (FND-090,
FND-091); none of them moves work into or out of issue #34.
