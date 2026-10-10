---
id: SR-194
title: "AGE-2232 immutable-head SysML target code review"
type: SpecReview
analysis: code-review
scope: "agent-ix/filament-core-data@56a86a93985be52a7102ee55c2391518a5235e64; PR 270 changed files"
review_set: subset
---

## Current verdict

PASS for the scoped PR review at immutable head 56a86a93985be52a7102ee55c2391518a5235e64. All findings recorded below have a latest fixed disposition. Earlier summaries and verdicts are retained as historical review data. No new findings in disposition pass 3.

## Summary

Ticket: AGE-2232. Reviewed all 25 changed paths against clean main c620d6be99654a7a77f0ecc2f97d3c7136402651. The target registers through the seam, implements numeric loss diagnostics, and passes its two authored pilot fixtures. Accepted inputs outside those fixtures expose invalid output and silent semantic loss. Route every finding below to the coder for PR 270; no code, PR, branch, or tracker was modified by this reviewer.

## Verdict

FAIL at immutable head b745e6f78a8ff2903a65121370855847194c6a47. Findings require fixes inside the owning PR before another exact-head review.

## Findings

| ID | Severity | Summary | Refs | Escape Cause |
| --- | --- | --- | --- | --- |
| FND-001 | high | Record-valued fields are emitted as attributes typed by item definitions, which the pinned pilot rejects. Emit a valid item usage or refuse the field with a source-located diagnostic. | src/compiler/backends/sysml-v2/index.mjs:94; src/compiler/backends/sysml-v2/index.mjs:125 | implementation-bug-despite-evidence |
| FND-002 | high | The identifier check permits reserved SysML keywords. An accepted field named package emits invalid syntax with success and zero diagnostics. Quote names according to SysML syntax or reject reserved names with a source locus. | src/compiler/backends/sysml-v2/index.mjs:35 | implementation-bug-despite-evidence |
| FND-003 | high | Accepted abstract record semantics are silently discarded: abstract=true generates the identical concrete item definition as the unmodified document, with no loss/refusal diagnostic. Map or reject unsupported semantic members comprehensively, including abstractness and supertypes. | src/compiler/backends/sysml-v2/index.mjs:141; src/compiler/backends/sysml-v2/index.mjs:127 | implementation-bug-despite-evidence |
| FND-004 | medium | Emitted element declarations contain only display names and omit the semantic identities required by FR-138's emitted-set contract. The manifest lists record identities but the SysML elements have no declared short names carrying their identities; field identities disappear entirely. | src/compiler/backends/sysml-v2/index.mjs:125; src/compiler/backends/sysml-v2/index.mjs:127; spec/functional/FR-138-emit-the-sysml-v2-textual-target.md:72 | correct-requirement-no-evidence |
| FND-005 | medium | The pilot's pin checks authenticate cached archives but execution uses separately extracted JAR/library/Java paths checked only for existence. Changing an extracted component leaves both checksums passing and executes an unpinned validator. Extract verified archives to controlled scratch or verify the actual executed components against them. | scripts/check-sysml-pilot.py:48; scripts/check-sysml-pilot.py:59; scripts/check-sysml-pilot.py:68 | implementation-bug-despite-evidence |

## Evidence

Reproduction directory: /tmp/age-2232-review-b745e6f7. `probe.mjs` mutates the committed domain fixture and sends each document through schema validation and the actual `generate` CLI. `probe.log` records schemaErrors=[], CLI exit 0, state success and diagnostics=[] for keyword, nested, abstract and original identity cases. Generated `.sysml` and JSON inputs are preserved in that directory.

FND-001: `nested/model.sysml` contains `attribute key : Child;` and `item def Child`. Running the PR's Python pilot checker using its existing `.venv/bin/python` and external SYSML_PILOT_CACHE returned nonzero. `nested-pilot.log`: `An attribute must be typed by attribute definitions` and `Features must have at least one type`.

FND-002: `keyword/model.sysml` contains `attribute package : ScalarValues::String;`. The same pinned pilot returned nonzero; `keyword-pilot.log`: `no viable alternative at input 'package'`.

