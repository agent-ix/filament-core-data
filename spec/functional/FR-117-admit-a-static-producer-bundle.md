---
id: FR-117
title: "Admit a static producer bundle"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-016"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-109"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-115"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-116"
    type: "depends_on"
---
# FR-117: Admit a static producer bundle

## Description

The producer SHALL emit, only through one indivisible admission operation that
both constructs and validates it, one immutable typed static bundle that carries
the selected model, the selected profile, the component declarations, the
endpoint declarations, the relationship records, the inventory declaration, the
configuration document, the configuration's static prerequisite closure, and the
correspondence records as separately readable typed members and carries no
assessment member.

## Inputs

- The selected producer model identity, namespaced revision, and canonical
  digest selection.
- The selected producer profile identity, namespaced revision, and canonical
  digest selection.
- The component declarations and endpoint declarations with their provenance
  loci, ownership members, and inventory memberships.
- The complete first-class relationship records.
- The inventory declaration and its declared completeness member.
- The configuration document and its declared static prerequisite closure.
- The producer/native correspondence records.

## Outputs

- One immutable admitted typed static bundle carrying exactly the nine static
  member classes above.
- A blocking refusal naming the absent required member, the offending
  assessment-kind correspondence export, or the offered assessment input, when
  the bundle cannot be admitted.
- No value of the static bundle type at all when admission is refused.

## Behavior

- The producer SHALL emit one immutable typed static bundle carrying the selected
  model, the selected profile, the component declarations, the endpoint
  declarations, the relationship records, the inventory declaration, the
  configuration document, the configuration's static prerequisite closure, and
  the correspondence records.
- The producer SHALL construct and validate the static bundle in one indivisible
  admission operation.
- The producer SHALL yield no value of the static bundle type when it refuses an
  admission.
- The producer SHALL expose the admitted static bundle only through its admission
  entry point.
- The producer SHALL NOT expose a public constructor of the static bundle type.
- The producer SHALL NOT expose a public member of the static bundle type.
- The producer SHALL NOT expose a deserialization path that yields a static
  bundle value without passing through the admission operation.
- The producer SHALL NOT permit a consumer to construct an unvalidated value of
  the static bundle type.
- The producer SHALL carry in the static bundle every member required for
  recognition, resolution, and type/profile admission, so no consumer needs an
  assessment input.
- The producer SHALL expose every static bundle member as a directly readable
  typed member, so no consumer parses prose, defaults a member, or infers a
  field.
- The producer SHALL NOT require, contain, or mint a population, snapshot,
  window, workflow instance, relationship instance, observation record, progress
  record, or observation closure in the static bundle.
- If the static bundle omits any required member — an identity, a namespaced
  revision, a digest selection, a provenance locus, an ownership member, or an
  inventory membership — then the producer SHALL refuse admission, naming the
  absent member.
- If the configuration's static prerequisite closure is absent from the static
  bundle, then the producer SHALL refuse admission, naming that static
  prerequisite closure rather than the native definition closure FR-116 owns.
- If a correspondence record in the static bundle carries an export whose kind is
  the assessment kind `population`, then the producer SHALL refuse admission,
  naming the offending export.
- If an assessment input is offered to the static bundle, then the producer SHALL
  refuse admission.
- The producer SHALL NOT silently retain an assessment input offered to the
  static bundle.
- The producer SHALL NOT consult an environment variable, a working directory, a
  wall clock, or the network during a static admission.
- The producer SHALL NOT present production of the static bundle as campaign
  acceptance of any assessment claim.

## Constraints

| ID | Constraint | Type | Validation |
| --- | --- | --- | --- |
| FR-117-CON-1 | The producer SHALL expose a static bundle type carrying exactly the model, profile, component declaration, endpoint declaration, relationship record, inventory, configuration, static prerequisite closure, and correspondence record member classes and no assessment member class. | Integrity | Compile |
| FR-117-CON-2 | The producer SHALL keep the static bundle type unconstructible outside its indivisible admission operation, exposing no public constructor, no public member, and no deserialization path that bypasses admission. | Interface | Compile |
| FR-117-CON-3 | The producer SHALL make a static admission depend on no environment variable, working directory, wall clock, or network input. | Portability | Test |
| FR-117-CON-4 | The producer SHALL consume, for the static bundle, only the static members of the FR-109 configuration document and the FR-110 inventory declaration, reaching no FR-108 population obligation. | Integrity | Inspection |
| FR-117-CON-5 | The producer SHALL keep the configuration's static prerequisite closure and the native definition closure that FR-116 owns distinct members carrying distinct refusals. | Traceability | Inspection |

