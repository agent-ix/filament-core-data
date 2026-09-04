---
id: SR-072
title: "Scope and boundary review of the TypeSpec frontend and semantic IR compiler core"
type: SpecReview
analysis: scope-boundary
scope: "US-010, FR-045..FR-052, NFR-019..NFR-021, spec/spec.md, spec/index.md"
review_set: all
---
# Scope and boundary review

## Summary

Issue #19 owns the compiler core inside `filament-core-data`: one frontend seam
and its dialect registry, the TypeSpec lowering to contract semantic IR
`1.1.0`, package/import/export/profile/target resolution, the lock and the v1
fingerprint, the closed diagnostic registry, the compiler-side IR reader and
normalized serialization, the compatibility diff and the IR evolution
projections, and the `compile`, `inspect`, and `diff` commands. The ticket's
safety gate — no language package publication, no downstream consumer change —
is stated in three places and enforced by path: NFR-021 forbids `packages/**`,
`schema/**`, `fixtures/semantic/**`, `fixtures/semantic-core/**`, `spikes/**`,
`conformance/**`, and the frozen prototype modules, FR-052-CON-2 leaves
`package.json` `exports` to issue #11, and FR-046-CON-1 makes the contract path
a second lowering beside the frozen prototype rather than an edit of it.

No requirement reaches into a neighbour's concern. Nothing under FR-045..052
parses clause text (`quire-contract-ir#52`), touches Quire parsing or Quoin
catalog behavior, edits a corpus repository, emits a target or a representation,
or reads a backend: FR-045-AC-6 forbids a frontend importing
`src/compiler/backends/**` or a target-facing TypeSpec library, FR-051-CON-4
makes per-target dispositions an input rather than a backend call, and §2.2
states the target/representation stop line explicitly. `fixtures/compiler/**` is
the right home for this ticket's fixtures — `fixtures/semantic/**` stays issue
#34's and is on the prohibited list, `conformance/**` stays issue #20's and is
asserted byte-unchanged by NFR-021-AC-5 — and the seam leaves a well-formed hole
for issue #36: the dialect is registered as declared-unimplemented against a
vocabulary that already exists in `common.schema.json`, the refusal diagnostic
names the owning issue, and FR-045-AC-5 forbids the harness from claiming
cross-dialect agreement it did not observe.

