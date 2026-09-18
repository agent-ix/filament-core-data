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

The extraction frontend SHALL lower each lowered record's frontmatter
relationship edges, each `OperationDecl`, and each `ClauseRef` to IR
`relationships[]`, `operations[]`, and `clauses[]` nodes carrying identity and
origin, taking the verb's category from the loaded module registries and the
clause text from the engine verbatim, so that a domain declaration's edges,
behavior signatures, and formal clauses reach the IR as nodes rather than as
prose.

Artifact-axis verbs such as `traces_to`, `implements`, `satisfies`, and
`depends_on` are requirement lineage rather than domain relationships, which is
why only verbs the object type lists under `allowed_links` are lowered.

## Inputs

- The `(target, verb)` pairs `quire_rs::corpus::harvest_edges` returns for each lowered document's frontmatter `relationships:` list
- The `allowed_links` map (verb → target object types) of the document's object type in the loaded module, through `Registry::resolve_allowed_links` called for the object archetype only, never for the artifact axis, whose `allowed_links` would admit `traces_to` and `implements`
- The merged `edge_types` registry of the loaded module set: verb → `EdgeTypeDef { category, inverse }` (`EdgeCategory` is one of `structural`, `behavioral`, `dataflow`, `dependency`, `realization`, `governance`, `traceability`). spec-objects-business `7b7b0bc` declares `allowed_links` and the `edge_types` its object types use, byte-identical to the FR-040 registry in spec-artifacts-iso (lines 872–975 of its manifest), which is vendored as `fixtures/modules/edge-vocabulary/` (FR-098); every lift loads both module roots
- `SemanticExtraction.clauses`, `clause_text`, and `operations` from FR-091
- The resolutions of FR-092, the pass-one lowering outcomes of FR-092, and the record identities of FR-093

## Outputs

- `crates/extraction-frontend/src/edges.rs`: `lower_relationships(record, edges, registries, index) -> Result<Vec<Relationship>, Vec<Diagnostic>>`
- `crates/extraction-frontend/src/clauses.rs`: `lower_clauses(record, extraction) -> Result<Vec<Clause>, LowerError>` (`UNSLUGGABLE_NAME` when a `clauseId` slugs to the empty string) and `lower_operations(record, extraction, resolutions) -> Result<Vec<Operation>, Vec<Diagnostic>>`
- One `relationship`, `operation`, and `clause` node per declaration, each carrying `identity` and `origin`

## Behavior

### Relationships

- The frontend SHALL take one relationship per `(target, verb)` pair `harvest_edges` returns for the record's document, de-duplicated on `(verb, target)`.
- The frontend SHALL lower a pair only when the record's object type lists its verb under `allowed_links` in the loaded module, resolved for the object archetype only and never for the artifact axis.
- The frontend SHALL skip, without a diagnostic, every pair whose verb the object type does not list under `allowed_links`.
- The frontend SHALL set `verb` to the pair's verb as authored.
- The frontend SHALL set `category` to the `category` of the `EdgeTypeDef` the merged registry declares for that verb.
- If a verb the object type lists under `allowed_links` is declared by no loaded module's `edge_types`, then the frontend SHALL raise `agent-ix.extraction-frontend.UNKNOWN_EDGE_VERB` at the document's line 1, column 1, blocking.
- The frontend SHALL set `composite` to `true` if and only if the verb's `EdgeTypeDef.inverse` is `part_of`.
- The frontend SHALL resolve `target` through the `BundleIndex` by `id`, `title`, or `name` and classify the resolved artifact by FR-092's pass-one outcome (`Object`, `Enumeration`, or `Stale`).
- If `target` resolves to no indexed artifact, or the artifact's pass-one outcome is not a definition, then the frontend SHALL raise `agent-ix.extraction-frontend.UNRESOLVED_RELATIONSHIP_TARGET` at the document's line 1, column 1, blocking, naming the target token.
- The frontend SHALL set `multiplicity` to `{lower: 1, upper: 1}`; frontmatter authors no bound.
- The frontend SHALL mint `identity` through FR-095's `relationship_identity` as `ix://<org>/<name>/relationship/<Name>-<verb>-<TargetName>`, where `<Name>` is the owning artifact's id and `<TargetName>` the resolved target artifact's id (FR-143), every part slugged.
- The frontend SHALL set `origin.source` to the document's path at line 1, column 1, the frontmatter block.
- The frontend SHALL NOT emit a relationship from a `## Properties` row.
- The frontend SHALL NOT read a `## Relationships` section.

### Operations

