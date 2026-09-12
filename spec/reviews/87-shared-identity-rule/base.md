---
id: SR-171
title: "Base review of the shared identity-minting rule"
type: SpecReview
analysis: base
scope: "docs/semantic-data-system/contracts-v1.md §Identity minting, FR-034, FR-053, FR-093, FR-094, FR-095, FR-096, FR-098, FR-099 edits, spec/tests.md TC-1223/1224/1241/1251/1252/1290/1291/1333/1334/1347, TC-1351..1354, ERR-261, ERR-281, EC-154, EC-161, spec/log.md CR-087-1, docs/semantic-data-system/extraction-frontend-diagnostics.md"
review_set: all
---
# Base specification review

## Summary

The issue #87 spec commit (`86320f0`, branch `spec/87-shared-identity-rule`)
states one identity-minting rule in `contracts-v1.md` §Identity minting and
edits seven functional requirements, twelve matrix rows, and two register
rows to trace it. The checklist and the six coverage rules were run over the
`origin/main` diff, the three requirement files the contract names as its
implementations, and the rows those files verify by. The rule choice (FR-053's
rule, ruled by the owner and chosen by Phase 0) is not under review; how the
rule is stated and traced is. Every count below was measured over the files.

## Verdict

**CONDITIONAL** — id formats, uniqueness, and the coverage of every changed
obligation hold, and `quire validate` reports zero errors for every changed
file. One high and four medium findings are statement and trace defects: the
contract's collision rule contradicts FR-053, the requirement it declares it
copies; FR-093's enumeration and kernel-scalar clauses contradict the
contract's and FR-095's collision rule; the precedence between
`DUPLICATE_TYPE_NAME` and `DUPLICATE_IDENTITY` is unstated while the existing
`DUPLICATE_TYPE_NAME` fixture stops being a negative; eight `✅ passed` rows
verify criteria this commit changed; and the new shared table is outside every
change-set gate that closes the tree.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-1510 | high | The contract sentence "If a name slugs to the empty string, the frontend raises `UNSLUGGABLE_NAME`" and "If two declarations mint one identity, the frontend raises `DUPLICATE_IDENTITY`" (`contracts-v1.md` §Identity minting, "Two rules close the function") contradict FR-053's own text, which the contract says it states unchanged: FR-053 behaviour line 65 "If slugging two distinct declaration names produces one identity, then the frontend SHALL raise `agent-ix.compiler.UNSLUGGABLE_NAME` at the later declaration's locus rather than emitting a colliding identity" and FR-053-AC-10 "two names slugging to one identity raise `UNSLUGGABLE_NAME`"; FR-095 and EC-161 (`created_at` beside `created-at` → `DUPLICATE_IDENTITY`, TC-1351..1353) follow the contract, so the two frontends the rule exists to unify are specified to raise different codes for the same collision. The contract's own claim "stated here once and implemented unchanged by every frontend" is false while FR-053 lines 64–65 and AC-10 stand; either the contract's second rule or FR-053's must be restated | contracts-v1.md §Identity minting; FR-053 behaviour lines 64–65, FR-053-AC-10; FR-095 "Node identities"; spec/tests.md EC-161 |
| FND-1511 | medium | FR-093 "Enumerations": "If two rows of one enumeration slug to the same value under FR-095's case-preserving slug (`a b` and `a_b`, not `Active` and `active`), then the frontend SHALL raise `DUPLICATE_TYPE_NAME` at the second row" names the wrong code under the shared rule — two rows slugging alike mint one `variant/` identity, which the contract and FR-095 refuse as `DUPLICATE_IDENTITY`; and FR-095 "The frontend SHALL treat two records whose `displayName` values differ … FR-093's `DUPLICATE_TYPE_NAME` fires only on equal `displayName` values" is contradicted by FR-093's kernel-scalar clause (FR-092 line 62, FR-093-AC-13 clause 4, TC-1347) and by the enumeration clause above, both of which fire `DUPLICATE_TYPE_NAME` on something other than equal `displayName`; ERR-261 repeats all three triggers under one code | FR-093 "Enumerations" and "The record" rules; FR-095 "Node identities" last bullet; spec/tests.md ERR-261, TC-1333, TC-1334 |
| FND-1512 | medium | Two documents with one `displayName` mint one `type/<Name>` identity, so both FR-093's `DUPLICATE_TYPE_NAME` ("If two documents in one bundle lower to the same `displayName`") and FR-095's `DUPLICATE_IDENTITY` ("If two declarations of one lift mint the same identity") apply to the same bundle and no sentence orders them, while FR-098-AC-4 requires each negative to yield "exactly its code as the first blocking diagnostic in FR-096 order" (TC-1288); the committed `negatives/DUPLICATE_TYPE_NAME` fixture is `Status`/`status` (`FR-001-status.md`, `FR-002-status.md`), which FR-095-AC-14 now says "lifts with zero diagnostics about them", so FR-096-AC-9 (TC-1267, the fixture's byte-identical diagnostics) and FR-098-AC-4 lose their fixture without any requirement saying it is re-authored | FR-093 "The record"; FR-095 `DUPLICATE_IDENTITY` rule; FR-096-AC-9; FR-098-AC-4; crates/extraction-frontend/fixtures/negatives/DUPLICATE_TYPE_NAME/ |
| FND-1513 | medium | Eight rows keep `✅ passed` while the criterion they verify changed in this commit: TC-1259 and TC-1260 (FR-096-AC-1/AC-2 now range over `DUPLICATE_IDENTITY`, which no enum variant carries), TC-1271 (FR-096-AC-13 regenerates `extraction-frontend-diagnostics.md` from the enum byte for byte; the doc gained a 27th row in this commit, the enum did not, so the row is red at `HEAD`), TC-1272 (FR-096-AC-14, negatives set equals enum variants; `negatives/DUPLICATE_IDENTITY` is now inventoried), TC-1288 (FR-098-AC-4, every code has a negative), TC-1343 (FR-098-AC-11, the inventory changed), TC-1267 (FND-1512), TC-1243 (FR-094-AC-13, the regex patterns are the rewritten FR-095 list); the FR-096 summary row stays `✅ Complete` and the log entry lists only ten rows as `🚧` | spec/tests.md TC-1243, TC-1259, TC-1260, TC-1267, TC-1271, TC-1272, TC-1288, TC-1343, FR-096 summary row; spec/log.md CR-087-1 |
| FND-1514 | medium | FR-095 Outputs adds `test/fixtures/compiler/shared/identity-cases.json` and FR-095-AC-16 "a node test against `src/compiler/frontend/typespec/identity.mjs`" (TC-1353) with no named path, but the change-set gates that close the tree admit neither: FR-098-CON-1/AC-10 (TC-1294, `✅ passed`) says the outside-the-crate set "is exactly `cases.json`, `test/fixtures/compiler/shared/typespec/records-and-scalars/`, and files under `test/fixtures/compiler/shared/spec-bundle/`", and FR-099-CON-1/AC-5 (TC-1299) names exactly six paths; FR-095-CON-4 (TC-1354) fences only `src/compiler`, `packages`, `conformance`, `schema`, so the new table and test file fail TC-1294 and TC-1299 the moment they land | FR-095 Outputs, FR-095-AC-16, FR-095-CON-4; FR-098-CON-1, FR-098-AC-10; FR-099-CON-1, FR-099-AC-5; spec/tests.md TC-1294, TC-1299, TC-1353, TC-1354 |
| FND-1515 | low | TC-1353 traces to FR-053-AC-6, whose Verification cell reads `Test` with no row id, and the FR-053 summary row still lists `TC-412..TC-431, TC-604` only, so the trace is one-directional; FR-053 line 73 derives the code namespace as `agent-ix.<slug(package name)>.` while the contract and `identity.mjs` (`slug(name).toLowerCase()`) lower-case it — the contract's "lower-cased" is the implementation's truth and FR-053's sentence omits it | FR-053-AC-6, FR-053 behaviour line 73; spec/tests.md FR-053 summary row, TC-1353; src/compiler/frontend/typespec/identity.mjs |
| FND-1516 | low | The issue #36 paragraph of `spec/tests.md` now reads "Its 151 rows are `✅` … except four" while the block holds 155 rows (TC-1200..1354) and fourteen are `🚧` (the ten retitled rows, TC-1351..1354, TC-1292, TC-1337, TC-1316, TC-1317); the log entry records that the Test Execution Summary counts were not recomputed | spec/tests.md lines 89–104, Test Execution Summary; spec/log.md CR-087-1 |
| FND-1517 | low | The ids this commit takes — TC-1351..1354, ERR-281, EC-161, SR-171..178, FND-1510..1589 — are recorded nowhere in `spec/log.md`; the issue #36 entry reserved TC-1200..1349, ERR-250..280 and EC-140..160, and ERR-281/EC-161 sit one past those ranges while ERR-276..280 and EC-155..160 are unused. Measured over every remote branch (`origin/main`, `contract-agent-core/49-scratch-fixtures`, `spec/36-extraction-frontend`, `audit/10-filament-contract-census`, `spec/11-semantic-core-packages`, `spec/8-semantic-data-architecture`, `spike/4-typespec-feasibility`) none of the new ids collides, so the defect is the record, not the range | spec/log.md CR-087-1; spec/tests.md TC-1351..1354, ERR-281, EC-161 |
| FND-1518 | low | Terminology drifts across the three statements of one rule: the collision order is "package-root-relative source path" in the contract and FR-053 line 64 but "bundle-root-relative path" in FR-095; the contract writes "the frontend raises `DUPLICATE_IDENTITY`" unqualified while FR-053 raises `agent-ix.semantic-ir.DUPLICATE_IDENTITY`, FR-096 `agent-ix.extraction-frontend.DUPLICATE_IDENTITY`, and FR-098-AC-8 names the compiler's `DUPLICATE_IDENTITY` for the TypeScript refusal, three registries under one bare name in the same requirement set; FR-034 Downstream still reads "extraction frontend (issue #36)" without the FR-095 link that FR-053's Downstream and FR-095's `depends_on` carry | contracts-v1.md §Identity minting; FR-053 line 64; FR-095 `DUPLICATE_IDENTITY` rule; FR-096 registry; FR-098-AC-8; FR-034 Dependencies |
| FND-1519 | low | Coverage of the changed obligations is complete: FR-093-AC-4/5/12/13, FR-094-AC-11, FR-095-AC-6/7/14/16, FR-095-CON-4, FR-096-AC-2, FR-098-AC-6/7 each name a row that traces back to them (TC-1223, TC-1224, TC-1333, TC-1334, TC-1241, TC-1251, TC-1252, TC-1347, TC-1351, TC-1352, TC-1353, TC-1354, TC-1260, TC-1290, TC-1291); ERR-281 and EC-161 each name a row; `cases.json` does carry a `typespec` key, so FR-098-AC-6's "both `typespec` and `spec-bundle` non-null" is well-formed; `quire validate` over the twelve changed files reports zero errors and zero `[ears:*]`/`[quality:*]` warnings | spec/tests.md; FR-093..FR-099; test/fixtures/compiler/shared/cases.json |

## Checklist

| Gate | Result |
|---|---|
| ID formats FR-NNN, TC-NNNN, `{PARENT}-AC-N`, `{PARENT}-CON-N`, ERR-NNN, EC-NNN | All conform; FR-095-AC-16 and FR-095-CON-4 continue their sequences; TC-1351..1354, ERR-281, EC-161 are new and well-formed |
| Duplicate ids | None in the working tree; none against any remote branch (FND-1517) |
| Sequential ids | TC-1351 follows TC-1350; ERR-281 skips ERR-276..280 and EC-161 skips EC-155..160, both unused in issue #36's reserved ranges (FND-1517) |
| FR Description, Inputs, Outputs, Behavior, Constraints, Acceptance Criteria, Dependencies | Present in every edited FR; FR-095's frontmatter `depends_on` and Upstream both gain FR-034 and FR-053; FR-053 Downstream gains FR-095; FR-034 Downstream unchanged (FND-1518) |
| Error conditions carry registry codes | `DUPLICATE_IDENTITY` is in FR-096's closed enum, severity table, AC-2, and the registry doc; the code named for a slug collision differs between the contract and FR-053 (FND-1510) and between the contract and FR-093's enumeration clause (FND-1511) |
| Criteria verifiable | Every rewritten AC names concrete strings (`type/ConfigVersionVersionNumber`, `agent-ix.config-service.CONFIGVERSION_VERSIONNUMBER_MIN`, `type/NoteRevision`); the `DUPLICATE_TYPE_NAME`/`DUPLICATE_IDENTITY` precedence is not decidable from the text (FND-1512) |
| TC fields (Type, Priority, Traces To, Status) | Complete on all four new rows (Snapshot P1, Unit P0, Unit P0, Static P1) and the ten retitled rows |
| Status markers | Ten retitled rows and four new rows `🚧 pending the issue #87 implementation (CR-087-1)`; eight rows whose criteria changed stay `✅ passed` (FND-1513) |
| Cross-references | Every `Verification (TC-NNNN)` cell in the edited FRs names a row that traces back; TC-1353 → FR-053-AC-6 is one-directional (FND-1515); the contract section is cited by path and heading from FR-034, FR-053, FR-093, FR-094, FR-095, FR-098 |
| Terminology | `<Name>`/`<Field>`/`slug`/`UPPER_SNAKE` used consistently across the contract, FR-093, FR-095; drift on "package-root" versus "bundle-root" and on the bare code name `DUPLICATE_IDENTITY` (FND-1518) |
| `quire validate` | 0 errors, 0 warnings on FR-034, FR-053, FR-093..FR-099, spec/tests.md, spec/log.md (only the module-level `DuplicateArchetype`/`DuplicateInverseEdge` notices, outside this change) |

## The six coverage rules

1. **Coverage** — 15 of 15 changed or added obligations carry a row (FND-1519).
2. **Option permutation** — the TC-1290/TC-1291 row now enumerates both-dialects-non-null against `spec-bundle: null` with a `scalar` reason; no other option axis changed.
3. **Constraint boundary** — the FR-093-AC-13 boundary row flips `versionNumber`/`version_number` from Prohibited to Allowed with the two distinct codes named; the slug boundaries (empty string, `--`, `***`) stay on TC-1252, retitled to the case-preserving results.
4. **Error path** — ERR-281 binds `DUPLICATE_IDENTITY` to TC-1351; ERR-261 is restated; the slug-collision path has two codes across the rule's three statements (FND-1510, FND-1511) and the equal-`displayName` path has two codes with no precedence (FND-1512).
5. **State transition** — the lift's exits are unchanged; `DUPLICATE_IDENTITY` blocks (exit 1, no document) per FR-096 and TC-1351.
6. **Edge case** — EC-154 restated to the case-preserving reading; EC-161 (author-named type equal to a minted alias; slug-equal names) added with three rows.

## Id discipline

The brief reserved SR-171 and FND-1510..1519 for this analysis and the matrix
took TC-1351..1354, ERR-281, EC-161; none is in `spec/log.md`, and no remote
branch holds any of them (FND-1517). This document uses exactly SR-171 and
FND-1510..1519.
