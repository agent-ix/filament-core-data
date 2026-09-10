---
id: FR-100
title: "Author field presence independently of multiplicity"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-006"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-093"
    type: "depends_on"
---
# FR-100: Author field presence independently of multiplicity

## Description

The baseline model contract SHALL require every baseline field declaration to
carry an authored `presence` value independently of multiplicity, nullability,
and default semantics.

## Inputs

- A versioned field declaration
- Authored `presence`, `multiplicity`, `nullable`, and `default` values
- The producer's source-capability declaration

## Outputs

- A baseline field contract with all four independent axes
- A named refusal or loss record when an adapter cannot carry authored presence

## Behavior

- The baseline model SHALL admit only `required` and `optional` as presence values.
- The baseline model SHALL require `multiplicity` on every field.
- The baseline model SHALL retain explicit null separately from an absent member.
- A baseline adapter SHALL mark a field presence as `authored` only when its source declaration carries that value.
- A legacy adapter SHALL NOT derive a baseline presence value from multiplicity.
- A v1.2-to-v1.1 projection SHALL refuse when authored presence differs from the v1.1 derived value.

## Constraints

| ID | Constraint | Type | Validation |
| --- | --- | --- | --- |
| FR-100-CON-1 | The baseline field contract SHALL distinguish a required empty collection from an optional nonempty collection. | Correctness | Test |
| FR-100-CON-2 | A producer SHALL NOT collapse absent, null, invalid, and unavailable states. | Integrity | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
| --- | --- | --- |
| FR-100-AC-1 | A required `0..*` field is accepted as present with an empty collection. | Test |
| FR-100-AC-2 | An optional `1..*` field is accepted when absent and rejected when present with zero values. | Test |
| FR-100-AC-3 | A v1.1 source lacking authored presence refuses baseline 1.2 projection with a named loss. | Test |
| FR-100-AC-4 | A v1.2 field whose presence equals the v1.1 derivation projects without a presence loss. | Test |

## Dependencies

- [US-006](../usecase/US-006-declare-typed-domain-structure.md) supplies the domain-author outcome.
- [FR-093](./FR-093-lower-field-declarations-to-ir-fields.md) is the legacy extraction reading replaced for the new baseline.
- [Baseline 1.2 contract](../../docs/semantic-data-system/baseline-1-2.md) is the authoritative contract text.
