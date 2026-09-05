---
id: Task-123
title: "Modular JSON Schema index"
type: Task
status: todo
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-119"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-088"
    type: references
---
# Task-123: Modular JSON Schema index

## Scope

Index the JSON Schema target rather than copying it: the index names the files the grammar already publishes, so there is one copy of each schema and no second copy to drift.

## Subtasks

- [ ] Implement the requirement's declared behaviour.
- [ ] Add the test cases `spec/tests.md` maps to it, and move each row from `🚧 planned` only once its test exists and runs.
- [ ] Falsify every gate this task adds: revert the behaviour and prove the gate fails.

## Deliverables

- The artifacts FR-088 declares, and the tests that back them.

## Notes

Publication is out of scope for every task in this plan. It passes
`agent-ix/quoin#290`, a human sign-off that has not moved.