Two boundaries are unallocated. The first is between this ticket's TypeSpec
authoring surface and issue #35's published semantic-core grammar, which mint
different identities for the same declaration. The second is between this
ticket's acceptance criteria and issue #34's fixture tree: several criteria are
bound to files this ticket is forbidden to edit and that do not contain the
inputs the criteria need. The remaining findings concern artifacts that are
in scope by implication but named by no requirement's Outputs.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-620 | high | The TypeSpec authoring surface is split between two owners with no allocation. FR-046 declares a closed thirteen-decorator library `AgentIx.Semantic.Decorators` and its own identity derivations (`ix://<pkg>/field/<Owner>.<name>`, constraint `ix://<pkg>/constraint/<owner slug>-<keyword slug>`, `diagnosticCode` `agent-ix.<pkg>.<OWNER>_<KEYWORD>`). Issue #35 already published `AgentIx.Semantic.Core` (FR-031) and its lowering to the same IR v1.1 nodes (FR-034) with *different* derivations (`.../field/<Name>-<field>`, `.../constraint/<Name>-<field>-<keyword>`, `agent-ix.<repo>.<NAME>_<FIELD>_<KEYWORD>`). §2.2 defers "a custom emitter for issue #35" to this ticket, yet no requirement in FR-045..052 mentions semantic-core, says whether the `typespec` frontend recognises a semantic-core archetype declaration or treats it as a plain `record`, or says which minting is authoritative. Identity is the cross-package equality key, so the same declaration acquires two identities depending on which path produced the IR. | FR-046 Identity, FR-046 Decorator vocabulary, FR-031, FR-034, spec.md §2.2 |
| FND-621 | high | Five FR-047 criteria and one FR-051 criterion are bound to fixtures on a prohibited path that do not carry the inputs they need. FR-047-AC-1..AC-5 require named cases of `fixtures/semantic/v1/package-graph-cases.json` to "resolve", but that file holds five declarative records whose loci are symbolic strings (`"manifest-a:imports[0]"`) and which contain no manifests, no search directories, and no source trees; FR-047-AC-2 further requires the diagnostic to name "both requiring loci" as line and column. FR-051-AC-1 requires every case of `fixtures/semantic/v1/compatibility/cases.json` to be "reproduced by a constructed input pair", and that file is likewise a case list, not a document pair. Both files are under `fixtures/semantic/**`, which NFR-019 prohibits and NFR-021 measures at zero changes, so the missing inputs cannot be added there — yet no requirement allocates where the constructed packages and document pairs live or how a `fixtures/compiler/**` tree is bound back to a case id. | FR-047-AC-1..AC-5, FR-051-AC-1, NFR-019 Scope, NFR-021 Measurement |
| FND-622 | medium | The compiler fixture corpus is in scope by implication only. FR-046-AC-1 names `fixtures/compiler/packages/assurance`, and FR-047-AC-6..AC-13, FR-048-AC-5..AC-8, FR-049-AC-5/AC-8, FR-052-AC-2..AC-6, NFR-020-AC-3/AC-4/AC-9, and NFR-021-AC-7 (added manifests carrying `AGPL-3.0-only`) all require package trees, defective packages, locks, and profiles. Only `fixtures/compiler/shared/cases.json` (FR-045) and `fixtures/compiler/evolution/` (FR-051) are declared as Outputs; `fixtures/compiler/packages/**` is declared by none, and §2.1 In Scope does not name the fixture corpus at all although NFR-019 lists `fixtures/compiler/**` among its applied paths. | FR-046-AC-1, FR-045 Outputs, FR-051 Outputs, spec.md §2.1, NFR-019 Scope |
| FND-623 | medium | The translation between the fixture's change families and the report's families is unallocated. `fixtures/semantic/v1/compatibility/cases.json` uses twenty-two family names; `compatibility-report.schema.json` closes `family` at fifteen. Eight case families — `multiplicity`, `unit`, `relationship`, `operation`, `clause`, `constraint-vocabulary`, `contract-version`, `kernel-scalar` — are not report families, and FR-051's table silently renames them (`multiplicity` → `field`, `relationship` → `type`, and so on). FR-051-AC-2 asserts "every case family maps to a declared report family through the documented table", but no requirement names that map as an artifact, and neither the fixture nor the schema may be edited here to close the gap on the other side. | FR-051 Classification, FR-051-AC-2, `fixtures/semantic/v1/compatibility/cases.json`, `schema/semantic/v1/compatibility-report.schema.json` |
| FND-624 | medium | Nothing in scope mints IR `extensions[]`. FR-046 closes its decorator vocabulary at thirteen names with no extension decorator, and orders the `extensions` array without ever producing an entry. `extensions` is the IR's declared extensibility seam and issue #35's lowering depends on four of them (`kernel-scalar`, `decimal`, `identity`, `doc`), so a package authored against the published grammar cannot round-trip through the TypeSpec frontend. The ticket's own deliverable list names extensions and provenance as IR content the compiler core produces. Whether the seam belongs here, to #35, or to a later ticket is unstated. | FR-046 Decorator vocabulary, FR-046 Envelope, FR-034 Outputs, issue #19 deliverables |
| FND-625 | medium | Issue #20 is out of scope by path but not by statement, while this ticket stands up its own differential oracle. The §2.2 conformance line is written against issue #27 ("issue #27 neither reads nor edits it"), and no §2.2 entry declares the conformance corpus and oracle out of scope for #19. FR-050-CON-1 and FR-050-AC-3 meanwhile require a three-way agreement between the compiler reader, the issue #34 TypeScript reader, and the Python reader — the same differential mechanism #20 owns, applied to #34's negative cases. The independence claim rests on `NFR-021-AC-5` alone. | spec.md §2.2, FR-050-CON-1, FR-050-AC-3, NFR-021-AC-5 |
| FND-626 | medium | FR-051 authors the IR schema-evolution policy and implements its only checker, and the policy pre-decides a `schema/**` fact this ticket may not touch. The published policy SHALL state that a revision "SHALL be discriminated by `contractVersion` in one schema file" — the discriminator question issue #34 left open — while `schema/**` is on the prohibited list. NFR-013 is the repository's additive-revision owner and FR-025 with issues #7 and #12 own the compatibility gate; no requirement says which of them ratifies the policy document this ticket publishes. | FR-051 Evolution, FR-051-AC-12, NFR-019 Scope, NFR-013, FR-025 |
| FND-627 | medium | The target-surface families are classified with inputs no requirement supplies. FR-051 classifies `generated-api` and `protobuf-reservation` while §2.2 forbids emitting any target and FR-051-CON-4 forbids reading a backend. `generated-api` needs a generator's naming, which belongs to issues #21..#23, yet FR-051-AC-4's omit-and-name-in-`requiredGates` list covers `profile`, `authority`, `mapping`, and `protobuf-reservation` and not `generated-api`. Nothing says who "qualifies" the backend that supplies per-target dispositions before those tickets exist. FR-025-AC-6's Avro compatibility input is dropped from FR-051's Inputs with no statement of where it is discharged. | FR-051 Inputs, FR-051 Classification, FR-051-AC-4, FR-051-CON-4, FR-025-AC-6 |
| FND-628 | medium | The Python side of the differential test has no permitted home. FR-050-AC-3 requires the Python reader to be executed against every case, but NFR-019 prohibits `tests/**` outright, which is where the repository's Python tests and `tests/semantic_ir_reader.py` live, and prohibits `test/semantic-ir-v1-1-reader.ts` from being edited. Only `test/**` is permitted, so the criterion implies either a TypeScript harness that shells out to Python or an unstated exception to the prohibited list; the requirement chooses neither. `.github/**` is likewise prohibited, so the determinism, fuzz, and permutation suites NFR-019 and NFR-020 mandate are reachable only through `make`. | FR-050-AC-3, NFR-019 Scope, NFR-020 Verification, NFR-021-AC-6 |
| FND-629 | low | `spec.md` §5 Requirements Architecture still bounds the bundle at US-001..US-009, FR-001..FR-044, and NFR-001..NFR-018, and its purpose column stops at "prototype-promotion behavior". §2.1, §2.2, §3, and `index.md` were extended for issue #19; the table that states which artifacts the record contains was not, so the record disagrees with itself about its own extent. | spec.md §5, spec.md §2.1, spec/index.md |
| FND-630 | low | The boundary between this ticket's determinism obligation and issue #42's host floor is stated only in use-case prose. NFR-019 names issue #42 upstream and its rationale cites the retained issue #4 evidence's host coupling, while §2.2 excludes repairing it and US-010 Traceability says the replay is not repaired here. No requirement states that NFR-019's zero-difference targets apply to the contract path only, so a reader cannot tell from the requirement whether a host-coupled retained golden fails NFR-019-AC-1. | NFR-019 Rationale, NFR-019 Dependencies, spec.md §2.2, US-010 Traceability |

