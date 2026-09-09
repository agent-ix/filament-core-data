---
id: FR-098
title: "Prove fixture goldens, read-only lifting, and cross-frontend parity"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-015"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-096"
    type: "depends_on"
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

The extraction frontend SHALL carry a committed corpus of provenance-tracked
fixture bundles, their goldens, and a structural projection shared with the
TypeSpec frontend, so that a test measures the frontend against fixed
artifacts, the independent reader, and the other frontend rather than against
itself.

## Rationale

The `config-version` fixtures are the quire-rs re-authorings of config-service
FR-006, copied verbatim, because the live config-service FR-006 is a legacy
free-column table that FR-091 proves lifts to nothing; the 2026-09-08 Phase 0
comment on issue #36 records that finding, and config-service is not edited.
The table and fence forms live in two bundle roots at the same relative
document path, never in one bundle, because a bundle with two `FR-006`
documents collides on artifact id and type name and because `origin.source.path`
is an emitted byte. The vendored copies carry a `relationships:` frontmatter
block the quire-rs originals lack (FR-094 lowers relationships from frontmatter
only); `PROVENANCE.json` records the added block. The spec-objects-business
module is vendored from repository revision `d1840b8` because `0.3.0` is on
untagged `main` and the `~/.ix` copy is `0.2.0`. That revision declares
`allowed_links` but no `edge_types`; the FR-040 registry FR-094 reads lives in
spec-artifacts-iso, whose manifest cannot be vendored whole for one registry,
so `modules/edge-vocabulary/` carries the registry alone and every lift loads
both module roots.

Byte parity of whole documents between the two frontends is unmeetable by
construction: envelopes differ (FR-046 stamps `source/typespec` and an FR-048
lock digest; FR-095 stamps `spec` and a path digest), every `origin` differs,
and FR-046 mints package-local scalars the typed table cannot author. Parity is
therefore structural, under a projection this requirement owns, over a new
shared case authored in both dialects with kernel scalars only. The three
existing shared cases each declare a package-local `scalar` and stay
single-dialect with that reason recorded. The FR-045 node seam
(`src/compiler/frontend/spec-bundle/frontend.mjs`) is a prohibited path and
keeps returning `FRONTEND_NOT_IMPLEMENTED`; wiring the Rust binary into that
seam and its harness is filed as filament-core-data#86, so the parity test runs
from the Rust suite and shells to `node src/compiler/cli.mjs compile` for the
TypeSpec half.

