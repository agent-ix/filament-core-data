---
id: SR-211
title: "Integrity review of the complete Producer interface 1.2.0"
type: SpecReview
analysis: integrity
scope: "US-016, US-017, FR-112..FR-126, NFR-036, NFR-037"
review_set: subset
---
# Integrity review

## Summary

The traceability chain is complete on both sides. US-016 and US-017 each carry a
`traces_to` edge to StR-001, every one of FR-112..FR-118 carries an `implements`
edge to US-016 and every one of FR-119..FR-126 to US-017, NFR-036 `constrains`
FR-117 and FR-118 and NFR-037 `constrains` FR-119 and FR-121, and every
acceptance criterion and every constraint in all fifteen requirements names a
declared verification method. The `depends_on` graph over FR-106..FR-126 is
acyclic; the assessment half layers strictly on FR-119 and FR-120, which layer on
FR-117 and on FR-112/FR-113. TC ids are deliberately unallocated at this stage,
so Verification cells carry bare method words; that is recorded as an observation.
No atomicity defect was found: each of the fifteen requirements states one
obligation class, and every criterion is externally observable at the producer's
emitted bytes, its emitted documents, or its refusals.

The set is not yet single-interpretation, and the defects concentrate exactly at
the join. Five highs are cross-half. The binding key the assessment half is built
on does not exist in the static half: FR-120 names a static bundle by *that
bundle's* identity and canonical digest selection, and FR-117-CON-1 closes the
static bundle at exactly nine member classes that include neither a bundle
identity nor a bundle digest, so the member FR-120-AC-2 compares against cannot
be added without violating the closure that FND-1720 was fixed to establish. The
same closure collides with FR-126, which requires an authored three-component
interface-version member on every emitted document, static and assessment alike:
a tenth class the closure prohibits, reachable on the static side only through
the consumer-assigned `ProducerObject.interface` `u32` that FR-116-CON-5 forbids
the producer to assign. FR-120-AC-4 and FR-121-AC-3 refuse a foreign *object* or
*type* identity by resolving it against "the exports of the named static bundle",
but the static half declares export records and export mappings for components,
endpoints and relationships only, so the export set those two refusals are
measured against is undeclared. FR-124 obligates one export mapping per exported
population, snapshot, window and observation-record identity while FR-124-CON-2
requires every `exportKind` to come from the consumer's closed vocabulary, which
carries `population` but no `snapshot`, `window` or `observation` kind at all —
those two are `ArtifactKind` members, not `ExportKind` members. And every
assessment document carries a four-member canonical digest computed by FR-118
over canonical bytes, while NFR-036's Scope excludes populations, snapshots,
windows and observations by name and NFR-037 measures only the admit-versus-refuse
decision, so nothing in the set holds an assessment document's canonical bytes or
its digest reproducible — which is NFR-036's own definition of a digest that is
not a binding.

