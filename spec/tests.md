---
id: TM-001
title: "filament-core-data semantic architecture, census, feasibility, semantic-contract, and prototype-promotion Test Matrix"
type: TestMatrix
---
# Test Matrix

## Overview

This matrix defines the verification contract for the issue #8 architecture,
issue #10 read-only contract census, issue #4 TypeSpec feasibility gate, and
issue #9 semantic IR/package/projection specification, and the issue #34
semantic IR v1.1 revision. Coverage is complete when
every criterion, metric, and named constraint maps to at least one test case.
Issues #8, #10, and #4 have passed their implementation gates. Issue #9 is fully
mapped and its 72 automated, static, analysis, property, integration, fuzz, and
snapshot cases pass. The schema-source decision at TC-199 is recorded (owner,
issue #4, 2026-09-03: TypeSpec, ADR-0005); all later disruptive migration and
promotion gates remain separate. Issue #34 (TC-203..247) is fully mapped and its 45 cases pass (PR #38).
Issue #35 (TC-248..279) is fully mapped and its 32 cases pass (PR #39; TC-274 by inspection).
Issue #27 (promotion of the issue #4 prototype emitters into `src/`) is mapped at
TC-320..397. Three of its cases (TC-370, TC-373's full-replay half, and the
end-to-end retained-evidence run) depend on the host floor recorded in issue #42
and are marked blocked rather than passed. Issue #19 (the TypeSpec frontend and the versioned semantic IR
compiler core) is mapped at TC-398..619. Ids TC-280..319, FR-035..039,
NFR-015..016 and US-008 are left to the parallel issue #20 conformance-corpus and
oracle branch, which allocated them first; issues #27 and #19 neither read nor
edit that corpus. The Static and Snapshot counts in the Test Execution Summary were off by
one each before the issue #27 revision (110/6 recorded against 111/5 actual) and
are now computed from the rows by `scripts/test-matrix-summary.mjs`, which
`make lint` runs in `--check` mode. The summary's `Blocked` column counts every
row whose status is not `✅`, so an in-progress `🚧` row appears there until it
passes.

## Test Matrix Rules

1. Every acceptance criterion and named constraint has at least one test case.
2. Authority, status, projection, and gate options are tested in their valid combinations.
3. Qualitative constraints are tested at their allowed and prohibited boundaries.
4. Missing status, ownership, provenance, disposition, and gate paths fail validation.
5. Provisional, normative, superseded, and historical state transitions are tested.
6. Cross-plane concepts, lossy transformations, high corpus failure, and stale decisions are covered as edge cases.

## Requirements Traceability

### Stakeholder Requirement Coverage

