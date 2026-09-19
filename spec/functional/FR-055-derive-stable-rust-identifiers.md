---
id: FR-055
title: "Derive stable, collision-free Rust identifiers"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-011"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-058"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-022"
    type: "constrained_by"
---
# FR-055: Derive stable, collision-free Rust identifiers

## Description

The Rust backend SHALL derive every generated Rust identifier from the declared
name or wire name of the node that owns it by one pure, total function, and SHALL refuse generation
rather than emit two declarations that collide or a name it silently changed, so
that a rename in the generated crate can only follow a change in the contract.

## Inputs

- A type definition's `displayName`, the declared class name, which is the
  derivation source, and its `identity`, the artifact id, which the collision
  and refusal diagnostics name
- A field's, variant's, operation's, and parameter's `identity` and its wire
  `name`
- The IR `package.identity`, of the form `owner/name`
- The Rust reserved-word set for the declared edition, pinned in the repository
- The Unicode `XID_Start` and `XID_Continue` properties for the pinned Unicode
  version

## Outputs

- `src/compiler/backends/rust-serde/names.mjs`: `typeName(definition)`,
  `memberName(node)`, `variantName(node)`, `moduleName(packageIdentity)`,
  `crateName(packageIdentity)`, and `constantName(node)`
- `src/compiler/backends/rust-serde/reserved-words.json`: the pinned reserved
  word list with its Rust edition and its transcription provenance

## Behavior

### The derivation source

- `typeName` and `moduleName` SHALL derive from the type's `displayName`, the
  declared class name. The type's `identity` is the artifact id (`FR-006`),
  which names the contract; the declared name (`ConfigVersion`) names the class,
  and it is what a consumer of the crate writes.
- A type's constant prefix (`<TYPE>_RELATIONSHIPS`, `<TYPE>_OPERATIONS`) SHALL
  derive from its `displayName` by the same rule.
- `variantName`, `memberName`, and a member's `constantName` SHALL derive from the node's
  wire `name`, because a member's wire name *is* its contract and the
  cross-field rules already make it unique within its scope — a duplicate field
  name and a duplicate parameter name are both published defects. The node's
  `identity` is carried into the collision diagnostic so a refusal names the two
  identities and not two spellings of one name.
- The backend SHALL NOT derive a type identifier from the type's `identity`.
- `displayName` is constrained only to `minLength: 1` and no rule makes it
  unique, so two types whose display names are `HTTPStatusCode` and
  `HTTP status code` render one identifier; the crate's re-export scope SHALL
  refuse that pair with `NAME_COLLISION` naming both identities.
- `crateName` SHALL be the `package.identity` with its `/` replaced by `-`,
  because a Cargo package name may not contain `/`.

### Rendering

- `typeName` and `variantName` SHALL be the `UpperCamelCase` rendering of the
  source; `memberName` and `moduleName` SHALL be its `snake_case` rendering;
  `constantName` SHALL be its `SCREAMING_SNAKE_CASE` rendering.
- The rendering SHALL segment on the boundaries `[a-z0-9]|[A-Z]`,
  `[A-Z]|[A-Z][a-z]`, and any run of characters that is neither `XID_Continue`
  nor an ASCII digit, and SHALL drop those runs, so `HTTPStatusCode` segments as
  `HTTP`, `Status`, `Code`.
- Case conversion SHALL use the Unicode simple, locale-independent case
  mappings for the pinned Unicode version, never a host locale's mapping, so a
  Turkish locale cannot change a generated identifier.
- Where the source carries a character `XID_Continue` admits, the backend SHALL
  render it faithfully; Rust has accepted non-ASCII identifiers since 1.53.
- If the source carries a character that is neither `XID_Continue` nor an ASCII
  digit nor a separator the segmenter drops, then the backend SHALL raise a
  blocking `agent-ix.rust-backend.UNRENDERABLE_NAME`. The backend SHALL NOT drop
  a character it cannot render: dropping the diaeresis from `Größe` to reach
  `GrE` is exactly the silent degradation FR-058 exists to forbid.
- Where a rendering begins with a character that is not `XID_Start`, the backend
  SHALL prefix it with `_`.
- Where a rendering is empty, the backend SHALL raise `UNRENDERABLE_NAME`
  naming the identity, rather than substituting a positional name.
