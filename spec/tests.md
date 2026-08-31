---
id: TM-001
title: "filament-core-data semantic architecture, census, feasibility, and semantic-contract Test Matrix"
type: TestMatrix
---
# Test Matrix

## Overview

This matrix defines the verification contract for the issue #8 architecture,
issue #10 read-only contract census, issue #4 TypeSpec feasibility gate, and
issue #9 semantic IR/package/projection specification. Coverage is complete when
every criterion, metric, and named constraint maps to at least one test case.
Issues #8, #10, and #4 have passed their implementation gates. Issue #9 is fully
mapped and its 72 automated, static, analysis, property, integration, fuzz, and
snapshot cases pass. The named schema-source decision at TC-199 remains blocked;
all later disruptive migration and promotion gates remain separate.

## Test Matrix Rules

1. Every acceptance criterion and named constraint has at least one test case.
2. Authority, status, projection, and gate options are tested in their valid combinations.
3. Qualitative constraints are tested at their allowed and prohibited boundaries.
4. Missing status, ownership, provenance, fallback, disposition, and gate paths fail validation.
5. Provisional, normative, superseded, and historical state transitions are tested.
6. Cross-plane concepts, lossy transformations, high corpus failure, and stale decisions are covered as edge cases.

## Requirements Traceability

### Stakeholder Requirement Coverage

| Stakeholder Req | Trace to US/FR | Test/Validation | Coverage Status |
|---|---|---|---|
| StR-001 | US-001..US-005, FR-001..FR-026 | TC-033, TC-086, TC-129, TC-130..202 | ✅ Complete |

### User Story Coverage

| User Story | Acceptance Criteria | Test Cases | Coverage Status |
|---|---|---|---|
| US-001 | US-001-AC-1 | TC-034 | ✅ Complete |
| US-001 | US-001-AC-2 | TC-035 | ✅ Complete |
| US-002 | US-002-AC-1 | TC-036 | ✅ Complete |
| US-002 | US-002-AC-2 | TC-037 | ✅ Complete |
| US-003 | US-003-AC-1 | TC-086 | ✅ Complete |
| US-003 | US-003-AC-2 | TC-087 | ✅ Complete |
| US-004 | US-004-AC-1 | TC-127 | ✅ Complete |
| US-004 | US-004-AC-2 | TC-128 | ✅ Complete |
| US-005 | Informal story outcome implemented by FR-019..FR-026 | TC-130..176 | ✅ Complete |

### Functional Requirement Coverage

| Functional Req | Acceptance Criteria | Test Cases | Coverage Status |
|---|---|---|---|
| FR-001 | FR-001-AC-1..5, FR-001-CON-1 | TC-001..004, TC-053 | ✅ Complete |
| FR-002 | FR-002-AC-1..4 | TC-005..008 | ✅ Complete |
| FR-003 | FR-003-AC-1..4, FR-003-CON-1..2 | TC-009..012 | ✅ Complete |
| FR-004 | FR-004-AC-1..6 | TC-013..016, TC-049..050 | ✅ Complete |
| FR-005 | FR-005-AC-1..4 | TC-017..020 | ✅ Complete |
| FR-006 | FR-006-AC-1..6 | TC-021..024, TC-051..052 | ✅ Complete |
| FR-007 | FR-007-AC-1..4, FR-007-CON-1..2 | TC-025..028 | ✅ Complete |
| FR-008 | FR-008-AC-1..4 | TC-029..032 | ✅ Complete |
| FR-009 | FR-009-AC-1..6 | TC-054..058, TC-088 | ✅ Complete |
| FR-010 | FR-010-AC-1..5 | TC-059..063 | ✅ Complete |
| FR-011 | FR-011-AC-1..5 | TC-064..068 | ✅ Complete |
| FR-012 | FR-012-AC-1..4 | TC-069..072 | ✅ Complete |
| FR-013 | FR-013-AC-1..5 | TC-073..077 | ✅ Complete |
| FR-014 | FR-014-AC-1..3 | TC-089..096 | ✅ Complete |
| FR-015 | FR-015-AC-1..4 | TC-097..103 | ✅ Complete |
| FR-016 | FR-016-AC-1..4 | TC-104..112 | ✅ Complete |
| FR-017 | FR-017-AC-1..5 | TC-113..118 | ✅ Complete |
| FR-018 | FR-018-AC-1..4 | TC-119..122 | ✅ Complete |
| FR-019 | FR-019-AC-1..5, FR-019-CON-1..2 | TC-130..134 | ✅ Complete |
| FR-020 | FR-020-AC-1..6, FR-020-CON-1..2 | TC-135..140 | ✅ Complete |
| FR-021 | FR-021-AC-1..7 | TC-141..146, TC-201 | ✅ Complete |
| FR-022 | FR-022-AC-1..6 | TC-147..152 | ✅ Complete |
| FR-023 | FR-023-AC-1..6 | TC-153..158 | ✅ Complete |
| FR-024 | FR-024-AC-1..7 | TC-159..164, TC-200 | ✅ Complete |
| FR-025 | FR-025-AC-1..6 | TC-165..170 | ✅ Complete |
| FR-026 | FR-026-AC-1..6 | TC-171..176 | ✅ Complete |

### Non-Functional Requirement Coverage

| Non-Functional Req | Verification Method | Evidence/Test Cases | Status |
|---|---|---|---|
| NFR-001 | Static tests and review | TC-038..041 | ✅ Complete |
| NFR-002 | Structured review | TC-042..044 | ✅ Complete |
| NFR-003 | Diff, release, and review inspection | TC-045..048 | ✅ Complete |
| NFR-004 | Schema, determinism, source-locus, and assessment checks | TC-082..085 | ✅ Complete |
| NFR-005 | Diff, repository, release, and review inspection | TC-078..081 | ✅ Complete |
| NFR-006 | Pin, determinism, changed-path, and release inspection | TC-113, TC-123..124 | ✅ Complete |
| NFR-007 | Evidence schema, adverse-result, and requirement-diff review | TC-119..121, TC-125..126 | ✅ Complete |
| NFR-008 | Reproducible build, sandbox, manifest, and path checks | TC-177..180 | ✅ Complete |
| NFR-009 | Cross-language conformance, round-trip, adverse, and API checks | TC-181..184 | ✅ Complete |
| NFR-010 | Sandboxed path, network, execution, dependency, security, and bounded-resource checks | TC-185..189, TC-202 | ✅ Complete |
| NFR-011 | Public schema, independent reader, extension, capability, and preservation checks | TC-190..194 | ✅ Complete |
| NFR-012 | Diff, unchanged-suite, registry, downstream-gate, and human-decision checks | TC-195..199 | 🚧 TC-199 human gate pending |

## Test Case Summary

