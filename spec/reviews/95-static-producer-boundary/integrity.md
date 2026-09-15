---
id: SR-202
title: "Integrity review of the Producer interface 1.2.0 static boundary"
type: SpecReview
analysis: integrity
scope: "US-016, FR-112..FR-118, NFR-036"
review_set: all
---
# Integrity review

## Summary

US-016 is elaborated by FR-112..FR-118 and constrained by NFR-036 under
StR-001 by way of US-016's `traces_to` edge; every one of the seven FRs carries
an `implements` edge to US-016, every acceptance criterion and every constraint
names a declared verification method (Test or Inspection), and the
`depends_on` graph over FR-107, FR-109, FR-110, FR-112..FR-117 is acyclic. TC
ids are deliberately unallocated at this stage, so the Verification cells carry
the bare ISO method word; that is recorded as an observation, not a finding.

Each of the eight adverse axes does resolve to a single owning FR, and each
owner carries it as one single-axis criterion: missing identities FR-117-AC-2,
digest mismatch or domain substitution FR-112-AC-2/AC-3, revision namespace
substitution FR-113-AC-2, foreign or cross-bound exports FR-116-AC-2, endpoint
role/multiplicity loss FR-115-AC-3, absent component/endpoint provenance
FR-114-AC-2, changed selection with stale correspondence FR-116-AC-3, and
incomplete inventory FR-114-AC-3. No axis is claimed twice.

The set is nevertheless not yet single-interpretation. One high: the static
bundle FR-117 admits has no profile member, and FR-117-CON-1 closes the member
set at "exactly" seven classes, while FR-115 requires a profile identity in
every relationship's ownership triple, FR-116 admits a producer *profile* as
the selected producer object, and FR-117's own behavior requires type/profile
admission from the bundle alone — so the profile is simultaneously required and
prohibited. Five mediums are contradictions, duplicated obligations, or
unowned obligations: "every digest" and "every revision" as selections versus
the bare-string `ArtifactRef.digest` and `NativeSource.revision` members of the
consumer shapes FR-114 mirrors; the object's-own-digest exclusion owned twice
(FR-112-CON-2 and FR-118-CON-4); literal digest `version` "1" and a closed
two-namespace vocabulary versus the same values being configuration-declared and
refusable; an optional (`MAY`) undeclared numeric resource limit against
FR-118-AC-8's obligation and NFR-036's cross-architecture agreement; the
absent-member axis covering identities only, so a wholly absent revision,
digest, ownership, or inventory member on a record is refused by nothing; and
FR-115's inline `source`/`target` endpoint records carrying no endpoint
identity, leaving no join to FR-114's first-class endpoint records. Three lows
are an overloaded "closure", consumer-side obligations placed inside producer
FRs together with an unobligated consumer `Export.path`, and NFR-036 being
unreferenced by the FRs it constrains. No atomicity defect was found: each FR
states one obligation class, and every criterion is externally observable at the
producer's emitted bytes or refusals.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-1720 | high | The static bundle has no profile member, yet FR-115's ownership triple, FR-116's selectable producer profile object, and FR-117's own type/profile admission all require one — and FR-117-CON-1 closes the member set at "exactly" seven classes, prohibiting it. | FR-117, FR-117-CON-1, FR-117-AC-1..AC-2, FR-115, FR-116, US-016 |
| FND-1721 | medium | "Every digest" as a four-member selection and "every revision" as a two-member selection contradict the consumer shapes the same increment mirrors: `ArtifactRef.digest` is a bare string and `NativeSource.revision` is a bare string, so a conforming locus is refusable by FR-112-AC-5 and FR-113-AC-3. No clause bounds which digests and revisions the selection obligations govern. | FR-112, FR-112-CON-1, FR-112-AC-5, FR-113-AC-3, FR-114 |
| FND-1722 | medium | One observable obligation is owned twice: exclusion of an object's own digest member from the bytes it digests is stated in FR-112-CON-2, again in FR-118-CON-4, and a third time in FR-118's behavior. | FR-112-CON-2, FR-118-CON-4, FR-118 |
| FND-1723 | medium | Fixed literals and configuration authority conflict: FR-112 mandates `version: "1"` while also requiring `version` to be the configuration-declared normalization revision and refusing a version undeclared for its domain; FR-113-CON-1 closes the namespace vocabulary at two spellings while also requiring the configuration document to declare each namespace and refusing undeclared ones. Which side is authority is not decided. | FR-112, FR-112-AC-4, FR-113, FR-113-CON-1, FR-113-AC-4 |
| FND-1724 | medium | The numeric resource limit is permissive and undeclared: FR-118 says the producer MAY refuse, FR-118-AC-8 requires refusal, and no requirement declares the limit's value or its detection — while NFR-036 requires byte and behavior agreement across host architectures, which a host-specific optional limit defeats. | FR-118, FR-118-AC-8, NFR-036 |
| FND-1725 | medium | The missing-identity axis covers identities only. FR-117-AC-2 enumerates absent identities, FR-114-AC-2 only an absent locus, FR-115-AC-3 only role and multiplicity, and FR-112/FR-113 only malformed selections — so a component, endpoint, or relationship record whose revision, digest, ownership, or inventory member is wholly absent is refused by no requirement. | FR-117-AC-2, FR-114-AC-2, FR-115-AC-3, FR-112, FR-113 |
| FND-1726 | medium | Two non-equivalent endpoint shapes with no stated relation: FR-115's `source`/`target` records carry `typeIdentity`, `role`, and `multiplicity` but no endpoint identity, so they cannot be joined to the first-class endpoint records FR-114 declares, although FR-115's dependency prose asserts that they name them. | FR-115, FR-115-AC-1..AC-2, FR-114 |
| FND-1727 | low | "Closure" is overloaded and the refusals may be read as one: FR-117 carries a configuration static closure and refuses an absent "closure identity" without saying which closure, while FR-116-AC-5 refuses an incomplete native definition closure. | FR-117, FR-117-AC-2, FR-116-AC-5 |
| FND-1728 | low | Obligations are placed on an actor outside the specified system and are unobservable at the producer boundary — "The consumer SHALL NOT default an absent `version`" and FR-117's three consumer clauses; conversely FR-116 obligates an "export identity" that the consumer's `Export { kind, path, locus }` does not carry, and obligates its `path` nowhere. | FR-112, FR-117, FR-116, FR-116-CON-2 |
| FND-1729 | low | NFR-036 constrains FR-117 and FR-118 but neither FR references it back in its dependencies, so the constraint is discoverable only from the NFR side; relatedly, spec.md §5 now carries five overlapping range triples with none marked superseded — the increment follows the established append precedent, so this is recorded rather than charged to it. | NFR-036, FR-117, FR-118, spec/spec.md §5 |

