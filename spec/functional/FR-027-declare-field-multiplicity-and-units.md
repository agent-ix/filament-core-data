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

The semantic IR `field` node SHALL carry an explicit `multiplicity`
object and an optional `unit`.

## Inputs

- A field declaration with a lower bound, an optional upper bound, and `ordered` and `unique` flags
- An optional unit symbol on a scalar-typed field

## Outputs

- A `field.multiplicity { lower, upper?, ordered, unique }` object
- A `field.unit` string on scalar-typed fields that declare one
- A validation diagnostic when the derived views disagree with the multiplicity

## Behavior

- A field SHALL carry `multiplicity`, schema-required under contract `2.0.0`, the only version.
- The normalized serialization SHALL materialize `nullable` as a literal boolean on every field; `multiplicity` and `presence` are independently authored and neither is ever derived from the other (FR-050, FR-069).
- The `field` node SHALL carry `multiplicity.lower` as a non-negative integer.
- The `field` node SHALL treat an absent `multiplicity.upper` as unbounded.
- If `multiplicity.upper` is present and is less than `multiplicity.lower`, then IR validation SHALL fail at that field with its locus.
- The `field` node SHALL keep `presence` and `nullable` independent of multiplicity (FR-106), so that a required field still admits an explicit null value when declared and a field's presence is never derived from its multiplicity.
- The `field` node SHALL carry `multiplicity.ordered` and `multiplicity.unique` as required booleans, `false` where `multiplicity.upper` is 1 or 0 (Multiplicity ruling, 2026-09-19: every emitted multiplicity carries both flags, clamped to `false` rather than refused when `upper` is at most 1 — `FLAGS_ON_NON_COLLECTION` is deleted).
- The IR validator SHALL resolve `typeRef` through `alias` definitions to its structural kind before applying the `unit` rule.
- If a `typeRef` does not resolve, then IR validation SHALL fail at the field with its locus.
- The `field` node SHALL carry `unit` only when the resolved structural kind is `scalar`.
- A `multiplicity.upper` greater than 1 on a field whose resolved kind is `sequence` or `map` SHALL denote a collection of collections and carries no further meaning.
- The `unit` value SHALL be a case-sensitive UCUM unit symbol (for example `s`, `ms`, `kg`, `m/s`).
- The `field` node SHALL carry any quantity kind through a namespaced extension rather than in `unit`.
- The IR validator SHALL NOT infer a unit from a field name, display name, or documentation.
- The compatibility classifier (FR-025) SHALL classify a multiplicity widening (lower decreased, upper increased or removed) as additive, a multiplicity narrowing as breaking, and a `unit`, `ordered`, or `unique` change as breaking.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-027-CON-2 | A `unit` on a non-scalar field SHALL fail validation rather than being dropped. | Integrity | Negative fixture |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-027-AC-1 | A field declared `multiplicity: {lower: 0, upper: 1}` with `presence: optional` authored explicitly validates and re-serializes byte-identically through the normalized form; the same field with `presence` omitted fails validation, since `presence` is schema-required and never derived from `multiplicity`. | Test |
| FR-027-AC-2 | A field declared `1..*` with `ordered: true` and `unique: true` validates and preserves both flags. | Test |
| FR-027-AC-4 | A field with `upper < lower` fails validation with the field's locus. | Test |
| FR-027-AC-5 | A scalar field with `unit: "s"` validates; the same unit on a record-typed field fails. | Test |
| FR-027-AC-6 | Every published positive fixture declaring contract `2.0.0` validates under the schema; their vocabulary and negative-refusal coverage is asserted over inline documents. | Test |
| FR-027-AC-7 | The config-service FR-006 `ConfigVersion` fields (`parent 0..1`, `versionNumber 1..1`) are expressed in `fixtures/semantic/v1/positive/config-version-v2.json` with zero declared loss. | Analysis |
| FR-027-AC-8 | A field declared `multiplicity: {lower: 1, upper: 1}` emits `{lower: 1, upper: 1, ordered: false, unique: false}` and validates; a field whose `upper` is at most 1 but whose `@collection` declares `ordered: true` or `unique: true` emits `ordered: false, unique: false` regardless — clamped at emission, not refused. | Test |
| FR-027-AC-9 | A multiplicity narrowing (`0..*` → `1..1`) classifies as breaking and a widening (`1..1` → `0..*`) as additive in the compatibility corpus. | Test |

## Dependencies

- **Upstream**: [FR-020](./FR-020-define-semantic-type-system-and-identity.md), [FR-025](./FR-025-classify-semantic-and-target-compatibility.md), [FR-030](./FR-030-bind-source-dialect-and-manifest-targets.md) (version discriminator), [US-006](../usecase/US-006-declare-typed-domain-structure.md)
- **Downstream**: [FR-028](./FR-028-represent-relationships-operations-and-clauses.md), semantic-core grammar (issue #35), Quoin issue #293
