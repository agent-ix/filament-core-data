---
id: Task-092
title: "The mapping-branch register, the property generator, and the mutation catalogue"
type: Task
status: todo
track: D
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-089"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/Task-091"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-062"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-725"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-726"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-727"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-728"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-729"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-730"
    type: verifies
---
# Task-092: The mapping-branch register, the property generator, and the mutation catalogue

## Scope

The slice's closing census. SR-080 FND-931 records that this cannot discharge until every module it counts exists.

## Subtasks

- [ ] Generate `branch-register.json` from the vocabularies — kind, kernel scalar, axis combination, default kind, unknown policy, keyword-and-subject pair, recursion shape, diagnostic code — and bind each row to its cases.
- [ ] Generate `mutations.json` from the declared operator set crossed with the target set, so the catalogue cannot be shrunk to raise the score.
- [ ] Write the mutation harness: scratch copy only, tree unchanged, score reported.
- [ ] Write the property generator with its declared seed, and the declared properties.
- [ ] Add the negative control: a `String` substituted for a constrained scalar must fail the degradation scan and at least one property.
- [ ] Wire both `--check` modes into `make lint` through a Make target calling `node` directly.

## Deliverables

- `src/compiler/backends/rust-serde/branch-register.json`
- `src/compiler/backends/rust-serde/mutations.json`

## Notes

A row with no case is an unmet register row, closed by adding a case and never by dropping the row.
