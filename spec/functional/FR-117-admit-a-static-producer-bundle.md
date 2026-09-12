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

The producer SHALL emit, only through its admission entry point, one immutable
typed static bundle that carries the selected model, component declarations,
endpoint declarations, relationship records, configuration document, static
closure, and correspondence records as separately readable typed members and
carries no assessment member.

## Inputs

- The selected producer model identity, namespaced revision, and canonical
  digest selection.
- The component declarations and endpoint declarations with their provenance.
- The complete first-class relationship records.
- The configuration document and its declared static closure.
- The producer/native correspondence records.

## Outputs

- One immutable admitted typed static bundle carrying exactly the seven static
  member classes above.
- A blocking refusal naming the absent required member, or naming the offered
  assessment input, when the bundle cannot be admitted.

## Behavior

- The producer SHALL emit one immutable typed static bundle carrying the selected
  model, the component declarations, the endpoint declarations, the relationship
  records, the configuration document, the static closure, and the
  correspondence records.
- The static bundle SHALL NOT require, contain, or mint a population, snapshot,
  window, workflow instance, relationship instance, observation record, progress
  record, or observation closure.
- A native consumer SHALL complete recognition, resolution, and type/profile
  admission from the static bundle alone, with no assessment input.
- The producer SHALL expose the admitted static bundle only through its admission
  entry point.
- The producer SHALL NOT permit a consumer to construct an unvalidated value of
  the static bundle type.
- A consumer SHALL read every static bundle member it needs directly from that
  member.
- A consumer SHALL NOT parse prose, default a member, or infer a field to obtain
  a static bundle member.
- If the static bundle omits a required model, configuration, component,
  endpoint, relationship, correspondence, or closure identity, then the producer SHALL refuse admission, naming the absent member.
- If an assessment input is offered to the static bundle, then the producer SHALL
  refuse admission.
- The producer SHALL NOT silently retain an assessment input offered to the
  static bundle.
- A static admission SHALL NOT consult an environment variable, a working
  directory, a wall clock, or the network.
- The producer SHALL NOT present production of the static bundle as campaign
  acceptance of any assessment claim.

## Constraints

| ID | Constraint | Type | Validation |
| --- | --- | --- | --- |
| FR-117-CON-1 | The static bundle type SHALL carry exactly the model, component, endpoint, relationship, configuration, static closure, and correspondence member classes and no assessment member class. | Integrity | Inspection |
| FR-117-CON-2 | The static bundle type SHALL remain unconstructible outside the producer's admission entry point. | Interface | Test |
| FR-117-CON-3 | A static admission SHALL depend on no environment variable, working directory, wall clock, or network input. | Portability | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
| --- | --- | --- |
| FR-117-AC-1 | A complete static selection is admitted as one immutable typed bundle whose model, components, endpoints, relationships, configuration, static closure, and correspondence records are each read directly as typed members, and it suffices for recognition, resolution, and type/profile admission without any population, snapshot, window, instance, observation, progress record, or observation closure. | Test |
| FR-117-AC-2 | A bundle omitting any required model, configuration, component, endpoint, relationship, correspondence, or closure identity is refused, and the refusal names the absent member. | Test |
| FR-117-AC-3 | An assessment input offered to the static bundle is refused rather than silently retained. | Test |
| FR-117-AC-4 | An unvalidated value of the static bundle type cannot be constructed by a consumer outside the producer's admission entry point, and every member is readable without parsing prose, defaulting a member, or inferring a field. | Inspection |
| FR-117-AC-5 | A static admission run with altered environment variables, working directory, wall clock, and no network reachability produces the identical admitted bundle. | Test |
| FR-117-AC-6 | Production of the static bundle is recorded as static admission only and is not presented as campaign acceptance of any assessment claim. | Inspection |

## Dependencies

- [FR-109](./FR-109-declare-ecosystem-configuration-contracts.md) defines the
  immutable configuration selections and static closure carried by the bundle.
- [FR-115](./FR-115-emit-complete-relationship-records.md) defines the complete
  first-class relationship records carried by the bundle.
- [FR-116](./FR-116-emit-producer-native-correspondence-records.md) defines the
  correspondence records carried by the bundle.
- [Baseline 1.2 contract](../../docs/semantic-data-system/baseline-1-2.md) is the
  authoritative producer contract.
