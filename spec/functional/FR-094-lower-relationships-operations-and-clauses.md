---
id: FR-094
title: "Lower relationships, operations, and clauses to IR record nodes"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-015"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-092"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-093"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-028"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-020"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-031"
    type: "constrained_by"
---
# [FR-094] Lower relationships, operations, and clauses to IR record nodes

## Description

The extraction frontend SHALL lower each lowered record's edges to IR
`relationships[]`, each `OperationDecl` to an IR `operations[]` entry, and each
`ClauseRef` to an IR `clauses[]` entry, taking the verb's category from the
loaded module registries and the clause text from the engine verbatim, so that
a domain declaration's edges, behavior signatures, and formal clauses reach the
IR as nodes with identity and origin rather than as prose.

## Inputs

- The FR-040 edge set quire-rs reports for each document: frontmatter `relationships:` entries, body `ix://` references, and relative links, each with verb, target, and locus
- The `## Relationships` bullet list in the authored form `- \`<name>\`: <verb> → <Target> (<id>)`, optionally suffixed `[<n>..<m>]`, as the `config-version` fixture authors it
- The `edge_types` registry of every loaded module: verb → `EdgeCategory` (`structural`, `behavioral`, `dataflow`, `dependency`, `realization`, `governance`, `traceability`)
- `SemanticExtraction.clauses`, `clause_text`, and `operations` from FR-091
- The resolutions of FR-092 and the record identities of FR-093

## Outputs

- `crates/extraction-frontend/src/edges.rs`: `lower_relationships(record, edges, registries, resolutions) -> Result<Vec<Relationship>, Vec<Diagnostic>>`
- `crates/extraction-frontend/src/clauses.rs`: `lower_clauses(record, extraction) -> Vec<Clause>` and `lower_operations(record, extraction, resolutions) -> Result<Vec<Operation>, Vec<Diagnostic>>`
- One `relationship`, `operation`, and `clause` node per declaration, each carrying `identity` and `origin`

## Behavior

### Relationships

- The frontend SHALL take one relationship per `## Relationships` bullet and one per FR-040 edge whose source is the record's document, de-duplicated on `(verb, target)` with the bullet's locus preferred when both name the same edge.
- The frontend SHALL set `verb` to the edge verb as authored, and `category` to the `EdgeCategory` the first loaded registry declaring that verb assigns it.
- If a verb is declared by no loaded module's `edge_types`, then the frontend SHALL raise `agent-ix.extraction-frontend.UNKNOWN_EDGE_VERB` at the edge's locus, blocking, and SHALL NOT guess a category.
- The frontend SHALL set `composite` to `true` if and only if `category` is `structural` and the verb is one of the containment verbs `contains`, `aggregates`, `composes`, `owns`; every other verb, including the structural `belongs_to`, is `composite: false`.
- The frontend SHALL resolve `target` through FR-092; if the resolution is any `Unresolved` state, then the frontend SHALL raise `agent-ix.extraction-frontend.UNRESOLVED_RELATIONSHIP_TARGET` at the edge's locus, blocking, naming the target token.
- The frontend SHALL set `multiplicity` from the bullet's `[<n>..<m>]` suffix under the FR-027 grammar and to `{lower: 1, upper: 1}` where none is authored.
- The frontend SHALL mint `identity` as `ix://<org>/<name>/relationship/<record-slug>-<name>`, where `<name>` is the bullet's backticked name or, for an FR-040 edge with no bullet, the verb.
- The frontend SHALL set `origin.source` to the bullet's line at column 3, or to the FR-040 edge's own locus.
- The frontend SHALL NOT emit a relationship from a `## Properties` row; a row whose type resolves to a bundle object is a field under FR-093.

### Operations

- Each `OperationDecl` SHALL become one `operation` with `name`, `params` lowered as FR-093 fields under `ix://<org>/<name>/operation/<record-slug>-<op>/param/<param>`, `returns` as `{typeRef, multiplicity, nullable: false}` from the FR-092 resolution of `OperationDecl.returns`, `pre` and `post` as the `clause_id` values of the engine's `ClauseRef` lists, and `origin.source` at the `### <name>` heading line.
- The frontend SHALL mint the operation's `identity` as `ix://<org>/<name>/operation/<record-slug>-<op>`.
- If `returns` resolves to an `Unresolved` state, then FR-092's diagnostic applies at the `Returns:` line.

### Clauses

