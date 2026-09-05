---
id: Task-121
title: "Rust kernel crate"
type: Task
status: todo
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-119"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-086"
    type: references
---
# Task-121: Rust kernel crate

## Scope

Generate the Rust kernel crate with Serde derives and pinned dependencies. Carries issue #21's unresolved pattern gap: RE2 cannot compile the published `sourceLocus` pattern, and this task must not close that by weakening what #21 refused to weaken.

## Subtasks

- [ ] Implement the requirement's declared behaviour.
- [ ] Add the test cases `spec/tests.md` maps to it, and move each row from `🚧 planned` only once its test exists and runs.
- [ ] Falsify every gate this task adds: revert the behaviour and prove the gate fails.

## Deliverables

- The artifacts FR-086 declares, and the tests that back them.

## Notes

Publication is out of scope for every task in this plan. It passes
`agent-ix/quoin#290`, a human sign-off that has not moved.
