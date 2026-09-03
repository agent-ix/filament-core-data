---
id: Task-037
title: "Closed constraint vocabulary"
type: Task
status: todo
track: B
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-035"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-029"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-219"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-220"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-221"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-222"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-223"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-224"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-225"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-244"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-245"
    type: verifies
---
# Task-037: Closed constraint vocabulary

## Scope

Replace `keyword: string` and untyped `operands` with a closed enumeration and per-keyword operand schemas plus applicability checks.

## Subtasks

- [ ] Rewrite `$defs.constraint` as a discriminated union over the eleven keywords with typed operands; remove every untyped path including `enumValues.values` items (TC-223).
- [ ] Implement applicability in the reader: keyword × resolved kind/scalar table from FR-029; mismatches fail at the constraint locus (TC-244).
- [ ] Compile `pattern.regex` under `ecma-262` during validation and fail on error (TC-245).
- [ ] Add one positive fixture per keyword and negative fixtures for `mnimum`, string `min`, dialect-less `pattern`, `minLength: -1` (TC-219..222).
- [ ] Verify every v1 positive fixture constraint (currently none) uses a closed keyword (TC-224); add keyword add/remove/retype families to the compatibility corpus (TC-225).

## Deliverables

- Closed `constraint` schema and applicability rules.
- Keyword fixtures and corpus families.

## Notes

- Disjoint from Task-036: only `$defs.constraint` and its fixtures.
- Temporal bounds use ISO 8601 strings per FR-029.
