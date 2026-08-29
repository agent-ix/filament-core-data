---
id: Task-006
title: "Compatibility and roadmap gates"
type: Task
status: done
track: B
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-002"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-007"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-025"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-026"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-027"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-028"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-036"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-037"
    type: verifies
---
# Task-006: Compatibility and roadmap gates

## Scope

Document schema evolution, TypeSpec feasibility/fallback, corpus-review method,
staged adoption roadmap, rollback evidence, and every human promotion gate.

## Subtasks

- [x] Define patch, additive, and breaking changes across all generated targets.
- [x] Define field, rename, removal, enum, unknown-field, and Protobuf reservation rules.
- [x] Define the TypeSpec capability matrix and modular JSON Schema 2020-12 fallback.
- [x] Define machine-readable corpus inventory, finding, disposition, and impact-band outputs.
- [x] Define reader-before-writer waves and compatibility, advisory, database, publication, and cutover gates.

## Deliverables

- Compatibility policy
- TypeSpec feasibility gate document
- Corpus-review method
- Staged program roadmap

## Notes

- A high corpus failure rate closes the gate; it does not automatically weaken the contract.
- Avro remains a compatibility representation until all known consumers pass cutover.