- Each `ClauseRef` SHALL become one `clause` with `language` and `clauseId` from the `ClauseRef`, `text` taken byte for byte from `clause_text[clause_id]`, `sourceSpan` from `ClauseRef.source_span` (`sourceIdentity`, `path`, `startLine`, `startColumn`, `endLine`, `endColumn`), and `origin.source` at the span's start.
- The frontend SHALL mint the clause's `identity` as `ix://<org>/<name>/clause/<record-slug>-<clauseId>`.
- The frontend SHALL NOT parse, trim, normalize, or typecheck clause text.
- A `ClauseRef` carried inside an operation's `pre` or `post` (whose `source_span` is `None`) SHALL contribute only its `clause_id` to the operation, never a second clause node.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-094-CON-1 | The hand-authored issue #34 fixture `fixtures/semantic/v1/positive/config-version-v1-1.json` lifts the `parent` row as a `derives_from` relationship. This frontend emits `parent` as a field, because it is a `## Properties` row, and emits relationships only from the `## Relationships` list and FR-040 edges. The golden for this frontend is regenerated and committed under FR-098; the #34 fixture is not edited and is not the comparison target. | Compatibility | Inspection |
| FR-094-CON-2 | `category` and `composite` SHALL be read from the registry and the closed containment set above, never from the verb's spelling, the target's name, or the record's roles. | Correctness | Metamorphic test |
| FR-094-CON-3 | Clause `text` SHALL be byte-identical to the engine's `clause_text` value. | Integrity | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-094-AC-1 | The `config-version` fixture's `overlay` bullet lowers to one relationship `verb: belongs_to`, `category: structural`, `composite: false`, `target` the `ConfigOverlay` identity, `multiplicity {1,1}`, `origin` at the bullet's line, column 3. | Test (TC-1231) |
| FR-094-AC-2 | A `contains` bullet under a `domain` artifact lowers to `category: structural`, `composite: true`; an `aggregates`, `composes`, and `owns` bullet each do the same. | Test (TC-1232) |
| FR-094-AC-3 | A `references` bullet lowers to `category: traceability`, `composite: false`; a `depends_on` frontmatter edge to `dependency`, `composite: false`. | Test (TC-1233) |
| FR-094-AC-4 | A bullet whose verb is `frobnicates`, declared by no loaded module, raises `UNKNOWN_EDGE_VERB` at the bullet's line, blocking, and no document is written. | Test (TC-1234) |
| FR-094-AC-5 | A bullet targeting `Nonesuch` raises `UNRESOLVED_RELATIONSHIP_TARGET` at the bullet's line naming `Nonesuch`, blocking. | Test (TC-1235) |
| FR-094-AC-6 | A bullet suffixed `[0..*]` lowers to `multiplicity {lower: 0}`; one suffixed `[2..2]` to `{2,2}`; an unsuffixed bullet to `{1,1}`. | Test (TC-1236) |
| FR-094-AC-7 | An FR-040 frontmatter edge and a bullet naming the same `(verb, target)` yield one relationship at the bullet's locus. | Test (TC-1237) |
| FR-094-AC-8 | The `parent | ConfigVersion | 0..1` row appears as a field and not as a relationship, and the emitted document differs from the #34 hand fixture exactly at that node and nowhere else in `relationships[]`. | Test (TC-1238) |
| FR-094-AC-9 | The `immutable` `ocl` fence lowers to one clause with `language: ocl`, `clauseId: immutable`, `text` byte-identical to `clause_text`, `sourceSpan` `{startLine, startColumn: 1, endLine, endColumn}` as the engine reports, and `origin.source` at the span start. | Test (TC-1239) |
| FR-094-AC-10 | A clause whose text carries leading whitespace, trailing newlines, and a `\t` reaches the IR byte-identical. | Test (TC-1240) |
| FR-094-AC-11 | The `operations.md` fixture lowers each `OperationDecl` to an operation with its params as fields, `returns` from the resolved type with `nullable: false`, and `pre`/`post` as `clauseId` lists; no second clause node is emitted for a `pre`/`post` reference. | Test (TC-1241) |
| FR-094-AC-12 | An operation whose `Returns:` names an unresolved token raises the FR-092 diagnostic at the `Returns:` line. | Test (TC-1242) |
| FR-094-AC-13 | Relationship, operation, and clause identities on the fixture match the minting patterns of FR-095 exactly, asserted by regex over every emitted node. | Test (TC-1243) |
| FR-094-AC-14 | Renaming a verb's target artifact changes only `target` and the relationship `identity`, never `category` or `composite`. | Property (TC-1244) |
| FR-094-AC-15 | Every emitted fixture document passes the FR-050 reader with zero `UNRESOLVED_RELATIONSHIP_TARGET`, `UNKNOWN_EDGE_CATEGORY`, `COMPOSITE_CYCLE`, `DANGLING_CLAUSE_REF`, or `MISSING_SOURCE_SPAN` diagnostics. | Test (TC-1245) |

## Dependencies

- **Upstream**: [FR-092](./FR-092-resolve-type-tokens-to-declared-artifacts.md), [FR-093](./FR-093-lower-field-declarations-to-ir-fields.md), [FR-028](./FR-028-represent-relationships-operations-and-clauses.md), [FR-020](./FR-020-define-semantic-type-system-and-identity.md), `ix://agent-ix/quire-rs/FR-040`, `ix://agent-ix/quire-rs/FR-071`
- **Downstream**: [FR-097](./FR-097-normalize-validate-and-write-the-lifted-document.md), [FR-098](./FR-098-prove-fixture-goldens-and-cross-frontend-parity.md), [FR-099](./FR-099-provide-the-extraction-frontend-command-line.md)
- **Constrained by**: [NFR-031](../non-functional/NFR-031-deterministic-and-hermetic-lifting.md)
