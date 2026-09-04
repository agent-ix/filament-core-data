---
id: SR-065
title: "Code review of the conformance corpus and its independent oracle"
type: SpecReview
analysis: code-review
scope: "conformance/, test/conformance-corpus.test.ts, tests/test_conformance_corpus.py, Makefile, changed-path allow-lists in test/*.test.ts"
review_set: subset
relationships:
  - target: "ix://agent-ix/filament-core-data/Plan-007"
    type: reviews
---
# Code review of the conformance corpus and its independent oracle

## Summary

Issue #20 adds a 122-case semantic conformance corpus with four base bundles, a
JSON-level oracle written from the published schemas and `contracts-v1.md`, a
differential harness that compares each declared adapter only with that oracle,
four registers, and two gate suites (92 vitest cases, 127 pytest cases, both
green; `tsc --noEmit` clean; `biome format` clean over the new trees). The
substance is real and the isolation claims hold on inspection: the oracle
imports nothing under test, the harness has exactly one comparison call site,
and every provenance quote resolves in a contract artifact. Four high findings
stand against it — one required gate that does not exist, one classifier branch
that can never be reached and fails open to the least restrictive answer, and
two places where a test named for a failure asserts that nothing failed.

## Verdict

**FAIL** — four high findings: the FR-035-AC-8 versioning gate is absent while
its matrix row is marked complete, `classify` can never return `unknown` and
seeds its fold with `patch`, TC-305 asserts the opposite of its own name, and a
block of negative-half tests restate their inputs instead of invoking the gate
they name.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-588 | high | No versioning gate exists. FR-035 Behavior ("If `corpusVersion` does not change as the manifest's own rules require, then the versioning gate SHALL fail and name the required bump") and FR-035-AC-8 are unimplemented: `corpusGates()` runs manifest-schema, digest, base-clean, case-id, case-directory, case-base, minimization, test-op, blessing, provenance, patch, single-violation, oracle-agreement, pointer, corpus-digest and case-index checks, and nothing that reads `corpusVersion`. TC-287 tests only the defect-row half of its row, and both TC-287 and TC-415 are marked ✅ Complete. | conformance/corpus.mjs:254, test/conformance-corpus.test.ts:250, spec/tests.md:414, spec/tests.md:464 |
| FND-589 | high | `classify()` can never return `unknown`, and an unmodelled change fails open. `CLASSIFICATION_ORDER` declares `unknown`, and FR-036 requires "an unclassifiable change as `unknown`", but no `record("unknown", …)` call exists; every change the classifier does not model produces no row at all, and the fold seeds on `"patch"` — the least restrictive value — so an unrecognized evolution classifies `patch` rather than `unknown`. No corpus case expects `unknown`, so the gap is invisible to TC-290. This is the shape of "the oracle is a second bug": it under-reports in the permissive direction. | conformance/oracle/oracle.mjs:23-30, conformance/oracle/oracle.mjs:1402-1405 |
| FND-590 | high | TC-305's second case, "an available adapter answering unavailable fails", asserts `expect(report.problems).toEqual([])` — that nothing failed. It builds `patched` and `original` to flip the registry status, then discards both with `void patched; void original;` and a comment deferring to an "available branch below" that does not exist in the file. FR-037-AC-4's second half is unverified and the guard it names is never executed. | test/conformance-corpus.test.ts:773-800, conformance/runner/differential.mjs:210-220 |
| FND-591 | high | Seven negative-half tests assert a restated input instead of invoking the gate they are named for, so none of them can fail: TC-282 asserts a hardcoded phrase is absent from a file; TC-284 asserts `blessing` is undefined on a clone it never validates; TC-288 asserts `errors.length >= 0` and `parent === "" \|\| JSON.stringify(bundle).length > 0`; TC-283 digests a mutated buffer without ever asserting the unmutated one matches; TC-404's "drops the score" asserts the score does *not* drop; TC-408 asserts `registryIds.filter(id => !thresholdIds.slice(1).includes(id)).length > 0`, which is array arithmetic; TC-416 walks `conformance/` and asserts every returned path starts with `conformance/`. The corresponding gates in `corpus.mjs` and `differential.mjs` are real — these are untested guards behind tests that cannot fail. | test/conformance-corpus.test.ts:149, :178, :194, :263, :1312, :1383, :1529 |
| FND-592 | medium | TC-291's Turkish-locale check mutates `process.env.LC_ALL` inside the running process. Node resolves its default ICU locale at startup, so the flip cannot change any comparison and the test would pass even if the oracle called `localeCompare`. The determinism claim is genuinely carried by TC-412, which sets `LC_ALL` on two child processes; the in-process variant is decoration. | test/conformance-corpus.test.ts:327-341, test/conformance-corpus.test.ts:1467-1489 |
| FND-593 | medium | The declared total order over diagnostics is not implemented. FR-036 requires ordering by `pointer`, then `code`, then `message`, "then by the canonical form of the diagnostic, so that no two diagnostics tie"; `compareDiagnostics` stops after `message` and returns 0 for a tie. Byte-identical repeat runs hold only because V8's sort is stable and the emission order happens to be deterministic, not because the order is total. | conformance/oracle/oracle.mjs:64-71 |
| FND-594 | medium | The `x-repeat` expansion is unbounded. `count` is `{"type":"integer","minimum":1}` with no maximum, and the FR-035 minimization budget counts nodes in `ops` (a 6-node op), not the expansion it produces, so a case can sit inside the 64-node budget and expand without limit when `buildInput` runs — including in a downstream consumer that imports the corpus through `oracle/index.mjs`. The committed cases use 255 and 258; nothing enforces that ceiling. | conformance/schema/corpus-case.schema.json (`$defs/op.count`), conformance/oracle/json.mjs:208-217, conformance/corpus.mjs:345-352 |
| FND-595 | medium | `derivedFrom.artifact` is any repository-relative path. The provenance gate only requires the file to exist and the quote to occur in it, so a future case could derive its expectation from `spikes/`, `src/`, or a generated output and pass every gate — the exact drift NFR-015-AC-1 ("occurs verbatim in the named **contract** artifact") forbids. Today all 122 quotes resolve to `docs/semantic-data-system/contracts-v1.md` or `schema/semantic/v1/common.schema.json`, so the control is convention, not gate. | conformance/corpus.mjs:384-403, conformance/schema/corpus-case.schema.json (`derivedFrom.artifact`) |
| FND-596 | medium | The lock package-graph traversal returns silently at the depth bound while the composite-relationship traversal emits a diagnostic at the same bound. FR-036 requires `DEPTH_LIMIT_EXCEEDED` "at the node that exceeds it" for reference, composite-relationship *and* package-graph expansion; a >256-deep acyclic package graph is truncated with no diagnostic and the verdict reads `success`. | conformance/oracle/oracle.mjs:768, conformance/oracle/oracle.mjs:688-697 |
| FND-597 | medium | The test-op guard covers only `replace` and `remove`. The case schema admits `add`, `copy` and `move`, all of which can address an array member by index and all of which silently re-aim when a base gains or loses an element; only the two ops FR-035 names are pinned. The Python cross-check does not implement `copy`/`move` at all, so such a case would also raise `AssertionError` there rather than build. | conformance/corpus.mjs:354-372, tests/test_conformance_corpus.py:138-139 |
| FND-598 | medium | An FR-036 SHALL is unmet: "The oracle SHALL record in `conformance/README.md` that its classification covers the IR surface only, and that `compatibility-report.schema.json` and FR-025 remain the authority for the profile, mapping, representation, generated-target, and consumer-evidence surfaces." The README contains neither `compatibility-report.schema.json` nor `FR-025`; the sentence exists only as a docstring inside the oracle. No test checks it. | conformance/README.md, conformance/oracle/oracle.mjs:1063-1070 |
| FND-599 | medium | The adapter acquisition path is unreachable and untested. `run()` takes an `adapterResults` injection that every seeded test uses, and the registry is read from a fixed path with no seam, so `runAdapter`'s process branches — non-zero exit, non-JSON stdout, non-array payload — never execute. FR-037-AC-7's first half ("an adapter command that exits non-zero … produces a non-zero harness exit and a per-case failure") is verified only by TC-310's grep for the literal `execFileSync(adapter.command[0]`. This is adjacent to, but not the same as, the accepted fact that all four slots are `unavailable`: a registry seam would make the branches testable today. | conformance/runner/differential.mjs:60-91, conformance/runner/differential.mjs:141-144, test/conformance-corpus.test.ts:920 |
| FND-600 | medium | The `unsupported` acceptance branch is dead against the committed corpus: no case file carries `unsupportedBy`, so only the rejection path (TC-309) ever runs. The half of FR-037-AC-8 that says a *declared* `unsupported` answer becomes an unmet row with its owning issue is unexercised. | conformance/runner/differential.mjs:229-249, conformance/cases/ |
| FND-601 | medium | `mutationScore()` calls `loadCorpus()` inside its per-mutation loop, re-reading and re-parsing `corpus.json` and all 122 case files once per catalogued mutation, then runs the full oracle on the located case. It is the dominant cost of the suite's 9.8s runtime and grows quadratically with the corpus. Hoist the load. | conformance/runner/differential.mjs:402-410 |
| FND-602 | medium | The orphan check is asymmetric: `corpusGates` walks `conformance/cases/` and fails any file the manifest does not list, but performs no equivalent walk of `conformance/bases/`. A base file added on disk and omitted from the manifest is invisible to every gate, including `corpusDigest`, which is computed from manifest rows alone. | conformance/corpus.mjs:462-467 |
| FND-603 | low | `thresholds.json` declares four numeric targets per adapter and the harness compares none of them with the run; it checks only that registry ids and threshold ids are in bijection. Consistent with "issue #20 measures and proposes", but the code says nothing about it, and no `status: proposed` check gates the numbers. | conformance/runner/differential.mjs:113-136, conformance/thresholds.json |
| FND-604 | low | `format-json.mjs` states "This is a maintenance and gate helper. The harness itself never calls it." The harness calls it through `renderCoverage`, `writeCoverage`, and its own CLI entry point. | conformance/tools/format-json.mjs:62, conformance/runner/differential.mjs:389, :394, :425 |
| FND-605 | low | Three small inefficiencies and one dead parameter in the oracle: `checkCompositeCycles` takes `types` only to discard it with `void types`; `classify` builds `indexTypes(after)` twice on consecutive lines; `checkPackageContext` rebuilds `identitySet(ir)` inside the correspondence loop rather than once. | conformance/oracle/oracle.mjs:717, :1086-1087, :825 |
| FND-606 | low | The Python patch dialect — the second, independent reader that makes the cross-language check meaningful — implements `add`, `remove`, `replace`, `test` and `x-repeat` but raises on `copy` and `move`, which the case schema admits. The `# pragma: no cover` on that branch also hides the divergence from coverage. | tests/test_conformance_corpus.py:138-139 |
| FND-607 | low | The Python `_resolve` returns `None` both for an absent node and for a JSON `null`, so `assert _resolve(bundle, parent) is not None` would reject a legitimate null-valued parent. No current case is affected. | tests/test_conformance_corpus.py:143-160 |
| FND-608 | low | TC-318's second assertion, `expect(entry.provenance.reproduces ?? defect.id).toBeDefined()`, cannot fail: the `??` fallback guarantees a defined value. | test/conformance-corpus.test.ts:1154-1176 |
| FND-609 | low | TC-415 and TC-419 are weaker than their matrix rows. TC-415 ("an expected result changes only under a `corpus-defect` verdict carrying the major `corpusVersion` bump") asserts that `corpusVersion` is defined, that `package.json`'s version is a string, and that the README contains a phrase. TC-419 ("publishes no package and alters no consumer, catalog pin, or Avro contract") greps `.mjs` files for `npm publish`. Both rows read as Static/Analysis, so this is a strength-of-evidence note rather than a missing test. | test/conformance-corpus.test.ts:1520, :1551, spec/tests.md:464, spec/tests.md:468 |
| FND-610 | low | No issue-#20-specific changed-path gate exists for NFR-016-AC-1. The scope is enforced only by extending the inherited allow-lists in the earlier tickets' suites with three prefixes — `conformance/`, `plan/Plan-007-…/`, `test/conformance-corpus.test.ts` — and `tests/test_conformance_corpus.py` is covered only by a pre-existing blanket `tests/` prefix. Nothing asserts the NFR-016 prohibited set (`/packages/`, `/schema/`, `/fixtures/`, `/docs/`, `/.github/`, both lockfiles); TC-416, which the matrix assigns that job, is the tautology in FND-591. | test/contract-census.test.ts:510-512, test/semantic-core.test.ts:85-87, spec/tests.md:465 |
| FND-611 | low | `make lint` fails before reaching this change: a nested `biome.json` in the untracked `.worktrees/fix-40/` worktree aborts the root biome run. Environmental, not this branch — `biome format` over `conformance/`, `test/`, `tests/` reports 148 files clean and `tsc --noEmit -p tsconfig.json` exits zero. | Makefile:22, .worktrees/fix-40/biome.json |
| FND-612 | low | The Python suite is module-level functions where its sibling `tests/test_semantic_ir_v1_1.py` groups under a `Test*` class; each function does carry its TC id in the docstring, so traceability is intact. | tests/test_conformance_corpus.py |
| FND-613 | low | No `TODO`, `FIXME`, `XXX`, `pytest.mark.skip`, `it.skip`, mock, stub module, placeholder return, or warning suppression was found anywhere under `conformance/`, and no coverage threshold was lowered. `package.json` and both lockfiles are untouched; the change adds no runtime dependency. | conformance/, package.json |

