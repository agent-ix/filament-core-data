---
id: FR-148
title: "Carry option value types in the semantic IR"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-006"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-050"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-141"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-146"
    type: "references"
  - target: "ix://agent-ix/filament-core-data/FR-147"
    type: "references"
  - target: "ix://agent-ix/filament-core-data/FR-097"
    type: "references"
  - target: "ix://agent-ix/filament-core-data/FR-079"
    type: "references"
  - target: "ix://agent-ix/quire-specification/FR-154"
    type: "references"
  - target: "ix://agent-ix/quire-specification/FR-322"
    type: "references"
---
# FR-148: Carry option value types in the semantic IR

## Description

This requirement answers Linear IR-1239 (STD-627). QSpec FR-154 "Option value
types" admits an **option value type**: a type definition of `kind` `option`
with exactly one member `inner`, a type reference, denoting `Option<T>` for the
type `T` that `inner` names (an absent value or one present `T` value). The
type reference grammar stays the three forms (native, unit, package identity)
with no type argument. The semantic IR carried no such kind; the extraction
frontend, the readers and the schema had to be told what `Option<T>` is before
QSL could read one from an admitted domain package.

The option value type is the type-level spelling of the same `Option<T>` that
presence `optional` writes on a field. The two differ in reach only: presence
exists on a field, so an optional element, map value, tuple position, variant
payload, alias target or parameter is an option value type and nothing else.
This requirement carries the kind, refuses what QSpec FR-154 assigns to the
producer and the readers, and names the accessors a consumer reads the option
through. It does not derive the checked-package `composite_type`/`option` node
(QSpec FR-322 step 4); that belongs to the checked-package reader.

| Term | Meaning |
|---|---|
| option value type | A type definition with `kind` `option` and one `inner` |
| inner | The member naming `T`: a string type identity |
| value type | A scalar, record, enumeration, union, alias, sequence, map, reference, tuple or unit type; not a namespace, state machine, interface or process |

## Inputs

- A semantic IR `2.0.0` document whose type definitions may have the core kind
  `option`
- The vectors OP-01 to OP-41 of QSpec
  `proposals/checked-package-v2/model-option-type-vectors.json`, read from the
  QSpec repository at git ref `fa6be9cd` or later and never copied

## Outputs

- The schema shape below, published in `schema/semantic/v1/semantic-ir.schema.json`
- The reader verdicts below, independently from the Rust reader
  (`agent_ix_semantic_ir::decide`), which every lift of the extraction frontend
  passes through (FR-097), the Node `readContractIr`, the independent TypeScript
  reader `test/semantic-ir-v1-1-reader.ts` and the Python reader
  `tests/semantic_ir_reader.py`; each applies the published schema for the shape
  rows and the semantic rules below, and each refusal is a typed, located
  diagnostic in its existing public envelope. Reader independence remains
  governed by FR-050-CON-1 and CON-2.
- The option-bearing generated Python surfaces
  `python_backend/generated/<profile-id>/semantic_ir_schema.py`, regenerated
  through the existing generation route and checked under
  [FR-079-CON-2](./FR-079-emit-the-python-package-layout.md), rather than hand-edited
- The accessors `Document::option_inner`, `Document::member_option` and
  `TypeDefinition::option_inner`

## Behavior

### The kind and the `inner` member

- The core kind enumeration SHALL be `scalar`, `record`, `enum`, `union`,
  `alias`, `sequence`, `map`, `reference` and `option`.
- A type definition of kind `option` SHALL carry exactly one type-specific
  member, `inner`, a semantic identity string. It SHALL carry no `fields`,
  `supertypes`, `items`, `values`, `variants`, `positions`, `clauses`,
  `operations`, `relationships` or `target`, and no `constraints`. No other
  kind carries `inner`.
- A missing, `null`, empty, non-string, array or object `inner`, an `inner`
  that is not an identity (`Integer`), and each foreign member above SHALL be
  `SCHEMA_VIOLATION`, an absent `inner` at the type and every other defect at
  its member.

