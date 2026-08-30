---
id: FR-006
title: "Representations, mappings, and transformations"
type: FR
verification_method: analysis
evidence:
  - kind: analysis_report
    ref: "spec/reviews/failure-domain.md"
  - kind: test_case
    ref: "test/semantic-architecture.test.ts"
relationships:
  - target: "ix://agent-ix/filament-core-data/spec/usecase/US-001"
    type: "implements"
---
# [FR-006] Representations, mappings, and transformations

## Description

The architecture record SHALL define exports, generation targets,
representation mappings, named profiles, and transformation semantics separately
so that selecting an output does not ambiguously define how data maps into it.

## Behavior

- The record SHALL define codec, lens, projection, extraction, rendering,
  aggregation, enrichment, and materialization transformations.
- The record SHALL define Markdown, JSON, PostgreSQL, Protobuf, Avro
  compatibility, Arrow, Parquet, CSV, and TSV representation guidance.
- Each representation profile SHALL state authority, edit direction, round-trip
  level, allowed lossiness, compatibility policy, and provenance requirements.
- The representation guidance SHALL select Protobuf and Arrow per measured
  boundary rather than as universal formats.
- When a transformation cannot preserve its declared contract, the
  transformation SHALL return an explicit unsupported, invalid, unavailable, or
  lossy outcome rather than silently coercing data.
- Every materialized projection SHALL retain the source identity and version,
  target profile and version, mapping version, and transformation timestamp.
- Every transformation definition SHALL declare whether it is deterministic,
  pure, or effectful.
- Every transformation definition SHALL identify any external reads or writes.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-006-AC-1 | Exports, targets, mappings, and profiles have distinct definitions and examples. | Inspection (TC-021) |
| FR-006-AC-2 | Every required representation has a best-fit use and explicit non-use. | Analysis (TC-022) |
| FR-006-AC-3 | Markdown mappings cover frontmatter, headings, prose, and tables. | Inspection (TC-023) |
| FR-006-AC-4 | Lossy transformations require an explicit declaration and provenance. | Test (TC-024) |
| FR-006-AC-5 | Unsupported, invalid, unavailable, and lossy transformation outcomes remain explicit and no failed projection becomes authoritative. | Analysis (TC-051) |
| FR-006-AC-6 | Transformation definitions expose determinism, purity, and external effects rather than hiding side effects in a mapping. | Analysis (TC-052) |

## Dependencies

- **Upstream**: [FR-002](./FR-002-concern-specific-authority.md), [FR-004](./FR-004-metamodel-and-data-planes.md)
- **Downstream**: compiler emitters and consumer projection tickets
