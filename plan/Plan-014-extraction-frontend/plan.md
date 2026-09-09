---
id: Plan-014
title: "Spec-bundle extraction frontend: lift a Quire spec bundle into a domain package"
type: Plan
status: active
relationships:
  - target: "ix://agent-ix/filament-core-data/US-015"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-091"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-092"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-093"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-094"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-095"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-096"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-097"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-098"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-099"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-031"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-032"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-033"
    type: references
---
# Plan-014: spec-bundle extraction frontend

## Scope

Build `crates/extraction-frontend` (package `agent-ix-extraction-frontend`),
the Rust workspace member that reads one Quire spec bundle through
`quire-rs` in-process and lowers it to semantic IR `1.1.0`, validated at
lift time by `agent_ix_semantic_ir::decide` and written in that crate's
canonical bytes. Issue #36; the requirement files already carry the
orchestrator decisions D1..D15 recorded after the composite review
SR-160..SR-168.

**Build only.** `publish = false` on the crate manifest; no step contacts a
registry. Every original file is AGPL-3.0-only.

## Requirements covered

US-015, FR-091..FR-099, NFR-031..NFR-033 — mapped to TC-1200..TC-1349 in
`spec/tests.md` (149 rows, TC-1339 unused, every row `🚧` at planning time).

### Functional requirements

- [ ] **FR-091** — read a bundle through `load_repo` + `load_module_set`; one `SemanticExtraction` per object-typed artifact
- [ ] **FR-092** — classify every engine `TypeRef.target` into the closed `Resolution` enum in two passes
- [ ] **FR-093** — lower records, fields, constraints, enumerations; `losses.json`
- [ ] **FR-094** — lower frontmatter relationships, operations, clauses
- [ ] **FR-095** — package identity, envelope digests, node identity minters, provenance
- [ ] **FR-096** — closed `Code` registry, locus rule, `ENGINE_DIAGNOSTIC` / `INVALID_IR` wraps, generated docs page
- [ ] **FR-097** — `decide` at lift time, `normalized` bytes, fingerprint sidecar, atomic write
- [ ] **FR-098** — fixture inventory, provenance, goldens, read-only lifting, structural parity, backend acceptance
- [ ] **FR-099** — `lift` / `inspect` binary, exit codes, Make targets

### Non-functional requirements

- [ ] **NFR-031** — deterministic and hermetic lifting; `limits.json`; ambient-input and `HashMap` audits
- [ ] **NFR-032** — non-disruptive change set fixed by two sentinels; `cargo metadata` edge check
- [ ] **NFR-033** — Rust 1.98.1 via `cargo +1.98.1`; exact pins; `deny.toml`; notices; `#[trace]` convention

## Dependency graph

### Core dependency edges

- `NFR-033 (scaffold) -> FR-091`
  Reason: the crate, its pins (`quire-rs` rev `8b8020e`, `agent-ix-semantic-ir` by path, `ix-trace-rs` v0.1.1) and the vendored `spec-objects-business` module at `d1840b8` must exist before a bundle can be loaded (SR-163 FND-1430, FND-1432, FND-1457).
- `FR-091 -> FR-096, FR-095`
  Reason: the registry wraps the `SemanticDiagnostic` list FR-091 records; the envelope hashes the document bytes FR-091 loads. Both are enablement and run in parallel once `Bundle::load` returns (SR-163 FND-1438).
- `FR-096 + FR-095 -> FR-092`
  Reason: every `Unresolved` value is emitted through a `Code` variant, and the kernel-scalar definitions FR-092 mints carry FR-095 `type/` identities.
- `FR-092 -> FR-093 -> FR-094`
  Reason: a field's `typeRef` is a resolution; a relationship target is classified by FR-092's pass-one outcome, which FR-093 decides.
- `FR-093 + FR-094 + FR-095 + FR-096 -> FR-097`
  Reason: the writer assembles the document from all four and runs `decide` on the result.
- `FR-097 -> FR-099 -> FR-098`
  Reason: goldens are written only through `lift --write-goldens` (FR-098 Behavior, FR-099 `lift`), so the binary precedes the golden, read-only, parity and backend evidence. This is the one swap against SR-163's suggested order (FR-098 before FR-099); the fixture bundles themselves are authored earlier, task by task, beside the code that emits their codes.
- `FR-098 -> NFR-031, NFR-032`
  Reason: the determinism gates compare against committed goldens; the change-set gate runs over the whole range and the docs sentinel closes it.

### Shared dependencies

- The `Code` enum (FR-096) is consumed by FR-091..095 and FR-097; built immediately after FR-091, before any lowering.
- The identity minters and `slug` (FR-095) are consumed by FR-092 (scalar `type/`), FR-093 (`field/`, `constraint/`, `variant/`, `DUPLICATE_TYPE_NAME` on slugs) and FR-094 (`relationship/`, `operation/`, `param/`, `clause/`).
- `limits.json` (NFR-031) is read by `bundle.rs` (`maxDocuments`, `maxDocumentBytes`, `maxDepth`) and `lower.rs` (`maxFieldsPerRecord`, `maxClauseBytes`); authored with FR-093.
- The `fixtures/negatives/<CODE>/` bundles are authored by the task that emits `<CODE>`; their `expected/diagnostics.json` goldens are cut once, under FR-098.

