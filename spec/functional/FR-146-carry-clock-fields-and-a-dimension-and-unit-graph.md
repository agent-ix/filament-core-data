---
id: FR-146
title: "Carry clock fields, quantity type references and a dimension and unit graph in the semantic IR"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-006"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-027"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-050"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-069"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-141"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-144"
    type: "references"
  - target: "ix://agent-ix/filament-core-data/FR-092"
    type: "references"
  - target: "ix://agent-ix/filament-core-data/FR-100"
    type: "references"
  - target: "ix://agent-ix/quire-specification/FR-142"
    type: "references"
  - target: "ix://agent-ix/quire-specification/FR-154"
    type: "references"
  - target: "ix://agent-ix/quire-specification/FR-322"
    type: "references"
  - target: "ix://agent-ix/quire-specification/FR-415"
    type: "references"
  - target: "ix://agent-ix/quire-spec-language/FR-230"
    type: "references"
  - target: "ix://agent-ix/quire-spec-language/FR-185"
    type: "references"
  - target: "ix://agent-ix/quire-spec-language/FR-393"
    type: "references"
---
# FR-146: Carry clock fields, quantity type references and a dimension and unit graph in the semantic IR

## Description

This requirement answers Linear STD-295 (the deliverable of STD-192).

The semantic IR at contract `2.0.0` SHALL carry three things a timed domain
model needs, so that a QSL unit can check a model whose object types have
clocks and whose quantities are in units the domain package declares:

| Construct | Where | Meaning |
|---|---|---|
| `ix://quire/native/Clock` | a field `typeRef` | The field is a clock: a real-valued timer that the model checker owns, one per object and field, read only inside clock constraints (QSpec FR-415). It carries no data value. |
| `dimensions` | document | The dimension nodes of the package: base dimensions such as `Time`, and derived dimensions as products of base dimensions raised to integer exponents (QSpec FR-142). |
| `units` | document | The unit nodes of the package: each typed by one dimension, either the dimension's root or a unit with an exact scale and offset to a target unit of the same dimension (QSpec FR-142). |
| `ix://quire/unit/<name>` | a field, parameter or result `typeRef` | The member holds a quantity in unit `<name>`: QSpec's `Quantity<u>` (QSpec FR-142, FR-322 "Model-owned members" step 4). |

A clock is not a quantity: it holds no value in the IR, has no unit of its own,
and takes its unit from the model's `time` member in QSL source (QSL FR-230).
The IR gives no dimension or unit a built-in meaning. `Time`, `s` and `ms` are
ordinary declarations; QSL reads the base dimension named `Time` as its time
dimension (QSL FR-230).

The FR-027 field `unit` member is unchanged: it is an opaque UCUM annotation
on a scalar field for generated targets, and no reader resolves it against the
unit graph.

## Inputs

- A semantic IR `2.0.0` document whose fields may name `ix://quire/native/Clock`,
  whose fields, operation parameters and operation results may name
  `ix://quire/unit/<name>`, and which may carry top-level `dimensions` and
  `units` arrays

## Outputs

- The schema shapes below, published in `schema/semantic/v1/semantic-ir.schema.json`
- The reader verdicts below, from every IR reader of FR-050 (`readContractIr`
  and `agent_ix_semantic_ir::decide` included), each refusal a located
  diagnostic under the `agent-ix.semantic-ir` namespace

## Behavior

### Clock fields

- Every IR reader SHALL resolve the native reference `ix://quire/native/Clock`
  as a field type that names no node of the document, as it resolves the other
  native references of FR-092, and SHALL resolve it to no IR scalar.
- If `ix://quire/native/Clock` appears anywhere other than the `typeRef` of a
  field in a type definition's `fields` (an operation parameter or result
  `typeRef`, an `alias` or `reference` `target`, a sequence `items`, a map
  `values`, a variant `payloadType` or a constraint `appliesTo`), then the
  reader SHALL refuse `agent-ix.semantic-ir.CLOCK_OUTSIDE_FIELD` at that
  member.
