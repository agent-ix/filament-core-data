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
  - target: "ix://agent-ix/filament-core-data/FR-058"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-022"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-023"
    type: "constrained_by"
---
# FR-054: Map the semantic IR to Rust/Serde declarations

## Description

This requirement opens the bundle answering
[filament-core-data#21](https://github.com/agent-ix/filament-core-data/issues/21), the Rust/Serde semantic codegen
backend.

The Rust backend SHALL map every construct the semantic IR can express to a
declared Rust/Serde form by one published total mapping keyed on `kind`, so that
the Rust type a consumer receives is a function of the contract alone and every
construct's disposition is written down rather than decided at the keyboard.

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
- The diagnostic registry of
  [FR-058](./FR-058-refuse-unsupported-constructs-with-stable-diagnostics.md),
  which every refusal below is addressed through

## Outputs

- `src/compiler/backends/rust-serde/mapping.mjs`: `mapDocument(ir)` returning a
  mapping model — one entry per type definition and one per field — with no
  string rendering in it
- `src/compiler/backends/rust-serde/mapping-table.json`: the published mapping
  table, one row per IR construct, naming the row key, the Rust form, the serde
  attributes, and the enforcing mechanism
- `src/compiler/backends/rust-serde/graph.mjs`: the type-reference graph, its
  strongly connected components, and the indirection decision
- `scripts/build-rust-backend-docs.mjs`: renders
  `docs/semantic-data-system/rust-backend.md` from `mapping-table.json` and the
  diagnostic registry, with a `--check` mode
- `docs/semantic-data-system/rust-backend.md`: the rendered mapping table, the
  declared decisions this requirement records, and the divergences it registers

## Behavior

### Structural kinds

- The backend SHALL select exactly one row of this table by the type
  definition's core `kind`, or, for a module construct kind, by its
  declaration's identity and shape and the reference members the type carries,
  and SHALL emit no other top-level Rust form. It SHALL name the type by
  `kind.name` and SHALL name no module construct kind in its source:

| `kind`, or identity × shape | Rust form | Serde |
|---|---|---|
| `scalar` | `pub struct N(B);` newtype over the kernel base `B`, with `try_new` | `#[serde(transparent)]` plus a validating `Deserialize` |
| `record` | `pub struct N { .. }` | derived, member attributes per the field rules below |
| `enum` | fieldless `pub enum N { .. }` | `#[serde(rename = "<variant name>")]` per variant, emitted only where the derived identifier differs from the variant `name` |
| `union` | `pub enum N { .. }`, unit variant where `payloadType` is absent, one-field variant where it is present | externally tagged, serde's default, with the same conditional `rename` |
| `alias` | `pub struct N(T);` newtype over the target's Rust type, with `try_new` | `#[serde(transparent)]` |
| `sequence` | `pub struct N(Vec<I>);` newtype over the `items` type, with `try_new` | `#[serde(transparent)]` |
| `map` | `pub struct N(BTreeMap<String, V>);` newtype over the `values` type, with `try_new` | `#[serde(transparent)]` |
| `reference` | `pub struct N(SemanticIdentity);` newtype over the validated identity, not over the target's Rust type | `#[serde(transparent)]` plus a validating `Deserialize` |
| `identified` × `record` (business `entity`) | `pub struct N { .. }` as for `record`, plus `pub const IDENTITY_FIELDS: &[&str]` in the type's module, naming the fields that tell its instances apart in the order `identityFields` declares them, and `PartialEq`, `Eq` and `Hash` implemented over those fields in that order | as for `record` |

| `value` × `record` (business `value_object`) | `pub struct N { .. }` as for `record` | as for `record`; the derived `PartialEq` compares every member, which is the construct's value equality |
| `identified` × `record` carrying `owner` (business `nested_entity`) | as for `identified` × `record`, plus `pub const OWNER: &str`, the owning type's semantic identity | as for `record` |
| `identified` × `record` carrying `members` (business `aggregate_root`) | as for `identified` × `record`, plus `pub const MEMBERS: &[&str]`, the members' semantic identities | as for `record` |
| `none` × `enumeration` (business `enumeration`) | fieldless `pub enum N { .. }`, one variant per declared variant | as for `enum` |
| `none` × `record` carrying `occurrenceField` and declaring `immutable` (business `event`) | `pub struct N { .. }` with every member private, one `&self` accessor per member, and `pub const OCCURRENCE_FIELD: &str` | as for `record`; `try_new` and `Deserialize` are the only ways to build a value |
| `none` × `state_machine` (business `state_machine`) | `pub struct N { .. }` as for `record`, plus `pub enum NState { .. }`, one fieldless variant per state, and `pub const TRANSITIONS: &[TransitionMeta]` | as for `record`; each state variant carries `#[serde(rename = "<state name>")]` where the identifier differs |
| `identified` × `sequence` (business `process`) | as for `identified` × `record`, plus `pub const STEPS: &[StepMeta]` | as for `record` |
| `none` × `interface` (business `repository`) | `pub trait N { .. }`, one method per operation, its parameters and return mapped by the field rules, plus `pub const PERSISTS: &[&str]` | none: a repository holds no state |
| `none` × `namespace` (business `domain`) | `pub struct N;` unit struct, plus `pub const MEMBERS: &[&str]` and `pub const VOCABULARY: &[TermMeta]` | none: a domain has no instance data |

- Each construct kind of
  [FR-142](./FR-142-declare-one-construct-per-object-type.md) selects the row
  of its identity and shape. The reader decides every declared rule before
  generation, so the backend renders what the construct declares:
  - an `identified` construct's module declares
    `IDENTITY_FIELDS`, the names of its identity fields in the order
    `identityFields` declares them, including a field a supertype declares;
  - an `identified` construct compares and
    hashes by its identity fields: its struct derives no `PartialEq`, and its
    module implements `PartialEq`, `Eq` and `Hash` over the identity fields, so
    two instances with equal identity fields are one instance; every generated
    newtype an identity field reaches derives `Eq` and `Hash`;
  - a `value` construct derives `PartialEq`, which compares every member;
  - a construct whose declaration states the `immutable` flag renders immutable: no member is public,
    so a value cannot change after `try_new` or `Deserialize` builds it; a construct that does not
    state the flag renders mutable, whatever members it carries;
  - a `state_machine`-shaped construct's transition names its `from` and `to` states and its
    trigger operation by name, its guard by clause identifier, and its emitted
    events by semantic identity;
  - an `interface`-shaped construct's method takes `&self` where its operation declares an empty
    frame, and `&mut self` otherwise.
- If an identity field's Rust type has no `Eq` and `Hash` (a `number` or `any`
  scalar, a nullable member, a record, an enum or a union, or a newtype over
  one), then the backend SHALL raise `UNSUPPORTED_CONSTRUCT` naming the field
  and write no file, rather than compare the instances by every member.
