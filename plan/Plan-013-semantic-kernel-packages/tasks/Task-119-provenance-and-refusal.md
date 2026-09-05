---
id: Task-119
title: "Provenance and the refusal path"
type: Task
status: todo
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-118"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-084"
    type: references
---
# Task-119: Provenance and the refusal path

## Scope

Record what produced each artifact, and refuse a construct no register row names rather than emitting a degraded type. The refusal is the feature: a package that silently widens a constrained field to a string is wrong in the direction nothing detects.

## Subtasks

- [ ] Implement the requirement's declared behaviour.
- [ ] Add the test cases `spec/tests.md` maps to it, and move each row from `🚧 planned` only once its test exists and runs.
- [ ] Falsify every gate this task adds: revert the behaviour and prove the gate fails.

## Deliverables

- The artifacts FR-084 declares, and the tests that back them.

## Notes

Publication is out of scope for every task in this plan. It passes
`agent-ix/quoin#290`, a human sign-off that has not moved.
