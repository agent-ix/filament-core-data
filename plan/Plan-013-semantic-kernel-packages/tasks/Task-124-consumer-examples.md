---
id: Task-124
title: "Independent consumer examples"
type: Task
status: todo
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-120"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/Task-121"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/Task-122"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-089"
    type: references
---
# Task-124: Independent consumer examples

## Scope

One consumer per language that imports the built package and exercises it, built outside the generating workspace so the example proves the package installs rather than that the source tree compiles.

## Subtasks

- [ ] Implement the requirement's declared behaviour.
- [ ] Add the test cases `spec/tests.md` maps to it, and move each row from `🚧 planned` only once its test exists and runs.
- [ ] Falsify every gate this task adds: revert the behaviour and prove the gate fails.

## Deliverables

- The artifacts FR-089 declares, and the tests that back them.

## Notes

Publication is out of scope for every task in this plan. It passes
`agent-ix/quoin#290`, a human sign-off that has not moved.