- Where a rendering is a Rust reserved word, the backend SHALL emit the raw
  identifier form `r#<word>`, except for `crate`, `self`, `super`, and `Self`,
  which have no raw form; for those it SHALL raise `UNRENDERABLE_NAME`.

### Wire names

- Where the derived Rust identifier differs from the node's wire `name`, the
  backend SHALL emit `#[serde(rename = "<wire name>")]`; where they are equal it
  SHALL emit none, so the emitted attribute set is a function of the difference
  and not of the emitter's convenience.

### Scopes and collisions

- The Rust scopes this requirement quantifies over SHALL be exactly: the crate's
  re-export namespace for type names, which also holds each state machine's
  `<Name>State` enum; one record's member set for member names, which for an
  `event` also holds its `try_new` and `validate` methods, since its accessors
  share their namespace;
  one enum's or union's variant set for variant names; and one operation's
  parameter set for parameter names.
- If two nodes in one such scope derive the same identifier, then the backend
  SHALL raise one blocking `agent-ix.rust-backend.NAME_COLLISION` diagnostic
  naming both semantic identities and the shared identifier, and SHALL write no
  file.
- The backend SHALL NOT resolve a collision by appending a counter, a hash, or a
  positional suffix, because such a suffix moves when an unrelated declaration is
  added and the generated name would then depend on document order rather than on
  the contract.
- If a `kind: scalar` definition's `scalar` selects a support-type mapping row
  in `mapping-table.json`, then the backend SHALL emit no newtype for it.
- If a `kind: scalar` definition's `scalar` selects a support-type mapping row
  in `mapping-table.json`, then the backend SHALL render every `typeRef` to it
  as the row's `crate::support::<Support>` type.
- If a `kind: scalar` definition's `scalar` selects a support-type mapping row
  in `mapping-table.json`, then the backend SHALL treat the crate's existing
  re-export of that support type as the definition's rendering.
- If a definition derives a reserved crate name and is not a `kind: scalar`
  definition whose `scalar` selects that support-type mapping row, then the
  backend SHALL raise `NAME_COLLISION` naming both identities and SHALL write no
  file.

The support-type rows are `date`, `datetime`, `duration`, and `uuid`; a kernel
scalar is a known quantity rather than a user type (agent-ix/filament-core-data#90,
owner ruling of 2026-09-09). The backend decides this mapping before entering
the derived identifier into the crate scope.

### Stability

- A derived identifier SHALL depend only on the node's own derivation source —
  never on its position in a list, on the size of the document, on the
  identifiers other nodes derived, or on any input outside the document and the
  pinned tables.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-055-CON-1 | The derivation SHALL be injective within each declared scope, and SHALL raise `NAME_COLLISION` rather than make two identities distinct by mangling. | Correctness | Test |
