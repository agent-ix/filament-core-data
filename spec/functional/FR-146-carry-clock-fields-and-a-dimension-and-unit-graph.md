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
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-032"
    type: "references"
  - target: "ix://agent-ix/filament-core-data/FR-058"
    type: "references"
  - target: "ix://agent-ix/filament-core-data/FR-092"
    type: "references"
  - target: "ix://agent-ix/filament-core-data/FR-100"
    type: "references"
  - target: "ix://agent-ix/filament-core-data/FR-145"
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
  - target: "ix://agent-ix/filament-core-data/FR-054"
    type: "references"
  - target: "ix://agent-ix/filament-core-data/FR-064"
    type: "references"
  - target: "ix://agent-ix/filament-core-data/FR-136"
    type: "references"
  - target: "ix://agent-ix/filament-core-data/FR-138"
    type: "references"
  - target: "ix://agent-ix/filament-core-data/FR-091"
    type: "references"
  - target: "ix://agent-ix/filament-core-data/FR-093"
    type: "references"
  - target: "ix://agent-ix/filament-core-data/FR-094"
    type: "references"
---
# FR-146: Carry clock fields, quantity type references and a dimension and unit graph in the semantic IR

## Description

This requirement answers Linear STD-295 (the deliverable of STD-192).

The semantic IR at contract `2.0.0` SHALL carry the constructs a timed domain
model needs, so that a QSL unit can check a model whose object types have
clocks and whose quantities are in units the domain package declares:

| Construct | Where | Meaning |
|---|---|---|
| `ix://quire/native/Clock` | a field, parameter, result, alias `target` or variant `payloadType` | The member is a clock: a real-valued timer that the model checker owns, one per object and field, or one per element when the member is a collection (QSpec FR-415 "Clock collections"), read only inside clock constraints (QSpec FR-415). It carries no data value. |
| `dimensions` | document | The dimension nodes of the package: base dimensions such as `Time`, and derived dimensions, each a product of dimensions of the package raised to integer exponents, the empty product being the dimensionless dimension (QSpec FR-142). |
| `units` | document | The unit nodes of the package: each typed by one dimension, either the dimension's root or a unit with an exact scale and offset to a target unit of the same dimension (QSpec FR-142). |
| `ix://quire/unit/<name>` | a field, parameter, result, alias `target`, sequence `items`, map `values` or variant `payloadType` | The position holds a quantity in unit `<name>`: QSpec's `Quantity<u>` (QSpec FR-142, FR-322 "Model-owned members" step 4). |

A clock is not a quantity: it holds no value in the IR, has no unit of its own,
and takes its unit from the model's `time` member in QSL source (QSL FR-230).
A clock is zero in every initial state, and a population names objects, not
field values (QSpec FR-415, FR-141), so no IR member carries a clock's value;
the clock member shape below refuses a default. Whether a clock is present is
the member's presence: a required clock is always present and an optional one
is `Option<Clock>`.

The IR gives no dimension or unit a built-in meaning. `Time`, `s` and `ms` are
ordinary declarations; QSL reads the dimension of a model's time unit as its
time dimension when that dimension is a base dimension named `Time` (QSL
FR-230).

The FR-027 field `unit` member is unchanged: it is an opaque UCUM annotation
on a scalar field for generated targets, and no reader resolves it against the
unit graph.

## Inputs

- A semantic IR `2.0.0` document whose fields, operation parameters, operation
  results, alias targets and variant payloads may name `ix://quire/native/Clock`,
  whose fields, operation parameters, operation results, alias targets, sequence
  items, map values and variant payloads may name `ix://quire/unit/<name>`, and
  which may carry top-level `dimensions` and `units` arrays
- A spec bundle whose artifacts declare dimensions and units and whose `Type`
  cells name `Clock` or `Quantity<unit>` (the extraction frontend, below)

## Outputs

- The schema shapes below, published in `schema/semantic/v1/semantic-ir.schema.json`
- The reader verdicts below, from every IR reader of FR-050 (`readContractIr`
  and `agent_ix_semantic_ir::decide` included), each refusal a located
  diagnostic under the `agent-ix.semantic-ir` namespace whose pointer is the
  one this requirement names

## Behavior

Pointers below are RFC 6901 pointers into the document. `<field>` stands for a
field's pointer, such as `/types/0/fields/2`, and `<member>` for the pointer of
a field or operation parameter.

### The native set

- Every IR reader SHALL resolve `ix://quire/native/<Name>` against one closed
  native set: the FR-032 kernel scalars, `Text` (FR-141) and `Clock`.
- `Clock` SHALL NOT be an FR-032 kernel scalar: `packages/semantic-core/kernel-scalars.json`
  carries no `Clock` entry.
- Every IR reader SHALL resolve `ix://quire/native/Clock` to no IR scalar and to
  no node of the document.

### Clock members

- A **clock member** is a field in a type definition's `fields`, an operation
  parameter or an operation result whose `typeRef` is `ix://quire/native/Clock`
  or the identity of an `alias` whose `target` chain reaches it. A clock field
  of a record, an object type or any other type definition with `fields` is a
  clock member.
- The reader SHALL admit `ix://quire/native/Clock` as a field `typeRef`, an
  operation parameter `typeRef`, an operation result `typeRef`, an `alias`
  `target`, a sequence `items`, a map `values` and a variant `payloadType`.
  A clock member whose multiplicity has no upper bound or an upper bound above
  `1`, and a sequence or map over `Clock`, is a **clock collection**: it has one
  clock for each element it holds (QSpec FR-415 "Clock collections").
- If `ix://quire/native/Clock`, or an alias that reaches it, is a `reference`
  `target` or a constraint `appliesTo`, then the reader SHALL refuse
  `agent-ix.semantic-ir.CLOCK_POSITION_INVALID` at that member's pointer
  (`/types/<i>/target` or `…/constraints/<c>/appliesTo`), because a reference
  names an object and no constraint keyword applies to a clock.
