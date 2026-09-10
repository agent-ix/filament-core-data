---
id: FR-110
title: "Lock ecosystem inventory and bindings"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-006"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-107"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-108"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-109"
    type: "depends_on"
---
# FR-110: Lock ecosystem inventory and bindings

## Description

The baseline ecosystem contract SHALL define a finite, revision-locked
cross-repository inventory and explicit role, component, build, deployment,
related-instance, and population bindings for one assessment configuration.

## Inputs

- The IN01 locked inventory declaration: selected repositories, components,
  imports/exports, builds, deployments, roles, and completeness boundary.

## Outputs

- A closed-inventory refusal or an explicitly incomplete inventory with its
  retained unknown disposition and identity-preserving bindings.

## Behavior

- The inventory SHALL identify every selected order, payment, and fulfillment
  repository, component, import, export, contract, revision, and digest.
- The inventory SHALL declare whether its selection is complete; a missing or
  conflicting required import SHALL refuse a closed inventory, while an
  explicitly incomplete inventory SHALL retain `unknown`.
- A binding SHALL preserve distinct role, component, repository, build,
  deployment, workflow-instance, population, window, member-object, and
  observation-record identities.
- A component MAY serve multiple roles and a repository MAY contain multiple
  components only through explicit bindings.
- A live assessment SHALL require an authorized deployment selection.
- The configuration producer SHALL label a metadata-only binding.
- The configuration producer SHALL NOT represent a metadata-only binding as
  runtime evidence.

## Constraints

| ID | Constraint | Type | Validation |
| --- | --- | --- | --- |
| FR-110-CON-1 | A closed inventory SHALL NOT select a component, import, or runtime binding that it does not list. | Integrity | Test |
| FR-110-CON-2 | A role identity, component identity, and runtime workflow-instance identity SHALL remain distinct even when their display names coincide. | Traceability | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
| --- | --- | --- |
| FR-110-AC-1 | A locked three-repository order/payment/fulfillment inventory resolves its exact imports and refuses a missing import and a conflicting import selection. | Test |
| FR-110-AC-2 | One payment component binds two permitted roles and one repository contains two components without collapsing either identity. | Test |
| FR-110-AC-3 | A metadata-only configuration remains analyzable but is refused when submitted as live execution evidence without its authorized deployment binding. | Test |
| FR-110-AC-4 | Two related workflow instances retain separate finite populations and windows, and two records for one member remain two observation records. | Test |

## Dependencies

- [FR-107](./FR-107-declare-first-class-relationship-contracts.md) defines typed relationships.
- [FR-108](./FR-108-bind-populations-to-model-contracts.md) defines population and observation distinctions.
- [FR-109](./FR-109-declare-ecosystem-configuration-contracts.md) defines immutable configuration selections.
- [Baseline 1.2 contract](../../docs/semantic-data-system/baseline-1-2.md) is the authoritative producer contract.
