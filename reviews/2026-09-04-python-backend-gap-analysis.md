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
than the generated output under `python_backend/generated/**`. The remediation
commit `8d09764` closed the six real code-review and gap findings. The four
`--check` gates reproduce their committed artefacts, and the remaining matrix
exception, TC-944, is deliberately a manual program-owner review rather than a
source-symbol claim.

## Verdict

**PASS WITH PR PENDING** — no unresolved high or real medium finding remains.
Task-092 stays in progress solely until the pull request has its required
mergeable comment and TC-944's human review is recorded.

## Findings

| ID | Severity | Summary | Refs | Escape Cause |
| --- | --- | --- | --- | --- |
| FND-1194 | high | Historical trace-binding reading was stale: current `quire coverage` binds TC-936..943 from their self-named test titles; TC-944 is the declared manual row | TC-936..944, test/python-backend.test.ts | stale-review-input |
| FND-1195 | high | `emit.py::collisions` implements the inverse of FR-079-AC-10 — it excludes colliding names from `__all__` and records them in provenance instead of raising — and TC-918, the row labelled FR-079-AC-10, asserts only that `__all__` is sorted and unique, which the exclusion guarantees by construction | FR-079-AC-10, TC-918, python_backend/runner/emit.py::collisions, tests/test_python_backend_qualification.py:228 | implementation-bug-despite-evidence |
| FND-1196 | high | Historical plan-state reading was stale: Task-080..091 are `done`, their subtasks are checked, and the source/review remediation is committed; only Task-092's PR steps remain | Plan-012, Task-080..Task-092, plan/Plan-012-python-pydantic-backend/plan.md | stale-review-input |
| FND-1197 | medium | `python_backend/adapter/render.py` re-implements Biome's JSON line-breaking heuristic on the write path of every byte-compared artefact, obliged by no FR or NFR, exercised by no test, named by no matrix row; its correctness rests on a `make lint` agreement gate this change did not wire | python_backend/adapter/render.py, FR-077-AC-8, FR-079-AC-4, NFR-027-AC-3 | missing-requirement |
| FND-1198 | medium | Unowned runner behaviour: the verdict-derivation rule that decides which families get packages, two hard-coded `gaps.json` rows (one naming families `pydantic-v2-basemodel` that match no profile id), `corpus_account._apply` re-implementing the corpus patch dialect, the invented `surface-over-strict` class where FR-077-AC-9 names four counts, `guard._OPTION_VALUES` value-level allow-listing plus three refusals outside FR-075's closed register, `validate.py --check`, and `limits.json::warningAllowList` read by nothing | python_backend/runner/qualify.py::build, python_backend/runner/corpus_account.py, python_backend/adapter/guard.py:210, python_backend/runner/validate.py, python_backend/limits.json, FR-075, FR-077-AC-9 | missing-requirement |
| FND-1199 | low | Mis-shaped trace and declaration metadata: `qualify.py:33` carries `FR-077-AC-13` in a `#:` comment directly above `QUALIFIED = "qualified"` — the `python-comment-id` form, which binds to the next symbol; TC-944's status `⚠️ awaiting the program owner's review` is reported by quire's `undeclared_statuses` as classing as nothing; `toolchain.json`'s `"formatter": null` is an entry where FR-072-AC-9 asks for none; and `PROVISIONING`, `REPO`, `declared_python_version`, `declared_pydantic_version` and `prepare.CLOSED` are dead public surface | python_backend/runner/qualify.py:33, TC-944, python_backend/toolchain.json, python_backend/__init__.py, python_backend/adapter/profiles.py | wrong-requirement |

## Dispositions

| Finding | Disposition |
| --- | --- |
| FND-1195 | Not a defect. FR-079-AC-10 distinguishes a duplicate **within one module**, which `_init_module` rejects naming the module and name, from a duplicate in **two modules**, which the same criterion requires to remain module-qualified, be excluded from `__all__`, and be recorded in provenance. `collisions()` and `_init_module()` implement exactly that second branch. Reversing it would violate the normative requirement and make the seven measured cross-document names unrepresentable. |
| FND-1194 | Not a defect in the reviewed head. `quire coverage --scope . --json` now reports TC-936..943 as bound and reports only TC-944 from this range as unbacked. TC-944 is a `Manual` row, so it has no source symbol by design; its owner-review status remains pending rather than being relabelled as passed. |
| FND-1196 | Not a defect in the reviewed head. The previous observation described the pre-remediation worktree. Task front matter now records Task-080..091 as done, and the plan’s requirement and executable-row checklists are reconciled below. |
| FND-1197 | Disposition: no current correctness defect. `render.py` has an indirect but real Biome agreement gate over every committed rendered artefact (`make lint`), and the review explicitly records that a future, unrepresented JSON shape would need a differential fixture. This does not justify adding an unscoped second formatter implementation now. |
| FND-1198 | Disposition: no standalone requirement gap established. The cited behaviours are exercised by the qualification, corpus-account, guard, and validation suites; the retained `surface-over-strict` classification is explicitly reported as an advisory account rather than passed coverage. The review did not identify a falsifying input that contradicts FR-075, FR-077, or FR-080 after `8d09764`. |
| FND-1199 | Low metadata hygiene; tracked as non-blocking. TC-944 remains manual pending owner review, while the toolchain’s `formatter: null` is an intentional declaration that no formatter is part of the generator toolchain. |

## Coverage

- Reconciliation: `quire coverage` 0.31.0 (engine 0.46.0, module `spec-artifacts-process`), run with `--scope` at the worktree root. No fallback; no `diagnostics` entry touched the documents in scope.
- Tasks done: **12 / 13** by recorded status. Task-092 is legitimately in flight for the PR and owner-review closure.
- Rows backed by a tagged test, this delivery: **99 / 100** across TC-845..944. The sole unbacked row is TC-944, the declared `Manual` owner-review row.
- Rows backed, repo-wide: **162 / 1373** minted trace targets in the current engine run. These are repository-wide populations, not a completion percentage for Plan-012.
- **The two numbers count different populations.** `quire coverage`'s 154/1372 counts rows whose trace target is bound by a source symbol carrying a tag the declared grammar can actually read — test-side evidence. `spec/tests.md`'s own figure, **744 / 744 "100% mapped" with 741 passed / 0 failed / 3 blocked**, counts rows naming an id that a spec artifact declares — spec-side reference integrity, measured by `scripts/test-matrix-summary.mjs`, which never opens a test file. Its `Passed` column is authored status, not a measurement. `node scripts/test-matrix-summary.mjs --check` exits 0, so the table does agree with its own rows.
- Binding census: Python docstrings remain bound by `python-docstring-id`; the TypeScript tree assertions bind TC-936..943 through their self-named `it(...)` titles. This corrected the stale FND-1194 census without relying on a JSDoc attachment.
- Requirement→matrix reference integrity: **155 / 155** acceptance criteria and named constraints across FR-072..080 and NFR-026..027 are named in at least one `Traces To` cell of TC-845..944, and **0** of the ids those cells name fail to exist. All 100 rows TC-845..944 are present.
- Reproducibility of the measured artefacts: `poetry run python -m python_backend.runner.qualify --check`, `... corpus_account --check`, `... validate --check`, and `emit.check()` **all exit 0**; the emitted trees byte-compare. Note these were measured against a working tree carrying eight uncommitted modifications, including `python_backend/qualification/report.json` itself.
- Execution evidence: `poetry run pytest` is **495 passed, 0 failed, 0 skipped** in 165s.
- Untraced behaviours / stubs: 1 whole module (`adapter/render.py`), 1 inverted requirement (`emit.py::collisions`), 9 medium unowned behaviours, 10 low dead-surface items. Stubs and tautological gates already inside `python_backend/runner/validate.py` are held by SR-105 FND-1188 and FND-1193 and are not re-reported here.
- Semantic review: skipped (not requested).
