---
id: Task-051
title: "Cases for the document construct families"
type: Task
status: pending
track: B
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-050"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-038"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-314"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-316"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-317"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-319"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-320"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-322"
    type: verifies
---
# Task-051: Cases for the document construct families

## Scope

Author the construct register and the cases for the nineteen document families, each case citing the contract clause its expectation was read from.

## Subtasks

- [ ] Author the `constructRegister[]` rows for every family with sources, deciding layer, and any justified `notApplicable` class.
- [ ] Author the `positive`, `negative`, `boundary`, and `evolution` cases for envelope, identity, scalar, alias, enum, sequence-map, union, reference, field-presence, field-default, unit, constraint, recursion, relationship, operation, clause, provenance, unknown, and extension.
- [ ] Author the four `presence` by `nullable` combinations and prove the four normalized forms differ.
- [ ] Author direct recursion, mutual recursion, the alias cycle, and the composite cycle.
- [ ] Prove every register source path resolves and every case's deciding layer is the layer that decided it.

## Deliverables

- `conformance/cases/<family>/*.json` for the document families
- `conformance/corpus.json` `constructRegister[]`

## Notes

- Every expectation is read from a clause the case quotes; none is captured from a run.
- The depth boundary case uses `x-repeat` to stay inside the 64-node budget.
