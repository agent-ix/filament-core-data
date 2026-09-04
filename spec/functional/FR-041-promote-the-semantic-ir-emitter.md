---
id: FR-041
title: "Promote the semantic-IR emitter into the repository compiler"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-009"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-040"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-016"
    type: "depends_on"
---
# [FR-041] Promote the semantic-IR emitter into the repository compiler

## Description

The repository SHALL own the TypeSpec semantic-IR emitter under `src/compiler/`,
reached through one narrow build interface, so that every caller uses a named
export, the compiler CLI, or `tsp --emit` against the promoted emitter rather
than a path under `spikes/`.

## Inputs

- A TypeSpec entrypoint path, or an already-compiled TypeSpec `Program`
- A `generator` identity string stamped into the emitted IR
- A `baseDir` against which source loci are made relative
- The pinned `@typespec/compiler` 1.15.0 and `@typespec/versioning` 0.85.0 toolchain

## Outputs

- `src/compiler/ir.mjs`: `buildSemanticIr(program, { generator, baseDir })` returning the IR object, and the exported constant `SEMANTIC_IR_SCHEMA_VERSION`
- `src/compiler/compile.mjs`: `compileSemanticIr({ entrypoint, generator, baseDir })`, which compiles the entrypoint with `NodeHost` and returns the IR object
- `src/compiler/emitters/semantic-ir/index.mjs` and its `package.json` (name `@agent-ix/semantic-ir-emitter`): the `$onEmit` entry point for `tsp --emit`, delegating to `buildSemanticIr`
- `src/compiler/index.mjs`: the narrow build interface re-exporting exactly `buildSemanticIr`, `compileSemanticIr`, `emitTypeScript`, `emitRust`, `normalizeJsonSchemaForPython`, and `SEMANTIC_IR_SCHEMA_VERSION`
- `src/compiler/index.d.mts`: the TypeScript declarations for that interface
- `src/compiler/cli.mjs`, invoked as `node src/compiler/cli.mjs emit-ir --entrypoint <path> --generator <id> --out <path>`
- A `make compiler-emit-ir` target wrapping that CLI

## Behavior

