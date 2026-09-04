---
id: FR-054
title: "Map the semantic IR to Rust/Serde declarations"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-011"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-050"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-027"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-028"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-055"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-022"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-023"
    type: "constrained_by"
---
# FR-054: Map the semantic IR to Rust/Serde declarations

## Description

The Rust backend SHALL map every construct the semantic IR can express to a
declared Rust/Serde form by one published total mapping, so that the Rust type a
consumer receives is a function of the contract alone and every construct's
disposition is written down rather than decided at the keyboard.

## Inputs

- One semantic IR document at `contractVersion` `1.0.0` or `1.1.0`, already
  validated by [FR-050](./FR-050-validate-and-normalize-the-emitted-ir.md)
- `schema/semantic/v1/semantic-ir.schema.json` and `common.schema.json`, which
  fix the construct vocabulary
- The published `rust` row of
  `fixtures/semantic/v1/positive/target-contracts.json`, which fixes the native
  API surface (`struct`, `enum`, `newtype`, `tagged union`, `Serde`,
  framework-neutral validation), `serde` as the only runtime dependency, and
  `unsupportedFeaturePolicy: "fail"`

## Outputs

- `src/compiler/backends/rust-serde/mapping.mjs`: `mapDocument(ir)` returning a
  mapping model — one entry per type definition and one per field — with no
  string rendering in it
- `src/compiler/backends/rust-serde/mapping-table.json`: the published mapping
  table, one row per IR construct, naming the Rust form and the enforcing
  mechanism
- `docs/semantic-data-system/rust-backend.md`: the human-readable statement of
  the same table, including the declared decisions this requirement records

## Behavior

### Structural kinds

- The backend SHALL map each of the eight `kind` values by this table, and SHALL
  emit no other top-level Rust form for a type definition:

| `kind` | Rust form | Serde |
|---|---|---|
| `scalar` | `pub struct N(pub B);` newtype over the kernel base `B`, with a fallible constructor | `#[serde(transparent)]` plus a validating `Deserialize` |
| `record` | `pub struct N { .. }` | derived, member attributes per the field rules below |
| `enum` (no `payloadType` on any variant) | fieldless `pub enum N { .. }` | `#[serde(rename = "<variant name>")]` per variant |
| `union` (any variant carries `payloadType`) | `pub enum N { .. }` with a payload per carrying variant | externally tagged, serde's default, plus `#[serde(rename)]` per variant |
| `alias` | `pub struct N(pub T);` newtype over the target's Rust type | `#[serde(transparent)]` |
| `sequence` | `pub struct N(pub Vec<I>);` newtype over the `items` type | `#[serde(transparent)]` |
| `map` | `pub struct N(pub BTreeMap<String, V>);` newtype over the `values` type | `#[serde(transparent)]` |
| `reference` | `pub struct N(SemanticIdentity);` newtype over the validated identity, not over the target's Rust type | `#[serde(transparent)]` plus a validating `Deserialize` |

- The backend SHALL map the nine kernel scalars by this table:

| `scalar` | Rust base `B` |
|---|---|
| `boolean` | `bool` |
| `integer` | `i64` |
| `number` | `f64` |
| `string` | `String` |
| `bytes` | `Vec<u8>` |
| `date` | `Date`, the generated RFC 3339 full-date newtype |
| `datetime` | `DateTime`, the generated RFC 3339 date-time newtype |
| `duration` | `Duration`, the generated ISO 8601 duration newtype |
| `uuid` | `Uuid`, the generated 8-4-4-4-12 newtype |

- `BTreeMap` and the fixed key type `String` SHALL be used for every `map`,
  because the IR declares no key type and `BTreeMap` serializes in one order.
- A `union` SHALL be externally tagged. The IR declares no discriminator member,
  so a `tag`/`content` pair would be a name this backend invented; external
  tagging needs none.

### Fields

- For each field the backend SHALL compose the Rust type from three independent
  axes, in this order, and SHALL NOT collapse two axes onto one Rust
  constructor:

| Axis | Source | Effect |
|---|---|---|
| collection | `multiplicity`: collection iff `upper` is absent or `upper > 1` | `Vec<T>` when a collection, `T` otherwise |
| nullability | `nullable` | `Nullable<X>` around the result when true |
| presence | `presence`, equivalently `multiplicity.lower >= 1` | `Option<Y>` around the result when `optional` |

- `Nullable<T>` SHALL be a generated enum with the variants `Null` and
  `Value(T)`, serialized as JSON `null` and as `T`, so that an absent member and
  a present `null` remain distinguishable, which `Option<T>` alone cannot do.
- Where a field is a collection, the backend SHALL enforce
  `multiplicity.lower`, `multiplicity.upper`, and `multiplicity.unique` in the
  field's fallible constructor and in its `Deserialize`, and SHALL record
  `multiplicity.ordered` in the field's metadata constant.
- Where `defaultKind` is `semantic`, the backend SHALL emit a serde `default`
  drawn from `defaultValue`.
- Where `defaultKind` is `representation` or `migration`, the backend SHALL
  record the default in the field's metadata constant and SHALL NOT emit a serde
  `default`, because those defaults belong to a representation or migration
  boundary and applying them at the semantic boundary would manufacture a value
  the semantic contract does not carry.
- Where a field carries a `unit`, the backend SHALL record the UCUM symbol in
  the field's metadata constant.

### Unknown members and extensions

- For a type whose `unknownPolicy` is `reject`, the backend SHALL emit
  `#[serde(deny_unknown_fields)]`.
- For a type whose `unknownPolicy` is `preserve` or `surface`, the backend SHALL
  emit one `#[serde(flatten)]` member of the generated type
  `UnknownMembers`, which is a `BTreeMap<String, SemanticValue>`.
- `SemanticValue` SHALL be a generated closed enum over the JSON value space
  (`Null`, `Bool`, `Integer`, `Number`, `String`, `Array`, `Object`) declared in
  the generated crate itself, so that the dynamic surface is a named type this
  contract owns rather than `serde_json::Value`.
- Where `unknownPolicy` is `surface`, the type's `validate` SHALL return one
  non-blocking `agent-ix.rust-backend.UNKNOWN_MEMBER_SURFACED` diagnostic per
  retained member; where it is `preserve`, `validate` SHALL return none.
- The backend SHALL emit `extensions` as `Vec<Extension>`, where `Extension`
  carries `identity`, `version`, `required`, `capability`, and a
  `SemanticValue` payload, and SHALL NOT fold an extension into an unknown
  member.

### Contract metadata

- The backend SHALL emit `roles`, `origin`, `relationships`, `operations`,
  `clauses`, and `occurrences` as generated `const` metadata beside the types
  they belong to, preserving every member the IR carries.
- The backend SHALL NOT emit a Rust function for an `operation`. An operation
  has no body in the IR; it is emitted as metadata naming its parameters'
  mapped Rust types, its mapped return type, and its `pre` and `post` clause
  identifiers.

### Recursion

- The backend SHALL compute the strongly connected components of the
  type-reference graph and SHALL introduce `Box` at every field whose resolved
  target lies in the same component as its owner and whose mapped shape does not
  already carry an indirection through `Vec` or `BTreeMap`.
- Introducing indirection SHALL depend on the graph alone, so that two runs over
  the same document box the same fields.

### Version handling

- For a `1.0.0` document the backend SHALL derive each field's multiplicity from
  its `presence` by the FR-027 rule before mapping, and SHALL NOT require
  `multiplicity` to be present.
- If a `1.0.0` document carries a `1.1.0` node, then the backend SHALL refuse it
  under [FR-058](./FR-058-refuse-unsupported-constructs-with-stable-diagnostics.md)
  rather than mapping the node.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-054-CON-1 | The mapping SHALL be total over the construct vocabulary: every `kind`, every kernel scalar, every `defaultKind`, every `unknownPolicy`, and every combination of the three field axes SHALL have a row, and a construct with no row SHALL raise a blocking diagnostic rather than take a fallback. | Correctness | Static analysis and test |
