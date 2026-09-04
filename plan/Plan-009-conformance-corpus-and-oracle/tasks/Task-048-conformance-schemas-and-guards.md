---
id: Task-048
title: "Conformance schemas, changed-path guard, and red suites"
type: Task
status: done
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/NFR-016"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-638"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-639"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-640"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-641"
    type: verifies
---
# Task-048: Conformance schemas, changed-path guard, and red suites

## Scope

Land the conformance schema set, the isolation gates, and the two failing suites before any case or oracle exists, so every later task turns a real red gate green.

## Subtasks

- [x] Author `conformance/schema/input-bundle.schema.json` composing `semantic-ir`, `package-manifest`, `package-lock`, `profile`, `mapping`, and `consumer-policy` by reference.
- [x] Author `corpus-case.schema.json`, `corpus-manifest.schema.json`, and `adapter-result.schema.json`.
- [x] Add `test/conformance-corpus.test.ts` and `tests/test_conformance_corpus.py` with the failing gate skeletons.
- [x] Add the changed-path gate asserting no branch file under the NFR-016 prohibited set and no lockfile change.
- [x] Add the manifest-diff gate asserting no added dependency and no `exports` or `files` entry.
- [x] Add the `conformance` and `conformance-audit` Make targets, calling `node` directly so `package.json` stays byte-identical to `main`.

## Deliverables

- `conformance/schema/*.schema.json`
- `test/conformance-corpus.test.ts`
- `tests/test_conformance_corpus.py`
- `Makefile` targets; `package.json` is untouched

## Notes

- The Python suite uses the already-pinned `jsonschema`; no dependency is added.
- `make test` already runs in CI, so the gates need no workflow change.
