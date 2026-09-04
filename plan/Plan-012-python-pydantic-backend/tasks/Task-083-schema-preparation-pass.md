---
id: Task-083
title: "The owned schema preparation pass and the multi-document input mode"
type: Task
status: todo
track: B
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/FR-074"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-863"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-864"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-865"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-866"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-867"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-868"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-869"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-870"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-871"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-872"
    type: verifies
---
# Task-083: The owned schema preparation pass and the multi-document input mode

## Scope

Own the one rewrite the measurement showed is needed — `unevaluatedProperties` to `additionalProperties` — and the multi-document form the thirteen published schemas require, without touching FR-043's normalizer or any published document.

## Subtasks

- [ ] Implement `prepare_for_python` and `prepare_input_set` in `python_backend/adapter/prepare.py`.
- [ ] Rewrite `unevaluatedProperties` at every depth and inside every applicator; raise on a subschema stating closure twice with differing values.
- [ ] Preserve every relative `$ref` and every regular expression verbatim, including the four-lookahead `sourceLocus` pattern.
- [ ] Record every rewrite with its rule, document, and pointer.
- [ ] Demonstrate the closure difference by generating from the prepared and the unprepared adapter output and comparing the emitted model configuration.
- [ ] Property-test purity, keyword preservation, and `$ref` preservation over the thirteen published documents.

## Deliverables

- `python_backend/adapter/prepare.py`
- `tests/test_python_backend_prepare.py`

## Notes

- The pass does not call `normalizeJsonSchemaForPython`: that function stamps a spike `urn:` `$id` and deletes every `$defs` `$id` and `$schema`, which over a published document destroys the identities its cross-file `$ref`s resolve through.
- Where the input is the committed adapter output, the committed file is consumed as-is, so FR-043's byte-golden stays the authority for its own half.
