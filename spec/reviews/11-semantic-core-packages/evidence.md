---
id: SR-147
title: "Evidence review of the semantic kernel packages"
type: SpecReview
analysis: evidence
scope: "US-014, FR-081..090, NFR-028..030, spec/tests.md TC-1000..1108"
review_set: all
---
# Evidence review

## Summary

All 109 test cases are automated. The type distribution is `Property` 42,
`Snapshot` 24, `Static` 23, `Unit` 19, `Compile` 1. There are **no `Manual` and
no `Analysis` rows at all**.

## Verdict

**CONDITIONAL** — the evidence is strong where it exists, and one obligation
that only a human can discharge is currently claimed by no row.

## Findings

| ID      | Severity | Summary                                                     | Refs                  |
| ------- | -------- | ----------------------------------------------------------- | --------------------- |
| FND-1330 | medium  | No row is `Manual`, yet the deliverable is gated on a human sign-off; the acceptance that the packages are fit to publish is evidence nothing collects | agent-ix/quoin#290, spec/tests.md |
| FND-1331 | low     | 24 `Snapshot` rows assert byte-identity, which is the strongest available evidence for a determinism claim and the right choice for NFR-028 | NFR-028, TC rows typed Snapshot |
| FND-1332 | low     | 42 `Property` rows quantify over inputs rather than witnessing one example, matching criteria that say "every" or "any" | FR-082, FR-090 |
| FND-1333 | medium  | Cross-language agreement (FR-090) is evidenced by rows in this repository only; no consumer outside it exercises the published surface | FR-089, FR-090 |

## Why the absent `Manual` row matters

Issue #23 carries TC-944, a `Manual` row for four obligations no automated
check can discharge — that a version bump re-runs the qualification, that probe
expectations are derived from the contract rather than from what the code
rejects. That row is currently `🚧 awaiting the program owner's review`, which
is the honest state.

This issue has no equivalent, and it has the same shape of obligation: whether
these packages are fit to publish is exactly the judgement `quoin#290` exists
to take. A specification that leaves it to no row is not claiming it is
satisfied — it is not claiming it at all, which is how an obligation
disappears between a tool and a person.

## Evidence that would be weak if claimed

Nothing in this specification claims field-level semantic conformance. The
extraction surface does not exist (`agent-ix/quire-rs#392`), and the corpus
measurement records that dimension as `could-not-run` for every document
rather than as a pass. The same restraint applies here: a package that
round-trips its own fixtures has not been shown to agree with the engine.
