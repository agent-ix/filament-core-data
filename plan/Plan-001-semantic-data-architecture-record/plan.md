---
id: Plan-001
title: "Semantic data architecture record"
type: Plan
status: complete
relationships:
  - target: "ix://agent-ix/filament-core-data/StR-001"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-001"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-002"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-003"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-004"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-005"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-006"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-007"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-008"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-001"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-002"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-003"
    type: references
---
# Implementation Plan: Semantic data architecture record

## Requirements Summary

### Stakeholder Requirements

- [x] **StR-001:** Deliver one durable, reviewable governance record for semantic data authority, ownership, representations, compatibility, and unresolved decisions.

### Functional Requirements

- [x] **FR-001:** Provide an indexed, status-aware, acyclic architecture record.
- [x] **FR-002:** Assign authority by concern rather than universal format.
- [x] **FR-003:** Allocate compiler, Quire, Quoin, module, and consumer ownership.
- [x] **FR-004:** Define the metamodel, data planes, extension behavior, and stable identity.
- [x] **FR-005:** Define the core-plus-module generated-package contract.
- [x] **FR-006:** Define representations, mappings, profiles, transformations, failures, effects, and provenance.
- [x] **FR-007:** Define compatibility, feasibility, corpus review, roadmap, and human gates.
- [x] **FR-008:** Record ADRs and dispositions for existing architectural conflicts.

### Non-Functional Requirements

- [x] **NFR-001:** Keep navigation, status, links, conflicts, and supersession completely traceable.
- [x] **NFR-002:** Make the record standalone for maintainers and LLM agents.
- [x] **NFR-003:** Change documentation and validation evidence only.

## Dependency Graph

### Core dependency edges

- `Task-001 -> Task-002..Task-007`
  Reason: the contract tests establish the failing TDD baseline and required file/status vocabulary.
- `Task-002 -> Task-003, Task-004, Task-005, Task-006, Task-007`
  Reason: authority, terminology, and ownership are prerequisites for every specialized architecture document and ADR.
- `Task-003 -> Task-004, Task-005`
  Reason: package and representation guidance depend on the metamodel, identity model, and data planes.
- `Task-004 + Task-005 + Task-006 -> Task-007`
  Reason: the ADRs must decide and reconcile the package, representation, feasibility, compatibility, and gate content already documented.
- `Task-002..Task-007 -> Task-008`
  Reason: final navigation, standalone review, and non-disruption evidence require the complete bundle.

### Shared dependencies

- The status vocabulary and artifact manifest established by Task-001 are shared by every document and ADR.
- The glossary, authority matrix, and ownership table established by Task-002 are shared normative vocabulary; later tasks reference rather than redefine them.
- Existing Avro, Quire, Quoin, and module behavior is a dated compatibility baseline, not a mutable dependency of issue #8.

### Cross-cutting constraints

- `NFR-001` applies to every file, link, status, gate, conflict, and supersession edge.
- `NFR-002` applies to the root index and every normative or provisional document.
- `NFR-003` applies to every task and prohibits generated, runtime, database, publication, enforcement, and external-repository changes.

### The seams

The implementation adds `docs/semantic-data-system/` beside the existing Avro
schema and generated bindings. It extends `test/schema.test.ts` with a separate
architecture-contract suite and updates `README.md` only to link the record and
describe Avro as the current compatibility contract. It does not modify
`schema/`, `src/generated.ts`, or `agent_ix_core_data/`.

## Test Plan

### Static and Property Tests

- [x] **TC-001..004, TC-053:** Validate root inventory, statuses, gates, and acyclic supersession with positive and negative fixtures.
- [x] **TC-007..009, TC-013, TC-015, TC-017..020:** Validate derived-artifact labels, ownership columns, metamodel inventories, generated surfaces, and forbidden framework/decorator coupling.
- [x] **TC-023..024, TC-026, TC-029, TC-031..032:** Validate Markdown mapping coverage, loss/provenance, TypeSpec fallback, ADR inventory, Quire exclusions, and the conditional decision gate.
- [x] **TC-038..040:** Validate 100% required-artifact inventory, zero broken internal links, and exactly one allowed status.
- [x] **TC-045:** Validate the issue diff excludes runtime and generated source paths.
- [x] **TC-050:** Generate artifact path/view changes and prove declared semantic identity remains stable.

