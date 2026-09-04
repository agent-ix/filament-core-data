---
id: NFR-024
title: "Portable and deterministic generated TypeScript"
type: NFR
quality_attribute: portability
relationships:
  - target: "ix://agent-ix/filament-core-data/US-012"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-064"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-065"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-066"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-067"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-071"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/NFR-009"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-010"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-019"
    type: "depends_on"
---
# [NFR-024] Portable and deterministic generated TypeScript

## Statement

The generated TypeScript package SHALL be reproducible byte-for-byte from the
same IR document and profile on any host, working directory, and locale, while
depending on no framework, application, or third-party runtime package.

## Scope

- Applies to: every file the TypeScript backend emits, the backend modules that
  emit them, and the packed artifact produced from the emitted package.
- Does not apply to: the repository's own `dist/generated.ts` Avro surface, the
  frozen issue #4 goldens, or the devDependencies the repository uses to run
  the generator and typecheck its output.
- Operational context: generation is an offline, single-process, filesystem-free
  computation; the caller writes the files.

## Rationale

`docs/semantic-data-system/generated-packages.md` (ARCH-006) states both halves
of this requirement as accepted architecture: generated semantic packages
exclude UI, React, ORM, SQLAlchemy, Tauri, application persistence, database
migrations, web frameworks, network clients, and deployment policy; and, given
the same accepted source, package metadata, profile, and compiler version,
generation must be byte-reproducible after normalized tool metadata. The
committed `typescript` row of `fixtures/semantic/v1/positive/target-contracts.json`
repeats the prohibition as a `prohibitedDependencies` list of seven categories.

Both halves have been broken before in this repository by accident rather than
by decision. `localeCompare` with no locale made the prototype emitter's type
order depend on the host's ICU data (`conformance/defects.json` DEF-PROTO-014),
and `process.cwd()` made its source loci depend on where it was invoked
(DEF-PROTO-009); issue #27 had to make both ambient inputs explicit before the
prototype could be promoted at all. A generated package is the worst place to
discover a third instance, because the drift shows up in a consumer's diff
rather than in this repository's tests.

The dependency half matters for a second reason. A generated package that
acquires a runtime validator dependency stops being installable in the
environments this contract exists to serve — a Tauri sidecar, a browser bundle,
a CLI — and makes the semantic contract's availability a function of another
project's release cadence. Generating the validator is more code and less risk.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| Byte differences between two generation runs of one IR document | 0 | 0 | Snapshot comparison |
| Byte differences between runs from two working directories | 0 | 0 | Snapshot comparison |
| Byte differences between runs under `C` and `tr_TR.UTF-8` | 0 | 0 | Snapshot comparison |
| Byte differences between two packed artifacts after normalizing mtime, uid, gid, uname, and gname | 0 | 0 | Archive comparison |
| Prohibited dependency categories named by the generated package | 0 | 0 | Static import-graph analysis |
| Third-party runtime dependencies declared by the generated `package.json` | 0 | 0 | Manifest inspection |
| Import specifiers in generated source that are not relative | 0 | 0 | Static analysis |
| Type assertions (`as <Type>`, `<Type>value`, non-null `!`) and `@ts-expect-error` directives in generated source | 0 | 0 | Static analysis |
| Uses of `any` in a type position in generated source | 0 | 0 | Static analysis |
| Byte differences between the emitted package and the same package after `biome format` | 0 | 0 | Formatter comparison |
| Clock, environment-variable, network, and `process.cwd()` reads by a backend module | 0 | 0 | Purity test |
| `localeCompare` calls in a backend module | 0 | 0 | Static analysis |
| Generated files that omit the AGPL-3.0-only SPDX header | 0 | 0 | Static analysis |
| Symbols reachable from a single-type entry export beyond that type's own surface | 0 | 0 | Reachable-symbol walk |

## Verification

