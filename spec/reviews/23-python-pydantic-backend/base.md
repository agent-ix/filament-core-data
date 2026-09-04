---
id: SR-097
title: "Base review of the qualified Python generation route"
type: SpecReview
analysis: base
scope: "US-013, FR-072..FR-080, NFR-026, NFR-027, spec/tests.md TC-845..TC-944, spec/spec.md, spec/index.md, spec/log.md"
review_set: all
---
# Base specification review

## Summary

The issue #23 specification adds one user story, nine functional requirements,
two non-functional requirements, and 100 test-matrix rows for a Python
generation route built on the pinned MIT `datamodel-code-generator==0.76.0`,
with the repository owning a schema-preparation pass, refusal guards, a
sandboxed runner, a generated-source inspection, per-family qualification
verdicts, a package layout, and a static/runtime validation gate. The mechanical
account is clean: 140 of 140 declared acceptance criteria and named constraints
(110 AC, 30 CON) appear in at least one `Traces To` cell of TC-845..TC-944; no
row traces to an id no artifact declares; all 99 relative markdown links in the
16 in-scope files resolve; `quire validate --scope . "spec/**/*.md"` reports
zero errors and one warning, on merged `FR-031` and not on this branch's
artifacts. The matrix arithmetic is right — Unit 273→327, Integration 42→64,
Static 191→204, Property 48→53, Snapshot 17→21, Fuzz 7→9, total 644→744.

Two defects block a clean base pass. The Error Paths table now declares
`ERR-070`..`ERR-081` twice, because this change reused a block of codes issue
#19 already merged; the next free code was `ERR-114` (`ERR-132` counting the
in-flight issue #21 worktree). And the owned adapter is specified in two
languages that cannot call each other at the point where the requirements say
they must. Nine further findings are quality rather than blocking.

Ids were allocated against `main` at c1b8807 with the four worktrees inspected:
issue #21 (`spec/21-rust-serde-backend`, 9445ad4) holds US-011, FR-054..062,
NFR-022..023, TC-645..744 and ERR up to ERR-131; issue #22
(`spec/22-typescript-backend`) is still at `main` and has allocated nothing.
`git branch -r` lists only `main`, `audit/10-filament-contract-census`,
`spec/8-semantic-data-architecture`, and `spike/4-typespec-feasibility`.

## Method

| Check | Command | Result |
|---|---|---|
| Skeleton and schema | `quoin write . --types SpecReview` | `spec-artifacts-process`; skeleton `skeletons/SpecReview.md`, schema `schemas/spec-review-frontmatter.schema.json` |
| Validation | `quire validate --scope . "spec/**/*.md"` | 0 errors, 1 warning (`FR-031` line 56, `[ears:non-singular]`, merged and out of scope) |
| Criterion coverage | Python pass over the 11 artifacts and `spec/tests.md`: collect every `^\| (FR\|NFR)-\d{3}-(AC\|CON)-\d+ \|` row id, collect every id named in the `Traces To` cell of rows TC-845..944, diff both directions | 140 declared (110 AC + 30 CON); 140 traced; 0 declared-but-untraced; 0 traced-but-undeclared |
| Row census | same pass, grouped by the `Type` column | 100 unique rows, TC-845..TC-944 with no gap: Unit 54, Integration 22, Static 13, Property 5, Snapshot 4, Fuzz 2 |
| Link integrity | Python pass resolving every non-`http`/non-`ix://` markdown target against the filesystem, over the 16 changed files | 99 relative links, 0 broken |
| Duplicate ids | `grep -oE '^\| (ERR\|EC\|TC)-[0-9]{3}' spec/tests.md \| sort \| uniq -c`, against the same on `git show main:spec/tests.md` | `ERR-070`..`ERR-081` doubled by this change; `ERR-061`, `ERR-063`, `ERR-064`, `ERR-075` were already doubled on `main`; no `TC` or `EC` duplicate introduced |
| Id allocation | `git worktree list`, `git branch -a`, `git branch -r`, and the id maxima in each worktree | see Summary |

## Checklist Results

