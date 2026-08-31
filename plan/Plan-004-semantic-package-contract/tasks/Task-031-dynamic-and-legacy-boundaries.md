---
id: Task-031
title: "Dynamic and legacy boundaries"
type: Task
status: done
track: B
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-026"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/Task-030"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-026"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-171"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-172"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-173"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-174"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-175"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-176"
    type: verifies
---
# Task-031: Dynamic and legacy boundaries

## Scope

Define dynamic/static consumer policy and versioned legacy adapter contracts,
then prove current Quoin manifest and Avro fixtures remain valid without rewrite
or semantic widening.

## Subtasks

- [x] Define preserve/reject/surface policies for unknown modules and extensions.
- [x] Define adapter source/target versions, preservation, omissions, diagnostics, and retirement prerequisites.
- [x] Record unchanged current Quoin manifest and Avro bridge fixtures as compatibility controls.
- [x] Verify missing versions, imports, adapters, and contradictory identities cannot yield empty success.

## Deliverables

- Legacy adapter and consumer-policy schemas.
- Quoin/Avro bridge evidence fixtures and ownership record.

## Notes

- This task reads external/current corpora as controls and does not rewrite or publish them.
