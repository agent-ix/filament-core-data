---
id: FR-102
title: "Bind finite populations to model contracts"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-006"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-100"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-101"
    type: "depends_on"
---
# FR-102: Bind finite populations to model contracts

## Description

The baseline population contract SHALL bind each finite observation to one
versioned model contract and preserve object, field-member, relationship, and
observation-state distinctions needed by evaluation and monitoring.

## Behavior

- A population SHALL name its model reference and selected semantic profile.
- A population SHALL declare whether its object universe is closed.
- A population SHALL represent field absence, present null, and present value distinctly.
- A population SHALL bind every relationship instance to declared endpoint identities.
- A reader SHALL refuse a dangling reference or a value incompatible with the model field contract.
- A reader SHALL report unavailable observations and exhausted resources as incomplete.

## Constraints

| ID | Constraint | Type | Validation |
| --- | --- | --- | --- |
| FR-102-CON-1 | A closed population SHALL reject an object absent from its declared universe. | Correctness | Test |
| FR-102-CON-2 | A population reader SHALL NOT convert incomplete input into a Boolean result. | Integrity | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
| --- | --- | --- |
| FR-102-AC-1 | A required field absent from one object is distinguishable from a nullable field present with null. | Test |
| FR-102-AC-2 | A relationship instance targeting an undeclared object is refused with both endpoint identities. | Test |
| FR-102-AC-3 | An unavailable observation yields an incomplete result rather than a satisfied or violated result. | Test |

## Dependencies

- [FR-100](./FR-100-author-field-presence-independently.md) defines field-member semantics.
- [FR-101](./FR-101-declare-first-class-relationship-contracts.md) defines relationship endpoint semantics.
- [Baseline 1.2 contract](../../docs/semantic-data-system/baseline-1-2.md) is the authoritative contract text.