Generate the same IR document twice into two directories, once from the
repository root and once from a scratch directory, and once under
`LC_ALL=tr_TR.UTF-8`, and compare every emitted byte and the output manifest.
Pack the generated package twice and compare the archives after normalizing the
five named metadata members and nothing else. Parse every generated module and
assert that each import specifier is relative and that no identifier from the
seven prohibited categories appears. Run the backend modules under a host that
throws on filesystem, clock, environment, and network access. Typecheck the
generated package under `strict` with `exactOptionalPropertyTypes`. Bundle a
single-type entry point and compare the reachable symbol set with the committed
surface fixture.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| NFR-024-AC-1 | Two generation runs over one IR document produce byte-identical files and a byte-identical output manifest. | Snapshot |
| NFR-024-AC-2 | A run from a scratch working directory produces the same bytes as a run from the repository root. | Snapshot |
| NFR-024-AC-3 | A run under `LC_ALL=tr_TR.UTF-8` produces the same bytes as a run under `LC_ALL=C`. | Snapshot |
| NFR-024-AC-4 | Two packed artifacts over the generated package are identical after normalizing exactly `mtime`, `uid`, `gid`, `uname`, and `gname`, and no other member. | Integration |
| NFR-024-AC-5 | The generated package's import graph names no identifier from the seven prohibited dependency categories, and every import specifier in generated source is relative. | Static |
| NFR-024-AC-6 | The generated `package.json` declares no `dependencies`, `peerDependencies`, or `optionalDependencies`. | Static |
| NFR-024-AC-7 | Generated source contains no `any` in a type position, no type assertion (`as <Type>`, `<Type>value`, or a non-null `!`), and no `@ts-expect-error`, measured syntactically rather than by a lexical scan so that the `as const` assertions FR-067 mandates are not counted. | Static |
| NFR-024-AC-8 | No module under `src/compiler/backends/typescript-v1/` reads a clock, an environment variable, `process.cwd()`, the filesystem, or a socket during a fixture generation. | Test |
| NFR-024-AC-9 | No module under `src/compiler/backends/typescript-v1/` calls `localeCompare`, measured syntactically over code rather than by a lexical scan, because the module that documents the prohibition names it in a comment and a lexical scan would fail on the comment that states the rule. | Static |
| NFR-024-AC-10 | Every generated file carries the AGPL-3.0-only SPDX header, and a file missing it fails the licence gate. | Static |
| NFR-024-AC-11 | The generated package typechecks under `strict` with `exactOptionalPropertyTypes`, `noUnusedLocals`, and `noUnusedParameters`, in the one program described by `test/fixtures/backends/typescript/tsconfig.json`, and not in the repository's own root program, which excludes that directory. | Compile |
| NFR-024-AC-12 | A static reachable-symbol walk from a single-type entry export yields exactly the set the committed surface fixture records, and adding a symbol to that set fails the fixture. The walk first asserts its four enabling conditions — `sideEffects: false`, an empty external import closure, named-only re-exports, and every export a top-level binding with a side-effect-free initializer — so it cannot pass over a package for which the conclusion would not hold. | Integration |
| NFR-024-AC-13 | The emitted text is rendered through the injected formatter that FR-071 backs with this repository's exactly-pinned `@biomejs/biome` binary, so `biome format` over the committed generated fixture reports no change and the declared code style — tab indentation, double quotes, terminating semicolons — is the same style the repository applies to its own source. | Snapshot |

## Dependencies

- **Upstream**: [NFR-009](./NFR-009-cross-language-semantic-parity.md),
  [NFR-010](./NFR-010-safe-schema-and-code-generation.md),
  [NFR-019](./NFR-019-deterministic-contract-compilation.md), ARCH-006
- **Downstream**: issue #11 (publication), issue #21, issue #23
- **Constrains**: [FR-064](../functional/FR-064-lower-ir-type-definitions-to-typescript.md),
  [FR-065](../functional/FR-065-generate-the-esm-package-and-export-surface.md),
  [FR-066](../functional/FR-066-generate-runtime-validators.md),
  [FR-067](../functional/FR-067-generate-identity-and-fingerprint-metadata.md),
  [FR-071](../functional/FR-071-provide-the-generate-command-and-surface-fixtures.md)