- The compiler SHALL walk the compiled program with the official `navigateProgram` API.
- The compiler SHALL record every model, enum, and scalar whose namespace is `AgentIx.Semantic` or a descendant of it, and no type outside that namespace.
- The compiler SHALL order emitted types by `id` under a locale-independent code-point comparison, so the order does not vary with the host's ICU data or locale.
- The compiler SHALL stamp the caller-supplied `generator` identity into the emitted IR.
- Where the caller supplies no `generator` identity, the compiler SHALL stamp the string `<name>@<version>` read from `src/compiler/emitters/semantic-ir/package.json`.
- While a type's source locus lies beneath the caller's `baseDir`, the compiler SHALL record that locus as `<baseDir-relative path>:<1-based line number>`.
- If a type has no source location, then the compiler SHALL record its locus as the string `synthetic`.
- Where the caller supplies no `baseDir`, the compiler SHALL use `process.cwd()`.
- If the caller supplies an entrypoint that fails to compile, then `compileSemanticIr` SHALL reject with the TypeSpec diagnostics.
- If the caller supplies an entrypoint that fails to compile, then the compiler CLI SHALL write no output file.
- The `$onEmit` entry point SHALL read its `generator` identity from `context.options.generator`, which `tsp` supplies as `--option "@agent-ix/semantic-ir-emitter.generator=<id>"` when the emitter is loaded by absolute path.
- The compiler CLI SHALL serialise the IR as `JSON.stringify(ir, null, 2)` followed by a single `\n`, which is the serialisation every byte-identity criterion in this bundle compares.
- The narrow interface SHALL export no symbol beyond the six named in Outputs.
- No module outside `src/compiler/` SHALL import a module under `spikes/`.
- No module under `src/compiler/` SHALL import a module under `spikes/`.
- `biome format` SHALL format every `.mjs` and `.d.mts` file under `src/compiler/`.
- A TypeScript test SHALL import `src/compiler/index.d.mts`, so `tsc --noEmit` fails when the declarations drift from the implementation.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-041-CON-1 | The promoted emitter SHALL keep the issue #4 IR `schemaVersion` value `1.0.0` and its `{schemaVersion, generator, types}` envelope; revising the emitted IR shape belongs to the compiler ticket (#19). | Compatibility | Emitted-IR test |
| FR-041-CON-2 | The promoted IR is the issue #4 prototype IR, not a `schema/semantic/v1/semantic-ir.schema.json` document; the maintainer SHALL NOT validate one against the other. Reconciling the two shapes belongs to issue #19. | Compatibility | Inspection |
| FR-041-CON-3 | The compiler SHALL import only the exactly pinned `@typespec/*` packages already present in `package.json`. | Maintainability | Dependency inspection |
| FR-041-CON-4 | The promotion SHALL add no dependency to `package.json`. Every `@typespec/*` entry stays a devDependency, and making `src/compiler/` a runtime entry point belongs to issue #11. | Maintainability | Dependency inspection |
| FR-041-CON-5 | Every package manifest the promotion adds SHALL declare `"license": "AGPL-3.0-only"`, matching the repository's existing posture. | Legal | Licence inspection |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-041-AC-1 | `src/compiler/index.mjs` exports exactly the six named symbols; a test asserting the export set fails when a seventh is added. | Test |
| FR-041-AC-2 | `buildSemanticIr` over the spike's `main.tsp` program, given the spike generator identity and the repository root as `baseDir`, serialises under the declared serialisation to bytes equal to the committed `spikes/typespec-feasibility/generated/custom/semantic-ir.json`. | Test |
| FR-041-AC-3 | `compileSemanticIr` over `spikes/typespec-feasibility/fixtures/invalid/main.tsp` rejects with a diagnostic naming that source locus, and the `--out` path named on the call does not exist afterwards. | Test |
| FR-041-AC-4 | Running the CLI twice over the same entrypoint yields byte-identical output files. | Test |
| FR-041-AC-5 | `tsp compile <entrypoint> --emit <absolute path to src/compiler/emitters/semantic-ir> --option "@agent-ix/semantic-ir-emitter.generator=<id>"` produces the same IR document as `compileSemanticIr` over the same entrypoint with the same `<id>`. | Test |
| FR-041-AC-6 | No file outside `src/compiler/` imports a module under `spikes/`, and no file under `src/compiler/` imports one either. | Analysis |
| FR-041-AC-7 | The emitted IR carries `schemaVersion` `1.0.0`, the `{schemaVersion, generator, types}` envelope, and the caller's generator identity. | Test |
| FR-041-AC-8 | Omitting `generator` stamps `<name>@<version>` from the emitter's own `package.json`. | Test |
| FR-041-AC-9 | A type declared outside `AgentIx.Semantic` is absent from the IR, and a type with no source location records the locus `synthetic`. | Test |
| FR-041-AC-10 | Two `baseDir` values over the same entrypoint produce different, correctly relativised `source` loci of the form `<path>:<line>`, proving the working directory is a declared input and not an ambient one. | Test |
| FR-041-AC-11 | Sorting the same type ids under `Intl.Collator` for two different locales and under the implemented code-point comparison yields the implemented order in every case. | Test |
| FR-041-AC-12 | `make lint` formats and typechecks `src/compiler/`; a deliberate mismatch between `index.d.mts` and `index.mjs` fails `tsc --noEmit`. | Test |
| FR-041-AC-13 | Every package manifest under `src/compiler/**` in the working tree — including `src/compiler/emitters/semantic-ir/package.json` — and every package manifest the branch adds declares `"license": "AGPL-3.0-only"`, and `package.json` gains no dependency entry. | Analysis |

## Dependencies

- **Upstream**: [FR-040](./FR-040-disposition-the-prototype-inventory.md), [FR-016](./FR-016-emit-semantic-ir-and-native-types.md), ADR-0002, ADR-0005
- **Downstream**: [FR-042](./FR-042-promote-the-language-backends.md), [FR-044](./FR-044-replay-the-frozen-spike-through-the-promoted-compiler.md), issue #19 semantic compiler