- A clock field SHALL carry `multiplicity` `{lower: 1, upper: 1, ordered: false,
  unique: false}`, `presence` `required`, `nullable` `false` and `defaultKind`
  `none`, and SHALL carry no `unit`, `decimal`, `textProfile`, `defaultValue`
  or non-empty `constraints`. If a clock field breaks any of these, then the
  reader SHALL refuse `agent-ix.semantic-ir.INVALID_CLOCK_FIELD` at the field,
  naming the offending member.
- The reader SHALL NOT check which construct owns a clock field or whether the
  model declares a time source; those are QSL's checks (QSL FR-230,
  `clock-without-dense-time`).
- No member of the IR SHALL carry a clock's value: a clock is zero in every
  initial state and a population names objects, not field values (QSpec
  FR-415, FR-141).

### Dimensions

- The document MAY carry `dimensions`, an array of dimension nodes. Each node
  SHALL carry exactly `identity`, `name`, `terms` and `origin`.
- `name` SHALL match `^[A-Za-z][A-Za-z0-9_]*$`, and `identity` SHALL equal
  `ix://<package.identity>/dimension/<name>`.
- `terms` SHALL be an array of `{dimension, exponent}` objects, where
  `dimension` is the identity of a dimension node of the same document and
  `exponent` is a canonical integer string (FR-144) other than `0`. An empty
  `terms` declares a base dimension.
- If a term names a dimension the document does not declare, then the reader
  SHALL refuse `agent-ix.semantic-ir.UNRESOLVED_DIMENSION_REF` at the term.
- If a dimension's terms name one dimension twice, have exponent `0`, or close
  a cycle of terms (a dimension reaching itself through terms, a self-term
  included), or if an identity does not equal the form above, then the reader
  SHALL refuse `agent-ix.semantic-ir.INVALID_UNIT_GRAPH` at the dimension.

### Units

- The document MAY carry `units`, an array of unit nodes. Each node SHALL carry
  `identity`, `name`, `dimension`, `scale`, `offset` and `origin`, and MAY
  carry `target`.
- `name` SHALL match `^[A-Za-z][A-Za-z0-9_]*$`, and `identity` SHALL equal
  `ix://<package.identity>/unit/<name>`. Dimensions and units are separate
  namespaces, so a dimension and a unit may share a name.
- `dimension` SHALL name a dimension node of the same document, and `target`,
  where present, a unit node of the same document.
- `scale` and `offset` SHALL each be a canonical rational string: a canonical
  integer string (FR-144), or `n/d` where `n` is a canonical integer string
  other than `0`, `d` is a canonical integer string of at least `2`, and `n`
  and `d` have no common factor above `1`. A unit edge means
  `target_value = scale × source_value + offset` (QSpec FR-142).
- A unit with no `target` SHALL be its dimension's root and SHALL carry
  `scale` `1` and `offset` `0`.
- If `dimension` names no dimension of the document, then the reader SHALL
  refuse `agent-ix.semantic-ir.UNRESOLVED_DIMENSION_REF` at the unit; if
  `target` names no unit of the document, then the reader SHALL refuse
  `agent-ix.semantic-ir.UNRESOLVED_UNIT_REF` at the unit.
- If `scale` or `offset` is spelled otherwise, then the reader SHALL refuse
  `agent-ix.semantic-ir.INVALID_OPERAND` at that member.
- The reader SHALL refuse `agent-ix.semantic-ir.INVALID_UNIT_GRAPH`, naming the
  dimension and the units shown, for each of these graph defects: a unit whose
  `scale` is `0`; a unit whose `target` is typed by another dimension; a
  dimension with two or more root units; a root unit whose `scale` is not `1`
  or whose `offset` is not `0`; a cycle of `target` edges, a unit targeting
  itself included; and an identity that does not equal the form above.
- The reader SHALL NOT require a dimension to have units, and SHALL NOT apply
  QSpec FR-142's base-dimension rule or its first-defect order: a consumer that
  admits the graph into its own checked package applies those (QSL FR-230,
  QSpec FR-142).

### Quantity type references

- Every IR reader SHALL admit `ix://quire/unit/<name>` as the `typeRef` of a
  field, of an operation parameter and of an operation result, where `<name>`
  is one or more segments matching `^[A-Za-z][A-Za-z0-9_]*$` joined by `/`.
  It names a unit of the consumer's checked package (QSpec FR-322 "Model-owned
  members" step 4).
