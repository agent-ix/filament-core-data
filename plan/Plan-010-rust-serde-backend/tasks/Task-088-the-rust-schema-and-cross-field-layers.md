---
id: Task-088
title: "The Rust schema layer, the cross-field rules, and the normalized form"
type: Task
status: todo
track: C
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-087"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-059"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-701"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-704"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-708"
    type: verifies
---
# Task-088: The Rust schema layer, the cross-field rules, and the normalized form

## Scope

Decide the published schema layer and the cross-field rules in Rust, emitting the published `agent-ix.semantic-ir.*` codes.

## Subtasks

- [ ] Implement the schema layer over the published `semantic-ir.schema.json` and `common.schema.json`.
- [ ] Implement the cross-field rules and the codes `conformance/diagnostic-codes.json` publishes.
- [ ] Implement the normalized form for every case, including the ones the schema layer decides invalid.
- [ ] Implement the alias-cycle, composite-cycle and size-limit termination.
- [ ] Add the no-panic surface scan and the 4096-document mutation fuzz under a failing panic hook.
- [ ] Complete `RULES.md` with a citation for every emitted code, and check every locator resolves.

## Deliverables

- the `crates/semantic-ir` schema and cross-field layers
- the completed `RULES.md`

## Notes

No `unwrap`, `expect` or `panic!` on an input-derived path; no `unsafe` anywhere.
