---
id: FR-147
title: "Carry tuple value types and union variant payloads in the semantic IR"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-006"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-050"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-069"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-141"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-142"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-146"
    type: "references"
  - target: "ix://agent-ix/filament-core-data/FR-051"
    type: "references"
  - target: "ix://agent-ix/filament-core-data/FR-058"
    type: "references"
  - target: "ix://agent-ix/filament-core-data/FR-093"
    type: "references"
  - target: "ix://agent-ix/filament-core-data/FR-097"
    type: "references"
  - target: "ix://agent-ix/filament-core-data/FR-145"
    type: "references"
  - target: "ix://agent-ix/quire-specification/FR-154"
    type: "references"
  - target: "ix://agent-ix/quire-specification/FR-208"
    type: "references"
  - target: "ix://agent-ix/quire-specification/FR-322"
    type: "references"
  - target: "ix://agent-ix/quire-spec-language/FR-120"
    type: "references"
---
# FR-147: Carry tuple value types and union variant payloads in the semantic IR

## Description

This requirement answers Linear IR-1059 (QSL-1168: tuple and union-payload
intake). QSpec FR-154 and FR-208 admit a tuple value type (FR-154-AC-33,
FR-208-AC-19) and a variant case with a resolving `payloadType`
(FR-154-AC-11, FR-154-AC-25, FR-208-AC-15), and QSpec FR-322 states their
checked-package V2 wire shape ("Tuple value types and payload-bearing variant
types"). QSL reads both from an admitted domain package (QSL FR-120-AC-22,
FR-120-AC-25). The semantic IR already carries `Variant.payloadType`, and its
readers already resolve it; it carried no tuple declaration, and the
spec-bundle writer dropped a variant's payload. This requirement adds both
and fixes the words the three parties use.

A **tuple value type** is a closed, identity-free, ordered product of one or
more typed positions. It is a type definition whose construct declaration has
the shape `tuple`. It carries one new type member, `positions`: an ordered
list of position nodes. The IR names a tuple's positions only by their
zero-based ordinal, as QSpec does: a position has no name.

| Term | Meaning |
|---|---|
| tuple identity | The type's `identity`, `ix://<package.identity>/<Name>`, where `<Name>` matches `^[A-Za-z][A-Za-z0-9_]*$` (owner-nested: the package owns the tuple, QSpec FR-154 row "A tuple value type's nested identity") |
| position | An object `{identity, typeRef, origin}`, all three required and no other member |
| position identity | `<tuple identity>/p<i>`, where `i` is the position's zero-based index in `positions`, written in decimal with no sign and no leading zero |
| position type | The `typeRef` of the position: one admitted value type |
| tuple shape | The ordered sequence of the position identity and `typeRef` pairs, which is the tuple's type identity in QSpec FR-208-AC-19; reordering the pairs changes it and leaves the tuple identity unchanged |

A `payloadType` on a variant is the single typed payload of that case. A type
all of whose variants omit `payloadType` is an enumeration of nullary cases.
A type with at least one `payloadType` is a union, and a variant of it that
omits `payloadType` stays nullary (QSpec FR-208-AC-15). The IR carries no
union flag: the family is derived from the cases, and QSpec derives a union's
members in ascending UTF-8 byte order of case name, whatever order `variants`
is authored in (QSpec FR-322).

## Inputs

- A semantic IR `2.0.0` document whose construct declarations may use the
  shape `tuple` and the member `positions`, and whose variants may carry
  `payloadType`
- A spec bundle whose enumeration artifacts may carry a `## Payloads` table
  beside their `## Values` table, and whose tuple artifacts carry a `## Positions`
  table (the extraction frontend, below)

## Outputs

- The schema shapes below, published in `schema/semantic/v1/semantic-ir.schema.json`
  and `schema/semantic/v1/construct-vocabulary.json`
