---
id: Task-011
title: "Contract inventory"
type: Task
status: done
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-010"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-010"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-059"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-060"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-061"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-062"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-063"
    type: verifies
---
# Task-011: Contract inventory

## Scope

Inventory Avro, Python, Rust/Serde/Specta, TypeScript, SQL, JSON-lines, generated,
wire, and Quire-extraction contracts using stable IDs and resolvable evidence
loci at the Task-010 revisions.

## Subtasks

- [x] Enumerate schema, model, DTO, migration, payload, fixture, generated, and extraction loci.
- [x] Record authority, owner, producer, consumers, versioning, identity, nullability, defaults, provenance, and lossiness with explicit states.
- [x] Classify each representation by data-plane role.
- [x] Add absence records for required families not present in an in-scope repository.
- [x] Validate unique IDs and every evidence reference.

## Deliverables

- `audit/filament-contract-census/inventory.json`
- `audit/filament-contract-census/inventory.md`

## Notes

- Generated contracts cite a reproducible generation/configuration locus when source lines are not checked in.
- Suspected consumers remain `unknown` until source evidence confirms them.
