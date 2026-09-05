---
id: Task-120
title: "TypeScript kernel package"
type: Task
status: todo
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-119"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-085"
    type: references
---
# Task-120: TypeScript kernel package

## Scope

Generate the TypeScript kernel package with its types, validator helpers and package metadata. Depends on nothing in React, Tauri, an ORM or an application package.

## Subtasks

- [ ] Implement the requirement's declared behaviour.
- [ ] Add the test cases `spec/tests.md` maps to it, and move each row from `🚧 planned` only once its test exists and runs.
- [ ] Falsify every gate this task adds: revert the behaviour and prove the gate fails.

## Deliverables

- The artifacts FR-085 declares, and the tests that back them.

## Notes

Publication is out of scope for every task in this plan. It passes
`agent-ix/quoin#290`, a human sign-off that has not moved.
