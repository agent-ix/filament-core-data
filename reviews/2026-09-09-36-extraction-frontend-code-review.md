---
id: SR-169
title: "Code review — issue #36 spec-bundle extraction frontend"
type: SpecReview
analysis: code-review
scope: "crates/extraction-frontend/** (src/, tests/, fixtures/, Cargo.toml, deny.toml, limits.json, losses.json), Makefile extraction-frontend-* block, test/fixtures/compiler/shared/cases.json + records-and-scalars trees, docs/semantic-data-system/extraction-frontend-diagnostics.md; against FR-091..FR-099, NFR-031..033 (CR-036-1..7), TC-1200..1350"
review_set: all
---

# Code review — issue #36 spec-bundle extraction frontend

## Summary

Reviewed branch `spec/36-extraction-frontend` at `9f764c6` (26 commits over
`main` `3b75e01`): 23 source modules, 24 integration test files (155 `tc_NNNN_`
functions, 177 `#[trace]` markers), 43 provenance-tracked fixture directories,
the Makefile block, the shared-case JSON and the generated registry page. The
crate does what FR-091 asks — every declaration reaches it through
`quire_rs::semantic::extract_semantic`, `harvest_edges` and the engine's own
`scan`/`properties` helpers, the diagnostic registry is one closed enum with
its wire spelling only in `Display`, `std::fs` is confined to `write.rs`, no
`HashMap`, `unwrap`, `expect`, `panic!` or `as` cast exists under `src/`, every
byte written comes from `agent_ix_semantic_ir::normalize::normalized`, and the
goldens are reproduced byte-for-byte by the binary and accepted by the
independent reader. All six gates are green at HEAD. The review found no high
defect. Four medium findings: the atomic-write primitive can be redirected by a
pre-planted `.tmp` symlink and clobbers a concurrent lift's temp; the module
name the envelope keys on is re-parsed from `manifest.yaml` by a hand-rolled
line scan; `rows::operation_rows` scans `### ` headings and `Returns:` lines
itself inside `## Operations`, which FR-091-CON-3 forbids the frontend to
parse; and `edges::frontmatter_edges` re-derives the engine's private
frontmatter harvest and target reduction, so an engine change silently drops
every relationship. Six low findings cover swallowed errors, a misused error
code, evaluator-format coupling, vacuous test guards, unbounded/unfenced
auxiliary reads and a stringly-typed applicability table.

## Verdict

**CONDITIONAL** — no high finding; four medium findings (FND-1490..FND-1493)
should be fixed or CR'd before merge, the six low ones at the author's
discretion.

## Gate results (run by the reviewer, `CARGO_TARGET_DIR` per the Makefile)

| Gate | Result (last line quoted) |
|---|---|
| `cargo +1.98.1 test -p agent-ix-extraction-frontend --locked --offline` | exit 0 — 25 test binaries, **143 passed, 0 failed, 13 ignored**; last line `test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.02s` (doctests) |
| `cargo +1.98.1 test --workspace --locked --offline` | exit 0 — **166 passed, 0 failed, 13 ignored**; last line `test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.19s` |
| `cargo +1.98.1 clippy -p agent-ix-extraction-frontend --no-deps --all-targets -- -D warnings` | exit 0, zero warnings; last line ``Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.08s`` |
| `cargo +1.98.1 fmt -p agent-ix-extraction-frontend -- --check` | exit 0, no output |
| `make extraction-frontend-check` | exit 0 — 33 `expected/` directories regenerated into the scratch dir and diffed, every `diff -ru` empty; last lines `diff -ru crates/extraction-frontend/fixtures/resolve/enumeration/expected …/extraction-frontend-check/resolve/enumeration/expected` / `make: Leaving directory '…/filament-core-data'` |
| `make rust-test` (default channel 1.94.1), first run 01:42 | exit 2 — `test result: FAILED. 6 passed; 2 failed; 4 ignored` in `change_set.rs` (TC-1310, TC-1299: `THIRD-PARTY-NOTICES.md` "unclassified"). Cause: a concurrent, **uncommitted** CR-036-8 edit (root `THIRD-PARTY-NOTICES.md`, harness, `change_set.rs`, NFR-032, `spec/tests.md`, `spec/log.md`; mtimes 01:42–01:44) landed in the working tree mid-run, and the change-set gate reads the working tree while the range is unsquashed. Not a defect of `9f764c6`: the same two tests passed under the crate gate at 01:39. |
| `make rust-test`, second run 01:47 | exit 2 — `test result: FAILED. 7 passed; 1 failed; 4 ignored` (TC-1299 only; TC-1310 now passes): the same concurrent edit was still in flight (the harness was being moved to `scripts/` as a staged rename while the run read the tree). Workspace totals 31 passed, 1 failed, 6 ignored. The reviewer did not re-run a third time: the working tree is another agent's moving target, and the branch tip `9f764c6` passed these tests under the crate gate. The orchestrator should re-run `make rust-test` once CR-036-8 is committed. |

