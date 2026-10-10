---
id: SR-195
title: "AGE-2232 SysML target traceability and coverage review"
type: SpecReview
analysis: gap-analysis
scope: "agent-ix/filament-core-data@56a86a93985be52a7102ee55c2391518a5235e64; PR 270, FR-138, FR-144-AC-21"
review_set: subset
---

## Current verdict

PASS for the scoped PR review at immutable head 56a86a93985be52a7102ee55c2391518a5235e64. All findings recorded below have a latest fixed disposition. Earlier summaries and verdicts are retained as historical review data. No new findings in disposition pass 3.

## Summary

Ticket: AGE-2232. Computed the repository-wide matrix and evaluated the implemented SysML requirement surface against changed code and tests. Plan completion: not assessed. The six test-method acceptance criteria of FR-138 and FR-144-AC-21 have concrete test binders, but one in-scope constraint remains untagged and the universal unmapped-node claims are backed only by a narrow example. See SR-194 for reproduced implementation defects.

## Verdict

CONDITIONAL for static traceability; overall PR remains FAIL because SR-194 identifies invalid output and silent semantic loss. Repository-wide strict matrix is not green and is not represented as a newly introduced failure.

## Findings

| ID | Severity | Summary | Refs | Escape Cause |
| --- | --- | --- | --- | --- |
| FND-001 | medium | FR-138-CON-1 requires deterministic emission independent of locale, time zone and working directory, but has no trace binder. The deterministic test repeats the same in-process call and covers AC-4 only. Add focused environment independence evidence and bind the constraint. | spec/functional/FR-138-emit-the-sysml-v2-textual-target.md:79; test/sysml-target.test.ts:174 | correct-requirement-no-evidence |
| FND-002 | medium | The tests tagged FR-138-AC-5/6 exercise only one unsupported sequence kind; supported records with unmapped semantic members, record references and reserved names remain untested and return success despite invalid or weakened output (SR-194 FND-001..003). Expand behavior coverage while fixing those findings. | test/sysml-target.test.ts:184; test/compiler-core.test.ts:6853 | correct-requirement-no-evidence |

## Coverage

`quoin matrix --repo . --json` wrote matrix.json in the review directory. `quire matrix --scope . --strict` exited 1, reporting 1555 untagged criteria and four criteria tagged only by ignored tests. Total statuses: tagged 217, untagged 1555, method-without-symbol 379, tagged-by-ignored-test 4. Matrix data contains no bound run evidence; the external gate logs are the run evidence examined by this reviewer, not claimed as Quoin bindings.

FR-138-AC-1 through AC-6 and FR-144-AC-21 are tagged. FR-138-AC-7 is an Analysis obligation (method-without-symbol) with three textual test binders. FR-138-CON-2/3 are Inspection obligations (method-without-symbol). FR-138-CON-1 is untagged. Broader repository backlog is reported as context, not routed wholesale into PR 270.

The production target, CLI/seam registration and diagnostics have FR-138/FR-144 ownership. No stub source or mocked target-under-test was found. The limited behavioral coverage and its demonstrated escapes are the scoped gap findings. No plan was supplied. Separate optional semantic-review workflow was not run; ordinary code-review spec faithfulness was performed in SR-194.

Tools resolved at /home/peter/.local/bin/quoin (0.28.3) and /home/peter/.local/bin/quire (0.36.2, engine 0.50.2). Matrix emitted duplicate installed archetype/inverse-edge warnings, recorded during execution, and completed; strict exit reflects actual untagged criteria. `quoin write . --types SpecReview --json` supplied the authoring skeleton/schema. No tracker or PR mutations were made.


## Disposition pass 1

Reviewed immutable head 72a7e762652c0b2eb3f5a984c3713dd5813dd77c. Current scoped gap verdict: FAIL because the required working-directory evidence remains absent despite the test's expanded name. Original findings remain immutable above. Plan completion: not assessed.

## Dispositions

