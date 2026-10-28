---
id: SR-16467
title: "spec-review/base review of IR-1059 FCD #321"
type: SpecReview
analysis: base
scope: "agent-ix/filament-core-data; PR #321; FR-147-AC-1..14; changed Rust, JS, fixtures, schema and spec"
review_set: subset
---

## Summary

Independent spec-review/base review of filament-core-data #321 at a292d018 against merged QSpec #468 (3e4ccfd5). Ticket IR-1059. 2 defect(s) found.

## Verdict

CONDITIONAL — findings require same-PR correction.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | medium | TC-1883 still describes a `Payload` column in `## Values` and Quantity<u>, while FR-147 requires a separate `## Payloads` table and its AC-12 does not cover Quantity. Align the test-case row with the authoritative AC without narrowing the AC. | spec/tests.md:1405 |
| FND-002 | medium | TC-1884 says a Clock position yields `ARTIFACT_NOT_LOWERED`, while FR-147 delegates Clock refusal to the reader as `INVALID_TUPLE_POSITION`; align the test-case row with the AC and behavior. | spec/tests.md:1406 |

## Dispositions

| FND | outcome | reason |
| --- | --- | --- |
| FND-001 | fixed | TC-1883 now names the separate Payloads table. Quantity<u> is an additional token case already required by FR-147 behavior, so its retention is consistent. |
| FND-002 | fixed | TC-1884 now names the unresolved-token outcome and no longer assigns Clock to ARTIFACT_NOT_LOWERED. |
