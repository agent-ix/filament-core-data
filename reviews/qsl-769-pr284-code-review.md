---
id: SR-11082
title: "QSL-769 filament-core-data PR 284 code review: alias construct shape across readers and backends"
type: SpecReview
analysis: code-review
scope: "agent-ix/filament-core-data@78d690e1d59471588aaee85a4d87bd2dc13e1afd; src/compiler/constructs.mjs, src/compiler/ir/reader.mjs, src/compiler/backends/json-schema-v1/index.mjs, src/compiler/backends/typescript-v1/model.mjs, src/compiler/backends/rust-serde/{mapping,graph,crate}.mjs, src/compiler/backends/rust-serde/{mapping-table,branch-register,mutations}.json, src/compiler/backends/rust-serde/harness/detectors.mjs, tests/semantic_ir_reader.py, test/*.test.ts and tests/*.py changed by the PR, python_backend/generated/**, python_backend/qualification/validation.json, reviews/plat-990-e3bd0f72-disposition-index.json (deleted)"
review_set: subset
---

## Summary

Ticket: QSL-769. One commit, 78d690e1, on main 13a83794. JS/TS and Python
lanes; no Rust source changed, so the rust-review lane did not run. The
Rust/Serde emitter is JavaScript and was reviewed here.

The alias construct shape now reaches every reader and backend through
`isAliasShaped`. In `mapping.mjs`, `graph.mjs`, `crate.mjs`, `model.mjs` and
`json-schema-v1`, each `kind === "alias"` test became `isAliasShaped`. Each
`switch (definition.kind)` became `switch (renderingOf(definition))`. Other
construct shapes still fall to the same branches as before: record and
sequence shapes reach `record` or default, and enumeration shapes reach
default. So only alias-shaped constructs change behaviour.

In Rust/Serde, an alias construct reaches `mapType`'s `alias` case and gets
row `shape:alias` through `rowOf`. `renderType` then sends it to
`renderNewtype`, the same path as a core alias. A scalar alias renders
`pub struct N(<scalar or target newtype>)`, and a composite alias renders a
newtype over the target's type. It goes through the same code as the core
alias, so the generated code is the same kind of code that already compiles.

Generated artifacts were checked against their generators. The Python tree
picks up schema changes from #278, #280 and the sysml target: the
`canonicalization` member, the `alias` shape, `target` in
members/references, and `sysml-v2-textual`. The branch register adds one
row, `shape:alias`. `validation.json` moves only where those schema
changes reach.

Changed tests were checked one by one:

- The index shifts (`types/1` to `types/2`, `types/2` to `types/3`) follow
  `InstantAlias`, which #280 inserted at index 1.
- The `edgeless` filter only excludes the new target-forbidding schema
  branch. It still asserts exactly one branch.
- `kind='goods'` to `'physical'` is correct. The old value passed only
  because the Python model came out empty.

None of these weakens an assertion.

Nothing reads the deleted `reviews/plat-990-e3bd0f72-disposition-index.json`.
I grepped src/, test/, tests/, scripts/, Makefile and docs/; the only hit is
prose in a review.

## Verdict

FINDINGS: two high, one medium. FND-001: the regenerated mutation catalogue
dropped a mutant, which weakens the mutation gate. FND-002: the JSON Schema
alias output changed in a way FR-100 forbids. FND-003: the cargo-backed gates
and sysml-pilot-check must run before merge. Lows are recorded in prose:

- validation.json now records `Package`/`Source` as unexercised under the
  dataclass profile. The type accepts `version: "1.0.0"` when tested
  directly, so the conforming-value builder is at fault. That was introduced
  by #277, not this PR.
- In `aliasOfScalarSchema`, a reference inside an alias chain stops the
  constraint walk.
- No cargo compile covers an alias-construct crate.

The semantic-kernel workflow failure that remains needs a decision. It is not
a defect in this diff, but the gate is not green yet.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | high | Weakened gate. The `widen-applicability-row` operator in `mutations.mjs` matches the `unknownPolicy:inert` selector with a hard-coded regex, `"kind": "scalar\|alias\|sequence\|map\|reference\|shape:interface\|shape:namespace"`. This PR added `shape:alias` to that selector. The pattern no longer matches, so the regenerated catalogue silently dropped `widen-applicability-row@mapping-table.json`: `mutationCount` went from 19 to 18. The catalogue's own contract says a score can never rise by dropping an entry. Update the pattern and replacement in `mutations.mjs` to the new selector string and regenerate. The count should return to 19. | src/compiler/backends/rust-serde/mutations.mjs:182-183, src/compiler/backends/rust-serde/mutations.json:331-342, src/compiler/backends/rust-serde/mapping-table.json:546 |
| FND-002 | high | The emitted schema contradicts its spec. FR-100 says an `alias` definition SHALL render its target's schema and its own constraints in an `allOf` composition, with exceptions only for integer and decimal. `aliasOfScalarSchema` now inlines the scalar for every alias over a non-numeric document scalar. That includes core aliases, not only alias constructs. In the constructs fixture, `VO-001Kind`, `VO-001Sku`, `FR-001Note`, `NE-001Carrier` and `FR-001Total` all change. In substance the fix is sound: validation is equivalent, it carries the constraints of every alias and scalar on the chain, and it fixes a real wrong Python model (an empty `OrderLine.kind` that accepted anything). It does not mask the generator limit. But it changes the published JSON Schema without a spec change, and no AC covers the new form. In the same PR, amend the FR-100 alias statement to the inline rule and add an AC and test for it (for example, `VO-001Kind` renders `type: string` with `enum: [physical, digital]`). Otherwise the owner decides. | src/compiler/backends/json-schema-v1/index.mjs:480-506, src/compiler/backends/json-schema-v1/index.mjs:798-803, spec/functional/FR-100-map-semantic-ir-to-json-schema.md:116-121 |
| FND-003 | medium | Gates not run. `make test-rust` and `make rust-check` never ran, yet this PR changes the Rust/Serde emitter (`mapping.mjs` `hashableType` and `mapType`, `graph.mjs` `collectEdges`, `crate.mjs` `subjectAccess`), and those crates are compiled by cargo there. `make test` also includes `sysml-pilot-check`, which did not run. The only gate log (`qsl769-final-gate.log`, EXIT=2) still has one failure, the semantic-kernel workflow item. Run `make test-rust` and `sysml-pilot-check` green before merge. | Makefile:34-37, src/compiler/backends/rust-serde/mapping.mjs:431, src/compiler/backends/rust-serde/graph.mjs:66 |
