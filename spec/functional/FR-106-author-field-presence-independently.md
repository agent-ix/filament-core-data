---
id: FR-106
title: "Author field presence independently of multiplicity"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-006"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-093"
    type: "depends_on"
---
# FR-106: Author field presence independently of multiplicity

## Description

This requirement answers
[filament-core-data#95](https://github.com/agent-ix/filament-core-data/issues/95),
which asks which source contract independently authored field presence is read
from, and the presence half of
[#93](https://github.com/agent-ix/filament-core-data/issues/93). The trace is
written here rather than left to be inferred from a matrix row: an issue whose
requirement can only be found by recognising the subject matter is an issue that
traces to nothing a reader can follow.

It also answers the presence half of
[#78](https://github.com/agent-ix/filament-core-data/issues/78), which reaches the same seam from the other side: the
rule deriving presence from multiplicity makes a required-but-possibly-empty
collection inexpressible. The unconstrained-value half of #78 is answered by
[FR-139](./FR-139-express-an-unconstrained-value-in-the-semantic-ir.md).

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
- The baseline model SHALL retain each declared `ordered` and `unique` value as
  part of multiplicity rather than deriving either from cardinality.
- The baseline model SHALL retain the declared default as either absent or one
  admissible default value; an adapter SHALL report named loss when it cannot
  preserve that distinction.
- The baseline model SHALL retain explicit null separately from an absent member.
- A baseline adapter SHALL mark a field presence as `authored` only when its source declaration carries that value.
- A legacy adapter SHALL NOT derive a baseline presence value from multiplicity.
- A v1.2-to-v1.1 projection SHALL refuse when authored presence differs from the v1.1 derived value.

## Constraints

| ID | Constraint | Type | Validation |
| --- | --- | --- | --- |
| FR-106-CON-1 | The baseline field contract SHALL distinguish a required empty collection from an optional nonempty collection. | Correctness | Test |
| FR-106-CON-2 | A producer SHALL NOT collapse absent, null, invalid, unavailable, default, ordered, or unique states. | Integrity | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
| --- | --- | --- |
| FR-106-AC-1 | A required `0..*` field is accepted as present with an empty collection. | Test |
| FR-106-AC-2 | An optional `1..*` field is accepted when absent and rejected when present with zero values. | Test |
| FR-106-AC-3 | A v1.1 source lacking authored presence refuses baseline 1.2 projection with a named loss. | Test |
| FR-106-AC-4 | A v1.2 field whose presence equals the v1.1 derivation projects without a presence loss. | Test |
| FR-106-AC-5 | Two otherwise equal fields differing only in default, ordered, or unique retain that distinction or refuse with named loss. | Test |

## Dependencies

- [US-006](../usecase/US-006-declare-typed-domain-structure.md) supplies the domain-author outcome.
- [FR-093](./FR-093-lower-field-declarations-to-ir-fields.md) is the legacy extraction reading replaced for the new baseline.
- [Baseline 1.2 contract](../../docs/semantic-data-system/baseline-1-2.md) is the authoritative contract text.
