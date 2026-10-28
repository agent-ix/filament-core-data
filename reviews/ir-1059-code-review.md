---
id: SR-16465
title: "code-review review of IR-1059 FCD #321"
type: SpecReview
analysis: code-review
scope: "agent-ix/filament-core-data; PR #321; FR-147-AC-1..14; changed Rust, JS, fixtures, schema and spec"
review_set: subset
---

## Summary

Independent code-review review of filament-core-data #321 at a292d018 against merged QSpec #468 (3e4ccfd5). Ticket IR-1059. 1 defect(s) found.

## Verdict

CONDITIONAL — findings require same-PR correction.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | medium | Blank `Payload` rows are discarded before `stray_payloads` checks repeated values; a second row for the same value with an empty payload is silently admitted instead of `ARTIFACT_NOT_LOWERED`. Preserve rows for duplicate detection, then interpret blank payload as nullary. | crates/extraction-frontend/src/enumeration.rs:283-293 |

## Dispositions

| FND | outcome | reason |
| --- | --- | --- |
| FND-001 | fixed | The duplicate check now sees blank payload rows; the new TC-1883 case asserts the later blank duplicate row is refused. |
