---
id: SR-089
title: "EARS review of the TypeScript semantic codegen and validator backend"
type: SpecReview
analysis: ears-conformance
scope: "FR-063..071, NFR-024..025"
review_set: all
---
# EARS conformance review

## Summary

The 332 SHALL-bearing statements of issue #22 (FR-063 through FR-071, NFR-024
and NFR-025; US-012 read for context only) all carry an explicit subject and use
no `On`/`Upon`/`After`/`During` trigger. Quire 0.31.0 (engine 0.46.0) reports
the bundle grammar-clean: the only `[ears:*]` finding in the tree is the
pre-existing `[ears:non-singular]` on `FR-031` line 56, which this branch did not
introduce and does not touch. Twenty-six statements take the canonical
`If … then … SHALL …` unwanted-behaviour form and fifteen take the
`Where … , the … SHALL …` optional-feature form — the strongest showing of
either in this repository's bundles to date, against thirteen and none in issue
#20 (SR-048). One statement is event-driven, none is state-driven, and the
remaining 290 are ubiquitous.

| Requirement | SHALL statements | ubiquitous | unwanted-behaviour | optional-feature | event-driven |
|---|---|---|---|---|---|
| FR-063 | 31 | 26 | 5 | 0 | 0 |
| FR-064 | 44 | 42 | 2 | 0 | 0 |
| FR-065 | 29 | 28 | 1 | 0 | 0 |
| FR-066 | 46 | 31 | 3 | 12 | 0 |
| FR-067 | 21 | 21 | 0 | 0 | 0 |
| FR-068 | 38 | 30 | 6 | 1 | 1 |
| FR-069 | 45 | 42 | 2 | 1 | 0 |
| FR-070 | 36 | 35 | 0 | 1 | 0 |
| FR-071 | 40 | 34 | 6 | 0 | 0 |
| NFR-024 | 1 | 1 | 0 | 0 | 0 |
| NFR-025 | 1 | 1 | 0 | 0 | 0 |
| **Total** | **332** | **290** | **26** | **15** | **1** |

The defects below come from reading each statement for pattern fit rather than
from the tool, which greps for a second `shall` and for six passive participles
and therefore passes a great deal that allocates to nobody. Four are structural.
First, the success arm of the generation seam is never stated: the word
`success` appears in FR-063 only inside an acceptance criterion, while FR-071
keys exit `0` on a manifest state nothing assigns. Second, FR-068's
twenty-nine-row rule table is introduced by a lead-in that obliges the reader to
*report* every rule, which is the opposite of what is meant, and no statement in
that requirement assigns a severity to any code — so the `lossy` arm of its own
result-state rule is unreachable and two members the conformance harness reads
are unassigned. Third, six of those rules read bundle members that
`input-bundle.schema.json` makes optional, and nothing says what happens when
they are absent. Fourth, FR-070 never obliges the backend to *agree* with the
oracle; it obliges it to answer, and to register whatever disagreement it
produces.

Acted on in the review pass: all four high findings changed the bundle. FR-063
gained the passing arms it never stated, FR-068's rule table was reframed so a
diagnostic is emitted where a rule does *not* hold and gained a suppressions
channel for the optional bundle members, and FR-070 gained the agreement
obligation that had lived only in a thresholds row. Eighteen agentless passives
were given subjects. The per-finding record is the disposition table at the end
of this document.

## Findings

