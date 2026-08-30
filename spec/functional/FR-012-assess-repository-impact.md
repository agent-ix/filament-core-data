---
id: FR-012
title: "Assess repository and concept impact"
type: FR
verification_method: analysis
evidence:
  - kind: analysis_report
    ref: "audit/filament-contract-census/impact.json"
  - kind: test_case
    ref: "test/contract-census.test.ts"
relationships:
  - target: "ix://agent-ix/filament-core-data/spec/usecase/US-003"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/spec/functional/FR-010"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/spec/functional/FR-011"
    type: "depends_on"
---
# [FR-012] Assess repository and concept impact

## Description

For every in-scope repository and semantic concept family, the audit SHALL record
implementation effort, compatibility risk, dependencies, migration wave, and
confidence while keeping implementation authorization outside the audit.

## Inputs

- [FR-010](./FR-010-inventory-filament-contracts.md) inventory
- [FR-011](./FR-011-analyze-contract-parity.md) parity and conflict results
- Current program dependencies and active feature work

## Outputs

- Machine-readable repository impact matrix
- Migration-order recommendations and explicit blockers
- Affected producer, consumer, storage, wire, and generated-package surfaces

## Behavior

- Each repository and concept family SHALL receive an `S`, `M`, `L`, or `XL`
  effort estimate, a risk rating, dependency list, migration wave, and confidence.
- The audit SHALL identify affected systems and compatibility controls for every
  `split-required`, `replacement-candidate`, or `missing` disposition.
- If active work overlaps an assessed contract, then the audit SHALL name the
  issue or pull request, owner when known, overlap, and sequencing consequence.
- The impact matrix SHALL distinguish an evidence-backed recommendation from a
  human promotion decision and SHALL not mark a migration approved.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-012-AC-1 | Every in-scope repository and concept family has effort, risk, dependencies, migration wave, and confidence. | Test (TC-069) |
| FR-012-AC-2 | Every disruptive disposition identifies affected systems, compatibility controls, and a named implementation gate. | Analysis (TC-070) |
| FR-012-AC-3 | Every detected overlap with active work records its source and sequencing consequence. | Inspection (TC-071) |
| FR-012-AC-4 | Zero impact records present a recommendation as migration approval. | Test (TC-072) |

## Dependencies

- **Upstream**: [FR-010](./FR-010-inventory-filament-contracts.md), [FR-011](./FR-011-analyze-contract-parity.md)
- **Downstream**: [FR-013](./FR-013-publish-contract-census-review.md), implementation-ticket planning
