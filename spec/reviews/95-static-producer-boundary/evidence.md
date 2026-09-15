---
id: SR-204
title: "Evidence review of the Producer interface 1.2.0 static boundary"
type: SpecReview
analysis: evidence
scope: "US-016, FR-112..FR-118, NFR-036"
review_set: all
---
# Evidence review

## Summary

Targeted review of the verification method authored on every obligation added by
the static-boundary increment: the acceptance criteria and constraint validation
cells of FR-112 through FR-118, and the eight measurement rows of NFR-036.
US-016 carries no obligation of its own — its acceptance examples are marked
illustrative and are correctly excluded from verification.

The deterministic half was produced by `quoin advise` over the whole spec and
read for the 43 obligations in scope. It reports exactly two formal flags there:
`FR-117-AC-6` as an authored/recommended mismatch, and all eight NFR-036 metrics
as `uncatalogued` — their `Method` cells name prose procedures rather than
declared catalog methods, so no applicability rule can be checked against them.
Every other acceptance criterion is authored `Test`, which the advisor's
recommendations agree with at the class level.

The remainder of this review is judgement, labelled as such, and it is where the
substance is. The advisor matches on statement characteristics and FR-052
property shapes; it cannot tell that an obligation's oracle lives in another
repository, that a negative existential has no observation point inside a test,
or that a metric's threshold is unreachable by the procedure authored beside it.
Seven obligations in this increment are authored `Test` where no executable test
can discharge them as written, and three NFR-036 metrics state a threshold their
own method cannot produce. None of these is a matrix gap — the matrix rows do
not exist yet by design — they are method choices that must be settled before
`spec-matrix` allocates controls, because the control a `Test` cell implies is
the wrong control in each case.

One plan-level observation, not a finding: the repository has no
`spec/evidence/suites.md`, so none of the recommended methods below has a
declared suite that can produce its evidence kind. That is a gap in the plan to
be closed at matrix time, not a defect in these artifacts.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-1740 | medium | All eight NFR-036 `Method` cells are uncatalogued prose, so no recommendation can be checked and no discharge can bind; recommend `golden-approval-testing` (M-1, M-3, M-4, M-8), `metamorphic-testing` (M-2, M-6), `sast` (M-5) and `sast` plus `runtime-monitoring` (M-7), and decline the advisor's `performance-benchmarking` on all eight — the thresholds are correctness identities, not quantified performance. | NFR-036-M-1..NFR-036-M-8 |
| FND-1741 | medium | NFR-036-M-7 targets 0 ambient reads but its method counts only non-exempt reads against a named exemption list, so the method produces a different number than the metric states and than the Statement admits — the Statement excludes ambient inputs outright and names no exemption. | NFR-036-M-7 |
| FND-1742 | medium | NFR-036-M-5 targets 0 float coercions "between parsing and serialization" by static analysis of the numeric path, but names no population for that analysis — a coercion inside a decimal or JSON dependency is outside any path the repository's own source declares, so the stated method cannot produce the stated 0. The planted-token control is the right meta-check and should be kept. | NFR-036-M-5 |
| FND-1743 | medium | FR-112-AC-1 and FR-113-AC-1 place their oracle in the consumer repository — "arrives at the consumer's `SelectedDigest`/`Revision` without a defaulted member" — which no test inside this repository can observe; recommend `contract-testing` (cross-repo-boundary) rather than the advisor's `property-based-testing`, which does not cross the boundary. | FR-112-AC-1, FR-113-AC-1 |
| FND-1744 | low | Five NFR-036 metrics state 100% or 0 without naming what is counted: M-1..M-4 and M-6 give no population or unit (runs, byte strings, documents, arrays), M-3 names no architecture set so "across host architectures" has no denominator, and M-8 measures a warm/cold cache that no scoped requirement declares as a producer input. | NFR-036-M-1..NFR-036-M-4, NFR-036-M-6, NFR-036-M-8 |
| FND-1745 | medium | Constructibility and type-shape obligations are authored as a test or a reading where a compile-time check is the only method that produces evidence: FR-117-CON-2 is authored `Test`, but a runtime test that constructs the bundle outside the entry point proves the violation rather than the property; FR-117-AC-4, FR-117-CON-1 and FR-116-CON-1 are authored `Inspection`, which discharges once and guards nothing afterwards. Recommend `compile-time-check` (a compile-fail harness plus a closed-member type) for the structural halves, retaining `Inspection` only for FR-117-AC-4's "readable without parsing prose" clause. FR-116-AC-1 is authored `Test` while the advisor itself matched `inspection (no-executable-oracle)` on it; the same compile-time member-separation check settles it. | FR-116-AC-1, FR-116-CON-1, FR-117-AC-4, FR-117-CON-1, FR-117-CON-2 |
| FND-1746 | medium | Two negative existentials are authored `Test` with no observation point inside a test: FR-118-CON-1 forbids a binary floating-point representation "at any point between parsing and serialization", and FR-117-CON-3 forbids dependence on any environment variable, working directory, wall clock or network input. Both are Analysis obligations, and NFR-036-M-5 and M-7 already author the same two properties as static analysis — the spec currently states two methods for one property each. | FR-117-CON-3, FR-118-CON-1 |
| FND-1747 | medium | Two acceptance criteria authored `Test` have no oracle as written: FR-118-AC-8 asserts that a number over a declared resource limit refuses, while FR-118's own behavior makes that refusal a `MAY`, so a conforming producer can fail the test; and FR-115-AC-3 asserts a refusal from "a projection collapsing the two endpoints' roles", but FR-115 names no projection operation in its inputs or outputs, so the test has no subject to invoke. | FR-115-AC-3, FR-118-AC-8 |
| FND-1748 | low | FR-117-AC-6 is the increment's one advisor mismatch — authored `Inspection` against a recommended `bdd-spec-by-example`/`unit-testing`. The mismatch is declined by judgement: whether producing a bundle "is not presented as campaign acceptance of any assessment claim" is a property of how a record is written, with no executable oracle, and `Inspection` is the correct catalog method. Recorded so the flag is not re-raised as a defect at matrix time. | FR-117-AC-6 |
| FND-1749 | low | Three criteria carry a bare `Test` that hides the shape-specific method the catalog would name: FR-118-AC-7 and FR-118-AC-3 are metamorphic relations between two related executions (`metamorphic-testing`), and FR-113-AC-5's "never merge" is universally quantified over value spellings, which one example cannot discharge (`property-based-testing`). The advisor's `model-checking`/`runtime-monitoring` match on FR-118-AC-7 is spurious — nothing here is temporal — and is declined. | FR-113-AC-5, FR-118-AC-3, FR-118-AC-7 |

