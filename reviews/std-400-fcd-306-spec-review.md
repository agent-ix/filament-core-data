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

## New findings (disposition pass 1)

| ID | Severity | Summary | Refs | Escape Cause |
| --- | --- | --- | --- | --- |
| FND-004 | high | scope-narrowing: the reader refuses `ix://quire/native/Clock` as a `reference` `target` and as a constraint `appliesTo` with CLOCK_POSITION_INVALID. QSL PR 1360 FR-230 "Clock references" and QSpec PR 410 FR-154 admit `Reference<Clock>` and a clock constraint (keywords min and max), so a package with either is admitted by QSpec and QSL but its IR is refused here. This is a refusal that removes a capability the other two layers specify. | spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md:139-143; spec/functional/FR-050-validate-and-normalize-the-emitted-ir.md:107 | wrong-requirement |
| FND-005 | low | NON_CANONICAL_RATIONAL is introduced in FR-146 only; FR-050 lists the other FR-146 codes (INVALID_UNIT_GRAPH and the clock codes) in its code table but not this one. Register it there with its locus (the instance member pointer). | spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md:465 | missing-requirement |

## Dispositions

Round 1, fix head d5dc1c92. NON_CANONICAL_RATIONAL hand-derived: P tests shape only and admits `2/4`; the separate check refuses a common factor above 1 (`2/4` gcd 2, `-6/9` gcd 3), and accepts `1/1000` and `-3/2` (gcd 1). The four shape-refused forms the text lists (negative denominator, denominator 1, `0/d`, `-0`) match P rejecting `1/-2`, `1/1`, `0/5`, `-0`. Rust, TypeScript and Python (after-validator) all name the check, so AC-11 and AC-12 are now realizable.

| FND | Outcome | Reason |
| --- | --- | --- |
| FND-001 | fixed | See after_excerpt in the Linear dispositions comment. |
| FND-002 | still-open | FCD is unchanged (CLOCK_POSITION_INVALID, INVALID_CLOCK_MEMBER). QSpec 407 (12296a48) and 408 (c8b026a1) FR-154 still map CLOCK_OUTSIDE_FIELD and INVALID_CLOCK_FIELD, and QSpec 410 (da80beca) now maps INVALID_CLOCK_MEMBER but no CLOCK_POSITION_INVALID at all. The three QSpec PRs and FCD still do not agree on the clock code names. |
| FND-003 | accepted-no-change | Low and informational: the loss is stated (DECLARED_LOSS) and the fix round kept the mapping, adding the ScalarValues::Real library citation. I take the kept mapping as the intended one; the lead can overrule. |
| FND-004 | still-open | New finding of this round; see the new-findings section. |
| FND-005 | still-open | New finding of this round; code not registered in FR-050. |

Round 1 verdict: Not mergeable: FND-002 and FND-004 (high) are still-open.

## New findings (disposition pass 2)

| ID | Severity | Summary | Refs | Escape Cause |
| --- | --- | --- | --- | --- |
| FND-006 | high | the new FR-050 reader-rule row reads: a constraint whose appliesTo is Clock or an alias carries the keyword `min` or `max` -> CONSTRAINT_NOT_APPLICABLE. FR-146 and FR-146-AC-21 admit `min` and `max` on a clock constraint and refuse every OTHER keyword with CONSTRAINT_NOT_APPLICABLE. The FR-050 row refuses exactly the admitted keywords, and the table would make AC-21's accepted constraints fail. It must read "a keyword other than `min` or `max`". | spec/functional/FR-050-validate-and-normalize-the-emitted-ir.md:108 | wrong-requirement |

### Dispositions, round 2

Fix head 78884432. Hand derivation. Clock reference: a `reference` whose target is Clock or an alias resolves to no node and raises no UNRESOLVED_TYPE_REF; backends emit the identity-string reference form, no clock type. Clock constraint: `max "3"`, `max "3/2"`, `min "1"` are canonical non-negative rationals and accepted; `minLength` refuses CONSTRAINT_NOT_APPLICABLE at the keyword; `"-1"`, `"2/4"` and JSON `3` refuse INVALID_OPERAND at operands/value. Quantity constraint on ms: `"500"`, `"-3/2"`, `"5/2"` accepted; `pattern` refuses; `"2/4"`, `"1/1"`, `"1.5"`, `3` refuse. AC-24: max 500 accepts `500` and `1000/3` (333.3) and rejects `501` and `1001/2` (500.5); for `e` min 1/2 accepts `1/2` and rejects `1/3`; cross-multiplication with positive denominators preserves order. All hold. Names: final clock code in QSpec #410 is INVALID_CLOCK_MEMBER, matched by FCD; QSpec #407 (12296a48) and #408 (c8b026a1) heads still map the old names but are contained in #410, which renames them, so they must not land without it. The FR-154-AC-18 and QSL FR-230 "Clock references" citations exist. 306 contains the 305 fix commit and carries its red gate (SR-16292 FND-005).

| FND | Outcome | Reason |
| --- | --- | --- |
| FND-002 | fixed | See after_excerpt in the Linear dispositions comment. |
| FND-004 | fixed | See after_excerpt in the Linear dispositions comment. |
| FND-005 | fixed | See after_excerpt in the Linear dispositions comment. |
| FND-006 | still-open | New finding of this round; see the new-findings section. |

Round 2 verdict: Not mergeable: FND-006 (high) is still-open, and the contained #305 head is red (SR-16292 FND-005).
