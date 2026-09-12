---
id: SR-200
title: "Base review of the Producer interface 1.2.0 static boundary"
type: SpecReview
analysis: base
scope: "US-016, FR-112..FR-118, NFR-036"
review_set: all
---
# Base specification review

## Summary

Targeted review of the static producer-boundary requirements, read against the
consumer wire shapes they promise to map onto member-for-member.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-1700 | high | FR-112 makes every digest a four-member selection and makes a bare hash string a blocking refusal, while FR-114 requires each locus to mirror the consumer's `ForeignLocus`, whose `source: ArtifactRef` carries a single raw-byte digest string; a producer cannot satisfy both. | FR-112, FR-112-CON-1, FR-114 |
| FND-1701 | high | FR-116 under-enumerates the consumer's `ProducerObject`: it never requires the `interface` member, and its Behavior and Outputs name only kind, identity, revision and digest although its own Inputs name `authority`. A conforming producer emits an incomplete producer object. | FR-116, FR-116-CON-1, FR-116-AC-1 |
| FND-1702 | medium | FR-116 requires exactly one correspondence record per consuming native clause role but never states how that cardinality maps onto the consumer's at-most-one `Model.correspondence`, so one model consumed by two clause roles is left to the reader. | FR-116, FR-116-AC-1 |
| FND-1703 | medium | FR-114..FR-116 enumerate "exported relationship, component, and endpoint identities", but the consumer addresses an export by its `Export.path` and by index into the owning model's export table; no identity-to-path mapping is declared. | FR-114, FR-115, FR-116, FR-116-AC-2 |
| FND-1704 | medium | FR-113 refuses every bare revision string with no carve-out for the consumer's deliberately bare native authority label, which a producer filling the native source member must emit. | FR-113, FR-113-CON-2, FR-113-AC-3 |
| FND-1705 | medium | FR-114 mirrors only the identity and revision of the locus source, leaving the remaining declared members of the consumer's source reference (kind, authority, ref version, digest, wire identity/version) unstated — the reader-completed gap this increment exists to close. | FR-114, FR-114-CON-4, FR-114-AC-1 |
| FND-1706 | medium | Producer FRs carry normative consumer obligations (FR-112 forbids a consumer defaulting an absent `version`; FR-117 states four consumer SHALL/SHALL NOT clauses), placing load on a system outside this bundle's boundary and outside this repository's verification reach. | FR-112, FR-117, FR-117-AC-1, FR-117-AC-4 |
| FND-1707 | medium | FR-118 leaves the numeric resource limit a `MAY` with no declared value and no declaring owner, yet FR-118-AC-8 asserts refusal before canonicalization as a Test; the criterion cannot be executed until the limit is declared. | FR-118, FR-118-AC-8, NFR-036 |
| FND-1708 | low | The §6 paragraph calls FR-112..FR-118 and NFR-036 normative "once their review and implementation gates pass", which is §6's own definition of provisional; FR-106..FR-111 are labeled provisional for exactly that reason. | spec.md §6, FR-112..FR-118, NFR-036 |
| FND-1709 | low | Record bookkeeping: §5 gained a sixth accretive class-row set, leaving five stale ranges standing; FR-118's prose dependency on FR-109 is not declared as a typed relationship; NFR-034 and NFR-035 are absent from this tree by deliberate global-maxima allocation, which `log.md` records. | spec.md §5, FR-118, NFR-036, spec/log.md |

## Verdict

**CONDITIONAL** — the increment is well-formed, internally traceable, and
correctly confined to the static half of the producer interface, but it does not
yet close the boundary it claims to close. FR-112 and FR-113 map cleanly onto
the consumer's digest and revision selections in isolation; where the producer
must fill a consumer structure that deliberately carries a bare digest string or
a bare native revision label, the blanket rules contradict FR-114's mirroring
obligation rather than carving out the exception (FND-1700, FND-1704). FR-116
under-enumerates the producer object and leaves both its record cardinality and
its export addressing to the reader (FND-1701, FND-1702, FND-1703), and FR-114
mirrors two of the seven members of the locus source (FND-1705). Those are the
same reader-completed gaps US-016 was written to remove. FR-115, FR-117 and
FR-118 are sound apart from the consumer obligations authored inside producer
scope (FND-1706) and the undeclared numeric limit (FND-1707). Resolve FND-1700
through FND-1707 before the matrix pass allocates TC ids against these criteria.

## Checks

