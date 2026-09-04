---
id: Task-054
title: "Coverage account, thresholds, mutation catalogue, and import API"
type: Task
status: done
track: C
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-051"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/Task-052"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/Task-053"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-039"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-402"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-403"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-404"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-405"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-406"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-407"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-408"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-409"
    type: verifies
---
# Task-054: Coverage account, thresholds, mutation catalogue, and import API

## Scope

Land the generated coverage account, the proposed promotion thresholds, the committed mutation catalogue, and the downstream import API, without enlarging the published package surface.

## Subtasks

- [x] Generate `conformance/coverage.json` from the run and gate a fresh generation against the committed file.
- [x] Author `conformance/thresholds.json` with a `proposed` row per owning issue and gate it against the registry both ways.
- [x] Author `conformance/mutations.json` with at least one mutation per family and prove every mutation is detected.
- [x] Implement the import API with module-relative path resolution and deep-copy returns.
- [x] Prove `package.json` gains no `exports` and no `files` entry and that the unmet serialization area is named in the coverage account.

## Deliverables

- `conformance/coverage.json`
- `conformance/thresholds.json`
- `conformance/mutations.json`
- `conformance/oracle/index.mjs`

## Notes

- Publishing the import surface belongs to the issue #11 gate; `conformance/README.md` names it.
- The coverage account excludes every machine-, clock-, and environment-varying value.