| Test ID | Title | Type | Priority | Traces To | Status |
|---|---|---|---|---|---|
| TC-001 | Root index contains every required artifact | Static | P0 | FR-001-AC-1, FR-001-CON-1 | ✅ automated contract passed |
| TC-002 | Indexed artifacts use exactly one allowed status | Static | P0 | FR-001-AC-2 | ✅ automated contract passed |
| TC-003 | Provisional artifacts link their resolution gate | Static | P0 | FR-001-AC-3 | ✅ automated contract passed |
| TC-004 | Superseded decisions retain history and one successor | Static | P1 | FR-001-AC-4 | ✅ automated contract passed |
| TC-005 | Authority matrix covers every required concern | Manual | P0 | FR-002-AC-1 | ✅ architecture review passed |
| TC-006 | Authored knowledge and runtime authority remain distinct | Manual | P0 | FR-002-AC-2 | ✅ architecture review passed |
| TC-007 | Generated types and schemas are derived artifacts | Static | P0 | FR-002-AC-3 | ✅ automated contract passed |
| TC-008 | Analytical projections require source and transform provenance | Static | P1 | FR-002-AC-4 | ✅ automated contract passed |
| TC-009 | Ownership table includes owners and non-responsibilities | Static | P0 | FR-003-AC-1 | ✅ automated contract passed |
| TC-010 | Quire boundary preserves the rendering-removal decision | Manual | P0 | FR-003-AC-2, FR-003-CON-1 | ✅ architecture review passed |
| TC-011 | Quoin distribution and module vocabulary ownership are distinct | Manual | P0 | FR-003-AC-3 | ✅ architecture review passed |
| TC-012 | Persistence, UI, and shared-contract authority remain downstream concerns | Manual | P1 | FR-003-AC-4, FR-003-CON-2 | ✅ architecture review passed |
| TC-013 | Compiler metamodel and kernel types are separately inventoried | Static | P0 | FR-004-AC-1 | ✅ automated contract passed |
| TC-014 | Example concepts retain identity across one primary data plane | Manual | P1 | FR-004-AC-2 | ✅ architecture review passed |
| TC-015 | Structural kind and semantic role are independent | Static | P0 | FR-004-AC-3 | ✅ automated contract passed |
| TC-016 | Static and dynamic extension behavior does not conflict | Manual | P0 | FR-004-AC-4 | ✅ architecture review passed |
| TC-017 | Core and module package topology has explicit version ownership | Static | P0 | FR-005-AC-1 | ✅ automated contract passed |
| TC-018 | Four required generated consumer surfaces are specified | Static | P0 | FR-005-AC-2 | ✅ automated contract passed |
| TC-019 | Authoring model excludes Python schema decorators | Static | P1 | FR-005-AC-3 | ✅ automated contract passed |
| TC-020 | Generated packages exclude application-framework adapters | Static | P0 | FR-005-AC-4 | ✅ automated contract passed |
| TC-021 | Export, target, mapping, and profile concepts are distinct | Manual | P0 | FR-006-AC-1 | ✅ architecture review passed |
| TC-022 | Each representation includes a best-fit use and non-use | Manual | P0 | FR-006-AC-2 | ✅ architecture review passed |
| TC-023 | Markdown mapping covers frontmatter, headings, prose, and tables | Static | P0 | FR-006-AC-3 | ✅ automated contract passed |
| TC-024 | Lossy transformations require declaration and provenance | Static | P0 | FR-006-AC-4 | ✅ automated contract passed |
| TC-025 | Compatibility policy covers schema evolution and Avro preservation | Manual | P0 | FR-007-AC-1, FR-007-CON-1 | ✅ architecture review passed |
| TC-026 | TypeSpec gate includes pass criteria and JSON Schema fallback | Static | P0 | FR-007-AC-2 | ✅ automated contract passed |
| TC-027 | Corpus-review method accounts for the complete declared scope | Manual | P0 | FR-007-AC-3 | ✅ architecture review passed |
| TC-028 | Roadmap defines cutover gates and pauses on high failure | Manual | P0 | FR-007-AC-4, FR-007-CON-2 | ✅ architecture review passed |
| TC-029 | Required ADR inventory and statuses are complete | Static | P0 | FR-008-AC-1 | ✅ automated contract passed |
| TC-030 | Every known Quire conflict has a disposition | Manual | P0 | FR-008-AC-2 | ✅ architecture review passed |
| TC-031 | ADRs keep rendering and generation outside Quire core | Static | P0 | FR-008-AC-3 | ✅ automated contract passed |
| TC-032 | Conditional TypeSpec ADR links fallback and resolution ticket | Static | P0 | FR-008-AC-4 | ✅ automated contract passed |
| TC-033 | Root-index walkthrough satisfies the stakeholder governance need | Manual | P0 | StR-001-VC-1 | ✅ standalone review passed |
| TC-034 | Authored requirement resolves to Markdown authority | Manual | P0 | US-001-AC-1 | ✅ standalone review passed |
| TC-035 | Verification run resolves to runtime authority and report projection | Manual | P0 | US-001-AC-2 | ✅ standalone review passed |
| TC-036 | Unpassed TypeSpec gate resolves to provisional plus fallback | Manual | P0 | US-002-AC-1 | ✅ standalone review passed |
| TC-037 | Ungated database cutover resolves to blocked | Manual | P0 | US-002-AC-2 | ✅ standalone review passed |
| TC-038 | Required-artifact inventory reaches 100 percent | Static | P0 | NFR-001-AC-1 | ✅ automated contract passed |
| TC-039 | Internal-link scan reports zero broken links | Static | P0 | NFR-001-AC-2 | ✅ automated contract passed |
| TC-040 | Index scan reports zero missing or ambiguous statuses | Static | P0 | NFR-001-AC-3 | ✅ automated contract passed |
| TC-041 | Conflict review reports zero missing dispositions | Manual | P0 | NFR-001-AC-4 | ✅ architecture review passed |
| TC-042 | Standalone review answers every required architecture topic | Manual | P1 | NFR-002-AC-1 | ✅ standalone review passed |
| TC-043 | Terminology review reports zero undefined normative terms | Manual | P1 | NFR-002-AC-2 | ✅ terminology review passed |
| TC-044 | Decision review requires no chat-history context | Manual | P0 | NFR-002-AC-3 | ✅ standalone review passed |
| TC-045 | Issue diff contains no runtime or generated source changes | Static | P0 | NFR-003-AC-1 | ✅ changed-path contract passed |
| TC-046 | Release inspection reports zero issue #8 publications | Manual | P0 | NFR-003-AC-2 | ✅ package and release files unchanged |
| TC-047 | Repository inspection reports zero external mutations | Manual | P0 | NFR-003-AC-3 | ✅ source changes confined to this repository |
| TC-048 | Review finds no provisional decision labeled final | Manual | P0 | NFR-003-AC-4 | ✅ architecture review passed |
| TC-049 | Identity model separates package, type, definition, and occurrence | Manual | P0 | FR-004-AC-5 | ✅ architecture review passed |
| TC-050 | Artifact relocation and rendering preserve semantic identity | Property | P0 | FR-004-AC-6 | ✅ identity rule contract passed |
| TC-051 | Transformation failures remain explicit and non-authoritative | Manual | P0 | FR-006-AC-5 | ✅ architecture review passed |
| TC-052 | Transformation declarations expose purity and external effects | Manual | P1 | FR-006-AC-6 | ✅ architecture review passed |
| TC-053 | Supersession cycles fail without arbitrary resolution | Property | P0 | FR-001-AC-5 | ✅ property fixture passed |
| TC-054 | Repository snapshot fields are complete | Static | P0 | FR-009-AC-1 | ✅ audit evidence passed |
| TC-055 | Corpus and module pins are immutable and complete | Static | P0 | FR-009-AC-2 | ✅ audit evidence passed |
| TC-056 | In-flight contract work is source-cited | Analysis | P0 | FR-009-AC-3 | ✅ audit evidence passed |
| TC-057 | Unavailable and unstable inputs retain consequences | Static | P0 | FR-009-AC-4 | ✅ audit evidence passed |
| TC-058 | Pre-sign-off drift is explicitly recorded | Static | P0 | FR-009-AC-5 | ✅ audit evidence passed |
| TC-059 | Every repository and contract family has a disposition | Static | P0 | FR-010-AC-1 | ✅ audit evidence passed |
| TC-060 | Every contract resolves to source or generated evidence | Static | P0 | FR-010-AC-2 | ✅ audit evidence passed |
| TC-061 | Unknown and unavailable contract properties stay explicit | Static | P0 | FR-010-AC-3 | ✅ audit evidence passed |
| TC-062 | Contract representations retain their data-plane role | Static | P1 | FR-010-AC-4 | ✅ audit evidence passed |
| TC-063 | Inventory IDs and evidence references are valid | Static | P0 | FR-010-AC-5 | ✅ audit evidence passed |
| TC-064 | Every contract has one allowed fit disposition | Static | P0 | FR-011-AC-1 | ✅ audit evidence passed |
| TC-065 | Repeated concepts have parity or not-comparable evidence | Static | P0 | FR-011-AC-2 | ✅ audit evidence passed |
| TC-066 | Field and semantic mismatches reach the conflict ledger | Analysis | P0 | FR-011-AC-3 | ✅ audit evidence passed |
| TC-067 | Unproven equivalence cannot be classified fit | Static | P0 | FR-011-AC-4 | ✅ audit evidence passed |
| TC-068 | Dynamic-schema findings reuse existing issues | Manual | P1 | FR-011-AC-5 | ✅ audit evidence passed |
| TC-069 | Repository and concept impacts are complete | Static | P0 | FR-012-AC-1 | ✅ audit evidence passed |
| TC-070 | Disruptive findings name controls and gates | Analysis | P0 | FR-012-AC-2 | ✅ audit evidence passed |
| TC-071 | Active-work overlaps include sequencing consequences | Manual | P0 | FR-012-AC-3 | ✅ audit evidence passed |
| TC-072 | Recommendations never imply migration approval | Static | P0 | FR-012-AC-4 | ✅ audit evidence passed |
| TC-073 | SpecReview links all required evidence artifacts | Static | P0 | FR-013-AC-1 | ✅ audit evidence passed |
| TC-074 | Issue acceptance criteria receive source-cited dispositions | Analysis | P0 | FR-013-AC-2 | ✅ audit evidence passed |
| TC-075 | Contract-affecting drift prevents ready status | Static | P0 | FR-013-AC-3 | ✅ audit evidence passed |
| TC-076 | Remaining program gates are named | Manual | P0 | FR-013-AC-4 | ✅ audit evidence passed |
| TC-077 | Unknown and low-confidence findings remain visible | Manual | P0 | FR-013-AC-5 | ✅ audit evidence passed |
| TC-078 | External repository source changes remain zero | Static | P0 | NFR-005-AC-1 | ✅ audit evidence passed |
| TC-079 | Existing runtime and contract source changes remain zero | Static | P0 | NFR-005-AC-2 | ✅ audit evidence passed |
| TC-080 | Publication, catalog, and enforcement changes remain zero | Manual | P0 | NFR-005-AC-3 | ✅ audit evidence passed |
| TC-081 | Requirements remain intact when findings are adverse | Manual | P0 | NFR-005-AC-4 | ✅ audit evidence passed |
| TC-082 | Every machine-readable evidence artifact validates | Static | P0 | NFR-004 | ✅ audit evidence passed |
| TC-083 | Unchanged pinned inputs produce identical normalized evidence | Property | P0 | NFR-004 | ✅ audit evidence passed |
| TC-084 | Evidence references resolve at recorded revisions | Static | P0 | NFR-004 | ✅ audit evidence passed |
| TC-085 | Manual assessments carry method, rationale, and confidence | Manual | P1 | NFR-004 | ✅ audit evidence passed |
| TC-086 | Reviewer compares a repeated concept end to end | Manual | P0 | US-003-AC-1 | ✅ audit evidence passed |
| TC-087 | Unconfirmed consumer remains explicit and non-compatible | Manual | P0 | US-003-AC-2 | ✅ audit evidence passed |
| TC-088 | Volatile external collections prove access and full enumeration | Static | P0 | FR-009-AC-6 | ✅ audit evidence passed |
| TC-089 | Exact compiler, emitter, generator, validator, and native tool versions are retained | Static | P0 | FR-014-AC-1 | ✅ passed — retained spike evidence |
| TC-090 | Two source packages import a versioned semantic core without flattening ownership | Static | P0 | FR-014-AC-2 | ✅ passed — retained spike evidence |
| TC-091 | Slice contains an artifact and semantic object with separate identity and role | Static | P0 | FR-014-AC-3 | ✅ passed — retained spike evidence |
| TC-092 | Slice contains a recursive relation with a stable identity reference | Static | P0 | FR-014-AC-3 | ✅ passed — retained spike evidence |
| TC-093 | Slice contains a versioned event with provenance and causation | Static | P0 | FR-014-AC-3 | ✅ passed — retained spike evidence |
| TC-094 | Slice contains verification run and evidence records | Static | P0 | FR-014-AC-3 | ✅ passed — retained spike evidence |
| TC-095 | Slice contains a discriminated result with success, failure, and not-computed variants | Static | P0 | FR-014-AC-3 | ✅ passed — retained spike evidence |
| TC-096 | Slice distinguishes extension policy, optional absence, and explicit null | Static | P0 | FR-014-AC-3 | ✅ passed — retained spike evidence |
| TC-097 | Official JSON Schema output declares draft 2020-12 and stable modular IDs/refs | Static | P0 | FR-015-AC-1 | ✅ passed — retained spike evidence |
| TC-098 | JSON Schema preserves constraints, sealed objects, recursion, and optional-versus-null | Static | P0 | FR-015-AC-1 | ✅ passed — retained spike evidence |
| TC-099 | JSON Schema preserves the discriminated result alternatives | Static | P0 | FR-015-AC-1 | ✅ passed — retained spike evidence |
| TC-100 | Official Protobuf output preserves package, field numbers, and reservations | Static | P0 | FR-015-AC-2 | ✅ passed — retained spike evidence |
| TC-101 | Protobuf optionality and wire-only limitations receive explicit dispositions | Static | P0 | FR-015-AC-2 | ✅ passed — retained spike evidence |
| TC-102 | Invalid or unsupported TypeSpec produces a source-located nonzero diagnostic | Static | P0 | FR-015-AC-3 | ✅ passed — retained spike evidence |
| TC-103 | Package versioning and deprecation compile or retain a precise limitation | Analysis | P1 | FR-015-AC-4 | ✅ passed — retained spike evidence |
| TC-104 | Custom semantic IR is versioned, deterministic, and source-located | Static | P0 | FR-016-AC-1 | ✅ passed — retained spike evidence |
| TC-105 | Semantic IR keeps structural kind, semantic role, identity, optionality, nullability, constraints, recursion, and provenance | Static | P0 | FR-016-AC-1 | ✅ passed — retained spike evidence |
| TC-106 | Generated TypeScript compiles and exposes ordinary importable types | Static | P0 | FR-016-AC-2 | ✅ passed — retained spike evidence |
| TC-107 | Generated Python/Pydantic compiles and exposes ordinary importable models | Static | P0 | FR-016-AC-2 | ✅ passed — retained spike evidence |
| TC-108 | Generated Rust/Serde compiles and exposes ordinary importable structs and enums | Static | P0 | FR-016-AC-2 | ✅ passed — retained spike evidence |
| TC-109 | Custom JSON Schema disposition agrees with official output or names each mismatch | Static | P0 | FR-016-AC-3 | ✅ passed — retained spike evidence |
| TC-110 | Protobuf mapping disposition agrees with official output or names each mismatch | Static | P0 | FR-016-AC-3 | ✅ passed — retained spike evidence |
| TC-111 | Arrow projection declares authority, flattening, recursion loss, and provenance | Analysis | P0 | FR-016-AC-4 | ✅ passed — retained spike evidence |
| TC-112 | Markdown mapping declares locations and preservation without rendering ownership | Analysis | P0 | FR-016-AC-4 | ✅ passed — retained spike evidence |
| TC-113 | Two clean generations have one normalized fingerprint and no unexplained diff | Property | P0 | FR-017-AC-1, NFR-006 | ✅ passed — retained spike evidence |
| TC-114 | Native Rust, TypeScript, and Python consumers compile and construct the shared valid fixture | Static | P0 | FR-017-AC-2 | ✅ passed — retained spike evidence |
| TC-115 | Applicable targets agree on valid and invalid golden fixture dispositions | Static | P0 | FR-017-AC-3 | ✅ passed — retained spike evidence |
| TC-116 | Generated cross-package references resolve in every native package | Static | P0 | FR-017-AC-4 | ✅ passed — retained spike evidence |
| TC-117 | Patch, additive, and breaking revisions classify consistently | Static | P0 | FR-017-AC-4 | ✅ passed — retained spike evidence |
| TC-118 | Source diagnostics, generation duration, and output size are retained without production claims | Analysis | P1 | FR-017-AC-5 | ✅ passed — retained spike evidence |
| TC-119 | Every required capability has command, version, sample, result, disposition, and rationale | Analysis | P0 | FR-018-AC-1, NFR-007 | ✅ passed — retained spike evidence |
| TC-120 | Recommendation states extension maintenance cost and cost of being wrong | Analysis | P0 | FR-018-AC-2, NFR-007 | ✅ passed — retained spike evidence |
| TC-121 | Failed P0 capability selects modular JSON Schema metadata fallback without weakening the gate | Static | P0 | FR-018-AC-3, NFR-007 | ✅ passed — retained spike evidence |
| TC-122 | ADR-0004 cannot become normative without identified human acceptance | Manual | P0 | FR-018-AC-4 | ✅ passed — retained spike evidence |
| TC-123 | Spike changes only isolated experiment, spec, plan, review, dependency, and test paths | Static | P0 | NFR-006 | ✅ passed — retained spike evidence |
| TC-124 | Spike publishes nothing and replaces no current schema, generated binding, or consumer | Static | P0 | NFR-006 | ✅ passed — retained spike evidence |
| TC-125 | Evidence schema rejects missing methods, versions, results, limits, consequences, rationales, or confidence | Static | P0 | NFR-007 | ✅ passed — retained spike evidence |
| TC-126 | Adverse evidence remains failed or partial and requirements remain unchanged | Manual | P0 | NFR-007 | ✅ passed — retained spike evidence |
| TC-127 | Reviewer runs one command and observes equivalent native consumer construction | Manual | P0 | US-004-AC-1 | ✅ passed — retained spike evidence |
| TC-128 | Failed P0 demonstration reaches the JSON Schema fallback and leaves Avro/consumers unchanged | Manual | P0 | US-004-AC-2 | ✅ passed — retained spike evidence |
| TC-129 | Root-index walkthrough resolves the evidence, recommendation, fallback, and human promotion gate | Manual | P0 | StR-001-VC-1 | ✅ passed — retained spike evidence |
| TC-130 | V1 contract names modular JSON Schema 2020-12 and the human source-decision gate | Static | P0 | FR-019-AC-1 | ✅ passed — semantic contract v1 |
| TC-131 | Source, IR, package, mapping, profile, and lock identities and versions remain distinct | Static | P0 | FR-019-AC-2 | ✅ passed — semantic contract v1 |
| TC-132 | Every semantic IR node retains stable identity and source or generated origin | Unit | P0 | FR-019-AC-3, FR-019-CON-1 | ✅ passed — semantic contract v1 |
| TC-133 | Unknown source or IR contract version emits diagnostics and zero target artifacts | Unit | P0 | FR-019-AC-4, FR-019-CON-2 | ✅ passed — semantic contract v1 |
| TC-134 | V1 source selection changes neither current Avro nor TypeSpec authority implicitly | Static | P0 | FR-019-AC-5 | ✅ passed — semantic contract v1 |
| TC-135 | Every structural kind has one normative IR shape and valid/invalid fixtures | Static | P0 | FR-020-AC-1 | ✅ passed — semantic contract v1 |
| TC-136 | Structural kind and namespaced semantic roles vary independently | Unit | P0 | FR-020-AC-2 | ✅ passed — semantic contract v1 |
| TC-137 | Required, optional, nullable, and defaulted states remain distinct across core targets | Property | P0 | FR-020-AC-3 | ✅ passed — semantic contract v1 |
| TC-138 | Generated-name and source-path renames preserve stable semantic identities | Property | P0 | FR-020-AC-4, FR-020-CON-1 | ✅ passed — semantic contract v1 |
| TC-139 | Recursive references and namespaced extensions preserve graph identity | Property | P0 | FR-020-AC-5 | ✅ passed — semantic contract v1 |
| TC-140 | Open and closed unknown values never become known zero/default values | Unit | P0 | FR-020-AC-6, FR-020-CON-2 | ✅ passed — semantic contract v1 |
| TC-141 | Compatible package graphs resolve to one order-independent transitive lock | Property | P0 | FR-021-AC-1 | ✅ passed — semantic contract v1 |
| TC-142 | Identity, version, digest, export, and cycle conflicts report every locus | Unit | P0 | FR-021-AC-2 | ✅ passed — semantic contract v1 |
| TC-143 | Profile selection never mutates semantic definitions | Property | P0 | FR-021-AC-3 | ✅ passed — semantic contract v1 |
| TC-144 | Unknown manifest keys fail while namespaced extension keys preserve | Unit | P0 | FR-021-AC-4 | ✅ passed — semantic contract v1 |
| TC-145 | Dynamic and static consumption share one locked identity graph | Analysis | P0 | FR-021-AC-5 | ✅ passed — semantic contract v1 |
| TC-146 | Shared package contract excludes Quoin registry transport and install policy | Static | P0 | FR-021-AC-6 | ✅ passed — semantic contract v1 |
| TC-147 | Exports, targets, mappings, and profile options validate independently | Unit | P0 | FR-022-AC-1 | ✅ passed — semantic contract v1 |
| TC-148 | Every transformation kind has distinct required fields and semantics | Static | P0 | FR-022-AC-2 | ✅ passed — semantic contract v1 |
| TC-149 | Lossy output requires profile permission and complete omission identities | Unit | P0 | FR-022-AC-3 | ✅ passed — semantic contract v1 |
| TC-150 | Bidirectional mappings satisfy declared get/put lens laws | Property | P0 | FR-022-AC-4 | ✅ passed — semantic contract v1 |
| TC-151 | Pure transforms cannot hide external effects and effectful transforms record provenance | Unit | P0 | FR-022-AC-5 | ✅ passed — semantic contract v1 |
| TC-152 | Invalid, unsupported, unavailable, partial, and lossy outcomes remain distinct | Unit | P0 | FR-022-AC-6 | ✅ passed — semantic contract v1 |
| TC-153 | Every representation declares mapping fields, fit/non-use, and compatibility method | Static | P0 | FR-023-AC-1 | ✅ passed — semantic contract v1 |
| TC-154 | Markdown fixtures cover semantic loci and an unrepresentable construct | Snapshot | P0 | FR-023-AC-2 | ✅ passed — semantic contract v1 |
| TC-155 | Removed Protobuf names/numbers stay reserved and declaration order never assigns them | Unit | P0 | FR-023-AC-3 | ✅ passed — semantic contract v1 |
| TC-156 | SQL mapping cannot claim physical DDL or migration state as semantic source | Static | P0 | FR-023-AC-4 | ✅ passed — semantic contract v1 |
| TC-157 | Columnar and delimited fixtures reject undeclared loss and implicit type inference | Unit | P0 | FR-023-AC-5 | ✅ passed — semantic contract v1 |
| TC-158 | Specialized formats remain unselected without a concrete measured boundary | Analysis | P0 | FR-023-AC-6 | ✅ passed — semantic contract v1 |
| TC-159 | Independent backends consume one IR and return one output/diagnostic envelope | Integration | P0 | FR-024-AC-1 | ✅ passed — semantic contract v1 |
| TC-160 | Core target contracts define native API and runtime validation behavior | Static | P0 | FR-024-AC-2 | ✅ passed — semantic contract v1 |
| TC-161 | Generated semantic packages contain no application/framework dependency | Static | P0 | FR-024-AC-3 | ✅ passed — semantic contract v1 |
| TC-162 | Unsupported target features cannot degrade to any, generic maps, or empty models | Unit | P0 | FR-024-AC-4 | ✅ passed — semantic contract v1 |
| TC-163 | Backend qualification distinguishes upstream generation from custom retention | Analysis | P0 | FR-024-AC-5 | ✅ passed — semantic contract v1 |
| TC-164 | Agent IX custom compiler and codegen source contract requires AGPL-3.0-or-later | Static | P0 | FR-024-AC-6 | ✅ passed — semantic contract v1 |
| TC-165 | Compatibility corpus covers every change family and disposition | Unit | P0 | FR-025-AC-1 | ✅ passed — semantic contract v1 |
| TC-166 | Cross-target disagreement yields the most restrictive disposition | Property | P0 | FR-025-AC-2 | ✅ passed — semantic contract v1 |
| TC-167 | Open/closed enum and unknown-field policies control compatibility explicitly | Unit | P0 | FR-025-AC-3 | ✅ passed — semantic contract v1 |
| TC-168 | Authority and loss changes can break identical structural schemas | Unit | P0 | FR-025-AC-4 | ✅ passed — semantic contract v1 |
| TC-169 | Unknown and stale consumers remain visible and block promotion | Unit | P0 | FR-025-AC-5 | ✅ passed — semantic contract v1 |
| TC-170 | Avro readers remain compatibility inputs until their retirement gate | Static | P0 | FR-025-AC-6 | ✅ passed — semantic contract v1 |
| TC-171 | Dynamic and generated consumers agree on one fixture and fingerprint | Integration | P0 | FR-026-AC-1 | ✅ passed — semantic contract v1 |
| TC-172 | Static consumers apply preserve/reject/surface unknown-module policy exactly | Unit | P0 | FR-026-AC-2 | ✅ passed — semantic contract v1 |
| TC-173 | Every current Quoin manifest passes the legacy profile unchanged | Integration | P0 | FR-026-AC-3 | ✅ passed — semantic contract v1 |
| TC-174 | Existing Avro positive and negative fixtures cross the bridge without widening | Integration | P0 | FR-026-AC-4 | ✅ passed — semantic contract v1 |
| TC-175 | Missing versions, imports, adapters, and identity conflicts emit no empty model | Unit | P0 | FR-026-AC-5 | ✅ passed — semantic contract v1 |
| TC-176 | Quire, Quoin, module, compiler, and consumer ownership remains allocated | Static | P0 | FR-026-AC-6 | ✅ passed — semantic contract v1 |
| TC-177 | Two isolated locked contract-normalization passes have byte-identical normalized fingerprints | Property | P0 | NFR-008 | ✅ passed — semantic contract v1 |
| TC-178 | Locked contract validation resolves only declared local inputs and refuses undeclared acquisition | Integration | P0 | NFR-008 | ✅ passed — semantic contract v1 |
| TC-179 | Every emitted file is reconciled by exactly one output-manifest entry | Static | P0 | NFR-008 | ✅ passed — semantic contract v1 |
| TC-180 | Retained output contains no environment-specific absolute path | Static | P0 | NFR-008 | ✅ passed — semantic contract v1 |
| TC-181 | All core target contracts declare the same verdict for each shared conformance fixture | Integration | P0 | NFR-009 | ✅ passed — semantic contract v1 |
| TC-182 | Accepted fixture expectations normalize to one canonical semantic value across target contracts | Property | P0 | NFR-009 | ✅ passed — semantic contract v1 |
| TC-183 | No core target contract permits an unsupported feature to widen silently | Unit | P0 | NFR-009 | ✅ passed — semantic contract v1 |
| TC-184 | Every target contract requires generated API elements to link to stable semantic identity metadata | Static | P0 | NFR-009 | ✅ passed — semantic contract v1 |
| TC-185 | Compiler request and output contracts reject hostile names, absolute paths, and traversal outside the output root | Integration | P0 | NFR-010 | ✅ passed — semantic contract v1 |
| TC-186 | Locked contract validation has zero undeclared remote references or acquisition paths | Integration | P0 | NFR-010 | ✅ passed — semantic contract v1 |
| TC-187 | Hostile schema, template, example, and option fixtures remain inert data during contract validation | Fuzz | P0 | NFR-010 | ✅ passed — semantic contract v1 |
| TC-188 | Issue #9 adds no executable generator dependency; future generator contracts require exact locks and provenance | Static | P0 | NFR-010 | ✅ passed — semantic contract v1 |
| TC-189 | Target and compiler contracts require explicit disposition of high/critical generator dependency findings | Static | P0 | NFR-010 | ✅ passed — semantic contract v1 |
| TC-190 | Every public contract has a versioned schema and positive/negative examples | Static | P0 | NFR-011 | ✅ passed — semantic contract v1 |
| TC-191 | Independent reader passes core fixtures without private compiler state | Integration | P0 | NFR-011 | ✅ passed — semantic contract v1 |
| TC-192 | Extension keys require namespaced identity and version | Static | P0 | NFR-011 | ✅ passed — semantic contract v1 |
| TC-193 | Unknown required capabilities fail before target generation | Unit | P0 | NFR-011 | ✅ passed — semantic contract v1 |
| TC-194 | Unknown preservable extensions survive a no-op round trip unchanged | Property | P0 | NFR-011 | ✅ passed — semantic contract v1 |
| TC-195 | Issue #9 changed-path gate excludes runtime and consumer source | Static | P0 | NFR-012 | ✅ passed — semantic contract v1 |
| TC-196 | Current Avro, package, and module fixture suites remain unchanged and passing | Integration | P0 | NFR-012 | ✅ passed — semantic contract v1 |
| TC-197 | Issue #9 publishes no package and changes no catalog pin | Static | P0 | NFR-012 | ✅ passed — semantic contract v1 |
| TC-198 | Every compiler, publication, enforcement, database, migration, and retirement action retains its own gate | Static | P0 | NFR-012, NFR-012-AC-2 | ✅ passed — semantic contract v1 |
| TC-199 | Named human accepts or holds the modular JSON Schema v1 source before merge | Manual | P0 | NFR-012-AC-1 | 🚧 human decision gate |
| TC-200 | Independent adapters and backends share stable diagnostic codes and causal envelopes | Unit | P0 | FR-024-AC-7 | ✅ passed — semantic contract v1 |
| TC-201 | Fingerprints ignore excluded ordering but change for every included semantic-byte change | Property | P0 | FR-021-AC-7 | ✅ passed — semantic contract v1 |
| TC-202 | Oversized and cyclic hostile inputs terminate at declared resource limits | Fuzz | P0 | NFR-010 | ✅ passed — semantic contract v1 |

