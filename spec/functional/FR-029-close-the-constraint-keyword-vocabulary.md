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
enumeration with `operands` typed per keyword, so that no constraint can carry
an unknown keyword or an operand of the wrong shape.

## Inputs

- A constraint declaration with a keyword and operands

## Outputs

- A validated `constraint` node whose `operands` conform to the keyword's operand schema
- A validation diagnostic at the constraint's locus for an unknown keyword or malformed operands

## Behavior

- The `keyword` value SHALL be one of `min`, `max`, `exclusiveMin`, `exclusiveMax`, `pattern`, `minLength`, `maxLength`, `enumValues`, `nonEmpty`, `unique`, `format`.
- If a constraint carries a keyword outside that enumeration, then IR validation SHALL fail at the constraint with its locus.
- The `min`, `max`, `exclusiveMin`, and `exclusiveMax` keywords SHALL take `operands { value }` where `value` is a number for `integer`/`number` scalars and an ISO 8601 string for `date`/`datetime`/`duration` scalars.
- The `minLength` and `maxLength` keywords SHALL take `operands { value: integer >= 0 }` and apply only to `string` and `bytes` scalars.
- The `pattern` keyword SHALL take `operands { regex: string, dialect: "ecma-262" }` and apply only to `string` scalars.
- If a `pattern` regex does not compile under the named dialect, then IR validation SHALL fail at the constraint with its locus.
- The `enumValues` keyword SHALL take `operands { values: array (minItems 1, uniqueItems) }` whose items are typed by the applied scalar kind, and apply only to `scalar` kinds.
- The `nonEmpty` keyword SHALL take `operands {}` and apply only to `string`, `bytes`, `sequence`, and `map` kinds.
- The `unique` keyword SHALL take `operands {}` and apply only to `sequence` kinds; it constrains element uniqueness of the sequence type itself, while FR-027 `multiplicity.unique` constrains a field's collection.
- The `format` keyword SHALL take `operands { name: string }` where `name` is a namespaced format identifier, and apply only to `string` scalars.
- If a constraint's keyword is applied to a type whose resolved structural kind or scalar is outside the keyword's applicability, then IR validation SHALL fail at the constraint with its locus.
- If a constraint's operands do not match the operand schema for its keyword, then IR validation SHALL fail at the constraint with its locus.
- The IR SHALL NOT provide an escape keyword or free-form operand carrier; vendor constraints use the namespaced `extensions[]` mechanism instead.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-029-CON-1 | Every constraint in every v1 positive fixture SHALL use a keyword in the closed enumeration (the v1 positive fixtures carry zero constraints today, so this holds vacuously; FR-029-AC-1 requires one v1.1 fixture per keyword). | Compatibility | Existing-fixture suite |
| FR-029-CON-2 | For revisions after v1.1, the compatibility classifier SHALL classify a keyword added to the enumeration as additive and a keyword removed or retyped as breaking; the v1 → v1.1 narrowing of `keyword: string` is classified additive because no v1 document carries a constraint outside the closed set. | Compatibility | Compatibility corpus |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-029-AC-1 | Every keyword in the enumeration has one positive fixture whose operands validate. | Test |
| FR-029-AC-2 | A constraint with keyword `mnimum` fails validation with the constraint's locus. | Test |
| FR-029-AC-3 | A `min` constraint with `operands { value: "1" }` (string) fails validation. | Test |
| FR-029-AC-4 | A `pattern` constraint without `dialect` fails validation. | Test |
| FR-029-AC-5 | The v1.1 schema declares no `keyword: string` path and no untyped `operands` path, including `enumValues.values` items. | Analysis |
| FR-029-AC-6 | The config-service FR-006 `versionNumber` bound (`min: 1`) is expressed as a typed constraint in `fixtures/semantic/v1/positive/config-version-v1-1.json`. | Analysis |
| FR-029-AC-7 | A `minLength` constraint applied to an `integer` scalar fails validation with the constraint's locus. | Test |
| FR-029-AC-8 | A `pattern` constraint whose `regex` does not compile under `ecma-262` fails validation. | Test |

## Dependencies

- **Upstream**: [FR-020](./FR-020-define-semantic-type-system-and-identity.md), [FR-025](./FR-025-classify-semantic-and-target-compatibility.md) (classifier corpus for CON-2), [US-006](../usecase/US-006-declare-typed-domain-structure.md)
- **Downstream**: semantic-core `ConstraintDecl` (issue #35)
