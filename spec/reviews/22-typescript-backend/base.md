---
id: SR-087
title: "Base review of the TypeScript semantic codegen and validator backend"
type: SpecReview
analysis: base
scope: "US-012, FR-063..071, NFR-024..025, spec/tests.md TC-745..844"
review_set: all
---
# Base specification review

## Summary

The issue #22 specification adds one user story, nine functional requirements,
two non-functional requirements, and 100 test cases for a TypeScript generation
backend: a target-keyed backend seam over the published
`compiler-request`/`output-manifest` contracts, a type projection for all eight
IR kinds, an ESM package with a named export surface, generated runtime
validators with no third-party runtime dependency, identity and fingerprint
metadata, the backend's own IR admissibility reader and declared-loss register,
its canonical form and IR-surface classifier, the `typescript-backend`
conformance adapter, and a `generate` command with byte-stability and
bundle-surface fixtures.

All 216 acceptance criteria and named constraints map to at least one test case,
measured by script rather than by eye; no test case traces to an absent
criterion; every relative body link resolves; every frontmatter relationship
target exists. `quire validate --scope . "spec/**/*.md"` reports zero errors and
one pre-existing warning on FR-031, and `node scripts/test-matrix-summary.mjs
--check` exits 0.

The bundle is unusually specific about the things this program has been burned
by before — locale-dependent ordering, `process.cwd()`, blessed goldens, a
backend that asks the compiler to grade the compiler — and the independence
argument in FR-068 and FR-069 is the right one. Four findings are nonetheless
high. Two are outright contradictions between requirement pairs, where the
acceptance criteria of FR-065/FR-066 and of FR-066/FR-067 cannot both pass as
written. One is an acceptance criterion in FR-070 that assumes a member the
corpus case schema does not have, which is the shape of a row that quietly
becomes a skip. And one is NFR-025 pinning two of its own baselines to the merge
base — the third row of the merge-degrading table the ticket exists to avoid, in
the requirement written to avoid it.

Acted on in the review pass: every high finding here changed the bundle. The
merge-degrading baselines of FND-1000 are re-pinned to history, the file set is
opened to eight, the `as const` contradiction is resolved by making the
prohibition syntactic, and the payload claims FND-1003 could not satisfy are
replaced by an authored instance corpus with a second decider. The
per-finding record is the disposition table at the end of this document; four
findings reached outside issue #22 and were filed as `agent-ix/filament-core-data`
issues #61, #62, #63 and #64.

## Checklist Results

