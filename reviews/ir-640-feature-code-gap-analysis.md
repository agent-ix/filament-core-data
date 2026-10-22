---
id: SR-12010
title: IR-640 feature code gap-analysis review
type: SpecReview
analysis: gap-analysis
scope: agent-ix/filament-core-data PR297; IR-640; changed frontend dependency/lock/tests
  and spec/tests.md; full computed spec/source inventory
review_set: subset
---

## Summary

Ticket IR-640. Independent frozen-head review of agent-ix/filament-core-data PR297 at da4e6ee55a799462128174da8528b4f53f60f44f, base/current public main 6a9ffdf676faf070427d76459a80c8743c3eb0ed. Eight changed paths: frontend dependency edge, ordinary lock pruning, one graph test, trace attributes on existing real lift/CLI controls, and TC inventory. No changed requirement or ADR; PR295 owns the already-reviewed contract. No applicable AssuranceProfile or repository AGENTS.md/CLAUDE.md found; CONTRIBUTING.md, workspace configuration and portable rust-style were read. This reviewer made no product edits and ran no Cargo, formatter, metadata, build, native or backend command. Source-only Quire matrix/coverage/validation and Git inspection ran. Reported native checks are author evidence, not reviewer reruns.

## Verdict

FAIL — Inherited baseline and pending qualification require explicit current dispositions; no introduced code defect found.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | high | The unchanged inherited set of 1546 criteria remains untagged; its exact inventory is owned by open assigned FCD#296 under program #3, so whole-repository criterion coverage still fails. | FR-001-AC-1; spec/functional/FR-001-indexed-architecture-record.md |
| FND-002 | medium | FR-091-AC-14 matched downstream control/candidate build qualification remains unrun; owner-lock pruning and focused owner tests do not supply consumer activation/compiled-package, wall-time and peak-memory evidence. | FR-091-AC-14; spec/functional/FR-091-read-a-spec-bundle-through-the-extraction-contract.md |

## Coverage

Plan completion: not assessed

Fresh source-only computed whole matrices at exact base and candidate each contain2169 criteria. Base1548untagged/382method-without-symbol/235tagged/4ignored-only; candidate1546untagged/382method-without-symbol/237tagged/4ignored-only. The only status changes are FR091AC12 and AC13 untagged→tagged. Their actual executable bodies support the new bindings. All1546 candidate untagged IDs equal the exact original pre-PR295 untagged set and the live open assigned FCD#296 inventory; full JSON matrices and exact inventories are retained privately with this review. FND001 aggregates that exact established baseline owner rather than inventing1546 new findings. This reviewer has not yet recorded a current-PR disposition; the previous spec-only deferral does not certify this code PR.

Four unchanged ignored-only rows remain explicit: FR099AC6, NFR032AC5, NFR033AC4/5. Each has a genuine named evidence test and Make extraction-frontend-evidence lane (no blocked tests skipped); no fresh execution for them is claimed by this review. They are not counted as ordinary-suite passes. The382 method-without-symbol rows include Analysis/Inspection/Static obligations and are not automatically unimplemented behavior; the specifically pending new AC14 obligation is FND002. Quire coverage additionally reports existing untracked/unmatched tags; these raw results are retained, not promoted to new semantic findings or interpreted as handwritten-matrix edits. No unmatched tag was introduced on the new graph test or added AC12/13 bindings.

Repository source inventory spans compiler/frontends/IR/package graph/CLI (FR041–053,063/130/131/136/138), backends/readers(FR054–080), kernel/packages/consumers(FR081–090), lift(FR091–099,142/143), conformance(FR035–039/140), and later vocabulary/identity/numeric surfaces(FR106/133–145). Static owner/stub inspection found no confirmed new unowned behavior or production todo!/unimplemented! stub behind the changed seam. Source code is unchanged except dependency selection; the new graph oracle and real reused controls are not stubs or coverage inflation. Whole-tree semantic correctness was not assessed. Optional semantic gap review was not requested and was skipped; focused code-review faithfulness checks still apply. No explicit plan was supplied.

Current full gap verdict remains FAIL. No resource fit, matched consumer saving, repository coherence or IR640 completion is asserted. All native evidence is author-held; reviewer heavy-command reservation was forbidden and respected.

## Examined units

