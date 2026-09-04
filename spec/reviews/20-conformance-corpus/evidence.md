---
id: SR-052
title: "Evidence review of the semantic conformance corpus and differential oracle"
type: SpecReview
analysis: evidence
scope: "US-008, FR-035..039, NFR-015, NFR-016, spec/tests.md TC-280..332"
review_set: all
---
# Evidence-method review

## Summary

The issue #20 slice carries 46 acceptance-criterion obligations (FR-035-AC-1..8,
FR-036-AC-1..7, FR-037-AC-1..8, FR-038-AC-1..8, FR-039-AC-1..7, NFR-015-AC-1..4,
NFR-016-AC-1..4), 14 NFR metric rows (NFR-015-M-1..8, NFR-016-M-1..6), 10 named
constraints, and 53 matrix rows (TC-280..332). `quoin advise --json`
(2026-09-03) carried all 60 catalogued obligations: **zero inconclusive**, 15
uncatalogued (13 free-text metric methods plus FR-039-AC-5's `Integration`), and
6 mismatches. The 10 constraint `Validation` cells are not obligations the
advisor carries; they were judged against the same convention as the ACs.

Four of the six mismatches are the lexical pattern SR-040 recorded at FND-175 and
SR-031 at FND-076/FND-078: `property_shapes=example|universal` recommends
`unit-testing` / `bdd-spec-by-example` for obligations authored `Analysis`. For
FR-036-AC-5, NFR-015-AC-3, NFR-016-AC-1, and NFR-016-AC-2 the authored `Analysis`
is correct and the rows (TC-293, TC-327, TC-329, TC-330) are already `Static`, so
they follow the FND-076 pairing and warrant nothing. The remaining two —
NFR-015-AC-4 and NFR-016-AC-4, both authored `Inspection` with `Manual` rows —
are the two the advisor is right about and are FND-540 and FND-541 below.

The 40 non-mismatched obligations agree with the catalog at the level of the
method class, but the **Type column disagrees with the `Verification` cell in ten
of them**: ten obligations authored `Test` are discharged by rows typed `Static`
(FND-537), which is exactly the split SR-031 settled at FND-079 and SR-040
repeated at FND-167. The advisor cannot see this, because it reads the
`Verification` cell and not the matrix Type; it is the principal finding here and
it is a third recurrence.

Judgement was applied to the residue and is labelled as such below. Three shapes
recur. First, `universal` matched on "Every case…" eighteen times, but the domain
is a finite committed corpus, so exhaustive iteration — not generation — is the
right discharge; the four obligations whose domain is genuinely open are called
out separately (FND-547). Second, determinism is typed inconsistently: the same
"two runs, compare bytes" shape is `Property` at TC-290 and TC-326 and `Snapshot`
at TC-303 (FND-542). Third, two NFR metrics map to no test case, the shape SR-040
recorded at FND-168 (FND-539, FND-545, FND-546).

Nothing in this slice matched `fault-detection-unmeasured` or
`fault-detection-failed`, because no obligation is bound to a run yet — TC-280..332
are all `🚧 issue #20`. That is expected, not a gap; FR-039's committed mutation
catalogue and mutation-detection score are the catalog's `mutation-testing`
arriving by design rather than by escalation, and are recorded at FND-555.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-537 | medium | Ten obligations are authored `Test` while their rows are typed `Static`: FR-035-AC-3 (TC-282), FR-035-AC-7 (TC-286), FR-035-AC-8 (TC-287), FR-035-CON-2 (TC-288), FR-037-CON-1 (TC-305), FR-038-CON-1 (TC-314), FR-038-CON-2 (TC-315), FR-039-AC-2 (TC-319), FR-039-AC-4 (TC-321), NFR-015-AC-1 (TC-325). SR-031 FND-079 settled this split by retyping TC-219, and SR-040 FND-167 repeated it for eight #35 rows; the `Analysis`+`Static` pairs in this slice (TC-293, TC-327, TC-329, TC-330) follow it and these ten do not. The Type decides which suite and tag mint the evidence. Judgement: every one of these ten reads data the corpus commits — case files, `corpus.json`, `registry.json`, `thresholds.json`, the mutation catalogue — and each also states a negative half that has to run a gate against a mutated input ("removing it fails the gate", "a blessed case with no `blessing` block fails"). That is an executable oracle over a fixture, not a reading of source, so type all ten `Unit` and leave `Static` for the source scans (TC-293, TC-300, TC-306, TC-327, TC-329, TC-330). | FR-035-AC-3, FR-035-AC-7, FR-035-AC-8, FR-035-CON-2, FR-037-CON-1, FR-038-CON-1, FR-038-CON-2, FR-039-AC-2, FR-039-AC-4, NFR-015-AC-1, TC-282, TC-286, TC-287, TC-288, TC-305, TC-314, TC-315, TC-319, TC-321, TC-325 |
| FND-538 | medium | FR-037-AC-3 is one obligation authored `Test` discharged by two rows of different kind: TC-299 (`Unit`) runs two agreeing adapters against the oracle, and TC-300 (`Static`) asserts "the harness source contains no comparison between two adapter results". The second clause of the criterion ("no comparison in the harness reads a second adapter's result") is a property of the source text, not of a run, and is the only evidence that covers EC-038 for cases nobody wrote. One `Verification` cell cannot be both. Judgement: split the criterion — keep the behavioural half as FR-037-AC-3 (`Test`, TC-299 `Unit`) and author the source-scan half as a new criterion or as FR-037-CON-2's second validation with `Analysis` (TC-300 stays `Static`), so the static scan is discharged by a named obligation rather than riding on a `Test` cell. | FR-037-AC-3, FR-037-CON-2, TC-299, TC-300, EC-038 |
| FND-539 | medium | NFR-015's seventh metric (`Oracle imports of a judged implementation`, target 0, method `Static import analysis`) maps to no NFR-015 test case. The NFR-015 coverage row lists TC-325..328, which discharge metrics 1–2, 3–6, and 8 respectively; the import scan exists only as TC-293, which traces FR-036-AC-5 and FR-036-CON-1 and not NFR-015. The Overview requires every metric to map, and this is the metric that carries the whole blessing-free claim. Same shape as SR-040 FND-168. Judgement: add NFR-015 to TC-293's traces, or split TC-327 into an import scan and an effect scan and trace both to NFR-015. | NFR-015, TC-293, TC-327, spec/tests.md |
| FND-540 | medium | NFR-016-AC-4 ("the change publishes no package and alters no consumer, catalog pin, or Avro contract") is authored `Inspection` with TC-332 typed `Manual`; the advisor mismatches it to Test. Every clause is mechanical: "alters no consumer, catalog pin, or Avro contract" is the same changed-path diff TC-329 and TC-330 already run, and "publishes no package" is a check that the branch triggers no release or publish workflow — a file-set and workflow-trigger scan, not a reading. NFR-016's own metric table already assigns `Changed-path gate` to five of its six metrics. Judgement: author `Analysis` and type TC-332 `Static`, extending the TC-329 gate's prohibited set with `.github/workflows/` release triggers, catalog pins, and Avro contract paths; a `Manual` row here is the only thing standing between this NFR and a fully automated gate. | NFR-016-AC-4, NFR-016, TC-329, TC-330, TC-332 |
| FND-541 | medium | NFR-015-AC-4 ("where the corpus disagrees with a merged implementation, the disagreement is recorded in `conformance/divergences.json` rather than resolved by changing the expected result") is authored `Inspection` with TC-328 typed `Manual`; the advisor mismatches it to Test. The criterion carries two halves. The first — every divergence a run observes has a register entry — is already mechanical and already specified: FR-037 fails any unsuppressed divergence (TC-297, TC-298) and fails an expired or non-reproducing entry (TC-302). The second — that an expected result was not quietly edited to absorb a disagreement — is a claim about the history of `expected` blocks, which the FR-035 SemVer rule makes checkable too: a changed `expected` block without a major `corpusVersion` bump already fails (TC-285, and the evolution row at spec/tests.md line 601). Judgement: bind the mechanical halves to TC-297/TC-302 and to the versioning gate, and narrow the `Inspection` to the irreducible residue — a reviewer confirming the *rationale* of each register entry — so that `Manual` covers a judgement rather than a diff. Left as authored, this row is the only P0 in the slice that no run can fail. | NFR-015-AC-4, TC-285, TC-297, TC-298, TC-302, TC-328 |
| FND-542 | medium | The same determinism shape is typed three ways. FR-036-AC-2 (two oracle runs plus a Turkish locale) is `Property` at TC-290; NFR-015-AC-2 (verdicts, report, and coverage across two runs, two locales, two directories) is `Property` at TC-326; FR-037-AC-6 (two consecutive harness runs byte-identical) is `Snapshot` at TC-303. A `Snapshot` compares a run against a committed golden file; determinism compares run A against run B and commits nothing, which is what the advisor's `metamorphic-testing` recommendation for FR-036-AC-2 names. TC-303 as typed will mint an approval file that has to be regenerated whenever the report's content legitimately changes, and it will then pass on a non-deterministic harness whose first run happens to match the golden. Judgement: type TC-303 `Property` alongside TC-290 and TC-326, and keep `Snapshot` for the two rows where a committed artifact genuinely is the oracle (TC-285 `corpus.json` digest, TC-318 `coverage.json` regeneration). | FR-036-AC-2, FR-037-AC-6, NFR-015-AC-2, TC-285, TC-290, TC-303, TC-318, TC-326 |
| FND-543 | medium | FR-036-AC-6 ("the oracle's `normalized` output for a `1.0.0` document is byte-identical to the canonical form of the input") is typed `Unit` at TC-294; the advisor recommends `bdd-spec-by-example` / `golden-approval-testing` on `example`. Both under-read the obligation: FR-036's behaviour clause states the invariant as "a `1.0.0` document gains no bytes", which is a round-trip identity over every `1.0.0` document, not over one fixture. It is the invariant that separates normalization from mutation, and its counterexamples are exactly the documents nobody thought to write. Judgement: type TC-294 `Property` and quantify it over the corpus's `1.0.0` bases and cases at minimum, with generated documents if the harness gains a generator; the FR-027 materialization asymmetry (`1.1.0` materializes, `1.0.0` does not) is the property under test. | FR-036-AC-6, FR-027, TC-294 |
| FND-544 | medium | FR-039-AC-5 is authored `Integration` in its `Verification` cell, which `quoin advise` reports as **uncatalogued** — the cell carries a method class (`Test`, `Analysis`, `Inspection`, `Demonstration`), and `Integration` is an evidence *kind*, which is what the matrix Type column carries. As authored, the auditor has no catalogued method to check conformance against, and this is the only AC in the slice with the defect. Judgement: author `Test` in the `Verification` cell and leave TC-322 typed `Integration`; the pairing FR-037-AC-1/TC-297 (`Test` + `Integration`) is already the correct form in the same slice. | FR-039-AC-5, FR-037-AC-1, TC-297, TC-322 |
| FND-545 | low | NFR-016's first metric (`Changed paths outside the permitted list`, target 0) states an **allow-list** check against the Scope section's permitted paths, but TC-329 checks a **deny-list** ("the gate excludes `spikes/`, `src/`, `packages/`, `schema/`, `fixtures/`, and both lockfiles"), which is metrics 2 and 3. A path that is in neither list — a new top-level directory, a workflow file, a root config — passes TC-329 and violates metric 1. Judgement: state TC-329 as the allow-list classification NFR-016's Verification prose already describes ("classify every changed path against the permitted list"), which subsumes metrics 1, 2, and 3 in one gate. | NFR-016, NFR-016-AC-1, TC-329 |
| FND-546 | low | NFR-016's sixth metric (`Corpus repository files changed`, target 0, method `Changed-path gate`) maps to no test case in TC-329..332, and no changed-path gate running on this branch can observe a repository it does not contain. The obligation it encodes — NFR-016's Scope prohibition on "any file in another repository" — is real but is discharged by the branch's own file set being confined to this repository, not by a gate. Judgement: either drop the metric as unverifiable-by-construction and keep the Scope prohibition, or restate it as what a gate here can see (no submodule, no `git` remote write, no path outside this working tree) and give it a row. | NFR-016, TC-329 |
| FND-547 | low | Eighteen obligations drew `property-based-testing` on `property_shapes=universal` (FR-035-AC-1..5, AC-7, AC-8; FR-037-AC-2, AC-4, AC-5, AC-7, AC-8; FR-038-AC-1, AC-6, AC-7, AC-8; FR-039-AC-3, AC-7; NFR-015-AC-1). In all eighteen the "every" quantifies over a **finite committed set** — the case files, the base documents, the construct register, the mutation catalogue — so exhaustive iteration is a complete proof and generation adds nothing; the `Unit` and `Static` types stand and no `Property` suite is warranted. Judgement: the recommendation is a lexical match on "Every …", not a gap. The obligations whose domain is genuinely open are the four handled separately: FR-036-AC-2 and NFR-015-AC-2 (already `Property`), FR-036-AC-6 (FND-543), FR-036-AC-3 (FND-549), and FR-039-CON-2 (FND-548). Recorded so the eighteen are not re-raised as unverified. | FR-035-AC-1, FR-035-AC-2, FR-035-AC-4, FR-035-AC-5, FR-037-AC-2, FR-037-AC-4, FR-037-AC-5, FR-037-AC-7, FR-037-AC-8, FR-038-AC-1, FR-038-AC-6, FR-038-AC-7, FR-038-AC-8, FR-039-AC-3, FR-039-AC-7 |
| FND-548 | low | FR-039-CON-2 ("the import API exposes no mutable reference to corpus data, so that a consumer mutating a returned case cannot affect a later load") is validated `Test` and discharged inside TC-323 (`Unit`) alongside `loadCase`'s throw. Immutability is quantified over arbitrary mutations of an arbitrary returned object — a returned case, a nested `ops` array, a `derivedFrom` entry, a base document — and a single hand-written mutation shows only that one path is defended. Judgement: give the immutability half its own row typed `Property` (mutate every reachable node of a returned case, reload, compare), and leave TC-323 `Unit` for the `loadCase` error. | FR-039-CON-2, TC-323 |
| FND-549 | low | FR-036-AC-3 (self-referential alias, mutually recursive alias pair, self-referential composite relationship yield `DEPTH_LIMIT_EXCEEDED` rather than unbounded recursion) is typed `Unit` at TC-291 with the boundary row fixing depth 256/257. The three named shapes are a fixture set, but the underlying obligation from FR-036 is *termination* on any cyclic type graph, which the three do not exhaust — a cycle through `sequence.items`, through `map.values`, or through a `union` `payloadType` is a different traversal path. Judgement: keep TC-291 `Unit` for the three named shapes and the 256/257 boundary, and add a generated-cycle `Property` row for termination, or narrow FR-036's behaviour clause to the three shapes so the criterion and the statement agree. | FR-036-AC-3, TC-291 |
| FND-550 | low | NFR-016-AC-3 ("the conformance tests run from `make test` and `poetry run pytest` without a network connection") is authored `Test` with TC-331 typed `Integration`, which is the right pairing, but as stated the row proves only that a run *succeeded*, not that it could not reach the network — a suite with a live connection passes it unchanged. Judgement: state TC-331 as a run under a denied network (a sandbox with no egress, or a DNS/socket stub that fails the test on first use), so the row can fail; otherwise the offline claim is discharged by a run that happens not to need the network. | NFR-016-AC-3, TC-331 |
| FND-551 | low | Thirteen NFR metric methods are uncatalogued free text, so the auditor cannot check conformance against them: NFR-015's `Corpus gate` (M-1, M-2), `Repeat-run comparison` (M-3, M-4), `Locale-varied run` (M-5), `Directory-varied run` (M-6), `Static import analysis` (M-7), `Static analysis` (M-8), and NFR-016's `Changed-path gate` (M-1, M-2, M-3, M-6) and `Manifest inspection` (M-4). NFR-016-M-5 (`Inspection`) is the only catalogued one. This is the same form SR-040 recorded at FND-174 for NFR-014 and SR-031 did not flag for NFR-013, so it is now a three-slice pattern rather than a local slip. Judgement: no change to the plan; recorded so a later catalog pass can name the Static, Snapshot, Property, or Inspection method each maps to, and so the pattern is visible when the metric-method column is next revisited. | NFR-015, NFR-016 |
| FND-552 | low | Two advisor recommendations are lexical false positives and warrant no suite. `performance-benchmarking` (Benchmark) matched `quantified-threshold` on all fourteen metric rows (NFR-015-M-1..8, NFR-016-M-1..6) whose targets are `0` — the same match SR-040 recorded at FND-175 for NFR-014-M-1..5. `sca-sbom` (Analysis/Static) matched `supply-chain` on FR-035-AC-7, whose subject is a case's `provenance.blessedFromRun` flag and has nothing to do with a dependency supply chain. Recorded so neither is mistaken for a gap. | FR-035-AC-7, NFR-015, NFR-016, TC-286 |
| FND-553 | low | NFR-015-AC-1 restates FR-035-AC-3 (every `derivedFrom` quote occurs verbatim) and FR-035-AC-7 (no case is blessed from a run) as one criterion, and TC-325 repeats TC-282 and TC-286 with the same wording; all three are typed `Static` and all three are P0. The duplication is consistent, so nothing is contradicted, but two suites will assert the same two facts and the FND-537 retype has to be applied to all three rows together or they will diverge. Judgement: either trace TC-282 and TC-286 to NFR-015-AC-1 and drop TC-325, or keep TC-325 as the NFR-level roll-up and state it as such rather than restating the checks. | NFR-015-AC-1, FR-035-AC-3, FR-035-AC-7, TC-282, TC-286, TC-325 |
| FND-554 | low | TC-296 ("a non-object input returns `invalid` with exactly one `INVALID_DOCUMENT` diagnostic at pointer `\"\"`") traces FR-036-AC-1, which states only that the oracle's verdict equals each corpus case's authored `expected` block. The behaviour it exercises is an FR-036 behaviour clause with no acceptance criterion of its own, so the evidence discharges an obligation the `Verification` cell of AC-1 does not describe, and removing the clause would leave TC-296 green against AC-1. Judgement: author the non-object case as its own acceptance criterion (`Test`), or add it to the corpus as a `negative` case so TC-289 covers it under AC-1 as written. | FR-036-AC-1, TC-296 |
| FND-555 | low | FR-039-AC-3 and FR-039-AC-4 declare a committed mutation catalogue, a mutation-detection score, and a gate that fails when a catalogued mutation goes undetected — which is the catalog's `mutation-testing` method arriving by design rather than as an escalation, and is why nothing in this slice matched `fault-detection-unmeasured`. Both are authored `Test` with `Unit` and `Static` rows (TC-320, TC-321) and neither cell names the method, so an auditor reading the `Verification` column sees a unit test where a fault-detection measure exists. Judgement: no change to the suites; record `mutation-testing` as the method for FR-039-AC-3 when the metric-method vocabulary of FND-551 is settled, and note that `thresholds.json`'s required mutation-detection score is what turns it into a gate. | FR-039-AC-3, FR-039-AC-4, TC-320, TC-321 |

## Evidence Portfolio

| Concern | Evidence |
|---|---|
| Case and manifest files conform to the corpus schemas | Unit (TC-280) |
| Base documents are contract-valid and diagnostic-free before any patch | Unit (TC-281) |
| Provenance: every expectation is quoted from a contract artifact and none is blessed from a run | TC-282, TC-286, TC-325, pending the `Unit` retype in FND-537 and the de-duplication in FND-553 |
| Case identity, id pattern, and 64-node minimization budget | TC-287, TC-288, pending FND-537 |
| Exactly one violation per `negative` case, and an exact `locus` on every origin-addressed diagnostic | Unit (TC-283, TC-284) |
| Corpus digest and `corpusDigest` reproduce the manifest byte-for-byte | Snapshot (TC-285) — a committed artifact genuinely is the oracle here |
| Oracle verdict equals every case's authored `expected` block | Unit (TC-289); the non-object input case TC-296 pending FND-554 |
| Oracle determinism and locale independence | Property (TC-290) |
| Oracle terminates on cyclic graphs at the declared depth bound | Unit (TC-291); generated-cycle termination pending FND-549 |
| Five identity and resolution failures are five distinct diagnostic codes | Unit (TC-292) |
| Oracle imports no judged implementation and reads no forbidden path | Static (TC-293, TC-327); the NFR-015 metric trace pending FND-539 |
| `normalized` round-trip: a `1.0.0` document gains no bytes | TC-294, pending the `Property` retype in FND-543 |
| Compatibility classification takes the most restrictive change and names every contributor | Unit (TC-295, TC-317) |
| Harness runs the whole corpus against the declared adapter roster | Integration (TC-297) |
| Divergence detection: seeded, missing, reordered, and repointed diagnostics | Unit (TC-298) |
| No adapter is compared with another adapter | Unit (TC-299) for the behaviour, Static (TC-300) for the source scan — one obligation, two kinds, per FND-538 |
| `unavailable` and `unsupported` answers are declared, recorded, and never counted as passes | Unit (TC-301, TC-307) |
| Divergence register cannot expire or persist past its defect | Unit (TC-302) |
| Harness report reproducibility | TC-303, pending the `Property` retype in FND-542 |
| Adapter process failure fails per case rather than skipping | Unit (TC-304) |
| Adapter roster and process isolation | TC-305 (pending FND-537), Static (TC-306) |
| Four case classes per construct-register row, and the negative case set | Unit (TC-308, TC-309) |
| `presence` × `nullable` independence across all four combinations | Unit (TC-310) |
| Recursion accepted, cycles rejected, package cycle distinguished by code | Unit (TC-311) |
| Every recorded prototype-emitter defect has a permanent reproducing case | Unit (TC-312) |
| Deciding layer declared per register row | Unit (TC-313) |
| Register sources and issue #19 criterion coverage | TC-314, TC-315, pending FND-537 |
| Union payload resolution and shared payload types | Unit (TC-316) |
| Coverage account regenerates to the committed file | Snapshot (TC-318) |
| Promotion thresholds declared per backend with owning issues | TC-319, pending FND-537 |
| Mutation catalogue detection score and per-family coverage | TC-320, TC-321 — the `mutation-testing` measure of FND-555, TC-321 pending FND-537 |
| Import API works from an arbitrary working directory | Integration (TC-322); `Verification` cell pending FND-544 |
| Import API error behaviour and immutability | Unit (TC-323); immutability property pending FND-548 |
| Registry and thresholds agree on the adapter set | Unit (TC-324) |
| Cross-run, cross-locale, cross-directory byte identity of every generated artifact | Property (TC-326) |
| Divergences are registered, not absorbed into expected results | Manual (TC-328), to be split into the FR-037 gate and a narrowed Inspection per FND-541 |
| Changed-path isolation and no new runtime dependency | Static (TC-329, TC-330); allow-list form pending FND-545, other-repository metric pending FND-546 |
| Conformance suites run offline from both toolchains | Integration (TC-331), pending the denied-network form in FND-550 |
| No package published and no consumer altered | Manual (TC-332), to be `Analysis` + `Static` per FND-540 |