FND-003: `abstract.json` is schema-valid and accepted by the seam with abstract=true. Its emitted text is byte-identical to `identities/model.sysml`, with concrete `item def ConfigRevision` and no diagnostics. This is an implementation loss; no claim is made that the pilot rejects syntactically valid but semantically weakened output.

FND-004 follows directly from the emitted file and required semantic-identity row of FR-138. FND-005 is an inspected control-flow defect; no external cache was tampered with to demonstrate it.

## Gate and differential

Read /tmp/AGE-2232-final-locked-gate.log and the PR's comment 6097546808. Final locked invocation records head=b745e6f78a8ff2903a65121370855847194c6a47 exit=2. Compared /tmp/AGE-2232-baseline-ci.log, ending head=c620d6be99654a7a77f0ecc2f97d3c7136402651 exit=2. Their common test-all failing Make targets are identical: test-node, rust-check, rust-test, extraction-frontend-test, spec-to-targets, test-python. The eight pytest failure identifiers match, with 505 passed in each. These failures predate this PR; the new findings above are independent of that differential.

The final head reports 698 passed and one failed Node test, the existing Python seam Pydantic coercion failure; baseline reports 688 passed and two failed including a five-second timeout. The PR's final 30-second limits in exact-numeric-traces (two probes) and semantic-kernel (one probe) preserve assertions; no remaining timeout appears in the final log. The outer invocations differ, so this is a shared-target differential rather than identical complete commands.

Final log evidence: six SysML target tests and two pilot tests passed; pilot accepted kernel-0.sysml and config-domain-0.sysml; numeric matrix executed 247 cells and 2048 seeded differential fuzz cases with zero disagreements. Numeric code maps integer to Integer and decimal/float32/float64 to Real, issuing one nonblocking loss per mapped Real field with decimal precision/scale or float width. The matrix's SysML projection checks scalar mapping/loss for each cell; it does not validate arbitrary input semantics or exercise every cell through the pilot.

Lint, typecheck and format-check pass in the final locked log. No full gate was rerun during review because the immutable-head recorded gate and focused reproductions resolve the remaining risks.

## Coverage

Methods: code-review with JavaScript/TypeScript and Python gate logic; quoin gap-analysis in separate SR-195. Rust applicability assessed: no .rs, Cargo.toml or Cargo.lock changes, so no new Rust code to review; existing Rust failures inspected in differential. Spec-review applicability assessed: no spec/ or plan/ changes, so no base or sub-analysis artifacts required. No applicable AssuranceProfile was found. No vendored upstream implementation added; validator distributions remain outside the repo. No frontend/React lane applies.

Quoin 0.28.3 and Quire 0.36.2 (engine 0.50.2) were used. Tracker comments were not posted; findings are delivered through the reviewer harness to the dispatching lead for routing. No has-review label was changed and no comment read-back applies.


## Disposition pass 1

Reviewed immutable head 72a7e762652c0b2eb3f5a984c3713dd5813dd77c against b745e6f78a8ff2903a65121370855847194c6a47. Current verdict: FAIL. Original findings and verdict above remain unchanged as historical review data. Four paths changed: backend, pilot checker, target tests and pilot tests. No Rust or spec/plan changes; those review lanes remain inapplicable. No builds, pushes, code edits or merges were performed.

The shared worktree began changing during review. All final source judgments use the immutable git archive in this review directory's snapshot/. The initial seam probes were repeated directly against archived backend source in exact-head-probes.log. Subsequent live edits are not credited to this head.

## Dispositions

