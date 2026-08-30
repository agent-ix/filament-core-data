---
id: FR-002
title: "Concern-specific data authority"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/spec/usecase/US-001"
    type: "implements"
---
# [FR-002] Concern-specific data authority

## Description

The architecture record SHALL assign authority by data concern rather than
declaring Markdown, JSON, a database, or any wire format universally canonical.

## Behavior

- The authority model SHALL cover human- and agent-authored knowledge,
  transactional state, operational observations, interface payloads, analytical
  datasets, generated code, and rendered reports.
- For each concern, the record SHALL identify its authoritative representation,
  derived representations, permitted edit direction, and provenance obligation.
- The record SHALL distinguish semantic equivalence from byte-exact or lossless
  representation equivalence.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-002-AC-1 | The authority matrix covers every required concern and names one owner or authority rule for each. | Inspection (TC-005) |
| FR-002-AC-2 | Typed Markdown is authoritative for authored durable knowledge without being declared authoritative for runtime records. | Inspection (TC-006) |
| FR-002-AC-3 | Generated language types and validation schemas are identified as derived artifacts. | Inspection (TC-007) |
| FR-002-AC-4 | Analytical datasets are identified as derived and require source and transformation provenance. | Inspection (TC-008) |

## Dependencies

- **Upstream**: [US-001](../usecase/US-001-understand-data-authority.md)
- **Downstream**: [FR-004](./FR-004-metamodel-and-data-planes.md), [FR-006](./FR-006-representations-and-transformations.md)