| Area | Result | Evidence |
|---|---|---|
| ID format and uniqueness | **Fail** | US-013, FR-072..080, NFR-026..027, TC-845..944 and EC-070..078 are well-formed, unique, and clear of every sibling worktree; `ERR-070`..`ERR-081` are not (FND-1100) |
| Sequential allocation | Concern | `spec.md` §5 and `index.md` advertise `US-001 through US-013`, `FR-001 through FR-080`, `NFR-001 through NFR-027`, but US-012, FR-063..071 and NFR-024..025 are declared by no artifact in any worktree (FND-1106) |
| User story quality | Pass | US-013 carries the As/I want/So that shape, five illustrative acceptance examples, Options, Constraints, Dependencies, Priority and Risk, and Traceability; every example is mapped in the US coverage table |
| Functional requirement quality | Pass with findings | Each FR carries Description, Inputs, Outputs, Behavior, a Constraints table with a Type and Validation cell, measurable criteria, and upstream/downstream Dependencies; see FND-1101, FND-1107, FND-1108 |
| Non-functional requirement quality | Pass | NFR-026 and NFR-027 carry Statement, Scope with permitted and prohibited paths, Rationale, a Measurement table whose nine metrics all have numeric targets and a named method, Verification, criteria, and Dependencies, in the same section order as NFR-001..020 |
| Coverage (Rule 1) | Pass with findings | 140/140 criteria and constraints map to TC-845..944, computed from the files; three CON traces are nominal (FND-1105) and the NFR criteria are bundled 2–3 per row (FND-1104) |
| Option permutation (Rule 2) | Pass | Seven rows: the five output families each with a verdict and its enabling profile options, plus the preparation pass applied and skipped over a sealed object schema |
| Constraint boundary (Rule 3) | Concern | Eighteen rows, of which four are true `Boundary` rows — the advisory floor at 0.63.0/0.64.0/0.63.9 and the input size at exactly the maximum and one byte over. The declared wall-clock timeout and the 32-document corpus floor have no at-limit row (FND-1103), and the input-size rows are filed under the wrong constraint (FND-1102) |
| Error path (Rule 4) | **Fail** | Twelve rows, each colliding with a merged row of the same table (FND-1100). The content is otherwise sound: every new row names a distinct condition, a response, and at least one TC |
| State transition (Rule 5) | Pass | Six rows over profile editing and digest invalidation, the three verdict states, `not-qualified` package emission, and the unavailable `python-backend` adapter slot |
| Edge case (Rule 6) | Pass | EC-070..078: `unevaluatedProperties` invisible to the generator, a Pydantic dataclass without `--extra-fields forbid`, faithful `Any`, partial-fidelity families, msgspec tagged-union rendering, the blocked corpus slot, the formatter opt-in warning, a shadowing `PATH` binary, and the `sourceLocus` lookaheads. EC-069 is skipped with no reservation recorded (FND-1110) |
| TC field completeness | Pass | All 100 rows carry Description, Type, Priority, Traces To, and Status |
| Cross-referencing | Pass with findings | FR → US-013 `implements`; NFR → US-013 and the FRs `constrains`; `quire validate` resolves every link; seven artifacts state an upstream in prose that the frontmatter graph omits (FND-1108) |
| Non-disruption | Pass | NFR-026 and NFR-027 enumerate permitted and prohibited paths; FR-074-CON-3 and FR-074-AC-10 keep `normalizeJsonSchemaForPython` and its golden byte-unchanged so FR-043-AC-1 stays green; FR-076-CON-1 keeps the runner outside `src/compiler/` so FR-043-AC-8 stays green; FR-077-CON-3 and FR-077-AC-10 freeze the issue #20 corpus |
| Honesty of the coverage account | Pass | The Coverage Gaps section records the `python-backend` adapter slot as `unavailable` behind issue #52/GAP-011, requires unrun rows to be reported unmet, and declares `dataclasses.dataclass` and `typing.TypedDict` measured and not qualified rather than omitted; the prose claim "100 rows cover 110 acceptance criteria" is exactly what the files count |
| Matrix summary consistency | Concern | The per-type and total arithmetic is correct; the bold status line beneath it was not updated (FND-1109) |

## Findings