- When `<name>` is one segment equal to the `name` of a unit node of the
  document, the reader SHALL resolve the reference to that unit node.
- When the document declares no unit of that name, the reader SHALL admit the
  reference unresolved and raise nothing, because the consumer's unit graph,
  which also holds the units its own source declares, resolves it (QSpec
  FR-154, FR-322-AC-80).
- If `ix://quire/unit/<name>` appears in any other position (an `alias` or
  `reference` `target`, a sequence `items`, a map `values`, a variant
  `payloadType` or a constraint `appliesTo`), or `<name>` does not have the form
  above, then the reader SHALL refuse `agent-ix.semantic-ir.UNRESOLVED_TYPE_REF`
  at that member.
- A member typed by a unit reference SHALL carry no `unit`, `decimal`,
  `textProfile`, `defaultValue` or non-empty `constraints`, and its
  `defaultKind` SHALL be `none`; otherwise the reader SHALL refuse
  `agent-ix.semantic-ir.INVALID_QUANTITY_MEMBER` at the member, naming the
  offending member. Its `multiplicity`, `presence` and `nullable` follow the
  rules of any other member (FR-027, FR-106).

### Normalization and compatibility

- The normalized form (FR-069) SHALL keep `dimensions`, `units` and each
  `terms` array in authored order, and the fingerprint form SHALL treat
  `dimensions` and `units` as identity-sorted sets and each `terms` array as a
  set sorted by `dimension`.
- A document with no `dimensions` and no `units` SHALL serialize with neither
  member, so every document valid before this requirement keeps its bytes and
  its fingerprint.
- The compatibility classifier (FR-025, FR-051) SHALL classify an added
  dimension or unit as additive, and a removed dimension or unit, or a changed
  `terms`, `dimension`, `target`, `scale` or `offset`, as breaking.

### Generation backends

- If a document carries a clock field or a member typed by a unit reference,
  then each generation backend (Rust, TypeScript, Python, JSON Schema and
  SysML v2) SHALL raise the blocking `agent-ix.semantic-ir.UNDECLARED_LOSS`
  naming the member and write no file, rather than map the member to a scalar
  of its target language.
- A generation backend SHALL ignore `dimensions` and `units` that no member
  references.

### How QSL consumes it

- QSL intake runs `agent_ix_semantic_ir::decide` over the admitted document
  (QSpec FR-154), so every refusal above reaches QSL as an intake refusal.
