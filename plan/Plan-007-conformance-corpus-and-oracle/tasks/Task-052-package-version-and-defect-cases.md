---
id: Task-052
title: "Package, version, and compatibility cases and the defect registers"
type: Task
status: pending
track: B
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-050"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-038"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-015"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-315"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-318"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-321"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-323"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-333"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-336"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-337"
    type: verifies
---
# Task-052: Package, version, and compatibility cases and the defect registers

## Scope

Author the package, version, and compatibility families, and record the defects and contract gaps this corpus discovered.

## Subtasks

- [ ] Author the six package negatives: unresolved import, lock package cycle, unknown mapping, duplicate identity, stale manifest digest, and undeclared loss, each at an exact source locus.
- [ ] Author the version family: a `1.0.0` document under `1.1.0` rules and a `1.1.0` node carried by a `1.0.0` document.
- [ ] Author the compatibility family, including the export added and removed across a package version.
- [ ] Author `conformance/defects.json` with a row per prototype-emitter defect, its `documentExpressible` flag, and either a reproducing case or the static check that detects it.
- [ ] Author `conformance/contract-gaps.json` for every disagreement with the published contract, including constructs the IR has no node for.
- [ ] Record the unmet cross-language serialization area with its owning issues.

## Deliverables

- `conformance/cases/{package,version,compatibility}/*.json`
- `conformance/defects.json`
- `conformance/contract-gaps.json`

## Notes

- The prototype emitter is read, and run read-only into a scratch output directory; nothing under `spikes/` changes.
- A defect that is a process property carries `documentExpressible: false` and names its static check.
