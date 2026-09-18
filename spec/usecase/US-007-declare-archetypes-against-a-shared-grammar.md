---
id: US-007
title: "Declare archetypes against a shared declaration grammar"
type: US
relationships:
  - target: "ix://agent-ix/filament-core-data/spec/stakeholder/StR-001"
    type: "traces_to"
  - target: "ix://agent-ix/filament-core-data/US-006"
    type: "depends_on"
---
# [US-007] Declare archetypes against a shared declaration grammar

## Story

**As a** maintainer of a Quire object module (business, architecture, enterprise, operational, security, safety)
**I want** one shared, versioned grammar that says what a field, relation, operation, or clause declaration is, and a closed set of leaf scalar types a declaration can bottom out in
**So that** every module's archetypes, the spec-bundle extraction frontend, and the formal-clause frontends read the same declaration shapes instead of each inventing a dialect.

## Context

Today every object archetype is `data_schema: {type: object}` and field types in
specs are prose (`UUID (optional)`, `Dict[str, Any]`, `decimal, scale 2`). The
spike's `SemanticObject` carries `extensions?: Record<string>`; nothing types a
field. Issue #34 gave the IR nodes for multiplicity, units, relationships,
operations, clauses, and closed constraints, but no authoring grammar
produces them. The semantic-core package is the type environment shared
by Wave 4 module tickets (`agent-ix/quoin#286`), the extraction frontend
(`agent-ix/filament-core-data#36`), and `agent-ix/quire-contract-ir#52`.

## Acceptance Examples (Illustrative)

### [US-007-EX-1] A module imports the grammar instead of redefining it

- **Given** the business module's `Entity` archetype in TypeSpec
- **When** it declares `fields: FieldDecl[]` by importing `@agent-ix/semantic-core`
- **Then** the emitted `Entity.json` references `FieldDecl.json` from the semantic-core bundle and validates the FR-006 `ConfigVersion` rows

### [US-007-EX-2] A leaf type is always a kernel scalar or a semantic reference

- **Given** a `TypeRef` whose target is `Decimal`
- **When** it is lowered to the IR
- **Then** the IR field references a package-local `Decimal` kernel definition (`scalar: number`) and carries the semantic-core `decimal` extension with the declared precision and scale, and nothing is dropped

### [US-007-EX-3] The kernel refuses domain vocabulary

- **Given** a proposed kernel model named `Entity` or `Endpoint`
- **When** the kernel scope gate runs
- **Then** the addition is rejected as module vocabulary and the ARCH-005 amendment names why

### [US-007-EX-4] A malformed declaration is rejected by the emitted schema

- **Given** a `FieldDecl` whose `type.multiplicity` has `upper: 0, lower: 1`
- **When** the semantic-core reader reads it (the emitted `FieldDecl.json` validates shape; the reader enforces cross-property rules)
- **Then** the reader rejects it at that declaration's locus

## Options (Exploratory)

The grammar could live inside each module, in the IR schema itself, or in one
kernel package every module imports. The kernel scalar set could be open
(strings) or closed. Unit symbols could be free text or a named grammar. The
functional requirements settle each of these.

## Constraints (Contextual)

The kernel stays representation-independent and small; domain vocabulary stays
in modules. The frozen spike, every corpus repository, and every backend are
unchanged. Only the official TypeSpec emitters run.

## Dependencies (Contextual)

Depends on IR v1.1 node shapes ([US-006](./US-006-declare-typed-domain-structure.md), FR-027..030)
and ADR-0005. Blocks `agent-ix/quoin#293` and every Wave 4 module ticket;
`agent-ix/quire-contract-ir#53` consumes the model shapes early.

## Priority and Risk (Informative)

Priority is P0. The principal risk is a kernel that quietly grows domain
vocabulary, or a scalar set that leaves a field untyped (`any`), reintroducing
the prose-type problem one level down.

## Traceability (Informative)

This story drives [FR-031](../functional/FR-031-define-the-semantic-core-declaration-grammar.md)
through [FR-034](../functional/FR-034-lower-semantic-core-declarations-to-ir.md)
and is constrained by [NFR-014](../non-functional/NFR-014-small-kernel-discipline.md).
