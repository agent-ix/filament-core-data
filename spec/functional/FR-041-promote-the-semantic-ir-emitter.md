---
id: FR-041
title: "Promote the semantic-IR emitter into the repository compiler"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-009"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-040"
    type: "depends_on"
---
# [FR-041] Promote the semantic-IR emitter into the repository compiler

## Description

The repository SHALL own the TypeSpec semantic-IR emitter under `src/compiler/`
and SHALL expose it through one narrow build interface, so that every caller
reaches the emitter through a named export or the compiler CLI rather than
through a path under `spikes/`.

## Inputs

- A TypeSpec entrypoint path, or a compiled TypeSpec `Program`
- A generator identity string that is stamped into the emitted IR
- The pinned `@typespec/compiler` 1.15.0 and `@typespec/versioning` 0.85.0 toolchain

## Outputs

- `src/compiler/ir.mjs`: `buildSemanticIr(program, { generator })` returning the semantic-IR object
- `src/compiler/emitters/semantic-ir/index.mjs`: the `$onEmit` entry point for `tsp --emit`, delegating to `buildSemanticIr`
- `src/compiler/index.mjs`: the narrow build interface re-exporting exactly `buildSemanticIr`, `compileSemanticIr`, `emitTypeScript`, `emitRust`, `normalizeJsonSchemaForPython`, and `SEMANTIC_IR_SCHEMA_VERSION`
- `src/compiler/index.d.mts`: the TypeScript declarations for that interface
- `src/compiler/cli.mjs`: `node src/compiler/cli.mjs emit-ir --entrypoint <path> --generator <id> --out <path>`

## Behavior

- The compiler SHALL walk the compiled program with the official `navigateProgram` API.
- The compiler SHALL record every model, enum, and scalar whose namespace is `AgentIx.Semantic` or a descendant of it, and no type outside that namespace.
- The compiler SHALL emit types sorted by `id` under a stable `localeCompare` ordering, so two runs over the same program produce the same byte sequence.
- The compiler SHALL stamp the caller-supplied `generator` identity into the emitted IR.
- Where the caller supplies no `generator` identity, the compiler SHALL stamp the promoted emitter's own `name@version`.
- While a type's source locus lies beneath the process working directory, the compiler SHALL record that locus as a working-directory-relative path.
- If a type has no source location, then the compiler SHALL record its locus as `synthetic`.
- If the caller supplies an entrypoint that fails to compile, then `compileSemanticIr` SHALL reject with the TypeSpec diagnostics rather than emit a partial IR.
- The narrow interface SHALL export no symbol beyond the six named in Outputs, so a consumer cannot reach into the compiler's internals.
- No caller outside `src/compiler/` SHALL import a module under `spikes/`.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-041-CON-1 | The promoted emitter SHALL keep the issue #4 IR `schemaVersion` value `1.0.0` unchanged; revising the emitted IR shape belongs to the compiler ticket (#19), not to the promotion. | Compatibility | Emitted-IR test |
| FR-041-CON-2 | The compiler SHALL depend only on exactly pinned `@typespec/*` packages already present in `package.json`. | Maintainability | Dependency inspection |
| FR-041-CON-4 | The promotion SHALL add no new runtime dependency to `package.json`. | Maintainability | Dependency inspection |
| FR-041-CON-3 | Every promoted source file SHALL carry the AGPL-3.0-only licence posture the repository already uses (`"license": "AGPL-3.0-only"` in its package metadata, no per-file header where the repository uses none). | Legal | Licence inspection |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-041-AC-1 | `src/compiler/index.mjs` exports exactly the six named symbols; a test asserting the export set fails when a seventh is added. | Test |
| FR-041-AC-2 | `buildSemanticIr` over the spike's `main.tsp` program produces an IR byte-identical to the retained `spikes/typespec-feasibility/generated/custom/semantic-ir.json` when given the spike generator identity. | Test |
| FR-041-AC-3 | `compileSemanticIr` over a TypeSpec source with an unresolved reference rejects with a diagnostic naming the source locus and writes no output file. | Test |
| FR-041-AC-4 | Running the CLI twice over the same entrypoint yields byte-identical output. | Test |
| FR-041-AC-5 | `tsp compile <entrypoint> --emit ./src/compiler/emitters/semantic-ir` produces the same IR document as `buildSemanticIr` over the same entrypoint. | Test |
| FR-041-AC-6 | No file outside `src/compiler/` imports a module under `spikes/`, and `src/compiler/` imports nothing from `spikes/`. | Analysis |
| FR-041-AC-7 | The emitted IR carries `schemaVersion` `1.0.0` and the caller's generator identity. | Test |

## Dependencies

- **Upstream**: [FR-040](./FR-040-disposition-the-prototype-inventory.md), [FR-016](./FR-016-emit-semantic-ir-and-native-types.md), ADR-0002, ADR-0005
- **Downstream**: [FR-042](./FR-042-promote-the-language-backends.md), [FR-044](./FR-044-replay-the-frozen-spike-through-the-promoted-compiler.md), issue #19 semantic compiler