## Option Permutation Matrix

| Test Case | Concern or State | Authority or Status | Projection or Gate | Expected Behavior |
|---|---|---|---|---|
| TC-006, TC-034 | authored knowledge | typed Markdown | generated schema or language type | Authority and derived view remain distinct |
| TC-006, TC-035 | runtime run | owning runtime store | Markdown report | Store is authoritative; report is derived |
| TC-049, TC-050 | semantic definition | stable semantic identity | file path or rendered view changes | Identity remains stable |
| TC-002 | current accepted decision | normative | no unresolved gate | Exactly one current normative status |
| TC-003, TC-036 | candidate mechanism | provisional | named resolution ticket | Candidate cannot be presented as final |
| TC-004 | superseded decision | historical | one current successor | History remains linked but non-normative |
| TC-028, TC-037 | disruptive migration | blocked | unmet human gate | Cutover cannot be promoted |
| TC-061, TC-087 | suspected consumer | unknown | incomplete source evidence | Unknown remains explicit and lowers confidence |
| TC-061 | contract property | none or not-applicable | source proves absence or irrelevance | Explicit state is retained without inventing a value |
| TC-064, TC-067 | repeated definition | conflict or unknown | equivalence not proven | Fit is prohibited |
| TC-064 | representation-local definition | representation-local | semantic scope is intentionally local | No shared replacement is implied |
| TC-097, TC-121 | TypeSpec P0 capabilities all pass | recommended | human ADR review | TypeSpec may be proposed, never self-promoted |
| TC-102, TC-121 | TypeSpec P0 capability fails | no-go | modular JSON Schema fallback | Failure and requirement remain intact |
| TC-100, TC-110 | concrete Protobuf interface | wire projection | explicit field mapping | Stable numbered projection may pass without becoming universal |
| TC-111 | recursive semantic graph | analytical projection | declared flattening/loss | Arrow remains derived and source/provenance linked |
| TC-137 | field state | required/optional | nullable/non-null/defaulted | Every valid combination retains a distinct semantic state |
| TC-143 | same semantic definitions | profile A/B | exports/targets/mappings differ | Definitions and stable identities remain byte-equivalent |
| TC-149, TC-154 | authored Markdown | byte/structure/semantic/lossy | mapping permits or forbids loss | Outcome and edit authority follow the selected profile |
| TC-155, TC-158 | concrete service boundary absent | Protobuf unselected | no descriptor mapping | Wire format remains absent without speculative generation |
| TC-167 | enum/record evolution | open/closed | preserve/ignore/reject unknown | Compatibility follows declared capability, not language default |
| TC-171, TC-172 | module known/unknown | dynamic/static consumer | preserve/reject/surface policy | Same identity graph, policy-specific handling |

