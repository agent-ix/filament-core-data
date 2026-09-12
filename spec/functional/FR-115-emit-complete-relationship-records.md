---
id: FR-115
title: "Emit complete relationship records"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-016"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-107"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-114"
    type: "depends_on"
---
# FR-115: Emit complete relationship records

## Description

The producer SHALL emit every relationship as a first-class record carrying its
stable relationship identity, its namespaced revision, its canonical digest, its
authored relationship name, independently identified `source` and `target`
endpoint records, its semantics, and its declaring ownership triple as separate
authored members.

## Inputs

- The authored relationship declarations with their stable relationship
  identities and authored relationship names.
- The authored source and target endpoint declarations, each with its
  `typeIdentity`, `role`, and `multiplicity`.
- The authored relationship semantics: category, direction, composite flag,
  lifecycle, and ownership values.
- The declaring owning model identity, profile identity, and configuration
  identity.

## Outputs

- A relationship record carrying `relationshipIdentity`, `revision`, `digest`,
  `relationshipName`, `source`, `target`, `semantics`, and its owning model,
  profile, and configuration identities as separate members.
- A blocking refusal naming the offending relationship when a `source` or
  `target` endpoint omits its `role` or its `multiplicity`.
- A named loss record naming the relationship identity when a projection cannot
  preserve both endpoints' roles and multiplicities.

## Behavior

- The producer SHALL emit each relationship as a record under export kind
  `relationship`.
- The producer SHALL emit each relationship identity as a stable authored
  identity.
- The producer SHALL emit each relationship revision as a namespaced revision
  carrying `namespace` and `value`.
- The producer SHALL emit each relationship digest as a canonical digest
  selection carrying `algorithm`, `domain`, `version`, and `value`.
- The producer SHALL emit the authored `relationshipName` of every relationship.
- The producer SHALL emit the `source` endpoint record and the `target` endpoint
  record of every relationship as independently identified members.
- The producer SHALL emit `typeIdentity`, `role`, and `multiplicity` on each of
  the `source` and `target` endpoint records.
- The producer SHALL emit `category`, `direction`, `composite`, `lifecycle`, and
  `ownership` in every relationship's `semantics` member.
- The producer SHALL name the owning model identity, the profile identity, and
  the configuration identity that declare every relationship.
- The producer SHALL refuse a relationship whose `source` or `target` omits its
  `role`.
- The producer SHALL refuse a relationship whose `source` or `target` omits its
  `multiplicity`.
- The producer SHALL refuse a projection that collapses the two endpoints' roles
  or multiplicities into one value.
- The producer SHALL emit a named loss record carrying the relationship identity
  when it refuses such a projection.
- The producer SHALL NOT guess a role or a multiplicity for a collapsed
  endpoint.
- The producer SHALL NOT reconstruct a relationship identity from a foreign key,
  a field, or a relationship instance.
- The producer SHALL NOT name a population member or a relationship instance in
  a relationship record.
- The producer SHALL emit each relationship refusal as a blocking input refusal.

## Constraints

| ID | Constraint | Type | Validation |
| --- | --- | --- | --- |
| FR-115-CON-1 | The producer SHALL author every relationship identity, never reconstructing it from a foreign key, a field, or a relationship instance. | Integrity | Test |
| FR-115-CON-2 | The producer SHALL keep every relationship record free of population members and relationship instances. | Integrity | Test |
| FR-115-CON-3 | The producer SHALL keep the `source` and `target` endpoint records independent members even when both name one type identity. | Correctness | Test |
| FR-115-CON-4 | The producer SHALL keep each relationship record's identity, revision, digest, name, endpoints, semantics, and ownership triple separate members, never merged by equal spelling. | Traceability | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
| --- | --- | --- |
| FR-115-AC-1 | A producer emits one relationship record in which the relationship identity, namespaced revision, canonical digest, authored relationship name, `source` and `target` endpoint records with their `typeIdentity`, `role`, and `multiplicity`, the `semantics` category, direction, composite flag, lifecycle, and ownership, and the owning model, profile, and configuration identities each arrive as separate members. | Test |
| FR-115-AC-2 | A self-relationship whose `source` and `target` name one type identity emits two independent endpoint records retaining their own roles and multiplicities. | Test |
| FR-115-AC-3 | A relationship whose `source` omits its `role` refuses, a relationship whose `target` omits its `multiplicity` refuses, and a projection collapsing the two endpoints' roles into one refuses with a named loss record carrying the relationship identity rather than a guessed value. | Test |

## Dependencies

- [FR-107](./FR-107-declare-first-class-relationship-contracts.md) defines the
  first-class relationship contract with independently authored endpoints,
  roles, multiplicities, category, and containment semantics.
- [FR-114](./FR-114-declare-component-and-endpoint-identities.md) declares the
  component and endpoint identities that a relationship record's endpoints name.
- [Baseline 1.2 contract](../../docs/semantic-data-system/baseline-1-2.md) is
  the authoritative producer contract for relationship declarations.
