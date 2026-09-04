---
id: FR-043
title: "Govern the Python generation adapter"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-009"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-041"
    type: "depends_on"
---
# [FR-043] Govern the Python generation adapter

## Description

The repository SHALL own the JSON Schema adapter that prepares the official
TypeSpec JSON Schema bundle for `datamodel-code-generator`, and the adapter SHALL
reject every executable schema extension rather than pass it to the generator.

## Inputs

- The official `@typespec/json-schema` 1.15.0 bundle for a semantic package
- The pinned `datamodel-code-generator` 0.76.0 and `pydantic` 2.12.5 versions recorded by the issue #4 evidence

## Outputs

- `src/compiler/backends/python-schema.mjs` exporting `normalizeJsonSchemaForPython(schema)`
- The preserved issue #31 `$id` defect fixture and the resulting normalized input schema

## Behavior

- The adapter SHALL rewrite every `$ref` that names a definition `$id` into a local `#/$defs/<name>` pointer, so the bundle resolves without a validator-side URI alias.
- The adapter SHALL rewrite the generated `Record<string>` helper's `unevaluatedProperties` into `additionalProperties`, because `datamodel-code-generator` does not read the 2019-09 keyword.
- The adapter SHALL strip `$id` and `$schema` from every definition.
- Where a definition declares no `title`, the adapter SHALL derive one from the definition name.
- If the schema carries any of the keys `x-python-import`, `customTypePath`, or `default_factory`, then the adapter SHALL throw an error naming the offending key and produce no output, because those keys make the generator emit caller-controlled Python.
- The adapter SHALL stamp the deterministic `$id` `urn:agent-ix:typespec-feasibility:python-input:1` on the normalized document.
- The adapter SHALL return a deep-equal document for the same input document on every call, leaving the input unmutated.
- The adapter SHALL perform no filesystem and no network access.
- The Python code generation itself SHALL remain the official `datamodel-code-generator`.
- This repository SHALL NOT own a hand-written Python code generator.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-043-CON-1 | The forbidden-key set SHALL NOT be narrowed to make a schema pass; widening it is a spec amendment. | Security | Adapter test |
| FR-043-CON-2 | The issue #31 `$id` defect fixture SHALL remain in the tree and reproducible until issue #31 is fixed upstream, at which point the adapter's `$ref` rewriting is removed in one change rather than weakened. | Integrity | Fixture test and issue #31 acceptance |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-043-AC-1 | `normalizeJsonSchemaForPython` over the retained official bundle equals the retained `generated/custom/python/input.schema.json` byte-for-byte. | Test |
| FR-043-AC-2 | A schema carrying `x-python-import` throws naming that key; likewise `customTypePath` and `default_factory`. | Test |
| FR-043-AC-3 | The normalized document carries the fixed `urn:` `$id`, no definition-level `$id` or `$schema`, and a `title` on every definition. | Test |
| FR-043-AC-4 | The `RecordString` definition carries `additionalProperties` and no `unevaluatedProperties`. | Test |
| FR-043-AC-5 | Calling the adapter twice returns deep-equal documents and leaves the input document unmutated. | Test |
| FR-043-AC-6 | The issue #31 defect fixture and the codegen-confidence goldens remain present and reproducible after the promotion. | Test |

## Dependencies

- **Upstream**: [FR-041](./FR-041-promote-the-semantic-ir-emitter.md), [FR-033](./FR-033-emit-semantic-core-json-schema.md), issue #31
- **Downstream**: issue #23 (Python package)
