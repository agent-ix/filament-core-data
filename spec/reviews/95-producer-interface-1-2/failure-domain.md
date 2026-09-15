---
id: SR-210
title: "Failure-domain review of the complete Producer interface 1.2.0"
type: SpecReview
analysis: failure-domain
scope: "US-016, US-017, FR-112..FR-126, NFR-036, NFR-037"
review_set: subset
---
# Failure-domain review

## Summary

Review of the whole interface as one design, concentrated on the cross-half
failure surface: the stale and re-admitted static selection reached through an
assessment document, identity confusion between a static export and an
assessment export, the availability-versus-truth boundary, the four versions
that must never substitute for one another, and the admission and binding paths
where a partial or refused value can still be observed. Findings marked
*cross-half* name a seam whose two sides disagree or whose second side is
missing; the remainder are confined to the assessment half, which has not been
reviewed before.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-1820 | high | **Cross-half.** FR-120 names the bound static bundle by "its identity and its canonical digest selection", and refuses a stale selection by comparing that digest against "the admitted bundle bearing that identity" — but FR-117 admits a bundle carrying *exactly* nine static member classes, none of which is the bundle's own identity, its own namespaced revision, or its own canonical digest selection. Every FR-120 refusal therefore tests members the static half never requires the bundle to carry: this is FND-1710's carrier defect reappearing at the join, where it disables the one refusal that prevents a silently rebound static selection. | FR-120, FR-120-AC-1, FR-120-AC-2, FR-117-CON-1 |
| FND-1821 | high | **Cross-half.** FR-126-AC-1 requires every document of one emitted set, "static and assessment alike", to carry the interface version as one authored three-component member, while FR-117-CON-1 requires the static bundle type to carry *exactly* the nine named member classes. An interface-version member on the static bundle violates FR-117-CON-1; its absence violates FR-126-AC-1 and FR-126-CON-1's prohibition on inferring the version from the document's shape. Neither requirement names the other, so a `Compile`-verified constraint and a `Contract`-verified criterion contradict each other over the same type. | FR-126-AC-1, FR-126-CON-1, FR-117-CON-1 |
| FND-1822 | high | **Cross-half.** No requirement holds any assessment document's canonical bytes or digests byte-exact. NFR-036's Scope explicitly excludes populations, snapshots, windows, observations and progress records, while FR-119 gives every assessment document a four-member canonical digest selection and FR-120-AC-2 makes a digest comparison the staleness refusal. NFR-037's Dependencies assert the opposite — that NFR-036 "holds the admitted document's bytes byte-exact" — so the assessment half believes it inherits a determinism obligation the static half's NFR disclaims. A host-varying assessment digest makes one architecture bind where another refuses as stale, and NFR-037's cross-architecture golden compares admit-versus-refuse decisions, not digest values. | NFR-036, NFR-037, FR-119, FR-120-AC-2 |
| FND-1823 | high | **Cross-half.** "Admitted" has no stated referent across the join. FR-120 compares against "the admitted bundle bearing that identity", but nothing defines an admitted-bundle set, its uniqueness key, or its lifetime; FR-117's bundle is an in-process unconstructible value, and nothing states how a later read decides that a named bundle "was never admitted". FR-119-AC-5 refuses two *assessment* documents sharing one identity under one revision, and no static counterpart refuses two bundles sharing one identity — so a re-admitted bundle under one identity satisfies the staleness check by construction, and an assessment document read before its bundle is admitted has no stated disposition. | FR-120, FR-120-AC-2, FR-120-AC-3, FR-117, FR-119-AC-5 |
| FND-1824 | high | FR-124 requires one export mapping for every exported population, snapshot, window and observation-record identity, each carrying an `exportKind` "drawn from the consumer's closed export-kind vocabulary". That vocabulary at the pinned revision is `ExportKind { component, endpoint, enum, field, object, operation, population, record, reference, relationship, scalar, variant }` — it contains exactly one assessment kind, `population`, and no `snapshot`, `window` or `observation-record` kind at all. FR-124-AC-2 is unsatisfiable for three of its four export classes, and the only spellings left available for them are kinds FR-124-AC-6 itself refuses as static-only. | FR-124, FR-124-AC-2, FR-124-CON-2, FR-124-AC-6 |
| FND-1825 | high | **Cross-half.** The static/assessment partition of the closed export-kind vocabulary is never enumerated. FR-117-AC-7 refuses exactly one kind, `population`, inside a static bundle; FR-124-AC-6 refuses "a static-only `exportKind`" on an assessment record; FR-120-CON-4 asserts that FR-120 owns the split. No requirement lists which of the twelve kinds is static-only, which is assessment-only, and which is admissible in both. Both refusals are therefore stated against an unstated vocabulary, and the two halves can classify one kind two ways with each half's criteria still passing. | FR-117-AC-7, FR-120-CON-4, FR-124-AC-6 |
| FND-1826 | high | **Cross-half.** Configuration provenance is declared twice at the join and reconciled nowhere. FR-119 requires each assessment document to carry the configuration selection that authorized *it*; FR-117 carries the configuration document as a static bundle member; FR-124 requires the configuration provenance that authorized the relation. No requirement obliges these to be one configuration, and FR-119's namespace check and FR-112's and FR-113's selection checks all say "the configuration document" without saying which. Two configurations mean two digest-vocabulary selections, two revision-namespace selections and two `resourceLimits` governing one bound static/assessment pair, with no refusal for the mismatch. | FR-119, FR-119-AC-3, FR-117, FR-124, NFR-037 |
| FND-1827 | high | The assessment half reopens the construct-then-validate hole that FND-1712 closed on the static side. Only FR-119-CON-5 yields no value on refusal; FR-120, FR-121, FR-122, FR-123 and FR-124 state blocking refusals but require no indivisible admission operation, no unconstructible type, no absent value on refusal, and no prohibition on a public constructor or member. FR-120's static binding is a separate obligation from FR-119's emission, so an emitted-but-unbound, stale-bound, or membership-refused assessment document value is observable and passes every criterion in the half. | FR-119-CON-5, FR-120, FR-121, FR-122, FR-124, FR-117-CON-2 |
| FND-1828 | high | The availability-versus-truth boundary is stated as a prohibition and then crossed. FR-123 forbids the producer reporting "a truth disposition of its own", yet requires it to retain unchanged an evaluator's already-established satisfied or violated disposition and to "report the unavailable disposition" when a fact lies inside the admitted support set. No member, type, document or owner carries that reported disposition; CON-1's no-Boolean-member constraint covers only the availability fact; CON-2 presupposes a "reported disposition" member no requirement emits; and the distinction between echoing a disposition and deciding one is untested by AC-6. The admitted support set is supplied only "when one is supplied", and the disposition to report when it is absent is unstated. | FR-123, FR-123-CON-1, FR-123-CON-2, FR-123-AC-2, FR-123-AC-6 |
| FND-1829 | medium | Availability containment is undecidable under the window's second coverage form. FR-122 admits a window carrying only the content digest of the ordered observation-record set plus "its retrievable immutable set document", while FR-123-AC-4 refuses an availability fact naming a record "the bound documents do not contain". With only the digest present, containment cannot be decided without retrieving that set document — a retrieval FR-121 and FR-122 both forbid reaching the network for, whose owner and locus no requirement names, and whose unretrievability carries no refusal. | FR-122, FR-123-AC-4, FR-121, FR-122-CON-5 |
| FND-1830 | medium | **Cross-half.** One incompleteness gets opposite dispositions on the two sides of the join. FR-114-AC-3 admits a component outside a closed inventory when the inventory declares itself explicitly incomplete, retaining the `unknown` disposition FR-110 owns; FR-120-AC-4 refuses, blocking, any component or endpoint identity the bound bundle does not export, and FR-121-AC-3 refuses any member `typeIdentity` the bundle does not export, with no exemption for that `unknown`. FR-121's `closedWorld` is a second, independent completeness declaration whose relation to the bound inventory's completeness member is unstated, so a closed-world population bound to an explicitly incomplete inventory is neither reconciled nor refused. | FR-114-AC-3, FR-120-AC-4, FR-121-AC-3, FR-121 |
| FND-1831 | medium | FR-121's closed-world universe has no carrier. AC-2 refuses a member whose `objectIdentity` lies outside "that declared universe", but the universe appears only as an unattributed Input: no behavior emits it as a document member, no requirement names its owner or its identity, and no disposition is stated for a document declaring `closedWorld` true while declaring no universe. Read literally, the refusal's referent can be supplied by the reader, which is the inference US-017 exists to prevent. | FR-121, FR-121-AC-2, FR-121-AC-1 |
| FND-1832 | medium | **Cross-half.** The v1.1 projection and the interface-version declaration collide. FR-126 requires the version `1.2.0` on *every* document the producer emits and refuses a document whose declared version the producer does not implement; FR-125 emits a v1.1 projection as a new document carrying its own identity, revision and digest, and FR-125-CON-5 permits a projection only to a target version the producer implements. Whether the projection declares `1.2.0` or a 1.1 version is unstated: if 1.1, FR-126-AC-7 refuses any document set holding the projection beside its source and FR-126-AC-5 refuses the projection itself; if `1.2.0`, the projection declares the interface version it is not. | FR-125, FR-125-CON-5, FR-126, FR-126-AC-5, FR-126-AC-7 |
| FND-1833 | medium | The fourth of the four versions is unowned and unmeasured. FR-126-CON-2 keeps the interface version, the model revision, the digest domain `version` and the consumer's wire schema identity four distinct members, but FR-126-AC-8 exercises only the model revision and the digest domain `version` substituted *for* the interface version. No criterion covers a wire schema identity substitution — and the producer declares no `Wire { identity, version }` member at all, so it has nothing to refuse — nor the reverse substitutions of an interface version offered as a digest domain `version` or as a revision `value`. The same member is also spelled three ways across the range: FR-112 authors it as the "digest-domain normalization revision", FR-126 as the "digest domain version", NFR-036 as the "digest normalization revision". | FR-126-CON-2, FR-126-AC-8, FR-112, NFR-036 |
| FND-1834 | medium | NFR-037's bounds are read from a configuration the bounded read must already have parsed. Every bound comes from the configuration document's declared `resourceLimits`, but the configuration that authorizes an assessment document is a member *of that document* (FR-119), and the document must be read before that member is available. Which bounds govern the read that discovers the configuration is unstated, as is the precedence among the bound refusal (NFR-037), the absent-or-unknown interface version refusal (FR-126-AC-5, AC-6) and the document-member refusals (FR-119). Each refusal must name its offending member, so two implementations can name different members for one document and both pass, while NFR-037's cross-architecture golden compares only the admit-versus-refuse decision. | NFR-037, FR-119, FR-126-AC-5, FR-126-AC-6 |
| FND-1835 | medium | **Cross-half.** The closure-termination exemption granted on the static side does not reach the assessment side. FR-124 enumerates "the exact required native definition-closure identities" and explicitly reuses FR-116's cardinality rule, but its Dependencies cite FR-116, FR-119, FR-120 and FR-122 only — not FR-111, whose circular-and-unresolved `unknown` control was the whole basis for dispositioning FND-1719 as *recorded* against FR-116. FR-124 therefore restates the closure obligation with neither a termination guarantee nor the citation that excused its absence. | FR-124, FR-116, FR-111 |
| FND-1836 | low | Purity gap in the assessment half's temporal members. FR-122-CON-5 forbids reaching a wall clock, database state, event arrival order or query default for membership and elapsed time, yet the producer must emit `observedAt` as an observation instant and a `fixed-sample` `epoch`, whose authored source no requirement states and whose derivation from a clock nothing forbids. FR-122-AC-9 compares two runs under an altered clock, but NFR-036 excludes assessment documents (FND-1822), so no determinism gate holds two emissions of one snapshot document byte-identical. | FR-122, FR-122-CON-5, FR-122-AC-9, NFR-036 |
| FND-1837 | low | An availability fact has no identity of its own. FR-119-AC-5 refuses two assessment *documents* sharing one identity under one revision, while FR-123-CON-1 gives an availability fact only an observation-record identity and a reason. Two facts naming one observation record with two different reasons are therefore neither refused as a collision nor stated to merge, and nothing says whether one observation record may carry more than one availability fact. | FR-123-CON-1, FR-119-AC-5 |
| FND-1838 | low | FR-122 requires the producer to decide a property of a claim it does not own. AC-5 refuses "a temporal or choreography selection" carrying no window, taking "the selected claim's declaration of whether it is temporal or choreography-aware" as an Input with no carrier member, no owner, and no disposition when that declaration is absent or disagrees with the profile. This is the same evaluator-owned boundary FR-123 is careful to keep on the evaluator's side, crossed in the neighbouring requirement. | FR-122, FR-122-AC-5, FR-123-CON-3 |

