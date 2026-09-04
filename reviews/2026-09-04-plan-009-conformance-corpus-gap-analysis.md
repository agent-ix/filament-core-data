---
id: SR-076
title: "Gap analysis — Plan-007 conformance corpus and oracle"
type: SpecReview
analysis: gap-analysis
scope: "plan/Plan-007-conformance-corpus-and-oracle/, spec/usecase/US-008-judge-a-compiler-against-an-independent-conformance-corpus.md, spec/functional/FR-035..FR-039, spec/non-functional/NFR-015-blessing-free-conformance-evidence.md, spec/non-functional/NFR-016-isolated-conformance-corpus.md, spec/tests.md (TC-280..319 and TC-622..419), conformance/, test/conformance-corpus.test.ts, tests/test_conformance_corpus.py, Makefile"
review_set: subset
relationships:
  - target: "ix://agent-ix/filament-core-data/Plan-007"
    type: reviews
  - target: "ix://agent-ix/filament-core-data/TM-001"
    type: references
---
# Gap analysis — Plan-007 conformance corpus and oracle

## Summary

Plan-007 (issue #20, branch `spec/20-conformance-corpus-and-oracle`, committed
at `3f88137`) landed a substantial and largely honest corpus: 4 base bundles,
111 cases across 22 construct-register families, a 2,828-line oracle and
harness that import nothing they judge, ten recorded contract gaps, sixteen
recorded prototype defects, and two suites — 92 vitest cases and 127 pytest
cases — that both pass on this host. `quire coverage` binds all 62 issue #20
Test Matrix rows through the engine's `typescript-test-name-id` form, so no
TC-280..319 and TC-622..419 row is unbacked. The provenance is real: 122 of 122 `derivedFrom`
quotes cite `docs/semantic-data-system/contracts-v1.md` or a published schema,
never this ticket's own spec, and the corpus gate re-checks every quote against
the artifact on every run.

Two things stop it being complete. First, the plan bundle records none of it:
all nine tasks are `status: pending`, every subtask box is unchecked, the Task
File Mapping reads `pending` in all nine rows, and `log.md` carries only the
plan-creation entry (FND-864). Second, a band of test cases assert nothing that
can fail. TC-288, TC-632, TC-639 and TC-640 are tautologies; TC-282, TC-284,
TC-318, TC-626 and TC-628 are tautologies in their negative half; and TC-305
sets up its negative case, `void`s it, and asserts the positive instead. The
consequence is not only bookkeeping: the corpus has no versioning gate and no
changed-path gate at all (FND-866, FND-867), and PRES-010 — the case that is
supposed to make prototype defect DEF-PROTO-004 permanent — expects a
presence/multiplicity diagnostic that has nothing to do with the nullability
substring bug it names, which TC-318's vacuous assertion cannot see (FND-865).

On intent: yes, this corpus could fail issue #19, and it has already produced
evidence against the only implementation that exists. Every expectation is read
from the merged contract, `corpusGates()` re-derives rather than restates,
negative cases must yield exactly one diagnostic, the seeded-stub tests
(TC-303, TC-304) prove the harness detects extra, missing, repointed,
relocated and reclassified answers, and the ten `contract-gaps.json` rows are
disagreements with the published contract that the corpus records instead of
absorbing. What it does not yet do is judge anything: with all four slots
`unavailable` (declared, not a finding here) no adapter process is ever
spawned, so `runAdapter`'s `execFileSync` path, the non-zero-exit branch and
the `unsupportedBy` accept branch are dead in both suites (FND-872).

Finding ids run FND-864..FND-409 as requested; the highest id in use elsewhere
in `reviews/` and `spec/reviews/` is FND-837, so the ranges do not collide.

## Verdict

