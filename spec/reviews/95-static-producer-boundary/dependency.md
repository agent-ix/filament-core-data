---
id: SR-203
title: "Dependency review of the Producer interface 1.2.0 static boundary"
type: SpecReview
analysis: dependency
scope: "US-016, FR-112..FR-118, NFR-036"
review_set: all
---
# Dependency review

## Summary

Targeted review of the static-boundary prerequisite graph: the declared
`depends_on` edges of US-016 and FR-112..FR-118, the FR-106..FR-111 baseline
they build on, and the consumer wire shapes the edges presume.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-1730 | high | Every static FR reaches FR-108 population binding through FR-109/FR-110, so the declared prerequisite chain requires the assessment enablement FR-117 forbids the bundle from requiring. | FR-112, FR-113, FR-114, FR-117, FR-109, FR-110, FR-108 |
| FND-1731 | high | FR-114 and FR-115 emit namespaced revisions and four-member digest selections but declare no edge to FR-113 or FR-112; their prose attributes both member shapes to FR-109, which selects a domain and a namespace, not a shape. | FR-114, FR-115, FR-112, FR-113, FR-109 |
| FND-1732 | high | FR-112 and FR-118 are mutually prerequisite in text while the graph carries only FR-112 → FR-118; FR-112's own Inputs require the Filament Canonical JSON 1 bytes FR-118 produces, and both restate the same self-digest exclusion. | FR-112, FR-118 |
| FND-1733 | medium | FR-116 requires configuration provenance and enumerates exported relationship identities but declares no edge to FR-109 or FR-115, so FR-116 is only correctly ordered by accident of FR-117's edges. | FR-116, FR-109, FR-115, FR-117 |
| FND-1734 | medium | The FR-114 → FR-116 edge presumes a consumer carrier that the selected shapes do not provide: `Export` carries only `kind`, `path`, `locus`, and `Correspondence` carries no configuration-provenance member. | FR-116, FR-114, quire-spec-language wire.rs |
| FND-1735 | medium | Status inversion: spec.md §6 makes FR-112..FR-118 normative while FR-106..FR-111 stay provisional, yet every static FR depends on at least one provisional FR. | spec.md §6, FR-107, FR-109, FR-110 |
| FND-1736 | low | NFR-036's prose Dependencies invert its own graph: FR-118 is listed Downstream while `constrains` and the measurements make it prerequisite, and FR-112 is listed Upstream with no declared edge. | NFR-036, FR-118, FR-112 |
| FND-1737 | low | US-016 declares `depends_on` US-014 and omits US-015, while its FR prerequisites reach FR-109 (implements US-015) and FR-107 (implements US-006) and reach no FR implementing US-014. | US-016, US-015, US-014, FR-109 |

## Verdict

**CONDITIONAL** — the declared graph over FR-112..FR-118 contains no realized
cycle and its enablement layering is right in outline: FR-112 and FR-113 are
pure enablement, declaring the digest-selection and revision member shapes that
every later record carries; FR-114 is enablement for FR-115 and FR-116; FR-117
is the only user-visible feature, and NFR-036 constrains its bytes. A workable
order is FR-118 then FR-112, FR-113, then FR-114, then FR-115 and FR-116, then
FR-117, with NFR-036 measured on FR-117's output. Four edge defects block
tasking from the frontmatter as written: the FR-112/FR-118 pair is declared in
the wrong direction and is a cycle in prose (FND-1732), FR-114 and FR-115 do
not declare the two shape enablers they consume (FND-1731), FR-116 does not
declare the configuration and relationship prerequisites its own Inputs list
(FND-1733), and the whole static layer inherits an assessment prerequisite it
exists to exclude (FND-1730). None requires a new requirement; each is a
frontmatter and Dependencies-section correction, except FND-1730, which needs
the static uses of FR-109 named narrowly enough that FR-108 is not pulled in.
Observation only, not a finding: no scoped acceptance criterion yet carries a
TC reference, which the later matrix pass allocates.

## Dependency disposition

| Work | Depends on | Does not imply |
| --- | --- | --- |
| Digest selection shape (FR-112) | The canonical byte string of FR-118 and the configuration's declared normalization revision | Authority to derive `version` from the domain spelling |
| Revision selection shape (FR-113) | The configuration's explicitly declared namespace vocabulary | A default namespace for an unnamespaced value |
| Component and endpoint records (FR-114) | FR-112 and FR-113 member shapes, and FR-110's locked inventory and completeness boundary | Population binding, even though FR-110 declares FR-108 |
| Relationship records (FR-115) | FR-107's first-class endpoints, roles and multiplicities, and FR-114's identities | Any relationship instance or population member |
| Correspondence records (FR-116) | FR-112, FR-113, FR-114, plus FR-115 relationship identities and FR-109 configuration provenance | A consumer `Export` member able to carry those identities today |
| Static bundle admission (FR-117) | FR-109 static closure, FR-115 records, FR-116 correspondences | A population, window, observation, or progress record |
| Byte exactness (NFR-036) | FR-118 canonical form and FR-117 admitted bundle | Campaign acceptance of an assessment claim |
| Static boundary as a whole | The accepted baseline 1.2 producer contract | Promotion of the provisional FR-106..FR-111 prerequisites to normative |

## Dispositions

Applied in change record CR-095-1 against the orchestrator's decisions
D1..D24. A finding marked *applied* is closed by the cited decision; one
marked *carried to Plan-017* is an implementation obligation, not a spec
edit; one marked *declined* or *recorded* states why it changes nothing.

| ID | Disposition | Record |
| --- | --- | --- |
| FND-1730 | applied | D10 — FR-117-CON-4 states the static bundle consumes only the static members of the FR-109 configuration and the FR-110 inventory and reaches no FR-108 population obligation (AC-8). |
| FND-1731 | applied | D9 — FR-114 and FR-115 now declare `depends_on` FR-112 and FR-113. |
| FND-1732 | applied | D9 — the edge is reversed: FR-112 depends on FR-118, and FR-118 no longer depends on FR-112. |
| FND-1733 | applied | D9 — FR-116 declares `depends_on` FR-109 and FR-115. |
| FND-1734 | applied | D3 — see FND-1711. |
| FND-1735 | applied | D16 — the status inversion is removed; these contracts are provisional alongside FR-106..FR-111. |
| FND-1736 | applied | D9 — NFR-036's Dependencies now list FR-118 and FR-117 upstream with nothing downstream, and FR-112 is removed since it declares no edge here. |
| FND-1737 | applied | D9 — US-016 declares `depends_on` US-015. |
