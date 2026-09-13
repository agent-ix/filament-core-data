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
Issue #20 (TC-280..319 and TC-622..643) adds the semantic conformance corpus, its independent
differential oracle, and the harness that judges every declared backend against
that oracle rather than against another backend.
Issue #27 (promotion of the issue #4 prototype emitters into `src/`) is mapped at
TC-320..397. Three of its cases (TC-370, TC-373's full-replay half, and the
end-to-end retained-evidence run) depend on the host floor recorded in issue #42
and are marked blocked rather than passed. Issue #27 reserved TC-280..319,
FR-035..039, NFR-015..016 and US-008 for the parallel issue #20
conformance-corpus branch, which allocated them first; issue #20's remaining 22
rows continue at TC-398 after issue #27's highest. The Static and Snapshot counts in the Test Execution Summary were off by
one each before this revision (110/6 recorded against 111/5 actual) and are now
computed from the rows.
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
Issue #22 (the TypeScript semantic codegen and validator backend) is mapped at
TC-745..844. Its ids were allocated as an exclusive range against `main` at
c1b8807 rather than as the next free block, because issues #21 and #23 are
authored in parallel on branches this one cannot see and "next free" is not a
fact any one branch can establish: US-012, FR-063..071, NFR-024..025,
TC-745..844, SR-087..096, and FND-1000..1099 belong to issue #22 alone. Every
issue #22 row carries `🚧` until the implementation lands and the three
verification states are measured, so the `Blocked` column counts all 100 of them
until then; a `✅` on an unimplemented row would be the one thing this matrix
exists to prevent.
The issue #22 bundle was then revised in the composite review pass recorded at
SR-087..SR-094, which added 73 acceptance criteria and named constraints across
FR-063..FR-071, NFR-024 and NFR-025. The hundred rows were reconciled against the
revised criteria rather than extended with new ids: the range is exclusive and
exhausted, so a criterion joins the row whose test would decide it and that row's
title was rewritten to say so. Fifty-four rows changed. Several rows also had to
be corrected rather than merely widened — the emitted file set became eight files
rather than seven, the bundler-based surface measurement became a static
reachable-symbol walk because no bundler resolves in this repository, the
validator's instance evidence moved from payloads the conformance corpus does not
carry to an authored instance corpus checked differentially against the pinned
`ajv`, the corpus-wide `unmetCases` absolutes became this slot's own delta, and
the compatibility-case count was corrected from five to twenty-five.

One vocabulary mismatch is recorded here rather than left to be discovered. The
`Verification` column of a requirement's acceptance-criteria table and the `Type`
column of a matrix row are different vocabularies: `Test` is a legitimate
`Verification` value throughout this bundle and is not a matrix `Type`, which
`scripts/test-matrix-summary.mjs` rejects. Where the two differ, the row's `Type`
names what actually makes the test fail. A row absorbing several criteria of
different kinds carries one `Type`, so the mapping is many-to-one by
construction; SR-090 FND-1033 raised that it was recorded nowhere, and this
paragraph is where it is now recorded.

Issue #21 (the Rust/Serde semantic codegen backend) is mapped at TC-645..744.
Its rows land `🚧 planned` and are flipped as the implementation lands, so the
`Blocked` column carries them until they pass. Its ids were allocated against
`main` at c1b8807, and the parallel issue #22 and #23 backend branches allocate
US, FR, NFR, TC and SR ids from their own reserved ranges, so `spec/tests.md`
conflicts between the three branches are resolved by keeping every id block, not
by renumbering. TC-682 and TC-683 are the rows that carry GAP-002: the published
`sourceLocus.path` pattern uses four ECMAScript lookaheads no RE2-family engine
can compile, and the resolution is a hand-written validator proved equivalent to
the published language by differential harness — not a weakened pattern and not
an unvalidated `String`. TC-710 records the GAP-011 dependency on issue #9 rather
than deciding it.
Issue #36 (the spec-bundle extraction frontend, TC-1200..1354) is mapped
against US-015, FR-091..FR-099 and NFR-031..NFR-033 as revised by the
composite review, its ids reserved as an exclusive range against `main` at
3b75e01 because PR #84 is open in parallel and "next free" is not a fact
either branch can establish. Of its 155 rows (TC-1200..1354), 151 are `✅`
after the Plan-014 delivery, the SR-169/SR-170 fix pass (CR-036-9), and the
shared-identity implementation (CR-087-1). Two are `🚧`: TC-1316 is blocked on
issue #89, and TC-1317 is blocked in the rehearsal's scratch-clone environment.
TC-1337 passed when issue #85 delivered the JSON Schema backend. TC-1292 passed when issues
#88 and #90 closed, and FR-130 gave its Rust half the generic command line.
Nine rows are `Static` evidence produced by `make extraction-frontend-evidence`,
the crate's `--ignored` run; seven pass under it and TC-1316/TC-1317 remain
blocked as stated above.

