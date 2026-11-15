---
id: SR-16505
title: QSL-2253 PR 360 spec-review
type: SpecReview
analysis: base
scope: "agent-ix/filament-core-data@cfd8b6dcbaea63a514a85b0f67e3fdfff7cd5e58; PR 360; spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md, spec/functional/FR-147-carry-tuple-value-types-and-union-variant-payloads.md, spec/tests.md, docs/semantic-data-system/contracts-v1.md"
review_set: subset
relationships:
  - target: ix://agent-ix/filament-core-data/FR-147
    type: references
  - target: ix://agent-ix/filament-core-data/FR-146
    type: references
---

## Summary

Ticket: QSL-2253. Spec review of the FR-146, FR-147, spec/tests.md and
contracts-v1.md delta, checked against filament-specification origin/main
(c143e2b5; the local checkout is one commit behind, so the file was read with
`git show origin/main:`). FSpec FR-322 "Clock positions and payloads" (line
2302) admits a tuple position `typeRef` or a variant `payloadType` that is Clock
or an alias of it, as a clock member with no type node. FR-154-AC-25 accepts a
Clock payload, and FR-154's diagnostic table says a Clock variant payload or
tuple position raises no `INVALID_CLOCK_MEMBER`.

FR-146 (Construct table, Inputs, the reader SHALL, AC-2) and FR-147 (reader
rules, frontend note, the STD-528 note, AC-6, AC-15) match that text. Every
STD-528 "pending" reference is gone. The TC-1877 and AC-6 amendment is honest:
the Clock clause was taken out of both, and that case moved to AC-15 / TC-1886,
with the `clock-position` vector re-tagged to match. The AC-15 rewrite flips the
verdict, keeps the alias, unit and nullary controls, and adds normalization.
contracts-v1.md and diagnostic-codes.json drop "or typed Clock" from
`INVALID_TUPLE_POSITION` and say a Clock position is admitted.

## Verdict

PASS with one low finding.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | low | FR-146-AC-2 now lists a tuple position `typeRef` among the places Clock is accepted, but TC-1843 (its test case row) still lists only parameter, result, alias target, items, values and variant payload, so the TC row no longer matches its AC. | spec/tests.md:1354, spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md:742 |

Plan completion: not assessed

## Dispositions

| FND | outcome | reason |
| --- | --- | --- |
| FND-001 | fixed | ace34cc6: TC-1843 now reads "sequence items, map values, tuple position and variant payload is accepted", matching FR-146-AC-2. |
