---
id: SR-036
title: "Gap analysis — Plan-005 semantic IR v1.1"
type: SpecReview
analysis: gap-analysis
scope: "plan/Plan-005-semantic-ir-v1-1/, spec/tests.md, schema/semantic/v1/, fixtures/semantic/v1/, docs/semantic-data-system/contracts-v1.md, test/semantic-ir-v1-1.test.ts, test/semantic-ir-v1-1-reader.ts, tests/"
review_set: all
relationships:
  - target: "ix://agent-ix/filament-core-data/Plan-005"
    type: reviews
  - target: "ix://agent-ix/filament-core-data/TM-001"
    type: references
---
# Gap analysis — Plan-005 semantic IR v1.1

## Summary

Plan-005 (issue #34) is implemented through its automated assurance boundary:
Tasks 034–039 are done, every implementation subtask of Task-040 is checked,
all 45 issue #34 Test Matrix cases (TC-203..247) carry an exact
`/** Traces: … */` tag on a passing Vitest case, all 51 new acceptance-criterion
and constraint ids (FR-020-AC-7..8, FR-027-AC-1..9/CON-1..2,
FR-028-AC-1..13/CON-1..2, FR-029-AC-1..8/CON-1..2, FR-030-AC-1..6/CON-1..2,
NFR-013-AC-1..5) appear in at least one tag, and no schema rule, reader
diagnostic, or fixture was found without an owning FR/NFR behavior. The
remaining gaps are procedural: Task-040's closing subtask (this gate plus the
"mergeable" comment) is open by design, the matrix still marks the 45 rows
`🚧`, and `quire coverage` cannot bind this repository's tag form, so the
reconciliation below is a declared grep fallback.

Finding ids run FND-108..FND-115 as requested; the issue #34 requirement
reviews end at FND-107 and SR-035 (code review, commit `4480d60`) occupies
FND-120..FND-125, so the two ranges do not collide.

## Verdict

**CONDITIONAL** — no task is blocked, no matrix case is unbacked, and no
finding is `high`. The one open plan item is the closing subtask of Task-040
that this review is part of; the plan cannot be marked done until the
"mergeable" comment is posted and the task status, plan checkboxes, and matrix
markers are flipped (FND-108, FND-110).

## Findings

| ID | Severity | Summary | Refs | Escape Cause |
|---|---|---|---|---|
| FND-108 | medium | Task-040 is `status: in_progress` with one unchecked subtask: "Run `/code-review` and `/gap-analysis`; resolve findings; comment mergeable on the PR". SR-035 (code review) and this SR-036 now exist; the PR comment, the status flip to `done`, and the Plan-005 requirement/test-plan checkboxes remain. Not counted as a blocked task because it is the gate this document belongs to. | Task-040, Plan-005 | correct-requirement-no-evidence |
| FND-109 | medium | `quire coverage --scope . --json` binds 0 / 439 rows repo-wide (46 evidence symbols examined, 0 tagged in either language) and cannot walk the new suite at all: `test/semantic-ir-v1-1.test.ts: unbalanced braces: 3 block(s) left open`. The three open braces are the `\[\{` regex literals in the TC-247 case; the engine's brace scanner does not skip regex literals. The `/** Traces: … */` doc-comment form and the pytest `Criteria:` docstrings are likewise invisible to the binder. Reconciliation therefore ran as a grep fallback (declared under Coverage). | test/semantic-ir-v1-1.test.ts::TC-247, tests/test_semantic_ir_v1_1.py, spec/tests.md | correct-requirement-no-evidence |
| FND-110 | low | Matrix marker drift: all 45 rows TC-203..247 still read `🚧 issue #34`, and the matrix footer states the cases are "mapped and unexecuted pending implementation" / "blocked on issue #34 implementation", while every one of them passes on this branch. Plan-005 `plan.md` requirement and test-plan checkboxes are all unchecked although the Task File Mapping table says done. | spec/tests.md (rows 313–357, lines 557, 579), plan/Plan-005-semantic-ir-v1-1/plan.md | correct-requirement-no-evidence |
| FND-111 | low | Host-bound evidence: TC-242 throws when `~/.ix/filament/modules/spec-artifacts-iso/manifest.yaml` is not installed, TC-232 fails hard without the poetry environment (SR-035 FND-123), and TC-234/TC-236 diff against `origin/main`. All three pass here; CI parity for the FR-040 registry and poetry prerequisites is unverified. | TC-242, TC-232, TC-234, TC-236, FR-028-AC-12 | correct-requirement-no-evidence |
| FND-112 | low | TC-247's fixture-inventory oracle is substring matching over the serialized negative corpus (`/unit/i`, `/clause/i`, `/operation/i`, …). It proves the word occurs in `cases.json`/`reader-cases.json`, not that a recorded negative case targets that node kind; the golden-side patterns are specific. NFR-013-AC-5 is backed, but by a weak check. | TC-247, NFR-013-AC-5, test/semantic-ir-v1-1.test.ts | correct-requirement-no-evidence |
| FND-113 | low | `field.unit` is validated only as non-empty printable ASCII (schema `^[!-~]+$`; both readers: non-empty string), while FR-027 states the value SHALL be a case-sensitive UCUM unit symbol. No AC or TC states UCUM conformance, so the SHALL has no verification and the code is weaker than the prose; the TC-233 generator even emits `min` and `kg` interchangeably. Either add an AC/negative fixture or soften the FR to "UCUM by convention". | FR-027, schema/semantic/v1/semantic-ir.schema.json::$defs.field.unit, test/semantic-ir-v1-1-reader.ts::checkField | missing-requirement |
| FND-114 | low | Resolved after SR-036: the census uses portable `workspace://` repository locators; optional filesystem resolution is rooted at `FILAMENT_CENSUS_WORKSPACE_ROOT`. The suite is host-independent and passes 87 / 87. | test/contract-census.test.ts, audit/filament-contract-census/snapshot.json | applied |
| FND-115 | low | Reader diagnostics with no acceptance criterion of their own — `MISSING_MULTIPLICITY`, `UNRESOLVED_TYPE_REF`, `INVALID_UNIT`, `MISSING_SOURCE_SPAN`, `DUPLICATE_PARAM`, `DUPLICATE_IDENTITY`, `INVALID_OPERAND` — are each owned by an FR-027/FR-028/FR-029 Behavior bullet and exercised under TC-207, TC-208, TC-214, TC-221, TC-241, but only as secondary assertions inside another row's test. No unowned behavior was found; this row records where the trace is bullet-level rather than AC-level. | test/semantic-ir-v1-1-reader.ts, tests/semantic_ir_reader.py, FR-027, FR-028, FR-029 | missing-requirement |