| FND | outcome | sha/reason |
| --- | --- | --- |
| FND-001 | fixed | 502ad8c8: record-valued fields now call unsupported and return null; a blocking diagnostic prevents any file emission. |
| FND-002 | still-open | The 34-entry reserved-name set omits pilot-rejected words including accept, after, allocation, entry, rendering, requirement and when. Exact-head package identity agent-ix/accept emits package accept with success and zero diagnostics. |
| FND-003 | still-open | abstract=true is refused, but supertypes is still silently discarded: the new guard reads nonexistent abstractSupertypes, whereas the schema defines supertypes. Exact-head accepted input emits unrelated item definitions without an inheritance diagnostic. |
| FND-004 | fixed | 3c2db684: element names derive from semantic identities and emitted record/field documentation carries the full identity. Naming collisions introduced by this approach are tracked separately as FND-006. |
| FND-005 | fixed | c73603f9 plus 43aa8294: each invocation extracts verified archives to fresh execution scratch and launches the discovered Java/JAR/library from that scratch, deleting it afterward. |
| FND-006 | still-open | New naming regression described below requires collision-safe emission or source-located refusal. |
| FND-002 | fixed | 7d6f4d211dd9e47f767f42902d0e75cb6878546d: removed finite reserved-word refusal set; emitted user-defined package, record, field, enum, variant and alias names use single-quoted SysML unrestricted names. Existing library ScalarValues names remain qualified references. All 129 real lexer words pass generation in package/type/field positions. |
| FND-003 | fixed | 7d6f4d211dd9e47f767f42902d0e75cb6878546d: guard checks actual supertypes field; schema-valid inheritance probe now refuses with blocking source locus and no emitted file. |
| FND-006 | fixed | 7d6f4d211dd9e47f767f42902d0e75cb6878546d: checkIdentityTailCollisions checks type, field and enum-variant scopes. Prior schema-valid namespace-tail collision now returns two blocking source-located diagnostics and no file; committed normalization-collision test also passes. |
| FND-007 | still-open | New numeric matrix assertion regression described below. |
| FND-007 | fixed | 682e09cc8848279bf8107b46baaa8fa6bbf2e68d: Matrix probe now expects the exact quoted field name; all 247 original cell probes pass. |


## New findings (disposition pass 1)

| ID | Severity | Summary | Refs | Escape Cause |
| --- | --- | --- | --- | --- |
| FND-006 | high | Deriving names from only the sanitized final identity segment conflates distinct semantic identities. Two valid record identities ending ConfigRevision, with distinct display names, emit duplicate item def ConfigRevision declarations with success and zero diagnostics. Use collision-safe naming or block collisions with source loci; cover both namespace-tail and punctuation-normalization collisions. | src/compiler/backends/sysml-v2/index.mjs:86; src/compiler/backends/sysml-v2/index.mjs:94 | implementation-bug-despite-evidence |

## Disposition evidence

- probes.log: actual generation seam accepted schema-valid inheritance and duplicate-name examples with success and no diagnostics. exact-head-probes.log repeats inheritance, name collision and omitted keyword examples against immutable archived source.
- age-2232-pilot-controls-72a7.log: three pilot tests pass; head 72a7 stamped exit 0. Positive kernel/domain packages and parser/semantic negative controls are covered.
- age-2232-reserved-quoted.log / age-2232-reserved-unquoted.log: quoted package/item/field keywords accepted; unquoted keyword examples refused with parser diagnostics. Each log is stamped 72a7.
- age-2232-grid-generation.log / age-2232-grid-pilot.log: one package containing 247 scalar projection fields emitted, 63 nonblocking losses, zero blocking diagnostics, then accepted by the pilot. This is 247 scalar projections in one package, not 247 complete numeric constraint classes: /tmp/age2232-grid-probe.mjs uses cell.kind but omits each cell's constraints/defaults.
- library-name-probe.log: snapshot of the updated 42-candidate probe; 42 quoted accepted, 20 unquoted refused, 22 unquoted accepted, zero silent results. /tmp/age2232-reserved-grid.py obtains quoted identifiers from library *.sysml examples. This is not extraction of the grammar's complete reserved-word vocabulary; ordinary names SamplePair, T, foot and mile occur in its candidate set. Its omissions do not weaken the demonstrated FND-002 failures.

Evidence from the b745 full gate is not claimed to validate 72a7. The current disposition relies on source inspection, provided stamped pilot logs and bounded pure emission reproductions. Every open finding belongs inside PR 270.


