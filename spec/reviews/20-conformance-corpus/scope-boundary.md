---
id: SR-054
title: "Scope and boundary review of the semantic conformance corpus and differential oracle"
type: SpecReview
analysis: scope-boundary
scope: "US-008, FR-035..039, NFR-015, NFR-016, spec/spec.md sections 2.1-2.2"
review_set: all
---
# Scope and boundary review

## Summary

Issue #20 owns a versioned conformance corpus under `conformance/` — the
manifest, construct register, base documents, case files, and the three corpus
schemas (FR-035, FR-038) — one JSON-level oracle implemented from the published
contract and from no implementation under test (FR-036), a differential harness
that compares each declared adapter's result only with the oracle verdict
(FR-037), and a generated coverage account, a threshold table, and an import
API (FR-039). NFR-015 fixes the evidence discipline (contract-derived, offline,
locale-independent, path-independent, byte-identical) and NFR-016 fixes the
isolation discipline (`conformance/**` plus a short permitted list, nothing
under `spikes/`, `src/`, `packages/`, `schema/`, or `fixtures/`). It does not
own the compiler frontend (issue #19), the emitter promotion (issue #27), the
Rust, TypeScript, or Python backends (issues #21, #22, #23), publication (issue
#11), or any repair of a defect the corpus finds; `spec.md` section 2.2 says so
in two bullets and US-008's constraints repeat it.

The boundary is drawn cleanly on one axis — nothing in this ticket writes into
another ticket's source tree — and unevenly on three others. The corpus reaches
outward through the published package surface (`./conformance` export and
`files` entry) that US-008 and section 2.2 forbid; it acquires a second
compatibility classifier alongside the FR-025 contract and
`compatibility-report.schema.json`; it authors an adapter invocation contract
and a promotion threshold table that bind four tickets carrying no reciprocal
obligation; and it requires cases for package, lock, and mapping rules that no
component in the bundle is stated to decide. The findings below record those
allocations; none of them moves work into or out of issue #20 by itself.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-330 | high | The `./conformance` subpath export commits a published package to a surface the ticket says it does not create. FR-039 Outputs add a `./conformance` export and the `conformance/` directory to the `package.json` `files` list, and FR-039-AC-5 verifies a consumer importing `@agent-ix/filament-core-data/conformance`. US-008's constraints say "the corpus publishes no package and changes no consumer", `spec.md` section 2.2 excludes "publishing the corpus as its own package", and NFR-016-AC-4 requires that the change "alters no consumer". Adding a subpath export to an already-published npm package is a permanent consumer-facing surface on that package even though no new package is published, and the corpus, the bases, and the oracle become shipped bytes under the package's own version and deprecation policy. No requirement says whether that surface is public, internal, or experimental, or who may remove it. | FR-039 Outputs, FR-039-AC-5, FR-039 Behavior (export list), US-008 Constraints, NFR-016 Scope (permitted `package.json`), NFR-016-AC-4, `spec.md` 2.2 |
| FND-331 | high | The package-, lock-, and mapping-level rules the corpus is required to cover are decided by nobody. FR-038 Behavior requires a `negative` case for an import naming a package the lock does not resolve, a package-graph cycle, a mapping naming an identity no type declares, a lock whose `manifestDigest` no longer matches the manifest, and an omitted identity the profile does not declare as loss, and FR-038-AC-2 requires each to pass with an exact locus. FR-036's Behavior list allocates the oracle only document-level schema and cross-field rules plus resolution "to a document type or a lock export"; it never states that the oracle reads `package-manifest.schema.json`, `package-lock.schema.json`, `mapping.schema.json`, or `profile.schema.json`, and FR-036 Inputs make the lock and package graph an "optional resolution context". Whether the oracle, the corpus gate, or the FR-021/FR-022 contract owner decides those five expectations is unstated, and FR-038-AC-6 requires each register row to name a deciding layer that FR-036 does not implement. | FR-038 Behavior, FR-038-AC-2, FR-038-AC-6, FR-036 Inputs, FR-036 Behavior, FR-021, FR-022 |
| FND-332 | high | The corpus acquires a second compatibility classifier next to the one this repository already owns. FR-036 Behavior gives the oracle a full six-value classification (`patch`, `additive`, `conditional`, `breaking`, `unknown`, `invalid`) with its own change-family rules and most-restrictive selection, and FR-036-AC-7 tests it. FR-025 already states that classification, `compatibility-report.schema.json` already carries the report shape (`changes[].surface`, `affectedConsumers`, `targetResults`, `aggregateDisposition`, `requiredGates`, `consumerEvidenceStatus`), and FR-038 Inputs name "the compatibility dispositions of FR-025 and `compatibility-report.schema.json`" as the corpus's input. The oracle's classifier covers only a document pair and emits `adapter-result.schema.json`, so it silently drops the profile, mapping, representation, generated-target, and consumer-evidence surfaces FR-025 requires, yet the corpus `compatibility` register family judges implementations against the oracle's narrower rule set. No requirement says the oracle restates FR-025, whether a disagreement between the two is a corpus defect or an FR-025 defect, or why the FR-025 classifier is not itself an adapter in the FR-037 registry. | FR-036 Behavior (classification), FR-036-AC-7, FR-038 Inputs, FR-038 Behavior (`compatibility` family), FR-025 Behavior, `schema/semantic/v1/compatibility-report.schema.json`, `contracts-v1.md` "Compatibility" |
| FND-333 | high | The adapter registry and `adapter-result.schema.json` are a cross-ticket invocation contract authored on one side only. FR-037-CON-1 requires the registry to declare an adapter for each of issues #21, #22, #23, and the issue #19 compiler frontend "whether or not it is runnable today", FR-037 requires each result to be an `adapter-result.schema.json` document carrying `adapter`, `adapterVersion`, `caseId`, `support`, `resultState`, `diagnostics[]`, and `normalized`, and FR-037-CON-2 requires the harness to start each adapter as a process using a registry command. Nothing in this bundle or in `spec.md` places a reciprocal obligation on issues #19, #21, #22, or #23 to emit that document or expose that command, no requirement allocates authorship or ownership of `conformance/adapters/**` (which FR-036-AC-5 and NFR-015-AC-3 only forbid the oracle from importing), and NFR-016 forbids this branch from touching the source trees where those adapters would otherwise live. The seam therefore has a declared shape, an owner for neither side of it, and no contract test. | FR-037 Inputs, FR-037 Behavior, FR-037-CON-1, FR-037-CON-2, FR-036-AC-5, NFR-015-AC-3, NFR-016 Scope |
| FND-334 | medium | `thresholds.json` sets promotion policy for tickets this one does not own, with no stated relation to the issue #11 publication gate. FR-039 requires the corpus to declare, for issues #19, #21, #22, and #23, the required construct-register coverage, corpus pass rate, permitted divergence count, and mutation-detection score, "each with the issue that owns it", and to declare a backend's thresholds before that backend is promoted. `contracts-v1.md` reserves promotion to a separately ticketed and gated action and NFR-016 lists issue #11 as downstream, but no requirement says whether a threshold row is binding on the promoting ticket or advisory, who may change a value once a backend is in flight, or what happens when the owning issue declines the number written here. | FR-039 Behavior (thresholds), FR-039-AC-2, FR-039-AC-7, FR-039 Inputs, `contracts-v1.md` "Promotion boundary", NFR-016 Dependencies |
| FND-335 | medium | Arbitration of a divergence is unallocated. FR-037 suppresses a divergence only on a register entry carrying an owning issue, severity, rationale, and `reviewBy` date, fails on an expired entry, and fails on an entry no run reproduces; NFR-015-AC-4 requires a disagreement with a merged implementation to be recorded "rather than resolved by changing the expected result". No requirement names who decides whether a given divergence is an implementation defect or a corpus defect, who may author or extend an entry, or how the corpus corrects an expectation that turns out to misread the contract — which NFR-015-AC-4 reads as forbidding outright. With the yardstick deliberately authored away from the implementer, the ticket that resolves the dispute is the one boundary the bundle never names. | FR-037 Behavior (divergence register), FR-037-AC-5, NFR-015-AC-4, US-008 Constraints ("records rather than repairs") |
| FND-336 | medium | The oracle decides a rule that ownership assigns to consumers. FR-036 Behavior requires the oracle to decide "a `required: true` extension whose `capability` no declared consumer policy admits", which reads `consumer-policy.schema.json`. `ownership.md` (ARCH-004) and `contracts-v1.md` both place application and persistence policy with Filament consumers, and FR-036 Inputs admit only an optional lock and package graph as resolution context, not a consumer policy set. Which policy document the oracle reads for a corpus case, whether a case may author one, and whether a missing policy makes the case indeterminate rather than negative, are all unstated. | FR-036 Behavior, FR-036 Inputs, `docs/semantic-data-system/ownership.md` (ARCH-004), `contracts-v1.md` "Dynamic and legacy consumers", `schema/semantic/v1/consumer-policy.schema.json` |
| FND-337 | medium | Two independent version axes govern one shipped artifact with no rule binding them. FR-035 makes `corpusVersion` SemVer over case content (added case minor, changed `expected` major, prose patch) and FR-039 makes the import API additive across a minor `corpusVersion` and forbids removing an export without a major bump — but the artifact reaches consumers as a subpath of `@agent-ix/filament-core-data`, whose own version (`0.1.0` today) is set by the package's release policy. No requirement says whether a major `corpusVersion` obliges a package major, whether a consumer pins the corpus by package range or by `corpusVersion`, or which version the FR-039-AC-5 consumer test resolves. | FR-035 Behavior (`corpusVersion`), FR-039 Behavior (import API stability), FR-039-AC-5, `package.json` `version`, FND-330 |
| FND-338 | medium | The Python half of the gate has an owner but no artifact. NFR-016-AC-3 requires the conformance tests to run from both `make test` and `poetry run pytest`, and NFR-016's permitted list names `tests/test_conformance_corpus.py`, yet every artifact FR-035..FR-039 produces is `.mjs` or JSON and FR-036-CON-1 confines the oracle to the pinned JSON Schema validator already in `devDependencies`. Whether the Python test re-decides anything, shells out to the Node oracle, or only asserts corpus file integrity is unstated, `pyproject.toml` is absent from the permitted-path list although NFR-016-AC-2 inspects it, and a Python test that shells out to `node` makes the Python gate depend on a toolchain the Python packaging does not declare. | NFR-016 Scope, NFR-016-AC-2, NFR-016-AC-3, FR-036 Outputs, FR-036-CON-1 |
| FND-339 | low | NFR-016's permitted-path list cannot be applied mechanically at its edges. It permits both `reviews/**` and `spec/reviews/**` although only the latter exists (the same hygiene defect SR-042 FND-192 recorded against NFR-014), names two individual test files rather than directories so a second conformance test file would fail its own gate, permits `Makefile` "new targets only" and `package.json` for three named edits — neither of which a changed-path gate can distinguish from any other edit to those files — and permits `docs/semantic-data-system/**` "other than reading", which is a prohibition phrased as a permission. | NFR-016 Scope, NFR-016-AC-1, NFR-016 Measurement (changed-path gate), SR-042 FND-192 |
| FND-340 | low | The gate that checks contract provenance reads outside the oracle's declared reach, and its owner is unnamed. FR-035-AC-3 and NFR-015-AC-1 require every `derivedFrom` quote to occur verbatim in an artifact under `schema/semantic/v1/` or `docs/semantic-data-system/`, and FR-038-CON-1 requires every register `source` to resolve to such a path, but FR-036 forbids the oracle to read any path outside `conformance/` and `schema/` and NFR-015 measures that as a zero-threshold metric. The quote and source checks therefore belong to the corpus gate rather than the oracle, which no requirement states, and `docs/semantic-data-system/` is outside the oracle's allowance in any case. | FR-035-AC-3, FR-038-CON-1, NFR-015-AC-1, NFR-015 Measurement, FR-036 Behavior (path restriction) |
| FND-341 | low | The issue #4 prototype emitter is a judged implementation with no adapter. NFR-015 Scope lists it among the judged implementations, US-008-EX-5 and FR-038-AC-5 require the defect register to reproduce "every prototype-emitter divergence recorded for this issue", but FR-037-CON-1 enumerates only issues #19, #21, #22, and #23 in the registry and NFR-016 prohibits touching `spikes/**`. The defect cases therefore exist with no adapter that can run them, and no requirement says whether the spike is judged once by inspection, judged through the issue #27 promotion, or not judged at all. | NFR-015 Scope, US-008-EX-5, FR-038 Behavior (`defect` register), FR-038-AC-5, FR-037-CON-1, NFR-016 Scope |

## Boundary Allocation

| Concern | Owner | Class |
|---|---|---|
| Corpus manifest, construct register, case index, per-case and corpus digests (FR-035) | filament-core-data issue #20 | core |
| Base documents, case files, JSON Patch construction, minimization budget (FR-035) | filament-core-data issue #20 | core |
| `corpus-case`, `corpus-manifest`, and `adapter-result` schemas under `conformance/schema/` (FR-035) | filament-core-data issue #20 | core |
| Provenance discipline: `derivedFrom`, `blessedFromRun`, `blessing` block (FR-035, NFR-015) | filament-core-data issue #20 | cross-cutting |
| JSON-level oracle: schema validation, cross-field rules, identity, alias and reference resolution, depth bound, normalization, ordering (FR-036) | filament-core-data issue #20 | core |
| Oracle purity, determinism, locale and path independence, static import and syscall analysis (FR-036, NFR-015) | filament-core-data issue #20 | cross-cutting |
| Differential harness, oracle-only comparison, unmet accounting, report determinism (FR-037) | filament-core-data issue #20 | core |
| Coverage account regeneration and the coverage gate (FR-039) | filament-core-data issue #20 | infrastructure |
| Mutation catalogue and mutation-detection gate (FR-039) | filament-core-data issue #20 | core |
| Changed-path, dependency, and publication gates for the branch (NFR-016) | filament-core-data issue #20 | cross-cutting |
| Package-, lock-, mapping-, and profile-level case expectations (FR-038 negatives) | Unallocated, see FND-331 | core |
| Compatibility classification for corpus `compatibility` cases | filament-core-data FR-025 contract, restated by the FR-036 oracle, see FND-332 | core |
| Consumer capability admission for a `required: true` extension | Consumer policy per ARCH-004, decided in the oracle, see FND-336 | external, decided here |
| `conformance/adapters/**` contents and each adapter's registry command | Unallocated, see FND-333 | external to this ticket |
| Adapter result emission conforming to `adapter-result.schema.json` | Issues #19, #21, #22, #23 — no reciprocal requirement, see FND-333 | external to this ticket |
| Divergence arbitration: corpus defect versus implementation defect | Unallocated, see FND-335 | cross-cutting |
| Promotion thresholds and the decision to promote a backend | Declared here, owned by issues #19, #21, #22, #23 and the issue #11 gate, see FND-334 | external to this ticket |
| `./conformance` export, `files` entry, and the published consumer surface | Issue #20 by FR-039, excluded by US-008 and `spec.md` 2.2, see FND-330 | external to this ticket |
| Corpus-versus-package version binding | Unallocated, see FND-337 | infrastructure |
| Python conformance gate contents (`tests/test_conformance_corpus.py`) | Issue #20, artifact unstated, see FND-338 | infrastructure |
| Compiler frontend implementation, its diagnostics and loci | Issue #19 | external |
| Prototype emitter promotion into `src/` | Issue #27 | external |
| Rust, TypeScript, Python backend implementations | Issues #21, #22, #23 | external |
| Publication of `@agent-ix/filament-core-data` and the publication gate | Issue #11 | external |
| IR v1.1 node shapes, multiplicity, units, relationships, operations, clauses, constraint vocabulary | filament-core-data FR-027..FR-030 (issue #34) | core, prior ticket |
| Semantic-core declaration grammar, kernel scalars, lowering table | filament-core-data FR-031..FR-034 (issue #35) | core, prior ticket |
| Package graph, exports, locks, fingerprints | filament-core-data FR-021 | core, prior ticket |
| Clause text parsing, normalization, typechecking | `agent-ix/quire-contract-ir#52` frontends | external |
| Quire parsing, validation, extraction, byte-splice | quire-rs | external |
| Module catalog, locks, install policy | quoin | external |
| Domain vocabulary and module archetypes | Module repositories | external |
| Application adapters, ORM, persistence and presentation policy | Filament consumers | external |
| Frozen TypeSpec spike, `src/`, `packages/`, `schema/`, `fixtures/`, lockfiles, Avro bindings | Prior and later tickets, frozen for #20 by NFR-016 | external to this ticket |

## External Dependencies

| Dependency | Type | Assumed or Guaranteed | Contract |
|---|---|---|---|
| `schema/semantic/v1/*.json` (thirteen published schemas) | Contract source read by the oracle and cited by cases | Guaranteed | FR-035-AC-2 base validation, FR-035-AC-3 `derivedFrom` path and quote check, FR-038-CON-1 |
| `docs/semantic-data-system/contracts-v1.md` | Prose contract source for cross-field expectations | Guaranteed | FR-035-AC-3 verbatim quote check, NFR-015-AC-1 |
| Semantic-core grammar and lowering table (FR-031..FR-034, issue #35) | Input to case authoring | Assumed | FR-035 Inputs, prose only |
| Pinned JSON Schema 2020-12 validator already in `devDependencies` | Toolchain | Guaranteed | FR-036-CON-1 analysis, NFR-016-AC-2 zero new runtime dependencies |
| Issue #19 compiler frontend | Judged adapter | Assumed (FND-333) | FR-037-CON-1 registry row, `adapter-result.schema.json`, no obligation stated on #19 |
| Issue #21, #22, #23 backends | Judged adapters | Assumed (FND-333) | FR-037-CON-1 registry rows with `status: unavailable` and owning issue |
| Issue #4 prototype emitter | Judged implementation named by NFR-015 | Assumed (FND-341) | Defect register rows only; no registry adapter |
| Issue #27 emitter promotion | Concurrent change set on `src/` | Guaranteed | NFR-016 changed-path gate, NFR-016-AC-1 |
| FR-025 compatibility contract and `compatibility-report.schema.json` | Classification authority restated in the oracle | Assumed (FND-332) | FR-038 Inputs prose; no contract test between the two rule sets |
| `consumer-policy.schema.json` and declared consumer capabilities | Input to one oracle rule | Assumed (FND-336) | None named |
| Package manifests, locks, mappings, profiles (FR-021, FR-022) | Input to six required negative cases | Assumed (FND-331) | FR-038-AC-2 only; no oracle behavior states the rules |
| Issue #11 publication gate | Downstream consumer of coverage, thresholds, and the corpus | Assumed (FND-334, FND-330) | FR-039 Inputs prose, NFR-016 Dependencies |
| `package.json` consumer surface of `@agent-ix/filament-core-data` | Published export the corpus is added to | Assumed (FND-330, FND-337) | FR-039-AC-5 integration test; no surface-stability requirement |
| `make test` and `poetry run pytest` gates | Execution context for the corpus tests | Guaranteed | NFR-016-AC-3 offline run (artifact unstated, FND-338) |

`spec.md` sections 2.1 and 2.2, US-008's constraints, and NFR-016's permitted
and prohibited lists agree on the one boundary that matters most for this
ticket: nothing in issue #20 edits the implementations it judges, and the
prohibited-path list is mechanically checkable over `spikes/`, `src/`,
`packages/`, `schema/`, `fixtures/`, and the lockfiles. The findings sit on the
other three edges. FND-330 and FND-337 are outward reach through the published
package that section 2.2 and US-008 explicitly disclaim. FND-331, FND-335, and
FND-336 are decisions the bundle requires but allocates to no component.
FND-332, FND-333, and FND-334 are authorities and interfaces asserted here over
work that other tickets own, without a contract test or a reciprocal
obligation on the far side. FND-338, FND-339, FND-340, and FND-341 are gate
hygiene on the isolation and provenance rules themselves.