## Test and Boundary Review

- 92 vitest cases and 127 pytest cases run green; the vitest file carries every
  TC-280..319 and TC-398..419 tag except TC-418, which is the Python suite's own tag, and the
  manual TC-414.
- The isolation claims that matter hold under inspection as well as under the
  static greps: `conformance/oracle/*.mjs` imports only `ajv`, `ajv-formats`,
  and `node:` builtins; `differential.mjs` has exactly one `compare(` call site
  and passes the oracle verdict as the only other side; the only clock in the
  tree is `audit.mjs`.
- Determinism is verified where it counts — two harness runs, two working
  directories, and two locales in child processes (TC-412) — but not by the
  in-process locale flip (FND-592), and the declared diagnostic total order is
  short of its final tiebreak (FND-593).
- Corpus anti-drift: the `oracle-agreement` gate rebuilding every authored
  `expected` from the oracle and the `single-violation` gate on negatives are
  the two controls that would catch a transcribed corpus, and both are real.
  What is missing is the gate on where an expectation was *derived* from
  (FND-595) and the gate on how an expectation may *change* (FND-588).
- Patch-dialect error handling is sound: every op failure is wrapped with its
  index and path, a failed `test` throws, and an unresolvable path throws rather
  than silently no-op'ing. The one unbounded input is `x-repeat.count`
  (FND-594).

