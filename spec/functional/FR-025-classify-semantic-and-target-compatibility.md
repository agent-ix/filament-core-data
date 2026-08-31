---
id: FR-025
title: "Classify semantic and target compatibility"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-005"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-020"
    type: "depends_on"
---
# [FR-025] Classify semantic and target compatibility

## Description

Given two locked semantic package versions, the compatibility contract SHALL
classify patch, additive, conditional, and breaking changes at the semantic,
profile, mapping, and generated-target surfaces.

The compatibility contract SHALL report the most restrictive applicable disposition.

## Inputs

- Old and new package graphs, IR, mappings, profiles, locks, and generated API/descriptor metadata
- Declared consumer capabilities and retained compatibility representations

## Outputs

- Machine-readable per-change classification with affected identities, consumers, rationale, and required migration gate
- Aggregate package release disposition

## Behavior

- Documentation or generator corrections SHALL be patch only when accepted values and meaning are identical.
- Optional additions SHALL be additive only when every selected target and known consumer can preserve, ignore, or surface them as declared.
- Required-field additions, removals, incompatible type/meaning changes, stable-identity changes, and unknown-policy tightening SHALL be breaking.
- The classifier SHALL classify generated-name changes independently from stable semantic identity changes.
- Enum/union additions SHALL account for each consumer's open/closed and unknown-variant behavior.
- A Protobuf profile SHALL reserve numbers and names after removal.
- The classifier SHALL report reuse of a reserved Protobuf number or name as breaking and invalid.
- Mapping/profile changes SHALL compare authority, edit direction, preservation, loss, provenance, and materialization semantics, not only field shape.
- A change with insufficient consumer or source evidence SHALL be conditional or unknown.
- The classifier SHALL NOT report a change with insufficient evidence as compatible.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-025-AC-1 | A table-driven corpus covers patch, additive, conditional, breaking, and unknown outcomes for every semantic change family. | Test |
| FR-025-AC-2 | Cross-target disagreement yields the most restrictive result and identifies the disagreeing target. | Property |
| FR-025-AC-3 | Open/closed enum and unknown-field policies change the result as declared rather than by language default. | Test |
| FR-025-AC-4 | Mapping authority or undeclared-loss changes can be breaking even when structural schemas are identical. | Test |
| FR-025-AC-5 | Unknown or stale consumers remain in the report and keep promotion gated. | Test |
| FR-025-AC-6 | Current Avro readers remain an explicit compatibility input until their separate retirement gate passes. | Inspection |

## Dependencies

- **Upstream**: [FR-020](./FR-020-define-semantic-type-system-and-identity.md), [FR-022](./FR-022-define-mappings-profiles-and-transformations.md)
- **Downstream**: compatibility gate issue #7, readiness issue #12, all migration and retirement tickets
