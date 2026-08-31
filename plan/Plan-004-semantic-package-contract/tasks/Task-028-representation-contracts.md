---
id: Task-028
title: "Representation contracts"
type: Task
status: done
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-027"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-023"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-153"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-154"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-155"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-156"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-157"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-158"
    type: verifies
---
# Task-028: Representation contracts

## Scope

Define representation-profile refinements and fixtures for Markdown, JSON,
PostgreSQL, Protobuf, Avro, Arrow/Parquet, CSV, and TSV without selecting a
format that lacks a concrete consuming boundary.

## Subtasks

- [x] Define each representation's required fields, fit, non-use, authority, and compatibility method.
- [x] Add Markdown semantic-locus and explicitly unrepresentable fixtures.
- [x] Add Protobuf reservation/presence and SQL authority-boundary fixtures.
- [x] Add columnar and delimited explicit-loss/schema fixtures.

## Deliverables

- Representation profile schema family and guidance.
- Format-specific conformance fixtures.

## Notes

- SQL profiles are logical mappings, never physical database authority.
- Protobuf and Arrow/Parquet remain available projections, not universal sources.
