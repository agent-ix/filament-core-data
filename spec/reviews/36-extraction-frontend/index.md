---
id: SR-168
title: "Composite review index for the spec-bundle extraction frontend"
type: SpecReview
analysis: base
scope: "SR-160..SR-167"
review_set: all
---
# Composite review index

## Summary

Eight analyses over issue #36's specification: base, failure domain,
integrity, dependency, evidence, risk and complexity, scope boundary, and
EARS conformance. The seven analyses SR-161..167 returned 13 high and 33
medium findings (24 low); their findings were applied to the requirement
files in commit `2c7bbb5` and the base review SR-160 then ran against the
applied text. This index verifies each of the 70 analysis findings against
the current files and records only what is still open.

## Verdict

**CONDITIONAL** — every high and every medium that named a defect in the
requirement text is applied and verified against the current files; the
matrix covers 173/173 obligations. The condition is one process finding and
four record-level residues: PR #84 still moves the FR-050 reader the slice
uses as an oracle and no artifact records the rebase-before-tasking order;
`spec/spec.md` §2.2 contradicts §2.1; `spec/log.md` understates the reserved
TC range; one sidecar-path collision is unrefused; and a handful of EARS
residues remain. None blocks `spec-to-plan`.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-1480 | medium | PR #84 (open, mergeable, base `main`) rewrites FR-046-AC-11 and FR-050-AC-11 and changes `src/compiler/ir/reader.mjs`, the FR-050 oracle behind FR-092-AC-10, FR-093-AC-11, FR-094-AC-15, and FR-097-AC-11. SR-163 FND-1434 and SR-165 FND-1459 asked that those criteria be tasked after #84 lands and this branch rebases; the spec text needed no change and none was made, but no artifact — not US-015, not `spec/log.md`, not `spec/tests.md` — records the ordering, so Plan-014 must carry it as its first sequencing rule | SR-163 FND-1434, SR-165 FND-1459, PR #84, FR-092-AC-10, FR-093-AC-11, FR-094-AC-15, FR-097-AC-11 |
| FND-1481 | low | `spec/spec.md` §2.2 still lists "Implementing the spec-bundle extraction frontend (issue #36)" as out of scope, an issue #19 bullet the apply pass left beside §2.1's new twelfth-delivery paragraph; reword to "as part of issue #19" or drop it | SR-160 FND-1405, spec/spec.md §2.1, §2.2 |
| FND-1482 | low | `spec/log.md` records the reservation as TC-1200..1329 while the matrix took TC-1200..1349; collision-free (PR #84 stops at TC-1110) but the record understates the range the next reservation must skip | SR-160 FND-1404, spec/log.md, spec/tests.md |
| FND-1483 | low | SR-161 FND-1418 residue: FR-097 refuses an output path under the bundle or a module root and an unwritable directory, but `--diagnostics` or `--provenance` naming `<out>`, `<out>.fingerprint`, or each other is not refused; FR-099 renames the sidecar to the given path with no collision rule | SR-161 FND-1418, FR-097 Atomic write, FR-099 `lift` |
| FND-1484 | low | EARS residues after the apply pass: two obligations still carry an embedded `because` (FR-092 `KERNEL_NAME_SHADOWED` bullet, FR-093 `identity-field` bullet) and FR-094's `allowed_links` skip bullet carries its rationale inline (SR-167 FND-1477); NFR-032 Scope obliges "The maintainer SHALL trace every permitted entry", a person actor (SR-167 FND-1475); the blocked-lift write rule is stated in both FR-097 ("write `<out>.diagnostics.json` and nothing else") and FR-099 ("If the exit code is `1`, then the command SHALL write the diagnostics sidecar and no other file") and FR-097-CON-1 still joins two obligations (SR-167 FND-1478, FND-1474). `quire validate` flags none of them; the split is editorial | SR-167 FND-1474, FND-1475, FND-1477, FND-1478, FR-092, FR-093, FR-094, FR-097, FR-099, NFR-032 |

## The analyses

| Analysis | Review | Verdict |
|---|---|---|
| base | SR-160 | PASS |
| failure-domain | SR-161 | CONDITIONAL at review (3 high, 6 medium, 1 low); all applied, one low residue (FND-1483) |
| integrity | SR-162 | CONDITIONAL at review (3 high, 7 medium); all applied |
| dependency | SR-163 | CONDITIONAL at review (2 high, 3 medium, 5 low); all applied except the PR #84 ordering (FND-1480) |
| evidence | SR-164 | CONDITIONAL at review (2 high, 5 medium, 3 low); all applied |
| risk-complexity | SR-165 | CONDITIONAL at review (2 high, 7 medium, 1 low); all applied except the PR #84 ordering (FND-1480) |
| scope-boundary | SR-166 | CONDITIONAL at review (3 high, 7 medium); all applied |
| ears-conformance | SR-167 | CONDITIONAL at review (0 high, 5 medium, 5 low); applied, four editorial residues (FND-1484) |

## Dispositions

Each SR-161..167 finding, verified against the requirement files at HEAD
(`2c7bbb5`). `applied` means the text now says what the finding asked and the
matrix row exists; nothing is marked applied on the strength of the commit
message.

| Finding | Review | Disposition |
|---|---|---|
| FND-1410 | SR-161 | applied — FR-097 calls `agent_ix_semantic_ir::decide` at lift time before any write, every reader diagnostic is a blocking `INVALID_IR` (FR-097-AC-15, TC-1342, EC-144); `INVALID_IR` is owned by FR-096 alone |
| FND-1411 | SR-161 | applied — `DUPLICATE_TYPE_NAME` decided on FR-095 slugs (FR-093, FR-095-AC-14, TC-1347), `DUPLICATE_CONSTRAINT` for a repeated keyword or colliding `diagnosticCode` (FR-093-AC-13, TC-1334) |
| FND-1412 | SR-161 | applied — FR-092 consumes the engine's `target` and `reason`, `Ambiguous` dropped (engine error → `ARTIFACT_NOT_LOWERED` + `ENGINE_DIAGNOSTIC`, FR-092-AC-4), `Enumeration` from frontmatter `object`, `KERNEL_NAME_SHADOWED` for shadowing (FR-092-AC-8) |
| FND-1413 | SR-161 | applied — `displayName` is frontmatter `name` when an `Identifier`, else `title` verbatim, else `UNNAMEABLE_ARTIFACT`; the index carries `id`, `title`, `name`; `type/<DisplayName>` minted from that one value |
| FND-1414 | SR-161 | applied — `not_applicable` lowers to `fields: []` (FR-093-AC-14), reference to a non-lowered artifact is blocking `STALE_TYPE_TOKEN` with `related` at the cause (FR-092-AC-6), `lossy` emits `DECLARED_LOSS lossy-extraction` |
| FND-1415 | SR-161 | applied — engine `line` 0 or absent → no `locus`, path in `related`/message (FR-091, FR-096-AC-15, TC-1345, EC-153) |
| FND-1416 | SR-161 | applied — `DUPLICATE_ARTIFACT_ID` at the second document, missing `id` and malformed `org`/`name` refused as `BUNDLE_UNIDENTIFIED` at `spec.md` (FR-091-AC-5, AC-11) |
| FND-1417 | SR-161 | applied — cross-package imports refused as `IMPORT_UNSUPPORTED` (FR-092-AC-5); imports are out of scope in `spec.md` §2.2 and US-015, so no export list is emitted and module-to-module import checks stay with `load_module_set` |
| FND-1418 | SR-161 | applied-partially: write order and per-file rename fixed, `OUTPUT_UNWRITABLE` for paths under the bundle or a module root before loading (FR-097-AC-13), sidecars exempted from AC-9 explicitly; `--out` equal to a sidecar path or `--diagnostics == --provenance` is still unrefused (FND-1483) |
| FND-1419 | SR-161 | applied — provenance omits roots (FR-095-AC-10 with an absolute `BUNDLE=`), crate and engine versions from `include_str!("Cargo.lock")`, `maxDocuments`/`maxDocumentBytes` stated as post-`load_repo` bounds in NFR-031, `<SCREAMING_FIELD>` transform defined with `DUPLICATE_CONSTRAINT` on collision |
| FND-1420 | SR-162 | applied — `crates/semantic-ir` is a runtime `path` dependency; NFR-033 permits `path` on workspace members and forbids it outside; NFR-032-AC-2 asserts the single path edge |
| FND-1421 | SR-162 | applied — FR-093 raises the frontend's own `CONSTRAINT_NOT_APPLICABLE`, FR-097 raises the frontend's `INVALID_IR`; FR-096-AC-3 grep covers all three prefixes |
| FND-1422 | SR-162 | applied — `lower_enum` via the engine's `values_table` evaluator (FR-093-AC-12, TC-1333), `kind: alias` never emitted, FR-098-AC-3 no longer requires an `alias` |
| FND-1423 | SR-162 | applied — FR-091 hands each `SemanticDiagnostic` to FR-096, which is the single authority for the `ENGINE_DIAGNOSTIC` wrap and severity map |
| FND-1424 | SR-162 | applied — FR-095's closed list now carries `param/` and `variant/`; kernel-scalar identity `type/<KernelScalar>` stated in FR-092 and FR-095 (FR-095-AC-6 asserts `param/` and `variant/`) |
| FND-1425 | SR-162 | applied — two bundle roots at the same relative path (FR-093-AC-1, NFR-031-AC-3, FR-098 inventory) |
| FND-1426 | SR-162 | applied — `constructed.json` for the six non-file codes, two-document bundles named, `LIMIT_*` owned by NFR-031 in FR-096 Rationale/Inputs, FR-099-AC-2 separates exit 1 from exit 2 |
| FND-1427 | SR-162 | applied — inventory lists `business` (with `operations.md`), `both-forms`, `modules/objects-extra`, `modules/conflicting`, and one `negatives/<CODE>/` per code; FR-092-AC-1 names four scalars plus `JsonObject`; FR-098-AC-11 makes the inventory a test |
| FND-1428 | SR-162 | applied — all four files written on every non-blocking lift (FR-097-AC-14), options only rename; FR-099-AC-5 and FR-099-CON-1 include the diagnostics document; US-015-EX-4 names the three sidecars |
| FND-1429 | SR-162 | applied — relationships filtered by `allowed_links` (FR-094-AC-6), globs anchored in NFR-032, `decimal-policy` carries `version`/`required`, NFR-031 rationale no longer calls table/fence identity "the fifth criterion", the matrix rows exist |
| FND-1430 | SR-163 | applied — pin at or after `a874fb6`, `8b8020e` at authoring (FR-091 Inputs, NFR-033-AC-3, FR-095-AC-9) |
| FND-1431 | SR-163 | applied — parity runs from the Rust suite shelling to `node src/compiler/cli.mjs compile`; the seam stays `FRONTEND_NOT_IMPLEMENTED` under filament-core-data#86 (FR-098-AC-6/7/10) |
| FND-1432 | SR-163 | applied — module vendored from `d1840b8` with `PROVENANCE.json` (NFR-033-AC-3, FR-095-AC-15, FR-098-AC-1) |
| FND-1433 | SR-163 | applied — relationships from `harvest_edges` frontmatter pairs at line 1, column 1; `## Relationships` waits on quire-rs#418 (FR-094-CON-1) |
| FND-1434 | SR-163 | not-applied: no spec-text change was requested; the task-ordering half (rebase after PR #84 before tasking the FR-050-gated criteria) is recorded nowhere — carried as FND-1480 for Plan-014 |
| FND-1435 | SR-163 | applied — NFR-033 Scope states the engine is compiled, not qualified, on 1.98.1 until quire-rs#417 closes |
| FND-1436 | SR-163 | applied — US-015 names the owner as the ruler of #77, #78, #67, #61 and the re-golden trigger |
| FND-1437 | SR-163 | applied — FR-093→FR-050, FR-095→FR-030, FR-098→FR-096, FR-099→FR-091 are frontmatter `depends_on` edges |
| FND-1438 | SR-163 | applied — FR-092 `depends_on` FR-096; FR-096 Rationale states it is built immediately after FR-091 |
| FND-1439 | SR-163 | not-applied: informational (API surface verified real); no change requested |
| FND-1440 | SR-164 | applied — NFR-031-AC-4 is `Analysis` citing quire-rs TC-473 and the FR-091-CON-2 gate (TC-1303 `Static`) |
| FND-1441 | SR-164 | applied — NFR-031-AC-5 names the exemption list (`write.rs` for `std::fs`, the binary's argument parsing for `std::env`) and every static gate carries a planted-token control (FR-091-AC-8, FR-095-AC-12, FR-096-AC-3, NFR-031-AC-5/AC-8) |
| FND-1442 | SR-164 | applied — repeat-run criteria compare against the committed golden and `decide(...).normalized` (NFR-031-AC-1/2, FR-097-AC-3/7/8, FR-095-AC-8); FR-096-AC-9 compares against `expected/diagnostics.json` |
| FND-1443 | SR-164 | applied — FR-091-AC-4 plants a conflicting module under fake `HOME/.ix` and `QUIRE_MODULES` with the explicit-module control (`fixtures/modules/conflicting/`) |
| FND-1444 | SR-164 | applied — TC-1337 `Manual`, traced to US-015, blocked on #85; TC-1293 traces to FR-098-AC-9 alone; FR-098-CON-3 kept (TC-1338) |
| FND-1445 | SR-164 | applied — rehearsals typed `Static` and named as `scripts/extraction-frontend-harness.mjs` verbs (NFR-032-AC-7/8/9), `extraction-frontend-deny`/`-audit` targets added to FR-099, NFR-031-AC-9 is a `compile_fail` doctest `Test` |
| FND-1446 | SR-164 | applied — NFR-033 Rationale records that this crate is the first member to adopt `#[trace]`; AC-8 requires the matrix rows before the first traced test; AC-9 confirms binding with `quire coverage --json` first |
| FND-1447 | SR-164 | applied — FR-094-CON-4 `Static analysis` via NFR-032-AC-1, FR-098-CON-2 `Inspection`, FR-097-AC-12 keeps only the `decide` half, FR-096-AC-14 is a `Static` set equality, FR-093-CON-1/2 and FR-094-CON-2 are `Property` |
| FND-1448 | SR-164 | applied — digests compared against `sha256sum` outside the crate (FR-095-AC-3/4, FR-097-AC-6); versions from `include_str!("../../Cargo.lock")`, never `env!` |
| FND-1449 | SR-164 | applied — one new two-dialect shared case `records-and-scalars`, count asserted (FR-098-AC-6), three existing cases recorded with a `scalar` reason; NFR-031-AC-10 names the crate's own `proptest` bundle-tree strategy |
| FND-1450 | SR-165 | applied — see FND-1449; parity is structural under the projection FR-098 defines (FR-098-AC-7, AC-12) |
| FND-1451 | SR-165 | applied — see FND-1433; FR-094 reads no `## Relationships` and `harvest_edges` is the only edge source until quire-rs#418 |
| FND-1452 | SR-165 | applied — see FND-1425 |
| FND-1453 | SR-165 | applied — see FND-1430; provenance re-golden per pin bump is one deliberate commit under FR-098-CON-2 (FR-095 Rationale) |
| FND-1454 | SR-165 | applied — no canonicalizer, member ordering, or number formatter in the crate; bytes come from `agent_ix_semantic_ir::normalize::normalized` (FR-097-CON-2, TC-1336); ordering wording fixed to code point |
| FND-1455 | SR-165 | applied — each reading is cited in its owner FR with its reversal consequence (FR-093 Rationale, FR-095 Rationale, FR-096 Rationale, FR-097 Rationale); one-task-per-reading is Plan-014's |
| FND-1456 | SR-165 | applied — see FND-1421 |
| FND-1457 | SR-165 | applied — NFR-033 Rationale makes `cargo +1.98.1 build --locked` leaving other members' lock entries unchanged the first plan task (NFR-033-AC-1); rebase onto the sweep if it lands first |
| FND-1458 | SR-165 | applied — FR-092 Pass order section; FR-092-AC-11 refutes a one-pass implementation (TC-1332); TC-1215 is a two-document fixture |
| FND-1459 | SR-165 | applied-partially: fixtures copied from the repository checkout at `d1840b8`, never `~/.ix` (FR-098 Rationale, NFR-033); matrix rows landed; the rebase-after-#84 half is FND-1480 |
| FND-1460 | SR-166 | applied — seam wiring is filament-core-data#86 (US-015, FR-098); the `reason` member is a permitted path in NFR-032 |
| FND-1461 | SR-166 | applied — FR-098 owns the projection (`parity::project`, FR-098-AC-12) |
| FND-1462 | SR-166 | applied — no third JCS writer; sidecar carries the quire-specification FR-018 shape verbatim (`domain`, `version`, `algorithm`, `digest: sha256-jcs:`) (FR-097-AC-6) |
| FND-1463 | SR-166 | applied — see FND-1433 |
| FND-1464 | SR-166 | applied — `composite` iff the registry `EdgeTypeDef.inverse` is `part_of`, never from spelling (FR-094-CON-2, FR-094-AC-14) |
| FND-1465 | SR-166 | applied — see FND-1421 |
| FND-1466 | SR-166 | applied — no `jsonschema` crate (FR-097-AC-1); the applicability copy is tied to the reader by a full cross-product contract test (FR-093-CON-4, TC-1225) |
| FND-1467 | SR-166 | applied — the `rev`→tag migration is owned by quire-rs#417 (NFR-033 Rationale, FR-095 Rationale) |
| FND-1468 | SR-166 | applied — see FND-1436 |
| FND-1469 | SR-166 | applied — see FND-1422 |
| FND-1470 | SR-167 | applied — every Behavior bullet in scope carries one `SHALL`; the script finds no `and SHALL`/`; … SHALL` join and `quire validate` reports 0 `[ears:non-singular]` |
| FND-1471 | SR-167 | applied — every unwanted-behaviour obligation is `If …, then the frontend SHALL …`; no `Where` condition remains |
| FND-1472 | SR-167 | applied — every Description and Statement carries exactly one `SHALL`; NFR-031's limit clause is a separate `If … then` sentence |
| FND-1473 | SR-167 | applied — subjects are `the frontend`, `the command`, or a named Make target throughout; the one remaining non-system actor is the maintainer sentence in NFR-032 Scope (FND-1484) |
| FND-1474 | SR-167 | applied-partially: FR-094-CON-1 and FR-091-CON-1 restated with `SHALL` and rationale moved out; FR-095-CON-1 and FR-096-CON-3 are single obligations; FR-097-CON-1 still joins "SHALL depend on … as a runtime `path` dependency" with "changing no byte of it" (FND-1484) |
| FND-1475 | SR-167 | applied-partially: test-as-actor bullets are gone from FR-096, FR-097, FR-098 and FR-099-CON-1 names the change set, not the requirement; NFR-032 Scope now reads "The maintainer SHALL trace every permitted entry" (FND-1484) |
| FND-1476 | SR-167 | applied — `SHALL NOT guess` and `invoked deliberately` are gone, FR-091 names `~/.ix`, `$HOME`, `QUIRE_MODULES`, NFR-031 names 512 MiB and 30 s |
| FND-1477 | SR-167 | applied-partially: rationale moved to Rationale paragraphs in FR-092, FR-094, FR-095, FR-097, FR-098; two `because` clauses and one inline rationale remain in Behavior bullets (FND-1484) |
| FND-1478 | SR-167 | applied-partially: exit codes owned by FR-099 and referenced by FR-096/FR-097, the no-ambient-module rule owned by FR-091 and referenced by FR-099, the toolchain never-skip rule owned by FR-099 and measured by NFR-033; the blocked-lift write rule is still stated in FR-097 and FR-099, and FR-094 restates the identity patterns it mints through FR-095 (FND-1484) |
| FND-1479 | SR-167 | not-applied: informational (engine coverage note); no change requested |

## Review set

The review set is `all`. It was inherited as the repository's standing
choice — issues #11, #19, #21, #22, and #23 each ran `all` — and was not
freshly selected by the owner, who was asleep when the analyses were
dispatched. The owner may narrow it; a narrower set would retire the
corresponding SR documents from this index without changing any disposition
above.

## Residues applied after this index was written

Applied on the same day, before the plan was cut: FND-1481 (`spec.md` §2.2 now
excludes the seam wiring, issue #86, rather than the frontend), FND-1482
(`spec/log.md` reservation reads TC-1200..1349), FND-1483 (FR-097 refuses a
sidecar path that collides with `<out>` or another sidecar, FR-097-AC-16,
TC-1339), FND-1484 (the two `because` clauses, the FR-094 inline rationale, the
NFR-032 maintainer actor, the FR-099 duplicate write rule, and FR-097-CON-1 are
rewritten). FND-1480 is recorded in `spec/log.md` and in Plan-014 as a task
precondition: the FR-050-gated criteria are tasked after PR #84 lands and this
branch rebases onto it. The condition on the verdict is therefore discharged
except for that ordering, which only history can discharge.

