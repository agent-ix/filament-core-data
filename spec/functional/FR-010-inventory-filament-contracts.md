---
id: FR-010
title: "Inventory Filament data contracts"
type: FR
verification_method: test
evidence:
  - kind: test_case
    ref: "test/contract-census.test.ts"
  - kind: analysis_report
    ref: "audit/filament-contract-census/inventory.json"
relationships:
  - target: "ix://agent-ix/filament-core-data/spec/usecase/US-003"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/spec/functional/FR-009"
    type: "depends_on"
---
# [FR-010] Inventory Filament data contracts

## Description

Using the pinned audit snapshot, the audit SHALL publish a machine-readable
inventory of every in-scope schema, DTO, database entity, wire payload, generated
binding, JSON-lines record, and Markdown extraction contract.

## Inputs

- [FR-009](./FR-009-snapshot-audit-inputs.md) audit snapshot
- Source definitions, migrations, generated artifacts, fixtures, and extraction contracts at pinned revisions

## Outputs

- Deterministically ordered machine-readable contract inventory
- Source-location and generated-locus evidence for every inventory record
- Human-readable inventory summary grouped by repository and contract family

## Behavior

- Each inventory record SHALL identify a stable audit identifier, repository,
  contract family, concept, representation, language, authority, ownership,
  producer, known consumers, version mechanism, and source or generated locus.
- Each inventory record SHALL record identity, nullability, defaults, provenance,
  and lossiness at contract or field granularity and distinguish not-applicable,
  none, unknown, and unavailable values.
- The audit SHALL include Avro, Pydantic or equivalent Python models,
  Rust/Serde/Specta types, TypeScript contracts, SQL entities, JSON-lines records,
  and Quire extraction, or SHALL provide a source-cited reason that a listed
  representation is absent from scope.
- The audit SHALL not infer an absent consumer, default, version, or transformation
  as empty or lossless.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-010-AC-1 | Every in-scope repository and shared contract family has at least one inventory disposition or an evidence-backed absence record. | Test (TC-059) |
| FR-010-AC-2 | Every inventory record cites a repository path and source line range or a reproducible generated-schema locus. | Test (TC-060) |
| FR-010-AC-3 | Identity, nullability, defaults, version, provenance, ownership, producer, consumers, and lossiness never collapse unknown or unavailable into an empty value. | Test (TC-061) |
| FR-010-AC-4 | The inventory distinguishes authored, generated, persisted, wire, analytical, and extracted representations. | Test (TC-062) |
| FR-010-AC-5 | Re-running inventory validation against the pinned inputs reports zero duplicate audit identifiers and zero orphan evidence references. | Test (TC-063) |

## Dependencies

- **Upstream**: [FR-009](./FR-009-snapshot-audit-inputs.md)
- **Downstream**: [FR-011](./FR-011-analyze-contract-parity.md), [FR-012](./FR-012-assess-repository-impact.md)