## Acceptance Criteria

| ID | Criteria | Verification |
| --- | --- | --- |
| FR-117-AC-1 | A complete static selection is admitted as one immutable typed bundle whose model, profile, component declarations, endpoint declarations, relationship records, inventory declaration, configuration document, static prerequisite closure, and correspondence records are each read directly as typed members, and which carries no population, snapshot, window, instance, observation, progress record, or observation closure. | Test |
| FR-117-AC-2 | A bundle omitting any required member — an identity, a namespaced revision, a digest selection, a provenance locus, an ownership member, an inventory membership, or the configuration's static prerequisite closure — is refused, and the refusal names the absent member. | Test |
| FR-117-AC-3 | An assessment input offered to the static bundle is refused rather than silently retained. | Test |
| FR-117-AC-4 | The static bundle type exposes no public constructor, no public member, and no deserialization path that bypasses admission, so an unvalidated value of the type cannot be constructed outside the producer's indivisible admission operation, and a refused admission yields no value of the type. | Compile |
| FR-117-AC-5 | A static admission run with altered environment variables, working directory, wall clock, and no network reachability produces the identical admitted bundle. | Test |
| FR-117-AC-6 | Production of the static bundle is recorded as static admission only and is not presented as campaign acceptance of any assessment claim. | Inspection |
| FR-117-AC-7 | A static bundle whose correspondence record carries an export of the assessment kind `population` is refused, and the refusal names the offending export. | Test |
| FR-117-AC-8 | A static admission completes from the static members of the FR-109 configuration document and the FR-110 inventory declaration alone, reaching no FR-108 population obligation. | Test |
| FR-117-AC-9 | Every member of an admitted static bundle is read without parsing prose, defaulting a member, or inferring a field. | Inspection |

## Dependencies

- [FR-109](./FR-109-declare-ecosystem-configuration-contracts.md) defines the
  immutable configuration selections and the static prerequisite closure carried
  by the bundle; only that document's static members are consumed here.
- [FR-115](./FR-115-emit-complete-relationship-records.md) defines the complete
  first-class relationship records carried by the bundle.
- [FR-116](./FR-116-emit-producer-native-correspondence-records.md) defines the
  correspondence records carried by the bundle, and owns the native definition
  closure that the static prerequisite closure is not.
- [FR-110](./FR-110-lock-ecosystem-inventory-and-bindings.md) owns the inventory
  declaration, its closure, and the incomplete-inventory `unknown` disposition;
  only that declaration's static members are consumed here, and no FR-108
  population obligation is reached through it.
- [NFR-036](../non-functional/NFR-036-byte-exact-producer-output.md) constrains
  the admitted bundle's canonical bytes to be byte-exact.
- The native consumer boundary is stated here as context, never as a requirement
  of this bundle: that consumer completes recognition, resolution, and
  type/profile admission from the admitted static bundle alone, reads each member
  it needs directly from that member, and parses no prose, defaults no member,
  and infers no field. The consumer contract is an assumed external contract that
  this increment maps onto rather than owns:
  `ix://agent-ix/quire-spec-language`, file `src/protocol_artifact/wire.rs`,
  pinned at revision `72507f856457ba0922719bd5d9f5cadcce4058cd`, whose
  `Model { artifact, profile, exports, correspondence }`,
  `Correspondence { producer, native, relation, exports }`, and
  `Export { kind, path, locus }` records — the last with the closed `ExportKind`
  vocabulary that includes the assessment kind `population` — the admitted
  bundle's members supply.
- [Baseline 1.2 contract](../../docs/semantic-data-system/baseline-1-2.md) is the
  authoritative producer contract.
