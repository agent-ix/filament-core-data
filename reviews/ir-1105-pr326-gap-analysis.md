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