- QSL reads a field typed `ix://quire/native/Clock` as a `Clock` field of the
  owning model object type (QSL FR-230, QSL FR-393's `TypeForm::Clock`), and
  reads `dimensions` and `units` into the unit graph of its checked package,
  beside the dimensions and units its own source declares (QSL FR-230). A
  domain package that supplies time units declares a base dimension named
  `Time`, a root unit such as `s` and scaled units such as `ms` with `scale`
  `1/1000` and `target` `s`.
- QSL reads a member typed `ix://quire/unit/<name>` as `Quantity<u>` (QSpec
  FR-142, QSL FR-185 "Quantity-typed parameters").

### Scope

- The spec-bundle extraction frontend (FR-091 to FR-099) lowers no clock
  field, dimension, unit or unit reference: a `Clock` `Type` cell is
  classified by FR-092 as the engine reports it. A producer that needs these
  constructs writes the IR document directly.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-146-CON-1 | Every IR reader SHALL return the same verdict, code and locus for each clock, dimension, unit and unit-reference case of this requirement. | Parity | Test |
| FR-146-CON-2 | Adding this requirement's members SHALL change no byte and no fingerprint of a document that carries none of them. | Compatibility | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-146-AC-1 | A document of package `acme/rpc` whose object type `Call` has a field `x` typed `ix://quire/native/Clock` with multiplicity `{1, 1, false, false}`, presence `required`, nullable `false` and defaultKind `none` is accepted by every reader with no diagnostic, and no `types[]` node is declared for the clock. | Test (TC-1842) |
| FR-146-AC-2 | `ix://quire/native/Clock` as an operation parameter type, an operation result type, an alias target, a sequence `items`, a map `values`, a variant `payloadType` and a constraint `appliesTo` each refuse `CLOCK_OUTSIDE_FIELD` at that member; a clock field with multiplicity `{0, 1}`, presence `optional`, `nullable: true`, `defaultKind: semantic`, a `unit` of `ms`, or a `min` constraint each refuse `INVALID_CLOCK_FIELD` at the field naming the member. | Test (TC-1843) |
| FR-146-AC-3 | A document declaring base dimension `Time` (`ix://acme/rpc/dimension/Time`, no terms), root unit `s` (`scale` `1`, `offset` `0`) and unit `ms` (`target` `s`, `scale` `1/1000`, `offset` `0`), and a derived dimension `Rate` with terms `[{Time, -1}]`, is accepted by every reader; the same document without `dimensions` and `units` serializes with neither member. | Test (TC-1844) |
| FR-146-AC-4 | A term naming an undeclared dimension and a unit typed by an undeclared dimension each refuse `UNRESOLVED_DIMENSION_REF`; a unit targeting an undeclared unit refuses `UNRESOLVED_UNIT_REF`; scale `0`, a target in another dimension, two roots of `Time`, a root with scale `2` or offset `273`, a two-unit target cycle, a self-target, a dimension term cycle, a repeated term dimension, a term exponent `0` and an identity `ix://acme/rpc/unit/msec` on a unit named `ms` each refuse `INVALID_UNIT_GRAPH` naming the dimension and the units shown; a dimension `Time` with no units is accepted. | Test (TC-1845) |
| FR-146-AC-5 | Scale spellings `2/4`, `1/1`, `-0`, `0/5`, `01/3` and the JSON number `0.001` each refuse `INVALID_OPERAND` (or `SCHEMA_VIOLATION` where the schema refuses the type) at the member, and `1/1000`, `-3/2` and `273` are accepted. | Test (TC-1846) |
| FR-146-AC-6 | A field and an operation parameter typed `ix://quire/unit/ms` in the AC-3 document resolve to the unit `ms`; the same references in a document that declares no units are accepted with no diagnostic; `ix://quire/unit/ms` as an alias target or sequence `items` refuses `UNRESOLVED_TYPE_REF`, and so do `ix://quire/unit/` and `ix://quire/unit/3ms`; a unit-typed field carrying `unit: "ms"`, a `min` constraint, a `decimal` policy or a semantic default refuses `INVALID_QUANTITY_MEMBER`. | Test (TC-1847) |
| FR-146-AC-7 | Two documents differing only in the order of `units` and of a dimension's `terms` have equal fingerprints and unequal normalized bytes; every committed positive fixture keeps its bytes and fingerprint; adding a unit classifies additive, and removing one or changing its `scale` classifies breaking. | Test (TC-1848) |
| FR-146-AC-8 | The AC-1 document and the AC-6 document each make every generation backend raise the blocking `UNDECLARED_LOSS` naming the clock or unit-typed member and write no file; a document whose `dimensions` and `units` no member references generates exactly what it generates without them. | Test (TC-1849) |

## Dependencies

- **Upstream**: [FR-027](./FR-027-declare-field-multiplicity-and-units.md) (the field and its opaque `unit` annotation), [FR-050](./FR-050-validate-and-normalize-the-emitted-ir.md) (the readers and their codes), [FR-069](./FR-069-canonicalize-and-classify-the-ir-surface.md) (normalized and fingerprint forms), [FR-141](./FR-141-carry-the-model-members-in-the-semantic-ir.md) (the model members this extends), [FR-144](./FR-144-carry-exact-numeric-scalars-under-one-literal-encoding.md) (canonical integer strings)
- **Referenced**: [FR-092](./FR-092-resolve-type-tokens-to-declared-artifacts.md) (native references), [FR-100](./FR-100-map-semantic-ir-to-json-schema.md) (`UNDECLARED_LOSS`), QSpec FR-142 (dimension and unit algebra), QSpec FR-154 and FR-322 (domain package intake and member types), QSpec FR-415 (clocks), QSL FR-230 (clock fields and the time dimension), QSL FR-185 (quantity-typed parameters), QSL FR-393 (the `Clock` type form)