| FND | outcome | sha/reason |
| --- | --- | --- |
| FND-001 | still-open | dc7f22cc adds a FR-138-CON-1 trace comment and changes LC_ALL/LANG/TZ, but the test at frozen 72a7 never changes working directory. The named invariant is only partly exercised. |
| FND-002 | fixed | dc7f22cc: an explicit refusal matrix now covers reserved package, sequence, union, record-valued field, reserved field, abstractness and identity fields, asserting unsupported state, no files and source-located blocking diagnostics. Remaining inherited-member and keyword defects are carried by SR-194. |
| FND-001 | fixed | 7d6f4d211dd9e47f767f42902d0e75cb6878546d: committed test invokes generation in subprocesses with different cwd; independent probes additionally change LC_ALL/LANG/TZ across the two processes and assert byte equality. Real target tests pass and the supplied cwd mutation receipt fails as expected. Trace extraction is separately tracked as FND-003. |
| FND-003 | still-open | New immutable matrix still emits test/sysml-target.test.ts: line 38: unresolvable declaration structure (column 1), dropping all binders from this file. FR-138-AC-1/2/4/6 and CON-1 remain untagged. |
| FND-003 | fixed | 56a86a93985be52a7102ee55c2391518a5235e64: Partial<Record<"abstract", boolean>> preserves optional abstract typing while allowing Quire to recover all target-module binders. |


## Disposition coverage

The immutable archive contains the new FR-138-CON-1 trace tag and broader refusal matrix. Static matrix was recomputed using quire matrix --scope <archived tree> --format json; matrix-exact.json records the result. A live-tree quoin matrix was also captured but is not used as immutable evidence because the coder resumed edits during review.

The full reserved-vocabulary prerequisite is pending: the provided probe tests 42 quoted names drawn from library examples, not all grammar keywords. Real pilot logs demonstrate the prior positive and negative controls and one package containing 247 scalar fields; they do not discharge full keyword coverage. No assurance profile, new reverse-gap ownership problem or stub was found. No full build/test suite was run during this review.


## New findings (disposition pass 1)

| ID | Severity | Summary | Refs | Escape Cause |
| --- | --- | --- | --- | --- |
| FND-003 | medium | Installed Quire fails to extract the changed SysML target test module at abstract?: boolean and drops all its trace binders. FR-138-AC-1/2/4/6 and CON-1 are untagged at this head; resolve the extraction incompatibility and recompute actual matrix evidence. | test/sysml-target.test.ts:38 | correct-requirement-no-evidence |

## Additional dispositions

| FND | outcome | sha/reason |
| --- | --- | --- |
| FND-003 | still-open | Exact immutable matrix emits unresolvable declaration structure and excludes the target-test binders. |

## Trace extraction incident

Resolved executable /home/peter/.local/bin/quire, version 0.36.2, engine 0.50.2. Command: quire matrix --scope /tmp/age-2232-review-72a7e762/snapshot --format json. Exit 0; stderr: test/sysml-target.test.ts: line 38: unresolvable declaration structure (column 1). Smallest observed triggering line is abstract?: boolean inside type TestType (full source preserved in snapshot). Expected declaration parsing and all trace binders; actual module extraction omits them. Exact totals: tagged 213, untagged 1559, method-without-symbol 379, tagged-by-ignored-test 4. FR-138-AC-1/2/4/6 and CON-1 are untagged, AC-3 has three pilot binders, AC-5 retains only the compiler-core binder, FR-144-AC-21 retains only that same compiler-core binder. Reported promptly to dispatching lead for the Quire owner; no fallback to an older tool.


## Full lexer vocabulary evidence

The subsequent completed lexer probe reads InternalSysMLLexer.class from the freshly extracted pinned JAR and extracts alphabetic literal tokens from its mT__ lexer methods. It runs one JVM over 129 quoted/unquoted word pairs. Result: 129 quoted accepted, 129 unquoted refused, zero unquoted accepted, zero quoted refused, zero silent cases. This supersedes the incomplete library-example probe for vocabulary completeness. Evidence is preserved as lexer-keyword-probe.log and lexer-keyword-probe.py in this review directory. It confirms the frozen backend's 34-entry refusal set is incomplete. The requested vocabulary evidence hold is satisfied; current exact-head verdict remains FAIL.


## Tracker disposition publication

Posted round 1 dispositions to AGE-2232; has-review label newly added. Exact comment-body and YAML read-back passed; all finding ids and fixed after-excerpts present. Comment ids are recorded in tracker-validation.json alongside this artifact.


## Disposition pass 2

Exact frozen head 7d6f4d211dd9e47f767f42902d0e75cb6878546d. Current verdict: FAIL. Plan completion: not assessed.


## Round 2 evidence

