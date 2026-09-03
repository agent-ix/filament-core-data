---
id: FR-028
title: "Represent relationships, operations, and clauses in the semantic IR"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-006"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-027"
    type: "depends_on"
---
# [FR-028] Represent relationships, operations, and clauses in the semantic IR

## Description

The semantic IR v1.1 `typeDefinition` node SHALL carry first-class
`relationships[]`, `operations[]`, and `clauses[]` arrays so that a domain
declaration's edges, behavior signatures, and formal clauses are IR nodes with
identity and origin rather than prose.

## Inputs

- Relation declarations: verb, target type identity, multiplicity, composite flag
- Operation declarations: name, parameters, return type, pre- and post-condition clause references
- Clause declarations: language tag, clause identity, source span, opaque text

## Outputs

- `typeDefinition.relationships[]` entries
- `typeDefinition.operations[]` entries
- `typeDefinition.clauses[]` entries
- Validation diagnostics for unresolved targets, unknown categories, and dangling clause references

## Behavior

- Each `relationships[]` entry SHALL carry `identity`, `verb`, `category`, `composite`, `target`, `multiplicity`, and `origin`.
- The `category` value SHALL be one of the closed FR-040 edge categories: `structural`, `behavioral`, `dataflow`, `dependency`, `realization`, `governance`, `traceability`.
- The `verb` value SHALL be a non-empty string.
- The IR SHALL NOT validate verbs against a module registry, because verb vocabularies are module-owned.
- The `target` value SHALL be a semantic identity.
- The IR SHALL NOT accept a display name or file path as a relationship target.
- Each `operations[]` entry SHALL carry `identity`, `name`, `params[]` (field nodes), an optional `returns { typeRef, multiplicity }`, `pre[]` and `post[]` clause identities, and `origin`.
- If an operation's `pre[]` or `post[]` names a clause identity that is not present in the same type definition's `clauses[]`, then IR validation SHALL fail at the operation with its locus.
- Each `clauses[]` entry SHALL carry `identity`, `language`, `clauseId`, `sourceSpan`, and `origin`.
- The `language` value SHALL be `ocl`, `sysml`, `fretish`, or a namespaced extension language of the form `<namespace>:<name>`.
- The IR SHALL carry clause text opaquely.
- The IR SHALL NOT parse, normalize, or typecheck clause text.
- The `sourceSpan` value SHALL reuse the common `sourceLocus` shape so a clause resolves to the bytes it was extracted from.
- A `typeDefinition` of any structural kind MAY carry `clauses[]`; only `record` kinds MAY carry `relationships[]` and `operations[]`.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-028-CON-1 | A `relationships[]`, `operations[]`, or `clauses[]` array absent from a v1 document SHALL be read as empty; v1 documents remain valid. | Compatibility | Existing-fixture suite |
| FR-028-CON-2 | The IR SHALL NOT embed a parsed clause AST; clause semantics belong to the formal-clause frontends. | Integrity | Schema inspection |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-028-AC-1 | A record with one `belongs_to` relationship (`category: structural`, `composite: false`, `0..1`) validates and round-trips byte-identically. | Test |
| FR-028-AC-2 | A relationship with an unknown `category` fails validation with the relationship's locus. | Test |
| FR-028-AC-3 | An operation with two params, a bounded return, and one `pre` and one `post` clause validates when both clauses are present. | Test |
| FR-028-AC-4 | An operation whose `post[]` names an absent clause identity fails validation with the operation's locus. | Test |
| FR-028-AC-5 | A clause with `language: ocl` and a `sourceSpan` validates; the IR schema declares no property for parsed clause content. | Test |
| FR-028-AC-6 | A clause with `language: acme:tla` validates; a bare unknown language such as `tla` fails. | Test |
| FR-028-AC-7 | `relationships[]` or `operations[]` on a non-record type definition fails validation. | Test |
| FR-028-AC-8 | The config-service FR-006 `overlay` relationship and an `## Invariants` `ocl` fence are expressible with zero declared loss. | Analysis |

## Dependencies

- **Upstream**: [FR-027](./FR-027-declare-field-multiplicity-and-units.md), [FR-020](./FR-020-define-semantic-type-system-and-identity.md), FR-040 edge vocabulary (`ix://agent-ix/quire-rs/FR-040`)
- **Downstream**: semantic-core grammar (issue #35), extraction frontend (issue #36), `agent-ix/quire-contract-ir#52`
