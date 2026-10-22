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
  - target: "ix://agent-ix/filament-core-data/FR-030"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-048"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-034"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-053"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-031"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-032"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-033"
    type: "constrained_by"
---
# [FR-095] Mint package identity, envelope digests, node identities, and provenance

## Description

The extraction frontend SHALL derive the IR document's `source` and `package`
envelope and every node identity from loaded bundle
bytes, loaded manifest bytes, and pinned crate metadata alone, so that every
value in the emitted document traces to a source byte or a manifest value and
none is inferred from the host.

## Rationale

`source.dialect` is `spec-bundle` because the Markdown bundle is the authored
source and the extraction record is not a projection of it; this is the
declared reading of issue #77, cited here, and it changes no byte of
`schema/**`. The identity grammar is FR-020's; the `spec-bundle` value is
FR-030's. The quire-rs pin is a git `rev` (at or after `a874fb6`, quire-rs#411)
because no release tag contains it; the pin moves to a tag under quire-agent-c's
sweep (quire-rs#417).
Node identities are minted by the one rule of
`docs/semantic-data-system/contracts-v1.md` §Identity minting (issue #87,
CR-087-1), which FR-034 originates and FR-053 implements in
`src/compiler/frontend/typespec/identity.mjs`, so that the TypeSpec frontend
and this frontend mint one identity for one declaration; the slot list below
restates the contract's table and yields to it where they differ. A field,
operation or operation parameter name is the member name verbatim, so a field
named `created_at` mints `<Name>/created_at` on both sides and equals the
member name QSpec FR-154 requires as the identity's last segment; every other
name part is slugged, while the `<Name>` part this frontend takes from the artifact id
(FR-143) is that id verbatim, because an object id carries `_` and
`semanticIdentity` admits `_` inside a segment: `AR_001` mints `AR_001`,
not `AR-001`. The shared table
of AC-16 lives inside the crate and its node side is a verb of the harness
FR-099-CON-1 already names, so FR-098-CON-1, FR-098-AC-10, FR-099-CON-1,
FR-099-AC-5, and NFR-032's permitted list need no widening and no file under
`test/` is added or edited for issue #87 (CR-087-2).

## Inputs

- The bundle's `spec.md` frontmatter `org`, `name`, and optional `version`, already refused by FR-091 (`BUNDLE_UNIDENTIFIED`) when absent or not matching `packageIdentity`
- Every loaded document's bundle-root-relative path and raw bytes, from FR-091
- Each loaded module's manifest bytes, `name`, `version`, and `semantic.contract_version`
- The root `Cargo.lock`, embedded at build time with `include_str!`, for the `quire-rs` version and git revision NFR-033 pins and the frontend crate's own version
- The `displayName` FR-093 fixes for each record, and the kernel scalar name FR-092 fixes for each scalar definition

## Outputs

- `crates/extraction-frontend/src/identity.rs`: `PackageIdentity`, `slug(name) -> Result<String, Unsluggable>` for a name part, `id_segment(id) -> Result<String, Unsluggable>` for an artifact id part, the `type_identity`, `alias_identity`, `field_identity`, `constraint_identity`, `relationship_identity`, `operation_identity`, `param_identity`, `variant_identity`, `clause_identity`, `state_identity`, `transition_identity` and `step_identity` minters (`param_identity` mints `<owner operation identity>/<param-slug>`, one level deeper than its operation, never under a `param/` slot), `diagnostic_code`, and the collision check that raises `DUPLICATE_IDENTITY` over every minted identity of one lift
- `crates/extraction-frontend/fixtures/identity-cases/identity-cases.json`: the shared identity table of AC-16, authored from `contracts-v1.md` §Identity minting, with four row shapes — identity rows (`package`, `slot`, `parts`, `identity`), alias rows (`package`, `record`, `field`, `identity`, `displayName`), `diagnosticCode` rows (`package`, `parts`, `keyword`, `code`), and refusal rows (`package`, `slot`, `parts`, `refuses: "UNSLUGGABLE_NAME"`); its rows include `Snap Shot`, `Snap_Shot`, `created_at`, `minLength`, `core.data`, and `_`
- The `identity-cases --table <file>` verb of `scripts/extraction-frontend-harness.mjs`, which imports `src/compiler/frontend/typespec/identity.mjs` and prints, for every row of the table, what that implementation mints or refuses; the Rust test of AC-16 runs it over the same table and compares. No file under `test/` is added or edited, and FR-098-CON-1, FR-098-AC-10, FR-099-CON-1, FR-099-AC-5, and NFR-032 need no widening: the table is under `crates/extraction-frontend/**` and the harness is already one of FR-099-CON-1's six paths
- `crates/extraction-frontend/src/envelope.rs`: `source_block(bundle)`, `package_block(bundle, modules)`

## Behavior

### The `source` block

- The frontend SHALL set `source.identity` to `ix://<org>/<name>/spec`.
- The frontend SHALL set `source.dialect` to `spec-bundle`.
- The frontend SHALL set `source.version` to the `spec.md` frontmatter `version` where present and to `0.0.0` otherwise.
- The frontend SHALL set `source.digest` to `sha256:<hex>` over the byte sequence formed, for each loaded document in path order under code-point comparison, by the document's bundle-root-relative path bytes, one `0x00` byte, the document's raw bytes, one `0x00` byte.

### The `package` block

- The frontend SHALL set `package.identity` to `<org>/<name>`.
- The frontend SHALL set `package.version` to the same value as `source.version`.
- The frontend SHALL set `package.manifestDigest` to `sha256:<hex>` over the concatenation of the manifest bytes of every loaded module, in module-name order, not only of the module declaring the bundle's object types.
- The frontend SHALL set `package.mappingVersions` to the one-element list holding the module's `semantic.contract_version`.
- The frontend SHALL set `package.profileVersions` to `[]`.
- The frontend SHALL set `package.lockDigest` to `sha256:<hex>` over the lines `<module package>@<module version>:<manifest sha256>`, where `<module package>` is the module's `semantic.package` (for example `agent-ix/spec-objects-business@0.7.0:<sha256>`), one per loaded module, sorted by code point and each terminated by `\n`.
- The frontend SHALL emit `occurrences: []` and top-level `extensions: []`.

### Node identities

- The frontend SHALL mint every node identity by the rule of `docs/semantic-data-system/contracts-v1.md` §Identity minting, rooted at `ix://<org>/<name>/`.
- The frontend SHALL mint no identity by any other rule.
- The closed slot list, with `<Name>` the declaring artifact's id (FR-143) passed through verbatim and every other `<…>` part passed through `slug` (a field, operation, operation parameter, clause, state, transition or step member name is passed through verbatim under the member-name rule below), is:
  - type: `ix://<org>/<name>/<artifact id>` (artifact `FR-005` → `FR-005`; artifact `AR_001` → `AR_001`), or `<KernelScalar>` for a scalar definition (a kernel scalar name is alphanumeric, so it too is itself; the same rule FR-046 applies); a type definition mints no slot segment of its own
  - constrained-field alias: `ix://<org>/<name>/<Name><Field>`, where `<Field>` is `slug(field)` with its first character upper-cased (`FR-001`, `revision` → `FR-001Revision`; `FR-001`, `created_at` → `FR-001Created-at`), the alias FR-093 mints per field carrying constraints; the alias node's `displayName` is the artifact's `displayName` followed by the field name verbatim with its first character upper-cased (`NoteRevision`, `NoteCreated_at`); an alias mints no slot segment of its own, the same as a type definition
  - field: `<owner type identity>/<field>`, i.e. `ix://<org>/<name>/<Name>/<field>`; a member mints no slot segment of its own — its identity is its owner's identity, `/`, and its own name verbatim (`FR-001`, `created_at` → `FR-001/created_at`)
  - operation: `<owner type identity>/<operation>`, i.e. `ix://<org>/<name>/<Name>/<operation>`, the same nesting rule and verbatim name as a field (`reset_all` → `<Name>/reset_all`)
  - operation parameter: `<owner operation identity>/<param>`, i.e. `ix://<org>/<name>/<Name>/<operation>/<param>`, its name verbatim; a parameter nests one level deeper than its operation, never under a `param/` slot
  - constraint on a field: `ix://<org>/<name>/constraint/<Name>-<field>-<keyword>`
  - constraint on a value type (a scalar or alias definition's own `constraints`, `appliesTo` the type): `ix://<org>/<name>/constraint/<Name>/<keyword>`, `<Name>` the value type's artifact id (`Code`, `maxLength` → `constraint/Code/maxLength`); the keyword nests under the owner with `/`, which no field-constraint identity contains, so a value type `A-b` with `min` (`constraint/A-b/min`) and a record `A` with a field `b` and `min` (`constraint/A-b-min`) mint different identities
  - relationship: `ix://<org>/<name>/relationship/<Name>-<verb>-<TargetName>`, with `<TargetName>` the target artifact's id
  - enumeration variant: `ix://<org>/<name>/variant/<Name>-<value>`
  - clause: `<owner type identity>/<clauseId>`, i.e. `ix://<org>/<name>/<Name>/<clauseId>` (`AR_001`, `single_root` → `AR_001/single_root`)
  - state: `<owner type identity>/<state>` (`SM_001`, `placed` → `SM_001/placed`)
  - transition: `<owner type identity>/transition<i>`, `<i>` the transition's zero-based position among its owner's `Transitions` rows (`SM_001`, third row → `SM_001/transition2`); a transition row has no name, so its member name is `transition` followed by that position and is never derived from its from state, to state or trigger operation
  - step: `<owner type identity>/<step>` (`PR_001`, `picked` → `PR_001/picked`)
- A type definition, a constrained-field alias, a field, an operation, an operation parameter, a clause, a state, a transition, and a step mint no `NodeKind` segment of their own; every other kind (both constraint forms, `relationship`, `variant`) still mints under its own closed `NodeKind` segment.
- The owner of a clause, state, transition or step is the type that declares it, and its identity is exactly the owner's identity, `/`, and one member name, so the same member name under two owners mints two identities.
- The frontend SHALL pass a clause's `clauseId`, a state's name and a step's name through verbatim as the member name, so that each equals the last segment of its node's identity, and SHALL accept it only when it matches `^[A-Za-z][A-Za-z0-9_]*$`; a transition's member name `transition<i>` matches that pattern by construction.
- The frontend SHALL pass a field's, an operation's and an operation parameter's name through verbatim as the member name, so that each equals the last segment of its node's identity, and SHALL accept it only when it matches `^[A-Za-z][A-Za-z0-9_]*$`; if it does not (`_tmp`, `created at`), then the frontend SHALL raise `agent-ix.extraction-frontend.UNSLUGGABLE_NAME` at the declaring row, blocking, SHALL mint no identity for it, and the artifact that declares it SHALL lift to no definition.
- If a clause `clauseId`, a state name or a step name does not match `^[A-Za-z][A-Za-z0-9_]*$` (`_hold`; the engine already refuses a name with a space, a hyphen or a leading digit), then the frontend SHALL raise `agent-ix.extraction-frontend.UNSLUGGABLE_NAME` at the declaring row, blocking, SHALL mint no identity for it, and the artifact that declares it SHALL lift to no definition.
- The frontend SHALL NOT compare transition rows semantically: two transition rows of one machine with equal `from`, `to` and `trigger` mint two distinct identities, `transition<i>` and `transition<j>`, and raise nothing. The producer names the members, and refusing equal rows is the consumer's rule (QSL's `qsl-semantics` normalizer refuses them by shape).
- If a clause, state, transition or step mints the identity of another member of its owner (a field, operation, clause, state, transition or step: state `advance` beside operation `advance`, state `transition0` beside the first transition), then the frontend SHALL raise `DUPLICATE_IDENTITY` at the later node by the collision rule below.
- The frontend SHALL compute `slug(value)` as the contract states it: every run of characters outside ASCII `[A-Za-z0-9]` replaced by one `-`, leading and trailing `-` trimmed, case preserved (`Snap Shot` → `Snap-Shot`, `created_at` → `created-at`, `versionNumber` → `versionNumber`); a non-ASCII letter is a separator (`semanticIdentity` admits only `[A-Za-z0-9._~:/-]`). Each name part is slugged and the parts are joined by `-`.
- The frontend SHALL pass the `<Name>` part — the declaring artifact's id — through verbatim, and SHALL NOT slug it: `semanticIdentity` admits `.`, `_`, `~` and `-` inside a segment, so an id is already a segment. If an artifact id carries a character that segment does not admit, or carries no ASCII alphanumeric at all, then the frontend SHALL raise `UNSLUGGABLE_NAME` at the declaration's locus, blocking, and SHALL mint no identity for it.
- If a part slugs to the empty string, then the frontend SHALL raise `agent-ix.extraction-frontend.UNSLUGGABLE_NAME` at the declaration's locus, blocking, and SHALL NOT drop the part or mint the identity.
- The frontend SHALL derive each constraint's `diagnosticCode` as the contract states it: `agent-ix.<slug(name) lower-cased>.<UPPER_SNAKE(Name)>_<UPPER_SNAKE(field)>_<UPPER_SNAKE(keyword)>`, where `UPPER_SNAKE` is `slug` with `-` replaced by `_` and upper-cased and a camelCase name or keyword is not split (`Note`, `revision`, `min` under package `records-and-scalars` → `agent-ix.records-and-scalars.NOTE_REVISION_MIN`; `maxLength` → `MAXLENGTH`).
- The frontend SHALL treat a `diagnosticCode` as a datum and not as an identity: two constraints on distinct identities whose codes coincide across records (`Status.id` and `status.id` under `min`, both `STATUS_ID_MIN`) raise nothing; FR-093's per-record `DUPLICATE_CONSTRAINT` is the only code-level check.
- The frontend SHALL mint identities that match `common.schema.json#/$defs/semanticIdentity`.
- The frontend SHALL apply the contract's three collision cases in order: (a) FR-093's `DUPLICATE_TYPE_NAME` over equal verbatim `displayName` values and kernel-scalar names, before any identity is minted; then (b) `UNSLUGGABLE_NAME` at the later of two distinct names whose slugs coincide (two enumeration rows slugging alike, FR-093); two distinct artifact ids and two distinct field, operation or parameter names never reach case (b), because each is its segment verbatim (`FR_001` and `FR__001` mint two identities, and so do fields `created_at` and `created__at` of one record); then (c) `DUPLICATE_IDENTITY` over every other pair of minted identities, so that a node refused under (a) or (b) is never a party to (c).
- If two nodes of one lift mint the same identity and neither is refused under case (a) or (b) (an artifact with id `FR-001Revision` beside artifact `FR-001` with a constrained field `revision`, whose alias is `FR-001Revision`; a field and an operation of the same owner sharing one name, both minting `<owner>/<name>`), then the frontend SHALL raise `agent-ix.extraction-frontend.DUPLICATE_IDENTITY` at the later node, blocking, naming both identities and carrying the earlier node's locus in `related`.
- If two nodes of one lift mint the same identity, then the frontend SHALL NOT emit either node under that identity.
- The frontend SHALL order nodes for every collision case with kernel scalar definitions before every authored declaration, and authored declarations by bundle-root-relative path, then start line, then start column.
- The frontend SHALL mint distinct identity sets for two artifacts with distinct ids, whatever their `displayName` values.
- If an artifact id mints no segment (`_`, an id of non-ASCII letters only), then the frontend SHALL raise `UNSLUGGABLE_NAME` at the artifact's frontmatter before lowering it, blocking, and SHALL mint no identity for it.
- If an artifact id is the name of a kernel scalar the bundle uses (`UUID`), then the frontend SHALL raise blocking `DUPLICATE_TYPE_NAME` at the artifact naming the scalar, because both mint that type identity.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-095-CON-1 | The frontend SHALL compute every value in the emitted `source` and `package` blocks as a pure function of loaded document bytes and loaded manifest bytes. | Determinism | Test |
| FR-095-CON-2 | The frontend SHALL NOT read the bundle's git history, tags, or remotes to mint a version, digest, or revision. | Determinism | Static analysis |
| FR-095-CON-3 | The frontend SHALL NOT widen `frontendDialect`; `spec-bundle` is the only value it stamps. | Compatibility | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-095-AC-1 | The `snapshot-table` fixture lifts with `source.identity` `ix://agent-ix/docs-service/spec`, `source.dialect` `spec-bundle`, and `package.identity` `agent-ix/docs-service`. | Test (TC-1246) |
| FR-095-AC-2 | A `spec.md` with `version: 2.1.0` yields `source.version` and `package.version` `2.1.0`; one without yields `0.0.0`. | Test (TC-1247) |
| FR-095-AC-3 | `source.digest` equals a SHA-256 computed by `sha256sum` over the stated path/NUL/bytes/NUL recipe assembled outside the crate, and changing one byte of one document changes it. | Test (TC-1248) |
| FR-095-AC-4 | `package.manifestDigest` equals the `sha256sum` of every loaded module's manifest bytes concatenated in module-name order, and `lockDigest` equals the `sha256sum` of the sorted `<semantic.package>@<version>:<sha256>\n` lines (`fixture/domain@0.1.0:<sha256>` for the `fixture-domain` module), each computed outside the crate. | Test (TC-1249) |
| FR-095-AC-5 | `mappingVersions` is `["1.0.0"]` for the `fixture-domain` module and `profileVersions` is `[]`; `occurrences` and top-level `extensions` are `[]`. | Test (TC-1250) |
| FR-095-AC-6 | Every identity in the emitted `business` fixture document matches one of two closed shapes and `semanticIdentity`: a type definition, kernel scalar definition, or constrained-field alias is `ix://<org>/<name>/<tail>` with no further `/` in `<tail>`; a field, operation, clause, state, transition or step is `<owner type identity>/<name>` and an operation parameter is `<owner operation identity>/<param>`, nesting under its owner rather than any slot; every other node (`constraint`, `relationship`, `variant`) is `ix://<org>/<name>/<kind>/<tail>` under the closed `NodeKind` list, and no identity occupies a `type/`, `field/`, `operation/`, `param/`, `clause/`, `state/`, `transition/` or `step/` slot of its own, asserted over every node. | Test (TC-1251) |
| FR-095-AC-7 | `slug("Snap Shot")` is `Snap-Shot`, `slug("A__B--C")` is `A-B-C`, `slug("versionNumber")` is `versionNumber`, `slug("--")` and `slug("_")` are `Unsluggable` (no part is dropped), and an enumeration value reading `_` raises `UNSLUGGABLE_NAME` at that value's locus, blocking; an artifact id is verbatim, so `type_identity("AR_001")` is `AR_001` and `state_identity("SM_001", "placed")` is `SM_001/placed`, while an id carrying a character no segment admits (`Snap Shot`) is `Unsluggable`; an artifact titled `"---"` is not an `Identifier` and fails earlier as `UNNAMEABLE_ARTIFACT` (FR-093), never reaching the slug. | Test (TC-1252) |
| FR-095-AC-8 | Lifting the same checkout twice from two different working directories and two different `HOME` values yields documents byte-identical to each other and to the committed `expected/` golden. | Test (TC-1253) |
| FR-095-AC-10 | A pattern scan over the document finds no absolute path, no ISO 8601 timestamp, no hostname, and no username, including when the lift is invoked with an absolute `BUNDLE=` path. | Test (TC-1255) |
| FR-095-AC-11 | The `objects-extra` module loaded beside the fixture modules yields `manifestDigest` over every loaded manifest concatenated in module-name order, and swapping the order of the caller's module roots does not change it. | Test (TC-1256) |
| FR-095-AC-12 | A grep of `crates/extraction-frontend/src/` finds no `git2`, no `Command::new("git")`, no `std::env::var`, no `env!`, and no `option_env!`; planting `env!("CARGO_PKG_VERSION")` in `envelope.rs` fails the gate. | Static (TC-1257) |
| FR-095-AC-13 | The emitted envelope of every positive fixture passes `agent_ix_semantic_ir::decide` at lift time with zero `INVALID_IR` diagnostics. | Test (TC-1258) |
| FR-095-AC-14 | Two artifacts titled `Status` and `status` under distinct ids, each carrying a field `id` with `min`, mint distinct type identities from their ids with distinct `<id>/*` field-identity sets and two constraints sharing the one code `…STATUS_ID_MIN`, and a bundle holding both lifts with zero diagnostics about them (the positive half; the `negatives/DUPLICATE_TYPE_NAME` fixture is two documents both titled `Status`, FR-093-AC-13); a bundle holding an artifact with id `FR-001Revision` beside artifact `FR-001` with a constrained field `revision` (the `negatives/DUPLICATE_IDENTITY` fixture, contract case (c)) is refused at the later path with `DUPLICATE_IDENTITY` naming the `FR-001Revision` identity, with the earlier locus in `related`, and no document is written; an artifact whose `displayName` equals a kernel scalar name the bundle uses (the `KERNEL_NAME_SHADOWED` fixture, case (a)) is refused at lift level with `DUPLICATE_TYPE_NAME` before any identity is minted. | Test (TC-1347, TC-1351) |
| FR-095-AC-16 | One shared identity table, `crates/extraction-frontend/fixtures/identity-cases/identity-cases.json` (identity rows `package, slot, parts, identity`; alias rows `package, record, field, identity, displayName`; `diagnosticCode` rows `package, parts, keyword, code`; refusal rows `package, slot, parts, refuses: "UNSLUGGABLE_NAME"`; including `Snap Shot`, `Snap_Shot`, `created_at`, `minLength`, a package named `core.data`, and a part `_`), is asserted row by row by a Rust test in `crates/extraction-frontend/tests/` against `identity.rs`; the same test runs `node scripts/extraction-frontend-harness.mjs identity-cases --table <file>` (which imports `src/compiler/frontend/typespec/identity.mjs` and prints what it mints or refuses per row) and compares its output row by row, failing naming `node` when it is absent, so the two implementations are checked by one table and not by two hand-written lists; a planted row that one implementation fails turns the test red naming the implementation; the alias row `Note`, `created_at` asserts identity `NoteCreated-at` and `displayName` `NoteCreated_at` on both sides; every owner part in the table is id-shaped (`Snapshot`, `Note`), because the slug the two implementations share governs name parts and this frontend's owner part is an artifact id it passes through verbatim (TC-1252 asserts that rule). | Test (TC-1352, TC-1353, TC-1354) |
| FR-095-AC-17 | An artifact with id `_`, and one whose id is non-ASCII letters only, each raise one blocking `UNSLUGGABLE_NAME` at the artifact's frontmatter and lower to no definition; an artifact with id `UUID` in a bundle using `UUID` raises blocking `DUPLICATE_TYPE_NAME` naming `UUID`. | Test (TC-1758) |
| FR-095-AC-18 | The shared identity table carries a value-type constraint row (`Snapshot`, `minLength` → `ix://agent-ix/docs-service/constraint/Snapshot/minLength`) and the pair `A-b`/`min` and `A`/`b`/`min` as two distinct rows, beside the field-constraint row, and the Rust and Node minters each produce it. | Test (TC-1352, TC-1353) |
| FR-095-AC-19 | In the emitted `business` document the states of `SM_001` are `ix://agent-ix/orders/SM_001/{draft,placed,shipped,cancelled}`, its transitions `.../SM_001/transition0`, `transition1` and `transition2` in row order with `from`, `to` and `trigger` naming the state and operation identities, the steps of `PR_001` are `.../PR_001/{placed,picked,shipped}` and the clause of `AR_001` is `.../AR_001/single_root`; every clause, state, transition and step identity is its declaring type's identity, `/` and one member name matching `^[A-Za-z][A-Za-z0-9_]*$`, and a state's or step's `name` and a clause's `clauseId` equal that member name. | Test (TC-1837) |
| FR-095-AC-20 | A state `advance` beside operation `advance`, a state `transition0` beside the first transition, a step `id` beside field `id`, and a clause `current` beside field `current`, each of one owner, raise one blocking `DUPLICATE_IDENTITY` naming the shared identity, located at the later node (in the owner's node order: fields, operations, clauses, states, transitions, steps) with the earlier node's declaration in `related`; the same member name under two owners (state `placed` of `SM_001`, step `placed` of `PR_001`) mints two identities and raises nothing. | Test (TC-1838) |
| FR-095-AC-21 | A state named `_hold`, a step named `_pick` and a clause with `clauseId` `_tight` (names the engine admits) each raise one blocking `UNSLUGGABLE_NAME` whose locus is the declaring row (the state row, the step row, the clause's fence), and the artifact that declares the refused member lifts to no definition: the whole state machine or process, with its owner identity absent from the output and each artifact whose relationship targets it (the business fixture's `FR-001`, which owns `SM_001`) `ARTIFACT_NOT_LOWERED`. A state named `on_hold` mints `.../SM_001/on_hold`. | Test (TC-1839) |
| FR-095-AC-22 | Two transition rows of one machine with equal `from`, `to` and `trigger` lift as two transitions `transition<i>` and `transition<j>` with no diagnostic. | Test (TC-1840) |
| FR-095-AC-23 | Artifact `FR-001` with a field `created_at`, an operation `reset_all` and its parameter `created_at` mints `.../FR-001/created_at`, `.../FR-001/reset_all` and `.../FR-001/reset_all/created_at` on both minters, and the shared identity table's `created_at` field row asserts `<owner>/created_at`; fields `created_at` and `created__at` of one record mint two identities and raise nothing; a field named `_tmp` raises one blocking `UNSLUGGABLE_NAME` at its row, mints no identity, and its artifact `FR-001` lifts to no definition; a field `created_at` beside a state `created_at` of one state machine raises `DUPLICATE_IDENTITY` at the state; the constrained-field alias of `created_at` on `FR-001` is `FR-001Created-at`. | Test (TC-1850) |

## Dependencies

- **Upstream**: [FR-091](./FR-091-read-a-spec-bundle-through-the-extraction-contract.md), [FR-019](./FR-019-select-v1-structural-source-and-ir.md), [FR-020](./FR-020-define-semantic-type-system-and-identity.md), [FR-021](./FR-021-define-package-graphs-exports-and-locks.md), [FR-048](./FR-048-build-and-verify-the-lock-and-fingerprint.md), [FR-030](./FR-030-bind-source-dialect-and-manifest-targets.md), [FR-034](./FR-034-lower-semantic-core-declarations-to-ir.md), [FR-053](./FR-053-declare-the-typespec-semantic-vocabulary.md) (the shared identity rule, `docs/semantic-data-system/contracts-v1.md` §Identity minting)
- **Downstream**: [FR-093](./FR-093-lower-field-declarations-to-ir-fields.md), [FR-094](./FR-094-lower-relationships-operations-and-clauses.md), [FR-097](./FR-097-normalize-validate-and-write-the-lifted-document.md), [FR-098](./FR-098-prove-fixture-goldens-and-cross-frontend-parity.md), [FR-099](./FR-099-provide-the-extraction-frontend-command-line.md)
- **Constrained by**: [NFR-031](../non-functional/NFR-031-deterministic-and-hermetic-lifting.md), [NFR-032](../non-functional/NFR-032-non-disruptive-extraction-frontend.md), [NFR-033](../non-functional/NFR-033-qualified-toolchain-and-licensed-dependencies.md)
