---
id: SR-106
title: "Gap analysis — Plan-012 qualified Python generation route"
type: SpecReview
analysis: gap-analysis
scope: "plan/Plan-012-python-pydantic-backend/, spec/tests.md TC-845..944, spec/functional/FR-072..FR-080, spec/non-functional/NFR-026..NFR-027, spec/usecase/US-013, python_backend/, tests/test_python_backend_*.py, test/python-backend.test.ts"
review_set: subset
relationships:
  - { target: "ix://agent-ix/filament-core-data/Plan-012", type: reviews }
  - { target: "ix://agent-ix/filament-core-data/TM-001", type: references }
---

# Gap analysis — Plan-012 qualified Python generation route

## Summary

Audited Plan-012 (Task-080..092) against the worktree at
`spec/23-python-pydantic-backend`: thirteen task files, the hundred matrix rows
TC-845..944, the eleven requirements FR-072..080 and NFR-026..027, and the
`python_backend/` tree, judging the emitter and the qualification harness rather
than the generated output under `python_backend/generated/**`. The substance of
the delivery is largely there and the measured artefacts genuinely reproduce —
all four `--check` gates exit 0 and `poetry run pytest` is 495 passed with zero
skips — but the plan bundle records none of it, the entire NFR-026/NFR-027
evidence tier is unbacked while seven of its rows assert `✅ passed`, and a
bespoke JSON formatter sits on the write path of every byte-compared artefact
with no owning requirement and no test.

## Verdict

**FAIL** — three `high` findings, nine matrix rows in scope with no backing
tagged test (seven of them claiming `✅ passed`), and thirteen of thirteen tasks
still `status: todo`. Task-092 being in flight explains the last of those but
not the first two.

## Findings

