---
id: FR-004
title: "Semantic metamodel and data planes"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/spec/usecase/US-001"
    type: "implements"
---
# [FR-004] Semantic metamodel and data planes

## Description

The architecture record SHALL define a representation-independent metamodel and
separate meta, definition, execution-and-observation, and presentation planes.

## Behavior

- The metamodel SHALL distinguish compiler definitions from reusable runtime
  kernel types.
- The metamodel SHALL distinguish structural kinds from semantic roles.
- The metamodel SHALL distinguish definitions from occurrences and reports from
  their underlying observations.
- The record SHALL reject a universal entity-attribute-value object envelope as
  the required representation of every domain value.
- The record SHALL describe open module discovery alongside finite statically
  generated package exports.
- The metamodel SHALL distinguish package identity, semantic type identity,
  definition identity, and occurrence identity.
- The metamodel SHALL define stable semantic identity independently from file
  paths, display labels, storage keys, and serialized representation.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-004-AC-1 | Compiler metamodel and reusable kernel types are listed separately. | Inspection (TC-013) |
| FR-004-AC-2 | Every example concept can be assigned to one primary data plane without changing its semantic identity. | Analysis (TC-014) |
| FR-004-AC-3 | Structural kind and semantic role are modeled as independent classifications. | Inspection (TC-015) |
| FR-004-AC-4 | Dynamic and static consumers have explicit, non-conflicting extension behavior. | Analysis (TC-016) |
| FR-004-AC-5 | Package, semantic type, definition, and occurrence identities are defined separately with uniqueness and versioning rules. | Analysis (TC-049) |
| FR-004-AC-6 | Moving or re-rendering an artifact does not silently change the semantic identity it represents. | Test (TC-050) |

## Dependencies

- **Upstream**: [FR-002](./FR-002-concern-specific-authority.md)
- **Downstream**: package, projection, and corpus-review specifications
