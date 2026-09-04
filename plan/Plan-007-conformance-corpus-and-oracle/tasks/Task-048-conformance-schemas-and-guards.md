---
id: Task-048
title: "Conformance schemas, changed-path guard, and red suites"
type: Task
status: pending
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/NFR-016"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-338"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-339"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-340"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-341"
    type: verifies
---
# Task-048: Conformance schemas, changed-path guard, and red suites

## Scope

Land the conformance schema set, the isolation gates, and the two failing suites before any case or oracle exists, so every later task turns a real red gate green.

## Subtasks

- [ ] Author `conformance/schema/input-bundle.schema.json` composing `semantic-ir`, `package-manifest`, `package-lock`, `profile`, `mapping`, and `consumer-policy` by reference.
- [ ] Author `corpus-case.schema.json`, `corpus-manifest.schema.json`, and `adapter-result.schema.json`.
- [ ] Add `test/conformance-corpus.test.ts` and `tests/test_conformance_corpus.py` with the failing gate skeletons.
- [ ] Add the changed-path gate asserting no branch file under the NFR-016 prohibited set and no lockfile change.
- [ ] Add the manifest-diff gate asserting no added dependency and no `exports` or `files` entry.
- [ ] Add the `conformance` and `conformance-audit` Make targets and the `conformance` package script.

## Deliverables

- `conformance/schema/*.schema.json`
- `test/conformance-corpus.test.ts`
- `tests/test_conformance_corpus.py`
- `Makefile` targets and one `package.json` script

## Notes

- The Python suite uses the already-pinned `jsonschema`; no dependency is added.
- `make test` already runs in CI, so the gates need no workflow change.
