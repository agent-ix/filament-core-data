---
id: Task-080
title: "Rust workspace, toolchain pin, offline supply, and the red suites"
type: Task
status: todo
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/FR-059"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-061"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-022"
    type: references
  - target: "ix://agent-ix/filament-core-data/NFR-023"
    type: references
---
# Task-080: Rust workspace, toolchain pin, offline supply, and the red suites

## Scope

Stand up the Rust side of the repository, which today contains no line of Rust, and open every suite red so the later tasks close a gate rather than write one. SR-080 FND-925 names this as the slice's unowned prerequisite; nothing in FR-054..062 can be measured until a `cargo` invocation works offline.

## Subtasks

- [ ] Add the root workspace `Cargo.toml` with `publish = false`, the five member crates declared, and `resolver = "2"`.
- [ ] Add `rust-toolchain.toml` pinning the toolchain channel and the `rustfmt` component, and `rustfmt.toml` pinning the formatting configuration.
- [ ] Add `.cargo/config.toml` fixing the target directory inside the repository, so the ambient `CARGO_TARGET_DIR` cannot serve a stale artifact from another checkout.
- [ ] Confirm the offline supply: `serde` and `serde_json` at the pinned exact versions plus serde's transitive crates resolve with `--offline`, and commit `Cargo.lock`.
- [ ] Add `THIRD-PARTY-NOTICES.md` with one entry per third-party crate: exact version, SPDX identifier, and the location of the preserved upstream licence text.
- [ ] Add `.gitignore` entries for the build directory so `git status --porcelain` stays empty after a build.
- [ ] Add the Makefile targets `rust-generate`, `rust-check`, `rust-test`, `rust-conformance`, `rust-install-from-artifact`, `rust-mutate`, `rust-fuzz` and `rust-deep`, each calling `node` or `cargo` directly because `package.json` is a prohibited path.
- [ ] Open `test/rust-backend.test.ts` with the failing assertions for TC-645..744, so every later task turns a red row green.

## Deliverables

- `Cargo.toml`, `Cargo.lock`, `rust-toolchain.toml`, `rustfmt.toml`, `.cargo/config.toml`
- `THIRD-PARTY-NOTICES.md`
- `Makefile` targets
- `test/rust-backend.test.ts` (red)

## Notes

The workspace files are FR-059's Outputs and the attribution register is FR-056's; this task lands them because every other task needs them. `CARGO_TARGET_DIR` is ambient on the authoring host and is overridden rather than inherited, which is the trap a shared target directory sets for a determinism gate.