The 13 ignored tests each carry a reason: eight are static/E2E gates that nest
`cargo test`, `make`, or the network-backed `cargo deny`/`cargo audit`
(TC-1298, TC-1306 suite half, TC-1314, TC-1316..1318, TC-1323, TC-1324,
TC-1349), three are blocked on filed issues #87/#88 (TC-1290..1292), one is a
child-process half (TC-1280). Every TC-1200..TC-1350 id in `spec/tests.md`
binds to a `tc_NNNN_` function except TC-1337, which is a Manual row blocked on
issue #85 by design.

## What was checked and held

- **Engine ownership (FR-091-CON-1/2/3).** No `struct FieldDecl|TypeRef|ClauseRef|OperationDecl`; `load_repo`/`load_module_set` only in `bundle.rs`; `rows::field_rows` re-reads Properties rows only through `scan::{lines,level2_sections,blocks_in}` and `properties::{table_rows,fence_rows}` — the CR-036-3 / quire-rs#420 allowance — and `enumeration::values_rows` goes through `eval_locator` + `evaluate_assert` + `table_from_section`. The two places that step outside are FND-1492 and FND-1493.
- **Registry (FR-096).** `Code` is the closed 26-variant enum; `grep '"agent-ix.extraction-frontend'` over `src/` is empty; severity/blocking are functions of `(Code, Disposition)` only; `sort_diagnostics` is locus-free-first then `(path, line, column, code, message)` under byte order.
- **Order and panic surface (NFR-031).** No `HashMap`/`HashSet`; every observable map is `BTreeMap`/`BTreeSet`; no `unwrap`/`expect`/`panic!`/`unreachable!`/index slicing in `src/`; the one `#[allow]` is `clippy::too_many_arguments` on a private fn with a comment. Integer values cross the wire as `usize` line/column/count serialised by serde; no `as` casts.
- **Limits (NFR-031-AC-6).** `limits.json` is `include_str!`-parsed at run time and the value a `LIMIT_*` message names is read from the parsed struct (`limits.rs:breach`), not restated. `maxDocuments`/`maxDocumentBytes`/`maxDepth` are checked *after* `load_repo` returned and `maxFieldsPerRecord`/`maxClauseBytes` after the engine extracted — i.e. they bound what is *lowered*, not what is *read or allocated*. That is what NFR-031's Rationale and metric table declare (FR-091-CON-2 permits no other read), so it is recorded here as a design limit, not a finding.
- **Output fence and atomic write (FR-097).** `check_output` canonicalises parents and refuses paths under the bundle/module roots, missing directories, and colliding slots before `Bundle::load`; `write_lift` stages every file as `<name>.tmp` beside its target, renames in the order diagnostics → provenance → fingerprint → document, and a `Drop` guard removes leftover temps. Blocked lifts write the diagnostics sidecar only (TC-1281 verifies pre-existing files untouched). See FND-1490 for the residual hole.
- **Goldens.** Written only by `lift --write-goldens` (`main.rs::write_golden`, staging outside every root, `install_golden` renames); no test writes under `fixtures/` (TC-1289 lifts committed copies and asserts `git status --porcelain` empty). Goldens are not self-certified: TC-1286 and NFR-031's suite compare each document to `decide({"ir":doc}).normalized`, TC-1283 to the FR-050 node reader, TC-1278 the fingerprint to `sha256sum`.
- **Fixture provenance.** Every fixture directory that is a bundle root or module root carries `PROVENANCE.json` (TC-1285 walks 100+ documents); the six constructed negatives carry `constructed.json` naming the constructing test per FR-098; the grouping directories `clauses/ edges/ lower/ resolve/ negatives/` hold no documents of their own.
- **Toolchain and deps (NFR-033).** Exact pins (`sha2 =0.10.9`, `clap =4.6.6`, `tempfile =3.27.0`, `proptest =1.11.0`, `quire-rs` by `rev 8b8020e`, `ix-trace-rs` by tag), `rust-version.workspace = true` per CR-036-1, `[lints.rust] unsafe_code = "forbid"` plus `#![forbid(unsafe_code)]` on both roots, `deny.toml` admits AGPL only for the two first-party crates.
- **Tests.** Every `tc_NNNN_` carries its `#[trace]`; assertions are against fixed points outside the code (goldens, the reader, `sha256sum`, the node reader, planted-token controls, proptest renamings/inverse flips). No assertion-free test, no `#[should_panic]`, no sleep-based timing except the 30 s budget ceiling in TC-1305.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-1490 | medium | `Temp::create` stages with `fs::write`, which follows a pre-existing `<name>.tmp` symlink and truncates a concurrent lift's temp: a `<out>.tmp` symlink into the bundle root defeats the FR-097 "under the bundle root" fence `check_output` enforces one call earlier (FR-098 read-only lifting), and two lifts to one `--out` interleave through one temp; use `OpenOptions::new().write(true).create_new(true)` (a stale temp then refuses as `OUTPUT_UNWRITABLE` naming the path) | crates/extraction-frontend/src/write.rs:251 |
| FND-1491 | medium | `manifest_name` re-parses `manifest.yaml` with a column-0 `name:` line scan and `trim_matches('"')`: a legal `name: "spec-objects-business" # comment` or a folded/indented scalar yields a wrong or empty name, `ModuleManifest::from_bundle` then fails and the lift refuses with `MODULE_REFUSED` "declares `name: `", a second reading of a file the engine already parsed (FR-091 Description); key the manifest to the registry by loading each root's name from the engine (or a `Registry` root→name accessor) rather than by re-lexing YAML | crates/extraction-frontend/src/lift.rs:88 |
| FND-1492 | medium | `operation_rows` parses `## Operations` itself: `### ` headings via `strip_prefix` and the `Returns:` line via `starts_with`, mirroring `extract_operations` rather than calling a helper it exports; FR-091-CON-3 says the frontend "SHALL NOT parse … `## Operations`" and CR-036-3 admitted only the Properties-row re-read through the engine's scanner. When the engine's heading/`Returns` acceptance differs from this scan (`###Name`, `Returns :`), the operation origin and the FR-094-AC-12 `Returns:` locus silently fall back to line 1 | crates/extraction-frontend/src/rows.rs:126-169 |
| FND-1493 | medium | `frontmatter_edges` re-reads the `relationships:` list and re-implements the engine's private `extract_target_id` (`target_token`) to subtract body autolinks from `harvest_edges`; if the engine changes its reduction (fragment, trailing slash, case) the declared set no longer matches and every frontmatter edge is skipped *without a diagnostic*, emptying `relationships[]` and moving every golden. Ask quire-rs to expose `harvest_frontmatter`/an edge-source tag (record as an FR-094-CON-1-style hook), and until then assert in a test that `frontmatter_edges` returns every declared pair for the `business` fixture | crates/extraction-frontend/src/edges.rs:77-108 |
| FND-1494 | low | `library()` turns a parse failure of the embedded `kernel-scalars.json` into an empty map, so every `Type` cell would become `UNRESOLVED_TYPE_TOKEN` with a misleading message instead of a build-defect refusal; `Limits::declared()` surfaces the same class of failure — do the same here (a `Result` cached once, refused at lift start) | crates/extraction-frontend/src/scalars.rs:64 |
| FND-1495 | low | A `limits.json` parse failure and a `ProvenanceError` (embedded lock does not pin `quire-rs`/the crate) are reported as `OUTPUT_UNWRITABLE`, a code FR-096 defines as "`--out` lies inside the bundle root or cannot be written"; the operator is pointed at the wrong cause. The registry is closed, so either widen `OUTPUT_UNWRITABLE`'s registry text via CR or make these build-time invariants (`const`-checked / asserted by a test that the embedded files parse) rather than runtime refusals | crates/extraction-frontend/src/lift.rs:138, crates/extraction-frontend/src/lift.rs:148 |
| FND-1496 | low | `values_rows` recovers the `Value` cell by `split('\t').nth(index)` over the evaluator's `Value::String(r.join("\t"))`, coupling to an internal rendering the engine does not document; a cell containing a tab shifts the column and mis-names the variant. Read the cell through `table_from_section`'s rows (already fetched for the header index) instead of the joined string | crates/extraction-frontend/src/enumeration.rs:155 |
| FND-1497 | low | Golden comparisons in TC-1279 and TC-1280 are guarded by `if expected.is_dir()` / `if golden.is_file()` and pass vacuously when a golden is deleted (FR-097-AC-7/AC-8 name the committed goldens); TC-1305 asserts the 30 s half of NFR-031-AC-6 but records that resident memory "is not measured", so the 512 MiB half is unverified | crates/extraction-frontend/tests/write.rs:137-146, crates/extraction-frontend/tests/write.rs:208, crates/extraction-frontend/tests/document.rs:356, crates/extraction-frontend/tests/limits.rs:1291 |
| FND-1498 | low | Two auxiliary reads sit outside the fences: `inspect --ir` reads the named file whole with no size bound (NFR-031 bounds only the lift), and `fixture_module_roots` joins each `modules.json` root onto the inventory root without rejecting absolute or `..` entries, so `Path::join` replaces the inventory root and a fixture can name a module root anywhere on the host | crates/extraction-frontend/src/write.rs:334, crates/extraction-frontend/src/write.rs:390 |
| FND-1499 | low | `applies_to(keyword, kind, scalar)` is stringly typed with a `_ => true` catch-all, against the house rule "enums + exhaustive match over strings + flags": a keyword the engine adds later is deemed applicable to every kind here and only refused by the reader as `INVALID_IR` at the document, not `CONSTRAINT_NOT_APPLICABLE` at the row; `KEYWORDS` exists but is not the match domain. Match on a closed `Keyword` enum derived from the engine's `Constraint` and on `ResolvedKind` directly | crates/extraction-frontend/src/lower.rs:441-459 |

