---
id: FR-023
title: "Specify representation-specific contracts"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-005"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-022"
    type: "depends_on"
---
# [FR-023] Specify representation-specific contracts

## Description

For each selected Markdown, JSON, PostgreSQL, Protobuf, Avro, Arrow, Parquet,
CSV, or TSV representation, the v1 specification SHALL define the additional
mapping information and compatibility evidence required by that representation.

## Behavior

- Markdown mappings SHALL address frontmatter fields, headings, prose blocks, tables, lists, fenced blocks, relationships, and body-extraction loci where selected.
- Markdown profiles SHALL state whether authored bytes, extracted semantic structure, or rendered presentation is authoritative.
- Markdown profiles SHALL distinguish byte, structural, and semantic round trips.
- JSON profiles SHALL declare media type, schema identity, discriminator, canonicalization needs, and unknown-field behavior.
- PostgreSQL profiles SHALL map logical fields, identities, nullability, constraints, and provenance while leaving physical DDL, indexes, transactions, and migrations to the owning consumer.
- Protobuf profiles SHALL declare package/message identity, stable field and enum numbers, reservations, presence, unknown-field behavior, and descriptor compatibility.
- Avro profiles SHALL map the existing compatibility contract without implying new universal authority.
- Arrow and Parquet profiles SHALL declare field identity, order, type, nullability, metadata, partitioning, and explicit loss for narrative, recursion, extensions, or relationships.
- CSV and TSV profiles SHALL require an external schema, encoding, delimiter/escape/null rules, header identity, flatness limits, and prohibited implicit type inference.
- A format SHALL NOT be selected without a concrete boundary and its required compatibility fixture.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-023-AC-1 | Every named representation has required mapping fields, best-fit uses, explicit non-uses, and a compatibility method. | Inspection |
| FR-023-AC-2 | Markdown examples cover frontmatter, headings, prose, tables, relationships, and an explicitly unrepresentable construct. | Test |
| FR-023-AC-3 | Protobuf numbers and names remain reserved after removal and no number is inferred from declaration order. | Test |
| FR-023-AC-4 | SQL mapping does not make database DDL or migration state the semantic source. | Inspection |
| FR-023-AC-5 | Arrow/Parquet and CSV/TSV fixtures reject undeclared loss or implicit type inference. | Test |
| FR-023-AC-6 | Protobuf, Arrow, or Parquet remains unselected when no concrete consuming boundary justifies it. | Analysis |

## Dependencies

- **Upstream**: [FR-022](./FR-022-define-mappings-profiles-and-transformations.md), contract census
- **Downstream**: Quire semantic extraction issue, Protobuf boundary tickets, Arrow/Parquet issue #13
