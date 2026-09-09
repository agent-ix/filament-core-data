---
id: Task-134
title: "FR-097 validate, canonicalize, fingerprint, atomic write"
type: Task
status: done
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-133"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-097"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-1273"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1274"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1275"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1276"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1277"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1278"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1279"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1280"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1281"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1282"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1283"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1284"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1336"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1340"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1341"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1342"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1219"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1230"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1245"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1258"
    type: verifies
---
# Task-134: FR-097 validate, canonicalize, fingerprint, atomic write

## Scope

`validate.rs` (`validate_document` → one `INVALID_IR` per `decide`
diagnostic), `canonical.rs` (`sort_node_lists`, `canonical_bytes` = a call to
`agent_ix_semantic_ir::normalize::normalized`), `write.rs` (`write_lift`:
temp file + rename, four files in the fixed order, diagnostics-only on a
blocking lift), and the library-level `lift(bundle_root, module_roots, out)
-> LiftOutcome` that assembles envelope + types and runs the pipeline. This is
the first task that shells to the node reader; **rebase after PR #84 first**
(SR-168 FND-1480).

## Subtasks

- [ ] **Rebase.** Confirm PR #84 is merged; rebase `spec/36-extraction-frontend` onto `main`; re-run Tasks 127..133's suites.
- [x] **Fixtures.** Author `fixtures/negatives/INVALID_IR/` (frontmatter `A contains B`, `B contains A`) with a `constructed.json` for the fault-injected schema case; `fixtures/negatives/OUTPUT_UNWRITABLE/constructed.json`.
- [x] **Red.** `tests/write.rs`: `tc_1273_` (manifest names `agent-ix-semantic-ir` by path, no `jsonschema`; `cargo tree` clean; `crates/semantic-ir` byte-unchanged), `tc_1274_` (missing `unknownPolicy` → exactly one `INVALID_IR` with the instance pointer, nothing but diagnostics written), `tc_1275_` (bytes == `decide(...).normalized`; parse + `normalized` again reproduces them — golden equality lands in Task-136), `tc_1276_` (proptest: every node list identity-sorted; unchanged against two `Intl.Collator` orderings via node), `tc_1277_` (`node -e` `normalizeIr` identity over every emitted fixture), `tc_1278_` (`.fingerprint` members `domain quire.verification.jcs`, `version rfc8785-v1`, `algorithm sha256`, `digest sha256-jcs:<64 hex>` == `sha256sum`), `tc_1279_`, `tc_1280_` (varied `CARGO_TARGET_DIR`/cwd/`HOME`/`LC_ALL`), `tc_1281_`, `tc_1282_`, `tc_1283_` (`node src/compiler/cli.mjs inspect --ir` zero diagnostics; fails naming `node` when absent), `tc_1284_`, `tc_1336_` (grep: no `serde_json::to_string`/`to_vec`/`to_writer` under `src/`; every `<out>` write dominated by a success verdict), `tc_1340_` (`--out` under bundle or module root refused before load), `tc_1341_` (four files, and only four), `tc_1342_` (`COMPOSITE_CYCLE` in `causes[0]`). Deferred reader checks: `tc_1219_`, `tc_1230_`, `tc_1245_`, `tc_1258_` over every emitted positive fixture.
- [x] **Green: canonical + validate.** Materialise `multiplicity`, `presence`, `nullable` on every field and param; sort `types` and every nested node list by `identity` under code-point comparison; `decide({"ir": doc})`; any non-success or non-empty diagnostics → blocking `INVALID_IR` each.
- [x] **Green: fingerprint + write.** SHA-256 over the exact written bytes; sidecars through the same `normalized` call; `OUTPUT_UNWRITABLE` for paths under the bundle/module roots (checked before loading) or an absent/unwritable directory; temp-and-rename per file in the order diagnostics, provenance, fingerprint, document; blocking → diagnostics only, pre-existing files untouched, no temp left.
- [x] **Gate 2.** `tc_1284_` and `tc_1277_` green on `config-version-table`: `decide` success with zero diagnostics and `normalizeIr` is the identity on the bytes. Do not start Task-135 until both hold.
- [x] **Falsify.** Remove the node-list sort in a scratch build and prove `tc_1277_` fails; inject a `serde_json::to_vec` and prove `tc_1336_` fails.

## Deliverables

- `src/validate.rs`, `src/canonical.rs`, `src/write.rs`, `src/lift.rs`; `tests/write.rs`, `tests/readers.rs`
- `fixtures/negatives/INVALID_IR/`, `fixtures/negatives/OUTPUT_UNWRITABLE/constructed.json`

## Notes

- Canonical form is the issue #67 reading FR-097 declares (`agent-ix-conformance-jcs-v1` as `crates/semantic-ir` writes it); the fingerprint domain is quire-specification FR-018's, copied verbatim (D10).
- `std::fs` appears only in `write.rs` (NFR-031-AC-5 exemption list).
- CR-036-4 (2026-09-09): the three reader checks this task deferred (`tc_1283_`, `tc_1219_`, `tc_1230_`) were `#[ignore]`d because the FR-050 node reader resolves `constraint.appliesTo` as a type identity; the orchestrator adopted FR-034's alias-per-constrained-field form (FR-093 "The fields"), `lower.rs` now mints one `kind: alias` per constrained field, and the three tests are un-ignored and green. The AC defects this task reported against FR-097-AC-1 (`jsonschema` reachable via quire-rs) and FR-097-AC-4 (`Intl.Collator` is not a code-point reference) and the FR-097 node-list gap (field/param `extensions`, `occurrences`, top-level `extensions`) were applied in the same CR.
- Unblocks: Task-135.
