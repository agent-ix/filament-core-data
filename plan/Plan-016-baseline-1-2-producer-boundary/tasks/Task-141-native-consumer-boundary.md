---
id: Task-141
title: "Native consumer static and assessment boundary"
type: Task
status: todo
track: B
priority: P0
relationships:
  - { target: "ix://agent-ix/filament-core-data/Task-140", type: depends_on }
  - { target: "ix://agent-ix/filament-core-data/FR-102", type: references }
  - { target: "ix://agent-ix/filament-core-data/FR-103", type: references }
  - { target: "ix://agent-ix/filament-core-data/TC-1362", type: verifies }
  - { target: "ix://agent-ix/filament-core-data/TC-1363", type: verifies }
---
# Task-141: Native consumer static and assessment boundary

## Scope

With A, implement only the accepted consumer boundary: static package linking
uses exact model/profile/configuration closure; an assessment adds selected
population/window/observation inputs only when needed. Retain correspondence
records with their named digest domains.

## Exit conditions

- TC-1362 proves static linking has no hidden runtime dependency.
- TC-1363 proves valid named digest domains and refusal of substitution.
- The consumer invents neither clock conversion, truth result, nor adapter policy.

## Admission

Blocked until Task-140 and acceptance of the FCD and A package selections.
