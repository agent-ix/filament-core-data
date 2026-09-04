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

**FAIL — evidence closure pending, not an implementation failure.** Task-094's
focused gates are green on the branch, in the measured squash-merge state, and
with a measured unrelated sibling on top. The restore rehearsal has now exposed
a real predecessor-gate defect, and guard falsification/perturbation remains
unrecorded.

## Finding

| ID | Severity | Finding | Remediation |
| --- | --- | --- | --- |
| FND-1203 | high | A real restore rehearsal fails predecessor non-disruption gates: after reverting the sibling and squashed Rust commits, the Node suite is 403/409. `test/semantic-contract.test.ts`, `test/semantic-core.test.ts`, and `test/semantic-ir-v1-1.test.ts` each still attribute `.cargo/config.toml` through the reverted history. This contradicts NFR-023's restore metric. | Repair the affected predecessor range gates so a reverted Rust range is not retained as their changed path, then rerun the restore state. |
| FND-1204 | medium | The scratch clone's Python-dependent tests could not run because its Poetry environment lacked `jsonschema`; this is an environment-provisioning failure, not a backend verdict. | Run `poetry install` in the verification clone before claiming the full-suite result. |

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
`origin/main..HEAD` but were not annexed by the Rust gate. The subsequent
revert of both temporary commits ran the Node suite and produced 403/409: three
predecessor changed-path failures plus three Python-reader invocations that
failed only because the clone had not installed `jsonschema`.