## Verdict

**CONDITIONAL** — read as one design, the assessment half inherits the static
half's discipline in vocabulary but not in enforcement, and the join carries
three classes of defect that no single-half review could have found.

The binding the whole assessment half rests on names members the static bundle
is not required to carry (FND-1820) and compares them against an "admitted
bundle" with no defined identity, set or lifetime (FND-1823), so the stale and
re-admitted static selection US-017 exists to prevent remains reachable. The
determinism the digest comparison presupposes is explicitly disclaimed for
assessment documents by NFR-036 and silently assumed by NFR-037 (FND-1822).
Export identity across the halves rests on a partition of the closed export-kind
vocabulary that nobody enumerates (FND-1825) and on three export classes with no
admissible kind at all (FND-1824). And the indivisible admission that closed
FND-1712 on the static side has no counterpart on the assessment side
(FND-1827), while the availability-versus-truth prohibition is crossed by the
same requirement that states it (FND-1828).

FND-1821 and FND-1832 are outright contradictions between paired requirements —
the interface version against the bundle's exact member-class list, and the v1.1
projection against the version-refusal rule — and both are `Compile`- or
`Contract`-verified on both sides, so neither will be discovered by
implementation choosing one reading.

## Failure dispositions

Verification cells for these criteria carry this repository's bare ISO method
words; the `spec-matrix` pass allocates TC ids after this review, so the Control
column names the stating requirement rather than a test case.

