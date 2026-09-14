---
id: SR-209
title: "Base review of the complete Producer interface 1.2.0"
type: SpecReview
analysis: base
scope: "US-016, US-017, FR-112..FR-126, NFR-036, NFR-037"
review_set: subset
---
# Base specification review

## Summary

Targeted review of the complete producer interface as one design — the static
boundary as CR-095-1 left it and the assessment half as first authored — read
against the pinned consumer wire shapes both halves claim to map onto and
against each other at the seams where a consumer crosses from a static link to
an assessment.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-1800 | high | Cross-half. FR-120 binds every assessment document to one static bundle by that bundle's identity and canonical digest selection together, and refuses a mismatch as stale, but FR-117's nine static member classes carry no bundle identity and no bundle digest selection; the member the assessment half names does not exist in the half that admits it. | FR-120, FR-120-CON-1, FR-120-AC-1, FR-120-AC-2, FR-117, FR-117-CON-1, FR-117-AC-1 |
| FND-1801 | high | Cross-half. FR-126 requires the interface version `1.2.0` as an authored member of every emitted document, static and assessment alike, while FR-117-CON-1 closes the static bundle type to exactly nine member classes and no other; FR-117 declares no edge to FR-126 and gained no version member, so a conforming static bundle cannot carry the version FR-126-AC-1 verifies on it. | FR-126, FR-126-CON-1, FR-126-AC-1, FR-117, FR-117-CON-1, FR-117-AC-1 |
| FND-1802 | high | Cross-half. FR-125 emits a v1.1 projection as a new document carrying its own identity, revision and digest, while FR-126 requires `1.2.0` on every document the producer emits and refuses a document set carrying two declared interface versions; whether a projection declares 1.1, whether the producer implements 1.1 at all, and whether a projection and its source form one document set are each left to the reader. | FR-125, FR-125-CON-5, FR-125-AC-1, FR-126, FR-126-AC-1, FR-126-AC-7, FR-126-CON-4 |
| FND-1803 | high | Cross-half. FR-124 refuses an assessment export mapping that names a "static-only `exportKind`", but no requirement partitions the consumer's closed twelve-member `ExportKind` vocabulary: FR-116 maps only `component`, `endpoint` and `relationship`, FR-117 refuses only `population`, and the remaining eight kinds (`enum`, `field`, `object`, `operation`, `record`, `reference`, `scalar`, `variant`) are allocated to neither half. The refusal FR-124-AC-6 asserts has no declared vocabulary to execute against. | FR-124, FR-124-AC-6, FR-116, FR-116-CON-2, FR-117-AC-7, FR-120-AC-7, quire-spec-language `ExportKind` |
| FND-1804 | high | Cross-half. FR-124 carries a four-member producer object selection — `kind`, `identity`, `revision`, digest — in a correspondence record that maps onto the same consumer `Correspondence.producer` / `ProducerObject` as FR-116's six-member selection, omitting `interface` and `authority`; the assessment half reintroduces on its side exactly the incomplete producer object FND-1701 charged and D17 closed on the static side. | FR-124, FR-124-CON-1, FR-124-AC-1, FR-116, FR-116-CON-1, FR-116-AC-1, FND-1701 |
| FND-1805 | high | The `interface` member D17 added to FR-116 (and which FR-119 inherits by mapping assessment documents onto `ProducerObject`) is a `u32` table index in the pinned consumer contract, not a producer-authored selection; FR-116-CON-5 and FR-116-AC-8 forbid the producer assigning any consumer `u32` index while FR-116-CON-1 and FR-116-AC-1 require it to carry this one. The FND-1701 apply pass closed the enumeration gap with a member the producer is separately forbidden to author, and FR-116-CON-5's index list omits it. | FR-116, FR-116-CON-1, FR-116-CON-5, FR-116-AC-1, FR-116-AC-8, FR-119, FND-1701 |
| FND-1806 | high | Cross-half. NFR-036 scopes byte-exactness to one admitted static bundle and explicitly excludes populations, snapshots, windows, observations and closures, so no requirement holds any assessment document's canonical bytes or digests reproducible — yet FR-119 gives every assessment document a canonical digest, FR-120 refuses a stale binding by comparing digest selections, and FR-125-AC-6 asserts a projected document stays byte-unchanged. Those obligations rest on a guarantee the NFR withholds from them, and NFR-037 measures bounds rather than bytes. | NFR-036, NFR-036 Scope, FR-119, FR-120-AC-2, FR-125-AC-6, NFR-037 |
| FND-1807 | high | Cross-half. FR-118 fixes one canonical form whose numeric domain is an exact base-10 coefficient and exponent serialized as an ordinary decimal expansion, and refuses a value that is not a JSON number; FR-122 requires a `fixed-sample` `period` as an exact rational and FR-122-CON-3 forbids rounding it, while the pinned consumer contract carries numbers only as tagged objects (`{kind: "integer", decimal}` / `{kind: "rational", numerator, denominator}`). Neither half states how a rational period, or the consumer's numeric form at all, is canonicalized under the digest every assessment document must carry. | FR-118, FR-118-AC-1, FR-118-AC-3, FR-122, FR-122-CON-3, FR-122-AC-6, FR-119, quire-spec-language `NumberWire` |
| FND-1808 | high | FR-123 requires the producer to "report the unavailable disposition" and to "retain unchanged a decisive satisfied or violated disposition", which its own FR-123-CON-3 forbids (no operation that decides truth), FR-123-AC-6 refuses (a producer document reporting a truth disposition), US-017-EX-3 denies, FR-108-AC-3 allocates to the evaluator, and spec.md §2.2 and §6 place outside this delivery. The availability seam's own ownership rule is stated four ways in one requirement. | FR-123, FR-123-CON-3, FR-123-AC-2, FR-123-AC-6, US-017-EX-3, FR-108-AC-3, spec.md §2.2, spec.md §6 |
| FND-1809 | medium | Cross-half. FR-121 refuses a relationship instance whose endpoint identity "the population document does not declare", while FR-120 requires every component, endpoint, relationship, type and object identity an assessment document names to resolve from the bound static bundle's exports alone and from no other source, and FR-121-CON-4 resolves `typeIdentity` that way. One identity class therefore has two declared resolution authorities and two different refusals. | FR-121, FR-121-AC-5, FR-121-CON-4, FR-120, FR-120-AC-4, FR-114, FR-115 |
| FND-1810 | medium | Cross-half. FR-113 fixes a closed namespace rule by enumeration — producer model, profile, configuration, component, endpoint and relationship object revisions take `filament-core-data/producer-object-revision-1` — and no assessment document appears in that enumeration; FR-119 places every assessment document revision in that namespace by citation, so the governing rule and the citing requirement disagree about the closed set. The same enumeration gap applies to FR-112's digest classes for assessment documents. | FR-113, FR-113-AC-1, FR-119, FR-119-CON-4, FR-112 |
| FND-1811 | medium | Cross-half. The observation-record document is one of FR-119's five assessment document kinds, but no requirement owns its content: FR-121 owns population membership, FR-122 owns snapshot and window selections, FR-123 owns availability facts, and FR-119-CON-3 disclaims every per-kind content obligation. A consumer reading an observation-record document has nothing to read it against. | FR-119, FR-119-CON-3, FR-121, FR-122, FR-123 |
| FND-1812 | medium | Cross-half. The pinned consumer `ArtifactKind` vocabulary is closed and carries `observation` and `snapshot` but no `population` and no `window` kind, and no assessment requirement states the artifact kind, authority or locus under which an assessment document is referenced — while FR-114 requires every static locus source `kind` to be drawn from exactly that closed vocabulary. A population or window document cannot be named as a typed artifact by the discipline the static half established. | FR-119, FR-121, FR-122, FR-114, FR-114-AC-4, quire-spec-language `ArtifactKind` |
| FND-1813 | medium | Cross-half. NFR-037 bounds only the assessment-document read path and explicitly excludes static admission "which reads no assessment input at all", yet FR-114 reads an externally authored declaration source document and FR-116 reads correspondence and definition-closure input; the static half has a numeric limit (FR-118) and no document-byte, nesting-depth or member-count bound at all, so the hostile-input argument NFR-037's rationale makes applies to a surface no requirement bounds. | NFR-037, NFR-037 Scope, FR-114, FR-116, FR-117, FR-118 |
| FND-1814 | medium | Cross-half. The two halves take their resource limits from two differently named configuration members — FR-118's `numericResourceLimit` with `maximumCoefficientDigits`/`maximumExponentMagnitude`, and NFR-037's `resourceLimits` with a document byte, nesting-depth and member-count bound — and FR-109, the declaring owner both cite, declares neither by name, stating only "finite resource limits". Each half names a member its owner has not declared. | FR-118, FR-118-AC-12, NFR-037, FR-109 |
| FND-1815 | medium | Cross-half. FR-119 enumerates an "availability document" as one of the five assessment documents carrying its own identity, revision, digest and authorizing configuration, while FR-123 carries every availability fact inside an assessment document and declares no availability document of its own; the carrier of an availability fact is stated two ways and a consumer cannot tell whether it resolves one document or a member of another. | FR-119, FR-119-AC-1, FR-123, FR-123-AC-1, FR-120 |
| FND-1816 | medium | FR-126-AC-3 verifies that "the members it adds are ignored by a reader of the earlier minor version without changing that reader's result" — a consumer obligation authored as a producer acceptance criterion, the class D11 removed from FR-112 and FR-117 under FND-1706, now reintroduced in the never-reviewed half and unverifiable inside this repository. | FR-126, FR-126-AC-3, FND-1706 |
| FND-1817 | medium | FR-123 takes the selected evaluator's exact admitted support set and its already-established decisive disposition as inputs supplied only "when one is supplied to the producer", while FR-123-AC-2 requires behavior on both the inside-support and outside-support branches; no requirement states what the producer does when neither input is supplied, which is the ordinary case for a producer that emits documents before any evaluator runs. | FR-123, FR-123 Inputs, FR-123-AC-2, FR-123-CON-3 |
| FND-1818 | low | Record bookkeeping across both halves: FND-1709's D9 claim that FR-118's prose FR-109 dependency was typed did not land — FR-118's frontmatter carries only `implements US-016`, and CR-095-1 removed its one `depends_on` edge without adding the FR-109 one, so FR-118's three prose dependencies (FR-112, FR-109, NFR-036) are all untyped; FR-122 fixes its closed clock-family vocabulary in the requirement without the configuration-declared selection FR-112-CON-5 and FR-113-CON-5 require of every other closed vocabulary; and the two-observations-stay-two-records obligation is stated twice, in FR-121 and again in FR-122-AC-8. | FR-118, FND-1709, FR-122, FR-122-CON-1, FR-121, FR-121-AC-6, FR-122-AC-8 |