## Verdict

**CONCERNS** — the increment's obligations are verifiable in principle and no
obligation is left without a method, but the method authored is not the method
that can discharge it in eleven places. Seven obligations are authored `Test`
where a test has no observation point, no subject, or an oracle in another
repository; three NFR-036 metrics state a threshold their own method cannot
produce; and all eight NFR-036 methods are uncatalogued prose that no tooling
can check a discharge against. These are settleable by editing `Verification`,
`Validation` and `Method` cells before `spec-matrix` allocates controls, and
none of them requires a change to a requirement statement. The missing Test
Matrix rows and the absent `spec/evidence/suites.md` are recorded as
observations only, per the increment's declared state.

## Evidence mapping

| Evidence question | Recommended method |
| --- | --- |
| Do the producer's digest and revision members satisfy the consumer's wire shapes? | `contract-testing` (FND-1743) |
| Are both digest domains and both revision namespaces non-substitutable? | `property-based-testing` over FR-112-AC-2 and FR-113-AC-2 |
| Does a bare hash or bare revision string bind anything? | `property-based-testing` over FR-112-AC-5, FR-113-AC-3 |
| Do component, endpoint and relationship records keep their members separate? | `compile-time-check` plus `property-based-testing` (FND-1745) |
| Are both relationship endpoints independent under a self-relationship? | `property-based-testing` over FR-115-AC-2 |
| Is a correspondence with a foreign, cross-bound, stale or incomplete member refused? | `property-based-testing` over FR-116-AC-2..FR-116-AC-5 |
| Can the static bundle exist without an assessment input? | `property-based-testing` over FR-117-AC-1, FR-117-AC-3 |
| Can the bundle type be constructed outside admission? | `compile-time-check` (FND-1745) |
| Does canonicalization agree on one byte string per declared value? | `metamorphic-testing` and `golden-approval-testing` (FND-1740, FND-1749) |
| Is a set array's membership distinguished from a semantic-order array's order? | `metamorphic-testing` over FR-118-AC-7 |
| Is any number represented in binary floating point on the way through? | `sast` over a declared numeric-path population, with the planted-token control (FND-1742, FND-1746) |
| Does the producer read any ambient input while canonicalizing? | `sast` plus `runtime-monitoring` over an instrumented offline run (FND-1741, FND-1746) |
| Are the emitted bytes identical across runs, processes, hosts and environments? | `golden-approval-testing` against the committed golden (FND-1740, FND-1744) |

## Dispositions

Applied in change record CR-095-1 against the orchestrator's decisions
D1..D24. A finding marked *applied* is closed by the cited decision; one
marked *carried to Plan-017* is an implementation obligation, not a spec
edit; one marked *declined* or *recorded* states why it changes nothing.

| ID | Disposition | Record |
| --- | --- | --- |
| FND-1740 | applied | D14 — every NFR-036 Method cell keeps the repository's prose phrasing and carries its catalog id parenthetically; `performance-benchmarking` is declined because the thresholds are correctness identities. |
| FND-1741 | applied | D14 — M-7's exemption list is removed, so every ambient read is counted and the method can produce its stated 0. |
| FND-1742 | applied | D14 — M-5 names its static-analysis population: the parse seam, the coefficient-and-exponent representation, the canonical serializer, and the pinned JSON parser entry point. |
| FND-1743 | applied | D14 — FR-112-AC-1 and FR-113-AC-1 are verified by `Contract` against the pinned consumer wire contract, which the AC text names as the oracle. |
| FND-1744 | applied | D14 — M-1, M-2, M-3, M-4 and M-6 declare their population and unit; M-3 names the architecture set; M-8 is dropped. |
| FND-1745 | applied | D14 — the unconstructibility and member-set-closure obligations are verified by `Compile`, the repository's own spelling for a typecheck-time method. |
| FND-1746 | applied | D14 — the negative existentials are `Analysis`, which is where the repository puts a static-analysis obligation, so one property is not claimed by two methods. |
| FND-1747 | applied | D8 and D14 — FR-118-AC-8 tests a SHALL rather than a MAY, and FR-115-AC-3 now invokes the requested endpoint projection named in FR-115's Inputs and Outputs. |
| FND-1748 | declined, recorded | `Inspection` is correct for a presentation claim with no executable oracle; recorded so the matrix pass does not re-raise it. |
| FND-1749 | applied | D14 — FR-118-AC-3 and FR-118-AC-7 are `Property`, the repository's spelling for a metamorphic or universally quantified relation. |
