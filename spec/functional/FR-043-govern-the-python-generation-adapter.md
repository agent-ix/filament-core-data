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

- The committed official bundle `spikes/typespec-feasibility/generated/official/json-schema/semantic.json`
- The committed adapter output `spikes/typespec-feasibility/generated/custom/python/input.schema.json`
- The committed codegen-confidence goldens `spikes/typespec-feasibility/generated/custom/python/models.py` and `models_dataclass.py`
- The pinned `datamodel-code-generator` 0.76.0 and `pydantic` 2.12.5 versions the issue #4 evidence records

## Outputs

- `src/compiler/backends/python-schema.mjs` exporting `normalizeJsonSchemaForPython(schema)` and the pinned constants `DATAMODEL_CODEGEN_VERSION` and `PYDANTIC_VERSION`
- The preserved issue #31 `$id` defect evidence: the committed official bundle, which carries the relative `RecordString.json` `$id`, and the committed adapter output that works around it

## Behavior

- The adapter SHALL rewrite every `$ref` whose value equals a `$defs` entry's declared `$id` into the local pointer `#/$defs/<name>` for that entry.
- The adapter SHALL rewrite the literal `$ref` value `RecordString.json` into `#/$defs/RecordString`, because the official emitter emits that shared helper with a relative `$id` that resolves under no single namespace base (issue #31).
- The adapter SHALL rewrite the `$defs` entry named `RecordString` so its `unevaluatedProperties` becomes `additionalProperties`, because `datamodel-code-generator` does not read the 2019-09 keyword.
- The adapter SHALL delete `$id` and `$schema` from every `$defs` entry.
- Where a `$defs` entry declares no `title`, the adapter SHALL derive one by capitalising the name's alphanumeric segments.
- If the schema carries any of the keys `x-python-import`, `customTypePath`, or `default_factory` at any depth, then the adapter SHALL throw an error naming the offending key and produce no output, because those keys make the generator emit caller-controlled Python.
- The adapter SHALL set the normalized document's top-level `$id` to `urn:agent-ix:typespec-feasibility:python-input:1`.
- The adapter SHALL return a deep-equal document for the same input document on every call, leaving the input document unmutated.
- The adapter SHALL perform no filesystem, no network, and no clock access.
- The Python code generation itself SHALL remain the official `datamodel-code-generator`.
- This repository SHALL NOT own a hand-written Python code generator.
- The promotion SHALL leave the `datamodel-code-generator` invocation with its caller; a supported Python generation route belongs to issue #23, which consumes this adapter and these pinned constants.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-043-CON-1 | The maintainer SHALL NOT narrow the forbidden-key set to make a schema pass; widening it is a spec amendment. | Security | Branch diff and adapter test |
| FR-043-CON-2 | The `$ref` localisation and the `RecordString.json` alias are two halves of one issue #31 workaround; when issue #31 is fixed upstream the maintainer SHALL remove both in one change rather than weaken either. | Integrity | Issue #31 acceptance |
| FR-043-CON-3 | This adapter's `$id` stripping and [FR-033](./FR-033-emit-semantic-core-json-schema.md)'s `$id` absolutisation are two different consumers of the same upstream defect, not a contradiction: FR-033 publishes addressable schemas, this adapter localises a single-file generator input. The maintainer SHALL NOT change either to match the other. | Compatibility | Inspection |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-043-AC-1 | `normalizeJsonSchemaForPython` over the committed official bundle serialises to bytes equal to the committed `generated/custom/python/input.schema.json`. | Test |
| FR-043-AC-2 | A schema carrying `x-python-import` throws naming that key; likewise `customTypePath` and `default_factory`, including when the key is nested inside a `$defs` entry. | Test |
| FR-043-AC-3 | The normalized document carries the fixed `urn:` `$id`, no `$defs` entry retains `$id` or `$schema`, and every `$defs` entry carries a `title`. | Test |
| FR-043-AC-4 | The `RecordString` entry carries `additionalProperties` and no `unevaluatedProperties`, and no `$ref` to `RecordString.json` survives. | Test |
| FR-043-AC-5 | Calling the adapter twice returns deep-equal documents and leaves the input document deep-equal to its pre-call state. | Test |
| FR-043-AC-6 | The committed official bundle, the committed adapter output, and both committed `models*.py` goldens are unchanged from `origin/main` on the branch. | Analysis |
| FR-043-AC-7 | `DATAMODEL_CODEGEN_VERSION` equals `0.76.0` and `PYDANTIC_VERSION` equals `2.12.5`, matching `spikes/typespec-feasibility/evidence/toolchain.json`. | Test |
| FR-043-AC-8 | No module under `src/compiler/` spawns a process, so the generator invocation is demonstrably not promoted. | Test |

## Dependencies

- **Upstream**: [FR-041](./FR-041-promote-the-semantic-ir-emitter.md), [FR-033](./FR-033-emit-semantic-core-json-schema.md), issue #31
- **Downstream**: issue #23 (Python package)
