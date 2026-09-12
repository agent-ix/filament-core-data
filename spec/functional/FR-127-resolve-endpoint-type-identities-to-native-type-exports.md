---
id: FR-127
title: "Resolve endpoint type identities to native type exports"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-016"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-112"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-114"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-116"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-117"
    type: "depends_on"
---
# FR-127: Resolve endpoint type identities to native type exports

## Description

The producer SHALL declare every endpoint's `typeIdentity` in the same export
vocabulary its component, endpoint, and relationship records are declared in, so
that each named model type resolves through exactly one export mapping to an
exact native export kind and ordered export path, and SHALL refuse a bundle in
which a named model type resolves through no export mapping or through an export
mapping whose kind names something other than a type. The producer SHALL NOT
leave the consumer to recover a type from an export path segment, from an
endpoint identity, from a component identity, or from a display name, and SHALL
NOT select a native export kind on the native artifact's behalf: the kind is
whichever of the closed type subset the native artifact declares, and the
producer declares only that the identity is a model type, not which kind of one
it is. The admissible kinds are exactly `enum`, `object`, `record`, `reference`,
`scalar`, and `variant`; `component`, `endpoint`, and `relationship` name
producer records rather than types, `field` and `operation` name members of a
type rather than a type, and the assessment-side `population` kind is not a
variant of the *static* export vocabulary at all and therefore cannot be offered
here, while remaining representable on the assessment side that FR-120 owns.

## Inputs

- The endpoint declarations of the bundle, each carrying an authored
  `typeIdentity`
- The component and relationship declarations of the bundle
- The export mappings carried by each producer/native correspondence record
- The configuration document that selects the admissible digest and revision
  vocabularies

## Outputs

- An admitted bundle in which every endpoint's named model type resolves to one
  export mapping carrying an exact native export kind and ordered export path
- A named refusal identifying the model type that resolved through no export
  mapping
- A named refusal identifying the model type whose export mapping carried a kind
  that names no type

## Behavior

- The producer SHALL declare every endpoint's `typeIdentity` as a member of the
  bundle's declared export vocabulary, alongside its component, endpoint, and
  relationship record identities.
- The producer SHALL owe exactly one export mapping to every declared model type,
  under the same accounting that owes one export mapping to every declared
  component, endpoint, and relationship record.
- The producer SHALL admit an export mapping for a declared model type whose
  `kind` is one of `enum`, `object`, `record`, `reference`, `scalar`, or
  `variant`.
- If an export mapping for a declared model type carries any other `kind`, then
  the producer SHALL refuse the bundle under the stable code
  `ENDPOINT_TYPE_EXPORT_KIND_FOREIGN`, naming the model type and the offered kind.
- If a declared model type is resolved by no export mapping in any correspondence
  record, then the producer SHALL refuse the bundle under the stable code
  `ENDPOINT_TYPE_EXPORT_ABSENT`, which is distinct from the `EXPORT_ABSENT` code
  raised for a declared record that carries no export mapping.
- The producer SHALL raise every refusal of this requirement under a stable code
  that names the refused condition, so an acceptance criterion asserts on the
  code rather than on a message.
- The producer SHALL NOT admit an export mapping for a declared model type whose
  `kind` is `component`, `endpoint`, or `relationship`, because those name
  producer records rather than model types.
- The producer SHALL NOT admit an export mapping for a declared model type whose
  `kind` is `field` or `operation`, because those name members of a type rather
  than a type.
- The producer SHALL NOT represent the assessment-side `population` kind in the
  static export vocabulary at all, so a native export of that kind is
  unrepresentable here rather than refused here.
- The producer SHALL leave the `population` kind representable on the assessment
  side, which FR-120 owns, so this requirement narrows no assessment obligation.
- The producer SHALL retain the exact ordered export path the export mapping
  carries, in the order the native artifact declared it.

- The producer SHALL NOT derive a model type identity from any export path
  segment, nor treat a coinciding final path segment as a resolution.
- The producer SHALL NOT derive a model type identity from an endpoint identity,
  a component identity, a role, or a display name.
- The producer SHALL copy the native export kind of a declared model type from the
  native artifact's own export table, selecting, defaulting, and narrowing none of
  them.
- The producer SHALL verify each type export mapping's `kind` and ordered path
  against the native artifact's own export table where that table is held, which
  is verification under FR-129 rather than admission here: a static bundle
  carries no native bytes, so admission has no table to compare against.
