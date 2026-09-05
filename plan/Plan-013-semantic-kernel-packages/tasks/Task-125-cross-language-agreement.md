---
id: Task-125
title: "Cross-language agreement through the conformance corpus"
type: Task
status: todo
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-124"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-090"
    type: references
---
# Task-125: Cross-language agreement through the conformance corpus

## Scope

Prove the three languages answer the same question the same way, measured through the existing conformance corpus and its independent oracle rather than a comparison written for this issue. SR-144 FND-1360: a comparison written beside the thing it compares tends to agree with it.

## Subtasks

- [ ] Implement the requirement's declared behaviour.
- [ ] Add the test cases `spec/tests.md` maps to it, and move each row from `🚧 planned` only once its test exists and runs.
- [ ] Falsify every gate this task adds: revert the behaviour and prove the gate fails.

## Deliverables

- The artifacts FR-090 declares, and the tests that back them.

## Notes

Publication is out of scope for every task in this plan. It passes
`agent-ix/quoin#290`, a human sign-off that has not moved.