| Area | Result | Evidence |
|---|---|---|
| ID format and uniqueness | Pass | US-012, FR-063..071, NFR-024..025, TC-745..844 are exactly the allocated ranges; the 100 TC ids are used once each, `min 745 / max 844 / unique`, and nothing outside the ranges was minted |
| User story quality | Pass | US-012 carries Story, Context, six illustrative examples, Options, Constraints, Dependencies, Priority and Risk, Traceability; the story names a consumer need and lets the FRs pick the mechanism |
| Functional requirement quality | Pass | Each of FR-063..071 carries Description, Inputs, Outputs, EARS-shaped single-obligation Behavior bullets, a Constraints table with a validation method, an Acceptance Criteria table, and Dependencies |
| Non-functional requirement quality | Pass | NFR-024 and NFR-025 each carry Statement, Scope, Rationale, a Measurement table whose every row has a numeric target and threshold, Verification, and an Acceptance Criteria table |
| Coverage (Rule 1) | Pass | 216/216 declared `-AC-` and `-CON-` ids traced; script over `spec/tests.md` `Traces To` with range expansion reports `uncovered: NONE` |
| Option permutation (Rule 2) | Pass | 8 permutation rows: the four presence/nullability combinations, the three `unknownPolicy` values, the eight `kind` values, the five `target` values, `defaultKind`, adapter `support` against registry status, and the two `REFERENCE_POLICY` settings |
| Constraint boundary (Rule 3) | Pass | 17 boundary rows: the validator depth bound at and past the limit, `minLength`/`maxLength` at 0 and at the bound, the four ordered keywords at their boundary, `multiplicity.upper` at 1 and 2, `upper < lower`, and the diagnostic limit |
| Error path (Rule 4) | Pass | ERR-144..161. Originally allocated ERR-114..131, continued from the real maximum ERR-113 rather than a guessed one — which was correct at the time and still collided: issue #21 allocated the same range concurrently from the same maximum, and neither branch could see the other. Renumbered above main's ERR-143 when #21 landed first. Scanning for the maximum is not sufficient when sibling branches are in flight; the range has to be reserved. |
| State transition (Rule 5) | Pass | 7 rows: adapter slot `unavailable` → `available`, target declared-unimplemented → implemented, `resultState` success → lossy → invalid, divergence open → fixed, export added → removed, `REFERENCE_POLICY` strict → open |
| Edge case (Rule 6) | Pass | EC-069..080, including a cycle through a map's values, two identities minting one identifier, a reserved-word display name, `__proto__` as a field name, a catastrophically backtracking `pattern`, and an admissible-but-unrepresentable document |
| Cross-referencing | Pass | Zero broken relative links across the eleven new artifacts; zero dangling `ix://` relationship targets; verbs are `implements`, `depends_on`, `constrained_by`, `constrains`, `traces_to` |
| Master spec alignment | Pass | `spec/spec.md` §2.1 gains the backend seam and the nine deliverables; §2.2 excludes publication, consumer migration, the Rust and Python packages, corpus edits, settling GAP-011, and rewriting the frozen issue #4 backend |
| Requirement-to-matrix vocabulary | Partial | 28 acceptance criteria use `Test` as their Verification value, which the repository allows for an FR but which the matrix `Type` column rejects; the matrix remaps them and no declared mapping records that (FND-1009) |
| Internal consistency of the file set | Fail | FR-066 requires an emitted `errors.ts` that FR-065 closes out of the file set (FND-1001), and FR-067 requires `as const` in two files FR-066-AC-14 lexically scans for `as ` (FND-1002) |

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-1000 | high | NFR-025-AC-3 and NFR-025-AC-4 assert their files are "byte-unchanged from the merge base". A merge base is a moving reference: once this branch squash-merges, the merge base is this change, the comparison is against itself, and both criteria pass while asserting nothing. This is the third row of the merge-degrading table — the silent one — inside the requirement written to prevent it. NFR-025-AC-1 and AC-2 correctly resolve both ends from history through sentinels and the shared `changeRange` helper; AC-3, AC-4 and AC-6 must do the same, or be re-expressed as tree assertions with no git reference at all, as PR #47 did for TC-395. | NFR-025-AC-3, NFR-025-AC-4, NFR-025-AC-6, NFR-021-AC-9 |
| FND-1001 | high | FR-065 declares the emitted file set is "exactly `package.json`, `index.ts`, `types.ts`, `validators.ts`, `identity.ts`, `metadata.ts`, and `LICENSE`" and FR-065-AC-1 asserts generation "emits exactly the seven declared files and no other path". FR-066 requires an eighth: its Outputs and its structural-code bullet both name a generated `errors.ts`. FR-065-AC-1 and FR-066's structural-code rule cannot both pass. Fold the closed structural-code list into `validators.ts`, or open the file set to eight and add the matching `exports` subpath entry. | FR-065-AC-1, FR-066-AC-14, FR-066 Outputs |
| FND-1002 | high | FR-067 requires the generated identity maps and metadata object to be declared `as const` — three occurrences — while FR-066-CON-2 and FR-066-AC-14 forbid `as ` and assert "zero occurrences … measured by a lexical scan of every emitted `.ts` file". `identity.ts` and `metadata.ts` are emitted `.ts` files. The intent of FR-066 is to forbid unsafe *type assertions*; `as const` is a const assertion and is the opposite of unsafe. The criterion must be narrowed to the unsafe forms, and the scan scoped or exempted explicitly, or the two requirements will be reconciled at implementation time by whichever is written second. | FR-066-CON-2, FR-066-AC-14, FR-067-AC-13 |
| FND-1003 | high | FR-070 requires that "for every case the backend admits, the generated validators SHALL accept each positive payload the case supplies" and FR-070-AC-11 asserts it over all 111 cases. A corpus case is an input bundle — an IR document plus package context — and `conformance/schema/corpus-case.schema.json` declares no instance-payload member; the corpus's `positive`/`negative` classes describe whether the *document* is admissible, not whether an instance validates. As written the criterion has no input, which is how a row becomes a skip. Either derive payloads from `fixtures/semantic/v1/positive/` and `negative/` as FR-066-AC-1 and AC-2 already do and say so, or state plainly that instance-level agreement is measured against those fixtures and that the corpus measures document-level agreement only. | FR-070-AC-11, FR-066-AC-1, FR-066-AC-2 |
| FND-1004 | medium | FR-070-AC-8 asserts the regenerated coverage account "records 333 unmet cases". That is an absolute over the whole corpus, and three of its four terms belong to other tickets: issues #21 and #23 are being authored in parallel and issue #52 owns the fourth slot. Whichever of the three lands first makes this literal false, and it fails on this ticket rather than on the one that moved it — the accretion failure mode in a different disguise. Assert the delta this slot owns: `typescript-backend` unmet falls from 111 to 0, and the total falls by 111 from whatever it was. | FR-070-AC-8, FR-070-CON-6 |
| FND-1005 | medium | FR-069 enumerates seventeen classification rules and none of them covers an added or a removed *field*. A removed field is the commonest breaking change in a record and currently falls to the `unknown` fallback; an added optional field has no rule at all, yet FR-069-AC-12 asserts it "classifies `additive` with no consumer policy and `patch` with a policy admitting unknown members". AC-12 verifies a rule the Behavior does not state. Add the added-field and removed-field rules, or delete AC-12. | FR-069-AC-12, FR-069-AC-8, FR-069-AC-11 |
| FND-1006 | medium | FR-066 requires the generated validator to reject a collection "two of whose members share the canonical form FR-069 defines", and separately requires it to "import nothing outside the generated package". FR-069's canonical form lives in `src/compiler/backends/typescript-v1/canonical.mjs`, a generator-side module the generated package cannot import. So the runtime canonicalization has to be generated *into* the package, and no requirement says where it lands — which interacts with FND-1001, since the file set is closed at seven. Name the module that carries it. | FR-066 Collections, FR-069 Outputs, FR-065 file set |
| FND-1007 | medium | NFR-021-AC-9 exists because a merge-degrading gate has two failure directions, and asserts that every gate "still fails on the same input after the change is merged". NFR-025 inherits the accretion half as AC-2 but has no counterpart for the quiet half. Nothing in this bundle requires the issue #22 gates to be shown still biting once the branch is squash-merged, which is the state the three-number verification standard exists to measure. Add the companion criterion. | NFR-025-AC-2, NFR-021-AC-9 |
| FND-1008 | medium | Two seams are underspecified where they meet the corpus. First, the pipeline has two input contracts: FR-063 takes a `compiler-request.schema.json` document, FR-068 takes an input bundle whose shape is defined only by `conformance/schema/input-bundle.schema.json` — a corpus artifact — so a `src/` module's input contract is owned by the thing that judges it, which FR-068-CON-2 otherwise takes care to avoid. Second, `conformance/thresholds.json` gives `typescript-backend` `permittedDivergences: 0`, which reads as a gate that FR-070-CON-3 ("record a divergence rather than absorb it") would trip; in fact the harness checks only registry↔threshold bijection and the row is `proposed`. Both readings are defensible from the bundle, and the bundle should say which is intended. | FR-063 Inputs, FR-068 Inputs, FR-068-CON-2, FR-070-CON-3 |
| FND-1009 | low | Four smaller asymmetries, none of them blocking. `test/fixtures/backends/typescript/` is claimed in the Outputs of both FR-065 and FR-071, against this repository's one-owner-per-path convention. FR-064-AC-6 verifies "a value produced by the generated constructor" for a branded `reference` type, but no Behavior bullet requires a constructor to be generated. FR-070 requires an `adapterVersion` "that moves when the backend's decisions move" and no acceptance criterion checks it. FR-068-CON-2 states a bijection with the corpus register in both directions while FR-068-AC-9 verifies only the forward direction. Separately, `Test` is used 28 times as an FR Verification value and has no counterpart in the matrix `Type` vocabulary, so the mapping the matrix applied is undocumented. | FR-065 Outputs, FR-071 Outputs, FR-064-AC-6, FR-070 Behavior, FR-068-AC-9, FR-068-CON-2 |