- In every other identity-valued member (`supertypes`, a relationship end,
  a population member, a frame entry and the like), the reader SHALL apply that
  member's own resolution rule to `ix://quire/native/Clock`, raising no FR-146
  code there.
- The clock member shape SHALL be: for a field or a parameter, any `multiplicity`
  `{lower, upper?, ordered, unique}` that FR-027 admits for any member (the
  reader's `INVALID_MULTIPLICITY` applies to it as to any member), `presence`
  `required` or `optional` (`optional` is `Option<Clock>`), `nullable` `false`,
  `defaultKind` `none`, an empty or absent `constraints`, and no `unit`,
  `decimal`, `textProfile` or `defaultValue`; for a result, any `multiplicity` (`{0, 1, false, false}` is
  `Option<Clock>`) and `nullable` `false`.
- If a clock member breaks the shape, then the reader SHALL refuse
  `agent-ix.semantic-ir.INVALID_CLOCK_MEMBER` once for each member that breaks
  it, at `<member>/presence`, `<member>/nullable`,
  `<member>/defaultKind`, `<member>/defaultValue`, `<member>/unit`,
  `<member>/decimal`, `<member>/textProfile` or `<member>/constraints`, or, for
  a result, at `/types/<i>/operations/<k>/returns/nullable`.
- For a clock member, the reader SHALL raise no `UNIT_ON_NON_SCALAR`,
  `SCHEMA_VIOLATION` for `textProfile`,
  `DECIMAL_POLICY_MISSING`, `DECIMAL_POLICY_CONFLICT` or
  `INVALID_DEFAULT_VALUE` at any of the shape members, so that
  `INVALID_CLOCK_MEMBER` is the one code each such member carries.
- For a clock member, the reader SHALL NOT apply the constraint rules
  (`UNKNOWN_CONSTRAINT_KEYWORD`, `CONSTRAINT_NOT_APPLICABLE`, `INVALID_PATTERN`,
  `INVALID_OPERAND`) to its `constraints`, whose one code is the
  `INVALID_CLOCK_MEMBER` at `<member>/constraints`.
- For a clock member, every other reader rule (a schema `SCHEMA_VIOLATION` on a
  member's JSON type, `DUPLICATE_IDENTITY`, `MISSING_MULTIPLICITY`) SHALL fire
  as it does for any member.
- The reader SHALL NOT check which construct owns a clock member or whether the
  model declares a time source; those are QSL's checks (QSL FR-230,
  `clock-without-dense-time`).

### Dimensions

- The schema SHALL admit an optional top-level `dimensions` array of dimension
  nodes.
- A dimension node SHALL carry exactly `identity`, `name`, `base`, `terms` and
  `origin`.
- A dimension `name` SHALL match `^[A-Za-z][A-Za-z0-9_]*$`.
- `base` SHALL be a boolean: `true` declares a base dimension, `false` a
  derived dimension.
- `terms` SHALL be an array of `{dimension, exponent}` objects, where
  `dimension` is a semantic identity and `exponent` is a string.
- A derived dimension whose `terms` is empty SHALL denote the dimensionless
  dimension (QSpec FR-142's `N = L / L`).
- If a dimension's `identity` does not equal
  `ix://<package.identity>/dimension/<name>`, then the reader SHALL refuse
  `agent-ix.semantic-ir.INVALID_UNIT_GRAPH` at `/dimensions/<i>/identity`.
- If a base dimension's `terms` is not empty, then the reader SHALL refuse
  `agent-ix.semantic-ir.INVALID_UNIT_GRAPH` at `/dimensions/<i>/terms`.
- A dimension's identity SHALL carry the package identity, so dimensions of one
  `name` in documents of different packages are different dimensions. The
  reader SHALL compare a document's dimensions only with that document's own,
  and SHALL raise no diagnostic for a `name` that a dimension of another
  package also carries; a consumer that admits several packages names a package
  dimension through its model alias (QSpec FR-142 "Namespaces").
- If a term's `dimension` names no dimension node of the document, then the
  reader SHALL refuse `agent-ix.semantic-ir.UNRESOLVED_DIMENSION_REF` at
  `/dimensions/<i>/terms/<t>/dimension`.
- If a term's `exponent` is not a canonical integer string (FR-144), then the
  reader SHALL refuse `agent-ix.semantic-ir.INVALID_OPERAND` at
  `/dimensions/<i>/terms/<t>/exponent`.
- If a term's `exponent` is `0`, then the reader SHALL refuse
  `agent-ix.semantic-ir.INVALID_UNIT_GRAPH` at
  `/dimensions/<i>/terms/<t>/exponent`.
- If a term's `dimension` is not strictly greater, by code point, than the
  `dimension` of the term before it, then the reader SHALL refuse
  `agent-ix.semantic-ir.INVALID_UNIT_GRAPH` at `/dimensions/<i>/terms/<t>`, so
  that a dimension's terms have one spelling and name each dimension once.
- If dimensions reach themselves through resolved terms (a self-term included),
  then the reader SHALL refuse `agent-ix.semantic-ir.INVALID_UNIT_GRAPH` once
  per strongly connected component of the term graph that contains a cycle, at
  `/dimensions/<i>/terms/<t>`, where `<i>` is the component's dimension with the
  least array index and `<t>` that dimension's first term naming a member of the
  component.
- The message of a term-cycle refusal SHALL name the component's dimensions in
  array order.

### Units

- The schema SHALL admit an optional top-level `units` array of unit nodes.
- A unit node SHALL carry `identity`, `name`, `dimension`, `scale`, `offset`
  and `origin`.
- The schema SHALL admit an optional `target` on a unit node.
- A unit `name` SHALL match `^[A-Za-z][A-Za-z0-9_]*$`. Dimensions and units are
  separate namespaces, so a dimension and a unit may share a name.
- A unit's `dimension` and `target` SHALL be semantic identities.
- A unit's `scale` and `offset` SHALL be strings.
- A unit edge SHALL mean `target_value = scale × source_value + offset` (QSpec
  FR-142).
- A unit with no `target` SHALL be its dimension's root.
- If a unit's `identity` does not equal `ix://<package.identity>/unit/<name>`,
  then the reader SHALL refuse `agent-ix.semantic-ir.INVALID_UNIT_GRAPH` at
  `/units/<j>/identity`.
- If a unit's `dimension` names no dimension node of the document, then the
  reader SHALL refuse `agent-ix.semantic-ir.UNRESOLVED_DIMENSION_REF` at
  `/units/<j>/dimension`.
- If a unit's `target` names no unit node of the document, then the reader SHALL
  refuse `agent-ix.semantic-ir.UNRESOLVED_UNIT_REF` at `/units/<j>/target`.
- A canonical rational string is a canonical integer string (FR-144), or `n/d`
  where `n` is a canonical integer string other than `0`, `d` is a canonical
  integer string of at least `2`, and `n` and `d` have no common factor above
  `1`.
- If a unit's `scale` or `offset` is not a canonical rational string, then the
  reader SHALL refuse `agent-ix.semantic-ir.INVALID_OPERAND` at
  `/units/<j>/scale` or `/units/<j>/offset`.
- If a term's `exponent`, or the `n` or `d` of a unit's `scale` or `offset`, is
  outside `i128::MIN..=i128::MAX`, then the reader SHALL refuse
  `agent-ix.semantic-ir.INTEGER_OUTSIDE_I128` at that member instead of
  `INVALID_OPERAND`.
- If a unit's `scale` is `0`, then the reader SHALL refuse
  `agent-ix.semantic-ir.INVALID_UNIT_GRAPH` at `/units/<j>/scale`.
- If a unit's resolved `target` is typed by another dimension, then the reader
  SHALL refuse `agent-ix.semantic-ir.INVALID_UNIT_GRAPH` at `/units/<j>/target`,
  naming both dimensions.
- If a dimension has two or more root units, then the reader SHALL refuse
  `agent-ix.semantic-ir.INVALID_UNIT_GRAPH` at `/units/<j>` for each root after
  the first in array order, naming the dimension and the first root.
- If a root unit's `scale` is not `1`, then the reader SHALL refuse
  `agent-ix.semantic-ir.INVALID_UNIT_GRAPH` at `/units/<j>/scale`.
- If a root unit's `offset` is not `0`, then the reader SHALL refuse
  `agent-ix.semantic-ir.INVALID_UNIT_GRAPH` at `/units/<j>/offset`.
- If units reach themselves through resolved `target` edges (a self-target
  included), then the reader SHALL refuse `agent-ix.semantic-ir.INVALID_UNIT_GRAPH`
  once per cycle, at `/units/<j>/target`, where `<j>` is the cycle's unit with
  the least array index. A unit has at most one `target`, so each cycle is its
  own strongly connected component.
- The message of a unit-cycle refusal SHALL name the cycle's units in order
  from the unit with the least array index.
- The reader SHALL report every defect of this section and of "Dimensions", each
  once at its pointer, rather than stopping at the first defect.
- The reader SHALL NOT require a dimension to have units.
- The reader SHALL NOT apply QSpec FR-142's base-dimension rule or its
  first-defect order: a consumer that admits the graph into its own checked
  package applies those (QSL FR-230, QSpec FR-142).
- If two dimensions, or two units, carry one `identity` (two of one `name`
  included), then the reader SHALL refuse `agent-ix.semantic-ir.DUPLICATE_IDENTITY`
  at the later node's `/identity`, as FR-050's identity rule does for every
  other list.

### Quantity type references

- Every IR reader SHALL admit `ix://quire/unit/<name>` as the `typeRef` of a
  field, of an operation parameter and of an operation result, as an `alias`
  `target`, a sequence `items`, a map `values` and a variant `payloadType`, where `<name>`
  is one or more segments joined by `/`. The last segment is the unit name and
  matches `^[A-Za-z][A-Za-z0-9_]*$`, the unit `name` pattern. Each earlier
  segment matches that pattern or `^[a-z0-9][a-z0-9._-]*$`, the pattern of
  each `/`-separated segment of `common.schema.json#/$defs/packageIdentity`,
  so that a package unit qualified by its package identity, such as
  `ix://quire/unit/agent-ix/time-units/ms`, is well formed (QSpec FR-322
  "Model-owned members" step 4 qualifies a package unit as
  `<package identity>/<name>`). The reader checks the form of each segment
  only: it does not check that the earlier segments make up one package
  identity or how many there are, so `ix://quire/unit/a-b/c.d/e-f/ms` is
  also well formed, and the consumer's checked package resolves the name.
- The reader SHALL NOT resolve `<name>` against the document's `units`: the
  name names a unit of the consumer's checked package, whose unit graph holds
  the document's units and the units the consumer's own source declares (QSpec
  FR-322 "Model-owned members" step 4).
- The reader SHALL raise no diagnostic for a well-formed `<name>` that the
  document does not declare.
- If `ix://quire/unit/<name>` is a `reference` `target` or a constraint
  `appliesTo`, then the reader SHALL refuse
  `agent-ix.semantic-ir.UNRESOLVED_TYPE_REF` at that member's pointer, because a
  reference names an object and a bounded quantity is not a type form (QSpec
  FR-142 "Quantity type reference").
- If a `typeRef` begins `ix://quire/unit/` and `<name>` does not have the form
  above, then the reader SHALL refuse `agent-ix.semantic-ir.UNRESOLVED_TYPE_REF`
  at that `typeRef`.
- A unit-typed member is a field, operation parameter or operation result whose
  `typeRef` is a well-formed `ix://quire/unit/<name>` or the identity of an
  `alias` whose `target` chain reaches one.
- The unit-typed member shape SHALL be: `defaultKind` `none` (where the member
  has one), an empty or absent `constraints`, and no `unit`, `decimal`,
  `textProfile` or `defaultValue`.
- If a unit-typed member breaks the shape, then the reader SHALL refuse
  `agent-ix.semantic-ir.INVALID_QUANTITY_MEMBER` once for each member that
  breaks it, at `<member>/defaultKind`, `<member>/defaultValue`, `<member>/unit`,
  `<member>/decimal`, `<member>/textProfile`, `<member>/constraints` or
  `/types/<i>/operations/<k>/returns/decimal`.
- For a unit-typed member, the reader SHALL raise no `UNIT_ON_NON_SCALAR`,
  `SCHEMA_VIOLATION` for `textProfile`, `DECIMAL_POLICY_MISSING`,
  `DECIMAL_POLICY_CONFLICT` or `INVALID_DEFAULT_VALUE` at any of the shape
  members, so that `INVALID_QUANTITY_MEMBER` is the one code each such member
  carries.
- For a unit-typed member, the reader SHALL NOT apply the constraint rules
  (`UNKNOWN_CONSTRAINT_KEYWORD`, `CONSTRAINT_NOT_APPLICABLE`, `INVALID_PATTERN`,
  `INVALID_OPERAND`) to its `constraints`, whose one code is the
  `INVALID_QUANTITY_MEMBER` at `<member>/constraints`.
- A unit-typed member's `multiplicity`, `presence` and `nullable` SHALL follow
  the rules of any other member (FR-027, FR-106), so `INVALID_MULTIPLICITY` and
  `MISSING_MULTIPLICITY` fire on it as on any member.

### Normalization and compatibility

- The normalizer (FR-145) SHALL keep `dimensions`, `units` and each `terms`
  array in authored order in the normalized form.
- The fingerprinter (`fingerprintIrForTarget`, FR-069) SHALL keep the same
  authored order: `/dimensions`, `/units` and `/dimensions/*/terms` are not
  identity-sorted sets, and `IDENTITY_SET_PATHS` is unchanged. The order of `dimensions` and `units` is
  the source order QSpec FR-142's first-defect rule reads, and `terms` has one
  admitted order.
- The normalizer SHALL serialize a document with no `dimensions` and no `units`
  with neither member.
- The compatibility classifier (FR-025, FR-051) SHALL classify an added
  dimension or unit as additive.
- The compatibility classifier SHALL classify a removed dimension or unit, or a
  changed `base`, `terms`, `dimension`, `target`, `scale` or `offset`, as
  breaking.

### Generation backends

In this section, "each generation backend" is the Rust, TypeScript, Python,
JSON Schema and SysML v2 backend, and an **affected member** is a clock member
or a unit-typed member: a field, an operation parameter or an operation result,
with the alias, sequence and map types that name `Clock` or a unit. Each
backend maps an affected member to a form of its target language and writes the
file; none raises `UNDECLARED_LOSS` for one.

**A clock** carries no value, so it maps to the null-only form of each target. A
required clock is written as `null`, which states that the clock is present,
and an optional clock is written as `null` when present and omitted when absent
(FR-054's axes, presence unchanged). A generated serializer writes no clock
value, because the IR holds none.

**A quantity** is an exact rational in the unit its type names, and its
instance wire form is the canonical rational string: the `n` or `n/d` form that
"Units" defines, with a magnitude within `i128`. The wire form states no unit:
the member's type does, as the unit's `<name>`.

| Backend | Clock member | Unit-typed member | Where the unit is stated |
|---|---|---|---|
| JSON Schema (FR-100) | `{"type": "null", "x-agent-ix-clock": true}`, in `required` for a required clock | `{"type": "string", "pattern": P, "x-agent-ix-unit": "<name>"}`, `P` admitting exactly the strings `0`, `-?[1-9][0-9]*` and `-?[1-9][0-9]*/([2-9]\|[1-9][0-9]+)` | the `x-agent-ix-unit` annotation on the schema of the member or alias |
| Rust (FR-054) | the generated `crate::support::Clock` unit struct, serialized as `null` and deserialized from `null`; `Option<Clock>` for an optional clock; an alias is a newtype over it | the generated `crate::support::Rational` newtype holding a reduced `i128` numerator and a positive `i128` denominator, compared by value and serialized as the canonical rational string; an alias is a newtype over it | `pub const QUANTITY_UNITS: &[QuantityMeta]` in `identity.rs`, one entry for each affected member and alias, naming its path and `<name>` |
| TypeScript (FR-064) | the type `null` (`readonly x: null`, `readonly x?: null` when optional); an alias is a type alias to `null`; the validator accepts `null` and no other value | `string`; the validator accepts exactly the canonical rational strings within `i128`, compared by `bigint`; an alias is a type alias to `string` | the resolved type model's `typeRef` of the member, which keeps `ix://quire/unit/<name>` |
| Python (FR-136) | `None`, from the JSON Schema `null` form (`x: None`, and `x: None = None` when optional) | `str`, from the JSON Schema `string` form with its pattern | `QUANTITY_UNITS`, keyed `<Class>.<member>` and `<Alias>`, in the generated package |
| SysML v2 (FR-138) | `attribute def Clock;` once in the package, and `attribute x : Clock;` | `attribute w : ScalarValues::Real;` with the unit named in a `doc` comment on the attribute, and one non-blocking `agent-ix.sysml-target.DECLARED_LOSS` naming the member and the exact rational that `Real` does not carry | the `doc` comment on the attribute |

- A **clock collection** SHALL map to the collection form that the same multiplicity,
  sequence `items` or map `values` takes over any other element in the backend
  (FR-054's collection axis, FR-064, FR-136, FR-100, FR-138), the element being the
  clock form of the table: JSON Schema `{"type": "array", "items": <clock schema>}` with
  `minItems` and `maxItems` from `lower` and `upper` and `uniqueItems` when `unique`
  (a `Set<Clock>` is therefore an array of at most one `null`); a map as `object` with
  `additionalProperties` the clock schema; Rust `Vec<Clock>` with the `ordered` and
  `unique` flags in the member metadata, and `BTreeMap<String, Clock>` for a map;
  TypeScript `readonly null[]` and `Readonly<Record<string, null>>`, the validator checking
  the count bounds; Python `list[None]` and `dict[str, None]`; SysML v2
  `attribute x : Clock[lower..upper]` with `ordered` and `nonunique` as declared. The array
  length is the datum a clock collection carries, because it states how many clocks the
  collection holds; a generated serializer writes one `null` for each element. An element
  of `Option<Clock>` is written `null` when present and omitted when absent, as an optional
  clock member is.
- An operation parameter or result of an affected type SHALL map as a field of
  that type does in each backend (FR-054's trait methods, FR-064's interface
  methods, FR-136's `Protocol` methods, FR-100's `x-agent-ix-operations` and
  FR-138's operation members).
- An `alias` of `Clock` or of a unit reference SHALL map to the alias form of
  each backend over the mapped target, and a sequence or map of a unit
  reference to the collection form of the backend over the quantity form.
- The Rust and JSON Schema backends SHALL list `Clock` with no IR scalar beside
  the reader's native set.
- Each backend SHALL apply `allowedOmissions` (FR-058) to an affected member as
  to any other member: a named member is omitted with the non-blocking
  `DECLARED_LOSS`, and a named owner drops its affected members with it under
  the owner's `DECLARED_LOSS`.
- Each backend SHALL generate no output from `dimensions` and `units`: the unit
  graph is a checked-package input, and a quantity's wire form needs no
  conversion.

### Spec-bundle extraction

The extraction frontend (FR-091 to FR-099) lifts the clock, dimension, unit and
unit-reference constructs of a spec bundle to the IR constructs above.

- A bundle artifact whose frontmatter `object` is `dimension` SHALL lift to one
  `dimensions` node, and one whose `object` is `unit` to one `units` node, in
  the artifact order FR-091 fixes. A dimension artifact states `base`
  (`true` or `false`) and, when derived, its `terms` as dimension tokens with
  integer exponents; a unit artifact states its `dimension` token, an optional
  `target` unit token and its `scale` and `offset` as canonical rational
  strings (`scale` `1` and `offset` `0` for a root).
- The engine (quire-rs FR-070) SHALL return the verdict for a dimension or unit
  token as it does for a type token: the bundle identity of the named dimension
  or unit artifact, or the placeholder `ix://<org>/<name>/unresolved/<Token>`
  with its companion diagnostic. The frontend SHALL mint the node identities
  `ix://<package.identity>/dimension/<name>` and
  `ix://<package.identity>/unit/<name>` from the artifact's `name`, and SHALL
  resolve each term `dimension`, unit `dimension` and unit `target` to the
  identity of the node the engine named.
- A `Type` cell reading `Clock` SHALL resolve, from the engine's native-name
  verdict beside the kernel scalar names, to `ix://quire/native/Clock` and mint
  no node. A `Type` cell reading `Quantity<u>` SHALL resolve, from the engine's
  unit verdict (the bundle identity of the unit artifact `u`), to
  `ix://quire/unit/<u>` and mint no node. The frontend SHALL NOT classify
  either from its spelling. A `Quantity<u>` whose `u` names no unit artifact
  SHALL be `Unresolved::UnknownToken`, one blocking `UNRESOLVED_TYPE_TOKEN` at
  the row naming `u`.
- The frontend SHALL lower a field, an operation parameter and an operation
  `Returns:` that resolve to `Clock` or to a unit as FR-093 and FR-094 lower any
  member, with the clock member shape and the unit-typed member shape of this
  requirement: `multiplicity` `{1, 1}` and `presence` `required` for a `1` row,
  `presence` `optional` for a `0..1` row, `nullable` `false`, and no default,
  `unit`, `decimal` or constraint. A constraint cell on such a row SHALL raise
  the blocking `CONSTRAINT_NOT_APPLICABLE` at the row (FR-093), and a `Clock`
  row lowers its multiplicity as FR-093 lowers any row (`0..*` and `*` give `lower` 0 and no
  `upper`, `2..4` gives `lower` 2 and `upper` 4, with `ordered` and `unique` from the row's
  flags), the member being a clock collection when `upper` is absent or above `1`.
- A type alias artifact whose target is `Clock` or `Quantity<u>` SHALL lift to
  an `alias` definition of this requirement.
- The frontend SHALL write `dimensions` and `units` only when the bundle
  declares one, so a bundle with none serializes with neither member, and SHALL
  write each list in artifact order (the order FR-145 keeps).
- The reader's diagnostics for the lifted document (`INVALID_UNIT_GRAPH`,
  `UNRESOLVED_DIMENSION_REF`, `UNRESOLVED_UNIT_REF`, `INVALID_OPERAND`,
  `DUPLICATE_IDENTITY`, `INVALID_CLOCK_MEMBER`, `INVALID_QUANTITY_MEMBER`)
  SHALL surface as `INVALID_IR` (FR-096) at the artifact row that produced the
  node.

### How QSL consumes it

- QSL intake runs `agent_ix_semantic_ir::decide` over the admitted document
  (QSpec FR-154), so every refusal above reaches QSL as an intake refusal.
- QSL reads a clock member (a field, parameter, result or alias typed
  `ix://quire/native/Clock`) as the `Clock` type in that position, and a clock
  field of an object type or a record as a clock place of it (QSL FR-230
  "Clock-typed positions", QSL FR-393's `TypeForm::Clock`).
- QSL reads `dimensions` and `units` into the unit graph of its checked package,
  beside the dimensions and units its own source declares (QSL FR-230). A
  domain package that supplies time units declares a base dimension named
  `Time`, a root unit such as `s` and scaled units such as `ms` with `scale`
  `1/1000` and `target` `s`.
- QSL reads a member, alias target, sequence `items` or map `values` typed
  `ix://quire/unit/<name>` as `Quantity<u>` at that position (QSpec FR-142, QSL
  FR-185 "Quantity-typed parameters", QSL FR-230 "Unit-typed members").

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-146-CON-1 | Every IR reader SHALL return the same verdict and the same set of codes and pointers for each clock, dimension, unit and unit-reference case of this requirement. | Parity | Test |
| FR-146-CON-2 | Adding this requirement's members SHALL change no byte and no fingerprint of a document that carries none of them. | Compatibility | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-146-AC-1 | A document of package `acme/rpc` whose object type `Call` has a field `x` typed `ix://quire/native/Clock` with multiplicity `{1, 1, false, false}`, presence `required`, nullable `false` and defaultKind `none` is accepted by every reader with no diagnostic, and no `types[]` node is declared for the clock; every reader's native set is the `kernel-scalars.json` names plus `Text` and `Clock`, and `kernel-scalars.json` has no `Clock` entry. | Test (TC-1842) |
| FR-146-AC-2 | `ix://quire/native/Clock` as an operation parameter, an operation result, an alias target, a sequence `items`, a map `values` and a variant `payloadType` is accepted with no diagnostic; as a field of an object type or a record, and as a parameter or field typed by an alias of it, it is a clock member. `ix://quire/native/Clock` as a reference target and a constraint `appliesTo` each refuse exactly `CLOCK_POSITION_INVALID` at that member's pointer. A clock field with presence `optional` is accepted. A clock field carrying `nullable: true`, `defaultKind: semantic` with `defaultValue: 0`, `unit: "ms"`, a `textProfile`, a `decimal` policy and a `min` constraint refuses exactly one `INVALID_CLOCK_MEMBER` at each of `/nullable`, `/defaultKind`, `/defaultValue`, `/unit`, `/textProfile`, `/decimal` and `/constraints` under the field, and no `UNIT_ON_NON_SCALAR`, `CONSTRAINT_NOT_APPLICABLE`, `SCHEMA_VIOLATION`, decimal-policy code, `INVALID_DEFAULT_VALUE`, `UNKNOWN_CONSTRAINT_KEYWORD` or `INVALID_PATTERN`; a clock parameter breaking the same members refuses at `<param>/…`, and a clock result with `nullable: true` refuses exactly one `INVALID_CLOCK_MEMBER` at `returns/nullable`. A clock field with multiplicity `{3, 1}` raises exactly `INVALID_MULTIPLICITY`, as a unit-typed field does, and no `INVALID_CLOCK_MEMBER`; clock fields with multiplicity `{0, 3, true, false}`, `{0, 3, false, true}`, `{0, 3, false, false}` and `{0}` with no upper bound are accepted, and so are a parameter and a result of multiplicity `{0, 2, true, false}`. | Test (TC-1843) |
| FR-146-AC-3 | A document declaring base dimension `Time` (`ix://acme/rpc/dimension/Time`, `base: true`, no terms), derived dimension `Rate` (`base: false`, terms `[{Time, "-1"}]`), dimensionless dimension `Ratio` (`base: false`, no terms), root unit `s` (`scale` `"1"`, `offset` `"0"`) and unit `ms` (`target` `s`, `scale` `"1/1000"`, `offset` `"0"`) is accepted by every reader; the same document without `dimensions` and `units` serializes with neither member. | Test (TC-1844) |
| FR-146-AC-4 | Each refuses exactly one diagnostic at the stated pointer: a term naming an undeclared dimension (`UNRESOLVED_DIMENSION_REF`, `…/terms/0/dimension`); a unit typed by an undeclared dimension (`UNRESOLVED_DIMENSION_REF`, `/units/<j>/dimension`); a unit targeting an undeclared unit (`UNRESOLVED_UNIT_REF`, `/units/<j>/target`); and, each `INVALID_UNIT_GRAPH`: scale `"0"` (`/scale`), a target in another dimension (`/target`), a second root of `Time` (`/units/<j>` of the second root), a root with scale `"2"` (`/scale`), a root with offset `"273"` (`/offset`), a two-unit target cycle (`/target` of the lower-index unit only), a self-target (`/target`), a two-dimension term cycle (the lower-index dimension's term only), a three-dimension component holding two cycles (one refusal, at the least-index dimension's first term into the component), a base dimension with a term (`/terms`), terms out of order and a repeated term (the later term), a term exponent `"0"` (`/exponent`), an identity `ix://acme/rpc/unit/msec` on unit `ms` and an identity `ix://acme/rpc/dimension/Duration` on dimension `Time` (`/identity`). A document carrying a zero scale and a cycle reports both. Two units named `ms` refuse `DUPLICATE_IDENTITY` at the later one's `/identity`. A dimension `Time` with no units is accepted. | Test (TC-1845) |
| FR-146-AC-5 | Scale spellings `"2/4"`, `"1/1"`, `"-0"`, `"0/5"`, `"01/3"` and `"1.5"` each refuse exactly `INVALID_OPERAND` at `/units/<j>/scale`; the JSON number `0.001` refuses exactly `SCHEMA_VIOLATION` there; a numerator of 2^127 refuses exactly `INTEGER_OUTSIDE_I128`; `"1/1000"`, `"-3/2"` and `"273"` are accepted; an exponent `"+1"` refuses exactly `INVALID_OPERAND` at its pointer. | Test (TC-1846) |
| FR-146-AC-6 | A field, an operation parameter, an operation result, an alias target, a sequence `items`, a map `values` and a variant `payloadType` typed `ix://quire/unit/ms` are accepted with no diagnostic, both in the AC-3 document and in a document that declares no units; `ix://quire/unit/ms` as a reference target or a constraint `appliesTo` refuses exactly `UNRESOLVED_TYPE_REF` at that member, and so do the typeRefs `ix://quire/unit/` and `ix://quire/unit/3ms`; a unit-typed field carrying `unit: "ms"`, a `min` constraint, a `decimal` policy and a semantic default refuses exactly one `INVALID_QUANTITY_MEMBER` at each of `/unit`, `/constraints`, `/decimal`, `/defaultKind` and `/defaultValue` under the field, and no `UNIT_ON_NON_SCALAR`, `CONSTRAINT_NOT_APPLICABLE`, decimal-policy code, `INVALID_DEFAULT_VALUE`, `UNKNOWN_CONSTRAINT_KEYWORD` or `INVALID_PATTERN`. | Test (TC-1847) |
| FR-146-AC-7 | Two documents differing only in the order of `units` have different normalized bytes and different fingerprints, and `IDENTITY_SET_PATHS` still has exactly its thirteen paths; every committed positive fixture keeps its bytes and fingerprint; adding a unit classifies additive, and removing one, changing its `scale` or changing a dimension's `base` classifies breaking. | Test (TC-1848) |
| FR-146-AC-8 | The AC-1 document, the AC-2 document and the AC-6 document each generate on every generation backend with no `UNDECLARED_LOSS` and with every file written. With `allowedOmissions` naming a clock or unit-typed member, the backend omits it with one non-blocking `DECLARED_LOSS` naming it. With `allowedOmissions` naming only the owner, each of these is dropped with the owner under the owner's single `DECLARED_LOSS` and raises no loss of its own: the clock field of an omitted `Call` type, a clock or unit-typed parameter of an omitted operation, a unit-typed parameter of an operation of an omitted type, and a clock or unit-typed result of an omitted operation. A generated subtype of an omitted `Call` that inherits its clock field generates the field unless `allowedOmissions` names it. A document carrying `dimensions` and `units` generates exactly what it generates without them, and the JSON Schema and rust-serde backends' native lists carry `Clock` with no IR scalar. | Test (TC-1849) |
| FR-146-AC-9 | A field, an operation parameter and an operation result typed `ix://quire/unit/agent-ix/time-units/ms`, `ix://quire/unit/acme/rpc.v2/ms` and `ix://quire/unit/acme/rpc/ms` are accepted with no diagnostic; the typeRefs `ix://quire/unit/agent-ix/time-units/m-s` and `ix://quire/unit/agent-ix/time-units/3ms` (the unit-name segment outside its pattern), `ix://quire/unit/-acme/rpc/ms` and `ix://quire/unit/.acme/rpc/ms` (an earlier segment outside both patterns) and `ix://quire/unit/agent-ix//ms` (an empty segment) each refuse exactly `UNRESOLVED_TYPE_REF` at that `typeRef`. | Test (TC-1852) |
| FR-146-AC-10 | The documents of packages `acme/rpc` and `acme/flow`, each declaring base dimension `Time` (`ix://acme/rpc/dimension/Time`, `ix://acme/flow/dimension/Time`), root unit `s` and unit `ms` of `1/1000` of `s`, are each accepted by every reader with no diagnostic, and the two `Time` dimensions are two dimensions: a reader given one document raises no diagnostic for the other's `Time`. | Test (TC-1855) |
| FR-146-AC-11 | Over a document whose object type `Call` has a required clock field `x`, an optional clock field `w`, a field `d` typed `ix://quire/unit/ms`, an operation with a clock parameter `c`, a unit-typed parameter `b` and a unit-typed result, an alias `Stopwatch` of `Clock` and an alias `Span` of `ix://quire/unit/ms`, the JSON Schema backend writes `x` and `w` as `{"type": "null", "x-agent-ix-clock": true}` with `x` in `required` and `w` not, `d` and `Span` as `{"type": "string", "pattern": P, "x-agent-ix-unit": "ms"}`, the operation's parameters and result in `x-agent-ix-operations` by the same schemas, and `Stopwatch` as the clock schema; `P` admits `"0"`, `"-3"`, `"1/1000"` and `"-3/2"` and rejects `"2/4"`, `"1/1"`, `"-0"`, `"0/5"`, `"01/3"` and `"1.5"`. The Python backends generate from that schema the attributes `x: None`, `w: None = None`, `d: str` constrained by `P`, the module constant `QUANTITY_UNITS` with `Call.d`, `Call.reset.b` and `Span` mapped to `ms`, and no `Any`. | Test (TC-1856) |
| FR-146-AC-12 | Over AC-11's document the Rust backend writes `x: crate::support::Clock`, `w: Option<Clock>` (`default`, `skip_serializing_if`), `d: crate::support::Rational`, newtypes over each for the aliases, trait methods taking and returning them, and `QUANTITY_UNITS` entries for `Call.d`, the operation's parameter and result and `Span`; an instance serializes `x` as `null`, omits an absent `w`, and writes `d` as `"1/1000"`; deserializing `"2/4"` or a numerator of 2^127 is rejected. The TypeScript backend writes `readonly x: null`, `readonly w?: null`, `d: string`, the aliases as type aliases to `null` and `string`, and a validator that accepts `null` for `x`, rejects `0` for `x`, accepts `"1/1000"` for `d` and rejects `"2/4"` and `"1/1"`; the resolved type model keeps `typeRef` `ix://quire/unit/ms` on `d`. | Test (TC-1857) |
| FR-146-AC-13 | Over AC-11's document the SysML v2 backend writes `attribute def Clock;` once, `attribute x : Clock;` and `attribute w : Clock;` on `Call`, `attribute d : ScalarValues::Real;` with a `doc` comment naming `ms`, one non-blocking `agent-ix.sysml-target.DECLARED_LOSS` for each of `d`, the operation's unit-typed parameter and result, and `Span`, naming the member and the exact rational, and no blocking diagnostic; two runs are byte-identical. | Test (TC-1858) |
| FR-146-AC-14 | A spec bundle with a unit artifact `ms` (dimension `Time`, target `s`, scale `1/1000`, offset `0`), an entity whose field rows read `x | Clock | 1`, `w | Clock | 0..1` and `d | Quantity<ms> | 1`, an operation `Returns: Quantity<ms>` with a parameter `c | Clock | 1`, and a type alias artifact `Span` over `Quantity<ms>` lifts to the fields `x` and `d` with `required` presence, `w` with `optional`, typeRefs `ix://quire/native/Clock` and `ix://quire/unit/ms`, the operation's parameter and result by the same typeRefs, the alias `Span`, no node for `Clock` or `Quantity<ms>`, and `decide` accepting the document. A `Quantity<hour>` cell with no unit artifact `hour` raises one blocking `UNRESOLVED_TYPE_TOKEN` at its row naming `hour`; a `Clock` row with a `min` constraint raises `CONSTRAINT_NOT_APPLICABLE` at the row; a `Clock` row with multiplicity `*` lifts to a clock field with `lower` 0, no `upper` and the row's `ordered` and `unique` flags, and `decide` accepts it. | Test (TC-1859) |
| FR-146-AC-15 | A spec bundle with a dimension artifact `Time` (`base` true), a derived dimension `Rate` (term `Time` exponent `-1`), unit artifacts `s` (root) and `ms` (target `s`, scale `1/1000`) lifts to `dimensions` `[Time, Rate]` and `units` `[s, ms]` in artifact order, with the identities `ix://<package>/dimension/Time` and `ix://<package>/unit/ms`, each `target` and `dimension` resolved to the named node, and `decide` accepting the document; a bundle with none serializes with neither member; a unit artifact with scale `0`, a target in another dimension and a second root of `Time` each raise one blocking `INVALID_IR` carrying `INVALID_UNIT_GRAPH` at its artifact row. | Test (TC-1859) |
| FR-146-AC-16 | A document whose object type `Call` has clock fields `q` with multiplicity `{0, 3, true, false}`, `u` with `{0, 3, false, true}`, `b` with `{0, 3, false, false}`, `o` with `{0}` and no upper bound (ordered, not unique), an operation parameter and result of multiplicity `{0, 2, true, false}`, a sequence type `CS` whose `items` is `ix://quire/native/Clock` and a map type `CM` whose `values` is `ix://quire/native/Clock`, a field typed `CS` with multiplicity `{0, 2, true, false}`, and a record `Timer` with a clock field `x` held by a field with `{0, 2, true, false}` is accepted by every reader with no diagnostic and no `types[]` node for any clock; a clock field with multiplicity `{3, 1}` raises exactly `INVALID_MULTIPLICITY`. | Test (TC-1860) |
| FR-146-AC-17 | Over AC-16's document the JSON Schema backend writes `q` as `{"type": "array", "items": {"type": "null", "x-agent-ix-clock": true}, "minItems": 0, "maxItems": 3}`, `u` with `"uniqueItems": true`, `CM` as an object with the clock schema as `additionalProperties`; the Rust backend writes `Vec<Clock>` for `q`, `u`, `b` and `o` with `ordered` and `unique` in the member metadata and `BTreeMap<String, Clock>` for `CM`, and an instance with two elements serializes `q` as `[null, null]`; the TypeScript backend writes `readonly q: readonly null[]` and a validator that accepts `[null, null]`, rejects `[null, null, null, null]` for `q` and rejects `[1]`; the Python backends write `list[None]` and `dict[str, None]`; the SysML v2 backend writes `attribute q : Clock[0..3] ordered;`; none raises `UNDECLARED_LOSS`, every file is written, and two runs are byte-identical. | Test (TC-1861) |
| FR-146-AC-18 | A spec bundle whose entity has field rows `q | Clock | 0..3`, `o | Clock | *` and `p | Clock | 2..4`, an operation with a parameter `c | Clock | *`, a type alias artifact `Ticks` over a sequence of `Clock` and a sequence artifact `ClockList` over `Clock` lifts to fields with `lower` and `upper` `0`/`3`, `0`/absent and `2`/`4`, the parameter with `lower` 0 and no `upper`, the alias and the sequence type, typeRef `ix://quire/native/Clock` throughout and no node for `Clock`, and `decide` accepts the document; a `Clock` row with a `min` constraint still raises `CONSTRAINT_NOT_APPLICABLE` at the row. | Test (TC-1862) |

## Dependencies

- **Upstream**: [FR-027](./FR-027-declare-field-multiplicity-and-units.md) (the field and its opaque `unit` annotation), [FR-050](./FR-050-validate-and-normalize-the-emitted-ir.md) (the readers and their code table), [FR-069](./FR-069-canonicalize-and-classify-the-ir-surface.md) (normalized and fingerprint forms), [FR-141](./FR-141-carry-the-model-members-in-the-semantic-ir.md) (the model members this extends), [FR-144](./FR-144-carry-exact-numeric-scalars-under-one-literal-encoding.md) (canonical integer strings and the i128 bound)
- **Referenced**: [FR-032](./FR-032-define-the-kernel-scalar-library.md) (the kernel scalars), [FR-058](./FR-058-refuse-unsupported-constructs-with-stable-diagnostics.md) (declared and undeclared loss), [FR-092](./FR-092-resolve-type-tokens-to-declared-artifacts.md) (native references), [FR-100](./FR-100-map-semantic-ir-to-json-schema.md) (`UNDECLARED_LOSS`), [FR-145](./FR-145-name-the-normalized-ir-canonicalization.md) (the normalizer), QSpec FR-142 (dimension and unit algebra), QSpec FR-154 and FR-322 (domain package intake and member types), QSpec FR-415 (clocks), QSL FR-230 (clock fields and the time dimension), QSL FR-185 (quantity-typed parameters), QSL FR-393 (the `Clock` type form)

## References

- Upstream amendments this contract needs before QSL admits it. Until they
  land, QSpec intake refuses a document that uses a clock field or package
  units:
  - Linear STD-307: QSpec FR-154 admits `Clock` in its native-name set (closed
    today at `Boolean` to `Timestamp`) and admits package units, with FR-322
    "Model-owned members" step 1.
  - Linear STD-308: QSpec FR-322 "Model-owned members" step 4 admits units a
    domain package supplies (its unit row says "the declaring unit of
    compilation supplies the unit, not the domain package") and gives `Clock`
    its member type.
  - Linear STD-309: how a package unit's single-segment name is qualified in
    the consumer's checked package.
  - Linear STD-310: QSL FR-230 drops its STD-192 wait.
- QSL's code (`NativeValueType::Clock` and unit-graph intake) is Linear QSL-882.
