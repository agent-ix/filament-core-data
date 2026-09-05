---
id: SR-140
title: "Base review of the semantic kernel packages"
type: SpecReview
analysis: base
scope: "US-014, FR-081..090, NFR-028..030, spec/tests.md TC-1000..1108"
review_set: all
---
# Base specification review

## Summary

One user story, ten functional requirements, three non-functional
requirements, 312 acceptance criteria and constraints, and 109 test cases for
generating the semantic kernel as Rust, TypeScript and Python packages plus
modular JSON Schema.

## Verdict

**CONDITIONAL** — coverage is total and the id discipline is sound, but the
matrix cannot be called complete while SR-142's twelve non-singular statements
stand.

## Findings

| ID      | Severity | Summary                                                     | Refs                  |
| ------- | -------- | ----------------------------------------------------------- | --------------------- |
| FND-1310 | low     | Coverage is 312/312 criteria across 109 test cases, verified by set comparison rather than asserted | spec/tests.md |
| FND-1311 | low     | Every id comes from this issue's reserved range, not from a scan of the current maximum | US-014, FR-081..090, NFR-028..030, TC-1000..1108 |
| FND-1312 | medium  | Every matrix row is `🚧 planned`; none may move to `✅` before its test exists | spec/tests.md TC-1000..1108 |

## The six coverage rules

1. **Coverage** — 312 of 312 criteria carry at least one test case, measured by
   comparing the criterion set against the union of the `Traces To` cells.
2. **Option permutation** — the three language targets and the JSON Schema
   target are each covered by their own requirement (FR-085..088) rather than
   by one parameterised row.
3. **Constraint boundary** — the prohibited-path constraints are `Static` rows;
   the pinned-version constraints are `Snapshot`.
4. **Error path** — refusal behaviour is FR-084's own requirement, with the
   closed diagnostic set as its subject.
5. **State transition** — not applicable; the generator has no state machine.
6. **Edge case** — anonymous constructs (FR-083) and unrepresentable constructs
   (FR-084) are the declared edges.

## Id discipline

Ids were **reserved before authoring**, not scanned. Scanning is what let
issues #21 and #22 both allocate `ERR-114..131` on 2026-09-04: both read the
real maximum `ERR-113` and continued from it, correctly, and still collided
because they ran concurrently and neither could see the other. A scan is
sufficient only when nothing else is in flight.

## Status markers

No row uses `⚠️`. It is not in the `TestMatrix` Status pattern, and it was
retired because rows carrying it were exempt from the status-lie check by
construction (quire-rs CR-083).
