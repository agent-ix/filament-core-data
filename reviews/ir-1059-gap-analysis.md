---
id: SR-16466
title: "gap-analysis review of IR-1059 FCD #321"
type: SpecReview
analysis: gap-analysis
scope: "agent-ix/filament-core-data; PR #321; FR-147-AC-1..14; changed Rust, JS, fixtures, schema and spec"
review_set: subset
---

## Summary

Independent gap-analysis review of filament-core-data #321 at a292d018 against merged QSpec #468 (3e4ccfd5). Ticket IR-1059. 4 defect(s) found.

## Verdict

FAIL — findings require same-PR correction.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | high | No test binds TC-1878/AC-7 or checks tuple references through field, parameter/result, alias, sequence, map, reference and payload. The generic type-position inventory test only checks one Decimal position per kind. Add a real cross-position tuple acceptance test and bind it. | crates/semantic-ir/tests/tuple_union.rs:87-222 |
| FND-002 | medium | TC-1882 exercises only Rust generation and has no tuple-free unchanged control; AC-11 requires every target and the unchanged control. Add target-loop and control assertions. | test/tuple-union.test.ts:177-224 |
| FND-003 | medium | The test checks that no `payloadType` member appears without a `## Payloads` table, but never compares the emitted document bytes with the pre-change writer as AC-12 requires. Add a byte-equivalence control. | crates/extraction-frontend/tests/tuple_union.rs:175-225 |
| FND-004 | medium | TC-1884 checks empty positions, bad artifact id, positive order and deterministic writes, but has no unresolved position token case asserting `UNRESOLVED_TYPE_TOKEN` at its row. Add that refusal test. | crates/extraction-frontend/tests/tuple_union.rs:225-314 |

## Coverage

Plan completion: not assessed. Scope limited to changed FR-147 behavior and PR diff; pre-existing repository-wide matrix gaps are outside this PR verdict.

## Dispositions

| FND | outcome | reason |
| --- | --- | --- |
| FND-001 | fixed | The new accepted document and traversal test counts Pair references across each named position kind exactly once; TypeScript TC-1878 also checks all three reader layers. |
| FND-002 | fixed | TC-1882 now iterates all six targets, and compiler-core.test.ts asserts the tuple-free generation control succeeds. |
| FND-003 | still-open | The new TC-1883 control compares payload-free Status output from the new writer in two new contexts. A change to the old writer bytes shared by both outputs passes. Compare the emitted bytes to an independently retained pre-FR-147 baseline or an equivalent exact pre-change output oracle; keep the AC intact. |
| FND-004 | fixed | The new TC-1884 test asserts one blocking UNRESOLVED_TYPE_TOKEN at the p0 source row. |
| FND-003 | fixed | TC-1883 now checks the new lift bytes against three committed pre-FR-147 goldens from main 5ca820b0. Their SHA-256 values match that baseline and the current files; each contains a payload-free enumeration. |
