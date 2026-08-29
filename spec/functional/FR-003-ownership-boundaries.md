---
id: FR-003
title: "Repository and subsystem ownership boundaries"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/spec/usecase/US-001"
    type: "implements"
---
# [FR-003] Repository and subsystem ownership boundaries

## Description

The architecture record SHALL allocate semantic compiler, parsing, catalog,
module-vocabulary, projection-adapter, and persistence responsibilities to one
named owning subsystem each.

## Behavior

- The record SHALL assign semantic IR, shared kernel, and emitter ownership to
  `filament-core-data`.
- The record SHALL preserve Quire ownership of parsing, validation, extraction,
  and byte-splice behavior.
- The record SHALL preserve Quoin ownership of module catalog, locks,
  installation, skills, and workflows.
- The record SHALL assign vocabulary, constraints, mappings, and examples to
  module repositories.
- The record SHALL assign application adapters, ORM mappings, and migrations to
  consuming repositories.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-003-CON-1 | Quire SHALL NOT regain template-rendering or cross-language generation responsibility. | Architecture | Inspection |
| FR-003-CON-2 | A consuming application SHALL NOT become the independent authority for a shared semantic contract. | Architecture | Inspection |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-003-AC-1 | The ownership table names one owner and explicit non-responsibility for every required concern. | Inspection (TC-009) |
| FR-003-AC-2 | The Quire boundary is compatible with its rendering-removal decision. | Analysis (TC-010) |
| FR-003-AC-3 | The Quoin and module-repository boundaries distinguish distribution from vocabulary ownership. | Inspection (TC-011) |
| FR-003-AC-4 | Downstream persistence and UI concerns remain adapter responsibilities. | Inspection (TC-012) |

## Dependencies

- **Upstream**: [US-001](../usecase/US-001-understand-data-authority.md)
- **Downstream**: [FR-005](./FR-005-generated-package-contract.md), [FR-008](./FR-008-decision-and-conflict-records.md)
