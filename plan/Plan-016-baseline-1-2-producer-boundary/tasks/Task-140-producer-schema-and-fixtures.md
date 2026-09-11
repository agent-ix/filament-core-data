---
id: Task-140
title: "Baseline 1.2 producer schema and distinguishing fixtures"
type: Task
status: todo
track: A
priority: P0
relationships:
  - { target: "ix://agent-ix/filament-core-data/FR-106", type: references }
  - { target: "ix://agent-ix/filament-core-data/FR-107", type: references }
  - { target: "ix://agent-ix/filament-core-data/FR-108", type: references }
  - { target: "ix://agent-ix/filament-core-data/FR-109", type: references }
  - { target: "ix://agent-ix/filament-core-data/TC-1373", type: verifies }
  - { target: "ix://agent-ix/filament-core-data/TC-1374", type: verifies }
  - { target: "ix://agent-ix/filament-core-data/TC-1375", type: verifies }
  - { target: "ix://agent-ix/filament-core-data/TC-1376", type: verifies }
  - { target: "ix://agent-ix/filament-core-data/TC-1377", type: verifies }
  - { target: "ix://agent-ix/filament-core-data/TC-1378", type: verifies }
  - { target: "ix://agent-ix/filament-core-data/TC-1379", type: verifies }
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
- Make TC-1373..TC-1379 traced executable controls, including adverse cases.

## Admission

Blocked until FCD PR #97 and A's corresponding package contract are accepted.