Issue #95 (the provisional baseline 1.2 producer contract) reserves
TC-1373..1387 after checking every live branch for those unused ids. They are
planned contract controls, not evidence that a producer, schema, reader, or
evaluator exists. They cover FR-106..111's authored-presence, relationship,
population/availability, configuration, locked-inventory, and mixed-version
impact obligations. #93 remains parked until the affected contracts and its
producer/schema plan are accepted.

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
| StR-001 | US-001..US-010, US-012, US-013, US-015, FR-001..FR-053, FR-063..FR-080, FR-091..FR-111 | TC-033, TC-086, TC-129, TC-130..644, TC-745..944, TC-1200..1350, TC-1373..1387 | ⚠️ TC-370, TC-382 blocked on issue #42; TC-745..844 in progress on the issue #22 branch; TC-1373..1387 planned on #95 |

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
| US-006 | US-006-EX-1..4 (illustrative) implemented by FR-027..FR-030 and provisional FR-106..FR-108, FR-110..FR-111 | TC-203, TC-210, TC-214, TC-220, TC-1373..TC-1378, TC-1382..TC-1387 | 🚧 #95 controls planned |
| US-007 | US-007-EX-1..4 (illustrative) implemented by FR-031..FR-034 | TC-262, TC-271, TC-258, TC-277 | ✅ Complete |
| US-008 | US-008-EX-1..5 (illustrative) implemented by FR-035..FR-039 | TC-282, TC-303, TC-305, TC-304, TC-318 | ✅ Complete |
| US-009 | US-009-EX-1 (illustrative) implemented by FR-041 | TC-337, TC-343, TC-344 | ✅ Complete |
| US-009 | US-009-EX-2 (illustrative) implemented by FR-040 | TC-320, TC-326, TC-358 | ✅ Complete |
| US-009 | US-009-EX-3 (illustrative) implemented by FR-044 | TC-371, TC-378, TC-370 (blocked on issue #42) | ✅ Complete |
| US-009 | US-009-EX-4 (illustrative) implemented by NFR-018 | TC-390, TC-395, TC-396 | ✅ Complete |
| US-010 | US-010-EX-1 (illustrative) implemented by FR-052 and NFR-019 | TC-548, TC-567, TC-568 | ✅ Complete |
| US-010 | US-010-EX-2 (illustrative) implemented by FR-047 and FR-049 | TC-463, TC-500, TC-549 | ✅ Complete |
| US-010 | US-010-EX-3 (illustrative) implemented by FR-046-CON-1 and NFR-021 | TC-446, TC-451, TC-592 | ✅ Complete |
| US-010 | US-010-EX-4 (illustrative) implemented by FR-045 | TC-400, TC-402, TC-408 | ✅ Complete |
| US-010 | US-010-EX-5 (illustrative) implemented by FR-051 | TC-527, TC-528, TC-529 | ✅ Complete |
| US-012 | US-012-EX-1 (illustrative) implemented by FR-070 | TC-815, TC-819, TC-824 | 🚧 In progress |
| US-012 | US-012-EX-2 (illustrative) implemented by FR-068 and FR-065 | TC-802, TC-774 | 🚧 In progress |
| US-012 | US-012-EX-3 (illustrative) implemented by FR-064 and FR-066 | TC-760, TC-778, TC-779 | 🚧 In progress |
| US-012 | US-012-EX-4 (illustrative) implemented by FR-065 and FR-066 | TC-770, TC-786 | 🚧 In progress |
| US-012 | US-012-EX-5 (illustrative) implemented by FR-071 and NFR-024 | TC-826, TC-834 | 🚧 In progress |
| US-012 | US-012-EX-6 (illustrative) implemented by FR-065 and FR-067 | TC-773, TC-794 | 🚧 In progress |
| US-011 | US-011-EX-1..5 (illustrative) | TC-645..TC-744 | ✅ Complete |
| US-013 | US-013-EX-1 (illustrative) implemented by FR-074 and FR-078 | TC-865, TC-908, TC-930 | ✅ Complete |
| US-013 | US-013-EX-2 (illustrative) implemented by FR-077 | TC-896, TC-899, TC-900 | ✅ Complete |
| US-013 | US-013-EX-3 (illustrative) implemented by FR-075 | TC-873, TC-875, TC-880 | ✅ Complete |
| US-013 | US-013-EX-4 (illustrative) implemented by FR-076 and NFR-027 | TC-883, TC-940 | ✅ Complete |
| US-013 | US-013-EX-5 (illustrative) implemented by FR-079 and NFR-027 | TC-924, TC-942 | ✅ Complete |
| US-014 | US-014-EX-1 (illustrative) implemented by FR-085, FR-086, FR-087 | TC-1040..TC-1084 | 🚧 In progress |
| US-015 | US-015-EX-1 (illustrative) implemented by FR-093, FR-094 and FR-097 | TC-1221, TC-1231, TC-1239, TC-1279, TC-1284 | ✅ Complete |
| US-015 | US-015-EX-2 (illustrative) implemented by FR-093 and NFR-031 | TC-1220, TC-1302 | ✅ Complete |
| US-015 | US-015-EX-3 (illustrative) implemented by FR-092 and FR-096 | TC-1212, TC-1264, TC-1268 | ✅ Complete |
| US-015 | US-015-EX-4 (illustrative) implemented by FR-097, FR-098 and NFR-032 | TC-1289, TC-1314, TC-1340, TC-1341 | ✅ Complete |
| US-015 | US-015-EX-5 (illustrative) implemented by FR-091 | TC-1202, TC-1265 | ✅ Complete |
| US-015 | Provisional ecosystem configuration boundary implemented by FR-109 | TC-1379..TC-1381 | 🚧 #95 controls planned |
| US-015 | Issue #36 AC-5 (json-schema target) | TC-1337 | ✅ Complete |
| US-019 | US-019-EX-1 (illustrative) implemented by FR-130 | TC-1388, TC-1389 | ✅ Complete |
| US-019 | US-019-EX-2 (illustrative) implemented by FR-130 | TC-1390 | ✅ Complete |
| US-019 | US-019-EX-3 (illustrative) implemented by FR-130 | TC-1391 | ✅ Complete |
| US-019 | US-019-EX-4 (illustrative) implemented by FR-130 | TC-1392 | ✅ Complete |
| US-019 | US-019-EX-1, US-019-EX-2 (illustrative) implemented by FR-136 | TC-1530..TC-1536 | ✅ Complete |
| US-021 | US-021-EX-1..US-021-EX-4 (illustrative) implemented by FR-137 | TC-1537..TC-1544 | ✅ Complete |
| US-020 | US-020-EX-1, US-020-EX-2 (illustrative) implemented by FR-134 | TC-1431 | 🚧 planned on issue #6 |
| US-020 | US-020-EX-3, US-020-EX-5 (illustrative) implemented by FR-134 | TC-1430, TC-1432 | 🚧 planned on issue #6 |
| US-020 | US-020-EX-4 (illustrative) implemented by FR-135 | TC-1429 | 🚧 planned on issue #12 |

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
| FR-035 | FR-035-AC-1..10, FR-035-CON-1..3 | TC-280..289 | ✅ Complete |
| FR-036 | FR-036-AC-1..11, FR-036-CON-1..3 | TC-290..301 | ✅ Complete |
| FR-037 | FR-037-AC-1..11, FR-037-CON-1..3 | TC-302..313 | ✅ Complete |
| FR-038 | FR-038-AC-1..9, FR-038-CON-1..3 | TC-314..323 | ✅ Complete |
| FR-039 | FR-039-AC-1..9, FR-039-CON-1..3 | TC-626..634 | ✅ Complete |
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
| FR-063 | FR-063-AC-1..21, FR-063-CON-1..6 | TC-745..TC-754 | 🚧 In progress |
| FR-064 | FR-064-AC-1..22, FR-064-CON-1..7 | TC-755..TC-765 | 🚧 In progress |
| FR-065 | FR-065-AC-1..22, FR-065-CON-1..6 | TC-766..TC-775 | 🚧 In progress |
| FR-066 | FR-066-AC-1..29, FR-066-CON-1..9 | TC-776..TC-786 | 🚧 In progress |
| FR-067 | FR-067-AC-1..17, FR-067-CON-1..6 | TC-787..TC-794 | 🚧 In progress |
| FR-068 | FR-068-AC-1..26, FR-068-CON-1..8 | TC-795..TC-805, TC-1355, TC-1356 | 🚧 In progress |
| FR-069 | FR-069-AC-1..25, FR-069-CON-1..7 | TC-806..TC-814 | 🚧 In progress |
| FR-070 | FR-070-AC-1..20, FR-070-CON-1..8 | TC-815..TC-824 | 🚧 In progress |
| FR-071 | FR-071-AC-1..20, FR-071-CON-1..8 | TC-825..TC-833 | 🚧 In progress |
| FR-054 | FR-054-AC-1..15, FR-054-CON-1..6 | TC-645..TC-657, TC-674, TC-694, TC-740 | ✅ Complete |
| FR-055 | FR-055-AC-1..16, FR-055-CON-1..4 | TC-658..TC-665, TC-1357, TC-1358 | 🚧 In progress |
| FR-056 | FR-056-AC-1..17, FR-056-CON-1..8 | TC-666..TC-676 | ✅ Complete |
| FR-057 | FR-057-AC-1..14, FR-057-CON-1..6 | TC-677..TC-689 | ✅ Complete |
| FR-058 | FR-058-AC-1..12, FR-058-CON-1..5 | TC-690..TC-697 | ✅ Complete |
| FR-059 | FR-059-AC-1..15, FR-059-CON-1..6 | TC-698..TC-710 | ✅ Complete |
| FR-060 | FR-060-AC-1..15, FR-060-CON-1..7 | TC-711..TC-718 | ✅ Complete |
| FR-061 | FR-061-AC-1..13, FR-061-CON-1..7 | TC-719..TC-724 | ✅ Complete |
| FR-062 | FR-062-AC-1..15, FR-062-CON-1..7 | TC-725..TC-730, TC-1359 | 🚧 In progress |
| FR-072 | FR-072-AC-1..10, FR-072-CON-1..4 | TC-845..853, TC-944 | ✅ Complete |
| FR-073 | FR-073-AC-1..10, FR-073-CON-1..3 | TC-854..862 | ✅ Complete |
| FR-074 | FR-074-AC-1..11, FR-074-CON-1..3 | TC-863..872 | ✅ Complete |
| FR-075 | FR-075-AC-1..11, FR-075-CON-1..3 | TC-873..882 | ✅ Complete |
| FR-076 | FR-076-AC-1..14, FR-076-CON-1..5 | TC-883..894 | ✅ Complete |
| FR-077 | FR-077-AC-1..13, FR-077-CON-1..4 | TC-895..907, TC-944 | ✅ Complete |
| FR-078 | FR-078-AC-1..11, FR-078-CON-1..3 | TC-908..917 | ✅ Complete |
| FR-079 | FR-079-AC-1..11, FR-079-CON-1..4 | TC-918..926, TC-944 | ✅ Complete |
| FR-080 | FR-080-AC-1..9, FR-080-CON-1..3 | TC-927..935, TC-944 | ✅ Complete |
| FR-081 | FR-081-AC/CON x26 | TC-1000..TC-1008 | 🚧 In progress |
| FR-082 | FR-082-AC/CON x32 | TC-1009..TC-1019 | 🚧 In progress |
| FR-083 | FR-083-AC/CON x23 | TC-1020..TC-1027 | 🚧 In progress |
| FR-084 | FR-084-AC/CON x30 | TC-1028..TC-1037 | 🚧 In progress |
| FR-085 | FR-085-AC/CON x28 | TC-1038..TC-1047 | 🚧 In progress |
| FR-086 | FR-086-AC/CON x30 | TC-1048..TC-1057 | 🚧 In progress |
| FR-087 | FR-087-AC/CON x26 | TC-1058..TC-1066 | 🚧 In progress |
| FR-088 | FR-088-AC/CON x25 | TC-1067..TC-1075 | 🚧 In progress |
| FR-089 | FR-089-AC/CON x28 | TC-1076..TC-1085 | 🚧 In progress |
| FR-090 | FR-090-AC/CON x34 | TC-1086..TC-1097 | 🚧 In progress |
| FR-091 | FR-091-AC-1..11, FR-091-CON-1..3 | TC-1200..TC-1209, TC-1330, TC-1331 | ✅ Complete |
| FR-092 | FR-092-AC-1..11, FR-092-CON-1..2 | TC-1210..TC-1219, TC-1330, TC-1332 | ✅ Complete |
| FR-093 | FR-093-AC-1..14, FR-093-CON-1..4 | TC-1220..TC-1230, TC-1333..TC-1335, TC-1347 | ✅ Complete |
| FR-094 | FR-094-AC-1..15, FR-094-CON-1..4 | TC-1231..TC-1245 | ✅ Complete |
| FR-095 | FR-095-AC-1..16, FR-095-CON-1..3 | TC-1246..TC-1258, TC-1347, TC-1348, TC-1351..TC-1354 | ✅ Complete |
| FR-096 | FR-096-AC-1..16, FR-096-CON-1..3 | TC-1259..TC-1272, TC-1345, TC-1346 | ✅ Complete |
| FR-097 | FR-097-AC-1..16, FR-097-CON-1..3 | TC-1273..TC-1284, TC-1336, TC-1339..TC-1342 | ✅ Complete |
| FR-098 | FR-098-AC-1..12, FR-098-CON-1..3 | TC-1285..TC-1294, TC-1338, TC-1343, TC-1344 | ✅ Complete |
| FR-099 | FR-099-AC-1..6, FR-099-CON-1..3 | TC-1295..TC-1299, TC-1330, TC-1349 | ✅ Complete |
| FR-106 | FR-106-AC-1..5, FR-106-CON-1..2 | TC-1373, TC-1374 | 🚧 planned — #95 producer/schema boundary |
| FR-107 | FR-107-AC-1..3, FR-107-CON-1..2 | TC-1375 | 🚧 planned — #95 producer/schema boundary |
| FR-108 | FR-108-AC-1..5, FR-108-CON-1..2 | TC-1376..TC-1378 | 🚧 planned — #95 producer/evaluator boundary |
| FR-109 | FR-109-AC-1..5, FR-109-CON-1..2 | TC-1379..TC-1381 | 🚧 planned — #95 consumer boundary |
| FR-110 | FR-110-AC-1..4, FR-110-CON-1..2 | TC-1382..TC-1384 | 🚧 planned — IN01 implementation boundary |
| FR-111 | FR-111-AC-1..4, FR-111-CON-1..2 | TC-1385..TC-1387 | 🚧 planned — IN02 implementation boundary |
| FR-100 | FR-100-AC-1..6, FR-100-CON-1..3 | TC-1361..TC-1366 | ✅ Complete |
| FR-130 | FR-130-AC-1..8, FR-130-CON-1..3 | TC-1388..TC-1395 | ✅ Complete |
| FR-131 | FR-131-AC-1..8, FR-131-CON-1..3 | TC-1403..TC-1409 | ✅ Complete |
| FR-132 | FR-132-AC-1..7, FR-132-CON-1..3 | TC-1414..TC-1417 | 🚧 planned on issue #65 |
| FR-133 | FR-133-AC-1..7, FR-133-CON-1..3 | TC-1418..TC-1421 | 🚧 planned on issue #80 |
| FR-134 | FR-134-AC-1..7, FR-134-CON-1..3 | TC-1430..TC-1433 | 🚧 planned on issue #6 |
| FR-135 | FR-135-AC-1..7, FR-135-CON-1..3 | TC-1426..TC-1429 | 🚧 planned on issue #12 |

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
| NFR-015 | Provenance quote check, repeat/locale/directory byte comparison, oracle and harness import and effect analysis, divergence and contract-gap register inspection | TC-635..337 | ✅ Complete |
| NFR-016 | Changed-path gate, manifest diff, offline test run, publication analysis | TC-640..643 | ✅ Complete |
| NFR-017 | Repeat-run byte comparison, collator-independence check, explicit-baseDir check, lockfile seeding, retained-evidence branch diff, dependency-pin inspection | TC-383..389 | ✅ Complete |
| NFR-018 | Changed-path gate, manifest and packed-file comparison, licence inspection, restore rehearsal, publication inspection | TC-390..396 | ✅ Complete |
| NFR-019 | Repeat-run and varied-environment byte comparison, ambient-input analysis, permutation and collator independence, injected-host observation, changed-path gate, dependency-pin inspection | TC-567..TC-578 | ✅ Complete |
| NFR-020 | Limit enforcement, path-escape and module-load refusal, network and writer instrumentation, cyclic-input termination, fuzz run, message truncation | TC-579..TC-589, TC-606, TC-607 | ✅ Complete |
| NFR-021 | Changed-path gate, manifest comparison, frozen-path byte comparison, scripted restore rehearsal, licence and publication inspection, post-merge range rehearsal, accretion rehearsal | TC-590..TC-597, TC-620, TC-621, TC-644 | ✅ Complete |
| NFR-024 | NFR-024-AC-1..13: repeat-run, directory, and locale byte comparison; packed-artifact comparison after five normalized members; import-graph and dependency-closure analysis; backend purity test; SPDX, formatter no-op, strict-typecheck, and static reachable-symbol checks | TC-834..TC-838 | 🚧 In progress |
| NFR-025 | NFR-025-AC-1..15: changed-path gate with both ends from history, accretion and post-merge rehearsal, manifest and lockfile comparison against the range's base endpoint, export-set test, frozen-path, corpus and divergence-register byte comparison, packed-file listing, licence inspection, restore rehearsal | TC-839..TC-844 | 🚧 In progress |
| NFR-022 | Two-run and cross-environment byte comparison, ambient-input scan, dependency inspection, offline run, formatter check, table-driven degradation scan with fault injection, two-language number-format agreement, reader fuzz | TC-711, TC-712, TC-716, TC-731..TC-736 | ✅ Complete |
| NFR-023 | Changed-path gate over a range fixed at both ends by history and unioned over `--first-parent --no-merges`, permitted-entry traceability, manifest comparison, frozen-path byte comparison, publication, third-party attribution and licence inspection, scripted restore rehearsal, post-merge and accretion rehearsal | TC-709, TC-737..TC-744 | ✅ Complete |
| NFR-026 | Malicious-schema corpus, advisory gate, socket and filesystem instrumentation, non-executing source inspection, emission ordering, provisioning-failure and changed-path checks | TC-936..939 | ✅ Complete |
| NFR-034 | Input-order byte comparison and ambient-input static inspection | TC-1367 | ✅ Complete |
| NFR-027 | Double-generation byte comparison, report `--check`, changed-path and manifest analysis, guard-range conversion with post-merge perturbation, revert rehearsal and skip census | TC-940..943 | ✅ Complete |
| NFR-028 | NFR-028-AC/CON x8 | TC-1098..TC-1100 | 🚧 In progress |
| NFR-029 | NFR-029-AC/CON x10 | TC-1101..TC-1104 | 🚧 In progress |
| NFR-030 | NFR-030-AC/CON x12 | TC-1105..TC-1108 | 🚧 In progress |
| NFR-031 | NFR-031-AC-1..10: golden, repeat-run, varied-environment, and cross-root byte comparison; enumeration-order analysis citing path-sorted loading; ambient-input and HashMap audits with planted-token controls; one limit probe per limits.json entry under a 512 MiB / 30 s budget; unshare -rn offline run; forbid(unsafe_code) compile_fail doctest; proptest bundle-tree fuzz | TC-1300..TC-1309 | ✅ Complete |
| NFR-032 | NFR-032-AC-1..10: changed-path gate fixed at both ends by sentinels and unioned over --first-parent --no-merges, cargo metadata edge check, Cargo.toml and cases.json line diffs, root THIRD-PARTY-NOTICES.md additive-row diff against Cargo.lock, corpus git status after the suite, publish and licence inspection, harness suite-compare, revert-rehearsal, and accretion-rehearsal verbs | TC-1310..TC-1319 | ⚠️ TC-1316 blocked on issue #89; TC-1317 red in the scratch-clone environment, reported |
| NFR-033 | NFR-033-AC-1..11: manifest, lock, and toolchain inspection, EXTRACTION_TOOLCHAIN=0.0.0 gate run, dependency-specifier inspection against the workspace members, make extraction-frontend-deny and -audit, lock-to-notices comparison, clippy --no-deps and fmt, trace-marker scan and status-lie rehearsal, offline build, workspace-channel check | TC-1320..TC-1329, TC-1350 | ✅ Complete |
| NFR-038 | NFR-038-AC-1..7: one named make target reaching every Rust gate, dispatch-only triggers across every workflow, a two-platform two-architecture matrix that reports both, workspace-wide clippy, generated-crate artifacts per platform, and toolchain checks that fail naming what they could not run | TC-1396..TC-1402 | ✅ Complete |
| NFR-039 | NFR-039-AC-1..6 | TC-1410..TC-1413 | 🚧 planned on issue #92 |
| NFR-040 | NFR-040-AC-1..7 | TC-1422..TC-1425 | 🚧 planned on issue #26 |

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
| TC-280 | Every case file, base bundle, and the corpus manifest validate against their conformance schemas | Unit | P0 | FR-035-AC-1 | ✅ passed — conformance corpus (PR pending) |
| TC-281 | Every base bundle validates against the published schemas it composes and yields zero oracle diagnostics | Unit | P0 | FR-035-AC-2, FR-035-CON-1 | ✅ passed — conformance corpus (PR pending) |
| TC-282 | Every case's `derivedFrom` names an existing artifact and its `quote` occurs verbatim; a quote that no longer occurs fails the gate | Unit | P0 | FR-035-AC-3, US-008-EX-1 | ✅ passed — conformance corpus (PR pending) |
| TC-283 | Recomputing every case and base digest and `corpusDigest` reproduces `corpus.json`; a flipped byte fails and names the file | Unit | P0 | FR-035-AC-4 | ✅ passed — conformance corpus (PR pending) |
| TC-284 | No case sets `provenance.blessedFromRun`; a blessed case with no `blessing` block fails the gate | Unit | P0 | FR-035-AC-5 | ✅ passed — conformance corpus (PR pending) |
| TC-285 | No case's `ops` exceeds the 64-node budget, and the depth boundary case stays inside it using `x-repeat` | Unit | P1 | FR-035-AC-6 | ✅ passed — conformance corpus (PR pending) |
| TC-286 | An indexed `replace` or `remove` with no preceding `test` op fails the gate; a `test` op that no longer matches its base fails the run | Unit | P0 | FR-035-AC-7 | ✅ passed — conformance corpus (PR pending) |
| TC-287 | Deleting a case a `defect` row names fails the gate; changing an `expected` block without a major `corpusVersion` bump fails the versioning gate | Unit | P0 | FR-035-AC-8 | ✅ passed — conformance corpus (PR pending) |
| TC-288 | Every expected diagnostic validates against `common.schema.json#/$defs/diagnostic` and its `pointer` resolves in the built bundle | Unit | P0 | FR-035-AC-9 | ✅ passed — conformance corpus (PR pending) |
| TC-289 | Case ids are unique, match the declared pattern, and sit in the directory their `family` names | Unit | P0 | FR-035-AC-10, FR-035-CON-2, FR-035-CON-3 | ✅ passed — conformance corpus (PR pending) |
| TC-290 | The oracle's verdict equals every case's authored `expected` block, including codes, order, pointers, severities, and loci | Unit | P0 | FR-036-AC-1 | ✅ passed — conformance corpus (PR pending) |
| TC-291 | Two oracle runs over the corpus are byte-identical and the diagnostic order is unchanged under `LC_ALL=tr_TR.UTF-8` | Property | P0 | FR-036-AC-2, FR-036-CON-2 | ✅ passed — conformance corpus (PR pending) |
| TC-292 | A self-referential alias and a mutual alias pair each yield one `ALIAS_CYCLE`; a 257-link acyclic chain yields `DEPTH_LIMIT_EXCEEDED` | Unit | P0 | FR-036-AC-3 | ✅ passed — conformance corpus (PR pending) |
| TC-293 | Duplicate identity, alias cycle, unresolved occurrence definition, unresolved union payload, and unresolved sequence or map element are five distinct codes | Unit | P0 | FR-036-AC-4 | ✅ passed — conformance corpus (PR pending) |
| TC-294 | The oracle and harness import no judged implementation, read no clock, network, or environment, and add no dependency | Static | P0 | FR-036-AC-5, FR-036-CON-1 | ✅ passed — conformance corpus (PR pending) |
| TC-295 | For every `1.0.0` document, `normalized` is byte-identical to the corpus canonical form of the input and adds no member | Property | P0 | FR-036-AC-6 | ✅ passed — conformance corpus (PR pending) |
| TC-296 | An optional plus required addition classifies `breaking` naming both; the optional addition alone is `additive` under a preserving policy and `conditional` with none | Unit | P0 | FR-036-AC-7 | ✅ passed — conformance corpus (PR pending) |
| TC-297 | Every diagnostic the oracle emits validates against the published diagnostic schema and carries `owner`, `blocking`, `causes`, and `related` | Unit | P0 | FR-036-AC-8 | ✅ passed — conformance corpus (PR pending) |
| TC-298 | Each of the six package-context rules fires on a bundle supplying its member and stays silent on one that omits it | Unit | P0 | FR-036-AC-9 | ✅ passed — conformance corpus (PR pending) |
| TC-299 | A schema-decided case yields one diagnostic at the deepest failing instance location and no ancestor location beside it | Unit | P0 | FR-036-AC-10 | ✅ passed — conformance corpus (PR pending) |
| TC-300 | Every emitted code has a `diagnostic-codes.json` row citing a contract clause, and the sixteen frozen `reader-cases.json` codes are reused verbatim | Unit | P0 | FR-036-AC-11, FR-036-CON-3 | ✅ passed — conformance corpus (PR pending) |
| TC-301 | A value that is not an input bundle returns `invalid` with exactly one `INVALID_DOCUMENT` diagnostic at pointer `""` | Unit | P1 | FR-036-AC-1 | ✅ passed — conformance corpus (PR pending) |
| TC-302 | The harness runs the whole corpus against every registered adapter and exits zero on the committed corpus, registry, and register | Integration | P0 | FR-037-AC-1 | ✅ passed — conformance corpus (PR pending) |
| TC-303 | A stub result seeded with an extra, missing, reordered, repointed, relocated, or reclassified diagnostic fails, naming case, adapter, and locus | Unit | P0 | FR-037-AC-2, US-008-EX-2 | ✅ passed — conformance corpus (PR pending) |
| TC-304 | Two stub adapters that agree with each other but disagree with the oracle both fail | Unit | P0 | FR-037-AC-3, US-008-EX-4 | ✅ passed — conformance corpus (PR pending) |
| TC-305 | An `unavailable` adapter is an unmet row naming its owning issue and is no pass; an `available` adapter returning `unavailable` fails | Unit | P0 | FR-037-AC-4, US-008-EX-3 | ✅ passed — conformance corpus (PR pending) |
| TC-306 | A divergence entry the run does not reproduce fails the run, and the audit target reports an entry whose `reviewBy` date has passed | Unit | P0 | FR-037-AC-5 | ✅ passed — conformance corpus (PR pending) |
| TC-307 | Two harness runs over an unchanged corpus produce byte-identical reports and the harness source reads no clock | Property | P0 | FR-037-AC-6 | ✅ passed — conformance corpus (PR pending) |
| TC-308 | An adapter exiting non-zero, or emitting a result failing its schema, fails per case with a non-zero harness exit rather than a skip | Unit | P0 | FR-037-AC-7 | ✅ passed — conformance corpus (PR pending) |
| TC-309 | An `unsupported` result is accepted only where the case declares that adapter in `unsupportedBy`; an undeclared one fails | Unit | P0 | FR-037-AC-8 | ✅ passed — conformance corpus (PR pending) |
| TC-310 | A source analysis of `conformance/runner/` finds no adapter-to-adapter comparison and no import of adapter internals | Static | P0 | FR-037-AC-9, FR-037-CON-2 | ✅ passed — conformance corpus (PR pending) |
| TC-311 | An adapter result whose `caseDigest` does not match the manifest is rejected, so a canned result cannot pass | Unit | P0 | FR-037-AC-10 | ✅ passed — conformance corpus (PR pending) |
| TC-312 | A `pointerCompatible: false` adapter passes on a different pointer scheme when code, severity, locus, classification, and bytes match, and fails on a wrong locus | Unit | P0 | FR-037-AC-11 | ✅ passed — conformance corpus (PR pending) |
| TC-313 | The registry declares the four adapter slots with owning issues, statuses, and the note that supplying a command is the owning issue's obligation | Static | P0 | FR-037-CON-1, FR-037-CON-3 | ✅ passed — conformance corpus (PR pending) |
| TC-314 | Every register row carries four case classes or a justified `notApplicable`; removing a case fails and names the row and class | Unit | P0 | FR-038-AC-1 | ✅ passed — conformance corpus (PR pending) |
| TC-315 | Unresolved import, package cycle, unknown mapping, duplicate identity, stale manifest digest, and undeclared loss each fail at an exact source locus | Unit | P0 | FR-038-AC-2 | ✅ passed — conformance corpus (PR pending) |
| TC-316 | Four cases realize the four `presence` by `nullable` combinations and the oracle distinguishes all four normalized forms | Unit | P0 | FR-038-AC-3 | ✅ passed — conformance corpus (PR pending) |
| TC-317 | Direct and mutual recursion are accepted; alias and composite cycles are rejected; a package cycle carries a different code from a recursive type graph | Unit | P0 | FR-038-AC-4 | ✅ passed — conformance corpus (PR pending) |
| TC-318 | Every `documentExpressible` defect row has a reproducing case that fails, and every other row names the static check that detects it | Unit | P0 | FR-038-AC-5, US-008-EX-5 | ✅ passed — conformance corpus (PR pending) |
| TC-319 | Every register row declares its deciding layer and the layer that produced its cases' diagnostics is the declared one | Unit | P1 | FR-038-AC-6 | ✅ passed — conformance corpus (PR pending) |
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
| TC-345 | Every `src/compiler/**` manifest in the tree, and every added manifest, declares AGPL-3.0-only and no dependency is added | Static | P0 | FR-041-AC-13, FR-041-CON-5 | ✅ passed |
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
| TC-371 | No retained-evidence path other than `evidence/custom.json` changes, and the committed file differs from the frozen issue #4 record in `command` alone | Static | P0 | FR-044-AC-2, FR-044-CON-1 | ✅ passed |
| TC-372 | The committed `Cargo.lock` is unchanged and the runner seeds it | Static | P0 | FR-044-AC-3, FR-044-CON-2 | ✅ passed |
| TC-373 | Seeding leaves the lockfile identical after `cargo check --offline --locked` | Integration | P0 | FR-044-AC-3 | ✅ passed |
| TC-374 | With no committed lockfile, `--check` exits non-zero naming it | Unit | P0 | FR-044-AC-4 | ✅ passed |
| TC-375 | Neither manifest names the spike emitter and its directory is gone | Static | P0 | FR-044-AC-5 | ✅ passed |
| TC-376 | The lockfile holds no `file:`/`link:` and installs frozen | Integration | P0 | FR-044-AC-6, FR-044-CON-3 | ✅ passed |
| TC-377 | The spike runner imports the promoted backends and defines none | Static | P0 | FR-044-AC-7 | ✅ passed |
| TC-378 | The branch changes only the four permitted spike paths | Static | P0 | FR-044-AC-8 | ✅ passed |
| TC-379 | The changed-path allowlist covers every path the branch changes | Unit | P0 | FR-044-AC-9 | ✅ passed |
| TC-380 | Zero publications and mutations proven by a changed-path check, paired with tree evidence that the promotion is in place | Static | P0 | FR-044-AC-10 | ✅ passed |
| TC-381 | The feasibility doc carries the `## Retained evidence` note | Static | P1 | FR-044-AC-11 | ✅ passed |
| TC-382 | A cargo cache missing a pinned crate is an unmet host prerequisite | Manual | P1 | FR-044-CON-4, FR-044-CON-5 | 🚧 blocked on issue #42 |
| TC-383 | Compiler, backends, and adapter all repeat identically | Property | P0 | NFR-017-AC-1 | ✅ passed |
| TC-384 | No retained-evidence file changes but `evidence/custom.json`, and no field of it but `command` differs from the frozen issue #4 record | Static | P0 | NFR-017-AC-2 | ✅ passed |
| TC-385 | Emitted ordering is unchanged under two collator locales | Property | P0 | NFR-017-AC-3 | ✅ passed |
| TC-386 | `baseDir` is an explicit parameter, not an ambient read | Unit | P0 | NFR-017-AC-4 | ✅ passed |
| TC-387 | A seeded lockfile survives `cargo check --offline --locked` unchanged | Integration | P0 | NFR-017-AC-5 | ✅ passed |
| TC-388 | No dependency added, exact pins, no `.npmrc`, no `file:`/`link:` | Static | P0 | NFR-017-AC-6 | ✅ passed |
| TC-389 | All three issue #42 host couplings are named in the feasibility doc | Static | P0 | NFR-017-AC-7 | ✅ passed |
| TC-390 | Every changed path is permitted and none is prohibited | Static | P0 | NFR-018-AC-1 | ✅ passed |
| TC-391 | `exports`, `main`, `module`, `types`, `files` unchanged from `origin/main` | Static | P0 | NFR-018-AC-2 | ✅ passed |
| TC-392 | The packed-file delta is confined to `src/compiler/**`, the packed set over the tree holds the promoted modules, and the shipping note is recorded | Integration | P0 | NFR-018-AC-3 | ✅ passed |
| TC-393 | Every promoted `src/compiler/**` manifest and every added package manifest declares AGPL-3.0-only | Static | P0 | NFR-018-AC-4 | ✅ passed |
| TC-394 | No third-party dependency is added and the sets are otherwise identical | Static | P0 | NFR-018-AC-5 | ✅ passed |
| TC-395 | Restoring every path that differs from the pre-promotion commit reproduces that tree exactly | Integration | P0 | NFR-018-AC-6 | ✅ passed |
| TC-396 | No workflow, tag, or registry publication is added or triggered | Static | P0 | NFR-018-AC-7 | ✅ passed |
| TC-397 | NFR-006 gains one paragraph recording the spike's new import direction | Static | P1 | FR-044-AC-12 | ✅ passed |
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
| TC-591 | `package.json` `exports`, `main`, `module`, `types`, and `files` are byte-unchanged from the pre-change baseline | Static | P0 | NFR-021-AC-2 | ✅ passed |
| TC-592 | `src/compiler/ir.mjs`, `compile.mjs`, `identity.mjs`, `emitters/**`, `backends/**`, and `inventory.json` are byte-unchanged from the pre-change baseline | Static | P0 | NFR-021-AC-3 | ✅ passed |
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
| TC-620 | Every NFR-021 gate resolves both ends of its range from history — neither a moving base nor a moving head — and still fails on the same input in a simulated post-merge tree where the branch diff and `git status` are both empty | Integration | P0 | NFR-021-AC-9 | ✅ passed |
| TC-621 | An unaccounted-for file under `src/compiler/` fails the promotion-inventory gate in that same post-merge tree | Static | P0 | NFR-021-AC-9 | ✅ passed |
| TC-622 | A union variant whose `payloadType` no type declares is rejected at that variant's locus; two variants sharing one payload type are accepted | Unit | P0 | FR-038-AC-7 | ✅ passed — conformance corpus (PR pending) |
| TC-623 | A `1.0.0` document under `1.1.0` rules, a `1.1.0` node in a `1.0.0` document, and an export added and removed each produce the stated result | Unit | P0 | FR-038-AC-8 | ✅ passed — conformance corpus (PR pending) |
| TC-624 | Every register row's `sources` resolve, and every listed issue #19 criterion is quoted in its row and covered by a case | Unit | P0 | FR-038-AC-9, FR-038-CON-1, FR-038-CON-2 | ✅ passed — conformance corpus (PR pending) |
| TC-625 | Cross-language generated-package serialization parity is recorded as an unmet area with issues #21, #22, #23, and #11 as owners | Static | P0 | FR-038-CON-3 | ✅ passed — conformance corpus (PR pending) |
| TC-626 | Regenerating `coverage.json` reproduces the committed file byte-for-byte; adding a case without regenerating fails the gate | Unit | P0 | FR-039-AC-1, FR-039-CON-1 | ✅ passed — conformance corpus (PR pending) |
| TC-627 | `thresholds.json` declares a `proposed` row for each of issues #19, #21, #22, and #23 with all four thresholds and an owning issue | Unit | P0 | FR-039-AC-2 | ✅ passed — conformance corpus (PR pending) |
| TC-628 | Every catalogued mutation is detected by at least one case; suppressing a detecting case drops the score and fails the gate | Unit | P0 | FR-039-AC-3, FR-039-CON-3 | ✅ passed — conformance corpus (PR pending) |
| TC-629 | The mutation catalogue carries at least one mutation for every construct-register family | Unit | P0 | FR-039-AC-4 | ✅ passed — conformance corpus (PR pending) |
| TC-630 | A consumer importing `conformance/oracle/index.mjs` from another working directory loads the corpus, builds an input, and obtains a verdict | Integration | P0 | FR-039-AC-5 | ✅ passed — conformance corpus (PR pending) |
| TC-631 | `loadCase` on an unknown id throws naming the id and the corpus version; mutating a returned case does not affect a later load | Unit | P0 | FR-039-AC-6, FR-039-CON-2 | ✅ passed — conformance corpus (PR pending) |
| TC-632 | A registry adapter with no threshold row, and a threshold row with no registry adapter, each fail the gate | Unit | P0 | FR-039-AC-7 | ✅ passed — conformance corpus (PR pending) |
| TC-633 | `package.json` gains no `exports` or `files` entry for `conformance/`, and the coverage account names the unmet serialization area | Static | P0 | FR-039-AC-8 | ✅ passed — conformance corpus (PR pending) |
| TC-634 | The coverage account is byte-identical when regenerated from a different working directory and under a different locale | Property | P0 | FR-039-AC-9 | ✅ passed — conformance corpus (PR pending) |
| TC-635 | No case is blessed from a run and every `derivedFrom` quote occurs verbatim in the named contract artifact | Unit | P0 | NFR-015-AC-1 | ✅ passed — conformance corpus (PR pending) |
| TC-636 | Oracle verdicts, the harness report, and the coverage account are byte-identical across two runs, two locales, and two working directories | Property | P0 | NFR-015-AC-2 | ✅ passed — conformance corpus (PR pending) |
| TC-637 | The oracle and the harness import no judged implementation and read no clock, network, or environment outside the audit target | Static | P0 | NFR-015-AC-3 | ✅ passed — conformance corpus (PR pending) |
| TC-638 | Every divergence entry carries an owner and a verdict, and every contract or merged-artifact disagreement sits in `contract-gaps.json` with its owning issue | Manual | P0 | NFR-015-AC-4 | ✅ passed — conformance corpus (PR pending) |
| TC-639 | An expected result changes only under a `corpus-defect` verdict carrying the major `corpusVersion` bump | Static | P0 | NFR-015-AC-5 | ✅ passed — conformance corpus (PR pending) |
| TC-640 | The issue #20 changed-path gate excludes `/spikes/`, `/src/`, `/packages/`, `/schema/`, `/fixtures/`, `/docs/`, `/.github/`, and both lockfiles | Static | P0 | NFR-016-AC-1 | ✅ passed — conformance corpus (PR pending) |
| TC-641 | The change adds no dependency to `package.json` or `pyproject.toml` and no `exports` or `files` entry | Static | P0 | NFR-016-AC-2 | ✅ passed — conformance corpus (PR pending) |
| TC-642 | The conformance suites run from `make test` and `poetry run pytest` with no network connection and no clock read | Integration | P0 | NFR-016-AC-3 | ✅ passed — conformance corpus (PR pending) |
| TC-643 | A changed-path and manifest analysis shows the change publishes no package and alters no consumer, catalog pin, or Avro contract | Static | P0 | NFR-016-AC-4 | ✅ passed — conformance corpus (PR pending) |
| TC-644 | A later unrelated change landing on top of this one does not grow this change's path set, and a prohibited path left in the tree at a path no later commit owns still fails the gate | Integration | P0 | NFR-021-AC-10 | ✅ passed |
| TC-745 | `BACKEND_TARGETS` equals the published `target` enum and registers one entry for each of the five declared targets | Unit | P0 | FR-063-AC-1, FR-063-CON-1 | 🚧 no discrete test; no test binds this row |
| TC-746 | A target outside the closed vocabulary throws a `TypeError` naming the value and the five permitted targets | Unit | P0 | FR-063-AC-2 | 🚧 no discrete test; no test binds this row |
| TC-747 | A target registered as declared-unimplemented returns `state: "unavailable"`, zero files, and one blocking `BACKEND_NOT_IMPLEMENTED` naming its registered owner, exercised over a synthetic registration; and every registry entry names an owner that `isBackendImplemented` agrees with | Unit | P0 | FR-063-AC-3, FR-063-AC-19 | 🚧 partially exercised by an existing test; no test binds this row |
| TC-748 | A request failing `compiler-request.schema.json` returns `state: "invalid"` with one diagnostic per schema error at the failing instance pointer and no file | Unit | P0 | FR-063-AC-4 | 🚧 partially exercised by an existing test; no test binds this row |
| TC-749 | Every manifest the seam returns validates against `output-manifest.schema.json`, and the five states are each reached: `success` for an admitted representable document, `lossy` for an admissible one, `unsupported` for a representability loss, `invalid` for a schema-failing request, and `unavailable` for an unimplemented target | Property | P0 | FR-063-AC-5, FR-063-AC-17, FR-063-AC-18 | 🚧 no discrete test; no test binds this row |
| TC-750 | `requestFingerprint` and `normalizedFingerprint` are recomputed independently, each `files[]` entry carries a path under `outputRoot`, its media type, and a non-empty identity set, and its digest is taken over the text the injected formatter returned | Integration | P0 | FR-063-AC-6, FR-063-AC-7, FR-063-AC-20 | 🚧 no discrete test; no test binds this row |
| TC-751 | `assertBackendContract` rejects a backend missing any contract member and one naming a path outside `outputRoot`, and a `1.0.0` request against the TypeScript backend returns `state: "unsupported"` | Unit | P0 | FR-063-AC-8, FR-063-AC-9, FR-063-AC-10 | 🚧 partially exercised by an existing test; no test binds this row |
| TC-752 | `target-contract.json` validates against its schema and carries the member values of the committed `typescript` target row, whose declared runtime validator is satisfied in-package | Unit | P0 | FR-063-AC-11, FR-063-CON-2 | 🚧 no discrete test; no test binds this row |
| TC-753 | The seam imports no frontend and neither prototype backend, the narrow interface keeps exactly fifteen symbols, and `package.json` metadata is unchanged | Analysis | P0 | FR-063-AC-12, FR-063-CON-4, FR-063-CON-5, FR-063-CON-6 | ✅ passed — Analysis; the evidence is the recorded analysis, which mints no source symbol |
| TC-754 | Every read goes through the injected host, no backend module reads a clock, environment, cwd, filesystem or socket, no module below the injected formatter starts a child process, 256 mutated requests never throw, and every code is a declared register member | Fuzz | P0 | FR-063-AC-13, FR-063-AC-14, FR-063-AC-15, FR-063-AC-16, FR-063-AC-21, FR-063-CON-3 | 🚧 partially exercised by an existing test; no test binds this row |
| TC-755 | A model carrying one definition of each of the eight IR kinds renders eight declarations matching their committed snapshots, an unhandled kind fails the renderer's contract test, and `buildModel` over both conformance bases carries every declared node including occurrences, document extensions, and field units | Snapshot | P0 | FR-064-AC-1, FR-064-AC-18, FR-064-CON-3, FR-064-CON-7 | 🚧 no discrete test; no test binds this row |
| TC-756 | Each of the nine `scalar` values renders its declared TypeScript primitive, `bytes` renders as `string` with its base64 reading recorded against issue #58, and a record renders as an interface with no `extends` clause | Unit | P0 | FR-064-AC-2, FR-064-AC-3, FR-064-AC-20 | 🚧 no discrete test; no test binds this row |
| TC-757 | An enum renders as a union of its variants' names as string literals in code-point order of variant identity | Unit | P0 | FR-064-AC-4 | 🚧 no discrete test; no test binds this row |
| TC-758 | A union renders both member shapes and a `switch` over the exported discriminant constant narrows the default arm to `never` | Compile | P0 | FR-064-AC-5 | 🚧 no discrete test; no test binds this row |
| TC-759 | A `reference` renders as a branded type that refuses a plain `string` and accepts a value from the generated constructor | Compile | P0 | FR-064-AC-6 | 🚧 no discrete test; no test binds this row |
| TC-760 | The four presence and nullability combinations render four distinct property forms with no `undefined` in a required field, and `multiplicity.upper` decides array against scalar | Unit | P0 | FR-064-AC-7, FR-064-AC-8 | 🚧 no discrete test; no test binds this row |
| TC-761 | A `typeRef` cycle spanning three records renders three mutually recursive interfaces that `tsc` accepts, and the renderer terminates | Compile | P0 | FR-064-AC-9 | 🚧 no discrete test; no test binds this row |
| TC-762 | The three `unknownPolicy` values render three distinguishable forms with no index signature under `reject`, a `union` at `surface` and a `map` at `preserve` render no unknown-member marker, and no rendered output uses `any` in a type position | Unit | P0 | FR-064-AC-10, FR-064-AC-17, FR-064-AC-21 | 🚧 no discrete test; no test binds this row |
| TC-763 | A `doc` extension renders as JSDoc on its declaration or property, and a record's relationships render as one readonly descriptor rather than an interface member | Snapshot | P0 | FR-064-AC-11, FR-064-AC-12 | 🚧 no discrete test; no test binds this row |
| TC-764 | A reserved-word `displayName` mangles deterministically, two identities deriving one identifier produce a blocking `IDENTIFIER_COLLISION` naming both before any file map exists, and changing only a `displayName` moves the generated identifier while the recorded identity does not move | Unit | P0 | FR-064-AC-13, FR-064-AC-14, FR-064-AC-22 | 🚧 no discrete test; no test binds this row |
| TC-765 | Rendering and model building are order-independent, pure, and argument-preserving, read no prototype-IR module, decide no value from a name heuristic, name no decorator, write no file, and `buildModel` is the only module that walks the raw document | Property | P0 | FR-064-AC-15, FR-064-AC-16, FR-064-AC-19, FR-064-CON-1, FR-064-CON-2, FR-064-CON-4, FR-064-CON-5, FR-064-CON-6 | 🚧 no discrete test; no test binds this row |
| TC-766 | Generating the fixture package emits exactly the eight declared files — `package.json`, `index.ts`, `types.ts`, `validators.ts`, `errors.ts`, `identity.ts`, `provenance.ts`, and `LICENSE` — and no other path | Integration | P0 | FR-065-AC-1 | 🚧 partially exercised by an existing test; no test binds this row |
| TC-767 | The generated `package.json` declares the five required members with their declared values and carries no dependency block, no `overrides`, no `file:` or `link:` specifier, and no upper bound | Unit | P0 | FR-065-AC-2, FR-065-CON-2 | 🚧 partially exercised by an existing test; no test binds this row |
| TC-768 | Every `exports` entry lists `types` before `default` in parsed key order, and the generated package name round-trips to the IR's `package.identity` | Property | P0 | FR-065-AC-3, FR-065-AC-4 | 🚧 no discrete test; no test binds this row |
| TC-769 | `index.ts` carries no `export *`, its re-exported names equal the union of the five source modules' public names, and the exported set equals the identity-derived exports plus the declared fixed API surface, with an export outside both failing the check | Unit | P0 | FR-065-AC-5, FR-065-AC-20, FR-065-CON-5 | 🚧 partially exercised by an existing test; no test binds this row |
| TC-770 | Every generated import specifier is relative, no generated module names a package in the seven prohibited categories, and the check is static rather than a runtime probe | Static | P0 | FR-065-AC-6, FR-065-AC-7, FR-065-CON-3 | ✅ passed — id-bound in `test/typescript-backend.test.ts` |
| TC-771 | Every corpus model FR-068 admits typechecks as one compiler-API program under the fixture `tsconfig.json` with `strict` and `exactOptionalPropertyTypes`, assigning `undefined` to an optional non-nullable property fails that typecheck, and the root `tsconfig.json` excludes that fixture directory | Compile | P0 | FR-065-AC-8, FR-065-AC-9, FR-065-AC-21, FR-065-AC-22 | 🚧 partially exercised by an existing test; no test binds this row |
| TC-772 | Every generated file begins with the SPDX header and the fingerprint banner, the emitted `LICENSE` is byte-identical to this repository's AGPL-3.0-only text, and the repository's pinned `biome format` reports no change over the committed fixture | Snapshot | P0 | FR-065-AC-10, FR-065-AC-11, FR-065-AC-18, FR-065-CON-6 | 🚧 partially exercised by an existing test; no test binds this row |
| TC-773 | A static reachable-symbol walk from a one-type entry export over a ten-type package reaches that type's symbols and none of the other nine, and fails loudly when any one of its four enabling conditions is removed | Integration | P0 | FR-065-AC-12, FR-065-CON-4 | 🚧 partially exercised by an existing test; no test binds this row |
| TC-774 | A model carrying a representability loss yields an empty file map while a `lossy` admissible model yields the full eight-file map, `renderPackage` is repeatable and writes nothing, and the generated modules have no import cycle | Unit | P0 | FR-065-AC-13, FR-065-AC-14, FR-065-AC-15 | 🚧 no discrete test; no test binds this row |
| TC-775 | The manifest's `semanticIdentities` for `types.ts` equals the declared identity set, `package.json` and `LICENSE` each carry the package's own identity, and the branch adds no lockfile entry, no `package.json` byte, and no workspace member | Analysis | P0 | FR-065-AC-16, FR-065-AC-17, FR-065-AC-19, FR-065-CON-1 | ✅ passed — Analysis; the evidence is the recorded analysis, which mints no source symbol |
| TC-776 | Every positive case of the authored instance corpus is accepted and returned unchanged except for applied semantic defaults, and a `lossy` admissible document still generates validators while a representability loss generates none | Integration | P0 | FR-066-AC-1, FR-066-AC-28, FR-066-CON-7 | 🚧 partially exercised by an existing test; no test binds this row |
| TC-777 | Every negative case of the authored instance corpus is rejected at its expected pointer and code without a thrown exception, and the generated validator reaches the same verdict as `ajv@8.20.0` running that case's authored JSON Schema | Integration | P0 | FR-066-AC-2, FR-066-AC-18, FR-066-CON-8 | ✅ passed — id-bound in `test/typescript-backend.test.ts` |
| TC-778 | The four presence and nullability combinations produce the twelve accept and reject decisions of the declared table, asserted cell by cell | Unit | P0 | FR-066-AC-3 | 🚧 partially exercised by an existing test; no test binds this row |
| TC-779 | A property present with the value `undefined` is rejected for a required and an optional field alike, while an absent property is accepted only where `presence` is `optional` | Unit | P0 | FR-066-AC-4 | 🚧 partially exercised by an existing test; no test binds this row |
| TC-780 | Each of the eleven constraint keywords fires on a constructed value and reports that constraint's own `diagnosticCode` at the expected pointer with no check weakened to pass a fixture, and the closed structural-code list ships as `errors.ts`, the eighth file, behind its own `exports` subpath | Unit | P0 | FR-066-AC-5, FR-066-AC-19, FR-066-CON-3 | 🚧 partially exercised by an existing test; no test binds this row |
| TC-781 | An unanchored `pattern` matches an embedded substring while an anchored one rejects it; an unimplemented `format` and a `duration` ordering constraint each become a declared representability loss; a `bytes` length counts decoded octets; and an `integer` rejects a non-integral, non-finite, or unsafe magnitude while accepting negative zero | Unit | P0 | FR-066-AC-6, FR-066-AC-7, FR-066-AC-20, FR-066-AC-21, FR-066-AC-22 | 🚧 partially exercised by an existing test; no test binds this row |
| TC-782 | `unknownPolicy` `reject`, `surface`, and `preserve` produce a pointed rejection, a surfaced finding with `ok` true, and a separately named readonly member that keeps the four presence and nullability forms distinct; the policy on a `union` and on a `map` has no validation effect and appears only in the metadata | Unit | P0 | FR-066-AC-8, FR-066-AC-26, FR-066-AC-27 | 🚧 partially exercised by an existing test; no test binds this row |
| TC-783 | A `unique: true` collection rejects two structurally equal members and accepts two differing only in key order, and an `ordered: false` collection returns the caller's order | Property | P0 | FR-066-AC-9, FR-066-AC-10 | 🚧 partially exercised by an existing test; no test binds this row |
| TC-784 | A `semantic` default is applied to an absent property while a `representation` or `migration` default is not | Unit | P0 | FR-066-AC-11 | 🚧 partially exercised by an existing test; no test binds this row |
| TC-785 | A validator over a self-referential type terminates past the declared depth limit reporting the exceeded-depth code, a null-prototype input, an inherited accessor, a throwing getter, a `Symbol.toPrimitive` object, and `__proto__`, `constructor` and `prototype` members are each decided without a thrown exception or a mutated prototype, and 512 mutated payloads never throw | Fuzz | P0 | FR-066-AC-12, FR-066-AC-13, FR-066-AC-23, FR-066-AC-24, FR-066-AC-25, FR-066-CON-4, FR-066-CON-6 | 🚧 no discrete test; no test binds this row |
| TC-786 | The generated source carries no type assertion, `any` type, non-null assertion or suppression while keeping the mandated `as const`, its runtime closure is empty, its error order is locale-independent, `result.ok` gates narrowing, and the `bytes` wire form, its length unit, and the union discriminator each sit in one named declared decision citing issue #58 | Static | P0 | FR-066-AC-14, FR-066-AC-15, FR-066-AC-16, FR-066-AC-17, FR-066-AC-29, FR-066-CON-1, FR-066-CON-2, FR-066-CON-5, FR-066-CON-9 | 🚧 partially exercised by an existing test; no test binds this row |
| TC-787 | The generated type-identity map carries one entry per exported type with the document's identity copied verbatim, and an audit walking every node of a fixture document finds each one rendered or named in a declared representability loss | Unit | P0 | FR-067-AC-1, FR-067-AC-16, FR-067-CON-5, FR-067-CON-6 | ✅ passed — id-bound in `test/typescript-backend.test.ts` |
| TC-788 | The generated field-identity map carries one entry per field of every exported record, keyed `<Type>.<field>` | Unit | P0 | FR-067-AC-2 | 🚧 partially exercised by an existing test; no test binds this row |
| TC-789 | Both identity maps are ordered by key under code-point comparison and keep that order under `LC_ALL=tr_TR.UTF-8` | Property | P0 | FR-067-AC-3 | 🚧 no discrete test; no test binds this row |
| TC-790 | A package with a type missing from the identity map, and one with an entry for an unexported name, each fail `tsc --noEmit` | Compile | P0 | FR-067-AC-4, FR-067-CON-2 | 🚧 no discrete test; no test binds this row |
| TC-791 | The metadata object carries the eleven provenance values and the fingerprint computed over the normalized document rather than the file bytes, and exposes each document's occurrences, document-level extensions, and field units byte-equal to the document | Unit | P0 | FR-067-AC-5, FR-067-AC-14, FR-067-CON-4 | 🚧 partially exercised by an existing test; no test binds this row |
| TC-792 | Two documents differing only in set order share a fingerprint, and two differing in any semantic value do not | Property | P0 | FR-067-AC-6 | 🚧 no discrete test; no test binds this row |
| TC-793 | Every banner names the backend identity, version, and fingerprint, no emitted byte matches a date, time, hostname, user, or absolute-path pattern, and two runs at different wall-clock times agree | Static | P0 | FR-067-AC-7, FR-067-AC-8, FR-067-CON-1 | 🚧 no discrete test; no test binds this row |
| TC-794 | Roles, relationship descriptors, per-type and per-field extension descriptors, and each type's `unknownPolicy` are exposed per type; a metadata-only import retains no validator symbol; a `displayName` rename moves no identity; and the metadata module typechecks | Unit | P0 | FR-067-AC-9, FR-067-AC-10, FR-067-AC-11, FR-067-AC-12, FR-067-AC-13, FR-067-AC-15, FR-067-AC-17, FR-067-CON-3 | 🚧 partially exercised by an existing test; no test binds this row |
| TC-795 | Every positive fixture and every conformance base yields `resultState` `success` with zero diagnostics, and a bundle carrying only `ir` records one suppression per absent-input rule, emits no diagnostic for any of them, and returns the same result state | Integration | P0 | FR-068-AC-1, FR-068-AC-18, FR-068-AC-19, FR-068-CON-8 | 🚧 no discrete test; no test binds this row |
| TC-796 | Every rule of the code table fires on a constructed document producing exactly its named code at a hand-computed pointer, and the derivation ledger names for every registered code either the published clause its rule was read from or the corpus register | Unit | P0 | FR-068-AC-2, FR-068-AC-20, FR-068-AC-21, FR-068-CON-7 | 🚧 no discrete test; no test binds this row |
| TC-797 | Three schema errors at one instance location collapse to one `SCHEMA_VIOLATION` at the deepest failing location, and a structurally invalid document yields no cross-field code | Unit | P0 | FR-068-AC-3, FR-068-AC-4 | 🚧 no discrete test; no test binds this row |
| TC-798 | A document that is both alias-cyclic and past the depth bound yields `ALIAS_CYCLE` and never `DEPTH_LIMIT_EXCEEDED` | Unit | P0 | FR-068-AC-5 | 🚧 no discrete test; no test binds this row |
| TC-799 | The three `resultState` values are produced by a clean, an erroring, and a non-erroring document, no other value is ever returned, and a non-error-only document generates with manifest state `lossy` and a non-empty file set | Unit | P0 | FR-068-AC-6, FR-068-AC-23 | 🚧 no discrete test; no test binds this row |
| TC-800 | Diagnostic order is byte-identical under `LC_ALL=tr_TR.UTF-8`, from another working directory, and with every environment variable cleared but `PATH` | Integration | P0 | FR-068-AC-7, FR-068-AC-16 | 🚧 no discrete test; no test binds this row |
| TC-801 | Every emitted diagnostic validates against the published definition, carries no pointer member, severity `error` and `blocking` true, and a `locus` exactly when an enclosing node supplies one; every emitted code is registered and a deliberately minted code fails the check | Property | P0 | FR-068-AC-8, FR-068-AC-9, FR-068-AC-17, FR-068-CON-2 | 🚧 no discrete test; no test binds this row |
| TC-802 | An operation, a clause, an unimplemented `format`, and a `migration` default yield four declared losses under the backend's own prefix that block generation and add nothing to the admissibility answer, while an `unknownPolicy` on a `union` or a `map` yields neither a diagnostic nor a loss | Unit | P0 | FR-068-AC-10, FR-068-AC-11, FR-068-AC-24 | 🚧 no discrete test; no test binds this row |
| TC-803 | `REFERENCE_POLICY` at `strict` yields `UNRESOLVED_TYPE_REF` at the reference target pointer and at `open` yields none, with no other line of the backend differing between the runs | Unit | P0 | FR-068-AC-12, FR-068-CON-3 | 🚧 no discrete test; no test binds this row |
| TC-804 | `admit.mjs` and `loss.mjs` import no compiler reader, schema layer, applicability table, or diff module, and nothing under `conformance/`, and edit no corpus file | Static | P0 | FR-068-AC-13, FR-068-CON-1, FR-068-CON-4 | 🚧 no discrete test; no test binds this row |
| TC-805 | Each of the four declared limits returns a bounded answer without throwing, the depth bound is the declared 256 rather than the compiler's `DEFAULT_LIMITS`, and 512 mutated documents leave the input byte-unchanged and never throw | Fuzz | P0 | FR-068-AC-14, FR-068-AC-15, FR-068-AC-22, FR-068-CON-5, FR-068-CON-6 | 🚧 no discrete test; no test binds this row |
| TC-806 | Two documents differing only in object key order and in the thirteen identity-keyed containers canonicalize alike, two differing in any semantic value do not, and two members sharing one `identity` canonicalize to one form whatever order they arrive in | Property | P0 | FR-069-AC-1, FR-069-AC-2, FR-069-AC-16 | 🚧 no discrete test; no test binds this row |
| TC-807 | `normalizeIrForTarget` is idempotent over every positive fixture and every generated document | Property | P0 | FR-069-AC-3 | 🚧 no discrete test; no test binds this row |
| TC-808 | A `1.1.0` field gains the derived multiplicity, the re-derived presence, and a literal `nullable`, while the same field in a `1.0.0` document gains no member | Unit | P0 | FR-069-AC-4 | 🚧 no discrete test; no test binds this row |
| TC-809 | Canonicalizing every conformance base and case input is byte-identical on a second run, from another working directory, and under `LC_ALL=tr_TR.UTF-8` | Integration | P0 | FR-069-AC-5 | 🚧 no discrete test; no test binds this row |
| TC-810 | A non-finite number and a value past the depth bound are each refused with a named error, negative zero canonicalizes as positive zero, and canonicalization leaves its argument byte-identical | Unit | P0 | FR-069-AC-6, FR-069-AC-7, FR-069-AC-21, FR-069-CON-5 | 🚧 no discrete test; no test binds this row |
| TC-811 | Each declared classification rule fires on a constructed pair at a hand-computed pointer — a removed field, an added required field, a removed variant and a removed relationship `breaking`; an added optional field `conditional` with no consumer policy and `additive` under one admitting unknown members; an added variant `additive` under such a policy and, with none, `breaking` under the `contract` setting of `VARIANT_ADDITION_POLICY` and `conditional` under its default `corpus` setting, with the constant read in exactly one place — and a rule absent from the exported `MODELLED_CHANGES` data fails the module's contract test | Unit | P0 | FR-069-AC-8, FR-069-AC-17, FR-069-AC-19, FR-069-AC-25, FR-069-CON-7 | ✅ passed — id-bound in `test/typescript-backend.test.ts` |
| TC-812 | A mixed pair aggregates to the most restrictive classification, an inadmissible side on either end aggregates `invalid`, and an unmodelled change aggregates `unknown` rather than `patch` | Unit | P0 | FR-069-AC-9, FR-069-AC-10, FR-069-AC-11 | 🚧 no discrete test; no test binds this row |
| TC-813 | An added optional field classifies `conditional` with no policy and `additive` under a policy admitting unknown members, a contract-version move classifies `additive` only when its down-projection round-trips, and the twenty-five corpus compatibility cases agree with the oracle or report a divergence | Integration | P0 | FR-069-AC-12, FR-069-AC-13, FR-069-AC-18 | 🚧 measured by `make conformance`, which `make test` does not run; no test binds this row |
| TC-814 | Neither module imports the compiler's normalization, canonicalization, diff or evolution module nor anything under `conformance/`, declares `IDENTITY_SET_PATHS` and the key-ordering rule once as data, retains the GAP-004 citation, canonicalizes every case with no admissibility answer computed, reads no clock, and adds no lockfile entry | Static | P0 | FR-069-AC-14, FR-069-AC-15, FR-069-AC-20, FR-069-CON-1, FR-069-CON-2, FR-069-CON-3, FR-069-CON-4, FR-069-CON-6 | 🚧 no discrete test; no test binds this row |
| TC-815 | `make conformance` runs the `typescript-backend` command over all 111 cases with no adapter, unknown-case, duplicate-answer, case-digest or missing-answer problem, and the harness reports 111 matched cases and zero unsuppressed divergences for the slot | Integration | P0 | FR-070-AC-1, FR-070-AC-11 | 🚧 measured by `make conformance`, which `make test` does not run; no test binds this row |
| TC-816 | Every document the adapter emits validates against `conformance/schema/adapter-result.schema.json`, and its `adapterVersion` moves when a decision module changes a verdict | Integration | P0 | FR-070-AC-2, FR-070-AC-19 | 🚧 measured by `make conformance`, which `make test` does not run; no test binds this row |
| TC-817 | The adapter answers `support: "supported"` for all 111 cases and `unavailable` for none | Integration | P0 | FR-070-AC-3 | 🚧 measured by `make conformance`, which `make test` does not run; no test binds this row |
| TC-818 | The measured match, failure and divergence counts are recorded with the command that produced them and read from the regenerated coverage account rather than restated, and the first-run divergence count is measured before the first fix and never remeasured | Analysis | P0 | FR-070-AC-4, FR-070-AC-17, FR-070-CON-6, FR-070-CON-8 | ✅ passed — Analysis; the evidence is the recorded analysis, which mints no source symbol |
| TC-819 | Neither the adapter nor any module it reaches references `oracleVerdict`, `compare`, or the oracle's own modules, and the harness starts it as a process rather than importing it | Static | P0 | FR-070-AC-5, FR-070-CON-1, FR-070-CON-5 | 🚧 measured by `make conformance`, which `make test` does not run; no test binds this row |
| TC-820 | Substituting the oracle's answer for the backend's makes a deliberately seeded backend defect invisible, showing the independence constraint is load-bearing | Integration | P0 | FR-070-AC-6 | 🚧 measured by `make conformance`, which `make test` does not run; no test binds this row |
| TC-821 | Two adapter runs from different working directories and under `LC_ALL=tr_TR.UTF-8` are byte-identical; the regenerated coverage account reproduces, records `matched` 111 and `unmet` 0 for this slot, and a total exactly 111 lower than at this change's base commit; and no criterion of the requirement names a whole-corpus absolute | Snapshot | P0 | FR-070-AC-7, FR-070-AC-8, FR-070-AC-20, FR-070-CON-7 | 🚧 measured by `make conformance`, which `make test` does not run; no test binds this row |
| TC-822 | The ten named corpus paths, `conformance/divergences.json`, the three sibling registry rows and the Rust inventory component are byte-unchanged, and no corpus file is edited to make the backend agree | Analysis | P0 | FR-070-AC-9, FR-070-AC-14, FR-070-AC-18, FR-070-CON-2 | ✅ passed — Analysis; the evidence is the recorded analysis, which mints no source symbol |
| TC-823 | Every admitted case generates a package and all of them typecheck as one compiler program, and a case refused on representability emits no file and names the construct; instance-level acceptance and rejection are FR-066's authored corpus, because the conformance corpus supplies no payloads | Compile | P0 | FR-070-AC-10, FR-070-AC-12 | 🚧 measured by `make conformance`, which `make test` does not run; no test binds this row |
| TC-824 | A seeded disagreement is registered as a divergence with an owner and a verdict and fails once unreproduced, the inventory discharges only the conformance clause, and nothing is published | Integration | P0 | FR-070-AC-13, FR-070-AC-15, FR-070-AC-16, FR-070-CON-3, FR-070-CON-4 | 🚧 measured by `make conformance`, which `make test` does not run; no test binds this row |
| TC-825 | `generate` over the committed fixture IR writes the expected package byte for byte and exits `0`, `biome format .` reports no change over it, `biome.json` is unchanged, and the committed fixture is never regenerated to make a comparison pass | Snapshot | P0 | FR-071-AC-1, FR-071-AC-17, FR-071-CON-5 | 🚧 partially exercised by an existing test; no test binds this row |
| TC-826 | Runs into two directories, from another working directory, under `LC_ALL=tr_TR.UTF-8`, and with every environment variable cleared but `PATH` all produce identical bytes and manifests | Integration | P0 | FR-071-AC-2, FR-071-AC-3 | 🚧 partially exercised by an existing test; no test binds this row |
| TC-827 | A blocking diagnostic, and a formatter exiting non-zero, each write no file under a fresh `--out-root`, leave a pre-existing file byte-unchanged, exit `1` with an empty `files` array, and create only caller-named paths and their `.tmp` siblings | Integration | P0 | FR-071-AC-4, FR-071-AC-5, FR-071-AC-18 | 🚧 no discrete test; no test binds this row |
| TC-828 | An unknown command, unknown flag, missing flag and unreadable `--limits` each exit `2` with usage text; a `--target` naming a registered declared-unimplemented target prints that target and its registered owning issue and exits `1`; a `--target` outside the vocabulary exits `2` | Unit | P0 | FR-071-AC-6, FR-071-AC-7 | 🚧 no discrete test; no test binds this row |
| TC-829 | The packed-artifact listing normalized in exactly `mtime`, `uid`, `gid`, `uname`, and `gname` is equal between runs and still differs on a one-byte content change | Integration | P0 | FR-071-AC-8 | 🚧 partially exercised by an existing test; no test binds this row |
| TC-830 | The type-level fixtures compile, the four deliberately-uncompilable ones each fail with the expected diagnostic code, the four presence and nullability forms are proved by assignability probes, and the whole check runs as one compiler program whose added wall-clock time the run records | Compile | P0 | FR-071-AC-9, FR-071-AC-10, FR-071-AC-20 | 🚧 partially exercised by an existing test; no test binds this row |
| TC-831 | The committed reachable-symbol record matches the walk for every declared entry module, adding an export fails the check, removing `"sideEffects": false` makes the walk fail rather than report a set, and the measurement adds no dependency to either lockfile | Analysis | P0 | FR-071-AC-11, FR-071-CON-7 | ✅ passed — Analysis; the evidence is the recorded analysis, which mints no source symbol |
| TC-832 | `make generate-typescript-check` leaves `git status --porcelain` unchanged, and no target of this requirement rewrites a committed artifact inside the tree | Integration | P0 | FR-071-AC-12, FR-071-CON-3 | 🚧 no discrete test; no test binds this row |
| TC-833 | The four existing verbs keep their flags, exit codes and output; `package.json` metadata is unchanged against the range's base endpoint; the root `tsconfig.json` differs by exactly one `exclude` entry; and the command reads no environment variable, opens no socket, and starts no child program but the pinned formatter | Integration | P0 | FR-071-AC-13, FR-071-AC-14, FR-071-AC-15, FR-071-AC-16, FR-071-AC-19, FR-071-CON-1, FR-071-CON-2, FR-071-CON-4, FR-071-CON-6, FR-071-CON-8 | 🚧 no discrete test; no test binds this row |
| TC-834 | Two generation runs, a run from a scratch working directory, and a run under `LC_ALL=tr_TR.UTF-8` all produce byte-identical files and manifests | Snapshot | P0 | NFR-024-AC-1, NFR-024-AC-2, NFR-024-AC-3 | ✅ passed — id-bound in `test/typescript-backend.test.ts` |
| TC-835 | Two packed artifacts are identical after normalizing exactly `mtime`, `uid`, `gid`, `uname`, and `gname`, and no other member | Integration | P0 | NFR-024-AC-4 | ✅ passed — id-bound in `test/typescript-backend.test.ts` |
| TC-836 | The generated import graph names no prohibited-category identifier, every specifier is relative, and the generated manifest declares no dependency block | Static | P0 | NFR-024-AC-5, NFR-024-AC-6 | ✅ passed — id-bound in `test/typescript-backend.test.ts` |
| TC-837 | Generated source carries no `any`, cast, or suppression, no backend module reads a clock, environment, cwd, filesystem, or socket, and none calls `localeCompare` | Static | P0 | NFR-024-AC-7, NFR-024-AC-8, NFR-024-AC-9 | ✅ passed — id-bound in `test/typescript-backend.test.ts` |
| TC-838 | Every generated file carries the AGPL-3.0-only SPDX header, is a formatter no-op, and the package typechecks under `strict` with `exactOptionalPropertyTypes`, and the single-type reachable-symbol set matches the committed fixture | Compile | P0 | NFR-024-AC-10, NFR-024-AC-11, NFR-024-AC-12, NFR-024-AC-13 | 🚧 partially exercised by an existing test; no test binds this row |
| TC-839 | Every path in this change's own set is permitted and none is prohibited, with both ends of the range resolved from history and the diff taken with `--no-renames` | Analysis | P0 | NFR-025-AC-1 | ✅ passed — id-bound in `test/typescript-backend.test.ts` |
| TC-840 | A synthetic history landing an unrelated commit after this change's tip leaves the path set unchanged, every gate still fails on the input it exists to catch after the merge, and a synthetic history landing a sibling backend first falsifies no criterion of this bundle | Unit | P0 | NFR-025-AC-2, NFR-025-AC-11, NFR-025-AC-15 | 🚧 partially exercised by an existing test; no test binds this row |
| TC-841 | `package.json` metadata and both dependency blocks, `pnpm-lock.yaml` and `poetry.lock` are absent from this change's own path set and byte-identical between the range's two history-pinned endpoints, and the root `tsconfig.json` differs by exactly one `exclude` entry | Analysis | P0 | NFR-025-AC-3, NFR-025-AC-4, NFR-025-AC-13 | ✅ passed — id-bound in `test/typescript-backend.test.ts` |
| TC-842 | The narrow interface exports exactly fifteen symbols, and the frozen prototype backends and the four issue #4 goldens are absent from this change's path set with their comparisons still passing in the checked-out tree | Snapshot | P0 | NFR-025-AC-5, NFR-025-AC-6 | 🚧 partially exercised by an existing test; no test binds this row |
| TC-843 | No corpus case, base, oracle module, harness module, threshold, defect row, gap row, mutation row, conformance schema, or divergence register changed a byte; and `npm pack --dry-run` lists the added `src/compiler/` modules as source and no generated-package or fixture file | Analysis | P0 | NFR-025-AC-7, NFR-025-AC-8, NFR-025-AC-12, NFR-025-AC-14 | ✅ passed — Analysis; the evidence is the recorded analysis, which mints no source symbol |
| TC-844 | Every generated manifest and added source file declares AGPL-3.0-only, and reverting this change's commit range leaves the full suite passing | Integration | P0 | NFR-025-AC-9, NFR-025-AC-10 | 🚧 no discrete test; no test binds this row |
| TC-645 | Every structural kind maps to its declared Rust form | Unit | P0 | FR-054-AC-1, FR-054-CON-1 | 🚧 planned |
| TC-646 | Every kernel scalar maps to its declared Rust base | Unit | P0 | FR-054-AC-2 | 🚧 planned |
| TC-647 | The collection, nullability and presence axes compose the declared Rust type and stay distinct | Unit | P0 | FR-054-AC-3 | 🚧 planned |
| TC-648 | An absent member and a present null stay distinguishable through a round trip | Unit | P0 | FR-054-AC-4 | 🚧 planned |
| TC-649 | A union round-trips externally tagged, with and without a payload | Unit | P1 | FR-054-AC-5 | 🚧 planned |
| TC-650 | The three unknown policies behave as declared and never fill a known field | Unit | P0 | FR-054-AC-6 | 🚧 planned |
| TC-651 | Recursive type graphs compile and box a stable field set across two runs | Integration | P0 | FR-054-AC-7 | 🚧 planned |
| TC-652 | Relationships, operations, clauses, roles, origins and occurrences survive into metadata | Unit | P0 | FR-054-AC-8 | 🚧 planned |
| TC-653 | A semantic default applies and a representation or migration default does not | Unit | P1 | FR-054-AC-9 | 🚧 planned |
| TC-654 | A 1.0.0 document derives multiplicity, and a 1.1.0 node inside one is refused | Unit | P0 | FR-054-AC-10 | 🚧 planned |
| TC-655 | The published mapping table, the requirement's rows and the serde-only dependency set agree | Analysis | P0 | FR-054-AC-11, FR-054-AC-14, FR-054-CON-4 | 🚧 planned |
| TC-656 | A construct with no mapping row is refused and writes no file | Unit | P0 | FR-054-AC-12 | 🚧 planned |
| TC-657 | The mapping model is invariant under key and identity-set reordering and reads no ambient input | Property | P0 | FR-054-AC-13, FR-054-CON-3 | 🚧 planned |
| TC-658 | Case renderings segment acronyms, separators and digits as declared | Unit | P0 | FR-055-AC-1 | 🚧 planned |
| TC-659 | Reserved words render raw, and the four with no raw form are refused | Unit | P0 | FR-055-AC-2 | 🚧 planned |
| TC-660 | A name rendering to the empty string is refused naming its identity | Unit | P1 | FR-055-AC-3 | 🚧 planned |
| TC-661 | A digit-leading name is prefixed and the crate compiles | Unit | P1 | FR-055-AC-4 | 🚧 planned |
| TC-662 | A colliding pair raises one NAME_COLLISION naming both identities and writes no file | Unit | P0 | FR-055-AC-5, FR-055-CON-1 | 🚧 planned |
| TC-663 | Every renamed member carries a serde rename back to the contract name | Unit | P0 | FR-055-AC-6 | 🚧 planned |
| TC-664 | Derivation is position-independent, order-independent, ambient-free and injective-or-refusing | Property | P0 | FR-055-AC-7..FR-055-AC-9, FR-055-CON-3 | 🚧 planned |
| TC-665 | The pinned reserved-word list matches the language reference for the declared edition | Analysis | P1 | FR-055-AC-10, FR-055-CON-2 | 🚧 planned |
| TC-666 | Each corpus base generates a crate that builds offline with warnings denied | Integration | P0 | FR-056-AC-1 | 🚧 planned |
| TC-667 | The emitted manifest declares the licence, publish false, one pinned dependency and the MSRV | Analysis | P0 | FR-056-AC-2, FR-056-CON-3 | 🚧 planned |
| TC-668 | Provenance constants equal the compiler request member by member | Unit | P0 | FR-056-AC-3 | 🚧 planned |
| TC-669 | The SemanticType export is exhaustive and an added type breaks a consumer match | Compile | P0 | FR-056-AC-4 | 🚧 planned |
| TC-670 | The output manifest names exactly the files written, with matching digests | Unit | P0 | FR-056-AC-5 | 🚧 planned |
| TC-671 | A blocking diagnostic writes zero files and leaves the output root empty | Unit | P0 | FR-056-AC-6 | 🚧 planned |
| TC-672 | Emitted bytes carry no clock, host, path, user or environment value | Unit | P0 | FR-056-AC-7, FR-056-CON-2 | 🚧 planned |
| TC-673 | Each declared limit raises its diagnostic and writes no file | Unit | P0 | FR-056-AC-8 | 🚧 planned |
| TC-674 | The only open-typed members the crate exposes are the three declared ones | Static | P0 | FR-056-AC-9, FR-054-CON-2 | 🚧 planned |
| TC-675 | Generation writes nothing outside the output root and refuses an escaping root | Unit | P0 | FR-056-AC-10, FR-056-CON-5 | 🚧 planned |
| TC-676 | The emitted licence is byte-identical and the pure emitter touches no filesystem | Static | P0 | FR-056-AC-11, FR-056-AC-12, FR-056-CON-1, FR-056-CON-4 | 🚧 planned |
| TC-677 | Every constraint keyword on every applicable subject accepts and rejects through both entry points | Unit | P0 | FR-057-AC-1 | 🚧 planned |
| TC-678 | An inapplicable constraint is refused rather than silently dropped | Unit | P0 | FR-057-AC-2 | 🚧 planned |
| TC-679 | classifyPattern separates the supported subset from lookaround and backreferences | Unit | P0 | FR-057-AC-3 | 🚧 planned |
| TC-680 | An unregistered lookahead pattern raises UNSUPPORTED_PATTERN and writes no file | Unit | P0 | FR-057-AC-4, FR-057-CON-2 | 🚧 planned |
| TC-681 | The generated matcher agrees with an ECMA-262 engine over the declared pattern set | Property | P0 | FR-057-AC-5 | 🚧 planned |
| TC-682 | SourceLocusPath decides exactly the language the published locus pattern denotes | Property | P0 | FR-057-AC-6 | 🚧 planned |
| TC-683 | The published and intended locus-path predicates differ, and the divergence is recorded | Unit | P0 | FR-057-AC-7, FR-057-CON-5 | 🚧 planned |
| TC-684 | The matcher stays inside its step bound over a catastrophic-backtracking catalogue | Fuzz | P0 | FR-057-AC-8, FR-057-CON-4 | 🚧 planned |
| TC-685 | ValidationError names the constraint, keyword, path and operand and bounds echoed input | Unit | P1 | FR-057-AC-9 | 🚧 planned |
| TC-686 | An unregistered format name is refused | Unit | P1 | FR-057-AC-10 | 🚧 planned |
| TC-687 | Removing the proved-validator entry turns the locus pattern into a refusal | Unit | P0 | FR-057-AC-11 | 🚧 planned |
| TC-688 | Perturbing the hand-written validator makes the differential harness fail naming the input | Unit | P0 | FR-057-AC-12, FR-057-CON-3 | 🚧 planned |
| TC-689 | The generated crate depends on no regex engine | Analysis | P0 | FR-057-AC-13, FR-057-CON-1 | 🚧 planned |
| TC-690 | Every registered diagnostic code is raised by a constructed input | Unit | P0 | FR-058-AC-1 | 🚧 planned |
| TC-691 | An unregistered diagnostic entry throws and no live path spells a code as a literal | Static | P0 | FR-058-AC-2, FR-058-CON-1 | 🚧 planned |
| TC-692 | Each blocking code yields zero files, the declared result state and a diagnostic | Unit | P0 | FR-058-AC-3 | 🚧 planned |
| TC-693 | Three distinct blocking defects are all reported in one run | Unit | P1 | FR-058-AC-4 | 🚧 planned |
| TC-694 | The degradation scan finds a degraded type only where the mapping table declares one | Static | P0 | FR-058-AC-5, FR-058-CON-2 | 🚧 planned |
| TC-695 | Declared loss warns and undeclared loss blocks | Unit | P0 | FR-058-AC-6 | 🚧 planned |
| TC-696 | Diagnostic order and truncation are locale- and traversal-independent and bounded | Unit | P0 | FR-058-AC-7..FR-058-AC-9, FR-058-CON-3 | 🚧 planned |
| TC-697 | The published code table matches the registry, and reverting the refusal branch fails a test | Analysis | P0 | FR-058-AC-10, FR-058-AC-11, FR-058-CON-4 | 🚧 planned |
| TC-698 | The rust-backend adapter runs as a process and matches the oracle on every judged case | Integration | P0 | FR-059-AC-1 | 🚧 planned |
| TC-699 | The adapter answers every manifest case once, echoing the digest, and an omission is reported | Integration | P0 | FR-059-AC-2, FR-059-CON-3 | 🚧 planned |
| TC-700 | The adapter's normalized string is byte-identical to the oracle's | Integration | P0 | FR-059-AC-3 | 🚧 planned |
| TC-701 | The adapter's diagnostic codes and severities equal the oracle's in order | Integration | P0 | FR-059-AC-4 | 🚧 planned |
| TC-702 | The adapter's compatibility classification equals the oracle's | Integration | P0 | FR-059-AC-5 | 🚧 planned |
| TC-703 | PROV-002 is answered unsupported and counted unmet rather than passed | Integration | P0 | FR-059-AC-6 | 🚧 planned |
| TC-704 | The Rust reader's module graph reaches neither the oracle nor the compiler reader | Static | P0 | FR-059-AC-7, FR-059-CON-1 | 🚧 planned |
| TC-705 | Every success case generates a compiling crate and round-trips its own document | Integration | P0 | FR-059-AC-8 | 🚧 planned |
| TC-706 | Every invalid case is rejected naming a registered code | Integration | P0 | FR-059-AC-9 | 🚧 planned |
| TC-707 | The five published target verdicts are decided exactly as the rust column states | Unit | P0 | FR-059-AC-10 | 🚧 planned |
| TC-708 | The reader returns diagnostics and never panics over mutated documents | Fuzz | P0 | FR-059-AC-11, FR-059-CON-5 | 🚧 planned |
| TC-709 | The only conformance path this change touches is the rust-backend registry entry | Analysis | P0 | FR-059-AC-12, FR-059-CON-2 | 🚧 planned |
| TC-710 | Removing the adapter command returns the slot to unmet, and the GAP-011 dependency is recorded | Integration | P0 | FR-059-AC-13, FR-059-AC-14, FR-059-CON-4 | 🚧 planned |
| TC-711 | Two generations of one request are byte-identical over an actual second run | Snapshot | P0 | FR-060-AC-1, FR-060-CON-2 | 🚧 planned |
| TC-712 | Generation is byte-unchanged across the declared environment perturbations | Unit | P0 | FR-060-AC-2 | 🚧 planned |
| TC-713 | The formatter reports no change over every generated crate | Integration | P0 | FR-060-AC-3 | 🚧 planned |
| TC-714 | The committed goldens equal a fresh generation and an emitter edit fails the check | Snapshot | P0 | FR-060-AC-4, FR-060-CON-1 | 🚧 planned |
| TC-715 | The golden check leaves the working tree clean | Integration | P0 | FR-060-AC-5 | 🚧 planned |
| TC-716 | The generator's live graph reaches no clock, RNG, environment, cwd or child process | Static | P0 | FR-060-AC-6, FR-060-CON-4 | 🚧 planned |
| TC-717 | The emitted MSRV matches the matrix and every matrix row is evidenced or recorded unmet | Analysis | P0 | FR-060-AC-7, FR-060-AC-8, FR-060-CON-3 | 🚧 planned |
| TC-718 | Output is invariant under document reordering and the manifest file list is sorted | Property | P0 | FR-060-AC-9, FR-060-AC-10 | 🚧 planned |
| TC-719 | The packaged crate unpacks and both consumers build offline with a clean tree | Integration | P0 | FR-061-AC-1, FR-061-CON-4 | 🚧 planned |
| TC-720 | An added type breaks the exhaustive match and a changed count breaks the const assertion | Compile | P0 | FR-061-AC-2, FR-061-AC-3, FR-061-CON-3 | 🚧 planned |
| TC-721 | Every positive fixture round-trips canonically equal through the generated crate | Integration | P0 | FR-061-AC-4 | 🚧 planned |
| TC-722 | Each of the eight invalid classes is rejected with the expected error | Integration | P0 | FR-061-AC-5 | 🚧 planned |
| TC-723 | A preserved unknown member survives a round trip and a rejecting type refuses it | Integration | P0 | FR-061-AC-6 | 🚧 planned |
| TC-724 | No step reaches a registry or the network and no consumer path escapes the scratch directory | Analysis | P0 | FR-061-AC-7..FR-061-AC-9, FR-061-CON-1, FR-061-CON-2 | 🚧 planned |
| TC-725 | Every branch row names a case that exists and asserts against an independent expectation | Analysis | P0 | FR-062-AC-1, FR-062-CON-1 | 🚧 planned |
| TC-726 | A branch added without a case fails the register check naming the branch | Unit | P0 | FR-062-AC-2, FR-062-CON-4 | 🚧 planned |
| TC-727 | Every catalogued mutation is detected, and suppressing its case drops the score | Unit | P0 | FR-062-AC-3, FR-062-AC-4 | 🚧 planned |
| TC-728 | Each declared property holds over the generated document set with a printed seed | Property | P0 | FR-062-AC-5, FR-062-CON-3 | 🚧 planned |
| TC-729 | A deliberately degrading emitter is caught by a property and by a mutation row | Unit | P0 | FR-062-AC-6 | 🚧 planned |
| TC-730 | The mutation run leaves the tree clean and the register covers every vocabulary | Analysis | P0 | FR-062-AC-7, FR-062-AC-8, FR-062-CON-2 | 🚧 planned |
| TC-731 | Byte differences across two runs, four environment perturbations and every evidenced matrix row are zero | Snapshot | P0 | NFR-022 | 🚧 planned |
| TC-732 | The generator's live module graph reaches no ambient input | Static | P0 | NFR-022 | 🚧 planned |
| TC-733 | A generated crate's runtime dependency set is serde alone | Analysis | P0 | NFR-022 | 🚧 planned |
| TC-734 | Generation, build and consumption complete with the network denied | Integration | P0 | NFR-022-AC-4 | 🚧 planned |
| TC-735 | The degradation scan and the support matrix are measured against published sources, not their own output | Analysis | P0 | NFR-022-AC-2, NFR-022-AC-3 | 🚧 planned |
| TC-736 | A gate that cannot resolve its inputs fails naming them rather than passing vacuously | Unit | P0 | NFR-022-AC-1 | 🚧 planned |
| TC-737 | Every path in this change's own set is permitted and none is prohibited | Analysis | P0 | NFR-023-AC-1 | 🚧 planned |
| TC-738 | The published package manifest's metadata fields are byte-unchanged | Analysis | P0 | NFR-023-AC-2 | 🚧 planned |
| TC-739 | Every conformance file but the adapter registry is byte-unchanged and the registry change is confined to the rust slot | Analysis | P0 | NFR-023-AC-3 | 🚧 planned |
| TC-740 | Schemas, fixtures, packages, spikes and the frozen prototype backends are byte-unchanged | Analysis | P0 | NFR-023-AC-4, FR-054-CON-5 | 🚧 planned |
| TC-741 | Every emitted crate manifest carries publish false, and removing that emission fails a test | Unit | P0 | NFR-023-AC-5 | 🚧 planned |
| TC-742 | No crate was published, no downstream repository changed, and every added manifest is AGPL-3.0-only | Analysis | P0 | NFR-023-AC-6, NFR-023-AC-7 | 🚧 planned |
| TC-743 | Reverting this change's own range leaves the suite green at the pre-existing count | Integration | P0 | NFR-023-AC-8 | 🚧 planned |
| TC-744 | Both range endpoints come from history, the gate still bites after merge, a later change adds no path, and the permitted list was not widened | Integration | P0 | NFR-023-AC-9..NFR-023-AC-11 | 🚧 planned |
| TC-845 | The installed `datamodel-code-generator` distribution reports version 0.76.0, declares the MIT licence, and is neither vendored nor forked into this repository | Unit | P0 | FR-072-AC-1, FR-072-CON-3 | ✅ passed |
| TC-846 | `advisories.json` carries both advisory ids with their published ranges and first-patched versions, and derives the floor 0.64.0 | Unit | P0 | FR-072-AC-2 | ✅ passed |
| TC-847 | A synthesized installed version inside either published advisory range fails the gate naming the advisory, the version, and the range | Unit | P0 | FR-072-AC-3, FR-072-CON-1 | ✅ passed |
| TC-848 | A synthesized version below the derived floor but outside both published ranges still fails, because the floor is compared by version order | Unit | P0 | FR-072-AC-4 | ✅ passed |
| TC-849 | With the generator distribution absent the advisory gate fails with a provisioning message and does not skip | Unit | P0 | FR-072-AC-5, FR-072-CON-4 | ✅ passed |
| TC-850 | Every declared version in `toolchain.json` matches the distribution it names, comparing the Python entry by minor series only | Unit | P0 | FR-072-AC-6 | ✅ passed |
| TC-851 | Neither the `http` nor the `httpx2` generator extra is present in the resolved dependency set | Static | P0 | FR-072-AC-7 | ✅ passed |
| TC-852 | `DATAMODEL_CODEGEN_VERSION` and `PYDANTIC_VERSION` equal the `toolchain.json` entries and the versions `poetry.lock` resolves | Unit | P0 | FR-072-AC-8 | ✅ passed |
| TC-853 | `toolchain.json` carries no patch-level interpreter version and no formatter entry, and every advisory vector key appears in the refusal register | Unit | P0 | FR-072-AC-9, FR-072-AC-10 | ✅ passed |
| TC-854 | `profiles.json` declares exactly one profile per output family, all five are present, and every id is unique | Unit | P0 | FR-073-AC-1 | ✅ passed |
| TC-855 | Every profile declares `--disable-timestamp`, `--strict-refs`, `--no-allow-remote-refs`, and `--formatters builtin` | Unit | P0 | FR-073-AC-2 | ✅ passed |
| TC-856 | Every profile declares the five annotation and nullability options and declares neither `--extra-fields` nor `--use-missing-sentinel` | Unit | P0 | FR-073-AC-3, FR-073-CON-1 | ✅ passed |
| TC-857 | No profile declares a prohibited generator option, matched by exact option token rather than by substring | Static | P0 | FR-073-AC-4, FR-073-CON-2 | ✅ passed |
| TC-858 | A generation request naming an undeclared profile id is refused naming the id and listing the declared ids | Unit | P0 | FR-073-AC-5 | ✅ passed |
| TC-859 | A generation request supplying its own generator option is refused whether the option is prohibited, permitted, or already present | Unit | P0 | FR-073-AC-6 | ✅ passed |
| TC-860 | `profile_digest` is stable across calls, changes on any option value or order change, and is unchanged by recording a verdict | Property | P0 | FR-073-AC-7 | ✅ passed |
| TC-861 | Every profile's output model type and declared Python version are values the installed generator's own option parser accepts | Integration | P1 | FR-073-AC-8 | ✅ passed |
| TC-862 | Mutating the value `load_profiles` returns at any depth does not change what a second call returns, and every declared profile id appears in the qualification report | Property | P0 | FR-073-AC-9, FR-073-AC-10, FR-073-CON-3 | ✅ passed |
| TC-863 | The prepared committed adapter output differs from the committed file only by the declared rewrites, each named by pointer in the preparation record | Unit | P0 | FR-074-AC-1 | ✅ passed |
| TC-864 | `unevaluatedProperties` at any depth and inside any applicator becomes `additionalProperties`, and no `unevaluatedProperties` key survives | Property | P0 | FR-074-AC-2 | ✅ passed |
| TC-865 | The prepared adapter output yields a closed model where the unprepared file yields an open one, for both Pydantic families and for TypedDict | Integration | P0 | FR-074-AC-3 | ✅ passed |
| TC-866 | A subschema stating closure twice with differing values raises naming its pointer, while deep-equal duplicates do not | Unit | P0 | FR-074-AC-4 | ✅ passed |
| TC-867 | The preparation record names every rewrite with its rule, document, and pointer, and is empty for a document needing none | Unit | P1 | FR-074-AC-5 | ✅ passed |
| TC-868 | Calling the preparation pass twice returns deep-equal results and leaves every input document deep-equal to its pre-call state | Property | P0 | FR-074-AC-6 | ✅ passed |
| TC-869 | The `sourceLocus` path pattern survives the pass byte-for-byte, lookaheads included, and compiles under Python's `re` | Unit | P0 | FR-074-AC-7 | ✅ passed |
| TC-870 | Over the thirteen published documents the prepared set carries the same constraint-keyword multiset and the same `$ref` set as the input | Property | P0 | FR-074-AC-8, FR-074-CON-2 | ✅ passed |
| TC-871 | The pass opens no socket, reads no clock, reads only the files it was given, and no adapter module edits generated Python text | Unit | P0 | FR-074-AC-9, FR-074-AC-11, FR-074-CON-1 | ✅ passed |
| TC-872 | `python-schema.mjs`, the committed `input.schema.json`, and every published v1 schema are byte-identical to `origin/main` | Static | P0 | FR-074-AC-10, FR-074-CON-3 | ✅ passed |
| TC-873 | Each of the five forbidden schema keys is refused at a generated position drawn from the root, every `$defs` entry, and every applicator keyword | Property | P0 | FR-075-AC-1 | ✅ passed |
| TC-874 | Every key the refusal register names is bound by the installed generator's own source, and FR-043's three keys are all present | Integration | P0 | FR-075-AC-2, FR-075-CON-2 | ✅ passed |
| TC-875 | A `$ref` carrying a URI scheme, an absolute path, a `..`-relative path, or a drive-letter path is refused naming the pointer | Unit | P0 | FR-075-AC-3 | ✅ passed |
| TC-876 | A local pointer `$ref` and a sibling-filename `$ref` into the input set are both accepted | Unit | P0 | FR-075-AC-4 | ✅ passed |
| TC-877 | Every prohibited option is refused in both spellings at a generated position in the argument vector, naming the token and its index | Property | P0 | FR-075-AC-5 | ✅ passed |
| TC-878 | An option token absent from the allow-list is refused naming the token and its index | Unit | P0 | FR-075-AC-6, FR-075-CON-3 | ✅ passed |
| TC-879 | Every declared profile's argument vector passes the argument guard, so the declared set and the guard cannot disagree | Unit | P0 | FR-075-AC-7 | ✅ passed |
| TC-880 | A refused request writes no file and spawns no process, asserted by an instrumented spawn and an instrumented writer | Unit | P0 | FR-075-AC-8 | ✅ passed |
| TC-881 | The malicious-schema regression corpus refuses every document and generates nothing, covering each key, each refused ref shape, and each prohibited option | Unit | P0 | FR-075-AC-9 | ✅ passed |
| TC-882 | Refusal codes are unique, complete, and each raisable, and the entry point calls both guards before any other work | Unit | P0 | FR-075-AC-10, FR-075-AC-11, FR-075-CON-1 | ✅ passed |
| TC-883 | Two generations of the same prepared input set into fresh scratch roots yield byte-identical file maps and an identical fingerprint | Integration | P0 | FR-076-AC-1 | ✅ passed |
| TC-884 | No generated file contains a date, a time, an absolute path from the generating host, a user name, or a hostname | Integration | P0 | FR-076-AC-2 | ✅ passed |
| TC-885 | A refused schema raises before any subprocess is spawned, asserted by an instrumented spawn counter reading zero | Unit | P0 | FR-076-AC-3 | ✅ passed |
| TC-886 | A timed-out generation terminates the subprocess, names the timeout, removes the scratch root, and leaves the output directory unchanged; the scratch root is absent after every outcome | Integration | P0 | FR-076-AC-4, FR-076-AC-13 | ✅ passed |
| TC-887 | An input set of exactly the declared maximum proceeds and one byte larger fails naming the limit before any spawn | Unit | P0 | FR-076-AC-5 | ✅ passed |
| TC-888 | A generator run that writes zero files fails rather than reporting success | Unit | P0 | FR-076-AC-6 | ✅ passed |
| TC-889 | A standard-error diagnostic outside the allow-list fails the run naming it, and the result enumerates the allow-list | Integration | P0 | FR-076-AC-7, FR-076-CON-3 | ✅ passed |
| TC-890 | No socket is opened during a generation, asserted by instrumenting `socket.socket`, and every gate input is a committed local document | Integration | P0 | FR-076-AC-8, FR-076-CON-4 | ✅ passed |
| TC-891 | With a shadowing `datamodel-codegen` earlier on `PATH`, the pinned distribution's entry point is still the one invoked | Integration | P0 | FR-076-AC-9 | ✅ passed |
| TC-892 | The subprocess environment carries exactly the allow-listed names, no proxy variable, no caller `PYTHONPATH`, and a fixed `PYTHONHASHSEED` | Unit | P0 | FR-076-AC-10 | ✅ passed |
| TC-893 | With the generator absent the runner fails with a provisioning message, and the runner reads every limit from `limits.json` rather than a literal | Unit | P0 | FR-076-AC-11, FR-076-AC-14, FR-076-CON-5 | ✅ passed |
| TC-894 | No module under `src/compiler/` spawns a process or imports the generator, and the runner lives outside `src/compiler/` | Static | P0 | FR-076-AC-12, FR-076-CON-1, FR-076-CON-2 | ✅ passed |
| TC-895 | Every named construct area has at least one probe, and every probe declares a detector and an expected retention for all five families | Unit | P0 | FR-077-AC-1 | ✅ passed |
| TC-896 | `report.json` carries one verdict per declared profile, each citing the declared-toolchain fingerprint and the profile digest | Unit | P0 | FR-077-AC-2 | ✅ passed |
| TC-897 | Measured retention equals every probe's declared expectation, and a mutated expectation makes the gate red | Integration | P0 | FR-077-AC-3 | ✅ passed |
| TC-898 | Every construct-and-family pair measured as lost has a `gaps.json` row with severity, closability, and disposition; removing a row reds the gate | Unit | P0 | FR-077-AC-4 | ✅ passed |
| TC-899 | The Pydantic BaseModel and Pydantic dataclass artefacts each import, accept a conforming value, and raise on a non-conforming one | Integration | P0 | FR-077-AC-5 | ✅ passed |
| TC-900 | The stdlib dataclass verdict enumerates the constructs it drops, including bounds, patterns, formats, closure, discriminated unions, and aliases | Integration | P0 | FR-077-AC-6 | ✅ passed |
| TC-901 | Every `qualified-with-conditions` condition names an option present in that profile or a rule present in the preparation pass | Unit | P0 | FR-077-AC-7 | ✅ passed |
| TC-902 | The qualification report and the corpus account are byte-identical on a second measurement, and `--check` fails on a mutated committed artefact | Snapshot | P0 | FR-077-AC-8 | ✅ passed |
| TC-903 | The corpus account's decided, agreed, disagreed, and undecidable counts sum to the case count and it states the backend's rows remain unmet | Unit | P0 | FR-077-AC-9, FR-077-CON-4 | ✅ passed |
| TC-904 | Every file under `conformance/` is byte-identical to `origin/main` on this branch | Analysis | P0 | FR-077-AC-10, FR-077-CON-3 | ✅ passed |
| TC-905 | `gaps.json` records no hand-written generator as a disposition absent a reviewed P0 decision naming the reviewer and the date | Unit | P0 | FR-077-AC-11, FR-077-CON-1 | ✅ passed |
| TC-906 | A probe whose construct no family retains yields five `gaps.json` rows, one per family, rather than one row or a corpus defect | Unit | P1 | FR-077-AC-12 | ✅ passed |
| TC-907 | No verdict word outside the declared three appears in the report, the profiles, the gap register, or the Test Matrix | Static | P0 | FR-077-AC-13 | ✅ passed |
| TC-908 | In enforcing mode an attribute annotated `Any` where the schema declares a string raises, naming module, symbol, and schema pointer | Unit | P0 | FR-078-AC-1, FR-078-CON-1 | ✅ passed |
| TC-909 | Each of the four sanctioned schema shapes is classified sanctioned and fails in neither mode | Unit | P0 | FR-078-AC-2 | ✅ passed |
| TC-910 | The thirteen published documents under every profile yield zero degraded and zero unattributed findings, each sanctioned pointer independently confirmed unconstrained | Integration | P0 | FR-078-AC-3 | ✅ passed |
| TC-911 | A permissive annotation at any depth of a union, a list, a dict, or an Annotated form is reported | Property | P0 | FR-078-AC-4 | ✅ passed |
| TC-912 | A generated module importing `os` is refused naming the import; one importing a sibling generated module is not | Unit | P0 | FR-078-AC-5, FR-078-CON-2 | ✅ passed |
| TC-913 | A module-level call other than `model_rebuild` is refused naming the statement and its line | Unit | P0 | FR-078-AC-6 | ✅ passed |
| TC-914 | Neither inspection mode imports or executes the module under inspection, asserted by instrumenting the import machinery | Unit | P0 | FR-078-AC-7, FR-078-CON-3 | ✅ passed |
| TC-915 | The report's ordering is identical across two runs over the same files presented in a different order | Property | P1 | FR-078-AC-8 | ✅ passed |
| TC-916 | An unattributable annotation raises in enforcing mode and becomes an unattributed census entry with no failure in reporting mode | Unit | P0 | FR-078-AC-9 | ✅ passed |
| TC-917 | Disabling the degraded branch through the injected classifier seam makes the degradation probe pass, and restoring it makes the probe fail; a numbered symbol variant is attributed to the name it varies | Unit | P0 | FR-078-AC-10, FR-078-AC-11 | ✅ passed |
| TC-918 | Each demonstrated profile has one module per input document, a sorted complete `__all__`, and a duplicate type name across documents raises naming both | Unit | P0 | FR-079-AC-1, FR-079-AC-10 | ✅ passed |
| TC-919 | Each generated package imports under the declared interpreter with no exception and no warning, and no model retains an unresolved forward reference | Integration | P0 | FR-079-AC-2 | ✅ passed |
| TC-920 | `PROVENANCE.json` carries every required digest and licence field and carries no clock reading or host-observed version | Unit | P0 | FR-079-AC-3, FR-079-CON-3 | ✅ passed |
| TC-921 | Regenerating an unchanged input reproduces the committed tree byte-for-byte, and `--check` fails on a mutated committed file | Snapshot | P0 | FR-079-AC-4, FR-079-CON-2 | ✅ passed |
| TC-922 | Each example constructs a conforming value, round-trips it through serialization, and raises on a non-conforming value | Integration | P0 | FR-079-AC-5 | ✅ passed |
| TC-923 | A `not-qualified` family has no emitted package and a recorded reason, and a degraded tree is refused before any file is written | Unit | P0 | FR-079-AC-6, FR-079-AC-11 | ✅ passed |
| TC-924 | The npm and Python distribution manifests and every workflow file are byte-identical to `origin/main`, and nothing is published | Analysis | P0 | FR-079-AC-7, FR-079-CON-1 | ✅ passed |
| TC-925 | No path under the backend directory is reachable from any published package manifest, checked against the packed file list | Static | P0 | FR-079-AC-8 | ✅ passed |
| TC-926 | The content fingerprint changes when any generated byte changes and is identical otherwise | Property | P0 | FR-079-AC-9 | ✅ passed |
| TC-927 | The pinned type checker reports zero errors over every emitted module and every example under strict settings | Analysis | P0 | FR-080-AC-1 | ✅ passed |
| TC-928 | No generated or example source carries a `type: ignore`, and the checker configuration declares no override and no relaxation of strict | Static | P0 | FR-080-AC-2, FR-080-CON-1 | ✅ passed |
| TC-929 | Every generated type in a validating profile is exercised with a conforming and a non-conforming value; an unexercised type reds the gate | Integration | P0 | FR-080-AC-3 | ✅ passed |
| TC-930 | For each retained constraint a non-conforming value is rejected by the family's own runtime, naming the constraint | Integration | P0 | FR-080-AC-4 | ✅ passed |
| TC-931 | For each lost constraint, scratch generation from the corresponding probe produces a surface that accepts the forbidden value | Integration | P0 | FR-080-AC-5 | ✅ passed |
| TC-932 | `validation.json` records static-only and undemonstrated families as such and counts neither as runtime-covered | Unit | P0 | FR-080-AC-6 | ✅ passed |
| TC-933 | With the type checker absent the gate fails with a provisioning message and does not skip | Unit | P0 | FR-080-AC-7 | ✅ passed |
| TC-934 | The added suites report zero skipped tests read from the run's own report, and the coverage account counts no skip | Unit | P0 | FR-080-AC-8, FR-080-CON-2 | ✅ passed |
| TC-935 | Removing a constraint from a probe schema produces, in a scratch directory, a surface that accepts the previously rejected value and the gate reports the difference | Integration | P0 | FR-080-AC-9 | ✅ passed |
| TC-936 | The malicious-schema regression corpus refuses every document before any spawn, covering every key, ref shape, and prohibited option, and the advisory gate fails inside each range and below the floor | Unit | P0 | NFR-026-AC-1, NFR-026-AC-2, NFR-026-AC-7 | ✅ passed |
| TC-937 | Generation opens zero sockets and touches nothing outside its scratch root and the caller-named output, and no file is written before the enforcing inspection returned | Integration | P0 | NFR-026-AC-3, NFR-026-AC-4, NFR-026-AC-11 | ✅ passed |
| TC-938 | The inspection executes no generated module, refuses an out-of-allow-list import, and the refusal register is a measured superset of FR-043's keys | Unit | P0 | NFR-026-AC-5, NFR-026-AC-6, NFR-026-AC-10 | ✅ passed |
| TC-939 | Removing each declared tool in turn makes its gate fail with a provisioning message, no gate skips, and no changed path is prohibited | Unit | P0 | NFR-026-AC-8, NFR-026-AC-9 | ✅ passed |
| TC-940 | Two clean generations of every demonstrated profile agree byte-for-byte, and no committed artefact encodes a clock, host, user, absolute path, patch interpreter, or formatter version | Integration | P0 | NFR-027-AC-1, NFR-027-AC-2 | ✅ passed |
| TC-941 | Re-measuring the qualification report and the corpus account reproduces the committed ones, and a mutated committed artefact fails `--check` | Snapshot | P0 | NFR-027-AC-3 | ✅ passed |
| TC-942 | No changed path falls outside the permitted list, the distribution manifests and workflows are byte-identical to `origin/main`, nothing was published, and no merged permitted-path list gained an entry | Analysis | P0 | NFR-027-AC-4, NFR-027-AC-5, NFR-027-AC-9, NFR-027-AC-11 | ✅ passed |
| TC-943 | No changed-path gate resolves its range from a moving ref, every gate pins both endpoints to history and passes `--no-renames`, fails loudly when its sentinels are absent, still catches a prohibited path after a simulated merge, runs from the repository's test entry point with zero skips, and reverts cleanly | Unit | P0 | NFR-027-AC-6, NFR-027-AC-7, NFR-027-AC-8, NFR-027-AC-10, NFR-027-AC-12 | ✅ passed |
| TC-944 | A recorded human review confirms the four irreducibly manual obligations: a version bump re-runs the qualification, probe expectations are derived from the contract, the layout is reconciled with the merged generated-target contract, and non-conforming values are drawn from the contract rather than from what the code rejects | Manual | P0 | FR-072-CON-2, FR-077-CON-2, FR-079-CON-4, FR-080-CON-3 | 🚧 awaiting the program owner's review |
| TC-945 | The support matrix names every lint the generated `[lints.rust]` table denies, read from a generated `Cargo.toml`, and states the toolchain coupling that denying all warnings creates | Analysis | P0 | FR-060-AC-16 | 🚧 planned |
| TC-1000 | Edits no file under packages/semantic-core/generated/, schema/semantic/v1/, or fixtures/semantic/v1/. The projection is the pinned official emitter's | Static | P0 | FR-081-CON-1, FR-081-CON-2, FR-081-CON-3 | 🚧 planned |
| TC-1001 | Edits neither the repository root package.json nor packages/semantic-core/package.json, so no packed surface changes and packages/semantic-kernel/ is | Static | P0 | FR-081-CON-4, FR-081-CON-5, FR-081-CON-6 | 🚧 planned |
| TC-1002 | Writes only under packages/semantic-kernel/, src/compiler/frontend/json-schema/, scripts/build-semantic-kernel.mjs, test/semantic-kernel.test.ts, src/ | Property | P0 | FR-081-CON-7, FR-081-CON-8, FR-081-AC-1 | 🚧 planned |
| TC-1003 | The same thirty-member set equals the files array of packages/semantic-core/generated/toolchain.json | Property | P0 | FR-081-AC-2, FR-081-AC-3, FR-081-AC-4 | 🚧 planned |
| TC-1004 | The declared schema base equals base in generated/toolchain.json and the @jsonSchema argument in packages/semantic-core/main.tsp | Property | P0 | FR-081-AC-5, FR-081-AC-6, FR-081-AC-7 | 🚧 planned |
| TC-1005 | The declared artifact paths are exactly packages/semantic-kernel/typescript/, packages/semantic-kernel/rust/, packages/semantic-kernel/python/, and pa | Property | P0 | FR-081-AC-8, FR-081-AC-9, FR-081-AC-10 | 🚧 planned |
| TC-1006 | A generated tree whose recorded provenance digest differs from kernelDigest() produces one KERNEL_BUNDLE_STALE diagnostic naming the tree and both dig | Property | P0 | FR-081-AC-11, FR-081-AC-12, FR-081-AC-13 | 🚧 planned |
| TC-1007 | The branch changes no file under packages/semantic-core/, schema/, fixtures/, conformance/, src/compiler/backends/, src/compiler/frontend/typespec/, o | Property | P0 | FR-081-AC-14, FR-081-AC-15, FR-081-AC-16 | 🚧 planned |
| TC-1008 | KERNEL_INVENTORY_MISMATCH and KERNEL_BUNDLE_STALE are members of DIAGNOSTIC_CODES in src/compiler/diagnostics.mjs | Property | P0 | FR-081-AC-17, FR-081-AC-18 | 🚧 planned |
| TC-1009 | Leave byte-unchanged every file under schema/**, packages/semantic-core/**, fixtures/**, and conformance/**, together with src/compiler/cli.mjs, src/c | Static | P0 | FR-082-CON-1, FR-082-CON-2, FR-082-CON-3 | 🚧 planned |
| TC-1010 | The lowering compute presence from multiplicity.lower at exactly one call site and at no other, assigning presence from no other module. Two independe | Static | P0 | FR-082-CON-4, FR-082-CON-5, FR-082-CON-6 | 🚧 planned |
| TC-1011 | The two declared representability losses | Unit | P0 | FR-082-CON-7, FR-082-AC-1, FR-082-AC-2 | 🚧 planned |
| TC-1012 | A document carrying additionalProperties, oneOf, allOf, $defs, format, or maxLength produces one blocking UNSUPPORTED_SCHEMA_KEYWORD diagnostic naming | Property | P0 | FR-082-AC-3, FR-082-AC-4, FR-082-AC-5 | 🚧 planned |
| TC-1013 | Every lowered type from a document carrying unevaluatedProperties: {"not": {}} has unknownPolicy: "reject" | Property | P0 | FR-082-AC-6, FR-082-AC-7, FR-082-AC-8 | 🚧 planned |
| TC-1014 | Every fields[] member and every operation parameter of the emitted document carries multiplicity | Property | P0 | FR-082-AC-9, FR-082-AC-10, FR-082-AC-11 | 🚧 planned |
| TC-1015 | The emitted document declares source.dialect of typespec, source.digest equal to kernelDigest(), and source.version of 0.1.0 | Snapshot | P0 | FR-082-AC-12, FR-082-AC-13, FR-082-AC-14 | 🚧 planned |
| TC-1016 | Every emitted list | Property | P0 | FR-082-AC-15, FR-082-AC-16, FR-082-AC-17 | 🚧 planned |
| TC-1017 | Every read performed during a full kernel lowering is observed by the injected host | Property | P0 | FR-082-AC-18, FR-082-AC-19, FR-082-AC-20 | 🚧 planned |
| TC-1018 | RunFrontend called with no sourceForm selects the dialect's default form | Property | P0 | FR-082-AC-21, FR-082-AC-22, FR-082-AC-23 | 🚧 planned |
| TC-1019 | Every module this requirement adds has a record in src/compiler/inventory.json | Property | P0 | FR-082-AC-24, FR-082-AC-25 | 🚧 planned |
| TC-1020 | Mint.mjs does not read a file, a clock, an environment variable, or a network socket | Snapshot | P0 | FR-083-CON-1, FR-083-CON-2, FR-083-CON-3 | 🚧 planned |
| TC-1021 | Minting introduce no diagnostic code of its own | Static | P0 | FR-083-CON-4, FR-083-CON-5, FR-083-CON-6 | 🚧 planned |
| TC-1022 | A collision does not be resolved by dropping either construct or by merging two distinct canonical forms into one type | Unit | P0 | FR-083-CON-7, FR-083-AC-1, FR-083-AC-2 | 🚧 planned |
| TC-1023 | MinConstraintKeyword is an enum with exactly one variant whose name is the string min, equal to the const in MinConstraint.json | Unit | P0 | FR-083-AC-3, FR-083-AC-4, FR-083-AC-5 | 🚧 planned |
| TC-1024 | Multiplicity.lower, Multiplicity.upper | Unit | P0 | FR-083-AC-6, FR-083-AC-7, FR-083-AC-8 | 🚧 planned |
| TC-1025 | Minting the bundle with its documents supplied in reversed order | Snapshot | P0 | FR-083-AC-9, FR-083-AC-10, FR-083-AC-11 | 🚧 planned |
| TC-1026 | Every identity in types | Snapshot | P0 | FR-083-AC-12, FR-083-AC-13, FR-083-AC-14 | 🚧 planned |
| TC-1027 | Over 256 mutated bundles mintAll returns a mint table or a refusal and never throws | Property | P0 | FR-083-AC-15, FR-083-AC-16 | 🚧 planned |
| TC-1028 | Close KERNEL_LOSSES at exactly the two declared rows and put it in bijection with the loss codes it adds to DIAGNOSTIC_CODES, asserted in both directi | Static | P0 | FR-084-CON-1, FR-084-CON-2, FR-084-CON-3 | 🚧 planned |
| TC-1029 | Provenance.mjs compute source.digest as a pure function of the supplied file bytes and paths, reading no file system, clock, environment variable, or | Static | P0 | FR-084-CON-4, FR-084-CON-5, FR-084-CON-6 | 🚧 planned |
| TC-1030 | NOT relax, reorder, or reword any existing member of DIAGNOSTIC_CODES | Static | P0 | FR-084-CON-7, FR-084-CON-8, FR-084-CON-9 | 🚧 planned |
| TC-1031 | The emitted kernel IR validates against schema/semantic/v1/semantic-ir.schema.json at contractVersion 1.1.0, carrying every required member of source | Property | P0 | FR-084-AC-1, FR-084-AC-2, FR-084-AC-3 | 🚧 planned |
| TC-1032 | Source.version, package.version | Property | P0 | FR-084-AC-4, FR-084-AC-5, FR-084-AC-6 | 🚧 planned |
| TC-1033 | The TypeScript, Rust, Python | Snapshot | P0 | FR-084-AC-7, FR-084-AC-8, FR-084-AC-9 | 🚧 planned |
| TC-1034 | Lowering the committed bundle emits exactly one agent-ix.compiler.KERNEL_UNCONSTRAINED_VALUE located at DefaultDecl.json's value, naming the minted De | Unit | P0 | FR-084-AC-10, FR-084-AC-11, FR-084-AC-12 | 🚧 planned |
| TC-1035 | A synthetic document carrying a keyword outside the closed set | Unit | P0 | FR-084-AC-13, FR-084-AC-14, FR-084-AC-15 | 🚧 planned |
| TC-1036 | No caller-supplied option, environment variable, or flag turns any refusal in AC-13, AC-14, or AC-15 into a document | Property | P0 | FR-084-AC-16, FR-084-AC-17, FR-084-AC-18 | 🚧 planned |
| TC-1037 | Over 512 mutated bundles neither provenance.mjs nor representability.mjs throws, each returns an answer | Snapshot | P0 | FR-084-AC-19, FR-084-AC-20, FR-084-AC-21 | 🚧 planned |
| TC-1038 | Adds no TypeScript emitter, no module under src/compiler/backends/typescript-v1/, and no kernel-specific branch inside the existing backend. A constru | Static | P0 | FR-085-CON-1, FR-085-CON-2, FR-085-CON-3 | 🚧 planned |
| TC-1039 | Records the strict typecheck criterion as blocked on agent-ix/filament-core-data#22 with the defect named | Snapshot | P0 | FR-085-CON-4, FR-085-CON-5, FR-085-CON-6 | 🚧 planned |
| TC-1040 | The generated package declare no third-party runtime dependency and keep every import specifier in every committed module relative, so the kernel's Ty | Property | P0 | FR-085-CON-7, FR-085-CON-8, FR-085-AC-1 | 🚧 planned |
| TC-1041 | The committed packages/semantic-kernel/typescript/ path set is exactly LICENSE, errors.ts, identity.ts, index.ts, provenance.ts, package.json, types.ts, | Snapshot | P0 | FR-085-AC-2, FR-085-AC-3, FR-085-AC-4 | 🚧 planned |
| TC-1042 | The committed package name equals packageNameFor(package.identity) for the kernel document's identity | Property | P0 | FR-085-AC-5, FR-085-AC-6, FR-085-AC-7 | 🚧 planned |
| TC-1043 | The committed identity.ts and provenance.ts expose every kernel type's roles[] and unknownPolicy, every record's relationship descriptors, every field's | Property | P0 | FR-085-AC-8, FR-085-AC-9, FR-085-AC-10 | 🚧 planned |
| TC-1044 | Every committed file begins with the SPDX-License-Identifier: AGPL-3.0-only header and the banner naming the backend identity, the backend version and | Snapshot | P0 | FR-085-AC-11, FR-085-AC-12, FR-085-AC-13 | 🚧 planned |
| TC-1045 | Every import specifier in every committed module begins with ./ or ../, and no committed module names a package in any of the seven prohibited depende | Snapshot | P0 | FR-085-AC-14, FR-085-AC-15, FR-085-AC-16 | 🚧 planned |
| TC-1046 | Hand-editing one byte of a committed generated file makes make semantic-kernel-check fail naming that file, so the tree cannot drift from the emitter | Property | P0 | FR-085-AC-17, FR-085-AC-18, FR-085-AC-19 | 🚧 planned |
| TC-1047 | Docs/semantic-data-system/semantic-kernel-packages.md carries one row per blocked criterion | Unit | P0 | FR-085-AC-20 | 🚧 planned |
| TC-1048 | Adds no module under src/compiler/backends/rust-serde/ and no kernel-specific branch inside the existing emitter. A construct the backend cannot rende | Static | P0 | FR-086-CON-1, FR-086-CON-2, FR-086-CON-3 | 🚧 planned |
| TC-1049 | The digest baseline be written by a script other than the one that writes the committed crate, reaching the emitter through a different entry point, s | Static | P0 | FR-086-CON-4, FR-086-CON-5, FR-086-CON-6 | 🚧 planned |
| TC-1050 | No step contact a package registry, either to publish or to resolve | Static | P0 | FR-086-CON-7, FR-086-CON-8, FR-086-CON-9 | 🚧 planned |
| TC-1051 | Src/compiler/backends/**, Cargo.lock, rust-toolchain.toml, rustfmt.toml, .cargo/config.toml, package.json, tsconfig.json and .github/** are prohibited | Unit | P0 | FR-086-CON-10, FR-086-AC-1, FR-086-AC-2 | 🚧 planned |
| TC-1052 | The committed Cargo.toml carries publish = false | Property | P0 | FR-086-AC-3, FR-086-AC-4, FR-086-AC-5 | 🚧 planned |
| TC-1053 | Introducing a missing_docs violation | Unit | P0 | FR-086-AC-6, FR-086-AC-7, FR-086-AC-8 | 🚧 planned |
| TC-1054 | Make semantic-kernel-check leaves git status --porcelain empty, in the passing case and in each failing case, with no Cargo.lock and no target/ left i | Property | P0 | FR-086-AC-9, FR-086-AC-10, FR-086-AC-11 | 🚧 planned |
| TC-1055 | THIRD-PARTY-NOTICES.md carries a row for serde at the exact pinned version with its SPDX identifier and the location of its preserved upstream licence | Snapshot | P0 | FR-086-AC-12, FR-086-AC-13, FR-086-AC-14 | 🚧 planned |
| TC-1056 | The committed crate name equals the value crate.mjs derives from the kernel document's package.identity | Snapshot | P0 | FR-086-AC-15, FR-086-AC-16, FR-086-AC-17 | 🚧 planned |
| TC-1057 | Make semantic-kernel-check reports on every run that Rust publication is blocked on agent-ix/quoin#290, that publish = false in the generated manifest | Property | P0 | FR-086-AC-18, FR-086-AC-19, FR-086-AC-20 | 🚧 planned |
| TC-1058 | The maintainer does not widen python_backend/refusals.json, relax a guard, add a guard exemption, or add a generator option to make the kernel bundle | Static | P0 | FR-087-CON-1, FR-087-CON-2, FR-087-CON-3 | 🚧 planned |
| TC-1059 | The maintainer does not emit a package for a family the qualification judges not-qualified, nor re-run the qualification with an altered probe set to | Static | P0 | FR-087-CON-4, FR-087-CON-5, FR-087-CON-6 | 🚧 planned |
| TC-1060 | Every existing path under python_backend/adapter/, python_backend/runner/, python_backend/qualification/, and python_backend/generated/, and every exi | Snapshot | P0 | FR-087-CON-7, FR-087-CON-8, FR-087-AC-1 | 🚧 planned |
| TC-1061 | After localize_bundle, no document carries a root $id, every $ref is a bare sibling filename naming a document present in the input set | Snapshot | P0 | FR-087-AC-2, FR-087-AC-3, FR-087-AC-4 | 🚧 planned |
| TC-1062 | Calling localize_bundle twice returns deep-equal results and leaves every input document deep-equal to its pre-call state | Property | P0 | FR-087-AC-5, FR-087-AC-6, FR-087-AC-7 | 🚧 planned |
| TC-1063 | A package tree exists under packages/semantic-kernel/python/ for exactly the families recorded as qualified-with-conditions, NOT-QUALIFIED.md records | Property | P0 | FR-087-AC-8, FR-087-AC-9, FR-087-AC-10 | 🚧 planned |
| TC-1064 | PROVENANCE.json carries the input digest, the profile digest, the toolchain fingerprint, the content fingerprint, the kernel bundle base and digest, t | Snapshot | P0 | FR-087-AC-11, FR-087-AC-12, FR-087-AC-13 | 🚧 planned |
| TC-1065 | No byte under packages/semantic-core/ changes | Snapshot | P0 | FR-087-AC-14, FR-087-AC-15, FR-087-AC-16 | 🚧 planned |
| TC-1066 | Python_backend/kernel/emit.py reaches the issue #23 route only by import | Unit | P0 | FR-087-AC-17, FR-087-AC-18 | 🚧 planned |
| TC-1067 | Change no byte anywhere under packages/semantic-core/. Those documents are the official emitter's output under ADR-0005 and FR-033, and an index that | Static | P0 | FR-088-CON-1, FR-088-CON-2, FR-088-CON-3 | 🚧 planned |
| TC-1068 | Scripts/build-semantic-kernel.mjs recompute the bundle digest in the index, never copy it from generated/toolchain.json, so the equality of the two is | Static | P0 | FR-088-CON-4, FR-088-CON-5, FR-088-CON-6 | 🚧 planned |
| TC-1069 | No registry publication and no publication workflow change happen here | Unit | P0 | FR-088-CON-7, FR-088-CON-8, FR-088-AC-1 | 🚧 planned |
| TC-1070 | A document present in packages/semantic-core/generated/json-schema/ and absent from the index | Unit | P0 | FR-088-AC-2, FR-088-AC-3, FR-088-AC-4 | 🚧 planned |
| TC-1071 | Every document's $id equals the index's base concatenated with its file name | Property | P0 | FR-088-AC-5, FR-088-AC-6, FR-088-AC-7 | 🚧 planned |
| TC-1072 | Every $ref in every document either begins with the declared base and names a listed document, or is a local #-fragment | Property | P0 | FR-088-AC-8, FR-088-AC-9, FR-088-AC-10 | 🚧 planned |
| TC-1073 | Every document declares https://json-schema.org/draft/2020-12/schema | Snapshot | P0 | FR-088-AC-11, FR-088-AC-12, FR-088-AC-13 | 🚧 planned |
| TC-1074 | Regenerating the index from unchanged inputs reproduces the committed file byte-for-byte | Snapshot | P0 | FR-088-AC-14, FR-088-AC-15, FR-088-AC-16 | 🚧 planned |
| TC-1075 | No path under packages/semantic-kernel/ appears in the packed file list of any distribution this repository builds | Snapshot | P0 | FR-088-AC-17 | 🚧 planned |
| TC-1076 | Each example import its generated package by that package's public surface only | Static | P0 | FR-089-CON-1, FR-089-CON-2, FR-089-CON-3 | 🚧 planned |
| TC-1077 | No example be skipped, marked expected-to-fail, or disabled by a condition to obtain a green run | Static | P0 | FR-089-CON-4, FR-089-CON-5, FR-089-CON-6 | 🚧 planned |
| TC-1078 | No example read a clock, an environment variable, a network socket, or a host-observed version, so that a run in CI and a run on a maintainer's machin | Static | P0 | FR-089-CON-7, FR-089-CON-8, FR-089-CON-9 | 🚧 planned |
| TC-1079 | Writes no file under conformance/, which NFR-030 makes a prohibited path for issue #11 in its entirety | Property | P0 | FR-089-CON-10, FR-089-AC-1, FR-089-AC-2 | 🚧 planned |
| TC-1080 | Each example constructs a FieldDecl carrying a multiplicity and asserts its member values | Property | P0 | FR-089-AC-3, FR-089-AC-4, FR-089-AC-5 | 🚧 planned |
| TC-1081 | Each example reads its package's semantic identity, source version | Unit | P0 | FR-089-AC-6, FR-089-AC-7, FR-089-AC-8 | 🚧 planned |
| TC-1082 | The Rust example declares the generated kernel crate and serde_json at a pinned exact version as a dev-dependency and nothing else | Property | P0 | FR-089-AC-9, FR-089-AC-10, FR-089-AC-11 | 🚧 planned |
| TC-1083 | No example is skipped, marked expected-to-fail, or conditionally disabled, checked over the collected test inventory of all three suites rather than b | Compile | P0 | FR-089-AC-12, FR-089-AC-13, FR-089-AC-14 | 🚧 planned |
| TC-1084 | No example's source matches Date.now, new Date, process.env, process.cwd, datetime.now, os.environ, std::time, std::env, or any socket API, and two ru | Snapshot | P0 | FR-089-AC-15, FR-089-AC-16, FR-089-AC-17 | 🚧 planned |
| TC-1085 | Where the Python package excludes a colliding type name from __all__, the example reaches that type as <module>.<Name> and no example re-exports the e | Unit | P0 | FR-089-AC-18 | 🚧 planned |
| TC-1086 | Every one of the four kernel packages decide every golden document. The harness count a package excused from a document as unmet, never as passed, fol | Static | P0 | FR-090-CON-1, FR-090-CON-2, FR-090-CON-3 | 🚧 planned |
| TC-1087 | No package decision emitter import conformance/oracle/index.mjs or call oracleVerdict or compare | Static | P0 | FR-090-CON-4, FR-090-CON-5, FR-090-CON-6 | 🚧 planned |
| TC-1088 | No published schema under schema/semantic/v1/ and no artifact under docs/semantic-data-system/ be edited. A disagreement with the published contract i | Static | P0 | FR-090-CON-7, FR-090-CON-8, FR-090-CON-9 | 🚧 planned |
| TC-1089 | Adds nothing under packages/semantic-kernel/, packages/semantic-core/generated/, or conformance/ to the npm package's files or exports, the Python dis | Static | P0 | FR-090-CON-10, FR-090-CON-11, FR-090-CON-12 | 🚧 planned |
| TC-1090 | The golden corpus under packages/semantic-kernel/parity/golden/ carries positive, negative | Property | P0 | FR-090-AC-1, FR-090-AC-2, FR-090-AC-3 | 🚧 planned |
| TC-1091 | For every golden document, the serialized member name of every declared member is identical across the four packages | Property | P0 | FR-090-AC-4, FR-090-AC-5, FR-090-AC-6 | 🚧 planned |
| TC-1092 | For each of preserve, reject | Snapshot | P0 | FR-090-AC-7, FR-090-AC-8, FR-090-AC-9 | 🚧 planned |
| TC-1093 | A full parity run leaves every file under conformance/ byte-unchanged, including conformance/corpus.json, conformance/coverage.json, conformance/diver | Property | P0 | FR-090-AC-10, FR-090-AC-11, FR-090-AC-12 | 🚧 planned |
| TC-1094 | A divergence row without an adjudicating owner is rejected by the gate | Unit | P0 | FR-090-AC-13, FR-090-AC-14, FR-090-AC-15 | 🚧 planned |
| TC-1095 | No file under schema/semantic/v1/ or docs/semantic-data-system/ differs before and after this requirement's run | Property | P0 | FR-090-AC-16, FR-090-AC-17, FR-090-AC-18 | 🚧 planned |
| TC-1096 | Packages/semantic-kernel/parity/publication-gate.json names agent-ix/quoin#290 for each of the four packages, states the step as blocked | Property | P0 | FR-090-AC-19, FR-090-AC-20, FR-090-AC-21 | 🚧 planned |
| TC-1097 | Two consecutive full runs produce a byte-identical packages/semantic-kernel/parity/agreement.json | Snapshot | P0 | FR-090-AC-22 | 🚧 planned |
| TC-1098 | Two generations of the same kernel bundle, from different working directories and under different locales, produce byte-identical trees for all four t | Snapshot | P1 | NFR-028-AC-1, NFR-028-AC-2, NFR-028-AC-3 | 🚧 planned |
| TC-1099 | Every --check verb regenerates into a directory outside the working tree | Snapshot | P1 | NFR-028-AC-4, NFR-028-AC-5, NFR-028-AC-6 | 🚧 planned |
| TC-1100 | The generated trees carry no generation timestamp, build date, hostname, machine identifier, user name, home directory, working directory, absolute pa | Property | P1 | NFR-028-AC-7, NFR-028-AC-8 | 🚧 planned |
| TC-1101 | The transitive dependency closure of each emitted package contains no persistence layer, ORM, Tauri, UI framework, application package, or network tra | Unit | P1 | NFR-029-AC-1, NFR-029-AC-2, NFR-029-AC-3 | 🚧 planned |
| TC-1102 | The emitted Python package's closure adds nothing beyond the declared Pydantic pin | Property | P1 | NFR-029-AC-4, NFR-029-AC-5, NFR-029-AC-6 | 🚧 planned |
| TC-1103 | Each package's static export surface equals the kernel's declared type set plus the minted types, checked in both directions so a missing export and a | Property | P1 | NFR-029-AC-7, NFR-029-AC-8, NFR-029-AC-9 | 🚧 planned |
| TC-1104 | Each consumer example of [FR-089](../functional/FR-089-provide-independent-consumer-examples.md) satisfies the same closure assertion as the package i | Unit | P1 | NFR-029-AC-10 | 🚧 planned |
| TC-1105 | Every path in this change's own path set is permitted and none is prohibited, with both endpoints of the range resolved from history through the two d | Property | P1 | NFR-030-AC-1, NFR-030-AC-2, NFR-030-AC-3 | 🚧 planned |
| TC-1106 | Package.json exports, main, module, types, files, dependencies, peerDependencies | Unit | P1 | NFR-030-AC-4, NFR-030-AC-5, NFR-030-AC-6 | 🚧 planned |
| TC-1107 | Cargo.lock changes only by the addition of this change's own members and adds no third-party package, asserted by comparing the resolved package set b | Unit | P1 | NFR-030-AC-7, NFR-030-AC-8, NFR-030-AC-9 | 🚧 planned |
| TC-1108 | This change's own range contains no merge commit, so its path set is the union of its own commits and carries nothing the trunk moved | Property | P1 | NFR-030-AC-10, NFR-030-AC-11, NFR-030-AC-12 | 🚧 planned |
| TC-1200 | Loading the config-version-table fixture under the vendored spec-objects-business 0.3.0 module yields one extraction for FR-006 (fields available, seven fields) and one for FR-005, keyed by id | Integration | P0 | FR-091-AC-1 | ✅ passed |
| TC-1201 | A module root whose manifest carries no semantic block refuses with MODULE_WITHOUT_SEMANTIC_BLOCK naming the module and lowers nothing | Unit | P1 | FR-091-AC-2 | ✅ passed |
| TC-1202 | A module whose semantic.semantic_core is 9.9.9 refuses with MODULE_REFUSED whose message begins with semantic.unsupported-semantic-core and whose causes is empty, and no artifact lowers to an empty record | Integration | P0 | FR-091-AC-3 | ✅ passed |
| TC-1203 | With a conflicting module planted under HOME/.ix and QUIRE_MODULES, the fixture lifts byte-identically to the explicit-module lift; the control lift with the conflicting module supplied explicitly differs | E2E | P0 | FR-091-AC-4 | ✅ passed |
| TC-1204 | A spec.md lacking org refuses with BUNDLE_UNIDENTIFIED at spec/spec.md; a name of Config Service refuses with BUNDLE_UNIDENTIFIED naming Config Service | Unit | P1 | FR-091-AC-5 | ✅ passed |
| TC-1205 | A document with object: widget, declared by no module, yields UNKNOWN_OBJECT_TYPE and is not lowered; a document with no object yields no diagnostic | Unit | P1 | FR-091-AC-6 | ✅ passed |
| TC-1206 | The BundleIndex handed to extraction names every object-typed artifact by id and title, and a Type cell naming a sibling by title resolves | Integration | P1 | FR-091-AC-7 | ✅ passed |
| TC-1207 | grep of src/ finds no struct FieldDecl/TypeRef/ClauseRef/OperationDecl, no extract_semantic_json, no section-heading parser, and load_repo/load_module_set only in bundle.rs; a planted struct TypeRef fails the gate | Static | P0 | FR-091-AC-8, FR-091-CON-1, FR-091-CON-3 | ✅ passed |
| TC-1208 | Every SemanticDiagnostic the engine returns for the legacy-form control appears as one ENGINE_DIAGNOSTIC whose message opens with the engine code and reason and whose causes is empty, with the mapped severity and the engine's line and column | Property | P1 | FR-091-AC-9 | ✅ passed |
| TC-1209 | The legacy free-column FR-006 yields fields unavailable with reason legacy-form and the engine's semantic.legacy-properties-form warning at line 17, and is not lowered | Integration | P1 | FR-091-AC-10 | ✅ passed |
| TC-1210 | Every kernel scalar name resolves to KernelScalar; the config-version-table fixture emits exactly UUID, Integer, String, Timestamp at type/<KernelScalar> with the kernel-scalar extension, plus the JsonObject record, each once | Property | P1 | FR-092-AC-1 | ✅ passed |
| TC-1211 | ConfigOverlay in a Type cell resolves to Object(FR-005) by title or by an identifier-shaped id; a cell reading FR-005 is rejected upstream as semantic.invalid-type-token | Unit | P1 | FR-092-AC-2 | ✅ passed |
| TC-1212 | A Type cell reading Sting yields Unresolved::UnknownToken and one blocking UNRESOLVED_TYPE_TOKEN at that row's line and column naming Sting; no document is written | Unit | P0 | FR-092-AC-3 | ✅ passed |
| TC-1213 | Two artifacts titled Status make the engine emit semantic.ambiguous-type; the referring artifact yields ARTIFACT_NOT_LOWERED plus one ENGINE_DIAGNOSTIC, and no Resolution is produced for the dropped row | Unit | P1 | FR-092-AC-4 | ✅ passed |
| TC-1214 | A cell naming ix://acme/other/type/Thing yields Unresolved::ImportUnsupported("acme/other") and blocking IMPORT_UNSUPPORTED naming acme/other | Unit | P1 | FR-092-AC-5 | ✅ passed |
| TC-1215 | In a two-document bundle where FR-006 refers by title to a legacy-form FR-005, the referring cell yields Unresolved::Stale and STALE_TYPE_TOKEN naming FR-005 with related at FR-005's ARTIFACT_NOT_LOWERED locus | Unit | P1 | FR-092-AC-6 | ✅ passed |
| TC-1216 | An object: enumeration artifact named in a cell resolves to Enumeration with its type/ identity as typeRef, and the same title under object: entity resolves to Object | Unit | P1 | FR-092-AC-7 | ✅ passed |
| TC-1217 | An artifact titled String yields one KERNEL_NAME_SHADOWED warning at its frontmatter at the resolve layer, a cell reading String resolves to KernelScalar, and a lift using no String cell is not blocked | Unit | P1 | FR-092-AC-8 | ✅ passed |
| TC-1218 | Over 256 mutated tokens the resolver returns a Resolution and never panics, every Unresolved value maps to exactly one code, and ImportUnsupported(package) is the only string-carrying variant | Property | P1 | FR-092-AC-9, FR-092-CON-1 | ✅ passed |
| TC-1219 | The FR-050 reader and agent_ix_semantic_ir::decide each return zero UNRESOLVED_TYPE_REF over every emitted fixture document, so no typeRef names an undeclared identity | Integration | P1 | FR-092-AC-10 | ✅ passed |
| TC-1220 | The line-aligned config-version-table and config-version-fence bundle roots, each holding FR-006 at the same relative path in one form, lift to byte-identical types[] and diagnostics (source.digest differs by construction), so fields_form influences no node byte | Snapshot | P0 | FR-093-AC-1, FR-093-CON-1 | ✅ passed |
| TC-1221 | The lifted ConfigVersion record carries roles business:domain-object, business:entity, business:persistable, unknownPolicy reject, and seven fields in declaration order | Unit | P1 | FR-093-AC-2 | ✅ passed |
| TC-1222 | The id UUID 1 identity row lowers to {1,1}, required, nullable false, defaultKind none, and the identity-field extension; parent ConfigVersion 0..1 lowers to {0,1} optional | Unit | P1 | FR-093-AC-3 | ✅ passed |
| TC-1223 | versionNumber Integer 1 min: 1 emits one kind: alias type/ConfigVersionVersionNumber targeting type/Integer at the row, carrying one min constraint with operands.value 1, appliesTo the alias identity, and diagnosticCode agent-ix.config-service.CONFIGVERSION_VERSIONNUMBER_MIN under the shared rule; the field typeRef is the alias, the record constraints are [], and no unconstrained field mints an alias | Unit | P1 | FR-093-AC-4 | ✅ passed |
| TC-1224 | maxLength: 64 emits {value: 64} with diagnosticCode agent-ix.config-service.CONFIGVERSION_CREATEDBY_MAXLENGTH on the alias type/ConfigVersionCreatedBy targeting type/String, a pattern /^[a-z]+$/ cell emits {regex, dialect: ecma-262}, an enumValues a or b cell emits {values: [a, b]}, and a two-keyword row yields one alias carrying both constraints | Unit | P1 | FR-093-AC-5 | ✅ passed |
| TC-1225 | A min constraint on a String field raises the frontend's own blocking CONSTRAINT_NOT_APPLICABLE at the row with no document written, decide agrees on the same pair over a type-scoped subject and over an alias targeting it, and the two applicability tables agree over the full RULES.md (kind, keyword) cross product | Unit | P1 | FR-093-AC-6, FR-093-CON-4 | ✅ passed |
| TC-1226 | A JsonObject cell emits the open JsonObject record once per package at type/JsonObject and one DECLARED_LOSS info naming unconstrained-value; every taken loss has a losses.json row citing #78 | Unit | P1 | FR-093-AC-7, FR-093-CON-3 | ✅ passed |
| TC-1227 | A 1..* field emits presence required, a * field optional, and one DECLARED_LOSS naming required-collection-presence per collection field declared 0..* or * | Unit | P1 | FR-093-AC-8 | ✅ passed |
| TC-1228 | The legacy free-column FR-006 emits no record and one non-blocking ARTIFACT_NOT_LOWERED naming legacy-form; a both-forms artifact emits a blocking one naming both-forms | Unit | P1 | FR-093-AC-9 | ✅ passed |
| TC-1229 | Renaming every field to a random identifier changes only name, identity, diagnosticCode, and for a constrained field the alias identity, displayName, and appliesTo its typeRef names, never multiplicity, presence, nullable, an unconstrained typeRef, or an alias target, origin, or operands; no other value derives from a name or path | Property | P1 | FR-093-AC-10, FR-093-CON-2 | ✅ passed |
| TC-1230 | Every emitted fixture document passes the FR-050 reader and decide with zero agent-ix.semantic-ir.* diagnostics | Integration | P1 | FR-093-AC-11 | ✅ passed |
| TC-1231 | The FR-006 frontmatter entry {target: FR-005, type: references} lowers to one relationship references, traceability, composite false, target the ConfigOverlay identity, multiplicity {1,1}, origin at FR-006 line 1 column 1 | Unit | P1 | FR-094-AC-1 | ✅ passed |
| TC-1232 | Under the spec-objects-business and edge-vocabulary module roots, a contains edge under a domain and an aggregates edge under an aggregate_root lower to structural, composite true (inverse part_of); a composes edge under a value_object lowers to structural, composite false | Unit | P1 | FR-094-AC-2 | ✅ passed |
| TC-1233 | A references edge lowers to traceability, composite false; an owns edge under an entity lowers to dependency, composite false | Unit | P1 | FR-094-AC-3 | ✅ passed |
| TC-1234 | Under a test module whose entity allowed_links lists frobnicates while no edge_types declares it, a frobnicates edge raises UNKNOWN_EDGE_VERB at line 1 column 1, blocking, and no document is written | Unit | P1 | FR-094-AC-4 | ✅ passed |
| TC-1235 | A references edge targeting Nonesuch raises UNRESOLVED_RELATIONSHIP_TARGET at line 1 column 1 naming Nonesuch, blocking; one targeting a legacy-form artifact raises the same code naming it | Unit | P1 | FR-094-AC-5 | ✅ passed |
| TC-1236 | An entity carrying traces_to, implements, and depends_on edges lowers with zero relationships and zero diagnostics from them; adding one references edge yields exactly one relationship; no body list is read | Unit | P1 | FR-094-AC-6, FR-094-CON-1 | ✅ passed |
| TC-1237 | Two frontmatter entries with the same (verb, target) yield one relationship; two entries with the same target and different allowed verbs yield two relationships with distinct identities | Unit | P1 | FR-094-AC-7 | ✅ passed |
| TC-1238 | The parent ConfigVersion 0..1 row appears as a field, not a relationship; relationships[] carries no parent relationship, the remaining node agrees with the #34 hand fixture on target and multiplicity, and the #34 fixture's sha256 is pinned and unchanged | Snapshot | P1 | FR-094-AC-8, FR-094-CON-4 | ✅ passed |
| TC-1239 | The immutable ocl fence lowers to one clause with language ocl, clauseId immutable, text byte-identical to clause_text, the engine's sourceSpan, and origin at the span start | Unit | P1 | FR-094-AC-9 | ✅ passed |
| TC-1240 | A clause whose text carries leading whitespace, trailing newlines, and a tab reaches the IR byte-identical to the engine's clause_text | Unit | P1 | FR-094-AC-10, FR-094-CON-3 | ✅ passed |
| TC-1241 | The operations fixture lowers each OperationDecl with params as fields under field/<Name>-<operation>-<param> and no param/ identity, returns nullable false, pre and post as clauseId lists, and no second clause node | Unit | P1 | FR-094-AC-11 | ✅ passed |
| TC-1242 | An operation whose Returns: names an unresolved token raises the FR-092 diagnostic at the Returns: line | Unit | P1 | FR-094-AC-12 | ✅ passed |
| TC-1243 | Every relationship, operation, parameter, and clause identity on the fixture matches the FR-095 slot grammar under the shared rule (every part slugged, a parameter under field/<Name>-<operation>-<param>), asserted by regex over every emitted node | Property | P1 | FR-094-AC-13 | ✅ passed |
| TC-1244 | Renaming a verb's target changes only target and the relationship identity, never category or composite; renaming the registry inverse from part_of flips composite with no code change | Property | P1 | FR-094-AC-14, FR-094-CON-2 | ✅ passed |
| TC-1245 | Every emitted fixture document passes the FR-050 reader and decide with zero UNRESOLVED_RELATIONSHIP_TARGET, UNKNOWN_EDGE_CATEGORY, COMPOSITE_CYCLE, DANGLING_CLAUSE_REF, or MISSING_SOURCE_SPAN | Integration | P1 | FR-094-AC-15 | ✅ passed |
| TC-1246 | The config-version-table fixture lifts with source.identity ix://agent-ix/config-service/spec, source.dialect spec-bundle as the only stamped value, and package.identity agent-ix/config-service | Unit | P0 | FR-095-AC-1, FR-095-CON-3 | ✅ passed |
| TC-1247 | A spec.md with version: 2.1.0 yields source.version and package.version 2.1.0; one without yields 0.0.0 | Unit | P1 | FR-095-AC-2 | ✅ passed |
| TC-1248 | source.digest equals a sha256sum over the path, NUL, bytes, NUL recipe assembled outside the crate, and changing one byte of one document changes it | Unit | P1 | FR-095-AC-3 | ✅ passed |
| TC-1249 | package.manifestDigest equals the sha256sum of every loaded manifest concatenated in module-name order and lockDigest the sha256sum of the sorted semantic.package@version:sha256 lines, each computed outside the crate | Unit | P1 | FR-095-AC-4 | ✅ passed |
| TC-1250 | mappingVersions is [1.0.0] for the vendored spec-objects-business module, profileVersions is [], and occurrences and top-level extensions are [] | Unit | P1 | FR-095-AC-5 | ✅ passed |
| TC-1251 | Every identity in the emitted business fixture document matches the closed slot grammar (type, field, variant, relationship, operation, clause, constraint) and semanticIdentity, a parameter appears under field/<Name>-<operation>-<param> and an enumeration member under variant/, and no identity occupies a param/ slot, asserted by regex over every node | Property | P1 | FR-095-AC-6 | ✅ passed |
| TC-1252 | slug("Config Version") is Config-Version, slug("A__B--C") is A-B-C, slug("versionNumber") is versionNumber, slug("--") and slug("_") are Unsluggable (no part is dropped), and an enumeration value reading *** raises UNSLUGGABLE_NAME at its locus, blocking; a "---" title fails earlier as UNNAMEABLE_ARTIFACT | Unit | P1 | FR-095-AC-7 | ✅ passed |
| TC-1253 | Lifting one checkout twice from two working directories and two HOME values yields documents and provenance records byte-identical to each other and to the committed golden | Snapshot | P0 | FR-095-AC-8, FR-095-CON-1 | ✅ passed |
| TC-1254 | The provenance record names the quire-rs version and git revision and the frontend crate version that Cargo.lock pins, asserted against the lock read by the test, with the revision at or after a874fb6 | Unit | P1 | FR-095-AC-9 | ✅ passed |
| TC-1255 | A pattern scan over the provenance record and the document finds no absolute path, ISO 8601 timestamp, hostname, or username, including when invoked with an absolute BUNDLE= path | Unit | P1 | FR-095-AC-10 | ✅ passed |
| TC-1256 | The objects-extra module loaded beside the vendored modules yields manifestDigest over every loaded manifest in module-name order, unchanged when the caller's module roots are swapped | Property | P1 | FR-095-AC-11 | ✅ passed |
| TC-1257 | grep of src/ finds no git2, no Command::new("git"), no std::env::var, no env!, and no option_env!; planting env!("CARGO_PKG_VERSION") in envelope.rs fails the gate | Static | P1 | FR-095-AC-12, FR-095-CON-2 | ✅ passed |
| TC-1258 | The emitted envelope of every positive fixture passes agent_ix_semantic_ir::decide at lift time with zero INVALID_IR diagnostics | Unit | P1 | FR-095-AC-13 | ✅ passed |
| TC-1259 | Every Code variant, DUPLICATE_IDENTITY included, serialises to a code matching the published pattern and, instantiated with and without a locus, validates as a diagnostic against common.schema.json | Property | P1 | FR-096-AC-1 | ✅ passed |
| TC-1260 | The severity and blocking table holds variant by variant as a function of Code alone plus the engine severity and the ARTIFACT_NOT_LOWERED reason, including the six error-blocking codes named by FR-096-AC-2 (DUPLICATE_IDENTITY among them) and KERNEL_NAME_SHADOWED | Unit | P0 | FR-096-AC-2, FR-096-CON-1 | ✅ passed |
| TC-1261 | grep of src/ finds no string literal beginning agent-ix.extraction-frontend., agent-ix.compiler., or agent-ix.semantic-ir.; the enum's Display is the only spelling; a planted literal in lower.rs fails the gate | Static | P1 | FR-096-AC-3 | ✅ passed |
| TC-1262 | The legacy fixture yields one warning ENGINE_DIAGNOSTIC whose message begins semantic.legacy-properties-form (reason: ...) followed by the engine message, whose causes is empty, and whose locus is line 17 column 1 | Unit | P1 | FR-096-AC-4 | ✅ passed |
| TC-1263 | An engine advisory maps to info, non-blocking; an engine error maps to error, blocking; the wire code of each is agent-ix.extraction-frontend.ENGINE_DIAGNOSTIC | Unit | P1 | FR-096-AC-5 | ✅ passed |
| TC-1264 | A Type cell Sting at row 14 yields UNRESOLVED_TYPE_TOKEN with locus path, startLine 14, startColumn 3 and sourceIdentity ix://agent-ix/config-service/spec | Unit | P0 | FR-096-AC-6 | ✅ passed |
| TC-1265 | A refused module yields MODULE_REFUSED with locus at the manifest, line 1, column 1 | Unit | P1 | FR-096-AC-7 | ✅ passed |
| TC-1266 | sort_diagnostics yields the same order for a list and its reverse, and across two LC_ALL settings, with every locus-free diagnostic first | Property | P1 | FR-096-AC-8 | ✅ passed |
| TC-1267 | The negatives/DUPLICATE_TYPE_NAME fixture, re-authored as two documents both titled Status under distinct ids, lifted twice produces diagnostic bytes identical to each other and to its committed expected/diagnostics.json | Snapshot | P1 | FR-096-AC-9, FR-096-CON-3 | ✅ passed |
| TC-1268 | A blocking lift leaves a fresh --out absent and a pre-existing --out byte-unchanged and exits 1; a warning-only lift writes the file and exits 0 | E2E | P0 | FR-096-AC-10 | ✅ passed |
| TC-1269 | A 4000-character type token appears in no message longer than 120 characters | Unit | P1 | FR-096-AC-11 | ✅ passed |
| TC-1270 | A pattern scan over every diagnostic emitted across the fixture corpus finds no absolute path, timestamp, hostname, or duration | Property | P1 | FR-096-AC-12 | ✅ passed |
| TC-1271 | extraction-frontend-diagnostics.md lists every code (27, DUPLICATE_IDENTITY included) with severity, blocking, and owner, and regenerating it from the enum reproduces the committed file byte for byte | Snapshot | P1 | FR-096-AC-13 | ✅ passed |
| TC-1272 | The set of fixtures/negatives/<CODE>/ directories FR-098 lists equals the set of Code variants, negatives/DUPLICATE_IDENTITY included, so every registry code has one fixture or one named constructing test | Static | P1 | FR-096-AC-14 | ✅ passed |
| TC-1273 | Cargo.toml names agent-ix-semantic-ir under [dependencies] with path = "../semantic-ir" and no jsonschema; cargo tree lists no direct jsonschema edge and every jsonschema line sits under quire-rs; crates/semantic-ir is byte-unchanged | Static | P0 | FR-097-AC-1, FR-097-CON-1 | ✅ passed |
| TC-1274 | A fault-injected document missing unknownPolicy on one type yields exactly one blocking INVALID_IR naming that type's instance pointer, and no document, fingerprint, or provenance file is written | Unit | P1 | FR-097-AC-2 | ✅ passed |
| TC-1275 | The bytes written for config-version-table equal decide({"ir": doc}).normalized and the committed expected/semantic-ir.json; parsing them and calling normalized again reproduces them | Snapshot | P1 | FR-097-AC-3 | ✅ passed |
| TC-1276 | Every node list in the written document is sorted by identity under code-point order and equals the code-point sort computed in node under LC_ALL en_US.UTF-8 and de_DE.UTF-8; an Intl.Collator disagrees on at least one emitted list, which is why it is not the reference | Property | P1 | FR-097-AC-4 | ✅ passed |
| TC-1277 | node -e importing src/compiler/ir/normalize.mjs and applying FR-050 normalizeIr to every emitted fixture document returns the emitted bytes unchanged | Integration | P1 | FR-097-AC-5 | ✅ passed |
| TC-1278 | The .fingerprint sidecar parses to exactly domain quire.verification.jcs, version rfc8785-v1, algorithm sha256, and digest sha256-jcs:<64 hex> equal to sha256sum over the written document bytes | Unit | P1 | FR-097-AC-6 | ✅ passed |
| TC-1279 | Two consecutive lifts of the config-version-table fixture produce documents and sidecars byte-identical to each other and to the committed expected/ goldens | Snapshot | P0 | FR-097-AC-7 | ✅ passed |
| TC-1280 | A lift run with a different CARGO_TARGET_DIR, working directory, HOME, and LC_ALL produces the same bytes as TC-1279 and as the committed golden | Snapshot | P0 | FR-097-AC-8 | ✅ passed |
| TC-1281 | A blocking lift leaves a pre-existing document, fingerprint, and provenance sidecar byte-unchanged, writes the diagnostics sidecar, and leaves no other new file in the output directory | E2E | P0 | FR-097-AC-9 | ✅ passed |
| TC-1282 | A lift into a directory that does not exist refuses with OUTPUT_UNWRITABLE naming the path and exits 2 | E2E | P1 | FR-097-AC-10 | ✅ passed |
| TC-1283 | node src/compiler/cli.mjs inspect --ir reports zero diagnostics for every emitted fixture document, and the test fails naming node when it is absent | Integration | P1 | FR-097-AC-11 | ✅ passed |
| TC-1284 | decide returns success with zero diagnostics for every emitted positive fixture, asserted from the lift's own verdict and again by the test calling decide on the written bytes | Integration | P1 | FR-097-AC-12 | ✅ passed |
| TC-1285 | Every document under fixtures/ is named in its PROVENANCE.json with repository, revision, and path or as authored; config-version-* rows name the quire-rs revision and the added relationships: block; the module row names d1840b8 | Unit | P0 | FR-098-AC-1, FR-098-CON-2 | ✅ passed |
| TC-1286 | Regenerating every fixture whose root holds a spec/spec.md into a scratch directory reproduces each committed expected/ file byte for byte and equals decide normalized; a one-byte golden change fails naming the fixture and offset | Snapshot | P0 | FR-098-AC-2 | ✅ passed |
| TC-1287 | The business golden carries record, enum, scalar, and alias definitions, one enum with at least two variants, one operation with params and a returns, one ocl clause, and one structural and one dependency relationship | Unit | P1 | FR-098-AC-3 | ✅ passed |
| TC-1288 | Every FR-096 code, DUPLICATE_IDENTITY included, is emitted by its negatives/<CODE>/ bundle or the test constructed.json names, at the golden's recorded line and column or with no locus, as exactly its code as the first blocking diagnostic in FR-096 order (DUPLICATE_TYPE_NAME from two documents both titled Status; DUPLICATE_IDENTITY from NoteRevision beside Note.revision) | Snapshot | P1 | FR-098-AC-4 | ✅ passed |
| TC-1289 | After lifting a committed copy of each fixture bundle, git status --porcelain is empty and every file hash under the bundle and module roots is unchanged, for a clean lift and for a blocking lift | E2E | P0 | FR-098-AC-5 | ✅ passed |
| TC-1290 | cases.json carries records-and-scalars with both source trees and both typespec and spec-bundle non-null, and spec-bundle null with a reason naming scalar for each of the three existing cases; the parity test finds exactly one two-dialect case and compares it; the projection materialises absent relationships, operations, and clauses as [] | Integration | P1 | FR-098-AC-6 | ✅ passed |
| TC-1291 | For records-and-scalars, normalized of the projected spec-bundle lift equals normalized of the projected node cli.mjs compile output byte for byte, every identity, the type/NoteRevision alias, and every diagnosticCode included, and the test fails naming node when it is absent | Integration | P0 | FR-098-AC-7 | ✅ passed |
| TC-1292 | The generic CLI over the lifted config-version-table document exits zero with zero diagnostics for --target rust (writing src/lib.rs) and for --target typescript, and the rust-serde backend run through its own writer by the harness rust-generate verb does the same | Integration | P0 | FR-098-AC-8 | ✅ passed |
| TC-1293 | A ConfigVersion payload validates against the test-derived schema, versionNumber 0 fails at versionNumber, and the helper is not reachable from the crate's public surface | Unit | P0 | FR-098-AC-9 | ✅ passed |
| TC-1294 | The FR-098 change set outside the crate is exactly cases.json, shared/typespec/records-and-scalars/, and files under shared/spec-bundle/; src/compiler/frontend/** and test/compiler-core.test.ts are byte-unchanged | Static | P1 | FR-098-AC-10, FR-098-CON-1 | ✅ passed |
| TC-1295 | lift over config-version-table exits 0 and writes the document, .fingerprint, .diagnostics.json, and .provenance.json; with --diagnostics d.json --provenance p.json it writes those in their place with the same document bytes | E2E | P0 | FR-099-AC-1 | ✅ passed |
| TC-1296 | lift over negatives/UNRESOLVED_TYPE_TOKEN exits 1 writing only the diagnostics sidecar; lift without --module, under negatives/MODULE_WITHOUT_SEMANTIC_BLOCK, and with --out under the bundle root each exit 2 writing nothing | E2E | P1 | FR-099-AC-2 | ✅ passed |
| TC-1297 | inspect --ir over a lifted document prints one line per type in types order and exits 0; over a document missing contractVersion (defaulted to 1.0.0 by the reader and rejected at /ir/source/dialect) it prints INVALID_IR and exits 1 | E2E | P1 | FR-099-AC-3 | ✅ passed |
| TC-1298 | make extraction-frontend-build, -test, -check, -deny, and -audit succeed on 1.98.1; with EXTRACTION_TOOLCHAIN=0.0.0 each fails naming 0.0.0 and none skips | Static | P1 | FR-099-AC-4 | ✅ static evidence (make extraction-frontend-evidence) |
| TC-1299 | The change set outside the crate, the FR-098 set and the ticket's spec, plan and review artifacts is exactly the members line, Cargo.lock, the Makefile block, the additive THIRD-PARTY-NOTICES.md rows, extraction-frontend-diagnostics.md and scripts/extraction-frontend-harness.mjs, measured over the working range (opening-sentinel parent to HEAD until squashed); the seven prohibited paths are byte-unchanged | Static | P1 | FR-099-AC-5, FR-099-CON-1, FR-099-CON-2 | ✅ passed |
| TC-1300 | Two lifts of config-version-table, within one run and across two runs, produce IR and diagnostic bytes identical to each other, to the committed expected/ goldens, and to decide normalized | Snapshot | P0 | NFR-031-AC-1 | ✅ passed |
| TC-1301 | A lift with the working directory changed, HOME at an empty directory, and TZ, LANG, LC_ALL, and CARGO_TARGET_DIR varied produces bytes identical to the committed golden | Snapshot | P0 | NFR-031-AC-2 | ✅ passed |
| TC-1302 | The line-aligned config-version-table and config-version-fence bundle roots, each holding one copy of FR-006 at the same bundle-relative path, lift to identical types[] and diagnostics bytes; source.digest differs by construction | Snapshot | P0 | NFR-031-AC-3 | ✅ passed |
| TC-1303 | The crate enumerates no directory itself: every document and module arrives through load_repo and load_module_set, whose results are path-sorted (quire-rs walk.rs, TC-473), so enumeration order cannot reach the output | Static | P1 | NFR-031-AC-4 | ✅ passed |
| TC-1304 | No module under src/ references SystemTime, Instant, std::env, env!, option_env!, a hostname API, an RNG, std::net, or Command; std::fs only in write.rs (reads: manifest.yaml per module root, the golden walk, inspect --ir; writes: the atomic outputs), every other module std::fs-free; the gate fails on a planted std::env::var in lower.rs | Static | P0 | NFR-031-AC-5 | ✅ passed |
| TC-1305 | For each of the five limits.json limits, a bundle one past it yields exactly one blocking LIMIT_* diagnostic at the offending document within 512 MiB and 30 s, naming the file's value | Unit | P0 | NFR-031-AC-6 | ✅ passed |
| TC-1306 | The crate suite run under unshare -rn (or an equivalent unprivileged network namespace) with cargo in offline mode passes, and the crate declares no dependency that opens a socket | Static | P1 | NFR-031-AC-7 | ✅ static evidence (make extraction-frontend-evidence) |
| TC-1307 | The HashMap audit over src/ reports zero hits with an empty exemption list, fails on a planted HashMap in lower.rs, and every map whose iteration order reaches the output is a BTreeMap or IndexMap | Static | P1 | NFR-031-AC-8 | ✅ passed |
| TC-1308 | The crate root carries #![forbid(unsafe_code)] and a compile_fail doctest proves an injected unsafe block does not build under cargo +1.98.1 | Compile | P0 | NFR-031-AC-9 | ✅ passed |
| TC-1309 | Over 256 bundle trees generated by the crate's proptest bundle-tree strategy the frontend returns a result or a diagnostic and never panics | Fuzz | P0 | NFR-031-AC-10 | ✅ passed |
| TC-1310 | Every path in this change's own set, resolved from the two sentinels and unioned over --first-parent --no-merges, is permitted and none is prohibited, and the root THIRD-PARTY-NOTICES.md differs from the base by added rows only, each naming a crate the workspace Cargo.lock carries | Static | P0 | NFR-032-AC-1 | ✅ passed |
| TC-1311 | cargo metadata shows no edge from agent-ix-semantic-ir or agent-ix-conformance-adapter to the extraction frontend, and the frontend's edge to agent-ix-semantic-ir is its only path edge | Unit | P1 | NFR-032-AC-2 | ✅ passed |
| TC-1312 | The root Cargo.toml differs from the range's base only in the members line, and rust-toolchain.toml and the workspace rust-version are byte-unchanged | Static | P1 | NFR-032-AC-3 | ✅ passed |
| TC-1313 | cases.json differs from the base only by spec-bundle and reason members, the rewritten top-level $comment, and the added records-and-scalars case; every pre-existing shared/** path and the spec-bundle seam file are byte-unchanged | Static | P1 | NFR-032-AC-4 | ✅ passed |
| TC-1314 | After the full crate suite runs, git status --porcelain is empty in this repository's fixture directories and in every corpus repository the fixtures name | E2E | P0 | NFR-032-AC-5 | ✅ static evidence (make extraction-frontend-evidence) |
| TC-1315 | Every crate manifest in the change set carries publish = false and license = "AGPL-3.0-only", and no command in the Makefile block or the crate names a registry | Static | P1 | NFR-032-AC-6 | ✅ passed |
| TC-1316 | make test and make rust, driven by the harness suite-compare verb on the range's base and head, produce the same pass/fail outcome for every pre-existing row | Static | P1 | NFR-032-AC-7 | 🚧 static evidence red: `test/semantic-kernel.test.ts` measures `main...HEAD` and fails on the head clone, issue #89 |
| TC-1317 | The full suite passes on a revert of this change's range, driven by the harness revert-rehearsal verb | Static | P1 | NFR-032-AC-8 | 🚧 static evidence red: the revert rehearsal's scratch clone lacks the Python and generated-binding environment, so 48 pytest/vitest rows and `rust-check` fail there independent of the revert; reported for a harness follow-up |
| TC-1318 | On a synthetic history built by the harness accretion-rehearsal verb with an unrelated sibling on top, the path set does not grow, and a prohibited path no later commit owns still fails the gate | Static | P1 | NFR-032-AC-9 | ✅ static evidence (make extraction-frontend-evidence) |
| TC-1319 | git log --merges over the range is empty, and package.json and pnpm-lock.yaml are byte-unchanged | Static | P1 | NFR-032-AC-10 | ✅ passed |
| TC-1320 | The crate manifest declares rust-version.workspace = true, license AGPL-3.0-only, publish = false, edition 2021; the Makefile names the qualification compiler on exactly one non-comment line, EXTRACTION_TOOLCHAIN ?= 1.98.1; the workspace rust-version, rust-toolchain.toml, and other members' Cargo.lock entries are unchanged from base | Static | P1 | NFR-033-AC-1 | ✅ passed |
| TC-1321 | Every cargo invocation in the Makefile extraction-frontend block carries +$(EXTRACTION_TOOLCHAIN), and with EXTRACTION_TOOLCHAIN=0.0.0 each gate exits non-zero naming 0.0.0 | Static | P1 | NFR-033-AC-2 | ✅ passed |
| TC-1322 | quire-rs is a git dep at exact rev 8b8020e or later with no branch, ix-trace-rs dev at v0.1.1, semantic-ir by path, serde pins exact, sha2 and clap exact, no jsonschema, no outside path/file/link dep; module PROVENANCE names d1840b8 | Static | P1 | NFR-033-AC-3 | ✅ passed |
| TC-1323 | make extraction-frontend-deny passes with zero errors against a deny.toml whose allowlist is exactly the permitted set, with quire-rs AGPL-3.0-or-later admitted by an explicit entry | Static | P1 | NFR-033-AC-4 | ✅ static evidence (make extraction-frontend-evidence) |
| TC-1324 | make extraction-frontend-audit reports zero advisories against the locked graph | Static | P1 | NFR-033-AC-5 | ✅ static evidence (make extraction-frontend-evidence) |
| TC-1325 | Every third-party crate reachable in Cargo.lock has a THIRD-PARTY-NOTICES.md entry naming version and licence, and the crate ships a LICENSE file carrying AGPL-3.0-only | Static | P1 | NFR-033-AC-6 | ✅ passed |
| TC-1326 | cargo +1.98.1 clippy --no-deps --all-targets --locked -- -D warnings and cargo +1.98.1 fmt --check both pass | Static | P1 | NFR-033-AC-7 | ✅ passed |
| TC-1327 | Every requirement test carries a #[trace("TC-NNNN", "...-AC-N")] marker and a tc_NNNN_ name, and every named TC id exists in spec/tests.md, which carries TC-1200..1329 before the first traced test | Static | P1 | NFR-033-AC-8 | ✅ passed |
| TC-1328 | With quire coverage --scope . --json confirmed to bind the Rust #[trace] form, removing both the marker and the tc_NNNN_ name prefix from one test turns its matrix row into a status lie, proving the binding is by symbol | Static | P1 | NFR-033-AC-9 | ✅ passed |
| TC-1329 | cargo +1.98.1 build --locked --offline succeeds from a warm cache, so every dependency resolves without a network | Integration | P1 | NFR-033-AC-10 | ✅ passed |
| TC-1330 | grep of src/ finds load_repo and load_module_set only in bundle.rs and std::fs only in write.rs; resolve.rs classifies from the engine target, reason, index, object, pass-one outcomes, and scalar table alone; the binary reads no environment | Static | P1 | FR-091-CON-2, FR-092-CON-2, FR-099-CON-3 | ✅ passed |
| TC-1331 | A bundle holding two documents with id: FR-006 refuses with DUPLICATE_ARTIFACT_ID at the second path naming both; an engine diagnostic injected with line: 0 reaches the array with no locus and the path in related, validating against the schema | Unit | P1 | FR-091-AC-11 | ✅ passed |
| TC-1332 | A one-pass implementation is refuted: with pass one stubbed to report every artifact as lowered, TC-1215 fails; with the real pass one it passes | Unit | P1 | FR-092-AC-11 | ✅ passed |
| TC-1333 | The business enumeration artifact lowers to one kind: enum with one variant per ## Values row named verbatim at variant/<Name>-<value> with origin at the row line column 3; no ## Values emits blocking ARTIFACT_NOT_LOWERED; every kind: alias in a fixture document is a constrained field's alias at type/<slug(DisplayName)><Field> with displayName <DisplayName> plus the verbatim field name capitalised, targeting a non-alias, named by exactly that field's typeRef, carrying a constraint | Unit | P1 | FR-093-AC-12 | ✅ passed |
| TC-1334 | Two documents both titled Status under distinct ids (the re-authored negatives/DUPLICATE_TYPE_NAME fixture) raise DUPLICATE_TYPE_NAME at the second path naming both, while Status and status raise nothing here; a row reading min: 1, min: 2 raises DUPLICATE_CONSTRAINT at that row; fields versionNumber and version_number each carrying min yield the distinct codes VERSIONNUMBER_MIN and VERSION_NUMBER_MIN and raise nothing; fields created_at and created__at on one record raise UNSLUGGABLE_NAME at the later row, and enumeration rows a b and a_b raise UNSLUGGABLE_NAME at the second row | Unit | P1 | FR-093-AC-13 | ✅ passed |
| TC-1335 | A domain artifact with no ## Properties (fields.state not_applicable) lowers to a record with fields: [] that the reader accepts; an extraction with availability.fields.lossy true yields one DECLARED_LOSS naming lossy-extraction | Unit | P1 | FR-093-AC-14 | ✅ passed |
| TC-1336 | grep of src/ finds no serde_json::to_string, to_vec, or to_writer and no serializer other than agent_ix_semantic_ir::normalize::normalized, and every write of the document is dominated by a decide call with a success verdict | Static | P1 | FR-097-CON-2, FR-097-CON-3 | ✅ passed |
| TC-1337 | The json-schema target accepts the lifted config-version-table document, exits zero, writes `ConfigVersion.json`, and records a success manifest (issue #36 AC-5, delivered by #85) | Integration | P0 | FR-100-AC-2 | ✅ passed |
| TC-1338 | The payload-schema helper lives under crates/extraction-frontend/tests/ only, is exported by no module under src/, and is unreachable from the lift and inspect commands, asserted by grep over src/ and the public surface | Static | P1 | FR-098-CON-3 | ✅ passed |
| TC-1339 | lift --out o.json --diagnostics o.json, and --diagnostics d.json --provenance d.json, each refuse with OUTPUT_UNWRITABLE naming both colliding options, exit 2, and write nothing | E2E | P1 | FR-097-AC-16 | ✅ passed |
| TC-1340 | A lift with --out under the bundle root, and one with --out under a module root, each refuse with OUTPUT_UNWRITABLE naming the path before any document is loaded and write nothing | E2E | P0 | FR-097-AC-13 | ✅ passed |
| TC-1341 | A warning-only lift with no --diagnostics or --provenance option writes the document, .fingerprint, .diagnostics.json, and .provenance.json, and those four are the only new files in the output directory | E2E | P1 | FR-097-AC-14 | ✅ passed |
| TC-1342 | The negatives/INVALID_IR bundle whose frontmatter declares A contains B and B contains A refuses at lift time with INVALID_IR carrying the reader's COMPOSITE_CYCLE in causes[0] and writes no document | Integration | P1 | FR-097-AC-15 | ✅ passed |
| TC-1343 | The set of directories under fixtures/, fixtures/negatives/, and fixtures/modules/ equals the FR-098 inventory (negatives/DUPLICATE_IDENTITY added, identity-cases/identity-cases.json and its PROVENANCE.json), and every constructed.json names a test function that exists under crates/extraction-frontend/tests/ | Static | P1 | FR-098-AC-11 | ✅ passed |
| TC-1344 | parity::project applied to the config-version-table golden yields types as its only member, no origin or extensions at any depth, every identity beginning ix://shared/, and is idempotent when applied twice | Property | P1 | FR-098-AC-12 | ✅ passed |
| TC-1345 | An engine diagnostic injected with line: Some(0) serialises with no locus, with the document path in its message, and validates against common.schema.json | Unit | P1 | FR-096-AC-15 | ✅ passed |
| TC-1346 | A reader diagnostic returned by decide at lift time appears as exactly one INVALID_IR with no locus, the reader's code and instance pointer in the message, and the reader's diagnostic in causes[0], and under no other code | Unit | P1 | FR-096-AC-16, FR-096-CON-2 | ✅ passed |
| TC-1347 | Two records titled Status and status, each carrying a field id with min, mint distinct type/Status and type/status with distinct field/Status-* and field/status-* sets and two constraints sharing the one code STATUS_ID_MIN, and a bundle holding both lifts with zero diagnostics about them; an artifact whose displayName is a kernel scalar the bundle uses is refused with DUPLICATE_TYPE_NAME before any identity is minted (contract case (a), FR-093-AC-13) | Unit | P1 | FR-095-AC-14, FR-093-AC-13 | ✅ passed |
| TC-1348 | The provenance record's entry for the vendored spec-objects-business module carries the manifest sha256 that fixtures/modules/spec-objects-business/PROVENANCE.json records for revision d1840b8 | Unit | P1 | FR-095-AC-15 | ✅ passed |
| TC-1349 | extraction-frontend-deny exits non-zero when a crate with a licence outside the deny.toml allow list is planted in a scratch manifest, extraction-frontend-audit (--deny yanked) exits non-zero when a yanked version is planted, and each exits zero on the committed one | Static | P1 | FR-099-AC-6 | ✅ static evidence (make extraction-frontend-evidence) |
| TC-1350 | cargo check -p agent-ix-extraction-frontend --locked --offline on the rust-toolchain.toml channel (1.94.1) exits zero, so a --workspace build on the workspace channel still compiles the crate and make rust-build and rust-test are not broken by it (CR-036-1) | Integration | P1 | NFR-033-AC-11 | ✅ passed |
| TC-1351 | The negatives/DUPLICATE_IDENTITY bundle, an artifact NoteRevision beside a record Note with a constrained field revision (contract case (c): distinct names, distinct slugs, one identity), is refused at the later path with DUPLICATE_IDENTITY naming both type/NoteRevision identities and carrying the earlier locus in related, blocking, and no document is written | Snapshot | P1 | FR-095-AC-14 | ✅ passed |
| TC-1352 | A Rust test in crates/extraction-frontend/tests/ asserts every row of crates/extraction-frontend/fixtures/identity-cases/identity-cases.json (identity, alias, diagnosticCode, and refusal rows, including Config Version, Config_Version, created_at, minLength, package core.data, and the part _ refusing as UNSLUGGABLE_NAME) against identity.rs, and a planted row the crate fails turns the test red naming identity.rs | Unit | P0 | FR-095-AC-16 | ✅ passed |
| TC-1353 | The same Rust test runs node scripts/extraction-frontend-harness.mjs identity-cases --table <file> (which imports src/compiler/frontend/typespec/identity.mjs and prints what it mints or refuses per row) over the same table and compares row by row, failing naming node when it is absent, so the two implementations are checked by one table and not by two hand-written lists; a planted row identity.mjs fails turns the test red naming identity.mjs | Unit | P0 | FR-095-AC-16 | ✅ passed |
| TC-1354 | The alias row Note, created_at of identity-cases/identity-cases.json asserts identity type/NoteCreated-at and displayName NoteCreated_at on both sides (identity.rs directly, identity.mjs through the harness verb), so a hyphenated field slug and a verbatim-field displayName agree between the frontends | Unit | P1 | FR-095-AC-16, FR-093-AC-12 | ✅ passed |
| TC-1355 | admitIr admits a document whose three kind: scalar definitions each carry the ext/kernel-scalar extension with success and zero diagnostics, and reports two ext/doc extensions on one field as exactly one DUPLICATE_IDENTITY at /ir/types/N/fields/M/extensions/1/identity with nothing at any type's extensions pointer (CR-088-1) | Unit | P0 | FR-068-AC-25 | ✅ passed — issue #88 |
| TC-1356 | generate --target typescript over the lifted config-version-table IR exits zero with zero diagnostics and a non-empty file set, so the TypeScript half of TC-1292 unblocks (CR-088-1) | Integration | P0 | FR-068-AC-26 | ✅ passed — issue #88 |
| TC-1357 | A scalar: uuid definition deriving UUID, and date, datetime, and duration definitions deriving Date, DateTime, and Duration, each generate with zero diagnostics, no newtype, and every typeRef rendered as crate::support::<Support> (CR-090-1) | Unit | P0 | FR-055-AC-15 | ✅ passed — issue #90 |
| TC-1358 | A scalar: string definition deriving Uuid, and a record deriving Date, each raise one NAME_COLLISION naming the reserved identity and the definition's identity and write no file (CR-090-1) | Unit | P1 | FR-055-AC-16 | ✅ passed — issue #90 |
| TC-1359 | The regenerated branch register carries one support-type row per support scalar contributed by mapping-table.json, each bound to an existing case, register --check passes, and removing any one case fails it naming the row (CR-090-1) | Analysis | P1 | FR-062-AC-15 | ✅ passed — issue #90 |
| TC-1373 | A baseline field distinguishes required empty `0..*`, optional absent `1..*`, explicit null, invalid input, unavailable observation, and otherwise-equal default/ordered/unique variants; a v1.1 source lacking authored presence refuses baseline projection with named loss | Unit | P0 | FR-106-AC-1, FR-106-AC-2, FR-106-AC-3, FR-106-AC-5, FR-106-CON-1, FR-106-CON-2 | 🚧 planned — #95 producer/schema boundary |
| TC-1374 | A v1.2 field whose authored presence matches the historical v1.1 derivation projects without a presence loss | Unit | P1 | FR-106-AC-4 | 🚧 planned — #95 producer/schema boundary |
| TC-1375 | Relationship declarations preserve distinct endpoint multiplicities and stable endpoints, reject a field-only invented relationship, retain endpoint-role loss, and refuse a composite cycle | Integration | P0 | FR-107-AC-1, FR-107-AC-2, FR-107-AC-3, FR-107-CON-1, FR-107-CON-2 | 🚧 planned — #95 producer/schema boundary |
| TC-1376 | A closed population distinguishes absent/null/value, rejects an undeclared relationship endpoint, and rejects an object outside its declared universe | Integration | P0 | FR-108-AC-1, FR-108-AC-2, FR-108-CON-1 | 🚧 planned — #95 producer/schema boundary |
| TC-1377 | An unavailable observation outside exact support leaves a decisive result plus explicit availability incomplete, while removing required support returns unavailable/incomplete and retains its observation-record identity | Integration | P0 | FR-108-AC-3, FR-108-CON-2 | 🚧 planned — evaluator/producer boundary |
| TC-1378 | Two records for one member remain ordered records, and event-position, fixed-sample, and timestamp windows preserve selected half-open coverage and reject family mismatch | Integration | P0 | FR-108-AC-4, FR-108-AC-5 | 🚧 planned — D/F/E correspondence |
| TC-1379 | An unknown profile and a missing explicit configuration refuse before evaluation; changing only a resource limit changes retained configuration identity | Unit | P0 | FR-109-AC-1, FR-109-AC-2, FR-109-AC-3, FR-109-CON-1, FR-109-CON-2 | 🚧 planned — #95 consumer boundary |
| TC-1380 | A package statically links an exact model/profile/configuration closure with no records; an assessment missing its selected window reports its own missing-input disposition | Integration | P0 | FR-109-AC-4 | 🚧 planned — A/D consumer boundary |
| TC-1381 | A producer canonical-object digest and a native raw-byte digest are accepted only in their named domains, and substitution refuses | Unit | P0 | FR-109-AC-5 | 🚧 planned — A/D correspondence |
| TC-1382 | A locked order/payment/fulfillment inventory resolves all imports and refuses missing or conflicting selected imports and any unlisted component or runtime binding | Integration | P0 | FR-110-AC-1, FR-110-CON-1 | 🚧 planned — IN01 implementation boundary |
| TC-1383 | Two roles bind one permitted component and two components reside in one repository without collapsing role, component, or workflow-instance identity | Integration | P1 | FR-110-AC-2, FR-110-CON-2 | 🚧 planned — IN01 implementation boundary |
| TC-1384 | Metadata-only analysis is not live evidence without authorized deployment binding, and related workflow populations/windows retain member and record identities separately | Integration | P0 | FR-110-AC-3, FR-110-AC-4 | 🚧 planned — IN01 implementation boundary |
| TC-1385 | Additive schema compatibility, payload break, unchanged-schema behavioral regression, and absent evidence receive distinct conclusions | Unit | P0 | FR-111-AC-1 | 🚧 planned — IN02 implementation boundary |
| TC-1386 | Every policy-required mixed-version combination is assessed; an omitted required combination yields unknown | Integration | P0 | FR-111-AC-2 | 🚧 planned — IN02 implementation boundary |
| TC-1387 | Changed model/binding/assumption/tool/environment paths retain affected or stale conclusions without rewriting historical results; unresolved and circular support retains unknown and is neither behavioral regression nor proof of falsehood | Integration | P0 | FR-111-AC-3, FR-111-AC-4, FR-111-CON-1, FR-111-CON-2 | 🚧 planned — IN02 implementation boundary |
| TC-1388 | A rust target request over an accepted IR document returns state success with a non-empty file set, src/lib.rs among the paths, and zero blocking diagnostics | Unit | P0 | FR-130-AC-1 | ✅ passed |
| TC-1389 | The manifest a rust target request returns names the Rust backend's own identity and no TypeScript identity | Unit | P0 | FR-130-AC-2 | ✅ passed |
| TC-1390 | Generating one document through the seam and through generateRust yields the same path set and a byte-identical digest at every path | Integration | P0 | FR-130-AC-3, FR-130-CON-1 | ✅ passed |
| TC-1391 | The generated crate's src/identity.rs renders GENERATOR_IDENTITY as the Rust backend and never as the TypeScript backend | Unit | P0 | FR-130-AC-4 | ✅ passed |
| TC-1392 | A target with no implementation returns state unavailable, zero files, and BACKEND_NOT_IMPLEMENTED naming the owning issue | Unit | P1 | FR-130-AC-5 | ✅ passed |
| TC-1393 | A rust request whose IR declares contract version 1.0.0 returns state unsupported naming 1.1.0, and the backend declares 1.1.0 alone | Unit | P1 | FR-130-AC-6, FR-130-CON-3 | ✅ passed |
| TC-1394 | A rust request with no injected host returns state invalid with at least one diagnostic and zero files | Unit | P1 | FR-130-AC-7 | ✅ passed |
| TC-1395 | The registered rust backend module imports no file-system module, and the seam's rust entry resolves to it as implemented | Unit | P1 | FR-130-AC-8, FR-130-CON-2 | ✅ passed |
| TC-1396 | make test-rust names rust and extraction-frontend-test; make rust names check, build, clippy, test and conformance; make test-node names neither rust nor cargo | Unit | P0 | NFR-038-AC-1, NFR-038-AC-5 | ✅ passed |
| TC-1397 | Every workflow declares workflow_dispatch and no push, pull_request or schedule trigger | Unit | P0 | NFR-038-AC-2 | ✅ passed |
| TC-1398 | The Rust lane's matrix names ubuntu-latest and macos-latest with fail-fast false, so a single-platform defect reports rather than cancelling its sibling | Unit | P0 | NFR-038-AC-3 | ✅ passed |
| TC-1399 | rust-clippy runs --workspace --no-deps with -D warnings, so every member is linted and no dependency's lints are reported | Unit | P0 | NFR-038-AC-4 | ✅ passed |
| TC-1400 | Both platforms upload their generated crates and an empty upload is an error, so the cross-platform comparison has evidence to run over | Unit | P1 | NFR-038-AC-6 | ✅ passed |
| TC-1401 | Both toolchain checks exit non-zero naming the toolchain they could not run, and every Rust gate depends on one | Unit | P1 | NFR-038-AC-7 | ✅ passed |
| TC-1402 | The lane reads the qualification toolchain from make and names no version of its own, so a bump cannot leave it pinned | Unit | P1 | NFR-038-AC-1 | ✅ passed |
| TC-1403 | A producer exiting non-zero with no diagnostic, and one exiting zero with no document, each yield exactly FRONTEND_CONTRACT_VIOLATION; a producer refusing with a reason has its own diagnostics forwarded unchanged | Unit | P0 | FR-131-AC-4, FR-131-AC-5 | ✅ passed |
| TC-1404 | The spec-bundle dialect is registered implemented and the seam routes a request for it to the frontend | Unit | P0 | FR-131-AC-1 | ✅ passed |
| TC-1405 | A request whose producer returns a document yields that document, its diagnostics, and exactly one producer call carrying what the request named | Unit | P0 | FR-131-AC-2 | ✅ passed |
| TC-1406 | A request naming no bundle root is refused with INVALID_REQUEST and the producer is never called | Unit | P1 | FR-131-AC-3 | ✅ passed |
| TC-1407 | A dialect registered unimplemented is refused with FRONTEND_NOT_IMPLEMENTED naming its owner, over a synthetic registration rather than whichever dialect is unbuilt today | Unit | P1 | FR-131-AC-6 | ✅ passed |
| TC-1408 | No module under src/compiler/frontend/ imports a process-starting built-in, and extraction.mjs is unreachable from the frontend seam | Unit | P0 | FR-131-AC-7, FR-131-CON-1, FR-131-CON-2 | ✅ passed |
| TC-1409 | A request supplying no producer raises rather than returning a diagnostic | Unit | P1 | FR-131-AC-8 | ✅ passed |
| TC-1410 | No change-set gate resolves a range end against main, origin/main or HEAD, and every one reads both ends from the shared sentinel helper | Analysis | P0 | NFR-039-AC-1, NFR-039-AC-5 | 🚧 planned on issue #92 |
| TC-1411 | A gate whose sentinels are absent from history fails naming what it could not locate, and a commit landing after a change's range does not enter that range even when it touches a prohibited path | Unit | P0 | NFR-039-AC-2, NFR-039-AC-3 | 🚧 planned on issue #92 |
| TC-1412 | A gate comparing a historical hunk reads the other side at that hunk's own commit, so a later change editing those lines leaves it green | Analysis | P1 | NFR-039-AC-4 | 🚧 planned on issue #92 |
| TC-1413 | Every change-set gate passes on a clean checkout carrying no state beyond the commit under test | Integration | P0 | NFR-039-AC-6 | 🚧 planned on issue #92 |
| TC-1414 | The Python reader answers every corpus case, the slot's unmet count reaches zero, and its code set equals the published registry in both directions | Integration | P0 | FR-132-AC-1, FR-132-AC-2 | 🚧 planned on issue #65 |
| TC-1415 | UNRESOLVED_TYPE_REF, PRESENCE_MULTIPLICITY_MISMATCH and V1_1_NODE_IN_V1_0 are each emitted by at least one case, and the reader's normalized form agrees with the Rust and TypeScript adapters or the disagreement is a recorded finding | Integration | P0 | FR-132-AC-3, FR-132-AC-4 | 🚧 planned on issue #65 |
| TC-1416 | An undecidable document yields an undecided verdict counted as neither pass nor failure; with the reader absent the slot reports unavailable naming its issue and no case passes | Unit | P1 | FR-132-AC-5, FR-132-AC-7, FR-132-CON-3 | 🚧 planned on issue #65 |
| TC-1417 | The Python reader imports no module of the generated Python package and shares no code with the TypeScript or Rust readers | Unit | P1 | FR-132-AC-6, FR-132-CON-1 | 🚧 planned on issue #65 |
| TC-1418 | The Rust kernel crate generates from the kernel IR with zero blocking diagnostics, and both the reserved identifier and the minted construct are present naming different types | Integration | P0 | FR-133-AC-1, FR-133-AC-2 | 🚧 planned on issue #80 |
| TC-1419 | Every typeRef to the minted construct renders the resolved identifier and none renders the reserved one; every affected semantic identity is byte-unchanged | Unit | P0 | FR-133-AC-3, FR-133-AC-7, FR-133-CON-1 | 🚧 planned on issue #80 |
| TC-1420 | A pair the rule does not cover still raises NAME_COLLISION naming both identities and writes no file | Unit | P1 | FR-133-AC-4 | 🚧 planned on issue #80 |
| TC-1421 | Over arbitrary minted and reserved names, no two distinct constructs share one generated identifier, and the register carries the resolution bound to a case | Property | P1 | FR-133-AC-5, FR-133-AC-6, FR-133-CON-2 | 🚧 planned on issue #80 |
| TC-1422 | Every published artifact identifies its source, compiler, IR, backend and schema fingerprints, and two builds from one source produce identical bytes | Integration | P0 | NFR-040-AC-1, NFR-040-AC-3 | 🚧 planned on issue #26 |
| TC-1423 | Every combination the version matrix declares carries a conformance corpus run, and removing a run removes its row | Analysis | P0 | NFR-040-AC-2 | 🚧 planned on issue #26 |
| TC-1424 | A rehearsed rollback leaves previously published compatible artifacts retrievable; no artifact reaches a public registry and every release workflow is manually dispatched | Manual | P0 | NFR-040-AC-4, NFR-040-AC-5 | 🚧 planned on issue #26 |
| TC-1425 | An install-from-artifact consumer exists per generated language and builds against the published artifact; the first supported version and its canaries are named by a recorded decision | Integration | P1 | NFR-040-AC-6, NFR-040-AC-7 | 🚧 planned on issue #26 |
| TC-1426 | Every known producer and consumer carries a disposition and an owner; every P0 compatibility finding is resolved and each accepted lower finding names an owner and an expiry condition | Manual | P0 | FR-135-AC-1, FR-135-AC-2 | 🚧 planned on issue #12 |
| TC-1427 | The candidate schema set and locks are published before the decision, and the compatibility window names each retained legacy representation exactly | Manual | P0 | FR-135-AC-3, FR-135-AC-4, FR-135-CON-2 | 🚧 planned on issue #12 |
| TC-1428 | Changing a published schema byte within the frozen major is detected and refused | Unit | P0 | FR-135-AC-5, FR-135-CON-1 | 🚧 planned on issue #12 |
| TC-1429 | The recorded decision names a human and its conditions, no artifact treats silence as approval, and the rollback is rehearsed rather than described | Manual | P1 | FR-135-AC-6, FR-135-AC-7, FR-135-CON-3 | 🚧 planned on issue #12 |
| TC-1430 | Every known consumer is migrated, deferred with a named owner, or proven retired, and a census re-measured before a removal agrees with the plan or stops it | Manual | P0 | FR-134-AC-1, FR-134-AC-2 | 🚧 planned on issue #6 |
| TC-1431 | No persisted payload is readable only by removed code over the retained corpus, and a boundary with a remaining reader keeps its legacy representation | Integration | P0 | FR-134-AC-3, FR-134-AC-4, FR-134-CON-1, FR-134-CON-2 | 🚧 planned on issue #6 |
| TC-1432 | Reverting any single removal restores that boundary without reverting another | Manual | P1 | FR-134-AC-5, FR-134-CON-3 | 🚧 planned on issue #6 |
| TC-1433 | Each consumer the re-measured census names reads the generated contract and no longer reads the legacy one, or is recorded as retired with its evidence, and the records name the retired and retained boundaries | Integration | P0 | FR-134-AC-6, FR-134-AC-7 | 🚧 planned on issue #6 |
| TC-1530 | Both Python targets are registered implemented and select a backend naming ix://agent-ix/filament-core-data/backend/python | Unit | P0 | FR-136-AC-1 | ✅ passed |
| TC-1531 | A python-pydantic-v2 request over an accepted IR document returns state success with a non-empty file set, __init__.py among the paths, and zero blocking diagnostics | Integration | P0 | FR-136-AC-2 | ✅ passed |
| TC-1532 | A python-dataclass request over the same document returns state success under the pydantic_v2_dataclass profile | Integration | P0 | FR-136-AC-3 | ✅ passed |
| TC-1533 | A Python request with no injected producer returns state unavailable with BACKEND_CONTRACT_VIOLATION and zero files, rather than an empty package | Unit | P0 | FR-136-AC-4 | ✅ passed |
| TC-1534 | A producer that exits non-zero returns state invalid with BACKEND_CONTRACT_VIOLATION naming the profile, and zero files | Unit | P0 | FR-136-AC-5 | ✅ passed |
| TC-1535 | The documents handed to the producer are the json-schema target's own documents under its own names, and exclude its index.json manifest | Unit | P0 | FR-136-AC-6, FR-136-CON-3 | ✅ passed |
| TC-1536 | The registered Python backend module imports no file-system and no child-process module | Unit | P1 | FR-136-AC-7, FR-136-CON-2 | ✅ passed |
| TC-1537 | A generated Rust crate declares every provenance constant in src/provenance.rs, its identity module declares none of them, and lib.rs publishes the module | Unit | P0 | FR-137-AC-1 | ✅ passed |
| TC-1538 | A generated Rust crate declares TypeMeta, FieldMeta and TYPES in src/identity.rs, emits no src/metadata.rs, and its lib.rs names no metadata module | Unit | P0 | FR-137-AC-2 | ✅ passed |
| TC-1539 | A generated TypeScript package emits provenance.ts exporting PROVENANCE, emits no metadata.ts, and the provenance module imports nothing | Unit | P0 | FR-137-AC-3 | ✅ passed |
| TC-1540 | Every export the retired metadata.ts declared is declared by a module of the generated package, under the same name but for the one permitted rename | Unit | P0 | FR-137-AC-4, FR-137-CON-1 | ✅ passed |
| TC-1541 | No emitted artifact of any implemented target carries a name denoting metadata, across the Rust goldens, the TypeScript expected package and the semantic kernel | Unit | P0 | FR-137-AC-5 | ✅ passed |
| TC-1542 | Each implemented backend's specification carries an ADR-0007 emitted-set section with a non-empty row for each of the five concepts | Unit | P1 | FR-137-AC-6 | ✅ passed |
| TC-1543 | Each golden's digest baseline covers src/identity.rs and src/provenance.rs and covers no src/metadata.rs, so the renamed layout is the reproduced one | Unit | P0 | FR-137-AC-7, FR-137-CON-3 | ✅ passed |
| TC-1544 | The fixed TypeScript API surface carries PROVENANCE and not SEMANTIC_METADATA, and the barrel re-exports provenance.js and names no metadata module | Unit | P0 | FR-137-AC-8, FR-137-CON-2 | ✅ passed |

| TC-1360 | The `json-schema` registry entry generates the lifted ConfigVersion golden through the seam, returning a success manifest with a SHA-256 digest for every emitted file. | Integration | P0 | FR-063-AC-22 | ✅ passed — issue #85 |
| TC-1361 | A synthetic IR containing all eight structural kinds and every kernel scalar emits one Ajv-compilable JSON Schema 2020-12 document per definition. | Unit | P0 | FR-100-AC-1 | ✅ passed — issue #85 |
| TC-1362 | The lifted config-version-table golden emits `ConfigVersion.json` with its seven properties, six required fields, and declared minimum constraint. | Unit | P0 | FR-100-AC-2 | ✅ passed — issue #85 |
| TC-1363 | Generated sibling schemas accept a valid ConfigVersion payload and reject a zero `versionNumber`. | Unit | P0 | FR-100-AC-3 | ✅ passed — issue #85 |
| TC-1364 | `reject` records refuse extra properties; `preserve` and `surface` accept them and retain their distinct policy annotations. | Unit | P0 | FR-100-AC-4 | ✅ passed — issue #85 |
| TC-1365 | Every generated reference is a sibling `./*.json` path and no emitted reference has a parent traversal. | Unit | P0 | FR-100-AC-5, FR-100-CON-3 | ✅ passed — issue #85 |
| TC-1366 | A required extension without an annotation mapping yields `UNDECLARED_LOSS` and no schema file. | Unit | P0 | FR-100-AC-6, FR-100-CON-2 | ✅ passed — issue #85 |
| TC-1367 | Reversing the admitted IR type order leaves every emitted JSON Schema byte-identical; static inspection confirms the backend imports neither a source frontend nor a filesystem module. | Unit/Static | P0 | NFR-034-AC-1, FR-100-CON-1 | ✅ passed — issue #85 |

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
| TC-316 | field presence and nullability | `required` / `optional` | `nullable: true` / `nullable: false` | All four combinations are distinct normalized forms; neither is inferable from the other |
| TC-305, TC-309 | adapter answer | `supported` / `unsupported` / `unavailable` | declared in the case or the registry, or undeclared | Declared `unsupported` and registry-declared `unavailable` are recorded; every undeclared answer fails |
| TC-321 | contract version | `1.0.0` / `1.1.0` | node present or absent | A `1.1.0` node in a `1.0.0` document, and a `1.0.0` document read under `1.1.0` rules, each classify as the register row states |
| TC-296 | compatibility change | optional addition / required addition / removal | consumer policy preserving, rejecting, or absent | Most restrictive classification wins, an optional addition is additive only under a preserving policy, and every contributing change is named |
| TC-312 | adapter pointer scheme | `pointerCompatible: true` / `false` | matching or mismatched locus | The pointer is compared only for a compatible adapter; a wrong locus always fails |
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
| TC-760, TC-778 | field state | `presence` required / optional | `nullable` true / false | All four combinations are four distinct rendered forms and four distinct runtime decisions |
| TC-762, TC-782 | `unknownPolicy` | `preserve` / `reject` / `surface` | one undeclared member in the payload | Carried through unchanged, rejected at its own pointer, or surfaced without failing the value |
| TC-755 | IR structural kind | scalar / record / enum / union / alias / sequence / map / reference | the declared rendering table | Each kind renders once by its declared form; an unhandled kind fails the renderer's contract test |
| TC-745, TC-747 | generation target | `typescript` implemented / `rust`, `python-pydantic-v2`, `python-dataclass`, `json-schema` declared-unimplemented | `generateTarget` | The implemented target generates; each other names its owning issue and emits nothing |
| TC-760 | field multiplicity | `upper` absent / `upper` = 1 / `upper` > 1 | rendered property type | Absent or greater than one renders a readonly array; exactly one renders a scalar property |
| TC-784 | `defaultKind` | `none` / `semantic` / `representation` / `migration` | property absent at validation | Only a `semantic` default is applied; the other two belong to the representation layer |
| TC-817, TC-822 | adapter answer | `supported` / `unsupported` / `unavailable` | registry `status` and the case's own `unsupportedBy` | An available slot must answer `supported`; every other answer must be declared or the run fails |
| TC-803 | `REFERENCE_POLICY` | `strict` / `open` | a `reference` target no type, import, or lock export supplies | `UNRESOLVED_TYPE_REF` or no diagnostic; the constant is the only line that differs between the runs |
| TC-779 | field presence and member state | `required` / `optional` | absent / `null` / explicitly `undefined` / a conforming value | Six accept-or-reject decisions; absent and explicitly `undefined` never collapse into one another |
| TC-782 | `unknownPolicy` against structural kind | `preserve` / `reject` / `surface` | `record` / `union` / `map` | Only a `record` carries a validation effect; the other kinds record the policy in metadata and validate identically |
| TC-781 | constraint subject after alias resolution | `string` / `bytes` / `integer` / `number` / `duration` | `minLength` / `maxLength` / `min` / `max` | Length counts code points for a `string` and decoded octets for `bytes`; an ordering keyword on a `duration` is a representability loss |
| TC-645, TC-646 | IR type definition | one of the eight structural kinds, nine kernel scalars | Rust declaration form | Each kind and scalar takes exactly its mapping-table row; no fallback exists |
| TC-647, TC-648 | field shape | collection x nullable x presence x bounded | composed Rust type | The three axes compose independently; absent, null and empty stay distinct |
| TC-650 | unknown member | reject / preserve / surface | deserialization outcome | Refused, retained silently, or retained with one non-blocking diagnostic |
| TC-653 | field default | none / semantic / representation / migration | serde default | Only a semantic default reaches the wire boundary; the other two stay metadata |
| TC-677, TC-678 | constraint keyword | one of eleven | resolved subject kind or scalar | Applicable pairs generate a check; inapplicable pairs are refused, never dropped |
| TC-679, TC-680 | ECMA-262 pattern | expressible / proved / unsupported | generated matcher, hand-written validator, or refusal | Exactly one of three outcomes; there is no unvalidated fourth |
| TC-698, TC-703 | conformance case | supported / unsupported-by-declaration | adapter answer | A supported case is judged against the oracle; a declared-unsupported case is unmet, never a pass |
| TC-854, TC-899 | `pydantic_v2.BaseModel` | qualified | full profile | Constraints, closure, aliases, and discriminated unions all retained |
| TC-854, TC-899 | `pydantic_v2.dataclass` | qualified | full profile | Same retention as `BaseModel`; the union renders as an annotated alias rather than a root model |
| TC-854, TC-900 | `dataclasses.dataclass` | not qualified | full profile | Every constraint, format, alias, closure, and discriminator dropped; static shape only |
| TC-854, TC-932 | `typing.TypedDict` | not qualified | full profile | Closure and aliases retained, constraints and formats dropped, and no runtime validation exists |
| TC-854, TC-930 | `msgspec.Struct` | qualified with conditions | full profile | Constraints and tagged unions retained; formats, closure, and pattern-keyed maps recorded as gaps |
| TC-865 | sealed object schema | `unevaluatedProperties` only | preparation pass applied | Generated model is closed |
| TC-865 | sealed object schema | `unevaluatedProperties` only | preparation pass skipped | Generated model is open, which is the defect the pass closes |
| TC-856, TC-865 | open object schema | `additionalProperties` absent | `--extra-fields` not declared | Generated model stays open, so closure is decided by the schema and not by a blanket flag |
| TC-856 | non-nullable field with a default | `--strict-nullable` declared | Pydantic family | Renders `T` rather than `T | None`, so no null the contract forbids is admitted |
| TC-1220, TC-1302 | typed declaration | table form, in its own bundle root | `ARTIFACT_NOT_LOWERED` disposition `warning` | Lowered; bytes identical to the fence-form root under the same module |
| TC-1220, TC-1302 | typed declaration | `sysml` fence form, in its own bundle root | `ARTIFACT_NOT_LOWERED` disposition `warning` | Lowered; bytes identical to the table-form root |
| TC-1209, TC-1228 | legacy free-column table | engine reason `legacy-form` | `ARTIFACT_NOT_LOWERED` disposition `warning` | No record; one non-blocking diagnostic; document written, exit 0 |
| TC-1228, TC-1260 | legacy free-column table | engine reason other than `legacy-form` (`both-forms`, `missing`) | `ARTIFACT_NOT_LOWERED` disposition `error` | No record; blocking diagnostic; diagnostics sidecar only, exit 1 |
| TC-1295 | `--module` count | one module root | `lift` | Bundle loaded under exactly that module; exit 0 |
| TC-1256, TC-1295 | `--module` count | two module roots | `lift` | `manifestDigest` over both in module-name order, independent of argument order |
| TC-1296 | `--module` count | zero | `lift` | Exit 2 naming the missing option; no ambient module location is tried |
| TC-1268, TC-1296 | diagnostic set | at least one blocking, lift not refused | `lift` | Diagnostics sidecar written and nothing else; pre-existing output unchanged; exit 1 |
| TC-1268, TC-1341 | diagnostic set | non-blocking only | `lift` | Document and three sidecars written, diagnostics reported on stderr, exit 0 |
| TC-1296, TC-1340 | refusal before lowering | `MODULE_*`, `BUNDLE_UNIDENTIFIED`, `DUPLICATE_ARTIFACT_ID`, `OUTPUT_UNWRITABLE`, or a malformed option | `lift` | No file written; exit 2 |
| TC-1263, TC-1262 | engine diagnostic severity | `advisory` / `warning` / `error` | `ENGINE_DIAGNOSTIC` mapping | `info` non-blocking / `warning` non-blocking / `error` blocking; never dropped or re-ranked |
| TC-1295, TC-1341 | `lift` sidecar options | `--diagnostics` and `--provenance` given or absent | `lift` | Given: the sidecar is written at the named path instead; absent: at `<out>.diagnostics.json` and `<out>.provenance.json`; always written on a non-blocking lift |
| TC-1290, TC-1291 | shared case dialects | both dialects non-null (`records-and-scalars`, both source trees present) / `spec-bundle: null` with a `scalar` reason (three existing cases) | parity projection | Exactly one two-dialect case, compared byte for byte after `normalized` under the shared identity rule (issue #87, CR-087-1); single-dialect cases recorded with their reason, never compared on a remainder |

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
| FR-035-AC-6 minimization budget | Max / Above max | 64 `ops` nodes / 65 `ops` nodes | TC-285 | Pass / fail the corpus gate |
| FR-036 single violation | Allowed / Prohibited | one seeded violation / two seeded violations | TC-290 | Exactly one oracle diagnostic / gate fails |
| FR-036 expansion depth | Max / Above max | acyclic alias chain of 256 / of 257 | TC-292 | Verdict returned / `DEPTH_LIMIT_EXCEEDED` at the exceeding node |
| FR-037 divergence `reviewBy` | Allowed / Reported | a future date / a past date | TC-306 | Audit target silent / audit target reports the entry |
| FR-038-AC-1 class coverage | Min / Below min | four classes, or three plus a justified `notApplicable` / three unjustified | TC-314 | Pass / fail naming the row and the missing class |
| FR-039-AC-3 mutation score | Min / Below min | every catalogued mutation detected / one undetected | TC-628 | Pass / fail naming the mutation |
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
| NFR-018-AC-3 | Allowed | Packed-file delta confined to `src/compiler/**`, promoted modules present in the packed set | TC-392 | Packed-file comparison passes |
| NFR-018-AC-3 | Prohibited | Any other added tarball path, or a promoted module missing from the packed set | TC-392 | Packed-file comparison fails |
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
| FR-063-CON-6 | Allowed | Exactly fifteen exported symbols on the narrow build interface | TC-753 | Export-set assertion passes |
| FR-063-CON-6 | Prohibited | A sixteenth exported symbol | TC-753 | Export-set assertion fails |
| FR-065-AC-1 | Allowed | Exactly the seven declared generated files | TC-766 | File-set assertion passes |
| FR-065-AC-1 | Prohibited | An eighth emitted path | TC-766 | File-set assertion fails |
| FR-064-AC-8 | Allowed | `multiplicity.upper` of `1` | TC-760 | Scalar property, not an array |
| FR-064-AC-8 | Allowed | `multiplicity.upper` of `2` | TC-760 | `readonly` array property |
| FR-066-AC-5 | Allowed | `minLength` operand `0` against the empty string | TC-780 | Accepted |
| FR-066-AC-5 | Prohibited | A string one code point past `maxLength` | TC-780 | The constraint's own `diagnosticCode` at the field's pointer |
| FR-066-AC-5 | Allowed | A value equal to `min`, and a value one step past `exclusiveMin` | TC-780 | Accepted |
| FR-066-AC-5 | Prohibited | A value equal to `exclusiveMin`, and a value one step below `min` | TC-780 | The constraint's own `diagnosticCode` at the field's pointer |
| FR-066-CON-4 | Allowed | A value nested exactly to the generated validator's declared depth limit | TC-785 | Accepted |
| FR-066-CON-4 | Prohibited | A value nested one level past that limit | TC-785 | Exceeded-depth code; the validator terminates rather than recursing |
| FR-068-AC-2 | Prohibited | A `multiplicity` whose `upper` is below its `lower` | TC-796 | `INVALID_MULTIPLICITY` at the multiplicity pointer |
| FR-068-AC-2 | Prohibited | An `enumValues` operand carrying an empty `values` array | TC-796 | `SCHEMA_VIOLATION` below the published minimum |
| FR-068-AC-14 | Allowed | A document producing exactly `maxDiagnostics` findings | TC-805 | Every finding returned, no truncation |
| FR-068-AC-14 | Prohibited | A document producing one finding past `maxDiagnostics` | TC-805 | Bounded answer naming the limit, with no throw |
| FR-069-AC-6 | Prohibited | A non-finite number in a document being canonicalized | TC-810 | Named refusal rather than a serialized value |
| FR-066-AC-20 | At bound | A `bytes` subject at `maxLength` 3 given a four-character base64 string decoding to exactly three octets | TC-781 | Accepted; the octet count, not the character count, is the measured length |
| FR-066-AC-20 | Above max | The same subject given a base64 string decoding to four octets | TC-781 | Rejected with that constraint's own `diagnosticCode` |
| FR-066-AC-21 | Above max | An `integer` subject given `Number.MAX_SAFE_INTEGER + 2` | TC-781 | Rejected with its own structural code rather than accepted as a `number` |
| FR-066-AC-21 | Boundary | An `integer` subject given `-0` where it accepts `0` | TC-781 | Accepted, and canonicalizing to the same bytes as `0` |
| FR-068-AC-22 | At bound | A document nested to the declared depth of 256 | TC-805 | Admitted, because the bound is the corpus's declared 256 and not the compiler's `DEFAULT_LIMITS` of 128 |
| FR-068-AC-22 | Above max | The same document nested to 257 | TC-805 | `DEPTH_LIMIT_EXCEEDED`, and a cycle at the same depth reports `ALIAS_CYCLE` instead |
| FR-054-CON-1 | Allowed | Every construct has a mapping row | TC-655 | Generation proceeds |
| FR-054-CON-1 | Prohibited | A construct has no row | TC-656 | UNSUPPORTED_CONSTRUCT, zero files |
| FR-054-CON-2 | Allowed | A degraded type at a position the table declares | TC-694 | Scan passes |
| FR-054-CON-2 | Prohibited | String substituted for a constrained scalar | TC-694, TC-729 | Scan fails naming the declaration |
| FR-054-CON-4 | Allowed | serde as the sole runtime dependency | TC-655 | Manifest inspection passes |
| FR-054-CON-4 | Prohibited | A second runtime dependency | TC-655, TC-689 | Manifest inspection fails |
| FR-055-CON-1 | Allowed | Distinct identities derive distinct identifiers | TC-664 | Generation proceeds |
| FR-055-CON-1 | Prohibited | Two identities derive one identifier | TC-662 | NAME_COLLISION, zero files |
| FR-056-CON-3 | Allowed | Emitted manifest carries publish = false | TC-667, TC-741 | Gate passes |
| FR-056-CON-3 | Prohibited | Emitted manifest omits publish = false | TC-741 | Gate fails |
| FR-056-CON-5 | Boundary | outputRoot containing a parent segment | TC-675 | Refused before any write |
| FR-057-CON-2 | Allowed | Pattern inside the supported subset | TC-681 | Matcher generated |
| FR-057-CON-2 | Prohibited | Pattern relaxed to make it compile | TC-680, TC-687 | UNSUPPORTED_PATTERN, zero files |
| FR-057-CON-3 | Boundary | Proved validator perturbed by one rule | TC-688 | Differential harness fails naming the input |
| FR-057-CON-4 | Boundary | Pattern and subject at the step bound | TC-684 | Bound-exceeded error, never a hang |
| FR-058-CON-1 | Prohibited | Diagnostic constructed from an unregistered entry | TC-691 | Construction throws |
| FR-058-CON-3 | Boundary | Message echoing a 10000-character member | TC-696 | Truncated at 120 code points |
| FR-059-CON-1 | Prohibited | Rust reader reaches the oracle or the compiler reader | TC-704 | Static scan fails |
| FR-059-CON-2 | Allowed | Only the rust-backend registry entry changes under conformance/ | TC-709 | Change-set diff passes |
| FR-059-CON-2 | Prohibited | Any other conformance path changes | TC-709, TC-739 | Change-set diff fails |
| FR-059-CON-3 | Prohibited | A case answered with a fabricated verdict or omitted | TC-699, TC-703 | Reported as missing-answer or failure |
| FR-060-CON-1 | Prohibited | Golden check compares a file to itself | TC-714, TC-715 | Check regenerates into a scratch directory |
| FR-061-CON-1 | Prohibited | Any registry contact during package or build | TC-724 | Offline run fails the step |
| FR-062-CON-2 | Boundary | Mutation harness run to completion | TC-730 | Working tree unchanged |
| NFR-023-AC-11 | Prohibited | Permitted-path list widened to absorb accretion | TC-744 | Inspection fails |
| FR-072-CON-1 | Allowed | Installed generator 0.76.0, above the derived floor 0.64.0 | TC-845, TC-846 | Advisory gate passes |
| FR-072-CON-1 | Prohibited | Installed generator 0.63.0, the last version inside GHSA-5578-w22f-pfx9 | TC-847 | Advisory gate fails naming the advisory |
| FR-072-CON-1 | Boundary | Installed generator 0.64.0, the first patched version | TC-848 | Advisory gate passes |
| FR-072-CON-1 | Boundary | Installed generator 0.63.9, below the floor and outside both published ranges | TC-848 | Advisory gate fails on ordered comparison |
| FR-072-CON-4 | Prohibited | Generator distribution absent | TC-849 | Gate fails with a provisioning message rather than skipping |
| FR-073-CON-2 | Allowed | A profile declaring only reviewed options | TC-855, TC-857 | Profile gate passes |
| FR-073-CON-2 | Prohibited | A profile declaring `--custom-template-dir` | TC-857 | Profile gate fails naming the option |
| FR-073-CON-1 | Prohibited | A profile declaring `--extra-fields forbid` or `--use-missing-sentinel` | TC-856 | Profile gate fails; closure and absence are schema decisions, not flags |
| FR-075-CON-2 | Allowed | A schema with no executable extension key | TC-876 | Guard admits |
| FR-075-CON-2 | Prohibited | A schema carrying any of the five executable keys at any depth | TC-873 | Guard refuses naming the key and pointer |
| FR-075-CON-3 | Prohibited | An option token the guard does not recognise | TC-878 | Guard refuses rather than passing it through |
| FR-076-CON-5 | Boundary | An input set of exactly the declared maximum size | TC-887 | Generation proceeds |
| FR-076-CON-5 | Prohibited | An input set one byte over the declared maximum | TC-887 | Fails naming the limit before any spawn |
| FR-076-CON-5 | Boundary | A generation finishing just inside the declared timeout | TC-886 | Generation proceeds and the scratch root is removed |
| FR-076-CON-5 | Prohibited | A generation exceeding the declared timeout | TC-886 | Subprocess terminated, then killed after the grace period |
| FR-077-CON-1 | Prohibited | A `gaps.json` row disposing a gap to a hand-written generator with no reviewed decision | TC-905 | Gate fails |
| FR-078-CON-1 | Allowed | `Any` at a `true`-schema position | TC-909 | Classified sanctioned |
| FR-078-CON-1 | Prohibited | `Any` at a constrained position | TC-908 | Classified degraded and refused in enforcing mode |
| FR-078-CON-2 | Prohibited | A generated module importing outside the allow-list | TC-912 | Inspection refuses naming the import |
| FR-080-CON-1 | Prohibited | A `type: ignore` in generated or example source | TC-928 | Static gate fails |
| FR-079-CON-1 | Prohibited | A generated path added to a published manifest | TC-924, TC-925 | Packaging gate fails |
| NFR-031-AC-6 | Allowed | A bundle one document under `maxDocuments` | TC-1305 | Lift proceeds |
| NFR-031-AC-6 | Boundary | A bundle of exactly `maxDocuments` documents | TC-1305 | Lift proceeds |
| NFR-031-AC-6 | Prohibited | A bundle one document over `maxDocuments` | TC-1305 | One blocking `LIMIT_MAX_DOCUMENTS` naming the file's value; no document |
| NFR-031-AC-6 | Allowed | A document one byte under `maxDocumentBytes` | TC-1305 | Lift proceeds |
| NFR-031-AC-6 | Boundary | A document of exactly `maxDocumentBytes` | TC-1305 | Lift proceeds |
| NFR-031-AC-6 | Prohibited | A document one byte over `maxDocumentBytes` | TC-1305 | One blocking `LIMIT_MAX_DOCUMENT_BYTES` at that document |
| NFR-031-AC-6 | Allowed | A record one field under `maxFieldsPerRecord` | TC-1305 | Lift proceeds |
| NFR-031-AC-6 | Boundary | A record of exactly `maxFieldsPerRecord` fields | TC-1305 | Lift proceeds |
| NFR-031-AC-6 | Prohibited | A record one field over `maxFieldsPerRecord` | TC-1305 | One blocking `LIMIT_MAX_FIELDS_PER_RECORD` at that document |
| NFR-031-AC-6 | Allowed | A clause fence one byte under `maxClauseBytes` | TC-1305 | Lift proceeds |
| NFR-031-AC-6 | Boundary | A clause fence of exactly `maxClauseBytes` | TC-1305 | Lift proceeds |
| NFR-031-AC-6 | Prohibited | A clause fence one byte over `maxClauseBytes` | TC-1305 | One blocking `LIMIT_MAX_CLAUSE_BYTES` at the fence |
| NFR-031-AC-6 | Allowed | A bundle tree one level under `maxDepth` | TC-1305 | Lift proceeds |
| NFR-031-AC-6 | Boundary | A bundle tree of exactly `maxDepth` | TC-1305 | Lift proceeds |
| NFR-031-AC-6 | Prohibited | A bundle tree one level over `maxDepth` | TC-1305 | One blocking `LIMIT_MAX_DEPTH`; terminates within 512 MiB and 30 s |
| FR-093-AC-3 | Allowed | Multiplicity `1` | TC-1222 | `{lower: 1, upper: 1}`, `presence: required` |
| FR-093-AC-3 | Allowed | Multiplicity `0..1` | TC-1222 | `{lower: 0, upper: 1}`, `presence: optional` |
| FR-093-AC-8 | Allowed | Multiplicity `0..*` | TC-1227 | `lower: 0`, `upper` absent, `presence: optional`; one `DECLARED_LOSS` `required-collection-presence` per `0..*`/`*` field |
| FR-093-AC-8 | Allowed | Multiplicity `1..*` | TC-1227 | `lower: 1`, `upper` absent, `presence: required` |
| FR-094-AC-1 | Boundary | A frontmatter relationship, which authors no bound | TC-1231 | `multiplicity {1,1}` always; no suffix grammar exists on the frontmatter axis |
| FR-093-AC-13 | Prohibited | One field row carrying `min` twice | TC-1334 | `DUPLICATE_CONSTRAINT` at that row, blocking |
| FR-093-AC-13 | Allowed | Two fields `versionNumber` and `version_number` each carrying `min` | TC-1334 | Distinct codes `…VERSIONNUMBER_MIN` and `…VERSION_NUMBER_MIN`; no diagnostic, because the shared rule (issue #87) does not split a case boundary |
| FR-093-AC-13 | Prohibited | Two fields `created_at` and `created__at` on one record | TC-1334 | `UNSLUGGABLE_NAME` at the later row, blocking (contract case (b)); the two names slug to one `field/` identity |
| FR-096-AC-11 | Boundary | A 100-character type token in a diagnostic | TC-1269 | Token appears whole; no truncation mark |
| FR-096-AC-11 | Prohibited | A 101-character type token in a diagnostic | TC-1269 | Token truncated with `…`; message at most 120 characters |
| FR-096-AC-11 | Prohibited | A 4000-character type token in a diagnostic | TC-1269 | Message at most 120 characters |

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
| adapter `status: unavailable` | the owning backend ships | `status: available`; every `unavailable` answer now fails | TC-305 |
| divergence entry open | the owning issue fixes the defect | the entry no longer reproduces and the run fails until it is removed | TC-306 |
| corpus `1.x.y` | a case is added | minor bump, regenerated `coverage.json`, new `corpusDigest` | TC-283, TC-626 |
| corpus `1.x.y` | an existing `expected` block changes | major bump under a `corpus-defect` verdict; a minor bump fails the versioning gate | TC-287, TC-639 |
| package version `v1` | an export is added and another removed | additive plus breaking; the pair classifies `breaking` | TC-321 |
| prototype component in `spikes/` | promotion inventory records a disposition | owned `src/compiler/` module or an explicit non-promotion | TC-320, TC-324, TC-327 |
| spike emitter package present | promotion removes the `file:` dependency | spike replays through `src/compiler/` and stays byte-identical | TC-371, TC-375, TC-377 |
| promoted compiler in the tree | every path differing from the pre-promotion commit is restored from it | the spike emitter returns as the only generator | TC-395 |
| committed Rust lockfile | crates.io index publishes a newer transitive crate | seeded lockfile keeps the retained bytes and the check unaffected | TC-372, TC-373, TC-387 |
| retained evidence | promotion supersedes a `capabilities.json` claim | claim stays as the historical record; the doc carries the superseding note | TC-381, TC-389 |
| `typescript-backend` slot `status: unavailable` | the backend ships a command and the row flips to `available` | every case must answer `supported`; an `unavailable` answer now fails the run | TC-817 |
| generation target registered declared-unimplemented | its owning issue ships a backend | the target dispatches instead of returning `state: "unavailable"` | TC-747 |
| admissible document with no diagnostic | a non-error diagnostic is introduced | `resultState` moves `success` to `lossy` | TC-799 |
| lossy document | an error diagnostic is introduced | `resultState` moves `lossy` to `invalid` | TC-799 |
| divergence entry open against this backend | the backend defect is fixed | the entry stops reproducing and the run fails until it is removed | TC-824 |
| generated package export present | the IR drops the type that declared it | the pair classifies `breaking` and the type-level fixture stops compiling | TC-812, TC-830 |
| `REFERENCE_POLICY` at `strict` | The owner GAP-011 acquires through `agent-ix/filament-core-data#59` settles it in favour of the open reading | the constant moves to `open` and corpus cases REF-001..004 move with it under a `corpus-defect` verdict and a major `corpusVersion` bump | TC-803 |
| The `bytes` wire form and the union discriminator recorded as declared decisions | `agent-ix/filament-core-data#58` settles either | the named declared decision moves in one place, and a resulting disagreement is reported for the owner rather than registered as a divergence | TC-786, TC-822 |
| An admissibility rule suppressed for an absent input | the bundle later supplies that input | the suppression is replaced by a decided answer, and the recorded `resultState` for a satisfied input is unchanged | TC-795 |
| generation started | every construct maps and no diagnostic blocks | success, crate written, manifest emitted | TC-666, TC-670 |
| generation started | a construct has no mapping row | unsupported, zero files, at least one diagnostic | TC-656, TC-692 |
| generation started | the document is ill-formed | invalid, zero files, at least one diagnostic | TC-671, TC-692 |
| generation refused | the refusing construct is removed and generation is re-run | success, crate written | TC-687 |
| rust-backend slot unavailable | an adapter command is supplied and the slot is marked available | every case judged against the oracle | TC-698, TC-710 |
| rust-backend slot available | the adapter command is removed | 111 unmet rows and zero passes | TC-710 |
| value constructed through try_new | a constraint is violated | ValidationError naming the constraint | TC-677, TC-685 |
| declared profile | its options are edited | new profile digest; every verdict citing the old digest is stale | TC-860 |
| declared profile | a measured verdict is recorded on it | same profile digest, so the verdict it cites stays valid | TC-860, TC-862 |
| measured family | every probe expectation met with no condition | verdict `qualified` | TC-897, TC-899 |
| measured family | expectation met only under a declared profile option or preparation rule | verdict `qualified-with-conditions` with that condition named | TC-901 |
| measured family | a contract construct is lost with no closing rule | verdict `not-qualified`, no emitted package, and a `gaps.json` row per losing family | TC-898, TC-900, TC-923 |
| `not-qualified` family | package emission requested | no package emitted, reason recorded | TC-923 |
| generated tree | a degraded annotation is found in enforcing mode | nothing written under the generated tree | TC-923, TC-937 |
| unavailable `python-backend` adapter slot | corpus account requested | rows recorded unmet, decided cases reported separately, none recorded as passing | TC-903 |
| extraction `fields` `available` | artifact lowered | one `record` emitted with its fields; no `ARTIFACT_NOT_LOWERED` | TC-1200, TC-1221 |
| extraction `fields` `unavailable`, reason `legacy-form` | lowering attempted | not lowered; one non-blocking `ARTIFACT_NOT_LOWERED`; document still written, exit 0 | TC-1209, TC-1228 |
| extraction `fields` `unavailable`, reason `both-forms` | lowering attempted | not lowered; blocking `ARTIFACT_NOT_LOWERED`; diagnostics sidecar only, exit 1 | TC-1228, TC-1268 |
| extraction `fields` `missing` | lowering attempted | not lowered; blocking `ARTIFACT_NOT_LOWERED` naming the engine reason; diagnostics sidecar only, exit 1 | TC-1228, TC-1260 |
| extraction `fields` `not_applicable` (object type requires no `## Properties`) | lowering attempted | lowered as a record with `fields: []`; no diagnostic | TC-1335 |
| extraction `fields` `available`, `lossy` `true` | lowering attempted | lowered; one `DECLARED_LOSS` naming `lossy-extraction` | TC-1335 |
| pass one incomplete | a token is classified | never: `Stale` is decidable only after every artifact's outcome is known | TC-1332 |
| pass one complete, target artifact not lowered | token classified | `Unresolved::Stale` with `related` at the cause | TC-1215, TC-1332 |
| module supplied, `semantic` block present and accepted | `lift` | bundle loaded, extraction proceeds | TC-1200, TC-1295 |
| module supplied, no `semantic` block | `lift` | refused with `MODULE_WITHOUT_SEMANTIC_BLOCK`; nothing lowered; no file; exit 2 | TC-1201, TC-1296 |
| module supplied, `semantic` block refused by the engine | `lift` | refused with `MODULE_REFUSED` carrying the engine code; nothing lowered as empty; exit 2 | TC-1202, TC-1265 |
| `--out` under the bundle root or a module root | `lift` | refused with `OUTPUT_UNWRITABLE` before the bundle is loaded; no file; exit 2 | TC-1340, TC-1296 |
| bundle assembled, node lists sorted | `decide` | success verdict: write proceeds; any reader diagnostic: one blocking `INVALID_IR` each, no document | TC-1284, TC-1342, TC-1346 |
| bundle assembled, no blocking diagnostic | write | diagnostics, provenance, fingerprint, then document renamed into place in that order; exit 0 | TC-1279, TC-1295, TC-1341 |
| bundle assembled, at least one blocking diagnostic | write | diagnostics sidecar written; no temporary file left; pre-existing document, fingerprint, and provenance byte-unchanged; exit 1 | TC-1268, TC-1281 |
| bundle assembled, output directory absent or unwritable | write | `OUTPUT_UNWRITABLE` naming the path; nothing written; exit 2 | TC-1282 |
| written document | `inspect --ir` | one line per type in `types` order; exit 0 | TC-1297 |
| document missing `contractVersion` | `inspect --ir` | `INVALID_IR` printed (reader rejects at `/ir/source/dialect`); exit 1 | TC-1297 |
| `EXTRACTION_TOOLCHAIN` resolvable | any `extraction-frontend-*` Make target | gate runs on `cargo +1.98.1` | TC-1298, TC-1321 |
| `EXTRACTION_TOOLCHAIN=0.0.0` | any `extraction-frontend-*` Make target | gate fails naming `0.0.0`; never skips | TC-1298, TC-1321 |

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
| ERR-056 | A second retained-evidence byte changes | The comparison against the frozen issue #4 record fails; the change is a defect, not a rebaseline | TC-371, TC-384 |
| ERR-057 | A `file:` or `link:` specifier remains after the promotion | Dependency inspection fails | TC-376, TC-388 |
| ERR-058 | No committed `Cargo.lock` while the runner is in `--check` mode | The runner exits non-zero naming the missing lockfile | TC-374 |
| ERR-059 | The branch changes a path the isolation allowlist does not cover | TC-123/TC-124 fail naming the path | TC-379, TC-390 |
| ERR-060 | The declarations in `index.d.mts` drift from `index.mjs` | `tsc --noEmit` fails | TC-344 |
| ERR-061 | An import names a package the lock does not resolve | Oracle rejects at the import's locus | TC-298, TC-315 |
| ERR-101 | The lock package graph closes a cycle | Oracle rejects with a package-cycle code distinct from a recursive type graph | TC-315, TC-317 |
| ERR-063 | A mapping names an identity no declaration owns | Oracle rejects at the mapping's locus | TC-298, TC-315 |
| ERR-064 | The same semantic identity is declared twice anywhere in the document | Oracle rejects at the second declaration | TC-293, TC-315 |
| ERR-104 | The IR's `manifestDigest` no longer matches the manifest | Oracle rejects as a stale lock | TC-298, TC-315 |
| ERR-105 | An entity-role type is neither exported nor declared an allowed omission | Oracle rejects as undeclared loss | TC-298, TC-315 |
| ERR-106 | An alias chain closes on itself | Oracle emits `ALIAS_CYCLE`, not an unresolved reference or a depth error | TC-292, TC-293 |
| ERR-107 | A union variant's `payloadType` resolves to nothing | Oracle rejects at that variant's locus | TC-622 |
| ERR-108 | An adapter command exits non-zero or emits a result failing its schema | Harness fails that adapter per case and exits non-zero | TC-308 |
| ERR-109 | An adapter answers `unsupported` or `unavailable` where nothing declares it | Harness fails naming the case and the adapter | TC-305, TC-309 |
| ERR-110 | A divergence entry reproduces nothing, or its `reviewBy` has passed | Harness fails, or the audit target reports it | TC-306 |
| ERR-111 | `coverage.json` is hand-edited | Coverage gate fails naming the differing rows | TC-626 |
| ERR-112 | `loadCase` is called with an id the corpus does not declare | The import API throws naming the id and the corpus version | TC-631 |
| ERR-113 | An adapter answers with a `caseDigest` the manifest does not carry | Harness rejects the result rather than counting it | TC-311 |
| ERR-075 | An indexed `replace` or `remove` op carries no preceding `test` op | Corpus gate fails naming the case | TC-286 |
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
| ERR-144 | A generation request names a target outside the published vocabulary | `TypeError` naming the value and the five permitted targets; the seam does not dispatch | TC-746, TC-828 |
| ERR-145 | A generation request names a registered but unimplemented target | `state: "unavailable"`, zero files, one blocking `BACKEND_NOT_IMPLEMENTED` naming the owning issue | TC-747, TC-828 |
| ERR-146 | A generation request fails `compiler-request.schema.json` | `state: "invalid"` with one diagnostic per schema error at the failing pointer, and no file | TC-748 |
| ERR-147 | A request's `contractVersion` is outside the backend's `supportedIrVersions` | `state: "unsupported"` naming the version, and no file | TC-751 |
| ERR-148 | A registered backend omits a contract member or returns a path outside `outputRoot` | `assertBackendContract` rejects the backend before it runs | TC-751 |
| ERR-149 | Two distinct identities mint the same TypeScript identifier | Blocking `IDENTIFIER_COLLISION` naming both identities; no declaration is emitted | TC-764 |
| ERR-150 | An IR document carries a construct the TypeScript target has no representation for | Declared loss under the backend's own prefix, an empty file map, and no write | TC-802, TC-774 |
| ERR-151 | A `pattern` operand names a dialect other than `ecma-262` | The document is inadmissible; no approximate check is generated | TC-781 |
| ERR-152 | A constraint names a `format` the backend does not implement | Declared loss and no generated package, never a check that accepts every value | TC-781 |
| ERR-153 | A payload omits a required field, or passes `null` to a non-nullable one | Rejection with the pointer at that member and a code from the closed structural list | TC-778 |
| ERR-154 | A property is present with the value `undefined` | Rejection for a required and for an optional field alike | TC-779 |
| ERR-155 | An undeclared member reaches a type declaring `unknownPolicy: "reject"` | Rejection with a pointer at that member | TC-782 |
| ERR-156 | A value nests past the generated validator's declared depth limit | The exceeded-depth code; the validator terminates rather than exhausting the stack | TC-785 |
| ERR-157 | A document is both alias-cyclic and past the depth bound | `ALIAS_CYCLE`, never `DEPTH_LIMIT_EXCEEDED`; the cycle is the more specific fact | TC-798 |
| ERR-158 | A `reference` target resolves to no document type, no import, and no lock export | `UNRESOLVED_TYPE_REF` at `/ir/types/<index>/target` under `REFERENCE_POLICY` `strict` | TC-803 |
| ERR-159 | A canonicalization input carries a non-finite number or exceeds the depth bound | A named refusal rather than a serialized value | TC-810 |
| ERR-160 | A compatibility pair carries a change the classification rules do not model | Aggregate `unknown`, never `patch` | TC-812 |
| ERR-161 | An available adapter slot answers `unavailable`, or answers an undeclared `unsupported` | The harness records a problem and the run fails | TC-817 |
| ERR-132 | An adapter answer carries a `caseDigest` the corpus manifest does not record | `case-digest` problem and a failed run | TC-815 |
| ERR-133 | A registered divergence no longer reproduces | `unreproduced-divergence` problem; the run fails until the entry is removed | TC-824 |
| ERR-134 | `generate` produces a blocking diagnostic while `--out-root` already holds a file | Exit `1`, no file written, and the pre-existing file byte-unchanged | TC-827 |
| ERR-135 | `generate` is given an unknown flag, a missing required flag, or an unreadable `--limits` | Usage text and exit `2` | TC-828 |
| ERR-136 | A declared member is present with the value `undefined` rather than absent | Rejected for a required and an optional field alike, because absent and explicitly `undefined` are different values under `exactOptionalPropertyTypes` | TC-779 |
| ERR-137 | An ordering constraint resolves to a `duration` subject, for which ISO-8601 designators supply no total order | A declared representability loss and no generated package, rather than an invented comparison | TC-781, TC-802 |
| ERR-138 | A `bytes` value is not well-formed base64, or its decoded length exceeds a `maxLength` | Rejected with that constraint's own `diagnosticCode`, the length counted in decoded octets | TC-781 |
| ERR-139 | An `integer` subject receives a non-integral, non-finite, or above-`Number.MAX_SAFE_INTEGER` value | Rejected with its own structural code rather than silently truncated | TC-781 |
| ERR-140 | A validated input carries a getter that throws, an inherited accessor for a declared member, or a `Symbol.toPrimitive` coercion | A returned rejection, never a thrown exception and never a coerced accept | TC-785 |
| ERR-141 | An admissibility rule's declared input — a manifest, a lock, a mapping, or a consumer policy — is absent from the bundle | A recorded suppression, never a diagnostic and never a silent pass | TC-795 |
| ERR-142 | The injected formatter exits non-zero during a generation | No file written and a blocking diagnostic naming the formatter | TC-827 |
| ERR-143 | A generated identifier collides with the exported discriminant constant or with another identity's minted identifier | One blocking `IDENTIFIER_COLLISION` naming both, raised while the model is built and before a file map exists | TC-764 |
| ERR-114 | A construct selects no mapping row and no named refusal; an `enum` variant carries a `payloadType` | `UNSUPPORTED_CONSTRUCT` or `PAYLOAD_ON_ENUM_VARIANT`, zero files | TC-650, TC-656 |
| ERR-115 | An ECMA-262 pattern uses a lookahead, a backreference, a named group or a Unicode property escape and is not a proved-registry key | `UNSUPPORTED_PATTERN`, zero files | TC-680, TC-687 |
| ERR-116 | A `kind: "scalar"` names a value outside the nine kernel scalars, or names `bytes`, whose JSON wire form no published artifact declares | `UNSUPPORTED_SCALAR` or `UNDECLARED_WIRE_FORM`, zero files | TC-646, TC-690 |
| ERR-117 | A `format` operand names an unregistered format | `UNKNOWN_FORMAT`, zero files | TC-686 |
| ERR-118 | A name renders to the empty string, to a keyword with no raw form, or carries a character the renderer cannot carry | `UNRENDERABLE_NAME`, zero files | TC-659, TC-660 |
| ERR-119 | Two identities in one declared scope derive the same Rust identifier | `NAME_COLLISION` naming both, zero files | TC-662 |
| ERR-120 | A `1.0.0` document carries a relationships, operations, clauses or unit node; or a field's `multiplicity.upper` is `0` | `V1_1_NODE_IN_V1_0` or `UNSUPPORTED_MULTIPLICITY`, zero files | TC-654 |
| ERR-121 | A `typeRef`, `appliesTo`, `items`, `values`, `payloadType` or `target` resolves to nothing | `UNRESOLVED_TYPE_REF`, zero files | TC-690, TC-706 |
| ERR-122 | A construct would be dropped that the profile does not list as an allowed omission; or a `defaultValue` is not a value the mapped Rust type admits | `UNDECLARED_LOSS` or `INVALID_DEFAULT_VALUE`, zero files | TC-653, TC-695 |
| ERR-123 | A constraint keyword is not applicable to its resolved subject; a bound names a subject the contract does not order; an operand's JSON type the subject does not admit | `CONSTRAINT_NOT_APPLICABLE`, `UNORDERED_SUBJECT` or `INVALID_OPERAND`, zero files | TC-677, TC-678 |
| ERR-124 | A document exceeds `maxInputBytes`, `maxNodes`, `maxDepth` or `maxCollectionItems` | `LIMIT_EXCEEDED` naming the limit, zero files | TC-673, TC-692 |
| ERR-125 | A compiler request's `outputRoot` escapes the repository root or is not traversal-free | `UNSAFE_OUTPUT_ROOT`, refused before any write | TC-675, TC-683 |
| ERR-126 | A generated matcher exceeds its step bound on a pathological subject | Bound-exceeded error, never a hang | TC-684 |
| ERR-127 | The adapter omits an answer for a manifest case, answers one twice, or truncates its output | `missing-answer` or `duplicate-answer`; the run fails | TC-699, TC-708 |
| ERR-128 | The adapter answers a case whose digest does not match the manifest | `case-digest` problem, the run fails | TC-699 |
| ERR-129 | A crate manifest omits `publish = false`, emitted or hand-written | The publication gate fails | TC-741 |
| ERR-130 | A changed-path gate cannot resolve its range or its sentinels from history | The gate fails saying it could not run | TC-736, TC-744 |
| ERR-131 | A prohibited path is changed at a path no later commit owns, or a permitted entry names no requirement | The non-disruption gate fails naming the path | TC-737, TC-744 |
| ERR-132 | An installed generator version falls inside a published advisory range | Advisory gate fails naming the advisory | TC-847 |
| ERR-133 | A pinned tool is absent from the environment | Gate fails with a provisioning message; it never skips | TC-849, TC-893, TC-932 |
| ERR-134 | A schema carries an executable Python extension key | Guard refuses before any spawn; no file written | TC-873, TC-880 |
| ERR-135 | A schema carries a remote or path-escaping `$ref` | Guard refuses naming the pointer | TC-875 |
| ERR-136 | A caller supplies a generator option | Request refused; only profile options reach the generator | TC-858 |
| ERR-137 | A subschema states closure twice with different values | Preparation pass throws naming the pointer | TC-866 |
| ERR-138 | The generator exceeds its declared timeout or input-size limit | Subprocess terminated; failure names the limit | TC-886, TC-887 |
| ERR-139 | The generator writes zero files or warns outside the allow-list | Run fails rather than reporting success | TC-888, TC-889 |
| ERR-140 | A generated annotation degrades to `Any` at a constrained position | Generation fails naming module, symbol, and pointer | TC-907 |
| ERR-141 | A generated annotation cannot be attributed to any schema pointer | Classified unattributed and fails | TC-915 |
| ERR-142 | A construct measured as lost is missing from `gaps.json` | Qualification gate fails | TC-898 |
| ERR-143 | A guard's change range cannot be located from history | Guard fails saying it did not run | TC-943 |
| ERR-250 | A supplied module manifest carries no `semantic` block | `MODULE_WITHOUT_SEMANTIC_BLOCK` naming the module; refusal; no file; exit 2 | TC-1201, TC-1296 |
| ERR-251 | quire-rs refuses a module's `semantic` block (unsupported `semantic_core`, duplicate object type) | `MODULE_REFUSED` whose message opens with the engine's `semantic.*` code, `causes` empty, at the manifest, line 1, column 1; no artifact lowered as empty; exit 2 | TC-1202, TC-1265 |
| ERR-252 | `spec/spec.md` is absent, lacks `org` or `name`, or carries one outside the `packageIdentity` grammar; an object-typed document has no `id` | `BUNDLE_UNIDENTIFIED` at `spec/spec.md` or the document's frontmatter naming the offending value; refusal; exit 2 | TC-1204 |
| ERR-253 | Two loaded documents carry the same frontmatter `id` | `DUPLICATE_ARTIFACT_ID` at the second document in path order naming both paths; refusal; exit 2 | TC-1331 |
| ERR-254 | A document's `object` names a type no loaded module declares | `UNKNOWN_OBJECT_TYPE` at the frontmatter; document not lowered | TC-1205 |
| ERR-255 | A `Type` cell or `Returns:` token is an unknown token, has no bundle index, or names an import the engine could not resolve | `UNRESOLVED_TYPE_TOKEN` at the row's line and column naming the token; blocking | TC-1212, TC-1242, TC-1264 |
| ERR-256 | A token names an artifact whose pass-one outcome is not a definition | `STALE_TYPE_TOKEN` naming the artifact with `related` at the cause; blocking | TC-1215, TC-1332 |
| ERR-257 | A token names `ix://<package>/type/<Name>` for a package other than the bundle | `IMPORT_UNSUPPORTED` naming the package; blocking | TC-1214 |
| ERR-258 | A bundle artifact's `title` or `name` equals a kernel scalar name | `KERNEL_NAME_SHADOWED` `warning`, non-blocking, at that artifact's frontmatter | TC-1217 |
| ERR-259 | Neither the artifact's frontmatter `name` nor its `title` is a semantic-core `Identifier` | `UNNAMEABLE_ARTIFACT` at the frontmatter; blocking; exercised by its `negatives/` bundle | TC-1272, TC-1288 |
| ERR-260 | `availability.fields` is `unavailable` or `missing`, an enumeration's `values_table` locator is unsatisfied, or the engine dropped a row on `semantic.ambiguous-type` | `ARTIFACT_NOT_LOWERED` naming the engine reason; `warning` for `legacy-form`, `error` and blocking otherwise | TC-1209, TC-1213, TC-1228, TC-1333 |
| ERR-261 | Two documents lower to the same verbatim `displayName` (`Status` and `status` are two names), or a document's `displayName` equals a kernel scalar the bundle uses (contract case (a)) | `DUPLICATE_TYPE_NAME` at the second document naming both, before any identity is minted; blocking | TC-1334, TC-1347 |
| ERR-262 | Two constraints of one record yield the same `diagnosticCode`, or one row carries a keyword twice | `DUPLICATE_CONSTRAINT` at the second row; blocking | TC-1334 |
| ERR-263 | A constraint keyword is not applicable to the resolved kind under the RULES.md table | `CONSTRAINT_NOT_APPLICABLE` at the row; blocking; the reader agrees at the same field | TC-1225 |
| ERR-264 | A `JsonObject` cell, a required `0..*` collection, or a `lossy` extraction is lowered | `DECLARED_LOSS` `info`, non-blocking, naming the `losses.json` row; one per occurrence | TC-1226, TC-1227, TC-1335 |
| ERR-265 | A frontmatter edge's target resolves to no indexed artifact or to one whose pass-one outcome is not a definition | `UNRESOLVED_RELATIONSHIP_TARGET` at line 1, column 1 naming the target; blocking | TC-1235 |
| ERR-266 | A verb the object type lists under `allowed_links` is declared by no loaded module's `edge_types` | `UNKNOWN_EDGE_VERB` at line 1, column 1; blocking; no category guessed | TC-1234 |
| ERR-267 | A part slugs to the empty string (`_`, `--`, `***`), or two distinct names on one owner slug alike (`created_at` beside `created__at`; enumeration rows `a b` and `a_b`; contract case (b)) | `UNSLUGGABLE_NAME` at the declaration, or at the later of the two; blocking; no part is dropped | TC-1252, TC-1334, TC-1352, TC-1353 |
| ERR-268 | The output directory does not exist or is not writable, or `--out` or a sidecar lies under the bundle or a module root | `OUTPUT_UNWRITABLE` naming the path; refusal before any load or write; exit 2 | TC-1282, TC-1340 |
| ERR-269 | A bundle carries more documents than `maxDocuments` | `LIMIT_MAX_DOCUMENTS` naming the `limits.json` value; blocking | TC-1305 |
| ERR-270 | A document exceeds `maxDocumentBytes` | `LIMIT_MAX_DOCUMENT_BYTES` at that document; blocking | TC-1305 |
| ERR-271 | A record declares more fields than `maxFieldsPerRecord` | `LIMIT_MAX_FIELDS_PER_RECORD` at that document; blocking | TC-1305 |
| ERR-272 | A clause fence exceeds `maxClauseBytes` | `LIMIT_MAX_CLAUSE_BYTES` at the fence; blocking | TC-1305 |
| ERR-273 | The bundle tree exceeds `maxDepth` | `LIMIT_MAX_DEPTH`; blocking; terminates within the declared budget | TC-1305 |
| ERR-274 | The engine returns a `SemanticDiagnostic`, with or without a usable line | `ENGINE_DIAGNOSTIC` whose message is `<engine code> (reason: <reason>): <engine message>` with `causes` empty; severity mapped, blocking iff `error`; no `locus` when `line` is 0 | TC-1208, TC-1262, TC-1263, TC-1345 |
| ERR-275 | `decide` returns any diagnostic at lift time, or `inspect` reads a document the reader rejects | `INVALID_IR` with no `locus`, the reader's code and pointer in the message, and the reader's diagnostic in `causes[0]`; blocking; no document; `inspect` exits 1 | TC-1274, TC-1297, TC-1342, TC-1346 |
| ERR-281 | Two nodes of one lift with distinct names and distinct slugs mint one identity (an artifact `NoteRevision` beside `Note` with a constrained `revision`, whose alias is `type/NoteRevision`; a field beside an operation parameter of one owner; contract case (c)) | `DUPLICATE_IDENTITY` at the later node (kernel definitions first, then path, line, column), naming both identities with the earlier locus in `related`; blocking; neither node emitted under that identity | TC-1351 |
| ERR-282 | One node's `extensions[]`, or the document-level `extensions[]`, carries two entries with one `identity` | `DUPLICATE_IDENTITY` at the second entry's `identity` pointer; an extension identity shared across nodes raises nothing | TC-1355 |
| ERR-283 | A definition derives a reserved support-type name (`Date`, `DateTime`, `Duration`, `Uuid`) with a `scalar` other than the one that support type carries, or with a kind other than `scalar` | `NAME_COLLISION` naming the reserved identity and the definition's identity; zero files | TC-1358 |

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
Issue #20's 62 cases (TC-280..341) are fully mapped and pass. No open mapping gap remains for issues #8, #10, #4, #9, #34, or #35. Issue #35's
| EC-038 | The promoted emitter changes the generator identity stamped into the frozen spike IR | FR-044 | TC-338, TC-339, TC-371 | The frozen issue #4 record is silently rebaselined and stops being historical evidence |
| EC-039 | An unpinned transitive Rust crate publishes a new version | NFR-017, FR-044 | TC-372, TC-373, TC-387 | The retained-evidence gate goes red for reasons unrelated to any change, inviting a rebaseline |
| EC-040 | A prototype component is promoted because its one representative golden passed | FR-040, FR-042 | TC-326, TC-358 | Unmeasured recursion, generics, or version transitions misgenerate consumer contracts |
| EC-041 | The promotion is landed alongside a package publication or consumer move | NFR-018 | TC-390, TC-396 | A later compiler defect cannot be backed out without a consumer migration |
| EC-042 | A backend writes files, so a package ticket must edit the backend to change layout | FR-042 | TC-352 | Layout policy leaks into the generator and each target ticket forks it |
| EC-068 | The Python adapter's forbidden-key list is narrowed to make a schema pass | FR-043 | TC-362, TC-363 | Caller-controlled Python reaches the generated models |
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
| EC-069 | A recursive cycle closes through a `map`'s `values` rather than through a record field | FR-064, FR-066 | TC-761, TC-785 | A field-only cycle check misses the shape and the renderer or the validator recurses without bound |
| EC-070 | Two distinct identities whose display names derive the same TypeScript identifier | FR-064 | TC-764 | One declaration silently overwrites the other and a consumer binds to the wrong type |
| EC-071 | A `displayName` that is a TypeScript reserved word | FR-064 | TC-764 | The generated module does not parse, or the mangling differs between two runs |
| EC-072 | A field named `__proto__` or `constructor` | FR-066 | TC-779, TC-782 | Prototype pollution, or an own-property test that reads an inherited member as if it were declared |
| EC-073 | A `pattern` regex that is valid ECMA-262 and backtracks catastrophically | FR-066, NFR-020 | TC-781, TC-785 | A generated validator hangs on an input the contract admits |
| EC-074 | A `reference` whose target no type, import, or lock export supplies (GAP-011) | FR-068 | TC-803 | The backend rules on an open contract question instead of citing it and moving with the answer |
| EC-075 | A document that is admissible and unrepresentable | FR-065, FR-068 | TC-802, TC-774 | An unrepresentable construct is emitted as `unknown` and the refusal never reaches the caller |
| EC-076 | A `1.0.0` document carrying a 1.1.0-only node | FR-068, FR-069 | TC-796, TC-808 | The node is read under rules its declared contract version does not carry |
| EC-077 | A package declaring one type, and a package declaring a thousand | FR-064, FR-065 | TC-755, TC-766 | The single-type path is never exercised and the large path exhausts a bound unnoticed |
| EC-078 | A generated identifier collides with the generated discriminant constant | FR-064 | TC-758, TC-764 | The discriminated union stops narrowing and `tsc` accepts an unhandled variant |
| EC-079 | A consumer bundles the generated package importing only `provenance.ts` | FR-067 | TC-794 | Provenance-only consumers retain the whole validator surface in their bundle |
| EC-080 | The adapter and the oracle agree because the adapter asked the oracle | FR-070 | TC-819, TC-820 | A perfect pass rate that measures nothing and hides every shared defect |
| EC-081 | A document declares two type definitions carrying the same `identity`, so identity-sorted set ordering is not a total order, while the adapter must still emit a `normalized` string for that case | FR-069 | TC-806 | Two runs canonicalize one document two ways and the byte comparison the whole slot rests on becomes non-deterministic |
| EC-082 | `unknownPolicy` is declared on a kind that has no unknown members — a `union` at `surface` and a `map` at `preserve`, both carried by the committed conformance bases | FR-064, FR-066, FR-067, FR-068 | TC-762, TC-782, TC-802, TC-794 | A policy with no meaning is rendered as a validation rule, or is dropped without a declared loss under a `fail` policy |
| EC-083 | A record declaring `preserve` widens its interface enough that the four presence and nullability forms stop being distinguishable under `exactOptionalPropertyTypes` | FR-064, FR-066 | TC-782 | The optional-versus-null distinction the package exists to carry dissolves at exactly the types that carry unknown data |
| EC-084 | A `reference` target names an identity an imported package legitimately exports, and the case supplies no `importedExports` to resolve it against | FR-068 | TC-795, TC-803 | The policy constant answers a question it was never given the input to decide, and GAP-011 acquires a third reading nobody recorded |
| EC-069 | A field is both optional and nullable, and the wire carries an absent member in one document and an explicit null in another | FR-054 | TC-648 | Absent and null collapse to one value and a deliberate null is read as unset |
| EC-070 | A type graph is recursive through a sequence, a map and a direct self-reference at once | FR-054 | TC-651 | The emitter recurses without bound, or boxes a different field set on each run |
| EC-071 | A collection is optional with an unbounded upper and a lower of zero | FR-054 | TC-647 | An empty collection and an absent collection become indistinguishable |
| EC-072 | Two record fields differ only in a separator, so both render one snake_case identifier | FR-055 | TC-662 | A counter suffix is appended and the generated name then depends on document order |
| EC-073 | A field is named for a Rust keyword that has no raw-identifier form | FR-055 | TC-659 | The emitter renames the field and the wire name silently changes |
| EC-074 | A published pattern uses ECMAScript lookaheads whose `.` cannot cross a line terminator | FR-057 | TC-682, TC-683 | The validator enforces the intended language rather than the published one, and the two diverge unnoticed |
| EC-075 | A locus path embeds a line terminator before a parent-directory segment | FR-057 | TC-683 | A traversal guard that the published pattern does not actually apply is assumed to be applied |
| EC-076 | A pattern in the supported subset nests quantifiers so a backtracking matcher blows up | FR-057 | TC-684 | Generation or validation hangs on an untrusted document |
| EC-077 | A type declares unknownPolicy preserve and the retained member's name collides with a known field's wire name | FR-054 | TC-650 | An unknown member overwrites a known field or silently disappears |
| EC-078 | A required extension names a capability the crate does not admit | FR-061 | TC-722 | An unsupported capability is accepted and the consumer proceeds on a contract it cannot honour |
| EC-079 | The conformance oracle and the Rust reader disagree on a reference target nothing declares | FR-059 | TC-710 | GAP-011 is decided by an implementation rather than by its owning issue |
| EC-080 | A sibling ticket lands on top of this change before its gates are read | NFR-023 | TC-744 | This change's path set accretes the sibling's paths and the wrong ticket is blamed |
| EC-081 | A generated crate is byte-identical on the authoring workstation and different on a clean runner | NFR-022 | TC-712, TC-731 | Determinism is claimed from one host, as issue #42 already records |
| EC-070 | The official emitter states closure with `unevaluatedProperties`, which the generator does not read | FR-074 | TC-864, TC-865 | Every sealed contract type generates as an open Python model |
| EC-071 | A blanket `--extra-fields forbid` closes a model the schema deliberately leaves open | FR-073 | TC-856, TC-865 | Over-restriction in the opposite direction, invisible to a closure gate |
| EC-072 | A schema node is genuinely unconstrained, so `Any` is faithful | FR-078 | TC-909, TC-910 | A correct `Any` is treated as a defect and the check is then disabled |
| EC-073 | `uniqueItems` and string `format` are dropped by families that keep other constraints | FR-077 | TC-898, TC-931 | A partial-fidelity family is recorded as fully qualified |
| EC-074 | The `msgspec` tagged-union rendering replaces the discriminator field rather than keeping it | FR-077 | TC-897, TC-906 | A structural difference is mistaken for a semantic loss, or the reverse |
| EC-075 | An absent field and a null field are the same value in the Pydantic families, and the option that separates them fails strict type checking | FR-077, FR-080 | TC-898, TC-927 | A fidelity gap is closed by an option that silently breaks the type-checking gate |
| EC-076 | The pinned generator warns that its default external formatters become opt-in | FR-073 | TC-855 | Output changes on a future upstream release with no version change here |
| EC-077 | A shadowing `datamodel-codegen` sits earlier on `PATH` | FR-076 | TC-891 | An unpinned generator produces the qualified evidence |
| EC-078 | The published `sourceLocus` pattern uses four ECMAScript lookaheads | FR-074 | TC-869 | A normalizing pass silently drops a pattern Python can honour |
| EC-079 | The generator renames or de-duplicates a symbol, so a generated name is not a schema name | FR-078 | TC-917 | Attribution silently fails and every finding becomes unattributed, or the check is relaxed |
| EC-080 | A patch-level interpreter or formatter bump moves a byte-compared artefact with no input change | NFR-027 | TC-940 | The issue #42 host coupling is reproduced and the gate goes red for nothing |
| EC-081 | Six merged suites resolve their changed-path gates against a moving ref | NFR-027 | TC-943 | A seventh permitted-path entry is added and the guards are disabled incrementally |
| EC-140 | A bundle holding only `spec/spec.md` and no artifact document | FR-091, FR-095, FR-097 | TC-1204, TC-1258 | An empty `types[]` envelope is emitted invalid, or the frontend derives a value from the host to fill it |
| EC-141 | A bundle whose every document is a requirement, use-case, or review artifact with no `object` | FR-091 | TC-1205 | Non-domain artifacts are lowered as records, or each raises a diagnostic on a valid bundle |
| EC-142 | An artifact whose typed `## Properties` table has a header row and zero body rows, and a `domain` with no `## Properties` at all | FR-093 | TC-1221, TC-1335, TC-1309 | A record with no fields is confused with `fields` `unavailable`, or the lowering panics on an empty list |
| EC-143 | A field whose target is the declaring record itself (`parent ConfigVersion 0..1`) | FR-092, FR-093 | TC-1222, TC-1245 | Pass two reports the self-reference `Stale` because its own record's outcome is read before pass one completes |
| EC-144 | Two records each declaring a `contains` frontmatter edge to the other | FR-094, FR-097 | TC-1342 | A schema-valid document with a composite cycle is written and fingerprinted before the reader sees it |
| EC-145 | An artifact whose title is entirely punctuation and slugs to the empty string | FR-095 | TC-1252 | An identity ending in `/field/-name` is minted and passes the pattern by accident |
| EC-146 | A `Type` cell holding a 4000-character token | FR-096 | TC-1269 | A diagnostic message carries the whole token and the diagnostics file balloons or breaks a line-oriented consumer |
| EC-147 | Documents saved with CRLF line endings | FR-091, FR-096 | TC-1208, TC-1309 | Loci drift by a column, `clause_text` carries `\r`, and the table-form and fence-form lifts differ by a byte |
| EC-148 | A `spec.md` or artifact beginning with a UTF-8 BOM | FR-091 | TC-1204, TC-1309 | Frontmatter is not recognised and a valid bundle refuses with `BUNDLE_UNIDENTIFIED` or lowers nothing |
| EC-149 | A module manifest declaring the same object type twice | FR-091 | TC-1202 | The second declaration silently wins, or the module is treated as an empty model rather than refused |
| EC-150 | Two loaded modules exporting the same type name, or an artifact named like a kernel scalar | FR-092, FR-095 | TC-1213, TC-1217, TC-1256 | The first module on the command line wins and the lift depends on argument order, or the shadowed artifact is silently unreferenceable |
| EC-151 | A bundle root reached through a symlink | FR-095, NFR-031 | TC-1253, TC-1301 | Bundle-root-relative paths differ between the symlinked and real root, changing `source.digest` and every locus |
| EC-152 | A bundle directory that is read-only to the lifting process, or an `--out` pointing inside it | FR-097, FR-098, NFR-032 | TC-1289, TC-1314, TC-1340 | A scratch or temporary file is placed inside the bundle and the lift fails, or writes into the corpus when it can |
| EC-153 | An engine diagnostic reported at `line` 0 or with no line | FR-091, FR-096 | TC-1331, TC-1345 | A fabricated locus at line 0 fails the schema, or the diagnostic is dropped for lack of one |
| EC-154 | Two documents whose titles differ only by case (`Status`, `status`) | FR-093, FR-095 | TC-1334, TC-1347 | A lowercasing slug folds two names into one identity set, or a case-only difference is refused as a duplicate name although the shared rule mints two distinct identity sets |
| EC-161 | An author-named artifact whose `displayName` equals the alias a constrained field mints (`NoteRevision` beside `Note.revision`, `DUPLICATE_IDENTITY`), a name whose slug equals another's (`created_at`, `created__at`, `UNSLUGGABLE_NAME`), and a name carrying `_` (`Config_Version`, slugged to `Config-Version` on both sides) | FR-093, FR-095 | TC-1334, TC-1351, TC-1352, TC-1353, TC-1354 | The frontend assumes the slug is injective and emits two nodes under one identity, which the reader refuses as `DUPLICATE_IDENTITY` only after the document is written; or one frontend keeps the `type` name verbatim and the other slugs it |

## Coverage Gaps

Issue #20's 62 cases (TC-280..319 and TC-398..419) are fully mapped and pass.
The block is split because issue #27 reserved TC-280..319 for issue #20 and then
took TC-320..397 itself; issue #20 fills the reserved block and continues after
issue #27's highest row rather than leaving a gap.
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

Issue #22's 100 cases (TC-745..844) were mapped, and their status was measured
rather than asserted. `quire coverage` binds a matrix row to a source symbol
through a trace tag; before this pass **none of the hundred was bound**, and
every row carried `✅ passed — TypeScript backend (ordered integration 441/441)`,
which is a suite total and not evidence for any one row. That is the same hole
the removal of the `⚠️` marker was meant to close, reached by a different route:
an untagged `✅` asserts a row passed while nothing ties it to a test. The rows
now say what is true of each of them:

- **Ten are id-bound** — TC-770, TC-777, TC-787, TC-811, TC-834, TC-835,
  TC-836, TC-837, TC-839 and TC-841 — each by a leading trace id in the name of
  the `it` that exercises it in `test/typescript-backend.test.ts`, which is the
  form `test/conformance-corpus.test.ts` already uses for TC-280..341 and the
  form the binder reads. `quire coverage` reports zero status lies across
  TC-745..844.
- **Nine are `🚧` because their evidence is `make conformance`**, which
  `make test` does not run: TC-813 and TC-815..TC-824's automated members. The
  adapter genuinely answers all 111 cases, but no symbol in the test suite binds
  those rows, so the rows say so.
- **Twenty-nine are `🚧 partially exercised`**: an existing test covers part of
  the row's claim and no test covers the rest. Binding them would have made the
  uncovered part green, which is worse than an honest gap.
- **Forty-six are `🚧 no discrete test`.** The implementation ships and the
  suite is green; what is absent is a test that exercises that row.
- **Six are `Analysis`** — TC-753, TC-775, TC-818, TC-822, TC-831 and TC-843 —
  whose evidence is a recorded analysis. An `Analysis` row mints no source
  symbol by construction, which the coverage engine treats as legitimate rather
  than as a lie.

One binder defect was fixed in passing rather than worked around silently: a
regex literal carrying a double quote defeated the trace binder's TypeScript
brace scanner, so `test/typescript-backend.test.ts` was unreadable to it and no
tag in it could bind. The same match is now built with `new RegExp`, and the
note above it says why. `test/compiler.test.ts` fails the same way on
`origin/main` and is left to its owning ticket.

Two gaps are recorded rather than closed. The first is GAP-011: the resolution rule for a
`reference` kind's `target` is unstated in `contracts-v1.md`, which states one
only for relationship targets, and the question is owned by
`agent-ix/filament-core-data#9`, which is **closed** and can therefore decide
nothing; `agent-ix/filament-core-data#59` records that and asks for a live
owner. This backend does not decide it. It carries a single named
`REFERENCE_POLICY` constant defaulting to the corpus's published reading, so
that its conformance answers agree with the yardstick it is judged against; when
the question acquires an owner and is settled, that constant and corpus cases
REF-001..004 move together under a `corpus-defect` verdict and a major
`corpusVersion` bump, and TC-803 exists to prove the flip is one edit in one
place. Adopting the corpus's reading is conformance with the published yardstick
and is not a ruling on the contract.

The second is that the `compiler-frontend` adapter slot stays `unavailable`
after this work: wiring it to the issue #19 compiler is
`agent-ix/filament-core-data#52`, which is deliberately not in this ticket's
scope. This ticket's own effect on the coverage account is therefore a delta and
not a total — the `typescript-backend` row moves from 111 unmet to 0 and the
corpus-wide total falls by 111 — and no row or criterion here states an
absolute, because issues #21 and #23 are in flight against the same generated
account and whichever of the three merges second would otherwise fail for a
sibling's work. That shared-artifact reconciliation is
`agent-ix/filament-core-data#63`.

Cross-language generated-package serialization parity also remains unmet,
because it needs the issue #21 and issue #23 packages that do not exist yet;
issue #22 supplies one of the three sides it requires.

A third disagreement is recorded the same way. `docs/semantic-data-system/compatibility.md`
makes an enum addition "additive only for open-enum consumers", requires "an
unknown variant or coordinated breaking release" for a closed generated enum,
and names "closed-enum expansion" in its **Breaking** change class; it declares
three classes and `conditional` is not one of them. The conformance corpus reads
an added variant with no consumer policy as `conditional`, citing the weaker
"Open/closed enum behavior is consumer policy, not a language default" of
`contracts-v1.md`, which states who decides and not what the answer is when
nobody has. FR-069 states the `compatibility.md` rule and this backend carries a
single named `VARIANT_ADDITION_POLICY` constant with two settings. Both were
measured with `node conformance/runner/differential.mjs`: the twenty-five
`kind: "compatibility"` cases are **25 of 25** under the default `corpus`
setting and **23 of 25** under `contract`, differing on exactly `ENUM-004` and
`UNION-004` — both on the base `core-1-1`, which carries no consumer policy,
where the classifier answers `breaking` against an expected `conditional`. The
default is conformance with the published yardstick and not a ruling. Moving the
two cases is not open to this ticket: FR-070 states that a disagreement "SHALL
NOT be resolved by editing a corpus case, a base, the oracle, the harness, or a
threshold", and NFR-025 makes `conformance/cases/**`, `conformance/corpus.json`,
`conformance/contract-gaps.json` and `conformance/divergences.json` prohibited
paths. The disagreement therefore goes to the corpus's owner; when the two cases
move under a `corpus-defect` verdict and a major `corpusVersion` bump, TC-811
proves the flip is one edit in one place.

Four further gaps are open contract questions this bundle depends on and does
not close, each filed rather than absorbed: the `severity` and `locus` of a
semantic-IR diagnostic are derivable from no published artifact
(`agent-ix/filament-core-data#61`), the compiler's default graph-depth limit of
128 and the corpus's declared 256 disagree (`#62`), the normative version-uplift
round-trip rule and the oracle's flat `conditional` disagree (`#64`), and the
JSON wire form of a discriminated union and of the `bytes` kernel scalar is
unspecified (`#58`, filed by issue #21). Each is a declared reading in this
bundle, recorded in one named place, and none is presented as settled contract.

Issue #23 (the qualified Python generation route) is mapped at TC-845..TC-944.
Ids TC-645..TC-844, FR-054..FR-071, NFR-022..NFR-025 and US-011..US-012 are left
to the parallel issue #21 and #22 backend branches, which allocated them first;
issue #23 neither reads nor edits their paths. Two of its rows are honest about
what they cannot demonstrate. TC-903 measures the conformance-corpus account for
the Python surface. That corpus slot's owning issue is #23 itself, not #52, and
the reason it stays `unavailable` is not a blocker but a shape mismatch: an
adapter result carries a `resultState`, contract diagnostics with registry
codes, and a normalized form, and a package of generated types can decide none
of those. TC-903 therefore asserts that the account separates what the generated
surface decided from what it could not, and that the backend's corpus rows are
reported as unmet — which is what this backend can honestly say — while the
reader that could wire the slot is filed as issue #65. The account is real
evidence rather than a placeholder: over all 111 cases the generated
`pydantic_v2_basemodel` surface decides 70 and agrees with the oracle on all 70,
finds 41 undecidable because the oracle reached a cross-field rule, and is
over-strict on none. Every one of the 111 corpus rows for this backend is still
reported unmet. TC-900 and
TC-931 record `dataclasses.dataclass` and `typing.TypedDict` as measured, declared,
and not qualified for a validating surface rather than omitting them, because a
family that is not offered is a decision and a family that is not measured is a
blind spot. The 100 rows cover 123 acceptance criteria and 32 named constraints: some rows
carry two or three closely coupled criteria, TC-944 carries the four
irreducibly human obligations as one recorded review, and every criterion and
every named constraint is named in a `Traces To` cell.
Issue #21's 100 cases (TC-645..744) are mapped and land `🚧 planned`; they are
flipped to `✅` only against a measured run. Two open dependencies are recorded
here rather than resolved. First, GAP-011 — the contract states a resolution
rule for relationship targets and none for a `reference` kind's target — is
owned by issue #9; the Rust adapter adopts the corpus oracle's reading so the
disagreement stays visible, and TC-710 asserts the dependency is recorded rather
than decided. Second, the platform rows of the Rust support matrix that no run
has covered are recorded unmet with their reason under TC-717, not listed as
supported. GAP-002 is not a gap here: TC-682 and TC-683 close it with a proved
validator and its differential harness.

Issue #36 (the spec-bundle extraction frontend) is mapped at TC-1200..TC-1349
less the unused TC-1339, and every one of its 149 rows is `🚧`, because the
crate `crates/extraction-frontend` does not exist yet and a `✅` on a row no
test binds is the defect this matrix exists to prevent; the `Blocked` column
carries all 149 until each is measured. The 145 ids the reviewed requirement
files name (TC-1200..1299 for FR-091..FR-099, TC-1300..1329 for NFR-031..033,
TC-1331..1335 and TC-1340..1349 for the criteria the composite review added)
are used exactly as named; a replaced criterion keeps the id its predecessor
held and the row was rewritten against the replacement. The 28 named
constraints join the row whose test decides them, in the issue #22 form, except
those no acceptance test decides, which take four allocated Static rows:
TC-1330 (FR-091-CON-2, FR-092-CON-2, FR-099-CON-3: the file-system and
environment reach of the crate), TC-1336 (FR-097-CON-2, FR-097-CON-3: one
serializer and a `decide` before every write), and TC-1338 (FR-098-CON-3: the
payload helper is unreachable), because FR-098 fixes that TC-1293 traces to
FR-098-AC-9 alone. Issue #36's fifth acceptance criterion — the `json-schema`
target accepts the lifted document — is TC-1337, traced to US-015 and passed
by the issue #85 backend over the lifted `config-version-table` golden;
TC-1293's payload derivation remains evidence only for the test author's schema,
not that target. FR-096 now declares `INVALID_IR` as the frontend's own code,
carrying the reader's diagnostic in `causes[0]` (FR-096-AC-16, TC-1346), so
the prefix disagreement an earlier revision of this paragraph recorded is
closed. Relationships are lowered from frontmatter `relationships:` edges only
until `agent-ix/quire-rs#418` ships `RelationDecl` extraction (FR-094-CON-1,
TC-1236); cross-frontend parity is structural under the FR-098 projection over
the `records-and-scalars` shared case (TC-1291, TC-1344), never byte parity of
whole documents; and wiring the Rust binary into the node `spec-bundle` seam is
`filament-core-data#86`, outside this block. CR-036-1 (2026-09-08) added TC-1350
for NFR-033-AC-11 — the crate compiles on the workspace channel — as the next
id after the block, checked free against every remote branch; TC-1320's title
now asserts `rust-version.workspace = true` and the single Makefile line naming
the qualification compiler, and TC-1326 carries clippy's `--no-deps`.

## Test Execution Summary

| Category | Total | Passed | Failed | Blocked | Coverage |
|---|---|---|---|---|---|
| Static | 270 | 233 | 0 | 37 | 100% mapped (270/270) |
| Manual | 53 | 45 | 0 | 8 | 100% mapped (53/53) |
| Analysis | 51 | 30 | 0 | 21 | 100% mapped (51/51) |
| Property | 129 | 71 | 0 | 58 | 100% mapped (129/129) |
| Unit | 529 | 422 | 0 | 107 | 100% mapped (529/529) |
| Integration | 142 | 84 | 0 | 58 | 100% mapped (142/142) |
| Fuzz | 13 | 8 | 0 | 5 | 100% mapped (13/13) |
| Snapshot | 68 | 35 | 0 | 33 | 100% mapped (68/68) |
| Compile | 15 | 4 | 0 | 11 | 100% mapped (15/15) |
| E2E | 12 | 12 | 0 | 0 | 100% mapped (12/12) |
| **Total** | **1282** | **944** | **0** | **338** | **100% mapped (1282/1282)** |

Issue #23 also converts the six suites that still resolve their changed-path
gates against a moving `main` or `origin/main` — the open defect of issue #51.
It does so rather than add a seventh permitted-path entry to each, because
issue #55 records that widening those lists is how the guards were disabled
incrementally in the first place. TC-943 carries that conversion, including the
post-merge perturbation each converted suite must still fail on. Each sentinel
was confirmed from history with `git log --diff-filter=A -1`, not guessed.

Two defects outside issue #23's scope were found and filed rather than absorbed:
issue #65, the corpus `python-backend` adapter slot, whose owning issue the
registry records as #23 and which needs an IR reader a generated type package
cannot be; and issue #66, the Python half of the suite having run in no entry
point at all before this change added `make test-python`.


**Matrix coverage status: ✅ Complete. Execution status: ✅ 757 of 844 rows pass and 87 are not — TC-370 and TC-382 blocked on issue #42, TC-944 awaiting the program owner's manual review, and issue #22's 84 rows that no test binds, each marked with the reason it is not bound — after issue #22 merged issue #23's TC-845..944 and issue #23's own TC-944 manual review; the automated suite is measured with `make test` and `poetry run pytest` and restated at the end of this line. TC-199 is recorded by the owner decision on issue #4; TC-370 and TC-382 remain blocked on issue #42 (the retained issue #4 evidence records the minting host's own tool versions). TC-398..619 pass on the issue #19 branch, measured with `make test` after merging `origin/main` at 4e48f08. The `Coverage` column is measured by `scripts/test-matrix-summary.mjs`, which counts the rows naming an id a spec artifact declares; it was a string literal before issue #19's code review (SR-073 FND-658). The `Blocked` column counts every row whose status is not ✅. Issue #19 measured `origin/main` at 51febd4 as **168 of 173** and filed the cause as #48; PR #47 re-expressed those five guards as tree assertions on `main`, and this branch takes that form. Issue #20 then measured the remaining direction: the NFR-021 changed-path range was fixed at its base but open at its head, so it grew from 236 paths and 0 prohibited hits against the merged trunk to 406 paths and 139 against a sibling branch. Both ends now come from history, and TC-644 rehearses the property on a synthetic history rather than inferring it from the shape of the source. Three states were measured for the fix, because the two-number standard cannot see an accreting range: **302 of 302** on the branch; **302 of 302** in a scratch clone where the branch is squash-merged onto f412bda and `origin/main` is repointed so both `git diff origin/main...HEAD` and `git status --porcelain` are empty; and **408 of 408 across 10 files** in that same clone with issue #20 (ad9c552) squash-merged on top. The third state is **406 of 407 with one failure** without this fix — `not permitted: conformance/README.md` — which is the defect. In the fixed third state issue #19's own range is 236 paths with 0 prohibited hits while the open-ended range over the same history is 406 paths with 139. Issue #20 then merged that fix and measured three states on `origin/main` at 3ddc04b, each with `pnpm install` and `poetry install`: **409 of 409 across 10 files** on the branch, identical on a second run; **409 of 409** in a scratch clone where the branch is squash-merged onto 3ddc04b and `origin/main` is repointed so both `git diff origin/main...HEAD` and `git status --porcelain` are empty; and **409 of 409** in that same clone with an unrelated sibling change squashed on top that adds `src/sibling/marker.mjs` and edits `docs/semantic-data-system/roadmap.md`. `poetry run pytest` is 131 of 131 in all three. The third state is what found the same defect one layer down in this corpus's own gates: measured against the range before it was bounded at its tip, it is **2 failed of 106**, attributing the sibling's `src/` and `docs/` paths to issue #20. TC-639 now asserts that every sentinel resolves and that nothing under `conformance/` is added after the range's tip, because a sentinel list is the kind of thing that rots quietly. The corpus's one remaining read of a moving ref is the versioning gate's predecessor, which is deliberate — a baseline the branch under test can edit is not a baseline — and is declared in the manifest so an unreadable ref fails loudly instead of skipping. Issue #22 then merged `origin/main` at de49a49 and measured the three states again, each with `pnpm install --frozen-lockfile` and `poetry install`: **445 of 445 across 12 files** with `pnpm run test` and **495 of 495** with `poetry run pytest` on the branch head; **445 of 445** and **495 of 495** in a scratch clone where the branch is squash-merged onto de49a49 and `origin/main` is repointed so both `git diff --no-renames --name-only origin/main...HEAD` and `git status --porcelain` are empty; and **445 of 445** and **495 of 495** in that same clone with an unrelated sibling change squashed on top that adds `src/sibling/marker.mjs` and edits `docs/semantic-data-system/roadmap.md`, so no sibling path is attributed to issue #22. `quire validate --scope . "spec/**/*.md"` exits 0 with one pre-existing EARS warning on FR-031 and no structural error. That merge also surfaced a cross-ticket collision the two-number standard cannot see: issue #23's TC-894 asserted that no module under `src/compiler/` spawns a process, which issue #22's FR-071 injected formatter does by design; the Python gate now carries the same named exemption and the same "no backend can reach it" reachability assertion the JS gate in `test/compiler.test.ts` already carried, and both halves were falsified before being accepted. The row-level binding pass that followed was re-measured in all three states: `quire coverage` reports **zero status lies across TC-745..844** on the branch head and in the squash-merged post-merge clone, with ten rows id-bound and the other eighty-four marked with the reason no test binds them; removing a trace id returns the row to a status lie, and an unrelated added test changes neither the bound set nor the lie count. `pnpm run test` is **445 of 445** and `poetry run pytest` **495 of 495** in each of the three states after that pass.**