| ID | Severity | Summary | Refs | Escape Cause |
| --- | --- | --- | --- | --- |
| FND-1194 | high | The whole NFR-026/NFR-027 evidence tier is unbacked: the twelve `/** Traces: … */` JSDoc tags in `test/python-backend.test.ts` bind nothing, leaving TC-936..944 unbacked while TC-936..941 and TC-943 assert `✅ passed` | TC-936..944, NFR-026, NFR-027, test/python-backend.test.ts:86-309 | correct-requirement-no-evidence |
| FND-1195 | high | `emit.py::collisions` implements the inverse of FR-079-AC-10 — it excludes colliding names from `__all__` and records them in provenance instead of raising — and TC-918, the row labelled FR-079-AC-10, asserts only that `__all__` is sorted and unique, which the exclusion guarantees by construction | FR-079-AC-10, TC-918, python_backend/runner/emit.py::collisions, tests/test_python_backend_qualification.py:228 | implementation-bug-despite-evidence |
| FND-1196 | high | The plan bundle records none of the delivery: all thirteen Task files are `status: todo` with 0 of 71 subtasks and 0 of 25 `plan.md` checkboxes checked, though Task-080..091's artefacts are all present and their gates pass; eight source files and the SR-105 review are still uncommitted | Plan-012, Task-080..Task-092, plan/Plan-012-python-pydantic-backend/plan.md | correct-requirement-no-evidence |
| FND-1197 | medium | `python_backend/adapter/render.py` re-implements Biome's JSON line-breaking heuristic on the write path of every byte-compared artefact, obliged by no FR or NFR, exercised by no test, named by no matrix row; its correctness rests on a `make lint` agreement gate this change did not wire | python_backend/adapter/render.py, FR-077-AC-8, FR-079-AC-4, NFR-027-AC-3 | missing-requirement |
| FND-1198 | medium | Unowned runner behaviour: the verdict-derivation rule that decides which families get packages, two hard-coded `gaps.json` rows (one naming families `pydantic-v2-basemodel` that match no profile id), `corpus_account._apply` re-implementing the corpus patch dialect, the invented `surface-over-strict` class where FR-077-AC-9 names four counts, `guard._OPTION_VALUES` value-level allow-listing plus three refusals outside FR-075's closed register, `validate.py --check`, and `limits.json::warningAllowList` read by nothing | python_backend/runner/qualify.py::build, python_backend/runner/corpus_account.py, python_backend/adapter/guard.py:210, python_backend/runner/validate.py, python_backend/limits.json, FR-075, FR-077-AC-9 | missing-requirement |
| FND-1199 | low | Mis-shaped trace and declaration metadata: `qualify.py:33` carries `FR-077-AC-13` in a `#:` comment directly above `QUALIFIED = "qualified"` — the `python-comment-id` form, which binds to the next symbol; TC-944's status `⚠️ awaiting the program owner's review` is reported by quire's `undeclared_statuses` as classing as nothing; `toolchain.json`'s `"formatter": null` is an entry where FR-072-AC-9 asks for none; and `PROVISIONING`, `REPO`, `declared_python_version`, `declared_pydantic_version` and `prepare.CLOSED` are dead public surface | python_backend/runner/qualify.py:33, TC-944, python_backend/toolchain.json, python_backend/__init__.py, python_backend/adapter/profiles.py | wrong-requirement |

## Coverage

- Reconciliation: `quire coverage` 0.31.0 (engine 0.46.0, module `spec-artifacts-process`), run with `--scope` at the worktree root. No fallback; no `diagnostics` entry touched the documents in scope.
- Tasks done: **0 / 13** by recorded status. By artefact, Task-080..091 are substantively complete and Task-092 is the one legitimately in flight.
- Rows backed by a tagged test, this delivery: **91 / 100** across TC-845..944. The nine unbacked are TC-936..944. Two of those are `no_symbol_rows`, exempt by their own declared method (TC-942 `Analysis`, TC-944 `Manual`); the other seven are `status_lies` — TC-936..941 and TC-943 authored `✅ passed` over nothing.
- Rows backed, repo-wide: **154 / 1372** minted trace targets. That decomposes as 154 of the 744 `test-case` rows in `spec/tests.md` plus **0 of 628** criterion rows (`acceptance-criterion`, `nfr-acceptance-criterion`, `stakeholder-validation-criterion`) — no criterion row anywhere in this repository is bound by a source symbol, which is a pre-existing repo-wide condition and not this delivery's doing.
- **The two numbers count different populations.** `quire coverage`'s 154/1372 counts rows whose trace target is bound by a source symbol carrying a tag the declared grammar can actually read — test-side evidence. `spec/tests.md`'s own figure, **744 / 744 "100% mapped" with 741 passed / 0 failed / 3 blocked**, counts rows naming an id that a spec artifact declares — spec-side reference integrity, measured by `scripts/test-matrix-summary.mjs`, which never opens a test file. Its `Passed` column is authored status, not a measurement. `node scripts/test-matrix-summary.mjs --check` exits 0, so the table does agree with its own rows.
- Binding census: python **108 of 112** candidate symbols tagged, **108 bound** — the docstring convention (`"""TC-845: FR-072-AC-1."""`, bound by `python-docstring-id`) works exactly as the repo describes, and all 94 test functions across the four issue-#23 suites carry one. TypeScript: 362 candidates, 120 tagged, **107 bound**, of which **118 of the 120 are self-named** — that is, essentially only tests whose own `it(...)` name opens with the id bind, and all 106 such tests live in `test/conformance-corpus.test.ts`. The `/** Traces: … */` JSDoc form used by 310 sites across nine suites, `test/python-backend.test.ts` among them, is read as tagged in almost no case. This is the TypeScript twin of the `@pytest.mark.trace` wrapping trap the Python half deliberately avoids, and FND-1194 is its consequence for this delivery.
- Requirement→matrix reference integrity: **155 / 155** acceptance criteria and named constraints across FR-072..080 and NFR-026..027 are named in at least one `Traces To` cell of TC-845..944, and **0** of the ids those cells name fail to exist. All 100 rows TC-845..944 are present.
- Reproducibility of the measured artefacts: `poetry run python -m python_backend.runner.qualify --check`, `... corpus_account --check`, `... validate --check`, and `emit.check()` **all exit 0**; the emitted trees byte-compare. Note these were measured against a working tree carrying eight uncommitted modifications, including `python_backend/qualification/report.json` itself.
- Execution evidence: `poetry run pytest` is **495 passed, 0 failed, 0 skipped** in 165s.
- Untraced behaviours / stubs: 1 whole module (`adapter/render.py`), 1 inverted requirement (`emit.py::collisions`), 9 medium unowned behaviours, 10 low dead-surface items. Stubs and tautological gates already inside `python_backend/runner/validate.py` are held by SR-105 FND-1188 and FND-1193 and are not re-reported here.
- Semantic review: skipped (not requested).
