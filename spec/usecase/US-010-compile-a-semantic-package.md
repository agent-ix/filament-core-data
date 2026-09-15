---
id: US-010
title: "Compile a semantic package to versioned IR"
type: US
relationships:
  - target: "ix://agent-ix/filament-core-data/spec/stakeholder/StR-001"
    type: "traces_to"
  - target: "ix://agent-ix/filament-core-data/US-005"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/US-006"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/US-007"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/US-009"
    type: "depends_on"
---
# [US-010] Compile a semantic package to versioned IR

## Story

**As a** semantic package author
**I want** one command that reads my TypeSpec sources together with my package manifest, imports, profiles, and lock, and produces a single versioned semantic IR document with its diagnostics
**So that** every downstream generator, conformance run, and compatibility review argues about one artefact whose bytes I can reproduce, rather than about whatever each backend happened to read out of my sources.

## Context

Issue #9 published thirteen v1 contract schemas and issue #34 extended the
semantic IR to contract `1.1.0` with multiplicity, units, relationships,
operations, clauses, and a closed constraint vocabulary. Issue #35 published the
semantic-core declaration grammar. Issue #27 promoted the issue #4 prototype
emitters into `src/compiler/`.

What exists after #27 is a working *prototype* emitter: it walks a compiled
TypeSpec program and writes a `{schemaVersion, generator, types}` document whose
shape predates the published contract, whose `role` and `nullable` values are
name and string heuristics, and which reads nothing from a package manifest,
an import graph, a profile, or a lock. FR-041-CON-2 says so explicitly and
names this ticket as the place the two shapes are reconciled.

Nothing between the authored TypeSpec and the contract IR exists yet: there is
no package resolver, no lock builder, no fingerprint, no diagnostic registry, no
compatibility-diff API, and no seam that a second frontend could be plugged
into. Four downstream tickets — the Rust, TypeScript, and Python packages and
the publication ticket — consume the IR, and the conformance corpus (#20) is
being built independently to judge it.

## Acceptance Examples (Illustrative)

### [US-010-EX-1] One command, one reproducible document

- **Given** a package directory holding a manifest and TypeSpec sources
- **When** the author compiles it twice on the same pinned toolchain
- **Then** both runs write the same IR bytes and the same diagnostic bytes, and the document declares which contract version, package version, and lock fingerprint it was built from

### [US-010-EX-2] A broken import is reported where it is written

- **Given** a manifest importing a package version that no search path supplies
- **When** the author compiles
- **Then** the compile fails, writes no IR file, and reports a stable diagnostic code at the line and column of the offending import entry in the manifest — not at the top of the file and not at the package

### [US-010-EX-3] The prototype is not silently rebaselined

- **Given** the issue #4 goldens that prove the #27 promotion was faithful
- **When** the contract compiler lands
- **Then** those goldens are unchanged, because the contract IR is produced by a new path rather than by editing the frozen prototype emitter's semantics

### [US-010-EX-4] A second frontend can be added without moving the IR

- **Given** the spec-bundle extraction frontend is not written yet
- **When** the author asks the compiler for the `spec-bundle` dialect
- **Then** the compiler names the unimplemented dialect and the ticket that owns it, instead of guessing, and the shared fixture harness is already in place for it to be checked against

### [US-010-EX-5] A revision is classified before it ships

- **Given** two IR documents for the same package
- **When** the author diffs them
- **Then** each change carries a family, a surface, a disposition, and a rationale, and the aggregate is the most restrictive of them

## Options (Exploratory)

The contract IR could have been produced by rewriting the prototype emitter in
place, by a second emitter beside it, or by a lowering pass over the prototype
document. Package resolution could have reused an existing package manager, been
written against the manifest schema, or been deferred to the caller. Source loci
for JSON inputs could have been approximated at file granularity or located
exactly. The functional requirements settle each of these.

## Constraints (Contextual)

The TypeSpec toolchain stays exactly pinned with no upper bounds. Everything
original is AGPL-3.0-or-later. Nothing here publishes a package or moves a consumer.
No backend-specific decorator — `@typespec/json-schema`, `@typespec/protobuf`,
or any other emitter's vocabulary — may become the authority for an IR value.

## Dependencies (Contextual)

Depends on the v1 contract schemas and fixtures
([US-005](./US-005-author-portable-semantic-packages.md)), IR v1.1
([US-006](./US-006-declare-typed-domain-structure.md)), the semantic-core
grammar ([US-007](./US-007-declare-archetypes-against-a-shared-grammar.md)), and
the promoted compiler ([US-009](./US-009-build-from-a-supported-compiler.md)).
Blocks the generated Rust, TypeScript, and Python packages (#21, #22, #23) and
publication (#11). The spec-bundle frontend (#36) plugs into the seam this story
creates but is not built here. The conformance corpus and differential oracle
(#20) judge this work and are authored independently of it.

## Priority and Risk (Informative)

Priority is P0; this is the centre of the compiler chain. The principal risk is
that the compiler becomes its own oracle — that the only thing proving the IR
correct is the code that produced it. The secondary risk is that a value with no
authority in the source (a role, a nullability, a unit) is invented by a
heuristic and then frozen by a golden, which is exactly the defect the prototype
`role`/`nullable` heuristics illustrate.

## Traceability (Informative)

The host floor recorded in issue #42 blocks the retained-evidence replay and is
not repaired here. The spec-bundle frontend is issue #36.

This story drives [FR-045](../functional/FR-045-define-the-frontend-seam.md)
through [FR-052](../functional/FR-052-provide-the-compiler-command-line.md) and is
constrained by [NFR-019](../non-functional/NFR-019-deterministic-contract-compilation.md),
[NFR-020](../non-functional/NFR-020-bounded-and-safe-compilation.md), and
[NFR-021](../non-functional/NFR-021-non-disruptive-compiler-core.md).
