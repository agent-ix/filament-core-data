---
id: FR-144
title: "Carry exact numeric scalars under one numeric literal encoding"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-006"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-029"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-032"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-050"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-009"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-019"
    type: "constrained_by"
  - target: "ix://agent-ix/quire-spec-language/FR-092"
    type: "references"
  - target: "ix://agent-ix/quire-spec-language/FR-056"
    type: "references"
  - target: "ix://agent-ix/quire-spec-language/FR-091"
    type: "references"
  - target: "ix://agent-ix/quire-specification/FR-140"
    type: "references"
---
# FR-144: Carry exact numeric scalars under one numeric literal encoding

## Description

This requirement answers Linear AGE-2229, rows 1, 2, 3 and 5. Row 4
(rationals, and quantities with units) is not decided there and this
requirement carries nothing for it: the IR keeps its opaque UCUM `unit`
symbol (FR-027) and declares no rational scalar.

The semantic IR at contract `2.0.0` SHALL carry four numeric scalars, each
exact and unambiguous:

| `scalar` | Domain | Written value in the IR |
|---|---|---|
| `integer` | The integers its declared bounds admit; a bound is any integer in `i128::MIN..=i128::MAX` | Canonical integer string |
| `decimal` | Exact decimals `coefficient × 10^-scale` within its decimal policy `{precision, scale}` and its declared bounds | Canonical decimal string |
| `float32` | IEEE 754 binary32 finite values | JSON number |
| `float64` | IEEE 754 binary64 finite values | JSON number |

The scalar `number` is deleted. It meant "a JSON number", which most readers
hold as a binary double, so it could not say whether a value was an exact
decimal or a float, nor of what width. Every place that wrote `number` now
names one of the four.

Every number the IR carries is spelled by one encoding, shared with
quire-spec-language's QSL-642 rule (QSL FR-092, "A preimage holds integers in
two kinds of place"), so QSL intake and the FCD readers agree by construction:

