---
id: Task-038
title: "Relationships, operations, and clauses"
type: Task
status: todo
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-036"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-028"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-210"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-211"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-212"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-213"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-214"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-215"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-216"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-217"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-239"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-240"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-241"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-242"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-243"
    type: verifies
---
# Task-038: Relationships, operations, and clauses

## Scope

Add `relationships[]`, `operations[]`, and `clauses[]` to `typeDefinition` with target resolution, composite acyclicity, `clauseId` binding, opaque `text`, and FR-040 category parity.

## Subtasks

- [ ] Add the three node schemas: relationship (`identity`, `verb`, `category`, `composite`, `target`, `multiplicity`, `origin`), operation (`params[]`, `returns { typeRef, multiplicity, nullable }`, `pre[]`/`post[]` of `clauseId`), clause (`identity`, `language`, `clauseId`, `text`, `sourceSpan` when source-originated, `origin`).
- [ ] Restrict `relationships[]`/`operations[]` to `record` kinds; absent arrays read as empty on `1.0.0` (TC-216, TC-217).
- [ ] Implement reader rules: target resolves to a document type or lock export, composite graph acyclic, `clauseId` unique per type, pre/post bind to present clauses, uniqueness by `identity`/`name` (TC-213, TC-239..241).
- [ ] Language rule: `ocl`/`sysml`/`fretish` or `<ns>:<name>`; bare unknown fails (TC-215). Schema declares no parsed-content property (TC-214).
- [ ] Contract test comparing the IR `category` enumeration to the quire-rs FR-040 `EdgeCategory` registry, read from the installed `spec-artifacts-iso` manifest (TC-242).
- [ ] Add relationship/operation/clause add/remove/retarget families to the compatibility corpus (TC-243); golden and negative fixtures for every rule including a `belongs_to 0..1` self-reference.

## Deliverables

- Three node schemas and reader rules.
- FR-040 parity test.
- Node-family fixtures and corpus families.

## Notes

- Reuse the FR-027 `multiplicity` object; do not redefine it.
- The IR never parses `text`.
