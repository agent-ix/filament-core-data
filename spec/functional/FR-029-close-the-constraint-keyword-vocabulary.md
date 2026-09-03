---
id: FR-029
title: "Close the constraint keyword vocabulary"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-006"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-020"
    type: "depends_on"
---
# [FR-029] Close the constraint keyword vocabulary

## Description

The semantic IR v1.1 `constraint` node SHALL restrict `keyword` to a closed
enumeration and SHALL type `operands` per keyword, so that no constraint can
carry an unknown keyword or an operand of the wrong shape.

## Inputs

- A constraint declaration with a keyword and operands

## Outputs

- A validated `constraint` node whose `operands` conform to the keyword's operand schema
- A validation diagnostic at the constraint's locus for an unknown keyword or malformed operands

## Behavior

- The `keyword` value SHALL be one of `min`, `max`, `exclusiveMin`, `exclusiveMax`, `pattern`, `minLength`, `maxLength`, `enumValues`, `nonEmpty`, `unique`, `format`.
- If a constraint carries a keyword outside that enumeration, then IR validation SHALL fail at the constraint with its locus.
- The `min`, `max`, `exclusiveMin`, and `exclusiveMax` keywords SHALL take `operands { value: number }`.
- The `minLength` and `maxLength` keywords SHALL take `operands { value: integer >= 0 }`.
- The `pattern` keyword SHALL take `operands { regex: string, dialect: "ecma-262" }`.
- The `enumValues` keyword SHALL take `operands { values: array (minItems 1, uniqueItems) }`.
- The `nonEmpty` and `unique` keywords SHALL take `operands {}` with no properties.
- The `format` keyword SHALL take `operands { name: string }` where `name` is a namespaced format identifier.
- If a constraint's operands do not match the operand schema for its keyword, then IR validation SHALL fail at the constraint with its locus.
- The IR SHALL NOT provide an escape keyword or free-form operand carrier; vendor constraints use the namespaced `extensions[]` mechanism instead.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-029-CON-1 | Every constraint in every v1 positive fixture SHALL use a keyword in the closed enumeration, or the fixture is corrected in the same change with the correction recorded. | Compatibility | Existing-fixture suite |
| FR-029-CON-2 | The compatibility classifier SHALL classify a keyword added to the enumeration as additive and a keyword removed or retyped as breaking. | Compatibility | Compatibility corpus |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-029-AC-1 | Every keyword in the enumeration has one positive fixture whose operands validate. | Test |
| FR-029-AC-2 | A constraint with keyword `mnimum` fails validation with the constraint's locus. | Test |
| FR-029-AC-3 | A `min` constraint with `operands { value: "1" }` (string) fails validation. | Test |
| FR-029-AC-4 | A `pattern` constraint without `dialect` fails validation. | Test |
| FR-029-AC-5 | The v1.1 schema declares no `keyword: string` path and no untyped `operands` path. | Inspection |
| FR-029-AC-6 | The config-service FR-006 `versionNumber` bound (`min: 1`) is expressible as a typed constraint. | Analysis |

## Dependencies

- **Upstream**: [FR-020](./FR-020-define-semantic-type-system-and-identity.md), [US-006](../usecase/US-006-declare-typed-domain-structure.md)
- **Downstream**: semantic-core `ConstraintDecl` (issue #35), [FR-025](./FR-025-classify-semantic-and-target-compatibility.md)
