---
id: Task-002
title: "Authority and ownership foundations"
type: Task
status: done
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-001"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/StR-001"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-002"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-003"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-005"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-006"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-007"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-008"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-009"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-010"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-011"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-012"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-033"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-034"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-035"
    type: verifies
---
# Task-002: Authority and ownership foundations

## Scope

Create the architecture root index, principles, glossary, authority matrix, and
ownership-boundary document that every specialized record references.

## Subtasks

- [x] Define normative, provisional, informative, and historical status semantics.
- [x] Define authoritative, derived, projection, and compatibility representation terms.
- [x] Map authored knowledge, runtime state, observations, interfaces, analytics, generated code, and reports to authority/edit/provenance rules.
- [x] Allocate responsibilities and explicit non-responsibilities across all five owners.
- [x] Cite the current Avro package and Quire/Quoin behavior as dated baselines.

## Deliverables

- Architecture root index and principles/glossary documents
- Concern-specific authority document
- Repository and subsystem ownership document

## Notes

- Preserve Quire direct-Markdown and no-rendering scope.
- Do not restate an application adapter as shared-contract authority.
