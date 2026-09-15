---
id: SR-207
title: "EARS conformance review of the static producer boundary requirements"
type: SpecReview
analysis: ears-conformance
scope: "US-016, FR-112..FR-118, NFR-036"
review_set: all
---
# EARS conformance review

## Summary

144 requirement statements were read across FR-112..FR-118 and NFR-036 — 7 FR
Descriptions, the 2-paragraph NFR-036 Statement, 111 Behavior bullets, and 24
Constraints cells. The advisory grammar engine reports the set 100% clean, but
that verdict is a line-wrapping artifact for exactly one statement: the engine's
`non-singular` check is line-scoped, and FR-116 hides a genuine two-`shall`
statement inside a three-line wrap. That is the only real grammar defect; the
remaining rows are pattern-choice and subject-ownership observations.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-1770 | medium | FR-116 Behavior packs two obligations into one statement — "SHALL enumerate the exported relationship, component, and endpoint identities, and SHALL assign each export an export kind" — which cannot map onto one matrix row; split into two statements. | FR-116 |
| FND-1771 | low | The set's `8/8 docs grammar-clean` result is wrap-dependent, not defect-free: the engine's `non-singular` check evaluates a physical line, so FND-1770 is invisible while wrapped and is reported the moment the same prose sits on one line. | FR-112..FR-118, NFR-036 |
| FND-1772 | medium | FR-112 Behavior places an obligation on a foreign actor — "The consumer SHALL NOT default an absent `version`" — inside a requirement whose declared subject is the producer; the producer cannot be verified against it, so it belongs to the consumer contract or to an assumption. | FR-112 |
| FND-1773 | low | FR-117 Behavior carries three consumer-subject clauses (a native consumer completes admission from the bundle alone; a consumer reads each member directly; a consumer does not parse prose, default, or infer). They read as bundle-sufficiency assertions rather than producer obligations, and would be unambiguous as an Inputs/Constraints statement about the bundle. | FR-117 |
| FND-1774 | low | FR-116 states an unwanted input condition with the EARS optional-feature keyword — "Where a native re-encoding is presentation-only, the producer SHALL require a new native selection" — where `If … then …` is the matching pattern; contrast FR-118's correct `Where an implementation resource limit applies, the producer MAY …`. | FR-116 |
| FND-1775 | low | Eight statements name an artifact rather than an actor as the subject ("The correspondence record SHALL carry …", "The static bundle SHALL NOT require, contain, or mint …", "The revision namespace vocabulary SHALL be exactly …", "The static bundle type SHALL …", "A static admission SHALL NOT consult …"). Each is inspectable, but the enforcing actor is left unnamed. | FR-113, FR-116, FR-117 |
| FND-1776 | low | No defect found on the remaining axes: across all 144 statements there is no vague-response verb, no missing subject, no non-canonical trigger (`On`/`Upon`/`After`/`During`), and no unclassifiable `shall`; NFR-036's two-paragraph Statement is the permitted NFR dialect, and both paragraphs are singular. | FR-112..FR-118, NFR-036 |

## Verdict

**CONDITIONAL** — the normative behavior is otherwise EARS-conformant: every
statement has an identifiable subject, a concrete measurable response, and the
adverse cases are stated as explicit `If … then …` refusals rather than as
unowned passive outcomes. The single condition is FND-1770: split FR-116's
two-`shall` statement before the `spec-matrix` pass allocates TC ids, so the
enumeration obligation and the export-kind obligation each get their own row.
FND-1772 should be relocated in the same pass; the rest are cosmetic.

| Requirement | Grammar form checked |
| --- | --- |
| FR-112 | Ubiquitous `The producer SHALL emit …` plus explicit prohibitions; refusals stated as required responses, not warnings — one foreign-subject clause (FND-1772) |
| FR-113 | Ubiquitous emit/prohibit pairs over a closed namespace vocabulary; one vocabulary-subject statement (FND-1775) |
| FR-114 | Ubiquitous declare/emit/name statements plus one correct state-driven `While an inventory declares itself explicitly incomplete, …` |
| FR-115 | Ubiquitous emit/name statements with explicit `SHALL NOT` guess/reconstruct prohibitions; all singular |
| FR-116 | Five `If … then …` unwanted-condition statements, correctly patterned; one non-singular statement (FND-1770), one `Where` used for a condition (FND-1774) |
| FR-117 | Two `If … then …` refusals plus ubiquitous bundle obligations; three consumer-subject clauses (FND-1773) |
| FR-118 | Ubiquitous canonicalization statements with one correct optional-feature `Where … MAY refuse`; all singular |
| NFR-036 | Trigger-free NFR statement in two singular paragraphs — positive obligation and ambient-input exclusion |

## Evidence

- `quire validate --scope /home/peter/dev/filament-core-data "spec/functional/FR-11[2-8]-*.md" "spec/non-functional/NFR-036-*.md" --summary` →
  `8/8 docs grammar-clean (100%); 0 grammar finding(s): none`. `--strict` also
  exits clean, so EARS would not gate this set today.
- Re-running the same command over a scratch copy of `spec/` in which every
  wrapped body statement in the eight files is joined onto one line →
  `7/8 docs grammar-clean (87%); 1 grammar finding(s): ears:non-singular=1`,
  naming the FR-116 statement of FND-1770. The sweep surfaces that one statement
  and no other, which both confirms FND-1770 is a real defect rather than a
  formatting complaint and bounds the wrap artifact to a single statement.
- Re-wrapping FR-116's two already-unwrapped long `If … then …` bullets onto
  80-column lines changes no diagnostic; those long lines are a formatting
  inconsistency with no grammar consequence and are not reported as findings.
- The six `DuplicateArchetype`/`DuplicateInverseEdge` module-catalog notices
  this repo always prints are excluded.

## Dispositions

Applied in change record CR-095-1 against the orchestrator's decisions
D1..D24. A finding marked *applied* is closed by the cited decision; one
marked *carried to Plan-017* is an implementation obligation, not a spec
edit; one marked *declined* or *recorded* states why it changes nothing.

| ID | Disposition | Record |
| --- | --- | --- |
| FND-1770 | applied | D14 — FR-116's two-obligation statement is split into one statement per obligation. |
| FND-1771 | recorded | Measurement note: the engine's non-singular check is line-scoped. Every Behavior bullet and Constraints cell in the scoped set was re-checked unwrapped after the apply pass and carries exactly one SHALL. |
| FND-1772 | applied | D11 — see FND-1706. |
| FND-1773 | applied | D11 — FR-117's three consumer-subject clauses are replaced by producer-side counterparts. |
| FND-1774 | applied | D14 — FR-116's optional-feature `Where …` becomes `If … then …` for the unwanted condition. |
| FND-1775 | applied | D14 and D8 — each artifact-subject statement is rewritten with the producer as named actor, FR-113-CON-1 included. |
| FND-1776 | no action | No defect found on the remaining axes across the counted statement population. |