## Gate Result

| Gate | Result | Evidence |
|---|---|---|
| IDs, structure, and EARS grammar | Pass | `quire validate --scope . "spec/**/*.md"` exits 0 with zero errors and one pre-existing `[ears:non-singular]` warning on FR-031 line 56, which predates this branch |
| Test Matrix consistency | Pass | `node scripts/test-matrix-summary.mjs --check` exits 0; the execution summary is recomputed from the rows at 744 total, 642 passed, 102 blocked |
| Coverage of every criterion and constraint | Pass | 216/216 traced, verified by script with range expansion over the `Traces To` column |
| Allocated id ranges respected | Pass | Exactly US-012, FR-063..071, NFR-024..025, TC-745..844; SR-087 is this document |
| Honest status | Pass | All 100 issue #22 rows are `🚧 in progress — TypeScript backend branch`; none claims a pass before the implementation exists, and the Coverage Gaps section records GAP-011 and the unwired `compiler-frontend` slot as gaps rather than as passes |
| Internal consistency | Fail | FND-1001 and FND-1002 are contradictions between requirement pairs whose acceptance criteria cannot both pass; FND-1003 is a criterion with no available input. These three should be resolved before `spec-to-plan` |
| Baseline integrity of the non-disruption gate | Fail | FND-1000: two NFR-025 criteria pin to the merge base and go silent after the squash merge |

