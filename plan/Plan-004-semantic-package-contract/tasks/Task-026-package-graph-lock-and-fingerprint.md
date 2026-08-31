---
id: Task-026
title: "Package graph, lock, and fingerprint"
type: Task
status: done
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-025"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-021"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-141"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-142"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-143"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-144"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-145"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-146"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-201"
    type: verifies
---
# Task-026: Package graph, lock, and fingerprint

## Scope

Define versioned package manifest and resolved-lock schemas plus the canonical
byte and digest contract shared by dynamic and generated consumers.

## Subtasks

- [x] Define owner/name package identities, sources, exports, imports, profiles, targets, mappings, and compatibility posture.
- [x] Define exact transitive lock entries, content/source identities, and conflict diagnostics.
- [x] Specify canonicalization, digest algorithm, included inputs, and excluded ordering/environment inputs.
- [x] Add graph ordering, conflict, cycle, visibility, extension, profile-purity, and fingerprint fixtures.

## Deliverables

- Package manifest and lock schemas.
- Canonical fingerprint specification and conformance cases.

## Notes

- Registry URLs and installation policy are not package identity and remain Quoin-owned.