- A construct's clauses are Quire
  meaning over instances rather than over one value. That is the
  carried-not-enforced row
  [FR-058](./FR-058-refuse-unsupported-constructs-with-stable-diagnostics.md)
  declares.

### Model members

- The backend SHALL render each model member of
  [FR-141](./FR-141-carry-the-model-members-in-the-semantic-ir.md) by this
  table. A module declares a member's constant only where the type carries the
  member, so a `record` or `identified` × `record` module without them carries none of them:

| Member | Rust form |
|---|---|
| `supertypes` | the subtype's struct carries its effective members: the supertypes' fields, farthest first, then its own, each redefined field left out; `pub const SUPERTYPES: &[&str]` names the direct supertypes |
| `abstract` | `pub trait N { .. }`, one `fn <member>(&self) -> &T;` accessor per effective field, in place of a struct, plus `pub const ABSTRACT: bool = true`; each concrete subtype implements the trait of every abstract supertype |
| `subsets` | `pub const FIELD_SUBSETS: &[FieldLinkMeta]`, each member and the members its values are a subset of, by wire name |
| `redefines` | the redefining member stands in the struct in place of the inherited one; `pub const FIELD_REDEFINES: &[FieldLinkMeta]` names the member it redefines |
| operation `frame` and inline `pre` and `post` clauses | `pub const OPERATION_CONTRACTS: &[OperationContractMeta]`, each operation's frame and inline Quire clauses as text |
| `populations` | `pub const POPULATIONS: &[PopulationMeta]` in `identity.rs`, each population's identity, display name, member types and extents |

