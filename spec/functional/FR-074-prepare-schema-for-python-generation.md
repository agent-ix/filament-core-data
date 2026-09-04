---
id: FR-074
title: "Prepare the semantic JSON Schema for Python generation"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-013"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-043"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-073"
    type: "depends_on"
---
# [FR-074] Prepare the semantic JSON Schema for Python generation

## Description

The repository SHALL own a deterministic preparation pass that closes the
measured retained gaps between the emitted JSON Schema and what the pinned
generator reads, and that pass SHALL be additive to
[FR-043](./FR-043-govern-the-python-generation-adapter.md)'s normalizer rather
than a replacement for it.

## Inputs

- A JSON Schema document, either the official TypeSpec bundle or a published `schema/semantic/v1/*.schema.json` document
- `normalizeJsonSchemaForPython` from `src/compiler/backends/python-schema.mjs`
- The selected profile of [FR-073](./FR-073-declare-immutable-python-target-profiles.md)

## Outputs

- `python_backend/adapter/prepare.mjs` exporting `prepareForPython(schema, profileId)`
- The `preparation` record in the generation result: the ordered list of rewrites applied, each naming its rule and the JSON pointer it applied at

## Behavior

- `prepareForPython` SHALL apply `normalizeJsonSchemaForPython` first, leaving that function unaltered, because [FR-043](./FR-043-govern-the-python-generation-adapter.md)'s byte-golden pins its output.
- The pass SHALL rewrite `unevaluatedProperties` into the equivalent `additionalProperties` at every subschema that declares it, not only at the `RecordString` entry FR-043 handles, because the pinned generator does not read the 2019-09 keyword and therefore emits an open model for a sealed one.
- The pass SHALL write `additionalProperties: false` where `unevaluatedProperties` is `false` or the always-false schema `{"not": {}}`, and the declared subschema otherwise.
- If a subschema declares both `unevaluatedProperties` and `additionalProperties` with different values, then the pass SHALL throw naming the pointer, rather than choose between two stated intents.
- The pass SHALL record every rewrite it applies with its rule name and JSON pointer, so a generated difference is attributable to a rule rather than to the pass as a whole.
- The pass SHALL be a pure function, returning a deep-equal result for the same input document and profile id on every call, leaving the input document unmutated, and reading no filesystem, network, or clock.
- The pass SHALL copy every regular expression verbatim, normalizing, simplifying, and dropping none of them, including the four ECMAScript lookaheads in the published `sourceLocus` path pattern, which Python's `re` supports.
- The pass SHALL introduce no schema keyword the input did not carry, other than the declared rewrites, and delete no constraint keyword.
- Where the pass cannot close a measured gap, the qualification SHALL carry that gap into the retained-gap register of [FR-077](./FR-077-qualify-each-python-output-family.md) rather than approximate it.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-074-CON-1 | The pass SHALL remain a schema-to-schema rewrite that post-processes no generated Python source, because a text patch over generated code is a hand-written generator by another name. | Integrity | Inspection and test |
| FR-074-CON-2 | The maintainer SHALL NOT add a rewrite that removes a constraint to make a family pass; a family that cannot carry a constraint is a verdict, not a rewrite. | Security | Branch diff and gate |
| FR-074-CON-3 | `normalizeJsonSchemaForPython` and its committed golden SHALL be unchanged by this requirement; FR-043-AC-1 stays green. | Compatibility | Branch diff against `origin/main` |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-074-AC-1 | `prepareForPython` over the committed official bundle produces a document whose `normalizeJsonSchemaForPython` half is byte-identical to the committed `input.schema.json` before the additive rewrites are applied. | Test |
| FR-074-AC-2 | A subschema declaring `unevaluatedProperties: {"not": {}}` becomes `additionalProperties: false`, at every depth, and no `unevaluatedProperties` key survives. | Test |
| FR-074-AC-3 | Generating from the prepared published `common.schema.json` yields a Pydantic model configured `extra='forbid'` for a sealed type, where generating from the unprepared document yields `extra='allow'`. | Test |
| FR-074-AC-4 | A subschema declaring both `unevaluatedProperties: false` and `additionalProperties: {"type": "string"}` throws naming its pointer. | Test |
| FR-074-AC-5 | The `preparation` record names every rewrite with its rule and pointer, and the record is empty for a document that needs none. | Test |
| FR-074-AC-6 | Calling the pass twice returns deep-equal documents and leaves the input deep-equal to its pre-call state. | Test |
| FR-074-AC-7 | The `sourceLocus` path pattern survives the pass byte-for-byte, lookaheads included, and compiles under Python's `re`. | Test |
| FR-074-AC-8 | Over every published `schema/semantic/v1/*.schema.json`, the prepared document carries the same set of constraint keywords as the input, with only the declared rewrites as differences. | Property |
| FR-074-AC-9 | The pass reads no file, opens no socket, and reads no clock during a call. | Test |
| FR-074-AC-10 | The committed `src/compiler/backends/python-schema.mjs` and `spikes/typespec-feasibility/generated/custom/python/input.schema.json` are unchanged from `origin/main` on this branch. | Analysis |

## Dependencies

- **Upstream**: [FR-043](./FR-043-govern-the-python-generation-adapter.md), [FR-073](./FR-073-declare-immutable-python-target-profiles.md)
- **Downstream**: [FR-076](./FR-076-run-python-generation-sandboxed.md), [FR-077](./FR-077-qualify-each-python-output-family.md)
