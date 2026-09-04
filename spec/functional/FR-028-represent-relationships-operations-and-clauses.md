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
- Clause declarations: language tag, clause identity, opaque text, source span

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
- The IR validator SHALL NOT accept a display name or file path as a relationship target.
- The IR validator SHALL resolve `target` to a type definition in the same document or to an export of a package named in the document's lock.
- If a `target` does not resolve, then IR validation SHALL fail at the relationship with its locus.
- A relationship MAY target its own type definition (self-reference).
- The IR validator SHALL reject a `composite: true` relationship graph that contains a cycle, including a composite self-reference, at the first relationship that closes the cycle.
- The `multiplicity` value of a relationship SHALL reuse the FR-027 `multiplicity` object.
- The IR restates the `category` set from the quire-rs FR-040 `EdgeCategory` registry, which remains the authority; a contract test SHALL compare the two sets.
- Each `operations[]` entry SHALL carry `identity`, `name`, `params[]` (field nodes), an optional `returns { typeRef, multiplicity, nullable }`, `pre[]` and `post[]` arrays of `clauseId` values, and `origin`.
- If an operation's `pre[]` or `post[]` names a `clauseId` that is not present in the same type definition's `clauses[]`, then IR validation SHALL fail at the operation with its locus.
- Each `clauses[]` entry SHALL carry `identity`, `language`, `clauseId`, `text`, `origin`, and, when `origin` is a source locus, `sourceSpan`.
- The `clauseId` value SHALL be unique within one type definition; `identity` remains the globally stable semantic identity.
- The `text` value SHALL be the clause bytes exactly as extracted, without normalization.
- Within one type definition, `relationships[]`, `operations[]`, and `clauses[]` entries SHALL be unique by `identity`.
- An operation's `params[]` SHALL be unique by `name`.
- The `language` value SHALL be `ocl`, `sysml`, `fretish`, or a namespaced extension language of the form `<namespace>:<name>`.
- This contract owns the core language set; adding a core language is an additive IR revision, while a namespaced language needs no revision.
- The IR SHALL carry clause text opaquely.
- The IR SHALL NOT parse, normalize, or typecheck clause text.
- The `sourceSpan` value SHALL reuse the common `sourceLocus` shape so a clause resolves to the bytes it was extracted from.
- A `typeDefinition` of any structural kind MAY carry `clauses[]`.
- If a `typeDefinition` whose `kind` is not `record` carries `relationships[]` or `operations[]`, then IR validation SHALL fail at that type definition with its locus.
- The compatibility classifier (FR-025) SHALL classify an added relationship, operation, or clause as additive, and a removed one or a changed `target`, `composite`, `category`, `returns`, or `language` as breaking.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-028-CON-1 | A `relationships[]`, `operations[]`, or `clauses[]` array absent from a v1 document SHALL be read as empty; v1 documents remain valid. | Compatibility | Existing-fixture suite |
| FR-028-CON-2 | The IR schema SHALL NOT declare a parsed clause AST property; clause semantics belong to the formal-clause frontends. | Integrity | Static schema check |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-028-AC-1 | A record with one `belongs_to` relationship (`category: structural`, `composite: false`, `0..1`) validates and round-trips byte-identically. | Test |
| FR-028-AC-2 | A relationship with an unknown `category` fails validation with the relationship's locus. | Test |
| FR-028-AC-3 | An operation with two params, a bounded return, and one `pre` and one `post` clause validates when both clauses are present. | Test |
| FR-028-AC-4 | An operation whose `post[]` names an absent clause identity fails validation with the operation's locus. | Test |
| FR-028-AC-5 | A clause with `language: ocl`, `text`, and a `sourceSpan` validates; the IR schema declares no property for parsed clause content. | Test |
| FR-028-AC-6 | A clause with `language: acme:tla` validates; a bare unknown language such as `tla` fails. | Test |
| FR-028-AC-7 | `relationships[]` or `operations[]` on a non-record type definition fails validation. | Test |
| FR-028-AC-8 | The config-service FR-006 `overlay` relationship and an `## Invariants` `ocl` fence are expressed in `fixtures/semantic/v1/positive/config-version-v1-1.json` with zero declared loss. | Analysis |
| FR-028-AC-9 | A relationship whose `target` resolves to no type definition or lock export fails validation with the relationship's locus. | Test |
| FR-028-AC-10 | A composite cycle (including a composite self-reference) fails validation at the closing relationship; a non-composite self-reference validates. | Test |
| FR-028-AC-11 | Two clauses with the same `clauseId` in one type definition fail validation. | Test |
| FR-028-AC-12 | The IR `category` set equals the quire-rs FR-040 `EdgeCategory` registry in a contract test. | Test |
| FR-028-AC-13 | Removing a relationship or changing a clause language classifies as breaking; adding one classifies as additive. | Test |

## Dependencies

- **Upstream**: [FR-027](./FR-027-declare-field-multiplicity-and-units.md), [FR-020](./FR-020-define-semantic-type-system-and-identity.md), [FR-021](./FR-021-define-package-graphs-exports-and-locks.md) (lock exports for target resolution), [FR-025](./FR-025-classify-semantic-and-target-compatibility.md), FR-040 edge vocabulary (`ix://agent-ix/quire-rs/FR-040`)
- **Downstream**: semantic-core grammar (issue #35), extraction frontend (issue #36), `agent-ix/quire-contract-ir#52`
