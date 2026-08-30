---
id: Task-005
title: "Representations and transformations"
type: Task
status: done
track: B
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-003"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-006"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-021"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-022"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-023"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-024"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-051"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-052"
    type: verifies
---
# Task-005: Representations and transformations

## Scope

Define projection configuration concepts, representation profiles, Markdown
mappings, transformation taxonomy, explicit failure/loss, purity/effects, and
provenance requirements.

## Subtasks

- [x] Define exports, targets, mappings, and profiles independently with examples.
- [x] Define codec, lens, projection, extraction, rendering, aggregation, enrichment, and materialization.
- [x] Profile Markdown, JSON, PostgreSQL, Protobuf, Avro, Arrow, Parquet, CSV, and TSV by best-fit and non-use.
- [x] Define frontmatter, headings, prose, and table Markdown mappings.
- [x] Define preservation levels, explicit outcomes, provenance envelope, determinism, purity, and effects.

## Deliverables

- Representation and projection architecture document
- Projection configuration example and mapping semantics
- Representation decision table

## Notes

- Select Protobuf and Arrow only at measured boundaries.
- LLM-oriented text is a first-class presentation projection, not semantic authority for runtime records.