| Check | Result |
| --- | --- |
| ID formats and uniqueness | US-016, FR-112..FR-118, NFR-036, and every AC/CON id conform; no duplicates; FR and US ids contiguous, the NFR gap deliberate and logged |
| Required US sections and typed relationships | US-016 carries the house story, illustrative-example, exploratory-option, contextual-constraint, dependency, priority and traceability sections, and traces to StR-001 with two typed dependencies |
| Required FR sections and typed relationships | Description, Inputs, Outputs, Behavior, Constraints, Acceptance Criteria and Dependencies present in FR-112..FR-118; each implements US-016; FR-118's prose FR-109 dependency is untyped (FND-1709) |
| NFR measurability | NFR-036 states eight metrics with target, threshold and method, and a verification procedure that fails rather than passes when a gate cannot run |
| Adverse-axis ownership | Each of the eight adverse axes is owned by exactly one FR and carried as one criterion, as the increment claims |
| Consumer wire correspondence | Digest and revision selections map member-for-member; producer object, export addressing, correspondence cardinality, native revision label and locus source do not (FND-1700..FND-1705) |
| Status truthfulness | No implementation result is claimed, but the §6 status word contradicts §6's own vocabulary (FND-1708) |
| Test Matrix coverage | No TC rows exist yet; observation only — the matrix pass allocates TC ids after this review |
| Scoped `quire validate` | Clean over the review artifact; the six standing module-catalog notices are not findings |

## Coverage rules

1. Coverage: every AC and constraint is stated in a form a TC can bind, and none is yet bound; FR-118-AC-8 is the single criterion that cannot be bound as written (FND-1707).
2. Options: FR-112 and FR-113 enumerate both digest domains and both revision namespaces as the alternatives to be permuted; FR-118 enumerates the `1`/`1.0`/`1e0` and set-versus-semantic-order alternatives.
3. Boundaries: the adjacent-integer pair, the absent and undeclared digest version, the undeclared revision namespace, and the closed-versus-incomplete inventory are each stated as boundaries.
4. Errors: every refusal is stated as blocking and explicitly not a warning, a cache miss, or a refetch invitation; the loss record of FR-115 names the relationship identity rather than a guessed value.
5. State: static admission is separated from assessment throughout, and an explicitly incomplete inventory retains `unknown` rather than shrinking its denominator.
6. Edges: the self-relationship with one type identity on both endpoints, the four coinciding display names, the presentation-only native re-encoding, and equal hash text across two digest domains are retained rather than collapsed.
7. Atomicity caveat: FR-114-AC-1, FR-115-AC-1, FR-116-AC-3 and FR-117-AC-1 each conjoin several independent assertions, so one failing TC will not localize which member was lost; the matrix pass should bind more than one TC per such criterion.

## Dispositions

Applied in change record CR-095-1 against the orchestrator's decisions
D1..D24. A finding marked *applied* is closed by the cited decision; one
marked *carried to Plan-017* is an implementation obligation, not a spec
edit; one marked *declined* or *recorded* states why it changes nothing.

| ID | Disposition | Record |
| --- | --- | --- |
| FND-1700 | applied | D1 — FR-112/FR-113 govern producer-authored selections only; `ArtifactRef.digest` and `NativeSource.revision` are carved out by FR-112-CON-4 / FR-113-CON-4 and admitted by FR-112-AC-6 / FR-113-AC-6 / FR-114-AC-4. |
| FND-1701 | applied | D17 — FR-116 Description, Inputs, Behavior, CON-1 and AC-1 now enumerate all six producer-object members including `interface` and `authority`. |
| FND-1702 | applied | D22 — cardinality restated as one record per selected (producer object, native artifact) pair; FR-116-CON-4 states the mapping onto the consumer's at-most-one nullable per-model correspondence. |
| FND-1703 | applied | D3 — FR-116 declares an export mapping per exported record carrying the producer identity, `exportKind` and ordered `exportPath` (CON-5, AC-8). |
| FND-1704 | applied | D1 — see FND-1700; FR-113's bare-string refusal is narrowed to revision selections the producer authors. |
| FND-1705 | applied | D2 — FR-114 enumerates every `ForeignLocus` member at the pinned revision, including all seven `ArtifactRef` members and the cited closed artifact-kind vocabulary. |
| FND-1706 | applied | D11 — every consumer-subject SHALL removed from FR-112 and FR-117 and replaced by its producer-side counterpart; the consumer boundary is Dependencies context only. |
| FND-1707 | applied | D8 — the numeric limit is now the configuration's declared `numericResourceLimit`; the refusal is a SHALL and FR-118-AC-8 is executable. |
| FND-1708 | applied | D16 — spec.md §6 now labels FR-112..FR-118 and NFR-036 provisional, naming this review and the Plan-017 evidence as their gates. |
| FND-1709 | part-applied, part-recorded | D9 typed FR-118's prose FR-109 dependency. The spec.md §5 accretion is the repository's established append precedent and is recorded, not charged. The NFR-034/NFR-035 gap is the deliberate global-maxima allocation already logged. |