### Structured Architecture Review

- [x] **TC-005..006, TC-010..012:** Review authority and repository ownership boundaries.
- [x] **TC-014, TC-016, TC-049:** Review plane assignment, extension behavior, and identity categories.
- [x] **TC-021..022, TC-025, TC-027..028:** Review projection vocabulary, format fit, compatibility, corpus completeness, and program gates.
- [x] **TC-030, TC-033..037, TC-041..044:** Review conflict dispositions and demonstrate stakeholder/user and standalone-reader outcomes.
- [x] **TC-046..048:** Inspect release state, external repositories, and provisional-decision labeling.
- [x] **TC-051..052:** Review explicit transform outcomes, purity, and external effects.

### Entrance Criteria

- Reviewed requirements, 100% mapped Test Matrix, and all eight SpecReview artifacts validate.
- Existing runtime and generated files are captured as the no-change baseline.
- Current Quire and Quoin decisions are cited from dated repository artifacts.

### Exit Criteria

- All 53 matrix cases are marked passed with retained automated or review evidence.
- Current and transient Quire strict validation report zero grammar or structural findings attributable to this repository.
- The final diff changes only requirements, plans, reviews, architecture documentation, ADRs, tests, and the README link/description.

## Remaining Work

### Track A: Critical Path (serial)

- **A1 = Task-001** Architecture contract tests — Medium; exit: tests fail on missing architecture artifacts and reject invalid status, gate, link, provenance, identity, or supersession fixtures.
- **A2 = Task-002** Index, principles, authority, terminology, and ownership — Hard; exit: a reader can resolve every concern and owner without prior conversation.
- **A3 = Task-003** Metamodel and data planes — Hard; exit: definitions, occurrences, roles, kinds, planes, identity, and extension behavior are unambiguous.
- **A4 = Task-007** ADR and conflict record — Hard; exit: all four decisions and every known Quire conflict have one explicit status and disposition.
- **Gate = Task-008** Final architecture and non-disruption gate — measures traceability, standalone interpretation, and diff scope; pass: all 53 cases pass and zero runtime/generated paths change.

### Track B: Parallel after foundations

- **B1 = Task-004** Generated package contract — Medium; exit: Rust, TypeScript, Python, and JSON Schema packages have clear source, version, and dependency boundaries.
- **B2 = Task-005** Representations and transformations — Hard; exit: each format has a best-fit/non-use profile and transform loss, failure, provenance, and effects are explicit.
- **B3 = Task-006** Compatibility, feasibility, review, and roadmap — Hard; exit: every provisional or disruptive step resolves through a named evidence or human gate.

## Parallel Execution Summary

```text
Task-001 -> Task-002 -> Task-003 -> Task-004 --\
                          |       -> Task-005 ----> Task-007 -> Task-008
                          \--------> Task-006 --/
```

## Task File Mapping

| Task | Track | Owns (references) | Verified by (verifies) | Status |
|---|---|---|---|---|
| Task-001 | A | FR-001, NFR-001, NFR-003 | TC-001..004, TC-038..040, TC-045, TC-053 | done |
| Task-002 | A | StR-001, FR-002, FR-003 | TC-005..012, TC-033..035 | done |
| Task-003 | A | FR-004 | TC-013..016, TC-049..050 | done |
| Task-004 | B | FR-005 | TC-017..020 | done |
| Task-005 | B | FR-006 | TC-021..024, TC-051..052 | done |
| Task-006 | B | FR-007 | TC-025..028, TC-036..037 | done |
| Task-007 | A | FR-008 | TC-029..032, TC-041 | done |
| Task-008 | Gate | FR-001, NFR-001..003 | TC-042..048 | done |

## Coordination Rules

- One writer owns the architecture index and shared glossary at a time; specialized documents reference those definitions.
- No task edits the Avro schema, generated bindings, package versions, release workflows, databases, Quire/Quoin repositories, or consumer contracts.
- TypeSpec remains provisional until issue #4 passes; JSON Schema 2020-12 remains the named fallback.
- Avro remains readable until its consumer census and cutover gate pass.
- Task-007 starts only after Tasks 004..006 settle the content the ADRs record.
- Task-008 is a human go-or-hold merge gate; failing evidence returns the owning task to `in_progress` and does not weaken the requirement.
