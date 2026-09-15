---
id: US-014
title: "Consume the semantic kernel as a native package in every implementation language"
type: US
relationships:
  - target: "ix://agent-ix/filament-core-data/spec/stakeholder/StR-001"
    type: "traces_to"
  - target: "ix://agent-ix/filament-core-data/US-007"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/US-011"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/US-012"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/US-013"
    type: "depends_on"
---
# [US-014] Consume the semantic kernel as a native package in every implementation language

## Story

**As a** consumer of the Filament semantic kernel — a Rust service, a TypeScript
editor, a Python tool, or a program in a fourth language reading the schemas
directly
**I want** the kernel's declaration grammar and scalar library delivered as an
ordinary package in my own language, with the same member names, the same
required-versus-optional answers, and the same acceptance decision as every other
language gets
**So that** I can hold a `FieldDecl` or a `ConstraintDecl` as a native value that
my compiler and my reviewer both understand, instead of hand-transcribing a
grammar that four codebases would each transcribe differently.

## Context

Issue [#35](https://github.com/agent-ix/filament-core-data/issues/35) authored
the kernel: `packages/semantic-core/main.tsp` declares twenty-one models, one
union, four enums, and four scalars — the exact set
`packages/semantic-core/inventory.json` enumerates — and nothing else, because
[NFR-014](../non-functional/NFR-014-small-kernel-discipline.md) holds it to a
small kernel with no domain vocabulary. `make semantic-core-check` regenerates
its thirty JSON Schema documents through the pinned official
`@typespec/json-schema` emitter and fails on a single changed byte, so the
projection is already a governed artifact rather than a convenience.

What does not exist is a package. A Rust service that wants a `TypeRef` today
writes one. A TypeScript editor writes a second. A Python tool writes a third.
The failure that follows is not that any one of them is wrong; it is that
nothing tells anybody when two of them stop agreeing, and the disagreement
surfaces as a wire defect in whichever pair of services meets first.

Three generation backends landed in the days before this story and each one
already produces a real package from a semantic IR document:
`src/compiler/backends/typescript-v1/` (issue #22), `src/compiler/backends/rust-serde/`
(issue #21), and the pinned `datamodel-code-generator` route under
`python_backend/` (issue #23). None of them has been pointed at the kernel. The
gap between them and the kernel is one artifact: a semantic IR document for the
kernel itself. The kernel's TypeSpec source cannot supply it through the issue
#19 frontend — that frontend rejects a union-typed property, an enum-member type,
and an unconstrained value, all of which the grammar uses — so the route runs
through the JSON Schema projection the official emitter already produces and
`make semantic-core-check` already freezes.

`conformance/README.md` names the consequence in its own words: cross-language
generated-package serialization parity "has no package to serialize until issues
#21, #22, and #23 ship, and is recorded as an unmet area, not claimed." Those
three have shipped. The unmet area is now answerable.

Publication is a separate act and is not part of this story. It passes the
`agent-ix/quoin#290` human sign-off, which has not moved.

## Acceptance Examples (Illustrative)

### [US-014-EX-1] A `ConstraintDecl` narrows in each language

- **Given** the generated kernel package in Rust, in TypeScript, and in Python
- **When** the consumer matches on a `ConstraintDecl`
- **Then** each language narrows to the eleven constraint records the grammar
  declares, and a twelfth keyword is rejected rather than falling through to a
  permissive default

### [US-014-EX-2] Absent and empty are the same answer everywhere, or neither is

- **Given** a kernel document that omits an optional member, and a second that
  passes it as an empty collection
- **When** each language package decides both documents
- **Then** the three packages return the same verdict as each other, and where
  the underlying contract cannot express the distinction the consumer is told
  so, rather than being handed three languages that quietly disagree

### [US-014-EX-3] A construct the packages cannot carry is named, not approximated

- **Given** a kernel declaration the intermediate representation has no shape for
- **When** the consumer generates
- **Then** the loss is a registered entry with a diagnostic code and a named
  owner, and the consumer can read what was narrowed and to what — instead of
  finding a silently widened type months later

### [US-014-EX-4] The kernel package brings nothing with it

- **Given** any of the generated kernel packages
- **When** the consumer inspects its dependency closure
- **Then** it names no persistence layer, no ORM, no Tauri, no UI framework, and
  no application package, because the kernel is a grammar and a scalar library
  and nothing else

### [US-014-EX-5] The consumer can tell which source the package came from

- **Given** a generated kernel package
- **When** the consumer reads its provenance metadata
- **Then** it carries the source identity, the source version, the digest of the
  bytes it was generated from, and a fingerprint of the normalized contract —
  enough to answer "is this package the one that matches that contract" without
  asking the generator

### [US-014-EX-6] Two generations are the same bytes

- **Given** one kernel bundle
- **When** the consumer generates twice, from different working directories, at
  different times, under a different locale
- **Then** every generated file is byte-identical, because nothing read a clock,
  an environment variable, a working directory, or a socket

### [US-014-EX-7] Nothing was published

- **Given** the completed work
- **When** the consumer inspects npm, crates.io, and the Python index
- **Then** no kernel package is there, the generated manifests say so in their
  own text, and the reason names the sign-off that has not happened

## Options (Exploratory)

The kernel IR could have come from extending the issue #19 TypeSpec frontend to
carry union-typed properties, enum-member types, and unconstrained values; from
hand-authoring an IR document beside the grammar; or from lowering the JSON
Schema projection the official emitter already produces. The Rust and TypeScript
packages could have been written by a fourth emitter, by rewriting the frozen
prototype emitters, or by running the two backends that already exist. The
Python package could have been generated from the same IR by a new emitter or
from the JSON Schema by the already-qualified generator. Cross-language
agreement could have been shown by a new bespoke comparison, by pairwise
round-trips, or through the conformance corpus that exists to judge exactly this.
The functional requirements settle each.

## Constraints (Contextual)

Nothing here publishes to any registry, tags any release, or moves any
downstream consumer: publication is gated on `agent-ix/quoin#290`. The kernel's
authored source, `packages/semantic-core/main.tsp`, and its thirty projected
schema documents are read and not edited — a grammar changed to make a generator
comfortable is no longer the grammar. The published contract schemas under
`schema/**` are likewise read-only here; where the intermediate representation
cannot carry a construct, that is recorded as a loss with an owner rather than
repaired by widening a closed vocabulary. The conformance corpus, its bases, its
oracle, its harness, and its divergence register are read and never edited, for
the reason `conformance/README.md` gives. Everything original is AGPL-3.0-or-later;
every third-party dependency is pinned, license-compatible, and attributed.

## Dependencies (Contextual)

Depends on the kernel grammar itself ([US-007](./US-007-declare-archetypes-against-a-shared-grammar.md)),
and on the three generation routes
([US-011](./US-011-consume-semantic-contracts-in-rust.md),
[US-012](./US-012-generate-a-typescript-package.md),
[US-013](./US-013-generate-governed-python-types.md)). Two of those routes carry
defects reopened while this story was being grounded: `#21`'s golden and digest
baselines are stale against its own emitter, so `make rust-check` is red on
`main`; and `#22` emits a generated package that fails `tsc --strict` when the
contract declares a record with no fields, which is exactly the shape
`packages/semantic-core/kernel-scalars.json` prescribes for `JsonObject`. Neither
is repaired here.

## Priority and Risk (Informative)

Priority is P1. The principal risk is that "agrees across languages" becomes a
claim rather than a measurement — that three packages are generated, each is
tested against its own expectations, and nothing ever compares them. The second
is that a construct the intermediate representation cannot carry is quietly
widened in one language and narrowed in another, which is the wire defect this
story exists to prevent, arriving through the fix rather than the problem. The
third is scope drift into publication, which is a different act behind a
sign-off that has not been given.

## Traceability (Informative)

This story drives [FR-081](../functional/FR-081-declare-the-semantic-kernel-bundle.md)
through [FR-090](../functional/FR-090-prove-cross-language-agreement.md) and is
constrained by
[NFR-028](../non-functional/NFR-028-deterministic-kernel-generation.md),
[NFR-029](../non-functional/NFR-029-portable-semantic-kernel-packages.md), and
[NFR-030](../non-functional/NFR-030-non-disruptive-kernel-packaging.md).
