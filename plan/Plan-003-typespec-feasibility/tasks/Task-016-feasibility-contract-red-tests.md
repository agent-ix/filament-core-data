---
id: Task-016
title: "Feasibility evidence contract and red tests"
type: Task
status: done
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/NFR-007"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-119"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-125"
    type: verifies
---
# Task-016: Feasibility evidence contract and red tests

## Scope

Define failing tests and typed evidence shapes for tools, capabilities, raw
commands, outputs, limitations, cost judgments, recommendation, isolation, and
human promotion before any TypeSpec source or emitter is implemented.

## Subtasks

- [x] Add exact TC/AC trace inventory for issue #4.
- [x] Define required experiment files and machine-readable evidence fields.
- [x] Reject absent/partial evidence, hidden failures, weakened gates, and canonical-path changes.
- [x] Run and retain the expected red baseline.

## Deliverables

- `test/typespec-feasibility.test.ts`
- `spikes/typespec-feasibility/README.md`
- Red-baseline record in the plan log
