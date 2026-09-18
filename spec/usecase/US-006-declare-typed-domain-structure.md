---
id: US-006
title: "Declare typed domain structure without loss"
type: US
relationships:
  - target: "ix://agent-ix/filament-core-data/spec/stakeholder/StR-001"
    type: "traces_to"
  - target: "ix://agent-ix/filament-core-data/US-005"
    type: "depends_on"
---
# [US-006] Declare typed domain structure without loss

## Story

**As a** module author declaring domain objects for a Quire object module
**I want** the fields, multiplicities, units, relationships, operations, and formal clauses I write in a spec artifact to survive into the semantic IR exactly as declared
**So that** a compiled domain package, a generated target, and a formal-clause checker all read the same declaration instead of three prose paraphrases of it.

## Context

Wave 4 modules (`agent-ix/quoin#286`) author archetypes in TypeSpec against the
semantic-core L3 declaration grammar (`FieldDecl`, `RelationDecl`,
`OperationDecl`, `ClauseRef`). Today the IR `field` node carries only
`presence` and `nullable`; `typeRef` is a bare identity; `constraint.keyword` is
an untyped string; `relationships[]` appears in FR-019 prose but not in the
schema; there are no operations, clauses, or units. The worked example is
config-service `FR-006 ConfigVersion`, whose Properties table today says
`UUID (optional)`, `Dict[str, Any]`, and `FK → config_overlays.id` in prose. That
artifact is a read-only fixture; this story changes what the IR can hold, not the
corpus.

## Acceptance Examples (Illustrative)

### [US-006-EX-1] A multiplicity-bearing field round-trips

- **Given** a `parent : ConfigVersion[0..1]` declaration in a typed Properties table
- **When** the declaration is lifted into the semantic IR and serialized in normalized form
- **Then** the IR field carries `multiplicity {lower: 0, upper: 1}`, its derived presence is `optional`, and re-serialization is byte-identical

### [US-006-EX-2] A relationship is a node, not a comment

- **Given** `overlay : many-to-one → ConfigOverlay` declared as a `belongs_to` relation
- **When** the artifact is lifted
- **Then** the IR type definition carries a `relationships[]` entry with verb, category, target, multiplicity, and origin, and no prose is required to recover it

### [US-006-EX-3] A formal clause is carried, never parsed

- **Given** an `ocl` invariant fence under `## Invariants`
- **When** the artifact is lifted
- **Then** the IR carries a `clauses[]` entry with `language: ocl`, a clause identity, the clause text as extracted, and the source span, and the IR itself asserts nothing about what the text means

### [US-006-EX-4] An unknown constraint keyword fails

- **Given** a constraint with keyword `mnimum`
- **When** the IR document is validated
- **Then** validation fails at that constraint with its locus instead of accepting an untyped operand

## Options (Exploratory)

Presence and nullability could be retired in favor of multiplicity alone, or kept
as derived views. Relationships could live only in the frontmatter graph or also
as typed IR nodes. Clause languages could be a closed set or namespaced
extensions. The functional requirements settle each of these.

## Constraints (Contextual)

IR v1.1 is additive to v1. The frozen TypeSpec spike, every v1 fixture, current
backends, and every corpus repository stay unchanged.

## Dependencies (Contextual)

This story refines [US-005](./US-005-author-portable-semantic-packages.md) and
supplies the node shapes that the semantic-core grammar
(`agent-ix/filament-core-data#35`), the module contract (`agent-ix/quoin#293`),
and the formal-clause frontends (`agent-ix/quire-contract-ir#52`) consume.

## Priority and Risk (Informative)

Priority is P0: every Wave 4 module ticket blocks on these node shapes. The
principal risk is two independent readers of the IR schema disagreeing about a
new node; fixture-backed agreement is the mitigation.

## Traceability (Informative)

This story drives [FR-027](../functional/FR-027-declare-field-multiplicity-and-units.md)
through [FR-030](../functional/FR-030-bind-source-dialect-and-manifest-targets.md)
and amends [FR-020](../functional/FR-020-define-semantic-type-system-and-identity.md)
(fcd#179 deleted NFR-013, the "additive semantic IR revision" requirement this
story was constrained by; its subject, the 1.0.0 -> 1.1.0 revision, no longer
exists).
