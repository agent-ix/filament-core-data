---
id: SR-160
title: "Base review of the spec-bundle extraction frontend"
type: SpecReview
analysis: base
scope: "US-015, FR-091..099, NFR-031..033, spec/tests.md TC-1200..1349, spec/spec.md issue #36 paragraphs"
review_set: all
---
# Base specification review

## Summary

One user story, nine functional requirements, three non-functional
requirements, 173 obligations (145 acceptance criteria and 28 constraints),
and 149 test cases for the Rust crate that lifts a spec bundle to semantic IR
1.1.0 through the quire-rs extraction contract. The checklist was run against
the requirement files as they stand after the apply pass of SR-161..167
(commit `2c7bbb5`), not against the text those analyses read. Every number
below was measured by a script over the files, not asserted.

## Verdict

**PASS** — id formats, uniqueness, the reserved range, the six coverage rules,
and the status markers all hold; `quire validate` reports zero errors and zero
grammar warnings for every file in scope. The three low findings are record
defects outside the requirement files.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-1400 | low | Coverage is 173/173 obligations (145 AC + 28 CON) across 149 matrix rows, measured by comparing the set of `*-AC-N`/`*-CON-N` ids in the twelve requirement files against the union of the `Traces To` cells of TC-1200..1349; the reverse check finds no `Traces To` entry naming an id no file declares, and every `Verification (TC-NNNN)` cell names a row that traces back to that criterion | spec/tests.md, FR-091..099, NFR-031..033 |
| FND-1401 | low | Every id is inside the exclusive range reserved against `main` at `3b75e01` (maxima there: US-014, FR-090, NFR-030, TC-1108, SR-148, FND-1383, ERR-200, EC-100); the open PR #84 adds only TC-1109 and TC-1110; this branch uses TC-1200..1349 (TC-1339 unused), SR-160..168, FND-1400..1489, ERR-250..275, EC-140..154 — no collision on either side | spec/log.md, spec/tests.md, PR #84 |
| FND-1402 | medium | Every one of the 149 rows is `🚧` (148 `🚧 planned`, TC-1337 `🚧 blocked on issue #85`); none may move to `✅` before `crates/extraction-frontend` exists and a `#[trace]`-bound test decides it | spec/tests.md TC-1200..1349 |
| FND-1403 | low | The one `Manual` row, TC-1337, traces to `US-015` (issue #36 AC-5, the `json-schema` target) and to no FR criterion, and the proxy TC-1293 traces to FR-098-AC-9 alone — the shape SR-164 FND-1444 required, verified | spec/tests.md TC-1337, TC-1293, FR-098-AC-9 |
| FND-1404 | low | The reservation record in `spec/log.md` (2026-09-08) names TC-1200..1299 and TC-1300..1329, but the matrix consumed TC-1330..1349 for the criteria the apply pass added; the range is still collision-free (PR #84 tops out at TC-1110) and `spec/tests.md` states TC-1200..1349, so the log entry understates what was taken | spec/log.md, spec/tests.md |
| FND-1405 | low | `spec/spec.md` §2.2 still carries the issue #19 bullet "Implementing the spec-bundle extraction frontend (issue #36)" under Out of Scope while §2.1 names it the twelfth delivery; the bullet needs "as part of issue #19" or removal | spec/spec.md §2.1, §2.2 |
| FND-1406 | low | ERR-250..275 is exactly the 26-code FR-096 registry, one row per code, each with at least one TC; EC-140..154 each name a TC; the 28 constraints are all bound (22 join the row of the AC that decides them, 6 take the three allocated Static rows TC-1330, TC-1336, TC-1338) | spec/tests.md Error Paths, Edge Cases |

## Checklist

| Gate | Result |
|---|---|
| ID formats US/FR/NFR-NNN, TC-NNNN, `{PARENT}-AC-N`, `{PARENT}-CON-N` | All conform; AC and CON numbering is sequential from 1 in every file |
| Duplicate ids | None among TC-1200..1349; none against `main` or PR #84 |
| US-015 story form, ≥2 criteria, options, constraints, dependencies, priority | Present; five illustrative examples EX-1..5, each mapped to FR rows in the User Story Coverage table |
| FR Inputs, Outputs, Behavior, Constraints, Acceptance Criteria, Dependencies | Present in all nine; error conditions carry registry codes; frontmatter graph is acyclic and every `depends_on` target exists |
| NFR Statement, Scope, Measurement, Verification, Acceptance Criteria | Present in all three; NFR-031 names the 512 MiB / 30 s budget the limit probes run under |
| TC fields (Type, Priority, Traces To, Status) | Complete on all 149 rows: Unit 60, Static 34, Integration 15, Property 13, Snapshot 13, E2E 11, Compile 1, Fuzz 1, Manual 1; P0 33, P1 116 |
| Cross-references | Every FR links US-015; every TC traces to a declared id; full ids used throughout |
| `quire validate` | 0 errors, 0 `[ears:*]`/`[quality:*]` warnings in scope (the warnings the run prints are FR-031, FR-054..062, FR-081..090 — outside this issue) |

## The six coverage rules

1. **Coverage** — 173 of 173 obligations carry at least one test case (FND-1400).
2. **Option permutation** — the Concern-or-State table enumerates table versus fence form, one/two/zero `--module` roots, `--diagnostics`/`--provenance` given or absent, engine severity `advisory`/`warning`/`error`, and the two-dialect versus single-dialect shared cases, each with its row.
3. **Constraint boundary** — the five `limits.json` limits are probed one past the limit (TC-1305, ERR-269..273); the 120-character message bound at a 4000-character token (TC-1269); slug boundaries at the empty string (TC-1252).
4. **Error path** — 26 registry codes, 26 ERR rows, every one with a TC and a `negatives/<CODE>/` fixture or a named constructing test (TC-1272, TC-1288).
5. **State transition** — the lift's three exits (0 clean, 1 blocked, 2 refused) and their write effects are one row each in the Concern-or-State table (TC-1268, TC-1296, TC-1340, TC-1341); FR-092's two-pass order has its refutation row (TC-1332).
6. **Edge case** — EC-140..154: empty bundle, no-`object` bundle, zero-row table, self-referencing field, composite cycle, punctuation-only title, CRLF, BOM, duplicate object type, cross-module name clash, symlinked root, read-only root, line-0 engine locus, case-only title difference.

## Id discipline

Ids were **reserved as an exclusive range**, not scanned: `main` at `3b75e01`
is the base, PR #84 (`contract-agent-core/49-scratch-fixtures`, open,
mergeable) is the parallel branch, and neither side can establish "next free".
The measured maxima on `main` and the ids PR #84 adds are in FND-1401. The one
defect is the record, not the range: `spec/log.md` names TC-1329 as the top
while the matrix took TC-1349 (FND-1404).

## Status markers

No row uses `⚠️` or `✅`. 148 rows carry `🚧 planned`; TC-1337 carries
`🚧 blocked on issue #85` and is the only `Manual` row, with no test behind it
by design (SR-164 FND-1444). `quire validate` accepts both markers.
