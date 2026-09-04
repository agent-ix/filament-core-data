---
id: FR-033
title: "Emit the semantic-core JSON Schema projection"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-007"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-031"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-030"
    type: "depends_on"
---
# [FR-033] Emit the semantic-core JSON Schema projection

## Description

The build SHALL emit the semantic-core package to JSON Schema 2020-12 with the
official TypeSpec emitter, apply the pinned issue #31 `$id` alias
normalization, and commit the result so modules can reference
`FieldDecl.json` and its siblings from `data_schema`.

## Inputs

- The compiled semantic-core program
- The pinned `@typespec/json-schema` emitter version
- The issue #31 normalization step (validation-only URI alias for the shared `Record<string>` helper)

## Outputs

- `packages/semantic-core/generated/json-schema/*.json`, one file per model, with absolute `$id` values under `https://schemas.agent-ix.org/semantic-core/<version>/`
- A `check` script that regenerates and fails on any byte difference

## Behavior

- The build SHALL run only the official `@typespec/json-schema` emitter; no custom emitter is part of this requirement.
- The emitted bundle SHALL carry an absolute `$id` for every model, including the shared `Record<string>` helper after the pinned #31 normalization.
- The normalization SHALL be a named, versioned post-processing step recorded against the exact TypeSpec and emitter versions.
- The emitted `FieldDecl.json` SHALL validate the FR-006 `ConfigVersion` `FieldDecl[]` fixture with Ajv 2020 in strict mode without any further alias.
- The emitted schemas SHALL reject every negative fixture: one per grammar model.
- If regeneration produces bytes that differ from the committed output, then the `check` script SHALL exit non-zero naming the file.
- The emitted schemas SHALL set `additionalProperties: false` on every model (`seal-object-schemas`).

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-033-CON-1 | The emitted output SHALL be reproducible byte-for-byte from the pinned toolchain on any host. | Reproducibility | Determinism test |
| FR-033-CON-2 | When issue #31 is fixed upstream, the build SHALL remove the `$id` normalization rather than weaken it. | Integrity | Issue #31 acceptance |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-033-AC-1 | `FieldDecl.json`, `TypeRef.json`, `Multiplicity.json`, `ConstraintDecl.json`, `RelationDecl.json`, `OperationDecl.json`, `ClauseRef.json`, `EnumValue.json`, and `KernelScalar.json` exist with absolute `$id` values. | Test |
| FR-033-AC-2 | The FR-006 `FieldDecl[]` fixture validates against `FieldDecl.json` under Ajv strict mode with no alias. | Test |
| FR-033-AC-3 | Each of the nine negative fixtures fails against its model schema. | Test |
| FR-033-AC-4 | Regenerating twice yields byte-identical output; the `check` script passes. | Test |
| FR-033-AC-5 | The #31 normalization is pinned to the exact compiler and emitter versions in a recorded manifest. | Analysis |

## Dependencies

- **Upstream**: [FR-031](./FR-031-define-the-semantic-core-declaration-grammar.md), [FR-030](./FR-030-bind-source-dialect-and-manifest-targets.md), issue #31
- **Downstream**: Quoin issue #293 (`data_schema` by path + digest), issue #11 publication
