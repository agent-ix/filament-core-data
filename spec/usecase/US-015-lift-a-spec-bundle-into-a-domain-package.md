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

- **Given** a bundle whose `FR-006` carries `object: entity`, a typed `## Properties` table, a frontmatter `relationships:` entry `belongs_to` → `FR-007`, and an `## Invariants` `ocl` fence
- **When** the author lifts the bundle
- **Then** the IR carries one `record` for `ConfigVersion` with its fields, one `belongs_to` relationship to `ConfigOverlay`, and one opaque `ocl` clause with the fence's span; the document passes the independent reader's schema and cross-field rules at lift time; and lifting it a second time produces the committed golden's bytes

### [US-015-EX-2] The same declaration in two forms is one declaration

- **Given** two bundle roots each holding one copy of the same artifact at the same bundle-relative path, one with the typed table and one with the `sysml` fence
- **When** the author lifts each root
- **Then** the two IR documents are byte-identical

### [US-015-EX-3] A typo in a type cell is reported where it was written

- **Given** a `Type` cell reading `Sting`
- **When** the author lifts the bundle
- **Then** the lift fails, writes no document, and reports one stable diagnostic code at that row's line and column, naming the token

### [US-015-EX-4] The corpus is never written

- **Given** a read-only checkout of the domain repository
- **When** the author lifts it, with or without defects
- **Then** the checkout is byte-unchanged; on success the only files written are the output document and its three sidecars (`.fingerprint`, `.diagnostics.json`, `.provenance.json`), on a blocking lift only the diagnostics sidecar, and an output path inside the bundle root is refused before anything is written

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
`crates/semantic-ir` are not edited; `crates/semantic-ir` is consumed as a
workspace `path` dependency for validation and canonical bytes, and it never
depends on this crate. Relationships are lifted from frontmatter
`relationships:` edges only; cross-package imports are refused, because a
domain package has no lock to resolve them against. Everything original is
AGPL-3.0-only.

## Dependencies (Contextual)

Depends on IR v1.1 ([US-006](./US-006-declare-typed-domain-structure.md)), the
semantic-core grammar ([US-007](./US-007-declare-archetypes-against-a-shared-grammar.md)),
the compiler core and its frontend seam
([US-010](./US-010-compile-a-semantic-package.md)), `agent-ix/quoin#293`,
`agent-ix/quire-rs#388`, `agent-ix/quire-rs#411` (the closed module set),
`agent-ix/spec-objects-business#4`, and `agent-ix/spec-artifacts-iso#34`.
Blocks the SysML target (#37), `agent-ix/quire-contract-ir#52`'s typed-model
binding, and filament-core-data#86 (wiring the Rust binary into the
`spec-bundle` seam). Waits on `agent-ix/quire-rs#418` for `## Relationships`
body-list extraction and on issue #85 for the `json-schema` target.

## Priority and Risk (Informative)

Priority is P0 on the compiler track. The principal risk is fixture
availability: the corpus predates the typed-table contract, so the live
`config-service` FR-006 lifts to nothing today and the worked example is met by
the provenance-tracked re-authoring quire-rs vendors, with `relationships:`
frontmatter added to the crate's own copy and recorded in its
`PROVENANCE.json`. The second risk is the `json-schema` target, which has no
IR-reading backend (#85): the fifth acceptance criterion of #36 is a `Blocked`
matrix row traced to this story and naming #85, with no test behind it, and
the FR-098-AC-9 proxy traces to FR-098-AC-9 only. The third is relationship
coverage: quire-rs exposes no located per-document edge extraction, so this
delivery lowers relationships from frontmatter `relationships:` edges only,
and `## Relationships` body lists wait on `agent-ix/quire-rs#418`, whose
landing re-cuts the relationship goldens as one deliberate commit. Parity with
the TypeSpec frontend is structural, on the declared projection of FR-098,
not byte-for-byte: the two envelopes differ by construction. Cross-package
imports are out of scope; a domain package has no lock. Wiring the Rust
binary into the node-side `spec-bundle` seam is filament-core-data#86, not
this story. Four contract inputs — #77, #78, #67, #61 — are open with no
ruling; each requirement that touches one states the reading it takes and
cites the issue, the owner rules them, and a ruling that contradicts a reading
reopens this story's goldens as a deliberate re-golden under FR-098-CON-2.

## Traceability (Informative)

This story drives [FR-091](../functional/FR-091-read-a-spec-bundle-through-the-extraction-contract.md)
through [FR-099](../functional/FR-099-provide-the-extraction-frontend-command-line.md)
and is constrained by [NFR-031](../non-functional/NFR-031-deterministic-and-hermetic-lifting.md),
[NFR-032](../non-functional/NFR-032-non-disruptive-extraction-frontend.md), and
[NFR-033](../non-functional/NFR-033-qualified-toolchain-and-licensed-dependencies.md).
The Phase 0 feasibility record is the 2026-09-08 comment on issue #36. The
composite review is under `spec/reviews/36-extraction-frontend/`; its
relationship, parity, seam, and import findings are carried as
`agent-ix/quire-rs#418`, FR-098's structural projection,
filament-core-data#86, and the Out of Scope entry of `spec.md` §2.2.
