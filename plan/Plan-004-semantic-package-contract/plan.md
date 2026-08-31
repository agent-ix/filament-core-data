---
id: Plan-004
title: "Semantic IR, package, projection, and compatibility contract"
type: Plan
status: active
relationships:
  - target: "ix://agent-ix/filament-core-data/StR-001"
    type: references
  - target: "ix://agent-ix/filament-core-data/US-005"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-019"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-020"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-021"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-022"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-023"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-024"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-025"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-026"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-008"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-009"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-010"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-011"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-012"
    type: references
---
# Implementation Plan: Semantic IR, package, projection, and compatibility contract

## Requirements Summary

### Stakeholder and User Requirements

- [ ] **StR-001:** Extend durable governance with an executable, reviewable semantic-contract boundary and explicit disruption gates.
- [ ] **US-005:** Let authors define portable semantic packages once and consume faithful Markdown, data, wire, and language projections.

### Functional Requirements

- [x] **FR-019:** Select modular JSON Schema 2020-12 provisionally and define the versioned semantic IR envelope.
- [x] **FR-020:** Define structural kinds, orthogonal roles, stable identities, presence, recursion, constraints, and extensions.
- [x] **FR-021:** Define package manifests, exports, profiles, locks, and canonical fingerprints.
- [x] **FR-022:** Define mappings, representation profiles, transformations, effects, preservation, and loss.
- [x] **FR-023:** Define representation-specific Markdown, JSON, SQL, Protobuf, Avro, Arrow/Parquet, and delimited contracts.
- [x] **FR-024:** Define one compiler boundary and qualified Rust, TypeScript, Python, JSON Schema, manifest, and diagnostic contracts.
- [x] **FR-025:** Define semantic, profile, mapping, and target compatibility classification.
- [x] **FR-026:** Preserve dynamic modules, finite generated packages, Quoin manifests, and the Avro bridge.

### Non-Functional Requirements

- [x] **NFR-008:** Make every locked contract transformation deterministic, offline, and reproducible.
- [x] **NFR-009:** Require exact cross-language fixture verdict and canonical-value parity.
- [x] **NFR-010:** Treat every schema and generator input as hostile and bound all effects and traversal.
- [x] **NFR-011:** Publish sufficient schemas and examples for independent implementations and governed extensions.
- [ ] **NFR-012:** Change no runtime, consumer, database, catalog, package, or enforcement surface and require human source promotion.

## Dependency Graph

```text
Task-024 -> Task-025 -> Task-026 -> Task-027 -> Task-028 --\
                    \             \                        \
                     \             +------------------------+-> Task-032 -> Task-033
                      +-> Task-029 -> Task-030 -> Task-031 --/
                           ^             ^          ^
                           +-------------+----------+
```

- Task-024 fixes the executable red contract and prohibited-path guard before artifact implementation.
- Task-025 establishes the shared version, identity, type, diagnostic, and extension vocabulary.
- Task-026 consumes the core vocabulary for manifests, graphs, locks, and fingerprints.
- Task-027 consumes package identities for mappings and profiles; Task-028 adds representation-specific refinements.
- Task-029 can proceed after the core vocabulary on a disjoint schema family; it defines backend inputs/outputs without implementing a backend.
- Task-030 joins type, mapping, and target metadata to classify compatibility.
- Task-031 joins package locks and compatibility with explicit dynamic and legacy adapters.
- Task-032 validates the complete public contract across determinism, parity, security, portability, and non-disruption.
- Task-033 is the sole normative-merge gate and cannot pass by automation or by inference from implementation success.

### Cross-cutting constraints

- NFR-008 constrains source normalization, locks, fingerprints, output manifests, diagnostics, and compatibility reports.
- NFR-009 constrains the core semantic model and target-contract fixture expectations; it does not authorize generator implementation.
- NFR-010 constrains schemas, filenames, examples, references, options, and any test-only reader or validator.
- NFR-011 requires all public envelopes to be independently readable from versioned schemas and examples.
- NFR-012 prohibits edits to `src/`, `schema/avro/`, current generated bindings, package exports, consumers, catalogs, databases, and external repositories.

## The Seams

New normative contracts attach under `schema/semantic/v1/`, with examples and
conformance cases under `fixtures/semantic/v1/` and human guidance under
`docs/semantic-data-system/`. Contract tests attach to the existing Vitest
suite but must not import or change `src/generated.ts` or
`schema/avro/core-data.avpr`. The TypeSpec spike is retained evidence only;
production compiler/codegen lives in the separate reusable AGPL campaign.

## Test Plan