- The descriptor types `TransitionMeta`, `StepMeta`, `TermMeta`,
  `FieldLinkMeta`, `FrameMeta`, `InlineClauseMeta`, `OperationContractMeta`,
  `PopulationMemberMeta` and `PopulationMeta` SHALL be declared in
  `identity.rs` exactly when the crate carries a construct member beyond
  identity fields or a population.
- An abstract type has no value of its own: no struct, constructor or
  `Deserialize` is generated for it. A `reference` MAY target an abstract type,
  since it holds the target's identity rather than a value of it. If a member,
  parameter, return, alias target, item or value names an abstract type, or a concrete subtype's field maps to a Rust type
  other than the one the abstract supertype's accessor returns, then the
  backend SHALL raise `UNSUPPORTED_CONSTRUCT` and write no file.
- `subsets` are carried, not enforced: the subset relation is Quire meaning
  over values. That is the carried-not-enforced row
  [FR-058](./FR-058-refuse-unsupported-constructs-with-stable-diagnostics.md)
  declares.
- If an inherited field and another effective field of a type derive one
  member name, then the backend SHALL raise the member-scope collision of
  [FR-055](./FR-055-derive-stable-rust-identifiers.md) and write no file.

- If a variant of a `kind: "enum"` type carries a `payloadType`, then the
  backend SHALL raise a blocking
  `agent-ix.rust-backend.PAYLOAD_ON_ENUM_VARIANT` naming the variant identity,
  because the schema permits the member on any variant while the two kinds mean
  different things and no contract rule reconciles them.
- The backend SHALL map the ten kernel scalars by this table:

| `scalar` | Rust base `B` | Wire form |
|---|---|---|
| `any` | `SemanticValue`, the generated JSON-value representation | JSON value |
| `boolean` | `bool` | JSON boolean |
| `integer` | `i64` | JSON number with no fraction or exponent |
| `number` | `f64` | JSON number |
| `string` | `String` | JSON string |
| `bytes` | refused — see below | — |
| `date` | `Date`, the generated RFC 3339 full-date newtype | JSON string |
| `datetime` | `DateTime`, the generated RFC 3339 date-time newtype | JSON string |
| `duration` | `Duration`, the generated ISO 8601 duration newtype | JSON string |
| `uuid` | `Uuid`, the generated 8-4-4-4-12 newtype | JSON string |

- The `date`, `datetime`, `duration`, and `uuid` scalar rows SHALL each declare
  their generated support type in `mapping-table.json`. When a `kind: scalar`
  definition derives that same support-type identifier, the backend SHALL map
  the definition onto the existing `crate::support::<Support>` type rather than
  emit a second newtype; every reference to the definition SHALL render that
  support type. This exception is decided before crate-scope collision
  insertion. A scalar whose derived name or scalar selector does not match the
  row remains a user declaration and is governed by FR-055's collision rule.

- If a type definition declares `scalar: "bytes"`, then the backend SHALL raise
  a blocking `agent-ix.rust-backend.UNDECLARED_WIRE_FORM` and SHALL emit no
  file. No published artifact states the JSON representation of `bytes`:
  `semantic-ir.schema.json` names it only as a kernel scalar, `common.schema.json`
  declares no `contentEncoding`, `contracts-v1.md` does not mention it, and no
  fixture or corpus case carries a `bytes` value. Choosing base64 or an integer
  array here would be this backend deciding a cross-language wire form that
  belongs to the representation and wire projections and to the issue #7 parity
  gate. The refusal is recorded, and the decision is filed as issue #58 rather than
  taken here.
