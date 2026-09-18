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

The semantic IR document SHALL declare its revision through
`contractVersion`, with `source.dialect` identifying the producing frontend per
ADR-0005.

Every `package-manifest` target string SHALL resolve to a declared registry
value: a `target-contract.target` generated target or a `representation.format`
representation.

## Inputs

- A semantic IR document's `source` block
- A package manifest's top-level `targets[]` and per-profile `targets[]`

## Outputs

- A `source.dialect` value drawn from the frontend-dialect enumeration
- Manifest target strings validated against the target-contract enumeration
- Validation diagnostics for a stale JSON Schema dialect constant or an unknown target

## Behavior

- An IR document SHALL carry `contractVersion: "2.0.0"`, the only version.
- A request naming any other `contractVersion` SHALL be refused before target emission (FR-019-CON-2), named by `agent-ix.compiler.UNKNOWN_CONTRACT_VERSION` ([FR-063](./FR-063-declare-the-generation-backend-seam.md)-AC-10).
- The `source.dialect` value SHALL be one of `typespec` or `spec-bundle`.
- The `source.dialect` value SHALL be `typespec` for documents produced by the TypeSpec frontend.
- The `source.dialect` value SHALL admit `spec-bundle` for documents produced by the spec-bundle extraction frontend defined in issue #36, so that the frontend identity is declared before that frontend exists.
- If a document carries the v1 constant `https://json-schema.org/draft/2020-12/schema` as its dialect, then IR validation SHALL fail at `source.dialect` with a diagnostic naming ADR-0005.
- The published fixtures SHALL include one hand-authored golden document with `source.dialect: spec-bundle`, because no frontend emits it until issue #36 lands.
- The `package-manifest.targets[]` items and each `profiles[].targets[]` item SHALL validate against the declared registry: the `target-contract.target` enumeration (`json-schema`, `rust`, `typescript`, `python-pydantic-v2`, `python-dataclass`) or the `representation.format` enumeration (`markdown`, `json`, `postgresql`, `protobuf`, `avro`, `arrow`, `parquet`, `csv`, `tsv`), because the v1 manifest fixture already selects `markdown` as a target.
- If a manifest names a target outside that enumeration, then manifest validation SHALL fail at the offending entry with its locus.
- The common schema SHALL define the generated-target and representation-format enumerations once.
- The manifest, target-contract, and representation schemas SHALL reference those single common definitions.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-030-CON-2 | The common schema SHALL be the only definition of the generated-target and representation-format enumerations, so the manifest, target-contract, and representation schemas cannot diverge. | Integrity | Static schema check |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-030-AC-1 | A `2.0.0` IR document with `source.dialect: typespec` validates, and one with `spec-bundle` validates. | Test |
| FR-030-AC-2 | A `2.0.0` IR document carrying the JSON Schema `$schema` URI as `source.dialect` fails validation with a diagnostic that cites ADR-0005. | Test |
| FR-030-AC-3 | A manifest with `targets: ["rust", "markdown"]` validates; a manifest with `targets: ["go"]` fails at that entry. | Test |
| FR-030-AC-4 | The manifest, target-contract, and representation schemas reference the shared common enumeration definitions. | Analysis |
| FR-030-AC-5 | A document with `contractVersion: "1.3.0"` (or any value other than `2.0.0`) fails before target emission, named by `agent-ix.compiler.UNKNOWN_CONTRACT_VERSION`. | Test |
| FR-030-AC-6 | A `2.0.0` document with `source.dialect: avro` fails validation at `source.dialect`. | Test |

## Dependencies

- **Upstream**: [FR-019](./FR-019-select-v1-structural-source-and-ir.md), [FR-024](./FR-024-define-compilation-and-generated-target-contracts.md), ADR-0005
- **Downstream**: extraction frontend (issue #36), package publication (issue #11)
