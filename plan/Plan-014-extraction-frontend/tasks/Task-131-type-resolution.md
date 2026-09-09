---
id: Task-131
title: "FR-092 two-pass type resolution and kernel scalars"
type: Task
status: todo
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-129"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/Task-130"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-092"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-1210"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1211"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1212"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1213"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1214"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1215"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1216"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1217"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1218"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1332"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1264"
    type: verifies
---
# Task-131: FR-092 two-pass type resolution and kernel scalars

## Scope

`resolve.rs`: `enum Resolution { KernelScalar, Object, Enumeration, Unresolved }`
and `enum Unresolved { UnknownToken, NoBundleIndex, ImportUnresolved, ImportUnsupported(String), Stale(ArtifactRef) }`,
a classifier of the engine's verdict (D3), never a second resolver; pass one
over every artifact's lowering outcome before any token is classified; one
package-local `scalar` definition per kernel scalar used.

## Subtasks

- [ ] **Fixtures.** Author `fixtures/negatives/{UNRESOLVED_TYPE_TOKEN,STALE_TYPE_TOKEN,IMPORT_UNSUPPORTED,KERNEL_NAME_SHADOWED}/` bundles (`Sting` at row 14 for TC-1264; a two-document bundle with a legacy-form `FR-005` for `STALE_TYPE_TOKEN`; `ix://acme/other/type/Thing`; an artifact titled `String`).
- [ ] **Red.** `tests/resolve.rs`: `tc_1210_` (proptest over kernel names; the fixture's four scalars + `JsonObject`, each once, `type/<KernelScalar>` with the kernel-scalar extension), `tc_1211_` (title and id both → `Object(FR-005)`), `tc_1212_`, `tc_1213_` (engine `semantic.ambiguous-type` → `ARTIFACT_NOT_LOWERED` + `ENGINE_DIAGNOSTIC`, no `Resolution` for the dropped row), `tc_1214_`, `tc_1215_` (`Stale` with `related` at the cause), `tc_1216_` (`object: enumeration` → `Enumeration`), `tc_1217_` (`KERNEL_NAME_SHADOWED` warning, lift not blocked), `tc_1218_` (proptest: 256 mutated tokens, no panic, one code per `Unresolved`, only `ImportUnsupported` carries a string), `tc_1332_` (pass one stubbed to "all lowered" makes `tc_1215_` fail), `tc_1264_` (locus `{path, 14, 3}`, `sourceIdentity ix://agent-ix/config-service/spec`).
- [ ] **Green: pass one.** `outcomes: BTreeMap<ArtifactId, Outcome>` computed from every extraction's `availability.fields.state` (and, once Task-132 lands, `UNNAMEABLE_ARTIFACT`/`DUPLICATE_TYPE_NAME`) before any classification; the function signature takes the completed map so a one-pass implementation cannot type-check.
- [ ] **Green: classification.** By `target` form + companion `semantic.unresolved-type` `reason` + index + frontmatter `object` + outcomes + `kernel-scalars.json`, and nothing else (FR-092-CON-2); `Enumeration` by `object: enumeration`; foreign package → `ImportUnsupported(<package>)`; shadowing → `KERNEL_NAME_SHADOWED`.
- [ ] **Green: diagnostics and scalars.** One diagnostic per `Unresolved` at the row's line/column (`UNRESOLVED_TYPE_TOKEN`, `IMPORT_UNSUPPORTED`, `STALE_TYPE_TOKEN`), all blocking; scalar definitions minted once per package with the FR-032 value map (`UUID→uuid` … `Bytes→bytes`); `JsonObject` deferred to Task-132's record.
- [ ] **Falsify.** `tc_1332_` is the falsifier; keep the stub behind a `#[cfg(test)]` hook, never a runtime flag.

## Deliverables

- `src/resolve.rs`, `src/scalars.rs`; `tests/resolve.rs`
- Four `fixtures/negatives/<CODE>/` bundles with `PROVENANCE.json`

## Notes

- `Ambiguous` is deleted: the engine's `semantic.ambiguous-type` is an error and the artifact is not lowered (D3).
- TC-1219 (zero `UNRESOLVED_TYPE_REF` from both readers over emitted documents) is verified by Task-134.
- Unblocks: Task-132.
