---
id: FR-032
title: "Define the kernel scalar library"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-007"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-031"
    type: "depends_on"
---
# [FR-032] Define the kernel scalar library

## Description

The semantic-core package SHALL define `KernelScalar` as the closed set of leaf
scalar types a declaration may bottom out in, each with a documented
representation and bounds policy.

## Inputs

- The IR v1 scalar vocabulary (`boolean`, `integer`, `number`, `string`, `bytes`, `date`, `datetime`, `duration`, `uuid`)
- The quire-contract-ir bounded-type requirements (integer bounds, decimal scale, timestamp precision, bytes length)

## Outputs

- The `KernelScalar` enumeration and one documented representation entry per member
- A `kernel-scalars.json` table beside the package mapping each member to its IR scalar, bounds, and extension

## Behavior

- `KernelScalar` SHALL enumerate exactly `UUID`, `Boolean`, `Integer`, `Decimal`, `String`, `Timestamp`, `Duration`, `Bytes`, `JsonObject`.
- `Integer` SHALL document a signed 64-bit bound (`-2^63 .. 2^63-1`).
- `Decimal` SHALL document a required `precision` and `scale`, carried on the `TypeRef` as a `decimal` extension.
- `Timestamp` SHALL document UTC instants with at most nanosecond precision, serialized as RFC 3339.
- `Duration` SHALL document ISO 8601 durations.
- `Bytes` SHALL document a maximum length that a `maxLength` constraint bounds.
- `String` SHALL document Unicode text with a `maxLength` bound expressed in code points.
- `JsonObject` SHALL document an opaque, never-typed JSON object that lowers to an open record with `unknownPolicy: preserve`.
- Every `KernelScalar` member SHALL name its IR v1 scalar (or, for `JsonObject`, the open-record lowering) in the representation table.
- The package SHALL NOT admit an `Any`, `Unknown`, or free-form scalar.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-032-CON-1 | The compatibility classifier SHALL classify an added `KernelScalar` member as additive and a removed or re-represented member as breaking. | Compatibility | Compatibility corpus |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-032-AC-1 | The representation table has one entry per `KernelScalar` member, none of which is `any`. | Test |
| FR-032-AC-2 | A `TypeRef` targeting `Decimal` without a `decimal` extension fails validation in the emitted schema. | Test |
| FR-032-AC-3 | Each member's documented IR scalar is a member of the IR v1 scalar enumeration, except `JsonObject` which names the open-record lowering. | Test |
| FR-032-AC-4 | A tenth member proposed as `Any` is rejected by the kernel scope test. | Test |
| FR-032-AC-5 | The FR-006 `ConfigVersion` rows use only `UUID`, `Integer`, `String`, `Timestamp`, `JsonObject`, and semantic references. | Analysis |

## Dependencies

- **Upstream**: [FR-031](./FR-031-define-the-semantic-core-declaration-grammar.md), [FR-020](./FR-020-define-semantic-type-system-and-identity.md)
- **Downstream**: [FR-034](./FR-034-lower-semantic-core-declarations-to-ir.md), `agent-ix/quire-contract-ir#53`
