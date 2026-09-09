---
id: Task-130
title: "FR-095 identity minters, envelope digests, provenance"
type: Task
status: done
track: B
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-128"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-095"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-1246"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1247"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1248"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1249"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1250"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1252"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1254"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1256"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1257"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1348"
    type: verifies
---
# Task-130: FR-095 identity minters, envelope digests, provenance

## Scope

`identity.rs` (`PackageIdentity`, `slug`, the eight identity minters of the
closed pattern list) and `envelope.rs` (`source_block`, `package_block`,
`provenance_record`) as pure functions of loaded document bytes, loaded
manifest bytes and the embedded `Cargo.lock`. Pure functions; parallel with
Task-129.

## Subtasks

- [x] **Fixtures.** Author `fixtures/modules/objects-extra/` (one object type, `PROVENANCE.json` `authored`) for TC-1256; author `fixtures/negatives/UNSLUGGABLE_NAME/` (artifact titled `---`).
- [x] **Red.** `tests/identity.rs`: `tc_1252_` (`slug("Config Version")`, `slug("A__B--C")`, `slug("--")` → `Unsluggable`, artifact `---` → `UNSLUGGABLE_NAME` blocking at frontmatter), `tc_1257_` (grep gate: no `git2`, `Command::new("git")`, `std::env::var`, `env!`, `option_env!`; planted `env!("CARGO_PKG_VERSION")` in `envelope.rs` fails). `tests/envelope.rs`: `tc_1246_` (identity/dialect/package over the loaded `config-version-table` bundle), `tc_1247_` (`version: 2.1.0` / absent → `0.0.0`), `tc_1248_` (`source.digest` vs `sha256sum` over path‖NUL‖bytes‖NUL in code-point path order, one-byte change flips it), `tc_1249_` (`manifestDigest`, `lockDigest` vs external `sha256sum`), `tc_1250_` (`mappingVersions ["1.0.0"]`, `profileVersions []`, `occurrences []`, `extensions []`), `tc_1254_` (provenance names quire-rs version + rev ≥ `a874fb6` and crate version from the lock the test reads), `tc_1256_` (proptest: module-root order swapped, digest unchanged), `tc_1348_` (module entry sha256 equals the vendored `PROVENANCE.json` value).
- [x] **Green: slug and minters.** Lowercase, runs of non-alphanumerics → one `-`, trimmed; empty → `Unsluggable`. `type_identity` uses `displayName` verbatim; `field/`, `constraint/`, `relationship/`, `operation/`, `param/`, `variant/`, `clause/` use slugs (D8). All match `semanticIdentity`.
- [x] **Green: envelope.** `source` (`ix://<org>/<name>/spec`, `spec-bundle`, version, digest), `package` (`<org>/<name>`, version, `manifestDigest` in module-name order, `mappingVersions`, `profileVersions`, `lockDigest` over sorted `<pkg>@<ver>:<sha256>\n` lines).
- [x] **Green: provenance.** `include_str!("../../../Cargo.lock")` parsed for the `quire-rs` `source = "git+…#<rev>"` and version and the crate's own version; modules by `name`, `version`, manifest sha256 in name order; vendored semantic-core version; no roots, clock, hostname, username, absolute path.
- [x] **Falsify.** Plant `env!` in a scratch `envelope.rs` and prove `tc_1257_` fails.

## Deliverables

- `src/identity.rs`, `src/envelope.rs`; `tests/identity.rs`, `tests/envelope.rs`
- `fixtures/modules/objects-extra/`, `fixtures/negatives/UNSLUGGABLE_NAME/`

## Notes

- `source.dialect: spec-bundle` is the declared reading of issue #77; cite it.
- TC-1251 (identity regex over the `business` fixture) is verified by Task-133 once that fixture exists; TC-1253/TC-1255 (golden + scan) by Task-136; TC-1258 (envelope passes `decide`) by Task-134; TC-1347 (`Status`/`status` slug collision) by Task-132 where `DUPLICATE_TYPE_NAME` is raised.
- Unblocks: Task-131.
