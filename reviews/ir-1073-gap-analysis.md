---
id: SR-16476
title: "Gap analysis of IR-1073 Python test gate"
type: SpecReview
analysis: gap-analysis
scope: "agent-ix/filament-core-data; IR-1073; Makefile, README.md, test/exact-numeric-traces.test.ts, test/numeric-backend-matrix.test.ts"
review_set: subset
---

## Summary

Compared the IR-1073 deliverable with the changed production gate and test evidence at PR #323 head 1a7516f4ed1ee53f1adc5dc3d311a49435b6c53b. The new Python prerequisite and interpreter routing have only manual focused checks in the PR description, with no committed regression test for their failure modes.

## Verdict

**CONDITIONAL** — the principal new Make behavior lacks a regression test even though the changed numeric tests still assert their original reader behavior.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | medium | No committed test checks that missing Poetry or `.venv` yields one prerequisite error before aggregate or named test gates run. | Makefile:37-69, test/rust-ci-lane.test.ts |

## Coverage

Plan completion: not assessed

- Examined IR-1073 deliverable: tests and Makefile targets resolve the project interpreter deterministically, fail with one clear prerequisite message when Poetry or `.venv` is absent, and document prerequisites.
- Inspected changed tests and existing `test/rust-ci-lane.test.ts`. The changed tests retain numeric result assertions and add explicit interpreter paths; they do not exercise the Make prerequisite.
- Ran `quoin matrix --repo . --json`. The repository matrix has no criterion specific to IR-1073, which is ticket-scoped rather than a new spec requirement. Existing unrelated untagged criteria were not attributed to this PR.
- Optional semantic review was not requested.

## Dispositions

| FND | outcome | reason |
| --- | --- | --- |
| FND-001 | fixed | `test/python-test-gate.test.ts` now covers missing Poetry and missing `.venv` across all six test entry points under parallel Make, checks one prerequisite message and no started gates, and checks the positive path with `VIRTUAL_ENV`. The reviewer also ran all six actual Make targets without `.venv` and observed one prerequisite message each. |
