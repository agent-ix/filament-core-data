---
id: FR-095
title: "Mint package identity, envelope digests, node identities, and provenance"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-015"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-091"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-019"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-020"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-021"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-048"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-031"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-032"
    type: "constrained_by"
---
# [FR-095] Mint package identity, envelope digests, node identities, and provenance

## Description

The extraction frontend SHALL fill the IR document's `source` and `package`
envelope from the bundle and its modules, mint every node identity from the
bundle package and the declaration's own name by a closed pattern, and write a
provenance record beside the document, so that every value in the emitted
document traces to a source byte or a manifest value and none is inferred from
the host.

## Inputs

- The bundle's `spec.md` frontmatter `org`, `name`, and optional `version`
- Every loaded document's bundle-root-relative path and raw bytes, from FR-091
- Each loaded module's manifest bytes, `name`, `version`, and `semantic.contract_version`
- The exact `quire-rs` crate version and git revision NFR-033 pins, and the vendored semantic-core version

## Outputs

- `crates/extraction-frontend/src/identity.rs`: `PackageIdentity`, `slug(name) -> Result<String, Unsluggable>`, and the `type_identity`, `field_identity`, `constraint_identity`, `relationship_identity`, `operation_identity`, `clause_identity` minters
- `crates/extraction-frontend/src/envelope.rs`: `source_block(bundle)`, `package_block(bundle, modules)`
- `<out>.provenance.json` beside the emitted document

## Behavior

### The `source` block

- The frontend SHALL set `source.identity` to `ix://<org>/<name>/spec`.
- The frontend SHALL set `source.dialect` to `spec-bundle`. This is the declared reading of issue #77: the Markdown bundle is the authored source and the extraction record is not a projection of it, so no third dialect value is needed; the frontend cites #77 and changes no byte of `schema/**`.
- The frontend SHALL set `source.version` to the `spec.md` frontmatter `version` where present and to `0.0.0` otherwise.
- The frontend SHALL set `source.digest` to `sha256:<hex>` over the byte sequence formed, for each loaded document in path order under code-point comparison, by the document's bundle-root-relative path bytes, one `0x00` byte, the document's raw bytes, one `0x00` byte.

### The `package` block

- The frontend SHALL set `package.identity` to `<org>/<name>` and `package.version` to the same value as `source.version`.
- The frontend SHALL set `package.manifestDigest` to `sha256:<hex>` over the manifest bytes of the module declaring the bundle's object types; where more than one module declares them, over the concatenation of their manifest bytes in module-name order.
- The frontend SHALL set `package.mappingVersions` to the one-element list holding the module's `semantic.contract_version`, and `package.profileVersions` to `[]`.
- The frontend SHALL set `package.lockDigest` to `sha256:<hex>` over the lines `<module package>@<module version>:<manifest sha256>`, one per loaded module, sorted by code point and each terminated by `\n`.
- The frontend SHALL emit `occurrences: []` and top-level `extensions: []`.

### Node identities

- The frontend SHALL mint `ix://<org>/<name>/type/<DisplayName>` for a type, `ix://<org>/<name>/field/<record-slug>-<fieldName>` for a field, `ix://<org>/<name>/constraint/<record-slug>-<fieldName>-<keyword>` for a constraint, `ix://<org>/<name>/relationship/<record-slug>-<name>` for a relationship, `ix://<org>/<name>/operation/<record-slug>-<name>` for an operation, and `ix://<org>/<name>/clause/<record-slug>-<clauseId>` for a clause.
- `<record-slug>` SHALL be the record's `displayName` lowercased, every run of non-alphanumeric characters replaced by one `-`, with no leading or trailing `-`.
- If a name slugs to the empty string, then the frontend SHALL raise `agent-ix.extraction-frontend.UNSLUGGABLE_NAME` at the declaration's locus, blocking.
- Every minted identity SHALL match `common.schema.json#/$defs/semanticIdentity`.

### Provenance

