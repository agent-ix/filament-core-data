---
id: Task-110
title: "The ESM package layout, the closed export surface, and the reachable-symbol walk"
type: Task
status: done
track: B
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-106"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/Task-107"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/Task-109"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-065"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-766"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-767"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-768"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-769"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-770"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-771"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-772"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-773"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-774"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-775"
    type: verifies
---
# Task-110: The ESM package layout, the closed export surface, and the reachable-symbol walk

## Scope

Land `package-layout.mjs`: the complete side-effect-free ESM package, its closed eight-file set, its named export surface, and the walk that proves a single-type import reaches only that type.

## Subtasks

- [x] Emit exactly eight files and no others: `package.json`, `index.ts`, `types.ts`, `validators.ts`, `errors.ts`, `identity.ts`, `metadata.ts`, `LICENSE`. The set is closed, so an added file is a visible change.
- [x] Emit a `package.json` declaring `"type": "module"`, `"sideEffects": false`, `"license": "AGPL-3.0-or-later"`, a `version` equal to the IR's `package.version`, an `exports` map with a `"."` entry and one subpath per generated module including `errors`, `types` conditions before `default` in every entry, and no `dependencies`, `peerDependencies` or `optionalDependencies`.
- [x] Derive the package name from the IR's `package.identity` by a stated, reversible rule.
- [x] Re-export every public symbol by name in `index.ts`; emit no wildcard re-export, because a named surface is what makes the export set assertable.
- [x] Enforce the closed API surface: every type-derived export traces to a semantic identity, and the fixed API — the discriminant constant, the branded-reference constructor, one `validate<Type>` per exported type, `ValidationError`, `ValidationResult`, the structural-code register, and the identity, metadata, roles, extension, occurrence and relationship maps — is a declared closed list. An export outside both sets fails the export-set test.
- [x] Assert statically that every import specifier in generated source is relative, so the external dependency closure is empty and none of the seven prohibited categories can appear.
- [x] Emit the AGPL-3.0-or-later SPDX header and the generated-file banner on every file, and reconcile `package.json` and `LICENSE` in the output manifest under the package's own identity.
- [x] Implement the reachable-symbol walk: from a single named entry export, follow relative import specifiers and named re-exports and collect the top-level bindings reached. Assert its four enabling conditions first — `sideEffects: false`, an empty external import closure, named-only re-exports, and every export a top-level binding with a side-effect-free initializer — so it cannot pass over a package for which the conclusion would not hold.
- [x] Emit no file when the model carries a representability loss, and emit files when the admissibility answer was `lossy`.
- [x] Measure G3: generate every one of the 70 corpus cases the backend admits and typecheck the generated packages as one program.

## Deliverables

- `src/compiler/backends/typescript-v1/package-layout.mjs`, `package-layout.d.mts`
- The emitted file map

## Notes

- No bundler is used and none may be added. `esbuild`, `rollup` and `vite` are transitive dependencies of vitest under `node_modules/.pnpm` and none resolves from the repository root, while NFR-025 freezes both lockfiles. For a side-effect-free package of named exports the reachability walk is what tree-shaking reduces to, and it cannot be defeated by minification.
- Typecheck as one program through the TypeScript compiler API, not one process per case. One `tsc --noEmit` over this repository takes about 2.3s; 70 of them would add roughly 160s to a suite that currently finishes in about 30s.