## Verdict

**CONDITIONAL** — the eight adverse axes are cleanly owned, the traceability
chain US-016 → FR-112..FR-118 / NFR-036 → StR-001 is complete, every obligation
is externally observable, and no FR bundles two behavior classes. Admission of
the set is conditional on FND-1720, which makes the profile both required and
prohibited and cannot be resolved by a reader, and on the five mediums, each of
which leaves a requirement with more than one valid interpretation or leaves an
absent member owned by nothing.

## Integrity controls

| Invariant | Evidence |
| --- | --- |
| Every US maps to at least one FR, and every FR to a US and thence to StR-001 | US-016 `traces_to` StR-001; FR-112..FR-118 `implements` US-016 |
| Every criterion and constraint names a declared verification method | FR-112..FR-118 Acceptance Criteria and Constraints tables; NFR-036 Verification |
| Digest domain and digest version stay separate authored members | FR-112-CON-3 / FR-112-AC-4 |
| Revision namespace and revision value stay separate, and equal value never merges | FR-113-CON-3 / FR-113-AC-5 |
| Repository, component, role, and endpoint identities stay four identities | FR-114-CON-1 / FR-114-AC-1 |
| Source and target endpoints stay independent under one type identity | FR-115-CON-3 / FR-115-AC-2 |
| Canonical and native digest selections stay distinct when hash text coincides | FR-116-CON-3 / FR-116-AC-2 |
| The static bundle carries no assessment member and mints none | FR-117-CON-1 / FR-117-AC-1, FR-117-AC-3 |
| Canonical numbers never pass through binary floating point | FR-118-CON-1 / FR-118-AC-3, NFR-036 float-coercion metric |
| Static admission reads no ambient input | FR-117-CON-3 / FR-117-AC-5, NFR-036 ambient-input metric |
| Static admission is not campaign acceptance of an assessment claim | FR-117-AC-6, spec.md §6 status paragraph |
| Unowned by any control: an absent revision, digest, ownership, or inventory member on a record | FND-1725 |

## Dispositions

Applied in change record CR-095-1 against the orchestrator's decisions
D1..D24. A finding marked *applied* is closed by the cited decision; one
marked *carried to Plan-017* is an implementation obligation, not a spec
edit; one marked *declined* or *recorded* states why it changes nothing.

| ID | Disposition | Record |
| --- | --- | --- |
| FND-1720 | applied | D6 — the static bundle's member classes are the nine including `profile`, worded identically in FR-117's Description, Behavior, CON-1 and AC-1. |
| FND-1721 | applied | D1 — see FND-1700. |
| FND-1722 | applied | D13 — FR-118-CON-4 is the sole owner of the self-digest exclusion; FR-112-CON-2 now obliges the producer to take digest input from FR-118's canonicalizer instead of restating it. |
| FND-1723 | applied | D8 — the FR fixes the closed admissible vocabulary and the configuration declares which member of it this bundle selects; outside-vocabulary and unselected are separate refusals (FR-112-CON-5, FR-113-CON-5). |
| FND-1724 | applied | D8 — see FND-1707 and FND-1716. |
| FND-1725 | applied | D5 — FR-117-AC-2 covers any absent required member: identity, namespaced revision, digest selection, provenance locus, ownership member, inventory membership, or static prerequisite closure. |
| FND-1726 | applied | D7 — FR-115's source and target endpoint records carry `endpointIdentity` joining FR-114's declarations; a join naming no declared endpoint refuses (CON-5, AC-4, AC-5). |
| FND-1727 | applied | D13 — FR-117's static prerequisite closure refusal names itself distinctly from the native definition closure FR-116 owns (FR-117-CON-5). |
| FND-1728 | applied | D3 and D11 — export addressing is declared as identity plus kind plus path, and foreign-actor obligations are removed. |
| FND-1729 | applied | D16 — NFR-036 is referenced from FR-117's and FR-118's Dependencies. The §5 range accretion is recorded under the repository's append precedent. |
