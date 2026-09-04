---
id: FR-033
title: "Emit the semantic-core JSON Schema projection"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-007"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-031"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-032"
    type: "depends_on"
---
# [FR-033] Emit the semantic-core JSON Schema projection

## Description

The semantic-core build SHALL emit the package to JSON Schema 2020-12 with the
official TypeSpec emitter, apply the pinned issue #31 `$id` normalization, and
commit the result so modules can reference `FieldDecl.json` and its siblings
from `data_schema`.

## Inputs

- The compiled semantic-core program
- The pinned `@typespec/json-schema` 1.15.0 emitter
- The issue #31 normalization step (rewrites any relative `$id` to an absolute one under the package base)

## Outputs

- `packages/semantic-core/generated/json-schema/*.json`, one file per model and enum, with absolute `$id` values under `https://schemas.agent-ix.org/semantic-core/<package.json version>/`
- `packages/semantic-core/generated/toolchain.json` recording compiler, emitter, and normalization versions
- `fixtures/semantic-core/positive/config-version-field-decls.json` (the FR-006 rows as a `FieldDecl[]` declaration set) and `fixtures/semantic-core/negative/<model>-*.json` (at least one per grammar model)
- A `check` script (`make semantic-core-check`) that regenerates and fails on any byte difference

## Behavior

- The build SHALL run only the official `@typespec/json-schema` emitter with `seal-object-schemas: true`, with no custom emitter.
- The emitted bundle SHALL carry an absolute `$id` for every emitted schema after the pinned #31 normalization.
- When the emitter produces no relative `$id`, the normalization step SHALL record itself as a no-op in `toolchain.json`.
- The normalization SHALL be a named, versioned post-processing step recorded in `toolchain.json` against the exact TypeSpec and emitter versions.
- The emitted `FieldDecl.json` SHALL validate every element of the FR-006 `FieldDecl[]` fixture with Ajv 2020 in strict mode without any further alias.
- The emitted schemas SHALL reject every negative fixture at its model schema, where negative fixtures exercise shape errors (missing required property, unknown property, wrong type, keyword or category outside the closed set).
- The sealing option SHALL close every emitted object schema, emitting either `unevaluatedProperties: {not: {}}` or `additionalProperties: false`, and the test accepts either form.
- If regeneration produces bytes that differ from the committed output, then the `check` script SHALL exit non-zero naming the first differing file.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-033-CON-1 | The emitted output SHALL be reproducible byte-for-byte from the pinned toolchain; the recorded output digest in `toolchain.json` is the cross-host oracle. | Reproducibility | Determinism test and digest comparison |
| FR-033-CON-2 | When issue #31 is fixed upstream, the maintainer SHALL remove the normalization step from the semantic-core build and from the projection backend (issue #24) in one change rather than weaken it. | Integrity | Issue #31 acceptance |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-033-AC-1 | One schema file exists per inventory model and enum with an absolute `$id` under the package base. | Analysis |
| FR-033-AC-2 | Every element of the FR-006 `FieldDecl[]` fixture validates against `FieldDecl.json` under Ajv strict mode with no alias. | Test |
| FR-033-AC-3 | Each negative fixture fails against its named model schema, and at least one exists per grammar model. | Test |
| FR-033-AC-4 | Regenerating twice yields byte-identical output equal to the recorded digest; a mutated byte makes the `check` script fail naming the file. | Test |
| FR-033-AC-5 | `toolchain.json` pins the compiler, emitter, and normalization versions and equals the lockfile's resolved versions. | Analysis |

## Dependencies

- **Upstream**: [FR-031](./FR-031-define-the-semantic-core-declaration-grammar.md), [FR-032](./FR-032-define-the-kernel-scalar-library.md), issue #31
- **Downstream**: Quoin issue #293 (`data_schema` by path + digest), issue #11 publication, issue #24 projection backend
