---
id: SR-16469
title: "spec-review/integrity review of IR-1059 FCD #321"
type: SpecReview
analysis: integrity
scope: "agent-ix/filament-core-data; PR #321; FR-147-AC-1..14; changed Rust, JS, fixtures, schema and spec"
review_set: subset
---

## Summary

Independent spec-review/integrity review of filament-core-data #321 at a292d018 against merged QSpec #468 (3e4ccfd5). Ticket IR-1059. 2 defect(s) found.

## Verdict

CONDITIONAL — findings require same-PR correction.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | medium | FR-093 says an enumeration row`s `Payload` cell lowers to `Variant.payloadType`, but FR-147 defines an independent `## Payloads` table beside `## Values`; one cross-reference must be corrected to the separate-table contract. | spec/functional/FR-093-lower-field-declarations-to-ir-fields.md:57 |
| FND-002 | medium | FR-142 calls its core `members` vocabulary closed but omits `positions` after the PR adds `positions` to the vocabulary. Add `positions` with its default presence to the authoritative member list. | spec/functional/FR-142-declare-one-construct-per-object-type.md:36 |

## Dispositions

| FND | outcome | reason |
| --- | --- | --- |
| FND-001 | fixed | FR-093 now explicitly locates Payload in the separate Payloads table beside Values. |
| FND-002 | fixed | FR-142 now lists positions among the closed core members with default forbidden. |