Issue #36's fifth acceptance criterion (the `json-schema` target) has no
IR-reading backend (issue #85). It is carried as a `Blocked` matrix row on #85
with no test behind it; the payload helper of FR-098-AC-9 evidences the test
author's derivation only, and TC-1293 traces to FR-098-AC-9 alone.

## Inputs

- `quire-rs tests/fixtures/semantic/quoin/mapping/config-version.table.md` and `config-version.fence.md`, the provenance-tracked re-authorings of config-service FR-006
- `config-service spec/functional/FR-006-config-version-entity.md` at its inspected revision, the legacy free-column form
- The spec-objects-business repository at revision `d1840b8`: `manifest.yaml` and `schemas/`
- `test/fixtures/compiler/shared/cases.json` and its `typespec` source trees (FR-045)
- The FR-050 reader and normalizer, and the `rust` and `typescript` backends, reached through `node src/compiler/cli.mjs`
- `agent_ix_semantic_ir::decide`, the independent reader (FR-097)

## Outputs

### Fixture inventory

Every fixture directory any acceptance criterion in FR-091 through FR-099 names
is listed here; the inventory test fails on a directory that is present and
unlisted or listed and absent.

- `crates/extraction-frontend/fixtures/config-version-table/`: a bundle root holding `spec/spec.md`, `spec/functional/FR-005-config-overlay-entity.md` (the typed ConfigOverlay artifact, the `config-overlay` target of the FR-006 edges), `spec/functional/FR-006-config-version-entity.md` in the **table** form, `PROVENANCE.json`, and `expected/`
- `crates/extraction-frontend/fixtures/config-version-fence/`: the same bundle with `spec/functional/FR-006-config-version-entity.md` in the **fence** form at the same relative path, `PROVENANCE.json`, and `expected/`
- `crates/extraction-frontend/fixtures/legacy/`: the verbatim live config-service `FR-006`, `PROVENANCE.json`, and `expected/`
- `crates/extraction-frontend/fixtures/business/`: one typed artifact per exported object type of spec-objects-business — `domain`, `entity`, `value_object`, `aggregate_root`, `nested_entity`, `repository`, `event`, `state_machine`, `process`, `enumeration` — exercising every declaration kind, operations with parameters and returns, clauses, an enumeration with a `values_table`, and the `operations.md` artifact FR-094 names; `PROVENANCE.json` (authored) and `expected/`
- `crates/extraction-frontend/fixtures/both-forms/`: the artifact FR-093 names that carries both a table and a fence; `expected/`
- `crates/extraction-frontend/fixtures/negatives/<CODE>/`: one directory per FR-096 code, holding a bundle root, a module root, or both, plus `expected/diagnostics.json`. The following codes cannot be expressed by a file and are exercised by a test-constructed bundle in a scratch directory; their directory holds `expected/diagnostics.json` and a `constructed.json` naming the constructing test function: `OUTPUT_UNWRITABLE`, `LIMIT_MAX_DOCUMENTS`, `LIMIT_MAX_DOCUMENT_BYTES`, `LIMIT_MAX_FIELDS_PER_RECORD`, `LIMIT_MAX_CLAUSE_BYTES`, `LIMIT_MAX_DEPTH`. `INVALID_IR` holds both a file-expressible bundle (the composite cycle of FR-097-AC-15) and a `constructed.json` for the fault-injected schema case. `MODULE_WITHOUT_SEMANTIC_BLOCK` and `MODULE_REFUSED` hold a module root. `DUPLICATE_TYPE_NAME`, `DUPLICATE_ARTIFACT_ID`, and `STALE_TYPE_TOKEN` hold two-document bundles. `ENGINE_DIAGNOSTIC`, `ARTIFACT_NOT_LOWERED`, `KERNEL_NAME_SHADOWED`, and `DECLARED_LOSS` are non-blocking and their `expected/` also holds `semantic-ir.json`.
- `crates/extraction-frontend/fixtures/modules/spec-objects-business/`: `manifest.yaml` and `schemas/` vendored from spec-objects-business revision `d1840b8`, with `PROVENANCE.json`; the frontend loads this module (beside `edge-vocabulary`) and never `~/.ix`
- `crates/extraction-frontend/fixtures/modules/edge-vocabulary/`: a `manifest.yaml` carrying the FR-040 `edge_types` and `roles` registries copied byte for byte from spec-artifacts-iso revision `6686f11`, `spec_artifacts_iso/manifest.yaml` lines 872–975, under an authored header with an empty `semantic` block; `PROVENANCE.json` names the source lines and every authored line; loaded beside `spec-objects-business` by every lift, since `d1840b8` declares no `edge_types`
- `crates/extraction-frontend/fixtures/modules/objects-extra/`: an authored second module declaring one object type, for FR-095-AC-11; `PROVENANCE.json` (authored)
- `crates/extraction-frontend/fixtures/modules/conflicting/`: an authored module whose `semantic` block would change a `config-version` field, planted under a fake `HOME/.ix` and `QUIRE_MODULES` as the FR-091 ambient-isolation control; `PROVENANCE.json` (authored)
- `test/fixtures/compiler/shared/typespec/records-and-scalars/` and `test/fixtures/compiler/shared/spec-bundle/records-and-scalars/`: the new shared case, authored in both dialects with kernel scalars only
- `test/fixtures/compiler/shared/cases.json`: the `records-and-scalars` case with both sources, and for each existing case `"spec-bundle": null` with a `reason`

### Tests

- Per positive fixture, `expected/semantic-ir.json`, `expected/semantic-ir.json.fingerprint`, `expected/diagnostics.json`, and `expected/provenance.json`
- `crates/extraction-frontend/tests/`: the inventory, provenance, golden, read-only, parity, backend-acceptance, and payload tests, and `parity::project`, the projection function

## Behavior

### Fixture provenance (declared reading of issue #36 AC-1)

- The frontend SHALL name every fixture document in a `PROVENANCE.json` beside it, carrying either the source repository, revision, and path it was copied from, or `authored` for a document written for this crate.
- The frontend SHALL record in the `config-version-*` provenance rows the `relationships:` frontmatter block added to the vendored copies.
- The frontend SHALL NOT edit config-service, quire-rs, or spec-objects-business.
- The frontend SHALL lift the `legacy` fixture to no record and exactly one `ARTIFACT_NOT_LOWERED` diagnostic naming `legacy-form`.

### Goldens

- The frontend SHALL write goldens only through `extraction-frontend lift --write-goldens`.
- The frontend SHALL write, for each fixture, the document, its fingerprint sidecar, its diagnostics sidecar, and its provenance sidecar into the fixture's `expected/`.
- The frontend SHALL NOT rewrite a committed golden from any test.
- The frontend SHALL record in each `negatives/<CODE>/expected/diagnostics.json` the single expected code with its line and column, or no locus where FR-096 assigns none.

### Read-only lifting (issue #36 AC-4)

- The frontend SHALL write nothing under the bundle root or any module root during a lift, for a clean lift and for a lift with a blocking diagnostic.

### Cross-frontend parity

- The frontend SHALL supply the `records-and-scalars` shared case in both dialects, using kernel scalars only, with one record per dialect declaring the same fields, constraints, and multiplicities.
- The frontend SHALL define the parity projection of an IR document as: keep `types[]` only; drop every `origin` member at every node; drop the top-level `source`, `package`, `extensions`, and `occurrences`; drop every `extensions` member at every node; rewrite every identity prefix `ix://<pkg>/` to `ix://shared/`; sort every node list by `identity` under code-point comparison.
- The frontend SHALL compare the two dialects' projections byte for byte after `agent_ix_semantic_ir::normalize::normalized`.
- The frontend SHALL record each of `scalars-and-records`, `collections-and-units`, and `enums-and-unions` in `cases.json` with `"spec-bundle": null` and a `reason` naming the package-local `scalar` (and the `union` for `enums-and-unions`) the typed table cannot author.
- The frontend SHALL NOT author a spec-bundle tree that omits a construct of a shared case and claim agreement on the remainder.
- The frontend SHALL NOT edit `src/compiler/frontend/spec-bundle/frontend.mjs`, `src/compiler/frontend/seam.mjs`, or `test/compiler-core.test.ts`; the seam stays `FRONTEND_NOT_IMPLEMENTED` under filament-core-data#86.

### Backend acceptance and the payload check (declared gap, issue #85)

- The frontend SHALL emit a `config-version-table` document that `node src/compiler/cli.mjs generate --target rust` and `--target typescript` each accept with zero diagnostics.
- The frontend SHALL keep the payload-schema helper under `crates/extraction-frontend/tests/` only, unexported and unreachable from `lift` and `inspect`.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-098-CON-1 | Outside `crates/extraction-frontend/`, this requirement's change set SHALL be exactly `test/fixtures/compiler/shared/cases.json`, `test/fixtures/compiler/shared/typespec/records-and-scalars/`, and `test/fixtures/compiler/shared/spec-bundle/`. | Scope | Change-set diff |
| FR-098-CON-2 | A fixture change SHALL be accompanied in the same commit by a provenance row change and a regenerated golden. | Integrity | Inspection |
| FR-098-CON-3 | The crate SHALL keep the payload-schema helper unexported and unreachable from the `lift` and `inspect` commands. | Scope | Static analysis |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-098-AC-1 | Every document under `fixtures/` is named in its `PROVENANCE.json` with repository, revision, and path or as `authored`; the `config-version-*` rows name the quire-rs revision and the added `relationships:` block; the `modules/spec-objects-business` row names revision `d1840b8`. | Test (TC-1285) |
| FR-098-AC-2 | Regenerating every fixture into a scratch directory under `CARGO_TARGET_DIR` reproduces each committed `expected/` file byte for byte, and each regenerated document equals `decide({"ir": doc}).normalized`; a one-byte change to a golden fails the test naming the fixture and the byte offset. | Test (TC-1286) |
| FR-098-AC-3 | The `business` fixture's golden carries at least one `record`, `enum`, `scalar`, and `alias` definition (the last a constrained field's, FR-093), one `enum` with at least two `variants`, one operation with parameters and a `returns`, one `ocl` clause, and one relationship of each of the categories `structural` and `dependency`. | Test (TC-1287) |
| FR-098-AC-4 | Every code FR-096 declares is emitted by its `negatives/<CODE>/` bundle or by the test `constructed.json` names, at the golden's recorded line and column or with no locus, and no `negatives` bundle emits a second code. | Test (TC-1288) |
| FR-098-AC-5 | After lifting a committed copy of each fixture bundle, `git status --porcelain` is empty and every file's hash under the bundle and module roots is unchanged, for a clean lift and for a lift with a blocking diagnostic. | Test (TC-1289) |
| FR-098-AC-6 | `cases.json` names both a `typespec` and a `spec-bundle` source for `records-and-scalars`, and `"spec-bundle": null` with a `reason` naming `scalar` for each of the three existing cases; the parity test asserts exactly one two-dialect case. | Test (TC-1290) |
| FR-098-AC-7 | For `records-and-scalars`, `normalized` of the projection of the spec-bundle lift equals `normalized` of the projection of the `node src/compiler/cli.mjs compile` output byte for byte, and the test fails naming `node` when it is absent. | Test (TC-1291) |
| FR-098-AC-8 | `generate --target rust` and `generate --target typescript` over the lifted `config-version-table` document each exit zero with zero diagnostics. | Test (TC-1292) |
| FR-098-AC-9 | A representative `ConfigVersion` payload validates against the test-derived schema, `{"versionNumber": 0}` fails at `versionNumber`, and the helper is not reachable from the crate's public surface. | Test (TC-1293) |
| FR-098-AC-10 | The change set of this requirement outside the crate is exactly `cases.json`, `test/fixtures/compiler/shared/typespec/records-and-scalars/`, and files under `test/fixtures/compiler/shared/spec-bundle/`; `src/compiler/frontend/**` and `test/compiler-core.test.ts` are byte-unchanged. | Static (TC-1294) |
| FR-098-AC-11 | The set of directories under `fixtures/`, `fixtures/negatives/`, and `fixtures/modules/` equals the inventory above, and every `constructed.json` names a test function that exists in `crates/extraction-frontend/tests/`. | Static (TC-1343) |
| FR-098-AC-12 | `parity::project` applied to the `config-version-table` golden yields a value with `types` as its only member, no `origin` or `extensions` at any depth, and every identity beginning `ix://shared/`; applied twice it yields the same value. | Property (TC-1344) |

## Dependencies

- **Upstream**: [FR-096](./FR-096-emit-stable-source-located-frontend-diagnostics.md), [FR-097](./FR-097-normalize-validate-and-write-the-lifted-document.md), [FR-045](./FR-045-define-the-frontend-seam.md), [FR-046](./FR-046-lower-typespec-to-contract-ir.md), [FR-030](./FR-030-bind-source-dialect-and-manifest-targets.md)
- **Downstream**: [FR-099](./FR-099-provide-the-extraction-frontend-command-line.md), issue #37, `agent-ix/quire-contract-ir#52`, filament-core-data#86
- **Constrained by**: [NFR-031](../non-functional/NFR-031-deterministic-and-hermetic-lifting.md), [NFR-032](../non-functional/NFR-032-non-disruptive-extraction-frontend.md)