## Constraint Boundary Tests

| Constraint | Boundary Type | Test Value | Test Case | Expected |
|---|---|---|---|---|
| FR-001-CON-1 | Allowed | Root index and repository artifacts only | TC-001, TC-044 | Pass without chat history |
| FR-001-CON-1 | Prohibited | Decision requires prior chat context | TC-044 | Fail review |
| FR-003-CON-1 | Allowed | Quire parses, validates, extracts, and byte-splices Markdown | TC-010 | Pass architecture review |
| FR-003-CON-1 | Prohibited | Quire renders templates or generates language packages | TC-010 | Fail architecture review |
| FR-003-CON-2 | Allowed | Consumer owns an adapter over a shared versioned contract | TC-012 | Pass architecture review |
| FR-003-CON-2 | Prohibited | Consumer forks a shared semantic contract as canonical | TC-012 | Fail architecture review |
| FR-007-CON-1 | Allowed | Avro retained while a known consumer remains | TC-025 | Pass compatibility review |
| FR-007-CON-1 | Prohibited | Avro removed before all consumers pass cutover | TC-025 | Fail compatibility review |
| FR-007-CON-2 | Allowed | High corpus failure pauses promotion | TC-028 | Hold gate remains closed |
| FR-007-CON-2 | Prohibited | Contract weakens automatically after high failure | TC-028 | Fail safety review |
| NFR-004 | Allowed | Two validations of identical pinned inputs produce byte-equivalent normalized evidence | TC-083 | Pass reproducibility gate |
| NFR-004 | Prohibited | A repeated validation changes ordering or content | TC-083 | Fail reproducibility gate |
| NFR-005 | Allowed | Audit-only files are added in `filament-core-data` | TC-079 | Pass read-only gate |
| NFR-005 | Prohibited | An examined schema, DTO, migration, corpus file, or catalog pin changes | TC-078..080 | Fail read-only gate |
| NFR-006 | Allowed | Exact pinned spike dependency and isolated generated output | TC-089, TC-113, TC-123 | Pass reproducibility gate |
| NFR-006 | Prohibited | Spike overwrites the Avro schema, generated package, or consumer | TC-123..124 | Fail isolation gate |
| NFR-007 | Allowed | P0 limitation remains partial/fail with consequence and cost | TC-119..121, TC-126 | Pass evidence review |
| NFR-007 | Prohibited | Requirement or pass rule is weakened after an adverse result | TC-121, TC-126 | Fail evidence review |
| FR-019-CON-1 | Allowed | Source adapter preserves exactly source and package semantics | TC-132 | Pass semantic-origin check |
| FR-019-CON-1 | Prohibited | Adapter invents role, default, identity, or constraint | TC-132 | Fail IR construction |
| FR-019-CON-2 | Allowed | Known source and IR contract versions | TC-133 | Continue to target validation |
| FR-019-CON-2 | Prohibited | Unknown source or IR version | TC-133 | Diagnostic and zero target output |
| FR-020-CON-1 | Allowed | Target identifier changes while stable identity stays fixed | TC-138 | Non-semantic or target-local change |
| FR-020-CON-1 | Prohibited | Generated identifier becomes semantic identity | TC-138 | Fail identity validation |
| FR-020-CON-2 | Allowed | Unsupported feature is rejected or declared lossy | TC-140, TC-162 | Explicit outcome |
| FR-020-CON-2 | Prohibited | Unsupported feature coerces silently | TC-140, TC-162 | Fail target conformance |
| NFR-008 | Allowed | Same lock and tools under different paths/locales | TC-177..180 | Byte-identical normalized output |
| NFR-008 | Prohibited | Network, host path, or ordering changes output | TC-177..180 | Fail reproducibility gate |
| NFR-010 | Allowed | Writes remain in a new regular-file output root | TC-185 | Pass sandbox check |
| NFR-010 | Prohibited | Traversal, symlink, template, or option escapes sandbox | TC-185, TC-187 | Reject with source-located diagnostic |

