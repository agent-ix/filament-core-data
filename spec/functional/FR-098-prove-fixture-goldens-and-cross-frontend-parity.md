---
id: FR-098
title: "Prove fixture goldens, read-only lifting, and cross-frontend parity"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-015"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-097"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-045"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-046"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-030"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-031"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-032"
    type: "constrained_by"
---
# [FR-098] Prove fixture goldens, read-only lifting, and cross-frontend parity

## Description

The extraction frontend SHALL carry a corpus of read-only fixture bundles with
committed golden outputs, SHALL prove that lifting writes nothing into a fixture,
and SHALL prove on the shared frontend cases that its IR agrees with the
TypeSpec frontend's after FR-050 normalization, so that the frontend is judged
against fixed artifacts and against the other frontend rather than against
itself.

## Inputs

- `quire-rs tests/fixtures/semantic/quoin/mapping/config-version.table.md` and `config-version.fence.md`, the provenance-tracked re-authorings of config-service FR-006
- `config-service spec/functional/FR-006-config-version-entity.md` at its inspected revision, the legacy free-column form
- The spec-objects-business `0.3.0` module and its skeleton set
- `test/fixtures/compiler/shared/cases.json` and its `typespec` source trees (FR-045)
- The FR-050 reader and normalizer, and the `rust` and `typescript` backends, reached through `node src/compiler/cli.mjs`

## Outputs

- `crates/extraction-frontend/fixtures/config-version/`: `spec/spec.md`, the typed `FR-005` ConfigOverlay artifact, the `table` and `fence` copies of `FR-006`, and `PROVENANCE.json` naming the quire-rs revision and path each copy came from
- `crates/extraction-frontend/fixtures/legacy/`: the verbatim live config-service `FR-006` with its own `PROVENANCE.json`
- `crates/extraction-frontend/fixtures/business/`: one typed artifact per exported object type of spec-objects-business — `domain`, `entity`, `value_object`, `aggregate_root`, `nested_entity`, `repository`, `event`, `state_machine`, `process`, `enumeration` — exercising every declaration kind, operations with parameters and returns, and clauses
- `crates/extraction-frontend/fixtures/negatives/`: one document per diagnostic code FR-096 declares
- Per fixture, `expected/semantic-ir.json` and `expected/diagnostics.json`
- `test/fixtures/compiler/shared/spec-bundle/<case>/` for each of the three shared cases, and the `spec-bundle` entry in each case's `sources` in `cases.json`
- `crates/extraction-frontend/tests/`: the golden, read-only, parity, backend-acceptance, and payload tests

## Behavior

### Fixture provenance (declared reading of issue #36 AC-1)

- The `config-version` fixture SHALL be the quire-rs re-authorings, copied verbatim, because the live config-service FR-006 is a legacy free-column table that FR-091-AC-10 proves lifts to nothing; the 2026-09-08 Phase 0 comment on issue #36 records that finding and this reading. The frontend SHALL NOT edit config-service.
- Every copied fixture document SHALL be named in a `PROVENANCE.json` beside it, carrying the source repository, revision, and path; a fixture document with no provenance row SHALL fail the frontend's own test.
- The `legacy` fixture SHALL be a negative control: lifting it SHALL emit no record and exactly the FR-093 `ARTIFACT_NOT_LOWERED` diagnostic naming `legacy-form`.

### Goldens

- The frontend SHALL write goldens only through `extraction-frontend lift --write-goldens`, invoked deliberately, and SHALL record each written golden's fingerprint in the fixture's `expected/`.
- The golden test SHALL regenerate every fixture into a scratch directory under `CARGO_TARGET_DIR`, byte-compare each regenerated document and diagnostics file to the committed golden, and fail on the first difference naming the fixture and the first differing byte offset. The test SHALL NOT rewrite a committed golden.
- The `negatives` goldens SHALL record, for each document, the single expected diagnostic code with its line and column, and the test SHALL assert that no other diagnostic is emitted for that document.

### Read-only lifting (issue #36 AC-4)

- The read-only test SHALL copy each fixture bundle into a scratch directory, initialise a git repository over it, commit it, lift it, and assert that `git status --porcelain` is empty afterwards.
- The same test SHALL hash every file under the copy before and after the lift and assert byte equality, so that a write that git ignores is still caught.
- A lift that raises a blocking diagnostic SHALL satisfy the same assertions.

### Cross-frontend parity

