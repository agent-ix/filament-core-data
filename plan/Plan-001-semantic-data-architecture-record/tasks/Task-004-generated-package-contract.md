---
id: Task-004
title: "Generated package contract"
type: Task
status: done
track: B
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-003"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-005"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-017"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-018"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-019"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-020"
    type: verifies
---
# Task-004: Generated package contract

## Scope

Define the shared kernel plus independent module package topology and the typed
Rust, TypeScript, Python, and JSON Schema surfaces generated for consumers.

## Subtasks

- [x] Separate schema source, package metadata, exports, targets, mappings, and versions.
- [x] Define native Rust/Serde, TypeScript/validator, Python typed-model, and JSON Schema surfaces.
- [x] Reject decorators and custom Python `@` tags as schema-authoring sources.
- [x] Exclude UI, ORM, Tauri, and application persistence dependencies.
- [x] Document publication and compatibility responsibilities without selecting final registry names.

## Deliverables

- Generated package architecture document
- Package topology and consumer-surface tables

## Notes

- Exact generator feasibility remains gated by issue #4 and implementation by issues #5 and #11.