| ID | Severity | Summary | Refs | Escape Cause |
|---|---|---|---|---|
| FND-1100 | high | `ERR-070`..`ERR-081` collide with twelve merged rows of the same Error Paths table; each code now names two unrelated conditions | `spec/tests.md` Error Paths | wrong-requirement |
| FND-1101 | high | The guards and the preparation pass are `.mjs`, the runner is `.py`, and FR-076 requires the Python runner to call them before spawning any process — which the JavaScript boundary makes impossible | FR-073, FR-074, FR-075, FR-076 | wrong-requirement |
| FND-1102 | medium | The two input-size boundary rows are filed under `FR-076-CON-3`, which governs the stderr and warning allow-list, not the size limit | `spec/tests.md` Constraint Boundary | wrong-requirement |
| FND-1103 | medium | Two declared finite limits have no at-limit boundary row: the wall-clock timeout is exercised only over the limit, and the 32-document malicious-schema floor not at all | FR-076, FR-075-AC-9, NFR-026-AC-1 | correct-requirement-no-evidence |
| FND-1104 | medium | The twenty NFR-026 and NFR-027 criteria are bundled into ten rows carrying two or three criteria each, so a green row does not mean each of its criteria was exercised | NFR-026, NFR-027, TC-935..944 | correct-requirement-no-evidence |
| FND-1105 | medium | Three constraints are traced to rows that do not assert them, satisfying Rule 1 by the letter only | FR-072-CON-2, FR-074-CON-2, FR-075-CON-1 | correct-requirement-no-evidence |
| FND-1106 | medium | `spec.md` and `index.md` advertise contiguous id ranges over US-012, FR-063..071 and NFR-024..025, which no artifact in any worktree declares, and `log.md` states they were "allocated first" | `spec/spec.md`, `spec/index.md`, `spec/log.md` | wrong-requirement |
| FND-1107 | low | Six of the nine FR Descriptions and NFR-026's Statement carry two to five `SHALL` clauses; the engine's `[ears:non-singular]` rule does not reach Description or Statement text, so none is flagged | FR-072, FR-073, FR-074, FR-076, FR-077, FR-079, NFR-026 | wrong-requirement |
| FND-1108 | low | Seven artifacts name an upstream dependency in prose that is absent from the `relationships` frontmatter, re-opening the class issue #19's FND-547 closed | FR-075, FR-076, FR-077, FR-079, FR-080, NFR-026, NFR-027 | wrong-requirement |
| FND-1109 | low | The Test Execution Summary's status line still reads "642 of 644 rows pass, 2 blocked" beneath a table this change moved to 744 rows and 102 blocked | `spec/tests.md` Test Execution Summary | wrong-requirement |
| FND-1110 | low | EC-069 is skipped with no recorded reservation, while ERR ids restart at 070 — two id spaces in one file allocated by two different rules in one change | `spec/tests.md` Edge Cases, Error Paths | wrong-requirement |

## Finding Detail

### FND-1100 — duplicate error-path codes (high)

`## Error Paths` in `spec/tests.md` is one table. It already carried
`ERR-070`..`ERR-081` from issue #19 — `ERR-070` is a decorator argument failing
its declared shape, `ERR-075` a `@pre`/`@post` naming an undeclared `clauseId`,
`ERR-081` no candidate satisfying an import constraint. This change appends
twelve rows reusing exactly those twelve codes for the advisory gate, the
provisioning failure, the executable schema key, the remote `$ref`, the
caller-supplied option, the double closure statement, the limit breach, the
empty output, the degraded annotation, the unattributed annotation, the missing
`gaps.json` row, and the unlocatable guard range. Measured:
`grep -oE '^\| ERR-[0-9]{3}' spec/tests.md | sort | uniq -c` gives a count of 2
for each of `ERR-070`..`ERR-081`; the same command on `git show
main:spec/tests.md` gives 1 for each. The highest code anywhere on `main` is
`ERR-113`, and the in-flight issue #21 worktree has taken `ERR-114`..`ERR-131`,
so the free range begins at `ERR-132`. Note separately that `ERR-061`,
`ERR-063`, `ERR-064` and `ERR-075` are already doubled on `main`; that is a
pre-existing defect this branch neither caused nor should fix.

