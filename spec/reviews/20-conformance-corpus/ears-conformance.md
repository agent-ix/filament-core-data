---
id: SR-048
title: "EARS review of the semantic conformance corpus and differential oracle"
type: SpecReview
analysis: ears-conformance
scope: "US-008, FR-035..039, NFR-015, NFR-016"
review_set: all
---
# EARS conformance review

## Summary

The 110 SHALL-bearing statements of issue #20 (FR-035 through FR-039, NFR-015 and
NFR-016; US-008 read for context only) all carry an explicit subject, use no
`On`/`Upon`/`After`/`During` trigger, and state thirteen unwanted-behavior
obligations in the canonical `If … then … SHALL …` form (against three in the
issue #35 bundle reviewed by SR-043). Quire 0.31.0 (engine 0.46.0)
reports 100/100 corpus documents grammar-clean with zero `[ears:*]` findings.
The defects below come from reading each statement for pattern fit: three
responses in FR-036 that no implementer can decide as written (an incomplete
`resultState` partition, an unordered "most restrictive" classification, and a
diagnostic-code conflict between a Behavior bullet and an acceptance
criterion), a comparison rule in FR-037 that states a necessary condition and
never states the passing one, four gate actors that carry most of the
enforcement and that no requirement defines, two enumerated mega-bullets in
FR-036, a data artifact used as the actor for executable behavior, and a set of
prohibitions, version-bump rules, and acceptance criteria with no obliging
statement behind them.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-469 | high | FR-036 `The oracle SHALL return resultState success when it emits no diagnostic, invalid when it emits at least one diagnostic of severity error, and lossy when every diagnostic is a declared-loss diagnostic` is neither exhaustive nor disjoint: a verdict carrying one non-loss diagnostic of severity below `error` matches no arm, and a verdict whose diagnostics are all declared-loss and include one of severity `error` matches both `invalid` and `lossy`. `adapter-result.schema.json` and every `expected.resultState` in the corpus turn on this word, and FR-037 fails an adapter whose `resultState` differs from the oracle's, so two conforming implementations can disagree on a lossy-plus-error document and each be right. State the arms as an ordered decision with a default. | FR-036, FR-035, FR-037 |
| FND-470 | high | FR-036 `The oracle SHALL report the most restrictive classification when a document pair carries several changes` names no order over `patch`, `additive`, `conditional`, `breaking`, `unknown`, and `invalid` — whether `unknown` outranks `breaking` decides the verdict for every mixed pair and is left to the implementer, and FR-036-AC-7 exercises only the `additive` + `breaking` pair. The same statement's `an unclassifiable change as unknown` gives an undecidable response: nothing states how a change is recognised as unclassifiable, so an implementation that classifies everything it does not recognise as `unknown` and one that classifies it `breaking` both satisfy the text. Declare the total order explicitly and close the change vocabulary the classifier reads. | FR-036 |
| FND-471 | high | FR-036 Behavior obliges the oracle to decide `alias cycles as their own diagnostic distinct from an unresolved reference`, while FR-036-AC-3 requires that same oracle to return `DEPTH_LIMIT_EXCEEDED` on `a self-referential alias, a mutually recursive alias pair, and a self-referential composite relationship`. FR-035 forbids a `negative` case from yielding other than exactly one diagnostic and fails the corpus gate when it does, so the alias-cycle case cannot carry both codes and the two statements cannot both be satisfied. Decide which code an alias cycle produces and restate AC-3 for the depth limit only. | FR-036, FR-035 |
| FND-472 | medium | FR-037 `The harness SHALL treat an adapter result whose support is supported as matching only when …` states a necessary condition and no sufficient one: no statement obliges the harness to pass a result that meets all three clauses, so a harness that fails every case satisfies the requirement. In the same FR, `The harness SHALL report each divergence with … the exact source locus the oracle addressed` has no response for the divergence direction US-008-EX-2 names first — an adapter emitting a diagnostic the oracle did not — where there is no oracle locus to report, yet FR-037-AC-2 requires the report to name one for a seeded extra diagnostic. State the passing outcome, and state which locus is reported when only the adapter addressed a node. | FR-037, US-008 |
| FND-473 | medium | Most of the enforcement in this bundle is discharged by four actors no requirement defines: `the corpus gate` (FR-035, four `If … then …` statements), `the coverage gate` (FR-038, FR-039), `the threshold gate` (FR-039), and `the mutation gate` (FR-039). Nothing states what a gate is, what starts it, whether it is the harness of FR-037 or a separate command, or what its failure does to an exit code — while FR-037 does name its own subject and exit code precisely. Either bind each gate to a named command in an FR-037-style statement or restate the obligations as `the harness SHALL fail …`. | FR-035, FR-038, FR-039 |
| FND-474 | medium | FR-036 packs the whole cross-field rule set into two prose sentences: `The oracle SHALL then decide the cross-field rules the schema cannot express: …` enumerates ten rules and `The oracle SHALL decide the rules that no reader in this repository decides today: …` enumerates six more. Each rule needs its own diagnostic code, its own corpus family, and its own acceptance criterion; FR-036-AC-4 traces five of the sixteen. The archetype allows an enumerated `The oracle SHALL:` with a numbered list — use it. The second sentence also scopes the obligation by a moving external fact (`no reader in this repository decides today`), which stops being true as soon as issue #19 lands. | FR-036 |
| FND-475 | medium | The corpus is a data artifact but is written as the actor for executable behavior: `The corpus SHALL construct a case's input document by applying ops to the named base document` and `The corpus SHALL apply no transformation … other than that patch` (FR-035) describe work that FR-039 assigns to the import API's `buildInput(case)`, leaving two carriers for one obligation; `The corpus SHALL keep every case at or below a declared node budget of 64 JSON nodes` names no enforcer; and `The corpus SHALL declare a backend's thresholds before that backend is promoted` (FR-039) hangs an obligation on an external process event with no stated response, where `If a backend is promoted with no threshold row, then the threshold gate SHALL fail` is the available form. Name the acting component in each. | FR-035, FR-039 |
| FND-476 | medium | Two corpus obligations state responses nothing can decide. FR-038 `A boundary case SHALL sit on a declared limit of the construct` gives no meaning to `sit on` and presumes a declared limit for all seventeen register families, while FR-038-AC-1 requires a `boundary` case for every row — there is no declared limit for `envelope`, `provenance`, or `unknown`, so the author and the gate cannot agree on what satisfies the row. FR-039 `The corpus SHALL declare its mutation-detection score as the fraction of a fixed, committed mutation catalogue that the corpus detects` never defines `detects` in an obligation (only FR-039-AC-3 supplies `detected by at least one corpus case`), and the same FR requires `thresholds.json` to carry a `required mutation-detection score` per backend though the score it defines is a property of the corpus, not of any adapter. Define the limit per family, define detection in the Behavior statement, and say what a per-backend mutation score measures. | FR-038, FR-039 |
| FND-477 | medium | Prohibitions and version rules across the bundle state no response, and three obligations exist only as acceptance criteria. `The corpus SHALL NOT delete a case that reproduces a discovered defect after that defect is fixed` (FR-035), `The corpus SHALL NOT derive a register row from an implementation's feature list` (FR-038), FR-035-CON-2 case-id uniqueness, `The corpus manifest SHALL record corpusVersion as SemVer, where …` (FR-035), `The import API SHALL remain additive across a minor corpusVersion change` and `The corpus SHALL NOT remove an export … without a major corpusVersion bump` (FR-039) each name no gate, no failing exit, and no acceptance criterion that a wrong bump or a deleted case fails. Meanwhile FR-038-AC-6 requires that `the oracle's decision for each row's cases comes from that layer` and NFR-015-AC-4 requires disagreements to be `recorded … rather than resolved by changing the expected result`, neither of which any statement obliges, and the verdict object of FR-036 carries no field from which the deciding layer is observable. State each as `If … then … SHALL fail and name …`. | FR-035, FR-038, FR-039, NFR-015, FR-036 |
| FND-478 | low | Compound statements and non-acting subjects. NFR-015 Statement carries two SHALLs (`SHALL derive every expected result …` and `SHALL produce byte-identical oracle verdicts …`); NFR-016 Statement carries two, the second with the process subject `its introduction`, and its first (`SHALL live entirely under conformance/`) is contradicted by its own permitted list, which admits `test/`, `tests/`, `Makefile`, and `package.json`. FR-035-CON-1 makes a document the actor (`Every base document SHALL validate … and return zero oracle diagnostics` — the oracle returns them). FR-039-CON-1 states one obligation and then drops the modal (`… and the coverage gate compares a fresh generation with the committed file so a hand edit fails`). FR-036 `then it SHALL return invalid` uses a pronoun where the subject should repeat. FR-037 `The harness SHALL fail when the divergence register carries an entry that no run reproduces` quantifies over all runs where only the current run is observable. | NFR-015, NFR-016, FR-035, FR-036, FR-037, FR-039 |

## Result

| Check | Result |
|---|---|
| Explicit subject | Pass with notes (FND-475, FND-478) |
| Canonical trigger/state wording | Pass (no `On`/`Upon`/`After`/`During` triggers; one `before`-clause trigger noted in FND-475) |
| Atomic primary obligation | Fail in FR-036 Behavior (FND-474) and in both NFR Statements (FND-478); pass elsewhere |
| Modal consistency | Pass with one note (FND-478, FR-039-CON-1) |
| Decidable response | Fail (FND-469, FND-470, FND-471, FND-476) |
| Unwanted-behavior response stated | Fail (FND-472, FND-473, FND-477) |
| Tool grammar validation | Pass: 100/100 documents, zero findings |
