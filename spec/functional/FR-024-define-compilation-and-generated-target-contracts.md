---
id: FR-024
title: "Define compilation and generated-target contracts"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-005"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-019"
    type: "depends_on"
---
# [FR-024] Define compilation and generated-target contracts

## Description

The v1 specification SHALL define one compiler input/output boundary and
target-specific conformance contracts for semantic IR, JSON Schema, Rust,
TypeScript, and Python without selecting an unqualified backend implementation.

## Inputs

- Locked package graph, structural schemas, selected profile, mappings, and exact compiler configuration
- Target backend identity, version, options schema, and supported IR feature declaration

## Outputs

- Generated target files
- Machine-readable output manifest, diagnostics, normalized fingerprint, and conformance-fixture results

## Behavior

- Compiler orchestration SHALL validate and normalize the complete locked input before any backend writes output.
- Every backend SHALL declare the IR contract versions and features it supports.
- Every diagnostic SHALL carry a stable namespaced code, severity, message, source locus, owning input identity, causal chain, related loci, and emission-blocking disposition.
- JSON Schema output SHALL preserve modular stable identities, references, constraints, and explicit unknown-field policies.
- Rust output SHALL expose native structs, enums, newtypes, unions, Serde behavior, and framework-neutral validation/conversion surfaces.
- TypeScript output SHALL pair static types with runtime validation derived from the same locked contract.
- Python output SHALL provide qualified Pydantic v2 and standard-dataclass families through a governed schema adapter without authoring-time decorators or custom `@` tags.
- Generated semantic packages SHALL exclude UI, ORM, SQLAlchemy, Tauri, network-client, database-migration, and application-service dependencies.
- The backend selection process SHALL qualify upstream generators before retaining a custom backend.
- Retained custom codegen SHALL live in the separately versioned reusable AGPL compiler/codegen repository defined by its own tickets.
- Unsupported IR features SHALL fail or produce an explicitly approved lossy target.
- A backend SHALL NOT silently emit `any`, untyped maps, or empty models.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-024-AC-1 | Independent backends receive the same versioned IR and return the same output-manifest and diagnostic envelope. | Test |
| FR-024-AC-2 | Rust, TypeScript, Python, and JSON Schema target contracts cover native API and runtime validation behavior. | Inspection |
| FR-024-AC-3 | Generated packages contain no prohibited application/framework dependency. | Test |
| FR-024-AC-4 | Unsupported target features fail visibly rather than degrading to `any`, generic maps, or empty models. | Test |
| FR-024-AC-5 | Backend selection evidence distinguishes qualified upstream generation from retained custom implementation. | Analysis |
| FR-024-AC-6 | The contract requires AGPL-3.0-or-later licensing for Agent IX custom compiler and codegen sources. | Inspection |
| FR-024-AC-7 | Independent source adapters and backends report equivalent failures through the same diagnostic envelope and stable code family. | Test |

## Dependencies

- **Upstream**: [FR-019](./FR-019-select-v1-structural-source-and-ir.md), [FR-020](./FR-020-define-semantic-type-system-and-identity.md)
- **Downstream**: compiler issue #5 and generated-package issue #11