- For each of the three shared cases — `scalars-and-records`, `collections-and-units`, `enums-and-unions` — the frontend SHALL supply a `spec-bundle` source tree authored in the typed form, and SHALL add a `spec-bundle` entry to that case's `sources` in `cases.json`. FR-045 reserved this: its `cases.json` `$comment` reads "the spec-bundle column is issue #36's to fill in", and editing that file to fill the column is the one permitted touch outside the crate's own tree.
- The parity test SHALL lift each `spec-bundle` tree, compile the `typespec` tree through the FR-046 frontend, apply FR-050 `normalizeIr` to both, and assert the two strings are equal.
- Where a shared case uses a construct the typed table cannot author — a `union`, a `sequence`, or a `map` type definition — the frontend SHALL record that case as single-dialect in `cases.json` with the construct named as the reason, and the parity test SHALL assert the reason names a construct the typed table lacks. The frontend SHALL NOT author a spec-bundle tree that omits the construct and claim agreement on the remainder.

### Backend acceptance and the payload check (declared gap, issue #85)

- The lifted `config-version` document SHALL be accepted by `node src/compiler/cli.mjs generate --target rust` and `--target typescript` with zero diagnostics.
- A representative `ConfigVersion` payload SHALL validate against a JSON Schema the test derives from the lifted record's fields, and a payload with `versionNumber: 0` SHALL fail it at `versionNumber`.
- That derivation SHALL live under `crates/extraction-frontend/tests/` only; it is not the `json-schema` target, which has no IR-reading backend (issue #85), and issue #36's fifth acceptance criterion is carried as a declared gap until #85 is ruled.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-098-CON-1 | Outside `crates/extraction-frontend/`, this requirement SHALL touch only `test/fixtures/compiler/shared/cases.json` and the new `test/fixtures/compiler/shared/spec-bundle/` tree; no `typespec` source tree, golden, or corpus case changes. | Scope | Change-set diff |
| FR-098-CON-2 | The maintainer SHALL change a fixture only together with a new provenance row and a deliberate golden rewrite in the same commit, never to make a golden pass. | Integrity | Inspection |
| FR-098-CON-3 | The crate SHALL keep the payload-schema helper unexported and unreachable from the `lift` and `inspect` commands. | Scope | Static analysis |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-098-AC-1 | Every document under `fixtures/config-version/` and `fixtures/legacy/` is named in its `PROVENANCE.json` with repository, revision, and path, and the `config-version` rows name the quire-rs revision the copies were taken from. | Test (TC-1285) |
| FR-098-AC-2 | Regenerating every fixture into a scratch directory reproduces each committed `expected/semantic-ir.json` and `expected/diagnostics.json` byte for byte; a one-byte change to a golden fails the test naming the fixture and the offset. | Test (TC-1286) |
| FR-098-AC-3 | The `business` fixture's golden carries at least one `record`, `enum`, `alias`, and `scalar` definition, one operation with parameters and a `returns`, one `ocl` clause, and one relationship of each of the categories `structural` and `dependency`. | Test (TC-1287) |
| FR-098-AC-4 | Every diagnostic code FR-096 declares is emitted by exactly one `negatives` document at the golden's recorded line and column, and no `negatives` document emits a second code. | Test (TC-1288) |
| FR-098-AC-5 | After lifting a committed copy of each fixture bundle, `git status --porcelain` is empty and every file's hash is unchanged, for a clean lift and for a lift with a blocking diagnostic. | Test (TC-1289) |
| FR-098-AC-6 | `cases.json` names a `spec-bundle` source for each of the three shared cases, or a single-dialect reason naming `union`, `sequence`, or `map`; the harness of FR-045-AC-5 runs the implemented dialects and records the outcome. | Test (TC-1290) |
| FR-098-AC-7 | For every shared case with both sources, `normalizeIr` of the spec-bundle lift equals `normalizeIr` of the TypeSpec compile, string for string. | Test (TC-1291) |
| FR-098-AC-8 | `generate --target rust` and `generate --target typescript` over the lifted `config-version` document each exit zero with zero diagnostics. | Test (TC-1292) |
| FR-098-AC-9 | A representative `ConfigVersion` payload validates against the test-derived schema, `{"versionNumber": 0}` fails at `versionNumber`, and the helper is not reachable from the crate's public surface. | Test (TC-1293) |
| FR-098-AC-10 | The change set of this requirement outside the crate is exactly `cases.json` and files under `test/fixtures/compiler/shared/spec-bundle/`. | Analysis (TC-1294) |

## Dependencies

- **Upstream**: [FR-097](./FR-097-normalize-validate-and-write-the-lifted-document.md), [FR-045](./FR-045-define-the-frontend-seam.md), [FR-046](./FR-046-lower-typespec-to-contract-ir.md), [FR-030](./FR-030-bind-source-dialect-and-manifest-targets.md), [FR-096](./FR-096-emit-stable-source-located-frontend-diagnostics.md)
- **Downstream**: [FR-099](./FR-099-provide-the-extraction-frontend-command-line.md), issue #37, `agent-ix/quire-contract-ir#52`
- **Constrained by**: [NFR-031](../non-functional/NFR-031-deterministic-and-hermetic-lifting.md), [NFR-032](../non-functional/NFR-032-non-disruptive-extraction-frontend.md)
