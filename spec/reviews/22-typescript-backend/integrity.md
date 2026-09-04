---
id: SR-092
title: "Integrity review of the TypeScript semantic codegen and validator backend"
type: SpecReview
analysis: integrity
scope: "US-012, FR-063..071, NFR-024..025, spec/tests.md TC-745..844"
review_set: all
---
# Integrity review

## Summary

The issue #22 bundle specifies a generation backend seam, a TypeScript type
projection over all eight IR kinds, an ESM package, generated runtime
validators, identity and fingerprint metadata, the backend's own admissibility
reader, a canonical form and a compatibility classifier, the conformance
adapter, and the `generate` command. It is unusually well guarded on the axes it
names: the second-implementation discipline of FR-068-CON-1 and FR-069-CON-1 is
argued rather than asserted, FR-070-CON-1 forbids deriving an adapter answer
from the oracle and FR-070-AC-6 falsifies that constraint rather than restating
it, GAP-003, GAP-004, GAP-006, GAP-010 and GAP-011 are each cited against an
owning issue instead of being quietly decided, and FR-063-CON-2 confronts the
`runtime-schema-validator` declaration head-on instead of editing the committed
fixture that carries it.

The defects are of three kinds. The first is a hole at the centre: **the
`model`** — the artifact FR-064, FR-065, FR-066 and FR-067 all consume — is
named by four requirements, attributed to three different producers, and
produced by none of them (FND-1055). The second is a set of flat contradictions
between requirements that were authored against a shared brief but never read
against each other: an eighth emitted file against a closed set of seven
(FND-1056), a ban on `as` against a mandate for `as const` (FND-1057), a
`semanticIdentities` set required to be non-empty for files that render no
identity (FND-1068). The third is a set of obligations that name capabilities or
data this repository does not have: no bundler is resolvable from the repository
root, so the whole tree-shaking family is unimplementable as written (FND-1058),
and the conformance corpus carries no instance payloads, so four of FR-070's
obligations describe data that does not exist (FND-1059).

One finding is a correctness hole rather than a drafting one. FR-069's
classification rules cover a removed *type* and never a removed *field*, and the
`unknown` fallback sits **below** `breaking` in the restrictiveness order — so
the commonest breaking change in the published policy is classified less
restrictively than the policy requires (FND-1060). One is the merge-degrading
pattern the program has now hit four times, this time written into an acceptance
criterion rather than into a guard (FND-1062).

Acted on in the review pass: every high finding here was a contradiction between
two requirements, and all six were resolved rather than argued — the model gained
an owner and a shape, the file set opened to eight, the `as` ban became
syntactic, the bundler was replaced by a reachability walk, the payload claims
were replaced by an authored corpus, and the classifier gained the field and
variant rules the published policy requires. The two deliverables this analysis
found uncovered — extension APIs and deterministic formatted output — are now
FR-067's and FR-071's respectively. The per-finding record is the disposition
table at the end of this document.

## Atomicity

Judged individually rather than by a rule about counts.

**FR-068 (admissibility + representability) is correctly one requirement, and
should stay one.** The two decisions are not merely adjacent: the requirement's
whole point is that they must be kept apart in the *answer* while being taken by
the same pass over the same document, and it says so at length. Splitting them
would put the "never mixed into an admissibility answer" obligation in neither
file. The two output modules (`admit.mjs`, `loss.mjs`) already carry the
separation where it matters.

**FR-069 (canonicalization + classification) is two requirements sharing a
file.** Its own Description concedes the join is by consumer rather than by
subject — a backend "needs one canonical form of its input" and separately
"needs to know whether the regeneration is a patch". The two have disjoint
inputs (one document versus an ordered pair), disjoint outputs
(`canonical.mjs`/`classify.mjs`), disjoint failure modes, and no rule of one
references a rule of the other except `unique`'s use of the canonical form,
which is FR-066's dependency and not an internal one. Fifteen ACs across two
subjects is also why FND-1060 was missable: the classification half received
nine ACs where FR-068's single subject received sixteen. This is the one split I
would make.

