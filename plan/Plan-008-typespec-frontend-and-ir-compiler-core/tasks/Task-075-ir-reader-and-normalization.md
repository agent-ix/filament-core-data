---
id: Task-075
title: "IR schema validation, cross-field reader, and normalization"
type: Task
status: pending
track: B
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/FR-050"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-510"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-511"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-512"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-513"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-514"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-515"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-516"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-517"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-518"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-519"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-520"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-521"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-522"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-523"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-524"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-525"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-526"
    type: verifies
---
# Task-075: IR schema validation, cross-field reader, and normalization

## Scope

The compiler's own IR reader, the normalized serialization, and the IR fingerprint.

## Subtasks

- [ ] `src/compiler/ir/schema.mjs`: ajv 2020-12 validation against the published schema, one `INVALID_IR` per error naming the failing instance pointer.
- [ ] `src/compiler/ir/reader.mjs`: the 22 cross-field rules, each with its own `agent-ix.semantic-ir.*` code, written from the requirement table and not from the issue #34 reader.
- [ ] `importedExports` with its `unknown` marker and the recorded suppression.
- [ ] Termination on cyclic aliases, cyclic composite graphs, `maxNodes`, `maxDepth`, and `maxCollectionItems`.
- [ ] `src/compiler/ir/normalize.mjs`: `canonicalIr` over the declared identity-keyed sets, `normalizeIr` materialising the `1.1.0` members, `fingerprintIr`.
- [ ] The three-way differential: the compiler reader, the issue #34 TypeScript reader, and `poetry run python tests/semantic_ir_reader.py`, run from `test/` with neither of the other two edited.
- [ ] Property tests for idempotence and for the fingerprint's ordering insensitivity; a 512-mutation fuzz run.

## Deliverables

- `schema.mjs`, `reader.mjs`, `normalize.mjs`, and their tests.

## Notes

- FR-050-CON-1: the third reader is deliberate. It imports neither of the other two, so their agreement is evidence rather than a tautology, and the schema plus FR-027..029 remain the authority.