- [x] **TC-130..140:** proposed source, IR envelope, type shapes, identities, presence, recursion, extensions, and unknown policy.
- [x] **TC-141..146, TC-201:** deterministic package graph, conflicts, profiles, extensions, ownership, and canonical fingerprint.
- [x] **TC-147..152:** mapping/profile separation, transformation kinds, loss, lens laws, effects, and result states.
- [x] **TC-153..158:** representation contract inventory plus Markdown, Protobuf, SQL, columnar, and delimited boundaries.
- [x] **TC-159..164, TC-200:** compiler/target/output/diagnostic envelopes, prohibited dependencies, backend qualification, and AGPL ownership.
- [x] **TC-165..170:** complete change corpus, most-restrictive disposition, unknown policies, authority/loss, consumers, and Avro bridge.
- [x] **TC-171..176:** dynamic/static identity parity, unknown modules, Quoin legacy manifests, Avro bridge, failure, and ownership.
- [x] **TC-177..184:** isolated reproducibility, offline operation, manifest reconciliation, path normalization, and cross-target parity.
- [x] **TC-185..194, TC-202:** output isolation, network denial, hostile payloads, dependency provenance, public schemas, independent reading, extensions, and bounded termination.
- [x] **TC-195..198:** changed-path, current-suite, non-publication, and downstream-gate protection.
- [ ] **TC-199:** named human accepts or holds the proposed v1 source before normative merge.

### Entrance Criteria

- Issue #4 evidence recommends modular JSON Schema 2020-12 and retains TypeSpec as non-authoritative.
- US-005, FR-019..026, NFR-008..012, TC-130..202, and SR-017..024 validate with Quire.
- Existing Avro schema, generated source, package surface, and external repositories are read-only controls.

### Exit Criteria

- Every public contract has a versioned schema plus positive and negative examples.
- All 72 automated/static/analysis cases pass without production compiler or consumer changes.
- Existing tests and Avro/module fixtures remain unchanged and passing.
- Code review and gap analysis report no blocking finding.
- TC-199 contains a named human decision; only then may the normative contract merge.

## Remaining Work

### Track A: Critical Path (serial)

- **A1 = Task-024** Contract red tests and scope guard — Medium; exit: every absent contract fails for its intended reason and prohibited paths are guarded.
- **A2 = Task-025** Semantic IR and type schemas — Hard; exit: the complete type and identity vocabulary validates positive and adverse examples.
- **A3 = Task-026** Package graph, lock, and fingerprint — Hard; exit: order-independent graph resolution and canonical fingerprint fixtures agree.
- **A4 = Task-027** Mapping, profile, and transformation schemas — Hard; exit: loss, effects, lens laws, and result states are explicit and validated.
- **A5 = Task-028** Representation contracts — Medium; exit: every named representation has exact required metadata and boundary fixtures.

### Track B: Parallel after the core model

- **B1 = Task-029** Compiler boundary and target contracts — Hard; exit: independent hypothetical backends share one safe input/output/diagnostic contract without any backend implementation.
- **B2 = Task-030** Compatibility contract and corpus — Hard; exit: every change family has a deterministic most-restrictive expected disposition.
- **B3 = Task-031** Dynamic and legacy boundaries — Medium; exit: shared identities and explicit adapters preserve current Quoin/Avro inputs without widening.

### Track C: Join and gates

- **C1 = Task-032** Cross-contract conformance and assurance — Hard; exit: all automated evidence, unchanged-suite checks, and non-disruption gates pass.
- **Gate = Task-033** Human normative-source decision — measures acceptance of the proposed authority boundary; pass: a named human records accept or hold before merge.

## Parallel Execution Summary

```text
time ->  Task-024 -> Task-025 -> Task-026 -> Task-027 -> Task-028 --\
                              Task-029 -> Task-030 -> Task-031 -------+-> Task-032 -> [human Task-033]
```

## Task File Mapping

| Task | Track | Owns (references) | Verified by (verifies) | Status |
|---|---|---|---|---|
| Task-024 | A | NFR-012 | TC-195, TC-198 | done |
| Task-025 | A | FR-019, FR-020, NFR-011 | TC-130..140 | done |
| Task-026 | A | FR-021 | TC-141..146, TC-201 | done |
| Task-027 | A | FR-022 | TC-147..152 | done |
| Task-028 | A | FR-023 | TC-153..158 | done |
| Task-029 | B | FR-024 | TC-159..164, TC-179..180, TC-184, TC-200 | done |
| Task-030 | B | FR-025 | TC-165..170 | done |
| Task-031 | B | FR-026 | TC-171..176 | done |
| Task-032 | C | NFR-008..012 | TC-177..178, TC-181..198, TC-202 | done |
| Task-033 | Gate | StR-001, US-005, NFR-012 | TC-199 | blocked |

## Coordination Rules

- Freeze version names, stable identity grammar, diagnostic codes, canonical bytes, and extension vocabulary after Task-025; changes require rerunning every downstream fixture.
- Keep schema-family ownership single-writer: core, package, mapping, representation, target, compatibility, and legacy files have one owning task.
- Do not copy spike emitters into production or add a compiler/runtime dependency; test-only independent readers must be visibly test-scoped.
- Do not edit current Avro, generated source, exports, publishing configuration, catalog pins, databases, consumers, or external repositories.
- Do not begin legacy retirement or weaken any reader-retirement prerequisite.
- A specialized representation remains described but unselected unless a concrete consuming boundary supplies its own gate.
- Merge sequencing is Task-024 through Task-032 on the isolated branch, then review/gap analysis, then the named Task-033 decision. A failed or held decision preserves the evidence branch and does not cascade downstream.