### Cross-cutting constraints

- NFR-031 applies to every module under `src/`: no `std::env`, clock, RNG, `std::net`, `Command`; `std::fs` only in `write.rs`; no `HashMap`.
- NFR-032 fixes the change set: outside the crate only the `members` line, `Cargo.lock`, the `extraction-frontend-*` Makefile block, `docs/semantic-data-system/extraction-frontend-diagnostics.md` and the FR-098 shared-case files.
- NFR-033 fixes the toolchain: every gate runs `cargo +1.98.1 … --locked`; every requirement test is `#[trace("TC-NNNN","<REQ>-AC-N")] fn tc_NNNN_…`.

### The seams

`quire_rs::corpus::load_repo`, `Registry::load_module_set`, `Registry::semantic_module`, `BundleIndex::from_documents`, `extract_semantic`, `quire_rs::extract` (the FR-011 evaluator for `values_table`), `corpus::harvest_edges` and `Registry::resolve_allowed_links` are the engine surface; `agent_ix_semantic_ir::{decide, normalize::normalized}` is the reader surface; `node src/compiler/cli.mjs {compile,inspect,generate}` and `src/compiler/ir/normalize.mjs` are the node-side second reader, invoked by tests only. `src/compiler/frontend/spec-bundle/frontend.mjs` stays `FRONTEND_NOT_IMPLEMENTED` (filament-core-data#86).

## Order

| Task | Subject | Depends on |
|---|---|---|
| Task-127 | NFR-033 scaffold: crate, pins, vendored module, toolchain gate | — |
| Task-128 | FR-091 bundle load and extraction through the engine | Task-127 |
| Task-129 | FR-096 diagnostic registry and locus rule | Task-128 |
| Task-130 | FR-095 identity minters, envelope digests, provenance | Task-128 |
| Task-131 | FR-092 two-pass type resolution and kernel scalars | Task-129, Task-130 |
| Task-132 | FR-093 records, fields, constraints, enumerations, `losses.json`, `limits.json` | Task-131 |
| Task-133 | FR-094 relationships, operations, clauses | Task-132 |
| Task-134 | FR-097 validate, canonicalize, fingerprint, atomic write | Task-133 |
| Task-135 | FR-099 `lift` / `inspect` binary and Make targets | Task-134 |
| Task-136 | FR-098 fixture inventory, goldens, read-only, parity, backend acceptance | Task-135 |
| Task-137 | NFR-031 determinism, hermeticity, limits and fuzz gates | Task-136 |
| Task-138 | NFR-032 change-set gates, docs sentinel, coverage binding | Task-137 |

## Test plan

The TC ids are the `spec/tests.md` rows TC-1200..TC-1349. Each task's
`verifies` edges name the rows whose test it writes; the table below is the
single enumeration, grouped by the module under test.

### Unit and integration tests (`crates/extraction-frontend/tests/`)

- [ ] `bundle.rs` / `extract.rs` (FR-091): TC-1200..TC-1209, TC-1331
- [ ] `diagnostics.rs` (FR-096): TC-1259, TC-1260, TC-1262, TC-1263, TC-1265, TC-1266, TC-1269, TC-1345, TC-1346; corpus-wide TC-1267, TC-1270, TC-1272 after goldens; TC-1264 with the resolver; TC-1268 with the binary
- [ ] `identity.rs` / `envelope.rs` (FR-095): TC-1246..TC-1252, TC-1254, TC-1256, TC-1347, TC-1348; TC-1253, TC-1255 against goldens; TC-1258 at lift time
- [ ] `resolve.rs` (FR-092): TC-1210..TC-1218, TC-1332; TC-1219 over emitted documents
- [ ] `lower.rs` (FR-093): TC-1220..TC-1229, TC-1333..TC-1335; TC-1230 over emitted documents; limit probes TC-1305
- [ ] `edges.rs` / `clauses.rs` (FR-094): TC-1231..TC-1244; TC-1245 over emitted documents
- [ ] `validate.rs` / `canonical.rs` / `write.rs` (FR-097): TC-1274..TC-1284, TC-1340..TC-1342
- [ ] `main.rs` (FR-099): TC-1295..TC-1297
- [ ] fixtures, goldens, parity (FR-098): TC-1285..TC-1293, TC-1344

### Static gates and analyses (grep, manifest, change-set; each with a planted-token control)

- [ ] FR-091-AC-8 TC-1207; FR-095-AC-12 TC-1257; FR-096-AC-3 TC-1261; FR-097-AC-1 TC-1273, TC-1336; FR-098-AC-10/11 TC-1294, TC-1338, TC-1343; FR-099-AC-4..6 TC-1298, TC-1299, TC-1349; three-CON grep TC-1330
- [ ] NFR-031: TC-1300..TC-1304, TC-1306..TC-1309
- [ ] NFR-032: TC-1310..TC-1319
- [ ] NFR-033: TC-1320..TC-1329

### Property and fuzz tests (`proptest`)

- [ ] TC-1208, TC-1210, TC-1218, TC-1229, TC-1243, TC-1244, TC-1251, TC-1256, TC-1259, TC-1266, TC-1270, TC-1276, TC-1344, TC-1309

### Manual / blocked

- [ ] TC-1337 — issue #36 AC-5 (`json-schema` target). No test behind it; blocked on filament-core-data#85. No task in this plan verifies it.

## Quality gates

1. **After Task-128 (FR-091)** — the `config-version-table` fixture extracts
   `FR-006` with `fields` `available` and seven fields, and `FR-005`, through
   the real engine under the vendored module (TC-1200). Phase 0 proved this
   with a scratch probe; the task turns the probe into the first traced test
   and confirms `quire coverage --scope . --json` binds the Rust `#[trace]`
   form before any further row is promised (NFR-033-AC-9).
2. **After Task-134 (FR-097)** — `decide({"ir": doc})` returns success with
   zero diagnostics for the `config-version-table` document, and FR-050
   `normalizeIr` (node) applied to the emitted bytes returns them unchanged
   (TC-1284, TC-1277). If it fails, the node-list sort or the materialised
   `multiplicity`/`presence`/`nullable` members are wrong; do not start
   Task-135.
3. **After Task-136 (FR-098)** — every fixture regenerates into a scratch
   directory byte-identical to its committed `expected/` across two runs, and
   the `records-and-scalars` projection parity with the TypeSpec frontend
   holds byte for byte after `normalized` (TC-1286, TC-1291). If it fails,
   the difference is a frontend defect or a host input, and NFR-031's gates
   are not started until it is classified.
4. **Before the pull request (Task-138)** — every TC-1200..TC-1349 row except
   TC-1337 is bound by `quire coverage`, and the NFR-032 changed-path gate over
   the two sentinels is green (TC-1327, TC-1310).

## Coordination rules

- **Rebase after PR #84 before Task-134.** PR #84 moves `src/compiler/ir/reader.mjs`,
  the FR-050 oracle behind FR-092-AC-10, FR-093-AC-11, FR-094-AC-15 and
  FR-097-AC-11 (SR-168 FND-1480). Tasks 127..133 do not touch the node reader;
  Task-134 is the first that shells to it.
- **One writer per file.** Task-129 and Task-130 run in parallel and own
  disjoint modules (`diagnostics.rs` vs `identity.rs`/`envelope.rs`); neither
  edits `bundle.rs` or `extract.rs` after Task-128 lands.
- **Goldens are cut once**, in Task-136, through `lift --write-goldens`; no
  earlier task commits an `expected/` directory, and no test rewrites one.
- **The docs page is the last commit.** `docs/semantic-data-system/extraction-frontend-diagnostics.md`
  is the NFR-032 closing sentinel and is generated in Task-138, not when
  FR-096 is first satisfied.
- **Root edits are exactly three**: the `members` line, `Cargo.lock` under
  `cargo +1.98.1 --locked`, and one contiguous `extraction-frontend-*`
  Makefile block. The FR-098 shared-case files are the only other paths
  outside the crate.
- **No `~/.ix`.** Every test loads the vendored module from
  `crates/extraction-frontend/fixtures/modules/`; the conflicting module
  under a fake `HOME` is the FR-091-AC-4 control, never a default.
- **Readings cited, not decided.** Issues #77, #78, #67, #61 stay open;
  each task implements the reading its requirement declares and cites the
  issue in the test name's doc comment.

## Open findings carried from the review

| Finding | Disposition |
|---|---|
| FND-1480 PR #84 moves the FR-050 oracle; ordering recorded nowhere | Coordination rule 1: rebase after #84 lands, before Task-134 |
| FND-1481 `spec.md` §2.2 still lists #36 as out of scope | Spec edit outside this plan; flagged to the orchestrator |
| FND-1482 `spec/log.md` records TC-1200..1329, matrix took ..1349 | Spec edit outside this plan; Task-138's coverage gate uses the matrix range |
| FND-1483 `--diagnostics`/`--provenance` colliding with `<out>` or each other unrefused | Task-135 refuses the collision as `OUTPUT_UNWRITABLE` under FR-097's "any sidecar path" rule; no new code |
| FND-1484 EARS residues (two `because` clauses, one maintainer actor, duplicated blocked-lift rule) | Editorial; no task; `quire validate` is clean |
| TC-1337 issue #36 AC-5 (`json-schema` target) | Blocked on filament-core-data#85; stays `Manual`, un-tasked |