**FR-071 (verb + make targets + type-level fixtures + bundle-surface record) is
three requirements.** The command is a coherent subject with the FR-052 exit
contract behind it. The type-level fixtures are a *verification apparatus* for
FR-064 and FR-066, not a behaviour of the command — FR-071-AC-9 and AC-10 verify
FR-064-AC-5, FR-064-AC-7 and FR-066-AC-17, which is why those criteria appear
twice in the bundle under different owners. The bundle-surface record verifies
FR-065-AC-12, FR-067-AC-11 and NFR-024-AC-12. Recorded as FND-1069 rather than
as a blocking defect, because the coupling is legible and the ownership
collision it creates in `test/fixtures/backends/typescript/` is a real cost
(FR-065's Outputs and FR-071's Outputs both claim `bundle-surface/**`).

FR-063, FR-064, FR-065, FR-066, FR-067 and FR-070 are each one requirement.

## Terminology and undefined terms

One thing is not called one name throughout, and several normative terms are
never defined.

| Term | Where it is used normatively | Status |
|---|---|---|
| `model` | `renderTypes(model)`, `renderPackage(model)`, `renderValidators(model)`, `renderIdentity(model)`, `renderMetadata(model)`; "the resolved model", "the admitted model", "the resolved type model" | **Undefined.** See FND-1055. |
| the generated constructor | FR-064-AC-6, TC-759 | **Undefined.** No requirement specifies a constructor for a branded `reference`. |
| generated marker | FR-064, for the `preserve` and `surface` index-signature forms | **Undefined.** Two forms must be "distinguishable"; nothing says how. |
| structural-code list | FR-066, FR-066-CON-5, `errors.ts` | Named, never enumerated. Contrast FR-068, which tabulates all thirty of its codes. |
| the formats the backend implements | FR-066, FR-068 representability | **Undefined.** The set is load-bearing — it decides which documents are refused — and appears in no requirement, no fixture, and no `target-contract.json` member the bundle names. |
| the seven prohibited categories | FR-065 Inputs, FR-065-AC-7 | Defined by reference to `target-contract.schema.json`, and correctly. No defect. |
| surface fixture / bundle-surface record | FR-065, FR-067-AC-11, FR-071, NFR-024-AC-12 | Named four ways for one artifact. |
| admissible / valid / conformant | FR-068 throughout, FR-065 "the admitted model" | FR-068 defines `admissible` explicitly and holds the line. No defect. |
| declared loss / representability / unsupported | FR-063, FR-065, FR-066, FR-068 | FR-068 separates them cleanly; FR-065 and FR-066 use "declared loss" consistently. No defect. |
| backend / target / generator | FR-063 throughout | Consistent: a `target` is a vocabulary member, a `backend` implements one. No defect. |

