---
id: US-015
title: "Lift a spec bundle into a domain package"
type: US
relationships:
  - target: "ix://agent-ix/filament-core-data/spec/stakeholder/StR-001"
    type: "traces_to"
  - target: "ix://agent-ix/filament-core-data/US-006"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/US-007"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/US-010"
    type: "depends_on"
---
# [US-015] Lift a spec bundle into a domain package

## Story

**As a** domain author who declares entities, value objects, and events in a Quire spec bundle
**I want** the semantic compiler to read my bundle through the same extraction contract Quire already applies to it and produce one versioned IR document for my repository
**So that** the Rust, TypeScript, and Python packages generated for my domain are derived from the specification I review, and every downstream package of my domain is a build artifact rather than a second hand-maintained model.

## Context

Issue #19 delivered the compiler's first frontend, which lowers a TypeSpec
program to semantic IR `1.1.0`. That frontend reads the *metamodel*: the
archetype packages the modules declare. It leaves `spec-bundle`, the second
value of the published `frontendDialect` vocabulary, registered and refused
with `agent-ix.compiler.FRONTEND_NOT_IMPLEMENTED` naming this ticket
(FR-045-CON-1).

Between #19 and this story the extraction contract landed on the Quire side:
quoin#293 fixed the Markdown → semantic-core mapping (the typed
`Field | Type | Multiplicity | Constraints` table, the `sysml` fence, and the
`ocl` clause fence), and quire-rs#388 implemented it in-process as
`quire_rs::semantic::extract_semantic`, returning `FieldDecl[]`,
`ClauseRef[]`, and `OperationDecl[]` with source loci and a closed diagnostic
vocabulary. spec-objects-business#4 published the first module whose
`semantic` block exports those declarations against semantic-core `0.1.0`.

What does not exist is the step that reads a *whole bundle* through that
contract and lowers what it returns into the IR: the resolver from a type
token to a declared artifact, the mapping from a Quire edge to an IR
relationship, the package identity minted from a repository and a spec
revision, and the fixtures that prove a table-authored and a fence-authored
declaration reach the same bytes. Without it there is no compiled domain
package, so quire-contract-ir#52's typed-model binding has nothing to bind and
the SysML target (#37) has no input.

The owner directive of 2026-09-07 fixes the language: this is a new
first-party production component and is written in Rust, as a member of the
repository's existing Cargo workspace.

## Acceptance Examples (Illustrative)

### [US-015-EX-1] A typed entity reaches the IR with its clause

- **Given** a bundle whose `FR-006` carries `object: entity`, a typed `## Properties` table, a `## Relationships` list, and an `## Invariants` `ocl` fence
- **When** the author lifts the bundle
- **Then** the IR carries one `record` for `ConfigVersion` with its fields, one relationship to `ConfigOverlay`, and one opaque `ocl` clause with the fence's span, and lifting it a second time produces the same bytes

### [US-015-EX-2] The same declaration in two forms is one declaration

- **Given** two copies of the same artifact, one with the typed table and one with the `sysml` fence
- **When** the author lifts each
- **Then** the two IR documents are byte-identical

### [US-015-EX-3] A typo in a type cell is reported where it was written

- **Given** a `Type` cell reading `Sting`
- **When** the author lifts the bundle
- **Then** the lift fails, writes no document, and reports one stable diagnostic code at that row's line and column, naming the token

### [US-015-EX-4] The corpus is never written

- **Given** a read-only checkout of the domain repository
- **When** the author lifts it, with or without defects
- **Then** the checkout is byte-unchanged and the only files written are the requested output document and its diagnostics

### [US-015-EX-5] A module the compiler cannot read is refused, not emptied

- **Given** a module whose `semantic` block declares a semantic-core version the engine has no vendored bundle for
- **When** the author lifts a bundle under it
- **Then** the lift refuses with the module's own refusal code rather than lowering every artifact as an empty record

## Options (Exploratory)

The frontend could re-parse the Markdown itself, call the Quire engine through
its JSON boundary, or consume the engine's Rust types in-process. It could mint
package versions from a manifest, from a git revision, or from a content
digest. It could carry a legacy free-column table as an empty record, as a
diagnostic, or as a refusal. The functional requirements settle each of these;
the first is settled by the program's drift rule before any requirement is
written: a second definition of `FieldDecl`, `ClauseRef`, or `OperationDecl`
is the defect this program exists to remove.

## Constraints (Contextual)

Rust, as a new workspace member. The extraction types are consumed from
quire-rs in-process; nothing is re-declared and nothing routes through the
JSON request adapter. Corpus repositories are read-only fixtures. No consumer
repository is migrated; a domain package is derived at build time. The
TypeSpec frontend, the archetype packages, `packages/semantic-core`, and
`crates/semantic-ir` are not edited. Everything original is AGPL-3.0-only.

## Dependencies (Contextual)

Depends on IR v1.1 ([US-006](./US-006-declare-typed-domain-structure.md)), the
semantic-core grammar ([US-007](./US-007-declare-archetypes-against-a-shared-grammar.md)),
the compiler core and its frontend seam
([US-010](./US-010-compile-a-semantic-package.md)), `agent-ix/quoin#293`,
`agent-ix/quire-rs#388`, `agent-ix/spec-objects-business#4`, and
`agent-ix/spec-artifacts-iso#34`. Blocks the SysML target (#37) and
`agent-ix/quire-contract-ir#52`'s typed-model binding.

## Priority and Risk (Informative)

Priority is P0 on the compiler track. The principal risk is fixture
availability: the corpus predates the typed-table contract, so the live
`config-service` FR-006 lifts to nothing today and the worked example is met by
the provenance-tracked re-authoring quire-rs vendors. The second risk is the
`json-schema` target, which has no IR-reading backend (#85), so the fifth
acceptance criterion of #36 is carried as a declared gap until that is ruled.
Four contract inputs — #77, #78, #67, #61 — are open with no ruling; each
requirement that touches one states the reading it takes and cites the issue.

## Traceability (Informative)

This story drives [FR-091](../functional/FR-091-read-a-spec-bundle-through-the-extraction-contract.md)
through [FR-099](../functional/FR-099-provide-the-extraction-frontend-command-line.md)
and is constrained by [NFR-031](../non-functional/NFR-031-deterministic-and-hermetic-lifting.md),
[NFR-032](../non-functional/NFR-032-non-disruptive-extraction-frontend.md), and
[NFR-033](../non-functional/NFR-033-qualified-toolchain-and-licensed-dependencies.md).
The Phase 0 feasibility record is the 2026-09-08 comment on issue #36.