| FR-055-CON-2 | The reserved-word list and the Unicode version SHALL be pinned in the repository with their provenance recorded, so a toolchain upgrade that adds a keyword is a visible diff. | Maintainability | Inspection |
| FR-055-CON-3 | `names.mjs` SHALL read no input other than its argument and the pinned tables. | Purity | Analysis |
| FR-055-CON-4 | The backend SHALL NOT silently alter a name. Every character the renderer cannot carry SHALL produce `UNRENDERABLE_NAME`. | Correctness | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-055-AC-1 | Display names `HTTPStatusCode`, `http_status_code`, `httpStatusCode`, and `HTTP-status-code` all derive the type name `HttpStatusCode`; wire names `HTTPStatusCode`, `http_status_code`, `httpStatusCode`, and `HTTP status code` all derive the member name `http_status_code`. | Test (TC-658) |
| FR-055-AC-2 | Every Rust reserved word used as a member name derives `r#<word>` and the emitted crate compiles; `crate`, `self`, `super`, and `Self` each raise `UNRENDERABLE_NAME` and write no file. | Test (TC-659) |
| FR-055-AC-3 | A name rendering to the empty string raises `UNRENDERABLE_NAME` naming the semantic identity. | Test (TC-660) |
| FR-055-AC-4 | A name beginning with a digit derives an identifier prefixed with `_` and the crate compiles. | Test (TC-661) |
| FR-055-AC-5 | Two distinct nodes in one declared scope whose identities derive the same identifier raise one `NAME_COLLISION` naming both identities, and no file is written. | Test (TC-662) |
| FR-055-AC-6 | Every derived identifier that differs from the wire name carries a `#[serde(rename)]` to the wire name, and every identifier equal to its wire name carries none, checked over every generated member of the corpus bases. | Test (TC-663) |
| FR-055-AC-7 | Adding an unrelated type to a document changes no other type's, field's, or variant's derived identifier, and reordering a document's `types`, `fields`, and `variants` arrays changes none of them. | Test (TC-664) |
| FR-055-AC-8 | Over generated identities, the derivation is injective within a scope or raises `NAME_COLLISION`; it never silently produces a duplicate. | Test (TC-664) |
| FR-055-AC-9 | `names.mjs` reads no ambient input, verified by a scan of its module graph and by running it with the filesystem, clock, and environment accessors stubbed to throw. | Analysis (TC-664) |
| FR-055-AC-10 | The pinned reserved-word list equals the Rust reserved and reserved-for-future word set for the declared edition, compared against a transcribed copy of the language reference table committed beside it. | Analysis (TC-665) |
| FR-055-AC-11 | `Größe`, `naïve size`, `Ärger`, and a CJK name each render faithfully to a legal Rust identifier and the emitted crate compiles; a character `XID_Continue` does not admit raises `UNRENDERABLE_NAME`. In no case is a name silently rendered to `GrE`, `NaVeSize`, `Rger`, or the empty string. | Test (TC-660) |
| FR-055-AC-12 | Derivation under `LANG=tr_TR.UTF-8` produces identifiers identical to derivation under `LANG=C`, for a source containing `i` and `I`. | Test (TC-664) |
| FR-055-AC-13 | A type whose identity is `ix://agent-ix/config-service/FR-006` and whose `displayName` is `ConfigVersion` derives the type name `ConfigVersion` and the module name `config_version`, and two types whose `displayName` values render one identifier raise one `NAME_COLLISION` in the re-export scope naming both identities; and a field whose identity's final segment differs from its wire `name` derives its member name from the wire `name`, so the emitted member needs no `serde(rename)`. | Test (TC-658) |
| FR-055-AC-14 | `crateName` of `agent-ix/assurance` is `agent-ix-assurance`, and a Cargo manifest carrying it is accepted by `cargo metadata`. | Test (TC-665) |
| FR-055-AC-15 | A document declaring a `kind: scalar`, `scalar: uuid` definition whose `displayName` is `UUID`, and a record field whose `typeRef` names it, generates with zero diagnostics, emits no newtype for the definition, and renders the field's type as `crate::support::Uuid`; the same holds for `date`, `datetime`, and `duration` definitions deriving `Date`, `DateTime`, and `Duration`. | Test (TC-1357) |
| FR-055-AC-16 | A `kind: scalar`, `scalar: string` definition whose `displayName` is `Uuid` raises one `NAME_COLLISION` naming both `ix://agent-ix/filament-core-data/rust-backend/reserved/Uuid` and the definition's identity, and writes no file; a `kind: record` definition deriving `Date` raises the same. | Test (TC-1358) |
| FR-055-AC-17 | Generating the lifted `config-version-table` golden, whose types carry artifact-id identities and declared display names, emits `src/types/config_version.rs` declaring `pub struct ConfigVersion`, emits no module or type named from an artifact id, and maps `SemanticType::ConfigVersion` to the identity `ix://agent-ix/config-service/FR-006`. | Test (TC-1766) |
| FR-055-AC-18 | An `event` member named `validate` or `try_new`, and a type whose display name derives a state machine's `<Name>State`, each raise one `NAME_COLLISION` naming the colliding identity and write no file. | Test (TC-1779) |

## Dependencies

- **Upstream**: [FR-058](./FR-058-refuse-unsupported-constructs-with-stable-diagnostics.md)
- **Downstream**: [FR-054](./FR-054-map-the-semantic-ir-to-rust-serde-declarations.md), [FR-056](./FR-056-emit-the-generated-rust-crate.md), [FR-060](./FR-060-produce-deterministic-rustfmt-clean-output.md)
- **Constrained by**: [NFR-022](../non-functional/NFR-022-deterministic-and-hermetic-rust-generation.md)
