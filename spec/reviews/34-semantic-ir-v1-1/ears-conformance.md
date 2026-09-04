---
id: SR-034
title: "EARS review of the semantic IR v1.1 revision"
type: SpecReview
analysis: ears-conformance
scope: "US-006, FR-020 (amended), FR-027..030, NFR-013"
review_set: all
---
# EARS conformance review

## Summary

The 74 SHALL/MAY-bearing statements of issue #34 (FR-020 amendments, FR-027
through FR-030, NFR-013; US-006 read for context only) all carry an explicit
subject, and every unwanted-behavior obligation uses the `If … then … SHALL
fail at … with its locus` form. Quire 0.31.0 (engine 0.46.0) reports 70/70
corpus documents grammar-clean with zero `[ears:*]` findings, with and without
`--summary`. The defects below come from reading each statement for pattern
fit: one clause-text obligation that two readers would build differently, three
compound `SHALL … and SHALL …` Description sentences the engine does not flag,
two `only when` restrictions and one `MAY` whose violating case has no stated
response, and one dialect enumeration whose closedness is implied rather than
stated.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-094 | high | FR-028 states `The IR SHALL carry clause text opaquely`, but the `clauses[]` entry shape (`identity`, `language`, `clauseId`, `sourceSpan`, `origin`) has no text property, the Outputs list none, and US-006-EX-3 says the entry carries only identity, language, and span. Two readers would disagree whether raw clause text is embedded or reachable only through `sourceSpan`; restate as `Each clauses[] entry SHALL carry <text | no text>` and align Inputs. | FR-028, US-006 |
| FND-095 | medium | FR-028 `only record kinds MAY carry relationships[] and operations[]` is a permission, yet FR-028-AC-7 expects a validation failure on a non-record. The obligation is phrased as `MAY`; state it as `If a non-record typeDefinition carries relationships[] or operations[], then IR validation SHALL fail at that type definition with its locus`. | FR-028 |
| FND-096 | medium | FR-027 `SHALL carry ordered and unique only when multiplicity.upper is absent or greater than 1` names the permitted state but not the response when the flags appear on a `1..1` field (reject, drop, or ignore). FR-027-CON-2 settles the analogous `unit` case; this one is open and changes what the validator does. Add an `If … then IR validation SHALL fail` statement or a CON row. | FR-027 |
| FND-097 | medium | FR-030 rejects only the v1 JSON Schema constant as `source.dialect` (`If a v1.1 document carries … then … SHALL fail`). Whether any other value outside `typespec`/`spec-bundle` fails is implied by the Outputs (`drawn from the frontend-dialect enumeration`) but never stated as a SHALL; add `The source.dialect value SHALL be one of …` and a matching unwanted-behavior statement. | FR-030 |
| FND-098 | medium | FR-030 Description packs two obligations with two subjects (`source.dialect SHALL identify …` and `every package-manifest target string SHALL resolve …`) into one sentence. The engine does not flag Description sentences; the Behavior bullets are atomic, so traceability holds, but the Description should be split or reduced to one summary SHALL. | FR-030 |
| FND-099 | medium | FR-027 `The unit value SHALL be a non-empty unit symbol` is only verifiable as non-empty; `unit symbol` names no syntax (UCUM, SI, free string), so a validator author must choose. State the grammar or state explicitly that `unit` is an uninterpreted non-empty string. | FR-027 |
| FND-100 | low | FR-027 and FR-029 Descriptions each carry two SHALLs (`SHALL carry … and SHALL define …`; `SHALL restrict … and SHALL type …`). Both are fully atomized in Behavior; cosmetic non-singular form not reported by the engine. | FR-027, FR-029 |
| FND-101 | low | FR-020 Description still opens `The v1 semantic IR SHALL …` while three amended Behavior bullets are scoped `In IR v1.1, …`. The prefix is a version qualifier rather than an EARS `While` state; acceptable, but the Description subject should read `The semantic IR (v1 and v1.1)` or the bullets should use `While the document declares contractVersion 1.1, …`. | FR-020 |
| FND-102 | low | NFR-013 Statement subject is `Issue #34`, a ticket rather than a system or stakeholder; the metrics table makes it measurable, but the subject should be `The semantic IR v1.1 revision SHALL …`. | NFR-013 |
| FND-103 | low | Passive or object-subject constraint rows: FR-027-CON-1 (`A v1 field … SHALL remain valid … with multiplicity derived from presence` — derived by whom), FR-028-CON-1 (`SHALL be read as empty` — read by whom), FR-029-CON-1 (`or the fixture is corrected …` compound alternative), FR-030-CON-2 (`A change … SHALL update …` — a process obligation on a commit, not a system). Name the validator or the schema as subject. | FR-027, FR-028, FR-029, FR-030 |
| FND-104 | low | FR-028 `The IR SHALL NOT parse, normalize, or typecheck clause text` and FR-027 `The IR SHALL NOT infer a unit from …` attribute behavior to the IR document rather than to the validator or frontend that would perform it; keep the prohibition, name the actor. | FR-027, FR-028 |

## Result

| Check | Result |
|---|---|
| Explicit subject | Pass with notes (FND-102, FND-103, FND-104) |
| Canonical trigger/state wording | Pass (no `On`/`Upon`/`After`/`During` triggers; version prefix noted in FND-101) |
| Atomic primary obligation | Fail in Descriptions (FND-098, FND-100); pass in Behavior |
| Modal consistency | Fail (FND-095 `MAY` carrying a validation obligation) |
| Unwanted-behavior response stated | Fail (FND-094, FND-096, FND-097) |
| Tool grammar validation | Pass: 70/70 documents, zero findings |
