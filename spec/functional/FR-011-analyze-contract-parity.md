---
id: FR-011
title: "Analyze contract parity and conflicts"
type: FR
verification_method: analysis
evidence:
  - kind: analysis_report
    ref: "audit/filament-contract-census/parity.json"
  - kind: analysis_report
    ref: "audit/filament-contract-census/conflicts.json"
  - kind: test_case
    ref: "test/contract-census.test.ts"
relationships:
  - target: "ix://agent-ix/filament-core-data/spec/usecase/US-003"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/spec/functional/FR-010"
    type: "depends_on"
---
# [FR-011] Analyze contract parity and conflicts

## Description

For each repeated or missing semantic concept, the audit SHALL compare fields,
constraints, transformations, and consumers across representations and assign a
source-cited fit disposition without selecting or changing the target contract.

## Inputs

- [FR-010](./FR-010-inventory-filament-contracts.md) contract inventory
- Existing compatibility fixtures, mapping code, migrations, and dynamic-schema issues

## Outputs

- Machine-readable field-level parity matrix
- Conflict and missing-contract ledgers
- Human-readable findings grouped by semantic concept

## Behavior

- The audit SHALL classify each contract as `fit`, `fit-with-extension`,
  `duplicate`, `representation-local`, `split-required`, `replacement-candidate`,
  or `missing` and SHALL record the rationale and confidence.
- The parity matrix SHALL compare stable identity, field names and types,
  optionality, nullability, defaults, constraints, version semantics, provenance,
  lifecycle, relationships, and transformation loss.
- If two definitions cannot be proven equivalent, then the audit SHALL record a
  conflict or unknown relationship rather than report parity.
- The audit SHALL reference existing dynamic-schema issues in
  `filament-core-service#1` through `#4` where applicable and SHALL not duplicate
  their proposed work as new findings.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-011-AC-1 | Every inventory contract has exactly one allowed fit disposition with rationale, evidence, and confidence. | Test (TC-064) |
| FR-011-AC-2 | Every concept represented more than once has a field-level parity record or an explicit not-comparable disposition. | Test (TC-065) |
| FR-011-AC-3 | Every type, optionality, default, identity, version, provenance, lifecycle, relationship, or lossiness mismatch appears in the conflict ledger. | Analysis (TC-066) |
| FR-011-AC-4 | Unproven equivalence is represented as conflict or unknown and never as fit. | Test (TC-067) |
| FR-011-AC-5 | Findings related to dynamic schemas cite and disposition existing `filament-core-service#1` through `#4` instead of duplicating their work. | Inspection (TC-068) |

## Dependencies

- **Upstream**: [FR-010](./FR-010-inventory-filament-contracts.md)
- **Downstream**: [FR-012](./FR-012-assess-repository-impact.md), [FR-013](./FR-013-publish-contract-census-review.md)
