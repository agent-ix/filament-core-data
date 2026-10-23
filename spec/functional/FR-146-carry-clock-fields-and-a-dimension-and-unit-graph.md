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
---
# FR-146: Carry clock fields, quantity type references and a dimension and unit graph in the semantic IR

## Description

This requirement answers Linear STD-295 (the deliverable of STD-192).

The semantic IR at contract `2.0.0` SHALL carry the constructs a timed domain
model needs, so that a QSL unit can check a model whose object types have
clocks and whose quantities are in units the domain package declares:

| Construct | Where | Meaning |
|---|---|---|
| `ix://quire/native/Clock` | a field `typeRef` | The field is a clock: a real-valued timer that the model checker owns, one per object and field, read only inside clock constraints (QSpec FR-415). It carries no data value. |
| `dimensions` | document | The dimension nodes of the package: base dimensions such as `Time`, and derived dimensions, each a product of dimensions of the package raised to integer exponents, the empty product being the dimensionless dimension (QSpec FR-142). |
| `dimensionEquivalences` | document | The declared equivalences of the package: each relates two dimension nodes of the package that name one physical dimension and states the ratio between their canonical roots (`rootScale`), so a consumer that admits this package beside another that declares the same dimension can exchange quantities (QSpec FR-142 "Dimension equivalence"). |
| `units` | document | The unit nodes of the package: each typed by one dimension, either the dimension's root or a unit with an exact scale and offset to a target unit of the same dimension (QSpec FR-142). |
| `ix://quire/unit/<name>` | a field, parameter or result `typeRef` | The member holds a quantity in unit `<name>`: QSpec's `Quantity<u>` (QSpec FR-142, FR-322 "Model-owned members" step 4). |

A clock is not a quantity: it holds no value in the IR, has no unit of its own,
and takes its unit from the model's `time` member in QSL source (QSL FR-230).
A clock is zero in every initial state, and a population names objects, not
field values (QSpec FR-415, FR-141), so no IR member carries a clock's value;
the clock field shape below refuses a default.

The IR gives no dimension or unit a built-in meaning. `Time`, `s` and `ms` are
ordinary declarations; QSL reads the dimension of a model's time unit as its
time dimension when that dimension is a base dimension named `Time` (QSL
FR-230).

The FR-027 field `unit` member is unchanged: it is an opaque UCUM annotation
on a scalar field for generated targets, and no reader resolves it against the
unit graph.

## Inputs

- A semantic IR `2.0.0` document whose fields may name `ix://quire/native/Clock`,
  whose fields, operation parameters and operation results may name
  `ix://quire/unit/<name>`, and which may carry top-level `dimensions`,
  `units` and `dimensionEquivalences` arrays

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

### Clock fields

- A clock field is a field in a type definition's `fields` whose `typeRef` is
  `ix://quire/native/Clock`.
- If `ix://quire/native/Clock` is an operation parameter `typeRef`, an operation
  result `typeRef`, an `alias` or `reference` `target`, a sequence `items`, a
  map `values`, a variant `payloadType` or a constraint `appliesTo`, then the
  reader SHALL refuse `agent-ix.semantic-ir.CLOCK_OUTSIDE_FIELD` at that member's
  pointer (`<member>/typeRef`, `/types/<i>/operations/<k>/returns/typeRef`,
  `/types/<i>/target`, `/types/<i>/items`, `/types/<i>/values`,
  `/types/<i>/variants/<v>/payloadType` or `…/constraints/<c>/appliesTo`).
- In every other identity-valued member (`supertypes`, a relationship end,
  a population member, a frame entry and the like), the reader SHALL apply that
  member's own resolution rule to `ix://quire/native/Clock`, raising no FR-146
  code there.
- The clock field shape SHALL be: `multiplicity` `{lower: 1, upper: 1, ordered:
  false, unique: false}`, `presence` `required`, `nullable` `false`,
  `defaultKind` `none`, an empty or absent `constraints`, and no `unit`,
  `decimal`, `textProfile` or `defaultValue`.
