---
id: Task-009
title: "Audit evidence contract and red tests"
type: Task
status: done
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/NFR-004"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-005"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-061"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-063"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-064"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-067"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-072"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-075"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-077"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-078"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-079"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-080"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-081"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-082"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-083"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-084"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-085"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-088"
    type: verifies
---
# Task-009: Audit evidence contract and red tests

## Scope

Define the normalized JSON evidence contract, explicit state/disposition enums,
cross-file identifiers, source-locus rules, determinism helpers, and read-only
changed-path gate as failing tests before census evidence exists.

## Subtasks

- [x] Define artifact manifests and invariant helpers in the Vitest suite.
- [x] Add negative fixtures for blank unknowns, duplicate IDs, orphan loci, false fit, implied approval, incomplete pagination, hidden low confidence, and drift marked ready.
- [x] Add normalized serialization/determinism checks.
- [x] Add changed-path and external-repository preservation checks.
- [x] Retain the expected red baseline before Task-010 authors evidence.

## Deliverables

- `test/contract-census.test.ts`
- `audit/filament-contract-census/README.md`
- Red TDD result: 9/9 audit tests failed only because required evidence/review files were absent

## Notes

- The validator may read examined repositories but must never write to them.
- This task unblocks every evidence-authoring task.
