---
id: Task-030
title: "Compatibility contract and corpus"
type: Task
status: done
track: B
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-027"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/Task-029"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-025"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-165"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-166"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-167"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-168"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-169"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-170"
    type: verifies
---
# Task-030: Compatibility contract and corpus

## Scope

Define compatibility report schemas and a table-driven expected-result corpus
covering semantic, profile, mapping, representation, target, consumer, and legacy
surfaces.

## Subtasks

- [x] Define per-change evidence, affected identities/consumers, rationale, required gate, and aggregate disposition.
- [x] Cover patch, additive, conditional, breaking, unknown, and invalid outcomes for every change family.
- [x] Prove most-restrictive aggregation across disagreeing targets and consumers.
- [x] Cover open/closed unknowns, authority/loss changes, stale consumers, and reserved Protobuf identifiers.

## Deliverables

- Compatibility report schema.
- Versioned old/new package and expected-disposition corpus.

## Notes

- The ticket defines conformance expectations, not the production classifier implementation.
