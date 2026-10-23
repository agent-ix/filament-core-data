---
id: SR-16294
title: "spec-review of STD-400 clock and unit-typed members in five backends and the extraction frontend (filament-core-data PR 306)"
type: SpecReview
analysis: base
scope: "agent-ix/filament-core-data@e2f8ed62; spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md; spec/functional/FR-050-validate-and-normalize-the-emitted-ir.md; spec/functional/FR-092-resolve-type-tokens-to-declared-artifacts.md; spec/functional/FR-093-lower-field-declarations-to-ir-fields.md; spec/tests.md"
review_set: subset
relationships:
  - target: ix://agent-ix/filament-core-data/FR-146
    type: references
  - target: ix://agent-ix/filament-core-data/FR-050
    type: references
  - target: ix://agent-ix/filament-core-data/FR-092
    type: references
  - target: ix://agent-ix/filament-core-data/FR-093
    type: references
  - target: ix://agent-ix/filament-core-data/TC-1843
    type: references
  - target: ix://agent-ix/filament-core-data/TC-1856
    type: references
  - target: ix://agent-ix/filament-core-data/TC-1862
    type: references
---

# Spec review of STD-400 clock and unit-typed members in five backends and the extraction frontend (filament-core-data PR 306)

## Summary

Ticket: STD-400. One spec-review pass over the PR's own delta against PR 304 (head f773ee8b, contained). Checked: the standing no-drop/no-narrowing/no-deferral rule, testable vectors (key vectors derived by hand), id uniqueness across open PR heads, name consistency with the QSL and QSpec PRs, and mergeability.

Examined, clean:

- PR 306 contains PR 304 and 305; the review covers only the 306 delta (FR-146 positions, five-backend table, clock collections, extraction lifts, FR-050/092/093, TC-1843/1847/1849/1856-1862).
- No UNDECLARED_LOSS refusal of a clock or unit member remains; the old codes CLOCK_OUTSIDE_FIELD and INVALID_CLOCK_FIELD survive only in historical reviews/. The JSON Schema, Rust, TypeScript, Python and SysML rows each have an AC with concrete spellings, and the clock-collection forms match QSL PR 1360 (Set<Clock> as at most one element, no = over clocks, immutable Map key).
- QSL names: PR 1355 and 1360 define no FCD diagnostic codes; their FR-230 wording (time dimension, clock places) is consistent with FR-146. Ids TC-1843..1862 and FR-146-AC-11..18 are on no other open PR head.
- No deferral wording was added; the extraction-frontend resolution that needs quire-rs is covered by new ticket STD-422, which is a separate ticket, not a split of this scope.

Gate: vitest 606 passed, 53 failed (659 tests), identical to origin/main (same failing list). Environment failures only (no jsonschema or jupyter_client in the gate Python).

## Findings

| ID | Severity | Summary | Refs | Escape Cause |
| --- | --- | --- | --- | --- |
| FND-001 | high | unrealizable AC: the JSON Schema pattern P (`0`, `-?[1-9][0-9]*`, `-?[1-9][0-9]*/([2-9]\|[1-9][0-9]+)`) admits `2/4`, which has numerator 2 and denominator 4, yet FR-146-AC-11 and TC-1856 say P rejects `2/4`, and the table says P admits "exactly" the canonical strings. A regular expression cannot test that numerator and denominator are coprime. The Python backends constrained by P therefore admit non-reduced strings. Fix: drop `2/4` from the pattern vectors and state that reduction is checked by the Rust, TypeScript and Python validators only, or name a non-pattern JSON Schema mechanism. | spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md:376, :501; spec/tests.md TC-1856 | wrong-requirement |
| FND-002 | medium | name mismatch with QSpec: FCD renames CLOCK_OUTSIDE_FIELD to CLOCK_POSITION_INVALID and INVALID_CLOCK_FIELD to INVALID_CLOCK_MEMBER. QSpec PR 410 (STD-400) FR-154 uses the new names, but QSpec PRs 407 and 408 FR-154 still map the old names (4 occurrences each). The three QSpec PRs and this stack must merge together or 407/408 must be renamed. | spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md; spec/functional/FR-050-validate-and-normalize-the-emitted-ir.md | wrong-requirement |
| FND-003 | low | the SysML v2 backend maps a unit-typed member to ScalarValues::Real with one non-blocking DECLARED_LOSS naming the exact rational. This is a stated loss (FR-138 already has DECLARED_LOSS), not a refusal or deferral, so it is not scored as scope-deferral; listed so the lead can confirm it is the intended mapping. | spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md:503 | correct-requirement-no-evidence |

## Verdict

Not mergeable: FND-001 (high) block the PR.

Mergeable into origin/main (all three predecessors are ancestors, merge-tree clean). Same conflicts with open PRs 292 and 84 as PR 305.
