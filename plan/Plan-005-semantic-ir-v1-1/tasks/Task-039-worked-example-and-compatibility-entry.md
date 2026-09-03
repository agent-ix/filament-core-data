---
id: Task-039
title: "Worked example, compatibility entry, and contract document"
type: Task
status: todo
track: C
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-037"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/Task-038"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-027"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-028"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-029"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-013"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-209"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-218"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-226"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-235"
    type: verifies
---
# Task-039: Worked example, compatibility entry, and contract document

## Scope

Express config-service FR-006 `ConfigVersion` as a v1.1 document, record v1 → v1.1 in the compatibility corpus, and update the human contract document.

## Subtasks

- [ ] Author `fixtures/semantic/v1/positive/config-version-v1-1.json`: `parent 0..1` self-relationship, `versionNumber 1..1` with `min: 1`, `overlay belongs_to` relationship, one `ocl` invariant clause; zero declared loss recorded in a loss table (TC-209, TC-218, TC-226).
- [ ] Add the v1 → v1.1 case to `fixtures/semantic/v1/compatibility/cases.json` classified `additive` with the added node list (TC-235).
- [ ] Update `docs/semantic-data-system/contracts-v1.md` semantic-model section for multiplicity, units, relationships, operations, clauses, closed keywords, and the version discriminator.
- [ ] Amend FR-020 fixture references so AC-1 positive/invalid examples cover the new nodes.

## Deliverables

- `ConfigVersion` golden fixture and loss table.
- Compatibility corpus entry.
- Updated contract document.

## Notes

- config-service is read-only; the fixture lives here.
- No corpus repository path may appear in the diff.
