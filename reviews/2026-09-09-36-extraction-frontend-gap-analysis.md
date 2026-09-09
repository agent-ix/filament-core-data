---
id: SR-170
title: "Gap analysis — Plan-014 spec-bundle extraction frontend"
type: SpecReview
analysis: gap-analysis
scope: "plan/Plan-014-extraction-frontend/, spec/tests.md TC-1200..1350, spec/functional/FR-091..FR-099, spec/non-functional/NFR-031..NFR-033, spec/usecase/US-015, crates/extraction-frontend/"
review_set: all
relationships:
  - { target: "ix://agent-ix/filament-core-data/Plan-014", type: reviews }
  - { target: "ix://agent-ix/filament-core-data/TM-001", type: references }
---

# Gap analysis — Plan-014 spec-bundle extraction frontend

## Summary

Audited Plan-014 (Task-127..138) on branch `spec/36-extraction-frontend` at
the worktree head: twelve task files, the 151 matrix rows TC-1200..1350, the
twelve requirements FR-091..099 and NFR-031..033 as amended by CR-036-1..7,
and `crates/extraction-frontend/` (21 source modules, 25 integration test
files). Every task is `status: done`; 150 of 151 rows bind to a
`#[trace("TC-NNNN", …)]`-tagged, `tc_NNNN_`-named test; the crate suite is
143 passed, 0 failed, 13 ignored on `cargo +1.98.1`. One matrix row claims
running evidence that does not exist (TC-1292's Rust half), which is the
single high finding.

## Verdict

**FAIL** — one high finding (FND-1500): the matrix marks only the TypeScript
half of TC-1292 as blocked while the whole test is `#[ignore]`d and no test
invokes `src/compiler/backends/rust-serde/cli.mjs`; the only un-ignored
assertion over `--target rust` is that it fails. Everything else is medium or
low; with FND-1500 resolved (a running Rust-half test, or the row restated as
blocked in both halves) the verdict would be CONDITIONAL.

## Findings

| ID | Severity | Summary | Refs | Escape Cause |
| --- | --- | --- | --- | --- |
| FND-1500 | high | TC-1292 / FR-098-AC-8 claim the Rust half runs now through `src/compiler/backends/rust-serde/cli.mjs` with only the TypeScript half blocked on #88, but `tc_1292_…` is wholly `#[ignore]`d (both targets in one loop, so `--ignored` fails on Rust at the first assertion), `grep rust-serde crates/extraction-frontend/` finds nothing, and the un-ignored companion asserts the inverse (`status == 1`, `BACKEND_NOT_IMPLEMENTED`); the named CLI takes only `--out` over a fixed `conformance/bases/*.json` corpus and returns 0 regardless of diagnostics, so the AC as restated by CR-036-6 is not executable | TC-1292, FR-098-AC-8, crates/extraction-frontend/tests/backend.rs:59-129, src/compiler/backends/rust-serde/cli.mjs, spec/log.md CR-036-6 | wrong-requirement |
| FND-1501 | medium | FR-098-AC-4 says "the non-blocking negatives are exactly two, `ENGINE_DIAGNOSTIC` and `ARTIFACT_NOT_LOWERED` (legacy form)" and the inventory calls `DECLARED_LOSS` a blocking negative; on disk `negatives/ARTIFACT_NOT_LOWERED/` is the `both-forms` bundle whose golden holds three `blocking: true` rows and no document, while `negatives/DECLARED_LOSS/expected/` holds a written document with two `blocking: false` rows — the real pair is {`DECLARED_LOSS`, `ENGINE_DIAGNOSTIC`}; TC-1288 never asserts that clause, nor "as the first blocking diagnostic" (only set membership plus byte-equality to the golden snapshot) | FR-098-AC-4, TC-1288, crates/extraction-frontend/tests/fixtures.rs:409-511, fixtures/negatives/ARTIFACT_NOT_LOWERED/expected/diagnostics.json, fixtures/negatives/DECLARED_LOSS/expected/, src/diagnostics.rs:306-316 | wrong-requirement |
| FND-1502 | medium | Task-134 is `status: done` with its first subtask unticked ("Confirm PR #84 is merged; rebase onto `main`"); PR #84 is still OPEN and `origin/main` is at 3b75e01, so the FND-1480 ordering rule (FR-092-AC-10, FR-093-AC-11, FR-094-AC-15, FR-097-AC-11 tasked after #84 lands) was not honoured — TC-1219, TC-1230, TC-1245, TC-1258, TC-1283 were verified against the pre-#84 `src/compiler/ir/reader.mjs` and must be re-run after the rebase | Task-134, plan/Plan-014-extraction-frontend/tasks/Task-134-validate-and-write.md:69, PR #84, SR-168 FND-1480 | correct-requirement-no-evidence |
| FND-1503 | medium | Matrix and plan status never caught up with implementation: 147 rows TC-1200..1350 still read `🚧 planned` and the FR/NFR summary rows `🚧 In progress` although every one binds to a passing test; `plan.md` leaves every requirement and test-plan checkbox unticked (lines 56-70, 133-156), keeps `status: active`, and still says "TC-1339 unused" while the matrix row TC-1339 (FR-097-AC-16) and `tc_1339_` both exist | spec/tests.md TC-1200..1350, plan/Plan-014-extraction-frontend/plan.md:5,52,56-70,133-156 | correct-requirement-no-evidence |
| FND-1504 | medium | `lift --write-goldens --into <dir>` (write every golden under `<into>/<fixture>/expected/`, fixture tree untouched) has no owning requirement: FR-099 names only `--fixtures` and `--staging` for `--write-goldens` and its `extraction-frontend-check` behaviour never names the option, yet `Makefile:418` and TC-1286/1287 depend on it | crates/extraction-frontend/src/main.rs:70,107-119, Makefile:418, crates/extraction-frontend/tests/fixtures.rs:521, FR-099 | missing-requirement |
| FND-1505 | medium | Nine rows bind to tests that never run in the default suite: TC-1298, TC-1306, TC-1314, TC-1316, TC-1317, TC-1318, TC-1323, TC-1324, TC-1349 are `#[ignore = "Static evidence …"]` and no Make target or CI step passes `--ignored`; their binding is a symbol, their execution evidence is manual, and this review did not execute them (network-backed `cargo deny`/`audit`, nested `cargo test`, scratch clones) | crates/extraction-frontend/tests/make.rs:130,202, tests/change_set.rs:456,602,613,628, tests/audits.rs:661, tests/toolchain.rs:565,613, Makefile:391-394 | correct-requirement-no-evidence |
| FND-1506 | low | FR-093-AC-13's fourth clause (a `displayName` equal to a kernel scalar the bundle uses raises blocking `DUPLICATE_TYPE_NAME` naming the scalar) is asserted only by TC-1347, whose `#[trace]` names FR-095-AC-14; TC-1334, the row on AC-13, covers clauses 1-3 only, so the binding for that clause is by prose ("also asserted by TC-1347"), not by tag | FR-093-AC-13, TC-1334, TC-1347, crates/extraction-frontend/tests/lower.rs:1196-1278,1332-1399 | correct-requirement-no-evidence |
| FND-1507 | low | Semantic-review residues: FR-091-AC-11's `line: 0` clause is tested by calling `Diagnostic::engine` directly rather than injecting through `extract.rs`/`lift.rs`, and "the array validates against `common.schema.json#/$defs/diagnostic`" is checked per diagnostic by the hand-rolled `diagnostic_schema_violations` helper, not by a JSON-Schema validator over the array; FR-097-AC-13's module-root case asserts "module root" in the message but not the path; FR-097-AC-2's `/ir/types/{index}` pointer is computed before `validate` re-sorts `types` | TC-1331, crates/extraction-frontend/tests/bundle.rs:623-694, tests/common/mod.rs:27-133, TC-1340, tests/write.rs:370-379, TC-1274, tests/document.rs:275-327 | correct-requirement-no-evidence |
| FND-1508 | low | Trace hygiene: `tests/diagnostics.rs:568` `registry_doc_renders_every_code_with_severity_blocking_and_owner` is untagged but its doc-comment names TC-1271, FR-096-AC-13 and NFR-032 (engine `unmatched_tags`; TC-1271 binds correctly in `tests/docs.rs:23`); `tests/backend.rs:61` carries `FR-046` in an ignore string and its module doc (lines 5-16) still describes the pre-CR-036-6 `--target rust` route; `tests/payload.rs:6` names TC-1337 in prose | crates/extraction-frontend/tests/diagnostics.rs:567-570, tests/backend.rs:5-16,61, tests/payload.rs:6 | correct-requirement-no-evidence |
| FND-1509 | low | `quire coverage` reports five `oracle-resembles-implementation` suspicions, all test-helper duplication rather than implementation copies: `without` is identical between `tests/edges.rs` and `tests/lower.rs` (TC-1244, TC-1229) and `sha256sum` between `tests/envelope.rs` and `tests/write.rs` (TC-1248, TC-1249, TC-1278); a shared `tests/common` helper would silence the engine and remove the drift risk | crates/extraction-frontend/tests/edges.rs:531, tests/lower.rs:1003, tests/envelope.rs:196,227, tests/write.rs:104 | correct-requirement-no-evidence |

## Blocked rows

Four rows are declared blocked and each names its issue; the ignore reasons
in code agree with the matrix except where FND-1500 notes:

| Row | Matrix status | Issue | Code evidence |
| --- | --- | --- | --- |
| TC-1290 | `🚧 blocked on issue #87` | filament-core-data#87 | `tests/parity.rs:63` `#[ignore = "blocked: …"]`; a second un-ignored `tc_1290_` (`parity.rs:93`) asserts the single-dialect `cases.json` state |
| TC-1291 | `🚧 blocked on issue #87` | filament-core-data#87 | `tests/parity.rs:246` `#[ignore = "blocked: …"]` |
| TC-1292 | `🚧 TypeScript half blocked on issue #88` | filament-core-data#88 | `tests/backend.rs:61` ignores the whole test, Rust half included (FND-1500); the ignore string also cites #21 |
| TC-1337 | `🚧 blocked on issue #85` | filament-core-data#85 | Manual row, no test by design; the only engine `unbacked_rows` entry in this range |

## Untraced code

Checked every module `src/lib.rs` declares against FR-091..099 and
NFR-031..033 as amended: `rows.rs` (`field_rows`, `operation_rows`, `locate`)
is owned by the FR-093 Rationale (per-field loci re-derived through the
engine's scan and `table_rows`, agent-ix/quire-rs#420) and FR-094's origin
rule; `scalars.rs` by FR-092 "Kernel scalars" (one package-local `scalar`
per used kernel scalar with the `ext/kernel-scalar` extension); `limits.rs`
by NFR-031-AC-6 (`limits.json`, five limits, one blocking diagnostic each);
`write.rs::FIXTURE_MODULES_FILE` (`modules.json` `{"roots": […]}`) by the
FR-098 inventory as amended by CR-036-6; `provenance.rs` (`parse_lock`,
`include_str!` of `Cargo.lock`) by FR-095; `document.rs::assemble` by FR-097.
The one unowned behaviour is the `--into` option (FND-1504). No stub was
found: no module is under six lines, no placeholder body, no re-export-only
module beyond `lib.rs`.

## Coverage

- Reconciliation: `quire coverage --scope . --json`, quire 0.31.0 (engine
  0.46.0@ca7362d4), module `spec-artifacts-process` 0.1.0 discovered as
  `quire validate` discovers it (the run reports duplicate-archetype
  warnings from a doubled module path and one unrelated
  `test/compiler.test.ts` brace diagnostic; neither touches this range). No
  fallback.
- Tasks done: **12 / 12** by recorded status; one subtask unticked on
  Task-134 (FND-1502).
- Rows bound by a tagged test, this delivery: **150 / 151** across
  TC-1200..1350 (151 rows: 147 `🚧 planned`, 4 blocked). The sole unbound
  row is TC-1337, the declared Manual row. `unbacked_rows` in this range:
  TC-1337 only; `status_lies`: none; `untracked_symbols` under the crate:
  none. Cross-check by grep: 150 distinct `#[trace("TC-NNNN", …)]` ids and
  149 distinct `fn tc_NNNN_` names (TC-1290 carries two functions; TC-1280's
  child body is unnamed by design).
- Rows backed, repo-wide: **404 / 1205** on `spec/tests.md`, **552 / 2584**
  minted targets across the bundle; repository-wide populations, not a
  Plan-014 figure.
- Execution evidence: `CARGO_TARGET_DIR=node_modules/.cache/rust-target
  cargo +1.98.1 test -p agent-ix-extraction-frontend --locked --offline` —
  **143 passed, 0 failed, 13 ignored** (3 blocked: TC-1290, TC-1291,
  TC-1292; 9 static-evidence rows, FND-1505; 1 `tc_1280_child` helper),
  doctest 1 passed.
- Marker drift: 147 `🚧 planned` rows over passing tagged tests (FND-1503).
- Untraced behaviours / stubs: 1 unowned CLI option, 0 stubs.
- Semantic review: ran over 4 requirements, 12 acceptance criteria —
  FR-091 AC-3, AC-6, AC-11; FR-093 AC-4, AC-8, AC-13; FR-097 AC-2, AC-9,
  AC-13; FR-098 AC-4, AC-5, AC-8. Nine triples agree on every axis; two are
  partial (FR-093-AC-13 clause 4, FR-091-AC-11 second clause); one
  disagrees on every axis (FR-098-AC-8, FND-1500) and one on the code axis
  (FR-098-AC-4, FND-1501). Ordered by requirement, the mapping given for
  AC-11 in the brief (TC-1208) was corrected to the spec's own row TC-1331;
  TC-1208 belongs to FR-091-AC-9.
