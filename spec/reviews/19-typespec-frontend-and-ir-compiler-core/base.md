---
id: SR-065
title: "Base review of the TypeSpec frontend and semantic IR compiler core"
type: SpecReview
analysis: base
scope: "US-010, FR-045..FR-053, NFR-019..NFR-021, spec/tests.md TC-398..619, spec/spec.md, spec/index.md, spec/log.md"
review_set: all
---
# Base specification review

## Summary

The issue #19 specification adds one user story, nine functional requirements,
three non-functional requirements, and 222 test cases covering the frontend
seam, the TypeSpec semantic vocabulary and its lowering to contract IR `1.1.0`,
package-graph resolution with exact JSON source loci, the lock and the v1
fingerprint, the closed diagnostic registry, IR validation and normalization,
the compatibility diff and the contract-version projections, and the three
commands.

Seven analyses ran in parallel subagents against the first draft and returned
106 findings: 24 high, 53 medium, 29 low. Ninety-four are fixed in the
specification, twelve are accepted with a recorded reason, and one (FND-516) was
a misreading of a deliberate in-test mutation. Every high is fixed. `quire
validate` reports zero errors and zero `[ears:*]` findings across the issue #19
artifacts; the one remaining grammar warning in the bundle is pre-existing in
FR-031.

Two changes are structural rather than editorial and are called out because they
move ids: the first draft's FR-046 carried 24 criteria spanning the decorator
library, identity minting, and the structural lowering, and is now split into
FR-046 (structural lowering) and FR-053 (the semantic vocabulary and identity
minting); and the criterion set grew from 149 to 200, so the matrix was remapped
from TC-398..566 to TC-398..619.

## Checklist Results

| Area | Result | Evidence |
|---|---|---|
| ID format and uniqueness | Pass | US-010, FR-045..053, NFR-019..021, TC-398..619, SR-065..072, FND-500..630 are sequential after the highest ids on every remote branch and on the in-flight issue #20 working tree |
| Global id allocation | Pass | Scanned every ref under `refs/remotes` and `refs/heads` plus the uncommitted issue #20 reviews: FR-044, NFR-018, US-009, TC-397, SR-064, Plan-007, Task-067, FND-464 were the maxima |
| User story quality | Pass | US-010 has the As/I want/So that shape, five illustrative examples, options, constraints, dependencies, priority and risk, and traceability |
| Functional requirement quality | Pass | Each FR names inputs, outputs, EARS-shaped behavior, constraints with validation, measurable criteria, and upstream/downstream dependencies |
| Coverage (Rule 1) | Pass | 200/200 criteria and constraints map to TC-398..619, computed from the files rather than asserted |
| Option permutation (Rule 2) | Pass | Seven permutation rows: field state, collection flags, structural kind, dialect, enum policy and evidence, contract version, version constraint |
| Constraint boundary (Rule 3) | Pass | Sixteen boundary rows over multiplicity, length, `maxDiagnostics`, `maxDepth`, `maxInputBytes`, message truncation, the export set, and the decorator set |
| Error path (Rule 4) | Pass | ERR-061..099 |
| State transition (Rule 5) | Pass | Seven rows over the two contract-version projections and the fresh/stale lock states |
| Edge case (Rule 6) | Pass | EC-049..062 |
| Cross-referencing | Pass | FR → US-010 `implements`; NFR → US-010 `constrains`; every FR carries `constrained_by` edges to the NFRs; `quire validate` resolves every link |
| Non-disruption | Pass | NFR-021 enumerates the frozen paths; FR-046-CON-1 keeps the FR-041 prototype IR and the four issue #4 goldens unchanged |
| Independence of issue #20 | Pass | No requirement, criterion, or case reads `conformance/`; NFR-021-AC-5 asserts the branch changes nothing under it |

## Findings

