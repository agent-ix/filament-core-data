---
id: SR-16478
title: "Gap analysis of Semantic IR digest retirement in FCD PR 326"
type: SpecReview
analysis: gap-analysis
scope: "agent-ix/filament-core-data; IR-1105; PR #326 commit 09819d0; FR-048, FR-084, FR-095, schema, readers, fixtures and tests"
review_set: subset
---

## Summary

Compared the changed Semantic IR obligations with the computed Test Matrix, concrete tests, and source. Rust frontend tests bind the changed FR-095 criteria; TypeScript tests cover the corresponding compiler/schema behavior but do not appear as binders for three touched criteria in the computed matrix.

## Verdict

**CONDITIONAL** — TypeScript tests exist for the changed behavior, but the repository's computed matrix has no binders for FR-048-AC-9/10 or FR-084-AC-6. Code defects are recorded in SR-16477.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | medium | Computed matrix has no test binders for three touched digest-removal criteria despite corresponding TypeScript test comments. | spec/functional/FR-048-build-and-verify-the-lock-and-fingerprint.md:1, spec/functional/FR-084-record-provenance-and-refuse-unrepresentable-constructs.md:1 |

## Coverage

Plan completion: not assessed

- `quire matrix --scope . --format json` reports FR-048-AC-9, FR-048-AC-10, and FR-084-AC-6 as `untagged` with zero binders. FR-095-AC-3/4/11 have one Rust test binder each.
- Manual source check found real TypeScript assertions in `test/compiler-core.test.ts` for absent source/lock digest and retained lock content digest, and `test/semantic-contract.test.ts` for rejection of all three retired fields. The mechanical trace gap may be a TypeScript index limitation; it is not evidence that those tests are absent.
- Reverse check identified the still-live JSON Schema frontend and two committed IR documents in SR-16477. Optional broad semantic review was not requested.

## New findings (disposition pass 1)

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-002 | high | New `/// Trace` tags claim revised FR-048-AC-9/10 while the tests assert the opposite lock behavior or omit the required check. | test/compiler-core.test.ts:2184, test/compiler-core.test.ts:2206 |

## Dispositions

| FND | outcome | reason |
| --- | --- | --- |
| FND-001 | still-open | The new `/// Trace` syntax is indexed, but the two FR-048 bindings are false under merged PLAT-1205 #327; only FR-084-AC-6 has a valid binder. Revised FR-048-AC-9/10 need implementation and tests in the second code slice. |
| FND-002 | still-open | FR-048-AC-9 now requires absence of every package content digest, while its tagged test asserts `contentDigest` equality; FR-048-AC-10 now requires no package-lock fingerprint verification, while its tagged test only checks omitted IR.lockDigest and unchanged supplied lock bytes. Remove/reassign those two tags on #326; leave the revised ACs visibly uncovered until the second code slice implements them. |

## Current verdict

**FAIL** — the current matrix appears green for revised FR-048-AC-9/10 because two new tags are false. Remove or reassign those tags before #326 merges; second PLAT-1205 code work must implement and test the revised criteria.