## Observations (not findings)

- `write_lift` renames four files in sequence without `fsync`; a crash between renames leaves a mixed set. FR-097 asks for per-file temp+rename and the stated order, which is met; cross-file atomicity is not required by the spec.
- `bundle.rs::accepted_modules` splits the engine's `failure.reason` on `": "` to recover the `semantic.*` code; `ArchetypeLoadFailure` carries only a `reason: String`, so the split is forced. `resolve.rs:430` matches the companion advisory by `message.contains("\"<token>\"")` as a fallback after the line match; all three placeholder reasons map to one code, so a miss changes only the message's reason word.
- `Refusal::code()` falls back to `Code::EngineDiagnostic` for a reader-coded diagnostic, which no refusal path constructs today.
- The Makefile block is as specified: every cargo call carries `+$(EXTRACTION_TOOLCHAIN)` and `--locked`, the check target regenerates into `CARGO_TARGET_DIR` and diffs, never writes under `fixtures/`; `deny`/`audit` point at overridable manifest/lock paths for the falsification tests.
- `test/fixtures/compiler/shared/cases.json` changes only `spec-bundle`/`reason` members, the added case and the `$comment`; the node seam is untouched (TC-1294 verifies).
- The working tree at review time carried an uncommitted CR-036-8 edit set from another agent (root `THIRD-PARTY-NOTICES.md` +216, harness permitted list, `change_set.rs` +31, NFR-032, `spec/tests.md`, `spec/log.md`). It was not reviewed and is not part of this commit; the CR itself records that FR-099-CON-1/AC-5 still state the outside-the-crate set as four paths and needs a follow-up CR.