| Failure | Required disposition | Control |
| --- | --- | --- |
| Assessment document naming a static bundle whose digest selection differs from the admitted bundle's | Refuse as a stale static selection — but the bundle carries no own identity or digest member to compare | FR-120-AC-2, FND-1820 |
| Assessment document naming a static bundle that was never admitted | Refuse, naming the unadmitted bundle — but "admitted" names no set, key or lifetime | FR-120-AC-3, FND-1823 |
| Two static bundles admitted under one identity | **Unstated** — only assessment documents have an identity-collision refusal | FND-1823 |
| Assessment document read before its named bundle is admitted | **Unstated** — no ordering obligation between the halves | FND-1823 |
| Assessment document offered in place of a static admission | Refuse, naming static admission as the missing input | FR-120-AC-5 |
| Static admission attempted with no assessment document present | Admit; no assessment document is ever a prerequisite | FR-120-CON-2, FR-120-AC-8 |
| Static bundle exposing a member that names an assessment document | Refuse by construction; the binding is one-directional | FR-120-CON-3 |
| Static selection changed while an existing assessment document is retained | Emit a new assessment document; never edit the existing one | FR-120-AC-6, FR-120-CON-5 |
| `population` export kind inside a static bundle | Refuse, naming the offending export | FR-117-AC-7 |
| `population` export kind on an assessment correspondence record | Admit, naming its owning assessment document | FR-120-AC-7, FR-124-CON-4 |
| Static-only export kind on an assessment correspondence record | Refuse — but no requirement enumerates which kinds are static-only | FR-124-AC-6, FND-1825 |
| Exported snapshot, window or observation-record identity needing an export kind | **Unsatisfiable** — the closed consumer vocabulary carries no such kind | FND-1824 |
| Export mapping naming an export its named producer object does not export, or one owned by another record's producer object | Refuse the correspondence record, naming the unexported or foreign export | FR-124-AC-3, FR-124-AC-4 |
| Assessment document whose digest omits its `version` or substitutes its digest domain | Refuse, naming the absent `version` or the substituted domain | FR-119-AC-2 |
| Assessment document revision under an undeclared namespace | Refuse, naming the undeclared namespace — under which configuration document is unstated | FR-119-AC-3, FND-1826 |
| Assessment document authorized by a configuration other than the bound bundle's | **Unstated** — two configurations may govern one bound pair | FND-1826 |
| Two assessment documents sharing one identity under one revision | Refuse both as an identity collision; never merge | FR-119-AC-5 |
| Unvalidated or unbound assessment document value observable between emission and binding | **Unstated** — no indivisible admission exists on this side | FND-1827 |
| Member `typeIdentity` naming a type the bound bundle does not export | Refuse, naming that type identity | FR-121-AC-3 |
| Member admitted under an explicitly incomplete inventory, then bound by an assessment document | **Colliding** — `unknown` retained statically, blocking refusal on assessment | FND-1830 |
| Closed-world population whose member lies outside the declared universe | Refuse, naming that object identity — the universe has no carrier | FR-121-AC-2, FND-1831 |
| Absence, explicit null and a present value collapsed in a field-member state | Refuse, naming that field member | FR-121-AC-4 |
| Relationship instance naming an endpoint the document does not declare | Refuse, naming the dangling endpoint identity | FR-121-AC-5 |
| Two observations of one object | Two records; never merged, and membership claims neither record's coverage | FR-121-AC-6, FR-122-AC-8 |
| Object identity reconstructed from a field value or a foreign key | Authored identity only; never reconstructed | FR-121-CON-3, FR-121-AC-7 |
| Window coverage form belonging to another clock family | Refuse, naming the incompatible coverage form | FR-122-AC-3 |
| Window selecting from two populations, or a population and a snapshot | Refuse, naming the competing selection sources | FR-122-AC-4 |
| Temporal or choreography selection carrying no window | Refuse; construct no window — but the temporal property has no carrier or owner | FR-122-AC-5, FND-1838 |
| `fixed-sample` `period` expressed as a binary floating-point value | Refuse, naming that period; substitute no binary64 value | FR-122-AC-6, FR-122-CON-3 |
| Membership or elapsed time inferred from a clock, database state, arrival order or query default | Zero such reads; identical documents across an altered run | FR-122-CON-5, FR-122-AC-9 |
| `observedAt` instant or `fixed-sample` `epoch` derived from a wall clock | **Unstated** — the authored source of both is unspecified | FND-1836 |
| Assessment document canonical bytes or digest varying by host or run | **Unstated** — NFR-036 excludes assessment documents; NFR-037 assumes it does not | FND-1822 |
| Unavailable observation represented as an absent membership member | Refuse, naming the omitted member; shrink no declared membership | FR-123-AC-5, FR-123-CON-4 |
| Unavailable observation represented as a false result | Refuse; availability is declared, truth is the evaluator's | FR-123, FR-123-AC-1 |
| Availability fact naming no observation-record identity, or one the bound documents do not contain | Refuse the fact — containment is undecidable under a digest-only window | FR-123-AC-3, FR-123-AC-4, FND-1829 |
| Two availability facts naming one observation record with different reasons | **Unstated** — a fact carries no identity of its own | FND-1837 |
| Producer document reporting a truth disposition of its own | Refuse — but the retained and reported dispositions have no carrier, and "of its own" is undefined | FR-123-AC-6, FND-1828 |
| Availability fact inside the admitted support set, with no support set supplied | **Unstated** — the disposition to report is unspecified | FND-1828 |
| v1.1 projection whose source carries an authored presence a v1.1 reader would derive differently, or a 1.2-only member with no counterpart | Refuse with an identity-preserving loss record naming every lost member | FR-125-AC-2, FR-125-AC-3, FR-125-AC-7 |
| Source rewritten so that a refused projection passes | Refuse, naming the rewritten member; emit the source unchanged | FR-125-AC-4, FR-125-CON-2 |
| v1.1 document offered as a 1.2 document | Refuse, naming the absent authored presence; never widen | FR-125-AC-5 |
| Interface version declared on a v1.1 projection document | **Contradictory** — `1.2.0` on every emitted document against a 1.1 target | FND-1832 |
| Interface version member absent, or declaring a version the producer does not implement | Refuse, naming the version or the absent member; never default and never read as the nearest known version | FR-126-AC-5, FR-126-AC-6, FR-126-CON-3 |
| Two interface versions inside one document set | Refuse the set, naming both versions and their documents; admit no agreeing subset | FR-126-AC-7, FR-126-CON-4 |
| Model revision or digest domain `version` offered in place of the interface version | Refuse, naming the substituted member | FR-126-AC-8 |
| Wire schema identity offered in place of the interface version, or the interface version offered in place of a revision or digest `version` | **Unstated** — the fourth version has no producer member and no criterion | FND-1833 |
| Interface version member required on the static bundle type | **Contradictory** — FR-117-CON-1 fixes exactly nine member classes | FND-1821 |
| Assessment document exceeding a declared byte, depth or member-count bound | Refuse, blocking, naming the exceeded bound; never exhaust memory, overflow a stack or hang | NFR-037 |
| Bound taken from a crate constant, environment variable, working directory, clock or network read | Zero such bounds; every bound from the configuration's declared `resourceLimits` | NFR-037 |
| Bound governing the read that discovers the configuration naming the bounds | **Unstated** — and no precedence among bound, version and member refusals | FND-1834 |
| Cyclic or self-referential native definition closure in an assessment correspondence | **Unstated** — FR-111's `unknown` control is not cited here | FND-1835 |
| Emission of any assessment document presented as campaign acceptance of a claim | Never; every emission is a producer act only | FR-119-AC-6, FR-121-AC-8, FR-123-AC-7, FR-124-AC-8 |

