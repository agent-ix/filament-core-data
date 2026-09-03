---
id: FR-030
title: "Bind the IR source dialect and manifest targets to their contracts"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-006"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-019"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-024"
    type: "depends_on"
---
# [FR-030] Bind the IR source dialect and manifest targets to their contracts

## Description

The semantic IR v1.1 `source.dialect` value SHALL identify the TypeSpec
frontend per ADR-0005, and every `package-manifest` target string SHALL
resolve to a `target-contract.target` value.

## Inputs

- A semantic IR document's `source` block
- A package manifest's top-level `targets[]` and per-profile `targets[]`

## Outputs

- A `source.dialect` value drawn from the frontend-dialect enumeration
- Manifest target strings validated against the target-contract enumeration
- Validation diagnostics for a stale JSON Schema dialect constant or an unknown target

## Behavior

- The `source.dialect` value SHALL be `typespec` for documents produced by the TypeSpec frontend.
- The `source.dialect` value SHALL admit `spec-bundle` for documents produced by the spec-bundle extraction frontend defined in issue #36, so that the frontend identity is declared before that frontend exists.
- If a v1.1 document carries the v1 constant `https://json-schema.org/draft/2020-12/schema` as its dialect, then IR validation SHALL fail at `source.dialect` with a diagnostic naming ADR-0005.
- The `package-manifest.targets[]` items and each `profiles[].targets[]` item SHALL validate against the same enumeration as `target-contract.target`: `json-schema`, `rust`, `typescript`, `python-pydantic-v2`, `python-dataclass`.
- If a manifest names a target outside that enumeration, then manifest validation SHALL fail at the offending entry with its locus.
- The common schema SHALL define the target enumeration once.
- The manifest and target-contract schemas SHALL reference that single common definition.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-030-CON-1 | The v1 `contractVersion: "1.0.0"` fixture SHALL remain valid under the v1 schema; the dialect fix applies to v1.1 documents only. | Compatibility | Existing-fixture suite |
| FR-030-CON-2 | A change that adds a target to the enumeration SHALL update the manifest and target-contract schemas in the same commit, so the two never diverge. | Integrity | Schema inspection |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-030-AC-1 | A v1.1 IR document with `source.dialect: typespec` validates. | Test |
| FR-030-AC-2 | A v1.1 IR document carrying the JSON Schema `$schema` URI as `source.dialect` fails validation with a diagnostic that cites ADR-0005. | Test |
| FR-030-AC-3 | A manifest with `targets: ["rust", "json-schema"]` validates; a manifest with `targets: ["go"]` fails at that entry. | Test |
| FR-030-AC-4 | The manifest and target-contract schemas reference one shared target enumeration definition. | Inspection |

## Dependencies

- **Upstream**: [FR-019](./FR-019-select-v1-structural-source-and-ir.md), [FR-024](./FR-024-define-compilation-and-generated-target-contracts.md), ADR-0005
- **Downstream**: extraction frontend (issue #36), package publication (issue #11)
