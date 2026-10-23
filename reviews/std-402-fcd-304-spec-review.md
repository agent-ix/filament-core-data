---
id: SR-16293
title: "spec-review of STD-402 a dimension identity carries its package identity (filament-core-data PR 304)"
type: SpecReview
analysis: base
scope: "agent-ix/filament-core-data@f773ee8b; spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md; spec/tests.md"
review_set: subset
relationships:
  - target: ix://agent-ix/filament-core-data/FR-146
    type: references
  - target: ix://agent-ix/filament-core-data/TC-1855
    type: references
---

# Spec review of STD-402 a dimension identity carries its package identity (filament-core-data PR 304)

## Summary

Ticket: STD-402. One spec-review pass over the PR's own delta against PR 305 (head adc1575c, contained). Checked: the standing no-drop/no-narrowing/no-deferral rule, testable vectors (key vectors derived by hand), id uniqueness across open PR heads, name consistency with the QSL and QSpec PRs, and mergeability.

Examined, clean:

- PR 304 contains PR 305 head adc1575c; the review covers only the 304 delta (FR-146 time-dimension wording, one bullet, FR-146-AC-10, TC-1855).
- The time-dimension wording matches QSL PR 1355 FR-230 ("the dimension of the unit of the time member ... a base dimension named Time"); the identity form ix://<package>/dimension/<name> matches FR-146 on main. QSpec FR-142 "Namespaces" exists in PR 407.
- Ids TC-1855 and FR-146-AC-10 are defined on no other open PR head.

Gate: vitest 606 passed, 53 failed (659 tests), identical to origin/main in the same environment (606/53, same failing test list). The 53 are environment failures (no jsonschema or jupyter_client in the gate Python). The documented 676/35 baseline was not reproduced here because of that environment; main shows the same set, so there is no regression.

## Findings

| ID | Severity | Summary | Refs | Escape Cause |
| --- | --- | --- | --- | --- |
| FND-001 | high | scope-narrowing: the ticket restores "resolution, identity, equality and quantity typing across packages". The PR specifies only that two documents each declaring Time are accepted, and (lead default 6 on the ticket) that a reader "compares a document's dimensions only with that document's own". Nothing says how a unit or a derived-dimension term in one package names or resolves a dimension of another package, how two package dimensions compare, or how a Quantity over one is typed; a term naming a dimension outside the document still refuses UNRESOLVED_DIMENSION_REF. This is a narrowing of the ticket scope, not an owner answer. | spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md:163-168 | missing-requirement |
| FND-002 | medium | FR-146-AC-10 and TC-1855 cannot fail against main: dimension identity already carries the package identity (FR-146 identity rule), so two Time dimensions of different packages are already accepted. The AC has no vector that distinguishes the new rule, such as a unit of one package naming the other package's dimension. | spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md:394; spec/tests.md TC-1855 | correct-requirement-no-evidence |

## Verdict

Not mergeable: FND-001 (high) block the PR.

Mergeable into origin/main (main and PR 305 are ancestors, merge-tree clean). Same conflicts with open PRs 292 and 84 as PR 305.

## New findings (disposition pass 1)

| ID | Severity | Summary | Refs | Escape Cause |
| --- | --- | --- | --- | --- |
| FND-003 | low | AC-19 says the descending pair [Time, Duration] and the pair [Time, Time] refuse INVALID_UNIT_GRAPH at /dimensions, but gives their identities no value. If the identity keeps the form for [Duration, Time], the identity rule also refuses at /identity, so the AC is not "exactly one". State the identities the vectors use. | spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md:485 | missing-requirement |

## Dispositions

Round 1, fix head 73e9dd5e. Cross-package vectors hand-derived. Equivalence classes are the components of the declared pairs; the representative is the least identity. With Length~Time~Duration~Seconds one class, Speed has map {} and Velocity {} only once Distance~Length is declared, so the stated accept and refuse outcomes hold; Dur ({Time:1}) equals Time; Speed vs Time ({} vs {rep:1}) differ and refuse. This agrees with QSpec FR-142 "Dimension equivalence": a domain package names only its own dimensions and the unit of compilation relates two packages, which is why an entry naming acme/flow Time inside the acme/rpc document is UNRESOLVED_DIMENSION_REF. No cross-package narrowing remains.

| FND | Outcome | Reason |
| --- | --- | --- |
| FND-001 | fixed | See after_excerpt in the Linear dispositions comment. |
| FND-002 | fixed | See after_excerpt in the Linear dispositions comment. |
| FND-003 | still-open | New finding of this round; the identities of the descending and equal-pair vectors are unstated. |

Round 1 verdict: Mergeable after FND-003 (low) is fixed or dispositioned.

### Dispositions, round 2

Fix head 6aa0c60a. Hand check: [Time, Duration] with identity Time-Duration passes the identity rule and fails the strictly-ascending rule at /dimensions only; [Time, Time] with identity Time-Time passes the identity rule and fails the equal-entries rule (and the ascending rule at the same pointer). Each refuses at one pointer, as stated. 304 contains the 305 fix commit, so it carries the 305 red gate (SR-16292 FND-005) and is not mergeable until that is fixed; it adds no defect of its own.

| FND | Outcome | Reason |
| --- | --- | --- |
| FND-003 | fixed | See after_excerpt in the Linear dispositions comment. |

Round 2 verdict: Not mergeable only because it contains #305 head 37e7644c (SR-16292 FND-005, high); no open finding of its own.

## New findings (disposition pass 3)

| ID | Severity | Summary | Refs | Escape Cause |
| --- | --- | --- | --- | --- |
| FND-004 | low | AC-25 says a node with no `rootScale` or with a further member is "refused as an equivalence node of another shape" and names no diagnostic code or pointer, while every other vector in the AC names both. State the code (the schema refusal the reader uses for a node of the wrong shape) and the pointer. | spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md (FR-146-AC-25) | missing-requirement |

### Dispositions, round 3

Fix head 44d745ea. The `by <ratio>` form, hand-derived. rootScale means one canonical root of the first (ascending) dimension equals rootScale roots of the second. Millis/Time "1/1000": one ms root is 1/1000 of an s root, correct. Cycle Millis, Seconds, Time with 1/1000, 1 and the reciprocal of Millis/Time (1000) multiplies to 1 and is accepted; with Seconds/Time "2" the product is 2 and it is refused at the last node. Distance/Length "1000" gives a Length root of 1/1000 of a Distance root, so Speed (Length/Time) over Velocity (Distance/Time) is 1/1000: accepted with "1/1000", refused with "1". "0" and "-1" give INVALID_UNIT_GRAPH, "1.5", "2/4" and "" give INVALID_OPERAND, 2^127 gives INTEGER_OUTSIDE_I128. All hold. Names match QSpec #407 head 29ad1f24: the `by 1 R::s = 1000 F::ms` form, the `root ratio` wording and `dimension_equivalence` `root_scale` in FR-322 (and #410 head c5d06d4b). #305 is green again.

| FND | Outcome | Reason |
| --- | --- | --- |
| FND-004 | still-open | New finding of this round; low, AC-25 gives no code for the wrong-shape equivalence node. |

Round 3 verdict: Mergeable after FND-004 (low) is fixed or dispositioned.