## State Transition Matrix

| Initial State | Event | Required State | Test Case |
|---|---|---|---|
| provisional | named evidence gate passes and decision is accepted | normative | TC-002, TC-003 |
| provisional | evidence gate has not passed | provisional | TC-003, TC-036 |
| normative | successor ADR is accepted | historical with one current successor | TC-004 |
| historical chain | a successor points to its predecessor | validation failure | TC-053 |
| blocked migration | all named gates pass and a human promotes it | eligible for later implementation | TC-028, TC-037 |
| pinned input | pre-sign-off refresh finds no contract-affecting drift | evidence remains current | TC-058, TC-075 |
| pinned input | pre-sign-off refresh finds contract-affecting drift | affected evidence invalid until refreshed | TC-058, TC-075 |
| suspected consumer | source evidence confirms consumer | known consumer with revised confidence | TC-087 |
| suspected consumer | evidence remains inconclusive | explicit unknown with consequence | TC-061, TC-087 |
| TypeSpec candidate | all P0 capabilities pass | recommended, still provisional | TC-119..122 |
| TypeSpec candidate | any P0 capability fails | no-go plus JSON Schema fallback | TC-121, TC-128 |
| provisional ADR-0004 | human accepts retained report | normative decision recorded in a separate reviewed change | TC-122, TC-129 |
| proposed JSON Schema v1 contract | named human holds source decision | specification remains provisional and unmerged | TC-130, TC-199 |
| proposed JSON Schema v1 contract | named human accepts source decision after composite review | contract becomes eligible for merge, not implementation | TC-130, TC-199 |
| unlocked package graph | successful deterministic resolution | immutable transitive lock | TC-141..142 |
| locked package graph | any identity/version/digest conflict | failed resolution with all loci | TC-142 |
| known extension capability | no-op dynamic/static processing | payload preserved according to profile | TC-144, TC-194 |
| unknown required capability | load or compile attempt | explicit unsupported diagnostic and no target output | TC-193 |
| current legacy manifest | legacy profile validation | accepted unchanged and advisory | TC-173 |
| legacy manifest | later human enforcement promotion | native v1 validation may become required in the later ticket | TC-173, TC-198 |

