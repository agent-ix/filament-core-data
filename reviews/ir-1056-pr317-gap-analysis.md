---
id: SR-16462
title: "IR-1056 PR 317 gap analysis"
type: SpecReview
analysis: gap-analysis
scope: "agent-ix/filament-core-data@eafb7527; IR-1056; PR #317; spec/functional/FR-050-validate-and-normalize-the-emitted-ir.md, spec/functional/FR-097-normalize-validate-and-write-the-lifted-document.md, tests"
review_set: subset
relationships:
  - target: ix://agent-ix/filament-core-data/FR-050
    type: references
  - target: ix://agent-ix/filament-core-data/FR-097
    type: references
---

# IR-1056 PR 317 gap analysis

## Summary

Ticket: IR-1056. Reviewed PR #317 at eafb75278eb2964e21a4cc5ec0dfbf773a7eee1f against c77e0ce2c3fdfebb60d4d87ff75295ec141a12f4. Examined FR-050-AC-7, FR-097 canonical form and FR-097-AC-4/5. Review is limited to this PR's changed behavior; plan completion: not assessed.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | high | FR-050-AC-7 remains untagged in the computed Test Matrix: the test carrying the new params fingerprint assertion uses `Traces:` rather than a recognized `Trace:` tag. The assertion exists, but its criterion has no traceable test evidence. | test/compiler-core.test.ts:4225; spec/functional/FR-050-validate-and-normalize-the-emitted-ir.md:195 |

## Verdict

FAIL: the changed FR-050-AC-7 is untagged; add a recognized trace tag to the actual test and rerun the computed matrix.

## Coverage

Plan completion: not assessed. `quire matrix --scope . --format json` reports FR-050-AC-7 untagged with no binders, FR-097-AC-4 tagged by four Rust tests and FR-097-AC-5 tagged by one. Reverse source ownership is FR-050 and FR-097; no new stub. Optional semantic audit not run.

## Dispositions

Round 1, fix head 0e441e5cfa480e5f191ab8b7b24bfb134c693b84.

| FND | outcome | reason |
| --- | --- | --- |
| FND-001 | fixed | At 0e441e5c the TS test uses `/** Trace: FR-050-AC-7. */`; independent Quire matrix reports tagged by test/compiler-core.test.ts:4226. |

Round 1 verdict: PASS for this method; no new defect in the fix delta.