| Stakeholder Req | Trace to US/FR | Test/Validation | Coverage Status |
|---|---|---|---|
| StR-001 | US-001..US-007, US-009, US-010, FR-001..FR-034, FR-040..FR-053 | TC-033, TC-086, TC-129, TC-130..279, TC-320..397, TC-398..619 | ⚠️ TC-370, TC-382 blocked on issue #42 |

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
| US-006 | US-006-EX-1..4 (illustrative) implemented by FR-027..FR-030 | TC-203, TC-210, TC-214, TC-220 | ✅ Complete |
| US-007 | US-007-EX-1..4 (illustrative) implemented by FR-031..FR-034 | TC-262, TC-271, TC-258, TC-277 | ✅ Complete |
| US-009 | US-009-EX-1 (illustrative) implemented by FR-041 | TC-337, TC-343, TC-344 | ✅ Complete |
| US-009 | US-009-EX-2 (illustrative) implemented by FR-040 | TC-320, TC-326, TC-358 | ✅ Complete |
| US-009 | US-009-EX-3 (illustrative) implemented by FR-044 | TC-371, TC-378, TC-370 (blocked on issue #42) | ✅ Complete |
| US-009 | US-009-EX-4 (illustrative) implemented by NFR-018 | TC-390, TC-395, TC-396 | ✅ Complete |
| US-010 | US-010-EX-1 (illustrative) implemented by FR-052 and NFR-019 | TC-548, TC-567, TC-568 | ✅ Complete |
| US-010 | US-010-EX-2 (illustrative) implemented by FR-047 and FR-049 | TC-463, TC-500, TC-549 | ✅ Complete |
| US-010 | US-010-EX-3 (illustrative) implemented by FR-046-CON-1 and NFR-021 | TC-446, TC-451, TC-592 | ✅ Complete |
| US-010 | US-010-EX-4 (illustrative) implemented by FR-045 | TC-400, TC-402, TC-408 | ✅ Complete |
| US-010 | US-010-EX-5 (illustrative) implemented by FR-051 | TC-527, TC-528, TC-529 | ✅ Complete |

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
| FR-020 | FR-020-AC-1..8, FR-020-CON-1..2 | TC-135..140, TC-232..233 | ✅ Complete |
| FR-021 | FR-021-AC-1..7 | TC-141..146, TC-201 | ✅ Complete |
| FR-022 | FR-022-AC-1..6 | TC-147..152 | ✅ Complete |
| FR-023 | FR-023-AC-1..6 | TC-153..158 | ✅ Complete |
| FR-024 | FR-024-AC-1..7 | TC-159..164, TC-200 | ✅ Complete |
| FR-025 | FR-025-AC-1..6 | TC-165..170 | ✅ Complete |
| FR-026 | FR-026-AC-1..6 | TC-171..176 | ✅ Complete |
| FR-027 | FR-027-AC-1..9, FR-027-CON-1..2 | TC-203..209, TC-237..238 | ✅ Complete |
| FR-028 | FR-028-AC-1..13, FR-028-CON-1..2 | TC-210..218, TC-239..243 | ✅ Complete |
| FR-029 | FR-029-AC-1..8, FR-029-CON-1..2 | TC-219..226, TC-244..245 | ✅ Complete |
| FR-030 | FR-030-AC-1..6, FR-030-CON-1..2 | TC-227..231, TC-246 | ✅ Complete |
| FR-031 | FR-031-AC-1..7, FR-031-CON-1..2 | TC-248..254, TC-277 | ✅ Complete |
| FR-032 | FR-032-AC-1..5, FR-032-CON-1 | TC-255..260 | ✅ Complete |
| FR-033 | FR-033-AC-1..5, FR-033-CON-1..2 | TC-261..266 | ✅ Complete |
| FR-034 | FR-034-AC-1..5, FR-034-CON-1 | TC-267..272, TC-279 | ✅ Complete |
| FR-040 | FR-040-AC-1..7, FR-040-CON-1..4 | TC-320..330 | ✅ Complete |
| FR-041 | FR-041-AC-1..13, FR-041-CON-1..5 | TC-331..348 | ✅ Complete |
| FR-042 | FR-042-AC-1..11, FR-042-CON-1..5 | TC-349..360 | ✅ Complete |
| FR-043 | FR-043-AC-1..8, FR-043-CON-1..3 | TC-361..369 | ✅ Complete |
| FR-044 | FR-044-AC-1..12, FR-044-CON-1..5 | TC-370..382, TC-397 | ⚠️ TC-370, TC-382 blocked on issue #42 |
| FR-045 | FR-045-AC-1..10, FR-045-CON-1..4 | TC-398..TC-411, TC-601 | ✅ Complete |
| FR-046 | FR-046-AC-1..19, FR-046-CON-1..5 | TC-432..TC-455, TC-598, TC-599, TC-603, TC-614 | ✅ Complete |
| FR-047 | FR-047-AC-1..16, FR-047-CON-1..5 | TC-456..TC-476, TC-610, TC-615, TC-616, TC-618 | ✅ Complete |
| FR-048 | FR-048-AC-1..11, FR-048-CON-1..4 | TC-477..TC-491, TC-613 | ✅ Complete |
| FR-049 | FR-049-AC-1..14, FR-049-CON-1..4 | TC-492..TC-509, TC-605, TC-608, TC-609 | ✅ Complete |
| FR-050 | FR-050-AC-1..13, FR-050-CON-1..4 | TC-510..TC-526, TC-600, TC-611, TC-617 | ✅ Complete |
| FR-051 | FR-051-AC-1..15, FR-051-CON-1..5 | TC-527..TC-546, TC-602, TC-612, TC-619 | ✅ Complete |
| FR-052 | FR-052-AC-1..16, FR-052-CON-1..4 | TC-547..TC-566 | ✅ Complete |
| FR-053 | FR-053-AC-1..15, FR-053-CON-1..5 | TC-412..TC-431, TC-604 | ✅ Complete |

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
| NFR-012 | Diff, unchanged-suite, registry, downstream-gate, and human-decision checks | TC-195..199 | ✅ Complete |
| NFR-013 | Unchanged v1 fixture suite, spike byte comparison, compatibility-corpus entry, changed-path gate, and fixture inventory | TC-208, TC-234..236, TC-247 | ✅ Complete |
| NFR-014 | Compiled-program inventory, amendment inspection, changed-path gate, emitter inspection, spike byte comparison | TC-249, TC-273..276, TC-278 | ✅ Complete |
| NFR-017 | Repeat-run byte comparison, collator-independence check, explicit-baseDir check, lockfile seeding, retained-evidence branch diff, dependency-pin inspection | TC-383..389 | ✅ Complete |
| NFR-018 | Changed-path gate, manifest and packed-file comparison, licence inspection, restore rehearsal, publication inspection | TC-390..396 | ✅ Complete |
| NFR-019 | Repeat-run and varied-environment byte comparison, ambient-input analysis, permutation and collator independence, injected-host observation, changed-path gate, dependency-pin inspection | TC-567..TC-578 | ✅ Complete |
| NFR-020 | Limit enforcement, path-escape and module-load refusal, network and writer instrumentation, cyclic-input termination, fuzz run, message truncation | TC-579..TC-589, TC-606, TC-607 | ✅ Complete |
| NFR-021 | Changed-path gate, manifest comparison, frozen-path byte comparison, scripted restore rehearsal, licence and publication inspection | TC-590..TC-597 | ✅ Complete |

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
| TC-026 | TypeSpec gate includes explicit pass criteria cited by ADR-0005 | Static | P0 | FR-007-AC-2 | ✅ automated contract passed |
| TC-027 | Corpus-review method accounts for the complete declared scope | Manual | P0 | FR-007-AC-3 | ✅ architecture review passed |
| TC-028 | Roadmap defines cutover gates and pauses on high failure | Manual | P0 | FR-007-AC-4, FR-007-CON-2 | ✅ architecture review passed |
| TC-029 | Required ADR inventory and statuses are complete | Static | P0 | FR-008-AC-1 | ✅ automated contract passed |
| TC-030 | Every known Quire conflict has a disposition | Manual | P0 | FR-008-AC-2 | ✅ architecture review passed |
| TC-031 | ADRs keep rendering and generation outside Quire core | Static | P0 | FR-008-AC-3 | ✅ automated contract passed |
| TC-032 | TypeSpec ADR links its resolution ticket and superseding ADR | Static | P0 | FR-008-AC-4 | ✅ automated contract passed |
| TC-033 | Root-index walkthrough satisfies the stakeholder governance need | Manual | P0 | StR-001-VC-1 | ✅ standalone review passed |
| TC-034 | Authored requirement resolves to Markdown authority | Manual | P0 | US-001-AC-1 | ✅ standalone review passed |
| TC-035 | Verification run resolves to runtime authority and report projection | Manual | P0 | US-001-AC-2 | ✅ standalone review passed |
| TC-036 | Undecided TypeSpec gate resolves to provisional plus resolution ticket | Manual | P0 | US-002-AC-1 | ✅ standalone review passed |
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
| TC-121 | Owner decision is recorded in a normative ADR that supersedes the conditional ADR and names TypeSpec | Static | P0 | FR-018-AC-3, NFR-007 | ✅ passed — ADR-0005, `test/semantic-architecture.test.ts` |
| TC-122 | The spike cannot self-promote or self-reject an ADR; the owner decides | Manual | P0 | FR-018-AC-4 | ✅ passed — issue #4 owner decision (2026-09-03) |
| TC-123 | Spike changes only isolated experiment, spec, plan, review, dependency, and test paths | Static | P0 | NFR-006 | ✅ passed — retained spike evidence |
| TC-124 | Spike publishes nothing and replaces no current schema, generated binding, or consumer | Static | P0 | NFR-006 | ✅ passed — retained spike evidence |
| TC-125 | Evidence schema rejects missing methods, versions, results, limits, consequences, rationales, or confidence | Static | P0 | NFR-007 | ✅ passed — retained spike evidence |
| TC-126 | Adverse evidence remains failed or partial and requirements remain unchanged | Manual | P0 | NFR-007 | ✅ passed — retained spike evidence |
| TC-127 | Reviewer runs one command and observes equivalent native consumer construction | Manual | P0 | US-004-AC-1 | ✅ passed — retained spike evidence |
| TC-128 | Toolchain-defect partial is retained with its workaround, tracked as a defect, and leaves Avro/consumers unchanged | Manual | P0 | US-004-AC-2 | ✅ passed — capability `json-schema-2020-12`, issue #31 |
| TC-129 | Root-index walkthrough resolves the evidence, recommendation, and recorded owner decision | Manual | P0 | StR-001-VC-1 | ✅ passed — retained spike evidence, ADR-0005 |
| TC-130 | V1 contract names TypeSpec as the structural source per ADR-0005 | Static | P0 | FR-019-AC-1 | ✅ passed — semantic contract v1 |
| TC-131 | Source, IR, package, mapping, profile, and lock identities and versions remain distinct | Static | P0 | FR-019-AC-2 | ✅ passed — semantic contract v1 |
| TC-132 | Every semantic IR node retains stable identity and source or generated origin | Unit | P0 | FR-019-AC-3, FR-019-CON-1 | ✅ passed — semantic contract v1 |
| TC-133 | Unknown source or IR contract version emits diagnostics and zero target artifacts | Unit | P0 | FR-019-AC-4, FR-019-CON-2 | ✅ passed — semantic contract v1 |
| TC-134 | V1 contract changes no current Avro authority | Static | P0 | FR-019-AC-5 | ✅ passed — semantic contract v1 |
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
| TC-199 | Owner records the v1 structural-source decision before merge | Manual | P0 | NFR-012-AC-1 | ✅ passed — owner decision on issue #4 (2026-09-03): TypeSpec, ADR-0005 |
| TC-200 | Independent adapters and backends share stable diagnostic codes and causal envelopes | Unit | P0 | FR-024-AC-7 | ✅ passed — semantic contract v1 |
| TC-201 | Fingerprints ignore excluded ordering but change for every included semantic-byte change | Property | P0 | FR-021-AC-7 | ✅ passed — semantic contract v1 |
| TC-202 | Oversized and cyclic hostile inputs terminate at declared resource limits | Fuzz | P0 | NFR-010 | ✅ passed — semantic contract v1 |
| TC-203 | A `0..1` field validates, derives `presence: optional`, and re-serializes byte-identically | Property | P0 | FR-027-AC-1, FR-020-AC-7, US-006-EX-1 | ✅ passed — semantic IR v1.1 (PR #38) |
| TC-204 | A `1..*` field preserves `ordered` and `unique` flags | Unit | P0 | FR-027-AC-2 | ✅ passed — semantic IR v1.1 (PR #38) |
| TC-205 | Stated `presence` contradicting multiplicity fails at the field locus | Unit | P0 | FR-027-AC-3 | ✅ passed — semantic IR v1.1 (PR #38) |
| TC-206 | `upper < lower` and `lower < 0` fail at the field locus; `0..0` validates | Unit | P0 | FR-027-AC-4 | ✅ passed — semantic IR v1.1 (PR #38) |
| TC-207 | `unit` validates on a scalar field and fails on a record field | Unit | P0 | FR-027-AC-5, FR-027-CON-2 | ✅ passed — semantic IR v1.1 (PR #38) |
| TC-208 | Every v1 positive fixture validates unchanged under v1.1 with multiplicity derived from presence | Integration | P0 | FR-027-AC-6, FR-027-CON-1, NFR-013-AC-1 | ✅ passed — semantic IR v1.1 (PR #38) |
| TC-209 | FR-006 `ConfigVersion` fields express as v1.1 fields with zero declared loss | Analysis | P0 | FR-027-AC-7 | ✅ passed — semantic IR v1.1 (PR #38) |
| TC-210 | A `belongs_to` structural relationship validates and round-trips byte-identically | Property | P0 | FR-028-AC-1, FR-020-AC-7, US-006-EX-2 | ✅ passed — semantic IR v1.1 (PR #38) |
| TC-211 | An unknown relationship `category` fails at the relationship locus | Unit | P0 | FR-028-AC-2 | ✅ passed — semantic IR v1.1 (PR #38) |
| TC-212 | An operation with params, bounded return, and present pre/post clauses validates | Unit | P0 | FR-028-AC-3 | ✅ passed — semantic IR v1.1 (PR #38) |
| TC-213 | An operation whose `post[]` names an absent clause fails at the operation locus | Unit | P0 | FR-028-AC-4 | ✅ passed — semantic IR v1.1 (PR #38) |
| TC-214 | An `ocl` clause with `text` and `sourceSpan` validates and the schema declares no parsed-content property | Static | P0 | FR-028-AC-5, FR-028-CON-2, US-006-EX-3 | ✅ passed — semantic IR v1.1 (PR #38) |
| TC-215 | A namespaced clause language validates and a bare unknown language fails | Unit | P0 | FR-028-AC-6 | ✅ passed — semantic IR v1.1 (PR #38) |
| TC-216 | `relationships[]` or `operations[]` on a non-record type definition fails | Unit | P0 | FR-028-AC-7 | ✅ passed — semantic IR v1.1 (PR #38) |
| TC-217 | Absent `relationships[]`, `operations[]`, and `clauses[]` read as empty on a v1 document | Unit | P0 | FR-028-CON-1 | ✅ passed — semantic IR v1.1 (PR #38) |
| TC-218 | FR-006 `overlay` relationship and an `ocl` invariant express with zero declared loss | Analysis | P0 | FR-028-AC-8 | ✅ passed — semantic IR v1.1 (PR #38) |
| TC-219 | Every closed constraint keyword has a positive fixture whose operands validate | Unit | P0 | FR-029-AC-1 | ✅ passed — semantic IR v1.1 (PR #38) |
| TC-220 | Keyword `mnimum` fails at the constraint locus | Unit | P0 | FR-029-AC-2, US-006-EX-4 | ✅ passed — semantic IR v1.1 (PR #38) |
| TC-221 | A `min` constraint with a string operand fails | Unit | P0 | FR-029-AC-3 | ✅ passed — semantic IR v1.1 (PR #38) |
| TC-222 | A `pattern` constraint without `dialect` fails | Unit | P0 | FR-029-AC-4 | ✅ passed — semantic IR v1.1 (PR #38) |
| TC-223 | The v1.1 schema has no `keyword: string` path and no untyped `operands` path | Static | P0 | FR-029-AC-5 | ✅ passed — semantic IR v1.1 (PR #38) |
| TC-224 | Every v1 fixture constraint uses a closed keyword, or its correction is recorded | Static | P0 | FR-029-CON-1 | ✅ passed — semantic IR v1.1 (PR #38) |
| TC-225 | Keyword addition classifies additive; removal or retyping classifies breaking | Unit | P0 | FR-029-CON-2 | ✅ passed — semantic IR v1.1 (PR #38) |
| TC-226 | FR-006 `versionNumber` `min: 1` expresses as a typed constraint | Analysis | P1 | FR-029-AC-6 | ✅ passed — semantic IR v1.1 (PR #38) |
| TC-227 | A `1.1.0` document with `source.dialect: typespec` validates, and one with `spec-bundle` validates | Unit | P0 | FR-030-AC-1 | ✅ passed — semantic IR v1.1 (PR #38) |
| TC-228 | The JSON Schema `$schema` URI as `source.dialect` fails with a diagnostic citing ADR-0005 | Unit | P0 | FR-030-AC-2 | ✅ passed — semantic IR v1.1 (PR #38) |
| TC-229 | Manifest targets `rust`/`markdown` validate; target `go` fails at its entry | Unit | P0 | FR-030-AC-3 | ✅ passed — semantic IR v1.1 (PR #38) |
| TC-230 | Manifest, target-contract, and representation schemas reference the shared common enumerations | Static | P0 | FR-030-AC-4, FR-030-CON-2 | ✅ passed — semantic IR v1.1 (PR #38) |
| TC-231 | The v1 `contractVersion: "1.0.0"` IR fixture remains valid under the v1 schema | Integration | P0 | FR-030-CON-1 | ✅ passed — semantic IR v1.1 (PR #38) |
| TC-232 | The TypeScript Ajv reader and the Python `jsonschema` reader (`tests/`) agree on every v1.1 golden and negative fixture | Integration | P0 | FR-020-AC-8 | ✅ passed — semantic IR v1.1 (PR #38) |
| TC-233 | Generated v1.1 documents with all five new node kinds round-trip the normalized serialization byte-identically | Property | P0 | FR-020-AC-7 | ✅ passed — semantic IR v1.1 (PR #38) |
| TC-234 | `spike:typespec:check` output is byte-identical before and after the revision | Snapshot | P0 | NFR-013-AC-2 | ✅ passed — semantic IR v1.1 (PR #38) |
| TC-235 | The compatibility corpus records v1 → v1.1 as `additive` with the added node list | Static | P0 | NFR-013-AC-3 | ✅ passed — semantic IR v1.1 (PR #38) |
| TC-236 | Issue #34 changed-path gate excludes `spikes/`, backends, and corpus repositories | Static | P0 | NFR-013-AC-4 | ✅ passed — semantic IR v1.1 (PR #38) |
| TC-237 | `ordered: true` or `unique: true` on a `1..1` field fails at the field locus | Unit | P0 | FR-027-AC-8 | ✅ passed — semantic IR v1.1 (PR #38) |
| TC-238 | Multiplicity narrowing classifies breaking; widening classifies additive | Unit | P0 | FR-027-AC-9 | ✅ passed — semantic IR v1.1 (PR #38) |
| TC-239 | A relationship `target` resolving to no type definition or lock export fails at the relationship locus | Unit | P0 | FR-028-AC-9 | ✅ passed — semantic IR v1.1 (PR #38) |
| TC-240 | A composite cycle or composite self-reference fails at the closing relationship; a non-composite self-reference validates | Unit | P0 | FR-028-AC-10 | ✅ passed — semantic IR v1.1 (PR #38) |
| TC-241 | Two clauses sharing a `clauseId` in one type definition fail validation | Unit | P0 | FR-028-AC-11 | ✅ passed — semantic IR v1.1 (PR #38) |
| TC-242 | The IR `category` enumeration equals the quire-rs FR-040 `EdgeCategory` registry | Integration | P0 | FR-028-AC-12 | ✅ passed — semantic IR v1.1 (PR #38) |
| TC-243 | Added relationship/operation/clause classifies additive; removed or retargeted classifies breaking | Unit | P0 | FR-028-AC-13 | ✅ passed — semantic IR v1.1 (PR #38) |
| TC-244 | `minLength` applied to an `integer` scalar fails at the constraint locus | Unit | P0 | FR-029-AC-7 | ✅ passed — semantic IR v1.1 (PR #38) |
| TC-245 | A `pattern` whose `regex` does not compile under `ecma-262` fails validation | Unit | P0 | FR-029-AC-8 | ✅ passed — semantic IR v1.1 (PR #38) |
| TC-246 | `contractVersion: "1.2.0"` fails before emission; `1.1.0` with `source.dialect: avro` fails at `source.dialect` | Unit | P0 | FR-030-AC-5, FR-030-AC-6 | ✅ passed — semantic IR v1.1 (PR #38) |
| TC-247 | Every new IR node kind has one golden and one negative fixture under `fixtures/semantic/v1/` | Static | P0 | NFR-013-AC-5 | ✅ passed — semantic IR v1.1 (PR #38) |
| TC-248 | `tsp compile packages/semantic-core` exits 0 with zero diagnostics under the pinned compiler | Compile | P0 | FR-031-AC-1 | ✅ passed — semantic-core grammar (PR #39) |
| TC-249 | The compiled program's declaration set equals `inventory.json`; adding `Entity` or `Any` to the source makes the scope test fail naming the declaration | Unit | P0 | FR-031-AC-2, NFR-014-AC-1 | ✅ passed — semantic-core grammar (PR #39) |
| TC-250 | `ConstraintKeyword` and the eleven constraint models match the FR-029 keyword set and operand shapes; the emitted schema rejects a twelfth | Unit | P0 | FR-031-AC-3 | ✅ passed — semantic-core grammar (PR #39) |
| TC-251 | `EdgeCategory`, `ConstraintKeyword`, and `ClauseLanguage` equal the IR schema enumerations in a contract test | Unit | P0 | FR-031-AC-4 | ✅ passed — semantic-core grammar (PR #39) |
| TC-252 | No property in the compiled program resolves to `unknown` or an untyped record except `DefaultDecl.value` | Static | P0 | FR-031-AC-5, FR-031-CON-2 | ✅ passed — semantic-core grammar (PR #39) |
| TC-253 | Adding one model at a new minor version changes only its emitted file and the bundle index; every prior file is byte-identical | Snapshot | P0 | FR-031-AC-6 | ✅ passed — semantic-core grammar (PR #39) |
| TC-254 | The grammar lives under `packages/semantic-core/` (every shipped path resolves inside it), is compiled by the root-installed toolchain, is published rather than `private`, and no `spikes/` file imports it | Static | P0 | FR-031-CON-1 | ✅ passed — semantic-core grammar (PR #39); assertion corrected for the npm.ix publish (#40) |
| TC-255 | `kernel-scalars.json` has exactly one entry per `KernelScalar` member and none names `any` | Static | P0 | FR-032-AC-1 | ✅ passed — semantic-core grammar (PR #39) |
| TC-256 | The semantic-core reader rejects `Decimal` without `decimal` and `String` with `decimal` | Unit | P0 | FR-032-AC-2 | ✅ passed — semantic-core grammar (PR #39) |
| TC-257 | Every entry's `irScalar` is in the IR v1 scalar enumeration, except `JsonObject` → open record | Static | P0 | FR-032-AC-3 | ✅ passed — semantic-core grammar (PR #39) |
| TC-258 | A tenth enum member `Any` added to the source fails the inventory test | Unit | P0 | FR-032-AC-4, US-007-EX-3 | ✅ passed — semantic-core grammar (PR #39) |
| TC-259 | Every `type.target` in the committed FR-006 `FieldDecl[]` fixture is `UUID`, `Integer`, `String`, `Timestamp`, `JsonObject`, or a `SemanticId` | Unit | P1 | FR-032-AC-5 | ✅ passed — semantic-core grammar (PR #39) |
| TC-260 | A `KernelScalar` addition classifies additive; removal or re-representation classifies breaking, keyed on member name | Unit | P0 | FR-032-CON-1 | ✅ passed — semantic-core grammar (PR #39) |
| TC-261 | One schema file exists per inventory model and enum with an absolute `$id` under the package base | Static | P0 | FR-033-AC-1 | ✅ passed — semantic-core grammar (PR #39) |
| TC-262 | Every element of the FR-006 `FieldDecl[]` fixture validates against `FieldDecl.json` under Ajv strict mode with no alias | Unit | P0 | FR-033-AC-2, US-007-EX-1 | ✅ passed — semantic-core grammar (PR #39) |
| TC-263 | Each negative shape fixture fails against its named model schema; at least one exists per grammar model | Unit | P0 | FR-033-AC-3 | ✅ passed — semantic-core grammar (PR #39) |
| TC-264 | Regenerating twice yields byte-identical output equal to the recorded digest; a mutated byte makes the `check` script fail naming the file | Snapshot | P0 | FR-033-AC-4, FR-033-CON-1 | ✅ passed — semantic-core grammar (PR #39) |
| TC-265 | `toolchain.json` pins compiler, emitter, and normalization versions equal to the lockfile's resolved versions | Static | P0 | FR-033-AC-5 | ✅ passed — semantic-core grammar (PR #39) |
| TC-266 | The normalization step is isolated (one function, one call site) and records a no-op when no relative `$id` is emitted | Analysis | P1 | FR-033-CON-2 | ✅ passed — semantic-core grammar (PR #39) |
| TC-267 | `lowering.json` has one row per grammar-model property, every `loss` is `none`, and a `loss` row fails the gate | Unit | P0 | FR-034-AC-1, FR-034-CON-1 | ✅ passed — semantic-core grammar (PR #39) |
| TC-268 | Reference lowerer mints identities, origins, kernel definitions, alias-per-constrained-field, and clause text per the FR-034 rules on the FR-006 set | Unit | P0 | FR-034-AC-2 | ✅ passed — semantic-core grammar (PR #39) |
| TC-269 | The lowered FR-006 document equals `config-version-v1-1.json` in the structural comparison ignoring minted identities and semantic-core extensions | Unit | P0 | FR-034-AC-3 | ✅ passed — semantic-core grammar (PR #39) |
| TC-270 | `UnitSymbol` rejects ``, `k g`, `kg²` and accepts `kg`, `m/s`, `ms`, `10*3.m` | Unit | P0 | FR-034-AC-4 | ✅ passed — semantic-core grammar (PR #39) |
| TC-271 | A `Decimal` field lowers with the `decimal` extension carrying `precision` and `scale`; the table records no loss for `TypeRef.decimal` | Unit | P0 | FR-034-AC-5, US-007-EX-2 | ✅ passed — semantic-core grammar (PR #39) |
| TC-272 | A lowering row recording `loss` fails the fixture gate | Unit | P0 | FR-034-AC-1 | ✅ passed — semantic-core grammar (PR #39) |
| TC-273 | The compiled program declares nothing outside `inventory.json` (kernel scope) | Unit | P0 | NFR-014-AC-1 | ✅ passed — semantic-core grammar (PR #39) |
| TC-274 | ARCH-005 and ADR-0002 each gain exactly one amendment paragraph naming the grammar and the module-vocabulary rule | Manual | P0 | NFR-014-AC-2 | ✅ passed — semantic-core grammar (PR #39) |
| TC-275 | Issue #35 changed-path gate excludes `spikes/`, `src/`, `pnpm-lock.yaml`, and corpus repositories | Static | P0 | NFR-014-AC-3 | ✅ passed — semantic-core grammar (PR #39) |
| TC-276 | `tspconfig.yaml` lists only official `@typespec/*` emitters and no custom emitter dependency exists | Static | P0 | NFR-014-AC-4 | ✅ passed — semantic-core grammar (PR #39) |
| TC-277 | Each reader-enforced grammar rule (bounds, flags, decimal presence, unit applicability, returns.unit, uniqueness keys, identity flag) has a negative fixture rejected at its locus; the FR-006 set reads clean | Unit | P0 | FR-031-AC-7, US-007-EX-4 | ✅ passed — semantic-core grammar (PR #39) |
| TC-278 | `spike:typespec:check` output is byte-identical before and after the semantic-core change | Snapshot | P0 | NFR-014-AC-5 | ✅ passed — semantic-core grammar (PR #39) |
| TC-279 | The lowered FR-006 document validates as `1.1.0` and both IR readers return zero diagnostics when the lowerer runs from the committed `FieldDecl[]` fixture | Integration | P0 | FR-034-AC-2 | ✅ passed — semantic-core grammar (PR #39) |
| TC-320 | Inventory holds exactly the fourteen enumerated components with sources | Static | P0 | FR-040-AC-1 | ✅ passed |
| TC-321 | A missing or extra component name fails the inventory test | Unit | P0 | FR-040-AC-1 | ✅ passed |
| TC-322 | Every disposition is inside the closed four-value set | Static | P0 | FR-040-AC-2 | ✅ passed |
| TC-323 | A mutated fifth disposition value is rejected | Unit | P0 | FR-040-AC-2, FR-040-CON-2 | ✅ passed |
| TC-324 | Retain and rewrite targets exist; replace and discard targets are empty | Static | P0 | FR-040-AC-3 | ✅ passed |
| TC-325 | Every inventory record carries a non-empty limitation | Static | P0 | FR-040-AC-4 | ✅ passed |
| TC-326 | A record justified only by the representative golden is rejected | Unit | P0 | FR-040-AC-4 | ✅ passed |
| TC-327 | Every `src/compiler/` file is a target or a reasoned authored entry | Static | P0 | FR-040-AC-5, FR-040-CON-3 | ✅ passed |
| TC-328 | Feasibility-doc promotion-inventory counts equal the inventory | Static | P1 | FR-040-AC-6 | ✅ passed |
| TC-329 | A partial capability's limitation is restated; dropping it fails | Unit | P0 | FR-040-AC-7, FR-040-CON-1 | ✅ passed |
| TC-330 | A promoted component moved into `authored` is rejected | Unit | P1 | FR-040-CON-4 | ✅ passed |
| TC-331 | The narrow build interface exports exactly six symbols | Static | P0 | FR-041-AC-1 | ✅ passed |
| TC-332 | A seventh export fails the export-set assertion | Unit | P0 | FR-041-AC-1 | ✅ passed |
| TC-333 | `buildSemanticIr` reproduces the committed semantic IR byte-for-byte | Snapshot | P0 | FR-041-AC-2 | ✅ passed |
| TC-334 | An unresolved reference rejects with its locus and writes no output | Unit | P0 | FR-041-AC-3 | ✅ passed |
| TC-335 | Two compiler CLI runs over one entrypoint are byte-identical | Property | P0 | FR-041-AC-4 | ✅ passed |
| TC-336 | `tsp --emit` by absolute path with `--option` equals `compileSemanticIr` | Integration | P0 | FR-041-AC-5 | ✅ passed |
| TC-337 | Neither `src/compiler/` nor anything else imports a module under `spikes/` | Static | P0 | FR-041-AC-6 | ✅ passed |
| TC-338 | Emitted IR keeps the 1.0.0 envelope and the caller's generator | Unit | P0 | FR-041-AC-7, FR-041-CON-1 | ✅ passed |
| TC-339 | Omitting the generator stamps the emitter package `name@version` | Unit | P0 | FR-041-AC-8 | ✅ passed |
| TC-340 | Non-`AgentIx.Semantic` types are absent; locationless types are `synthetic` | Unit | P0 | FR-041-AC-9 | ✅ passed |
| TC-341 | Two `baseDir` values relativise loci as `<path>:<line>` | Unit | P0 | FR-041-AC-10 | ✅ passed |
| TC-342 | Emitted order matches under two `Intl.Collator` locales | Property | P0 | FR-041-AC-11 | ✅ passed |
| TC-343 | `make lint` formats and typechecks `src/compiler/` | Static | P0 | FR-041-AC-12 | ✅ passed |
| TC-344 | A deliberate declaration mismatch fails `tsc --noEmit` | Compile | P0 | FR-041-AC-12 | ✅ passed |
| TC-345 | Added manifests declare AGPL-3.0-only and no dependency is added | Static | P0 | FR-041-AC-13, FR-041-CON-5 | ✅ passed |
| TC-346 | The compiler imports only pinned `@typespec/*` packages | Static | P0 | FR-041-CON-3 | ✅ passed |
| TC-347 | `@typespec/*` stay devDependencies and no runtime entry point is added | Static | P0 | FR-041-CON-4 | ✅ passed |
| TC-348 | The promoted IR is never validated against the v1 IR schema | Static | P1 | FR-041-CON-2 | ✅ passed |
| TC-349 | `emitTypeScript` reproduces the committed TypeScript golden | Snapshot | P0 | FR-042-AC-1 | ✅ passed |
| TC-350 | `emitRust` reproduces the committed Rust golden | Snapshot | P0 | FR-042-AC-2 | ✅ passed |
| TC-351 | Repeated backend calls on one IR return identical strings | Property | P0 | FR-042-AC-3 | ✅ passed |
| TC-352 | Neither backend touches the filesystem, environment, clock, or network | Unit | P0 | FR-042-AC-4, FR-042-CON-2 | ✅ passed |
| TC-353 | Each backend throws naming a base model absent from the IR | Unit | P0 | FR-042-AC-5 | ✅ passed |
| TC-354 | `emitRust` throws naming a base-chain cycle instead of recursing | Unit | P0 | FR-042-AC-6 | ✅ passed |
| TC-355 | A non-snake_case field receives a `#[serde(rename)]` attribute | Unit | P1 | FR-042-AC-7 | ✅ passed |
| TC-356 | An enum renders as a union of its member values as string literals | Unit | P1 | FR-042-AC-8 | ✅ passed |
| TC-357 | An optional field renders `Option<…>` in Rust and `?` in TypeScript | Unit | P1 | FR-042-AC-9 | ✅ passed |
| TC-358 | Inventory records both backends as representative-slice-only | Static | P0 | FR-042-AC-10, FR-042-CON-1, FR-042-CON-3 | ✅ passed |
| TC-359 | The three committed generated goldens are unchanged from `origin/main` | Static | P0 | FR-042-AC-11, FR-042-CON-4 | ✅ passed |
| TC-360 | The ordered substitution table is the recorded rendering mechanism | Static | P1 | FR-042-CON-5 | ✅ passed |
| TC-361 | The adapter reproduces the committed Python input schema | Snapshot | P0 | FR-043-AC-1 | ✅ passed |
| TC-362 | `x-python-import` throws naming the offending key | Unit | P0 | FR-043-AC-2, FR-043-CON-1 | ✅ passed |
| TC-363 | `customTypePath` and `default_factory` throw, including when nested | Unit | P0 | FR-043-AC-2, FR-043-CON-1 | ✅ passed |
| TC-364 | Output carries the urn `$id`, no `$defs` `$id`/`$schema`, a title each | Unit | P0 | FR-043-AC-3 | ✅ passed |
| TC-365 | `RecordString` is localised and carries `additionalProperties` | Unit | P0 | FR-043-AC-4, FR-043-CON-2 | ✅ passed |
| TC-366 | The adapter is pure and leaves its input document unmutated | Property | P0 | FR-043-AC-5 | ✅ passed |
| TC-367 | The committed bundle, adapter output, and Python goldens are unchanged | Static | P0 | FR-043-AC-6 | ✅ passed |
| TC-368 | The pinned Python constants equal the recorded evidence versions | Unit | P0 | FR-043-AC-7 | ✅ passed |
| TC-369 | No module under `src/compiler/` spawns a process | Static | P0 | FR-043-AC-8, FR-043-CON-3 | ✅ passed |
| TC-370 | `spike:typespec:check` exits zero on a host meeting the issue #42 floor | Integration | P0 | FR-044-AC-1 | 🚧 blocked on issue #42 |
| TC-371 | The retained-evidence diff is exactly `evidence/custom.json` `command` | Static | P0 | FR-044-AC-2, FR-044-CON-1 | ✅ passed |
| TC-372 | The committed `Cargo.lock` is unchanged and the runner seeds it | Static | P0 | FR-044-AC-3, FR-044-CON-2 | ✅ passed |
| TC-373 | Seeding leaves the lockfile identical after `cargo check --offline --locked` | Integration | P0 | FR-044-AC-3 | ✅ passed |
| TC-374 | With no committed lockfile, `--check` exits non-zero naming it | Unit | P0 | FR-044-AC-4 | ✅ passed |
| TC-375 | Neither manifest names the spike emitter and its directory is gone | Static | P0 | FR-044-AC-5 | ✅ passed |
| TC-376 | The lockfile holds no `file:`/`link:` and installs frozen | Integration | P0 | FR-044-AC-6, FR-044-CON-3 | ✅ passed |
| TC-377 | The spike runner imports the promoted backends and defines none | Static | P0 | FR-044-AC-7 | ✅ passed |
| TC-378 | The branch changes only the four permitted spike paths | Static | P0 | FR-044-AC-8 | ✅ passed |
| TC-379 | The changed-path allowlist covers every path the branch changes | Unit | P0 | FR-044-AC-9 | ✅ passed |
| TC-380 | Zero publications and mutations proven by a changed-path check | Static | P0 | FR-044-AC-10 | ✅ passed |
| TC-381 | The feasibility doc carries the `## Retained evidence` note | Static | P1 | FR-044-AC-11 | ✅ passed |
| TC-397 | NFR-006 gains one paragraph recording the spike's new import direction | Static | P1 | FR-044-AC-12 | ✅ passed |
| TC-382 | A cargo cache missing a pinned crate is an unmet host prerequisite | Manual | P1 | FR-044-CON-4, FR-044-CON-5 | 🚧 blocked on issue #42 |
| TC-383 | Compiler, backends, and adapter all repeat identically | Property | P0 | NFR-017-AC-1 | ✅ passed |
| TC-384 | The branch changes exactly one retained-evidence file and field | Static | P0 | NFR-017-AC-2 | ✅ passed |
| TC-385 | Emitted ordering is unchanged under two collator locales | Property | P0 | NFR-017-AC-3 | ✅ passed |
| TC-386 | `baseDir` is an explicit parameter, not an ambient read | Unit | P0 | NFR-017-AC-4 | ✅ passed |
| TC-387 | A seeded lockfile survives `cargo check --offline --locked` unchanged | Integration | P0 | NFR-017-AC-5 | ✅ passed |
| TC-388 | No dependency added, exact pins, no `.npmrc`, no `file:`/`link:` | Static | P0 | NFR-017-AC-6 | ✅ passed |
| TC-389 | All three issue #42 host couplings are named in the feasibility doc | Static | P0 | NFR-017-AC-7 | ✅ passed |
| TC-390 | Every changed path is permitted and none is prohibited | Static | P0 | NFR-018-AC-1 | ✅ passed |
| TC-391 | `exports`, `main`, `module`, `types`, `files` unchanged from `origin/main` | Static | P0 | NFR-018-AC-2 | ✅ passed |
| TC-392 | The packed-file delta is confined to `src/compiler/**` and recorded | Integration | P0 | NFR-018-AC-3 | ✅ passed |
| TC-393 | Every added package manifest declares AGPL-3.0-only | Static | P0 | NFR-018-AC-4 | ✅ passed |
| TC-394 | No third-party dependency is added and the sets are otherwise identical | Static | P0 | NFR-018-AC-5 | ✅ passed |
| TC-395 | Restoring the changed paths reproduces `origin/main`'s tree exactly | Integration | P0 | NFR-018-AC-6 | ✅ passed |
| TC-396 | No workflow, tag, or registry publication is added or triggered | Static | P0 | NFR-018-AC-7 | ✅ passed |
| TC-398 | `FRONTEND_DIALECTS` equals the `frontendDialect` enum read from `common.schema.json`; a test that reads both fails when either changes alone | Unit | P0 | FR-045-AC-1 | ✅ passed |
| TC-399 | `selectFrontend("json-schema")` throws a `TypeError` naming the value and the two permitted dialects | Unit | P0 | FR-045-AC-2 | ✅ passed |
| TC-400 | `runFrontend` for `spec-bundle` returns `ir: null` and exactly one blocking diagnostic coded `agent-ix.compiler.FRONTEND_NOT_IMPLEMENTED` | Unit | P0 | FR-045-AC-3 | ✅ passed |
| TC-401 | For a package whose TypeSpec sources fail to compile, the `typespec` frontend returns diagnostics and `ir: null` and does not throw | Unit | P0 | FR-045-AC-4 | ✅ passed |
| TC-402 | Every shared fixture case runs through every implemented dialect it supplies | Unit | P0 | FR-045-AC-5 | ✅ passed |
| TC-403 | No file under `src/compiler/frontend/` imports a module under `src/compiler/backends/`, and no frontend imports `@typespec/json-schema` | Static | P0 | FR-045-AC-6 | ✅ passed |
| TC-404 | A frontend that returns a blocking diagnostic together with a non-null `ir` fails the seam's own contract test | Unit | P0 | FR-045-AC-7 | ✅ passed |
| TC-405 | A `FrontendRequest` carrying a `resolution` for a package with two exports makes both export identities visible to the frontend | Unit | P0 | FR-045-AC-8 | ✅ passed |
| TC-406 | Every read a frontend performs during a fixture compile is observed by the injected `host` | Unit | P0 | FR-045-AC-9 | ✅ passed |
| TC-407 | Over 256 mutated inputs the seam returns a `FrontendResult` and never throws | Fuzz | P0 | FR-045-AC-10 | ✅ passed |
| TC-408 | The seam SHALL NOT implement the `spec-bundle` frontend; that work is issue #36. The registration exists so the harness and the diagnostic exist | Static | P1 | FR-045-CON-1 | ✅ passed |
| TC-409 | A `FrontendResult` SHALL carry `ir: null` whenever any of its diagnostics is `blocking`, so no caller can consume a partial document as a complete one | Property | P1 | FR-045-CON-2 | ✅ passed |
| TC-410 | No frontend SHALL read a decorator defined by `@typespec/json-schema`, `@typespec/protobuf`, `@typespec/openapi` | Static | P1 | FR-045-CON-3 | ✅ passed |
| TC-411 | The seam SHALL distinguish a caller defect, which throws, from an input defect, which is a diagnostic | Fuzz | P1 | FR-045-CON-4 | ✅ passed |
| TC-412 | The library declares exactly the fifteen named decorators; a test reading `main.tsp` fails when a sixteenth appears | Unit | P0 | FR-053-AC-1 | ✅ passed |
| TC-413 | A package compiles against the library with no `import` statement of its own and no path containing `..`, driven through `additionalImports` | Unit | P0 | FR-053-AC-2 | ✅ passed |
| TC-414 | A second application of each single-valued decorator raises `DUPLICATE_DECORATOR` at the second locus with the first as a related locus | Unit | P0 | FR-053-AC-3 | ✅ passed |
| TC-415 | Every declared argument pattern rejects at least one malformed value with `INVALID_DECORATOR_ARGUMENT` at the decorator's line and column | Unit | P0 | FR-053-AC-4 | ✅ passed |
| TC-416 | `@unit("furlong")` is accepted and `@unit("a b")` is rejected on charset, proving UCUM membership is not checked and the charset is | Unit | P0 | FR-053-AC-5 | ✅ passed |
| TC-417 | For a worked package, every minted identity equals the identity FR-034's rules give the same declaration | Unit | P0 | FR-053-AC-6 | ✅ passed |
| TC-418 | Renaming every declaration in a fixture package changes only the identities and display names, and no `role`, `nullable`, `unknownPolicy`, `unit` | Property | P0 | FR-053-AC-7 | ✅ passed |
| TC-419 | A constrained model property mints the alias type, retargets the field | Unit | P0 | FR-053-AC-8 | ✅ passed |
| TC-420 | Every derived `diagnosticCode` matches the `common.schema.json` code pattern, including for a package named `core.data` and a field named `a_b.c` | Property | P0 | FR-053-AC-9 | ✅ passed |
| TC-421 | Two declarations minting one identity raise `DUPLICATE_IDENTITY` at the later locus by the declared source order | Unit | P0 | FR-053-AC-10 | ✅ passed |
| TC-422 | `CONSTRAINT_NOT_APPLICABLE`, `NODES_ON_NON_RECORD`, `DANGLING_CLAUSE_REF` | Unit | P0 | FR-053-AC-11 | ✅ passed |
| TC-423 | Relationships, operations, and clauses lower with the FR-034 defaults for `composite`, relationship multiplicity, and `returns.nullable` | Unit | P0 | FR-053-AC-12 | ✅ passed |
| TC-424 | Each of the four extension lowerings produces the identity, version, `required` flag, and payload FR-034 names | Unit | P0 | FR-053-AC-13 | ✅ passed |
| TC-425 | An enum member with an assigned value raises `UNSUPPORTED_LOSS` at the member's locus, and no document is written | Unit | P0 | FR-053-AC-14 | ✅ passed |
| TC-426 | Every added manifest declares `AGPL-3.0-only`, and `package.json` gains no dependency and no `file:`/`link:` specifier | Static | P0 | FR-053-AC-15 | ✅ passed |
| TC-427 | The minted identities and the constraint-alias rule SHALL equal those of FR-034 | Integration | P1 | FR-053-CON-1 | ✅ passed |
| TC-428 | The library SHALL declare no decorator beyond the fifteen named here; adding one is a compatibility change under FR-051 | Unit | P1 | FR-053-CON-2 | ✅ passed |
| TC-429 | The frontend SHALL reach the library by the absolute path it supplies to `additionalImports` | Static | P1 | FR-053-CON-3 | ✅ passed |
| TC-430 | The library SHALL declare no decorator that overrides a minted identity or that lets an IR value be derived from a declaration's name, namespace | Property | P1 | FR-053-CON-4 | ✅ passed |
| TC-431 | Every manifest this requirement adds SHALL declare `"license": "AGPL-3.0-only"` | Static | P1 | FR-053-CON-5 | ✅ passed |
| TC-432 | The IR produced for `test/fixtures/compiler/packages/assurance` validates against `semantic-ir.schema.json` with `contractVersion` `1.1.0` | Unit | P0 | FR-046-AC-1 | ✅ passed |
| TC-433 | Every row of the structural-kind table is exercised by a declaration in the fixture package and yields the stated `kind` and additional members | Unit | P0 | FR-046-AC-2 | ✅ passed |
| TC-434 | Every row of the built-in scalar mapping yields the stated IR `scalar` | Unit | P0 | FR-046-AC-3 | ✅ passed |
| TC-435 | A record named `AuditEvent` with no `@role` has `roles: []`, and a record named `Thing` with `@role("agent-ix:event")` has `roles: | Unit | P0 | FR-046-AC-4 | ✅ passed |
| TC-436 | A property typed `Text \| null` is `nullable: true` and a property typed `NullableText` (a declared alias of `Text`) is `nullable: false` | Unit | P0 | FR-046-AC-5 | ✅ passed |
| TC-437 | The four multiplicity derivations (collection/single × optional/required) and the `@multiplicity` override each produce the stated bounds | Unit | P0 | FR-046-AC-6 | ✅ passed |
| TC-438 | `@collection` on a single-valued property raises `FLAGS_ON_NON_COLLECTION`, `@multiplicity(2, 1)` raises `INVALID_MULTIPLICITY` | Unit | P0 | FR-046-AC-7 | ✅ passed |
| TC-439 | `@unit("s")` on a field resolving through an alias to a scalar is emitted | Unit | P0 | FR-046-AC-8 | ✅ passed |
| TC-440 | A property with a TypeSpec default emits `defaultKind: "semantic"` and that `defaultValue`; `@defaultKind("migration")` overrides the kind | Unit | P0 | FR-046-AC-9 | ✅ passed |
| TC-441 | A field typed by a built-in scalar directly emits the package-local kernel scalar definition with its `ext/kernel-scalar` extension | Unit | P0 | FR-046-AC-10 | ✅ passed |
| TC-442 | A property typed by an export of a resolved imported package resolves, and one typed by an unexported type of that package raises | Unit | P0 | FR-046-AC-11 | ✅ passed |
| TC-443 | `source.digest` equals the root package's `contentDigest`, and the `package` block equals the values FR-047 and FR-048 supply, asserted field by field | Unit | P0 | FR-046-AC-12 | ✅ passed |
| TC-444 | `occurrences` is the empty array for every fixture package | Unit | P0 | FR-046-AC-13 | ✅ passed |
| TC-445 | Every emitted array is sorted by `identity` under code-point comparison | Property | P0 | FR-046-AC-14 | ✅ passed |
| TC-446 | `src/compiler/ir.mjs`, `compile.mjs`, `identity.mjs`, `emitters/**`, and `backends/**` are byte-unchanged from `origin/main` | Static | P0 | FR-046-AC-15 | ✅ passed |
| TC-447 | No file under `src/compiler/frontend/` imports a target-facing TypeSpec library or `node:fs`, `package.json` gains no dependency | Static | P0 | FR-046-AC-16 | ✅ passed |
| TC-448 | A package whose entrypoint imports a file outside its root raises `PATH_ESCAPE` | Unit | P0 | FR-046-AC-17 | ✅ passed |
| TC-449 | A declaration reached through an imported package carries a generated origin naming the frontend and that package's source identity, not a `..` path | Unit | P0 | FR-046-AC-18 | ✅ passed |
| TC-450 | A lowering that would emit a document failing `semantic-ir.schema.json` returns `ir: null` with the validation diagnostics | Unit | P0 | FR-046-AC-19 | ✅ passed |
| TC-451 | The prototype IR of FR-041 — `schemaVersion` `1.0.0`, the `{schemaVersion, generator, types}` envelope | Snapshot | P1 | FR-046-CON-1 | ✅ passed |
| TC-452 | The lowering SHALL take every `role`, `nullable`, `unit`, `unknownPolicy`, `composite` | Property | P1 | FR-046-CON-2 | ✅ passed |
| TC-453 | The frontend SHALL import only `@typespec/compiler` and `@typespec/versioning` from the pinned toolchain, and no target-facing TypeSpec library | Static | P1 | FR-046-CON-3 | ✅ passed |
| TC-454 | The frontend SHALL reach the file system only through `restrictedHost`, which delegates to the injected host | Static | P1 | FR-046-CON-4 | ✅ passed |
| TC-455 | The lowering SHALL be a pure function of the compiled program and the resolved package, reading no clock, environment variable, hostname | Static | P1 | FR-046-CON-5 | ✅ passed |
| TC-456 | The concrete tree for the `order-independent` case resolves to the same ordered result under both permutations named in the case index | Property | P0 | FR-047-AC-1 | ✅ passed |
| TC-457 | The `version-conflict` tree yields exactly one `IMPORT_VERSION_CONFLICT` naming both requiring loci | Unit | P0 | FR-047-AC-2 | ✅ passed |
| TC-458 | The `digest-conflict` tree yields `DIGEST_CONFLICT` naming both digests and both loci | Unit | P0 | FR-047-AC-3 | ✅ passed |
| TC-459 | The `package-cycle` tree yields exactly one `PACKAGE_CYCLE` naming both import loci and starting at the least package identity | Unit | P0 | FR-047-AC-4 | ✅ passed |
| TC-460 | The `recursive-type-is-not-package-cycle` tree resolves successfully and emits no cycle diagnostic | Unit | P0 | FR-047-AC-5 | ✅ passed |
| TC-461 | A manifest failing its schema yields one `INVALID_MANIFEST` per schema error, each at the line and column of the failing pointer's key | Unit | P0 | FR-047-AC-6 | ✅ passed |
| TC-462 | `locateJsonPointer` returns exact positions for a pointer into an object, an array element, a nested array element, and a tab-indented document | Unit | P0 | FR-047-AC-7 | ✅ passed |
| TC-463 | `IMPORT_NOT_FOUND`, `IMPORT_VERSION_UNSATISFIED`, `IMPORT_EXPORT_MISSING`, `IMPORT_EXPORT_PRIVATE` | Unit | P0 | FR-047-AC-8 | ✅ passed |
| TC-464 | `UNKNOWN_PROFILE`, `UNKNOWN_MAPPING`, `UNKNOWN_TARGET`, and `UNDECLARED_LOSS` each fire on a fixture at the declared locus | Unit | P0 | FR-047-AC-9 | ✅ passed |
| TC-465 | `DUPLICATE_EXPORT` fires for a repeated identity within one manifest and for the same identity exported by two packages | Unit | P0 | FR-047-AC-10 | ✅ passed |
| TC-466 | A version constraint of `>=1.0.0` yields `UNSUPPORTED_VERSION_CONSTRAINT` rather than a resolution | Unit | P0 | FR-047-AC-11 | ✅ passed |
| TC-467 | A search directory entry that is a symlink to a directory outside the search root yields `PATH_ESCAPE` and no resolved package | Unit | P0 | FR-047-AC-12 | ✅ passed |
| TC-468 | A full fixture compile reads no path outside the package root and search directories, and opens no network connection | Integration | P0 | FR-047-AC-13 | ✅ passed |
| TC-469 | Every locus the resolver emits carries a `sourceIdentity` and a relative `path` free of `..`, including a locus inside an imported package | Unit | P0 | FR-047-AC-14 | ✅ passed |
| TC-470 | Exceeding `maxNodes`, `maxInputBytes`, and `maxDepth` each terminates resolution with the corresponding blocking limit diagnostic | Unit | P0 | FR-047-AC-15 | ✅ passed |
| TC-471 | Two permutations of the search-path order, where no two directories supply the same identity at the same version, produce identical output | Property | P0 | FR-047-AC-16 | ✅ passed |
| TC-472 | Resolution SHALL work offline, opening no network connection and reading nothing outside the declared package root and search directories | Integration | P1 | FR-047-CON-1 | ✅ passed |
| TC-473 | A resolved package path SHALL NOT escape its search directory through `..` or a symbolic link; an escape is `agent-ix.compiler.PATH_ESCAPE` | Unit | P1 | FR-047-CON-2 | ✅ passed |
| TC-474 | The resolver SHALL implement version-constraint satisfaction in this repository against the two accepted forms, adding no semver dependency | Static | P1 | FR-047-CON-3 | ✅ passed |
| TC-475 | The resolver SHALL NOT execute any file it reads; manifests, mappings, profiles, and locks are data | Integration | P1 | FR-047-CON-4 | ✅ passed |
| TC-476 | `fixtures/semantic/v1/package-graph-cases.json` SHALL remain byte-unchanged; it is the read-only case index | Static | P1 | FR-047-CON-5 | ✅ passed |
| TC-477 | `canonicalize` reproduces every vector in `test/fixtures/compiler/rfc8785/vectors.json` for string escaping, number formatting, and key ordering | Unit | P0 | FR-048-AC-1 | ✅ passed |
| TC-478 | Permuting object key order, permuting a declared identity-keyed set, changing the working directory | Property | P0 | FR-048-AC-2 | ✅ passed |
| TC-479 | Changing one byte of a source file, of a manifest, of a mapping, of a profile, of a resolved package version, of a published schema file | Property | P0 | FR-048-AC-3 | ✅ passed |
| TC-480 | A built lock validates against `package-lock.schema.json`, and its `canonicalization` block equals the algorithm named here | Unit | P0 | FR-048-AC-4 | ✅ passed |
| TC-481 | `STALE_LOCK`, `STALE_LOCK_PACKAGE`, `LOCK_GRAPH_MISMATCH`, and `UNSUPPORTED_CANONICALIZATION` each fire on a fixture, each at the declared locus | Unit | P0 | FR-048-AC-5 | ✅ passed |
| TC-482 | Verifying a lock leaves the lock file byte-unchanged on disk | Unit | P0 | FR-048-AC-6 | ✅ passed |
| TC-483 | Two lock builds over the same graph produce identical bytes | Snapshot | P0 | FR-048-AC-7 | ✅ passed |
| TC-484 | `contentDigest` is unchanged when a package's files are enumerated in a different order and changes when any source byte changes | Property | P0 | FR-048-AC-8 | ✅ passed |
| TC-485 | `source.digest` of a compiled document equals `contentDigest` of its root package, asserted by recomputation | Unit | P0 | FR-048-AC-9 | ✅ passed |
| TC-486 | `package.lockDigest` equals the digest of a supplied lock's bytes, and, with no lock supplied, of the lock the compile built | Unit | P0 | FR-048-AC-10 | ✅ passed |
| TC-487 | A value nested past `maxDepth` terminates `canonicalize` with the blocking limit diagnostic | Unit | P0 | FR-048-AC-11 | ✅ passed |
| TC-488 | The fingerprint SHALL change for every change to an included input, and stay equal for every change confined to an excluded input | Property | P1 | FR-048-CON-1 | ✅ passed |
| TC-489 | The canonical form SHALL be produced by this repository; no canonical-JSON dependency is added | Static | P1 | FR-048-CON-2 | ✅ passed |
| TC-490 | The lock verifier SHALL work offline, reading no file the resolution did not already name | Integration | P1 | FR-048-CON-3 | ✅ passed |
| TC-491 | Every digest this requirement defines SHALL be defined by its byte set, not by its name, so two implementations cannot disagree about what was hashed | Static | P1 | FR-048-CON-4 | ✅ passed |
| TC-492 | Every entry of `DIAGNOSTIC_CODES` matches the code pattern and validates as a `diagnostic` against `common.schema.json` when instantiated | Unit | P0 | FR-049-AC-1 | ✅ passed |
| TC-493 | The set of codes named under `src/compiler/` equals the registry set, extracted statically from `DIAGNOSTIC_CODES` member accesses | Static | P0 | FR-049-AC-2 | ✅ passed |
| TC-494 | Every registry code is emitted by at least one test case in the suite, asserted by a coverage set collected at run time | Unit | P0 | FR-049-AC-3 | ✅ passed |
| TC-495 | `sortDiagnostics` produces the same order for a list and for its reverse, and for at least two `Intl.Collator` locales | Property | P0 | FR-049-AC-4 | ✅ passed |
| TC-496 | Two compiles of a three-defect fixture produce identical diagnostic bytes | Snapshot | P0 | FR-049-AC-5 | ✅ passed |
| TC-497 | No message emitted across a full fixture-corpus run contains an absolute path, a timestamp, a hostname, or a duration | Unit | P0 | FR-049-AC-6 | ✅ passed |
| TC-498 | A defect caused by another is emitted once with the cause nested | Unit | P0 | FR-049-AC-7 | ✅ passed |
| TC-499 | With `maxDiagnostics: 2`, a fixture producing five defects emits the two lowest in sort order plus `DIAGNOSTIC_LIMIT_REACHED` | Unit | P0 | FR-049-AC-8 | ✅ passed |
| TC-500 | A blocking diagnostic leaves a fresh `--out` path absent and exits non-zero, leaves a pre-existing `--out` byte-unchanged | Unit | P0 | FR-049-AC-9 | ✅ passed |
| TC-501 | A 4000-character input string never appears in a message longer than 120 characters | Unit | P0 | FR-049-AC-10 | ✅ passed |
| TC-502 | The published registry document lists every code with its severity, blocking disposition, and owner, and the five limit defaults | Unit | P0 | FR-049-AC-11 | ✅ passed |
| TC-503 | Every code `reader-cases.json` names appears in the registry, and every `agent-ix.semantic-ir.*` code in the registry is one the issue #34 TypeScript reader can emit | Unit | P0 | FR-049-AC-12 | ✅ passed |
| TC-504 | A diagnostic located by a JSON pointer into an IR node carries that node's `origin.source` as its locus | Unit | P0 | FR-049-AC-13 | ✅ passed |
| TC-505 | `DIAGNOSTIC_LIMIT_REACHED` is non-blocking, and the four size limits are blocking, asserted against the registry | Unit | P0 | FR-049-AC-14 | ✅ passed |
| TC-506 | The registry is a compatibility surface: a code's spelling and its `blocking` disposition SHALL NOT change without a compatibility-report entry in | Static | P1 | FR-049-CON-1 | ✅ passed |
| TC-507 | The `diagnostic` constructor SHALL truncate every input-derived string to 120 characters before it enters a message; input data beyond identities | Unit | P1 | FR-049-CON-2 | ✅ passed |
| TC-508 | The set of codes the registry declares and the set the compiler emits SHALL be equal, with every declared code reached by at least one test | Unit | P1 | FR-049-CON-3 | ✅ passed |
| TC-509 | The `agent-ix.semantic-ir.*` spellings SHALL be exactly those the issue #34 readers already emit, extracted from the byte-unchanged `fixtures/semantic/v1/negative/reader-cases.json` and `test/semantic-ir-v1-1-reader.ts` | Unit | P1 | FR-049-CON-4 | ✅ passed |
| TC-510 | Every positive `1.1.0` fixture under `fixtures/semantic/v1/positive/` validates and yields zero reader diagnostics | Unit | P0 | FR-050-AC-1 | ✅ passed |
| TC-511 | Every case in `negative/reader-cases.json` yields the expected diagnostic code from the compiler's reader | Unit | P0 | FR-050-AC-2 | ✅ passed |
| TC-512 | For every case in `negative/reader-cases.json`, the compiler's reader, the issue #34 TypeScript reader | Integration | P0 | FR-050-AC-3 | ✅ passed |
| TC-513 | `src/compiler/ir/reader.mjs` imports no module under `test/` or `tests/` | Static | P0 | FR-050-AC-4 | ✅ passed |
| TC-514 | `normalizeIr` materializes `multiplicity`, `presence`, and `nullable` on every `1.1.0` field and operation parameter | Unit | P0 | FR-050-AC-5 | ✅ passed |
| TC-515 | `normalizeIr(normalizeIr(d))` equals `normalizeIr(d)` for every positive fixture and for generated documents | Property | P0 | FR-050-AC-6 | ✅ passed |
| TC-516 | Two documents differing only in object key order and in identity-keyed array order have the same `fingerprintIr` | Property | P0 | FR-050-AC-7 | ✅ passed |
| TC-517 | An emitted document that fails validation is not written, and the failure is a blocking diagnostic naming the failing pointer | Unit | P0 | FR-050-AC-8 | ✅ passed |
| TC-518 | A document whose alias chain is cyclic, one whose composite relationships are cyclic, one exceeding `maxNodes` | Unit | P0 | FR-050-AC-9 | ✅ passed |
| TC-519 | `INVALID_IR` diagnostics name the failing instance pointer, verified against a hand-computed pointer for a malformed fixture | Unit | P0 | FR-050-AC-10 | ✅ passed |
| TC-520 | Every rule of the code table fires on a constructed document and produces exactly its named code | Unit | P0 | FR-050-AC-11 | ✅ passed |
| TC-521 | With `importedExports` set to `unknown`, a relationship target absent from the document produces no diagnostic and one recorded suppression | Unit | P0 | FR-050-AC-12 | ✅ passed |
| TC-522 | Over 512 mutated documents the reader returns diagnostics and never throws | Fuzz | P0 | FR-050-AC-13 | ✅ passed |
| TC-523 | The compiler's reader is deliberately a third implementation beside the issue #34 TypeScript and Python readers; it SHALL NOT import either | Integration | P1 | FR-050-CON-1 | ✅ passed |
| TC-524 | This requirement SHALL NOT edit `test/semantic-ir-v1-1-reader.ts` or `tests/semantic_ir_reader.py`. Invoking the Python reader from a test under | Static | P1 | FR-050-CON-2 | ✅ passed |
| TC-525 | Normalization SHALL be idempotent: normalizing a normalized document yields identical bytes | Property | P1 | FR-050-CON-3 | ✅ passed |
| TC-526 | The reader SHALL terminate on every cyclic or oversized input rather than recursing without bound | Fuzz | P1 | FR-050-CON-4 | ✅ passed |
| TC-527 | Every case in `fixtures/semantic/v1/compatibility/cases.json` is reproduced by a constructed input pair whose diff yields the case's `expected` | Unit | P0 | FR-051-AC-1 | ✅ passed |
| TC-528 | Every family the report schema declares is produced by at least one such case | Unit | P0 | FR-051-AC-2 | ✅ passed |
| TC-529 | The `target-disagreement` case yields the most restrictive of its `targetResults` | Unit | P0 | FR-051-AC-3 | ✅ passed |
| TC-530 | A diff run with no profile, mapping, reservation, or target-result inputs omits the `profile`, `authority`, `mapping`, `protobuf-reservation` | Unit | P0 | FR-051-AC-4 | ✅ passed |
| TC-531 | Every produced report validates against `compatibility-report.schema.json` | Unit | P0 | FR-051-AC-5 | ✅ passed |
| TC-532 | Diffing a document against itself yields one `patch` change identified by `source.identity` and an aggregate of `patch` | Unit | P0 | FR-051-AC-6 | ✅ passed |
| TC-533 | The forward projection of `fixtures/semantic/v1/positive/semantic-ir-v1-1.json` equals the committed golden byte for byte | Snapshot | P0 | FR-051-AC-7 | ✅ passed |
| TC-534 | The backward projection of a `1.0.0` document with a declared dialect equals the committed golden byte for byte and reports empty loss | Snapshot | P0 | FR-051-AC-8 | ✅ passed |
| TC-535 | A `1.0.0` document projected to `1.1.0` and back is byte-identical to the original | Property | P0 | FR-051-AC-9 | ✅ passed |
| TC-536 | Both projections validate against the published schema at their target `contractVersion` | Unit | P0 | FR-051-AC-10 | ✅ passed |
| TC-537 | Two runs of the diff over the same inputs produce byte-identical reports | Snapshot | P0 | FR-051-AC-11 | ✅ passed |
| TC-538 | The published policy document states the four evolution rules, and a test fails when the document and the implemented ranking disagree | Unit | P0 | FR-051-AC-12 | ✅ passed |
| TC-539 | Projecting to `1.1.0` with no dialect yields `MISSING_TARGET_DIALECT` and no document; projecting to `2.0.0` yields `UNKNOWN_CONTRACT_VERSION` | Unit | P0 | FR-051-AC-13 | ✅ passed |
| TC-540 | A projection carries `source.digest` and the `package` block verbatim from the input | Unit | P0 | FR-051-AC-14 | ✅ passed |
| TC-541 | A revision that removes a member, retypes a member, or narrows a closed vocabulary is classified `breaking` | Unit | P0 | FR-051-AC-15 | ✅ passed |
| TC-542 | The diff SHALL NOT classify a family from an input it was not given; an absent input is a named gap, never a `patch` | Unit | P1 | FR-051-CON-1 | ✅ passed |
| TC-543 | The disposition rank SHALL be exactly `patch < additive < conditional < unknown < breaking < invalid` | Unit | P1 | FR-051-CON-2 | ✅ passed |
| TC-544 | A forward projection SHALL report every dropped identity; silently dropping a `1.1.0` member is a defect, not a projection | Unit | P1 | FR-051-CON-3 | ✅ passed |
| TC-545 | The diff SHALL NOT import a target backend; per-target dispositions are an input | Static | P1 | FR-051-CON-4 | ✅ passed |
| TC-546 | `fixtures/semantic/v1/compatibility/cases.json` SHALL remain byte-unchanged; it is the read-only case index | Static | P1 | FR-051-CON-5 | ✅ passed |
| TC-547 | `emit-ir` over the spike entrypoint reproduces the committed golden `spikes/typespec-feasibility/generated/custom/semantic-ir.json` byte for byte | Snapshot | P0 | FR-052-AC-1 | ✅ passed |
| TC-548 | `compile` over the fixture package writes a valid `1.1.0` document and exits `0`; running it twice produces identical IR and diagnostic bytes | Integration | P0 | FR-052-AC-2 | ✅ passed |
| TC-549 | `compile` over a fixture with a blocking defect exits `1`, leaves a fresh `--out` absent, leaves a pre-existing `--out` byte-unchanged | Integration | P0 | FR-052-AC-3 | ✅ passed |
| TC-550 | `compile` with `--lock` pointing at a stale lock exits `1` and leaves the lock file byte-unchanged | Integration | P0 | FR-052-AC-4 | ✅ passed |
| TC-551 | `compile --write-lock` produces a lock validating against its schema; omitting the flag writes no lock | Integration | P0 | FR-052-AC-5 | ✅ passed |
| TC-552 | A manifest with two profiles and no `--profile` yields `AMBIGUOUS_PROFILE` and exit `1` | Unit | P0 | FR-052-AC-6 | ✅ passed |
| TC-553 | `inspect` output is byte-identical across two runs and lists every type sorted by identity with its five node counts | Snapshot | P0 | FR-052-AC-7 | ✅ passed |
| TC-554 | `inspect --json` output parses, is canonical, and carries the same values as the text form | Unit | P0 | FR-052-AC-8 | ✅ passed |
| TC-555 | `inspect` over an invalid document prints its reader diagnostics and exits `1` | Unit | P0 | FR-052-AC-9 | ✅ passed |
| TC-556 | `diff` writes a schema-valid report, exits `0` for an additive aggregate and `1` for a breaking one | Integration | P0 | FR-052-AC-10 | ✅ passed |
| TC-557 | An unknown command, an unknown flag, a missing required flag, and an unreadable `--limits` file each exit `2` and print the usage text | Unit | P0 | FR-052-AC-11 | ✅ passed |
| TC-558 | The narrow interface declares fifteen symbols that `tsc --noEmit` checks | Compile | P0 | FR-052-AC-12 | ✅ passed |
| TC-559 | `package.json` `exports`, `main`, `module`, `types`, and `files` are byte-unchanged from `origin/main`, and no dependency was added | Static | P0 | FR-052-AC-13 | ✅ passed |
| TC-560 | A compile with every environment variable cleared but `PATH` produces identical output | Integration | P0 | FR-052-AC-14 | ✅ passed |
| TC-561 | `compilePackage` runs its five phases in the declared order and stops at the first blocking phase, asserted by an instrumented phase recorder | Unit | P0 | FR-052-AC-15 | ✅ passed |
| TC-562 | Every path the CLI creates during a fixture compile is a caller-named path or its `.tmp` sibling | Integration | P0 | FR-052-AC-16 | ✅ passed |
| TC-563 | The narrow interface SHALL export exactly the six FR-041 symbols plus the nine named here | Unit | P1 | FR-052-CON-1 | ✅ passed |
| TC-564 | This requirement SHALL leave `package.json` `exports`, `main`, `module`, `types`, and `files` unchanged | Static | P1 | FR-052-CON-2 | ✅ passed |
| TC-565 | The CLI SHALL read no environment variable to decide behavior; every input is a flag or a file | Static | P1 | FR-052-CON-3 | ✅ passed |
| TC-566 | The CLI SHALL be the one place that constructs the injected host, passing it down to every module below it | Static | P1 | FR-052-CON-4 | ✅ passed |
| TC-567 | Two `compile` runs over the same package produce identical IR, lock, and diagnostic bytes | Unit | P0 | NFR-019-AC-1 | ✅ passed |
| TC-568 | Two `inspect` runs and two `diff` runs produce identical bytes | Unit | P0 | NFR-019-AC-2 | ✅ passed |
| TC-569 | No module in scope references `Date`, `Date.now`, `process.env`, `process.cwd`, `process.platform`, `os.hostname`, `Math.random`, `localeCompare` | Static | P0 | NFR-019-AC-3 | ✅ passed |
| TC-570 | Two permutations of the search-path order that select the same packages produce identical output | Unit | P0 | NFR-019-AC-4 | ✅ passed |
| TC-571 | Two injected directory-enumeration orders produce identical output | Unit | P0 | NFR-019-AC-5 | ✅ passed |
| TC-572 | The emitted identity order is unchanged when compared against `Intl.Collator` orderings for at least two distinct locales | Unit | P0 | NFR-019-AC-6 | ✅ passed |
| TC-573 | A compile with every environment variable cleared but `PATH`, and a compile with `TZ`, `LANG` | Unit | P0 | NFR-019-AC-7 | ✅ passed |
| TC-574 | A compile driven from a different working directory produces identical output | Unit | P0 | NFR-019-AC-8 | ✅ passed |
| TC-575 | A compile through an injected host reporting a `\` path separator produces identical emitted paths | Unit | P0 | NFR-019-AC-9 | ✅ passed |
| TC-576 | Every file-system read and every JavaScript module load a fixture compile performs is observed by the injected host, counted at run time | Unit | P0 | NFR-019-AC-10 | ✅ passed |
| TC-577 | The branch changes no file under the prohibited paths, verified by a diff against `origin/main` | Static | P0 | NFR-019-AC-11 | ✅ passed |
| TC-578 | `package.json` gains no dependency, every `@typespec/*` specifier is an exact version, no `.npmrc` is committed | Static | P0 | NFR-019-AC-12 | ✅ passed |
| TC-579 | Each of the four size limits — `maxInputBytes`, `maxDepth`, `maxNodes`, `maxCollectionItems` — is enforced | Unit | P0 | NFR-020-AC-1 | ✅ passed |
| TC-580 | `DEFAULT_LIMITS` applies where the caller supplies none, its five values are those FR-049 declares, and the published registry document carries them | Unit | P0 | NFR-020-AC-2 | ✅ passed |
| TC-581 | A manifest whose `sourceRoots` contains `..` and one that is a symlink out of the package root each yield `PATH_ESCAPE` | Unit | P0 | NFR-020-AC-3 | ✅ passed |
| TC-582 | A package shipping a `.mjs` file that its sources import is refused by the injected `getJsImport`, which never delegates for it | Unit | P0 | NFR-020-AC-4 | ✅ passed |
| TC-583 | No module in scope imports a network-capable or code-executing built-in, and a fixture compile with `globalThis.fetch` stubbed never calls it | Unit | P0 | NFR-020-AC-5 | ✅ passed |
| TC-584 | The instrumented writer records only caller-named paths and their `.tmp` siblings over a full fixture compile | Unit | P0 | NFR-020-AC-6 | ✅ passed |
| TC-585 | A cyclic alias chain, a cyclic composite relationship graph, a cyclic package import graph, a self-referential JSON pointer | Unit | P0 | NFR-020-AC-7 | ✅ passed |
| TC-586 | A fuzz run of at least 512 mutations over the manifest and IR readers produces zero uncaught exceptions and no code outside the registry | Fuzz | P0 | NFR-020-AC-8 | ✅ passed |
| TC-587 | An input of exactly `maxInputBytes` parses and one byte more terminates with the limit diagnostic before parsing | Unit | P0 | NFR-020-AC-9 | ✅ passed |
| TC-588 | Input string content reaching a diagnostic message is truncated to 120 characters, so an adversarial name cannot flood the output | Unit | P0 | NFR-020-AC-10 | ✅ passed |
| TC-589 | Every read the pinned TypeSpec compiler performs during a fixture compile passes through the injected host, counted at run time | Unit | P0 | NFR-020-AC-11 | ✅ passed |
| TC-590 | Every changed path on the branch is in the permitted set and none is in the prohibited set | Static | P0 | NFR-021-AC-1 | ✅ passed |
| TC-591 | `package.json` `exports`, `main`, `module`, `types`, and `files` are byte-unchanged from `origin/main` | Static | P0 | NFR-021-AC-2 | ✅ passed |
| TC-592 | `src/compiler/ir.mjs`, `compile.mjs`, `identity.mjs`, `emitters/**`, `backends/**`, and `inventory.json` are byte-unchanged from `origin/main` | Static | P0 | NFR-021-AC-3 | ✅ passed |
| TC-593 | The four committed issue #4 goldens and every file under `spikes/` are byte-unchanged | Static | P0 | NFR-021-AC-4 | ✅ passed |
| TC-594 | Nothing under `conformance/` is changed by this branch | Static | P0 | NFR-021-AC-5 | ✅ passed |
| TC-595 | Reverting the branch leaves the suite green with the pre-existing case count, rehearsed by a script rather than by hand | Integration | P0 | NFR-021-AC-6 | ✅ passed |
| TC-596 | Every added package manifest declares `"license": "AGPL-3.0-only"` | Static | P0 | NFR-021-AC-7 | ✅ passed |
| TC-597 | No package was published and no downstream repository was changed | Static | P0 | NFR-021-AC-8 | ✅ passed |
| TC-598 | Multiplicity, nullability, and default kind are independent across their permutations | Property | P0 | FR-046-AC-6, FR-046-AC-9 | ✅ passed |
| TC-599 | Collection flags are accepted on collections and refused on single-valued properties | Unit | P1 | FR-046-AC-7 | ✅ passed |
| TC-600 | Constraint applicability is exercised across every structural kind | Unit | P1 | FR-050-AC-11 | ✅ passed |
| TC-601 | Implemented and unimplemented dialects behave as declared in the shared harness | Unit | P1 | FR-045-AC-3, FR-045-AC-5 | ✅ passed |
| TC-602 | Enum addition is classified against every consumer policy and evidence status | Unit | P1 | FR-051-AC-1 | ✅ passed |
| TC-603 | `@multiplicity(0)` and `@multiplicity(0, 0)` are accepted at the lower boundary | Unit | P1 | FR-046-AC-6, FR-046-AC-7 | ✅ passed |
| TC-604 | `@minLength(0)` is accepted and a negative length is refused | Unit | P1 | FR-053-AC-4 | ✅ passed |
| TC-605 | `maxDiagnostics` of 1 truncates and a value below the schema minimum is refused | Unit | P1 | FR-049-AC-8, NFR-020-AC-1, NFR-020-AC-2 | ✅ passed |
| TC-606 | `maxDepth` at the limit passes and one past it terminates with the limit diagnostic | Unit | P1 | NFR-020-AC-1 | ✅ passed |
| TC-607 | `maxInputBytes` at the exact size passes and one byte over terminates | Unit | P1 | NFR-020-AC-9 | ✅ passed |
| TC-608 | A 120-character input string survives and a 121-character one is truncated | Unit | P1 | FR-049-AC-10 | ✅ passed |
| TC-609 | Every registry code fires at least once across the fixture corpus | Unit | P0 | FR-049-AC-3 | ✅ passed |
| TC-610 | A manifest that is not JSON at all yields `INVALID_MANIFEST` at line 1 | Unit | P1 | FR-047-AC-6 | ✅ passed |
| TC-611 | An IR document at an unknown `contractVersion` is refused with a pointer | Unit | P1 | FR-050-AC-10 | ✅ passed |
| TC-612 | A `1.0.0` document survives the `1.1.0` reader and the return projection | Property | P0 | FR-051-AC-9 | ✅ passed |
| TC-613 | A lock moves from fresh to stale by a source byte and by a manifest byte | Unit | P1 | FR-048-AC-5 | ✅ passed |
| TC-614 | A package with one type and no imports compiles | Unit | P2 | FR-046-AC-1 | ✅ passed |
| TC-615 | A diamond import graph resolves each package once | Unit | P1 | FR-047-AC-1, FR-047-AC-16 | ✅ passed |
| TC-616 | Two cycles sharing an edge yield two diagnostics and no duplicate | Unit | P1 | FR-047-AC-4 | ✅ passed |
| TC-617 | A relationship target resolving to an imported export validates | Unit | P1 | FR-050-AC-1, FR-050-AC-12 | ✅ passed |
| TC-618 | A caret constraint selects the highest satisfying version across two search directories | Unit | P1 | FR-047-AC-11 | ✅ passed |
| TC-619 | A projection to the document's own version returns it unchanged | Unit | P1 | FR-051-AC-13 | ✅ passed |

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
| TC-097, TC-121 | TypeSpec P0 capabilities pass under the ADR rule | recommended | owner decision | TypeSpec may be proposed, never self-promoted |
| TC-102, TC-128 | Official emitter output needs a workaround | partial with tracked defect | owner decision | Defect and workaround are retained; the source is not rejected |
| TC-100, TC-110 | concrete Protobuf interface | wire projection | explicit field mapping | Stable numbered projection may pass without becoming universal |
| TC-111 | recursive semantic graph | analytical projection | declared flattening/loss | Arrow remains derived and source/provenance linked |
| TC-137 | field state | required/optional | nullable/non-null/defaulted | Every valid combination retains a distinct semantic state |
| TC-143 | same semantic definitions | profile A/B | exports/targets/mappings differ | Definitions and stable identities remain byte-equivalent |
| TC-149, TC-154 | authored Markdown | byte/structure/semantic/lossy | mapping permits or forbids loss | Outcome and edit authority follow the selected profile |
| TC-155, TC-158 | concrete service boundary absent | Protobuf unselected | no descriptor mapping | Wire format remains absent without speculative generation |
| TC-167 | enum/record evolution | open/closed | preserve/ignore/reject unknown | Compatibility follows declared capability, not language default |
| TC-171, TC-172 | module known/unknown | dynamic/static consumer | preserve/reject/surface policy | Same identity graph, policy-specific handling |
| TC-203..205 | field multiplicity | `0..1` / `1..1` / `0..*` / `1..*` | nullable true/false, default none/semantic | Derived presence is fixed by lower bound; nullable and default stay independent |
| TC-204, TC-216 | collection flags | `ordered` / `unique` | upper absent or > 1 vs upper ≤ 1 | Flags allowed only on collections |
| TC-214, TC-215 | clause language | `ocl` / `sysml` / `fretish` / `ns:name` | bare unknown token | Closed core set plus namespaced extension; bare unknown fails |
| TC-227, TC-228 | IR source dialect | `typespec` / `spec-bundle` | v1 JSON Schema URI constant | Frontend identity accepted; stale constant rejected with ADR-0005 citation |
| TC-256, TC-271 | `TypeRef.target` | `KernelScalar` member / `SemanticId` | with or without `decimal` policy | `Decimal` requires `decimal`; any other target forbids it; both lower without loss |
| TC-277 | `TypeRef.unit` | unit-allowed scalar / other scalar / `SemanticId` / `returns` | present or absent | Allowed only on `Integer`, `Decimal`, `Timestamp`, `Duration` fields |
| TC-250, TC-251 | closed enumerations | eleven keywords / seven categories | member vs non-member | Members accepted, non-members rejected by the emitted schema |
| TC-253, TC-264 | package version | `v1` / `v1` + addition | regenerate | Prior version bytes unchanged; new version additive |
| TC-322, TC-324 | prototype component | `retain` / `rewrite` / `replace-with-official` / `discard` | targets present or empty | Promoted dispositions name a file; non-promoted dispositions name none |
| TC-327, TC-330 | `src/compiler/` file | promoted component target / promotion-authored | inventory `components` or `authored` | Every file is owned exactly once, and `authored` cannot launder a component |
| TC-333, TC-336 | IR production route | programmatic / CLI / `tsp --emit` | same entrypoint and generator | All three routes produce the same IR document |
| TC-338, TC-339 | generator identity | caller-supplied / defaulted | spike replay or production build | The stamped identity follows the caller, never the call site |
| TC-341, TC-386 | `baseDir` | repository root / another directory | same entrypoint | Loci are relative to the declared base, never to an ambient cwd |
| TC-357 | field state | required / optional / nullable | Rust and TypeScript backends | Optional and nullable reach `Option<…>`; TypeScript uses `?` |
| TC-372, TC-374 | committed Rust lockfile | present / absent | `--check` mode or generate mode | Present lockfile is seeded; absent lockfile fails `--check` and generates once otherwise |
| TC-437, TC-598 | field state | collection / single-valued × optional / required | nullable true/false, default none/semantic/migration | Multiplicity fixes presence; nullability and default kind stay independent |
| TC-438, TC-599 | collection flags | `ordered` / `unique` | collection vs single-valued property | Flags accepted only on collections; otherwise `FLAGS_ON_NON_COLLECTION` |
| TC-433, TC-600 | structural kind | scalar / alias / record / sequence / map / enum / union / reference | constraint keyword applicability | Every kind lowers once by first-match precedence; an inapplicable keyword is refused, not coerced |
| TC-400, TC-601 | frontend dialect | `typespec` implemented / `spec-bundle` unimplemented | shared fixture harness | Implemented dialects are compared; the unimplemented one is named, not guessed |
| TC-527, TC-602 | enum member addition | consumer policy `reject` / `surface` / `preserve` | consumer evidence current / stale / unknown | Disposition follows declared policy and evidence, never a language default |
| TC-533, TC-534 | IR contract version | `1.0.0` / `1.1.0` | forward or backward projection | Forward projection declares its loss; backward projection derives multiplicity |
| TC-466, TC-618 | version constraint | exact / caret | one or two search directories offering candidates | Highest satisfying version wins; the earlier declared directory breaks a tie |

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
| FR-027-CON-1 | Allowed | v1 field with `presence` only | TC-208 | Multiplicity derived (`required` → `1..1`, `optional` → `0..1`) |
| FR-027-CON-2 | Prohibited | `unit` on a record-typed field | TC-207 | Fail validation, never drop the unit |
| FR-027 multiplicity | Min | `lower: 0`, `upper: 0` | TC-206 | Valid empty-only multiplicity (positive case in the same test) |
| FR-027 flags | Prohibited | `ordered: true` on `1..1` | TC-237 | Fail validation at the field locus |
| FR-027 multiplicity | Below min | `lower: -1` | TC-206 | Fail validation |
| FR-027 multiplicity | Inverted | `lower: 2`, `upper: 1` | TC-206 | Fail validation at the field locus |
| FR-028-CON-1 | Allowed | v1 document without the three arrays | TC-217 | Read as empty |
| FR-028-CON-2 | Prohibited | Parsed clause AST property in the schema | TC-214 | Schema inspection fails |
| FR-029-CON-1 | Allowed | Every v1 fixture keyword in the closed set | TC-224 | Pass |
| FR-029-CON-1 | Prohibited | v1 fixture keyword outside the closed set with no recorded correction | TC-224 | Fail |
| FR-029-CON-2 | Allowed | Keyword added to the enumeration | TC-225 | Classified additive |
| FR-029-CON-2 | Prohibited | Keyword removed or operand retyped | TC-225 | Classified breaking |
| FR-029 operands | Min | `minLength: 0` | TC-219 | Valid |
| FR-029 operands | Below min | `minLength: -1` | TC-221 | Fail validation |
| FR-029 applicability | Prohibited | `minLength` on `integer`, `min` on `record` | TC-244 | Fail validation at the constraint locus |
| FR-030 contractVersion | Allowed | `"1.0.0"`, `"1.1.0"` | TC-227, TC-231 | Pass under the single schema file |
| FR-030 contractVersion | Prohibited | `"1.2.0"`, `"0.9.0"` | TC-246 | Fail before emission |
| FR-031-CON-1 | Allowed | Grammar under `packages/semantic-core/` | TC-254 | Pass |
| FR-031-CON-1 | Prohibited | `spikes/` importing the grammar | TC-254 | Fail |
| FR-031-CON-2 | Prohibited | Property typed `unknown` or `Record<unknown>` | TC-252 | Fail static scan |
| FR-032-CON-1 | Allowed / Prohibited | Member added / member removed | TC-260 | additive / breaking |
| FR-033-CON-1 | Allowed | Same toolchain on two hosts | TC-264 | Byte-identical |
| FR-033-CON-2 | Prohibited | Normalization weakened instead of removed | TC-266 | Fail review |
| FR-034-CON-1 | Prohibited | Grammar property with no lowering row | TC-267 | Fail completeness |
| FR-034 UnitSymbol | Allowed | `kg`, `m/s`, `ms`, `10*3.m` | TC-270 | Pass |
| FR-034 UnitSymbol | Prohibited | ``, `k g`, `kg²` | TC-270 | Fail pattern |
| Multiplicity (grammar) | Inverted | `lower: 1, upper: 0` | TC-277 | Reader rejects at the declaration |
| Multiplicity (grammar) | Min / Below min | `lower: 0` / `lower: -1` | TC-263 | Pass / fail `Multiplicity.json` |
| FR-030-CON-1 | Allowed | `contractVersion: "1.0.0"` with the v1 dialect constant under the v1 schema | TC-231 | Pass |
| FR-030-CON-2 | Prohibited | Manifest and target-contract enumerations diverge | TC-230 | Schema inspection fails |
| FR-040-CON-2 | Allowed | `retain`, `rewrite`, `replace-with-official`, `discard` | TC-322 | Inventory test passes |
| FR-040-CON-2 | Prohibited | A fifth disposition value such as `defer` | TC-323 | Inventory test fails |
| FR-040-CON-1 | Allowed | A `partial` capability whose limitation is restated | TC-329 | Inventory test passes |
| FR-040-CON-1 | Prohibited | A `partial` capability whose limitation is dropped | TC-329 | Inventory test fails |
| FR-040-CON-4 | Prohibited | A promoted component listed only under `authored` | TC-330 | Inventory test fails |
| FR-041 export set | Min / Above max | Exactly six exports / a seventh export | TC-331, TC-332 | Pass / fail the export-set assertion |
| FR-041-CON-3 | Allowed | `@typespec/compiler` pinned to `1.15.0` | TC-346 | Dependency inspection passes |
| FR-041-CON-3 | Prohibited | A caret or upper-bounded `@typespec/*` range | TC-346, TC-388 | Dependency inspection fails |
| FR-041-CON-4 | Prohibited | Any added `dependencies` entry | TC-347, TC-394 | Dependency inspection fails |
| FR-042-CON-1 | Allowed | Backends recorded as representative-slice-only | TC-358 | Inventory test passes |
| FR-042-CON-1 | Prohibited | A backend described as production-qualified | TC-358 | Inventory test fails |
| FR-042-CON-4 | Prohibited | Any regenerated issue #4 golden | TC-359 | Branch diff fails |
| FR-042 base chain | Min / Above max | Declared base present / absent, and a cycle | TC-353, TC-354 | Pass / throw naming the base or the cycle |
| FR-043-CON-1 | Allowed | A schema with none of the three forbidden keys | TC-364 | Adapter returns the normalized document |
| FR-043-CON-1 | Prohibited | `x-python-import`, `customTypePath`, `default_factory`, nested or top level | TC-362, TC-363 | Adapter throws naming the key |
| FR-044-CON-1 | Allowed | One changed retained-evidence field | TC-371, TC-384 | Retained-evidence diff passes |
| FR-044-CON-1 | Prohibited | Any second changed retained-evidence byte | TC-371, TC-384 | Retained-evidence diff fails |
| FR-044-CON-2 | Prohibited | A regenerated `Cargo.lock` | TC-372 | Branch diff fails |
| FR-044-CON-3 | Prohibited | Any `file:` or `link:` dependency specifier | TC-376, TC-388 | Dependency inspection fails |
| NFR-018-AC-3 | Allowed | Packed-file delta confined to `src/compiler/**` | TC-392 | Packed-file comparison passes |
| NFR-018-AC-3 | Prohibited | Any other added tarball path | TC-392 | Packed-file comparison fails |
| FR-046-AC-6 | Allowed | `@multiplicity(0)` and `@multiplicity(0, 0)` | TC-603 | Bounds accepted at the lower boundary |
| FR-046-AC-7 | Prohibited | `@multiplicity(2, 1)` | TC-438 | `INVALID_MULTIPLICITY` at the decorator locus |
| FR-053-AC-4 | Allowed | `@minLength(0)` | TC-604 | `minLength` operand `0` emitted |
| FR-053-AC-4 | Prohibited | A negative length operand | TC-604 | `INVALID_DECORATOR_ARGUMENT`, no constraint emitted |
| FR-049-AC-8 | Allowed | `maxDiagnostics` of 1 | TC-605 | One diagnostic plus `DIAGNOSTIC_LIMIT_REACHED` |
| FR-049-AC-8 | Prohibited | `maxDiagnostics` of 0 | TC-605 | Refused below the schema minimum, exit `2` |
| NFR-020-AC-1 | Allowed | Graph depth equal to `maxDepth` | TC-606 | Compile completes |
| NFR-020-AC-1 | Prohibited | Graph depth one past `maxDepth` | TC-606 | Blocking limit diagnostic naming the limit |
| NFR-020-AC-9 | Allowed | Input of exactly `maxInputBytes` | TC-607 | Document parsed |
| NFR-020-AC-9 | Prohibited | Input one byte over `maxInputBytes` | TC-607 | Blocking limit diagnostic, no parse |
| FR-049-AC-10 | Allowed | A 120-character input string in a message | TC-608 | String survives intact |
| FR-049-AC-10 | Prohibited | A 121-character input string in a message | TC-608 | String truncated to 120 characters |
| FR-052-CON-1 | Allowed | Exactly fifteen exported symbols | TC-563 | Export-set assertion passes |
| FR-052-CON-1 | Prohibited | A sixteenth exported symbol | TC-563 | Export-set assertion fails |
| FR-053-CON-2 | Allowed | Exactly fifteen declared decorators | TC-412 | Vocabulary assertion passes |
| FR-053-CON-2 | Prohibited | A sixteenth declared decorator | TC-412 | Vocabulary assertion fails |

## State Transition Matrix

| Initial State | Event | Required State | Test Case |
|---|---|---|---|
| provisional | named evidence gate passes and decision is accepted | normative | TC-002, TC-003 |
| provisional | evidence gate has not passed | provisional | TC-003, TC-036 |
| normative | successor ADR is accepted | historical with one current successor | TC-004 |
| historical chain | a successor points to its predecessor | validation failure | TC-053 |
| blocked migration | all named gates pass and a human promotes it | eligible for later implementation | TC-028, TC-037 |
| contract `1.1.0` document | read by a `1.0.0` reader | `1.0.0` projection with every dropped identity declared as loss | TC-533, TC-544 |
| contract `1.0.0` document | read by a `1.1.0` reader with a declared dialect | `1.1.0` projection with multiplicity derived from presence and empty loss | TC-534 |
| contract `1.0.0` document | read by a `1.1.0` reader with no declared dialect | blocking `MISSING_TARGET_DIALECT`, no document | TC-539 |
| contract `1.0.0` document | projected to `1.1.0` and back | byte-identical `1.0.0` document | TC-535, TC-612 |
| fresh lock | a source byte changes | `STALE_LOCK_PACKAGE` at the package entry locus | TC-481, TC-613 |
| fresh lock | a manifest byte changes | `STALE_LOCK` at the fingerprint locus | TC-481 |
| resolved graph | a package is added or removed | `LOCK_GRAPH_MISMATCH` naming the identity | TC-481 |
| pinned input | pre-sign-off refresh finds no contract-affecting drift | evidence remains current | TC-058, TC-075 |
| pinned input | pre-sign-off refresh finds contract-affecting drift | affected evidence invalid until refreshed | TC-058, TC-075 |
| suspected consumer | source evidence confirms consumer | known consumer with revised confidence | TC-087 |
| suspected consumer | evidence remains inconclusive | explicit unknown with consequence | TC-061, TC-087 |
| TypeSpec candidate | P0 capabilities pass under the ADR rule | recommended, still provisional | TC-119..120 |
| TypeSpec candidate | official emitter defect found | partial with tracked defect | TC-128 |
| provisional ADR-0004 | owner records the decision | historical; ADR-0005 normative | TC-121, TC-122, TC-129 |
| proposed v1 contract | owner records the structural-source decision (ADR-0005) | contract becomes eligible for merge, not implementation | TC-130, TC-199 |
| unlocked package graph | successful deterministic resolution | immutable transitive lock | TC-141..142 |
| locked package graph | any identity/version/digest conflict | failed resolution with all loci | TC-142 |
| known extension capability | no-op dynamic/static processing | payload preserved according to profile | TC-144, TC-194 |
| unknown required capability | load or compile attempt | explicit unsupported diagnostic and no target output | TC-193 |
| current legacy manifest | legacy profile validation | accepted unchanged and advisory | TC-173 |
| legacy manifest | later human enforcement promotion | native v1 validation may become required in the later ticket | TC-173, TC-198 |
| v1 IR document | read under the v1.1 schema | valid, with multiplicity derived and node arrays empty | TC-208, TC-217 |
| v1.1 IR document | read under the v1 schema | rejected as an unknown contract version (FR-019-CON-2) | TC-133, TC-231 |
| semantic-core `v1` | grammar addition under `Versions.v2` | `v1` projection byte-identical; `v2` additive | TC-253 |
| raw official bundle | #31 normalization applied | absolute `$id` bundle that validates without alias | TC-262, TC-265 |
| normalized bundle | issue #31 fixed upstream | normalization removed; raw bundle validates | TC-266 |
| prototype component in `spikes/` | promotion inventory records a disposition | owned `src/compiler/` module or an explicit non-promotion | TC-320, TC-324, TC-327 |
| spike emitter package present | promotion removes the `file:` dependency | spike replays through `src/compiler/` and stays byte-identical | TC-371, TC-375, TC-377 |
| promoted compiler on the branch | every changed path is restored from `origin/main` | the spike emitter returns as the only generator | TC-395 |
| committed Rust lockfile | crates.io index publishes a newer transitive crate | seeded lockfile keeps the retained bytes and the check unaffected | TC-372, TC-373, TC-387 |
| retained evidence | promotion supersedes a `capabilities.json` claim | claim stays as the historical record; the doc carries the superseding note | TC-381, TC-389 |

## Error Paths

| Error ID | Invalid Condition | Expected Result | Test Case |
|---|---|---|---|
| ERR-001 | Indexed artifact has no status or multiple statuses | Validation fails | TC-002, TC-040 |
| ERR-002 | Provisional artifact has no resolution gate | Validation fails | TC-003 |
| ERR-003 | Lossy transform omits declaration or provenance | Validation fails | TC-024 |
| ERR-004 | Known conflict omits a disposition | Review fails | TC-030, TC-041 |
| ERR-005 | Disruptive step omits a human promotion gate | Review fails | TC-028 |
| ERR-006 | A spike report adds a pass condition the ADR does not state | Review fails | TC-026, TC-036 |
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
| ERR-020 | Report marks a partial/failing P0 result as pass | Recommendation validation fails | TC-119..120, TC-126 |
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
| ERR-032 | Field `presence` contradicts its multiplicity, or `upper < lower` | Validation fails at the field locus | TC-205, TC-206 |
| ERR-033 | `unit` declared on a non-scalar field | Validation fails at the field locus | TC-207 |
| ERR-034 | Relationship category outside the FR-040 closed set, or on a non-record type | Validation fails at the relationship locus | TC-211, TC-216 |
| ERR-035 | Operation pre/post references an absent clause identity | Validation fails at the operation locus | TC-213 |
| ERR-036 | Clause language is a bare unknown token | Validation fails at the clause locus | TC-215 |
| ERR-037 | Constraint keyword unknown or operands malformed for the keyword | Validation fails at the constraint locus | TC-220..222 |
| ERR-038 | `source.dialect` carries the retired JSON Schema constant on a v1.1 document | Validation fails citing ADR-0005 | TC-228 |
| ERR-039 | Manifest names a target outside the shared enumeration | Validation fails at the target entry | TC-229 |
| ERR-040 | Relationship `target` resolves to nothing in the document or lock | Validation fails at the relationship locus | TC-239 |
| ERR-041 | Composite relationship graph contains a cycle | Validation fails at the closing relationship | TC-240 |
| ERR-042 | Duplicate `clauseId` within one type definition | Validation fails at the second clause | TC-241 |
| ERR-043 | Constraint keyword applied outside its applicability, or regex fails to compile | Validation fails at the constraint locus | TC-244, TC-245 |
| ERR-044 | `contractVersion` outside `1.0.0`/`1.1.0`, or `1.1.0` dialect outside `typespec`/`spec-bundle` | Fails before emission with a machine-readable diagnostic | TC-246 |
| ERR-045 | Kernel declares a domain archetype or an `Any` scalar | Scope test fails naming the declaration | TC-249, TC-258, TC-273 |
| ERR-046 | Emitted projection differs from committed bytes | `check` script exits non-zero naming the file | TC-264 |
| ERR-047 | `Decimal` `TypeRef` without `decimal`, or `decimal` on a non-Decimal target | Semantic-core reader rejects at the declaration | TC-256, TC-277 |
| ERR-048 | Lowering row records `loss` | Fixture gate fails | TC-272 |
| ERR-049 | `UnitSymbol` outside the UCUM charset, or `unit` on a non-unit scalar or on `returns` | Pattern validation or reader rejects | TC-270, TC-277 |
| ERR-050 | Duplicate field/operation/param name, relation (verb, target), enum value, or clauseId | Reader rejects at the second declaration | TC-277 |
| ERR-051 | An inventory record names a disposition outside the closed set, a missing target, or an empty limitation | Inventory test fails naming the record | TC-323, TC-324, TC-325, TC-326 |
| ERR-052 | A file under `src/compiler/` is owned by no inventory record | Inventory test fails naming the file | TC-327 |
| ERR-053 | The compiler entrypoint fails to compile | `compileSemanticIr` rejects with the diagnostics and writes no output | TC-334 |
| ERR-054 | The IR names a base model absent from the same document, or a base cycle | The backend throws naming the base or the cycle | TC-353, TC-354 |
| ERR-055 | The JSON Schema carries an executable extension key at any depth | The adapter throws naming the key and produces no output | TC-362, TC-363 |
| ERR-056 | A second retained-evidence byte changes | Retained-evidence diff fails; the change is a defect, not a rebaseline | TC-371, TC-384 |
| ERR-057 | A `file:` or `link:` specifier remains after the promotion | Dependency inspection fails | TC-376, TC-388 |
| ERR-058 | No committed `Cargo.lock` while the runner is in `--check` mode | The runner exits non-zero naming the missing lockfile | TC-374 |
| ERR-059 | The branch changes a path the isolation allowlist does not cover | TC-123/TC-124 fail naming the path | TC-379, TC-390 |
| ERR-060 | The declarations in `index.d.mts` drift from `index.mjs` | `tsc --noEmit` fails | TC-344 |
| ERR-061 | A caller names a source dialect outside the closed vocabulary | `selectFrontend` throws a `TypeError` naming the permitted set | TC-399 |
| ERR-062 | A caller names the registered but unimplemented `spec-bundle` dialect | One blocking `FRONTEND_NOT_IMPLEMENTED` naming issue #36 | TC-400 |
| ERR-063 | A TypeSpec declaration extends a built-in scalar outside the mapping | `UNSUPPORTED_SCALAR_BASE` at the declaration locus | TC-434 |
| ERR-064 | A declaration matches no row of the structural-kind table | `UNSUPPORTED_DECLARATION` at the declaration locus | TC-433 |
| ERR-065 | `@collection` is applied to a single-valued property | `FLAGS_ON_NON_COLLECTION` at the decorator locus | TC-438, TC-599 |
| ERR-066 | `@multiplicity` declares an upper bound below its lower bound | `INVALID_MULTIPLICITY` at the decorator locus | TC-438 |
| ERR-067 | `@multiplicity` contradicts the property's own optionality | `MULTIPLICITY_CONTRADICTS_OPTIONALITY` at the decorator locus | TC-438 |
| ERR-068 | `@unit` is applied to a field that does not resolve to a scalar | `UNIT_ON_NON_SCALAR` at the decorator locus | TC-439 |
| ERR-069 | `@defaultKind` is applied to a property with no declared default | `DEFAULT_KIND_WITHOUT_VALUE` at the decorator locus | TC-440 |
| ERR-070 | A decorator argument fails its declared shape or pattern | `INVALID_DECORATOR_ARGUMENT` at the decorator locus | TC-415 |
| ERR-071 | A single-valued decorator is applied twice to one target | `DUPLICATE_DECORATOR` at the second locus | TC-414 |
| ERR-072 | A constraint keyword is not applicable to its resolved subject | `CONSTRAINT_NOT_APPLICABLE` from the reader; from the frontend, TypeSpec's own `decorator-wrong-target` refuses the application first | TC-422, TC-600 |
| ERR-073 | Two declarations mint the same semantic identity | `DUPLICATE_IDENTITY` at the later locus, earlier as related | TC-421 |
| ERR-074 | Two distinct names slug to one identity | `UNSLUGGABLE_NAME` at the later locus | TC-421 |
| ERR-075 | A `@pre` or `@post` names an undeclared `clauseId` | `DANGLING_CLAUSE_REF` at the decorator locus | TC-422 |
| ERR-076 | A declaration carries a datum the IR has no member for | `UNSUPPORTED_LOSS` at the declaration locus, no document written | TC-425 |
| ERR-077 | A declaration's source file lies beneath no declared root | `SOURCE_OUTSIDE_PACKAGE` at the declaration locus | TC-448 |
| ERR-078 | A compiled package's sources import a JavaScript module | `UNTRUSTED_MODULE`; the injected host never delegates | TC-448, TC-582 |
| ERR-079 | A manifest, mapping, or profile fails its published schema | One `INVALID_MANIFEST`/`INVALID_MAPPING`/`INVALID_PROFILE` per error at the failing pointer | TC-461, TC-610 |
| ERR-080 | An imported package identity is supplied by no search directory | `IMPORT_NOT_FOUND` at the import entry locus | TC-463 |
| ERR-081 | No candidate for an identity satisfies its constraint | `IMPORT_VERSION_UNSATISFIED` naming the versions found | TC-463 |
| ERR-082 | Two manifests constrain one identity and no candidate satisfies both | One `IMPORT_VERSION_CONFLICT` naming every requiring locus | TC-457 |
| ERR-083 | Two selected entries for one identity carry different digests | `DIGEST_CONFLICT` naming both digests and both loci | TC-458 |
| ERR-084 | An import names an absent, private, or uncapable export | `IMPORT_EXPORT_MISSING`, `IMPORT_EXPORT_PRIVATE`, or `IMPORT_CAPABILITY_MISSING` | TC-463 |
| ERR-085 | The import graph contains a cycle | One `PACKAGE_CYCLE` per back edge, starting at the least identity | TC-459, TC-616 |
| ERR-086 | A type identity is exported twice in one graph | `DUPLICATE_EXPORT` at the second declaring locus | TC-465 |
| ERR-087 | A version constraint is neither exact nor caret | `UNSUPPORTED_VERSION_CONSTRAINT`, no interpretation | TC-466 |
| ERR-088 | A resolved or imported path escapes its declared root | `PATH_ESCAPE`, no read | TC-467, TC-581 |
| ERR-089 | A selected profile names an unknown profile, mapping, or target | `UNKNOWN_PROFILE`, `UNKNOWN_MAPPING`, or `UNKNOWN_TARGET` | TC-464 |
| ERR-090 | A strict profile selects a mapping declaring lossy preservation | `UNDECLARED_LOSS` at the mapping locus | TC-464 |
| ERR-091 | A supplied lock's fingerprint, package digest, graph, or canonicalization disagrees | `STALE_LOCK`, `STALE_LOCK_PACKAGE`, `LOCK_GRAPH_MISMATCH`, or `UNSUPPORTED_CANONICALIZATION` | TC-481, TC-613 |
| ERR-092 | A module asks for a diagnostic code the registry does not declare | `diagnostic` throws; it is a compiler defect, not an input defect | TC-492 |
| ERR-093 | The diagnostic count exceeds `maxDiagnostics` after sorting | Truncation plus the non-blocking `DIAGNOSTIC_LIMIT_REACHED` | TC-499, TC-505, TC-605 |
| ERR-094 | An emitted or read IR document fails its published schema | Blocking `INVALID_IR` naming the pointer, no file written | TC-517, TC-519, TC-611 |
| ERR-095 | An IR document breaks a cross-field rule of the code table | The rule's own `agent-ix.semantic-ir.*` code | TC-520 |
| ERR-096 | A projection to `1.1.0` declares no dialect, or names an unknown version | `MISSING_TARGET_DIALECT` or `UNKNOWN_CONTRACT_VERSION`, no document | TC-539 |
| ERR-097 | A manifest declares two profiles and the caller names none | `AMBIGUOUS_PROFILE` and exit `1` | TC-552 |
| ERR-098 | An unknown command, unknown flag, missing flag, or unreadable `--limits` | Usage text and exit `2` | TC-557 |
| ERR-099 | An input exceeds one of the four size limits | A distinct blocking limit diagnostic naming the limit | TC-579, TC-587, TC-606 |

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
| EC-027 | Required field (`lower ≥ 1`) that is also `nullable: true` | FR-027 | TC-203, TC-205 | Multiplicity is mistaken for nullability and one state is lost |
| EC-028 | Self-referential relationship (`parent : ConfigVersion[0..1]`) | FR-028 | TC-210, TC-218, TC-240 | Recursive edge flattened or rejected as a cycle |
| EC-029 | Two clauses with the same `clauseId` in different languages on one type | FR-028 | TC-241 | Operation pre/post binds to the wrong clause |
| EC-030 | A v1 fixture already using a free-form keyword | FR-029 | TC-224 | Closing the vocabulary silently invalidates accepted evidence |
| EC-031 | Target enumeration extended in one schema but not the other | FR-030 | TC-230 | Manifest accepts a target no contract defines |
| EC-032 | Shared `Record<string>` helper emitted with a relative `$id` (issue #31) | FR-033 | TC-262, TC-265 | Bundle validates on one namespace and fails on another |
| EC-033 | `TypeRef` to a `SemanticId` that names a kernel scalar's own identity | FR-034 | TC-268, TC-271 | Scalar double-declared as reference and kernel type |
| EC-034 | `OperationDecl` `pre` references a clause the extractor has not yet supplied text for | FR-034 | TC-268 | Lowered document dangles until extraction |
| EC-035 | Module vocabulary smuggled in as a "support type" | NFR-014 | TC-249, TC-273 | Kernel grows into the generic entity class ARCH-005 forbids |
| EC-036 | Constraint on a field whose kernel scalar is shared by other fields | FR-034 | TC-268, TC-269 | `min` on one field constrains every `Integer` unless a per-field alias is minted |
| EC-037 | Official emitter is not version-aware | FR-031, FR-033 | TC-253 | A `@versioned` claim cannot be evidenced; package semver carries the version instead |
| EC-038 | The promoted emitter changes the generator identity stamped into the frozen spike IR | FR-044 | TC-338, TC-339, TC-371 | The frozen issue #4 record is silently rebaselined and stops being historical evidence |
| EC-039 | An unpinned transitive Rust crate publishes a new version | NFR-017, FR-044 | TC-372, TC-373, TC-387 | The retained-evidence gate goes red for reasons unrelated to any change, inviting a rebaseline |
| EC-040 | A prototype component is promoted because its one representative golden passed | FR-040, FR-042 | TC-326, TC-358 | Unmeasured recursion, generics, or version transitions misgenerate consumer contracts |
| EC-041 | The promotion is landed alongside a package publication or consumer move | NFR-018 | TC-390, TC-396 | A later compiler defect cannot be backed out without a consumer migration |
| EC-042 | A backend writes files, so a package ticket must edit the backend to change layout | FR-042 | TC-352 | Layout policy leaks into the generator and each target ticket forks it |
| EC-043 | The Python adapter's forbidden-key list is narrowed to make a schema pass | FR-043 | TC-362, TC-363 | Caller-controlled Python reaches the generated models |
| EC-044 | The host's ICU data orders type ids differently from the minting host | NFR-017, FR-041 | TC-342, TC-385 | Every downstream golden and the retained fingerprint flip on a different host |
| EC-045 | The compiler is invoked from a directory other than the repository root | NFR-017, FR-041 | TC-341, TC-386 | Absolute host paths are written into the IR with every gate green |
| EC-046 | The retained evidence records the minting host's own tool versions | NFR-017, FR-044 | TC-370, TC-389 | The gate can only ever pass on one workstation (issue #42) |
| EC-047 | A base-model chain in the IR forms a cycle | FR-042 | TC-354 | The backend recurses until the stack is exhausted |
| EC-048 | `package.json` `files` already ships `src/`, so promoted code enters the tarball | NFR-018 | TC-391, TC-392 | The published artefact grows while the export-surface check stays green |
| EC-049 | Exactly one frontend is implemented, so cross-dialect agreement cannot be observed | FR-045 | TC-402, TC-601 | Single-dialect runs are reported as cross-frontend equivalence they never demonstrated |
| EC-050 | A package declares one type and no imports | FR-046 | TC-614 | The resolver's empty-graph path is never exercised |
| EC-051 | An import graph is a diamond, reaching one package by two routes | FR-047 | TC-615 | The package resolves twice, or its digest is compared against itself |
| EC-052 | Two cycles share an edge | FR-047 | TC-616 | One cycle masks the other, or the same cycle is reported twice |
| EC-053 | A relationship target resolves to an imported export rather than a document type | FR-050 | TC-521, TC-617 | A valid cross-package edge is reported as unresolved |
| EC-054 | An alias chain closes on itself | FR-050 | TC-518 | The reader recurses until the stack is exhausted |
| EC-055 | Two IR documents are identical, so the diff has no change to report | FR-051 | TC-532 | The report violates its own `minItems: 1` on `changes` |
| EC-056 | A diff is asked for families it was given no input for | FR-051 | TC-530, TC-542 | An unclassifiable family is silently reported as `patch` |
| EC-057 | A package name or identity is adversarially long, or slugs to a colliding code | FR-049, FR-053, NFR-020 | TC-501, TC-420, TC-588 | Diagnostic output is flooded, or a derived code fails its own pattern |
| EC-058 | The host enumerates a package directory in a different order | NFR-019 | TC-571 | Two hosts disagree on the IR while both call themselves deterministic |
| EC-059 | A declaration reached through an imported package has no root-relative path | FR-046 | TC-449 | A locus carries `..`, which `sourceLocus.path` forbids, or the origin is invented |
| EC-060 | The compiler's own lowering emits a document that fails the published schema | FR-046, FR-050 | TC-450, TC-517 | An invalid document is written and every downstream golden inherits it |
| EC-061 | A compile fails after `--out` already holds a previous run's document | FR-049, FR-052 | TC-500, TC-549 | A stale document is read as the failed run's output |
| EC-062 | `inspect` is given a document whose imported exports it cannot see | FR-050, FR-052 | TC-521, TC-555 | Every cross-package relationship is reported as unresolved, or the check is silently skipped |

## Coverage Gaps

Issue #27's 78 cases (TC-320..397) are mapped; 76 pass and TC-370 and TC-382
are blocked on issue #42, which records three host couplings in the retained
issue #4 evidence; issue #27 repairs only the lockfile seeding, which changes no
retained byte. No open mapping gap remains for issues #8, #10, #4, #9, #34, or #35. Issue #35's
32 cases (TC-248..279) pass; TC-279 reuses both IR v1.1 readers. Issue #34's 45 cases (TC-203..247) pass; TC-233 uses a seeded in-test generator (no library
dependency was added). The 41 issue #4 cases
pass through the isolated spike, retained evidence, native consumers, and
source-selection report. Issue #9 has 72 passing contract-conformance cases and
its manual merge gate, TC-199, is recorded. Production compiler, consumer,
database, publication, enforcement, and retirement work remains separately gated.

Issue #19's 222 cases (TC-398..619) pass and cover the frontend seam, the TypeSpec
lowering, package resolution, locks and fingerprints, the diagnostic registry,
IR validation and normalization, the compatibility diff and evolution
projections, and the three commands, under determinism, safety, and
non-disruption. One known limit is recorded rather than papered over: TC-402 and
TC-601 exercise the shared fixture harness with exactly one implemented
dialect, so they demonstrate that the harness runs and that a single-dialect
case is reported as such — not cross-frontend equivalence, which needs the
spec-bundle frontend of issue #36. The issue #19 acceptance criterion
"independent frontend fixtures produce equivalent IR where semantics agree" is
therefore partially satisfied by construction and completes with #36.

## Test Execution Summary

| Category | Total | Passed | Failed | Blocked | Coverage |
|---|---|---|---|---|---|
| Static | 180 | 180 | 0 | 0 | 100% mapped (180/180) |
| Manual | 45 | 44 | 0 | 1 | 100% mapped (45/45) |
| Analysis | 17 | 17 | 0 | 0 | 100% mapped (17/17) |
| Property | 43 | 43 | 0 | 0 | 100% mapped (43/43) |
| Unit | 230 | 230 | 0 | 0 | 100% mapped (230/230) |
| Integration | 37 | 36 | 0 | 1 | 100% mapped (37/37) |
| Fuzz | 7 | 7 | 0 | 0 | 100% mapped (7/7) |
| Snapshot | 17 | 17 | 0 | 0 | 100% mapped (17/17) |
| Compile | 3 | 3 | 0 | 0 | 100% mapped (3/3) |
| **Total** | **579** | **577** | **0** | **2** | **100% mapped (579/579)** |

**Matrix coverage status: ✅ Complete. Execution status: ✅ 577 of 579 passed. TC-199 is recorded by the owner decision on issue #4; TC-370 and TC-382 remain blocked on issue #42 (the retained issue #4 evidence records the minting host's own tool versions). TC-398..619 pass on the issue #19 branch, measured with `make test`: 299 vitest cases across 9 files. The `Coverage` column is measured by `scripts/test-matrix-summary.mjs`, which counts the rows naming an id a spec artifact declares; it was a string literal before issue #19's code review (SR-073 FND-658). The `Blocked` column counts every row whose status is not ✅.**