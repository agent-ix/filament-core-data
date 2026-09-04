---
id: SR-040
title: "Evidence-method review of the semantic-core L3 grammar"
type: SpecReview
analysis: evidence
scope: "US-007, FR-031..034, NFR-014, spec/tests.md TC-248..276"
review_set: all
---
# Evidence-method review

## Summary

The issue #35 slice carries 25 acceptance-criterion obligations (FR-031-AC-1..6,
FR-032-AC-1..5, FR-033-AC-1..5, FR-034-AC-1..5, NFR-014-AC-1..4), 5 NFR-014
metrics, 7 named constraints, and 29 matrix rows (TC-248..276). `quoin advise
--json` (2026-09-03) placed all 30 catalogued obligations: zero inconclusive,
4 uncatalogued (the NFR-014 free-text metric methods), 6 mismatches. Five of the
six mismatches are the lexical pattern SR-021 recorded as FND-034 and SR-031
repeated at FND-076/FND-078: the `property_shapes=example` rule recommends
`unit-testing` / `bdd-spec-by-example` for obligations authored `Analysis`. The
sixth (NFR-014-M-4) is `performance-benchmarking` matched on a "1 paragraph"
target and warrants nothing. The 20 non-mismatched obligations agree with the
catalog: the closed-set and negative-fixture rules (FR-031-AC-3..4,
FR-032-AC-2, FR-033-AC-3, FR-034-AC-4..5) land on `unit-testing` /
`property-based-testing` and the matrix types them `Unit`; the byte-stability
obligations (FR-031-AC-6, FR-033-AC-4, FR-034-AC-3) land on
`golden-approval-testing` and are typed `Snapshot`; FR-034-AC-2's two-reader
check is `Integration` and both readers now exist (`test/semantic-ir-v1-1-reader.ts`,
`tests/semantic_ir_reader.py`), so the FND-075 gap does not recur.

