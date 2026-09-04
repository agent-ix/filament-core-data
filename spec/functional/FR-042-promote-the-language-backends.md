---
id: FR-042
title: "Promote the TypeScript and Rust generation backends"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-009"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-041"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-024"
    type: "depends_on"
---
# [FR-042] Promote the TypeScript and Rust generation backends

## Description

The repository SHALL own the TypeScript and Rust/Serde generation backends under
`src/compiler/backends/`, each a pure function from a semantic-IR document to
generated source text, carrying the record that each is qualified against the
issue #4 representative slice only.

## Inputs

- A semantic-IR document produced by [FR-041](./FR-041-promote-the-semantic-ir-emitter.md)
- The committed issue #4 goldens `spikes/typespec-feasibility/generated/custom/typescript/index.ts` and `spikes/typespec-feasibility/generated/custom/rust/src/lib.rs`

## Outputs

- `src/compiler/backends/typescript.mjs` exporting `emitTypeScript(ir)`
- `src/compiler/backends/rust.mjs` exporting `emitRust(ir)`
- The qualification limitation recorded against both backends in `src/compiler/inventory.json`

## Behavior

- `emitTypeScript` SHALL return the same string for the same IR document on every call.
- `emitTypeScript` SHALL read no file, no environment variable, no clock, and no network.
- `emitRust` SHALL satisfy the same three purity obligations.
- Both backends SHALL render types by rewriting the type-name strings the IR carries, using an ordered substitution table over enum member names, namespace prefixes, and scalar names; this textual mechanism is what the issue #4 prototype does and what the goldens encode.
- `emitTypeScript` SHALL render scalars as string aliases, enums as unions of their member values as string literals, and models as interfaces that `extend` their declared base.
- `emitTypeScript` SHALL render an optional field with a `?` marker on its property name.
- `emitRust` SHALL flatten inherited fields into each generated struct, nearest declaration winning on name collision.
- `emitRust` SHALL emit `#[serde(rename = "…")]` for every field whose snake_case Rust name differs from its IR name.
- `emitRust` SHALL wrap every optional or nullable field in `Option<…>`.
- If the IR names a base that is absent from the same document, then the backend SHALL throw an error naming the missing base rather than silently drop the inherited fields.
- If the IR's base chain revisits a model already on the chain, then `emitRust` SHALL throw an error naming that cycle rather than recurse without bound.
- Both backends SHALL reproduce the committed issue #4 goldens byte-for-byte from the committed issue #4 IR.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-042-CON-1 | The inventory SHALL NOT describe either backend as production-qualified. | Integrity | Inventory test |
| FR-042-CON-2 | The backends SHALL NOT write files; file placement belongs to the caller, so a package ticket controls layout without editing a backend. | Maintainability | Purity test |
| FR-042-CON-3 | The inventory limitation naming the absent conformance corpus, property/fuzz suite, compatibility matrix, and downstream adoption SHALL remain until issues #21 and #22 discharge it against the issue #20 corpus. | Integrity | Inventory test |
| FR-042-CON-4 | The maintainer SHALL NOT regenerate the issue #4 goldens to make a backend pass; the goldens are the committed spike output and are the differential oracle precisely because the promoted code did not produce them. | Integrity | Branch diff against `origin/main` |
| FR-042-CON-5 | Because both backends rewrite the strings `getTypeName` renders, a `@typespec/compiler` upgrade can change generated output while the IR test still passes; the maintainer SHALL re-run both golden comparisons as part of any compiler-version bump. | Maintainability | Upgrade procedure inspection |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-042-AC-1 | `emitTypeScript` over the committed `generated/custom/semantic-ir.json` equals the committed `generated/custom/typescript/index.ts` byte-for-byte. | Test |
| FR-042-AC-2 | `emitRust` over the committed `generated/custom/semantic-ir.json` equals the committed `generated/custom/rust/src/lib.rs` byte-for-byte. | Test |
| FR-042-AC-3 | Calling each backend twice on the same IR returns identical strings. | Test |
| FR-042-AC-4 | Neither backend writes to the filesystem, reads an environment variable, reads the clock, or opens a socket during a call. | Test |
| FR-042-AC-5 | Each backend over an IR whose model names an absent base throws an error naming that base. | Test |
| FR-042-AC-6 | `emitRust` over an IR whose base chain forms a cycle throws an error naming the cycle instead of exhausting the stack. | Test |
| FR-042-AC-7 | A model field whose IR name is not snake_case receives a `#[serde(rename)]` attribute in the Rust output. | Test |
| FR-042-AC-8 | An enum renders in TypeScript as a union of its member values as string literals. | Test |
| FR-042-AC-9 | An optional field renders as `Option<…>` in Rust and with a `?` marker in TypeScript. | Test |
| FR-042-AC-10 | `src/compiler/inventory.json` records both backends as representative-slice-only, naming the four absent gates. | Test |
| FR-042-AC-11 | The branch changes no byte of `spikes/typespec-feasibility/generated/custom/typescript/index.ts`, `.../rust/src/lib.rs`, or `.../semantic-ir.json`. | Analysis |

## Dependencies

- **Upstream**: [FR-041](./FR-041-promote-the-semantic-ir-emitter.md), [FR-024](./FR-024-define-compilation-and-generated-target-contracts.md), ADR-0002
- **Downstream**: issue #21 (Rust package), issue #22 (TypeScript package)
