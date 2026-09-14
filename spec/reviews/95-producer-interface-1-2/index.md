---
id: SR-213
title: "Composite index of the Producer interface 1.2.0 review"
type: SpecReview
analysis: base
scope: "SR-209..SR-212"
review_set: subset
---
# Composite review index

## Summary

One index over the four analyses run against the complete Producer interface
1.2.0 at `7d84b2a` — both halves reviewed as one design — and over change record
CR-095-2, which applied their findings.

Breadth was chosen for the batch rather than from the repository's standing
marker: four analyses over fifteen requirements, where the preceding static-only
slice had used eight over seven. The earlier pass returned 73 findings
concentrated on about a dozen distinct defects; this pass returned 73 findings on
a design twice the size, of which more than forty are cross-half defects that
were invisible while each half was read alone. That is the measurement behind
SR-208's FND-1781 and behind designing the whole interface before implementing
any of it.

The consumer contract is assumed and pinned at
`72507f856457ba0922719bd5d9f5cadcce4058cd` in
`ix://agent-ix/quire-spec-language`, file `src/protocol_artifact/wire.rs`.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-1880 | high | Two members the interface needs are absent from the consumer's own closed vocabularies: no artifact kind admits a population document, and no export, artifact or binding kind carries a `window` member. Only the consumer can add them. The design routes around both — a window is supplied against the `clock` binding requirement and a population document is named by identity and canonical digest selection — so this is an open cross-repo item, not an open defect in this interface. | FR-119, FR-124, FND-1812, FND-1862 |
| FND-1881 | medium | Three defects the review exposed were introduced by the previous apply pass rather than by the original authoring: the "exactly nine member classes" closure, the obligation to author a consumer-assigned index, and a typed dependency edge removed without replacement. An apply pass does not verify itself, and each was reported by two or more analyses before it was seen. | FND-1800, FND-1805, FND-1818 |

## Verdict

**PASS** — every one of the 73 findings is dispositioned in the analysis file
that raised it, and CR-095-2 applied all of them but three: FND-1829 is declined
on measurement, FND-1858 is recorded, and FND-1874 is an observation. No finding
is carried to implementation from this pass, and no internal defect is left open.

Two gates named in `spec.md` §6 have not passed and this verdict does not claim
them. The Test Matrix allocates no row against any criterion in this range, and
no implementation evidence exists: the shipped `crates/baseline-producer`
contradicts this design in every respect the review recorded as Plan-017 work.
FND-1880 is an external dependency on the consumer's repository, and the
interface is specified to work without it.

## Checks

| Check | Result |
| --- | --- |
| Analyses run | base SR-209, failure-domain SR-210, integrity SR-211, scope-boundary SR-212 |
| Verdicts | all four CONDITIONAL before the apply pass |
| Findings | 73 across FND-1800..FND-1874, of which 25 high and more than forty cross-half; every id inside its analysis's reserved block and unique in the repository |
| Dispositions | 73 of 73 recorded against decisions E1..E14 |
| Static/assessment split | holds in both directions: a static link requires no observation, and an assessment-side export kind in a static bundle refuses |
| One owner per obligation | every restatement across the halves became a citation; FR-108, FR-110, FR-111, FR-116, FR-117, FR-120 and FR-126 each named as sole owner of what they own |
| Consumer vocabularies | three distinct closed vocabularies, 49 spellings, 7 in more than one, none in all three; cited by reference throughout and transcribed nowhere; the producer mints no kind vocabulary of its own |
| Four versions | interface version, model revision, digest domain version and wire schema identity each carry their own declared member and never substitute for one another |
| Producer role | the producer declares availability and asserts no truth disposition in any emitted member, so the §6 status statement is true rather than false |
| Scoped `quire validate` | clean over every requirement in scope and every review artifact; the six standing module-catalog notices are not findings |
| Test Matrix coverage | no row allocated; one matrix pass follows this review |

## Coverage rules

1. Coverage: every acceptance criterion and constraint across the fifteen requirements is stated in a form a test case can bind, and none is bound yet.
2. Options: both digest domains and their versions, both revision namespaces, the three clock families, the closed and the declared-incomplete inventory, the closed and open world, and the lossless and lossy projection are the enumerated alternatives to permute.
3. Boundaries: the adjacent 2^53 integers, a rational period of one third, a zero and a negative denominator, the declared coefficient-digit and exponent-magnitude limits, the declared byte, depth and member-count bounds, and the half-open ends of each clock family's coverage.
4. Errors: every refusal is blocking and named; a refused admission yields no value of the admitted type on either side of the interface.
5. State: static admission never requires an assessment input; re-admission over different bytes is a different bundle and a prior binding refuses as stale rather than following the identity forward.
6. Edges: a self-relationship sharing one type identity, four coinciding display names, a presentation-only native re-encoding, equal hash text across two digest domains, one revision value under two namespaces, two observations of one object, and two availability facts naming one observation record.
7. Atomicity caveat carried forward from SR-200 and extended: the compound criteria in FR-114, FR-115, FR-116, FR-117, FR-119, FR-122 and FR-124 each bind more than one test case at matrix time rather than one.