## Boundary Allocation

| Concern | Owner | Class |
|---|---|---|
| Package-author outcome: one command, one reproducible IR document (US-010) | filament-core-data issue #19 | core |
| Frontend seam, dialect registry, shared fixture harness (FR-045) | filament-core-data issue #19 | core |
| TypeSpec decorator library and the lowering to contract IR `1.1.0` (FR-046) | filament-core-data issue #19 (see FND-620) | core |
| Manifest, import, export, profile, mapping, and target resolution; JSON source loci (FR-047) | filament-core-data issue #19 | core |
| Canonicalization, lock build and verify, v1 fingerprint (FR-048) | filament-core-data issue #19 | infrastructure |
| Diagnostic registry, ordering, limits, published registry document (FR-049) | filament-core-data issue #19 | cross-cutting |
| Compiler-side IR reader, normalized serialization, IR fingerprint (FR-050) | filament-core-data issue #19 | core |
| Compatibility diff and IR version projections (FR-051) | filament-core-data issue #19 (policy ratification, see FND-626) | core |
| `compile`, `inspect`, `diff` commands, Make targets, narrow interface (FR-052) | filament-core-data issue #19 | infrastructure |
| Determinism of IR, lock, diagnostic, inspection, and report bytes (NFR-019) | filament-core-data issue #19 | cross-cutting |
| Bounded, offline, non-executing treatment of untrusted package input (NFR-020) | filament-core-data issue #19 | cross-cutting |
| Non-disruption, path gate, revert rehearsal, licence gate (NFR-021) | filament-core-data issue #19 | cross-cutting |
| Compiler fixture corpus under `fixtures/compiler/**` | filament-core-data issue #19 (undeclared, see FND-622) | infrastructure |
| IR v1.1 node shapes, schemas, and `fixtures/semantic/**` | filament-core-data issue #34, read-only here | external to this ticket |
| Semantic-core L3 grammar, its lowering table, and `packages/**` | filament-core-data issue #35, read-only here | external to this ticket |
| Frozen prototype emitter, backends, issue #4 goldens, `spikes/**` | filament-core-data issue #27, frozen here | external to this ticket |
| Conformance corpus and differential oracle, `conformance/**` | filament-core-data issue #20 | external to this ticket |
| spec-bundle extraction frontend behind the registered dialect | filament-core-data issue #36 | external to this ticket |
| Generated Rust, TypeScript, and Python packages and their naming | filament-core-data issues #21, #22, #23 | external to this ticket |
| Public compiler export, package publication, runtime entry point | filament-core-data issue #11 | external to this ticket |
| Retained-evidence host floor and replay repair | filament-core-data issue #42 | external to this ticket |
| Clause text parsing, normalization, typechecking | `agent-ix/quire-contract-ir#52` | external |
| Relationship verb vocabularies and edge categories | Module repositories, quire-rs FR-040 | external |
| Parse, validate, extract, byte-splice typed Markdown | Quire | external |
| Module catalog, locks, installation, enforcement | Quoin | external |
| Application adapters, persistence, migrations | Filament consumers | external |