| FR-054-CON-2 | No mapped Rust type SHALL be `String`, `SemanticValue`, `BTreeMap<String, SemanticValue>`, or `Vec<u8>` unless that is the row's declared mapping for that construct. A degradation scan over generated output SHALL enforce this. | Correctness | Static analysis |
| FR-054-CON-3 | `mapping.mjs` SHALL be pure: same document in, same mapping model out, with no filesystem, clock, environment, or network access, and SHALL NOT render Rust source. | Purity | Static analysis and property test |
| FR-054-CON-4 | The generated crate SHALL depend on no runtime crate other than `serde`, which is what the published `rust` target contract declares. | Portability | Manifest inspection |
| FR-054-CON-5 | This requirement SHALL NOT change `src/compiler/backends/rust.mjs`, the frozen issue #4 prototype emitter, nor any issue #4 golden. | Non-disruption | Change-set diff |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-054-AC-1 | Every one of the eight `kind` values maps to its table row, verified by generating from a document declaring one type of each kind and matching the emitted declaration form. | Test |
| FR-054-AC-2 | Every one of the nine kernel scalars maps to its declared Rust base, verified per scalar. | Test |
| FR-054-AC-3 | All 24 combinations of collection × nullable × presence × (bounded, unbounded) produce the composed type the axis table states, and no two combinations produce the same Rust type where the contract distinguishes them. | Test |
| FR-054-AC-4 | A present `null` and an absent member deserialize to distinguishable values for a field that is both `optional` and `nullable`, and both round-trip to the bytes they came from. | Test |
| FR-054-AC-5 | A `union` whose variants carry payloads round-trips externally tagged, and a variant with no `payloadType` round-trips as a unit variant. | Test |
| FR-054-AC-6 | A type whose `unknownPolicy` is `reject` fails to deserialize a document carrying an unknown member; `preserve` retains it with no diagnostic; `surface` retains it and reports one `UNKNOWN_MEMBER_SURFACED`; in no case does the unknown member become a default value of a known field. | Test |
| FR-054-AC-7 | A recursive type graph — direct self-reference, a two-type cycle, and a cycle through a `sequence` — generates a crate that compiles, and the boxed field set is identical across two runs. | Test |
| FR-054-AC-8 | `relationships`, `operations`, `clauses`, `roles`, `origin`, and `occurrences` survive generation into metadata with every member the IR carried, checked by reading the metadata back and comparing to the input document. | Test |
| FR-054-AC-9 | `defaultKind: "semantic"` emits a serde default that applies on an absent member; `representation` and `migration` emit no serde default and appear only in metadata. | Test |
| FR-054-AC-10 | A `1.0.0` document generates with multiplicity derived from presence, and a `1.0.0` document carrying a `relationships` array is refused with a diagnostic rather than mapped. | Test |
| FR-054-AC-11 | The mapping table published in `mapping-table.json` and the rows this requirement states agree exactly, in both directions, checked by a test that reads both. | Analysis |
| FR-054-AC-12 | A construct with no mapping row raises a blocking diagnostic and writes no file, demonstrated by removing a row and re-running. | Test |
| FR-054-AC-13 | `mapping.mjs` returns an identical model for a document and for the same document with every object's key order permuted and every identity-keyed array reordered. | Property |
| FR-054-AC-14 | The generated crate's `Cargo.toml` names `serde` as its only `[dependencies]` entry. | Analysis |

## Dependencies

- **Upstream**: [FR-050](./FR-050-validate-and-normalize-the-emitted-ir.md), [FR-027](./FR-027-declare-field-multiplicity-and-units.md), [FR-028](./FR-028-represent-relationships-operations-and-clauses.md), [FR-055](./FR-055-derive-stable-rust-identifiers.md)
- **Downstream**: [FR-056](./FR-056-emit-the-generated-rust-crate.md), [FR-057](./FR-057-enforce-constraints-in-generated-rust.md), [FR-058](./FR-058-refuse-unsupported-constructs-with-stable-diagnostics.md), [FR-062](./FR-062-cover-every-mapping-branch.md)
- **Constrained by**: [NFR-022](../non-functional/NFR-022-deterministic-and-hermetic-rust-generation.md), [NFR-023](../non-functional/NFR-023-non-disruptive-rust-backend.md)