## Error Paths

| Error ID | Invalid Condition | Expected Result | Test Case |
|---|---|---|---|
| ERR-001 | Indexed artifact has no status or multiple statuses | Validation fails | TC-002, TC-040 |
| ERR-002 | Provisional artifact has no resolution gate | Validation fails | TC-003 |
| ERR-003 | Lossy transform omits declaration or provenance | Validation fails | TC-024 |
| ERR-004 | Known conflict omits a disposition | Review fails | TC-030, TC-041 |
| ERR-005 | Disruptive step omits a human promotion gate | Review fails | TC-028 |
| ERR-006 | TypeSpec feasibility fails without a fallback | Review fails | TC-026, TC-036 |
| ERR-007 | Transformation cannot satisfy its declared preservation level | Explicit non-authoritative outcome | TC-024, TC-051 |
| ERR-008 | Decision supersession graph contains a cycle | Validation fails | TC-053 |
| ERR-009 | Repository or corpus input has no immutable revision | Input is marked unpinned with consequence and reduced confidence | TC-055, TC-057 |
| ERR-010 | Contract record has no resolvable source or generated locus | Inventory validation fails | TC-060, TC-063 |
| ERR-011 | Contract property is blank where evidence is unknown | Inventory validation fails | TC-061 |
| ERR-012 | Repeated contracts are labeled fit without equivalence evidence | Parity validation fails | TC-066, TC-067 |
| ERR-013 | Contract-affecting drift appears after evidence collection | Ready disposition is withheld | TC-058, TC-075 |
| ERR-014 | Audit finding is implemented or published in the audit delivery | Read-only merge gate fails | TC-078..081 |
| ERR-015 | External collection is capped, paginated, rate-limited, or access-denied without an incomplete disposition | Snapshot validation fails | TC-057, TC-088 |
| ERR-016 | TypeSpec source is invalid or target construct unsupported | Nonzero source-located diagnostic and failed/partial capability | TC-102 |
| ERR-017 | Official and custom outputs disagree without a retained mapping disposition | Feasibility gate fails | TC-109..110, TC-115 |
| ERR-018 | Clean regeneration differs for unchanged inputs | Determinism capability fails | TC-113 |
| ERR-019 | Native package does not compile or fixture meaning differs | Consumer-surface capability fails | TC-114..116 |
| ERR-020 | Report marks a partial/failing P0 result as pass | Recommendation validation fails and fallback is selected | TC-119..121, TC-126 |
| ERR-021 | Spike attempts publication or canonical replacement | Isolation gate fails before merge | TC-123..124 |
| ERR-022 | Structural-source or semantic-IR version is unknown | Source-located diagnostic and zero target output | TC-133 |
| ERR-023 | Package graph has unresolved import, duplicate identity, cycle, version, or digest conflict | Resolution fails and lists every conflicting locus | TC-142 |
| ERR-024 | Manifest uses an unknown non-namespaced key | Manifest validation fails | TC-144 |
| ERR-025 | Mapping claims lossless behavior but omits a semantic identity | Qualification fails as undeclared loss | TC-149 |
| ERR-026 | Bidirectional mapping violates a get/put law | Lens qualification fails | TC-150 |
| ERR-027 | Target backend lacks an IR feature | Explicit unsupported/lossy result; never any/map/empty-model widening | TC-162, TC-183 |
| ERR-028 | Compatibility evidence is incomplete or a consumer is stale | Conditional/unknown result and promotion remains gated | TC-169 |
| ERR-029 | Legacy adapter, version, or identity is missing/contradictory | Explicit failure and zero-value success prohibited | TC-175 |
| ERR-030 | Locked generation attempts network access or filesystem escape | Sandbox terminates generation and records the offending locus | TC-178, TC-185..187 |
| ERR-031 | Required extension capability is unknown | Package load/compile fails before emission | TC-193 |

