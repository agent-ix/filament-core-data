---
id: Task-086
title: "Crate emission, the static export surface, and the output manifest"
type: Task
status: todo
track: B
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-085"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-056"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-666"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-667"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-668"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-669"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-670"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-671"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-672"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-673"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-674"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-675"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-676"
    type: verifies
---
# Task-086: Crate emission, the static export surface, and the output manifest

## Scope

Land `crate.mjs` and `index.mjs`: the pure emitter and the one module that writes.

## Subtasks

- [ ] Emit `Cargo.toml` with the licence, `publish = false`, the `crateName`, the MSRV and the single pinned `serde` dependency.
- [ ] Emit `lib.rs` with `forbid(unsafe_code)`, `deny(missing_docs)`, the module tree, `TYPES`, `FIELDS` and `SemanticType`.
- [ ] Emit the derived doc comment on every public item by the stated total function, escaped and truncated.
- [ ] Emit `identity.rs` from the request-member correspondence table, and `metadata.rs`.
- [ ] Emit the output manifest with per-extension media types, the package identity fallback for a file carrying no type identity, and the code-point-sorted file list.
- [ ] Implement the write-nothing-on-blocking rule, the `outputRoot` refusal, and the four size limits.
- [ ] Add the ambient-input scan and the filesystem-stub purity test for `emitCrate`.

## Deliverables

- `src/compiler/backends/rust-serde/crate.mjs`
- `src/compiler/backends/rust-serde/index.mjs`

## Notes

`emitCrate` returns bytes; `generateRust` is the only writer.
