---
id: Task-050
title: "The independent semantic oracle"
type: Task
status: pending
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-049"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-036"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-290"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-291"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-292"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-293"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-294"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-295"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-296"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-297"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-298"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-299"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-300"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-301"
    type: verifies
---
# Task-050: The independent semantic oracle

## Scope

Land the oracle: the pinned schema layer with the deepest-location collapse rule, the cross-field rules, the package-context rules, the diagnostic-code register, the normalized serialization, the compatibility classifier, and the isolation guarantees.

## Subtasks

- [ ] Implement the schema layer over the published v1 schemas, collapsing to one diagnostic per deepest failing instance location.
- [ ] Implement the cross-field rules and the package-context rules, each silent when its bundle member is absent.
- [ ] Author `conformance/diagnostic-codes.json` reusing the sixteen codes frozen in `reader-cases.json` verbatim and citing a contract clause for every minted code.
- [ ] Emit every diagnostic as a `common.schema.json#/$defs/diagnostic` document with `owner`, `blocking`, `causes`, `related`, and `locus`.
- [ ] Implement cycle detection before the depth bound for aliases, composite relationships, and the lock package graph.
- [ ] Implement the normalized serialization and the IR-surface compatibility classifier with the declared restrictiveness order.
- [ ] Add the static analysis asserting no import of a judged implementation and no clock, network, or environment read.

## Deliverables

- `conformance/oracle/schema-layer.mjs`
- `conformance/oracle/oracle.mjs`
- `conformance/diagnostic-codes.json`

## Notes

- `resultState` is `success`, `invalid`, or `lossy` only; `unsupported`, `unavailable`, and `partial` are adapter states.
- An optional field addition is `additive` only under a consumer policy that preserves or surfaces unknown members.
