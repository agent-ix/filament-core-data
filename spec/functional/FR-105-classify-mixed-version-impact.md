---
id: FR-105
title: "Classify mixed-version compatibility and evidence impact"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-006"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-103"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-104"
    type: "depends_on"
---
# FR-105: Classify mixed-version compatibility and evidence impact

## Description

The baseline ecosystem contract SHALL classify a declared mixed-version
configuration and its dependency-aware evidence impact without treating
structural reachability, stale evidence, or absent support as behavioral truth.

## Behavior

- A compatibility assessment SHALL retain its explicit policy and every
  required mixed-version combination.
- A conclusion SHALL distinguish structural compatibility, payload break,
  behavioral regression, affected evidence, stale evidence, and unknown.
- A dependency path SHALL retain each changed property, model, binding,
  assumption, tool, or environment selection it traverses.
- An unresolved or circular dependency SHALL retain `unknown` with its path.
- A historical result SHALL remain immutable when a later assessment marks it
  affected or stale.

## Constraints

| ID | Constraint | Type | Validation |
| --- | --- | --- | --- |
| FR-105-CON-1 | Dependency reachability SHALL NOT by itself produce a payload-breaking or behaviorally-regressed conclusion. | Correctness | Test |
| FR-105-CON-2 | Invalidated or stale evidence SHALL NOT by itself produce a violated conclusion. | Integrity | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
| --- | --- | --- |
| FR-105-AC-1 | An additive compatible schema revision, a payload break, a behavioral regression with unchanged schema, and absent evidence receive four distinct conclusions. | Test |
| FR-105-AC-2 | A candidate deployment is assessed against every combination its explicit mixed-version policy requires; omission of one required combination yields `unknown`. | Test |
| FR-105-AC-3 | A changed model, binding, assumption, tool, or environment produces an auditable dependency path and an `affected` or `stale` conclusion without rewriting the historical result. | Test |
| FR-105-AC-4 | Circular or unresolved support retains the path and `unknown`, rather than being dropped or classified as behavioral regression. | Test |

## Dependencies

- [FR-103](./FR-103-declare-ecosystem-configuration-contracts.md) defines configuration identity and correspondence.
- [FR-104](./FR-104-lock-ecosystem-inventory-and-bindings.md) defines the locked inventory and bindings.
- [Baseline 1.2 contract](../../docs/semantic-data-system/baseline-1-2.md) is the authoritative producer contract.
