---
id: FR-027
title: "Declare field multiplicity and units"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-006"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-020"
    type: "depends_on"
---
# [FR-027] Declare field multiplicity and units

## Description

The semantic IR v1.1 `field` node SHALL carry an explicit `multiplicity`
object and an optional `unit`, and SHALL define `presence` and `nullable` as
derived views whose values are fixed by the multiplicity.

## Inputs

- A field declaration with a lower bound, an optional upper bound, and optional `ordered` and `unique` flags
- An optional unit symbol on a scalar-typed field

## Outputs

- A `field.multiplicity { lower, upper?, ordered?, unique? }` object
- A `field.unit` string on scalar-typed fields that declare one
- A validation diagnostic when the derived views disagree with the multiplicity

## Behavior

- The `field` node SHALL carry `multiplicity.lower` as a non-negative integer.
- The `field` node SHALL treat an absent `multiplicity.upper` as unbounded.
- If `multiplicity.upper` is present and is less than `multiplicity.lower`, then IR validation SHALL fail at that field with its locus.
- The `field` node SHALL derive `presence` as `required` when `multiplicity.lower` is at least 1 and `optional` when it is 0.
- If a document states a `presence` that differs from the value derived from its multiplicity, then IR validation SHALL fail at that field.
- The `field` node SHALL keep `nullable` independent of multiplicity, so that a required field still admits an explicit null value when declared.
- The `field` node SHALL carry `ordered` and `unique` only when `multiplicity.upper` is absent or greater than 1.
- The `field` node SHALL carry `unit` only when the referenced type has structural kind `scalar`.
- The `unit` value SHALL be a non-empty unit symbol.
- The `field` node SHALL carry any quantity kind through a namespaced extension rather than in `unit`.
- The IR SHALL NOT infer a unit from a field name, display name, or documentation.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-027-CON-1 | A v1 field without `multiplicity` SHALL remain valid under v1.1 with `multiplicity` derived from `presence` (`required` → `1..1`, `optional` → `0..1`). | Compatibility | Existing-fixture suite |
| FR-027-CON-2 | A `unit` on a non-scalar field SHALL fail validation rather than being dropped. | Integrity | Negative fixture |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-027-AC-1 | A field declared `0..1` validates, derives `presence: optional`, and re-serializes byte-identically through the normalized form. | Test |
| FR-027-AC-2 | A field declared `1..*` with `ordered: true` and `unique: true` validates and preserves both flags. | Test |
| FR-027-AC-3 | A field whose stated `presence` contradicts its multiplicity fails validation with the field's locus. | Test |
| FR-027-AC-4 | A field with `upper < lower` fails validation with the field's locus. | Test |
| FR-027-AC-5 | A scalar field with `unit: "s"` validates; the same unit on a record-typed field fails. | Test |
| FR-027-AC-6 | Every v1 positive fixture validates unchanged under the v1.1 schema. | Test |
| FR-027-AC-7 | The config-service FR-006 `ConfigVersion` fields (`parent 0..1`, `versionNumber 1..1`) are expressible with zero declared loss. | Analysis |

## Dependencies

- **Upstream**: [FR-020](./FR-020-define-semantic-type-system-and-identity.md), [US-006](../usecase/US-006-declare-typed-domain-structure.md)
- **Downstream**: [FR-028](./FR-028-represent-relationships-operations-and-clauses.md), semantic-core grammar (issue #35), Quoin issue #293
