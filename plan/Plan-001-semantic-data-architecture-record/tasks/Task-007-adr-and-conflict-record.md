---
id: Task-007
title: "ADR and conflict record"
type: Task
status: done
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-004"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/Task-005"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/Task-006"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-008"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-029"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-030"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-031"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-032"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-041"
    type: verifies
---
# Task-007: ADR and conflict record

## Scope

Write and index the four architecture decisions and a conflict register that
reconciles current Quire and module architecture without moving rendering or
cross-language generation into Quire.

## Subtasks

- [x] Accept concern-specific authority.
- [x] Accept compiler/generated-package ownership in `filament-core-data`.
- [x] Accept best-fit representation selection rather than one universal wire format.
- [x] Record TypeSpec as conditional with JSON Schema fallback and issue #4 resolution gate.
- [x] Disposition canonical Markdown, unified archetypes, rendering removal, generated Rust exclusion, and manifest-shape differences.

## Deliverables

- Four ADR documents and ADR index
- Quire/module conflict register with preserve, compatible, or supersede dispositions

## Notes

- Existing Quire ADR metadata says Proposed in places even where code/docs reflect the direction; record both status and observed implementation evidence.
