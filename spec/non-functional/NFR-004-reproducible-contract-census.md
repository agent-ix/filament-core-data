---
id: NFR-004
title: "Contract census is reproducible"
type: NFR
quality_attribute: maintainability
verification_method: test
evidence:
  - kind: test_case
    ref: "test/contract-census.test.ts"
  - kind: analysis_report
    ref: "audit/filament-contract-census/validation.json"
relationships:
  - target: "ix://agent-ix/filament-core-data/spec/functional/FR-009"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/spec/functional/FR-010"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/spec/functional/FR-011"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/spec/functional/FR-012"
    type: "constrains"
---
# [NFR-004] Contract census is reproducible

## Statement

The contract census SHALL produce deterministic, schema-validated evidence from
the same pinned inputs and SHALL identify every volatile or manually assessed
field that cannot be reproduced mechanically.

## Scope

- Applies to machine-readable snapshot, inventory, parity, conflict, missing-type,
  and impact artifacts produced for issue #10.
- Applies to the commands and schemas used to validate those artifacts.

## Rationale

The census becomes an input to later schema and migration decisions. Reviewers
must be able to distinguish stable source facts from timestamped operational facts
and analyst judgments.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| Schema-invalid machine-readable artifacts | 0 | 0 | automated validation |
| Ordering or content differences across two validations of unchanged pinned inputs | 0 | 0 | deterministic regeneration test |
| Evidence references that cannot be resolved at the recorded revision | 0 | 0 | source-locus validation |
| Manually assessed fields without method, rationale, and confidence | 0 | 0 | audit inspection |

## Verification

Automated tests validate the evidence schemas, stable ordering, identifier
uniqueness, evidence-locus shape, and required assessment metadata. Review
inspection checks any source that cannot be re-read in the local environment.

## Dependencies

- **Upstream**: [FR-009](../functional/FR-009-snapshot-audit-inputs.md), [FR-010](../functional/FR-010-inventory-filament-contracts.md)
- **Downstream**: issue #10 acceptance and future census refreshes
