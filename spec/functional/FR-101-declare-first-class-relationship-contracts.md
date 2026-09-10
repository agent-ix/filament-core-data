---
id: FR-101
title: "Declare first-class relationship contracts"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-006"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-094"
    type: "depends_on"
---
# FR-101: Declare first-class relationship contracts

## Description

The baseline model contract SHALL represent every domain relationship as a
first-class declaration with independently authored endpoints, roles,
multiplicities, category, containment semantics, and origin.

## Behavior

- The model SHALL identify each relationship and each endpoint independently.
- The model SHALL record endpoint roles and multiplicity at both ends.
- The model SHALL record category and containment/composition semantics explicitly.
- An adapter SHALL NOT infer a relationship from a field or a field from a relationship.
- A representation mapping SHALL report a loss when it cannot preserve an endpoint, role, multiplicity, or containment distinction.

## Constraints

| ID | Constraint | Type | Validation |
| --- | --- | --- | --- |
| FR-101-CON-1 | A relationship contract SHALL name stable source and target type identities. | Integrity | Test |
| FR-101-CON-2 | A composite relationship graph SHALL remain acyclic. | Correctness | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
| --- | --- | --- |
| FR-101-AC-1 | A relationship with distinct endpoint multiplicities preserves both values through normalization. | Test |
| FR-101-AC-2 | A field-only source cannot create a relationship declaration without an explicit mapping contract. | Test |
| FR-101-AC-3 | A relationship-to-field projection that loses endpoint role reports the loss with the relationship identity. | Test |

## Dependencies

- [US-006](../usecase/US-006-declare-typed-domain-structure.md) supplies the domain-author outcome.
- [FR-094](./FR-094-lower-relationships-operations-and-clauses.md) remains the legacy extraction contract.
- [Baseline 1.2 contract](../../docs/semantic-data-system/baseline-1-2.md) is the authoritative contract text.
