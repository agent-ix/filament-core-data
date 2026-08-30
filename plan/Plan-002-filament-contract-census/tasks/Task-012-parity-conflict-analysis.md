---
id: Task-012
title: "Parity and conflict analysis"
type: Task
status: done
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-011"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-011"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-064"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-065"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-066"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-067"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-068"
    type: verifies
---
# Task-012: Parity and conflict analysis

## Scope

Group inventory records by semantic concept, compare fields and behavior across
representations, assign exactly one allowed fit disposition, and publish all
material mismatches or not-comparable results.

## Subtasks

- [x] Define concept-family groups and comparison dimensions.
- [x] Compare types, names, optionality, defaults, identity, versions, provenance, lifecycle, relationships, and transformation loss.
- [x] Default incomplete equivalence evidence to conflict/unknown, never fit.
- [x] Record missing-contract and representation-local findings.
- [x] Reuse and disposition `filament-core-service#1` through `#4`.

## Deliverables

- `audit/filament-contract-census/parity.json`
- `audit/filament-contract-census/conflicts.json`
- `audit/filament-contract-census/missing-contracts.json`
- `audit/filament-contract-census/parity.md`

## Notes

- This task diagnoses; it does not select replacement types or modify sources.
