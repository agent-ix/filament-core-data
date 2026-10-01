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
  - target: "ix://agent-ix/filament-core-data/FR-053"
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
is an emitted byte. The module roots every fixture is lifted under are
synthetic modules authored in this repository, so no module of another
repository is copied here: `fixture-domain` declares the domain-modelling
object types the fixtures use together with each type's `construct` and the
FR-075 model tables the engine gates on, `fixture-systems` declares the
systems-model kinds, and `fixture-edges` carries the edge-type and role
registries FR-094 reads. `fixture-domain` and `fixture-edges` declare the
shared edge verbs byte-identically, and every lift loads both.

Byte parity of whole documents between the two frontends is unmeetable by
construction: envelopes differ (FR-046 stamps `source/typespec` and an FR-048
lock digest; FR-095 stamps `spec` and a path digest), every `origin` differs,
and FR-046 mints package-local scalars the typed table cannot author. Parity is
therefore structural, under a projection this requirement owns, over a new
shared case authored in both dialects with kernel scalars only. The three
existing shared cases each declare a package-local `scalar` and stay
single-dialect with that reason recorded. Task-136 measured that even the
structural projection could not hold on `records-and-scalars` while the two
frontends minted identities by different closed rules (FR-053 the
case-preserving slug of the declaration name, FR-095 a lowercase slug and the
alias `type/<DisplayName>.<fieldName>`; `diagnosticCode` forms differed). That
was filed as filament-core-data#87, whose ruling (CR-087-1) is one identity
rule stated once in `docs/semantic-data-system/contracts-v1.md` §Identity
minting — FR-053's rule, which is FR-034's — implemented by FR-095 unchanged.
With one rule the comparison holds: `records-and-scalars` is recorded with
both dialects, and TC-1290 and TC-1291 are pending that implementation, not
blocked. The TypeSpec half declares `@minValue(1) revision: integer`, a
constrained property that mints the alias `type/NoteRevision`; the spec-bundle
half mints `type/<artifact id>Revision` for the same row (FR-143), and the
projection renames each artifact-id segment to the slug of its type's
`displayName` so the two compare. The projection also
materialises an absent `relationships`, `operations`, or `clauses` as `[]`,
which is the FR-028-CON-1 reading of absence as empty, not a widening.
Task-136 measured the two former backend defects: `generate --target
typescript` refused repeated kernel-scalar extensions with `DUPLICATE_IDENTITY`
(filed as filament-core-data#88), and the Rust backend's writer refused the
`config-version-table` document with `NAME_COLLISION` on `UUID` (filed as
filament-core-data#90). Both are resolved; the acceptance tests below run the
two successful paths. `--target rust` through the generic `src/compiler/cli.mjs` is
`BACKEND_NOT_IMPLEMENTED`; the Rust backend's entry is its writer
`generateRust` (`src/compiler/backends/rust-serde/index.mjs`), which
`src/compiler/backends/rust-serde/cli.mjs generate` runs over the fixed
conformance corpus and which the `rust-generate` verb of
`scripts/extraction-frontend-harness.mjs` runs over one lifted document with
the request `cli.mjs` builds (CR-036-9, SR-170 FND-1500). Run that way, the
Rust backend is the acceptance path for this document. The FR-045 node seam
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
- `test/fixtures/compiler/shared/cases.json` and its `typespec` source trees (FR-045)
- The FR-050 reader and normalizer, and the `rust` and `typescript` backends, reached through `node src/compiler/cli.mjs`
- `agent_ix_semantic_ir::decide`, the independent reader (FR-097)

## Outputs

### Fixture inventory

Every fixture directory any acceptance criterion in FR-091 through FR-099 names
is listed here; the inventory test fails on a directory that is present and
unlisted or listed and absent.

- `crates/extraction-frontend/fixtures/config-version-table/`: a bundle root holding `spec/spec.md`, `spec/functional/FR-005-config-overlay-entity.md` (the typed ConfigOverlay artifact, the `config-overlay` target of the FR-006 edges), `spec/functional/FR-006-config-version-entity.md` in the **table** form, and `expected/`
- `crates/extraction-frontend/fixtures/config-version-fence/`: the same bundle with `spec/functional/FR-006-config-version-entity.md` in the **fence** form at the same relative path, and `expected/`
- `crates/extraction-frontend/fixtures/legacy/`: the verbatim live config-service `FR-006`, and `expected/`
- `crates/extraction-frontend/fixtures/business/`: one typed artifact per exported object type of fixture-domain — `domain`, `entity`, `value_object`, `aggregate_root`, `nested_entity`, `repository`, `event`, `state_machine`, `process`, `enumeration` — exercising every declaration kind, operations with parameters and returns, clauses, an enumeration with a `values` table, and the `operations.md` artifact FR-094 names; and `expected/`
- `crates/extraction-frontend/fixtures/clauses/`, `edges/`, `lower/`, `resolve/`, and `registry-doc/`: authored positive bundles exercising the FR-094 clause lowering, the edge vocabulary, the FR-093 lowering, the FR-092 resolve layer, and a registry document, each with `expected/`
- `crates/extraction-frontend/fixtures/negatives/<CODE>/`: one directory per FR-096 code, holding a bundle root, a module root, or both, plus `expected/diagnostics.json`. `negatives/ARTIFACT_NOT_LOWERED/` is the `both-forms` bundle, the artifact FR-093 names that carries both a table and a fence, in the legacy form. The following codes cannot be expressed by a file and are exercised by a test-constructed bundle in a scratch directory; their directory holds no `expected/`, only a `constructed.json` naming the constructing test function: `OUTPUT_UNWRITABLE`, `LIMIT_MAX_DOCUMENTS`, `LIMIT_MAX_DOCUMENT_BYTES`, `LIMIT_MAX_FIELDS_PER_RECORD`, `LIMIT_MAX_CLAUSE_BYTES`, `LIMIT_MAX_DEPTH`. `INVALID_IR` holds both a file-expressible bundle (the composite cycle of FR-097-AC-15) and a `constructed.json` for the fault-injected schema case. `MODULE_WITHOUT_SEMANTIC_BLOCK` and `MODULE_REFUSED` hold a module root. `DUPLICATE_TYPE_NAME` (two documents both titled `Status` under distinct ids, contract case (a); re-authored under CR-087-2 from the former `Status`/`status` pair, which is now the positive half of FR-095-AC-14), `DUPLICATE_IDENTITY` (an artifact `NoteRevision` beside a record `Note` with a constrained field `revision`, contract case (c), FR-095-AC-14), `DUPLICATE_ARTIFACT_ID`, and `STALE_TYPE_TOKEN` hold two-document bundles. The non-blocking negatives are exactly two, `DECLARED_LOSS` and `ENGINE_DIAGNOSTIC`, and their `expected/` also holds `semantic-ir.json`; `negatives/ARTIFACT_NOT_LOWERED/` (the `both-forms` bundle) blocks, since its document carries both forms of one declaration, while the non-blocking legacy form of `ARTIFACT_NOT_LOWERED` is exercised by the `legacy/` fixture above; `KERNEL_NAME_SHADOWED`'s fixture uses the shadowed scalar and is refused at lift level with `DUPLICATE_TYPE_NAME` per FR-092-AC-8, so it is a blocking negative. A fixture directory MAY carry a `modules.json` reading `{"roots": [...]}` naming its module roots; that list takes precedence over a `modules/` directory of the fixture's own and over the default pair below.
- `crates/extraction-frontend/fixtures/modules/fixture-domain/`: an authored `manifest.yaml` and `schemas/` declaring the domain-modelling object types; the frontend loads this module (beside `fixture-edges`) and never `~/.ix`
- `crates/extraction-frontend/fixtures/modules/fixture-edges/`: an authored `manifest.yaml` carrying the `edge_types` and `roles` registries under an empty `semantic` block; loaded beside `fixture-domain` by every lift; both declare the shared verbs byte-identically
- `crates/extraction-frontend/fixtures/modules/fixture-systems/`: an authored module declaring the systems-model kinds `interface`, `part`, `port`, `connection` and `allocation`, loaded by the `architecture` fixture named in its `modules.json`
- `crates/extraction-frontend/fixtures/modules/objects-extra/`: an authored second module declaring one object type, for FR-095-AC-11
- `crates/extraction-frontend/fixtures/modules/conflicting/`: an authored module sharing `fixture-domain`'s name whose `semantic` block would change a `config-version` field, planted under a fake `HOME/.ix` and `QUIRE_MODULES` as the FR-091 ambient-isolation control
- `crates/extraction-frontend/fixtures/modules/acme-other/` and `crates/extraction-frontend/fixtures/modules/frobnicates/`: authored modules named by fixtures' `modules.json` roots, for the FR-091 module-loading and FR-095 package-identity criteria
- `test/fixtures/compiler/shared/typespec/records-and-scalars/` and `test/fixtures/compiler/shared/spec-bundle/records-and-scalars/`: the new shared case, authored in both dialects with kernel scalars only
- `test/fixtures/compiler/shared/cases.json`: the `records-and-scalars` case with both source trees present and both `typespec` and `spec-bundle` non-null (issue #87 decided the shared rule), and for each existing case `"spec-bundle": null` with a `reason`

### Tests

- Per positive fixture, `expected/semantic-ir.json` and `expected/diagnostics.json`
- `crates/extraction-frontend/tests/`: the inventory, provenance, golden, read-only, parity, backend-acceptance, and payload tests, and `parity::project`, the projection function

## Behavior

### Fixtures

- The frontend SHALL NOT edit config-service or quire-rs.
- The frontend SHALL lift the `legacy` fixture to no record and exactly one `ARTIFACT_NOT_LOWERED` diagnostic naming `legacy-form`.

### Goldens

- The frontend SHALL write goldens only through `extraction-frontend lift --write-goldens --fixtures <dir> --staging <dir>` (FR-099), which lifts into the staging directory outside every bundle root and installs each `expected/` by rename.
- The frontend SHALL write, for each fixture whose root holds a `spec/spec.md`, the document and its diagnostics sidecar into the fixture's `expected/`.
- The frontend SHALL neither regenerate nor diff a constructed negative's `expected/diagnostics.json` through `--write-goldens` or `extraction-frontend-check`; that file is authored and asserted by TC-1288 alone.
- The frontend SHALL NOT rewrite a committed golden from any test.
- The frontend SHALL record in each `negatives/<CODE>/expected/diagnostics.json` the single expected code with its line and column, or no locus where FR-096 assigns none.

### Read-only lifting (issue #36 AC-4)

- The frontend SHALL write nothing under the bundle root or any module root during a lift, for a clean lift and for a lift with a blocking diagnostic.

### Cross-frontend parity

- The frontend SHALL supply the `records-and-scalars` shared case in both dialects, using kernel scalars only, with one record per dialect declaring the same fields, constraints, and multiplicities.
- The frontend SHALL define the parity projection of an IR document as: keep `types[]` only; drop every `origin` member at every node; drop the top-level `source`, `package`, `extensions`, and `occurrences`; drop every `extensions` member at every node; materialise an absent `relationships`, `operations`, or `clauses` list as `[]` (the FR-028-CON-1 reading of absence as empty); rewrite every identity prefix `ix://<pkg>/` to `ix://shared/`; rename every identity segment that is a spec-bundle artifact id to the slug of that artifact's `displayName`; read every record-shaped FR-142 construct `kind` (`entity`, `value_object`, `nested_entity`, `aggregate_root`, `event`, `process`) as `record` and drop its construct members; sort every node list by `identity` under code-point comparison.
- The frontend SHALL produce, for `records-and-scalars`, a parity projection whose form after `agent_ix_semantic_ir::normalize::normalized` is byte-identical to the normalized projection of the TypeSpec frontend's output for the same case.
- The frontend SHALL record `records-and-scalars` in `cases.json` with both source trees present and both the `typespec` and the `spec-bundle` dialect non-null.
- The frontend SHALL record each of `scalars-and-records`, `collections-and-units`, and `enums-and-unions` in `cases.json` with `"spec-bundle": null` and a `reason` naming the package-local `scalar` (and the `union` for `enums-and-unions`) the typed table cannot author.
- The frontend SHALL NOT author a spec-bundle tree that omits a construct of a shared case and claim agreement on the remainder.
- The frontend SHALL NOT edit `src/compiler/frontend/spec-bundle/frontend.mjs`, `src/compiler/frontend/seam.mjs`, or `test/compiler-core.test.ts`; the seam stays `FRONTEND_NOT_IMPLEMENTED` under filament-core-data#86.

### Backend acceptance and the payload check (declared gap, issue #85)

- The Rust and TypeScript backends SHALL refuse the `config-version-table` document's FR-142 constructs with a named diagnostic until filament-core-data#147 renders them; the two criteria below hold for a document whose type definitions are records.
- The frontend SHALL emit a `config-version-table` document that the Rust backend's writer `generateRust` (`src/compiler/backends/rust-serde/index.mjs`, run over the document by `node scripts/extraction-frontend-harness.mjs rust-generate --ir <file> --out <dir>` with the request `src/compiler/backends/rust-serde/cli.mjs` builds; `node src/compiler/cli.mjs generate --target rust` remains `BACKEND_NOT_IMPLEMENTED`.
- The frontend SHALL emit a `config-version-table` document that `node src/compiler/cli.mjs generate --target typescript` accepts with zero diagnostics.
- The frontend SHALL keep the payload-schema helper under `crates/extraction-frontend/tests/` only, unexported and unreachable from `lift` and `inspect`.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-098-CON-3 | The crate SHALL keep the payload-schema helper unexported and unreachable from the `lift` and `inspect` commands. | Scope | Static analysis |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-098-AC-2 | Regenerating every fixture whose root holds a `spec/spec.md` into a scratch directory under `CARGO_TARGET_DIR` reproduces each committed `expected/` file byte for byte, and each regenerated document equals `decide({"ir": doc}).normalized`; a one-byte change to a golden fails the test naming the fixture and the byte offset. | Test (TC-1286) |
| FR-098-AC-3 | The `business` fixture's golden carries at least one `record`, `enum`, `scalar`, and `alias` definition (the last a constrained field's, FR-093), one `enum` with at least two `variants`, one operation with parameters and a `returns`, one `ocl` clause, and one relationship of each of the categories `structural` and `dependency`. | Test (TC-1287) |
| FR-098-AC-4 | Every code FR-096 declares is emitted by its `negatives/<CODE>/` bundle or by the test `constructed.json` names, at the golden's recorded line and column or with no locus, as exactly its code as the first blocking diagnostic in FR-096 order; companion diagnostics that the same defect necessarily produces (an `ENGINE_DIAGNOSTIC` row, an `ARTIFACT_NOT_LOWERED`) are pinned by the test; the non-blocking negatives are exactly two, `DECLARED_LOSS` and `ENGINE_DIAGNOSTIC`, whose lifts carry no blocking diagnostic and write the document, `KERNEL_NAME_SHADOWED`'s fixture being refused with `DUPLICATE_TYPE_NAME` at lift level per FR-092-AC-8. | Test (TC-1288) |
| FR-098-AC-5 | After lifting a committed copy of each fixture bundle, `git status --porcelain` is empty and every file's hash under the bundle and module roots is unchanged, for a clean lift and for a lift with a blocking diagnostic. | Test (TC-1289) |
| FR-098-AC-6 | `cases.json` carries `records-and-scalars` with both source trees present and both `typespec` and `spec-bundle` non-null, and `"spec-bundle": null` with a `reason` naming `scalar` for each of the three existing cases; the parity test finds exactly one two-dialect case and compares it; the projection materialises an absent `relationships`, `operations`, or `clauses` as `[]`. | Test (TC-1290) |
| FR-098-AC-7 | For `records-and-scalars`, `normalized` of the projection of the spec-bundle lift equals `normalized` of the projection of the `node src/compiler/cli.mjs compile` output byte for byte — every projected identity, the `type/NoteRevision` alias, and every `diagnosticCode` included — and the test fails naming `node` when it is absent. | Test (TC-1291) |
| FR-098-AC-8 | `node src/compiler/cli.mjs generate` over the lifted `config-version-table` document exits zero with a non-empty file set and one diagnostic, the non-blocking `CONSTRUCT_MEMBER_UNENFORCED` advisory for its clauses ([FR-142](./FR-142-declare-one-construct-per-object-type.md)), for `--target rust` and for `--target typescript`; the Rust backend's own `generateRust` route through `node scripts/extraction-frontend-harness.mjs rust-generate` exits zero with zero diagnostics and a non-empty file set. The generic command line reaches the Rust target from [FR-130](./FR-130-register-the-rust-backend-in-the-generation-seam.md); before that registration only the harness route existed, and this criterion measured it alone. | Test (TC-1292) |
| FR-098-AC-9 | A representative `ConfigVersion` payload validates against the test-derived schema, `{"versionNumber": 0}` fails at `versionNumber`, and the helper is not reachable from the crate's public surface. | Test (TC-1293) |
| FR-098-AC-11 | The set of directories under `fixtures/`, `fixtures/negatives/`, and `fixtures/modules/` equals the inventory above, and every `constructed.json` names a test function that exists in `crates/extraction-frontend/tests/`. | Static (TC-1343) |
| FR-098-AC-12 | `parity::project` applied to the `config-version-table` golden yields a value with `types` as its only member, no `origin` or `extensions` at any depth, and every identity beginning `ix://shared/`; applied twice it yields the same value. | Property (TC-1344) |

## Dependencies

- **Upstream**: [FR-096](./FR-096-emit-stable-source-located-frontend-diagnostics.md), [FR-097](./FR-097-normalize-validate-and-write-the-lifted-document.md), [FR-045](./FR-045-define-the-frontend-seam.md), [FR-046](./FR-046-lower-typespec-to-contract-ir.md), [FR-053](./FR-053-declare-the-typespec-semantic-vocabulary.md) (the TypeSpec half of the parity case, `identity.mjs`), [FR-030](./FR-030-bind-source-dialect-and-manifest-targets.md), the filament-core-data#87 ruling (the shared identity rule, `docs/semantic-data-system/contracts-v1.md` §Identity minting)
- **Downstream**: [FR-099](./FR-099-provide-the-extraction-frontend-command-line.md), issue #37, `agent-ix/quire-contract-ir#52`, filament-core-data#86
- **Constrained by**: [NFR-031](../non-functional/NFR-031-deterministic-and-hermetic-lifting.md), [NFR-032](../non-functional/NFR-032-non-disruptive-extraction-frontend.md)
