---
id: Task-036
title: "Field multiplicity and units"
type: Task
status: todo
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-035"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-027"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-203"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-204"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-205"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-206"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-207"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-237"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-238"
    type: verifies
---
# Task-036: Field multiplicity and units

## Scope

Add `multiplicity` and `unit` to the `field` node, derive `presence`, resolve `typeRef` kind through aliases, and fix the normalized-form materialization rule.

## Subtasks

- [ ] Add `multiplicity { lower, upper?, ordered?, unique? }` (required under `1.1.0`, optional under `1.0.0`) and `unit` to `$defs.field`.
- [ ] Implement the cross-field rules in the TypeScript reader: derived presence agreement, `upper >= lower`, `lower >= 0`, flags only on collections, `unit` only on resolved `scalar` kind, unresolved `typeRef` fails (TC-203..207, TC-237).
- [ ] Implement normalization: `1.1.0` documents materialize `multiplicity`, `presence`, `nullable`; `1.0.0` documents gain no bytes; round-trip property for `0..1` (TC-203).
- [ ] Add multiplicity widening/narrowing and `unit`/`ordered`/`unique` change families to the compatibility corpus (TC-238).
- [ ] Add golden and negative fixtures for every rule, including `0..0`, `1..*` ordered+unique, alias-of-scalar with a unit, and a UCUM symbol.

## Deliverables

- `field` node v1.1 schema and reader rules.
- Multiplicity fixtures and corpus families.

## Notes

- `nullable` stays independent of multiplicity.
- Do not touch `$defs.constraint` (Task-037) or `typeDefinition` node arrays (Task-038).
