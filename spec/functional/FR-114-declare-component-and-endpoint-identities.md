---
id: FR-114
title: "Declare component and endpoint identities"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-016"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-109"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-110"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-112"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-113"
    type: "depends_on"
---
# FR-114: Declare component and endpoint identities

## Description

The producer SHALL declare every exported component and every exported endpoint
as a first-class record carrying its stable identity, its namespaced revision,
its canonical digest selection, its source provenance as a locus, its owning
role and owning model type identity, and its explicit inventory membership as
separate authored members.

## Inputs

- The locked inventory declaration naming the inventory identity, its
  completeness boundary, and every admitted component identity.
- The authored component declarations with their owning role identities and
  owning model type identities.
- The authored endpoint declarations with their owning component identity, type
  identity, authored role, and multiplicity.
- The producer's own declaration source document, which supplies the locus of
  every declared component and endpoint, identified as an artifact reference
  carrying its `refVersion`, its artifact `kind` drawn from the consumer's
  closed artifact-kind vocabulary, its `authority`, its `identity`, its
  namespaced `revision`, its raw-byte `digest` string, and its `wire` identity
  and version.
- The authored formal document and its namespaced revision, and the byte span
  `start` and `end` offsets, of each declared component and endpoint within that
  declaration source document.

## Outputs

- A component record carrying `identity`, `revision`, `digest`, `locus`,
  `owningRole`, `owningTypeIdentity`, and `inventoryIdentity` as separate
  members.
- An endpoint record carrying those members and additionally
  `owningComponentIdentity`, `typeIdentity`, `role`, and `multiplicity`.
- A blocking refusal naming the offending component or endpoint when its locus,
  its formal document revision, or its inventory membership is absent.
- A blocking refusal naming the offending component or endpoint when no
  declaration source document supplies its locus.

## Behavior

- The producer SHALL declare each exported component as a record under export
  kind `component`.
- The producer SHALL declare each exported endpoint as a record under export
  kind `endpoint`.
- The producer SHALL emit each component identity and each endpoint identity as
  a stable authored identity.
- The producer SHALL emit each component revision and each endpoint revision as
  a namespaced revision carrying `namespace` and `value`.
- The producer SHALL emit each component digest and each endpoint digest as a
  canonical digest selection carrying `algorithm`, `domain`, `version`, and
  `value`.
- The producer SHALL emit each component locus and each endpoint locus as the
  `source`, `formal`, and `span` members of the consumer's `ForeignLocus`.
- The producer SHALL emit each locus `source` as an artifact reference carrying
  `refVersion`, `kind`, `authority`, `identity`, `revision`, `digest`, and
  `wire`.
- The producer SHALL draw each locus `source` `kind` from the consumer's closed
  artifact-kind vocabulary.
- The producer SHALL emit each locus `source` `revision` as a namespaced
  revision carrying `namespace` and `value`.
- The producer SHALL emit each locus `source` `digest` as one raw-byte digest
  string.
- The producer SHALL NOT refuse a locus whose `source` `digest` is one raw-byte
  digest string rather than a canonical digest selection.
- The producer SHALL emit each locus `source` `wire` as its `identity` and its
  `version`.
- The producer SHALL emit each locus `formal` as the authored `document` and its
  namespaced `revision` carrying `namespace` and `value`.
- The producer SHALL emit each locus `span` as its `start` and `end` byte
  offsets.
- The producer SHALL name the owning role identity and the owning model type
  identity of every declared component.
- The producer SHALL name the owning component identity, the type identity, the
  authored role, and the multiplicity of every declared endpoint.
- The producer SHALL name the inventory identity that admits every declared
  component and endpoint.
- The producer SHALL refuse a component or endpoint whose locus is absent.
- The producer SHALL refuse a component or endpoint whose locus names no formal
  document revision.
- The producer SHALL refuse a component or endpoint whose locus the producer's
  own declaration source document does not supply, rather than synthesizing a
  locus for it.
- The producer SHALL refuse admission of a component or endpoint that lies
  outside a closed declared inventory.
- While an inventory declares itself explicitly incomplete, the producer SHALL
  admit an unlisted component or endpoint rather than refusing it.
- While an inventory declares itself explicitly incomplete, the producer SHALL
  carry the inventory completeness member with the retained `unknown`
  disposition FR-110 declares.
