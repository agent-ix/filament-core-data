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
object and an optional `unit`.

The IR validator SHALL treat `presence` as a derived view whose value is fixed
by the multiplicity.

## Inputs

- A field declaration with a lower bound, an optional upper bound, and optional `ordered` and `unique` flags
- An optional unit symbol on a scalar-typed field

## Outputs

- A `field.multiplicity { lower, upper?, ordered?, unique? }` object
- A `field.unit` string on scalar-typed fields that declare one
- A validation diagnostic when the derived views disagree with the multiplicity

## Behavior

- A field in a `contractVersion: "1.1.0"` document SHALL carry `multiplicity`.
- The IR validator SHALL accept a field in a `contractVersion: "1.0.0"` document that omits `multiplicity`.
- The normalized serialization of a `1.1.0` document SHALL materialize `multiplicity`, `presence`, and `nullable` on every field.
- The normalized serialization of a `1.0.0` document SHALL NOT add a derived `multiplicity`, so v1 fingerprints and lock digests are unchanged.
- The `field` node SHALL carry `multiplicity.lower` as a non-negative integer.
- The `field` node SHALL treat an absent `multiplicity.upper` as unbounded.
- If `multiplicity.upper` is present and is less than `multiplicity.lower`, then IR validation SHALL fail at that field with its locus.
- The `field` node SHALL derive `presence` as `required` when `multiplicity.lower` is at least 1 and `optional` when it is 0.
- If a document states a `presence` that differs from the value derived from its multiplicity, then IR validation SHALL fail at that field.
- The `field` node SHALL keep `nullable` independent of multiplicity, so that a required field still admits an explicit null value when declared.
- If `ordered` or `unique` is present and `multiplicity.upper` is 1 or 0, then IR validation SHALL fail at that field with its locus.
- The IR validator SHALL resolve `typeRef` through `alias` definitions to its structural kind before applying the `unit`, `ordered`, and `unique` rules.
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
| FR-027-CON-1 | The IR validator SHALL accept a `1.0.0` field without `multiplicity` and derive it from `presence` (`required` → `1..1`, `optional` → `0..1`) without writing it back. | Compatibility | Existing-fixture suite |
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
| FR-027-AC-7 | The config-service FR-006 `ConfigVersion` fields (`parent 0..1`, `versionNumber 1..1`) are expressed in `fixtures/semantic/v1/positive/config-version-v1-1.json` with zero declared loss. | Analysis |
| FR-027-AC-8 | `ordered: true` on a `1..1` field fails validation with the field's locus. | Test |
| FR-027-AC-9 | A multiplicity narrowing (`0..*` → `1..1`) classifies as breaking and a widening (`1..1` → `0..*`) as additive in the compatibility corpus. | Test |

## Dependencies

- **Upstream**: [FR-020](./FR-020-define-semantic-type-system-and-identity.md), [FR-025](./FR-025-classify-semantic-and-target-compatibility.md), [FR-030](./FR-030-bind-source-dialect-and-manifest-targets.md) (version discriminator), [US-006](../usecase/US-006-declare-typed-domain-structure.md)
- **Downstream**: [FR-028](./FR-028-represent-relationships-operations-and-clauses.md), semantic-core grammar (issue #35), Quoin issue #293