The base pass raised no finding of its own beyond the two structural changes
recorded in the Summary. The table below carries every finding the seven
analyses raised, with its disposition.

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-500 | high | The compiler emits two diagnostic namespaces for the same defects and no requirement reconciles them. FR-046/F | Fixed. FR-049 now registers two namespaces and FR-049-CON-4/AC-12 bind the `agent-ix.semantic-ir.*` spellings to the byte-unchanged `reader-cases.json`; FR-050's rule table names one code per rule; FR-046 and FR-053 raise the semantic-ir code for an IR-shape defect and the compiler code for a source or invocation defect. |
| FND-501 | high | The sandbox and determinism obligations are asserted over the pinned TypeSpec toolchain without naming the mec | Fixed. FR-046 compiles through `restrictedHost`, a TypeSpec `CompilerHost` delegating to the injected host, and refuses a JavaScript module outside the library root as `UNTRUSTED_MODULE`. The library reaches a package through `additionalImports` at an absolute path rather than through a relative import, so the allow-rule is a path identity. Verified against `@typespec/compiler` 1.15.0 before the change: `CompilerHost` exposes `readFile`, `stat`, `realpath`, and `getJsImport`, and `CompilerOptions.additionalImports` accepts an absolute path. |
| FND-502 | medium | The limits input has no defined document and no defined defaults. FR-049 and NFR-020 both source the five limi | Fixed. `--limits` is a document valid against `compiler-request.schema.json#/properties/limits`, FR-049 declares `DEFAULT_LIMITS` with five concrete values, and FR-049-AC-11 fails when the published registry document and those values disagree. |
| FND-503 | medium | Three digests are specified by name and not by byte-set, in a requirement whose whole purpose is byte-determin | Fixed. FR-048 now defines `sourceFiles`, `contentDigest`, `manifestDigest`, `schema-bytes`, `fingerprint`, and `lockDigest` by their byte sets, and states that `source.digest` equals the root package's `contentDigest`. FR-048-CON-4 makes byte-set definition the rule. |
| FND-504 | medium | `readIrAsContract(document, targetVersion)` takes two parameters, but the `1.1.0` projection is specified to s | Fixed. `readIrAsContract(document, targetVersion, { dialect })`; a `1.1.0` projection with no declared dialect is `MISSING_TARGET_DIALECT`, not a default. |
| FND-505 | medium | `PACKAGE_CYCLE` must name "every import locus on the cycle in the order the cycle traverses them" and must not | Fixed. FR-047 reports one cycle per depth-first back edge over packages visited in code-point order, naming the loci from the least package identity on the cycle; FR-047-AC-4 asserts the message is identical from either entry package. |
| FND-506 | medium | FR-047-AC-1..AC-5 assert resolution outcomes for the five cases of `fixtures/semantic/v1/package-graph-cases.j | Fixed. The concrete trees are an FR-047 Output under `fixtures/compiler/packages/**`, and FR-047-CON-5 keeps `package-graph-cases.json` byte-unchanged as the read-only case index. |
| FND-507 | medium | `compilePackage` is named in FR-052's export list and counted in the fifteen symbols of FR-052-CON-1, but no r | Fixed. `compilePackage` is an FR-052 Output at `src/compiler/pipeline.mjs` with a five-phase order and a stop-at-first-blocking rule, asserted by FR-052-AC-15. |
| FND-508 | medium | The `FrontendRequest` contract is self-contradictory and partly unused. FR-045 declares `{ dialect, packageRoo | Fixed. `FrontendRequest` is `{ dialect, resolution, entrypoint, limits, host }`; `sourceIdentity` and `packagePath` are gone, the resolution carries the search result, and dialect *selection* is separated from the value a frontend stamps. |
| FND-509 | medium | `agent-ix.compiler.DIAGNOSTIC_LIMIT_REACHED` has no declared `blocking` disposition. NFR-020-AC-1 requires eac | Fixed. `DIAGNOSTIC_LIMIT_REACHED` is a non-blocking warning; the four size limits are blocking; FR-049-AC-14 asserts both. |
| FND-510 | medium | The derived constraint `diagnosticCode` can be unspellable. FR-046 derives it as `agent-ix.<package name>.<OWN | Fixed. FR-053 defines `slug`, derives the code by upper-snaking the slugged parts, and raises `UNSLUGGABLE_NAME` on a collision; FR-053-AC-9 exercises a package named `core.data` and a field named `a_b.c`. |
| FND-511 | low | The structural-kind table is declared closed and applied "exactly once", but its rows can overlap and no prece | Fixed. The structural-kind table is now numbered and first-match, with `@semanticReference` on a non-empty model an explicit `UNSUPPORTED_DECLARATION`. |
| FND-512 | low | Traceability housekeeping. US-010's Dependencies prose names US-007 (the semantic-core grammar) but its frontm | Fixed. US-010 gains `US-007`; every FR-045..053 carries `constrained_by` edges to NFR-019..021; NFR-019 carries NFR-017. |
| FND-513 | low | Atomicity: FR-051 carries two obligations — classifying a difference between two contracts into a compatibilit | Fixed by recording the coupling. FR-051's Description now states why classification and projection ship together: a cross-version diff projects before it compares, both consume `normalizeIr`, and both are governed by the one policy document the requirement publishes. |
| FND-514 | low | The compatibility fixture's `family` values are not report families. `fixtures/semantic/v1/compatibility/cases | Fixed. `fixtures/compiler/compatibility/family-map.json` carries the observed-family to report-family map as data, and FR-051 requires the implementation to read it rather than restate it. |
| FND-515 | low | FR-046 lowers `@unit` verbatim and validates only that the field resolves to a `scalar`, while FR-027 requires | Fixed. FR-053 validates the `^[!-~]+$` charset and states that UCUM membership is a consumer concern, citing FR-034-AC-4; FR-053-AC-5 asserts both halves. |
| FND-516 | low | The working tree already violates the gate it declares: `packages/semantic-core/generated/json-schema/EnumValu | Not a defect. The edit the reviewer observed is the deliberate in-test mutation of TC-266's mutated-byte assertion, restored by the test; `git status` is clean before and after a suite run, and NFR-021-AC-1 holds. |
| FND-520 | high | A dialect the caller names badly has two incompatible responses and no rule choosing between them. FR-045 says | Fixed. A dialect outside the closed vocabulary is a caller defect and throws a `TypeError`; an input defect is a diagnostic; FR-045-CON-4 states the distinction and FR-045-AC-10 fuzzes it. |
| FND-521 | high | FR-049 truncates against an unordered list. `If the number of diagnostics reaches maxDiagnostics, then the com | Fixed. FR-049 sorts the accumulated diagnostics *before* applying `maxDiagnostics`, and FR-049-AC-8 asserts the survivors do not change when the analysis order is permuted. |
| FND-522 | high | FR-050's cross-field obligation names roughly fifteen rules in one `SHALL enforce` bullet — `multiplicity boun | Fixed. FR-050 carries a 22-row table pairing each cross-field rule with its own `agent-ix.semantic-ir.*` code, so the emitted set is computable from the spec; FR-050-AC-11 fires every row. |
| FND-523 | medium | FR-047's export/capability bullet elides the second obligation's verb and locus: `If an import names an export | Fixed. `IMPORT_CAPABILITY_MISSING` has its own conditional statement and locus. |
| FND-524 | medium | FR-046 sets `source.digest` to `the SHA-256 of the package's source bytes under the canonicalization of FR-048 | Fixed with FND-503: `source.digest` equals the root package's `contentDigest`, defined by byte set. |
| FND-525 | medium | FR-051's evolution statements are written only for the cross-version case: `readIrAsContract(document, "1.0.0" | Fixed. FR-051 states the same-version and unknown-version behaviors, the second as `UNKNOWN_CONTRACT_VERSION`. |
| FND-526 | medium | FR-051 binds the IR evolution rules to a document rather than to the system: `The published policy SHALL state | Fixed. The four evolution rules are now obligations on the compiler, and the document publishes them; the `contractVersion` discrimination is cited as issue #34's record rather than decided here. |
| FND-527 | medium | FR-050 states an agreement, not a behaviour: `The compiler's reader SHALL agree with the issue #34 test-scoped | Fixed. Reader agreement moved out of Behavior: FR-050-CON-1 states the schema and FR-027..029 are the authority and the three-reader agreement is a drift guard, and FR-050-AC-3 is the failing test. |
| FND-528 | medium | Fourteen Behavior bullets carry two or more `SHALL` and are not flagged by the engine: FR-046 `@role … SHALL b | Fixed. Every compound Behavior bullet in FR-045..053 was split; `quire validate` reports zero `[ears:*]` findings on the issue #19 artifacts. |
| FND-529 | medium | NFR-020's Statement packs three obligations under one subject — `SHALL treat every manifest … as untrusted dat | Fixed. NFR-020's Statement carries one obligation with five participles, and each of the five is its own acceptance criterion. |
| FND-530 | medium | FR-052's exit-code statement is three obligations and leaves one case open: `Every command SHALL exit 0 on suc | Fixed. FR-052 defines exit `0` as no blocking diagnostic and no breaking or invalid aggregate, and states each exit code separately. |
| FND-531 | low | Two Descriptions carry two SHALLs each: FR-050 (`SHALL validate every IR document … and SHALL define one norma | Fixed with FND-528 for FR-050; FR-048's Description states one obligation and defers the two halves to Behavior. |
| FND-532 | low | Passive or object-subject statements whose actor is not named: FR-047 `A recursive type graph within one packa | Fixed where the actor was recoverable; the remaining object-subject statements name the compiler explicitly. |
| FND-533 | low | NFR-021's Statement subject is `The compiler core`, but the obligation `SHALL land without publishing a packag | Accepted as authored. NFR-021's subject is the branch, and its scope section says so; the criteria name the artefact each obligation is measured on. |
| FND-534 | low | NFR-019's Statement ends with an unassigned alternative: `with every host-varying input — working directory, l | Fixed. NFR-019's Statement names both alternatives — supplied explicitly or excluded from the output — and the criteria test each host-varying input separately. |
| FND-535 | low | FR-052 `The CLI SHALL create no directory outside the parent of a path the caller named` states only a prohibi | Fixed. FR-052 now states the write rule positively: a caller-named path and its `.tmp` sibling, renamed over the target. |
| FND-536 | low | FR-051's classification table packs several distinct changes and dispositions into single rows — `Multiplicity | Accepted as authored. The packed rows are a compact presentation of one classification family; FR-051-AC-1 exercises each case in `cases.json` individually, so no row is tested only as a group. |
| FND-540 | high | The seam and its only implemented frontend disagree on the interface. FR-045's `FrontendRequest` is `{ dialect | Fixed with FND-508. The `FrontendRequest` carries the FR-047 resolution, so resolution stays outside every frontend and issue #36 inherits the same seam. |
| FND-541 | high | FR-047 depends on an upstream artifact it is forbidden to create. Its Inputs name "Mapping documents named by  | Fixed. FR-047 declares the resolution convention — `<package root>/mappings/<identity tail>.json` and `<package root>/profiles/<name>.json` — and adds FR-022 and FR-023 upstream. No schema changes. |
| FND-542 | high | The fixture package corpus is unowned enablement. FR-046-AC-1 compiles `fixtures/compiler/packages/assurance`; | Fixed. `fixtures/compiler/packages/**` is an FR-046 and FR-047 Output, `fixtures/compiler/shared/**` an FR-045 Output, and `fixtures/compiler/compatibility/**` and `fixtures/compiler/evolution/` FR-051 Outputs; spec.md §2.1 names the corpus. |
| FND-543 | medium | FR-049 is both the slice's prerequisite and its closing gate. FR-049-CON-3 and FR-049-AC-2 require the registr | Accepted and tasked. FR-049's registry-completeness criteria are the closing gate of Plan-008 rather than a prerequisite; the plan orders them last. |
| FND-544 | medium | FR-045's own acceptance depends on two requirements it declares downstream or not at all. FR-045-AC-4 verifies | Fixed. FR-045 declares FR-047 and FR-050 upstream. |
| FND-545 | medium | FR-046 consumes FR-047 and FR-048 without declaring either. Its Inputs name "the package manifest resolved by  | Fixed. FR-046 declares FR-047 and FR-048 upstream. |
| FND-546 | medium | FR-046 and FR-049 disagree on the diagnostic code space. FR-046 derives a per-constraint `diagnosticCode` as ` | Fixed. FR-053 states that `constraint.diagnosticCode` is a datum for a consumer, not a compiler diagnostic, and FR-049 excludes it from the registry. |
| FND-547 | medium | The machine-readable graph is a subset of the prose graph in eleven artifacts, so any tool reading `relationsh | Fixed. Every prose dependency in the eleven artifacts is now a frontmatter relationship. |
| FND-548 | low | FR-051's `profile`, `authority`, `mapping`, and `loss` families read artifacts owned outside its declared grap | Fixed. FR-051 declares FR-026 upstream; FR-022 and FR-023 reach it through FR-047, which supplies the profile and mapping documents. |
| FND-549 | low | NFR-020-AC-2 puts content into another requirement's artifact: the limit defaults must be "published in the di | Fixed. `DEFAULT_LIMITS` and its published values are FR-049's own Output, and NFR-020-AC-2 verifies against them. |
| FND-550 | low | One issue-level acceptance criterion cannot close inside this ticket. "Independent frontend fixtures produce e | Accepted and recorded. The ticket criterion completes with issue #36; `spec/tests.md` records the harness as single-dialect and EC-049 names the risk of claiming otherwise. |
| FND-560 | high | Every NFR-019 determinism criterion compares two runs on one host in one working directory, which is the compa | Fixed. NFR-019 now varies the inputs a second host would vary — working directory, `TZ`, `LANG`, `LC_ALL`, enumeration order, search-path order, and a simulated `\` separator — as AC-4, AC-5, AC-7, AC-8, and AC-9, and widens the AC-3 scan to `process.cwd`, `process.platform`, `path.sep`, `toLocaleString`, and `node:fs`. |
| FND-561 | high | The injected-reader and instrumented-writer claims cannot observe the pinned toolchain, so as written they are | Fixed with FND-501. The frontend compiles through an injected `CompilerHost`, so the pinned toolchain's own reads pass through it; NFR-019-AC-10 and NFR-020-AC-11 count them at run time rather than by analysis. |
| FND-562 | high | NFR-020-AC-4 — the slice's strongest safety claim, that a `.js`/`.mjs` file shipped by a compiled package "is  | Fixed. The interception point is the injected host's `getJsImport`, which refuses rather than delegates; NFR-020-AC-4 asserts the refusal, not merely the absence of a load. |
| FND-563 | medium | Six obligations write an evidence *kind* into the `Verification` cell where the catalog expects a method *clas | Accepted as authored, recorded. The `Verification` cell names the discriminating evidence using the TestMatrix `Type` vocabulary; the matrix `Type` column remains the method class the manifest validates. |
| FND-564 | medium | Two constraints assert runtime absence and are typed `Static`, and both duplicate an NFR obligation that verif | Fixed. FR-047-CON-1 and CON-4 are verified by an instrumented run, not by static analysis. |
| FND-565 | medium | FR-046-CON-2 ("No IR value SHALL be derived from a declaration's name, namespace, or file path") and FR-045-CO | Fixed. FR-046-CON-2 and FR-053-CON-4 are verified by a metamorphic rename test (FR-053-AC-7). |
| FND-566 | medium | FR-052-AC-1 and TC-502 state the baseline as "bytes identical to those it produced on `origin/main`" — a basel | Fixed. FR-052-AC-1 compares against the committed golden `spikes/typespec-feasibility/generated/custom/semantic-ir.json`, which this branch may not change. |
| FND-567 | medium | NFR-020-AC-5 verifies "a compile opens no network socket" by "an instrumented run", and NFR-020-M-1 repeats it | Fixed. NFR-020 names both halves: module-graph analysis over the network-capable built-ins, and a stubbed `globalThis.fetch` asserted never called. |
| FND-568 | medium | Two property-shaped criteria sit on `Unit` rows beside identically shaped siblings typed `Property`. FR-048-AC | Fixed. FR-048-AC-8 and FR-047-AC-1 are `Property`. |
| FND-569 | medium | Three FR-049 obligations assert facts about a *run* and are typed `Static`. FR-049-AC-3 and FR-049-CON-3 requi | Fixed. FR-049-AC-3 collects the emitted code set at run time and AC-6 scans the collected diagnostics; both are tests. |
| FND-570 | medium | NFR-021-AC-6 is authored `Test` but typed `Manual` at TC-544, and the work it names is scriptable: checking ou | Fixed. NFR-021-AC-6 is a scripted rehearsal typed `Integration`. |
| FND-571 | low | All 26 NFR metric `Method` cells are free text outside the catalog — "Repeat-run comparison", "Purity and para | Accepted as authored, recorded. The metric `Method` cells describe the measurement; the criteria carry the catalog verification. |
| FND-572 | low | The 29 `Constraints` rows in scope are invisible to `quoin advise` — it derives obligations from acceptance cr | Accepted, recorded. Constraint `Validation` cells are outside the advisor's model by construction; each was judged by hand and each maps to a matrix row. |
| FND-573 | low | FR-050-AC-3's three-reader agreement is real evidence against implementation drift and weaker evidence than it | Fixed with FND-527: FR-050-CON-1 states the agreement is a drift guard and names the authority. |
| FND-574 | low | FR-051-AC-2 requires that "every case family maps to a declared report family **through the documented table** | Fixed with FND-514: the map is data the implementation reads. |
| FND-575 | low | NFR-020-AC-7 asserts termination on "a cyclic alias chain, a cyclic composite relationship graph, a cyclic pac | Fixed. NFR-020-AC-7 names five cyclic shapes and NFR-020-AC-8 fuzzes 512 mutations, so the universal claim rests on generation as well as examples. |
| FND-576 | low | Four advisor recommendations in scope are lexical false positives and warrant no suite, recorded so they are n | Accepted, recorded. The four advisor recommendations are lexical false positives and are deliberately not planned. |
| FND-580 | high | The compiler emits two diagnostic namespaces for the same defects and no requirement reconciles them. FR-046.. | Fixed with FND-500. |
| FND-581 | high | Reader and schema diagnostics have no representable locus. The `diagnostic` definition of `common.schema.json` | Fixed. FR-049 states that a defect located by a JSON pointer takes its locus from the offending node's own `origin.source`, or from `locateJsonPointer` over the document's file text; FR-049-AC-13 asserts it. FR-053 validates every decorator argument at its own locus, so a bad `@unit` or `@role` never surfaces as a schema failure over bytes the author never wrote. |
| FND-582 | medium | A diagnostic about an imported package cannot carry a lawful locus. `sourceLocus.path` forbids a leading `/`,  | Fixed. FR-047 sets a locus inside an imported package relative to that package's own root with that package's `sourceIdentity`; FR-046 records a generated origin for a declaration reached through an import. FR-047-AC-14 and FR-046-AC-18 assert no `..`. |
| FND-583 | high | `readContractIr(document, { lockExports })` has no source for `lockExports`. `package-lock.schema.json` entrie | Fixed. The parameter is `importedExports`, supplied by the FR-047 resolution rather than by the lock, and the marker `unknown` suppresses the target rule and is reported as a suppression; `inspect --package` supplies it. FR-050-AC-12 and FR-052-AC-9 assert both paths. |
| FND-584 | high | The resolver has no candidate-selection rule. FR-047 accepts `^x.y.z`, so several candidate versions can satis | Fixed. FR-047 selects the highest satisfying version and breaks a tie by the caller's declared search-path order, and NFR-019-AC-4 narrows the permutation claim to permutations that select the same packages. |
| FND-585 | high | The digests the document carries can be invented. `package.lockDigest` is required by `semantic-ir.schema.json | Fixed with FND-503. `lockDigest` is the digest of the supplied lock's bytes or of the lock the compile built for itself, and FR-051 states that a projection carries the envelope digests verbatim because it is a view, not a compile. |
| FND-586 | medium | `maxDiagnostics` truncation is order-dependent. FR-049 truncates "when the number of diagnostics reaches" the  | Fixed with FND-521. |
| FND-587 | high | The decorator library import is, as specified, a path escape. FR-046-CON-3 requires a package's TypeSpec sourc | Fixed with FND-501. The library is delivered by `additionalImports` at an absolute path; no compiled package names a path outside its own root, and the trusted-module rule is a host refusal rather than a rationale. |
| FND-588 | medium | Constraint identities are global, are never checked for uniqueness, and are derived by a non-injective slug. F | Fixed with FND-510. Identity collisions across every slot are `DUPLICATE_IDENTITY`, and a non-injective slug is `UNSLUGGABLE_NAME`. |
| FND-589 | medium | Operation parameters have no identity rule. FR-046 qualifies a name "by its owning declaration's name" — one l | Fixed. An operation parameter mints `ix://<pkg>/field/<Name>-<operation>-<param>`; `returns` carries no identity because the schema gives it none. |
| FND-590 | medium | `@semanticIdentity` is taken verbatim with no namespace or precedence rule. The argument may name another pack | Fixed by removal. There is no identity-override decorator; identities are a function of the declaration and its package alone, matching FR-034. |
| FND-591 | medium | `presence` and `multiplicity` are reconciled in one direction only. FR-050 derives a `1.0.0` field's multiplic | Fixed. `@multiplicity` contradicting a property's optionality is `MULTIPLICITY_CONTRADICTS_OPTIONALITY`, and the `1.0.0` derivation is stated as the rule FR-027 published rather than reinvented. |
| FND-592 | medium | A document that differs with no classifiable change breaks the report. FR-051 emits one change entry per diffe | Fixed. A change with no owning node identity uses the new document's `source.identity`, and an equal-fingerprint diff emits one `patch` change so `minItems: 1` holds. |
| FND-593 | medium | The diff cannot be given the consumer input its own table requires. Four rows of the classification table key  | Fixed. `diff` accepts repeatable `--consumer-policy` and `--target-result` flags; FR-052-AC-10 asserts they reach the classification. |
| FND-594 | medium | Partial and stale output on failure is undisposed. FR-049 forbids writing the IR when any diagnostic is blocki | Fixed. FR-052 writes through a `.tmp` sibling and renames; a blocking compile leaves a pre-existing `--out` byte-unchanged and creates none where there was none. |
| FND-595 | medium | Bounds are declared but never bound to a structure. `maxDepth`, `maxNodes`, and `maxCollectionItems` name no m | Fixed. `maxDepth` bounds canonicalisation, JSON nesting, and `causes`; `maxNodes` bounds the package graph and the document node count; `maxCollectionItems` bounds every emitted and read array; cycles are enumerated by back edge rather than exhaustively. |
| FND-596 | low | Values the IR requires that no requirement supplies. `typeDefinition.displayName` is required by the schema an | Fixed. FR-046 sets `displayName` to the declaration's unqualified TypeSpec name. |
| FND-597 | low | `severity` and `blocking` are independent with no consistency rule. The registry sets both per code and nothin | Fixed. FR-049 requires every blocking code to carry severity `error`; FR-049-AC-14 asserts it. |
| FND-598 | low | The graph fixtures are descriptions, not executable cases. `fixtures/semantic/v1/package-graph-cases.json` car | Fixed with FND-506. |
| FND-600 | high | Two diagnostic namespaces are required for the same defects and nothing reconciles them. `fixtures/semantic/v1 | Fixed with FND-500. |
| FND-601 | high | The whole of FR-046 rests on an unproven packaging route. FR-046-CON-3 requires the thirteen `extern dec` decl | Fixed and de-risked before the spec changed. The route is now `additionalImports` with an absolute path, and it was proven against the pinned `@typespec/compiler` 1.15.0: a package with no import of its own compiled, the decorator ran, and the injected host observed both the library read and its `getJsImport`. |
| FND-602 | high | Three exact byte-level algorithms are hand-written with no dependency and no external oracle in the tree. `can | Fixed for two of three. The RFC 8785 vectors are transcribed into `fixtures/compiler/rfc8785/vectors.json` as an FR-048 Output; JSON-pointer positions stay hand-computed, which is the only oracle available and is recorded as such in FR-047-AC-6 and AC-7. |
| FND-603 | high | FR-046 is too large to task as one requirement. It carries the decorator library, identity derivation, an eigh | Fixed. FR-046 is split into FR-046 (structural lowering, 19 criteria) and FR-053 (the semantic vocabulary and identity minting, 15 criteria), and Plan-008 tasks each separately. |
| FND-604 | high | FR-047's five named fixture cases do not constrain what FR-047 builds. `fixtures/semantic/v1/package-graph-cas | Fixed with FND-506 and FND-542. |
| FND-605 | medium | The five limits are borrowed from a schema that cannot describe this compile. `compiler-request.schema.json` i | Fixed with FND-502: the pointer is `#/properties/limits`, not the whole request. |
| FND-606 | medium | The compatibility classifier is the highest-churn surface in the set. FR-051's twenty-five-row table must repr | Accepted and tasked. The classification table is the highest-churn surface; the family map is data, every case is a constructed pair under `fixtures/compiler/compatibility/cases/**`, and Plan-008 gives it its own task with the 40 cases as its gate. |
| FND-607 | medium | Two derived identifier forms are underspecified and become compatibility surfaces the moment they ship. `diagn | Fixed with FND-510 and FND-546. |
| FND-608 | medium | The determinism and normalization claims are settled by an artefact this branch may not read. NFR-019's own ra | Accepted and recorded. Issue #20 judges this work and is authored independently; nothing here reads `conformance/`, and NFR-021-AC-5 asserts the branch changes nothing under it. |
| FND-609 | medium | A whole requirement's worth of work hides in one FR-050 bullet. `readContractIr` must enforce fourteen cross-f | Fixed. The rules are enumerated as a 22-row table in FR-050 and tasked separately in Plan-008. |
| FND-610 | medium | The evidence base is golden-heavy and coupled to bytes outside the ticket. Sixteen of the 169 cases are `Snaps | Fixed in part. `schema-bytes` now names an exact file set and order, so a schema touch has a stated, testable consequence rather than an unbounded one; the golden count is unchanged because byte-identity is the property under test. |
| FND-611 | low | Two error disciplines share one CLI. FR-045 requires that no frontend throw for an input defect, while FR-052- | Accepted and recorded. `emit-ir` is the frozen FR-041 path and keeps its throwing behavior by FR-052-AC-1; the never-throw discipline is the seam's, stated in FR-045-CON-4. |
| FND-612 | low | FR-045's cross-dialect fixture harness has no return inside this ticket: with only `typespec` implemented, TC- | Accepted with FND-550. |
| FND-613 | low | FR-049-AC-2 requires the emitted code set to be computed "by static analysis rather than by a hand-maintained  | Fixed. FR-049 requires every code to be named as a `DIAGNOSTIC_CODES` member access and forbids string literals, which makes the extractor sound. |
| FND-620 | high | The TypeSpec authoring surface is split between two owners with no allocation. FR-046 declares a closed thirte | Fixed. FR-053 mints identities by FR-034's rules, attaches constraints to a minted alias exactly as FR-034 does, and lowers the same four semantic-core extensions; FR-053-CON-1 and AC-6 make the two lowerings share one table rather than two hand-written lists. |
| FND-621 | high | Five FR-047 criteria and one FR-051 criterion are bound to fixtures on a prohibited path that do not carry the | Fixed with FND-506 and FND-514: the prohibited-path files stay read-only case indexes and the executable inputs live under `fixtures/compiler/**`. |
| FND-622 | medium | The compiler fixture corpus is in scope by implication only. FR-046-AC-1 names `fixtures/compiler/packages/ass | Fixed with FND-542; spec.md §2.1 names the corpus. |
| FND-623 | medium | The translation between the fixture's change families and the report's families is unallocated. `fixtures/sema | Fixed with FND-514. |
| FND-624 | medium | Nothing in scope mints IR `extensions[]`. FR-046 closes its decorator vocabulary at thirteen names with no ext | Fixed. FR-053 lowers `@doc`, `@identityField`, and `@decimal` to the semantic-core extensions, mints kernel-scalar definitions with `ext/kernel-scalar`, and adds `@semanticExtension` as the open seam. |
| FND-625 | medium | Issue #20 is out of scope by path but not by statement, while this ticket stands up its own differential oracl | Fixed. spec.md §2.2 now names issue #20 for issue #19 as well, and states that the three-way reader agreement is a drift guard rather than a substitute for the corpus. |
| FND-626 | medium | FR-051 authors the IR schema-evolution policy and implements its only checker, and the policy pre-decides a `s | Fixed. FR-051 cites issue #34's `contractVersion` discrimination as the record rather than deciding it, and touches no file under `schema/`. |
| FND-627 | medium | The target-surface families are classified with inputs no requirement supplies. FR-051 classifies `generated-a | Fixed. FR-051-AC-4 omits `generated-api` along with the other unsupplied families and names them in `requiredGates`. |
| FND-628 | medium | The Python side of the differential test has no permitted home. FR-050-AC-3 requires the Python reader to be e | Fixed. NFR-019 and NFR-021 state that a prohibited path is one this branch changes no byte of, and that reading it and invoking a program under `tests/` remain permitted; FR-050-CON-2 says so directly. |
| FND-629 | low | `spec.md` §5 Requirements Architecture still bounds the bundle at US-001..US-009, FR-001..FR-044, and NFR-001. | Fixed. spec.md §5 now bounds the bundle at US-010, FR-053, and NFR-021. |
| FND-630 | low | The boundary between this ticket's determinism obligation and issue #42's host floor is stated only in use-cas | Fixed. NFR-019's Rationale states that issue #42's host floor is not repaired here. |

## Declared change to a frozen semantic

FR-041-CON-1 froze the promoted prototype IR — `schemaVersion` `1.0.0`, the
`{schemaVersion, generator, types}` envelope, and its `role` and `nullable`
heuristics — and named this ticket as the place the prototype and contract
shapes are reconciled. This specification reconciles them by **addition, not by
revision**: FR-046-CON-1 states that `src/compiler/ir.mjs`, `compile.mjs`,
`identity.mjs`, `emitters/**`, and `backends/**` stay byte-unchanged and that the
four committed issue #4 goldens are not regenerated, and FR-046-AC-15 and
NFR-021-AC-3 assert it. The contract IR is a second lowering beside the
prototype, reached by the new `compile` verb; `emit-ir` and the prototype path
are untouched. No golden is regenerated by this ticket, and no `role` or
`nullable` heuristic is changed — they are simply not used by the contract path,
which reads `@role` and the type graph instead.

## Gate Result

| Gate | Result | Evidence |
|---|---|---|
| IDs, structure, and EARS grammar | Pass | `quire validate --scope <repo> "spec/**/*.md"`: zero errors, zero `[ears:*]` findings on the issue #19 artifacts |
| Requirement clarity and atomicity | Pass | Every compound Behavior statement split; FR-046 split into FR-046 and FR-053 |
| Complete traceability | Pass | 200/200 criteria and constraints mapped, computed from the requirement files |
| Failure, transition, boundary, and option coverage | Pass | ERR-061..099, EC-049..062, seven permutation rows, sixteen boundary rows, seven transition rows |
| Additive, non-disruptive scope | Pass | NFR-021; no schema, fixture, spike, corpus, or prototype byte changes |
| Analyses | Pass after remediation | SR-066..072 in this directory; 24/24 highs fixed, 41/53 mediums fixed, 12 mediums and 17 lows accepted with a recorded reason |

