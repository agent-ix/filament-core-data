---
id: FR-055
title: "Derive stable, collision-free Rust identifiers"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-011"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-054"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-022"
    type: "constrained_by"
---
# FR-055: Derive stable, collision-free Rust identifiers

## Description

The Rust backend SHALL derive every generated Rust identifier from the semantic
identity that owns it by one pure, total, injective function, and SHALL refuse
generation rather than emit two declarations that collide, so that a rename in
the generated crate can only follow a change in the contract.

## Inputs

- A type definition's `identity` and `displayName`
- A field's, variant's, operation's, and parameter's `identity` and `name`
- The Rust 2021 and 2024 reserved-word sets, including the reserved-for-future
  words

## Outputs

- `src/compiler/backends/rust-serde/names.mjs`: `typeName(definition)`,
  `memberName(node)`, `variantName(node)`, `moduleName(packageIdentity)`, and
  `constantName(node)`
- `src/compiler/backends/rust-serde/reserved-words.json`: the pinned reserved
  word list with its Rust edition provenance

## Behavior

### Derivation

- `typeName` and `variantName` SHALL be the `UpperCamelCase` rendering of the
  node's `displayName` or `name`; `memberName` and `moduleName` SHALL be its
  `snake_case` rendering; `constantName` SHALL be its `SCREAMING_SNAKE_CASE`
  rendering.
- The rendering SHALL segment on the boundaries `[a-z0-9]|[A-Z]`,
  `[A-Z]|[A-Z][a-z]`, and any run of characters that is not `[A-Za-z0-9]`, and
  SHALL drop the non-alphanumeric runs, so `HTTPStatusCode` segments as
  `HTTP`, `Status`, `Code`.
- Where a rendering begins with a digit, the backend SHALL prefix it with `_`.
- Where a rendering is empty, the backend SHALL raise a blocking
  `agent-ix.rust-backend.UNRENDERABLE_NAME` diagnostic naming the identity,
  rather than substituting a positional name.
- Where a rendering is a Rust reserved word, the backend SHALL emit the raw
  identifier form `r#<word>`, except for the words `crate`, `self`, `super`, and
  `Self`, which have no raw form; for those it SHALL raise
  `UNRENDERABLE_NAME`.

### Wire names

- Where the derived Rust identifier differs from the IR `name`, the backend
  SHALL emit `#[serde(rename = "<IR name>")]`, so the serialized member name is
  always the contract's name and never the Rust rendering.

### Collisions

- If two nodes in one Rust scope derive the same identifier, then the backend
  SHALL raise one blocking `agent-ix.rust-backend.NAME_COLLISION` diagnostic
  naming both semantic identities and the shared identifier, and SHALL write no
  file.
- The backend SHALL NOT resolve a collision by appending a counter, a hash, or a
  positional suffix, because such a suffix moves when an unrelated declaration is
  added and the generated name would then depend on document order rather than on
  the contract.

### Stability

- A derived identifier SHALL depend only on the node's own `displayName` or
  `name` — never on its position in a list, on the size of the document, on the
  identifiers other nodes derived, or on any input outside the document.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-055-CON-1 | The derivation SHALL be injective within each Rust scope: distinct semantic identities in one scope SHALL NOT derive one identifier, and the backend SHALL fail rather than make them distinct by mangling. | Correctness | Property test |
| FR-055-CON-2 | The reserved-word list SHALL be pinned in the repository with its Rust edition recorded, so a toolchain upgrade that adds a keyword is a visible diff and not a silent miscompile. | Maintainability | Inspection |
| FR-055-CON-3 | `names.mjs` SHALL be pure and SHALL read no input other than its argument and the pinned reserved-word list. | Purity | Static analysis |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-055-AC-1 | `HTTPStatusCode`, `http_status_code`, `httpStatusCode`, and `HTTP status code` all derive the type name `HttpStatusCode` and the member name `http_status_code`. | Test |
| FR-055-AC-2 | Every Rust reserved word used as a field name derives `r#<word>` and the emitted crate compiles; `crate`, `self`, `super`, and `Self` each raise `UNRENDERABLE_NAME` and write no file. | Test |
| FR-055-AC-3 | A name rendering to the empty string raises `UNRENDERABLE_NAME` naming the semantic identity. | Test |
| FR-055-AC-4 | A name beginning with a digit derives an identifier prefixed with `_` and the crate compiles. | Test |
| FR-055-AC-5 | Two distinct fields in one record whose names derive the same identifier raise one `NAME_COLLISION` naming both identities, and no file is written. | Test |
| FR-055-AC-6 | Every derived identifier that differs from the IR name carries a `#[serde(rename)]` to the IR name, checked over every generated member of the corpus bases. | Test |
| FR-055-AC-7 | Adding an unrelated type to a document changes no other type's, field's, or variant's derived identifier. | Property |
| FR-055-AC-8 | Over generated names, the derivation is injective within a scope or raises `NAME_COLLISION`; it never silently produces a duplicate. | Property |
| FR-055-AC-9 | Reordering a document's `types`, `fields`, and `variants` arrays changes no derived identifier. | Property |
| FR-055-AC-10 | The pinned reserved-word list equals the Rust reserved and reserved-for-future word set for the declared edition, checked against a transcribed copy of the language reference table. | Analysis |

## Dependencies

- **Upstream**: [FR-054](./FR-054-map-the-semantic-ir-to-rust-serde-declarations.md)
- **Downstream**: [FR-056](./FR-056-emit-the-generated-rust-crate.md), [FR-060](./FR-060-produce-deterministic-rustfmt-clean-output.md)
- **Constrained by**: [NFR-022](../non-functional/NFR-022-deterministic-and-hermetic-rust-generation.md)
