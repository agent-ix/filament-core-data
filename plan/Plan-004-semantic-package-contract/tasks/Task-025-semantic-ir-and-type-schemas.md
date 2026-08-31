---
id: Task-025
title: "Semantic IR and type schemas"
type: Task
status: done
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-024"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-019"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-020"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-011"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-130"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-131"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-132"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-133"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-134"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-135"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-136"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-137"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-138"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-139"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-140"
    type: verifies
---
# Task-025: Semantic IR and type schemas

## Scope

Publish modular JSON Schema 2020-12 contracts for the semantic IR envelope and
closed structural type vocabulary, with stable identity, source origins,
presence/null/default states, constraints, recursion, roles, and extensions.

## Subtasks

- [x] Define shared version, identity, source-locus, extension, result-state, and diagnostic primitives.
- [x] Define scalar, record, enum, discriminated-union, alias/newtype, sequence, map, and semantic-reference nodes.
- [x] Add positive, negative, boundary, recursive, role, open/closed, and rename fixtures.
- [x] Document JSON Schema authority, TypeSpec non-authority, and retained Avro compatibility.

## Deliverables

- Versioned core and semantic-IR schema family.
- Normative vocabulary documentation and fixture corpus.

## Notes

- Stable semantic IDs cannot be derived from filenames or generated identifiers.
- Every schema uses an absolute stable `$id` and closed-by-default core objects.
