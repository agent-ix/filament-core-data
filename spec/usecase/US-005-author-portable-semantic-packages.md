---
id: US-005
title: "Author portable semantic packages"
type: US
relationships:
  - target: "ix://agent-ix/filament-core-data/spec/stakeholder/StR-001"
    type: "traces_to"
---
# [US-005] Author portable semantic packages

## Story

**As a** domain-schema owner
**I want** one versioned contract for semantic types, package boundaries, representation mappings, and generated targets
**So that** dynamic tools and strongly typed Rust, TypeScript, and Python consumers agree without making Markdown, a programming language, a database, or a wire format universally authoritative.

## Context

The architecture and corpus reviews found useful but plane-local Avro records,
Markdown contracts, database models, DTOs, and extraction payloads. The TypeSpec
experiment proved the desired consumer surfaces, and the owner selected TypeSpec
as the structural source (ADR-0005). The next contract therefore uses modular
TypeSpec packages for structural definitions and separately versions the
semantic IR, packages, mappings, profiles, and locks.

## Acceptance Examples (Illustrative)

### [US-005-EX-1] Dynamic and static consumers agree

- **Given** a package that exports a namespaced `VerificationRun` definition
- **When** a dynamic tool validates it from the package schema and a Rust service uses generated native types
- **Then** both consumers observe the same semantic identity, constraints, unknown-field policy, and representation profile

### [US-005-EX-2] Lossy analytics stays derived

- **Given** a report containing relationships and authored prose
- **When** an Arrow profile selects only analytical dimensions and measures
- **Then** the profile names every omission and the materialized rows retain source and transformation provenance

### [US-005-EX-3] Unsupported source fails visibly

- **Given** a package with an unknown contract version or unresolved import
- **When** a compiler or dynamic loader opens it
- **Then** the operation fails with a machine-readable source-located diagnostic and does not produce an empty model

## Options (Exploratory)

Upstream generators may be qualified per target. A retained custom backend is a
separately versioned compiler product with its own conformance and maintenance
obligations; the package author does not select a backend by embedding Python,
Rust, or TypeScript implementation syntax in the semantic definition.

## Constraints (Contextual)

Current Avro packages, typed Markdown, Quire behavior, databases, APIs, and
consumers remain unchanged during this specification ticket. Publication and
migration require later compatibility and human-promotion gates.

## Dependencies (Contextual)

This story depends on the accepted architecture, the Filament and default-module
corpus reviews, and the TypeSpec feasibility evidence. It establishes the shared
boundary required by `agent-ix/quoin#293` before Quoin specializes it for modules.

## Priority and Risk (Informative)

Priority is P0 because compiler and module-manifest work cannot safely proceed
without this boundary. The principal risk is an underspecified IR that lets
independent emitters silently disagree while still compiling.

## Traceability (Informative)

This story drives [FR-019](../functional/FR-019-select-v1-structural-source-and-ir.md)
through [FR-026](../functional/FR-026-preserve-dynamic-and-legacy-boundaries.md)
and is constrained by [NFR-008](../non-functional/NFR-008-deterministic-semantic-compilation.md)
through [NFR-012](../non-functional/NFR-012-non-disruptive-contract-specification.md).
