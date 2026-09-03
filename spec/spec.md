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

This specification governs the durable architecture record and pre-migration
contract evidence for the Agent IX semantic data system. The record defines how
semantic data, authored knowledge, runtime state, generated language types,
storage formats, wire formats, and presentation forms relate without treating
any one representation as universal.

The first delivery governed by this specification is documentation-only. It
records accepted principles, provisional decisions, ownership boundaries, and
the evidence gates that later compiler and migration tickets must satisfy.

The second delivery is a read-only, revision-pinned census of current Filament
contracts. It records source facts, parity, conflicts, impact, uncertainty, and
active-work overlap without changing the measured systems.

The third delivery is an isolated, unpublished TypeSpec feasibility experiment.
It compiles one representative semantic slice through official and custom emitter
paths, exercises ordinary native consumers, and produces retained evidence for a
human schema-source decision.

## 2. Scope

### 2.1 In Scope

- An indexed architecture document bundle under `docs/semantic-data-system/`.
- Accepted decisions for concern-specific authority, generated-package
  ownership, and best-fit representations.
- TypeSpec as the structural schema source (ADR-0005), with JSON Schema and
  Protobuf as generated projections.
- The semantic metamodel, data planes, package model, representation mappings,
  compatibility policy, review method, and staged roadmap at design-record
  fidelity.
- Explicit ownership boundaries among `filament-core-data`, Quire, Quoin,
  module repositories, and downstream Filament consumers.
- Compatibility dispositions for existing Quire architectural decisions.
- A source-cited inventory of Filament schemas, DTOs, database entities, wire
  payloads, generated bindings, JSON-lines records, and Quire extraction contracts.
- Field-level parity, conflict, missing-contract, and repository impact evidence
  pinned to inspected revisions.
- A validated contract-census SpecReview that preserves unknown and
  low-confidence findings.
- A pinned TypeSpec vertical slice covering package identity, core semantic
  objects, events, verification evidence, recursion, extensions, optionality,
  nullability, versioning, and deprecation.
- Experimental JSON Schema, Protobuf, semantic IR, Rust, TypeScript, Python,
  Arrow, and Markdown outputs with compile, golden, diagnostic, determinism,
  compatibility, and maintenance-cost evidence.
- A recommendation that applies the ADR pass rule as written and leaves the
  decision to the owner.

### 2.2 Out of Scope

- Implementing the production semantic compiler or production emitter framework;
  issue #4 may implement only an isolated disposable experimental emitter.
- Generating, publishing, or consuming new Rust, TypeScript, or Python packages.
- Changing Avro, database, API, Tauri, Protobuf, Arrow, Parquet, or Markdown
  runtime behavior.
- Modifying Quire parsing, validation, extraction, or byte-splice behavior.
- Modifying Quoin catalog installation or module enforcement.
- Migrating persisted data, rewriting the corpus, or removing legacy contracts.
- Self-promoting or self-rejecting a schema source from the spike; the decision
  is the owner's.
- Correcting any contract finding while the issue #10 census is being collected.
- Approving consumer, database, wire-format, package, enforcement, or retirement
  changes from audit recommendations alone.

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
| User | [US-001](./usecase/US-001-understand-data-authority.md) through [US-004](./usecase/US-004-evaluate-structural-schema-source.md) | Reader, implementer, migration-review, and tool-selection outcomes |
| Functional | [FR-001](./functional/FR-001-indexed-architecture-record.md) through [FR-018](./functional/FR-018-resolve-structural-schema-source.md) | Architecture, census, and feasibility-gate behavior |
| Non-functional | [NFR-001](./non-functional/NFR-001-traceable-record.md) through [NFR-007](./non-functional/NFR-007-honest-feasibility-evidence.md) | Traceability, readability, reproducibility, isolation, honesty, and non-disruption |

## 6. Decision Status Model

- **Normative** content is accepted and governs later work until superseded.
- **Provisional** content is a candidate whose named evidence gate has not passed.
- **Informative** content explains context and carries no requirement.
- **Historical** content records a retired decision and is normative of nothing.

The architecture principles and the TypeSpec source decision (ADR-0005) are
normative. Exact metamodel fields, generated package registry names, and
individual migration dispositions remain provisional until their owning tickets
pass.

## 7. Verification Strategy

- Quire validation checks requirement and process-artifact structure.
- Link and inventory checks prove the record is navigable and complete.
- Inspection checks ownership, status labeling, and conflict dispositions.
- The Test Matrix maps every acceptance criterion to an explicit verification
  case before this ticket enters specification review.
- Machine-readable census artifacts are schema-validated and checked for stable
  identifiers, resolvable evidence loci, deterministic ordering, and complete
  dispositions.
- TypeSpec feasibility uses pinned compilation, native consumer builds, shared
  golden fixtures, invalid-source diagnostics, clean-run fingerprints,
  compatibility examples, and an independent evidence review.

## 8. Program Relationships

- Project 17 program epic: `agent-ix/filament-core-data#3`.
- Project 18 companion epic: `agent-ix/quoin#286`.
- Architecture companion: `agent-ix/quoin#289`.
- TypeSpec feasibility and source decision: `agent-ix/filament-core-data#4`
  (resolved; ADR-0005).
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
