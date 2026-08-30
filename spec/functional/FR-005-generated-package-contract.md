---
id: FR-005
title: "Generated package and consumer contract"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/spec/usecase/US-002"
    type: "implements"
---
# [FR-005] Generated package and consumer contract

## Description

The architecture record SHALL define a small shared semantic-core package plus
independently versioned module packages that emit well-typed Rust, TypeScript,
Python, and JSON Schema consumer surfaces.

## Behavior

- The package model SHALL separate schema source, package metadata, exports,
  generated targets, and representation mappings.
- Rust consumers SHALL receive Serde-compatible native structs and enums.
- TypeScript consumers SHALL receive static types and JSON Schema-backed
  validation helpers.
- Python consumers SHALL receive ordinary typed models.
- The authoring model SHALL NOT encode contracts through Python decorators or
  custom `@` tags.
- Generated packages SHALL exclude UI, ORM, Tauri, and application persistence
  dependencies.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-005-AC-1 | The core-plus-modules package topology and version ownership are explicit. | Inspection (TC-017) |
| FR-005-AC-2 | Rust, TypeScript, Python, and JSON Schema consumer surfaces are specified. | Inspection (TC-018) |
| FR-005-AC-3 | Python schema decorators are explicitly excluded from the authoring model. | Test (TC-019) |
| FR-005-AC-4 | Framework-specific adapters remain outside generated semantic packages. | Inspection (TC-020) |

## Dependencies

- **Upstream**: [FR-003](./FR-003-ownership-boundaries.md), [FR-004](./FR-004-metamodel-and-data-planes.md)
- **Downstream**: TypeSpec feasibility, compiler, and generated-package tickets
