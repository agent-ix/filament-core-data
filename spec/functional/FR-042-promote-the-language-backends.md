---
id: FR-042
title: "Promote the TypeScript and Rust generation backends"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-009"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-041"
    type: "depends_on"
---
# [FR-042] Promote the TypeScript and Rust generation backends

## Description

The repository SHALL own the TypeScript and Rust/Serde generation backends under
`src/compiler/backends/`, each a pure function from a semantic-IR document to
generated source text, and SHALL record that each is qualified against the issue
#4 representative slice only.

## Inputs

- A semantic-IR document produced by [FR-041](./FR-041-promote-the-semantic-ir-emitter.md)
- The retained goldens `spikes/typespec-feasibility/generated/custom/typescript/index.ts` and `spikes/typespec-feasibility/generated/custom/rust/src/lib.rs`

## Outputs

- `src/compiler/backends/typescript.mjs` exporting `emitTypeScript(ir)`
- `src/compiler/backends/rust.mjs` exporting `emitRust(ir)`
- The qualification limitation recorded against both backends in `src/compiler/inventory.json`

## Behavior

- `emitTypeScript` SHALL return the same string for the same IR document on every call.
- `emitTypeScript` SHALL read no file, no environment variable, and no clock.
- `emitRust` SHALL be pure under the same definition.
- `emitTypeScript` SHALL render scalars as string aliases, enums as string-literal unions of their member values, and models as interfaces that extend their declared base.
- `emitRust` SHALL flatten inherited fields into each generated struct.
- `emitRust` SHALL emit `#[serde(rename = "…")]` for every field whose Rust name differs from its IR name.
- `emitRust` SHALL wrap every optional or nullable field in `Option<…>`.
- Both backends SHALL reproduce the retained issue #4 goldens byte-for-byte from the retained IR; this equivalence is the promotion oracle.
- If the IR contains a model whose declared base is absent from the same document, then `emitRust` SHALL throw naming the missing base rather than silently drop the inherited fields.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-042-CON-1 | The inventory SHALL NOT describe either backend as production-qualified. | Integrity | Inventory test |
| FR-042-CON-3 | The inventory limitation naming the absent conformance corpus, property/fuzz suite, compatibility matrix, and downstream adoption SHALL remain until issues #21 and #22 discharge it. | Integrity | Inventory test |
| FR-042-CON-2 | The backends SHALL NOT write files; file placement belongs to the caller, so a future package ticket controls layout without editing the backend. | Maintainability | Purity test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-042-AC-1 | `emitTypeScript` over the retained `generated/custom/semantic-ir.json` equals the retained `generated/custom/typescript/index.ts` byte-for-byte. | Test |
| FR-042-AC-2 | `emitRust` over the retained `generated/custom/semantic-ir.json` equals the retained `generated/custom/rust/src/lib.rs` byte-for-byte. | Test |
| FR-042-AC-3 | Calling each backend twice on the same IR returns identical strings, and neither writes to the filesystem during the call. | Test |
| FR-042-AC-4 | `emitRust` over an IR whose model names an absent base throws an error naming that base. | Test |
| FR-042-AC-5 | A model field whose IR name is not snake_case receives a `#[serde(rename)]` attribute in the Rust output. | Test |
| FR-042-AC-6 | `src/compiler/inventory.json` records both backends as representative-slice-only with the four named absent gates. | Test |

## Dependencies

- **Upstream**: [FR-041](./FR-041-promote-the-semantic-ir-emitter.md), [FR-024](./FR-024-define-compilation-and-generated-target-contracts.md)
- **Downstream**: issue #21 (Rust package), issue #22 (TypeScript package)