## Dispositions

Applied in change record CR-095-2 against the orchestrator's decisions
E1..E14. A finding marked *applied* is closed by the cited decision; one
marked *declined* or *recorded* states why it changes nothing. Two upstream
gaps in the consumer's own closed vocabularies are recorded as an open
cross-repo item and are not obligations of this interface.

| ID | Disposition | Record |
| --- | --- | --- |
| FND-1820 | applied | E1 — see FND-1800; the binding key now exists as a header member. |
| FND-1821 | applied | E1 and E2 — see FND-1801. |
| FND-1822 | applied | E4 — see FND-1806; NFR-037 cites NFR-036 instead of asserting the opposite inheritance. |
| FND-1823 | applied | E9 — an admitted bundle is keyed by identity, revision and digest together; an identity collision refuses; re-admission over different bytes is a different bundle and a prior binding refuses as stale. |
| FND-1824 | applied | E3 — FR-124 requires no snapshot, window or observation-record export mapping; those are addressed as artifact references and a clock binding requirement. |
| FND-1825 | applied | E3 — the partition is enumerated once by FR-120 as one assessment member and its complement. |
| FND-1826 | applied | E11 — an assessment document's configuration selection must equal the bound static bundle's; a mismatch refuses naming both. |
| FND-1827 | applied | E10 — FR-119 owns indivisible admission for every assessment document, citing FR-117 for the shape. |
| FND-1828 | applied | E5 — see FND-1808. |
| FND-1829 | declined, recorded | No retrieval is introduced. E8 requires the producer to emit the declared observation-record set, so availability containment is checked against that set rather than by fetching a digest-only window. |
| FND-1830 | applied | E7 and E8 — FR-110 keeps inventory closure and `unknown`; the closed-world universe is a declared member of the population document with the absent case refusing. |
| FND-1831 | applied | E8 — `declaredObjectUniverse` is a member of the population document, and absence refuses rather than reading as an open world. |
| FND-1832 | applied | E13 — see FND-1802. |
| FND-1833 | applied | E8 and E14 — FR-126 owns all four versions and names a member for each, `wireSchema` included. |
| FND-1834 | applied | E11 — the bounds come from the one reconciled configuration selection. |
| FND-1835 | applied | E7 — FR-124 cites FR-111 for the cycle and unresolved-support control, as FR-116 now does. |
| FND-1836 | applied | E8 — `observedAt` and the `fixed-sample` `epoch` are authored inputs read as declarations; deriving either from a wall clock, host clock, database timestamp or arrival time is prohibited, and an absent authored instant refuses. |
| FND-1837 | applied | E8 — an availability fact carries `availabilityFactIdentity`; two facts naming one observation-record identity refuse rather than merging. |
| FND-1838 | applied | E12 — the refusal triggers on a declared temporal or choreography selection supplied as an input; the producer interprets no clause, protocol or clock. |
