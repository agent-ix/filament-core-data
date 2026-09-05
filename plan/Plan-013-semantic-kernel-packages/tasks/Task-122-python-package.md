---
id: Task-122
title: "Python kernel package"
type: Task
status: todo
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-119"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-087"
    type: references
---
# Task-122: Python kernel package

## Scope

Generate the Python kernel package through the qualified `datamodel-code-generator` route issue #23 established, rather than introducing a second hand-written generator.

## Subtasks

- [ ] Implement the requirement's declared behaviour.
- [ ] Add the test cases `spec/tests.md` maps to it, and move each row from `🚧 planned` only once its test exists and runs.
- [ ] Falsify every gate this task adds: revert the behaviour and prove the gate fails.

## Deliverables

- The artifacts FR-087 declares, and the tests that back them.

## Notes

Publication is out of scope for every task in this plan. It passes
`agent-ix/quoin#290`, a human sign-off that has not moved.
