---
id: SR-205
title: "Risk and complexity review of the Producer interface 1.2.0 static boundary"
type: SpecReview
analysis: risk-complexity
scope: "US-016, FR-112..FR-118, NFR-036"
review_set: all
---
# Risk and complexity review

## Summary

Targeted review of the implementation risk and volatility carried by the static
producer boundary: exact arbitrary-precision decimal canonicalization in Rust,
consumer-side wire shapes owned by another repository, and the closed
revision-namespace and digest-version vocabularies.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-1750 | high | Exact-decimal canonicalization is blocked at the JSON parse seam, not in the canonicalizer: `serde_json = "=1.0.151"` carries no `arbitrary_precision` anywhere in the workspace, so `Value::Number` has already passed a fractional or out-of-integer-range literal through binary64 before `canonical_number` ever sees it. | FR-118, FR-118-CON-1, FR-118-AC-3, NFR-036 |
| FND-1751 | medium | Canonical object-key order is implicitly delegated to a dependency feature: the producer emits keys in `serde_json::Map` iteration order, which is scalar-value order only while the map is a `BTreeMap`; a `preserve_order` feature enabled by any workspace crate silently substitutes insertion order with no refusal. | FR-118-CON-2, NFR-036 |
| FND-1752 | high | The consumer records the producer must satisfy are owned by another repository and are not on a released line: `Export { kind, path, locus }` has no identity, revision, digest, ownership, or inventory member to receive FR-114's records, and `Correspondence` addresses native, relation, and exports by table index, which no requirement assigns. | FR-114, FR-116, FR-116-CON-2 |
| FND-1753 | medium | FR-114's locus under-declares against the `ForeignLocus` it says it mirrors — the consumer's `ForeignLocus.source` is a full `ArtifactRef/3` (`refVersion`, closed-vocabulary `kind`, `authority`, identity, revision, byte digest, `wire { identity, version }`) — so implementation must either author the remaining members or default them, the exact failure mode US-016 exists to prevent. | FR-114, FR-114-CON-4, US-016 |
| FND-1754 | medium | The closed vocabularies are spelled in normative behavior rather than held as configuration selections: FR-112 fixes `version: "1"` for both digest domains while also requiring `version` be the configuration-authored normalization revision, and FR-113-CON-1 closes the namespace vocabulary to exactly two spellings, so a second producer authority, a `filament-canonical-json-2`, or a native revision-namespace bump is a spec and refusal-path edit rather than a configuration change. | FR-112, FR-112-CON-3, FR-113-CON-1, FR-113-AC-4 |
| FND-1755 | medium | FR-117 is a breaking change to the shipped producer type, not an addition: `ProducerBundle` has public fields, a derived `Deserialize` that is itself an admission bypass, and required `population`, `observation_records`, and `window` members, and FR-112/FR-113 simultaneously widen the three-member digest and the bare revision strings it embeds. | FR-117, FR-117-CON-1, FR-117-CON-2, FR-112, FR-113 |
| FND-1756 | medium | NFR-036's verification apparatus is more novel than the behavior it measures — cross-architecture golden bytes, varied-locale and varied-environment runs, an instrumented offline network-namespace run, and float-path static analysis with a planted-token control and a named exemption list — and none of it exists in this repo today, while the requirement forbids a gate that cannot run from passing. | NFR-036 |
| FND-1757 | low | Inherited volatility and sequencing: §6 declares FR-112..FR-118 and NFR-036 normative for the producer side while their FR-106..FR-111 dependencies remain provisional, and no Test Matrix rows or TC ids exist yet (expected; the `spec-matrix` pass follows this review). | spec.md §6, FR-106..FR-111 |

## Risk register

| Req | Tech risk | Volatility | Drivers | Mitigation |
| --- | --- | --- | --- | --- |
| US-016 | Low | Medium | Narrative owner of the static half; the assessment half is deliberately deferred and may later split into a separate wire document | Keep the story's scope at the static boundary; carry the open question as a note only |
| FR-112 | Medium | High | Four-member selection replaces a shipped three-member `DigestTriple`; `version` is hard-coded `"1"` while also declared configuration-authored | Land the member widening once, together with FR-113; add an AC pair for a declared-but-different version admitted and an undeclared version refused |
| FR-113 | Low | High | Closed two-spelling namespace vocabulary in a constraint; bare `revision: String` today | Hold the vocabulary as a configuration-declared registry whose current selection is the two spellings; refuse on undeclared, not on unlisted-in-spec |
| FR-114 | Medium | High | Component and endpoint records have no receiving member in the consumer's `Export`; locus is a strict subset of `ForeignLocus` | Pin the consumer wire revision as a configuration-declared interface revision; prototype one component and one endpoint against a committed consumer fixture before tasking the rest |
| FR-115 | Low | Medium | Independent source/target endpoints and the ownership triple are additive to an existing `RelationshipDeclaration` | Property-test endpoint independence (self-relationship case) rather than hand-rolling fixtures |
| FR-116 | Medium | High | Export identity enumeration, closed export-kind vocabulary owned elsewhere, and index-table addressing that no requirement assigns | Slice exports separately from the producer/native selection; contract-test against a pinned consumer fixture; name the index assignment owner before tasking |
| FR-117 | Medium | Low | Unconstructible validated type in Rust with a derived `Deserialize` present; assessment members must leave the bundle | Split wire type from domain type (private fields, `TryFrom`, no public `Deserialize` on the validated type); sequence this before FR-112/FR-113 member widening |
| FR-118 | High | Low | Arbitrary-precision decimal with no binary64 coercion, against a pinned `serde_json` without `arbitrary_precision`; key order delegated to a dependency's map backing | Spike the raw-number parse seam first (feature audit versus a bespoke raw-number reader); test AC-3 as a parse-to-serialize round trip, not on the canonicalizer alone; gate the map-backing feature |
| NFR-036 | High | Low | Cross-architecture goldens, ambient-input instrumentation, and a float-path audit with a planted-token control, none of which exists here | Task the gates as their own track with the planted-token control as its first deliverable; a gate that cannot run fails |

