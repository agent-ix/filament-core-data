---
id: FR-032
title: "Define the kernel scalar library"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-007"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-031"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-020"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-144"
    type: "depends_on"
  - target: "ix://agent-ix/quire-specification/FR-154"
    type: "references"
  - target: "ix://agent-ix/quire-specification/FR-322"
    type: "references"
  - target: "ix://agent-ix/quire-specification/FR-149"
    type: "references"
---
# [FR-032] Define the kernel scalar library

## Description

The semantic-core package SHALL document `KernelScalar` (declared by FR-031)
as the closed set of leaf scalar types a declaration may bottom out in, each
with a representation and bounds policy recorded in a machine-readable table.

## Inputs

- The `KernelScalar` enumeration from FR-031
- The IR scalar vocabulary (`boolean`, `integer`, `decimal`, `float32`, `float64`, `string`, `bytes`, `date`, `datetime`, `duration`, `uuid`, `any`)

## Outputs

- `packages/semantic-core/kernel-scalars.json`: one entry per member with `irScalar`, `bounds`, `serialization`, and `unitAllowed`

## Behavior

- `KernelScalar` SHALL enumerate exactly `UUID`, `Boolean`, `Integer`, `Decimal`, `Float32`, `Float64`, `String`, `Timestamp`, `Duration`, `Bytes`, `JsonObject`.
- The table SHALL record `Integer` as IR `integer`, whose instance domain ([FR-144](./FR-144-carry-exact-numeric-scalars-under-one-literal-encoding.md)) is the integers within its declared bounds, each an integer within `i128::MIN..=i128::MAX` written as a canonical integer string, and -(2^53 - 1) or 2^53 - 1 on a side that declares none.
- The table SHALL record `Decimal` as IR `decimal`, governed by the decimal policy (`precision`, `scale`) that `TypeRef.decimal` carries under the grammar rule in FR-031 and that the IR carries as the `decimal` member ([FR-144](./FR-144-carry-exact-numeric-scalars-under-one-literal-encoding.md)).
- The table SHALL record `Float32` as IR `float32` (IEEE 754 binary32) and `Float64` as IR `float64` (IEEE 754 binary64), each serialized as a finite JSON number.
- The table SHALL record `Timestamp` as IR `datetime`, UTC, at most nanosecond precision, RFC 3339 serialization.
- The table SHALL record `Duration` as IR `duration`, an exact amount of elapsed time, serialized as an ISO 8601 duration string whose components are days, hours, minutes and seconds only (`[-]P[nD][T[nH][nM][n[.f]S]]`, at least one component, at most nine fractional-second digits, one day being 86400 seconds); a year, month or week component is outside the instance domain. A `Duration` value denotes the exact rational number of seconds its components give, and QSpec FR-322 "Model-owned members" reads `ix://quire/native/Duration` as the quantity type `Quantity<s>` over the unit `s` of the base dimension `Time`, so `PT1.5S` and `1500 ms` denote one duration.
- The table SHALL record `Bytes` as IR `bytes`, an octet sequence of any length including the empty sequence, serialized as a JSON string of standard padded base64 (RFC 4648 section 4), whose length a `maxLength` constraint bounds in octets.
- `Bytes` values compare equal exactly when their octet sequences are identical, which QSpec FR-149 states, and `Bytes` admits the octet count and concatenation operations of QSpec FR-322 and no ordering.
- The table SHALL record `String` as IR `string` whose length `minLength`/`maxLength` bound in Unicode code points.
- The table SHALL record `UUID` as IR `uuid` and `Boolean` as IR `boolean`.
- The table SHALL record `JsonObject` as IR `any`, an unconstrained JSON value of any kind (object, array, string, number, boolean or `null`) that is never typed further (FR-139), despite its name. Two `JsonObject` values compare equal exactly when their RFC 8785 (JCS) serializations are identical, and QSpec FR-149 states that equality; the type admits equality only, with no member access and no ordering.
- QSpec domain-package intake (QSpec FR-154) SHALL admit the native reference `ix://quire/native/<Name>` of every `KernelScalar` member, `Bytes`, `Duration` and `JsonObject` included, as the `typeRef` of a field, an operation parameter or result, an alias target, a sequence `items`, a map `values` and a variant case `payloadType`.
- The table SHALL mark `unitAllowed: true` only for `Integer`, `Decimal`, `Float32`, `Float64`, `Timestamp`, `Duration`.
- The bounds in the table are documentation for consumers; the semantic-core reader SHALL NOT evaluate values against them.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-032-CON-1 | The compatibility corpus SHALL classify an added `KernelScalar` member as additive and a removed or re-represented member (changed `irScalar`, bound, or serialization) as breaking, keyed on the member name. | Compatibility | Compatibility corpus |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-032-AC-1 | `kernel-scalars.json` has exactly one entry per `KernelScalar` member, and only `JsonObject` maps to `any`. | Analysis |
| FR-032-AC-2 | The semantic-core reader rejects a `TypeRef` targeting `Decimal` without `decimal`, and a `TypeRef` targeting `String` with `decimal`. | Test |
| FR-032-AC-3 | Every entry's `irScalar` is a member of the IR scalar enumeration, and `JsonObject`'s is `any`. | Analysis |
| FR-032-AC-4 | A twelfth enum member `Any` added to the source fails FR-031's inventory test. | Test |
| FR-032-AC-6 | `kernel-scalars.json` records `Integer` → `integer`, `Decimal` → `decimal`, `Float32` → `float32` and `Float64` → `float64`, no entry maps to `number`, and `Integer`'s bounds name the default instance domain `-9007199254740991..=9007199254740991` and the i128 ceiling on a declared bound, rather than a 64-bit width. | Analysis |
| FR-032-AC-5 | Every `type.target` in the committed FR-006 `FieldDecl[]` fixture is one of `UUID`, `Integer`, `String`, `Timestamp`, `JsonObject`, or a `SemanticId`. | Test |
| FR-032-AC-7 | A field typed `ix://quire/native/Bytes`, a field typed `ix://quire/native/Duration` and a field typed `ix://quire/native/JsonObject` are each admitted by a QSpec domain-package intake (QSpec FR-154-AC-21) and none refuses `malformed-declaration`; `kernel-scalars.json` records `Bytes` → `bytes` serialized as padded base64 with `unitAllowed: false`, `Duration` → `duration` and `JsonObject` → `any`. | Test (TC-1853) |
| FR-032-AC-8 | The instance strings `PT0S`, `PT1.5S`, `-PT0.000000001S`, `P1DT2H3M4.5S` and `PT36H` are `Duration` values denoting `0`, `3/2`, `-1/1000000000`, `93784.5` and `129600` seconds; `P1Y`, `P1M`, `P1W`, `P`, `PT`, `PT1.0000000001S`, `1S` and `pt1s` are outside the `Duration` instance domain. The base64 strings `` (empty), `AP8=` and `AQID` are `Bytes` values of 0, 2 and 3 octets, and `AP8`, `AP8==` and `A P8=` are outside the `Bytes` instance domain. The values `{"a":1,"b":[true,null]}` and `{"b":[true,null],"a":1}` are equal `JsonObject` values and `[]`, `3`, `"x"` and `null` are `JsonObject` values. | Test (TC-1854) |

## Dependencies

- **Upstream**: [FR-031](./FR-031-define-the-semantic-core-declaration-grammar.md), [FR-020](./FR-020-define-semantic-type-system-and-identity.md)
- **Downstream**: [FR-034](./FR-034-lower-semantic-core-declarations-to-ir.md), `agent-ix/quire-contract-ir#53`