- While two endpoints name one model type identity, the producer SHALL resolve
  both to the one export mapping that model type is owed, and SHALL NOT owe a
  second mapping for the repeated identity.
- If one identity is both a declared record identity and an endpoint's named model
  type, then the producer SHALL refuse the bundle under the stable code
  `IDENTITY_KIND_AMBIGUOUS`, naming that identity and both roles it was declared
  in, because no single export mapping can satisfy both admissions.
- The producer SHALL require each relationship endpoint record's `typeIdentity` to
  equal the `typeIdentity` of the endpoint declaration it joins through
  `endpointIdentity`.
- If a relationship endpoint record's `typeIdentity` differs from that of the
  endpoint declaration it joins, then the producer SHALL refuse the bundle under
  the stable code `ENDPOINT_TYPE_IDENTITY_DISAGREES`, naming both spellings.
- The producer SHALL resolve a relationship end's model type through the joined
  endpoint declaration's `typeIdentity`, never through a relationship-side
  spelling that no endpoint declaration carries.
- The producer SHALL name, in every refusal raised here, the model type identity
  the refusal is about.
- The producer SHALL apply the cross-bound export prohibition to a model type's
  export mapping exactly as it applies it to a record's.
- If two export mappings resolve one declared model type, then the producer SHALL
  refuse the bundle under `EXPORT_CROSS_BOUND`, whose message distinguishes two
  mappings under one producer object from two under different ones.
- The producer SHALL NOT introduce a wire, reference, or tracing schema for the
  native side; the existing correspondence record carries every export mapping
  relied on here.
- The producer SHALL NOT alter the authored members of an endpoint declaration to
  carry the resolved kind or path, which remain the export mapping's to state.
- The producer SHALL carry a type export mapping for every endpoint model type in
  every fixture this repository ships, because a fixture declaring endpoints
  without them is refused once this requirement holds.

## Constraints

| ID | Constraint | Type | Validation |
|----|------------|------|------------|
| FR-127-CON-1 | The producer SHALL resolve every endpoint `typeIdentity` through a declared export mapping, never reconstructing the type from an export path segment, an endpoint identity, a component identity, or a display name. | Integrity | Test |
| FR-127-CON-2 | The producer SHALL admit for a declared model type only the closed kinds `enum`, `object`, `record`, `reference`, `scalar`, and `variant`, never a kind naming a producer record or a member of a type. | Correctness | Test |
| FR-127-CON-3 | The producer SHALL keep the assessment-side `population` kind absent from the static export vocabulary, so a native export of that kind is unrepresentable rather than refused, while leaving it representable on the assessment side FR-120 owns. | Interface | Compile |
| FR-127-CON-4 | The producer SHALL raise a refusal distinct from the declared-record one when a declared model type carries no export mapping, naming the model type identity. | Traceability | Test |
| FR-127-CON-5 | The producer SHALL verify each type export mapping's kind and ordered path against the native artifact's export table wherever that table is held, which FR-129 evidences. | Integrity | Test |
| FR-127-CON-6 | The producer SHALL raise each refusal of this requirement under a stable named code, never by message text alone. | Traceability | Test |
| FR-127-CON-7 | The producer SHALL require each relationship endpoint record's `typeIdentity` to equal that of the endpoint declaration it joins, refusing any disagreement. | Correctness | Test |
| FR-127-CON-8 | The producer SHALL refuse an identity declared both as a record and as an endpoint model type, rather than leaving it unresolvable. | Correctness | Test |
| FR-127-CON-9 | The producer SHALL preserve the authored members of `EndpointDeclaration` unchanged, carrying the resolved kind and path in the export mapping alone. | Interface | Compile |

## Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| FR-127-AC-1 | An admitted bundle resolves every endpoint's `typeIdentity` to exactly one export mapping whose native export kind and ordered export path are each readable as separate members, with no path segment parsed to obtain the type. | Test |
| FR-127-AC-2 | A bundle whose endpoint names a model type that no correspondence record exports is refused under `ENDPOINT_TYPE_EXPORT_ABSENT`, and the refusal names that model type identity and carries a code distinct from the `EXPORT_ABSENT` raised for a declared record carrying no export mapping. | Test |
| FR-127-AC-3 | Five bundles, one per kind, whose declared model type is exported under `field`, `operation`, `component`, `endpoint`, and `relationship` respectively, are each refused under `ENDPOINT_TYPE_EXPORT_KIND_FOREIGN`, and each refusal names the model type and the offered kind. | Test |
| FR-127-AC-4 | Six bundles, one per kind, whose declared model type is exported under `enum`, `object`, `record`, `reference`, `scalar`, and `variant` respectively, are each admitted, with the producer selecting none of the six; agreement with the native export table is verified under FR-129 where that table is held. | Test |
| FR-127-AC-5 | Two endpoints naming one model type identity resolve to the one export mapping that identity is owed, and the bundle is not refused for a missing second mapping. | Test |
| FR-127-AC-6 | A bundle in which one identity is declared both as a record and as an endpoint's named model type is refused under `IDENTITY_KIND_AMBIGUOUS`, naming that identity and both roles, rather than being admitted under either. | Test |
| FR-127-AC-7 | A model type's export mapping owned by another correspondence's producer object is refused under `EXPORT_CROSS_BOUND`, exactly as a record's is. | Test |
| FR-127-AC-10 | A relationship endpoint record whose `typeIdentity` differs from that of the endpoint declaration it joins is refused under `ENDPOINT_TYPE_IDENTITY_DISAGREES`, naming both spellings. | Test |
| FR-127-AC-11 | Two export mappings resolving one declared model type are refused under `EXPORT_CROSS_BOUND`, whose message distinguishes one producer object from two. | Test |
| FR-127-AC-12 | An export mapping's ordered path is retained verbatim in the order authored, and agreement with the native export table is verified under FR-129 against real native bytes. | Test |
| FR-127-AC-8 | The export vocabulary offers no `population` variant, so a static export of that kind cannot be constructed in the typed API rather than being constructed and refused. | Compile |
| FR-127-AC-9 | The authored members of `EndpointDeclaration`, `ProducerNativeCorrespondence`, `ProducerObjectReference`, and `NativeArtifactReference` are unchanged by this requirement, and no wire, reference, or tracing schema is introduced for the native side. | Compile |

## Dependencies

- [FR-114](./FR-114-declare-component-and-endpoint-identities.md) declares the
  first-class endpoint record and its authored `typeIdentity`, whose resolution
  this requirement adds without altering the record's authored members.
- [FR-116](./FR-116-emit-producer-native-correspondence-records.md) owns the
  correspondence record, its export mappings, the export-kind vocabulary, and the
  cross-bound and foreign-export refusals that this requirement cites rather than
  restates.
- [FR-117](./FR-117-admit-a-static-producer-bundle.md) owns indivisible admission
  and the accounting that owes one export mapping to every declared identity,
  which this requirement extends to declared model types.
- [FR-112](./FR-112-emit-versioned-digest-selections.md) defines the canonical
  digest selection member shape that every export mapping's locus carries.
- [FR-115](./FR-115-emit-complete-relationship-records.md) owns the relationship
  endpoint record whose `typeIdentity` this requirement requires to agree with the
  endpoint declaration it joins; the join itself remains FR-115's to define.
- [FR-120](./FR-120-bind-an-assessment-document-to-a-static-bundle.md) owns the
  assessment side on which the `population` export kind remains representable and
  admitted; this requirement removes that kind from the static vocabulary only,
  and narrows no assessment obligation.
- [FR-128](./FR-128-declare-a-closed-relationship-direction-vocabulary.md) is
  authored in the same increment and is independent of this requirement: a
  relationship's direction constrains no endpoint's type resolution.
- [FR-129](./FR-129-admit-a-static-bundle-against-real-native-bytes.md) depends on
  this requirement rather than the reverse: it evidences the resolution defined
  here against a real native export table.
- `ix://agent-ix/quire-spec-language` at revision
  `5d76043b2af4308141817ce4a4055b03a0e5288f`, file
  `src/protocol_artifact/wire.rs`, declares the closed `ExportKind` shape whose
  type subset this requirement selects, including the `population` kind this
  interface does not represent. It is an assumed external contract this increment
  maps onto rather than owns; a change on the consumer side is not detected by
  this requirement.
- [Baseline 1.2 contract](../../docs/semantic-data-system/baseline-1-2.md) is the
  authoritative producer contract for endpoint declarations.