Matrix command: quire matrix --scope /tmp/age-2232-review-7d6f4d21/snapshot --format json. Resolved /home/peter/.local/bin/quire 0.36.2, engine 0.50.2. Exit 0 with the same declaration diagnostic; matrix.json and matrix.stderr preserve exact evidence. This repeats the previously reported extraction incident, not a new failure or a successful traceability repair. Source line remains abstract?: boolean inside TestType. The runtime evidence is real (11 committed target tests and five independent probes pass), but cannot be claimed as static binders when the engine omits them.

The full lexer receipt is now the actual InternalSysMLLexer.class from the pinned downloaded JAR: 129 quoted accepted and 129 unquoted refused. No vocabulary completeness issue remains. No new requirements or plans changed. Broad refusal coverage stays fixed; code-review records the new numeric-matrix assertion regression separately as SR-194 FND-007.


## Disposition pass 3

Reviewed immutable head 56a86a93985be52a7102ee55c2391518a5235e64. Current code-review and scoped gap-analysis verdicts: PASS. No findings remain open. Delta since last posted round: 682e09cc quotes the numeric matrix expected field and adds its FR-138-AC-2 trace; 56a86a93 replaces the optional abstract type property with a semantics-equivalent Partial<Record<"abstract", boolean>> intersection. The implementation is unchanged from the previously tested quoted-name/refusal backend.

Independent exact-head tests were run against a fresh git archive, using only existing dependencies and no build lock. The 11 committed SysML target tests passed (target-tests.log). Eight independent tests passed (probes.log), including all prior inheritance/collision/keyword cases, all 129 lexer words through package/type/field emission, cwd/locale/timezone independence, and all 247 cells through the actual extracted SysML numeric-matrix function. Its original function body is transformed in memory only to execute TypeScript; its assertions and mapping/loss logic are unchanged. This is the SysML matrix column, not a rerun of build-heavy Rust/Python/TypeScript consumers.

The independent abstract source-flow test parses the config-version fixture JSON, sets abstract=true, round-trips through JSON, validates the schema, runs readContractIr with zero diagnostics, asserts abstract=true remains on the record, and invokes the generation seam. It verifies unsupported state, no file, and a blocking source-located abstract refusal. The supplied earlier receipt /home/peter/dev/worktrees/logs/age-2232-abstract-source-flow-7d6f4d21.log matches this fresh result; the new test is under this review's probes.mjs and was actually executed.

Quire matrix was recomputed from the exact archived tree: FR-138-AC-1/2/3/4/5/6 and CON-1 are tagged; FR-144-AC-21 is tagged. FR-138-AC-7 and CON-2/3 are analysis/inspection obligations, reported method-without-symbol as expected. Zero target untagged criteria and zero target ignored-only criteria. No unresolvable-declaration diagnostic remains. FR-138-AC-2 has four binders, including the restored deterministic one-package test; its evidence no longer depends on the numeric trace tag alone. Repository-wide counts remain 1554 untagged, 379 method-without-symbol, 218 tagged, four tagged-by-ignored-test; these inherited out-of-scope counts are not represented as a repository-wide PASS. Coder receipt /tmp/age2232-gap-analysis-final.txt agrees on scoped target status.

Pilot vocabulary provenance remains the real pinned archive /home/peter/dev/.cache/age-2232-sysml-pilot/jupyter-sysml-kernel-0.49.0.zip, entry sysml/jupyter-sysml-kernel-0.49.0-all.jar, class org/omg/sysml/xtext/parser/antlr/internal/InternalSysMLLexer.class. Receipt /home/peter/dev/worktrees/logs/age-2232-reserved-grid-full.log records 129 quoted accepted / 129 unquoted refused / zero silent cases. The pilot/backend did not change in the final two commits; the real pilot receipt and independently repeated emission tests are applicable. This review does not claim a fresh complete canonical gate or fresh pilot JVM run at 56a86a93.

The baseline differential remains the previously verified b745 versus c620d6be shared-target evidence, with six inherited failing Make targets. No full gate was run by this reviewer. Review methods were code-review and gap-analysis; Rust/spec-review applicability was checked and those methods skipped because no corresponding source/spec/plan changes occurred. Plan completion: not assessed. No code edits, builds, pushes, merges or build locks were performed.


## Round 3 tracker read-back

Comment f64de193-d55f-48de-92fb-069aa2551ce0 posted to AGE-2232. Exact-body read-back and YAML/id/fix-excerpt checks passed. has-review was already present.