Thirteen mediums are duplicated ownership, undecided authority, or an obligation
owned by nothing. FR-116 and FR-124 own the same eleven correspondence members
and the same five refusals, and FR-116's own subject line reaches assessment
objects because FR-119 emits them as producer objects; the static/assessment
`population` partition has two named owners, FR-117 per FR-116 and FR-120 per
FR-124; FR-119-AC-2 and FR-119-AC-3 re-own three refusals that FR-112-AC-2,
FR-112-AC-4 and FR-113-AC-4 already own, against FR-119-CON-4's own claim to
restate neither vocabulary; FR-121, FR-122 and FR-123 restate FR-108's five
acceptance criteria that their own constraints say they only cite, leaving
FR-108-AC-4's membership-versus-coverage axis with three owners; FR-125 re-owns
FR-106's projection refusal and, in CON-5, the unknown-interface-version refusal
its own Dependencies assign to FR-126; FR-119 names a provenance locus, an
ownership member and a membership member that its own four-member closure does
not carry and no refusal covers; an assessment relationship instance's endpoint
identity has three candidate resolution scopes across FR-121, FR-120 and FR-115
with none decided; the hostile-or-oversized refusal is carried by NFR-037's
Statement alone with no FR criterion, unlike its static twin which FR-118-AC-8
and FR-118-AC-12 own; "v1.1" and "1.2" in FR-125 stand for both the producer
interface version and the baseline model version, the substitution FR-126-CON-2
forbids, and `ArtifactRef.refVersion` is a fifth version member classed against
none of the four; FR-119 closes the assessment document kinds at five while
availability facts and observation records are emitted as members of other
documents; four requirements cite dependencies in prose that they do not declare
as edges, FR-122 most consequentially, which emits a digest selection and an
exact-decimal `period` without an edge to FR-112 or FR-118 while re-owning the
no-binary-float axis those own at zero coercion sites; "static-only `exportKind`"
is a term no requirement defines and six of the twelve consumer export kinds are
obligated and refused by neither half; and the consumer's non-nullable
`Export.locus` is an FR-116 input that appears in no export-mapping obligation on
either side. Two lows are vocabulary overload and NFR-037's one-directional
reference.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-1840 | high | **Cross-half.** The binding key the assessment half rests on is declared by nothing: FR-120 names a static bundle by that bundle's own identity and canonical digest selection, and FR-120-AC-2 refuses a document whose named digest differs from "the canonical digest selection of the admitted bundle bearing that identity" — but FR-117's nine member classes carry a model identity and digest and a profile identity and digest, no bundle identity and no bundle digest, and FR-117-CON-1 closes the type at exactly those nine, so the member being compared cannot be added without breaking the closure. | FR-120, FR-120-CON-1, FR-120-AC-1..AC-3, FR-117, FR-117-CON-1, FR-117-AC-1 |
| FND-1841 | high | **Cross-half.** The interface version is simultaneously required and prohibited on the static side. FR-126 and FR-126-AC-1 require an authored three-component version member on every document the producer emits, "static and assessment alike"; FR-117-CON-1 admits exactly nine member classes and no version class; and the only interface member the static half carries is the correspondence record's `ProducerObject` `interface`, which the consumer assigns as a `u32` and FR-116-CON-5 forbids the producer to assign. | FR-126, FR-126-CON-1, FR-126-AC-1, FR-117-CON-1, FR-116-CON-5, FR-116 |
| FND-1842 | high | **Cross-half.** Two assessment refusals are measured against an export set the static half never declares. FR-120-AC-4 refuses a foreign "object, type, relationship, component, or endpoint" identity and FR-121-AC-3 refuses a member `typeIdentity` the bound bundle "does not export", while the static half declares first-class records and export mappings for components, endpoints and relationships only — a type identity appears solely as FR-114's `owningTypeIdentity` and FR-115's endpoint `typeIdentity`, and no requirement declares an exported type or object record. | FR-120-AC-4, FR-121-AC-3, FR-121-CON-4, FR-116, FR-114, FR-115, FR-117-CON-1 |
| FND-1843 | high | **Cross-half.** FR-124 obligates one export mapping for every exported population, snapshot, window and observation-record identity and FR-124-CON-2 requires each `exportKind` to be drawn from the consumer's closed export-kind vocabulary — which carries `population` but no `snapshot`, `window` or `observation` kind. `snapshot` and `observation` are `ArtifactKind` members, not `ExportKind` members, and `window` is neither, so three of the four obligated mappings cannot carry a conforming kind. | FR-124, FR-124-CON-2, FR-124-AC-2, FR-122, consumer `ExportKind` / `ArtifactKind` at `72507f85` |
| FND-1844 | high | **Cross-half.** Every assessment document carries an FR-112 four-member canonical digest over FR-118 canonical bytes, but no requirement holds those bytes or that digest reproducible: NFR-036's Statement is scoped to "one admitted static bundle" and its Scope excludes populations, snapshots, windows and observations by name, and NFR-037 measures only the admit-versus-refuse decision and the bounds. FR-121's and FR-122-CON-5's ambient-input prohibitions are not byte or digest agreement. By NFR-036's own rationale an assessment digest is therefore not yet a binding. | NFR-036 Statement and Scope, NFR-037, FR-119, FR-119-AC-1, FR-121, FR-122-CON-5, FR-118 |
| FND-1845 | medium | **Cross-half.** One obligation class is owned twice. FR-116 and FR-124 each carry the producer-object members, the native selection, the definition-closure enumeration, the binding-relation identity, the configuration provenance and the export mappings, and each refuses an unexported export, a foreign-owned export, a changed selection under a retained relation, an absent configuration provenance and an equal-hash equivalence claim. FR-124 disclaims only the *cardinality* rule, while FR-116's subject — "one producer object and one native artifact" — reaches assessment objects, since FR-119 emits them onto `ProducerObject`. | FR-116, FR-116-CON-1..CON-3, FR-116-AC-2..AC-4, FR-124, FR-124-CON-1..CON-3, FR-124-AC-3..AC-5, FR-119 |
| FND-1846 | medium | **Cross-half.** The static/assessment `population` export-kind partition has two named owners: FR-116's behavior and Dependencies assign the refusal to FR-117 and FR-116-AC-9 cites FR-117-AC-7, while FR-124-CON-4 and FR-124's Dependencies assign "the static/assessment export split" to FR-120, whose own CON-4 describes itself as only keeping FR-117's refusal distinct. Which requirement owns the partition is undecided. | FR-116, FR-116-AC-9, FR-117-AC-7, FR-120-CON-4, FR-120-AC-7, FR-124-CON-4 |
| FND-1847 | medium | **Cross-half.** FR-119-AC-2 and FR-119-AC-3 re-own three refusals the static half already owns: an absent digest `version` and a substituted digest domain are FR-112-AC-4 and FR-112-AC-2, and an undeclared revision namespace is FR-113-AC-4. FR-119-CON-4 states that this requirement restates neither vocabulary, so the criterion table contradicts the constraint that governs it, and an absent-`version` defect on an assessment document satisfies two criteria at once. | FR-119, FR-119-CON-4, FR-119-AC-2, FR-119-AC-3, FR-112-AC-2, FR-112-AC-4, FR-113-AC-4 |
| FND-1848 | medium | Three assessment requirements restate the FR-108 model contract their own constraints say they only cite. FR-121 restates the closed-world declaration and its refusal (FR-108-CON-1), the three-way field-member distinction (FR-108-AC-1), the endpoint binding and dangling refusal (FR-108-AC-2) and the two-records rule (FR-108-AC-4); FR-122 restates the three clock families and the clock-family mismatch refusal (FR-108-AC-5) and the two-records rule again; FR-123 restates the availability-fact retention, the no-Boolean-truth rule and FR-108-AC-3 almost verbatim. FR-108-AC-4's membership-versus-coverage axis now has three owners. | FR-108-CON-1, FR-108-CON-2, FR-108-AC-1..AC-5, FR-121-CON-2, FR-121-CON-5, FR-121-AC-2, FR-121-AC-4..AC-6, FR-122-CON-1, FR-122-AC-3, FR-122-AC-8, FR-123, FR-123-CON-1, FR-123-AC-2 |
| FND-1849 | medium | FR-125 re-owns two obligations it names other owners for. FR-106's behavior already states that a v1.2-to-v1.1 projection refuses when authored presence differs from the v1.1 derived value, with FR-106-AC-3 and FR-106-AC-4 as its criteria, while FR-125-CON-1 claims to restate no part of FR-106 and FR-125-AC-2 restates exactly that; and FR-125-CON-5 refuses a target interface version the producer does not implement, which FR-125's own Dependencies assign to FR-126 and FR-126-AC-5 owns. | FR-106, FR-106-AC-3, FR-106-AC-4, FR-125-CON-1, FR-125-CON-5, FR-125-AC-2, FR-126-AC-5 |
| FND-1850 | medium | FR-119's behavior obliges the producer to keep "the provenance locus, the ownership member, and the membership member" of an assessment document separate members, but its Description, Outputs, CON-1 and AC-1 close the assessment document interface at four members — identity, revision, digest selection and authorizing configuration. No requirement declares those three members, obliges their content, or refuses their absence, so the assessment half reproduces the absent-member hole FND-1725 closed on the static side. | FR-119, FR-119-CON-1, FR-119-AC-1, FR-114, FR-117-AC-2 |
| FND-1851 | medium | **Cross-half.** An assessment relationship instance's endpoint identity has three candidate resolution scopes and no requirement decides which governs: FR-121-AC-5 refuses an endpoint identity "that the population document does not declare", FR-120-AC-4 refuses any endpoint identity the bound static bundle does not export, and FR-115-CON-5 joins endpoints only through an `endpointIdentity` naming an FR-114 declaration. A population-local endpoint declaration is admissible under the first and refusable under the second. | FR-121-AC-5, FR-120-AC-4, FR-115-CON-5, FR-115-AC-5, FR-114 |
| FND-1852 | medium | **Cross-half.** The hostile-or-oversized refusal is owned by an NFR alone. NFR-037's Statement carries the obligation and its metrics measure it, but neither FR-119 nor FR-121 carries any criterion refusing an over-bound document — FR-121-CON-1 requires only that `members` be finite and enumerable. The static twin is owned the other way: D8 moved FR-118's numeric limit into FR-118's behavior with FR-118-AC-8 and FR-118-AC-12 precisely so an NFR would not be the sole owner of a refusal. | NFR-037 Statement, FR-119, FR-121, FR-121-CON-1, FR-118-AC-8, FR-118-AC-12 |
| FND-1853 | medium | The version vocabulary is not closed the way FR-126 claims. FR-126-CON-2 keeps four versions distinct, and US-017 says a version is "four different things" — yet FR-125 uses "v1.1" and "1.2" for both the producer interface version (CON-5, "a target interface version it implements") and the baseline model version FR-106 and spec.md §1 mean by v1.1/1.2, which is the substitution CON-2 forbids; and FR-114's locus `source` carries `refVersion`, a fifth version member classed against none of the four. | FR-126-CON-2, FR-125, FR-125-CON-5, FR-125-AC-1, FR-106, FR-114, spec.md §1 |
| FND-1854 | medium | FR-119 closes the assessment document kinds at five — population, snapshot, window, observation-record and availability — and FR-119-AC-1 emits all five as documents, but two of them are emitted elsewhere as members of other documents: FR-123 carries an availability *fact* inside "the producer's own assessment document" and exposes an availability-fact type, and FR-122 emits observation-record identities as members of a window document. No requirement declares the content of an observation-record document or of an availability document. | FR-119, FR-119-AC-1, FR-123, FR-123-CON-1, FR-122 |
| FND-1855 | medium | **Cross-half.** Four requirements cite dependencies in prose that they do not declare as edges, so the graph under-reports the join. FR-122 is the consequential one: it emits an immutable membership digest selection and an exact rational `period` while declaring no edge to FR-112 or FR-118, and FR-122-CON-3 re-owns the no-binary-float axis that FR-118-CON-1 and NFR-036's zero-coercion-site metric already own over every canonical number. FR-121, FR-124, FR-125 and FR-126 likewise cite FR-117, FR-112, FR-113 or FR-125 in prose without the edge. | FR-122, FR-122-CON-3, FR-122-AC-6, FR-118-CON-1, NFR-036, FR-121, FR-124, FR-125, FR-126 |
| FND-1856 | medium | **Cross-half.** The export-kind partition is asserted and never stated. FR-124 refuses an assessment export mapping naming a "static-only `exportKind`" and FR-124-AC-6 tests that refusal, but no requirement in either half declares which of the consumer's twelve kinds are static-only; FR-116 obligates mappings for `component`, `endpoint` and `relationship` and FR-117 refuses `population`, leaving `enum`, `field`, `object`, `operation`, `record`, `reference`, `scalar` and `variant` obligated by neither half and refused by neither. | FR-124, FR-124-AC-6, FR-116, FR-116-CON-2, FR-117-AC-7, consumer `ExportKind` at `72507f85` |
| FND-1857 | medium | **Cross-half.** The consumer's `Export { kind, path, locus }` carries a non-nullable `ForeignLocus`, and FR-116's Inputs name "its formal locus" for each exported record — but no export-mapping obligation in either half carries it: FR-116's behavior and CON-2 close the mapping at exporting object identity, `exportKind` and `exportPath`, and FR-124-CON-2 repeats that closed triple. A conforming consumer `Export` cannot be assembled from the members the producer is obliged to emit. | FR-116, FR-116-CON-2, FR-116-AC-8, FR-124-CON-2, FR-124-AC-2, consumer `Export` at `72507f85` |
| FND-1858 | low | One word carries several things across the join. "Closure" is a static prerequisite closure (FR-117), a native definition closure (FR-116, FR-124) and an observation closure (FR-117's prohibition, NFR-036 Scope) with no requirement owning the third; "membership" is inventory membership (FR-114), population membership (FR-121), snapshot and window membership (FR-122) and FR-119's undeclared membership member; "selection" is a digest tuple, a revision tuple, a static bundle, a configuration, a coverage form and a window's source. Relatedly, the progress records, workflow instances and observation closures FR-117 refuses are emitted by no requirement; spec.md §2.2 defers them, so this is recorded rather than charged. | FR-116, FR-117, FR-117-CON-5, FR-119, FR-121, FR-122, FR-124, NFR-036 Scope, spec.md §2.2 |
| FND-1859 | low | NFR-037 `constrains` FR-119 and FR-121 but neither FR references it back, so the bound is discoverable only from the NFR side — the same shape as FND-1729, which D16 closed for NFR-036 by adding the reference to FR-117 and FR-118 and which the assessment half reintroduces. NFR-037 also names the configuration's `resourceLimits` member, which FR-109 states only as "finite resource limits" without naming it, unlike the closed FR-118/`numericResourceLimit` loop. Observation: no Verification cell in the fifteen requirements carries a TC reference. | NFR-037, FR-119, FR-121, FR-109, FR-118, NFR-036 |

## Verdict

**CONDITIONAL** — the interface is one design on the page: both halves trace to
StR-001 through their own use case, the dependency graph is acyclic across the
join, each requirement states one obligation class, every criterion is
observable at the producer boundary, and the assessment half correctly inherits
rather than renegotiates the static half's digest, revision and identity
discipline. Admission of the set is conditional on the five highs, each of which
is a seam specified from one side only and none of which a reader can resolve:
the static bundle carries no identity or digest for FR-120 to bind to and no
place for FR-126's interface version, the export set FR-120 and FR-121 resolve
identities against is undeclared, three of FR-124's four obligated export kinds
do not exist in the vocabulary it requires them drawn from, and no requirement
holds an assessment document's canonical bytes byte-exact. It is further
conditional on the thirteen mediums, each of which leaves an obligation owned
twice, an owner undecided, or a member owned by nothing.

## Integrity controls

| Invariant | Evidence |
| --- | --- |
| Every US maps to at least one FR, and every FR to a US and thence to StR-001 | US-016 and US-017 `traces_to` StR-001; FR-112..FR-118 `implements` US-016; FR-119..FR-126 `implements` US-017 |
| Every criterion and constraint in both halves names a declared verification method | FR-112..FR-126 Acceptance Criteria and Constraints tables; NFR-036 and NFR-037 Verification |
| The `depends_on` graph across both halves is acyclic | FR-119 → FR-108/112/113; FR-120 → FR-117/119; FR-121 → FR-106/108/119/120; FR-122 → FR-108/119/120/121; FR-123 → FR-108/119/121/122; FR-124 → FR-116/119/120/122; FR-125 → FR-106/119; FR-126 → FR-112/119 |
| A static link needs no assessment input, asserted from both sides | FR-117-CON-4 / FR-117-AC-8 and FR-120-CON-2 / FR-120-AC-8 |
| The static-bundle binding is one-directional | FR-120-CON-3 / FR-120-AC-8 |
| Digest domain, digest version, revision namespace and revision value stay separate authored members in both halves | FR-112-CON-3, FR-113-CON-3, FR-119-CON-4 |
| Availability is declared by the producer and truth is decided by the evaluator | FR-123-CON-3 / FR-123-AC-6, FR-108-CON-2 |
| Membership of an object and coverage of an observation record stay distinct | FR-121-CON-5, FR-122-AC-8 — owned three times, see FND-1848 |
| A changed static selection yields a new assessment document, never an edit | FR-120-CON-5 / FR-120-AC-6 |
| A lossy v1.1 projection refuses with an identity-preserving named loss record | FR-125-CON-4 / FR-125-AC-7 |
| One interface version governs a whole document set | FR-126-CON-4 / FR-126-AC-7 |
| An over-bound assessment document refuses at a configuration-declared bound | NFR-037 Statement and metrics — no FR criterion, see FND-1852 |
| Unowned by any control: a static bundle identity and bundle digest for FR-120 to bind | FND-1840 |
| Unowned by any control: the interface-version member on a static bundle | FND-1841 |
| Unowned by any control: the exported type and object identities FR-120 and FR-121 resolve against | FND-1842 |
| Unowned by any control: byte-exactness of an assessment document's canonical bytes and digest | FND-1844 |
| Unowned by any control: the `Export.locus` member of every export mapping | FND-1857 |

## Dispositions

Applied in change record CR-095-2 against the orchestrator's decisions
E1..E14. A finding marked *applied* is closed by the cited decision; one
marked *declined* or *recorded* states why it changes nothing. Two upstream
gaps in the consumer's own closed vocabularies are recorded as an open
cross-repo item and are not obligations of this interface.

| ID | Disposition | Record |
| --- | --- | --- |
| FND-1840 | applied | E1 — see FND-1800. |
| FND-1841 | applied | E1 and E2 — see FND-1801. |
| FND-1842 | applied | E8 — see FND-1809. |
| FND-1843 | applied | E3 — see FND-1824; verified against the pinned vocabularies rather than assumed. |
| FND-1844 | applied | E4 — see FND-1806. |
| FND-1845 | applied | E7 — FR-124 cites FR-116 for the eleven shared members and the shared refusals and states only what differs. |
| FND-1846 | applied | E7 — the `population` partition is owned by FR-120 alone. |
| FND-1847 | applied | E7 — FR-119 raises the refusals FR-112 and FR-113 own and tests only what it adds: a wholly absent digest or revision member. |
| FND-1848 | applied | E7 — FR-121, FR-122 and FR-123 cite FR-108, which alone owns membership versus coverage and the disposition semantics. |
| FND-1849 | applied | E7 — FR-125 cites FR-106 for the presence contract and FR-126 for the unknown-version refusal. |
| FND-1850 | applied | E8 — FR-119's locus and ownership members are deleted, since nothing in the assessment half used them. |
| FND-1851 | applied | E8 — see FND-1850. |
| FND-1852 | applied | E14 — FR-119 owns the document-level oversized refusal against the configuration's declared bounds, citing NFR-037 for the measurement. |
| FND-1853 | applied | E13 — v1.1 is a wire and interface version and never a model revision; `refVersion` stays a consumer member cited by reference. |
| FND-1854 | applied | E3 — FR-119's five document kinds each map to a named consumer member; no parallel vocabulary is minted. |
| FND-1855 | applied | E14 — FR-122 declares FR-112 and FR-118, and FR-118 alone owns the no-binary-floating-point prohibition. |
| FND-1856 | applied | E3 and E13 — the static side is stated as the complement of the single assessment member. |
| FND-1857 | applied | E8 — `Export.locus` is obligated on both sides. |
| FND-1858 | recorded | Vocabulary census beyond the three concepts E14 normalizes (closure, selection, membership) is recorded, not charged; no member the consumer owns was renamed. |
| FND-1859 | applied | E14 — NFR-037 is referenced from FR-119's and FR-121's Dependencies. |