## External Dependencies

| Dependency | Type | Assumed or Guaranteed | Contract |
|---|---|---|---|
| `@typespec/compiler` 1.15.0 and `@typespec/versioning` | Pinned toolchain | Guaranteed | FR-046-CON-4 import allowlist, NFR-019-AC-9 exact-version inspection |
| `schema/semantic/v1/*.schema.json` (issue #9, #34) | Published contract, read-only | Guaranteed | FR-050 schema validation, FR-047 manifest validation, NFR-021 zero-change diff |
| `common.schema.json#/$defs/frontendDialect` (`typespec`, `spec-bundle`) | Closed vocabulary owned upstream | Guaranteed | FR-045-AC-1 reads both and fails when either changes alone |
| `fixtures/semantic/v1/negative/reader-cases.json` (issue #34) | Differential case corpus, read-only | Guaranteed | FR-050-AC-2, FR-050-AC-3 |
| `fixtures/semantic/v1/package-graph-cases.json` and `compatibility/cases.json` | Declarative case lists, read-only | Assumed (see FND-621) | FR-047-AC-1..AC-5, FR-051-AC-1; neither file supplies compilable inputs |
| `test/semantic-ir-v1-1-reader.ts`, `tests/semantic_ir_reader.py` (issue #34) | Independent readers used as oracles | Guaranteed | FR-050-AC-3 agreement, FR-050-AC-4 byte-unchanged (home unallocated, FND-628) |
| `packages/semantic-core` grammar and lowering (issue #35) | Sibling authoring surface | Assumed (see FND-620) | No acceptance criterion compares the two identity derivations |
| Issue #4 goldens and `src/compiler/ir.mjs` (issue #27) | Frozen regression baseline | Guaranteed | FR-046-AC-15, FR-052-AC-1, NFR-021-AC-3, NFR-021-AC-4 |
| Issue #20 conformance corpus and oracle | Independent judge of this work | Assumed | NFR-021-AC-5 path gate only; no §2.2 statement (FND-625) |
| Issue #36 spec-bundle frontend | Future producer behind the registered dialect | Assumed | FR-045-CON-1, FR-045-AC-3 diagnostic naming `#36`, shared harness in place |
| Per-target dispositions and Protobuf reservation registries | Inputs to the diff from a target owner | Assumed (see FND-627) | FR-051-CON-4 forbids reading a backend; no supplier named |
| Consumer policy documents and `consumerEvidenceStatus` | Caller-supplied evidence | Guaranteed | `consumer-policy.schema.json`, FR-051-CON-1 absent input is a named gap |
| ADR-0005 TypeSpec structural source | Accepted decision | Guaranteed | FR-046 pinned toolchain, US-010 constraints |
| Issue #42 host floor | Known environment defect | Assumed (see FND-630) | NFR-019 upstream dependency, no criterion partitions the two paths |

The §2.1 and §2.2 deltas, the NFR-019 permitted and prohibited path lists, and
the NFR-021 measurement table agree with each other and with the ticket's safety
gate: no publication, no consumer change, no schema or fixture edit, no
prototype or spike edit, no `conformance/` change. The two high findings sit
inside the repository — one between issue #19 and issue #35's authoring surface,
one between issue #19's criteria and issue #34's fixture tree — and neither
moves work into or out of issue #19; the medium findings name artifacts and
translations that are in scope by implication but owned by no requirement.