## Edge Cases

| ID | Description | Related Req | Test Case | Risk if Untested |
|---|---|---|---|---|
| EC-001 | One semantic concept appears in multiple data planes | FR-004 | TC-014 | Plane becomes mistaken for semantic identity |
| EC-002 | Static and dynamic consumers encounter an unknown extension | FR-004 | TC-016 | Silent incompatibility or closed-world failure |
| EC-003 | A transformation is intentionally lossy | FR-006 | TC-024 | Data loss is mistaken for round-trip fidelity |
| EC-004 | A corpus audit finds a high failure rate | FR-007 | TC-028 | Contract is weakened or migration is rushed |
| EC-005 | A current ADR supersedes an accepted predecessor | FR-001 | TC-004 | Readers follow stale normative guidance |
| EC-006 | Existing Avro consumers outlive the new schema source | FR-007 | TC-025 | Active integrations break during adoption |
| EC-007 | An artifact moves while preserving the same semantic definition | FR-004 | TC-050 | File identity is confused with semantic identity |
| EC-008 | A chain of superseded decisions accidentally points backward | FR-001 | TC-053 | Resolution loops or chooses stale guidance |
| EC-009 | A repository is locally dirty before the audit starts | FR-009 | TC-054, TC-057 | User work is mistaken for the pinned baseline |
| EC-010 | A generated contract has no checked-in source line | FR-010 | TC-060, TC-084 | Generated behavior becomes unverifiable |
| EC-011 | One concept exists in Avro, Rust, TypeScript, SQL, and extracted Markdown with different optionality | FR-011 | TC-065, TC-066 | A breaking mismatch is mistaken for parity |
| EC-012 | A payload consumer is suspected but cannot be confirmed | US-003, FR-010 | TC-061, TC-087 | Unknown compatibility risk silently disappears |
| EC-013 | Active feature work changes a contract after collection | FR-009, FR-013 | TC-058, TC-071, TC-075 | Stale evidence authorizes unsafe planning |
| EC-014 | Optional absence and explicit null collapse in one target | FR-014, FR-016 | TC-096, TC-105, TC-115 | Cross-language fixtures disagree silently |
| EC-015 | Recursive graph cannot be represented by an analytical table | FR-016 | TC-111 | Arrow is mistaken for semantic authority |
| EC-016 | Protobuf requires target-specific numbering and presence semantics | FR-015, FR-016 | TC-100..101, TC-110 | Wire concerns contaminate the semantic core |
| EC-017 | Custom emitter compensates for an absent official language emitter | FR-016, FR-018 | TC-106..108, TC-119..120 | Demo success hides long-term maintenance cost |
| EC-018 | Tool or package version drifts after the experiment | FR-014, NFR-006 | TC-089, TC-113 | Results cannot be reproduced or compared |
| EC-019 | Optional non-null, required nullable, and defaulted absence collapse in a target | FR-020, NFR-009 | TC-137, TC-181..183 | Consumers accept different value domains |
| EC-020 | Source or generated identifier changes while semantic identity does not | FR-020, FR-025 | TC-138, TC-166 | Compatible rename is misclassified breaking or vice versa |
| EC-021 | A recursive graph crosses a lossy flat profile | FR-022, FR-023 | TC-149, TC-157 | Omitted relations appear to round-trip |
| EC-022 | Removed Protobuf field is later reintroduced under a new meaning | FR-023, FR-025 | TC-155, TC-165 | Old bytes deserialize with corrupted semantics |
| EC-023 | Same schema shape changes authored authority or allowed loss | FR-022, FR-025 | TC-168 | Structural diff misses a semantic break |
| EC-024 | Dynamic consumer receives a module absent from static generated exports | FR-021, FR-026 | TC-145, TC-171..172 | Open ecosystem is accidentally closed or data silently discarded |
| EC-025 | Malicious schema name resolves outside output root through traversal or symlink | NFR-010 | TC-185, TC-187 | Generator overwrites user or repository data |
| EC-026 | Extension is optional to one backend but required to another | NFR-009, NFR-011 | TC-181, TC-193..194 | Cross-language success masks capability disagreement |

