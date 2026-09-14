---
id: SR-201
title: "Failure-domain review of the Producer interface 1.2.0 static boundary"
type: SpecReview
analysis: failure-domain
scope: "US-016, FR-112..FR-118, NFR-036"
review_set: all
---
# Failure-domain review

## Summary

Targeted review of identity confusion across digest domains, revision
namespaces, component/endpoint/role/repository identities and export ownership,
of evaluation purity in the canonical-form and admission paths, and of the
unstated dispositions in the admission path.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-1710 | high | FR-114 and FR-115 require identity, revision, digest, ownership and inventory members on component, endpoint and relationship records, but name no carrier for them: the consumer's `component`/`endpoint`/`relationship` export kinds resolve to `Export { kind, path, locus }`, and the consumer's own `Relationship { name, model, binding, locus }` is a protocol record in a different domain that shares the spelling. | FR-114, FR-115, US-016 |
| FND-1711 | high | FR-116 asserts that the correspondence record carries the definition closure and the exported relationship/component/endpoint identities, but the consumer places export records under `Model.exports` and the closure under `Definition.requires`, leaving `Correspondence { producer, native, relation, exports }` holding only indices. Export ownership therefore has two incompatible stories, and FR-116-AC-2's "export owned by another correspondence's producer object" names an ownership relation no stated member expresses. | FR-116, FR-116-AC-2 |
| FND-1712 | high | FR-117 requires an unconstructible bundle type but never requires construction and validation to be one indivisible step, states no disposition for the partially built value of a refused admission, and pairs "immutable" with no control over member mutation after admission. A construct-then-validate path — which `ProducerBundle::from_json` plus a separate `validate` already is — satisfies every FR-117 SHALL while handing a consumer an unvalidated bundle. | FR-117, FR-117-CON-2, FR-117-AC-4 |
| FND-1713 | high | The admission path carries two colliding dispositions for one incomplete inventory: FR-114 retains `unknown` for an unlisted component or endpoint while an inventory declares itself explicitly incomplete, and FR-117 refuses a bundle omitting a required component or endpoint identity. No requirement says whether an explicitly incomplete inventory admits a static bundle, and the bundle's seven member classes carry no member for an `unknown` disposition. | FR-114, FR-114-AC-3, FR-117, FR-117-AC-2 |
| FND-1714 | medium | FR-113-CON-1 closes the revision namespace vocabulary to exactly two spellings, but the consumer carries `Revision` on artifact references that are neither producer objects nor native definitions — the contract artifact, the baseline artifact, the producer binary, and an authored requirement — so a revision the producer must emit has no admissible namespace and falls under FR-113's own refusal of an undeclared namespace. | FR-113, FR-113-CON-1 |
| FND-1715 | medium | FR-113 refuses a bare revision string with no exemption, while the consumer requires a bare-string revision on its editable native authority label, which is deliberately not a formal revision. As written the producer must either refuse a required member or breach its own prohibition; the distinction between a formal revision and a native authority label is unstated. | FR-113 |
| FND-1716 | medium | Purity gap: FR-118's `MAY` refusal under an implementation resource limit makes admission a function of the implementation rather than of the declared document, and nothing requires the configuration document to declare that limit. NFR-036 measures canonical-byte agreement across host architectures but measures no refusal agreement, so two hosts can disagree on admit-versus-refuse at 100% byte agreement — and FR-117-AC-5 varies environment, working directory, clock and network but not the resource limit. | FR-118, NFR-036, FR-117-AC-5 |
| FND-1717 | medium | Canonical bytes and wire bytes are not distinguished: FR-118 sorts every object's keys by Unicode scalar-value order, while the consumer's records are specified in the contract's own canonical member order, in which the digest selection reads `domain, version, algorithm, value`. No requirement states whether the transmitted bundle bytes are the canonical digest bytes or a separate serialization, so a digest recomputed from received bytes can differ from the declared digest with nothing substituted — the cross-domain refusal FR-112 makes blocking, raised by a serialization difference. | FR-112, FR-118 |
| FND-1718 | low | FR-116 fixes cardinality at exactly one correspondence record per consuming native clause role, while the consumer holds at most one nullable correspondence per model. The mapping between the two cardinalities is unstated, and no disposition is given for two records naming one clause role or for a selected producer object that no native clause role consumes. | FR-116, FR-116-AC-1 |
| FND-1719 | low | FR-116 enumerates the required native definition closure but states no termination guarantee and no disposition for a cyclic or self-referential closure. FR-111's circular-and-unresolved `unknown` control is not among FR-116's declared dependencies, so this increment restates neither the control nor its exemption. | FR-116, FR-111 |

## Verdict

**CONDITIONAL** — the increment closes the digest-version and revision-namespace
gaps it set out to close, and its refusals are stated as blocking rather than as
warnings or cache misses. Three things block a clean pass. The component,
endpoint and relationship records require members for which no carrier is named
(FND-1710), so the consumer-side reconstruction US-016 exists to prevent remains
available. Export ownership and the definition closure are claimed by the
correspondence record while the consumer's shapes own them elsewhere (FND-1711),
which leaves the cross-bound-export refusal without a locus. And the admission
path admits two dispositions for one incomplete inventory while permitting a
two-step construct-then-validate boundary (FND-1712, FND-1713).