- The frontend SHALL lower each `OperationDecl` to one `operation` with `name`, `params` lowered as FR-093 fields, `returns` as `{typeRef, multiplicity, nullable: false}` from the FR-092 resolution of `OperationDecl.returns`, `pre` and `post` as the `clause_id` values of the engine's `ClauseRef` lists, and `origin.source` at the `### <name>` heading line; a parameter row's constraint cells are not lowered, because an IR `operation.params[]` item is a `field`, to which `schema/semantic/v1/semantic-ir.schema.json` gives no `constraints` member.
- The frontend SHALL mint the operation's `identity` through FR-095's `operation_identity` as `ix://<org>/<name>/operation/<Name>-<operation>`.
- The frontend SHALL mint each parameter's `identity` through FR-095's `field_identity` with the operation as the middle part, as `ix://<org>/<name>/field/<Name>-<operation>-<param>`. Note: a parameter is a field of its operation under `contracts-v1.md` §Identity minting (issue #87), and there is no `param/` slot.
- If `returns` resolves to an `Unresolved` state, then the frontend SHALL emit the FR-092 diagnostic for that state at the `Returns:` line.

### Clauses

- The frontend SHALL lower each `ClauseRef` carrying a `source_span` to one `clause` with `language` and `clauseId` from the `ClauseRef`, `text` taken byte for byte from `clause_text[clause_id]`, `sourceSpan` from `ClauseRef.source_span` (`sourceIdentity`, `path`, `startLine`, `startColumn`, `endLine`, `endColumn`), and `origin.source` at the span's start.
- The frontend SHALL mint the clause's `identity` through FR-095's `clause_identity` as `ix://<org>/<name>/clause/<Name>-<clauseId>`.
- The frontend SHALL NOT parse, trim, normalize, or typecheck clause text.
- The frontend SHALL take from a `ClauseRef` carried inside an operation's `pre` or `post` (whose `source_span` is `None`) only its `clause_id`, emitting no second clause node.

Rationale: quire-rs exposes no located per-document edge API, and
`SemanticExtraction` carries no `RelationDecl` although `Entity.json`
declares `relations: RelationDecl[]`; the `## Relationships` bullet grammar
exists in no contract (SR-166 FND-1463, SR-165 FND-1451). Parsing it here
would be the second Markdown reading FR-091-CON-3 forbids. The hand-authored
issue #34 fixture that once lived at
`fixtures/semantic/v1/positive/config-version-v1-1.json`, no longer on disk,
lifted the `parent` row as a `derives_from` relationship; this frontend emits `parent` as a field
because it is a `## Properties` row. That fixture differed from this
frontend's output in more than the `parent` node: its `belongs_to`
relationship came from the removed `## Relationships` bullet grammar and its
identity patterns predate FR-095, so its hand-verified values for the one
relationship both documents share — `target` and `multiplicity` on the edge
to `ConfigOverlay` — are pinned as literals in FR-094-AC-8's test rather than
compared against the fixture node by node; the golden for this frontend is
regenerated under FR-098.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-094-CON-1 | The frontend SHALL lower relationships only from the frontmatter `relationships:` pairs `harvest_edges` returns until agent-ix/quire-rs#418 ships `RelationDecl` extraction, at which point `RelationDecl` lowering is added to this requirement and the relationship goldens are re-cut in one commit. | Compatibility | Static analysis |
| FR-094-CON-2 | The frontend SHALL read `category` and `composite` from the registry `EdgeTypeDef` (`category`, `inverse`), never from the verb's spelling, the target's name, or the record's roles. | Correctness | Property |
| FR-094-CON-3 | The frontend SHALL emit clause `text` byte-identical to the engine's `clause_text` value. | Integrity | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-094-AC-1 | The `config-version-table` fixture's `FR-006` frontmatter entry `{target: FR-005, type: references}` lowers to one relationship `verb: references`, `category: traceability`, `composite: false`, `target` the `type/FR-005` identity, `multiplicity {1,1}`, `origin` at `FR-006`'s path, line 1, column 1. | Test (TC-1231) |
| FR-094-AC-2 | Under the two module roots spec-objects-business and edge-vocabulary (the FR-040 registry), a `contains` frontmatter edge under a `domain` artifact lowers to `category: structural`, `composite: true` (registry `inverse: part_of`); an `aggregates` edge under an `aggregate_root` does the same; a `composes` edge under a `value_object` lowers to `category: structural`, `composite: false` (`inverse: composed_by`). | Test (TC-1232) |
| FR-094-AC-3 | Under the same two module roots, a `references` edge lowers to `category: traceability`, `composite: false`; an `owns` edge under an `entity` to `category: dependency`, `composite: false`. | Test (TC-1233) |
| FR-094-AC-4 | Under a test module whose `entity` `allowed_links` lists `frobnicates` while no loaded `edge_types` declares it, a `frobnicates` frontmatter edge raises `UNKNOWN_EDGE_VERB` at line 1, column 1, blocking, and no document is written. | Test (TC-1234) |
| FR-094-AC-5 | A `references` frontmatter edge targeting `Nonesuch` raises `UNRESOLVED_RELATIONSHIP_TARGET` at line 1, column 1 naming `Nonesuch`, blocking; one targeting a legacy-form artifact raises the same code naming that artifact. | Test (TC-1235) |
| FR-094-AC-6 | An `entity` whose frontmatter carries `traces_to`, `implements`, and `depends_on` edges lowers with zero relationships from them and zero diagnostics about them; the same document with one `references` edge added lowers to exactly one relationship. | Test (TC-1236) |
| FR-094-AC-7 | Two frontmatter entries with the same `(verb, target)` yield one relationship; two entries with the same target and different allowed verbs yield two relationships with distinct identities. | Test (TC-1237) |
| FR-094-AC-8 | The `parent | ConfigVersion | 0..1` row appears as a field and not as a relationship: the emitted `relationships[]` carries no `parent` relationship, and the remaining relationship — the edge to `ConfigOverlay` — carries the `target` and `multiplicity` the #34 hand fixture independently verified. | Test (TC-1238) |
| FR-094-AC-9 | The `immutable` `ocl` fence lowers to one clause with `language: ocl`, `clauseId: immutable`, `text` byte-identical to `clause_text`, `sourceSpan` `{startLine, startColumn: 1, endLine, endColumn}` as the engine reports, and `origin.source` at the span start. | Test (TC-1239) |
| FR-094-AC-10 | A clause whose text carries leading whitespace, trailing newlines, and a `\t` reaches the IR byte-identical. | Test (TC-1240) |
| FR-094-AC-11 | The `operations` fixture (FR-098) lowers each `OperationDecl` to an operation with its params as fields under `field/<Name>-<operation>-<param>` (no `param/` identity is emitted), `returns` from the resolved type with `nullable: false`, and `pre`/`post` as `clauseId` lists; no second clause node is emitted for a `pre`/`post` reference. | Test (TC-1241) |
| FR-094-AC-12 | An operation whose `Returns:` names an unresolved token raises the FR-092 diagnostic at the `Returns:` line. | Test (TC-1242) |
| FR-094-AC-13 | Relationship, operation, parameter, and clause identities on the fixture match the minting patterns of FR-095 exactly, asserted by regex over every emitted node. | Test (TC-1243) |
| FR-094-AC-14 | Renaming a verb's target artifact title leaves the relationship byte-identical, since `target` and the relationship `identity` carry the target's artifact id, and never changes `category` or `composite`; renaming the verb's registry `inverse` from `part_of` to another value flips `composite` with no code change. | Property (TC-1244) |
| FR-094-AC-15 | Every emitted fixture document passes the FR-050 reader and `agent_ix_semantic_ir::decide` (run at lift time under FR-097) with zero `UNRESOLVED_RELATIONSHIP_TARGET`, `UNKNOWN_EDGE_CATEGORY`, `COMPOSITE_CYCLE`, `DANGLING_CLAUSE_REF`, or `MISSING_SOURCE_SPAN` diagnostics. | Test (TC-1245) |

## Dependencies

- **Upstream**: [FR-092](./FR-092-resolve-type-tokens-to-declared-artifacts.md), [FR-093](./FR-093-lower-field-declarations-to-ir-fields.md), [FR-028](./FR-028-represent-relationships-operations-and-clauses.md), [FR-020](./FR-020-define-semantic-type-system-and-identity.md), `ix://agent-ix/quire-rs/FR-040`, `ix://agent-ix/quire-rs/FR-071`, agent-ix/quire-rs#418 (`RelationDecl` extraction, not yet shipped)
- **Downstream**: [FR-097](./FR-097-normalize-validate-and-write-the-lifted-document.md), [FR-098](./FR-098-prove-fixture-goldens-and-cross-frontend-parity.md), [FR-099](./FR-099-provide-the-extraction-frontend-command-line.md)
- **Constrained by**: [NFR-031](../non-functional/NFR-031-deterministic-and-hermetic-lifting.md)