## Full lexer vocabulary evidence

The subsequent completed lexer probe reads InternalSysMLLexer.class from the freshly extracted pinned JAR and extracts alphabetic literal tokens from its mT__ lexer methods. It runs one JVM over 129 quoted/unquoted word pairs. Result: 129 quoted accepted, 129 unquoted refused, zero unquoted accepted, zero quoted refused, zero silent cases. This supersedes the incomplete library-example probe for vocabulary completeness. Evidence is preserved as lexer-keyword-probe.log and lexer-keyword-probe.py in this review directory. It confirms the frozen backend's 34-entry refusal set is incomplete. The requested vocabulary evidence hold is satisfied; current exact-head verdict remains FAIL.


## Tracker disposition publication

Posted round 1 dispositions to AGE-2232; has-review label newly added. Exact comment-body and YAML read-back passed; all finding ids and fixed after-excerpts present. Comment ids are recorded in tracker-validation.json alongside this artifact.


## Disposition pass 2

Exact frozen head: 7d6f4d211dd9e47f767f42902d0e75cb6878546d. Current verdict: FAIL. Full delta from 72a7 touches backend and target tests only. Reviewed the archived new source independently; the prior archive was used solely as comparison. No code edits, builds, build lock, pushes, or merges were performed. JavaScript/TypeScript code-review and gap-analysis apply; no Rust or spec/plan file delta exists.


## New findings (disposition pass 2)

| ID | Severity | Summary | Refs | Escape Cause |
| --- | --- | --- | --- | --- |
| FND-007 | medium | Quoted-name emission invalidates the existing numeric matrix probe, which still asserts the exact unquoted substring attribute value : ScalarValues::Integer;. Every generated numeric cell invokes this probe, so the canonical matrix test fails before completing. Update the assertion to expect the quoted emitted field while preserving mapping and loss checks. | test/numeric-backend-matrix.test.ts:125; src/compiler/backends/sysml-v2/index.mjs:42 | implementation-bug-despite-evidence |

## Round 2 evidence

Independent real tests in probes.mjs / probes.log: five pass and one fails. Passing tests cover the prior schema-valid generation-seam probes (supertypes, identity-tail collision, omitted out keyword), all 129 lexer names in package/type/field positions, and subprocess equality across different cwd plus LC_ALL/LANG/TZ environments. The sixth test reproduces the exact stale numeric-matrix substring assertion and fails. No full numeric matrix was run because it invokes build-heavy consumers; this is explicitly the isolated failing assertion, not a claimed full-gate execution.

Committed test/sysml-target.test.ts was independently run from the new immutable archive using node node_modules/vitest/vitest.mjs run test/sysml-target.test.ts: 11/11 passed, target-tests.log. Initial pnpm exec launch from scratch failed with unable to open database file; directly invoking the already-installed Vitest executable completed successfully and required no installation/build.

Provided evidence inspected: /home/peter/dev/worktrees/logs/age-2232-focused-pilot-7d6f4d21.log reports 14/14 target and real pilot tests pass; age-2232-cwd-mutation-7d6f4d21.log fails the cwd test under a deliberate cwd-emission mutation and records restoration to 7d6f4d21; age-2232-supertypes-collision-grid-7d6f4d21.log reports empty/one/several/abstract-supertype and identity-collision outcomes. These claims agree with the independent probes.

The real vocabulary source is /home/peter/dev/.cache/age-2232-sysml-pilot/jupyter-sysml-kernel-0.49.0.zip, archive member sysml/jupyter-sysml-kernel-0.49.0-all.jar, class org/omg/sysml/xtext/parser/antlr/internal/InternalSysMLLexer.class, alphabetic literals extracted from mT__ lexer method bytecode. The script verifies pinned archives before extraction. Receipt /home/peter/dev/worktrees/logs/age-2232-reserved-grid-full.log records 129 quoted accepted, 129 unquoted refused, zero silent/unexpected outcomes, and trailer head=7d6f4d21; source=downloaded InternalSysMLLexer.class; extraction=one fresh archive session. Preserved reviewer copies: lexer-keyword-receipt.log and lexer-keyword-probe.py. This supersedes library-example sampling.