- The frontend SHALL write `<out>.provenance.json` carrying the bundle root and module roots as the caller supplied them relative to the working directory, each module's `name`, `version`, and manifest `sha256`, the `quire-rs` crate version and git revision, the vendored semantic-core version, and the frontend crate version.
- The provenance record SHALL carry no clock reading, hostname, username, absolute path, or environment value, per FR-019-CON-1.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-095-CON-1 | Every value in the emitted `source` and `package` blocks SHALL be a pure function of loaded document bytes, loaded manifest bytes, and pinned crate metadata; two lifts of one checkout on two hosts produce identical envelopes. | Determinism | Test |
| FR-095-CON-2 | The frontend SHALL NOT read the bundle's git history, tags, or remotes to mint a version or digest. | Determinism | Static analysis |
| FR-095-CON-3 | The frontend SHALL NOT widen `frontendDialect`; `spec-bundle` is the only value it stamps. | Compatibility | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-095-AC-1 | The `config-version` fixture lifts with `source.identity` `ix://agent-ix/config-service/spec`, `source.dialect` `spec-bundle`, and `package.identity` `agent-ix/config-service`. | Test (TC-1246) |
| FR-095-AC-2 | A `spec.md` with `version: 2.1.0` yields `source.version` and `package.version` `2.1.0`; one without yields `0.0.0`. | Test (TC-1247) |
| FR-095-AC-3 | `source.digest` equals an independently computed SHA-256 over the stated path/NUL/bytes/NUL recipe, and changing one byte of one document changes it. | Test (TC-1248) |
| FR-095-AC-4 | `package.manifestDigest` equals the SHA-256 of the module manifest bytes, and `lockDigest` equals the SHA-256 of the sorted `<package>@<version>:<sha256>\n` lines, each asserted against an independent computation. | Test (TC-1249) |
| FR-095-AC-5 | `mappingVersions` is `["1.0.0"]` for the spec-objects-business module and `profileVersions` is `[]`; `occurrences` and top-level `extensions` are `[]`. | Test (TC-1250) |
| FR-095-AC-6 | Every identity in the emitted fixture document matches its minting pattern and `semanticIdentity`, asserted by regex over every node. | Test (TC-1251) |
| FR-095-AC-7 | `slug("Config Version")` is `config-version`, `slug("A__B--C")` is `a-b-c`, `slug("--")` is `Unsluggable`, and an artifact titled `"---"` raises `UNSLUGGABLE_NAME` at its frontmatter, blocking. | Test (TC-1252) |
| FR-095-AC-8 | Lifting the same checkout twice from two different working directories and two different `HOME` values yields byte-identical documents and byte-identical provenance records. | Test (TC-1253) |
| FR-095-AC-9 | The provenance record names the `quire-rs` version and git revision that `Cargo.lock` pins, asserted by reading the lock. | Test (TC-1254) |
| FR-095-AC-10 | A pattern scan over the provenance record and the document finds no absolute path, no ISO 8601 timestamp, no hostname, and no username. | Test (TC-1255) |
| FR-095-AC-11 | Two modules declaring object types yield `manifestDigest` over their concatenation in module-name order, and swapping the order of the caller's module roots does not change it. | Test (TC-1256) |
| FR-095-AC-12 | A grep of `crates/extraction-frontend/src/` finds no `git2`, no `Command::new("git")`, and no `std::env::var`. | Analysis (TC-1257) |
| FR-095-AC-13 | The emitted envelope validates against `semantic-ir.schema.json` `source` and `package` with zero `INVALID_IR` diagnostics. | Test (TC-1258) |

## Dependencies

- **Upstream**: [FR-091](./FR-091-read-a-spec-bundle-through-the-extraction-contract.md), [FR-019](./FR-019-select-v1-structural-source-and-ir.md), [FR-020](./FR-020-define-semantic-type-system-and-identity.md), [FR-021](./FR-021-define-package-graphs-exports-and-locks.md), [FR-048](./FR-048-build-and-verify-the-lock-and-fingerprint.md), [FR-030](./FR-030-bind-source-dialect-and-manifest-targets.md)
- **Downstream**: [FR-097](./FR-097-normalize-validate-and-write-the-lifted-document.md), [FR-098](./FR-098-prove-fixture-goldens-and-cross-frontend-parity.md), [FR-099](./FR-099-provide-the-extraction-frontend-command-line.md)
- **Constrained by**: [NFR-031](../non-functional/NFR-031-deterministic-and-hermetic-lifting.md), [NFR-032](../non-functional/NFR-032-non-disruptive-extraction-frontend.md)
