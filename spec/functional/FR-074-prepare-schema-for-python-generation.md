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
  - target: "ix://agent-ix/filament-core-data/FR-077"
    type: "depends_on"
---
# [FR-074] Prepare the semantic JSON Schema for Python generation

## Description

The repository SHALL own a deterministic, schema-to-schema preparation pass that
closes the measured gaps between the JSON Schema this program emits and what the
pinned generator reads, leaving
[FR-043](./FR-043-govern-the-python-generation-adapter.md)'s normalizer and its
committed golden untouched.

## Inputs

- An input set: either the single committed adapter output `spikes/typespec-feasibility/generated/custom/python/input.schema.json`, or the thirteen published `schema/semantic/v1/*.schema.json` documents as one directory
- The selected profile of [FR-073](./FR-073-declare-immutable-python-target-profiles.md)

## Outputs

- `python_backend/adapter/prepare.py` exposing `prepare_for_python(document)` and `prepare_input_set(paths)`
- The `preparation` record in the generation result: the ordered list of rewrites applied, each naming its rule and the JSON pointer it applied at

## Behavior

- `prepare_for_python` SHALL NOT call `normalizeJsonSchemaForPython`: that function is defined over the official TypeSpec bundle alone, and it stamps a spike-specific `urn:` `$id` and deletes every `$defs` `$id` and `$schema`, which over a published `schema/semantic/v1/*.schema.json` document would destroy the very identities that document's cross-file `$ref`s resolve through.
- Where the input is the committed adapter output, the pass SHALL consume that committed file, which already carries FR-043's normalization, so that FR-043's byte-golden remains the authority for its own half and nothing re-derives it.
- The pass SHALL rewrite `unevaluatedProperties` into the equivalent `additionalProperties` at every subschema that declares it, because the pinned generator reads neither the keyword nor the always-false schema `{"not": {}}` the official emitter writes, and therefore generates an open model for a sealed one in every one of the five families.
- The pass SHALL write `additionalProperties: false` where `unevaluatedProperties` is `false` or the always-false schema `{"not": {}}`, and the declared subschema otherwise.
- If a subschema declares both `unevaluatedProperties` and `additionalProperties` with values that are not deep-equal, then the pass SHALL raise an error naming the pointer rather than choose between two stated intents.
- `prepare_input_set` SHALL accept the multi-document form, preserving every relative `$ref` unchanged, because the thirteen published documents `$ref` one another by relative filename and the generator resolves those itself as a modular input directory, emitting one module per document.
- `prepare_input_set` SHALL write the prepared documents under their original file names, so a relative `$ref` that resolved before the pass resolves after it.
- The pass SHALL record every rewrite it applies with its rule name, its document, and its JSON pointer, so a generated difference is attributable to a rule rather than to the pass as a whole.
- The pass SHALL be a pure function of its input documents, returning a deep-equal result on every call, leaving the input documents unmutated, and reading no clock and no network.
- The pass SHALL copy every regular expression verbatim, normalizing, simplifying, and dropping none of them, including the four ECMAScript lookaheads in the published `sourceLocus` path pattern, which Python's `re` supports.
- The pass SHALL introduce no schema keyword the input did not carry, other than the declared rewrites, and delete no constraint keyword.
- Where the pass cannot close a measured gap, the qualification SHALL carry that gap into the retained-gap register of [FR-077](./FR-077-qualify-each-python-output-family.md) rather than approximate it.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-074-CON-1 | The pass SHALL remain a schema-to-schema rewrite that post-processes no generated Python source, because a text patch over generated code is a hand-written generator by another name. | Integrity | Test |
| FR-074-CON-2 | The maintainer SHALL NOT add a rewrite that removes a constraint to make a family pass; a family that cannot carry a constraint is a verdict, not a rewrite. | Security | Test |
| FR-074-CON-3 | This requirement SHALL change no byte of `src/compiler/backends/python-schema.mjs`, of its committed golden `spikes/typespec-feasibility/generated/custom/python/input.schema.json`, or of any published `schema/semantic/v1/*.schema.json` document, so FR-043-AC-1 stays green and the published schemas stay published. | Compatibility | Analysis |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-074-AC-1 | The prepared committed adapter output differs from the committed file only by the declared rewrites, and the `preparation` record names each of those differences by pointer. | Test |
| FR-074-AC-2 | A subschema declaring `unevaluatedProperties: {"not": {}}` becomes `additionalProperties: false`, at any nesting depth and inside any applicator, and no `unevaluatedProperties` key survives anywhere in the prepared document. | Property |
| FR-074-AC-3 | Generating the prepared committed adapter output under the `pydantic_v2.BaseModel` profile yields `extra='forbid'` for `SourceLocus`, where generating the unprepared file yields `extra='allow'`; the same pair holds for `pydantic_v2.dataclass` and for `typing.TypedDict`'s `closed=True`. | Integration |
| FR-074-AC-4 | A subschema declaring `unevaluatedProperties: false` and `additionalProperties: {"type": "string"}` raises naming its pointer, while one declaring both with deep-equal values does not. | Test |
| FR-074-AC-5 | The `preparation` record names every rewrite with its rule, document, and pointer, and is empty for a document that needs none. | Test |
| FR-074-AC-6 | Calling the pass twice returns deep-equal results and leaves every input document deep-equal to its pre-call state. | Property |
| FR-074-AC-7 | The `sourceLocus` path pattern survives the pass byte-for-byte, lookaheads included, and compiles under Python's `re`. | Test |
| FR-074-AC-8 | Over the thirteen published documents, the prepared set carries the same multiset of constraint keywords as the input set and the same set of `$ref` values, with only the declared rewrites as differences. | Property |
| FR-074-AC-9 | The pass opens no socket and reads no clock during a call, and reads only the files it was given. | Test |
| FR-074-AC-10 | `src/compiler/backends/python-schema.mjs`, the committed `input.schema.json`, and every `schema/semantic/v1/*.schema.json` are byte-identical to `origin/main` on this branch. | Analysis |
| FR-074-AC-11 | No module in `python_backend/adapter/` writes to a path under the generated tree or edits generated Python text, asserted by source analysis over its imports and calls. | Static |

## Dependencies

- **Upstream**: [FR-043](./FR-043-govern-the-python-generation-adapter.md), [FR-073](./FR-073-declare-immutable-python-target-profiles.md)
- **Downstream**: [FR-076](./FR-076-run-python-generation-sandboxed.md), [FR-077](./FR-077-qualify-each-python-output-family.md)
