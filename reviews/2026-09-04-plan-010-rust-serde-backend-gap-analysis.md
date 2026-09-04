---
id: SR-086
title: "Gap analysis — Plan-010 Rust/Serde backend"
type: SpecReview
analysis: gap-analysis
scope: "plan/Plan-010-rust-serde-backend/, NFR-022, NFR-023, test/rust-backend.test.ts"
review_set: subset
relationships:
  - { target: "ix://agent-ix/filament-core-data/Plan-010", type: reviews }
---

# Gap analysis — Plan-010 Rust/Serde backend

## Verdict

**PASS — implementation and lifecycle evidence closed.** Task-094's focused
gates are green on the branch, in the measured squash-merge state, and with a
measured unrelated sibling on top. In the required #23-then-#21 order, the
provisioned integrated restore passed all eleven Vitest files: the ten suite
summaries observed during the full run plus `semantic-core`'s 28/28 terminal
JSON reporter result. The focused Rust suite's suppression, degradation, and
synthetic-history controls provide the guard falsification and perturbation
evidence.

## Finding

| ID | Severity | Finding | Remediation |
| --- | --- | --- | --- |
| FND-1203 | resolved | The standalone `c1b8807` restore is not the delivery order this campaign requires: #23 owns the predecessor range-gate conversion. In a provisioned clone with #23 squash-merged first, shared documents resolved in favor of its range gates, and #21 then reverted, all eleven Vitest files pass. `semantic-core` reports 28/28 through Vitest JSON after the console handle detached; the other ten suite summaries were observed from the full run. | None. |
| FND-1204 | resolved | The clone was provisioned with `poetry install`; `jsonschema` installed and the Python-reader-dependent `semantic-ir-v1-1` suite passed. | None. |

## Current evidence

`test/rust-backend.test.ts` passes 57/57 on the branch head and in a scratch
clone where the branch was squash-merged onto `c1b8807` and
`refs/remotes/origin/main` was repointed at the squash commit. In that clone,
`git diff --no-renames --name-only origin/main...HEAD` and
`git status --porcelain` were both empty. This supports the implementation and
the post-merge direction, but not accretion or restore, which are facts about
different histories. The same clone also passes 57/57 after a real later
sibling commit added `src/sibling/marker.mjs` and edited
`docs/semantic-data-system/roadmap.md`; those paths are visible in
`origin/main..HEAD` but were not annexed by the Rust gate. A standalone revert
against `c1b8807` produced 403/409 because it predates #23's range conversion.
In the correct order — #23 squash-merged first, shared documents resolved in
favor of its range-gate forms, then #21 squash-merged and reverted — the
provisioned clone passes every discovered Vitest file. The console summary
showed `semantic-architecture` 10/10, `typespec-feasibility` 6/6,
`contract-census` 9/9, `schema` 3/3, `semantic-contract` 14/14,
`semantic-ir-v1-1` 45/45, `python-backend` 12/12, `compiler` 59/59,
`conformance-corpus` 107/107, and `compiler-core` 128/128; the JSON reporter
records `semantic-core` 28/28. This is 421 passing tests across the eleven
files, with the Python environment provisioned by `poetry install`.