**FAIL** — eight of the nine tasks are `pending` with the implementation
committed (FND-864), and four findings are `high`: a reproducing case that does
not reproduce its defect (FND-865), an absent changed-path and manifest-diff
gate whose three matrix rows cannot fail (FND-866), and an absent corpus
versioning gate leaving FR-035-AC-8 and NFR-015-AC-5 undischarged (FND-867).
No matrix row is unbacked and both suites are green; the failure is that
several rows are backed by assertions that hold for any input.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-864 | high | Every task in the bundle is `status: pending` with every subtask box unchecked, the `plan.md` Task File Mapping reads `pending` in all nine rows, the Requirements Summary and Test Plan boxes are unchecked, and `log.md` records only the 2026-09-03 plan-creation entry — while `3f88137` commits the whole implementation and both suites pass. Task-056 is the gate this document belongs to and is excluded; Task-048..055 are eight tasks whose work is demonstrably done and whose status says otherwise, so the bundle cannot be read as a record of what happened. | Plan-007 plan.md (Task File Mapping, Requirements Summary, Test Plan), tasks/Task-048..055, log.md, commit 3f88137 |
| FND-865 | high | `PRES-010` is the reproducing case `defects.json` DEF-PROTO-004 names ("Nullability is decided by a substring of a rendered type name", `nullable: fieldType.includes("null")`), but it does not discriminate that defect. It retypes a field to a scalar named `Nullifier` — `"Nullifier".includes("null")` is `false`, the substring check is case-sensitive — and then flips `presence` `optional`→`required` so the expected diagnostic is `PRESENCE_MULTIPLICITY_MISMATCH`, a cross-field presence rule unrelated to nullability. An implementation carrying DEF-PROTO-004 verbatim emits the same presence diagnostic and passes the case. The sibling defect cases are sound by contrast: REC-006 and UNK-005 are `success` traps that a substring-deciding reader would wrongly reject, and IDENT-002 pins the last-wins duplicate. FR-038-AC-5's "a reproducing case that fails on a bundle carrying the defect" and US-008-EX-5 are therefore not met for DEF-PROTO-004. | conformance/cases/field-presence/PRES-010.json, conformance/defects.json::DEF-PROTO-004, FR-038-AC-5, US-008-EX-5, TC-318 |
| FND-866 | high | No changed-path gate and no manifest-diff gate exist, and the three matrix rows that stand for them cannot fail. TC-640 walks `conformance/` and asserts each file found there `startsWith(CONF)`, then `statSync`s the two suite files — it never diffs the branch against `main`, so NFR-016-AC-1's prohibited set is unchecked. TC-641 asserts only `pkg.dependencies === undefined` and never opens `pyproject.toml`, so NFR-016-AC-2's "byte-identical to `main`" (also FR-039-AC-8) is unchecked. TC-643 greps `conformance/**/*.mjs` for `npm publish|pnpm publish|poetry publish` and never looks at a consumer, catalog pin, or Avro contract, so NFR-016-AC-4 is unchecked. Task-048's "changed-path gate" and "manifest-diff gate" subtasks have no code. Verified by hand for this review: the diff against `main` is clean — 179 files, nothing under the prohibited roots, neither lockfile, `package.json` and `pyproject.toml` byte-identical — so the property holds today with nothing gating it. | test/conformance-corpus.test.ts:1529, :1546, :1551, Task-048 (subtasks 4–5), NFR-016-AC-1, NFR-016-AC-2, NFR-016-AC-4, FR-039-AC-8, TC-640, TC-641, TC-643 |
| FND-867 | high | The corpus has no versioning gate. FR-035-AC-8 requires that "changing an existing `expected` block without a major `corpusVersion` bump fails the versioning gate" and that "deleting a case that a `defect` register row names fails the gate"; NFR-015-AC-5 requires that a `corpus-defect` verdict is the only route by which an expected result changes. `corpusGates()` has 23 failure paths and none of them compares an `expected` block or a `corpusVersion` against any prior state; `grep corpusVersion` over `conformance/**/*.mjs` finds only the manifest accessor, the `loadCase` error string and two report fields. TC-287 asserts the forward direction only (every `reproducingCase` a defect names is in the manifest) and never deletes one; TC-639 asserts that `conformance/README.md` contains the string "the only version a consumer pins" and that `typeof pkg.version === "string"`. Both acceptance criteria are undischarged and the corpus's headline anti-regeneration property is unenforced. | conformance/corpus.mjs::corpusGates, FR-035-AC-8, NFR-015-AC-5, TC-287, TC-639, test/conformance-corpus.test.ts:250, :1520 |
| FND-868 | medium | TC-288 asserts nothing. Its first check is `expect(validatePublished("common.schema.json", diagnostic).length).toBeGreaterThanOrEqual(0)` — an ajv error count is never negative, and the id it validates against is the schema root, not `#/$defs/diagnostic`, so a passing diagnostic and a garbage one both satisfy it. Its second check is `expect(parent === "" || JSON.stringify(bundle).length > 0).toBe(true)` — true for every non-empty bundle regardless of whether the pointer resolves. FR-035-AC-9 is in fact discharged, but elsewhere: `corpus-case.schema.json` `$ref`s `common.schema.json#/$defs/diagnostic` so TC-280 validates every expected diagnostic, and `corpusGates()` resolves each expected pointer's parent in the built bundle. The row's own binding is fiction. | test/conformance-corpus.test.ts:263–289, conformance/schema/corpus-case.schema.json:100, conformance/corpus.mjs (pointer gate), FR-035-AC-9, TC-288 |
| FND-869 | medium | TC-632 cannot fail. It asserts the registry ids and threshold ids are equal, then computes `missing = registryIds.filter(id => !thresholdIds.slice(1).includes(id))` and asserts `missing.length > 0` — a restatement of the equality it just asserted, with the first row dropped. It never constructs a registry/threshold mismatch and never calls the gate. The real gate is implemented (`run()` pushes a `threshold` problem in both directions) and is simply never exercised, so FR-039-AC-7 rests on unrun code. | test/conformance-corpus.test.ts:1383–1395, conformance/runner/differential.mjs:118–135, FR-039-AC-7, TC-632 |
| FND-870 | medium | TC-305's second half is abandoned in place. The test builds `patched` and `original`, discards both with `void patched; void original;`, and carries the comment "the harness rule is exercised through the `available` branch below" — there is no branch below. It then asserts `report.problems` is empty, i.e. the opposite of the row it is named for. FR-037-AC-4's "an `available` adapter returning `unavailable` fails" is implemented in the harness (`kind: "unavailable"`, "an available adapter answered unavailable") and untested; the first half of the row is real. | test/conformance-corpus.test.ts:773–798, conformance/runner/differential.mjs:210–219, FR-037-AC-4, TC-305 |
| FND-871 | medium | TC-318's second test is vacuous, which is why FND-865 was invisible. It asserts `expect(["success","invalid"]).toContain(verdict.resultState)` — the oracle returns only `success`, `invalid`, and `lossy` by FR-036 and `contract-gaps.json` GAP-006, so this passes for every defect case, including one whose expectation is unrelated to the defect — and `expect(entry.provenance.reproduces ?? defect.id).toBeDefined()`, where the `??` fallback makes the assertion unconditional. Nothing checks that the case fails *for the defect's reason*. | test/conformance-corpus.test.ts:1154–1172, FR-038-AC-5, TC-318 |
| FND-872 | medium | No adapter process is ever started. All four registry slots are command-less, so `runAdapter` returns synthesized `unavailable` answers and its `execFileSync` path is never reached in either suite; every harness test injects `adapterResults` directly. Three consequences: FR-037-AC-7's "an adapter command that exits non-zero" branch is dead (only the schema-failure and missing-answer halves are tested); FR-037-AC-8's accept branch is dead because no case declares `unsupportedBy` (`grep -rl unsupportedBy conformance/cases` is empty), leaving only the undeclared-fails half; and TC-310 verifies the process boundary by asserting the runner source *contains the literal string* `execFileSync(adapter.command[0]`. The slots being `unavailable` is declared and expected; that the process seam has never executed is worth recording before an owning issue supplies a command. | conformance/runner/differential.mjs:40–91, conformance/adapters/registry.json, test/conformance-corpus.test.ts:913, FR-037-AC-7, FR-037-AC-8, TC-308, TC-309, TC-310 |
| FND-873 | medium | TC-628's second half suppresses nothing. FR-039-AC-3 requires "suppressing one detecting case drops the score and fails the gate"; the test instead asserts that the first catalogued mutation's detecting case emits its code, and that `corpus.loadCase("MUT-ABSENT-000")` throws. `mutationScore()` is never called with a reduced case set, so the score's sensitivity — the whole point of a mutation catalogue — is unmeasured. The forward half (`undetected` empty, score 1) is real. | test/conformance-corpus.test.ts:1312–1327, FR-039-AC-3, TC-628 |
| FND-874 | medium | TC-626's second half does not demonstrate a stale-coverage gate. FR-039-AC-1 requires "adding a case without regenerating fails the gate"; the test asserts `report.coverage.totalCases === manifest.cases.length`, then calls `buildCoverage` with the first case removed and asserts some register row now reports a missing class. Nothing compares a regenerated account against the committed bytes after a case is added, and no gate is invoked. The byte-identity half (TC-626 first test, `renderCoverage(run().coverage) === coverage.json`) is real and strong. | test/conformance-corpus.test.ts:1268–1275, FR-039-AC-1, TC-626 |
| FND-875 | medium | TC-282 and TC-284's negative halves are tautologies over a local clone rather than exercises of the gate. TC-282 overwrites a cloned case's quote with "a phrase no contract artifact carries" and then asserts that string is absent from the artifact — it never calls `corpusGates()`. TC-284 sets `blessedFromRun = true` on a clone and asserts `blessing` is `undefined`, which is true of the clone by construction and validates against no schema. Both gates genuinely exist in `corpusGates()` (`provenance` and `blessing` failure paths) and their forward direction is covered by TC-280/TC-282/TC-635 plus "the whole FR-035 gate set passes", so FR-035-AC-3 and FR-035-AC-5 hold; only their "fails the gate" clauses are unproven. | test/conformance-corpus.test.ts:149–160, :194–198, conformance/corpus.mjs:374–402, FR-035-AC-3, FR-035-AC-5, TC-282, TC-284 |
| FND-876 | medium | TC-291's locale test cannot fail. It assigns `process.env.LC_ALL = "tr_TR.UTF-8"` inside the running vitest process, where ICU is already initialized and the assignment changes no collation; and TC-294/TC-637 separately assert that no file under `conformance/oracle/` contains `process.env` at all, so the oracle is structurally incapable of observing the variable. FR-036-AC-2's locale clause is nonetheless discharged, by TC-636, which re-runs the harness out of process under `LC_ALL=C` and `LC_ALL=tr_TR.UTF-8` from two working directories and compares bytes. TC-291's in-process half should be deleted or replaced by the out-of-process form. | test/conformance-corpus.test.ts:327–340, :1454–1474, FR-036-AC-2, TC-291, TC-636 |
| FND-877 | medium | TC-303 does not seed the **reordered** diagnostic FR-037-AC-2 names. The matrix row and the AC both list "extra, missing, reordered, repointed, relocated, or reclassified"; the suite carries five seeds (extra, missing, repointed, relocated, reclassified) plus a changed-`normalized` seed, and no case with two or more expected diagnostics has its order permuted. The `single-violation` corpus gate forces every negative case to exactly one diagnostic, so no corpus case can currently express a reorder — which is itself the reason the seed is missing and worth stating in the row. | test/conformance-corpus.test.ts:644–713, conformance/corpus.mjs (single-violation gate), FR-037-AC-2, TC-303 |
| FND-878 | low | TC-297 checks diagnostic *shape*, not schema validity. FR-036-AC-8 requires every emitted diagnostic to validate against `common.schema.json#/$defs/diagnostic`; the test asserts `Object.keys(diagnostic)` contains `code`, `severity`, `message`, `owner`, `blocking`, `causes`, `related` and stops there. The AC is discharged transitively — `corpusGates()` proves the oracle's verdict equals the authored `expected` block, and TC-280 validates every authored diagnostic through the case schema's `$ref` — but a diagnostic the oracle emits for an input outside the corpus (TC-301's `INVALID_DOCUMENT`, for instance) is validated by nothing. | test/conformance-corpus.test.ts:478–497, FR-036-AC-8, TC-297, TC-301 |
| FND-879 | low | Plan-007 and Task-048 both promise a `conformance` script in `package.json`; NFR-016 Scope prohibits `/package.json` outright ("issue #9's own gate requires it to stay byte-identical to `main`"). The implementation followed the spec — the Makefile comment says so explicitly and calls `node` directly — so the plan text, its cross-cutting-constraints list ("`package.json` (a script only)") and Task-048's deliverable list are stale against the requirement they implement. The same list also omits the NFR-016 clause that permits extending "the cumulative changed-path allow-lists that the earlier tickets' gates carry in `test/*.test.ts`", which this branch used in six files (`contract-census`, `semantic-architecture`, `semantic-contract`, `semantic-core`, `semantic-ir-v1-1`, `typespec-feasibility`); each adds the same three entries and nothing else, so the branch is inside NFR-016 while outside Plan-007's restatement of it. | Plan-007 plan.md (Cross-cutting constraints), Task-048 (Deliverables), NFR-016 (Scope, Prohibited), Makefile:88–101, test/*.test.ts allow-lists |
| FND-880 | low | Provenance is single-sourced. 121 of the 122 `derivedFrom` entries across 111 cases quote `docs/semantic-data-system/contracts-v1.md` and one quotes `schema/semantic/v1/common.schema.json`, so every schema-decided case (`decidedBy: "schema"`) justifies a schema-layer expectation from prose rather than from the schema clause that decides it. US-008-EX-1 asks that a case cite "the contract clause **and schema pointer** it was derived from"; `corpus-case.schema.json` has `artifact`, `locator` and `quote` but no schema-pointer member, so no case carries one. The construct register is better sourced — 22 rows across ten artifacts including nine published schemas and the frozen `reader-cases.json`. | conformance/cases/**/*.json (derivedFrom), conformance/schema/corpus-case.schema.json, conformance/corpus.json (constructRegister), US-008-EX-1, FR-035-AC-3 |
| FND-881 | low | Source-literal coupling in two static checks. TC-304 asserts the runner text contains `compare(entry, result` and that `/\bcompare\(/g` matches exactly once; TC-310 asserts it contains `execFileSync(adapter.command[0]`. Renaming a parameter, reformatting the call across lines, or extracting a helper flips either test with no behavioural change, and the converse — a genuine adapter-to-adapter comparison written in a form the two regexes miss — passes. FR-037-AC-9 is verified by pattern-matching prose rather than by structure. | test/conformance-corpus.test.ts:741–746, :913–918, FR-037-AC-9, TC-304, TC-310 |
| FND-882 | low | Matrix drift against this run. `spec/tests.md` rows TC-280..319 and TC-622..419 already read "✅ passed — conformance corpus (PR pending)" while Task-056's "Flip the TC-280..319 and TC-622..419 rows to passed and update the Test Execution Summary" subtask is unchecked, so the flip happened outside the task that owns it. The Test Execution Summary states "131 pytest assertions"; `poetry run pytest tests/test_conformance_corpus.py` collects and passes 127 on this host. The vitest figure (92) matches. | spec/tests.md:387–448, :472, Task-056 (subtask 3) |

## Coverage

- Target: `plan/Plan-007-conformance-corpus-and-oracle/`; specification: `spec/`;
  matrix: `spec/tests.md` (`TM-001`); identity prefix:
  `ix://agent-ix/filament-core-data`.
- Reconciliation: **engine**, not a grep fallback. `quire coverage --scope
  /home/peter/dev/filament-core-data --json` (cli 0.31.0, engine 0.46.0 @
  ca7362d4) returns `totals.backed = 62 / 619` and
  `groups[spec/tests.md] = 62 / 341`, and **zero** of TC-280..319 and TC-622..419 appear in
  `unbacked_rows`. The typescript binding census reads 207 candidates, 100
  tagged, 91 bound via `typescript-test-name-id`; the python census reads 18
  candidates, 14 tagged, 14 bound. The engine's 62 backed rows are exactly the
  issue #20 block: every row this review scopes is bound to a real test symbol
  by the engine itself. One `unmatched_tags` entry belongs to this suite — the
  unnumbered `it("the whole FR-035 gate set passes on the committed corpus")`
  at line 306, which the binder reads as an `FR-035` tag on a symbol the matrix
  does not name. The 218 `status_lies` and 590 `unbacked_rows` repo-wide are
  the pre-existing untagged issue #8/#9/#10/#4 blocks, outside this scope.
- Tasks done: **0 / 9 by status**, 8 / 8 by tree (FND-864). Task-056 is the gate
  this document belongs to and is in progress. Dependency order (048 → 049 →
  050 → 051/052, 049 → 053, 051+052+053 → 054 → 055 → 056) is consistent with
  the single implementation commit `3f88137`; no task is blocked.
- Issue #20 Test Cases backed by a named test: **62 / 62**. TC-280..339 and
  TC-643 are named in `it(...)` titles in `test/conformance-corpus.test.ts`
  (92 cases, several rows carrying two or three tests each); TC-642 is named in
  four `def test_tc340_*` functions in `tests/test_conformance_corpus.py`, which
  also names TC-283, TC-288, TC-289, TC-300, TC-314, TC-318, TC-627, TC-632,
  TC-635, TC-638 and TC-643. Matrix-only: 0. Tag-only: 0. **Rows backed by an
  assertion that cannot fail: TC-288, TC-632, TC-639, TC-640 (whole row);
  TC-282, TC-284, TC-291, TC-305, TC-318, TC-626, TC-628, TC-641, TC-643
  (one half). TC-287 and TC-303 are backed but incomplete against their row
  text.**
- Acceptance criteria discharged: **43 / 57**. Fully discharged: FR-035-AC-1,
  AC-2, AC-4, AC-6, AC-7, AC-10; FR-036-AC-1, AC-3, AC-4, AC-5, AC-6, AC-7,
  AC-9, AC-10, AC-11; FR-037-AC-1, AC-3, AC-5, AC-6, AC-10, AC-11; FR-038-AC-1,
  AC-2, AC-3, AC-4, AC-6, AC-7, AC-8, AC-9; FR-039-AC-2, AC-4, AC-5, AC-6,
  AC-9; NFR-015-AC-1, AC-2, AC-3, AC-4; NFR-016-AC-3. Discharged only by a
  neighbouring test, not by the row that owns them: FR-035-AC-9 (FND-868),
  FR-036-AC-2 (FND-876), FR-036-AC-8 (FND-878). **Undischarged: FR-035-AC-3
  (negative half), FR-035-AC-5 (negative half), FR-035-AC-8 (both halves),
  FR-037-AC-2 (reordered seed), FR-037-AC-4 (second half), FR-037-AC-7
  (non-zero-exit half), FR-037-AC-8 (accept half), FR-037-AC-9 (literal-match
  only), FR-038-AC-5 (DEF-PROTO-004), FR-039-AC-1 (second half), FR-039-AC-3
  (second half), FR-039-AC-7, FR-039-AC-8 (byte-identity half), NFR-015-AC-5,
  NFR-016-AC-1, NFR-016-AC-2, NFR-016-AC-4.**
- Execution evidence (this host, 2026-09-03):
  `npx vitest run test/conformance-corpus.test.ts` 92 / 92 (13.5 s);
  `poetry run pytest tests/test_conformance_corpus.py -q` 127 / 127 (0.25 s);
  `make conformance` exits 0 with `problems: []`, 111 cases, 444 unmet rows
  (4 slots × 111), `corpusVersion 1.0.0`. `test/semantic-core.test.ts` TC-254
  fails for issue #40's reasons on `main` at 8425a14 and is out of scope.
- Underspecified code — every file under `conformance/` traces to a
  requirement: `schema/*.schema.json` → FR-035-AC-1 (Task-048); `bases/*.json`
  → FR-035-AC-2; `cases/<family>/*.json` → FR-038 and the construct register;
  `corpus.mjs` (loader, patch dialect, digests, `corpusGates`, `substantive`,
  `compare`) → FR-035; `oracle/schema-layer.mjs` → FR-036-AC-10, `oracle/json.mjs`
  → FR-036-AC-2/AC-6, `oracle/oracle.mjs` → FR-036, `oracle/index.mjs` →
  FR-039-AC-5/AC-6; `runner/differential.mjs` → FR-037 and FR-039-AC-1;
  `adapters/registry.json` → FR-037-CON-1; `diagnostic-codes.json` →
  FR-036-AC-11; `divergences.json` and `contract-gaps.json` → NFR-015-AC-4;
  `defects.json` → FR-038-AC-5; `thresholds.json` → FR-039-AC-2;
  `mutations.json` → FR-039-AC-3/AC-4; `coverage.json` → FR-039-AC-1;
  `corpus.json` → FR-035-AC-1; `README.md` → FR-035 and GAP-004;
  `tools/audit.mjs` → FR-037-AC-5 (the declared sole clock reader).
  **Two files own no requirement text: `tools/refresh.mjs`** (rewrites the
  manifest digests; maintenance-only and never called by a gate, but it is the
  one writer of a committed generated file that no AC governs) **and
  `tools/format-json.mjs`** (shells the repo's pinned `biome` binary out of
  `node_modules/.bin` so a regenerated `coverage.json` matches committed
  bytes — the FR-039-AC-1 and FR-039-AC-9 byte comparisons therefore depend on
  an installed dev dependency and a spawned process that the NFR-015-AC-3
  static analysis does not cover, since it scans only `oracle/` and `runner/`).
  Both are low-consequence and are recorded here rather than as findings.
  Stubs, skipped cases, `it.todo`, or placeholder returns: 0 — with the
  exception of the `void`ed setup in TC-305, which is FND-870.
- Semantic review: **run**, as requested. Intent↔test↔code was judged for
  US-008 and for each of FR-035..039, NFR-015 and NFR-016; FND-865, FND-871,
  FND-872, FND-877 and FND-880 came from that pass rather than from the
  mechanical steps. The headline answer is in the Summary: the expectations are
  contract-derived and independently re-derivable, the harness is proven to
  catch a wrong implementation through seeded stubs, and the corpus has already
  produced ten contract gaps and sixteen prototype defects that no run
  generated — so it is a yardstick, not a mirror. Its remaining weakness is
  that it has not yet been pointed at anything.

## Gate Closure

1. Fix PRES-010 so it discriminates DEF-PROTO-004 — a type whose rendered name
   contains lowercase `null` on a field declared `nullable: false`, expecting
   the nullability answer rather than a presence/multiplicity diagnostic — and
   give TC-318 an assertion that names the defect's own code (FND-865, FND-871).
2. Implement the changed-path and manifest-diff gates Task-048 lists, and make
   TC-640, TC-641 and TC-643 diff the branch against `main` (FND-866).
3. Implement the versioning gate FR-035-AC-8 and NFR-015-AC-5 require — an
   `expected`-block change or a defect-named case deletion without a major
   `corpusVersion` bump fails — and replace TC-639's README substring
   assertion (FND-867).
4. Replace the tautologies with exercises of the gates that already exist:
   TC-288 (validate against `#/$defs/diagnostic`, resolve the pointer),
   TC-632 (patch the registry, call `run()`), TC-305 (patch the registry to
   `available` and assert the `unavailable` problem), TC-628 and TC-626
   (FND-868..FND-870, FND-873, FND-874), TC-282 and TC-284 (FND-875).
5. Delete TC-291's in-process locale assignment in favour of the TC-636 form
   (FND-876), and add the reordered seed or record in the TC-303 row why the
   `single-violation` gate makes one unexpressible (FND-877).
6. Flip Task-048..055 to `done`, check their subtasks, fill the Task File
   Mapping and `plan.md` boxes, and add the implementation entries to `log.md`
   (FND-864); reconcile the plan's `package.json` and permitted-path text with
   NFR-016 (FND-879); correct the pytest count in the Test Execution Summary
   (FND-882).
7. Then run `/code-review`, open the PR, and post the "mergeable" comment
   citing this SR-076 and the code review.
