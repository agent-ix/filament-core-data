---
id: SR-188
title: "Review — baseline 1.2 model and ecosystem contracts (PR #97)"
type: SpecReview
analysis: code-review
scope: "docs/semantic-data-system/baseline-1-2.md, docs/semantic-data-system/contracts-v1.md, docs/semantic-data-system/index.md, spec/spec.md, spec/log.md, spec/tests.md, spec/functional/FR-100..FR-105, spec/reviews/95-model-ecosystem/**, plan/Plan-016-baseline-1-2-producer-boundary/**; id allocation checked against every local and remote branch"
review_set: subset
---

# Review — baseline 1.2 model and ecosystem contracts (PR #97)

## Summary

Reviewed PR #97 (`spec/95-model-baseline`) at `6259d3a`, 26 files, +1198/−3,
against issue #95's decision record and the repository's own allocation and
traceability rules. The contract itself is coherent and the matrix arithmetic is
correct — the Test Execution Summary was regenerated, unlike PR #96's. The
blocking problem is identifier allocation: FR-100, FR-101 and TC-1355..TC-1369
are already allocated on four parallel branches, including the `feature/93-ir-v1-2`
checkpoint this PR names by SHA as the work it parks.

## Verdict

**FAIL** — two high findings: the requirement and test-case ranges collide with
live parallel branches, one of which this contribution explicitly depends on.

## Gates

Run at `6259d3a`:

| Gate | Result |
| --- | --- |
| `quire validate` over FR-100..FR-105, the eight `95-model-ecosystem` reviews and Plan-016 | pass — 0 findings (advisories only) |
| `node scripts/test-matrix-summary.mjs --check` | pass — summary regenerated (1220 rows, 902/318) |
| `git diff --check origin/main...6259d3a` | pass |
| Every new AC/CON has at least one matrix row (Test Matrix Rule 1) | pass — 32/32 |
| Branch-wide id allocation scan (FR, TC, SR, FND, Plan, Task) | **FAIL** — see FND-1670..FND-1672 |

Base confirmed: `6259d3a` descends from `origin/main` at `bb1bc4d` and contains
no commit of `spec/87-shared-identity-rule`, so the PR body's "depends on #87
PR #96" is a stated ordering, not a merged prerequisite.

## Findings

| ID | Severity | Summary | Refs | Escape Cause |
| --- | --- | --- | --- | --- |
| FND-1670 | high | FR-100 and FR-101 are already allocated to different requirements on two unmerged branches: `feature/85-json-schema-backend` holds `FR-100-map-semantic-ir-to-json-schema.md` and `feature/93-ir-v1-2` holds `FR-101-add-semantic-ir-v1-2-any-and-authored-presence.md` at `c95dff8`, the exact SHA Plan-016 names as the preserved #93 checkpoint | spec/functional/FR-100-author-field-presence-independently.md:2, spec/functional/FR-101-declare-first-class-relationship-contracts.md:2, plan/Plan-016-baseline-1-2-producer-boundary/plan.md:20 | implementation-bug-despite-evidence |
| FND-1671 | high | TC-1355..TC-1369 are already allocated: `feature/85-json-schema-backend` uses TC-1355..TC-1367 and `feature/93-ir-v1-2`, `fix/88-90-backend-acceptance` and `chore/92-retire-changed-path-gates` each use TC-1355..TC-1359, all for unrelated kernel-scalar, TypeScript-generation and `NAME_COLLISION` tests; the matrix note claims the range was reserved "after checking the current matrix", which is the check the matrix's own issue #36 preamble says is insufficient | spec/tests.md:102, spec/tests.md:1529-1543, spec/tests.md:92-94 | implementation-bug-despite-evidence |
| FND-1672 | medium | SR-179..SR-186 and FND-1605..FND-1612 are already allocated: `spec/87-shared-identity-rule` holds SR-179..SR-182 and FND-1590..FND-1606, and `fix/88-90-backend-acceptance` holds SR-183, SR-187 and FND-1620..FND-1626/FND-1660..FND-1669, so five SR ids and two FND ids are reused | spec/reviews/95-model-ecosystem/base.md:2, spec/reviews/95-model-ecosystem/failure-domain.md:2, spec/reviews/95-model-ecosystem/integrity.md:2 | implementation-bug-despite-evidence |
| FND-1673 | medium | `spec/spec.md` gained a second `Functional` row in the Authority table instead of amending the existing one, so the document simultaneously states the functional range is FR-001..FR-099 and FR-001..FR-105 | spec/spec.md:428, spec/spec.md:430 | wrong-requirement |
| FND-1674 | medium | `IN01` and `IN02` are the declared boundary owner for FR-104, FR-105 and six matrix rows but are defined nowhere in `spec/`, `docs/` or `plan/`; `spec/tests.md` also ships the status cells "D/F/E correspondence" and "A/D consumer boundary", whose single-letter actors have no repository definition either | spec/tests.md:279, spec/tests.md:280, spec/tests.md:1534, spec/tests.md:1536 | missing-requirement |
| FND-1675 | medium | Six of the eight `95-model-ecosystem` review artifacts scope only FR-102..FR-105, so FR-100 and FR-101 — the two requirements that answer issue #95's stated decision — received no EARS, evidence, failure-domain, integrity, risk-complexity or scope-boundary analysis, while all eight return PASS with a single "No defect found" row | spec/reviews/95-model-ecosystem/ears-conformance.md:6, spec/reviews/95-model-ecosystem/integrity.md:6, spec/reviews/95-model-ecosystem/evidence.md:6 | correct-requirement-no-evidence |
| FND-1676 | medium | The contract declares `default` as one of the four independent field axes with a closed four-value set, and `multiplicity` as carrying `ordered?`/`unique?`, but no behaviour clause, constraint, acceptance criterion or matrix row binds any of them; FR-100 names `default` only in its Inputs list | docs/semantic-data-system/baseline-1-2.md:18, docs/semantic-data-system/baseline-1-2.md:16, spec/functional/FR-100-author-field-presence-independently.md:22 | missing-requirement |
| FND-1677 | medium | The StR-001 coverage row still names FR-001..FR-099 and TC-1200..1349, and the US-006 and US-015 coverage rows are unchanged, so six new FRs declare `implements` against two user stories whose coverage rows list neither them nor TC-1355..TC-1369 | spec/tests.md:125, spec/tests.md:140, spec/tests.md:165-170 | wrong-requirement |
| FND-1678 | low | FR-101..FR-105 omit `## Inputs` and `## Outputs`, which 87 of the 99 existing FRs carry and which FR-100 in this same PR carries; for a contribution whose purpose is naming a producer/consumer boundary, Outputs is the section that boundary belongs in | spec/functional/FR-101-declare-first-class-relationship-contracts.md:16, spec/functional/FR-104-lock-ecosystem-inventory-and-bindings.md:20 | missing-requirement |
| FND-1679 | low | The contract's distinguishing case 2 turns on a "time-29 witness" that nothing defines, and Plan-016's test plan assigns TC-1358..TC-1361 to Task-140 "producer schema" while its own dependency graph places FR-102/FR-103 after Task-140 | docs/semantic-data-system/baseline-1-2.md:310, plan/Plan-016-baseline-1-2-producer-boundary/plan.md:38, plan/Plan-016-baseline-1-2-producer-boundary/plan.md:31 | wrong-requirement |