- If a clock field breaks the shape, then the reader SHALL refuse
  `agent-ix.semantic-ir.INVALID_CLOCK_FIELD` once for each member that breaks
  it, at `<field>/multiplicity`, `<field>/presence`, `<field>/nullable`,
  `<field>/defaultKind`, `<field>/defaultValue`, `<field>/unit`,
  `<field>/decimal`, `<field>/textProfile` or `<field>/constraints`.
- For a clock field, the reader SHALL raise no `UNIT_ON_NON_SCALAR`,
  `INVALID_MULTIPLICITY`, `SCHEMA_VIOLATION` for `textProfile`,
  `DECIMAL_POLICY_MISSING`, `DECIMAL_POLICY_CONFLICT` or
  `INVALID_DEFAULT_VALUE` at any of the shape members, so that
  `INVALID_CLOCK_FIELD` is the one code each such member carries.
- For a clock field, the reader SHALL NOT apply the constraint rules
  (`UNKNOWN_CONSTRAINT_KEYWORD`, `CONSTRAINT_NOT_APPLICABLE`, `INVALID_PATTERN`,
  `INVALID_OPERAND`) to its `constraints`, whose one code is the
  `INVALID_CLOCK_FIELD` at `<field>/constraints`.
- For a clock field, every other reader rule (a schema `SCHEMA_VIOLATION` on a
  member's JSON type, `DUPLICATE_IDENTITY`, `MISSING_MULTIPLICITY`) SHALL fire
  as it does for any field.
- The reader SHALL NOT check which construct owns a clock field or whether the
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
  `name` in documents of different packages are different dimensions: the
  identity `ix://acme/rpc/dimension/Time` and the identity
  `ix://acme/flow/dimension/Time` are two dimensions, whatever their `name`,
  `base`, `terms` or units. Two dimensions are the same dimension only when
  their identities are equal byte for byte; no case folding, suffix match or
  match on `name` alone relates them.
- A document names only its own dimensions: a dimension `terms` entry, a unit
  `dimension` and a dimension equivalence each name a dimension node of the
  document, and the reader SHALL raise no diagnostic for a `name` that a
  dimension of another package also carries. A consumer that admits several
  packages resolves a package dimension by the identity
  `ix://<package identity>/dimension/<name>`, which the consumer's own source
  spells `M::<name>` through the model alias `M` of that package, so the
  package dimensions of two owners are two nodes of one checked package (QSpec
  FR-142 "Namespaces" and "Dimensions of different owners", FR-322 "Model-owned
  members").
- Two dimensions of different packages SHALL compose in the consumer's checked
  package: a unit of one package is typed by that package's dimension, a
  product, quotient or power forms its normalized dimension map over the
  identities of both packages, and the base dimensions of two owners are two
  entries until a dimension equivalence relates them (QSpec FR-142 "Dimensions
  of different owners").
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

### Dimension equivalences

A dimension equivalence says that two dimension nodes name one physical
dimension. A package that declares both `Time` and `Duration` as base dimensions
relates them with one, and a consumer that admits that package beside another
declaring `Time` relates its own `Time` to either with a source equivalence
(QSpec FR-142 "Dimension equivalence", `dimension R::Time ~ F::Time by 1 R::s = 1000 F::ms;`).
An equivalence also says how large the canonical root unit of one dimension is
against the canonical root unit of the other: two roots of unequal size (`s`
and `ms`) are never identified at scale 1 by being related. A document declares
an equivalence only between two of its own dimensions: the equivalence between a
dimension of this package and a dimension of another package is the consumer's
declaration, with its own `by` clause.

- The schema SHALL admit an optional top-level `dimensionEquivalences` array of
  equivalence nodes.
- An equivalence node SHALL carry exactly `identity`, `dimensions`, `rootScale`
  and `origin`. A node missing one of them, or carrying a further member, SHALL be refused
  `agent-ix.semantic-ir.SCHEMA_VIOLATION` at `/dimensionEquivalences/<k>`.
- `dimensions` SHALL be an array of exactly two semantic identities.
- `rootScale` SHALL be a string. It SHALL mean that one canonical root unit of
  the first dimension of `dimensions` equals `rootScale` canonical root units
  of the second (QSpec FR-322 `dimension_equivalence` `root_scale`, the ratio
  QSpec FR-142 "Dimension equivalence" reduces the `by` clause to), so an
  identification edge from the first dimension's root to the second's carries
  it as `scale` and offset `0`.
- If an equivalence's `rootScale` is not a canonical rational string (as under
  "Units"), then the reader SHALL refuse
  `agent-ix.semantic-ir.INVALID_OPERAND` at `/dimensionEquivalences/<k>/rootScale`,
  and instead `agent-ix.semantic-ir.INTEGER_OUTSIDE_I128` at that member when its `n`
  or `d` is outside `i128::MIN..=i128::MAX`.
- If an equivalence's `rootScale` is not positive (`0` or a negative rational),
  then the reader SHALL refuse `agent-ix.semantic-ir.INVALID_UNIT_GRAPH` at
  `/dimensionEquivalences/<k>/rootScale`.
- An equivalence `identity` SHALL equal
  `ix://<package.identity>/dimension-equivalence/<A>-<B>`, where `<A>` and `<B>`
  are the `name` of the first and second dimension of `dimensions`.
- If an equivalence's `identity` does not equal that form, then the reader SHALL
  refuse `agent-ix.semantic-ir.INVALID_UNIT_GRAPH` at
  `/dimensionEquivalences/<k>/identity`.
- If an entry of `dimensions` names no dimension node of the document, then the
  reader SHALL refuse `agent-ix.semantic-ir.UNRESOLVED_DIMENSION_REF` at
  `/dimensionEquivalences/<k>/dimensions/<m>`, and SHALL not apply the identity
  check to that node.
- If the two entries of `dimensions` are equal, then the reader SHALL refuse
  `agent-ix.semantic-ir.INVALID_UNIT_GRAPH` at
  `/dimensionEquivalences/<k>/dimensions`, because a dimension is equivalent to
  itself without a declaration.
- If the first entry of `dimensions` is not strictly less, by code point, than
  the second, then the reader SHALL refuse
  `agent-ix.semantic-ir.INVALID_UNIT_GRAPH` at
  `/dimensionEquivalences/<k>/dimensions`, so that a pair has one spelling.
- If two equivalence nodes carry one `identity`, which is two nodes relating
  one pair, then the reader SHALL refuse
  `agent-ix.semantic-ir.DUPLICATE_IDENTITY` at the later node's `/identity`.
- The relation SHALL be symmetric and transitive: the declared pairs `A`/`B`,
  `B`/`C` and `A`/`C` are admitted together, and the equivalence classes are the
  connected components of the declared pairs, admitted together exactly when
  the `rootScale` values agree (next bullet). The base classes are the
  components of the pairs whose two dimensions are both base dimensions.
- The `rootScale` values of the base pairs SHALL multiply to exactly one around
  every cycle of base pairs, a pair read against its `dimensions` order counting
  as the reciprocal of its `rootScale`. If the pairs `A`/`B`, `B`/`C` and
  `A`/`C` of three base dimensions carry `rootScale` values whose product so
  taken is not one, then the reader SHALL refuse
  `agent-ix.semantic-ir.INVALID_UNIT_GRAPH` at `/dimensionEquivalences/<k>/rootScale`
  of the last node, in array order, of the cycle, naming the cycle's
  dimensions in array order. The reader SHALL decide the check in exact
  rational arithmetic.
- The normalized dimension map of a base dimension SHALL be its base class's
  representative with exponent `1`, the representative being the member of the
  class with the least `identity` by code point, and the map of a derived
  dimension SHALL be the sum over its `terms` of each exponent times the term's
  map, an entry whose exponent is `0` being dropped.
- If a pair does not consist of two base dimensions and the normalized maps of
  its two dimensions differ, then the reader SHALL refuse
  `agent-ix.semantic-ir.INVALID_UNIT_GRAPH` at
  `/dimensionEquivalences/<k>/dimensions`, naming both dimensions. The reader
  SHALL form the maps only over dimensions that reach no term cycle, and SHALL
  raise this refusal for no pair that reaches one.
- The canonical root of a derived dimension is the product of its base
  dimensions' canonical roots at the exponents of its `terms`, so a pair that is
  not two base dimensions has the `rootScale` its base roots fix: the size of a
  base dimension's root against its base class's representative is fixed by the
  base pairs (one for a base dimension in no pair), and the size of a derived
  dimension's root is the product of those sizes at its exponents. If such a
  pair's `rootScale` differs from the size of its first dimension's root over
  the size of its second's, then the reader SHALL refuse
  `agent-ix.semantic-ir.INVALID_UNIT_GRAPH` at
  `/dimensionEquivalences/<k>/rootScale`, naming both dimensions.
- The reader SHALL NOT merge unit graphs, rewrite a dimension or apply the
  equivalence to a conversion: the consumer's checked package derives the
  classes, the class root and the conversion edges, each identification edge
  carrying the `rootScale` ratio, from the pairs (QSpec FR-142 "Dimension
  equivalence", FR-322 `dimension_equivalence` node).
- The reader SHALL NOT require a dimension to have an equivalence, and two units
  of dimensions that one equivalence relates SHALL remain two units: each keeps
  its own dimension and its own root.

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
  field, of an operation parameter and of an operation result, where `<name>`
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
- A unit-typed member's quantity type SHALL be the dimension identity of the
  unit its `typeRef` names, which a consumer reads from the unit node of
  identity `ix://<package identity>/unit/<name>` when `<name>` is qualified by
  that package identity and from its own source otherwise. Two members have one
  quantity type only when those dimension identities are equal, so members typed
  by the root units `ix://quire/unit/acme/rpc/s` and
  `ix://quire/unit/acme/flow/s` have two quantity types, a dimension
  equivalence relating the two dimensions makes the types convertible by
  explicit conversion, scaled by the equivalence's `rootScale` when the two
  roots differ in size, and never substitutable, and a member typed by a unit of a
  dimension with no equivalence to another is convertible to no member of the
  other (QSpec FR-142 "Dimensions of different owners"). The reader compares no
  two quantity types.
- If `ix://quire/unit/<name>` is an `alias` or `reference` `target`, a sequence
  `items`, a map `values`, a variant `payloadType` or a constraint `appliesTo`,
  then the reader SHALL refuse `agent-ix.semantic-ir.UNRESOLVED_TYPE_REF` at
  that member's pointer.
- If a `typeRef` begins `ix://quire/unit/` and `<name>` does not have the form
  above, then the reader SHALL refuse `agent-ix.semantic-ir.UNRESOLVED_TYPE_REF`
  at that `typeRef`.
- A unit-typed member is a field, operation parameter or operation result whose
  `typeRef` is a well-formed `ix://quire/unit/<name>`.
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

- The normalizer (FR-145) SHALL keep `dimensions`, `units`, `dimensionEquivalences` and each `terms`
  array in authored order in the normalized form.
- The fingerprinter (`fingerprintIrForTarget`, FR-069) SHALL keep the same
  authored order: `/dimensions`, `/units`, `/dimensionEquivalences` and `/dimensions/*/terms` are not
  identity-sorted sets, and `IDENTITY_SET_PATHS` is unchanged. The order of `dimensions` and `units` is
  the source order QSpec FR-142's first-defect rule reads, and `terms` has one
  admitted order.
- The normalizer SHALL serialize a document with no `dimensions`, no `units` and no `dimensionEquivalences`
  with none of the three members.
- The compatibility classifier (FR-025, FR-051) SHALL classify an added
  dimension, unit or dimension equivalence as additive.
- The compatibility classifier SHALL classify a removed dimension, unit or dimension equivalence, or a
  changed `base`, `terms`, `dimension`, `target`, `scale`, `offset` or equivalence
  `dimensions` or `rootScale`, as breaking.

### Generation backends

In this section, "each generation backend" is the Rust, TypeScript, Python,
JSON Schema and SysML v2 backend, and an affected member is a clock field, a
unit-typed field, a unit-typed operation parameter or a unit-typed operation
result. An affected member's owners are the type definition that declares a
field, and the operation and its type definition for a parameter or a result.
A result carries no identity of its own, so a backend profile's
`allowedOmissions` (FR-058) names a result only through an owner.

- If `allowedOmissions` names an affected field's or parameter's own identity,
  then each generation backend SHALL omit that member and raise the
  non-blocking `DECLARED_LOSS` naming it.
- If `allowedOmissions` names an owner of an affected member, then each
  generation backend SHALL drop the member with that owner and raise no loss of
  its own for it, the owner's non-blocking `DECLARED_LOSS` covering it.
- If a generated subtype inherits an affected field from a supertype that
  `allowedOmissions` names, then each generation backend SHALL treat the field
  as generated for that subtype, so only the field's own identity omits it
  there.
- If a backend generates an affected field or parameter, then it SHALL raise
  the blocking `agent-ix.semantic-ir.UNDECLARED_LOSS` naming the member and
  write no file, rather than map the member to a scalar of its target language.
- If a backend generates an operation whose result is unit-typed, then it SHALL
  raise the blocking `agent-ix.semantic-ir.UNDECLARED_LOSS` naming the
  operation's identity and `returns`, and write no file.
- Each generation backend that carries its own native list (the JSON Schema and
  rust-serde backends) SHALL list `Clock` with no IR scalar beside the reader's
  native set.
- Each generation backend SHALL generate no output from `dimensions`, `units`
  and `dimensionEquivalences`.

### How QSL consumes it

- QSL intake runs `agent_ix_semantic_ir::decide` over the admitted document
  (QSpec FR-154), so every refusal above reaches QSL as an intake refusal.
- QSL reads a field typed `ix://quire/native/Clock` as a `Clock` field of the
  owning model object type (QSL FR-230, QSL FR-393's `TypeForm::Clock`).
- QSL reads `dimensions`, `units` and `dimensionEquivalences` (with each `rootScale`) into the unit graph of its checked package,
  beside the dimensions and units its own source declares (QSL FR-230). A
  domain package that supplies time units declares a base dimension named
  `Time`, a root unit such as `s` and scaled units such as `ms` with `scale`
  `1/1000` and `target` `s`.
- QSL reads a member typed `ix://quire/unit/<name>` as `Quantity<u>` (QSpec
  FR-142, QSL FR-185 "Quantity-typed parameters").

### Scope

- The spec-bundle extraction frontend (FR-091 to FR-099) lowers no clock
  field, dimension, unit or unit reference: FR-092 classifies a `Clock` `Type`
  cell as the engine reports it. A producer that needs these constructs writes
  the IR document directly.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-146-CON-1 | Every IR reader SHALL return the same verdict and the same set of codes and pointers for each clock, dimension, unit and unit-reference case of this requirement. | Parity | Test |
| FR-146-CON-2 | Adding this requirement's members SHALL change no byte and no fingerprint of a document that carries none of them. | Compatibility | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-146-AC-1 | A document of package `acme/rpc` whose object type `Call` has a field `x` typed `ix://quire/native/Clock` with multiplicity `{1, 1, false, false}`, presence `required`, nullable `false` and defaultKind `none` is accepted by every reader with no diagnostic, and no `types[]` node is declared for the clock; every reader's native set is the `kernel-scalars.json` names plus `Text` and `Clock`, and `kernel-scalars.json` has no `Clock` entry. | Test (TC-1842) |
| FR-146-AC-2 | `ix://quire/native/Clock` as an operation parameter type, an operation result type, an alias target, a sequence `items`, a map `values`, a variant `payloadType` and a constraint `appliesTo` each refuse exactly `CLOCK_OUTSIDE_FIELD` at that member's pointer. A clock field carrying multiplicity `{0, 1}`, presence `optional`, `nullable: true`, `defaultKind: semantic` with `defaultValue: 0`, `unit: "ms"`, a `textProfile`, a `decimal` policy and a `min` constraint refuses exactly one `INVALID_CLOCK_FIELD` at each of `/multiplicity`, `/presence`, `/nullable`, `/defaultKind`, `/defaultValue`, `/unit`, `/textProfile`, `/decimal` and `/constraints` under the field, and no `UNIT_ON_NON_SCALAR`, `CONSTRAINT_NOT_APPLICABLE`, `SCHEMA_VIOLATION`, decimal-policy code, `INVALID_DEFAULT_VALUE`, `UNKNOWN_CONSTRAINT_KEYWORD` or `INVALID_PATTERN`. A clock field with multiplicity `{3, 1}` raises exactly `INVALID_CLOCK_FIELD` at `/multiplicity` and no `INVALID_MULTIPLICITY`, while a unit-typed field with multiplicity `{3, 1}` raises `INVALID_MULTIPLICITY`. | Test (TC-1843) |
| FR-146-AC-3 | A document declaring base dimension `Time` (`ix://acme/rpc/dimension/Time`, `base: true`, no terms), derived dimension `Rate` (`base: false`, terms `[{Time, "-1"}]`), dimensionless dimension `Ratio` (`base: false`, no terms), root unit `s` (`scale` `"1"`, `offset` `"0"`) and unit `ms` (`target` `s`, `scale` `"1/1000"`, `offset` `"0"`) is accepted by every reader; the same document without `dimensions` and `units` serializes with neither member. | Test (TC-1844) |
| FR-146-AC-4 | Each refuses exactly one diagnostic at the stated pointer: a term naming an undeclared dimension (`UNRESOLVED_DIMENSION_REF`, `…/terms/0/dimension`); a unit typed by an undeclared dimension (`UNRESOLVED_DIMENSION_REF`, `/units/<j>/dimension`); a unit targeting an undeclared unit (`UNRESOLVED_UNIT_REF`, `/units/<j>/target`); and, each `INVALID_UNIT_GRAPH`: scale `"0"` (`/scale`), a target in another dimension (`/target`), a second root of `Time` (`/units/<j>` of the second root), a root with scale `"2"` (`/scale`), a root with offset `"273"` (`/offset`), a two-unit target cycle (`/target` of the lower-index unit only), a self-target (`/target`), a two-dimension term cycle (the lower-index dimension's term only), a three-dimension component holding two cycles (one refusal, at the least-index dimension's first term into the component), a base dimension with a term (`/terms`), terms out of order and a repeated term (the later term), a term exponent `"0"` (`/exponent`), an identity `ix://acme/rpc/unit/msec` on unit `ms` and an identity `ix://acme/rpc/dimension/Duration` on dimension `Time` (`/identity`). A document carrying a zero scale and a cycle reports both. Two units named `ms` refuse `DUPLICATE_IDENTITY` at the later one's `/identity`. A dimension `Time` with no units is accepted. | Test (TC-1845) |
| FR-146-AC-5 | Scale spellings `"2/4"`, `"1/1"`, `"-0"`, `"0/5"`, `"01/3"` and `"1.5"` each refuse exactly `INVALID_OPERAND` at `/units/<j>/scale`; the JSON number `0.001` refuses exactly `SCHEMA_VIOLATION` there; a numerator of 2^127 refuses exactly `INTEGER_OUTSIDE_I128`; `"1/1000"`, `"-3/2"` and `"273"` are accepted; an exponent `"+1"` refuses exactly `INVALID_OPERAND` at its pointer. | Test (TC-1846) |
| FR-146-AC-6 | A field, an operation parameter and an operation result typed `ix://quire/unit/ms` are accepted with no diagnostic, both in the AC-3 document and in a document that declares no units; `ix://quire/unit/ms` as an alias target or sequence `items` refuses exactly `UNRESOLVED_TYPE_REF` at that member, and so do the typeRefs `ix://quire/unit/` and `ix://quire/unit/3ms`; a unit-typed field carrying `unit: "ms"`, a `min` constraint, a `decimal` policy and a semantic default refuses exactly one `INVALID_QUANTITY_MEMBER` at each of `/unit`, `/constraints`, `/decimal`, `/defaultKind` and `/defaultValue` under the field, and no `UNIT_ON_NON_SCALAR`, `CONSTRAINT_NOT_APPLICABLE`, decimal-policy code, `INVALID_DEFAULT_VALUE`, `UNKNOWN_CONSTRAINT_KEYWORD` or `INVALID_PATTERN`. | Test (TC-1847) |
| FR-146-AC-7 | Two documents differing only in the order of `units` have different normalized bytes and different fingerprints, and `IDENTITY_SET_PATHS` still has exactly its thirteen paths; every committed positive fixture keeps its bytes and fingerprint; adding a unit classifies additive, and removing one, changing its `scale` or changing a dimension's `base` classifies breaking. | Test (TC-1848) |
| FR-146-AC-8 | The AC-1 document and the AC-6 document each make every generation backend raise the blocking `UNDECLARED_LOSS` naming the clock or unit-typed member and write no file. With `allowedOmissions` naming the member, the backend omits it with one non-blocking `DECLARED_LOSS` naming it. With `allowedOmissions` naming only the owner, each of these is dropped with the owner under the owner's single `DECLARED_LOSS` and raises no loss of its own: the clock field of an omitted `Call` type, a unit-typed parameter of an omitted operation, a unit-typed parameter of an operation of an omitted type, and a unit-typed result of an omitted operation. A generated operation with a unit-typed result raises the blocking `UNDECLARED_LOSS` naming the operation and `returns`. A generated subtype of an omitted `Call` that inherits its clock field raises the blocking `UNDECLARED_LOSS` naming the field, unless `allowedOmissions` names the field. A document carrying `dimensions` and `units` generates exactly what it generates without them, and the JSON Schema and rust-serde backends' native lists carry `Clock` with no IR scalar. | Test (TC-1849) |
| FR-146-AC-9 | A field, an operation parameter and an operation result typed `ix://quire/unit/agent-ix/time-units/ms`, `ix://quire/unit/acme/rpc.v2/ms` and `ix://quire/unit/acme/rpc/ms` are accepted with no diagnostic; the typeRefs `ix://quire/unit/agent-ix/time-units/m-s` and `ix://quire/unit/agent-ix/time-units/3ms` (the unit-name segment outside its pattern), `ix://quire/unit/-acme/rpc/ms` and `ix://quire/unit/.acme/rpc/ms` (an earlier segment outside both patterns) and `ix://quire/unit/agent-ix//ms` (an empty segment) each refuse exactly `UNRESOLVED_TYPE_REF` at that `typeRef`. | Test (TC-1852) |
| FR-146-AC-10 | A document of package `acme/rpc` declaring base dimensions `Time` and `Duration`, root units `s` of `Time` and `sec` of `Duration`, and a `dimensionEquivalences` node with `identity` `ix://acme/rpc/dimension-equivalence/Duration-Time`, `dimensions` `["ix://acme/rpc/dimension/Duration", "ix://acme/rpc/dimension/Time"]` and `rootScale` `"1"`, is accepted by every reader with no diagnostic, the two roots staying two units of two dimensions. A document of package `acme/flow` declaring base dimension `Time` (`ix://acme/flow/dimension/Time`) and root unit `s`, read after the `acme/rpc` document by the same reader, is accepted with no diagnostic, and the two `Time` identities are two dimensions. | Test (TC-1855) |
| FR-146-AC-19 | Over the `acme/rpc` document of FR-146-AC-10 with further base dimensions `Length`, `Distance` and `Seconds`, derived dimensions `Speed` (terms `Length` 1, `Time` -1), `Velocity` (terms `Distance` 1, `Time` -1) and `Dur` (term `Time` 1), the equivalences `Dur`/`Time` and `Length`/`Time` are accepted (equal maps; two base dimensions; each `rootScale` `"1"`), `Speed`/`Velocity` (`rootScale` `"1"`) is refused `INVALID_UNIT_GRAPH` at `/dimensionEquivalences/<k>/dimensions` naming both dimensions when no `Distance`/`Length` pair is declared and accepted when a `Distance`/`Length` pair of `rootScale` `"1"` is, `Speed`/`Time` is refused `INVALID_UNIT_GRAPH` there, and the pairs `Duration`/`Seconds` (`"1"`), `Duration`/`Time` (`"1"`) and `Seconds`/`Time` (`"1"`) are accepted together. The identity `ix://acme/rpc/dimension-equivalence/Time-Duration` over `[Duration, Time]`, the descending pair `[Time, Duration]` under the identity `ix://acme/rpc/dimension-equivalence/Time-Duration` (which satisfies the identity rule for that spelling), and the equal pair `[Time, Time]` under the identity `ix://acme/rpc/dimension-equivalence/Time-Time` (which satisfies the identity rule for that spelling) each refuse `INVALID_UNIT_GRAPH` (at `/identity`, at `/dimensions` and at `/dimensions` respectively, so each of the three refuses exactly one pointer, each node carrying `rootScale` `"1"`); the entries `[Duration, ix://acme/rpc/dimension/Nothing]` and `[Duration, ix://acme/flow/dimension/Time]` each refuse `UNRESOLVED_DIMENSION_REF` at `/dimensionEquivalences/<k>/dimensions/1`; a second node relating the pair `Duration`/`Time` refuses `DUPLICATE_IDENTITY` at its `/identity`. | Test (TC-1865) |
| FR-146-AC-20 | Two documents differing only in the order of two `dimensionEquivalences` nodes have different normalized bytes and different fingerprints, and `IDENTITY_SET_PATHS` still has exactly its thirteen paths; a document with none serializes with no `dimensionEquivalences` member and every committed positive fixture keeps its bytes and fingerprint; adding an equivalence classifies additive, and removing one or changing an entry of its `dimensions` classifies breaking. A field typed `ix://quire/unit/acme/rpc/s`, a field typed `ix://quire/unit/acme/flow/s` and an operation whose parameter and result are typed by the two are accepted by every reader with no diagnostic, because a reader compares no two quantity types. | Test (TC-1865) |
| FR-146-AC-25 | The root ratio is checked (TC-1865). Over the `acme/rpc` document with base dimensions `Time` (root `s`), `Millis` (root `ms`), `Seconds` (root `sec`), `Length` and `Distance` (roots `m` and `d`) and derived `Speed` (`Length` 1, `Time` -1) and `Velocity` (`Distance` 1, `Time` -1): the pair `["…/Millis", "…/Time"]` with `rootScale` `"1/1000"` (one `ms` is a thousandth of an `s`) is accepted and the same pair with `"1000"` is accepted too, being a different claim the reader does not compare with the units; `"0"`, `"-1"`, `"1.5"`, `"2/4"` and `""` are refused, the first two `INVALID_UNIT_GRAPH` and the last three `INVALID_OPERAND`, each at `/dimensionEquivalences/<k>/rootScale`, and `"170141183460469231731687303715884105728"` is refused `INTEGER_OUTSIDE_I128` there; a node with no `rootScale` (or any other of `identity`, `dimensions`, `origin` absent) is refused `agent-ix.semantic-ir.SCHEMA_VIOLATION` at `/dimensionEquivalences/<k>` and a node with a further member beyond exactly `identity`, `dimensions`, `rootScale`, `origin` is refused `SCHEMA_VIOLATION` at `/dimensionEquivalences/<k>`, one diagnostic each (the schema layer of FR-068, so no cross-field rule runs on that document). The three pairs `Millis`/`Seconds` (`"1/1000"`), `Millis`/`Time` (`"1/1000"`) and `Seconds`/`Time` (`"1"`) are accepted together: the product around the cycle `Millis` to `Seconds` to `Time` and back to `Millis` is `(1/1000) * 1 * 1000 = 1`; with `Seconds`/`Time` carrying `"2"` the document is refused `INVALID_UNIT_GRAPH` at `/dimensionEquivalences/<k>/rootScale` of the last of the three nodes in array order, naming the three dimensions in array order. With the base pair `Distance`/`Length` carrying `"1000"` (one `d` is a thousand `m`) and `Length`/`Time` unrelated, `Speed`/`Velocity` is accepted with `rootScale` `"1/1000"` and refused `INVALID_UNIT_GRAPH` at `/dimensionEquivalences/<k>/rootScale`, naming both dimensions, with `"1"`. Two documents differing only in one `rootScale` have different normalized bytes and fingerprints, and changing a `rootScale` classifies breaking. | Test (TC-1865) |

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