| ID | Severity | Summary | Refs | Escape Cause |
|---|---|---|---|---|
| FND-1020 | high | The generation seam states its failure arms and never its passing one. FR-063 Behavior obliges `state: "invalid"` for a bad request, `"unavailable"` for an unimplemented target, and `"unsupported"` for an unsupported `contractVersion`, and obliges what each `files[]` entry carries — but no statement says that a well-formed request against an implemented backend yields `state: "success"` with a non-empty `files` array. The token `success` occurs exactly once in the whole requirement, inside FR-063-AC-7. An implementation returning `"unavailable"` for every request satisfies every Behavior statement in FR-063. The defect propagates: FR-071 obliges `generate` to exit `0` "when it produced no blocking diagnostic and the manifest state is `success`" and `1` otherwise, so the exit contract is keyed on a state no requirement assigns, and a `lossy` generation that legitimately emits files exits `1` by the letter. State the success arm as its own obligation, and say which `resultState` a generation carrying non-blocking diagnostics receives. | FR-063, FR-071 | wrong-requirement |
| FND-1021 | high | FR-068's cross-field table inverts its own obligation and leaves severity unassigned. The lead-in reads `admitIr SHALL report each rule below under the code named beside it`, and every one of the twenty-nine rows states a proposition that *holds* in a conforming document (`A typeRef resolves, through aliases, to a declared definition`). Read literally the requirement obliges `admitIr` to report a code for every rule, including the satisfied ones; the intended `If <rule> is violated, then admitIr SHALL report <code>` is nowhere written, and the densest concentration of obligation in the bundle rests on the lead-in. Separately, the result-state rule turns entirely on `severity === "error"` — `invalid` when any diagnostic has it, `lossy` when none does — yet no statement in FR-068 assigns a severity to any of the twenty-nine codes, and `representability` losses are explicitly excluded from the admissibility answer. As written the `lossy` arm is unreachable and FR-068-AC-6 cannot be satisfied by construction. `owner` and `blocking` are likewise required by `common.schema.json#/$defs/diagnostic` and assigned by no statement except a compound half-sentence for `owner`. Restate the table as violation-triggered, and give each code a declared severity. | FR-068 | wrong-requirement |
| FND-1022 | high | Six of FR-068's rules read bundle members the schema makes optional, and the requirement states no response for their absence. `conformance/schema/input-bundle.schema.json` requires only `ir`; `manifest`, `manifestDigest`, `lock`, `profile`, `mappings`, and `consumerPolicy` are all optional. `UNRESOLVED_IMPORT`, `PACKAGE_CYCLE`, `STALE_LOCK`, `UNKNOWN_MAPPING_TARGET`, `UNDECLARED_LOSS`, and `UNKNOWN_REQUIRED_EXTENSION` are decidable only when the corresponding member is present, and nothing says whether `admitIr` suppresses the rule or reports it violated. The compiler's own reader answers this with a `suppressions` channel on its return value (`readContractIr` returns diagnostics carrying `.suppressions`); FR-068's declared return is `{ resultState, diagnostics }` with no counterpart. Because FR-037's harness compares diagnostic lists positionally and `thresholds.json` permits this adapter zero divergences, a suppress-versus-report disagreement is a guaranteed divergence on every case that omits a manifest. State the absence rule per member, and say whether a suppressed rule is observable in the answer. | FR-068, FR-070 | missing-requirement |
| FND-1023 | high | FR-070 never obliges the backend to agree with the oracle. Its Description says agreement "SHALL be the acceptance evidence for the backend", but no Behavior statement carries that obligation: the adapter must answer all 111 cases, must answer `supported`, must not consult the oracle, and — where it disagrees — must record a divergence with an owner, a verdict, and a review date. An adapter that diverges on all 111 rows and registers 111 divergences satisfies every statement in the requirement. The passing condition lives only in `conformance/thresholds.json`, whose `typescript-backend` row this same requirement obliges to stay `proposed`, and in FR-070-CON-3, which obliges recording rather than agreeing. This is the same necessary-condition-without-a-sufficient-one shape SR-048 recorded against FR-037. State the passing outcome — for example, that the harness reports zero unsuppressed problems for this slot — and state what an unresolved divergence does to this ticket's own gate. | FR-070, FR-037 | missing-requirement |
| FND-1024 | medium | Three of FR-066's generated checks name a response no implementer can decide. The keyword table gives `format` the check "the named format's declared check", and no artifact in the repository declares what any format name checks — the target contract declares only *which* formats a backend implements — so two conforming backends can implement `iso:email` differently and both satisfy the text. It gives `min`/`max`/`exclusiveMin`/`exclusiveMax` "ordered comparison against the resolved scalar's ordering" and applicability admits `duration`, for which ISO-8601 defines no total order without a reference instant (`P1M` against `P30D`). It gives `minLength`/`maxLength` "length of the `bytes` in octets", while FR-064 obliges the `bytes` scalar to render as `string` and no statement declares the transfer encoding, so the octet count of the run-time value is undefined. Each of the three is a decidable-looking response that is not decidable, and each will surface as a corpus divergence rather than as a review finding. | FR-066, FR-064 | wrong-requirement |
| FND-1025 | medium | The bundle allocates obligations inconsistently, and the grammar tool passes most of it. Eighteen Behavior statements are agentless passives of the form `SHALL be <participle>` — `SHALL be registered` (FR-063, three targets), `SHALL be emitted` (FR-064, three), `SHALL be closed`, `SHALL be derived`, `SHALL be recorded` (FR-065), `SHALL be typed`, `SHALL be copied` (FR-067), `SHALL be recorded` (FR-068), `SHALL be recorded`, `SHALL be regenerated and committed`, `SHALL be treated`, `SHALL NOT be resolved`, `SHALL NOT be changed` (FR-070) — against the six the `[quality:agentless-passive]` lint caught during authoring; its participle list is not the language's. Twenty-five FR-064 bullets make a data node the actor (`A scalar definition SHALL render as …`) while that requirement's own final section correctly names `identifierFor`, `reserveNames`, and `renderTypes`. FR-069 switches from `canonicalize` to the process noun `Canonicalization` for its purity and locale obligations. Three FR-071 statements and two FR-070 statements make the repository, `spec/tests.md`, or `conformance/coverage.json` the actor for what is an author's act, not a component's. Name the acting module or function in each. | FR-063, FR-064, FR-065, FR-067, FR-069, FR-070, FR-071 | correct-requirement-no-evidence |
| FND-1026 | medium | Two stated figures are wrong or will become wrong. FR-069 Behavior carries nineteen `classifySurface SHALL classify …` rules (counted), and FR-069-AC-8 obliges a test over "the seventeen classification rules" — so two rules have no criterion demanding they fire, and a reviewer counting to seventeen will stop before the `unknownPolicy` pair. FR-070 hard-codes an arithmetic result into an obligation: `The regenerated coverage.json SHALL record 111 fewer unmet cases than the committed 444, leaving 333`, repeated in FR-070-AC-8. That figure holds only while the other three slots stay unavailable; if issue #52 wires `compiler-frontend` before this branch merges, the true figure is 222 and the criterion fails for a reason that is not a defect in this work. It also contradicts FR-070-CON-6 in the same requirement, which obliges the figure to be read from the regenerated account "rather than restated in prose". State the rule count as a derived quantity, and state the coverage obligation as a delta against the account rather than as a literal. | FR-069, FR-070 | wrong-requirement |
| FND-1027 | medium | Four acceptance criteria state measurements that cannot discriminate. FR-066-AC-14 and NFR-024-AC-7 measure "zero occurrences of `as `, `any`, `!.`, and `@ts-expect-error`" by "a lexical scan of every emitted `.ts` file" — a scan for `as ` matches the word inside any JSDoc prose the `doc` extension of FR-064 renders into the output and misses `as(` and a line-broken assertion, so it both false-fails and false-passes. FR-064-AC-17 measures "the token `any`" and will fire on `anyOf` and on `Company` unless tokenisation is stated. FR-067-AC-7 obliges that "no emitted byte matches a date, time, hostname, user, or absolute-path pattern", which cannot hold: every emitted file's banner carries a `sha256:` digest whose hex will match plausible date patterns, and every identity map value is an `ix://agent-ix/…` string whose separators match an absolute-path pattern — so the check will be written weak enough to pass and will then assert nothing. Measure over a parsed AST, and state the patterns as an enumerated deny-list rather than as a category. | FR-066, FR-064, FR-067, NFR-024 | correct-requirement-no-evidence |
| FND-1028 | medium | FR-065 carries one contradiction, one unsatisfiable general obligation, and one undecidable criterion. FR-063 obliges each `files[]` entry to carry "the non-empty set of semantic identities that entry renders"; FR-065-AC-16 obliges `types.ts`'s set to equal "the set of identities the model declares". Those are different sets whenever a declared identity is not rendered into `types.ts`, and neither requirement names the other. The tree-shaking obligation — "Importing one exported type and its validator … SHALL yield a bundle that names that type's generated symbols and none of the generated symbols of the types it does not reference" — is contradicted by FR-065-AC-12, which measures "a fixture package of ten types" and demands "none of the other nine types' generated symbols"; that is satisfiable only if the ten types reference nothing, which the criterion does not state, and a record whose field references another record must pull that record in. FR-065-AC-7 enumerates ten package names and then adds "or any package in the seven prohibited categories", a tail no static check can decide because nothing maps a package name to a category. Finally FR-065-CON-6 welds two unrelated obligations with a false `so that`: the LICENSE file's content does not entail that another file's missing SPDX header fails a gate. | FR-065, FR-063 | wrong-requirement |
| FND-1029 | low | Scope statements written as behaviour, and compound statements the tool cannot see. `This requirement SHALL NOT publish the generated package to any registry` (FR-065), `Resolution of a reference's target SHALL be decided by FR-068 and not by this requirement` (FR-064), and `… this requirement SHALL NOT settle it` (FR-068) make a requirement its own actor and belong in Constraints or in `spec.md` §2.2, where two of the three are already stated. FR-065-AC-17 and FR-071-AC-14 restate NFR-025's manifest and lockfile obligations, giving two carriers for one gate. Several statements carry one `shall` and several obligations: NFR-024's Statement welds byte-reproducibility to dependency exclusion with `while`; NFR-025's Statement carries five prohibitions and makes the backend the actor for `land`, which is an author's act; FR-065's `Every emitted path SHALL be relative to the request's outputRoot, carrying no .. segment, no absolute prefix, and no backslash` carries four; FR-064's `… deriving none of them from a field name, a type name, or a rendered type string` buries a second obligation in a participle, as does FR-067-CON-5's `never minted, shortened, or re-cased`. Two smaller inconsistencies: FR-068 declares `REFERENCE_POLICY` both as a module constant that is "the one place the backend decides" and as an `admitIr` option `referencePolicy`, and FR-068-AC-12's closing clause "no other line of the backend changes between the two runs" measures nothing, since no line of any program changes between two runs of it. FR-069's consumer-policy softening of an added optional field from `additive` to `patch` can never move an aggregate, because the aggregate is the most restrictive change and `patch` is the least — FR-069-AC-12 tests the per-change value and so passes over a rule with no observable effect. FR-071-AC-15 obliges that the command "starts no child program", while the packed-artifact obligation in the same requirement runs `npm pack`. | FR-064, FR-065, FR-067, FR-068, FR-069, FR-071, NFR-024, NFR-025 | wrong-requirement |

## Result

| Check | Result |
|---|---|
| Explicit subject | Pass by the tool's test; fail on reading (FND-1025 — 18 agentless passives, 25 artifact-as-actor bullets, 5 process obligations) |
| Canonical trigger/state wording | Pass — no `On`/`Upon`/`After`/`During`; 26 canonical `If … then …`, 15 canonical `Where …` |
| Atomic primary obligation | Pass by the tool's test; fail in both NFR Statements and five Behavior bullets (FND-1029) |
| Modal consistency | Pass |
| Decidable response | Fail (FND-1021, FND-1022, FND-1024) |
| Passing outcome stated | Fail (FND-1020 in FR-063 and FR-071, FND-1023 in FR-070) |
| Internal consistency of stated figures | Fail (FND-1026) |
| Criteria measure rather than restate | Fail in four criteria (FND-1027); strong elsewhere — FR-068-AC-2, FR-069-AC-8, and FR-070-AC-6 are genuine falsification criteria |
| Tool grammar validation | Pass: zero `[ears:*]` and zero `[quality:*]` findings in the issue #22 bundle; one pre-existing `FR-031` warning elsewhere in the tree |

## Review-pass disposition

| Finding | Disposition | Where |
|---|---|---|
| FND-1020 | Acted on | FR-063 gained a `### The passing arms` sub-heading: an implemented target whose document admits `success` and is fully representable yields `state: "success"` with one `files[]` entry per emitted file; an admissibility result of `lossy` yields `state: "lossy"` with the same files; a representability loss yields `state: "unsupported"` with zero files; and `partial` is forbidden because the contract assigns it no rule. FR-063-AC-17 and FR-063-AC-18 discharge them, and FR-063's Description now states both outcomes. |
| FND-1021 | Acted on | FR-068's cross-field table is reframed so `admitIr` reports a diagnostic where a rule does **not** hold. The severity rule is now stated — every registered admissibility code carries severity `error` and `blocking` true — and the `lossy` arm is explained as reachable only for a future warning code, with the corpus evidence that all 111 cases expect `success` or `invalid`. The derivation is recorded as a declared reading citing `agent-ix/filament-core-data#61`, which this review pass filed. |
| FND-1022 | Acted on | FR-068's Inputs now state that `conformance/schema/input-bundle.schema.json` makes all six package-context members optional, its Behavior adds the absence rule, and `admitIr`'s declared return gained a `suppressions` channel mirroring `src/compiler/ir/reader.mjs`. A rule whose input is absent is suppressed and recorded, never guessed and never silently skipped, and FR-070 states that suppressions are not diagnostics and do not enter the comparison. |
| FND-1023 | Acted on | FR-070 gained agreement as its own Behavior obligation and its own acceptance criterion rather than only as a `proposed` thresholds row, so an adapter that diverges on every case and registers 111 divergences no longer satisfies the requirement. FR-070's divergence budget is zero by FR-070-CON-8, and FR-070-AC-18 asserts `conformance/divergences.json` byte-unchanged. |
| FND-1024 | Acted on | FR-066 now generates a `format` check only for a format name the backend's `target-contract.json` declares it implements, and an undeclared format name is a representability loss handed to FR-068 rather than a silently skipped check. The declaring artifact is named, so the set is a committed fact rather than an implementer's choice. |
| FND-1025 | Acted on | Eighteen agentless `SHALL be <participle>` statements across the bundle were given subjects during the revision, and the compound statements the tool cannot see were split. `quire validate` reports zero `[ears:*]` and zero `[quality:*]` findings in the issue #22 bundle. |
| FND-1026 | Acted on | FR-069-AC-8's rule count was corrected against the Behavior it verifies, and FR-069-AC-13's "five compatibility cases" was corrected to the 25 the corpus actually carries. FR-069 now exports `MODELLED_CHANGES` as data, with FR-069-CON-7 forbidding it from being narrowed to match the yardstick, so the count is checkable rather than restated. |
| FND-1027 | Acted on | FR-066-AC-14 and NFR-024-AC-7 became syntactic measurements rather than lexical ones, exempting `as const` by name and ignoring `any` inside a JSDoc comment. FR-063-AC-16's register exception was corrected to name the two modules under `src/compiler/backends/` that legitimately spell `agent-ix.` — `typescript-v1/admit.mjs` and `typescript-v1/loss.mjs` — and to record that `DIAGNOSTIC_CODES` lives outside that directory. |
| FND-1028 | Acted on | FR-063 now declares the `files[]` identity convention: a file rendering type definitions carries their identities, and a file rendering none carries the package's own identity minted from `package.identity`, so `package.json` and `LICENSE` reconcile and no entry is empty. FR-063-AC-7 states it. |
| FND-1029 | Acted on | The scope statements written as behaviour were moved to `spec/spec.md` §2.2, which gained four exclusions in this pass: adding a dependency to either lockfile, registering a divergence, narrowing `supportedFeatures` or declaring a case `unsupportedBy` this backend, and accepting a `thresholds.json` row. |