## Failure dispositions

Verification cells for these criteria carry the bare ISO method word; the
`spec-matrix` pass allocates TC ids after this review, so the Control column
names the stating requirement rather than a test case.

| Failure | Required disposition | Control |
| --- | --- | --- |
| Digest domain substituted between canonical-JSON and native raw bytes | Refuse, blocking; never revalidate in the other domain | FR-112-AC-2 |
| Digest `version` absent or undeclared for its domain | Refuse; never default and never derive from the domain spelling | FR-112-AC-4 |
| Bare hash string offered as a binding digest | Refuse; bind nothing | FR-112-AC-5 |
| Revision namespace substituted across producer and native | Refuse; equal `value` spelling never merges two revisions | FR-113-AC-2, FR-113-AC-5 |
| Bare revision string offered as a revision | Refuse — but the native authority label's required bare string is unexempted | FND-1715 |
| Revision namespace outside the closed pair | Refuse — leaving contract, baseline, binary and requirement revisions unhomed | FND-1714 |
| Component or endpoint locus or formal document revision absent | Refuse, naming the offending record | FR-114-AC-2 |
| Repository, component, role and endpoint sharing one display name | Four distinct identities; never merged by equal spelling | FR-114-CON-1 |
| Component outside a closed declared inventory | Refuse admission; incomplete inventory retains `unknown` without shrinking its denominator | FR-114-AC-3 |
| Incomplete inventory offered to the static bundle | **Unstated** — FR-114 retains `unknown`, FR-117 refuses the omitted identity | FND-1713 |
| Endpoint role or multiplicity collapsed by a projection | Refuse with a named loss record carrying the relationship identity; never guess | FR-115-AC-3 |
| Export identity not exported by, or cross-bound to, another producer object | Refuse the correspondence record — but the owning member is unstated | FR-116-AC-2, FND-1711 |
| Selection changed while the prior binding relation is retained | Refuse; a presentation-only re-encoding requires a new selection and record | FR-116-AC-3 |
| Configuration provenance or definition-closure identity absent | Refuse the correspondence record | FR-116-AC-4, FR-116-AC-5 |
| Cyclic or self-referential definition closure | **Unstated** in this increment | FND-1719 |
| Assessment input offered to the static bundle | Refuse; never silently retain | FR-117-AC-3 |
| Unvalidated bundle value observable between construction and validation | **Unstated** | FND-1712 |
| Invalid Unicode string or non-JSON numeric value | Refuse, blocking; digest nothing | FR-118-AC-6 |
| Number exceeding an implementation resource limit | Refuse; never round and never substitute binary64 — but the limit is undeclared and its divergence unmeasured | FR-118-AC-8, FND-1716 |
| Canonical bytes varying by host, locale, environment, clock, network or insertion order | Zero variance against a committed golden | NFR-036 |
| Digest recomputed from received wire bytes disagreeing with the declared digest | **Unstated** — canonical order and wire member order are not reconciled | FND-1717 |

## Dispositions

Applied in change record CR-095-1 against the orchestrator's decisions
D1..D24. A finding marked *applied* is closed by the cited decision; one
marked *carried to Plan-017* is an implementation obligation, not a spec
edit; one marked *declined* or *recorded* states why it changes nothing.

| ID | Disposition | Record |
| --- | --- | --- |
| FND-1710 | applied | D3 — the carrier is stated: producer records live in the producer's own bundle document rather than in a consumer table entry, and the export mapping carries the addressing. |
| FND-1711 | applied | D3 and D22 — the correspondence declares the export mapping and the ownership relation its cross-bound refusal tests; the consumer's table indices are an explicit producer non-obligation (FR-116-CON-5). |
| FND-1712 | applied | D4 — FR-117 requires one indivisible admission operation that both constructs and validates, no public constructor, no public member, no bypassing deserialization, and no value of the type on refusal (CON-2, AC-4, verified by `Compile`). |
| FND-1713 | applied | D5 and D20 — a member outside a closed inventory refuses (FR-114); a declared-incomplete inventory is admitted carrying its completeness member with the `unknown` disposition FR-110 owns; FR-117's missing-member axis covers any required member. |
| FND-1714 | applied | D1 and D8 — the closed namespace vocabulary binds only revisions the producer authors, so the consumer's own contract, baseline, producer-binary and requirement revisions fall outside FR-113 rather than under its refusal. |
| FND-1715 | applied | D1 — FR-113-CON-4 names the native authority label as out of scope and FR-113-AC-6 admits it. |
| FND-1716 | applied | D8 — the host-specific MAY is deleted; NFR-036-M-3 now measures admit-versus-refuse agreement across the named architecture set beside byte agreement. |
| FND-1717 | applied | D12 — the digest is computed over FR-118's canonical byte string for the digested object; wire member order is never a digest input (FR-118-CON-6, AC-10; FR-112-AC-7). |
| FND-1718 | applied | D22 — two records for one selected pair refuse (FR-116-AC-6) and an unselected producer object carries no record (FR-116-AC-7). |
| FND-1719 | recorded | FR-111 already owns circular and unresolved support as `unknown`; FR-116's Dependencies now cite it rather than restating a second termination rule. |
