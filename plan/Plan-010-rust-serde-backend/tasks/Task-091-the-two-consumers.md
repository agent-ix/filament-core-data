---
id: Task-091
title: "The compile-time and runtime consumers, built from the packaged artifact"
type: Task
status: done
track: D
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-090"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-061"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-719"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-720"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-721"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-722"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-723"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-724"
    type: verifies
---
# Task-091: The compile-time and runtime consumers, built from the packaged artifact

## Scope

Prove the generated crate is usable, from the package rather than from the generator's tree.

## Subtasks

- [x] Write `crates/consumer-compile-time`: the exhaustive `match` with no wildcard, the `const` assertion over `TYPES.len()`, and reads of an identity, a role, a relationship, an operation and a clause.
- [x] Write `crates/consumer-runtime`: the positive-fixture round trips under canonical equality, the retained-bytes assertions, and the eight invalid classes.
- [x] Wire `make rust-install-from-artifact`: `cargo package --offline --no-verify`, unpack to a scratch directory, build both consumers with `-D warnings`, leave the tree clean.
- [x] Assert the command list contains no `cargo publish`, no `--registry`, no `--index`, no publish `--dry-run`.
- [x] Rehearse the compile failures: an added type breaks the match, a changed count breaks the const assertion.

## Deliverables

- `crates/consumer-compile-time/`
- `crates/consumer-runtime/`

## Notes

The consumers carry `serde_json` as a dev-dependency and nothing else; `publish = false` on both.
