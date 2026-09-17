---
id: FR-143
title: "Lift object-type artifacts to their constructs"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-015"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-142"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-093"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-095"
    type: "depends_on"
---
# FR-143: Lift object-type artifacts to their constructs

## Description

This requirement answers the extraction-frontend part of
[filament-core-data#146](https://github.com/agent-ix/filament-core-data/issues/146)
and of [#93](https://github.com/agent-ix/filament-core-data/issues/93).

The extraction frontend SHALL lift an artifact whose object type declares a
construct to the FR-142 construct kind `{module, name}` of that object type,
emit a `2.0.0` document whose `constructs` table carries each used kind's
declaration, and mint every node identity of the artifact from its artifact
id. An artifact of an object type declaring no construct lifts to a `record`.
The frontend decides every construct from the declaration alone and names no
construct kind in its source.

The frontend reads a declaration through one seam,
`CompiledArchetype::construct()`, which returns the object type's `construct`
declaration raw as the engine loaded it; nothing else reads the key.

## Inputs

- A spec bundle read through FR-091, each artifact carrying `id`, `title` and `object`
- Each loaded module's manifest bytes, its `semantic.package`, its `version`, and each object type's `roles` and `construct` declaration, whose shape is the module manifest's `ConstructDeclaration` (filament-core-service FR-035)
- The quire-rs extraction of each artifact's fields, clauses and operations
- The quire-rs FR-075 `model` extraction of each artifact: `States`, `Transitions`, `Workflow` steps and `Ubiquitous Language` tables, read where the object type's `body_extraction` declares them (FR-091 hands the engine that declaration with `SemanticContext::with_body_extraction`)
- The quire-rs FR-076 `relations` extraction and `availability.relations` of each artifact
- The artifact's frontmatter edges, lowered by FR-094

## Outputs

- One construct per object-type artifact, or an `ARTIFACT_NOT_LOWERED` refusal naming the broken rule
- One `constructs` entry per construct kind a type uses: `kind`, `moduleVersion`, `manifestDigest` (`sha256:` over the module's manifest bytes) and the declaration, its roles qualified `<module short name>:<role>`
- A blocking refusal naming the module and the object type for each declaration the frontend cannot read

## Behavior

### Identity

- The frontend SHALL set a type definition's `identity` to `ix://<org>/<name>/type/<artifact id>` (the id verbatim, FR-095) and its `displayName` to the artifact's declared name: its `name`, else its `title`.
- The frontend SHALL use the artifact id as the `<Name>` part of every field, alias, constraint, relationship, operation, variant, clause, state, transition and step identity of the artifact (FR-095).
- Renaming an artifact's declared name SHALL change only the type's `displayName`, its aliases' `displayName`, and constraint `diagnosticCode` values.

### Declarations

- The frontend SHALL check each object type's declaration against the module manifest's `ConstructDeclaration` shape (required `identity`, `shape`, `members` and `meaning`; `references` of unique, non-empty roles other than `*`; unique `rules`), against the core vocabulary of FR-142 (member, reference member and rule names, and the member presence each selected rule requires), and against the roles the loaded modules declare.
- The frontend SHALL refuse a declaration failing any check with one blocking diagnostic naming the module, the object type and the defect, and SHALL lower no artifact of that object type.
- The frontend SHALL qualify each referenced role as the IR role spelling `<module short name>:<role>`.

### Construct members

- The frontend SHALL fill each member its construct's declaration requires or admits, and no member the declaration forbids.
- The frontend SHALL set `identityFields` to the fields carrying the `identity-field` extension.
- The frontend SHALL set `members` of a `record`-shaped construct to the targets of its composite relationships, and `members` of a `namespace`-shaped construct to the targets of its `contains` edges.
- The frontend SHALL set `owner` to the one type of the bundle whose composite relationship targets the artifact and which carries a role the `owner` reference admits.
- The frontend SHALL set `occurrenceField` to the artifact's one field resolving to the `Timestamp` kernel scalar.
- The frontend SHALL set `persists` to the targets of the artifact's `persists` edges.
- The frontend SHALL fill `states` and `transitions`, `steps` and `vocabulary` from the engine's `model` extraction of the artifact, in table row order, and SHALL NOT re-parse any diagram, table or prose.
- The frontend SHALL lower an artifact whose construct's shape is `enumeration` through its `Values` table.
- A state SHALL be minted `state/<artifact id>-<state>`, a transition `transition/<artifact id>-<from>-<to>-<trigger>`, and a step `step/<artifact id>-<step>` (FR-095).
- A transition's `from` and `to` SHALL be the identities of the states it names, its `trigger` the identity of the artifact's operation it names, and its `guard` the clause id it names.
- A transition's `emits` and a step's `consumes` and `emits` SHALL name artifacts of the bundle, carrying a role the reference admits, by artifact id, and SHALL lower to those artifacts' type identities.
- A term SHALL carry the `Ubiquitous Language` row's term and definition.
- The frontend SHALL lower the `JsonObject` type token to the kernel scalar `any` with no declared loss.
- The frontend SHALL raise the `required-collection-presence` declared loss for a `0..*` field, whose authored presence the source row does not carry.
- The frontend SHALL refuse, with blocking `ARTIFACT_NOT_LOWERED` naming the member, an artifact whose construct's declaration requires a member the frontend has no source for: `supertypes`, `abstract`, `direction`, `interfaceType`, `multiplicity`, `declaredType`, `flowDirection`, `sourceEnd`, `targetEnd`, `sourceElement`, `targetElement` or `featureOrder`.

### Known gap: feature order

The pinned engine (quire-rs `08d39ea`) reads a `Feature | Kind` table into `model.featureOrder` in row order and checks that its rows name exactly the artifact's declared fields and operations ([agent-ix/quire-rs#450](https://github.com/agent-ix/quire-rs/pull/450)). The frontend does not read that table, so it has no source for `featureOrder` and refuses a declaration requiring it.

### Declared rules at the artifact

- The frontend SHALL refuse, with blocking `ARTIFACT_NOT_LOWERED` (reason `other`) at the artifact head naming the rule, an artifact whose construct's declaration selects:
  - `identity_field_required` and which declares no identity field;
  - `identity_field_forbidden` and which declares an identity field;
  - `min_clauses` and which declares no clause;
  - `occurrence_field_required` and which does not declare exactly one `Timestamp` field;
  - `no_fields` and which declares a field;
  - `no_operations` and which declares an operation;
  - `min_operations` and which declares no operation;
  - `single_owner` and which has no admitted owner or more than one.
- The frontend SHALL refuse, the same way, an artifact that:
  - has a relationship whose target is an artifact of the bundle that lowers to nothing;
  - has an unavailable `model` extraction;
  - declares a model feature its construct has no member for: a supertype, an `abstract` flag, Presence, Subsets or Redefines cells, Modifies, Creates or Deletes lines, a population or `Members` table, a `Values`, `States`, `Transitions`, `Workflow` or `Ubiquitous Language` table its declaration does not admit, a systems `part`, `port`, `connection` or `allocation` table, or a `Features` table;
  - declares `## Relationships` rows, whether the engine extracted them or reported them unavailable (their lowering is filament-core-data#156);
  - has a transition whose trigger names no operation or whose guard names no clause of the artifact;
  - has a transition or step whose `emits` or `consumes` names no admitted artifact id of the bundle, names one artifact twice in one cell, or names an artifact that lowers to nothing.
- A refused artifact SHALL emit no type definition and no alias, and SHALL keep its own diagnostics.
- The frontend SHALL apply refusals to a fixed point before it emits any type, so that an owner lost to a refusal refuses the artifact it owns and no emitted `owner` or relationship names a refused artifact.
- The frontend SHALL NOT emit a construct with a declared rule approximated.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-143-CON-1 | No type identity SHALL be minted from an artifact's declared name. | Correctness | Test |
| FR-143-CON-2 | Every emitted construct SHALL pass the FR-142 reader rules at lift time. | Integrity | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-143-AC-1 | The `business` fixture lifts to a `2.0.0` document holding one construct of each of its ten declared kinds, and the reader accepts it: `FR-001` and `PR_001` name their `id` field in `identityFields`, `AR_001`'s `members` are `FR-001` and `VO_001`, `NE_001`'s `owner` is `FR-001`, `EV_001`'s `occurrenceField` is its `placedAt` field, `RP_001` persists `FR-001`, and `DM_001`'s `members` are `AR_001`, `EN_001` and `FR-001`. | Test (TC-1751) |
| FR-143-AC-2 | Every type identity of the `business` fixture ends in its artifact id and every `displayName` is its declared name; renaming a declared name leaves every relationship byte-identical. | Test (TC-1752) |
| FR-143-AC-3 | Each rule of "Declared rules at the artifact" broken on one artifact yields one blocking `ARTIFACT_NOT_LOWERED` naming that rule, and no type of that artifact is emitted. | Test (TC-1753) |
| FR-143-AC-4 | A `nested_entity` no composite relationship targets, and one two owners target, are each refused naming the `single_owner` rule; when nested entity `NE_001` is refused and `NE_002` is owned only by `NE_001`, `NE_002` is refused too with its own declared loss kept, and no emitted `owner` or relationship names a refused artifact. | Test (TC-1754) |
| FR-143-AC-5 | The `business` fixture's `SM_001` lifts the states `draft`, `placed`, `shipped` and `cancelled` with transitions `draft`→`placed`, `placed`→`shipped` and `placed`→`cancelled`; `PR_001` lifts the steps `placed`, `picked` and `shipped` in order; and `DM_001` lifts a non-empty `vocabulary`. | Test (TC-1755) |
| FR-143-AC-6 | In the `business` fixture, each of these yields one blocking `ARTIFACT_NOT_LOWERED` naming the declaration and emits no type of that artifact: a transition emitting `EN_001`; a step consuming `EV_999`; a transition emitting `EV_001, EV_001`; an `abstract: true` value object and an `abstract: true` enumeration; a `specializes` supertype; a `Presence` column; a `Modifies:` line; an aggregate root's `Members` table; a population's `Members` table; a transition to an undeclared state; an engine transition record whose trigger names no operation, and one whose guard names no clause; a transition emitting an event that lowers to nothing; and `## Relationships` rows under a module declaring the `relationships` mapping; under a module not declaring it the same rows are the engine's blocking `semantic.feature-not-extractable`. | Test (TC-1785) |
| FR-143-AC-7 | The `business` fixture lifts to a document whose `constructs` table holds exactly one entry per used kind, each with the module's `0.7.0` version, the `sha256:` digest of its manifest bytes and the manifest declaration with every role qualified `business:<role>`; the declaration is read through the one seam function and no other frontend module reads the `construct` key. | Test (TC-1790) |
| FR-143-AC-8 | A manifest declaration missing `meaning`, naming a member or rule outside the core vocabulary, selecting a rule whose member presence it does not declare, admitting the role `*`, or referencing a role no loaded module declares yields one blocking diagnostic naming the module and the object type, and no artifact of that object type is lowered. | Test (TC-1792) |
| FR-143-AC-9 | Under a module whose `entity` declaration requires `featureOrder`, each `entity` artifact of the `business` fixture yields one blocking `ARTIFACT_NOT_LOWERED` naming `featureOrder` as a member the frontend has no source for, and no type of it is emitted. | Test (TC-1794) |

## Dependencies

- **Upstream**: agent-ix/filament-core-service#33, the module manifest `ConstructDeclaration`; agent-ix/quire-rs#445, `CompiledArchetype::construct()`, the declaration seam
- **Upstream**: [FR-142](./FR-142-declare-one-construct-per-object-type.md), [FR-093](./FR-093-lower-field-declarations-to-ir-fields.md), [FR-094](./FR-094-lower-relationships-operations-and-clauses.md), [FR-095](./FR-095-mint-package-identity-and-provenance.md)
- **Upstream**: agent-ix/quire-rs#432, the engine extraction of states, transitions, steps and vocabulary, which filament-core-data#154 pins and lifts; agent-ix/quire-rs#442, the public `SemanticContext::with_body_extraction` that gates those tables