## Verdict

**CONDITIONAL** — the assessment half is well-formed, well-partitioned against
the static half's discipline, and correct about the two distinctions US-017
names most loudly: a static link still needs no observation, and an unknown
interface version is refused rather than approximated. Read as one design,
however, the interface does not yet join. Four seams are named from one side
only and have no owner on the other: the static bundle's identity and digest
that FR-120 binds against but FR-117 never declares (FND-1800), the interface
version FR-126 requires on a bundle FR-117 closes to nine member classes
(FND-1801), the projection document whose own version FR-125 and FR-126
contradict each other about (FND-1802), and the static-versus-assessment
partition of the consumer's closed export-kind vocabulary that three
requirements claim to own and none declares (FND-1803). Two obligations
contradict across the halves rather than duplicating: FR-118's exact-decimal
numeric domain against FR-122's exact rational period (FND-1807), and NFR-036's
deliberate exclusion of every assessment document from byte-exactness against
the three assessment obligations that rest on it (FND-1806). Two findings are
the static half's own dispositions reopening on the assessment side — the
incomplete producer object of FND-1701 reappearing in FR-124 (FND-1804), whose
`interface` member the pinned contract makes a consumer-assigned `u32` the
producer is separately forbidden to author (FND-1805), and the consumer
obligation of FND-1706 reappearing in FR-126-AC-3 (FND-1816). Inside the
assessment half, FR-123 states the availability seam's ownership rule four
incompatible ways (FND-1808). FR-119..FR-122, FR-124 and FR-125 are otherwise
sound, and NFR-037 is the strongest measurement document in the range. Resolve
FND-1800 through FND-1808 before the matrix pass allocates TC ids against these
criteria; FND-1809 through FND-1817 are boundary and ownership edits that do not
block it.