- FR-091-AC-12 (examined): A consumer whose normal/build dependency paths to the pinned `quire-rs` package all pass through the frontend's public lift dependency has no activated normal/build path to the source parser packages excluded above. A scratch negative control restoring default features activates the excluded parsers and is rejected by the same graph check. The assertion inspects the resolved activated graph, not only manifest text or lockfile names.
- FR-091-AC-13 (examined): With the selected features, real public `LiftRequest` calls over the existing positive model/enum and construct fixtures, negative bundles, and legacy controls retain their expected canonical document bytes, package/node identities, typed `Written`/`Blocked`/`Refused` outcomes and diagnostics; the real CLI retains FR-099 exit codes `0`, `1`, and `2`. Typed `body_extraction` remains the semantic oracle; no copied parser, mocked success, or replay bypass supplies the result.
- FR-091-AC-14 (examined): Qualification reports lockfile bytes/package identities separately from activated normal/build package identities and actually compiled grammar packages, with measured wall time and peak memory for matched upgrade-only control and candidate builds. The builds use the same consumer and upstream revisions except the reviewed feature change, compiler, profile, job count, initially absent independent target directories and source-cache policy. Any first-run failure remains recorded. A single comparison is observational; no numeric speedup or literal lockfile package disappearance is required.
- FR-099-AC-1 (context_only): `lift` over the `snapshot-table` fixture with its two module roots (`--module fixtures/modules/fixture-domain --module fixtures/modules/fixture-edges`) exits `0` and writes `<out>` and `<out>.diagnostics.json`; with `--diagnostics d.json` it writes `d.json` in its place and the same document bytes.
- FR-099-AC-2 (context_only): `lift` over `negatives/UNRESOLVED_TYPE_TOKEN` exits `1`, writes the diagnostics sidecar, and writes no document; `lift` without `--module`, `lift` under `negatives/MODULE_WITHOUT_SEMANTIC_BLOCK`, and `lift` with `--out` under the bundle root each exit `2` and write nothing.
- FR-098-AC-2 (context_only): Regenerating every fixture whose root holds a `spec/spec.md` into a scratch directory under `CARGO_TARGET_DIR` reproduces each committed `expected/` file byte for byte, and each regenerated document equals `decide({"ir": doc}).normalized`; a one-byte change to a golden fails the test naming the fixture and the byte offset.
- FR-098-AC-4 (context_only): Every code FR-096 declares is emitted by its `negatives/<CODE>/` bundle or by the test `constructed.json` names, at the golden's recorded line and column or with no locus, as exactly its code as the first blocking diagnostic in FR-096 order; companion diagnostics that the same defect necessarily produces (an `ENGINE_DIAGNOSTIC` row, an `ARTIFACT_NOT_LOWERED`) are pinned by the test; the non-blocking negatives are exactly two, `DECLARED_LOSS` and `ENGINE_DIAGNOSTIC`, whose lifts carry no blocking diagnostic and write the document, `KERNEL_NAME_SHADOWED`'s fixture being refused with `DUPLICATE_T
- FR-097-AC-9 (context_only): A lift that raises a blocking diagnostic leaves a pre-existing `<out>` byte-unchanged, writes `<out>.diagnostics.json`, and leaves no other new file in the output directory.
- FR-097-AC-10 (context_only): A lift into a directory that does not exist refuses with `OUTPUT_UNWRITABLE` naming the path and exits `2`.
- FR-097-AC-14 (context_only): A warning-only lift with no `--diagnostics` option writes `<out>` and `<out>.diagnostics.json`; the two are the only new files in the output directory.
- FR-143-AC-1 (context_only): The `business` fixture lifts to a `2.0.0` document holding one construct of each of its ten declared kinds, and the reader accepts it: `FR-001` and `PR_001` name their `id` field in `identityFields`, `AR_001`'s `members` are `FR-001` and `VO_001`, `NE_001`'s `owner` is `FR-001`, `EV_001`'s `occurrenceField` is its `placedAt` field, `RP_001` persists `FR-001`, and `DM_001`'s `members` are `AR_001`, `EN_001` and `FR-001`.
- FR-143-CON-2 (context_only): Every emitted construct SHALL pass the FR-142 reader rules at lift time.

## Dispositions

| FND | outcome | reason |
| --- | --- | --- |
| FND-001 | deferred | Deferred outside partial implementation PR297 to unchanged open assigned agent-ix/filament-core-data#296 under program #3, which still owns the exact1546 inherited untagged criterion inventory. Current lead scope decision IR-640 comment 38b0a1c6-07cf-44fc-92ae-b812db417340 explicitly preserves this owner and inventory. This is not a coverage waiver, fixed finding, or whole-repository PASS. |
| FND-002 | deferred | Deferred within SAME open IR-640 to the next qualification slice: ordinary downstream QSL adoption and matched upgrade-only control/candidate consumer builds, separate lock/activated/compiled package metrics, wall time, peak memory and retained first failures. Current lead decision IR-640 comment 38b0a1c6-07cf-44fc-92ae-b812db417340 limits PR297 to implemented AC12/13; ticket remains In Progress after partial merge. No AC14 completion or measured saving is claimed. |

## Disposition round 1 verification

Rechecked exact unchanged head da4e6ee55a799462128174da8528b4f53f60f44f and actual current lead decision 38b0a1c6-07cf-44fc-92ae-b812db417340. Re-read live FCD#296: open, assigned to kreneskyp, under program#3, and its fenced criterion inventory equals all1546 current computed untagged IDs as exact ID sets. Code and base PASS conclusions remain applicable; no source or spec change occurred. AC14 remains explicitly unrun, owned by the same open IR640 next qualification slice. Both findings are DEFERRED, not fixed. Full repository gap verdict remains FAIL. No new waiver, measured saving, full ticket closure, repository coherence or consumer qualification is asserted. No new defect identified during this narrow disposition. No heavy command or product edit ran. Final aggregate/current-head acceptance remains lead-owned.

## New findings (disposition pass 2)

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-003 | high | PR297 introduces an untyped raw Linear disposition transcript under reviews/*.md; explicit Quire validation fails because required type frontmatter is absent. | reviews/ir-640-feature-code-gap-analysis-dispositions-round1-linear-comment.md:1 |

## Dispositions (round 2)

| FND | outcome | reason |
| --- | --- | --- |
| FND-003 | still-open | Still open at87d62d6: remove this raw transcript from the PR while retaining the three typed SR artifacts, original actual Linear comment2ff91a0b-9c67-469c-9db3-ddd7dffffdec and byte-exact operations copy. The raw body was independently verified against both before removal. This is a newly added invalid document, not one of FCD300 inherited ten historical files; no baseline deferral or validity waiver applies. |

## Exact-head rebase review and introduced raw-artifact failure

Exact published frozen head87d62d6aae5d74ae5b8eefc99a87b6e5b89a9a91, new based803425. Actual independent checks confirm nine previously reviewed code/test/SR blobs byte-identical, main299workspace schema patch/embedded-schema implementation retained, main298ordinaryTC1306audits.rs byte-identical and no namespace helpers restored. Owning dependency retains fd1cdd9 and adds only reviewed default-features=false/resolve-file. Normal lock contains no added/upgraded identities, removes8parser-related packages, and removes transitive serde_json indexmap activation. Full Rust semantic gate is required because feature-unification changed.

Actual author controls were inspected: genuine TC1841 standalone activated-normal/build graph plus restoring defaults at same edge PASS1; CLI3/fixture4/blocking-write4(parent invokes existing ignored child)/warning1/construct1 PASS; format/clippy/index/matrix exit0. Actual resolver/focused scopes16GiB/swap0 peak41639936/1499590656B, zeroOOMevents, gone/hashclean. These are focused author executions, not full aggregate or compiled downstream consumer qualification. Root full no-filter make-j1test-rust remains pending; ordinaryTC1306must run, not be skipped.

Current computed full matrix2169criteria:1546untagged/382method-without-symbol/237tagged/4ignored-only. Exact1546set equals established FCD296 owner inventory. Existing FND001DEFERRED to open assignedFCD296 and FND002DEFERRED to sameopenIR640 FR091AC14downstream adoption/matchedconsumerqualification remain unchanged. No measured savings, wholeIR640completion, or universalconsumer guarantee. MainFCD300tenhistorical invalid reviews remain separately owned inheriteddebt; newly added rawtranscriptFND003 is not covered by it.

Explicit rawfile validation exit3/missingtypefrontmatter. Typed SRs remain valid separately. Independent actual liveLinear/OPS byte custody verified before proposed raw removal. No production/source edit or heavy/test/resolver/namespace/security operation by reviewer. Code/Rust SR12009 and spec/baseSR12011 have no new source finding; fullgapSR12010FAIL now additionally blocks merge on FND003 until fixed.