The generated package name rule *is* defined (`package.identity` with `/`
replaced by `__`, prefixed `@agent-ix/semantic-`) and its inverse is checked by
FR-065-AC-4. It is one of the better-specified parts of the bundle.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-1055 | high | The `model` every renderer consumes is undefined and unowned. FR-064 Inputs call it "the resolved model [FR-068] produces", but FR-068's declared output is `{ resultState, diagnostics }` and carries no model. FR-066 Inputs call it "the resolved type model FR-064 builds", but FR-064's declared output is `renderTypes(model)` — it consumes one. FR-065 and FR-067 call it "the admitted model" with no producer named. FR-063's seam takes a `request` and FR-071's `emitTypeScriptPackage(request, options)` is the only place a request could become a model, and its Behavior never says it does. Nothing in the bundle states the model's shape, its owner, or its file. Four requirements' Inputs are therefore unsatisfiable as written, and the first implementation decision — the shape of the artifact five modules exchange — is unspecified. | FR-064 Inputs, FR-065 Inputs, FR-066 Inputs, FR-067 Inputs, FR-068 Outputs, FR-071 Outputs |
| FND-1056 | high | FR-065 declares the emitted file set is exactly seven files and that the set "SHALL be closed, so that an added or removed file is a visible change". FR-066's Outputs name an eighth: "its generated `errors.ts` carrying the closed structural-code list". The two cannot both hold. FR-065-AC-1 asserts "exactly the seven declared files and no other path" and would fail the moment FR-066 is implemented as written. FR-065's `exports` map likewise names four subpaths (`types`, `validators`, `identity`, `metadata`) with no entry for `errors`, so the structural codes would be unreachable to a consumer that wants to switch on them. | FR-065 Behavior, FR-065-AC-1, FR-065-AC-2, FR-066 Outputs, FR-066-CON-5 |
| FND-1057 | high | Three obligations forbid `as` in generated source and one mandates it. FR-066-CON-2: "The generated source SHALL contain no `as` assertion". FR-066-AC-14: "zero occurrences of `as `, `any`, `!.`, and `@ts-expect-error`, measured by a lexical scan of every emitted `.ts` file". NFR-024-AC-7 repeats it. FR-067 requires both identity maps and the metadata object to be "declared `as const`", four times, and `as const` is syntactically an `as` assertion and lexically contains `as `. `as const` is also the correct construct here — it is what makes the maps readonly and the literal types narrow — so the ban is what is wrong, not the mandate. The ban needs to name *type* assertions and except the const assertion, and the lexical scan needs to be a syntactic one. A related over-reach sits beside it: FR-064-AC-17 forbids "the token `any`" in rendered output, which a JSDoc comment rendered from a `doc` extension can contain as an English word. | FR-066-CON-2, FR-066-AC-14, NFR-024-AC-7, FR-064-AC-17, FR-067 Behavior |
| FND-1058 | high | The tree-shaking and bundle-surface family names a capability this repository does not have. FR-065-CON-4 requires the measurement to "use a bundler already pinned in this repository's lockfile, adding no dependency to either lockfile". Measured in the worktree: `import('esbuild')` and `import('rollup')` both fail with `ERR_MODULE_NOT_FOUND` from the repository root. Both exist only as transitive dependencies of vitest under `node_modules/.pnpm`, which pnpm's strict layout does not hoist, and esbuild's postinstall was skipped (`pnpm install` reports "Ignored build scripts: esbuild@0.21.5"), so its platform binary is absent as well. Reaching one by a deep `.pnpm` path is not a pinned interface and does not survive a lockfile refresh. Four criteria and one NFR metric depend on this. The remedy costs nothing: a static reachability walk over the generated package's own import and export graph decides "which symbols does a single-type entry point reach" exactly, needs no bundler, and is stronger than a bundle scan because it cannot be defeated by minification. | FR-065-CON-4, FR-065-AC-12, FR-067-AC-11, FR-071-AC-11, NFR-024-AC-12, TC-838 |
| FND-1059 | high | Four obligations require the corpus to supply instance payloads, and it supplies none. FR-070 Behavior: "the generated validators SHALL accept each positive payload the case supplies" and "SHALL reject each negative payload the case supplies"; FR-070-AC-11 repeats both. `conformance/schema/input-bundle.schema.json` is `additionalProperties: false` over exactly `ir`, `manifest`, `manifestDigest`, `lock`, `profile`, `mappings`, and `consumerPolicy` — a case carries a *contract document* and its expected diagnostics, never an instance of a declared type. The only instance data anywhere in the IR is `occurrences[].value`, which the TypeSpec frontend always emits as `[]`. As written these obligations will be met by inventing payloads, which makes the backend its own oracle for exactly the property FR-066 exists to prove. Either the payloads must come from `fixtures/semantic/v1/positive/` and `negative/` — which FR-066-AC-1 and FR-066-AC-2 already correctly cite — or FR-070 must drop the claim. | FR-070 Behavior, FR-070-AC-11, FR-066-AC-1, FR-066-AC-2 |
| FND-1060 | high | The classification rules have no rule for an added or removed **field**, or for an added or removed enum or union **variant**. FR-069 covers a removed type, an added type, a changed `kind`, a changed `scalar`/`target`/`items`/`values`, a field that became required or optional, a nullability change, a default change, relationships, extensions, package identity, contract version, and `unknownPolicy` — seventeen rules, none of which is field addition or removal. The fallback sends an unmatched change to `unknown`, and `CLASSIFICATION_ORDER` places `unknown` *below* `breaking`, so a removed field aggregates less restrictively than the published policy requires. `docs/semantic-data-system/compatibility.md` is explicit that a field removal and a closed-enum expansion are breaking, and `ir-compatibility-policy.md` rule 3 says a revision "may not remove or retype a member". The `unknown` fallback is sound as a catch for genuinely unmodelled shapes; it is not sound as the treatment of the two commonest breaking changes there are. | FR-069 Behavior, FR-069-AC-8, FR-069-AC-11, ARCH-008, ARCH-IR-COMPATIBILITY-POLICY |
| FND-1061 | medium | This ticket commits the first `.ts` files ever placed under `test/fixtures/` — `find test/fixtures -name '*.ts'` returns nothing today — and two repository-wide gates reach them. `make lint` runs `biome format .`, whose `biome.json` `includes` excludes only four `spikes/` and `test/fixtures/compiler/` paths, so a generated package fixture whose formatting is not byte-identical to biome's tab-indented output fails lint. `make lint` also runs `tsc --noEmit -p tsconfig.json`, whose `include` is `["src", "test", "scripts"]` and whose options do **not** set `exactOptionalPropertyTypes` — so the generated fixture is typechecked under weaker options than FR-065-AC-8 requires, and, worse, the FR-071-AC-9 fixtures that must *fail* to compile would fail the repository's own typecheck if committed as plain `.ts` under `test/`. Neither `biome.json` nor `tsconfig.json` appears in NFR-025's permitted-path list. The bundle anticipated exactly this class for `docs/semantic-data-system/compiler-diagnostics.md` and reasoned about it well; it missed the same class twice over here. | NFR-025 Scope, FR-065-AC-8, FR-071-AC-9, FR-071-AC-12 |
| FND-1062 | medium | FR-070-AC-8 hard-codes a figure that a sibling merge falsifies: the regenerated coverage account "records 333 unmet cases against the three slots this issue does not own", and FR-070 Behavior states the same arithmetic as 444 − 111. Issues #21 and #23 are being authored in parallel against the same registry and the same machine-generated `conformance/coverage.json`. Whichever of the three merges second regenerates that file with a different figure, and this criterion then fails for a reason that is not this ticket's defect — the accretion face of the merge-degrading pattern, written into an acceptance criterion instead of into a guard. FR-070-CON-6 has the right instinct ("read from the regenerated coverage account rather than restated in prose") and FR-070-AC-8 then restates it. The criterion should assert the *delta* this adapter causes — 111 slots move from unmet to answered — which is a fact about this change and stays true whatever the siblings do. | FR-070 Behavior, FR-070-AC-8, FR-070-CON-6, NFR-025 |
| FND-1063 | medium | `resultState: "lossy"` has no consequence anywhere. FR-068 defines it — diagnostics exist and none is an error — and no requirement says whether a lossy-but-admissible document may be generated from. FR-063 ties refusal to *representability* loss and `unsupportedFeaturePolicy: "fail"`, which FR-068 states explicitly is "never mixed into an admissibility answer", so the `fail` policy does not reach `lossy`. `output-manifest.schema.json` forces zero files only for `invalid`, `unsupported` and `unavailable`, so the schema permits a lossy generation with files. The result is that the one state between success and refusal is unhandled: an implementer will pick, and either choice is defensible and unverified. | FR-068 Behavior, FR-063 Behavior, FR-065 Behavior |
| FND-1064 | medium | The issue's first deliverable names "extension APIs" and no requirement provides one. The IR's `extension` node carries `identity`, `version`, `required`, `capability` and `payload`, on the document, on a type definition and on a field. FR-064 consumes exactly one of them — `ix://agent-ix/semantic-core/ext/doc`, rendered as JSDoc — and discards the rest. FR-067 emits `roles[]` and relationship descriptors but no extensions. FR-068 has an `UNKNOWN_REQUIRED_EXTENSION` rule and FR-069 classifies extension changes as breaking or additive, so the bundle treats extensions as first-class contract data everywhere *except* in what the generated package hands a consumer. A consumer holding a generated type cannot read the extensions its own contract declares. | issue #22 Deliverables, FR-064 Behavior, FR-067 Behavior |
| FND-1065 | medium | The issue's third deliverable is "stable unsupported/loss diagnostics and **deterministic formatted output**". The diagnostics half is thoroughly covered by FR-068. The formatting half is covered nowhere: no requirement states the generated code's indentation, quote style, line width, trailing-comma or semicolon policy, and no acceptance criterion checks it. Determinism is not formatting — NFR-024 proves two runs agree with each other, which a consistently ugly generator satisfies. This matters beyond aesthetics because of FND-1061: the repository's own formatter will have an opinion about the committed fixture whether or not a requirement does. | issue #22 Deliverables, FR-064, FR-065, NFR-024 |
| FND-1066 | medium | FR-069 classifies "a move between contract versions" as `conditional`, flatly. `docs/semantic-data-system/ir-compatibility-policy.md` — `status: normative` — says the opposite for the case that matters: "A version uplift is classified `additive` when — and only when — projecting the new document back to the old version reproduces the old document byte for byte", and gives the reason ("Counting each materialised member as its own change would classify the very revision the contract declares additive as breaking"). FR-069 cites that document in its Inputs and then contradicts it. This may be the right call — the corpus oracle appears to take the flat reading, and FR-070's 0-divergence budget forces the backend to match the corpus — but the bundle cites a gap when it takes the corpus's side on GAP-004, GAP-010 and GAP-011, and takes it silently here. Either the round-trip rule belongs in FR-069, or the disagreement between two published normative sources is a gap that needs an owner. | FR-069 Behavior, FR-069 Inputs, ARCH-IR-COMPATIBILITY-POLICY |
| FND-1067 | medium | Two ownership collisions in the export surface. First, the relationship descriptor is specified twice: FR-064 requires a record's relationships to "render as a separate exported readonly descriptor naming each relationship's identity, verb, category, composite flag, target, and multiplicity" into `types.ts`, and FR-067 requires `renderIdentity` to emit "one readonly relationship descriptor per declared relationship, carrying `verb`, `category`, `composite`, the `target` identity, and the relationship's `multiplicity` lower and upper bounds" into `identity.ts` — six members against five, in two modules, with two ACs (FR-064-AC-12, FR-067-AC-10) that will both pass on two different artifacts. Second, FR-065-CON-5 forbids re-exporting "a symbol whose identity the IR does not carry", and at least four mandated exports carry no semantic identity: the discriminant constant (FR-064), the branded-reference constructor (FR-064-AC-6), every `validate<Type>` function (FR-066), and the `ValidationError`/`ValidationResult`/`ValidatorCode` shapes (FR-066). The constraint as written forbids the package's own API. | FR-064 Behavior, FR-064-AC-12, FR-067 Behavior, FR-067-AC-10, FR-065-CON-5, FR-066 Behavior |
| FND-1068 | medium | The output manifest cannot be built for two of the seven emitted files. `output-manifest.schema.json` requires every `files[]` entry to carry `semanticIdentities` with `minItems: 1`, and FR-063 restates it as "the non-empty set of semantic identities that entry renders". `package.json` and `LICENSE` render no semantic identity at all. FR-065-AC-1 requires all seven files to be emitted and FR-063-AC-7 requires every entry to name "at least one semantic identity", so the two obligations meet on a file that has none. The bundle needs either a stated convention (the package identity stands for the manifest and the licence) or an explicit rule that non-source files are excluded from `files[]` — and the second reading conflicts with "reconciles every emitted file", the phrase `contracts-v1.md` uses. | FR-063 Behavior, FR-063-AC-7, FR-065-AC-1, FR-065-AC-16 |
| FND-1069 | low | Four smaller integrity points, none blocking. (a) FR-069 is two requirements sharing a file and should split, and FR-071 carries a verification apparatus that belongs to FR-064, FR-065, FR-066 and FR-067 — see the Atomicity section; the visible cost is that FR-065 and FR-071 both claim `test/fixtures/backends/typescript/bundle-surface/**` in their Outputs. (b) FR-063-AC-16's exception, as patched, names "the two declared closed registers — `DIAGNOSTIC_CODES` itself and the FR-068 admissibility register", but `DIAGNOSTIC_CODES` lives in `src/compiler/diagnostics.mjs` and is not under `src/compiler/backends/`, while `loss.mjs`'s `agent-ix.typescript-backend.` register is a third register the exception omits; the check would fail on `loss.mjs`. (c) FR-063 requires `target-contract.json` to carry the committed row's member values, which include `runtimeDependencies: ["runtime-schema-validator"]`, while FR-063-CON-2 and NFR-024 establish the count is zero — the reasoning is sound and stated, but the backend then ships a self-declaration that is knowingly inaccurate, and nothing records that a reader will trip on it. (d) All 100 of TC-745..844 are `P0`, so the Priority column carries no triage information for this ticket; `spec/tests.md` uses P0–P4 elsewhere. | FR-069, FR-071, FR-063-AC-16, FR-063-CON-2, spec/tests.md TC-745..844 |

