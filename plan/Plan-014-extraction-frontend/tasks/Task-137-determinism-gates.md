---
id: Task-137
title: "NFR-031 determinism, hermeticity, limits and fuzz gates"
type: Task
status: todo
track: G
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-136"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/NFR-031"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-1300"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1301"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1302"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1303"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1304"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1306"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1307"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1308"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1309"
    type: verifies
---
# Task-137: NFR-031 determinism, hermeticity, limits and fuzz gates

## Scope

The NFR-031 evidence over the finished crate: repeat-run and varied-environment
golden comparisons, the two-root table/fence identity, the enumeration-order
analysis, the ambient-input and `HashMap` static audits with planted-token
controls, the offline run, the `forbid(unsafe_code)` doctest and the
`proptest` bundle-tree fuzz. `limits.json` and TC-1305 landed in Task-132;
this task does not re-verify them.

## Subtasks

- [ ] **Red.** `tests/determinism.rs`: `tc_1300_` (two lifts in-process and across two processes == each other == goldens == `decide(...).normalized`), `tc_1301_` (cwd, empty `HOME`, `TZ`, `LANG`, `LC_ALL`, `CARGO_TARGET_DIR` varied → golden bytes), `tc_1302_` (two roots, same relative path, identical bytes). `tests/audits.rs`: `tc_1303_` (`Analysis`: no directory enumeration under `src/`; cites quire-rs `walk.rs` TC-473 and the FR-091-CON-2 gate), `tc_1304_` (grep for `SystemTime`, `Instant`, `std::env`, `env!`, `option_env!`, hostname, RNG, `std::net`, `Command`; exemptions exactly `write.rs` for `std::fs` and `main.rs` argument parsing for `std::env`; planted `std::env::var` in `lower.rs` fails), `tc_1307_` (`HashMap`/`HashSet` audit, empty exemption list, planted token fails), `tc_1306_` (suite under `unshare -n` with `--offline` passes; no socket-opening dependency in the tree), `tc_1308_` (`compile_fail` doctest on an injected `unsafe` block under `cargo +1.98.1`), `tc_1309_` (256 proptest bundle trees under a failing panic hook: result or diagnostic, never a panic).
- [ ] **Green.** Fix whatever the audits surface (a stray `HashMap`, an ordering that reaches the output) in the owning module; add the `proptest` bundle-tree strategy under `tests/strategies/`.
- [ ] **Falsify.** Every grep gate is run once against its planted-token scratch copy and must fail; record the measured number each gate reports.

## Deliverables

- `tests/determinism.rs`, `tests/audits.rs`, `tests/strategies/bundle_tree.rs`
- `src/lib.rs` doctest for `forbid(unsafe_code)`

## Notes

- A gate that cannot run (no `unshare`, no 1.98.1) fails saying so; it never passes vacuously.
- Cross-platform determinism is not claimed; the platform population is one row (NFR-031 Scope).
- Unblocks: Task-138.
