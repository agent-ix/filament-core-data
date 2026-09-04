---
id: SR-047
title: "Base review of the semantic conformance corpus and differential oracle"
type: SpecReview
analysis: base
scope: "US-008, FR-035..039, NFR-015, NFR-016, spec/tests.md TC-280..319 and TC-398..419"
review_set: all
---
# Base specification review

## Summary

The issue #20 specification adds one user story, five functional requirements,
two non-functional requirements, and 62 test cases for a versioned semantic
conformance corpus, an independent JSON-level oracle, a differential harness
with a declared adapter registry and divergence register, coverage accounting
with promotion thresholds, and a downstream import API. All 74 acceptance
criteria and named constraints map to at least one test case; no test case
traces to an absent criterion; `quire validate --scope . "spec/**/*.md"` reports
zero errors and zero grammar findings. The bundle is ready for the seven
analyses.

Ids were allocated against `main` at 8425a14 after `git fetch --all --prune`:
the highest allocated ids anywhere were US-007, FR-034, NFR-014, TC-279, SR-046,
FND-205, ERR-050, EC-037, Plan-006, and Task-047, and the only live remote
branches were `main`, `audit/10-filament-contract-census`, and
`spike/4-typespec-feasibility`. Issue #27, which runs in parallel, had allocated
no requirement id at that point.

## Checklist Results

| Area | Result | Evidence |
|---|---|---|
| ID format and uniqueness | Pass | US-008, FR-035..039, NFR-015..016, TC-280..319 and TC-398..419, SR-047..054, FND-465..341, ERR-051..065, EC-038..048 continue the sequences; no remote branch allocates beyond them |
| User story quality | Pass | US-008 has the story shape, five acceptance examples, options, constraints, dependencies, priority and risk, traceability |
| Functional requirement quality | Pass | Each FR carries Inputs, Outputs, EARS-shaped single-obligation Behavior bullets, a Constraints table with validation, measurable ACs, and Dependencies |
| Non-functional requirement quality | Pass | NFR-015 and NFR-016 each carry a Statement, Scope, Rationale, a Measurement table with numeric targets, Verification, and an Acceptance Criteria table |
| Coverage (Rule 1) | Pass | 74/74 criteria → TC-280..319 and TC-398..419 (see the traceability tables in `spec/tests.md`) |
| Option permutation (Rule 2) | Pass | presence and nullability, adapter answer against declaration, adapter pointer scheme, contract version against node presence, compatibility change against consumer policy |
| Constraint boundary (Rule 3) | Pass | 64/65-node `ops` budget, one/two seeded violations, depth 256/257, future/past `reviewBy`, four/three case classes, full/partial mutation detection |
| Error path (Rule 4) | Pass | ERR-051..065 |
| State transition (Rule 5) | Pass | adapter `unavailable` → `available`, divergence open → fixed, corpus minor versus major bump, package export add/remove |
| Edge case (Rule 6) | Pass | EC-038..048, including "every implementation wrong in the same direction", "expectations regenerated from the implementation under test", "an adapter answers from a canned table", and "a base edit re-aims every positional patch" |
| Cross-referencing | Pass | FR-035..039 `implements` US-008; NFR-015 and NFR-016 `constrain` US-008 and the FRs they bound; every relative body link resolves |
| Master spec alignment | Pass | `spec/spec.md` §2.1 gains the corpus and oracle scope; §2.2 excludes implementing or repairing any judged backend, publishing the corpus or enlarging the package surface, and cross-language serialization parity |

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-465 | low | US-008 carries illustrative acceptance examples rather than an AC table, per the installed US archetype; this repeats the disposition of FND-030, FND-086, and FND-203. EX-1..5 map to TC-282, TC-303, TC-305, TC-304, and TC-318. | US-008 |
| FND-466 | medium | FR-038-AC-1 requires four case classes for every one of the twenty-two register families. The requirement is right, but nothing in the bundle bounds the authoring cost, and a corpus that becomes expensive to extend is the one that gets extended by regenerating expectations — the exact failure NFR-015 exists to prevent. The shared-base-plus-patch case form of FR-035 and the justified `notApplicable` escape are the mitigations; the plan states the per-case budget they buy. | FR-038-AC-1, FR-035, NFR-015 |
| FND-467 | medium | FR-036 makes the oracle decide six rules no reader in this repository decides at this branch's merge base. Where the oracle and a merged reader disagree, the disagreement is recorded, but nothing said who adjudicates it. Acted on in the review pass: divergence entries now carry `owner` and a `verdict`, and a disagreement with a merged non-adapter artifact goes to `conformance/contract-gaps.json`. | FR-036, FR-037, NFR-015-AC-4 |
| FND-468 | low | TC-301 (non-bundle input) traces to FR-036-AC-1 rather than to a dedicated criterion, because the behaviour is stated as an unwanted-behaviour bullet and its expectation is carried by a corpus case that AC-1 covers wholesale. Acceptable, but the trace is indirect. | TC-301, FR-036 |