## Vacuous-gate audit

Checked every acceptance criterion for the two shapes that pass when the thing
under test is absent, and for a baseline the code under test produces.

| Shape | Result |
|---|---|
| Passes when the artifact is empty | FR-065-AC-6, FR-065-AC-7, FR-065-AC-15, FR-066-AC-14, FR-068-AC-13, FR-069-AC-14, FR-070-AC-5 and NFR-024-AC-5..AC-9 are all universally quantified over generated or backend source and pass vacuously over an empty set. Each is a prohibition, so vacuous passing is the correct behaviour for the merged state — the negative shape the program's own guard table calls merge-safe — provided a positive companion asserts the artifact exists. FR-065-AC-1 ("exactly the seven declared files") is that companion for the generated source; **there is no companion for the backend modules**, so the FR-068/FR-069 import bans would pass over a deleted module. Low risk, recorded here rather than as a finding. |
| Baseline produced by the code under test | FR-064-AC-1, FR-065-AC-10, FR-067-AC-8, FR-071-AC-1 and NFR-024-AC-1..AC-3 compare against committed snapshots of this backend's own output. That is the `provenance.blessedFromRun` failure the corpus refuses by construction. It is **correctly mitigated**: FR-071-CON-5 forbids regenerating the fixture to make a comparison pass, FR-071 Behavior forbids `make generate-typescript-check` from rewriting in place with the issue #49 reasoning attached, and FR-070 supplies the independent oracle these snapshots cannot be. The mitigation is the strongest part of the bundle. |
| Threshold moved to fit the result | None. FR-070 explicitly leaves `conformance/thresholds.json` at `proposed` and forbids editing a case, a base, the oracle, the harness or a threshold; FR-066-CON-3 forbids weakening a check to make a fixture pass. |