### Inner resolution

- An `inner` naming a native name outside the kernel library
  (`ix://quire/native/Int`), `ix://quire/native/Clock` or an alias of it,
  an option value type (directly, through an alias, or itself), or a namespace,
  state machine, interface or process SHALL raise `INVALID_OPTION_INNER` at
  `inner`. `Option<Option<T>>` has no spelling and is never flattened.
- An `inner` that is a package identity naming no declared type SHALL raise
  `UNRESOLVED_OPTION_INNER` at `inner`.
- A native scalar, a well-formed `ix://quire/unit/<name>` and any value type
  are admitted as `inner`; a malformed unit reference is `UNRESOLVED_TYPE_REF`
  as at every type position.

### Presence

- A field of option value type, directly or through an alias, with presence
  `optional` and multiplicity `[1, 1]` (lower and upper `1`, any ordered and
  unique flags) SHALL raise `INVALID_OPTION_PRESENCE` at the field's
  `presence`: it would be `Option<Option<T>>`. Presence `required`, and
  presence `optional` with a collection multiplicity, are admitted.
- `Document::member_option` returns, for a cardinality-one member, the `T` of
  its `Option<T>` and the spelling that wrote it (`Type` or `Presence`); a
  member of option type with presence `required` and a member of `T` with
  presence `optional` return the same `T`. `Document::option_inner` returns
  the `inner` of an option value type a reference names directly or through
  an alias.

### Other positions

- A `reference` whose `target` is an option value type SHALL raise
  `UNRESOLVED_TYPE_REF` at `target`; a field typed `ix://quire/native/Option`,
  `ix://quire/native/Option<Integer>` or `ix://quire/native/option` SHALL be
  refused at its `typeRef`.
- No constraint applies to an option value type: a constraint whose
  `appliesTo` names one raises `CONSTRAINT_NOT_APPLICABLE` at the constraint.
- An option value type is admitted at a field, parameter and result
  `typeRef`, an alias `target`, a sequence `items`, a map `values`, a tuple
  position and a variant `payloadType`, and the type traversal visits its
  `inner` as the `OptionInner` position.

### Frontend and generation

- The extraction frontend's `Kind` SHALL name `Option`, its `TypeDefinition`
  SHALL carry `inner`, and its applicability table SHALL admit no constraint
  keyword on an option. A lift passes every document through the reader
  (FR-097), so the refusals above reach a producer as `INVALID_IR`.
- No generation backend renders an option value type; the generation seam
  refuses a request whose IR declares one with `UNSUPPORTED_CONSTRUCT_SHAPE`.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-148-CON-1 | Adding the kind SHALL change no byte of a document that declares none. | Compatibility | Test |
