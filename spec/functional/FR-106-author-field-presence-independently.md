---
id: FR-106
title: "Author field presence independently of multiplicity"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-006"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-027"
    type: "depends_on"
---
# FR-106: Author field presence independently of multiplicity

## Description

This requirement answers the presence half of
[filament-core-data#93](https://github.com/agent-ix/filament-core-data/issues/93)
and of [#78](https://github.com/agent-ix/filament-core-data/issues/78). The
unconstrained-value half of both is answered by
[FR-139](./FR-139-express-an-unconstrained-value-in-the-semantic-ir.md).

The semantic IR SHALL carry field presence as the authored `Field.presence`
value, `required` or `optional`, independently of the field's `multiplicity`.

Presence answers whether a member must appear. Multiplicity answers how many
values a present member holds. A rule deriving one from the other makes a
required-but-possibly-empty collection and an optional-but-non-empty-when-present
collection inexpressible, and both occur in the source contracts this repository
lowers. Issue #93 carries the rule as the additive contract revision `2.0.0`.

## Inputs

- A source field declaration carrying authored presence and multiplicity
- The contract version the IR document declares

## Outputs

- An IR `Field` whose `presence` is the authored value and whose `multiplicity`
  is the authored multiplicity
- A named loss where a source carries no authored presence

## Behavior

- `Field.presence` SHALL admit exactly `required` and `optional`.
- A frontend SHALL set `Field.presence` from the source's authored presence and
  SHALL NOT compute it from `multiplicity.lower`.
- A frontend whose source declaration carries no authored presence SHALL record a
  named loss naming the field and its locus.
- A reader SHALL validate presence and multiplicity as separate checks: an absent
  `required` member refuses, an absent `optional` member is admitted, and a
  present member is checked against `multiplicity`.
- `presence`, `nullable`, and the default kind SHALL remain three independent
  members of `Field`.
- The `PRESENCE_MULTIPLICITY_MISMATCH` rule SHALL apply to `1.1.0` documents and
  SHALL NOT apply to `2.0.0` documents.

## Constraints

| ID | Constraint | Type | Validation |
|----|------------|------|------------|
| FR-106-CON-1 | A required field with `multiplicity.lower` of `0` and an optional field with `multiplicity.lower` of at least `1` SHALL both be valid `2.0.0` fields. | Correctness | Test |
| FR-106-CON-2 | Presence, nullability, and default kind SHALL NOT be derived from one another at any layer. | Integrity | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| FR-106-AC-1 | A required `0..*` field admits a present empty collection and refuses an absent member. | Test |
| FR-106-AC-2 | An optional `1..*` field admits an absent member and refuses a present empty collection. | Test |
| FR-106-AC-3 | Two fields differing only in `presence` produce distinct IR `Field` declarations and distinct generated declarations. | Test |
| FR-106-AC-4 | A `2.0.0` field whose presence differs from `multiplicity.lower` validates without `PRESENCE_MULTIPLICITY_MISMATCH`; the same field in a `1.1.0` document reports it. | Test |
| FR-106-AC-5 | A source field with no authored presence yields a named loss naming the field and its locus. | Test |
| FR-106-AC-6 | Changing only one of `presence`, `nullable`, or default kind changes only that member of the emitted `Field`. | Test |

## Dependencies

- **Upstream**: [US-006](../usecase/US-006-declare-typed-domain-structure.md) supplies the domain-author outcome.
- **Upstream**: [FR-027](./FR-027-declare-field-multiplicity-and-units.md) declares the field multiplicity presence is independent of.
- **Downstream**: [FR-093](./FR-093-lower-field-declarations-to-ir-fields.md), whose `required-collection-presence` loss closes when the source carries authored presence.
- **Related**: [FR-139](./FR-139-express-an-unconstrained-value-in-the-semantic-ir.md), the unconstrained-value half of the same revision.