## Scope boundary

Nothing in FR-063..FR-071 exceeds `spec/spec.md` §2.2 as amended. The five added
exclusions bound registry publication, sibling-language generation, corpus
editing, the GAP-011 decision and the frozen issue #4 backend, and each has a
matching constraint in a requirement (FR-071-CON-4, FR-070-CON-2, FR-068's
GAP-011 bullets, FR-063-CON-5). Two boundary observations that are not
violations: FR-070 legitimately edits `conformance/adapters/registry.json` and
`conformance/coverage.json`, which §2.2 permits by naming only cases, bases,
oracle, harness, thresholds and the registers; and NFR-025 permits
`docs/semantic-data-system/compiler-diagnostics.md` because it is generated from
`DIAGNOSTIC_CODES`, which is correct and well argued.

## Measurement feasibility

NFR-025's twelve metrics are all measurable with methods that exist in this
repository today — `changeRange`/`changedPathsOf` in `test/changed-paths.ts`,
manifest comparison, the export-set test, and the restore rehearsal issue #19
already scripted.

NFR-024's twelve are measurable **except** the last: "Symbols reachable from a
single-type import beyond that type's own surface", whose declared method is a
bundle-surface fixture that needs a bundler (FND-1058). Two further NFR-024
metrics are measurable but over-broad as stated: "Occurrences of `any`, `as`
assertions, or `@ts-expect-error` in generated source | 0" collides with the
mandated `as const` (FND-1057), and FR-067-AC-7's "no emitted byte matches a
date, time, hostname, user, or absolute-path pattern" will match inside the
generated `LICENSE`, which carries the 2007 GPL date and FSF address, and inside
any `doc` extension prose a package author wrote.