- The producer SHALL NOT reconstruct a component identity from a path, a package
  name, or a deployment name.
- The producer SHALL emit each component and endpoint refusal as a blocking
  input refusal.

## Constraints

| ID | Constraint | Type | Validation |
| --- | --- | --- | --- |
| FR-114-CON-1 | The producer SHALL keep a repository identity, a component identity, a role identity, and an endpoint identity four distinct identities even when their display names coincide. | Traceability | Test |
| FR-114-CON-2 | The producer SHALL author every component identity, never reconstructing it from a path, a package name, or a deployment name. | Integrity | Test |
| FR-114-CON-3 | The producer SHALL keep each record's identity, revision, digest, locus, ownership, and inventory membership separate members, never merged by equal spelling. | Integrity | Test |
| FR-114-CON-4 | The producer SHALL name the authored formal document revision in every component and endpoint locus, never substituting a native source label for it. | Correctness | Test |
| FR-114-CON-5 | The producer SHALL refuse a component or endpoint whose locus no declaration source document supplies, never synthesizing a locus from an unlocated declaration. | Integrity | Test |
| FR-114-CON-6 | The producer SHALL carry each component's and each endpoint's inventory membership under the FR-110 inventory declaration, never declaring its own inventory closure or its own `unknown` disposition. | Traceability | Inspection |

## Acceptance Criteria

| ID | Criteria | Verification |
| --- | --- | --- |
| FR-114-AC-1 | A producer emits one component record and one endpoint record in which identity, namespaced revision, canonical digest selection, locus, ownership, and inventory membership each arrive as separate members, the endpoint additionally naming its owning component identity, type identity, role, and multiplicity, while a repository, a component, a role, and an endpoint sharing one display name remain four distinct identities. | Test |
| FR-114-AC-2 | A component whose locus is absent refuses, and an endpoint whose locus names no formal document revision refuses, each with a blocking refusal naming the offending record. | Test |
| FR-114-AC-3 | A component outside a closed declared inventory refuses admission, and the same component under an explicitly incomplete inventory is admitted carrying the inventory completeness member with the retained `unknown` disposition FR-110 declares. | Test |
| FR-114-AC-4 | A component locus whose `source` carries `refVersion`, a closed-vocabulary `kind`, `authority`, `identity`, a namespaced `revision`, one raw-byte `digest` string, and `wire` with its `identity` and `version`, whose `formal` carries `document` and a namespaced `revision`, and whose `span` carries `start` and `end`, is admitted, and its raw-byte `digest` string is admitted rather than refused as a non-canonical digest selection. | Test |
| FR-114-AC-5 | A component whose locus no declaration source document supplies refuses with a blocking refusal naming the offending component, and no record carrying a synthesized locus is emitted for it. | Test |

## Dependencies

- [FR-109](./FR-109-declare-ecosystem-configuration-contracts.md) declares the
  immutable configuration selections, including the selected revision
  namespaces and digest domains.
- [FR-110](./FR-110-lock-ecosystem-inventory-and-bindings.md) locks the finite
  inventory, its completeness boundary, and its role-to-component bindings, and
  owns the closed-inventory refusal and the explicitly incomplete inventory's
  retained `unknown` disposition that this requirement cites rather than
  restates.
- [FR-112](./FR-112-emit-versioned-digest-selections.md) defines the canonical
  digest selection member shape that every component and endpoint digest
  carries.
- [FR-113](./FR-113-emit-namespaced-revisions.md) defines the namespaced
  revision member shape that every component revision, endpoint revision, locus
  source revision, and formal document revision carries.
- `ix://agent-ix/quire-spec-language` at revision
  `72507f856457ba0922719bd5d9f5cadcce4058cd`, file
  `src/protocol_artifact/wire.rs`, declares the `ForeignLocus`, `ArtifactRef`,
  `Formal`, `Span`, `Revision`, and `ArtifactKind` shapes that this
  requirement's locus maps onto member for member. It is an assumed external
  contract this increment maps onto rather than owns; a change on the consumer
  side is not detected by this requirement.
- [Baseline 1.2 contract](../../docs/semantic-data-system/baseline-1-2.md) is
  the authoritative producer contract for component, endpoint, and inventory
  declarations.
