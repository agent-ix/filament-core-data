---
id: Task-138
title: "NFR-032 change-set gates, docs sentinel, coverage binding"
type: Task
status: done
track: G
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-137"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/NFR-032"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-1310"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1311"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1312"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1313"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1314"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1315"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1316"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1317"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1318"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1319"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1271"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1299"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1330"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1321"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1323"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1324"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1326"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1327"
    type: verifies
---
# Task-138: NFR-032 change-set gates, docs sentinel, coverage binding

## Scope

Close the NFR-032 range: generate
`docs/semantic-data-system/extraction-frontend-diagnostics.md` from the
`Code` enum as the final implementation commit (the closing sentinel), run
the changed-path gate over both sentinels, the `cargo metadata` edge check,
the line diffs, the three harness rehearsals, and the whole-crate NFR-033
gates (`deny`, `audit`, clippy, fmt, trace-marker scan), then prove every
TC-1200..TC-1349 row except TC-1337 is bound under `quire coverage`.

## Subtasks

- [x] **Red.** `tests/change_set.rs` (`Static`/`Analysis`, driven by `scripts/extraction-frontend-harness.mjs` verbs inside the crate's `tests/` — the script lives at the repository-root `scripts/extraction-frontend-harness.mjs`, the one root `scripts/` path NFR-032 permits (CR-036-8), because `test/compiler.test.ts` requires every tracked `.mjs` naming `src/compiler` to live under `scripts/`): `tc_1310_` (range from the two sentinels via `changeRange` with `--no-renames`, unioned over `--first-parent --no-merges`; every path permitted, none prohibited), `tc_1311_` (`cargo metadata`: no edge from `agent-ix-semantic-ir`/`agent-ix-conformance-adapter` to this crate; the path edge to `agent-ix-semantic-ir` is the only one), `tc_1312_` (root `Cargo.toml` differs only in `members`; `rust-toolchain.toml` and `rust-version` unchanged), `tc_1313_` (`cases.json` line diff; pre-existing `shared/**` and the seam file unchanged), `tc_1314_` (`git status --porcelain` empty here and in every corpus repository after the full suite), `tc_1315_` (`publish = false`, `license = "AGPL-3.0-only"`, no registry named), `tc_1316_` (`suite-compare`), `tc_1317_` (`revert-rehearsal`), `tc_1318_` (`accretion-rehearsal`), `tc_1319_` (`git log --merges` empty; `package.json`, `pnpm-lock.yaml` unchanged), `tc_1299_` (FR-099 change set exactly members/lock/Makefile block/docs page; seven prohibited paths unchanged), `tc_1330_` (three-CON grep: loaders only in `bundle.rs`, `std::fs` only in `write.rs`, resolver inputs closed, binary reads no environment). `tests/toolchain.rs` additions: `tc_1321_` (every `cargo` in the block carries `+$(EXTRACTION_TOOLCHAIN)`; `0.0.0` fails each), `tc_1323_` (`make extraction-frontend-deny` zero errors), `tc_1324_` (`-audit` zero advisories), `tc_1326_` (clippy `-D warnings` and `fmt --check`), `tc_1327_` (every requirement test carries `#[trace]` + `tc_NNNN_`; every named id exists in `spec/tests.md`). `tests/docs.rs`: `tc_1271_` (regenerating the docs page from the enum reproduces the committed file byte for byte).
- [x] **Green: docs sentinel.** `extraction-frontend docs` (or a `#[test]`-only generator) writes `docs/semantic-data-system/extraction-frontend-diagnostics.md` listing every code with severity, blocking disposition and owner; commit it as the last commit of the range.
- [x] **Green: gates.** Fix whatever the change-set gate, clippy or fmt surfaces; move any stray path into a permitted location or drop it.
- [x] **Gate 4.** `quire coverage --scope . --json` binds every TC-1200..TC-1349 row except TC-1337 (`Manual`, blocked on #85) and TC-1339 (unused); the NFR-032 changed-path gate is green. Then, and only then, open the PR.
- [x] **Falsify.** Plant a prohibited path (a scratch edit under `schema/`) in the accretion rehearsal's synthetic history and prove `tc_1318_` fails.

## Deliverables

- `docs/semantic-data-system/extraction-frontend-diagnostics.md` (closing sentinel)
- `scripts/extraction-frontend-harness.mjs` (repository root, CR-036-8); `tests/change_set.rs`, `tests/docs.rs`, `tests/toolchain.rs` additions
- Matrix rows TC-1200..TC-1349 moved from `🚧` as each test lands (the PR's `spec/tests.md` edit is the ticket's own artifact under NFR-032's permitted `spec/**`)

## Notes

- The docs page is written here, not when FR-096 was first satisfied, so the range's head resolves from it (NFR-032 Scope).
- Publication is out of scope: `publish = false`; no `cargo publish`.
- Unblocks: the pull request for issue #36; downstream issue #37 and quire-contract-ir#52.