## Gate Result

| Gate | Result | Evidence |
|---|---|---|
| Atomicity | Conditional | FR-063..068, FR-070 atomic; FR-069 should split; FR-071 carries three subjects (FND-1069) |
| Internal consistency | **Fail** | Four flat contradictions: FND-1056, FND-1057, FND-1067, FND-1068 |
| Completeness against issue #22 | **Fail** | "extension APIs" (FND-1064) and "deterministic formatted output" (FND-1065) unspecified; the `model` the whole pipeline exchanges is unspecified (FND-1055) |
| Obligations resolvable against this repository | **Fail** | No bundler resolves from the repository root (FND-1058); the corpus supplies no payloads (FND-1059); repository-wide lint and typecheck reach the new fixtures (FND-1061) |
| Correctness of the stated rules | **Fail** | Field and variant addition/removal fall to `unknown`, which is less restrictive than the published `breaking` (FND-1060) |
| Merge safety of the criteria | Conditional | FND-1062: FR-070-AC-8 encodes a figure a sibling merge falsifies |
| Vacuous gates and blessed baselines | Pass | Prohibitions are negative-shape and merge-safe; snapshot baselines are guarded by FR-071-CON-5 and by the FR-070 oracle |
| Scope boundary | Pass | Nothing exceeds `spec/spec.md` §2.2 as amended |
| Structural validation | Pass | `quire validate --scope . "spec/**/*.md"` reports zero errors and one pre-existing FR-031 warning |

