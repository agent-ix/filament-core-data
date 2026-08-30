---
id: Task-020
title: "Native builds and cross-language golden consumers"
type: Task
status: done
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-018"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/Task-019"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-017"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-114"
    type: verifies
---
# Task-020: Native builds and cross-language golden consumers

## Scope

Compile every generated native package, run ordinary import/construct/validate
consumers, and reconcile shared valid and invalid fixture meaning.

## Subtasks

- [x] Compile and execute TypeScript consumer.
- [x] Compile and execute Python/Pydantic consumer and standard-dataclass construction probe.
- [x] Compile and execute Rust/Serde consumer.
- [x] Validate shared positive/negative fixtures and cross-package imports.

## Deliverables

- `spikes/typespec-feasibility/generated/custom/*/consumer*`
- `spikes/typespec-feasibility/generated/fixtures/`
- `spikes/typespec-feasibility/evidence/validation.json`