## Spec-Code Faithfulness

- FR-035: bundles, case format, patch dialect, digests, minimization budget,
  defect-row and provenance gates — implemented and traced. AC-8's versioning
  gate is absent (FND-588) and AC-3's restriction to contract artifacts is
  unenforced (FND-595).
- FR-036: schema layer, collapse-to-deepest, cross-field rules, package-context
  rules, normalization, cycle and depth handling, `INVALID_DOCUMENT` —
  implemented. The `unknown` classification (FND-589), the package-graph depth
  diagnostic (FND-596), the total-order tiebreak (FND-593), and the README
  obligation (FND-598) are not.
- FR-037: one comparison side, digest rejection, support-before-state, pointer
  compatibility, divergence suppression and unreproduced-entry failure,
  clock-free report, clocked audit target — implemented. AC-4's available/
  unavailable failure (FND-590) and AC-7's process-exit half (FND-599) are
  unverified; the declared-`unsupported` acceptance path is unexercised
  (FND-600).
- FR-038, FR-039: construct register, defect and contract-gap registers,
  mutation catalogue, coverage account byte-reproduction, and the import surface
  with its deep copies are implemented and genuinely tested; AC-7's threshold
  bijection is real in the harness but tautological in its test (FND-591).
- NFR-015: provenance, blessing-free evidence, and cross-run/locale/directory
  byte identity hold. NFR-016: the corpus is confined to `conformance/` plus its
  two suites and a Makefile target, but has no gate of its own (FND-610).
