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
---
# [FR-032] Define the kernel scalar library

## Description

The semantic-core package SHALL document `KernelScalar` (declared by FR-031)
as the closed set of leaf scalar types a declaration may bottom out in, each
with a representation and bounds policy recorded in a machine-readable table.

## Inputs

- The `KernelScalar` enumeration from FR-031
- The IR v1 scalar vocabulary (`boolean`, `integer`, `number`, `string`, `bytes`, `date`, `datetime`, `duration`, `uuid`)

## Outputs

- `packages/semantic-core/kernel-scalars.json`: one entry per member with `irScalar` (or `irLowering: open-record`), `bounds`, `serialization`, and `unitAllowed`

## Behavior

- `KernelScalar` SHALL enumerate exactly `UUID`, `Boolean`, `Integer`, `Decimal`, `String`, `Timestamp`, `Duration`, `Bytes`, `JsonObject`.
- The table SHALL record `Integer` as IR `integer` with the signed 64-bit bound `-2^63 .. 2^63-1`.
- The table SHALL record `Decimal` as IR `number` whose `TypeRef.decimal` policy (`precision`, `scale`) is required by the grammar rule in FR-031.
- The table SHALL record `Timestamp` as IR `datetime`, UTC, at most nanosecond precision, RFC 3339 serialization.
- The table SHALL record `Duration` as IR `duration` with ISO 8601 serialization.
- The table SHALL record `Bytes` as IR `bytes` whose length a `maxLength` constraint bounds in bytes.
- The table SHALL record `String` as IR `string` whose length `minLength`/`maxLength` bound in Unicode code points.
- The table SHALL record `UUID` as IR `uuid` and `Boolean` as IR `boolean`.
- The table SHALL record `JsonObject` as an open record (`kind: record`, zero fields, `unknownPolicy: preserve`) that is never typed further.
- The table SHALL mark `unitAllowed: true` only for `Integer`, `Decimal`, `Timestamp`, `Duration`.
- The bounds in the table are documentation for consumers; the semantic-core reader SHALL NOT evaluate values against them.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-032-CON-1 | The compatibility corpus SHALL classify an added `KernelScalar` member as additive and a removed or re-represented member (changed `irScalar`, bound, or serialization) as breaking, keyed on the member name. | Compatibility | Compatibility corpus |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-032-AC-1 | `kernel-scalars.json` has exactly one entry per `KernelScalar` member and no entry names `any`. | Analysis |
| FR-032-AC-2 | The semantic-core reader rejects a `TypeRef` targeting `Decimal` without `decimal`, and a `TypeRef` targeting `String` with `decimal`. | Test |
| FR-032-AC-3 | Every entry's `irScalar` is a member of the IR v1 scalar enumeration, except `JsonObject`, whose entry records the open-record lowering. | Analysis |
| FR-032-AC-4 | A tenth enum member `Any` added to the source fails FR-031's inventory test. | Test |
| FR-032-AC-5 | Every `type.target` in the committed FR-006 `FieldDecl[]` fixture is one of `UUID`, `Integer`, `String`, `Timestamp`, `JsonObject`, or a `SemanticId`. | Test |

## Dependencies

- **Upstream**: [FR-031](./FR-031-define-the-semantic-core-declaration-grammar.md), [FR-020](./FR-020-define-semantic-type-system-and-identity.md)
- **Downstream**: [FR-034](./FR-034-lower-semantic-core-declarations-to-ir.md), `agent-ix/quire-contract-ir#53`