### FND-1101 — the adapter and the runner cannot call each other (high)

FR-073 declares `python_backend/adapter/profiles.mjs`, FR-074 declares
`python_backend/adapter/prepare.mjs`, and FR-075 declares
`python_backend/adapter/guard.mjs` exporting `assertSchemaSafe(schema)` and
`assertArgvSafe(argv)` — all ES modules. FR-076 declares
`python_backend/runner/generate.py` and states: "The runner SHALL call
`assertSchemaSafe` and `assertArgvSafe` from FR-075 before it spawns anything,
refusing rather than generating when either raises." A Python module cannot call
an ES-module export without spawning a Node process, and spawning one is exactly
what FR-075-AC-8 ("spawns no process, asserted by an instrumented spawn") and
FR-076-AC-3 ("an instrumented spawn counter reading zero") forbid at that point.
The same seam is unstated for the prepared document: FR-076's Inputs are "a
prepared schema document from FR-074", produced by JavaScript and consumed by
Python with no declared interchange. Either the guards move into the Python
runner, or the runner moves into Node, or a requirement declares the handoff and
what "before any process is spawned" means across it. As authored the slice is
not implementable, and the spawn-counter criteria would fail on the first
correct implementation.

### FND-1102 — an input-size boundary filed under the wrong constraint (medium)

The Constraint Boundary table carries `FR-076-CON-3 | Boundary | An input of
exactly the declared maximum size` and `FR-076-CON-3 | Prohibited | An input one
byte over the declared maximum`. `FR-076-CON-3` reads: "The maintainer SHALL NOT
widen the stderr or warning allow-list to make a run green." The input-size
limit is a Behavior obligation verified by `FR-076-AC-5`. As filed, the table
reports boundary coverage for a constraint that has none and none for the
obligation it actually exercises.

### FND-1103 — two declared limits without an at-limit row (medium)

FR-076 declares two finite limits — "a declared wall-clock timeout and a
declared maximum input size". Only the size limit gets the at-limit / one-over
pair. The timeout appears once, at TC-886, over the limit; a generation
finishing just inside it is never asserted, so a timeout set to zero would pass
the matrix. FR-075-AC-9 and NFR-026-AC-1 both say "at least 32 documents"; TC-881
and TC-935 assert the 32 refusals but nothing asserts the corpus is not 31, and
`ceil`/`floor` on a declared minimum is precisely what Rule 3 exists for.

### FND-1104 — NFR criteria bundled two and three to a row (medium)

