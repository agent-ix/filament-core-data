---
type: master-requirements
name: filament-core-data
org: agent-ix
component_type: schema-library
tags:
  - semantic-data
  - schemas
  - rust
  - typescript
  - python
  - markdown
implementation_language: multi-language
depends_on: []
relationships:
  - target: "ix://agent-ix/quire-rs/spec"
    type: "depends_on"
    cardinality: "1:1"
  - target: "ix://agent-ix/quoin/spec"
    type: "depends_on"
    cardinality: "1:1"
standards_alignment:
  - iso-iec-ieee-29148
  - ieee-828
title: "Master Requirements Specification"
---
# Master Requirements Specification
## filament-core-data semantic data architecture

## 1. Purpose

This specification governs the durable architecture record for the Agent IX
semantic data system. The record defines how semantic data, authored knowledge,
runtime state, generated language types, storage formats, wire formats, and
presentation forms relate without treating any one representation as universal.

The first delivery governed by this specification is documentation-only. It
records accepted principles, provisional decisions, ownership boundaries, and
the evidence gates that later compiler and migration tickets must satisfy.

## 2. Scope

### 2.1 In Scope

- An indexed architecture document bundle under `docs/semantic-data-system/`.
- Accepted decisions for concern-specific authority, generated-package
  ownership, and best-fit representations.
- A conditional TypeSpec decision with an explicit JSON Schema fallback.
- The semantic metamodel, data planes, package model, representation mappings,
  compatibility policy, review method, and staged roadmap at design-record
  fidelity.
- Explicit ownership boundaries among `filament-core-data`, Quire, Quoin,
  module repositories, and downstream Filament consumers.
- Compatibility dispositions for existing Quire architectural decisions.

### 2.2 Out of Scope

- Implementing the semantic compiler or any emitter.
- Generating, publishing, or consuming new Rust, TypeScript, or Python packages.
- Changing Avro, database, API, Tauri, Protobuf, Arrow, Parquet, or Markdown
  runtime behavior.
- Modifying Quire parsing, validation, extraction, or byte-splice behavior.
- Modifying Quoin catalog installation or module enforcement.
- Migrating persisted data, rewriting the corpus, or removing legacy contracts.
- Selecting TypeSpec as final before its separately ticketed feasibility gate.

## 3. System Overview

### 3.1 Semantic-first model

The architecture separates semantic meaning from its representations. Concrete
domain types remain directly usable; the system is not a generic entity-attribute-
value store and does not require one universal runtime envelope.

### 3.2 Concern-specific authority

Authority is assigned by concern:

- Human- and agent-authored durable knowledge is authoritative in typed Markdown.
- Transactional and operational state is authoritative in its owning database or
  event store.
- Interface payloads conform to versioned schema packages.
- Analytical datasets are derived and retain transformation provenance.
- Generated language types and validation schemas are derived from the accepted
  schema source and package metadata.

### 3.3 Architectural planes

- **Meta plane** — packages, type definitions, mappings, profiles, and
  compatibility policy.
- **Definition plane** — specifications, architecture, policy, plans, and other
  authored knowledge.
- **Execution and observation plane** — runs, results, evidence, events,
  incidents, and measurements.
- **Presentation plane** — documents, reports, UI views, tables, exports, and
  LLM-oriented text.

## 4. Ownership Boundaries

| Owner | Responsibility | Explicit non-responsibility |
|---|---|---|
| `filament-core-data` | Semantic IR, shared kernel, package/projection contracts, compiler and emitters in later tickets | Domain vocabulary ownership and application persistence policy |
| Quire | Parse, validate, extract, and byte-splice typed Markdown | Cross-language generation, template rendering, application policy, registry sourcing |
| Quoin | Module catalog, locks, installation, skills, and workflows | Runtime domain persistence and compiler ownership |
| Module repositories | Domain vocabulary, constraints, skeletons, mappings, examples, and module versions | Shared compiler implementation |
| Filament consumers | Application adapters, persistence mappings, API/IPC projections, and migrations | Independent competing definitions of shared contracts |

## 5. Requirements Architecture

| Class | Artifacts | Purpose |
|---|---|---|
| Stakeholder | [StR-001](./stakeholder/StR-001-durable-semantic-data-governance.md) | Durable governance need |
| User | [US-001](./usecase/US-001-understand-data-authority.md), [US-002](./usecase/US-002-plan-safe-adoption.md) | Reader and implementer outcomes |
| Functional | [FR-001](./functional/FR-001-indexed-architecture-record.md) through [FR-008](./functional/FR-008-decision-and-conflict-records.md) | Required architecture-record content |
| Non-functional | [NFR-001](./non-functional/NFR-001-traceable-record.md) through [NFR-003](./non-functional/NFR-003-non-disruptive-record.md) | Traceability, readability, and non-disruption |

## 6. Decision Status Model

- **Normative** content is accepted and governs later work until superseded.
- **Provisional** content is a candidate whose named evidence gate has not passed.
- **Informative** content explains context and carries no requirement.
- **Historical** content records a retired decision and is normative of nothing.

The architecture principles are normative. Exact metamodel fields, TypeSpec
adoption, generated package registry names, and individual migration dispositions
remain provisional until their owning tickets pass.

## 7. Verification Strategy

- Quire validation checks requirement and process-artifact structure.
- Link and inventory checks prove the record is navigable and complete.
- Inspection checks ownership, status labeling, and conflict dispositions.
- The Test Matrix maps every acceptance criterion to an explicit verification
  case before this ticket enters specification review.

## 8. Program Relationships

- Project 17 program epic: `agent-ix/filament-core-data#3`.
- Project 18 companion epic: `agent-ix/quoin#286`.
- Architecture companion: `agent-ix/quoin#289`.
- TypeSpec feasibility gate: `agent-ix/filament-core-data#4`.
- Corpus reviews: `agent-ix/filament-core-data#10` and `agent-ix/quoin#288`.

## 9. Change Management

Changes to normative principles require an ADR that identifies affected
requirements, compatibility consequences, and superseded decisions. Provisional
content becomes normative only through its named gate. Historical material must
remain clearly fenced from current architecture.

## 10. References

- ISO/IEC/IEEE 29148 — Requirements engineering.
- IEEE 828 — Configuration management.
- Quire ADR 0004 — rendering/template removal and direct Markdown authoring.
- `filament-core-data` issue #3 — semantic data platform program epic.
- `quoin` issue #286 — semantic module contracts program epic.
