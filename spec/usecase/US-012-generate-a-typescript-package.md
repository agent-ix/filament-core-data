---
id: US-012
title: "Generate a TypeScript package from a compiled semantic package"
type: US
relationships:
  - target: "ix://agent-ix/filament-core-data/spec/stakeholder/StR-001"
    type: "traces_to"
  - target: "ix://agent-ix/filament-core-data/US-005"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/US-008"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/US-010"
    type: "depends_on"
---
# [US-012] Generate a TypeScript package from a compiled semantic package

## Story

**As a** TypeScript consumer of a semantic package — a CLI, a backend service, or
a React application
**I want** the compiler to generate ordinary TypeScript types and a runtime
validator from the semantic IR my package compiles to, and to tell me plainly
when it cannot represent something rather than approximating it
**So that** I can typecheck against the semantic contract at build time and check
untrusted input against it at run time, without the contract living in my
decorators, my framework, or my ORM.

## Context

Issue #19 landed the contract path: a package resolver, a lock and fingerprint,
a TypeSpec frontend, and a `compile` verb that writes one versioned semantic IR
document. Issue #20 landed the conformance corpus and the independent oracle
that judges implementations against a contract-derived yardstick rather than
against their own output. `conformance/adapters/registry.json` declares four
slots and the `typescript-backend` slot names this issue as its owner. Today
that slot is `unavailable`, so the corpus records 115 unmet rows for it and no
passes.

What exists in the way of TypeScript generation is `emitTypeScript` under
`src/compiler/backends/typescript.mjs`, promoted by issue #27. It consumes the
*prototype* IR (`{schemaVersion, generator, types}` with `kind: model|enum|scalar`
and rendered TypeSpec type-name strings), not the contract IR, and
`src/compiler/inventory.json` records it as qualified against the issue #4
representative slice only — a limitation FR-042-CON-3 says stays until this
issue discharges it against the issue #20 corpus. Every scalar in that emitter
becomes `string`; a `union`, an `alias`, a `sequence`, a `map`, and a
`reference` have no rendering at all, because the prototype IR has no such
kinds.

Three published schemas already state the contract a backend must satisfy, and
no module implements any of them: `compiler-request.schema.json` (what a
generation request is), `output-manifest.schema.json` (what a backend returns),
and `target-contract.schema.json` (what a backend must declare about itself).
The committed `typescript` row of `fixtures/semantic/v1/positive/target-contracts.json`
already binds this work: native API of static type, discriminated union, and
runtime schema; runtime validation derived from the locked semantic contract;
identity metadata as an exported readonly identity map; and an
`unsupportedFeaturePolicy` of `fail` — an unrepresentable construct is a
diagnostic, never a silent approximation.

The `dist/generated.ts` surface this repository publishes today is Avro-derived
and unrelated; it is not the thing being generated here and does not move.

## Acceptance Examples (Illustrative)

### [US-012-EX-1] The corpus judges the backend rather than the backend judging itself

- **Given** the 115-case conformance corpus and its independent oracle
- **When** the consumer runs the differential harness
- **Then** the `typescript-backend` slot answers every case from its own
  computation, its answers are compared only with the oracle's verdict, and a
  disagreement is recorded as a divergence with an owner rather than absorbed by
  editing a case

### [US-012-EX-2] A construct the target cannot represent is named, not approximated

- **Given** an IR document carrying a construct the TypeScript target has no
  representation for
- **When** the consumer generates
- **Then** generation produces no file, reports a stable diagnostic code naming
  the construct and the type it belongs to, and the output manifest records a
  non-success state — rather than emitting `unknown` and moving on

### [US-012-EX-3] Absent and null are different answers

- **Given** a field that is optional and not nullable, and a sibling that is
  required and nullable
- **When** the consumer passes an object omitting the first and passing `null`
  for the second, and then an object doing the reverse
- **Then** the first is accepted and the second rejected, at run time and under
  `tsc`, because the four presence/nullability combinations are four distinct
  generated forms

### [US-012-EX-4] The generated package brings nothing with it

- **Given** the generated package
- **When** the consumer inspects its dependency closure and its import graph
- **Then** it names no React, Tauri, ORM, persistence, or application package,
  and its runtime validator needs no third-party validator at run time

### [US-012-EX-5] Two runs are the same bytes

- **Given** one IR document and one profile
- **When** the consumer generates twice, from different working directories and
  under a different locale
- **Then** every generated file is byte-identical and the output manifest
  reports the same fingerprint

### [US-012-EX-6] A consumer imports one type and ships one type

- **Given** a generated package with many types
- **When** the consumer imports a single type and bundles
- **Then** the bundle carries that type's declarations and validator and not the
  whole package, because the package is side-effect-free and its exports are
  statically analysable

## Options (Exploratory)

The generated types could have been produced by rewriting the frozen prototype
emitter, by a second backend beside it, or by projecting the JSON Schema
emitter's output back into TypeScript. Runtime validation could have been
delegated to a third-party validator at run time, generated as self-contained
code, or derived from a shipped JSON Schema document. Unsupported constructs
could have been approximated as `unknown`, dropped with a warning, or refused.
The identity metadata could have been a generated constant map, a decorator, or
a side-car JSON file. The functional requirements settle each of these.

## Constraints (Contextual)

TypeScript decorators do not become the schema source; TypeSpec is the
structural source (ADR-0005) and the IR is what a backend reads. Nothing here
publishes a package to any registry or moves a downstream consumer. The frozen
issue #4 goldens and the issue #20 corpus cases, bases, oracle, and harness are
read, never edited. Everything original is AGPL-3.0-or-later and every third-party
dependency is pinned, license-compatible, and attributed.

## Dependencies (Contextual)

Depends on the v1 contract schemas ([US-005](./US-005-author-portable-semantic-packages.md)),
the conformance corpus and oracle ([US-008](./US-008-judge-a-compiler-against-an-independent-corpus.md)),
and the compiled contract IR ([US-010](./US-010-compile-a-semantic-package.md)).
Runs alongside the Rust backend (issue #21) and the Python backend (issue #23),
which own the sibling adapter slots. Publication is issue #11 and is gated.

The unresolved-`reference` question recorded as `conformance/contract-gaps.json`
GAP-011 lands squarely on this story: its own consequence text says "a
generated-package backend must decide whether to emit a type for a reference it
cannot resolve". The decision belongs to the contract owner on issue #9, not
here.

## Priority and Risk (Informative)

Priority is P0. The principal risk is that the backend becomes its own oracle —
that the only evidence the generated types are right is the generator that wrote
them, or a golden regenerated from a run. The second risk is the opposite
failure: tuning the backend until it agrees with the corpus, case by case,
which produces agreement without producing an implementation. The third is
dependency creep, where a generated package quietly acquires a framework and
stops being portable.

## Traceability (Informative)

This story drives [FR-063](../functional/FR-063-declare-the-generation-backend-seam.md)
through [FR-071](../functional/FR-071-provide-the-generate-command-and-surface-fixtures.md)
and is constrained by
[NFR-024](../non-functional/NFR-024-portable-deterministic-generated-typescript.md)
and [NFR-025](../non-functional/NFR-025-non-disruptive-typescript-backend.md).
It discharges the TypeScript half of the FR-042-CON-3 qualification limitation.