- `BTreeMap` and the fixed key type `String` SHALL be used for every `map`,
  because the IR declares no key type and `BTreeMap` serializes in one order.
- A `union` SHALL be externally tagged. The IR declares no discriminator
  member, so a `tag`/`content` pair would be a name this backend invented;
  external tagging needs none and is a tagged union in serde's own vocabulary,
  which is what the published `rust` target contract's `nativeApi` names. The
  decision is recorded in `docs/semantic-data-system/rust-backend.md` as this
  backend's reading, and filed as issue #58, because issues #22 and #23 must
  reach the same wire form for the issue #7 parity gate.

### Fields

- For each field the backend SHALL compose the Rust type from three independent
  axes, in this order, and SHALL NOT collapse two axes onto one Rust
  constructor:

| Axis | Source | Effect |
|---|---|---|
| collection | `multiplicity`: a collection iff `upper` is absent or `upper > 1` | `Vec<T>` when a collection, `T` otherwise |
| nullability | `nullable` | `Nullable<X>` around the result when true |
| presence | `presence`, equivalently `multiplicity.lower >= 1` | `Option<Y>` around the result when `optional` |

- The eight combinations of the three axes SHALL produce exactly these eight
  Rust member types and these serde attributes, and no two of the eight SHALL
  be the same:

| collection | nullable | presence | Rust member type | serde attributes |
|---|---|---|---|---|
| no | no | required | `T` | none |
| no | no | optional | `Option<T>` | `default`, `skip_serializing_if = "Option::is_none"` |
| no | yes | required | `Nullable<T>` | none |
| no | yes | optional | `Option<Nullable<T>>` | `default`, `skip_serializing_if = "Option::is_none"`, `deserialize_with = "present_or_absent"` |
| yes | no | required | `Vec<T>` | none |
| yes | no | optional | `Option<Vec<T>>` | `default`, `skip_serializing_if = "Option::is_none"` |
| yes | yes | required | `Vec<Nullable<T>>` | none |
| yes | yes | optional | `Option<Vec<Nullable<T>>>` | `default`, `skip_serializing_if = "Option::is_none"`, `deserialize_with = "present_or_absent"` |

- `Nullable<T>` SHALL be a generated enum with the variants `Null` and
  `Value(T)`, whose `Deserialize` maps a JSON `null` to `Null` and any other
  value to `Value`, and whose `Serialize` writes `null` for `Null`.
- `present_or_absent` SHALL be a generated `deserialize_with` helper that wraps
  whatever it is given in `Some`. Serde invokes a `deserialize_with` only when
  the member is present, so a present `null` reaches `Nullable`'s
  `Deserialize` and becomes `Some(Nullable::Null)`, while an absent member takes
  the `default` and becomes `None`. Without it, `Option`'s own `Deserialize`
  consumes the `null` first and both states arrive as `None`, which is the
  collapse this composition exists to prevent.
- The boundedness of a collection's `upper` SHALL have no effect on the emitted
  Rust type. `Vec<T>` is the collection form whether `upper` is absent or
  greater than one; the bounds are enforced in the constructor.
- If a field's `multiplicity` has `upper: 0`, then the backend SHALL raise a
  blocking `agent-ix.rust-backend.UNSUPPORTED_MULTIPLICITY`, because a member
  that may never be present has no Rust form that serde round-trips and the
  contract states no meaning for it.
- Where a field is a collection, the backend SHALL enforce
  `multiplicity.lower`, `multiplicity.upper`, and `multiplicity.unique` in the
  field's fallible constructor and in its `Deserialize`, and SHALL record
  `multiplicity.ordered` in the field's metadata constant.
- Where `defaultKind` is `semantic`, the backend SHALL emit a serde `default`
  drawn from `defaultValue`.
- If `defaultValue` is not a JSON value the field's mapped Rust type admits,
  then the backend SHALL raise a blocking
  `agent-ix.rust-backend.INVALID_DEFAULT_VALUE` naming the field identity,
  rather than rendering a value that will not compile.