Six findings — FND-1055, FND-1056, FND-1057, FND-1058, FND-1059 and FND-1060 —
should be resolved before `/spec-to-plan`, because each changes what a task
would build rather than how it would be reviewed. FND-1061 and FND-1062 should
be resolved before implementation lands, because each decides a path list or a
gate. The remaining seven can be dispositioned in the plan.

## Review-pass disposition

| Finding | Disposition | Where |
|---|---|---|
| FND-1055 | Acted on | FR-064 owns `src/compiler/backends/typescript-v1/model.mjs` and `model.d.mts` and declares the model's shape in a Behavior sub-section: the `package` block and `contractVersion` verbatim, one entry per definition in code-point identity order, the resolved scalar, fields with the three axes already decided, variants, constraints attached through the alias chain, relationships, operations, occurrences and document-level extensions. FR-064-CON-6 makes `buildModel` the only IR walker, FR-064-CON-7 requires the model to carry every node, and FR-065, FR-066 and FR-067 name FR-064 as the producer. |
| FND-1056 | Acted on | The emitted file set is eight, `errors.ts` included, with its own `exports` subpath. FR-065's Behavior, FR-065-AC-1 and FR-065-AC-13 and FR-066's Outputs and FR-066-AC-19 all say eight. |
| FND-1057 | Acted on | FR-066-CON-2, FR-066-AC-14 and NFR-024-AC-7 now prohibit a *type* assertion, measured syntactically, and exempt `as const` by name; FR-067 states the same so the two read consistently. FR-064-AC-17's `any` ban was narrowed to a type position so a JSDoc comment cannot fail it. |
| FND-1058 | Acted on | The bundler is gone. FR-065-CON-4 states the reachable-symbol walk and records the measurement this analysis took — that `import("esbuild")` and `import("rollup")` do not resolve from the repository root and that declaring one would change files NFR-025 asserts unchanged. FR-065-AC-12, FR-067-AC-11, FR-071's Behavior and FR-071-CON-7, and NFR-024-AC-12 follow. |
| FND-1059 | Acted on | Every payload claim was deleted. FR-066's authored instance corpus and its `ajv@8.20.0` differential are the instance-level evidence; FR-070 asserts only what the corpus can decide. |
| FND-1060 | Acted on | FR-069 gained the missing rules: a removed field is breaking, an added required field is breaking, an added optional field is additive subject to consumer policy, a removed enum or union variant is breaking, and an added variant to a closed generated enum is breaking per ARCH-008. `unknown` remains the fallback for genuinely unmodelled shapes only, and FR-069-CON-7 forbids narrowing the modelled-change set to match the yardstick. |
| FND-1061 | Acted on | FR-071 owns `test/fixtures/backends/typescript/tsconfig.json` and the single root-`tsconfig.json` `exclude` entry naming `test/fixtures/backends/typescript`; NFR-025's permitted-path list gained `tsconfig.json` with that one edit named, and NFR-025-AC-13 asserts every other member is byte-identical. The must-not-compile fixtures are checked by a separate invocation asserting expected diagnostic codes, so they are outside `make lint`'s program on purpose. The formatting half is answered by the injected formatter of FR-071, which is this repository's own pinned `biome`, so `biome format .` over the committed fixture is a no-op and `biome.json` stays prohibited. |
| FND-1062 | Acted on, and filed | The figure is gone from FR-070; the requirement states the slot delta read from the regenerated account, FR-070-CON-7 and FR-070-AC-20 forbid a recurrence, and NFR-025-AC-15 generalises the rule across the bundle. The cross-ticket reconciliation is `agent-ix/filament-core-data#63`. |
| FND-1063 | Acted on | `lossy` now has a consequence stated in the same words in FR-063, FR-065 and FR-068: an admissibility result of `lossy` generates, with manifest state `lossy` and the files a `success` document of the same shape produces; a **representability** loss emits zero files with state `unsupported`, because the committed target row declares `unsupportedFeaturePolicy: "fail"`. |
| FND-1064 | Acted on | FR-067 renders the document-level, per-type and per-field `extensions` as exported readonly data, with FR-067-AC-14..AC-17 and FR-067-CON-6's node-walk audit. That is where the issue's "extension APIs" deliverable is discharged, and FR-067 says so. |
| FND-1065 | Acted on | FR-071 owns `src/compiler/backends/format.mjs`, an injected formatter that renders generated text through the exactly-pinned `@biomejs/biome` binary already in the lockfile, exactly as `conformance/tools/format-json.mjs` does for JSON. FR-063 passes every emitted file through `options.format` before computing its digest. The declared style is tab indentation, double quotes and terminating semicolons — the repository's own — and NFR-024-AC-13 asserts `biome format` over the committed fixture reports no change. That is the "deterministic formatted output" deliverable, stated rather than left to the generator's habits. |
| FND-1066 | Acted on, and filed | FR-069 no longer classifies a contract-version move flatly as `conditional`; it states the normative round-trip rule of `ir-compatibility-policy.md` and records the possible disagreement with the corpus's reading as a dependency on `agent-ix/filament-core-data#64`, which this review pass filed. The posture now matches the one the bundle takes on GAP-011 rather than taking the corpus's side silently. |
| FND-1067 | Acted on | FR-064 renders no relationship descriptor and says so; FR-067 is the descriptor's one owner, with a single member list. FR-065-CON-5 was restated as the declared closed API surface: every type-derived export traces to a semantic identity, and the fixed API — the discriminant constant, the branded-reference constructor, each `validate<Type>`, `ValidationError`, `ValidationResult`, the structural-code register and the identity, metadata, roles, extension, occurrence and relationship maps — is a declared closed list, so the constraint no longer forbids the package's own API. |
| FND-1068 | Acted on | FR-063 declares the convention: a file rendering one or more type definitions carries exactly their identities, and a file rendering none carries the package's own identity minted as `ix://<owner>/<name>` from `package.identity`. Every emitted file reconciles, as `contracts-v1.md` requires, and none carries an empty set. FR-063-AC-7 states it. |
| FND-1069 | Acted on in part, and accepted | (a) FR-071 alone claims `test/fixtures/backends/typescript/**`; FR-065's Outputs now say so explicitly. FR-069 was not split — the id allocation for this ticket is fixed — and the pairing is justified in its Description instead, with the cost recorded as accepted rather than unnoticed. (b) FR-063-AC-16's exception was corrected to name `typescript-v1/admit.mjs` and `typescript-v1/loss.mjs` as the two registers under `src/compiler/backends/`, recording that `DIAGNOSTIC_CODES` lives outside that directory. (c) FR-063-CON-2 now records the knowingly inaccurate `runtime-schema-validator` self-declaration and the `AGPL-3.0-or-later` licence string, cites `agent-ix/filament-core-data#57`, and states that correcting a published fixture on the way through a backend is how a contract defect stops being visible. (d) Accepted: every one of the hundred rows gates the same P0 ticket, so a spread of priorities across them would encode a triage this ticket does not have. |