All previously fixed findings remain fixed by inspection. Numeric loss diagnostics and blocking refusal behavior are preserved. FND-007 must be fixed inside PR 270; SR-195 additionally retains the trace extraction blocker.


## Disposition pass 3

Reviewed immutable head 56a86a93985be52a7102ee55c2391518a5235e64. Current code-review and scoped gap-analysis verdicts: PASS. No findings remain open. Delta since last posted round: 682e09cc quotes the numeric matrix expected field and adds its FR-138-AC-2 trace; 56a86a93 replaces the optional abstract type property with a semantics-equivalent Partial<Record<"abstract", boolean>> intersection. The implementation is unchanged from the previously tested quoted-name/refusal backend.

Independent exact-head tests were run against a fresh git archive, using only existing dependencies and no build lock. The 11 committed SysML target tests passed (target-tests.log). Eight independent tests passed (probes.log), including all prior inheritance/collision/keyword cases, all 129 lexer words through package/type/field emission, cwd/locale/timezone independence, and all 247 cells through the actual extracted SysML numeric-matrix function. Its original function body is transformed in memory only to execute TypeScript; its assertions and mapping/loss logic are unchanged. This is the SysML matrix column, not a rerun of build-heavy Rust/Python/TypeScript consumers.

The independent abstract source-flow test parses the config-version fixture JSON, sets abstract=true, round-trips through JSON, validates the schema, runs readContractIr with zero diagnostics, asserts abstract=true remains on the record, and invokes the generation seam. It verifies unsupported state, no file, and a blocking source-located abstract refusal. The supplied earlier receipt /home/peter/dev/worktrees/logs/age-2232-abstract-source-flow-7d6f4d21.log matches this fresh result; the new test is under this review's probes.mjs and was actually executed.

Quire matrix was recomputed from the exact archived tree: FR-138-AC-1/2/3/4/5/6 and CON-1 are tagged; FR-144-AC-21 is tagged. FR-138-AC-7 and CON-2/3 are analysis/inspection obligations, reported method-without-symbol as expected. Zero target untagged criteria and zero target ignored-only criteria. No unresolvable-declaration diagnostic remains. FR-138-AC-2 has four binders, including the restored deterministic one-package test; its evidence no longer depends on the numeric trace tag alone. Repository-wide counts remain 1554 untagged, 379 method-without-symbol, 218 tagged, four tagged-by-ignored-test; these inherited out-of-scope counts are not represented as a repository-wide PASS. Coder receipt /tmp/age2232-gap-analysis-final.txt agrees on scoped target status.

Pilot vocabulary provenance remains the real pinned archive /home/peter/dev/.cache/age-2232-sysml-pilot/jupyter-sysml-kernel-0.49.0.zip, entry sysml/jupyter-sysml-kernel-0.49.0-all.jar, class org/omg/sysml/xtext/parser/antlr/internal/InternalSysMLLexer.class. Receipt /home/peter/dev/worktrees/logs/age-2232-reserved-grid-full.log records 129 quoted accepted / 129 unquoted refused / zero silent cases. The pilot/backend did not change in the final two commits; the real pilot receipt and independently repeated emission tests are applicable. This review does not claim a fresh complete canonical gate or fresh pilot JVM run at 56a86a93.

The baseline differential remains the previously verified b745 versus c620d6be shared-target evidence, with six inherited failing Make targets. No full gate was run by this reviewer. Review methods were code-review and gap-analysis; Rust/spec-review applicability was checked and those methods skipped because no corresponding source/spec/plan changes occurred. Plan completion: not assessed. No code edits, builds, pushes, merges or build locks were performed.


## Round 3 tracker read-back

Comment b69e8a31-302a-43ed-badb-7b4467867f78 posted to AGE-2232. Exact-body read-back and YAML/id/fix-excerpt checks passed. has-review was already present.
