---
id: Task-142
title: "Preserved IR v1.2 resume decision"
type: Task
status: todo
track: C
priority: P0
relationships:
  - { target: "ix://agent-ix/filament-core-data/Task-140", type: depends_on }
  - { target: "ix://agent-ix/filament-core-data/Task-141", type: depends_on }
  - { target: "ix://agent-ix/filament-core-data/FR-106", type: references }
---
# Task-142: Preserved IR v1.2 resume decision

## Scope

Reassess the preserved FCD #93 branch at `c95dff8` only after the producer and
consumer boundaries are accepted. Record whether it can rebase losslessly,
which fixtures migrate, and every refusal/loss record. Do not begin #93
implementation as part of this task.

## Exit conditions

- Record selected FCD and package-contract SHAs.
- Distinguish compatible rebase from loss/refusal.
- Keep the draft PR and preserved dependent work discoverable.

## Admission

Blocked until Task-140 and Task-141 complete under accepted contracts.
