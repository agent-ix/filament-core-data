---
id: Task-133
title: "FR-094 relationships, operations, clauses"
type: Task
status: done
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-132"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-094"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-1231"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1232"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1233"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1234"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1235"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1236"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1237"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1238"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1239"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1240"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1241"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1242"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1243"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1244"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1251"
    type: verifies
---
# Task-133: FR-094 relationships, operations, clauses

## Scope

`edges.rs` (`lower_relationships` from the frontmatter `(target, verb)` pairs
`harvest_edges` returns, filtered by `allowed_links`, categorised by the
registry `EdgeTypeDef`) and `clauses.rs` (`lower_clauses`, `lower_operations`
from the engine's `ClauseRef` and `OperationDecl`). No `## Relationships`
reading (D5, quire-rs#418).

## Subtasks

- [x] **Fixtures.** Complete `fixtures/business/` with `aggregate_root`, `nested_entity`, `repository`, `event`, `state_machine`, `process` artifacts and `operations.md` (params, `Returns:`, `pre`/`post` clause refs), an `ocl` fence with leading whitespace, trailing newlines and a tab, and frontmatter edges of `contains`, `aggregates`, `composes`, `references`, `owns`, plus `traces_to`/`implements`/`depends_on` on one entity. Author a test module for `frobnicates` (`allowed_links` lists it, no `edge_types` declares it) and `fixtures/negatives/{UNKNOWN_EDGE_VERB,UNRESOLVED_RELATIONSHIP_TARGET}/`.
- [x] **Red.** `tests/edges.rs`: `tc_1231_` (`references` → `traceability`, composite false, `{1,1}`, origin line 1 col 1), `tc_1232_` (`contains`/`aggregates` composite true via `inverse: part_of`; `composes` false), `tc_1233_`, `tc_1234_`, `tc_1235_`, `tc_1236_` (artifact-axis verbs skipped silently, no body list read), `tc_1237_` (dedupe on `(verb, target)`), `tc_1238_` (`parent` is a field; differs from the #34 fixture at exactly that node; #34 fixture byte-unchanged), `tc_1244_` (proptest: target rename moves only `target`/identity; registry `inverse` flip flips `composite`). `tests/clauses.rs`: `tc_1239_`, `tc_1240_` (byte-identical text), `tc_1241_` (params under `param/…`, `returns nullable false`, `pre`/`post` id lists, no second clause node), `tc_1242_` (unresolved `Returns:` at its line), `tc_1243_` and `tc_1251_` (regex over every emitted node against the FR-095 closed list incl. `param/` and `variant/`, and `semanticIdentity`).
- [x] **Green: relationships.** `harvest_edges` pairs → keep iff the record's object type lists the verb under `Registry::resolve_allowed_links`; `category` from the merged `edge_types`; `UNKNOWN_EDGE_VERB` when allowed but undeclared; target through the index and the pass-one outcome (`UNRESOLVED_RELATIONSHIP_TARGET` otherwise); `composite = (inverse == part_of)`; identity via `relationship_identity`; origin line 1 col 1.
- [x] **Green: operations and clauses.** `OperationDecl` → operation with params as FR-093 fields under `param_identity`, returns from FR-092, `pre`/`post` as `clause_id` lists, origin at the `### <name>` heading; `ClauseRef` with `source_span` → clause with verbatim `clause_text[clause_id]`, `sourceSpan`, origin at span start; `pre`/`post` refs (span `None`) contribute only their id.
- [x] **Falsify.** Change `inverse` in a scratch copy of the vendored manifest and prove `composite` flips with no code change (`tc_1244_`).

## Deliverables

- `src/edges.rs`, `src/clauses.rs`; `tests/edges.rs`, `tests/clauses.rs`
- Completed `fixtures/business/`, test module `fixtures/modules/frobnicates/`, two `fixtures/negatives/<CODE>/` bundles

## Notes

- FR-094-CON-1: when quire-rs#418 ships `RelationDecl`, this task's goldens are re-cut in one commit; note the hook point in `edges.rs`.
- TC-1245 (both readers, zero relationship/clause reader codes) is verified by Task-134.
- Unblocks: Task-134.
