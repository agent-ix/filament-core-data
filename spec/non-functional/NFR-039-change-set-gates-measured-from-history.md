---
id: NFR-039
title: "Change-set gates measured from history"
type: NFR
relationships:
  - target: "ix://agent-ix/filament-core-data/NFR-021"
    type: "depends_on"
---
# NFR-039: Change-set gates measured from history

## Statement

Every gate that asserts a property of a change's own path set SHALL resolve both
ends of that set from history, so the gate answers the same question before and
after the change merges and never annexes a later change's paths.

## Scope

- Applies to: every non-disruption gate in this repository — the permitted and
  prohibited path assertions of NFR-021, NFR-023, NFR-025, NFR-027, NFR-030 and
  NFR-032, and any gate added later that asserts over "this change's paths".
- Applies to: gates written in TypeScript, in Rust, and in the harness scripts
  those suites drive. The defect is in what a gate names, not in the language it
  is written in, and it has now appeared in all three.
- Out of scope: whether the per-ticket path lists should exist at all. Retiring
  them is issue #92's question; this requirement governs the ones that remain
  and the ones written before it is answered.

## Rationale

This requirement answers [filament-core-data#51](https://github.com/agent-ix/filament-core-data/issues/51), which records
the non-disruption suites baselining their gates on a moving trunk.

A merged change's path set is a fixed historical fact. Encoding it as a live
computation against a moving reference degrades in four distinct ways, and this
repository has now been dragged back by every one of them:

- a **negative prohibition** over a range that empties on merge passes vacuously
  — the gate does not go red, it goes quiet, and a green suite is then evidence
  of nothing;
- a **positive assertion** over that same empty range fails immediately, on a
  branch that did nothing wrong;
- a **baseline read from the trunk at run time** compares the branch to itself;
- a range **fixed at its base but open at its head** annexes every later
  ticket's work and then fails the earlier ticket for it.

Issue #20 found a fifth: a *tree* diff over a range annexes the trunk when the
branch merged it. A sixth is recorded here, because it is the one a range fix
alone does not catch — a gate may pin its range correctly and still compare the
historical hunk against the **working tree**, which silently converts "this is
what the change did" into "no later ticket may edit these lines".

The cost is not theoretical. Six gates were repaired in one sitting, across two
languages, each red or vacuous for a reason unrelated to the change under test:
two suites resolving `main...HEAD`, one resolving `merge-base HEAD main`, one
comparing a frozen hunk to the working tree, and one reading a directory that no
commit contains. A gate that reds for an unrelated reason trains its readers to
discount it, which costs more than the gate was ever worth.

Sentinels are the mechanism because they are the only identifier a change owns
that survives its own merge. A ref moves; a branch name is deleted; a commit is
rewritten by a squash. An artifact the change created is in history at exactly
one commit, before and after.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|--------|--------|-----------|--------|
| Change-set gates resolving a moving ref | 0 | 0 | Analysis |
| Change-set gates comparing a historical fact to the working tree | 0 | 0 | Analysis |
| Change-set gates that pass over an empty set | 0 | 0 | Analysis |
| Gates failing on a clean checkout for a reason outside the change | 0 | 0 | Test |
| Languages in which the shared range helper is reimplemented | 0 | 0 | Inspection |

## Verification

Read every non-disruption gate and confirm it names no moving reference —
`main`, `origin/main`, `HEAD` as a range end, or `merge-base` against any of
them — and that both ends come from the shared helper. Confirm each gate's
declared sentinels are present in history, and that a gate whose sentinels are
absent fails saying it could not locate its range rather than passing over an
empty set.

Falsify the annexation metric by landing an unrelated commit that touches a path
the gate prohibits, and confirm the gate still passes: the later commit is
outside the range. Falsify the vacuity metric by removing a sentinel from
history and confirming the gate fails loudly.

Confirm no suite reimplements sentinel resolution: the helper is imported, so a
correction lands once rather than five times.

## Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| NFR-039-AC-1 | No change-set gate resolves a range end against `main`, `origin/main`, or `HEAD` | Analysis |
| NFR-039-AC-2 | A gate whose sentinels are absent from history fails naming what it could not locate, and never passes over an empty set | Test |
| NFR-039-AC-3 | A commit landing after a change's range does not enter that change's path set, even when it touches a prohibited path | Test |
| NFR-039-AC-4 | A gate that compares a historical hunk reads the other side at that hunk's own commit, so editing those lines in a later change leaves the gate green | Analysis |
| NFR-039-AC-5 | Sentinel resolution is implemented once and imported by every suite that needs it, in every language | Inspection |
| NFR-039-AC-6 | Every gate in scope passes on a clean checkout with no repository state beyond the commit under test | Test |

## Dependencies

- **Upstream**: [NFR-021](./NFR-021-non-disruptive-compiler-core.md), the first of the per-ticket non-disruption requirements
- **Downstream**: issue #92, which asks whether the per-ticket path lists should be retired; this requirement governs those that remain either way
