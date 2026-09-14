---
id: SR-219
title: "base review of PR 99 native fixture qualification"
type: SpecReview
analysis: base
scope: "spec/functional/FR-127, spec/functional/FR-128, spec/functional/FR-129, spec/tests.md, crates/baseline-producer/tests"
review_set: subset
---

## Summary

The current requirements, matrix, and executable producer evidence were read
together after rebasing PR 99 onto main. IDs and links validate, FR-112 through
FR-116 and FR-118 are fully source-backed, and the three extension requirements
now have concrete tests. The four evidence defects found by this review were
corrected before implementation qualification.

## Findings

| ID | Severity | Summary | Refs | Escape Cause |
| --- | --- | --- | --- | --- |
| FND-1882 | medium | The newly explicit five-dimension native-evidence boundary has no matrix row or at/one-past control yet. | FR-129-AC-13, FR-129-CON-8 | correct-requirement-no-evidence |
| FND-1883 | high | TC-1726 mutates the native digest without resealing the producer bundle, so `StaticProducerBundle::admit` returns `DIGEST_MISMATCH` for the stale outer seal before any comparison with native bytes; it does not evidence FR-129-AC-5 or AC-11. | FR-129-AC-5, FR-129-AC-11, TC-1726 | implementation-bug-despite-evidence |
| FND-1884 | medium | TC-1729 performs the same in-process admission twice but claims altered environment, working directory, wall clock, and network independence; none of those dimensions is varied by the control. | FR-129-AC-8, FR-129-CON-6, TC-1729 | correct-requirement-no-evidence |
| FND-1885 | medium | TC-1711 proves only that admission retains an authored path, including a wrong order; the real-table agreement half of FR-127-AC-12 and CON-5 must bind to the native-table qualification control instead. | FR-127-AC-12, FR-127-CON-5, TC-1711, TC-1724 | correct-requirement-no-evidence |

## Resolution

- FND-1882: FR-129 now declares all five finite input dimensions and TC-1730
  drives each dimension through the complete fixture verifier at its exact
  measured limit and one past it.
- FND-1883: TC-1726 reseals the deliberately altered bundle before fixture
  verification, then separately changes native bytes and a native export path.
- FND-1884: TC-1729 qualifies in a child process with an empty environment, a
  changed time-zone value and working directory, and on Linux an unprivileged
  network namespace.
- FND-1885: TC-1724 owns FR-127's kind-and-ordered-path agreement against the
  committed native export table; TC-1711 retains only the static-retention claim.
