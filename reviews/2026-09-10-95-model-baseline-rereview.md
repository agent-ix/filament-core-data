---
id: SR-197
title: "Re-review — baseline 1.2 model and ecosystem contracts (PR #97, remediation)"
type: SpecReview
analysis: code-review
scope: "spec/functional/FR-106..FR-111, spec/spec.md, spec/tests.md, docs/semantic-data-system/baseline-1-2.md, spec/reviews/95-model-ecosystem/**, plan/Plan-016-baseline-1-2-producer-boundary/**; against SR-188 FND-1670..FND-1679, with a fresh branch-wide identifier scan"
review_set: subset
---

# Re-review — baseline 1.2 model and ecosystem contracts (PR #97, remediation)

## Summary

Re-reviewed PR #97 at `bd867d3` (one commit over SR-188's head), re-running the
branch-wide identifier scan rather than reading the renumbering diff. Both SR-188
high findings are fixed and six of the eight remaining findings are fixed
outright. The renumbering pass left three identifier ranges inverted, one of them
in the matrix sentence that records the reservation itself, and the stakeholder
and US-015 coverage rows are still short of the new range.

## Verdict

**CONDITIONAL** — no high findings remain. One medium: three ranges now read
high-to-low, so the matrix's own record of the reserved range names an empty set.

## Gates

Run at `bd867d3`:

| Gate | Result |
| --- | --- |
| `quire validate` over FR-106..FR-111, the eight `95-model-ecosystem` reviews, Plan-016 and SR-188 | pass — 0 findings |
| `node scripts/test-matrix-summary.mjs --check` | pass — committed summary equals the computed one |
| `git diff --check origin/main...bd867d3` | pass |
| Every new AC/CON has at least one matrix row (Rule 1) | pass — 34/34, including the new FR-106-AC-5 |
| Branch-wide identifier scan (FR, TC, SR, FND, Plan, Task) | pass — see below |

## SR-188 disposition

| SR-188 | Severity | Disposition |
| --- | --- | --- |
| FND-1670 | high | **fixed** — FR-106..FR-111; no other branch allocates any of them |
| FND-1671 | high | **fixed** — TC-1373..TC-1387, above every branch's high-water mark (TC-1367 on `feature/85-json-schema-backend`) |
| FND-1672 | medium | **fixed** — SR-189..SR-196 and FND-1680..FND-1687, clear of SR-187/FND-1669 on `fix/88-90-backend-acceptance`; no duplicate SR id on the branch |
| FND-1673 | medium | **fixed** — the appended row is gone; the last Authority triple's Functional row now reads FR-001..FR-111 |
| FND-1674 | medium | **fixed** — `baseline-1-2.md:285` and `:291` define IN01 and IN02; the undefined "D/F/E" and "A/D" status cells are gone from `spec/tests.md` |
| FND-1675 | medium | **fixed** — all eight review artifacts now scope `FR-106..FR-111`; FR-106 and FR-107 are no longer excluded |
| FND-1676 | medium | **fixed** — FR-106 gained behaviour clauses for `ordered`, `unique` and `default`, CON-2 was widened to name all three, and the new AC-5 is bound to TC-1373 |
| FND-1677 | medium | **partly fixed** — the US-006 row now names FR-106..FR-111 and TC-1373..TC-1387; see FND-1689 for what is still short |
| FND-1678 | low | **fixed** — all six FRs carry `## Inputs` and `## Outputs` |
| FND-1679 | low | **fixed** — "time-29" is gone, and Plan-016's dependency graph no longer stages FR acceptance against a task whose evidence precedes it |

## Findings

| ID | Severity | Summary | Refs | Escape Cause |
| --- | --- | --- | --- | --- |
| FND-1688 | medium | The renumbering pass left three ranges reading high-to-low: the matrix note reserves "TC-1373..1369" and says the rows cover "FR-106..105", and the dependency review names "FR-107..103"; the first is the document's own record of the reserved range and now names an empty set | spec/tests.md:103, spec/tests.md:105, spec/reviews/95-model-ecosystem/dependency.md:35 | implementation-bug-despite-evidence |
| FND-1689 | low | The StR-001 coverage row names TC-1373..1384, omitting TC-1385..TC-1387, and FR-109 declares `implements US-015` while no US-015 coverage row names FR-109 or any of its test cases | spec/tests.md:125, spec/tests.md:165-170, spec/functional/FR-109-declare-ecosystem-configuration-contracts.md:6 | wrong-requirement |

## Verification performed

**FND-1670, FND-1671, FND-1672 — rescanned, not read.** Every local and remote
ref was enumerated again:

```
feature/85-json-schema-backend      FR-100                  TCmax 1367
feature/93-ir-v1-2                          FR-101          TCmax 1359
fix/88-90-backend-acceptance                                TCmax 1359   SRmax 187   FNDmax 1669
spec/87-shared-identity-rule                                             SRmax 182   FNDmax 1606
spec/95-model-baseline              FR-106..FR-111          TC-1373..1387  SR-189..196  FND-1680..1687
```

No FR, TC, SR or FND id of this contribution appears on any other ref, and no SR
id repeats within the branch. A repository-wide search for the vacated
`FR-100`..`FR-105` and `TC-1355`..`TC-1372` spellings returns nothing outside
SR-188's own findings table, which is correct for a historical record.

**FND-1688 — the inverted ranges.** Found by checking every `X..Y` identifier
range in the changed artifacts for ascending order:

```
spec/tests.md:103                       reserves TC-1373..1369      (should be ..1387)
spec/tests.md:105                       They cover FR-106..105's    (should be ..111)
spec/reviews/.../dependency.md:35       FR-107..103 identities      (should be ..109)
```

`spec/tests.md:103` is the sentence that documents the reservation this
remediation exists to make, so the allocation record reads as an empty range
while the rows beneath it are correct. The one other inverted range in the
repository, `TC-635..337` in `plan/Plan-009`, is pre-existing on `main` and
outside this contribution.

**FND-1676 — verified at the criterion, not the prose.** FR-106 line 34 requires
each declared `ordered` and `unique` value to be retained, line 36 requires the
declared default to be absent or one admissible value with a named adapter loss,
CON-2 names default/ordered/unique alongside absent/null/invalid/unavailable, and
AC-5 requires two otherwise-equal fields differing only in those three to remain
distinct. TC-1373 carries AC-5. The four-value `default` axis is no longer
declared with nothing behind it.

## Notes

- The eight `95-model-ecosystem` artifacts still return PASS with a single "No
  defect found" row each, now over the full FR-106..FR-111 scope. Widening the
  scope did not surface the three inverted ranges, one of which is in
  `dependency.md` itself — worth recording about the review pass rather than
  about the contract.
- Amending the last Authority triple's Functional row from FR-099 to FR-111
  resolves the contradiction, but it also overwrites the range that recorded the
  issue #36 delivery. The table is cumulative by concern rather than a delivery
  log, and `spec/spec.md` already names the baseline as the thirteenth delivery
  against four triples, so this is recorded, not filed.
- FND-1688 and FND-1689 are four text edits and change no contract text.