- The reader verdicts below, from the Rust reader (`agent_ix_semantic_ir::decide`)
  for the construct rules and from every IR reader of FR-050 for the schema
  layer, each refusal a located diagnostic whose pointer is the one this
  requirement names
- The shared vectors `fixtures/semantic/v1/tuple-union/tuple-union.json`, the
  data QSL and the IR slice read to agree with this requirement

## Behavior

### The tuple shape and the `positions` member

- The core vocabulary SHALL gain the shape `tuple` and the type member
  `positions` (default `forbidden`). A declaration of the shape `tuple`
  SHALL declare `positions` `required`, and a declaration of any other shape
  SHALL declare `positions` `forbidden` or omit it, as the shape `alias` does
  for `target`.
- `construct-vocabulary.json`, the schema's `constructDeclaration` and the
  Rust, Node and Python readings of the vocabulary SHALL agree on the shape,
  the member and the shape requirement (FR-142-AC-11, FR-142-AC-14).
- The schema SHALL define `position` as an object with the required members
  `identity` (a semantic identity), `typeRef` (a semantic identity) and
  `origin`, and no other member, and SHALL define `positions` as an array of
  `position` with at least one item. A type of a construct whose declaration
  forbids `positions` SHALL NOT carry it, and a type of the shape `tuple`
  SHALL carry it; either is `SCHEMA_VIOLATION` at the type. A core-kind type
  (`scalar`, `record`, `enum`, `union`, `alias`, `sequence`, `map`,
  `reference`) SHALL NOT carry `positions`: a tuple is a construct, not a ninth
  core kind.
- An empty `positions` list is `SCHEMA_VIOLATION` at the `positions` pointer
  (QSpec FR-154 row "A tuple value type has no position").

### Tuple rules (the Rust reader)

The Rust reader is the one authority for the construct rules (FR-142). For a
type whose construct declaration has the shape `tuple` it SHALL decide the
following, accumulating every defect and reporting each once at its pointer:

- `INVALID_TUPLE` at `/identity` when the tuple identity is not
  `ix://<package.identity>/<Name>` with `<Name>` matching
  `^[A-Za-z][A-Za-z0-9_]*$`.
