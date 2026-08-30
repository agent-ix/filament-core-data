---
id: FR-013
title: "Publish the contract census review"
type: FR
verification_method: test
evidence:
  - kind: test_case
    ref: "test/contract-census.test.ts"
  - kind: analysis_report
    ref: "reviews/2026-08-29-filament-contract-census.md"
relationships:
  - target: "ix://agent-ix/filament-core-data/spec/usecase/US-003"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/spec/functional/FR-009"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/spec/functional/FR-011"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/spec/functional/FR-012"
    type: "depends_on"
---
# [FR-013] Publish the contract census review

## Description

When the inventory, parity, conflict, and impact artifacts pass validation, the
audit SHALL publish a navigable, validated SpecReview that summarizes evidence,
limitations, recommended sequencing, and the explicit decision boundary between
read-only analysis and implementation.

## Inputs

- [FR-009](./FR-009-snapshot-audit-inputs.md) refreshed snapshot
- [FR-011](./FR-011-analyze-contract-parity.md) parity and conflict evidence
- [FR-012](./FR-012-assess-repository-impact.md) impact assessment
- Machine validation results and unresolved limitation ledger

## Outputs

- Quire-valid SpecReview
- Indexed links to all machine-readable evidence
- Acceptance summary and unresolved-decision register

## Behavior

- When all audit validators pass, the audit SHALL render a SpecReview with scope,
  method, evidence summary, findings, limitations, conflicts, recommendations,
  and release-gate disposition.
- If the pre-sign-off refresh finds contract-affecting drift, then the audit SHALL invalidate the affected evidence or refresh it before reporting ready.
- The review SHALL state that consumer, database, wire-format, package,
  enforcement, and retirement changes require their separately named gates.
- The review SHALL retain unresolved unknowns and low-confidence findings rather
  than weaken completeness or compatibility expectations to pass.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-013-AC-1 | The SpecReview validates and links every required machine-readable inventory, parity, conflict, missing-contract, and impact artifact. | Test (TC-073) |
| FR-013-AC-2 | Every issue acceptance criterion has a source-cited disposition in the review. | Analysis (TC-074) |
| FR-013-AC-3 | Contract-affecting pre-sign-off drift prevents a ready disposition until affected evidence is refreshed or explicitly invalidated. | Test (TC-075) |
| FR-013-AC-4 | The review names every remaining implementation, migration, publication, enforcement, and retirement gate. | Inspection (TC-076) |
| FR-013-AC-5 | Unknown and low-confidence findings remain visible and do not reduce contract requirements. | Inspection (TC-077) |

## Dependencies

- **Upstream**: [FR-009](./FR-009-snapshot-audit-inputs.md), [FR-011](./FR-011-analyze-contract-parity.md), [FR-012](./FR-012-assess-repository-impact.md)
- **Downstream**: TypeSpec feasibility, semantic IR specification, and consumer-readiness planning
