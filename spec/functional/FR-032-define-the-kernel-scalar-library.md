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
- The table SHALL record `Integer` as IR `integer`, bounded only by its declared bounds, each an integer within `i128::MIN..=i128::MAX` written as a canonical integer string ([FR-144](./FR-144-carry-exact-numeric-scalars-under-one-literal-encoding.md)).
- The table SHALL record `Decimal` as IR `decimal`, governed by the decimal policy (`precision`, `scale`) that `TypeRef.decimal` carries under the grammar rule in FR-031 and that the IR carries as the `decimal` member ([FR-144](./FR-144-carry-exact-numeric-scalars-under-one-literal-encoding.md)).
- The table SHALL record `Float32` as IR `float32` (IEEE 754 binary32) and `Float64` as IR `float64` (IEEE 754 binary64), each serialized as a finite JSON number.
- The table SHALL record `Timestamp` as IR `datetime`, UTC, at most nanosecond precision, RFC 3339 serialization.
- The table SHALL record `Duration` as IR `duration` with ISO 8601 serialization.
- The table SHALL record `Bytes` as IR `bytes` whose length a `maxLength` constraint bounds in bytes.
- The table SHALL record `String` as IR `string` whose length `minLength`/`maxLength` bound in Unicode code points.
- The table SHALL record `UUID` as IR `uuid` and `Boolean` as IR `boolean`.
- The table SHALL record `JsonObject` as IR `any`, an unconstrained JSON value that is never typed further (FR-139).
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
| FR-032-AC-6 | `kernel-scalars.json` records `Integer` → `integer`, `Decimal` → `decimal`, `Float32` → `float32` and `Float64` → `float64`, no entry maps to `number`, and `Integer`'s bounds name the i128 ceiling rather than a 64-bit width. | Analysis |
| FR-032-AC-5 | Every `type.target` in the committed FR-006 `FieldDecl[]` fixture is one of `UUID`, `Integer`, `String`, `Timestamp`, `JsonObject`, or a `SemanticId`. | Test |

## Dependencies

- **Upstream**: [FR-031](./FR-031-define-the-semantic-core-declaration-grammar.md), [FR-020](./FR-020-define-semantic-type-system-and-identity.md)
- **Downstream**: [FR-034](./FR-034-lower-semantic-core-declarations-to-ir.md), `agent-ix/quire-contract-ir#53`
