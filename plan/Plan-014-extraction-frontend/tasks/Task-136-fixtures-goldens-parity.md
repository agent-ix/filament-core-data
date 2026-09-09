---
id: Task-136
title: "FR-098 fixture inventory, goldens, read-only, parity, backend acceptance"
type: Task
status: done
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-135"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-098"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-1285"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1286"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1287"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1288"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1289"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1290"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1291"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1292"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1293"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1294"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1338"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1343"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1344"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1253"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1255"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1267"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1270"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1272"
    type: verifies
---
# Task-136: FR-098 fixture inventory, goldens, read-only, parity, backend acceptance

## Scope

Close the fixture corpus: the inventory test, provenance test, the one golden
cut through `lift --write-goldens`, the read-only proof, the
`records-and-scalars` shared case in both dialects with `parity::project`,
backend acceptance through `node src/compiler/cli.mjs generate`, and the
tests-only payload helper. The only files outside the crate this task touches
are `test/fixtures/compiler/shared/cases.json`,
`test/fixtures/compiler/shared/typespec/records-and-scalars/` and
`test/fixtures/compiler/shared/spec-bundle/`.

## Subtasks

- [x] **Fixtures.** Author the shared case `records-and-scalars` in TypeSpec and as a spec bundle (kernel scalars only, one record, same fields/constraints/multiplicities); edit `cases.json` to add it with both sources and to set `"spec-bundle": null, "reason": "<names scalar (and union)>"` on `scalars-and-records`, `collections-and-units`, `enums-and-unions`. Verify every `fixtures/negatives/<CODE>/` directory exists for every `Code` variant (26) and every `constructed.json` names a real test function.
- [x] **Red.** `tests/fixtures.rs`: `tc_1285_` (every document named in `PROVENANCE.json`; `config-version-*` rows name the quire-rs revision and the added `relationships:` block; module row `d1840b8`), `tc_1343_` (directory set equals the inventory), `tc_1272_` (negatives set equals the enum), `tc_1288_` (each negative emits exactly its code at the recorded locus), `tc_1286_` (regenerate into `CARGO_TARGET_DIR` scratch; byte equality per file and `decide(...).normalized`; a one-byte change names fixture and offset), `tc_1287_` (business golden carries record/enum/scalar, ≥2 variants, op with params+returns, `ocl` clause, `structural` and `dependency` relationships), `tc_1289_` (`git status --porcelain` empty and hashes unchanged after clean and blocking lifts), `tc_1253_`, `tc_1255_`, `tc_1267_`, `tc_1270_`. `tests/parity.rs`: `tc_1290_`, `tc_1291_` (`normalized(project(spec-bundle lift)) == normalized(project(node compile))`, fails naming `node` if absent), `tc_1344_` (proptest: projection shape and idempotence). `tests/backend.rs`: `tc_1292_` (`generate --target rust|typescript` exit 0, zero diagnostics). `tests/payload.rs`: `tc_1293_`, `tc_1338_` (helper unexported, unreachable from `lift`/`inspect`). `tc_1294_` (change-set outside the crate is exactly the three shared-case paths).
- [x] **Green: goldens.** Run `make extraction-frontend-goldens` once; commit every `expected/{semantic-ir.json, semantic-ir.json.fingerprint, diagnostics.json, provenance.json}` (positives) and `expected/diagnostics.json` (+ `semantic-ir.json` for the four non-blocking negatives) in the same commit as the fixtures they belong to (FR-098-CON-2).
- [x] **Green: parity.** `parity::project` in `tests/parity/mod.rs`: keep `types[]`; drop every `origin`, top-level `source`/`package`/`extensions`/`occurrences`, every nested `extensions`; rewrite `ix://<pkg>/` → `ix://shared/`; sort node lists by identity (D6).
- [x] **Gate 3.** `tc_1286_` and `tc_1291_` green across two runs. Classify any difference as frontend defect or host input before Task-137.
- [x] **Falsify.** Flip one byte in a scratch copy of a golden and prove `tc_1286_` names it; omit a field from the spec-bundle half of the shared case and prove `tc_1291_` fails.

## Deliverables

- Every `fixtures/*/expected/` and `fixtures/negatives/*/expected/`; `fixtures/negatives/*/constructed.json` finalised
- `test/fixtures/compiler/shared/{typespec,spec-bundle}/records-and-scalars/`, `cases.json` edits
- `tests/fixtures.rs`, `tests/parity.rs`, `tests/parity/mod.rs`, `tests/backend.rs`, `tests/payload.rs`

## Notes

- `src/compiler/frontend/spec-bundle/frontend.mjs`, `seam.mjs` and `test/compiler-core.test.ts` stay byte-unchanged; seam wiring is filament-core-data#86.
- TC-1337 (issue #36 AC-5, `json-schema` target) is not verified here or anywhere: blocked on #85, `Manual`.
- Unblocks: Task-137.
- Landed (Task-136): TC-1290 and TC-1291 are `#[ignore = "blocked: ..."]` — the
  two frontends disagree under the FR-098 projection by construction (empty
  `clauses`/`operations`/`relationships` on the spec-bundle record; FR-095 slug
  versus FR-046/FR-053 verbatim identities for fields, the constrained-field
  alias and its constraint), so `records-and-scalars` is recorded
  single-dialect in `cases.json` with the four differences as its reason and
  both trees committed; the measured halves run as `tc_1290_the_three_…` and
  `tc_1291_both_halves_…`. TC-1292 is blocked on the host (`--target rust` is
  `BACKEND_NOT_IMPLEMENTED`, #21; `--target typescript` refuses every
  kernel-scalar extension identity as `DUPLICATE_IDENTITY`, as it does
  FR-046's own assurance output); the measurement is `tc_1292_measured_…`.
- Fixture fixes cut with the goldens: `negatives/UNKNOWN_EDGE_VERB` and
  `negatives/IMPORT_UNSUPPORTED` name their module roots in a `modules.json`
  the golden writer honours (under the default pair the former lifted clean and
  the latter emitted `UNRESOLVED_TYPE_TOKEN`); `negatives/UNSLUGGABLE_NAME` is
  now an enumeration value `***` (a `---` title is `UNNAMEABLE_ARTIFACT`);
  `negatives/ENGINE_DIAGNOSTIC` was missing and is a `sysml` clause advisory.
