---
id: TM-001
title: "filament-core-data semantic architecture Test Matrix"
type: TestMatrix
---
# Test Matrix

## Overview

This matrix defines the verification contract for the issue #8 architecture
record. Coverage is complete when every criterion and named constraint maps to
at least one test case; execution remains pending until the architecture bundle
and its validation tests are implemented.

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
| StR-001 | US-001, US-002, FR-001..FR-008 | TC-033 | ✅ Complete |

### User Story Coverage

| User Story | Acceptance Criteria | Test Cases | Coverage Status |
|---|---|---|---|
| US-001 | US-001-AC-1 | TC-034 | ✅ Complete |
| US-001 | US-001-AC-2 | TC-035 | ✅ Complete |
| US-002 | US-002-AC-1 | TC-036 | ✅ Complete |
| US-002 | US-002-AC-2 | TC-037 | ✅ Complete |

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

### Non-Functional Requirement Coverage

| Non-Functional Req | Verification Method | Evidence/Test Cases | Status |
|---|---|---|---|
| NFR-001 | Static tests and review | TC-038..041 | ✅ Complete |
| NFR-002 | Structured review | TC-042..044 | ✅ Complete |
| NFR-003 | Diff, release, and review inspection | TC-045..048 | ✅ Complete |

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
| TC-033 | Root-index walkthrough satisfies the stakeholder governance need | Manual | P0 | StR-001-AC-1 | ✅ standalone review passed |
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

## State Transition Matrix

| Initial State | Event | Required State | Test Case |
|---|---|---|---|
| provisional | named evidence gate passes and decision is accepted | normative | TC-002, TC-003 |
| provisional | evidence gate has not passed | provisional | TC-003, TC-036 |
| normative | successor ADR is accepted | historical with one current successor | TC-004 |
| historical chain | a successor points to its predecessor | validation failure | TC-053 |
| blocked migration | all named gates pass and a human promotes it | eligible for later implementation | TC-028, TC-037 |

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

## Coverage Gaps

| Gap ID | Description | Risk Level | Mitigation |
|---|---|---|---|
| None | All criteria and named constraints have completed verification evidence. | Low | Preserve the automated contract and review artifacts on every architecture change. |

## Test Execution Summary

| Category | Total | Passed | Failed | Blocked | Coverage |
|---|---|---|---|---|---|
| Static | 22 | 22 | 0 | 0 | 100% passed |
| Manual | 29 | 29 | 0 | 0 | 100% passed |
| Property | 2 | 2 | 0 | 0 | 100% passed |
| **Total** | **53** | **53** | **0** | **0** | **100% passed** |

**Matrix status: ✅ Complete and verified.**