## Gate Result

| Gate | Result | Evidence |
|---|---|---|
| IDs, structure, and EARS grammar | Pass | Quire: zero errors, zero `[ears:*]` and zero `[quality:*]` findings across the bundle |
| Requirement clarity and atomicity | Pass | Every Behavior bullet and every Constraint row carries one obligation after the grammar pass |
| Complete traceability | Pass | 74/74 criteria mapped; TC-280..319 and TC-398..419; every TC traces to a criterion that exists |
| Master spec and log updated | Pass | `spec/spec.md` §1, §2.1, §2.2 and the requirement index; `spec/index.md`; `spec/log.md` |

## Dispositions

The seven analyses returned 37 high and 57 medium findings. Every high and every
real medium is acted on below; a finding that is not acted on carries its
one-line reason. Where several findings share one root cause they share one
disposition row.

### High findings

| Findings | Disposition |
|---|---|
| FND-469, FND-486, FND-517, FND-571 | Acted. `resultState` is now exhaustive and disjoint: `success` with no diagnostic, `invalid` with at least one `error`, `lossy` with at least one diagnostic and none of severity `error`. The oracle never returns `unsupported`, `unavailable`, or `partial`; the harness evaluates `support` before `resultState`. |
| FND-470 | Acted. FR-036 declares the total restrictiveness order `invalid`, `breaking`, `unknown`, `conditional`, `additive`, `patch`, and defines `unknown` as the classification for a change no rule matches. |
| FND-471, FND-481, FND-505, FND-559 | Acted. Cycle detection now precedes every depth bound: a self-referential or mutually recursive alias yields exactly one `ALIAS_CYCLE`; `DEPTH_LIMIT_EXCEEDED` applies only to an acyclic chain longer than 256. FR-036-AC-3 and TC-292 state both halves. |
| FND-479, FND-524 | Acted as a recorded non-goal. Cross-language generated-package serialization parity has no package to serialize until issues #21..#23 ship. FR-038-CON-3 records it as an unmet coverage area with its owners, `spec.md` 2.2 excludes it, and TC-401 asserts the record exists. It is not silently claimed. |
| FND-480, FND-503, FND-520, FND-560, FND-577 | Acted. A case's input is now an input bundle — `ir` plus optional `manifest`, `manifestDigest`, `lock`, `profile`, `mappings`, and `consumerPolicy`, each validated against its published v1 schema. FR-036 states the six package-context rules the six mandated negatives need, and states that a rule stays silent when its bundle member is absent. |
| FND-482, FND-511 | Acted. The harness reads no clock. `reviewBy` moved to a separate audit target, which FR-037 names as the only conformance entry point that reads one. |
| FND-483, FND-562, FND-578 | Acted. The oracle's classification is scoped to the IR surface in FR-036, FR-025 and `compatibility-report.schema.json` remain the authority for the profile, mapping, representation, generated-target, and consumer-evidence surfaces, and an optional addition is `additive` only under a consumer policy that preserves or surfaces unknown members. |
| FND-484 | Acted. The construct register grew from 17 to 22 families, adding `scalar`, `alias`, `enum`, `sequence-map`, `reference`, and `extension`. Generic parameters, renames, and deprecations have no IR node, so FR-038 routes them to `contract-gaps.json` rather than inventing a register row for a construct the contract does not carry. |
| FND-485, FND-500, FND-522, FND-556 | Acted. An expected diagnostic is now a `common.schema.json#/$defs/diagnostic` document — `code`, `severity`, `message`, `owner`, `blocking`, `causes`, `related`, `locus` — and the RFC 6901 `pointer` sits beside it as corpus metadata, not inside the sealed contract shape. TC-288 and TC-297 assert it. |
| FND-488, FND-519 | Acted. The exactly-one-diagnostic and locus gates moved from FR-035 to FR-036, which owns the oracle, so the dependency runs one way: FR-035 defines the case format, FR-036 depends on it. |
| FND-499 | Acted as far as it can be. Nothing inside a corpus can prove its own oracle right; NFR-015's Rationale now says so and names provenance as the substitute. Two independent derivations must agree — the hand-authored `expected` block and the oracle implementation — and TC-290 fails when they do not. The residual risk is recorded, not claimed away. |
| FND-501 | Acted. FR-037's match rule now compares `resultState`, the ordered `code`, `severity`, and `locus` sequence, `classification`, and `normalized` bytes for every supported case, not only positives. |
| FND-502, FND-495 | Acted. `classification` is a member of `adapter-result.schema.json` and part of the match rule, so compatibility and evolution cases are judged for adapters. |
| FND-504, FND-558, FND-546 | Acted. FR-036 declares the schema-layer collapse rule: one diagnostic per distinct failing instance location, discarding any location that is a strict prefix of another, so one violation inside a `oneOf` cascade yields one diagnostic at the deepest node. Adapters that locate by a different valid pointer scheme declare `pointerCompatible: false` and are judged on code, severity, locus, classification, and bytes. |
| FND-506, FND-568 | Acted. The manifest now digests bases as well as cases; an indexed `replace` or `remove` op must be preceded by an RFC 6902 `test` op pinning the member; and `x-repeat` lets a depth-boundary case stay inside the 64-node budget. TC-286, TC-283, and TC-285 assert all three. |
| FND-507, FND-489, FND-561 | Acted. Case and base digests are over raw file bytes, so a one-byte edit is detected; `corpusDigest` is the SHA-256 over those digests joined in base-id then case-id order; and the comparison form is named `agent-ix-conformance-jcs-v1` and explicitly distinguished from the contract's `RFC8785-JCS-with-identity-sorted-sets-v1` fingerprint form. |
| FND-508, FND-527, FND-565, FND-581 | Acted. A disagreement with the published contract or with a merged artifact that is not a registered adapter goes to `conformance/contract-gaps.json`, never to the divergence register, so no register entry exists that no run reproduces. Divergence entries gained `owner` and a `verdict` of `implementation-defect`, `corpus-defect`, or `contract-gap`, which is who adjudicates and what was decided. |
| FND-509, FND-514 | Acted. An adapter result must carry `caseDigest` matching the manifest, and the harness rejects a result whose digest does not match, so a canned or corpus-derived answer cannot pass. TC-311 asserts it. `coverage.json` excludes every machine-, clock-, and environment-varying value. |
| FND-521, FND-557 | Acted. `conformance/diagnostic-codes.json` is the code register: one row per code with its rule, deciding layer, and the contract clause that obliges it. The sixteen codes already frozen in `fixtures/semantic/v1/negative/reader-cases.json` are reused verbatim rather than re-minted, and `derivedFrom` quotes the rule rather than the code. |
| FND-523 | Acted. FR-038-CON-2 now requires each register row to quote the issue #19 criterion it exercises, so a re-specification of #19 does not silently move the register. The register is authored from the criteria as they stand when the row is written, and the quote makes any later drift visible. |
| FND-563 | Acknowledged and bounded, not removed. `contracts-v1.md` is provisional on issue #9 for its IR field set. Every case cites the clause it was read from, so a clause change is traceable to the cases it moves; a moved expectation is a `corpus-defect` verdict and a major `corpusVersion` bump. The corpus cannot be more settled than the contract it encodes, and pretending otherwise would be the worse error. |
| FND-576, FND-530, FND-566, FND-583 | Acted. The `./conformance` subpath export and the `files` entry are dropped. FR-039 states that enlarging the published surface belongs to the issue #11 gate, `spec.md` 2.2 excludes it, `corpusVersion` is declared the only version a consumer pins for corpus content, and TC-409 asserts `package.json` gains neither entry. |
| FND-579 | Acted. FR-037-CON-3 records that supplying an adapter command and an `adapter-result.schema.json` emitter is the owning issue's obligation. This issue declares the four slots and the result contract; it does not oblige another ticket from one side. |