## Checks

| Check | Result |
| --- | --- |
| ID formats and uniqueness | US-016, US-017, FR-112..FR-126, NFR-036, NFR-037 and every AC/CON/EX id conform; no duplicates; FR ids contiguous through FR-126, US ids contiguous through US-017, the NFR-034/NFR-035 gap the logged global-maxima allocation |
| Required US sections and typed relationships | US-017 carries the house story, illustrative-example, exploratory-option, contextual-constraint, dependency, priority, notes and traceability sections, traces to StR-001, and declares `depends_on` US-016 and US-015 |
| Required FR sections and typed relationships | Description, Inputs, Outputs, Behavior, Constraints, Acceptance Criteria and Dependencies present in FR-119..FR-126; each implements US-017; FR-118 carries no typed dependency at all (FND-1818) and FR-117 declares no edge to FR-126 (FND-1801) |
| Story allocation across the halves | FR-125 and FR-126 govern static documents as well as assessment documents but implement US-017 only, so the static story owns neither the interface-version declaration nor the projection of a static document (FND-1801, FND-1802) |
| NFR measurability | NFR-037 states ten metrics with target, threshold, population, unit and method, and names Plan-017 as apparatus owner with a gate that fails rather than passes when it cannot run; NFR-036 unchanged since SR-200 |
| Seam ownership, both sides | Digest and revision disciplines, the one-directional binding direction, the `population` export kind's admission and the four meanings of "version" each have an owner on both sides; the static bundle's identity and digest, the export-kind partition, the interface version on a static bundle, the observation-record document's content, and an assessment document's own artifact kind do not (FND-1800..FND-1803, FND-1811, FND-1812) |
| Consumer wire correspondence | Assessment documents map onto `ProducerObject`, `Correspondence`, `Export` and `BindingRequirement` as claimed, but the pinned contract carries no population, window, membership or availability record at all, makes `ProducerObject.interface` a `u32`, carries no `population` or `window` artifact kind, and carries numbers only as tagged rational/integer objects (FND-1805, FND-1807, FND-1812) |
| Duplication across the halves | FR-124 reuses FR-116's cardinality rule by citation rather than restating it, and FR-119 disclaims FR-108's semantics correctly; the two-observations obligation is the one duplicate (FND-1818) |
| Status truthfulness | spec.md §1 carries the fourteenth-delivery paragraph, §2.1 the assessment in-scope entry, §2.2 its four out-of-scope entries, §5 the seventh accretive row set and §6 the provisional paragraph for FR-112..FR-126, NFR-036 and NFR-037; §6's claim that no requirement in the range asserts a truth disposition is contradicted by FR-123 (FND-1808) |
| Test Matrix coverage | No TC rows exist for any criterion in scope; observation only — the matrix pass allocates TC ids after this review |
| Scoped `quire validate` | Clean over the review artifact; the six standing module-catalog notices are not findings |

