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
- A reader SHALL retain unavailable observations and exhausted resources as
  explicit availability facts, including the affected observation-record
  identity and reason.
- An evaluator SHALL determine whether an availability fact is required support
  for its selected claim; the reader SHALL NOT manufacture a Boolean truth
  result.

## Constraints

| ID | Constraint | Type | Validation |
| --- | --- | --- | --- |
| FR-102-CON-1 | A closed population SHALL reject an object absent from its declared universe. | Correctness | Test |
| FR-102-CON-2 | A population reader SHALL NOT convert an availability fact into a Boolean result or discard its affected observation-record identity. | Integrity | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
| --- | --- | --- |
| FR-102-AC-1 | A required field absent from one object is distinguishable from a nullable field present with null. | Test |
| FR-102-AC-2 | A relationship instance targeting an undeclared object is refused with both endpoint identities. | Test |
| FR-102-AC-3 | An unavailable observation outside a selected evaluator's exact admitted support leaves its independently justified satisfied or violated result intact while retaining incomplete availability/coverage; when the same observation is required support, the evaluator returns its unavailable or incomplete disposition rather than a Boolean result. | Test |
| FR-102-AC-4 | Two observation records for one member object remain two ordered records; member membership alone does not claim either record's coverage. | Test |
| FR-102-AC-5 | Event-position, fixed-sample, and timestamp windows preserve their selected half-open producer coverage and refuse a clock-family mismatch rather than inventing an elapsed-time mapping. | Test |

## Dependencies

- [FR-100](./FR-100-author-field-presence-independently.md) defines field-member semantics.
- [FR-101](./FR-101-declare-first-class-relationship-contracts.md) defines relationship endpoint semantics.
- [Baseline 1.2 contract](../../docs/semantic-data-system/baseline-1-2.md) is the authoritative contract text.
