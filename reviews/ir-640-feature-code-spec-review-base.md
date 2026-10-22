---
id: SR-12011
title: IR-640 feature code spec-review/base review
type: SpecReview
analysis: base
scope: agent-ix/filament-core-data PR297; IR-640; changed frontend dependency/lock/tests
  and spec/tests.md
review_set: subset
---

## Summary

Ticket IR-640. Independent frozen-head review of agent-ix/filament-core-data PR297 at da4e6ee55a799462128174da8528b4f53f60f44f, base/current public main 6a9ffdf676faf070427d76459a80c8743c3eb0ed. Eight changed paths: frontend dependency edge, ordinary lock pruning, one graph test, trace attributes on existing real lift/CLI controls, and TC inventory. No changed requirement or ADR; PR295 owns the already-reviewed contract. No applicable AssuranceProfile or repository AGENTS.md/CLAUDE.md found; CONTRIBUTING.md, workspace configuration and portable rust-style were read. This reviewer made no product edits and ran no Cargo, formatter, metadata, build, native or backend command. Source-only Quire matrix/coverage/validation and Git inspection ran. Reported native checks are author evidence, not reviewer reruns.

## Verdict

PASS — No defects found within this method scope.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | low | No findings (placeholder) | - |

## Coverage

Base/checklist review is confined to the changed TC inventory and its actual source bindings, with FR091AC12–14 as owning contract. TC1841 is unique in the computed current scope; its described positive/negative assertions are implemented in the traced test. Existing TC rows retain their own original obligations and add only FR091AC13 linkage. No acceptance criterion, normative wording, relationship edge or requirement identity changed, and no handwritten computed matrix was introduced. Quire-generated matrix counts remain the authority. The retained baseline dependency revision and existing canonical identity/golden checks are required by the owning reviewed contract and dispatch, which override generic removal advice. No extra spec EARS/integrity/dependency/security sub-analysis is applicable to these inventory/tag-only edits; original PR295 reviews are preserved.

The implementation does not modify the specification's explicitly pending qualification claim. AC14 remains same-ticket future work and is reported by SR12010FND002, not silently called complete. No code source reads changed spec/tests.md as runtime data. No native rerun was undertaken. Final aggregate/qualification and current-head acceptance remain lead-owned.

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
