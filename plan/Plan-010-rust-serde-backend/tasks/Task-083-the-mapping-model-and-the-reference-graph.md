---
id: Task-083
title: "The mapping model, the published mapping table, and the reference graph"
type: Task
status: todo
track: B
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-082"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-054"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-645"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-646"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-647"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-648"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-649"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-650"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-651"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-652"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-653"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-654"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-655"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-656"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-657"
    type: verifies
---
# Task-083: The mapping model, the published mapping table, and the reference graph

## Scope

Land `mapping.mjs`, `mapping-table.json` and `graph.mjs`: the total mapping keyed on `kind`, the eight-row axis composition with its serde attributes, and the strongly connected components over every reference edge.

## Subtasks

- [ ] Write `mapping-table.json` as the single machine-readable table, and derive the requirement's tables from it in the `--check` comparison.
- [ ] Implement the eight kind rows, the eight supported kernel scalars, and the `bytes` refusal.
- [ ] Implement the eight axis combinations with their exact serde attribute sets, including `present_or_absent` on the optional-nullable rows.
- [ ] Implement the `unknownPolicy` rule and its non-record refusal, the extension mapping, and the contract-metadata lowering.
- [ ] Implement `graph.mjs`: edges from field `typeRef`, `alias`/`reference` `target`, `sequence` `items`, `map` `values`, variant `payloadType`, operation parameter and return `typeRef`; components; and the indirection decision.
- [ ] Implement the `1.0.0` multiplicity derivation and the `1.1.0`-node refusal.
- [ ] Write the purity and reordering property tests.

## Deliverables

- `src/compiler/backends/rust-serde/mapping.mjs`
- `src/compiler/backends/rust-serde/mapping-table.json`
- `src/compiler/backends/rust-serde/graph.mjs`

## Notes

SR-082 FND-949's two counter-examples — a cycle through an alias target and a cycle through a union payload — are cases in the test, not prose in the plan.