## Dispositions

Recorded at the CR-036-9 fix pass; each row names what changed or why not.

| Finding | Disposition |
| --- | --- |
| FND-1490 | applied — `write.rs` `Temp::create` opens `<name>.tmp` with `OpenOptions::create_new`, so a pre-existing temp (a concurrent lift's, a stale one, or a planted symlink) is refused as `OUTPUT_UNWRITABLE` naming the temporary path and never followed or truncated |
| FND-1491 | applied — `lift.rs` reads the module name through the engine's own `quire_rs::loader::manifest::parse_manifest` (`Manifest.name`, with the engine's directory-name fallback when absent); an unparseable manifest is `MODULE_REFUSED` naming the engine's error; the line scanner is gone |
| FND-1492 | applied — `rows::operation_rows(raw, decls)` takes the engine's `OperationDecl` list and only *locates* each returned name; the engine's `level3_headings` is private and `scan::Block` has no heading variant at rev `8b8020e`, so the `### <name>` and `Returns:` line matches remain, confined to the locus of a declaration the engine already returned, through `scan::{level2_sections, lines_outside_fences, blocks_in}` and `properties::table_rows`; a heading the engine did not return yields no locus, and a declaration the match cannot find is located at the document head, never dropped |
| FND-1493 | applied — `edges::frontmatter_edges` keeps every `(id, verb)` pair as `harvest_edges` returns it and reduces nothing; the private `target_token` re-implementation is gone; the frontmatter subset is decided against the engine's parsed `relationships:` map by verb and by whether the authored `target` names the engine's id (itself, or as its last `/`-segment, the engine's FR-026-AC-6 contract); TC-1231 and TC-1236 assert the full declared pair set for the `config-version-table` and `edges/artifact-axis` documents; a `harvest_frontmatter` export remains a quire-rs hook to ask for |
| FND-1494 | applied — `scalars::check_library` surfaces the embedded `kernel-scalars.json` parse error and `lift` refuses at start (the same class as `Limits::declared`); the lookups never run over an empty map in a lift |
| FND-1495 | not applied — the registry is closed by FR-096 and widening `OUTPUT_UNWRITABLE`'s text or adding a build-defect code is a CR the orchestrator files; the two build-invariant refusals (limits, provenance) and the new library refusal keep `OUTPUT_UNWRITABLE` for now, and each message names the embedded file at fault |
| FND-1496 | not applied — reading the `Value` cell through `table_from_section`'s rows changes the enumeration path the goldens were cut on; deferred to a ticket of its own so the golden move is one commit |
| FND-1497 | not applied — the vacuous `if golden.is_file()` guards in TC-1279/TC-1280 and the unmeasured 512 MiB half of TC-1305 are real gaps; both need a fixture-presence assertion and a memory measurement designed against NFR-031's metric table, filed for the follow-up rather than patched here |
| FND-1498 | applied — `inspect --ir` reads through `read_json(path, limits.max_document_bytes)`, which refuses a larger file naming its size and the limit before reading; `fixture_module_roots` rejects a `modules.json` root that is absolute or carries `..`/`.` components, naming the file |
| FND-1499 | applied — `lower::applies_to` matches exhaustively over a closed `Keyword` enum (`Keyword::of` matches the engine's `Constraint` variants exhaustively, so an added variant is a compile error) and a closed `IrKind`; a keyword or kind outside either set is not applicable, raised at the row as `CONSTRAINT_NOT_APPLICABLE`; the `_ => true` arm is gone |
