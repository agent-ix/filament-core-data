---
id: Task-126
title: "Determinism, portability and non-disruption gates"
type: Task
status: todo
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-125"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/NFR-028"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-029"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-030"
    type: references
---
# Task-126: Determinism, portability and non-disruption gates

## Scope

Assert byte-identical regeneration, portability of the published surfaces, and that every prohibited path is byte-unchanged. The non-disruption gate is stated over the tree, never as a diff against a moving ref: that family has cost this campaign eight instances.

## Subtasks

- [ ] Implement the requirement's declared behaviour.
- [ ] Add the test cases `spec/tests.md` maps to it, and move each row from `🚧 planned` only once its test exists and runs.
- [ ] Falsify every gate this task adds: revert the behaviour and prove the gate fails.

## Deliverables

- The artifacts NFR-028, NFR-029, NFR-030 declares, and the tests that back them.

## Notes

Publication is out of scope for every task in this plan. It passes
`agent-ix/quoin#290`, a human sign-off that has not moved.