- Where `defaultKind` is `representation` or `migration`, the backend SHALL
  record the default in the field's metadata constant and SHALL NOT emit a serde
  `default`, because those defaults belong to a representation or migration
  boundary and applying them at the semantic boundary would manufacture a value
  the semantic contract does not carry.
- Where a field carries a `unit`, the backend SHALL record the UCUM symbol in
  the field's metadata constant.

### Unknown members and extensions

- The schema requires `unknownPolicy` on every kind, so the mapping SHALL
  dispose it on every kind it renders. It is a real obligation on the kinds that have a
  closed member set and inert on the kinds that do not; neither disposition is
  silence.

| `kind`, or construct shape | `reject` | `preserve` or `surface` |
|---|---|---|
| `record`; constructs shaped `record`, `state_machine` or `sequence` | `#[serde(deny_unknown_fields)]` | one `#[serde(flatten)]` `UnknownMembers` member |
| `enum`, `union`; constructs shaped `enumeration` | serde's default, under which an unrecognised variant is a deserialization error | a generated catch-all variant `Unknown`, carrying the unrecognised tag and, for a `union`, its payload as a `SemanticValue` |
| `scalar`, `alias`, `sequence`, `map`, `reference`; constructs shaped `interface` or `namespace` | inert | inert |

- A `scalar` has no members; a `sequence` and a `map` admit every element and
  every key by construction; an `alias` and a `reference` are transparent; a
  construct shaped `interface` or `namespace` carries no instance data. On those there is no unknown member for a policy to govern, so the
  backend SHALL carry the declared value verbatim into the type's metadata
  constant and SHALL state in the generated documentation that it is inert for
  the kind. Recording it is what stops it being dropped; refusing it would
  refuse documents the contract calls valid — `conformance/bases/core-1-1.json`
  gives a `map` `preserve` and a `union` `surface`, and the independent oracle
  decides that base `success`.
- Where `unknownPolicy` is `surface`, the type's `validate` SHALL return one
  non-blocking `agent-ix.rust-backend.UNKNOWN_MEMBER_SURFACED` diagnostic per
  retained member or unrecognised variant; where it is `preserve`, `validate`
  SHALL return none.
- `UnknownMembers` SHALL be a `BTreeMap<String, SemanticValue>`.
- `SemanticValue` SHALL be a generated closed enum over the JSON value space
  declared in the generated crate itself, with the variants `Null`,
  `Bool(bool)`, `Number(NumberLexeme)`, `String(String)`, `Array(Vec<SemanticValue>)`,
  and `Object(Vec<(String, SemanticValue)>)`, so that the dynamic surface is a
  named type this contract owns rather than `serde_json::Value`.
- `NumberLexeme` SHALL retain the JSON number's source text, and `Object` SHALL
  retain member order and repeated names, so a preserved value's round trip is a
  fact about the value and not about a parser's normalization.
- A round-trip obligation over a `SemanticValue` SHALL be stated as equality
  under the declared canonical form of
  [FR-059](./FR-059-answer-the-conformance-corpus-from-rust.md), and
  additionally as byte identity for every value whose source bytes the crate
  retained.
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

- The backend SHALL build the type-reference graph over *every* reference edge
  the IR carries — a field's `typeRef`, an `alias`'s and a `reference`'s
  `target`, a `sequence`'s `items`, a `map`'s `values`, a `variant`'s
  `payloadType`, an operation parameter's `typeRef`, and an operation's
  `returns.typeRef` — and SHALL compute its strongly connected components over
  that whole edge set.
- The backend SHALL introduce `Box` at every reference edge whose target lies in
  the same component as its owner and whose mapped shape does not already carry
  an indirection through `Vec` or `BTreeMap`, so a cycle closing through an
  alias target or a union payload is broken as surely as one closing through a
  record field.