## Coverage Gaps

No open mapping gap remains for issues #8, #10, #4, or #9. The 41 issue #4 cases
pass through the isolated spike, retained evidence, native consumers, and
source-selection report. Issue #9 has 72 passing contract-conformance cases and
one intentional manual merge gate, TC-199. Production compiler, consumer,
database, publication, enforcement, and retirement work remains separately gated.

## Test Execution Summary

| Category | Total | Passed | Failed | Blocked | Coverage |
|---|---|---|---|---|---|
| Static | 96 | 96 | 0 | 0 | 100% mapped |
| Manual | 43 | 42 | 0 | 1 | 100% mapped |
| Analysis | 13 | 13 | 0 | 0 | 100% mapped |
| Property | 15 | 15 | 0 | 0 | 100% mapped |
| Unit | 22 | 22 | 0 | 0 | 100% mapped |
| Integration | 10 | 10 | 0 | 0 | 100% mapped |
| Fuzz | 2 | 2 | 0 | 0 | 100% mapped |
| Snapshot | 1 | 1 | 0 | 0 | 100% mapped |
| **Total** | **202** | **201** | **0** | **1** | **100% mapped** |

**Matrix coverage status: ✅ Complete. Execution status: 🚧 201 passed; TC-199 is the sole blocked human gate.**
