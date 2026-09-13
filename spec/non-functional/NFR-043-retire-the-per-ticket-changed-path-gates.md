---
id: NFR-043
title: "Retire the per-ticket changed-path gates"
type: NFR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-009"
    type: "traces_to"
  - target: "ix://agent-ix/filament-core-data/NFR-039"
    type: "depends_on"
---
# NFR-043: Retire the per-ticket changed-path gates

## Statement

No gate SHALL assert over the path set of its own change. This retirement SHALL
remove the per-ticket changed-path measurements, their sentinel rules and their
harness verbs, and SHALL retain the properties those requirements state
independently of a path range.

## Scope

- Applies to: the changed-path measurement of every non-disruption requirement
  that carries one, and the suites and harness verbs implementing them.
- Applies to: the matrix rows and review dispositions that cite those
  measurements.
- Retained, not removed: the prohibited-path lists as review guidance, the
  zero-publication property, the unchanged package surface property, and the
  revert rehearsal where a reviewer asks for one. These state real properties and
  do not depend on a path range.
- Out of scope: the general rule for any gate that survives. That is stated by
  NFR-039 and is unchanged by this retirement.

## Rationale

This requirement answers [filament-core-data#92](https://github.com/agent-ix/filament-core-data/issues/92).

The owner ruled that these gates duplicate what the squash-merged diff already
records and protect nothing a reviewer does not already see. The evidence for
that ruling is the repair history: six gates were repaired in one sitting across
two languages, every one of them red or vacuous for a reason unrelated to the
change under test, and each repair restored a gate whose entire output a reader
could obtain by looking at the diff.

The cost is asymmetric and that is what settles it. A gate of this family is
correct only while its range is correct, and its range degrades on merge in at
least six distinct ways this repository has now observed. The benefit is a
restatement of a diff. Keeping it means paying the repair cost indefinitely for
a report the reviewer already has.

Retiring a gate is not the same as retiring the property it was attached to, and
conflating the two is how a retirement becomes a regression. The requirements
these measurements sit inside also state that nothing is published, that a
package surface is unchanged, and that a removal can be reverted. Those survive
intact; only the assertion over a path range goes.

The retirement is itself a change whose gates must not be widened to accommodate
it. Removing a measurement is permitted here because this requirement removes
it; adding a path to a surviving list to make a suite pass is the annexation
failure this family exists to record, and remains prohibited.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|--------|--------|-----------|--------|
| Gates asserting over their own change's path set | 0 | 0 | Analysis |
| Harness verbs computing a changed-path range | 0 | 0 | Inspection |
| Retained properties lost in the retirement | 0 | 0 | Inspection |
| Matrix rows and review dispositions left citing a removed measurement | 0 | 0 | Inspection |
| Entries added to a surviving permitted-path list | 0 | 0 | Inspection |

## Verification

Search the suites and harness scripts for a range computation against a branch,
a trunk reference, or a merge base, and observe none remains. Read each affected
requirement and observe every property it stated other than the path assertion
is still stated and still verified by a case.

Read the matrix and the review dispositions and observe no row cites a removed
measurement as its evidence. Compare each surviving permitted-path list against
its state before the retirement and observe it gained no entry.

## Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| NFR-043-AC-1 | No suite, crate test or harness script computes a changed-path range | Analysis |
| NFR-043-AC-2 | Every affected requirement retains and verifies each property it stated other than the path assertion | Inspection |
| NFR-043-AC-3 | The prohibited-path lists remain as review guidance and are not verified by a gate | Inspection |
| NFR-043-AC-4 | No matrix row or review disposition cites a removed measurement as its evidence | Inspection |
| NFR-043-AC-5 | No surviving permitted-path list gains an entry as part of the retirement | Inspection |
| NFR-043-AC-6 | The zero-publication and unchanged-surface properties are each still verified by at least one case | Test |

## Dependencies

- **Upstream**: [NFR-039](./NFR-039-change-set-gates-measured-from-history.md), which governs any gate of this family that survives
- **Downstream**: every non-disruption bundle, each of which loses a measurement and keeps its properties
