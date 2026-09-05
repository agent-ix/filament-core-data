---
id: Task-117
title: "Bundle declaration and the staleness gate"
type: Task
status: todo
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/FR-081"
    type: references
---
# Task-117: Bundle declaration and the staleness gate

## Scope

Declare what is generated, where it lands, and how staleness is detected. This task implements no generator: it is the committed artifact every later task reads, so that the target list is read at run time rather than restated in a module where it can drift.

## Subtasks

- [ ] Implement the requirement's declared behaviour.
- [ ] Add the test cases `spec/tests.md` maps to it, and move each row from `🚧 planned` only once its test exists and runs.
- [ ] Falsify every gate this task adds: revert the behaviour and prove the gate fails.

## Deliverables

- The artifacts FR-081 declares, and the tests that back them.

## Notes

Publication is out of scope for every task in this plan. It passes
`agent-ix/quoin#290`, a human sign-off that has not moved.