| FR-148-CON-2 | No layer SHALL approximate an option as its `inner`, a nullable member or an optional field. | Integrity | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-148-AC-1 | The kind enumeration names `option` in the schema, the extraction frontend and the reader, and a kind outside it is refused; the vector documents OP-09, OP-10 and OP-20 (an option over a native, a unit and a record, an alias of an option, an option at a sequence `items`, map `values`, tuple position and variant payload, and presence `optional` on a collection of options) are accepted with no diagnostic (QSpec FR-154-AC-39). | Test (TC-1887, TC-1893) |
| FR-148-AC-2 | An option with no `inner`, a `null`, empty, numeric, object, one-element-array or two-element-array `inner`, an `inner` of `Integer`, and one declaring a field, an operation, a supertype, a position, an `items` member or a non-empty `constraints` each raise exactly one `SCHEMA_VIOLATION` at the member (the type for an absent `inner`): vectors OP-25 to OP-32 and OP-34 to OP-39 (QSpec FR-154-AC-41). | Test (TC-1888) |
| FR-148-AC-3 | An option whose `inner` is an option, an alias of one, itself, `ix://quire/native/Clock`, an alias of it, a namespace or `ix://quire/native/Int` raises exactly one `INVALID_OPTION_INNER` at `inner`, and one whose `inner` is a package identity naming no node raises exactly one `UNRESOLVED_OPTION_INNER`: vectors OP-11 to OP-17 and OP-33 (QSpec FR-154-AC-40, AC-41). | Test (TC-1889) |
| FR-148-AC-4 | A field typed by an option value type, or by an alias of one, with presence `optional` and multiplicity `[1, 1]` in either flag order raises exactly one `INVALID_OPTION_PRESENCE` at its `presence`, and the same field with presence `required` or with a collection multiplicity raises nothing: vectors OP-18, OP-19, OP-20 and OP-41 (QSpec FR-154-AC-40). | Test (TC-1890) |
| FR-148-AC-5 | A `reference` to an option raises `UNRESOLVED_TYPE_REF` at `target`, a field typed `ix://quire/native/Option`, `ix://quire/native/Option<Integer>` or `ix://quire/native/option` is refused at its `typeRef`, and a constraint applying to an option raises `CONSTRAINT_NOT_APPLICABLE`: vectors OP-21 to OP-24, OP-39 and OP-40 (QSpec FR-154-AC-40, AC-41). | Test (TC-1891) |
| FR-148-AC-6 | `Document::option_inner` and `Document::member_option` read the field and operation types of vectors OP-01 to OP-08 as `Option<Integer>` for `a`, `b`, `g` and the operation parameter and result, `Option<Quantity<ms>>` for `c`, `Sequence<Option<Integer>>[0, 3]` for `d`, `Option<Sequence<Integer>[0, 3]>` for `e` and an option over the record for `f`; `a` and `b` name the same `T` through the two spellings (QSpec FR-322-AC-298). | Test (TC-1892) |
| FR-148-AC-7 | The extraction frontend's `Kind::Option` serializes as `option`, its `TypeDefinition` carries `inner` and exposes it through `option_inner`, and a definition of any other kind exposes none. | Test (TC-1894) |
| FR-148-AC-8 | A generation request whose IR declares an option value type is refused for every target by the generation seam with state `unsupported` and one blocking `UNSUPPORTED_CONSTRUCT_SHAPE`, and a request with none is unchanged. | Test (TC-1895) |
| FR-148-AC-9 | For every vector OP-01 to OP-41 read by ref from the QSpec input above, the Node `readContractIr`, independent TypeScript reader and Python reader agree with the existing Rust reader on the corresponding semantic IR document: OP-01 to OP-10 and OP-20 are accepted with no diagnostic; each rejection row yields exactly one refusal for the code and located member required by AC-2 to AC-5. The gate documents the mapping from each existing reader envelope to the Rust vector mapping, preserving each vector's expected path and cause, each reader's published ABI, and severity and blocking status where exposed. For the schema shape rows OP-23, OP-25 to OP-32 and OP-34 to OP-39, the compiler's `INVALID_IR` envelope is mapped using its original schema error and pointer to the evidence readers' `SCHEMA_VIOLATION`, rather than synthesizing a matching result; semantic refusals retain their existing codes and locations. | Test |

## Dependencies

- **Upstream**: [FR-050](./FR-050-validate-and-normalize-the-emitted-ir.md) (the readers and their code table), [FR-141](./FR-141-carry-the-model-members-in-the-semantic-ir.md) (the model members this extends)
- **Referenced**: [FR-097](./FR-097-normalize-validate-and-write-the-lifted-document.md) (validation at lift time), [FR-146](./FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md) (Clock and quantity references), [FR-147](./FR-147-carry-tuple-value-types-and-union-variant-payloads.md) (tuple positions and variant payloads), QSpec FR-154 and FR-322
- **Generated Python surfaces**: [FR-079](./FR-079-emit-the-python-package-layout.md) (the existing regeneration and `--check` obligation, including CON-2)