Judgement was applied to the residue and is labelled as such below. The
principal finding is the Type-column convention SR-031 settled at FND-076 and
FND-079 — `Analysis` cell with a `Static` row, `Test` cell with an executable
row (TC-219 was retyped `Unit` on that basis) — which NFR-014-AC-3 and
NFR-014-AC-4 follow and eight `Test`-authored obligations do not. One NFR-014
metric maps to no test case, the same shape as FND-077. One `Analysis` cell has
an executable oracle over a committed fixture. FR-033-CON-2 (remove, do not
weaken, the #31 normalization) is discharged by TC-266 as an isolation analysis
because the triggering event has not happened; that is accepted as the only
evidence available before the upstream fix and is not a finding. TC-248's
`Compile` type and TC-268's poetry dependency are FND-204/FND-205 (SR-044) and
are not repeated.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-167 | medium | Eight obligations are authored `Test` while their rows are typed `Static`: FR-031-AC-2 (TC-249), FR-031-AC-5 (TC-252), FR-032-AC-1 (TC-255), FR-032-AC-3 (TC-257), FR-032-AC-4 (TC-258), FR-033-AC-1 (TC-261), FR-034-AC-1 (TC-267), NFR-014-AC-1 (TC-273). SR-031 FND-079 settled this split by retyping TC-219 to `Unit`; NFR-014-AC-3/AC-4 (`Analysis` + `Static`, TC-275/276) follow the FND-076 pairing and these eight do not. The Type decides which suite and tag mint the evidence. Judgement: for each row either author `Analysis` (Static evidence) or type the row `Unit`; the compiled-program scans (TC-249, TC-252, TC-257, TC-273) read as `Analysis`/`Static`, the fixture and file checks (TC-255, TC-261, TC-267) as `Test`/`Unit`. | FR-031-AC-2, FR-031-AC-5, FR-032-AC-1, FR-032-AC-3, FR-032-AC-4, FR-033-AC-1, FR-034-AC-1, NFR-014-AC-1, TC-249, TC-252, TC-255, TC-257, TC-258, TC-261, TC-267, TC-273 |
| FND-168 | medium | NFR-014's second metric (`spike:typespec:check` diff empty, method `Byte comparison`) maps to no test case; the NFR-014 coverage row lists TC-273..276, which discharge metrics 1, 4, 3, and 5 respectively, and the NFR's Verification prose ("run the spike check") names a step no TC-248..276 row carries. The Overview requires every metric to map. Same shape as FND-077. Judgement: add NFR-014 to TC-234's traces (it already snapshots the spike check output) or add a `Snapshot` row for issue #35. | NFR-014, TC-234, spec/tests.md |
| FND-169 | medium | FR-032-AC-5 is authored `Analysis` with an `Analysis` row (TC-259); the advisor recommends Test (`example`). Unlike FND-078's loss inventory, this obligation has an executable oracle: FR-033-AC-2 commits the FR-006 `FieldDecl[]` fixture, and "uses only `UUID`, `Integer`, `String`, `Timestamp`, `JsonObject`, and semantic references" is a scan of each `type.target` against a six-element allow-list. Judgement: author `Test` and type TC-259 `Unit` so the evidence is a tagged run over the fixture, not a reading of it. | FR-032-AC-5, TC-259, FR-033-AC-2 |
| FND-170 | low | NFR-014-AC-2 (each amendment gains exactly one paragraph stating the grammar/module-vocabulary rule) is authored `Analysis` with TC-274 `Analysis`, while the NFR-014 metric row for the same check names `Inspection`. The paragraph count is mechanical but "stating that ..." is read by a human, which is the catalog's `no-executable-oracle` case FND-076 reserved `inspection` for. Judgement: author `Inspection` on the AC so the cell, the metric row, and the discharge (inspections registry, not a tag) agree; the advisor's `grammar-based-fuzzing` here is the word "grammar" matching `structured-input`. | NFR-014-AC-2, NFR-014, TC-274 |
| FND-171 | low | FR-033-AC-5 (the #31 normalization is pinned to exact compiler and emitter versions in a recorded manifest) is authored `Analysis` with TC-265 `Analysis`; the advisor recommends Test (`example`). The manifest's two version strings against the lockfile's pinned `@typespec/compiler` and `@typespec/json-schema` is a mechanical equality with no judgement in it. Judgement: `Analysis` cell with a `Static` row (the FND-076 pairing), so drift between manifest and lockfile fails a run rather than a reading. | FR-033-AC-5, TC-265 |
| FND-172 | low | FR-032-AC-4 ("a tenth member proposed as `Any` is rejected by the kernel scope test") and US-007-EX-3 are discharged by TC-258 typed `Static`. A static scan of the committed program shows the kernel is clean today; it cannot show that the gate *rejects* an addition, which needs the gate run against a mutated program the way TC-272 (`Unit`) runs the loss gate against a `loss` row. Judgement: type TC-258 `Unit` with an in-test mutated declaration set, and leave TC-273 as the `Static` scan of the real program. | FR-032-AC-4, US-007-EX-3, TC-258, TC-272, TC-273 |
| FND-173 | low | FR-033-CON-1 requires byte-for-byte reproducibility "on any host", and the boundary table row for it names "same toolchain on two hosts", but TC-264 regenerates twice on one host, which shows idempotence, not host-independence. Judgement: name the second host (CI against the developer machine is the one the repository already has) in TC-264 or in the suite plan, or narrow the constraint to what one host can show. | FR-033-CON-1, TC-264 |
| FND-174 | low | NFR-014 metric methods 1, 2, 3, and 5 (`Compiled-program inventory`, `Byte comparison`, `Changed-path gate`, `Dependency and script inspection`) are uncatalogued free text, so the auditor cannot check conformance against them; the form matches NFR-013's metric column, which SR-031 did not flag. Metric 4 (`Inspection`) is catalogued and its `performance-benchmarking` mismatch is lexical (`quantified-threshold` on "1 paragraph"). Judgement: no change to the plan; recorded so a later catalog pass can name the Static/Snapshot/Inspection method each maps to. | NFR-014 |
| FND-175 | low | Four advisor recommendations are lexical false positives and warrant no suite: `grammar-based-fuzzing` for FR-031-AC-2, FR-031-AC-6, and FR-034-AC-3 matched `structured-input` on the word "grammar" in obligations that count models or compare bytes; `inspection` for FR-032-AC-3 matched `no-executable-oracle` on a table-lookup that TC-257 covers mechanically; `performance-benchmarking` for NFR-014-M-1..5 matched `quantified-threshold` on targets of `0` and `empty`. Recorded so the recommendations are not mistaken for gaps. | FR-031-AC-2, FR-031-AC-6, FR-034-AC-3, FR-032-AC-3, NFR-014, TC-249, TC-253, TC-257, TC-269 |

## Evidence Portfolio

| Concern | Evidence |
|---|---|
| Grammar compiles clean under the pinned compiler | Compile (TC-248) |
| Compiled-program inventory: nine models plus four support types, no domain vocabulary, no `unknown` | Static scans of the compiled program (TC-249, TC-252, TC-273), pending the Type/Verification alignment in FND-167 |
| Closed enumerations: eleven keywords, seven categories, nine kernel scalars | Unit positive and negative fixtures against the emitted schema (TC-250, TC-251, TC-256, TC-263) |
| Scope gate rejects `Any` and `Entity` | TC-258, pending the `Unit` retype in FND-172 |
| Representation table completeness and IR-scalar membership | Static (TC-255, TC-257) |
| FR-006 fixture validates and uses only the allowed scalars | Unit (TC-262); TC-259, pending FND-169 |
| Compatibility classification of kernel changes | Unit over the compatibility corpus (TC-260) |
| Emitted bundle shape and absolute `$id` values | Static (TC-261) |
| Byte stability: versioned addition, regenerate, lowered fixture | Snapshot (TC-253, TC-264, TC-269); host-independence pending FND-173 |
| #31 normalization pin and future removal | Analysis (TC-265, TC-266); TC-265 executable per FND-171 |
| Lowering completeness and zero-loss gate | Static (TC-267), Unit (TC-271, TC-272) |
| Lowered document reads clean in both readers | Integration over the TypeScript and Python readers (TC-268) |
| `UnitSymbol` UCUM case sensitivity | Unit (TC-270) |
| Non-disruption: changed paths, official emitters only | Static (TC-275, TC-276) |
| Spike check output unchanged | No row for issue #35 (FND-168); TC-234 snapshots the same output for issue #34 |
| ARCH-005 and ADR-0002 amendments | Analysis (TC-274), to be `Inspection` per FND-170 |
