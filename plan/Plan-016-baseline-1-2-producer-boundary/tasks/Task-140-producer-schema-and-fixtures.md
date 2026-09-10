---
id: Task-140
title: "Baseline 1.2 producer schema and distinguishing fixtures"
type: Task
status: todo
track: A
priority: P0
relationships:
  - { target: "ix://agent-ix/filament-core-data/FR-100", type: references }
  - { target: "ix://agent-ix/filament-core-data/FR-101", type: references }
  - { target: "ix://agent-ix/filament-core-data/FR-102", type: references }
  - { target: "ix://agent-ix/filament-core-data/FR-103", type: references }
  - { target: "ix://agent-ix/filament-core-data/TC-1355", type: verifies }
  - { target: "ix://agent-ix/filament-core-data/TC-1356", type: verifies }
  - { target: "ix://agent-ix/filament-core-data/TC-1357", type: verifies }
  - { target: "ix://agent-ix/filament-core-data/TC-1358", type: verifies }
  - { target: "ix://agent-ix/filament-core-data/TC-1359", type: verifies }
  - { target: "ix://agent-ix/filament-core-data/TC-1360", type: verifies }
  - { target: "ix://agent-ix/filament-core-data/TC-1361", type: verifies }
---
# Task-140: Baseline 1.2 producer schema and distinguishing fixtures

## Scope

After acceptance, implement the FCD producer/schema and fixtures for authored
presence, relationships, finite populations, exact availability facts, static
configuration closure, and named digest domains. Do not add native Quire syntax
or interpret temporal/protocol semantics.

## Exit conditions

- Preserve absence/null/value and record/member identities.
- Emit exactly one accepted clock family with its half-open coverage form.
- Meet accepted decimal and digest-domain rules.
- Make TC-1355..TC-1361 traced executable controls, including adverse cases.

## Admission

Blocked until FCD PR #97 and A's corresponding package contract are accepted.
