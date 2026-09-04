---
id: SR-071
title: "Risk and complexity review of the TypeSpec frontend and semantic IR compiler core"
type: SpecReview
analysis: risk-complexity
scope: "US-010, FR-045..FR-052, NFR-019..NFR-021, spec/tests.md TC-398..566"
review_set: all
---
# Risk and complexity review

## Summary

Issue #19 builds the whole contract compiler in one ticket: a frontend seam, a
TypeSpec lowering to IR `1.1.0`, a package resolver, a hand-written RFC 8785
canonicaliser and lock, a diagnostic registry, a third IR reader, a
compatibility diff over forty fixture cases, and three commands — 169 test
cases under three NFRs that between them forbid touching `schema/**`,
`fixtures/semantic/**`, the two issue #34 readers, the frozen prototype path,
and `conformance/**`. The largest technical risks are all consequences of that
combination: the ticket must reproduce values held in files it may not edit,
and where those files do not pin the value (exact loci, normalized bytes,
derived code strings) the compiler becomes its own oracle — the failure US-010
itself names. The largest single-point risk is the `extern dec` decorator
library, an unproven packaging route on which all of FR-046 rests. The largest
volatility is the compatibility classifier and the determinism claim, which is
judged by an independently authored corpus (#20) this branch may not read.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-600 | high | Two diagnostic namespaces are required for the same defects and nothing reconciles them. `fixtures/semantic/v1/negative/reader-cases.json` names its expected codes `agent-ix.semantic-ir.*` (`DUPLICATE_IDENTITY`, `UNIT_ON_NON_SCALAR`, `FLAGS_ON_NON_COLLECTION`, `INVALID_MULTIPLICITY`, `UNRESOLVED_TYPE_REF`, `CONSTRAINT_NOT_APPLICABLE`, `DANGLING_CLAUSE_REF` among sixteen cases), while FR-046 mints those same seven names under `agent-ix.compiler.*`. FR-050-AC-3 requires the compiler's reader to produce "the same set of codes" as the two #34 readers, and FR-049-CON-3 requires the registry set and the emitted set to be equal, yet FR-049 never says the registry carries both namespaces or how one defect name in two owners is kept from drifting. `fixtures/semantic/**` and both #34 readers are prohibited paths, so the compiler is the only movable side. Decide the namespace rule before tasking. | FR-050-AC-3, FR-049-CON-3, FR-046 Behavior, NFR-021-AC-1 |
| FND-601 | high | The whole of FR-046 rests on an unproven packaging route. FR-046-CON-3 requires the thirteen `extern dec` declarations to be imported by *relative path* with no `package.json` entry and no `file:`/`link:` specifier, but every TypeSpec package in this repository — `spikes/typespec-feasibility/packages/{assurance,wire,semantic-core}` and `packages/semantic-core` — is resolved through a `tspMain` entry, which is the route the pinned `@typespec/compiler` 1.15.0 documents for binding decorator implementations. Nothing in the repository demonstrates that relative-path import binds `extern dec` implementations on 1.15.0. If it does not, FR-046's seventeen acceptance criteria and roughly twenty-seven test cases have no vehicle, and the alternatives (a `tspMain` package, or an added dependency) are each forbidden by FR-046-CON-3 or NFR-019-AC-9. | FR-046-CON-3, FR-046-CON-4, NFR-019-AC-9, NFR-021-AC-1, TC-408..429 |
| FND-602 | high | Three exact byte-level algorithms are hand-written with no dependency and no external oracle in the tree. `canonicalize` must reproduce RFC 8785 string escaping, number formatting, and key ordering by hand (FR-048-CON-2); `locateJsonPointer` must return exact 1-based line and column for pointers into objects, arrays, nested arrays, and tab-indented documents; and version-constraint satisfaction is reimplemented (FR-047-CON-3). RFC 8785 number formatting is the classic defect surface here. TC-447 verifies against "the published RFC 8785 test vectors", which are not vendored anywhere under `fixtures/`, and FR-047-AC-6/AC-7 verify loci against "hand-computed positions" — that is the compiler checked against itself plus one author's arithmetic. Vendor the vectors as a permitted `fixtures/compiler/**` asset and spike the canonicaliser first. | FR-048-CON-2, FR-048-AC-1, FR-047-CON-3, FR-047-AC-6, FR-047-AC-7, TC-447 |
| FND-603 | high | FR-046 is too large to task as one requirement. It carries the decorator library, identity derivation, an eight-row structural-kind table, a nineteen-entry scalar table, multiplicity/presence/nullability/default/unit derivation, nine constraint decorators plus derived constraint identities and diagnostic codes, relationships/operations/clauses, and the envelope/ordering/origin rules — seventeen ACs, five constraints, and TC-408..429 plus TC-547..549, TC-552, TC-553, TC-563. It is also the single place FR-041-CON-2's prototype/contract reconciliation is discharged. Split it (library and decorator vocabulary; structural lowering; field-level derivation; constraints; nodes; envelope and ordering) before Plan generation, or the first task in the plan owns the whole ticket's risk. | FR-046 (all), FR-041-CON-2, TC-408..429 |
| FND-604 | high | FR-047's five named fixture cases do not constrain what FR-047 builds. `fixtures/semantic/v1/package-graph-cases.json` holds symbolic descriptors — `"loci": ["manifest-a:imports[0]", "manifest-b:imports[0]"]`, `"expected": "success"` or `"invalid"` — with no package trees, no manifests, and no line or column. FR-047 introduces roughly twenty new diagnostic codes and requires each at "that entry's locus". The real package trees, the exact positions, and the code-per-case mapping are all authored by this ticket, in a file it may not edit (`fixtures/semantic/**` is prohibited), so AC-1..AC-5 assert success/invalid agreement only. The exactness the requirement is actually about is unverified by the fixture it cites. | FR-047-AC-1..5, FR-047-AC-8, NFR-021-AC-1, TC-430..446 |
| FND-605 | medium | The five limits are borrowed from a schema that cannot describe this compile. `compiler-request.schema.json` is a *backend* request: `contractVersion` is `const "1.0.0"` and `ir`, `profile`, `mappings`, `backend`, and `outputRoot` are all required alongside `limits`. FR-049 and NFR-020 cite it for `maxDiagnostics` and "the five limits", and FR-052 accepts a `--limits <file>`, but no schema describes that file, and NFR-021 forbids adding one under `schema/**`. NFR-020-AC-2 consequently publishes the defaults in the diagnostics registry document rather than in a schema, so the limits are the one compiler input with no machine-checkable contract. | NFR-020-AC-1, NFR-020-AC-2, FR-049 Inputs, FR-052 Inputs, NFR-021-AC-1 |
| FND-606 | medium | The compatibility classifier is the highest-churn surface in the set. FR-051's twenty-five-row table must reproduce all forty cases in `fixtures/semantic/v1/compatibility/cases.json`, whose twenty-two case families (`multiplicity`, `relationship`, `operation`, `clause`, `unit`, `constraint-vocabulary`, `kernel-scalar`, `contract-version`, …) are folded onto the fourteen families the report schema declares by a mapping stated only in prose. Several rows are input-conditional — the same added optional field is `additive`, `conditional`, or `unknown` depending on consumer evidence, and four families disappear into `requiredGates` when profiles, mappings, or the reservation registry are absent — so a case's disposition is a function of inputs the fixture does not carry. Publish the case-family to report-family mapping as data, not prose. | FR-051 Behavior, FR-051-AC-1, FR-051-AC-2, FR-051-CON-1, TC-486..501 |
| FND-607 | medium | Two derived identifier forms are underspecified and become compatibility surfaces the moment they ship. `diagnosticCode` is derived as `agent-ix.<package name>.<OWNER>_<KEYWORD>` and must match `^agent-ix\.[a-z0-9-]+\.[A-Z][A-Z0-9_]+$`, but `packageIdentity` permits `.` and `_`, so a legal package name yields an illegal code; and no rule is given for turning a camelCase or acronym-bearing declaration name into upper snake case. The constraint identity has the same gap in its kebab-case slug. FR-046-AC-10 verifies "a worked example" — one — and FR-049-CON-1 then freezes whatever the implementation happened to produce. | FR-046 Behavior (Constraints), FR-046-AC-10, FR-049-CON-1, common.schema.json `diagnostic.code` |
| FND-608 | medium | The determinism and normalization claims are settled by an artefact this branch may not read. NFR-019's own rationale says the compiler is judged against the independently authored conformance corpus of issue #20, and NFR-021-AC-5 forbids touching `conformance/**`. Every NFR-019 metric is therefore self-measured (two runs of the same code agreeing), and FR-050's normalized serialization — the definition of "the same IR" for four downstream generator tickets — is fixed here without the corpus having voted. A disagreement lands after this work is complete and reworks FR-050 plus every golden. | NFR-019 Rationale, NFR-019-AC-1..7, FR-050-AC-5, NFR-021-AC-5 |
| FND-609 | medium | A whole requirement's worth of work hides in one FR-050 bullet. `readContractIr` must enforce fourteen cross-field rules — multiplicity bounds, collection-only flags, presence derivation, unit-on-scalar through aliases, constraint applicability, typed operands, a compiling `pattern`, relationship-target resolution against lock exports, acyclic composite graphs, per-type `clauseId` uniqueness, `pre`/`post` binding, unique parameter names, node-kind restrictions, and per-list identity uniqueness — as a deliberate *third* implementation that may import neither of the existing two (FR-050-CON-1), plus bounded termination on cyclic alias and composite graphs (FR-050-CON-4, NFR-020-AC-7). The duplication is the point, but it should be estimated as its own task, not as a clause of FR-050. | FR-050 Behavior, FR-050-CON-1, FR-050-CON-4, NFR-020-AC-7, TC-472..485 |
| FND-610 | medium | The evidence base is golden-heavy and coupled to bytes outside the ticket. Sixteen of the 169 cases are `Snapshot` comparisons, two are `Manual` (TC-544 revert rehearsal, TC-546 publication inspection) and one is a 512-mutation `Fuzz` run (TC-536). The lock schema makes `schema-bytes` one of the six included fingerprint inputs, and FR-048 never says which schema files, in which order, contribute those bytes — so every fingerprint, every lock golden, and every projection golden re-baselines in bulk on any upstream schema touch, and the re-baseline is indistinguishable from a regression. | FR-048 Behavior, FR-048-AC-7, package-lock.schema.json `canonicalization.included`, TC-425, TC-492, TC-493, TC-519, TC-536, TC-544, TC-546 |
| FND-611 | low | Two error disciplines share one CLI. FR-045 requires that no frontend throw for an input defect, while FR-052-AC-1 keeps the FR-041 `emit-ir` path byte-identical, and that path (`src/compiler/compile.mjs`, `cli.mjs`, `backends/*`) reports defects by throwing plain `Error`s and emits no registry code at all. Both behaviours are correct per requirement; the plan should name the boundary so no shared helper is retrofitted across it. | FR-045 Behavior, FR-052-AC-1, NFR-021-AC-3 |
| FND-612 | low | FR-045's cross-dialect fixture harness has no return inside this ticket: with only `typespec` implemented, TC-402 and TC-550 can demonstrate that the harness runs and that a single-dialect case is recorded as single-dialect, not cross-frontend equivalence, which waits on issue #36. `spec/tests.md` records this honestly; it is noted here so the harness is sized as enabling work for #36 rather than as verification of #19. | FR-045-AC-5, FR-045-CON-1, TC-402, TC-550 |
| FND-613 | low | FR-049-AC-2 requires the emitted code set to be computed "by static analysis rather than by a hand-maintained list", which means a small extractor over `src/compiler/**`. Any code built by string concatenation — including the derived constraint `diagnosticCode` of FND-607 — is invisible to it, so the extractor's own rule (literal codes only) needs stating. | FR-049-AC-2, FR-049-CON-3, TC-557, TC-558 |

## Risk Register

| Req | Tech Risk | Volatility | Drivers | Mitigation |
|---|---|---|---|---|
| US-010 | High | Medium | Aggregates eight FRs and three NFRs in one ticket; names "the compiler becomes its own oracle" as its own principal risk | Split FR-046 (FND-603) and FR-050's reader (FND-609) before planning; vendor external oracles where any exist (FND-602) |
| FR-045 | Low | Medium | Small seam, but its cross-dialect value is unrealisable until issue #36 | Build the seam and the registry now, size the shared harness as #36 enablement (FND-612) |
| FR-046 | High | Medium | Unproven `extern dec` relative-path packaging; thirteen decorators; two closed tables; derived identities and code strings | Spike the decorator library against the pinned 1.15.0 as task one (FND-601); split the requirement (FND-603); pin the derivation rules (FND-607) |
| FR-047 | High | Low | ~20 new codes each at an exact locus; hand-written pointer arithmetic and version satisfaction; symbolic fixtures that do not pin loci | Author real package trees under `fixtures/compiler/**` with committed expected loci (FND-604); property-test `locateJsonPointer` against a generated corpus (FND-602) |
| FR-048 | High | Low | Hand-written RFC 8785; six-input fingerprint including unspecified `schema-bytes` | Vendor the RFC 8785 vectors; state the schema-byte file list and order (FND-602, FND-610) |
| FR-049 | Medium | High | The registry is a declared compatibility surface (CON-1) and must span two owner namespaces it does not yet acknowledge | Resolve the namespace rule first (FND-600); publish the registry document as generated output, not hand-kept (FND-613) |
| FR-050 | High | High | Third independent reader of fourteen cross-field rules; normalized form is the downstream definition of "same IR" and is judged by #20 | Task the reader separately (FND-609); circulate the normalized-form rule to #20 before freezing goldens (FND-608) |
| FR-051 | Medium | High | 25-row table reproducing 40 fixture cases across 22 case families and 14 report families; input-conditional dispositions; two byte-exact projections | Encode the family mapping as data beside `cases.json` (FND-606); build the projections against committed goldens last, after FR-050's normalizer settles |
| FR-052 | Medium | Low | Thin over six requirements, but owns exit codes, the fifteen-symbol export set, and `--limits` with no schema | Land last; treat the `--limits` schema gap as an explicit decision (FND-605) |
| NFR-019 | High | Medium | Every metric is self-measured until #20 votes; injected reader for all file-system access is an architectural constraint on all four subsystems | Fix the injected-reader seam (AC-10) in the first task so no module is written against the disk directly (FND-608) |
| NFR-020 | Medium | Low | Five limits from a schema that cannot describe this request; fuzz and loader/network/writer instrumentation | Decide the limits contract (FND-605); build the instrumented reader/writer/loader once, share it across FR-046..FR-051 |
| NFR-021 | Low | Low | Broad prohibited-path set, but every prohibition is mechanically checkable by branch diff | Wire the changed-path gate into CI at task one so it fails early, not at review (FND-610) |

## Top hazards

1. FND-601 — the `extern dec` relative-path decorator library is unproven on the pinned 1.15.0 and all of FR-046 depends on it; spike it before anything else is tasked.
2. FND-600 — `agent-ix.compiler.*` and `agent-ix.semantic-ir.*` name the same seven defects, and the only file that could reconcile them is a prohibited path.
3. FND-602 / FND-604 — RFC 8785, JSON-pointer loci, and version satisfaction are all hand-written against oracles that are either absent from the tree or hand-computed by the same author.
4. FND-603 — FR-046 is one requirement doing six requirements' work; splitting it is the single largest estimate improvement available.
5. FND-608 — determinism and the normalized form are frozen here but judged by issue #20, which this branch may not read.

## Risk Ranking

| Rank | Area | Control |
|---:|---|---|
| 1 | TypeSpec decorator-library packaging | Spike `extern dec` by relative path on 1.15.0 as the first task; record the result before Plan generation |
| 2 | Diagnostic namespace and registry scope | Explicit decision on one registry spanning both owners, recorded against FR-049 |
| 3 | Byte-exact hand-written algorithms | Vendor RFC 8785 vectors under `fixtures/compiler/**`; property-test the pointer locator; commit real package trees with expected loci |
| 4 | FR-046 and FR-050 size | Split into six and two tasks respectively before decomposition |
| 5 | Classifier and projection churn | Family mapping as data; goldens generated only after the normalizer is fixed |
| 6 | Self-measured determinism | Injected reader seam first; share the normalized-form rule with issue #20 early |

## Failure-domain gaps

No issue-#19 failure-domain review exists yet. `spec/tests.md` records the new
edge cases for this scope (through EC-053, "a relationship target resolves to a
lock export rather than a document type", TC-566); the ones that also raise risk
here are the cyclic-input family behind FND-609 (cyclic alias chain, cyclic
composite graph, cyclic package import graph, self-referential JSON pointer, all
gathered under NFR-020-AC-7) and the single-dialect harness case behind FND-612.
This register should be re-checked against the issue-#19 failure-domain review
when it is written, and against `spec/reviews/34-semantic-ir-v1-1/risk-complexity.md`
(SR-032), whose FND-081..083 concern the same schema and reader surfaces this
compiler now consumes.