- Introducing indirection SHALL depend on the graph alone, so that two runs over
  the same document box the same edges.

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
| FR-054-CON-1 | The mapping SHALL be total over the construct vocabulary: every `kind`, every kernel scalar, every `defaultKind`, every `unknownPolicy` on every kind, and every combination of the three field axes SHALL select exactly one row or one named refusal. | Correctness | Analysis |
| FR-054-CON-2 | No mapped Rust type SHALL be `String`, `SemanticValue`, `BTreeMap<String, SemanticValue>`, or `Vec<u8>` at a position the mapping table does not declare. | Correctness | Analysis |
| FR-054-CON-3 | `mapping.mjs` SHALL be pure: same document in, same mapping model out, with no filesystem, clock, environment, or network access. | Purity | Analysis |
| FR-054-CON-4 | The generated crate SHALL depend on no runtime crate other than `serde`. | Portability | Inspection |
| FR-054-CON-5 | This requirement SHALL NOT change `src/compiler/backends/rust.mjs`, the frozen issue #4 prototype emitter, nor any issue #4 golden. | Non-disruption | Analysis |
| FR-054-CON-6 | Every refusal this requirement states SHALL name a code the FR-058 registry declares; a refusal with an unregistered code SHALL fail the build. | Correctness | Analysis |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-054-AC-1 | Every one of the eight `kind` values selects its table row, keyed on `kind` alone, verified by generating from a document declaring one type of each kind and matching the emitted declaration form. | Test (TC-645) |
| FR-054-AC-2 | Each of the nine supported kernel scalars maps to its declared Rust base, and a `bytes` scalar raises `UNDECLARED_WIRE_FORM` and writes no file. | Test (TC-646) |
| FR-054-AC-3 | Each of the eight combinations of collection × nullable × presence produces exactly the Rust member type and serde attribute set the composition table states, the eight are pairwise distinct, and boundedness changes none of them. | Test (TC-647) |
| FR-054-AC-4 | For a field that is both `optional` and `nullable`, an absent member deserializes to `None`, a present `null` deserializes to `Some(Nullable::Null)`, the two are distinguishable, and each re-serializes to the bytes it came from. | Test (TC-648) |
| FR-054-AC-5 | A `union` whose variants carry payloads round-trips externally tagged, a variant with no `payloadType` round-trips as a unit variant, and a `payloadType` on an `enum` variant raises `PAYLOAD_ON_ENUM_VARIANT`. | Test (TC-649) |
| FR-054-AC-6 | A record whose `unknownPolicy` is `reject` fails to deserialize an unknown member; `preserve` retains it with no diagnostic; `surface` retains it and reports one `UNKNOWN_MEMBER_SURFACED`; an `enum` or `union` under `preserve` or `surface` deserializes an unrecognised variant into the catch-all and re-serializes it unchanged, and under `reject` refuses it; the declared policy of each of the five inert kinds appears verbatim in its metadata constant; and no unknown member ever becomes a default value of a known field. | Test (TC-650) |
| FR-054-AC-7 | A direct self-reference, a two-record cycle, a cycle closing through an `alias` target, a cycle closing through a `union` variant `payloadType`, and a cycle through a `sequence` each generate a crate that compiles, and the boxed edge set is identical across two runs. | Test (TC-651) |
| FR-054-AC-8 | `relationships`, `operations`, `clauses`, `roles`, `origin`, and `occurrences` survive generation into metadata with every member the IR carried, checked by reading the metadata back and comparing to the input document. | Test (TC-652) |
| FR-054-AC-9 | `defaultKind: "semantic"` emits a serde default that applies on an absent member; `representation` and `migration` emit no serde default and appear only in metadata; a `defaultValue` the mapped type does not admit raises `INVALID_DEFAULT_VALUE`. | Test (TC-653) |
| FR-054-AC-10 | A `1.0.0` document generates with multiplicity derived from presence; a `1.0.0` document carrying a `relationships` array is refused; a field whose `multiplicity.upper` is `0` raises `UNSUPPORTED_MULTIPLICITY`. | Test (TC-654) |
| FR-054-AC-11 | `mapping-table.json`, the rows this requirement states, and the rendered `docs/semantic-data-system/rust-backend.md` agree exactly in all three directions, checked by a script that parses the requirement's tables rather than by eye, and run by `make lint` in `--check` mode. | Analysis (TC-655) |
| FR-054-AC-12 | A construct with no mapping row and no named refusal raises a blocking diagnostic and writes no file, demonstrated by removing a row and re-running. | Test (TC-656) |
| FR-054-AC-13 | `mapping.mjs` returns an identical model for a document and for the same document with every object's key order permuted and every identity-keyed array reordered, and its module graph reads no ambient input. | Analysis (TC-657) |
| FR-054-AC-14 | The generated crate's `Cargo.toml` names `serde` as its only `[dependencies]` entry, at the pinned exact version. | Inspection (TC-655) |
| FR-054-AC-15 | A `SemanticValue` retaining a repeated object member name and an unsorted member order re-serializes to the bytes it came from, and a number re-serializes through the declared ECMAScript formatter — so `1.0` becomes `1`, which is what `JSON.parse` then `JSON.stringify` produces and what the corpus's canonical form compares. Byte identity is claimed for the members the crate retains bytes for and for no others: serde's data model hands a visitor a parsed `f64` and never the source lexeme, and the alternative would need `serde_json`, which the published `rust` target contract's `serde`-only runtime forbids. | Test (TC-650) |
| FR-054-AC-16 | A `2.0.0` `entity` selects the `kind:entity` row: it renders the record struct, its module declares `IDENTITY_FIELDS` naming its identity fields in declared order, and a `record` in the same document declares no `IDENTITY_FIELDS`. | Test (TC-1762) |
| FR-054-AC-17 | Generating the contract `2.0.0` constructs fixture succeeds, each construct kind selects its own `kind:` row and each model member its `construct:` row, and the emitted crate carries the form each row states: `IDENTITY_FIELDS` and `OWNER` on a nested entity, `MEMBERS` on an aggregate root and a domain, private members and accessors on an event, `<Name>State` and `TRANSITIONS` on a state machine, `STEPS` on a process, a trait on a repository, a unit struct on a domain, the inherited members and `SUPERTYPES` on a subtype, `ABSTRACT`, `FIELD_SUBSETS`, `FIELD_REDEFINES`, `OPERATION_CONTRACTS` and `POPULATIONS`. | Test (TC-1772) |
| FR-054-AC-18 | Generating the constructs fixture renders each `entity`, `nested_entity`, `aggregate_root` and `process` with no derived `PartialEq` and with `PartialEq`, `Eq` and `Hash` over its identity fields, and a `value_object` with the derived `PartialEq`; a newtype an identity field reaches derives `Eq` and `Hash`; and an identity field of a `number` scalar is refused with `UNSUPPORTED_CONSTRUCT` and no file. | Test (TC-1777) |
| FR-054-AC-19 | Generating the constructs fixture renders the abstract `Party` as a trait of accessors with no struct or constructor and `Order` implementing it; a `reference` type targeting `Party` generates; a field naming `Party`, and an `Order` field redefining an inherited field with another Rust type, are each refused with `UNSUPPORTED_CONSTRUCT` and no file. | Test (TC-1778) |
| FR-054-AC-20 | A repository operation whose frame is empty renders a method taking `&self`, and an operation with no frame renders a method taking `&mut self`. | Test (TC-1780) |

## Dependencies

- **Upstream**: [FR-050](./FR-050-validate-and-normalize-the-emitted-ir.md), [FR-027](./FR-027-declare-field-multiplicity-and-units.md), [FR-028](./FR-028-represent-relationships-operations-and-clauses.md), [FR-055](./FR-055-derive-stable-rust-identifiers.md), [FR-058](./FR-058-refuse-unsupported-constructs-with-stable-diagnostics.md)
- **Downstream**: [FR-056](./FR-056-emit-the-generated-rust-crate.md), [FR-057](./FR-057-enforce-constraints-in-generated-rust.md), [FR-062](./FR-062-cover-every-mapping-branch.md)
- **Constrained by**: [NFR-022](../non-functional/NFR-022-deterministic-and-hermetic-rust-generation.md), [NFR-023](../non-functional/NFR-023-non-disruptive-rust-backend.md)