- A *counter* (a count or position: `multiplicity.lower` and `upper`, a
  `minLength` or `maxLength` operand, a source span's line and column, a
  decimal policy's `precision` and `scale`) is a JSON integer.
- An *integer value* (an integer bound, default, or enumerated value) is a
  canonical integer string at every magnitude, never a JSON number.
- A *decimal value* is a canonical decimal string, never a JSON number and
  never a binary float.
- A *float value* is a JSON number with an exact RFC 8785 spelling.
- No JSON number anywhere in a document may lack an exact RFC 8785 spelling,
  because the FR-050 canonical form writes every number through its nearest
  binary64 double, and a document holding such a number would fingerprint as
  a different value.

## Inputs

- A semantic IR document declaring `contractVersion` `2.0.0`, as bytes or as a
  parsed value
- The FR-032 kernel scalar library, `packages/semantic-core/kernel-scalars.json`

## Outputs

- Reader diagnostics for every violated rule below, each at an RFC 6901 pointer
- Generated targets whose numeric types and instance wire forms are exact, or a
  blocking refusal this requirement names

## Behavior

### Numeric scalars

- The schema SHALL admit exactly these `scalar` values: `boolean`, `integer`,
  `decimal`, `float32`, `float64`, `string`, `bytes`, `date`, `datetime`,
  `duration`, `uuid` and `any`.
- If a scalar type definition declares `scalar: "number"`, then the schema
  SHALL refuse it with `SCHEMA_VIOLATION` at `scalar`.
- The constraint applicability table SHALL admit `min`, `max`, `exclusiveMin`,
  `exclusiveMax` and `enumValues` on each of `integer`, `decimal`, `float32`
  and `float64`, and SHALL admit no other keyword on them.

### Canonical spellings

- A *canonical integer string* SHALL match `^(0|-?[1-9][0-9]*)$`: no leading
  zero, no `+`, no space, and `-` only before a nonzero value (QSpec
  `IntegerString`, the spelling QSL FR-092 gives an `integer` literal value).
- A *canonical decimal string* SHALL match
  `^(0|-?(0\.[0-9]*[1-9]|[1-9][0-9]*(\.[0-9]*[1-9])?))$`: a canonical integer
  part, and a fraction part only when the value is not whole, with no trailing
  zero. Zero is `0`, and no exponent is written. A canonical integer string is a
  canonical decimal string.
- Two decimal values written in the IR are equal exactly when their canonical
  decimal strings are byte-equal.

### The i128 ceiling

- Every integer value the IR carries SHALL lie in
  `i128::MIN..=i128::MAX` (`-170141183460469231731687303715884105728` to
  `170141183460469231731687303715884105727`), the ceiling QSL FR-091 fixes for
  integer bounds and literals.
- If an integer value lies outside that range, then each reader SHALL raise
  `agent-ix.semantic-ir.INTEGER_OUTSIDE_I128` at the value's pointer, naming the
  value as written and the limit it crosses.
- The ceiling SHALL cap written values only. An `integer` subject with no
  declared bound has no bound in the IR; the instance wire domain of a missing
  bound is stated under "Instance wire" below.

### Decimal policy

- A `decimal` subject SHALL be governed by one decimal policy
  `decimal: {precision, scale}`, where `precision` is a JSON integer in
  `1..=38` and `scale` is a JSON integer in `0..=precision`.
- The policy denotes the values whose canonical decimal string has at most
  `precision - scale` integer digits (a leading `0` of a value below one is not
  counted) and at most `scale` fraction digits. `precision` 38 is the largest
  whose coefficient bound `10^precision - 1` lies within the i128 ceiling.
- The schema SHALL admit the `decimal` member on a field (including an
  operation parameter), on a type definition of kind `alias`, and on a scalar
  type definition of scalar `decimal`, and SHALL refuse it with
  `SCHEMA_VIOLATION` on any other node and on a scalar type definition of any
  other scalar.
- A *resolution walk* is the walk FR-050 resolves a reference by: from a field
  through its `typeRef`, then through alias `target`s, to a scalar type
  definition or a native type reference. A walk *reaches decimal* when it ends
  at a scalar definition of scalar `decimal` or at `ix://quire/native/Decimal`.
- Each resolution walk that reaches decimal SHALL pass exactly one node carrying
  `decimal`, and that node's policy governs the walk's subject.
- If a field's walk, a constraint's walk from its `appliesTo`, or the walk from a
  sequence `items`, map `values`, variant `payloadType`, operation `returns` or
  reference `target` reaches decimal and passes no node carrying `decimal`, then
  each reader SHALL raise `agent-ix.semantic-ir.DECIMAL_POLICY_MISSING` at that
  field, constraint or reference.
- If a walk passes two nodes carrying `decimal`, then each reader SHALL raise
  `agent-ix.semantic-ir.DECIMAL_POLICY_CONFLICT` at the nearer node's `decimal`,
  so a field never re-declares the policy its type already holds, whether or not
  the two agree.
- If a node carries `decimal` and its own walk does not reach decimal, then each
  reader SHALL raise `SCHEMA_VIOLATION` at that `decimal`, as FR-141 does for a
  misplaced `textProfile`, because the JSON Schema cannot follow a `typeRef`.

### Value sites

A *value site* is a bound operand (`min`, `max`, `exclusiveMin`,
`exclusiveMax`), an `enumValues` item, and a field's `defaultValue`, whose
subject resolves through its walk to a numeric scalar. A `defaultValue` of a
field whose subject is `any` is not a value site (FR-139).

- On an `integer` subject, each value site SHALL be a canonical integer string.
- On a `decimal` subject, each value site SHALL be a canonical decimal string
  that is a value of the subject's decimal policy; a bound is a value of the
  type it bounds, so QSL builds its coefficient bound by an exact shift with no
  rounding.
- On a `float64` subject, each value site SHALL be a finite JSON number.
- On a `float32` subject, each value site SHALL be a finite JSON number whose
  binary64 value is exactly a binary32 value, so the one spelling the FR-050
  canonical form writes for it names that binary32 value. A frontend lifting an
  authored float32 value SHALL round it to the nearest binary32 value, ties to
  even, and write that value.
- If a bound operand or an `enumValues` item breaks the rule for its subject,
  then each reader SHALL raise `agent-ix.semantic-ir.INVALID_OPERAND` at the
  operand or item.
- If a `defaultValue` breaks the rule for its subject, then each reader SHALL
  raise `agent-ix.semantic-ir.INVALID_DEFAULT_VALUE` at the `defaultValue`.
- A value site on an `integer` subject written as a JSON number SHALL raise the
  site's code whatever its magnitude: `1` is refused and `"1"` is admitted.
- A `date`, `datetime` or `duration` bound keeps its ISO 8601 string operand
  (FR-029).

### Exact numbers

- Each reader that reads a document from its bytes SHALL refuse a JSON number
  that has no exact RFC 8785 spelling, deciding from the number's source text by
  exact decimal reasoning, never from a parsed double, by the two cases QSL
  FR-056 states for `noncanonical_wire`:
  - a number denoting a whole value whose magnitude exceeds 2^53
    (`9007199254740992`), however spelled (`9007199254740993`, `1e20`,
    `18446744073709551615`), SHALL raise
    `agent-ix.semantic-ir.INEXACT_INTEGER` at its pointer;
  - any other number whose exact decimal value differs from that of the
    RFC 8785 text of its nearest binary64 double (`0.1000000000000000000001`,
    `1e-400`) SHALL raise `agent-ix.semantic-ir.INEXACT_NUMBER` at its pointer.
- The rule SHALL cover every number of the document at any depth, the members of
  an `any` value included.
- The two codes SHALL name the same condition as QSL's
  `noncanonical_wire`/`inexact-integer` and `noncanonical_wire`/`inexact-number`,
  so a document an FCD reader admits is never refused by QSL intake for a number
  spelling, and the reverse.
- A counter SHALL be a JSON integer in `0..=9007199254740991` (2^53 - 1). Under
  QSL FR-092's counter rule a counter is a JSON number up to 2^53 - 1 and a
  decimal string beyond; the IR admits no counter beyond, so every counter the
  IR holds is spelled the same under both rules.
- A reader entry point that receives an already-parsed value SHALL apply every
  rule above except the two exact-number cases, which need the source text.

### Kernel scalars and native references

- The FR-032 kernel scalar library SHALL name `Integer` → `integer`,
  `Decimal` → `decimal`, `Float32` → `float32` and `Float64` → `float64`,
  beside its other members.
- `ix://quire/native/Float32` and `ix://quire/native/Float64` SHALL resolve as
  native type references, the names QSL FR-056 gives the same native types.

### Lifting

- The TypeSpec frontend SHALL lower the built-in scalars by this table:

| TypeSpec built-in | IR scalar | Bounds the frontend writes |
|---|---|---|
| `integer` | `integer` | none |
| `int8`, `int16`, `int32`, `int64` | `integer` | `min` and `max` of the signed width (`"-128"`, `"127"` for `int8`) |
| `uint8`, `uint16`, `uint32`, `uint64` | `integer` | `min` `"0"` and `max` of the unsigned width (`"18446744073709551615"` for `uint64`) |
| `safeint` | `integer` | `min` `"-9007199254740991"` and `max` `"9007199254740991"` |
| `float32` | `float32` | none |
| `float64`, `float` | `float64` | none |
| `decimal`, `decimal128` | `decimal` | none; the policy comes from `@decimal` |
| `numeric` | refused | — |

- Where a member also carries an authored bound of the same keyword, the
  TypeSpec frontend SHALL write one bound per keyword, the tighter of the width
  bound and the authored one, so no two constraints share an identity.
- The TypeSpec frontend SHALL write the FR-053 `@decimal(precision, scale)`
  decorator as the `decimal` member of the decorated member or scalar.
- If a member or scalar whose base is `decimal` or `decimal128` carries no
  `@decimal`, or a `decimal128` one carries a `precision` above 34, then
  the TypeSpec frontend SHALL raise the blocking
  `agent-ix.compiler.DECIMAL_POLICY_MISSING` at it.
- If a member's type resolves to `numeric`, then the TypeSpec frontend SHALL
  raise the blocking `agent-ix.compiler.AMBIGUOUS_NUMERIC` at it, because
  `numeric` names no one of integer, decimal and float.
- The spec-bundle frontend SHALL write a `FieldDecl.type_ref.decimal` policy as
  the `decimal` member of the alias it mints for a constrained field (FR-093) or,
  for an unconstrained field, of the field itself.
- If a spec-bundle field's type is the kernel scalar `Decimal` and its
  `FieldDecl` carries no `decimal`, then the spec-bundle frontend SHALL raise the
  blocking `agent-ix.extraction-frontend.DECIMAL_POLICY_MISSING` at the row.
- Every frontend SHALL write each value site in the spelling the value-site
  rules above give its subject: a bound authored `min: 1` on an `Integer` field
  lifts to `"1"`, and one authored `min: 1.50` on a `Decimal` field lifts to
  `"1.5"`.
- The semantic-core lowering (FR-034) SHALL write `TypeRef.decimal` as the
  `decimal` member of the alias it mints for a constrained field or, for an
  unconstrained field, of the field itself; the IR carries no decimal extension.

### Instance wire

The instance wire is the JSON form a generated target reads and writes for a
value of a numeric subject. One wire form per subject keeps the backends in
agreement (NFR-009).

- The *effective range* of an `integer` subject SHALL be `[lo, hi]`, where `lo`
  is its `min`, or its `exclusiveMin` plus one, and `hi` is its `max`, or its
  `exclusiveMax` minus one; a missing lower bound gives `lo` = -(2^53 - 1) and a
  missing upper bound gives `hi` = 2^53 - 1.
- An `integer` subject is *safe* when its effective range lies within
  `-9007199254740991..=9007199254740991`, and *wide* otherwise.
- A safe `integer` subject's instance value SHALL be a JSON number with no
  fraction or exponent; a wide one's SHALL be a canonical integer string.
- A `decimal` subject's instance value SHALL be read from a JSON string matching
  `^-?(0|[1-9][0-9]*)(\.[0-9]+)?$` that denotes a value of its policy and is not
  a negative zero, trailing fraction zeros admitted (`"1.10"`); it SHALL be
  written with exactly `scale` fraction digits (`"1.10"` at scale 2, `"5"` at
  scale 0).
- Two decimal instance values SHALL be equal, ordered, and unique by their
  mathematical value, so `"1.1"` and `"1.10"` are one value.
- A `float64` subject's instance value SHALL be a finite JSON number, read as
  its nearest binary64 value and written as the RFC 8785 text of that value.
- A `float32` subject's instance value SHALL be a finite JSON number, read as
  its nearest binary32 value (ties to even) and written as the shortest decimal
  text that reads back to that value; a number whose nearest binary32 value
  overflows SHALL be rejected.
- A generated validator SHALL reject an instance value outside its subject's
  effective range, decimal policy, or bounds with a structural or constraint
  code, never by narrowing or rounding it.

### Backends

- The Rust backend SHALL type an `integer` subject as `i64` when its effective
  range lies within `i64`, else as `u64` when it lies within `0..=u64::MAX`,
  else as `i128`, and SHALL check its bounds against operands parsed exactly
  into that type.
- The Rust backend SHALL type a `decimal` subject as the generated
  `crate::support::Decimal` newtype holding an `i128` coefficient at the
  subject's scale, compare by value, and serialize the instance wire form above.
- The Rust backend SHALL type a `float32` subject as `f32` and a `float64`
  subject as `f64`.
- The TypeScript backend SHALL type a safe `integer` subject as `number`, and a
  wide `integer` or a `decimal` subject as `string`; its generated validator
  SHALL check a wide or decimal bound or enumerated value by exact `bigint`
  comparison of coefficients at a common scale, never through a `number`.
- The TypeScript backend SHALL type `float32` and `float64` subjects as
  `number`, rejecting a `float32` value whose nearest binary32 value overflows.
- The JSON Schema backend SHALL render a safe `integer` subject as
  `{"type": "integer", "minimum": lo, "maximum": hi}` over its effective range,
  and a wide one as `{"type": "string", "pattern": P}`, where `P` admits exactly
  the canonical integer strings of the integers in its effective range.
- The JSON Schema backend SHALL render a `decimal` subject as
  `{"type": "string", "pattern": P}`, where `P` admits exactly the instance
  strings of its decimal policy.
- If a `decimal` subject carries a bound, then the JSON Schema backend SHALL
  raise the blocking `agent-ix.semantic-ir.UNDECLARED_LOSS` naming the
  constraint and write no file, because a JSON Schema numeric keyword compares
  numbers and a decimal instance value is a string.
- The JSON Schema backend SHALL render `float32` and `float64` subjects as
  `{"type": "number"}` with their bounds as numeric keywords.
- The Python backends SHALL inherit every numeric rendering and refusal from
  the JSON Schema backend, from whose output they generate (FR-136).
- The SysML v2 target SHALL map `integer` to `ScalarValues::Integer` and
  `decimal`, `float32` and `float64` to `ScalarValues::Real`, and SHALL emit an
  FR-138 diagnostic naming the decimal policy or float width it cannot carry.
- No backend SHALL raise `INTEGER_BOUND_NOT_EXACT`: every integer bound the IR
  admits is held exactly by every backend above.

### Compatibility

- The FR-051 diff SHALL compare integer and decimal bounds by exact value,
  never through a double, and SHALL classify a changed numeric scalar or
  decimal policy by the rows FR-051 states for them (FR-051-AC-18).

### QSL agreement

The rules above fix what QSL intake reads; QSL adapts its intake in the same
round (AGE-2229's same-slice rule). For reference, the mapping is:

- An `integer` subject with bounds maps to QSL `Int[lo, hi]` with the bounds as
  written; QSL FR-056 already reads a decimal-string bound, and with this
  requirement every bound is one.
- A `decimal` subject with policy `{p, s}` maps to QSpec FR-140's
  `Decimal[lo, hi; s, s]`, with `lo` = -(10^p - 1) and `hi` = 10^p - 1, each
  narrowed by a declared bound shifted by `10^s` (an exclusive bound moved one
  coefficient unit inward), and the rounding spelling omitted, which selects
  strict `exact`.
- A `float32` or `float64` subject maps to QSL `Float32` or `Float64` with the
  mode omitted (strict `exact`); QSL FR-056 refuses such a field until QSL-285.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-144-CON-1 | The Rust reader, the Node reader, the Python reader and the oracle SHALL raise the same codes at the same pointers for every document of this requirement's corpus cases; each implements the rules independently (FR-050-CON-1). | Correctness | Differential test |
| FR-144-CON-2 | No reader, frontend, or backend SHALL hold an integer or decimal value as a binary double at any step between reading it and writing or comparing it. | Correctness | Inspection |
| FR-144-CON-3 | This requirement SHALL NOT carry a rational scalar, a quantity type, unit algebra, dimension checks, or unit conversions; AGE-2229 row 4 is undecided. | Scope | Inspection |
| FR-144-CON-4 | FCD SHALL reference QSL's and QSpec's numeric rules by requirement id only, with none of their files or vectors copied into this repository. | Integrity | Inspection |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-144-AC-1 | A scalar type definition of each of `integer`, `decimal` (with a policy), `float32` and `float64` is accepted by the Rust, Node and Python readers and the oracle; one of `number` raises `SCHEMA_VIOLATION` at `scalar`. | Test |
| FR-144-AC-2 | On an `integer` subject, a `max` of `"18446744073709551615"`, of `"170141183460469231731687303715884105727"` and of `"-170141183460469231731687303715884105728"` is accepted; `"170141183460469231731687303715884105728"` and `"-170141183460469231731687303715884105729"` raise `INTEGER_OUTSIDE_I128` at the operand naming the value and the limit; `"01"`, `"+1"`, `" 1"`, `"-0"`, `"1.0"` and the JSON number `1` raise `INVALID_OPERAND` at the operand. | Test |
| FR-144-AC-3 | On an `integer` field, a `defaultValue` of `"42"` is accepted and one of `42` or `"042"` raises `INVALID_DEFAULT_VALUE`; an `enumValues` list `["1", "2"]` is accepted and `["1", 2]` raises `INVALID_OPERAND` at `/values/1`. | Test |
| FR-144-AC-4 | A field typed `ix://quire/native/Decimal` carrying `decimal: {precision: 5, scale: 2}` is accepted with a `max` of `"999.99"` and a `defaultValue` of `"1.5"`; `"1000"` and `"0.001"` raise `INVALID_OPERAND`, `"1.50"`, `"-0"`, `".5"`, `"1e2"` and the JSON number `1.5` raise `INVALID_OPERAND`, and a `defaultValue` of `"1.50"` raises `INVALID_DEFAULT_VALUE`. | Test |
| FR-144-AC-5 | A policy with `precision` 0 or 39, a negative `scale`, or a `scale` above `precision` raises `SCHEMA_VIOLATION` at the policy; `decimal` on a record raises `SCHEMA_VIOLATION`, and on a field resolving to `integer` raises `SCHEMA_VIOLATION` at the field's `decimal`. | Test |
| FR-144-AC-6 | A field typed `ix://quire/native/Decimal` with no `decimal`, and a sequence whose `items` is `ix://quire/native/Decimal`, each raise `DECIMAL_POLICY_MISSING` at the field or the `items`; a field carrying `decimal` whose `typeRef` names a scalar `decimal` definition carrying one raises `DECIMAL_POLICY_CONFLICT` at the field's `decimal`, and the same field without its own policy is accepted. | Test |
| FR-144-AC-7 | On a `float32` subject a bound of `0.5` and of `0.10000000149011612` is accepted and one of `0.1` raises `INVALID_OPERAND`; on a `float64` subject `0.1` is accepted. | Test |
| FR-144-AC-8 | Read from bytes, a document holding `9007199254740993`, `1e20` or `18446744073709551615` at any depth, the inside of an `any` default included, raises `INEXACT_INTEGER` at that number's pointer; one holding `0.1000000000000000000001` or `1e-400` raises `INEXACT_NUMBER`; one holding `9007199254740992`, `0.1`, `1.0` or `-0` raises neither. The Rust, Node and Python readers and the oracle agree on each. | Test |
| FR-144-AC-9 | A `multiplicity.upper` or a `maxLength` operand of `9007199254740991` is accepted, and `9007199254740992` raises `SCHEMA_VIOLATION` at it. | Test |
| FR-144-AC-10 | `kernel-scalars.json` maps `Integer`, `Decimal`, `Float32` and `Float64` to `integer`, `decimal`, `float32` and `float64`, and a field typed `ix://quire/native/Float32` resolves to scalar `float32` in every reader. | Test |
| FR-144-AC-11 | The TypeSpec frontend lowers members typed `int8`, `uint64`, `safeint`, `float`, `float32` and `decimal` with `@decimal(12, 2)` to the scalars and bounds of the lifting table; `int8` with `@minValue(0)` carries one `min` of `"0"` and one `max` of `"127"`; `decimal` without `@decimal` raises `DECIMAL_POLICY_MISSING` and `numeric` raises `AMBIGUOUS_NUMERIC`, each blocking. | Test |
| FR-144-AC-12 | The spec-bundle frontend lifts `versionNumber \| Integer \| 1 \| min: 1` with operand `"1"`, a constrained `Decimal` row with policy `(10, 2)` and `min: 1.50` to an alias carrying `decimal` `{precision: 10, scale: 2}` and operand `"1.5"`, and a `Decimal` row with no policy to a blocking `DECIMAL_POLICY_MISSING` at the row. | Test |
| FR-144-AC-13 | The Rust backend types integer subjects with effective ranges `[0, 9]`, unbounded, `[0, 18446744073709551615]` and `[-1, 18446744073709551615]` as `i64`, `i64`, `u64` and `i128`; a generated `u64` field reads `"18446744073709551615"` and rejects `"18446744073709551616"` and the JSON number `5`; a `decimal(5, 2)` field reads `"1.1"` and `"1.10"` as one value, writes `"1.10"`, and rejects `"1.001"` and `"1000"`; `f32` and `f64` fields generate for `float32` and `float64`. | Test |
| FR-144-AC-14 | The TypeScript backend generates a `max` of `"9007199254740993"` on an `integer` without refusing; the subject is a `string`, its validator accepts `"9007199254740993"`, rejects `"9007199254740994"` with the constraint's code and rejects the JSON number `5` with a structural code; an unbounded `integer` stays `number` and rejects `9007199254740992`; a `decimal(5, 2)` subject with `max` `"10.5"` accepts `"10.50"` and rejects `"10.51"`. | Test |
| FR-144-AC-15 | The JSON Schema backend renders an unbounded `integer` with `minimum` `-9007199254740991` and `maximum` `9007199254740991`, a `[0, 18446744073709551615]` subject as a string whose pattern accepts `"0"` and `"18446744073709551615"` and rejects `"18446744073709551616"`, `"01"` and `"-1"`, and a `decimal(5, 2)` subject as a string whose pattern accepts `"999.99"` and `"1.1"` and rejects `"1000"` and `"1.001"`; a `decimal` subject with a bound raises `UNDECLARED_LOSS` and writes no file. The Python backends generate from that output with the same acceptances. | Test |
| FR-144-AC-16 | No source file of the readers, the oracle, the frontends or the backends converts an integer or decimal value site to a JavaScript `number`, a Rust `f64` or a Python `float`, and no backend declares `INTEGER_BOUND_NOT_EXACT`. | Inspection |

## Dependencies

- **Upstream**: [FR-029](./FR-029-close-the-constraint-keyword-vocabulary.md), [FR-032](./FR-032-define-the-kernel-scalar-library.md), [FR-050](./FR-050-validate-and-normalize-the-emitted-ir.md), [FR-139](./FR-139-express-an-unconstrained-value-in-the-semantic-ir.md); QSL FR-056, FR-091 and FR-092 (`ix://agent-ix/quire-spec-language/FR-092`), QSpec FR-140 (`ix://agent-ix/quire-specification/FR-140`)
- **Downstream**: [FR-046](./FR-046-lower-typespec-to-contract-ir.md), [FR-051](./FR-051-diff-and-evolve-the-semantic-ir.md), [FR-054](./FR-054-map-the-semantic-ir-to-rust-serde-declarations.md), [FR-057](./FR-057-enforce-constraints-in-generated-rust.md), [FR-064](./FR-064-lower-ir-type-definitions-to-typescript.md), [FR-066](./FR-066-generate-runtime-validators.md), [FR-093](./FR-093-lower-field-declarations-to-ir-fields.md), [FR-100](./FR-100-map-semantic-ir-to-json-schema.md), [FR-138](./FR-138-emit-the-sysml-v2-textual-target.md)
- **Constrained by**: [NFR-009](../non-functional/NFR-009-cross-language-semantic-parity.md), [NFR-019](../non-functional/NFR-019-deterministic-contract-compilation.md)
