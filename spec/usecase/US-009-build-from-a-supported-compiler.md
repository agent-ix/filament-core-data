---
id: US-009
title: "Build generated packages from a supported compiler"
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
---
# [US-009] Build generated packages from a supported compiler

## Story

**As a** maintainer of the Agent IX semantic data system
**I want** the semantic-IR emitter and the language generation backends to be owned code under the same quality, licence, and determinism gates as the rest of the repository, instead of living inside a frozen throwaway spike
**So that** the Rust, TypeScript, and Python package tickets can be built from a compiler that is owned, tested, and versioned rather than by copying prototype code out of an experiment.

## Context

Issue #4 produced a working prototype: a TypeSpec `$onEmit` semantic-IR emitter,
hand-rolled Rust/Serde and TypeScript generators, and a Python adapter that
normalizes the official JSON Schema bundle for `datamodel-code-generator`. All of
it lives under `spikes/typespec-feasibility/`, is reachable only through a
`file:` devDependency, has its generated and evidence trees excluded from the
repository formatter, and is declared non-canonical by NFR-006.

ADR-0005 has since selected TypeSpec as the structural source and ADR-0002 keeps
the compiler in this repository. IR v1.1 (issue #34) and the semantic-core
grammar (issue #35) are merged. The next tickets in the chain — the semantic
compiler (#19) and the Rust, TypeScript, and Python packages (#21, #22, #23) —
have nothing supported to build on while the only working generators are spike
code. The spike's own capability record says so: `native-codegen-conformance` and
`custom-extension-maintenance` are recorded as `partial` precisely because the
generators are disposable.

The spike's retained evidence must stay reproducible for historical review even
after its source is promoted, and none of this may publish a package or move a
consumer.

## Acceptance Examples (Illustrative)

### [US-009-EX-1] A downstream ticket builds from `src/`, not from the spike

- **Given** the Rust package ticket needs Serde types for a semantic package
- **When** it calls the repository's build interface
- **Then** it reaches an owned module that is formatted and tested by the repository's own gates, whose declarations `tsc` checks, and it never reads a path under `spikes/`

### [US-009-EX-2] A prototype component is not promoted just because it worked

- **Given** the spike's Arrow projection and Markdown mapping outputs, which are declared metadata rather than generators
- **When** the promotion inventory is written
- **Then** each component carries an explicit disposition — retain, rewrite, replace with official codegen, or discard — and the disposition cites the evidence rather than the fact that the representative golden passed

### [US-009-EX-3] The frozen experiment still replays

- **Given** the promoted compiler has replaced the spike emitter package
- **When** the retained-evidence check runs
- **Then** the spike regenerates its evidence through the promoted compiler and every retained byte still matches, except deltas that were declared in advance

### [US-009-EX-4] Nothing ships as a side effect

- **Given** the promotion has landed
- **When** the repository is inspected
- **Then** no package was published, no schema, fixture, or consumer changed, and reverting the promotion commit restores the spike as the only generator

## Options (Exploratory)

The prototype could be lifted verbatim, rewritten against the merged IR v1.1
node shapes, or replaced entirely by official emitters. The Python path could
keep the hand-written backend or keep the established `datamodel-code-generator`
route. The spike could be deleted, kept as a dependency, or kept as evidence only.
The functional requirements settle each of these.

## Constraints (Contextual)

The TypeSpec toolchain stays exactly pinned with no upper bounds. Everything
original is AGPL-3.0-only. No `file:` or `link:` dependency survives. No corpus
repository, no published package, and no consumer is touched.

## Dependencies (Contextual)

Depends on the issue #4 spike evidence, ADR-0002, ADR-0005, IR v1.1
([US-006](./US-006-declare-typed-domain-structure.md)) and the semantic-core
grammar ([US-007](./US-007-declare-archetypes-against-a-shared-grammar.md)).
Blocks the semantic compiler (#19), the generated Rust, TypeScript, and Python
packages (#21, #22, #23), and publication (#11). The conformance baseline (#20)
is built independently and is not consumed here.

## Priority and Risk (Informative)

Priority is P1. The principal risk is promoting prototype code and thereby
promoting its unmeasured assumptions — the Rust and TypeScript generators were
qualified against exactly one representative slice — and the secondary risk is
that moving the emitter silently rebaselines the frozen spike evidence, which
would destroy the historical record the promotion is supposed to preserve.

## Traceability (Informative)

One host-reproducibility defect in the retained issue #4 evidence is recorded
separately as issue #42 and is deliberately not repaired here.

This story drives [FR-040](../functional/FR-040-disposition-the-prototype-inventory.md)
through [FR-044](../functional/FR-044-replay-the-frozen-spike-through-the-promoted-compiler.md)
and is constrained by [NFR-017](../non-functional/NFR-017-deterministic-promoted-compilation.md)
and [NFR-018](../non-functional/NFR-018-non-disruptive-promotion-and-rollback.md).