### Medium findings

| Findings | Disposition |
|---|---|
| FND-472 | Acted. FR-037 states the passing outcome, and the divergence report names the locus of the node the adapter addressed where the oracle emitted nothing. |
| FND-473, FND-491 | Acted. The gates are named in FR-035, FR-036, FR-038, and FR-039 and are reached through `make test` and `make conformance`; NFR-016 records that no workflow change is needed because CI already calls `make test`, and its metric table bounds the entry points. |
| FND-474 | Acted in part. FR-036 still lists the cross-field rules as two grouped statements, because splitting sixteen rules into sixteen SHALL bullets would restate `semantic-ir.schema.json` in prose. The moving scope phrase "no reader decides today" is now pinned to the merge base of this branch, and `diagnostic-codes.json` gives every rule its own row, its own code, and its own contract citation, which is where the per-rule obligation actually lives. |
| FND-475, FND-533 | Acted. The corpus is the subject only of declarative obligations; the executable ones name the oracle, the harness, or a gate. The "before promotion" clause became `thresholds.json` carrying a `proposed` status per row. |
| FND-476, FND-564 | Acted. A register row may declare a class `notApplicable` with a written justification and a contract citation, and the coverage gate fails only on a missing class that is not justified, so no filler case is forced for a construct with no limit or no version transition. |
| FND-477, FND-490 | Acted. The SemVer bump rules, the defect-case deletion ban, and the id and directory rules gained gates and criteria: FR-035-AC-8 and FR-035-AC-10, TC-287 and TC-289. FR-038-AC-6's deciding layer is now observable because `diagnostic-codes.json` records each code's layer. |
| FND-487 | Acted. FR-037 states that `support` is evaluated before `resultState`. |
| FND-492 | Acted. NFR-016's prohibited paths are anchored at the repository root and the scope states that `schema/**` does not reach `conformance/schema/**`. `pyproject.toml` moved to the prohibited list, since the corpus adds no Python dependency. |
| FND-493 | Acted. FR-039 records that the mutation score measures the corpus and the oracle together and is reported per backend only as the score that backend is judged under; the catalogue is committed and fixed so a score cannot be raised by deleting a mutation. |
| FND-494, FND-569 | Acted. `covers`, `decidedBy`, and `unsupportedBy` are now case-model members in FR-035, and `unmet` is used for one meaning only — an adapter that did not answer. |
| FND-496 | Acted. The 64-node budget is defined as scalars, arrays, and objects counted once in `ops`, and `x-repeat` keeps the depth-boundary case inside it. |
| FND-510 | Acted. The `verdict` member records which side is wrong; NFR-015-AC-5 makes a `corpus-defect` verdict the only route by which an expected result changes. |
| FND-512 | Acted. The diagnostic order is `pointer`, then `code`, then `message`, then the canonical form of the diagnostic, so no two diagnostics tie; comparison is by code point throughout. |
| FND-513 | Acted. `unsupportedBy` moved out of `expected` into its own case member, so recording a backend limitation is not a change to an expected result and does not force a major bump. |
| FND-515 | Acted. FR-039 records what the mutation score measures. It is not claimed to grade the corpus alone. |
| FND-516 | Acted. `defects.json` rows carry `documentExpressible`; a `false` row names the process property and the static check that detects it, so a locale-dependent sort or a working-directory-dependent path is recorded rather than dropped. |
| FND-525 | Acted. The semantic-core grammar dependency is consumed through the lowered `1.1.0` documents the corpus bases are shaped after; the corpus does not gate the grammar itself, and `coverage.json` records that as an unmet area owned by issue #11. |
| FND-526 | Acted with FND-480: FR-036 now states the import, cycle, mapping, lock, and loss rules. |
| FND-528, FND-573 | Acted. The prototype-emitter divergences were found by reading `spikes/typespec-feasibility/emitter/index.mjs` and by running it read-only into a scratch output directory, changing nothing under `spikes/`. They populate `defects.json` and `contract-gaps.json`. |
| FND-529 | Acted. NFR-016 narrows the `package.json` permission to a script entry only, which minimizes the overlap with issue #27; the residual merge risk on `Makefile` and `package.json` is recorded here rather than engineered away, because both tickets legitimately add targets. |
| FND-531 | Acted as a recorded limit. What `quire-contract-ir#52` imports from `conformance/` is that repository's decision; FR-039 fixes the import surface so the decision is possible. Issue #36 gains no adapter row here because it has no implementation to adapt. |
| FND-535 | Acted. The Python entry point is a real conformance suite at `tests/test_conformance_corpus.py` using the already-pinned `jsonschema`, so `poetry run pytest` has something to run. |
| FND-536, FND-575 | Acted. FR-035-CON-2 binds the case id to its family's declared prefix and FR-035-CON-3 binds the file to its family directory, with the pattern declared in the manifest rather than in prose. |
| FND-537..FND-544 | Acted. Ten `Test` obligations discharged by static rows were retyped, the determinism rows became `Property` (TC-291, TC-295, TC-307, TC-410, TC-412), the harness-source scan became its own `Analysis` obligation (FR-037-AC-9, TC-310), NFR-016-AC-4 became `Analysis`, NFR-015-AC-4 was narrowed to the register inspection it really is, and FR-039-AC-5's `Verification` cell became `Test`. |
| FND-567 | Acted. The sixteen frozen `reader-cases.json` codes are reused verbatim and cited as `derivedFrom`; the corpus adds cases the frozen set does not carry rather than restating it. |
| FND-570 | Acted. The capability rule was rewritten onto members `consumer-policy.schema.json` actually declares: a `required: true` extension whose identity the policy does not list while `unknownExtensions` is `reject`. |
| FND-572 | Acted, and recorded as a contract gap. The schema does not stop a `1.0.0` document carrying a `1.1.0` node, so the corpus decides it under NFR-013's additive rule and records the schema gap in `contract-gaps.json` rather than treating its own rule as the contract. |
| FND-574 | Acted in part. Adapter execution order is fixed to the registry order and case order to `corpus.json` order. Multi-platform determinism evidence is not produced here; this repository's CI runs one platform, and claiming cross-platform evidence from it would be false. |
| FND-580 | Acted. Threshold rows carry `proposed` status and their owning issue. |
| FND-582 | Acted with FND-570. |
| FND-584 | Acted. `pyproject.toml` moved to the prohibited list and the Python suite is real. |

### Low findings

Findings FND-465, FND-468, FND-478, FND-497, FND-498, FND-518, FND-532,
FND-534, FND-545..FND-555, FND-585..FND-587 are recorded as accepted context
or were folded into the high and medium dispositions above. Two are not acted
on and carry their reason: FND-465 (US-008 uses illustrative examples rather
than an AC table) is the installed archetype's own shape and repeats the
standing disposition of FND-030, FND-086, and FND-203; FND-547 (eighteen
property-based-testing recommendations) is declined because the corpus is a
finite committed set and a generator over it would test the generator.