Every FR criterion is 1:1 with a row. The NFR criteria are not: TC-936 carries
NFR-026-AC-2 and AC-7, TC-937 carries AC-3 and AC-4, TC-938 carries AC-5, AC-6
and AC-10, TC-939 carries AC-8 and AC-9; TC-940, TC-942, TC-943 and TC-944 do
the same for NFR-027, TC-944 carrying AC-8, AC-9 and AC-10. Ten rows carry
twenty criteria. The matrix arithmetic counts rows, so `100% mapped` and the
102-blocked count treat TC-938 as one unit while it stands for three
independent assertions — a socket census, an import allow-list, and a register
superset. The Coverage Gaps prose is honest about this ("the NFR-026 and NFR-027
rows each carry two or three criteria"), which makes it a recorded weakness
rather than a hidden one, but it is still the one place in the slice where a
green row does not mean a criterion was exercised.

### FND-1105 — three nominal constraint traces (medium)

- `FR-072-CON-2` obliges a version bump to update `toolchain.json`, re-run the
  FR-077 qualification, and restate every per-family verdict. It is traced to
  TC-852, which asserts that `DATAMODEL_CODEGEN_VERSION` and `PYDANTIC_VERSION`
  agree with `toolchain.json` and the lock. A bump that updated all three and
  restated no verdict passes TC-852.
- `FR-074-CON-2` forbids adding a rewrite that removes a constraint to make a
  family pass. It is traced to TC-872, which asserts two named files are
  unchanged from `origin/main`. A constraint-removing rewrite added to
  `prepare.mjs`, which TC-872 does not read, passes.
- `FR-075-CON-1` forbids narrowing the refusal register. It is traced to TC-882,
  which asserts the register's codes are unique and complete. A narrowed
  register with unique codes passes.

FR-074-AC-8 shows the shape that works — a property over every published schema
asserting the constraint-keyword set is preserved. The three constraints above
need a comparable assertion or an explicit `Manual`/`Analysis` row, not a
neighbouring row's id.

### FND-1106 — advertised id ranges that no artifact fills (medium)

`spec/spec.md` §5 now reads "US-001 through US-013", "FR-001 through FR-080",
"NFR-001 through NFR-027", and `index.md` follows. Measured across all four
worktrees: US-012, FR-063..FR-071 and NFR-024..NFR-025 are declared by no file.
`log.md` states "Ids skip FR-054..FR-071 and NFR-022..NFR-025, which the
parallel issue #21 and #22 backend branches allocated first" — issue #21 has
allocated FR-054..062 and NFR-022..023, and issue #22 sits at `main` with
nothing allocated. The reservation convention itself is sound and matches the
merged precedent of issues #20 and #27; the defect is that the artifact-class
table states a contiguous range as fact where nine FR ids, one US id and two NFR
ids are reservations, and `log.md` reports a reservation as a completed
allocation.

### FND-1107 — compound Descriptions and Statements (low)

Measured over the `## Description` / `## Statement` opening paragraph: FR-072
carries three `SHALL`, FR-077 three, FR-073/074/076/079 two each, and NFR-026
five. The comparable merged set (FR-030..053) has 5 of 24 Descriptions with more
than one. `quire validate` reports nothing here because the `[ears:non-singular]`
rule reaches Behavior bullets and not Description or Statement text — the same
class issue #19 recorded as FND-528 and FND-531 and split. NFR-026 is aware of it
("Each obligation is stated separately as its own acceptance criterion below"),
which mitigates but does not remove the compound statement.

### FND-1108 — prose dependencies missing from the relationship graph (low)

Measured by comparing each artifact's `relationships` frontmatter against its
`- **Upstream**:` line: FR-075 names FR-072, FR-076 names FR-073, FR-077 names
FR-073, FR-079 names FR-078, FR-080 names FR-077, NFR-026 names NFR-020, and
NFR-027 names NFR-017 and NFR-021 — none of the eight edges is in frontmatter.
A tool reading `relationships` sees a strictly smaller graph than a reader does.
Issue #19's FND-547 closed exactly this class ("Every prose dependency in the
eleven artifacts is now a frontmatter relationship"), and the same measurement
finds eleven merged artifacts have since drifted back, so this is a live house
rule that the new artifacts should meet rather than a new demand on them.

### FND-1109 — a stale summary line under a corrected table (low)

The change updated every per-type row and the total (644→744, blocked 2→102) and
left the bold line beneath reading "Execution status: ✅ 642 of 644 rows pass, 2
blocked". Two further wrinkles ride on it: the ✅ marker and "Matrix coverage
status: ✅ Complete" now sit above 100 rows whose status is 🚧, and the
`Blocked` column — defined in that same paragraph as "every row whose status is
not ✅" — reports 100 not-yet-written rows as blocked work, which reads as a
102-row impediment rather than as unstarted implementation.

### FND-1110 — two id spaces, two allocation rules, one change (low)

EC ids continue at EC-070, leaving EC-069 unallocated with no recorded
reservation (EC-063..067 were already absent on `main`). ERR ids restart at
ERR-070 rather than continuing past ERR-113. The Coverage Gaps prose declares
the reservation convention for TC, FR, NFR and US ids and says nothing about ERR
or EC, which is how FND-1100 got through: the two id spaces in this file have no
declared allocation rule.

## Disposition

FND-1100 and FND-1101 should be resolved before the seven analyses run —
FND-1100 because every downstream reference to an ERR code in this slice is
currently ambiguous, and FND-1101 because it decides where the guards live,
which the plan will have to task either way. The five medium findings are
matrix and consistency work that can land with the analyses' own findings. The
four low findings are recorded; FND-1107 and FND-1108 are best folded into the
EARS-conformance and dependency passes rather than fixed twice.
