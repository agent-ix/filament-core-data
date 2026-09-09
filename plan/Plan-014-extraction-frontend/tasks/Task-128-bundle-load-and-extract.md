---
id: Task-128
title: "FR-091 bundle load and extraction through the engine"
type: Task
status: done
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-127"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-091"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-1200"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1201"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1202"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1203"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1204"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1205"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1206"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1207"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1208"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1209"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1331"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1328"
    type: verifies
---
# Task-128: FR-091 bundle load and extraction through the engine

## Scope

`Bundle::load(root, modules) -> Result<Bundle, Refusal>` in `bundle.rs` and
one `SemanticExtraction` per object-typed artifact in `extract.rs`, reading
the file system only through `quire_rs::corpus::load_repo` and
`Registry::load_module_set`, never `~/.ix`, `HOME` or `QUIRE_MODULES`. This
task also vendors the three `config-version` fixtures and the `conflicting`
module, because the first gate lifts them.

## Subtasks

- [x] **Fixtures.** Copy quire-rs `tests/fixtures/semantic/quoin/mapping/config-version.{table,fence}.md` into `fixtures/config-version-table/spec/functional/FR-006-config-version-entity.md` and `fixtures/config-version-fence/...` (same relative path, two bundle roots, D7), each with a `spec/spec.md` (`org: agent-ix`, `name: config-service`) and an authored `FR-005-config-overlay-entity.md`; add the `relationships:` frontmatter block (`belongs_to`/`references` → FR-005) to both copies and record it in `PROVENANCE.json` (D5). Copy live config-service `FR-006` verbatim into `fixtures/legacy/`. Author `fixtures/modules/conflicting/` (a `semantic` block that drops `versionNumber`). Author `fixtures/negatives/{MODULE_WITHOUT_SEMANTIC_BLOCK,MODULE_REFUSED,BUNDLE_UNIDENTIFIED,DUPLICATE_ARTIFACT_ID,UNKNOWN_OBJECT_TYPE}/` bundles or module roots (no `expected/` yet).
- [x] **Red.** `tests/bundle.rs`: `tc_1200_` .. `tc_1209_`, `tc_1331_` traced to FR-091-AC-1..11; `tc_1207_` is the grep gate with a planted `struct TypeRef` control.
- [x] **Green: load.** `load_repo` over the root; `load_module_set` over the caller's roots; `Registry::semantic_module` per module; refusals `MODULE_WITHOUT_SEMANTIC_BLOCK`, `MODULE_REFUSED` (carrying the engine `semantic.*` code), `BUNDLE_UNIDENTIFIED` (absent `spec.md`, missing/malformed `org`/`name` against `[a-z0-9][a-z0-9-]*`, object-typed document without `id`), `DUPLICATE_ARTIFACT_ID` at the second path (D9). Refusal codes are provisional string constants until Task-129 lands the enum; Task-129 replaces them.
- [x] **Green: index and extraction.** `BundleIndex::from_documents(<org>/<name>, frontmatter, modules)`; for each document whose `object` a module declares, `extract_semantic` with `SemanticContext { path (bundle-relative, `/`), source_identity ix://<org>/<name>/spec, RequiredSections::from_dsl(body_extraction) }` and the reference-form `data_schema` digest; `UNKNOWN_OBJECT_TYPE` for undeclared types; documents with no `object` skipped silently; every `SemanticDiagnostic` recorded in engine order with `line`/`column` kept (line 0/absent → no locus, path in `related`).
- [x] **Gate 1 + coverage binding.** `tc_1200_` proves seven fields for `FR-006` and one extraction for `FR-005`. Run `quire coverage --scope . --json` and confirm the row binds to the `#[trace]` symbol; remove the marker and confirm the row becomes a status lie (`tc_1328_`, NFR-033-AC-9). Record the first traced test in `spec/log.md`? No — `spec/**` is not this task's; report it in the PR body.
- [x] **Falsify.** Point `HOME` and `QUIRE_MODULES` at the conflicting module and prove the lift is byte-identical to the explicit one (`tc_1203_`); supply the conflicting module explicitly and prove it differs.

## Deliverables

- `src/bundle.rs`, `src/extract.rs`, `src/lib.rs` re-exports
- `fixtures/config-version-table/`, `fixtures/config-version-fence/`, `fixtures/legacy/`, `fixtures/modules/conflicting/`, five `fixtures/negatives/<CODE>/` bundles, each with `PROVENANCE.json`
- `tests/bundle.rs`

## Notes

- Never declare `FieldDecl`, `TypeRef`, `ClauseRef`, `OperationDecl`, `SourceLocus`; never call `extract_semantic_json` (FR-091-CON-1).
- The seven-field extraction was proved by a Phase 0 scratch probe (2026-09-08 comment on #36); this task is the traced version of that probe.
- Unblocks: Task-129 and Task-130 in parallel.