## Coverage rules

1. Coverage: every AC and constraint in the assessment half is stated in a form a TC can bind, and none is yet bound; FR-124-AC-6 is the one criterion that cannot be bound as written, because no requirement declares which export kinds are static-only (FND-1803), and FR-123-AC-2 cannot be bound without the evaluator inputs FND-1817 leaves optional.
2. Options: FR-122 enumerates all three clock families and both observation-record carriage forms as the alternatives to be permuted; FR-126 enumerates the patch, minor and major alternatives; FR-125 enumerates the lossless and lossy projection alternatives; FR-119 enumerates all five document kinds.
3. Boundaries: the one-past-the-bound probes of NFR-037, the half-open inclusive-start/exclusive-end pair of every clock family, the closed-versus-open world declaration, and the identity-versus-identity-and-digest binding are each stated as boundaries; the adjacent-integer and undeclared-limit boundaries of the static half stand unchanged.
4. Errors: every assessment refusal is stated as blocking and explicitly not a warning, a cache miss or a refetch invitation, and each names the offending member; the loss record of FR-125 names each lost member rather than a count or a flag.
5. State: static admission remains separated from assessment throughout — FR-120-CON-2 and FR-120-AC-8 keep the binding one-directional — and a changed static selection yields a new document rather than an edited one.
6. Edges: the stale-digest rebind, the two-population window, the near-matching object identity, the presentation-only re-encoding, the coinciding hash text across two digest domains, the shared `value` spelling across two namespaces, and the three-way absence/null/value distinction are each retained rather than collapsed.
7. Atomicity caveat: FR-119-AC-1, FR-121-AC-1, FR-122-AC-2, FR-122-AC-9, FR-124-AC-2, FR-125-AC-7 and FR-126-AC-1 each conjoin several independent assertions, so one failing TC will not localize which member or which clock family was lost; the matrix pass should bind more than one TC per such criterion, as SR-200 already asked for the static half.