## Verification performed

**FND-1670 and FND-1671 — enumerated, not inferred.** Every local and remote
ref was scanned for `FR-1NN` filenames and `TC-13NN` matrix rows:

```
feature/85-json-schema-backend: FR-100          TC-1355..TC-1367
feature/93-ir-v1-2:                     FR-101  TC-1355..TC-1359
fix/88-90-backend-acceptance:                   TC-1355..TC-1359
chore/92-retire-changed-path-gates:             TC-1355..TC-1359
spec/95-model-baseline:  FR-100..FR-105         TC-1355..TC-1369
```

Neither colliding branch is merged into `main`. The contents are unrelated:
`feature/85`'s FR-100 is "Map semantic IR v1.1 definitions to JSON Schema
2020-12", `feature/93`'s FR-101 is "Add semantic IR v1.2 Any scalar and authored
presence", and their TC-1355..TC-1359 rows are kernel-scalar admission,
TypeScript generation and `NAME_COLLISION` tests.

The same scan over `plan/` shows Plan-016 and Task-140..142 are collision-free —
`spec/87-shared-identity-rule` ends at Plan-015/Task-139 and this PR starts at
Plan-016/Task-140. So the branch-wide check was performed for plan identifiers
and not for requirement, test-case or review identifiers. `spec/tests.md:92-94`
states the rule that was needed: ids are reserved "as an exclusive range against
`main` … because PR #84 is open in parallel and 'next free' is not a fact either
branch can establish."

**FND-1675 — the scope lines.** `base.md` and `dependency.md` name FR-100..FR-105;
`ears-conformance.md`, `evidence.md`, `failure-domain.md`, `integrity.md`,
`risk-complexity.md` and `scope-boundary.md` all scope `FR-102..FR-105`. The
integrity analysis concludes "no identity or truth-domain collapse remains in the
reviewed requirements" — which is consistent with its scope, and is why the
FR-100/FR-101 identifier collision was not caught by the review pass.

**Matrix arithmetic — correct.** 15 new rows (5 Unit, 10 Integration) take the
totals from 1205/902/303 to 1220/902/318, and
`node scripts/test-matrix-summary.mjs --check` agrees byte for byte. This is the
gate PR #96 left red; #97 regenerated it.

## Notes

- The contract document is internally consistent on the points it does specify:
  presence never derived from `multiplicity.lower`; three clock families each with
  a stated half-open coverage form and no invented timestamp; a digest triple with
  a named domain and an explicit refusal for cross-domain substitution; and a
  canonical-JSON numeric domain that makes `1`, `1.0` and `1e0` one value while
  keeping `9007199254740992` and `9007199254740993` distinct.
- FR-102-AC-3 is a single criterion asserting two different dispositions
  (decisive result retained versus unavailable returned). It is testable as
  written and TC-1359 covers both halves, so this is recorded rather than filed.
- Combining this branch with `spec/87-shared-identity-rule` conflicts textually
  in three files (`docs/semantic-data-system/contracts-v1.md`, `spec/log.md`,
  `spec/tests.md`). That is ordinary for parallel spec work, but whichever merges
  second must regenerate the Test Execution Summary again.
- Plan-016's admission gate ("not implementation authorization … blocked on
  acceptance") is recorded on issue #95 by the owner, so it is read here as an
  owner-set condition rather than an agent-authored hold.
- FND-1670..FND-1672 are renumbering, not rework: no contract text changes.