- `INVALID_TUPLE` at the member pointer when the type carries `fields`,
  `identityFields`, `operations`, `supertypes`, `clauses`, `relationships` or
  `variants`, empty or not, where the construct declaration admits the member (a
  declaration that forbids it leaves the schema layer to refuse it as
  `SCHEMA_VIOLATION`) (QSpec FR-208 "A tuple has no fields, identity
  fields, operations, supertypes or clauses").
- `DUPLICATE_IDENTITY` at `…/positions/<j>/identity` of the later position when
  two positions, or a position and any other node, declare one identity (the
  document-wide rule of FR-050 now ranges over positions); the later of two
  positions of one tuple declaring one identity raises no
  `INVALID_TUPLE_POSITION` for its identity, so exactly one refusal is reported
  for it.
- `INVALID_TUPLE_POSITION` at `…/positions/<i>/identity` when the position at
  index `i` does not have the identity `<tuple identity>/p<i>`: a gap, an
  out-of-order position, a wrong prefix, a sign, a leading zero or an uppercase
  `P`.
- `INVALID_TUPLE_POSITION` at `…/positions/<i>/typeRef` when the position type
  is `ix://quire/native/Clock` (QSpec FR-322 intake order, step 3: a tuple
  position is never a clock).
- `INVALID_CLOCK_MEMBER` at `…/variants/<i>/payloadType` when the payload type
  is `ix://quire/native/Clock`, directly or through an alias that reaches it.
  This follows QSpec FR-322, which refuses a Clock payload
  (`unsupported_construct`/`declaration-form`), and is provisional: STD-528
  rules whether a Clock payload is admitted, and until it does FCD refuses it
  here and FR-146 no longer lists a variant `payloadType` among the places the
  reader admits a Clock.
- `UNRESOLVED_POSITION_TYPE` at `…/positions/<i>/typeRef` when the position type
  resolves to no type of the document and to no native, as
  `UNRESOLVED_VARIANT_PAYLOAD` does for a payload.
- `UNRESOLVED_TYPE_REF` at `…/positions/<i>/typeRef` for a malformed
  `ix://quire/unit/<name>` (FR-146), and `DECIMAL_POLICY_MISSING` or
  `DECIMAL_POLICY_CONFLICT` as for any type position when the position type is
  decimal (a position has no policy member of its own; the policy rides on an
  alias the position names).

The position type is any other type position's type: a native name, a unit
(FR-146), or a type of the document (a record, enumeration, union, alias,
sequence, map, reference or another tuple). A tuple may name itself, directly
or through other types: QSpec FR-322 admits the recursive `Cell(Integer, List)`
with `List { Nil, Cons(Cell) }`, and a reader decides no finiteness. A tuple
is a document type, so a field, parameter, result, alias `target`, sequence
`items`, map `values`, reference `target`, variant `payloadType` and position
type may name it, and each of those positions resolves it as it resolves any
type.

The type traversal of the Rust reader (`Document::type_positions`) SHALL
visit each position's `typeRef` as a `TuplePosition` position, once, so that
every rule keyed on a type position reaches a tuple position through the same
traversal.

### Variant payloads

- The reader SHALL admit a `payloadType` on a variant of a construct of the
  shape `enumeration` and of the core `union` kind, resolving as it resolves
  any type position (`UNRESOLVED_VARIANT_PAYLOAD` for a payload naming no type).
  It SHALL admit a type whose variants mix cases with and without
  `payloadType`.
- The normalizers (FR-145) SHALL keep treating `variants` as an
  identity-sorted set: the order of a type's variants carries no meaning, for
  an enumeration or a union, so a union's member order is not the IR order.
- QSpec derives the union family and the member order; the IR states neither.

### Normalization and compatibility

- The normalizers (FR-145, FR-097: `normalizeIr`, `sort_node_lists`) and the
  fingerprinter (FR-069) SHALL keep `positions` in authored order. `positions`
  is not an identity-sorted set: sorting by identity would put `p10` before
  `p2`, and the order is the tuple shape. The path `/types/*/positions` is
  therefore not among the identity-set paths.
- A document that carries no `positions` SHALL serialize and fingerprint
  byte-for-byte as it did before this requirement.
- The compatibility classifier (FR-025, FR-051) SHALL compare the positions of
  a type of both documents as an ordered sequence, by index: a changed number
  of positions, a changed position identity, or a changed resolved position
  type is `breaking`, as a changed `items` or `values` type is; a tuple type
  that only one document carries is an added or removed type, classified as any
  type is. A variant that gains, loses or changes its `payloadType` is
  `breaking`; an added variant is classified as FR-051 classifies it.

### Generation backends

- No generation backend renders a tuple yet. A request whose IR declares a
  construct of the shape `tuple` SHALL be refused by the generation seam
  (FR-063) with the `unsupported` state and one blocking
  `UNSUPPORTED_CONSTRUCT_SHAPE` diagnostic naming the shape and the first type
  that uses it, for every target, before any backend generates, and no
  backend SHALL write a file for it. This is a refusal, never a silent drop or
  an approximation of a tuple as a record (FR-142-CON-2).
- The backends continue to render a `payloadType` as FR-054, FR-064 and FR-100
  state.

### Spec-bundle extraction

The extraction frontend (FR-091 to FR-099) writes both forms.

- The source form for a union variant payload is a `## Payloads` table with the
  columns `Value` and `Payload`, beside the `## Values` table. This is the
  stated rule of this requirement, not a workaround: `## Values` keeps the
  `Value` and `Description` columns the engine's `values` reader reads, and
  `## Payloads` is the one place an artifact binds a type to a case. No
  quire-rs change is needed or expected. An enumeration artifact MAY carry it. A `## Payloads` row
  whose `Payload` cell holds a type token binds that token to the variant its
  `Value` cell names, and a variant with no row is nullary. The token SHALL
  lower to a variant whose `payloadType` is the identity the engine's verdict
  for the token names, as FR-092 resolves a `Type` cell (a native name to
  `ix://quire/native/<Name>`, a `Quantity<u>` to `ix://quire/unit/<u>`, a bundle
  artifact to its identity), with the same blocking `UNRESOLVED_TYPE_TOKEN` at
  the row for a token that resolves to no type. A row naming no `## Values` row,
  or repeating an earlier row for one value, SHALL raise one blocking
  `ARTIFACT_NOT_LOWERED` at that row. An artifact with no `## Payloads` table
  lowers exactly as before, and a variant with no payload writes no
  `payloadType` member.
- An artifact whose construct declaration has the shape `tuple` SHALL lift to
  one type with `positions`: the rows of its `## Positions` table, in table
  order, one position per row, whose `Type` cell is a type token resolved as a
  `Payload` cell is, with the position identity `<tuple identity>/p<i>` and the
  origin at the row. The tuple identity is `ix://<package.identity>/<id>` for
  the artifact id `<id>`, an owner-nested identity, so an artifact id that is
  not `^[A-Za-z][A-Za-z0-9_]*$` SHALL raise one blocking `ARTIFACT_NOT_LOWERED`
  at the artifact naming the tuple-name rule. A tuple artifact with no
  `## Positions` row SHALL raise one blocking `ARTIFACT_NOT_LOWERED` at the
  artifact. A `Clock` position (`INVALID_TUPLE_POSITION`) and a `Clock` payload
  (`INVALID_CLOCK_MEMBER`) are refused by the reader, as above; the frontend's
  kernel library has no `Clock` scalar, so no `Payload` or `Type` cell resolves
  to one.
- The lifted tuple is a document the reader decides: a reader diagnostic for it
  surfaces as `INVALID_IR` (FR-096) at the row that produced the node.

### How QSL and QSpec consume it

- QSL intake runs `agent_ix_semantic_ir::decide` over the admitted document
  (QSpec FR-154), so every refusal above reaches QSL as an intake refusal.
- QSpec FR-154 reads a tuple as the construct whose meaning is
  `quire.meaning.model.tuple-value-type/v1`, with positions `p0` to `pN-1` each
  bound to its `typeRef`. The reader carries the meaning verbatim and decides
  neither that a `tuple` shape carries the tuple meaning nor the converse; that
  pairing is QSpec's intake check.
- Clock payload (STD-528): QSpec FR-322 refuses a `payloadType` of
  `ix://quire/native/Clock` (`unsupported_construct`/`declaration-form`), and a
  tuple position is never a clock. Until STD-528 is ruled FCD follows the
  FR-322 text: the reader refuses a Clock variant payload with
  `INVALID_CLOCK_MEMBER` and a Clock tuple position with
  `INVALID_TUPLE_POSITION`. FR-146 admits a Clock at its other positions and is
  unchanged there.
- Unit and nullary payload (STD-527): QSpec's text differs between FR-154's
  unit paragraph and FR-154-AC-25 on whether a unit payload is admitted. FCD
  follows the merged QSpec #468 (STD-519): a nullary case is a case with no
  `payloadType`, which QSpec reads as the empty payload, and the IR invents no
  unit-valued payload type. An `ix://quire/unit/<name>` payload (a quantity)
  stays admitted by the reader as FR-146-AC-6 states, and any refusal is
  QSpec's intake check, pending STD-527.
- The vectors `fixtures/semantic/v1/tuple-union/tuple-union.json` are FCD's own vectors, modelled on the QSpec vectors
  `proposals/checked-package-v2/model-tuple-union-vectors.json`: QSpec's
  `ordinal` of a position is the decimal suffix of its position identity.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-147-CON-1 | Every IR reader SHALL return the same schema verdict for each case of the shared vectors. | Parity | Test |
| FR-147-CON-2 | Adding this requirement's members SHALL change no byte and no fingerprint of a document that carries none of them. | Compatibility | Test |
| FR-147-CON-3 | No layer SHALL approximate a tuple as a record, a sequence or a core kind, or sort or drop a tuple's positions. | Integrity | Test |
| FR-147-CON-4 | The Rust reader SHALL return the stated codes and pointers for each case of the shared vectors. | Parity | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-147-AC-1 | A `2.0.0` document declaring a `tuple` construct and the tuples `Pair(Boolean, Integer)`, `Swap(Integer, Boolean)`, `Nest(Pair, Shape)` and the recursive `Cell(Integer, List)` beside the union `Shape { Flag(Boolean), Empty, Both(Pair) }`, the enumeration `Color` and the union `List { Nil, Cons(Cell) }` is accepted by the Rust and Node readers, the independent TypeScript reader and the published JSON Schema, with no diagnostic. | Test (TC-1872) |
| FR-147-AC-2 | The vocabulary, the schema's `constructDeclaration` and the Rust, Node and Python readings each name the shape `tuple`, the member `positions` and the requirement that a `tuple` declares `positions` `required`; a `tuple` declaration without a required `positions` and a non-`tuple` declaration with a required `positions` are each refused at the shape or member pointer, by the Rust and the Node reading alike. | Test (TC-1873) |
| FR-147-AC-3 | A tuple type with an empty `positions`, with a position missing `identity`, `typeRef` or `origin`, with a position carrying an extra member, with `positions` on a core-kind type, on a construct whose declaration forbids it, or missing from a `tuple` construct is `SCHEMA_VIOLATION`. | Test (TC-1874) |
| FR-147-AC-4 | A tuple whose identity is not `ix://<package.identity>/<Name>`, or whose name does not match `^[A-Za-z][A-Za-z0-9_]*$`, and a tuple carrying `fields`, `identityFields`, `operations`, `supertypes`, `clauses`, `relationships` or `variants` that its declaration admits each raise `INVALID_TUPLE` once per defect at the identity or member pointer. | Test (TC-1875) |
| FR-147-AC-5 | A position at index 1 with identity `…/p2` (a gap), a pair `p1`, `p0` (out of order), `…/p01`, `…/P1`, `…/p-1` and a position under another tuple's prefix each raise `INVALID_TUPLE_POSITION` at the position's `identity`; two positions both `…/p0` raise exactly one `DUPLICATE_IDENTITY` at the later position's `identity` and no `INVALID_TUPLE_POSITION`. | Test (TC-1876) |
| FR-147-AC-6 | A position typed `ix://quire/native/Clock` raises `INVALID_TUPLE_POSITION` at its `typeRef`; a position naming no type raises `UNRESOLVED_POSITION_TYPE`; a malformed unit reference raises `UNRESOLVED_TYPE_REF`; a decimal position with no policy raises `DECIMAL_POLICY_MISSING` and one typed by an alias carrying the policy raises nothing; a native, a unit, a record, an enumeration, a union, an alias, a tuple and the tuple itself are accepted. | Test (TC-1877) |
| FR-147-AC-7 | A field, an operation parameter and result, an alias `target`, a sequence `items`, a map `values`, a reference `target` and a variant `payloadType` naming a tuple are accepted, and each is visited by the type traversal exactly once together with every tuple position (the traversal inventory test counts `TuplePosition`). | Test (TC-1878) |
| FR-147-AC-8 | A union mixing a nullary variant with payload-bearing variants, and an enumeration none of whose variants carries a payload, are accepted by the Rust and Node readers; a `payloadType` naming no type raises `UNRESOLVED_VARIANT_PAYLOAD`; reordering `variants` leaves the normalized bytes and fingerprint unchanged. | Test (TC-1879) |
| FR-147-AC-9 | The Rust and Node normalizers and the fingerprinter keep the authored order of `positions` (a tuple of eleven positions keeps `p10` after `p9`), normalizing a normalized document is the identity, the written bytes of a document with no `positions` are unchanged, and `/types/*/positions` is in no identity-set path list. | Test (TC-1880) |
| FR-147-AC-10 | The classifier reports `breaking` for a tuple that gains a position, loses a position, has its position types swapped, or has one position retyped, `patch` for an unchanged tuple and for a tuple whose only change is an `origin`, and `breaking` for a variant that gains, loses or changes a `payloadType`, in the Rust and Node classifiers alike. | Test (TC-1881) |
| FR-147-AC-11 | A request whose IR declares a construct of the shape `tuple` is refused for every target by the generation seam with state `unsupported` and one blocking `UNSUPPORTED_CONSTRUCT_SHAPE`, writes no file, and a request with no such construct is unchanged. | Test (TC-1882) |
| FR-147-AC-12 | An enumeration artifact whose `## Payloads` table has a `Payload` token for a value lowers that value to a variant with `payloadType` and every other value to a variant with none, reading the `## Payloads` table as the source form of a variant payload (the `## Values` table keeps its `Value` and `Description` columns), resolving a native name and a bundle artifact as a `Type` cell is resolved, raises one blocking `UNRESOLVED_TYPE_TOKEN` at the row of an unresolved token and one blocking `ARTIFACT_NOT_LOWERED` at a row naming no value or repeating one, and writes the same bytes as before for an artifact with no `## Payloads` table. | Test (TC-1883) |
| FR-147-AC-13 | A tuple artifact lifts to one type with `positions` in table order, identities `<tuple identity>/p<i>` and the origin at the row; a tuple artifact with no row or a non-conforming artifact id raises the blocking `ARTIFACT_NOT_LOWERED` at its artifact, and a position whose token resolves to no type raises the blocking `UNRESOLVED_TYPE_TOKEN` at its row; two runs write identical bytes. | Test (TC-1884) |
| FR-147-AC-14 | The shared vectors `cases.json` beside `tuple-union.json` record, for every case, the Node reader verdict (refused or admitted) and the Rust reader codes and pointers, and the Node and Rust suites each assert their recorded verdicts. | Test (TC-1885) |
| FR-147-AC-15 | A union variant whose `payloadType` is `ix://quire/native/Clock`, directly or through an alias of it, raises exactly one `INVALID_CLOCK_MEMBER` at `…/variants/<i>/payloadType` from the Rust reader, the Node reader and the independent TypeScript reader, following QSpec FR-322 pending STD-528, while `ix://quire/unit/<name>` and a nullary variant (no `payloadType`, QSpec #468) raise nothing. | Test (TC-1886) |

## Dependencies

- **Upstream**: [FR-050](./FR-050-validate-and-normalize-the-emitted-ir.md) (the readers and their code table), [FR-069](./FR-069-canonicalize-and-classify-the-ir-surface.md) (normalized and fingerprint forms), [FR-141](./FR-141-carry-the-model-members-in-the-semantic-ir.md) (the model members this extends), [FR-142](./FR-142-declare-one-construct-per-object-type.md) (the construct vocabulary this extends)
- **Referenced**: [FR-051](./FR-051-diff-and-evolve-the-semantic-ir.md) (compatibility), [FR-058](./FR-058-refuse-unsupported-constructs-with-stable-diagnostics.md) (refusal of an unsupported construct), [FR-093](./FR-093-lower-field-declarations-to-ir-fields.md) (enumeration artifacts), [FR-097](./FR-097-normalize-validate-and-write-the-lifted-document.md) (the written document), [FR-145](./FR-145-name-the-normalized-ir-canonicalization.md) (the normalizer), [FR-146](./FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md) (Clock and unit positions), QSpec FR-154, FR-208 and FR-322 (domain package intake, the meanings, and the V2 wire shape), QSL FR-120 (finite-domain enumeration of tuples and unions)
