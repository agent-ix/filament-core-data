---
id: Task-118
title: "JSON Schema lowering and anonymous-construct naming"
type: Task
status: todo
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-117"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-082"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-083"
    type: references
---
# Task-118: JSON Schema lowering and anonymous-construct naming

## Scope

Lower the published JSON Schema into semantic IR, and mint stable names for constructs the schema leaves anonymous. A minted name that changes between runs moves every downstream artifact, so the naming rule is deterministic and stated rather than incidental.

## Subtasks

- [ ] Implement the requirement's declared behaviour.
- [ ] Add the test cases `spec/tests.md` maps to it, and move each row from `🚧 planned` only once its test exists and runs.
- [ ] Falsify every gate this task adds: revert the behaviour and prove the gate fails.

## Deliverables

- The artifacts FR-082, FR-083 declares, and the tests that back them.

## Notes

Publication is out of scope for every task in this plan. It passes
`agent-ix/quoin#290`, a human sign-off that has not moved.