## Coverage

- Target: `plan/Plan-005-semantic-ir-v1-1/`; specification: `spec/`; matrix:
  `spec/tests.md` (`TM-001`); identity prefix: `ix://agent-ix/filament-core-data`.
- Reconciliation: grep fallback — `quire coverage` (cli 0.31.0, engine 0.46.0)
  ran and returned `totals.backed = 0 / 439`, `authoring.tag_rate = 0 / 46`,
  and a parse diagnostic for `test/semantic-ir-v1-1.test.ts` (FND-109). That
  zero is "corpus the binder could not read", not "no tags"; every figure below
  is from the grep index of `/** Traces: … */` lines, checked by hand against
  the matrix `Traces To` column.
- Tasks done: 6 / 7. Task-040 `in_progress` with all four implementation
  subtasks checked and the review/comment subtask open (FND-108). Done tasks
  with an incomplete dependency: 0. Dependency order (034 → 035 → 036 → 038,
  035 → 037, 037 + 038 → 039 → 040) is consistent with the commit sequence
  `ecfefe8 … f272898`.
- Issue #34 Test Cases backed by an exact `TC-` tag in a passing test: 45 / 45
  (TC-203..247). Matrix-only: 0. Tag-only (a `TC-` id in a test that is not in
  the matrix): 0. Tags cited in the matrix but absent from tests: 0.
- New acceptance criteria and constraints traced by at least one tag: 51 / 51.
  Untraced: none. Six rows carry extra ids in their tag because one test
  serves two rows (TC-208+231, TC-223+230, TC-225+235); the extra ids all
  belong to the sibling row.
- US-006-EX-1..4 (illustrative) are tagged on TC-203, TC-210, TC-214, TC-220
  as the matrix records.
- Execution evidence (this host, 2026-09-03): `pnpm test` 86 / 87 passed,
  the single failure being FND-114; `test/semantic-ir-v1-1.test.ts` 45 / 45;
  `poetry run pytest -q` 4 / 4; `pnpm lint` (biome format + `tsc --noEmit`)
  clean. Marker drift against this run: 45 rows (FND-110).
- Underspecified code: 0 unowned behaviors. Every added schema path
  (`$defs.multiplicity`, `field.multiplicity/unit`, `$defs.relationship`,
  `$defs.operation`, `$defs.clause`, `typeDefinition.relationships/operations/
  clauses` with the record-only conditional, the six-variant `constraint`
  `oneOf`, the `contractVersion` enum and root `allOf` version conditionals,
  `source.dialect` `oneOf`, and the common `target`, `representationFormat`,
  `frontendDialect`, `manifestTarget` registries) maps to FR-027..FR-030
  Behavior text; the `manifestTarget = target ∪ representationFormat` union is
  the FR-030 amendment recorded in the plan log for Task-035. Every reader
  diagnostic code maps to an FR bullet (FND-115 lists the ones without an AC).
  The remaining schema diff (common, manifest, representation, target-contract,
  and the untouched parts of semantic-ir) is biome reformatting with no
  structural change; the JSON-pointer diff shows removals only where an inline
  enum became a `$ref` or `keyword: string` became the closed `oneOf`.
  Stubs / skipped cases / placeholder returns: 0.
- Fixtures: `semantic-ir-v1-1.json`, `semantic-ir-v1-1-spec-bundle.json`,
  `config-version-v1-1.json` (+ zero-loss table), `v1-fixture-digests.json`
  (Task-034 baseline), the issue #34 additions to `negative/cases.json`, `reader-cases.json`
  (cross-field negatives), and the compatibility-corpus entries including
  `v1-to-v1-1-additive-revision`. NFR-013 permitted-path guard (TC-236) is
  green over the committed diff; no `spikes/`, `src/`, generated package, or
  corpus file changed.
- Semantic review: skipped — the skill requires explicit opt-in and the
  request did not include it. SR-035 (code review) independently reviewed
  reader, fixture, and assertion meaning; SR-027..034 reviewed the
  requirements.

## Gate Closure

1. Post the "mergeable" comment on the #34 PR citing SR-035 and SR-036.
2. Set Task-040 `status: done`, check its last subtask, and check the
   Plan-005 requirement and test-plan boxes (FND-108).
3. Flip TC-203..247 from `🚧 issue #34` to the passed marker and update the
   matrix footer counts (FND-110) in the same change.
4. File the `quire coverage` regex-literal brace defect against quire-rs and
   the tag-form binding gap against this repo's module declaration (FND-109)
   so the next gap analysis can use the engine path.
