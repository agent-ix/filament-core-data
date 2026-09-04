---
id: Task-116
title: "Code review, gap analysis, three-state verification, and the PR"
type: Task
status: pending
track: D
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-115"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/US-012"
    type: references
---
# Task-116: Code review, gap analysis, three-state verification, and the PR

## Scope

Close the slice: run every gate, the code review and the gap analysis, produce the three verification numbers with their falsification and perturbation evidence, and open the pull request.

## Subtasks

- [ ] Re-run `make lint`, `make typecheck`, `make test`, `make conformance`, `poetry run pytest`, and `quire validate --scope . "spec/**/*.md"`.
- [ ] Run `/code-review` and `/gap-analysis`; apply every high and every real medium; commit the SpecReviews under `reviews/`.
- [ ] Produce the three verification numbers with the exact commands: the full suite on the branch head; the full suite in a simulated post-merge state built by squash-merging into a scratch clone, repointing `origin/main`, confirming both `git diff --no-renames --name-only origin/main...HEAD` and `git status --porcelain` are empty, and running `pnpm install --frozen-lockfile` **and** `poetry install` before the suite; and the full suite in that same clone with a real unrelated sibling commit on top that adds a file and edits a doc.
- [ ] For every guard this ticket adds, produce falsification evidence — the guard bites with the fix reverted — and perturbation evidence — it still bites after a plausible unrelated change.
- [ ] Flip the TC-745..844 rows to their measured status and regenerate the Test Execution Summary with `node scripts/test-matrix-summary.mjs`.
- [ ] Reconcile `spec/tests.md`, `conformance/coverage.json`, `docs/semantic-data-system/compiler-diagnostics.md` and `src/compiler/inventory.json` against the rebased trunk by regenerating them, never by merging them textually.
- [ ] Open the PR linking issue #22 and post the mergeable comment listing every gate and its result, the three verification numbers, the first-run divergence count, and everything left unmet with its reason.

## Deliverables

- Code-review and gap-analysis SpecReviews under `reviews/`
- The pull request and its mergeable comment

## Notes

- Merging is the owner's. The same account authors and reviews, so an approving review is impossible; the mergeable comment is the only merge signal.
- A branch-green number is structurally incapable of catching the defect class that has taken this repository's trunk red three times. Report all three numbers or none.
- Skipping `poetry install` in the scratch clone produces false failures in the rows that shell out to Python. Run both installs.
- Report what is unmet as unmet. Do not rebaseline the corpus and do not fabricate a pass.
