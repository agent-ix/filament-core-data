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

The Rust backend SHALL derive every generated Rust identifier from the semantic
identity that owns it by one pure, total function, and SHALL refuse generation
rather than emit two declarations that collide or a name it silently changed, so
that a rename in the generated crate can only follow a change in the contract.

## Inputs

- A type definition's `identity`, whose final `/`-delimited segment is the
  derivation source
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

- `typeName` SHALL derive from the final `/`-delimited segment of the type's
  `identity`; `variantName`, `memberName`, and `constantName` SHALL derive from
  the node's `identity` final segment where the node carries one and from its
  wire `name` otherwise.
- The backend SHALL NOT derive an identifier from `displayName`. `displayName`
  is constrained only to `minLength: 1`, no rule makes it unique, and two
  records whose display names are `HTTPStatusCode` and `HTTP status code` carry
  distinct identities and distinct wire names while rendering one identifier.
  `displayName` reaches the crate only as documentation text.
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
  re-export namespace for type names; one record's member set for member names;
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
| FR-055-AC-1 | Identities ending `HTTPStatusCode`, `http_status_code`, `httpStatusCode`, and `HTTP-status-code` all derive the type name `HttpStatusCode` and the member name `http_status_code`. | Test (TC-658) |
| FR-055-AC-2 | Every Rust reserved word used as a member name derives `r#<word>` and the emitted crate compiles; `crate`, `self`, `super`, and `Self` each raise `UNRENDERABLE_NAME` and write no file. | Test (TC-659) |
| FR-055-AC-3 | A name rendering to the empty string raises `UNRENDERABLE_NAME` naming the semantic identity. | Test (TC-660) |
| FR-055-AC-4 | A name beginning with a digit derives an identifier prefixed with `_` and the crate compiles. | Test (TC-661) |
| FR-055-AC-5 | Two distinct nodes in one declared scope whose identities derive the same identifier raise one `NAME_COLLISION` naming both identities, and no file is written. | Test (TC-662) |
| FR-055-AC-6 | Every derived identifier that differs from the wire name carries a `#[serde(rename)]` to the wire name, and every identifier equal to its wire name carries none, checked over every generated member of the corpus bases. | Test (TC-663) |
| FR-055-AC-7 | Adding an unrelated type to a document changes no other type's, field's, or variant's derived identifier, and reordering a document's `types`, `fields`, and `variants` arrays changes none of them. | Test (TC-664) |
| FR-055-AC-8 | Over generated identities, the derivation is injective within a scope or raises `NAME_COLLISION`; it never silently produces a duplicate. | Test (TC-664) |
| FR-055-AC-9 | `names.mjs` reads no ambient input, verified by a scan of its module graph and by running it with the filesystem, clock, and environment accessors stubbed to throw. | Analysis (TC-664) |
| FR-055-AC-10 | The pinned reserved-word list equals the Rust reserved and reserved-for-future word set for the declared edition, compared against a transcribed copy of the language reference table committed beside it. | Analysis (TC-665) |
| FR-055-AC-11 | Identities ending `Größe`, `naïve size`, `Ärger`, and a CJK name each raise `UNRENDERABLE_NAME`, and none of them is silently rendered to `GrE`, `NaVeSize`, `Rger`, or the empty string. | Test (TC-660) |
| FR-055-AC-12 | Derivation under `LANG=tr_TR.UTF-8` produces identifiers identical to derivation under `LANG=C`, for a source containing `i` and `I`. | Test (TC-664) |
| FR-055-AC-13 | Two records whose `displayName` values render one identifier but whose identities differ generate two distinct types with no collision, proving the derivation reads the identity and not the display name. | Test (TC-658) |
| FR-055-AC-14 | `crateName` of `agent-ix/assurance` is `agent-ix-assurance`, and a Cargo manifest carrying it is accepted by `cargo metadata`. | Test (TC-665) |

## Dependencies

- **Upstream**: [FR-058](./FR-058-refuse-unsupported-constructs-with-stable-diagnostics.md)
- **Downstream**: [FR-054](./FR-054-map-the-semantic-ir-to-rust-serde-declarations.md), [FR-056](./FR-056-emit-the-generated-rust-crate.md), [FR-060](./FR-060-produce-deterministic-rustfmt-clean-output.md)
- **Constrained by**: [NFR-022](../non-functional/NFR-022-deterministic-and-hermetic-rust-generation.md)