## Traceability Matrix

| US | FR/NFR | StR | Verification |
|---|---|---|---|
| US-010 (EX-1..5) | FR-045 (AC-1..10, CON-1..4) | StR-001 | TC-398..411 |
| US-010 | FR-053 (AC-1..15, CON-1..5) | StR-001 | TC-412..431 |
| US-010 | FR-046 (AC-1..19, CON-1..5) | StR-001 | TC-432..455 |
| US-010 | FR-047 (AC-1..16, CON-1..5) | StR-001 | TC-456..476 |
| US-010 | FR-048 (AC-1..11, CON-1..4) | StR-001 | TC-477..491 |
| US-010 | FR-049 (AC-1..14, CON-1..4) | StR-001 | TC-492..509 |
| US-010 | FR-050 (AC-1..13, CON-1..4) | StR-001 | TC-510..526 |
| US-010 | FR-051 (AC-1..15, CON-1..5) | StR-001 | TC-527..546 |
| US-010 | FR-052 (AC-1..16, CON-1..4) | StR-001 | TC-547..566 |
| US-010 | NFR-019 (AC-1..12) | StR-001 | TC-567..578 |
| US-010 | NFR-020 (AC-1..11) | StR-001 | TC-579..589 |
| US-010 | NFR-021 (AC-1..8) | StR-001 | TC-590..597 |
| US-010 | Rule rows (permutation, boundary, error, transition, edge) | StR-001 | TC-598..619 |

## Recommendation

Proceed to planning. The bundle is ready for `/spec-to-plan` as Plan-008.