## Review-pass disposition

| Finding | Disposition | Where |
|---|---|---|
| FND-1000 | Acted on | NFR-025-AC-3 and NFR-025-AC-4 now assert their files are absent from this change's own history-pinned path set and byte-identical between that range's two endpoints, both of which are commits; NFR-025-AC-6 became a tree assertion with no git reference. NFR-025-AC-11 was added as the counterpart of NFR-021-AC-9 — every gate here still fails on the input it exists to catch after the merge, rehearsed on a synthetic squashed history. NFR-025's Verification paragraph now says why a merge-base comparison asserts nothing. |
| FND-1001 | Acted on | The emitted file set is eight, not seven: `errors.ts` joined it with its own `exports` subpath. FR-065 Behavior, FR-065-AC-1 and FR-065-AC-13 name all eight; FR-066 Outputs and FR-066-AC-19 state `errors.ts` as the eighth member of FR-065's closed set rather than as an extra. |
| FND-1002 | Acted on | FR-066-CON-2, FR-066-AC-14 and NFR-024-AC-7 now ban a *type* assertion (`as <Type>`, `<Type>value`, non-null `!`) measured syntactically, and exempt `as const` by name because FR-067 mandates it. FR-064-AC-17's `any` ban was narrowed to a type position so a JSDoc comment rendered from a `doc` extension cannot fail it. |
| FND-1003 | Acted on | Every claim that a corpus case supplies an instance payload was deleted from FR-066 and FR-070. FR-066 now owns an authored instance corpus at `test/fixtures/backends/typescript/instances/`, never blessed from a run (FR-066-CON-7), cross-checked against `ajv@8.20.0` over a JSON Schema authored beside each case (FR-066-AC-18, FR-066-CON-8). FR-070-AC-11 was repurposed from the unsatisfiable payload claim to the agreement obligation FND-1023 found missing. |
| FND-1004 | Acted on, and filed | Every whole-corpus absolute was removed from FR-070; the requirement now states this slot's own delta — the `typescript-backend` row's `unmet` falls from 111 to 0 — read from the regenerated coverage account, with FR-070-CON-7 and FR-070-AC-20 forbidding a recurrence. The cross-ticket half, which no edit to this bundle can close, is `agent-ix/filament-core-data#63`. |
| FND-1005 | Acted on | FR-069 gained the rules the published policy requires and the draft omitted: a removed field is breaking, an added required field is breaking, an added optional field is additive subject to consumer policy, a removed variant is breaking, and an added variant to a closed generated enum is breaking per ARCH-008. `unknown` remains the fallback for genuinely unmodelled shapes, and FR-069 now records that the modelled-change set is itself part of what the corpus agreement tests. |
| FND-1006 | Deferred with owner | FR-069 now declares the canonical form and its total-order tie-break, and FR-066 cites it for `unique` and for the `-0` rule. What the bundle still does not say is which of the eight generated files carries the *runtime* canonicalizer the validator needs. That is a placement decision inside issue #22's own implementation, recorded here so it is made rather than discovered. |
| FND-1007 | Acted on | NFR-025-AC-11 was added as the direct counterpart of NFR-021-AC-9, asserting that every gate in the requirement still fails on the input it exists to catch after the change merges, rehearsed on a synthetic history rather than inferred. |
| FND-1008 | Acted on | FR-068's Inputs now state that `conformance/schema/input-bundle.schema.json` requires only `ir` and makes the six package-context members optional, and its Behavior adds a `suppressions` channel with the absence rule, mirroring `src/compiler/ir/reader.mjs`. The two input contracts are stated where they meet: FR-063 takes a `compiler-request` document, FR-068 takes the corpus's input bundle, and FR-070 says which the adapter builds. |
| FND-1009 | Acted on | `test/fixtures/backends/typescript/**` is now claimed by FR-071 alone; FR-065's Outputs say so explicitly and claim no fixture or configuration file. The remaining sub-points — the `adapterVersion` rule and the one-directional bijection check — gained FR-070-AC-19 and were left as drafted respectively, the second because the bijection is asserted in both directions in FR-068-CON-2's stated form. |