## Dispositions

Applied in change record CR-095-2 against the orchestrator's decisions
E1..E14. A finding marked *applied* is closed by the cited decision; one
marked *declined* or *recorded* states why it changes nothing. Two upstream
gaps in the consumer's own closed vocabularies are recorded as an open
cross-repo item and are not obligations of this interface.

| ID | Disposition | Record |
| --- | --- | --- |
| FND-1800 | applied | E1 — the static bundle carries its own header members (identity, namespaced revision, canonical digest selection, producer interface version) plus exactly the nine content classes; the closure is over the content classes and the assessment exclusion only. |
| FND-1801 | applied | E1 and E2 — the interface version is a header member, and the consumer-assigned `interface` index is no longer the static interface member. |
| FND-1802 | applied | E13 — a v1.1 projection declares the v1.1 interface version and wire schema identity and is its own document set. |
| FND-1803 | applied | E3 — FR-120 owns the export-kind partition: `population` on the assessment side, the remaining eleven on the static side, stated as a complement rather than a transcribed list. |
| FND-1804 | applied | E2 — FR-124 carries the same five producer-object members as FR-116. |
| FND-1805 | applied | E2 — the obligation to author `interface` is withdrawn; it joins the consumer-assigned index list in both FR-116 and FR-124. |
| FND-1806 | applied | E4 — NFR-036's assessment exclusion is deleted; it now covers every document this interface digests. |
| FND-1807 | applied | E6 — the `fixed-sample` period is an exact rational carrying `numerator` and `denominator` as arbitrary-precision integers, each digested as an integer; no decimal expansion of a rational is emitted or digested. |
| FND-1808 | applied | E5 — every clause having the producer retain or report a disposition is deleted; no emitted member may hold one. |
| FND-1809 | applied | E8 — component, endpoint and relationship identities resolve against the bundle's export records; object and type identities resolve against the selected model's exported type identities, and the refusal names which vocabulary it resolved against. |
| FND-1810 | applied | E7 — FR-113's class list now names the five assessment document classes it already governed. |
| FND-1811 | applied | E8 — FR-122 owns the observation-record document's content: record identity, the member object identities it concerns, and its ordering position. |
| FND-1812 | applied | E3 — recorded as an open cross-repo item for the consumer: a population document has no admissible artifact kind, so it is named by identity and canonical digest selection rather than as a typed artifact reference. |
| FND-1813 | applied | E4 — NFR-037's bounded-input duty now covers the read path in both halves, including the externally authored declaration source the loci cite and the correspondence input. |
| FND-1814 | applied | E11 — one spelling across the interface: `resourceLimits` with `numericResourceLimit` inside it, FR-109 cited as owner. |
| FND-1815 | applied | E3 and E8 — FR-119's document-kind table names the consumer member each kind is addressed under; FR-123 owns the availability fact and its identity. |
| FND-1816 | applied | E14 — FR-126-AC-3 tests what the producer emits, not what an earlier reader concludes. |
| FND-1817 | applied | E5 — the availability fact is emitted identically whether or not a declared support set is supplied. |
| FND-1818 | applied | E14 — FR-118's typed FR-109 edge is restored, FR-122 declares FR-112 and FR-118, and the duplicated two-observations obligation is cited to FR-108. |
