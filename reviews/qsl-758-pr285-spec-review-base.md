---
id: SR-11094
title: "Spec review of filament-core-data PR #285: FR-039, TC-626, ERR-111 after removing the committed coverage report"
type: SpecReview
analysis: base
scope: "agent-ix/filament-core-data@5bb41bb199be40a5101a7d6efbb06274c13638b8; PR #285 spec/functional/FR-039-account-for-corpus-coverage-and-import.md, spec/tests.md; context FR-059, FR-070, FR-090; QSL-758 AC walk"
review_set: subset
---
# Spec review of filament-core-data PR #285

## Summary

Ticket: QSL-758. Manual AC walk plus a spec-consistency read.
`quire validate --scope .` over FR-039 and `spec/tests.md` exits 0 (one
warning, below). No dangling ids: `FR-039-CON-1` and `ERR-111` have no
remaining reference outside `plan/` and `reviews/`.

Examined:
- FR-039 Outputs and Behavior: the account is now "the `coverage` account in
  the harness report", computed every run and never read from a stored file.
  Determinism, per-row counts, unmet rows and unmet areas are all kept; only
  the compare-to-committed obligation goes (clean, no requirement content lost
  beyond the tracking step).
- FR-039-AC-1 and TC-626 agree ("adding a case raises `totalCases` by one");
  the version-evolution row for corpus `1.x.y` agrees (clean).
- ERR-111 ("`coverage.json` is hand-edited") is removed with its subject
  (clean).
- QSL-758 AC-1 (not committed; gate leaves tree clean): met; no writer
  remains (clean).
- QSL-758 AC-2 (no byte pins; generator behaviour tested): met in FR-039 and
  its tests (clean); not met across the spec, see FND-001.
- QSL-758 AC-3 (gate passes; nothing regenerates and re-commits): code met;
  FR-070's Accounting still instructs re-commit, see FND-001.
- FR-059-CON-2 / FR-059-AC-12 / TC-709: a change-set constraint scoped "for
  this branch" naming `coverage.json` as a changed path. Delivered branch
  history (the `rust-backend` slot is `available`); read as context.
- FR-090-CON-2 / FR-090-AC-10: list `coverage.json` among files a parity run
  must leave unchanged; now vacuous for that one name, harmless.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | medium | FR-070-AC-8 still pins the committed `conformance/coverage.json` byte for byte, and FR-070 Accounting still says it "SHALL be regenerated and committed"; TC-821 traces it. The file no longer exists and FR-039 now forbids reading the account from a stored file, so this is a live criterion over a deleted artifact, not history. | spec/functional/FR-070-run-the-typescript-conformance-adapter.md:131-135, :168; spec/tests.md:697 |

## Verdict

**FINDINGS (1 medium).** FR-039, TC-626 and the ERR table are consistent with
each other and with the code. FR-070 is a requirement, not a dated record:
its AC-8 first clause restates the byte pin this PR removes from FR-039-AC-1,
and its Accounting bullets tell the next author to regenerate and commit the
report, which would re-create the tracking QSL-758 deletes. The PR body calls
FR-070 "history". Fix: drop the byte-for-byte clause and the "regenerated and
committed" / "regenerated from the rebased tree" wording for `coverage.json`
in FR-070, state the slot delta against the run report's coverage account,
and update TC-821's text to match. FR-059-CON-2/AC-12 can stay as branch
history or drop the `coverage.json` path in the same edit.

Recorded, not blocking:
- low: FR-039 line 37 ("SHALL compute ... and SHALL NOT read ...") trips
  `[ears:non-singular]`; split into two statements.
- low: FR-090-CON-2 / FR-090-AC-10 still list `conformance/coverage.json`.