## Top hazards

1. FR-118 and NFR-036 — the exact-decimal numeric domain. The canonicalizer's
   own decimal arithmetic is string-based and already correct; the hazard is one
   seam upstream of it, where `serde_json` hands over a `Value::Number` that has
   already been rounded. No refusal fires on that path, which is why the metric
   is zero incidents rather than a bound. Prototype before tasking.
2. FR-114 and FR-116 — the consumer-side shapes. They live in another
   repository, on an in-flight branch rather than a released line, and their
   `Export` and `Correspondence` records do not currently carry the members
   these requirements emit. Pin the targeted interface revision explicitly.
3. FR-112 and FR-113 — the closed vocabularies. Both are correct selections
   today and both are spelled where a later addition costs a spec edit and a
   refusal-path change instead of a configuration line.
4. FR-117 — the breaking producer type change. Unconstructibility, the removal
   of the assessment members, and the digest and revision widening all land in
   the same type; sequencing them wrong costs two migrations of every fixture.
5. NFR-036's gate apparatus — the largest block of genuinely new engineering in
   the increment, and the one most likely to be deferred into a gate that
   cannot run.

## Failure-domain gaps

See the failure-domain analysis for this increment. The risks above are
implementation and coordination risks, not unstated adverse axes: each of the
eight adverse axes is owned by exactly one FR and carried as a single-axis
acceptance criterion.

## Verdict

**PASS with managed implementation risk** — the requirements are specified
tightly enough to be implemented and refused against, and the volatility they
carry is named rather than hidden. The material risks are one dependency seam
(exact decimals before canonicalization), one cross-repository interface the
producer does not own, two closed vocabularies spelled in normative text, and a
verification apparatus larger than the behavior it measures. None of these is an
unstated requirement; each needs a spike or a pin before `spec-to-plan` slices
tasks.

| Risk | Containment |
| --- | --- |
| Binary64 coercion reaching canonical bytes | FR-118-CON-1 and NFR-036's zero-incident float-path audit; spike the parse seam first |
| Key or member order leaking the walk into the bytes | FR-118-CON-2, FR-118-AC-7, and NFR-036's permuted-insertion metric; gate the map-backing feature |
| Consumer wire drift in another repository | FR-116-CON-2's closed export vocabulary plus a configuration-declared interface revision and committed contract fixtures |
| A later digest version or revision namespace | FR-112-CON-3 and FR-113-CON-3 keep the members separate and authored; hold the vocabularies in configuration |
| Unvalidated bundle construction | FR-117-CON-2 and the admission entry point; wire-type/domain-type split |
| Static work presented as assessment acceptance | FR-117-AC-6 and the §6 status paragraph |

## Dispositions

Applied in change record CR-095-1 against the orchestrator's decisions
D1..D24. A finding marked *applied* is closed by the cited decision; one
marked *carried to Plan-017* is an implementation obligation, not a spec
edit; one marked *declined* or *recorded* states why it changes nothing.

| ID | Disposition | Record |
| --- | --- | --- |
| FND-1750 | carried to Plan-017 | D18 — exact decimals require the JSON parse seam to preserve the original numeric lexeme. The workspace's pinned `serde_json` enables no `arbitrary_precision`, so this is the implementation's first obligation and its evidence is NFR-036-M-5, not a spec edit. |
| FND-1751 | applied | D15 — FR-118-CON-5 requires the canonicalizer to sort keys itself and FR-118-AC-9 proves an insertion-order-preserving map still emits scalar-value order. |
| FND-1752 | part-applied, part-declined | D19 — the consumer contract is named and pinned in every FR that maps onto it. The branch-volatility half is declined on measurement: the shapes are on the consumer's merged `main` at the pinned revision, not only on an in-flight branch. The unowned table-index assignment half is closed by D3. |
| FND-1753 | applied | D2 — see FND-1705. |
| FND-1754 | applied | D8 — see FND-1723. |
| FND-1755 | applied | D24 — spec.md §1 no longer claims the delivery changes no existing producer; the breaking replacement of the shipped crate's digest and revision shapes is owned in writing. |
| FND-1756 | carried to Plan-017 | D24 — NFR-036's Verification names Plan-017 as the apparatus owner and requires a gate whose apparatus is missing to fail reporting that it did not run. |
| FND-1757 | applied | D16 — see FND-1735. |
