---
id: SR-043
title: "EARS review of the semantic-core declaration grammar"
type: SpecReview
analysis: ears-conformance
scope: "US-007, FR-031..034, NFR-014"
review_set: all
---
# EARS conformance review

## Summary

The 55 SHALL-bearing statements of issue #35 (FR-031 through FR-034 and
NFR-014; US-007 read for context only) all carry an explicit subject, use no
`On`/`Upon`/`After`/`During` trigger, and the three unwanted-behavior
obligations that are stated use the `If … then … SHALL …` form. Quire 0.31.0
(engine 0.46.0) reports 84/84 corpus documents grammar-clean with zero
`[ears:*]` findings, with and without `--summary`. The defects below come from
reading each statement for pattern fit: one obligation whose carrier does not
exist in the grammar it constrains, three rejections that the acceptance
criteria or the story expect but no statement obliges, one family of `SHALL
document` responses whose enforcement is undecidable, two compound
Description/Statement sentences the engine does not flag, and a set of
passive or non-system subjects.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-193 | high | FR-032 `Decimal SHALL document a required precision and scale, carried on the TypeRef as a decimal extension` names a carrier FR-031 does not declare: `TypeRef { target; multiplicity?; unit? }` has no extension property, FR-031-AC-2 fixes the model inventory at nine plus four, and FR-033 seals every model with `additionalProperties: false`. FR-032-AC-2 then expects a validation failure for a `Decimal` `TypeRef` without the extension, but no `If … then … SHALL fail` statement obliges it. Two implementers would build different `TypeRef` shapes. Add the property to FR-031 and state the rejection as an unwanted-behavior obligation. | FR-031, FR-032, FR-033 |
| FND-194 | medium | FR-031 `Multiplicity … with lower at least 0 and an absent upper meaning unbounded` states the well-formed case only. US-007-EX-4 expects `upper: 0, lower: 1` to fail against the emitted `FieldDecl.json`, yet no statement says `If upper is present and less than lower, then validation SHALL fail at that declaration`, and neither TypeSpec nor a JSON Schema 2020-12 emitter expresses a cross-property ordering without a custom step FR-033 forbids. State the response and where it is enforced. | FR-031, FR-033 |
| FND-195 | medium | FR-032 `Integer SHALL document a signed 64-bit bound`, `Bytes SHALL document a maximum length that a maxLength constraint bounds`, `String SHALL document Unicode text with a maxLength bound expressed in code points`, `Timestamp SHALL document … at most nanosecond precision`: `document` is verifiable only as a table entry (FR-032-AC-1), so whether an out-of-range integer, a `Bytes` field with no `maxLength`, or a sub-nanosecond timestamp is rejected by the emitted schema, the lowering, or nothing is undecidable. Split each into a documentation obligation and, where intended, an `If … then … SHALL fail` enforcement obligation. | FR-032 |
| FND-196 | medium | FR-031 declares `SemanticId` and `UnitSymbol` `pattern-constrained` without naming a pattern, and `ClauseLanguage` admits `a namespaced <ns>:<name> string` with no syntax; FR-034 later states `The UnitSymbol pattern SHALL accept only case-sensitive UCUM unit symbols`, a grammar-definition obligation placed in the lowering requirement whose response (`only UCUM`) a regular pattern cannot decide (FR-034-AC-4 samples five strings). Name each pattern (or the curated symbol list) in FR-031 and state what the pattern actually guarantees. | FR-031, FR-034 |
| FND-197 | medium | FR-034 Description packs two SHALLs with two non-system subjects: `The specification SHALL define one lowering table …` and `a fixture SHALL prove it …`. A document and a fixture do not act; the obligations belong to the semantic-core package (`SHALL ship lowering.json`) and the fixture gate (`SHALL fail if …`). Split and name the actors. | FR-034 |
| FND-198 | medium | FR-034 `ClauseRef.clauseId values in pre/post SHALL lower to the operation's pre[]/post[], with the referenced clauses lowered to clauses[] and their text supplied by the extractor` carries three obligations and introduces `the extractor`, an actor defined by no requirement in this issue (issue #36). For the FR-006 fixture lowering of FR-034-AC-2 there is no extractor, so the `text` value is unspecified, and FR-031 `ClauseRef` carries no text to lower. Split the statement and state what `text` is when no extractor runs. | FR-034, FR-031 |
| FND-199 | low | FR-033 Description packs three obligations into one SHALL (`emit … , apply the pinned … normalization, and commit the result`). Emission and normalization are atomized in Behavior; `commit the result` appears nowhere else as an obligation and is only implied by the `check` script Output. Reduce the Description to one summary SHALL and add a Behavior bullet for the committed output. | FR-033 |
| FND-200 | low | NFR-014 Statement carries two SHALLs (`SHALL stay a small … kernel … and its introduction SHALL change no spike, …`), the second with a process subject (`its introduction`) rather than the package. The metrics table makes both measurable; split the Statement or move the non-disruption clause to a `The issue #35 change set SHALL …` form. | NFR-014 |
| FND-201 | low | Passive or object-subject statements: FR-033 `The normalization SHALL be a named, versioned post-processing step recorded against …` (recorded by whom), FR-033-CON-2 `When issue #31 is fixed upstream, the build SHALL remove …` (`When` on a one-off external event carrying a maintainer obligation, not system behavior), FR-032 Behavior bullets with enum members as actors (`Integer SHALL document …`), and FR-034 `then the table SHALL record it as loss` (a table does not record). Name the build script, the package, or the completeness check as subject. | FR-032, FR-033, FR-034 |
| FND-202 | low | FR-031 `SHALL NOT declare any module vocabulary` and FR-032 `SHALL NOT admit an Any, Unknown, or free-form scalar` are prohibitions whose response is delegated to a `kernel scope gate` (US-007-EX-3) and a `kernel scope test` (FR-032-AC-4) that no requirement defines; NFR-014-AC-1 inventories the compiled program but names no gate. State once, as an unwanted-behavior obligation, what fails when a prohibited declaration appears. | FR-031, FR-032, NFR-014 |

## Result

| Check | Result |
|---|---|
| Explicit subject | Pass with notes (FND-197, FND-200, FND-201) |
| Canonical trigger/state wording | Pass (no `On`/`Upon`/`After`/`During` triggers; one `When` on an external one-off event noted in FND-201) |
| Atomic primary obligation | Fail in Descriptions and Statement (FND-197, FND-199, FND-200) and one Behavior bullet (FND-198); pass elsewhere in Behavior |
| Modal consistency | Pass (no `MAY` carrying an obligation) |
| Unwanted-behavior response stated | Fail (FND-193, FND-194, FND-195, FND-202) |
| Tool grammar validation | Pass: 84/84 documents, zero findings |
