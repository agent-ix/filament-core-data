---
id: SR-208
title: "Composite index of the Producer interface 1.2.0 static-boundary review"
type: SpecReview
analysis: base
scope: "SR-200..SR-207"
review_set: all
---
# Composite review index

## Summary

One index over the eight analyses run against the static producer-boundary
increment at `f4427fe`, and over change record CR-095-1, which applied their
findings. The increment was read against the native consumer contract in
`ix://agent-ix/quire-spec-language`, file `src/protocol_artifact/wire.rs`, pinned
at `72507f856457ba0922719bd5d9f5cadcce4058cd`; that contract is assumed here and
owned there.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-1780 | high | The increment specified one side of an interface edge without specifying the other. Three separately reported defects — an unowned assessment-kind export, two colliding dispositions for one incomplete inventory, and an overloaded closure vocabulary — are one design defect reported through three lenses, and it is closed only for the static half. | SR-201, SR-202, SR-206, FND-1713, FND-1727, FND-1763 |
| FND-1781 | medium | Review breadth exceeded the design batch. Eight analyses over a 953-line, seven-requirement slice returned 73 findings concentrated on roughly a dozen distinct defects; a base review plus the failure-domain and scope-boundary axes would have found the same design defect at a fraction of the cost. | SR-200..SR-207 |

## Verdict

**CONDITIONAL** — every one of the 73 findings is dispositioned in its own
analysis file, and CR-095-1 applied all of them that are spec defects. Four are
carried to Plan-017 as implementation obligations (FND-1750, FND-1756, FND-1767,
and the apparatus half of FND-1716), three are declined on measurement or
correctness grounds (FND-1748, FND-1752's branch-volatility half, and FND-1709's
section-5 accretion), and three record an observation with no action (FND-1769,
FND-1771, FND-1776). The condition that remains is FND-1780: the static boundary
is now internally sound and its edge to the assessment half is still one-sided,
so the assessment half of the producer interface is designed next, before any
implementation, and reviewed with the static half as one set.

## Checks

| Check | Result |
| --- | --- |
| Analyses run | base SR-200, failure-domain SR-201, integrity SR-202, dependency SR-203, evidence SR-204, risk-complexity SR-205, scope-boundary SR-206, ears-conformance SR-207 |
| Verdicts | SR-205 PASS with managed implementation risk; SR-204 CONCERNS; the other six CONDITIONAL |
| Findings | 73 across FND-1700..FND-1776, of which 12 high; every id inside its analysis's reserved block and unique in the repository |
| Dispositions | 73 of 73 recorded, each in the analysis file that raised it, against decisions D1..D24 |
| Carried to implementation | FND-1750 exact-decimal parse seam, FND-1756 and FND-1767 the NFR-036 gate apparatus, FND-1716's architecture-refusal apparatus |
| Consumer contract | named and pinned in every requirement claiming a member-for-member mapping; verified present on the consumer's merged `main` at the pinned revision |
| Adverse-axis ownership | each of the eight axes owned by exactly one requirement and carried as one single-axis criterion, unchanged by the apply pass |
| Status truthfulness | FR-112..FR-118 and NFR-036 labelled provisional; no implementation result claimed; producing a static bundle is stated not to be acceptance of an assessment claim |
| Scoped `quire validate` | clean over every scoped requirement and every review artifact; the six standing module-catalog notices are not findings |
| Test Matrix coverage | no TC rows yet; the matrix pass follows the completed design, not this slice |

## Coverage rules

1. Coverage: every acceptance criterion and constraint in the scoped set is stated in a form a test case can bind; none is bound yet, and FR-118-AC-8 became bindable once its refusal stopped being a `MAY`.
2. Options: both digest domains with their declared versions, both revision namespaces, the closed-versus-declared-incomplete inventory, and the `1`/`1.0`/`1e0` decimal forms are the enumerated alternatives to permute.
3. Boundaries: the adjacent 2^53 integers, the absent and the unselected digest version, the undeclared revision namespace, the declared coefficient-digit and exponent-magnitude limits, and a locus with no formal document revision.
4. Errors: every refusal is blocking and explicitly not a warning, a cache miss, or a refetch invitation; a refused admission yields no value of the admitted type.
5. State: static admission is separated from assessment in both directions — no static member reaches an assessment input, and an assessment-kind export in a static bundle refuses.
6. Edges: the self-relationship whose endpoints share one type identity, four coinciding display names across repository, component, role and endpoint, the presentation-only native re-encoding, equal hash text across two digest domains, and one `value` spelling under two revision namespaces.
7. Atomicity caveat retained from SR-200: FR-114-AC-1, FR-115-AC-1, FR-116-AC-3 and FR-117-AC-1 each conjoin several independent assertions, so the matrix pass binds more than one test case to each rather than one.
