---
id: SR-198
title: "Second re-review — baseline 1.2 model and ecosystem contracts (PR #97, range records)"
type: SpecReview
analysis: code-review
scope: "spec/tests.md, spec/reviews/95-model-ecosystem/dependency.md; against SR-197 FND-1688 and FND-1689, with a branch-wide range and identifier rescan"
review_set: subset
---

# Second re-review — baseline 1.2 model and ecosystem contracts (PR #97, range records)

## Summary

Re-reviewed PR #97 at `1ea504e` (one commit over SR-197's head, four text edits
across two files). Both SR-197 findings are fixed: the three inverted ranges now
read low-to-high and the stakeholder row carries the full reserved range. The new
US-015 coverage row that closes the second half of FND-1689 names a test-case
range three cases wider than the requirement it cites, so the user-story rows now
disagree with the functional-requirement rows in the same document.

## Verdict

**CONDITIONAL** — no high and no medium findings remain. One low: the two user
story coverage rows touching this contribution each attribute test cases across
the story boundary that the FR rows and the FRs' own `implements` edges draw.

## Gates

Run at `1ea504e`:

| Gate | Result |
| --- | --- |
| `quire validate` over FR-106..FR-111, `spec/tests.md`, `spec/spec.md`, the eight `95-model-ecosystem` reviews, Plan-016 and the three `reviews/` artifacts | pass — exit 0, advisories only (`DuplicateArchetype`, `DuplicateInverseEdge`) |
| `node scripts/test-matrix-summary.mjs --check` | pass — 1220 rows, 902 passed, 0 failed, 318 blocked, 100% mapped |
| `git diff --check origin/main...1ea504e` | pass |
| Ascending-order scan of every `X..Y` identifier range in all 28 changed files | pass — the only inverted ranges left are the quotations inside SR-197 and the pre-existing `TC-635..337` |
| `gh pr view 97` | `MERGEABLE`; `mergeStateStatus: BLOCKED` on `REVIEW_REQUIRED` alone |

## SR-197 disposition

| SR-197 | Severity | Disposition |
| --- | --- | --- |
| FND-1688 | medium | **fixed** — `spec/tests.md:103` now reserves TC-1373..1387 and records that the check was made "after checking every live branch", `:105` covers FR-106..111, and `dependency.md:35` names FR-107..109 |
| FND-1689 | low | **fixed, with a new inaccuracy** — `spec/tests.md:125` names TC-1373..1387 in both the trace and the status cell, and a US-015 row for FR-109 was added at `:170`; see FND-1690 for the range that row names |

## Findings

| ID | Severity | Summary | Refs | Escape Cause |
| --- | --- | --- | --- | --- |
| FND-1690 | low | The two user-story coverage rows cross the story boundary in opposite directions: the new US-015 row cites FR-109 but names TC-1376..TC-1381, three of which bind FR-108 alone, while the US-006 row names all of FR-106..FR-111 and TC-1373..TC-1387 although FR-109 is the one member that declares `implements US-015` | spec/tests.md:170, spec/tests.md:140, spec/tests.md:278-279 | wrong-requirement |

## Verification performed

**FND-1688 — rescanned, not read.** Every `X..Y` identifier range in all 28
files the branch changes was parsed and checked for ascending order. Three
inverted ranges remain in `reviews/2026-09-10-95-model-baseline-rereview.md`
(lines 57 and 82-84), which are SR-197 quoting the defect, and one in
`spec/tests.md:301` (`TC-635..337`), which `git grep` finds at
`origin/main:spec/tests.md:286` and is outside this contribution. No inverted
range survives in any contract, requirement, matrix or review artifact this PR
authors.

**FND-1689, first half — fixed.** `spec/tests.md:125` names `TC-1373..TC-1387`
in the Test/Validation cell and `TC-1373..1387 planned on #95` in the Coverage
Status cell; the range no longer stops at TC-1384.

**FND-1690 — the new row's range.** `spec/tests.md:170` reads
`| US-015 | Provisional ecosystem configuration boundary implemented by FR-109 | TC-1376..TC-1381 |`.
The Functional Requirement Coverage table later in the same document binds FR-108 to
TC-1376..TC-1378 and FR-109 to TC-1379..TC-1381, and the AC column of each of
TC-1376, TC-1377 and TC-1378 names only `FR-108-AC-*` and `FR-108-CON-*`. FR-108
declares `implements US-006`, not US-015, so the row attributes three
population-binding controls to the configuration requirement and to the wrong
story. Symmetrically, `spec/tests.md:140` extends the US-006 row to `provisional
FR-106..FR-111` and `TC-1373..TC-1387`, which pulls in FR-109 and its three
cases; FR-109 is the only one of the six whose `implements` edge targets US-015.
Five of the six FRs target US-006 and one targets US-015, so `FR-106..FR-108`
plus `FR-110..FR-111` with `TC-1373..TC-1378` and `TC-1382..TC-1387` is the
US-006 half and `TC-1379..TC-1381` the US-015 half.

The US-006 half of this was present at `bd867d3`; SR-197 dispositioned FND-1677
as partly fixed on the strength of the row's widening without checking which
story each widened FR implements, so half of FND-1690 is a miss in SR-197 rather
than a regression in `1ea504e`.

## Notes

- `spec/tests.md:103` now records the allocation method as well as the range
  ("after checking every live branch for those unused ids"), which is what the
  matrix preamble asks a contribution to state.
- Nothing in this commit touches contract, requirement or acceptance-criterion
  text. The Test Execution Summary is byte-identical to `bd867d3`'s, and
  `--check` confirms it still equals the computed table.
- Merge block unchanged: this account authors and reviews these PRs, so
  `APPROVE` is refused and a `COMMENT` review cannot satisfy `REVIEW_REQUIRED`.
  Release of the block is the repository owner's action, not a review outcome.
