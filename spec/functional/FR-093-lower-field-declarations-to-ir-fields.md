---
id: FR-093
title: "Lower field declarations to IR record fields with declared losses"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-015"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-092"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-027"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-029"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-034"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-050"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-095"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-031"
    type: "constrained_by"
---
# [FR-093] Lower field declarations to IR record fields with declared losses

## Description

The extraction frontend SHALL lower each object-typed artifact to one IR
`typeDefinition` (the FR-143 construct its object type names, or `kind: record`), plus
one `kind: alias` definition per constrained field in FR-034's form, whose
every field, multiplicity, constraint, identity, and nullability value is
taken from the engine's declaration and never from a name, so that the table
form and the fence form of one declaration produce identical `types[]`.

## Inputs

- The `SemanticExtraction` of FR-091: `fields: Option<Vec<FieldDecl>>`, `fields_form`, `availability.fields`
- The resolutions of FR-092
- The module's object-type `roles` (`domain-object`, `persistable`, …) and `body_extraction` from the loaded manifest
- The FR-029 closed constraint vocabulary and the applicability table `crates/semantic-ir/RULES.md` publishes for `CONSTRAINT_NOT_APPLICABLE`
- For an `object: enumeration` artifact, the rows the engine's body-extraction evaluator (`quire_rs::extract`, quire-rs FR-011) returns for the object type's `values_table` locator

## Outputs

- `crates/extraction-frontend/src/lower.rs`: `lower_record(extraction, resolutions, ctx) -> Result<TypeDefinition, Vec<Diagnostic>>` and `lower_enum(document, rows, ctx) -> Result<TypeDefinition, Vec<Diagnostic>>`
- One `record` per lowered object artifact; one `field` per `FieldDecl`; one `alias` per `FieldDecl` carrying one or more constraints; one `constraint` per `Constraint` entry, on that alias
- One `enum` per lowered enumeration artifact; one `variant` per `values_table` row
- `crates/extraction-frontend/losses.json`: the closed register of representability losses this frontend declares, with a code, the construct, and the issue that owns it

## Behavior

### The record

- The frontend SHALL set `displayName` to the artifact's frontmatter `name` when that value is a semantic-core `Identifier`, and otherwise to the artifact's `title` verbatim.
- If neither the frontmatter `name` nor the `title` is a semantic-core `Identifier`, then the frontend SHALL raise `agent-ix.extraction-frontend.UNNAMEABLE_ARTIFACT` at the frontmatter.
- The frontend SHALL set `roles` to `<module short name>:<object type>` (for example `business:entity`) followed by each manifest role as `<module short name>:<role>`, sorted and de-duplicated, where the module short name is the manifest `name` with its `spec-objects-` prefix removed (`spec-objects-business` → `business`).
- The frontend SHALL set `unknownPolicy` to `reject`.
- The frontend SHALL set the record's `origin.source` to the artifact's `path` at line 1, column 1, with `sourceIdentity` `ix://<org>/<name>/spec`.
- If `availability.fields.state` is `not_applicable` (the object type requires no `## Properties`), then the frontend SHALL emit the type with `fields: []`, or with no `fields` member where its FR-142 construct carries none.
- If `availability.fields.state` is `unavailable` or `missing`, then the frontend SHALL NOT emit a record for that artifact.
- If `availability.fields.state` is `unavailable` or `missing`, then the frontend SHALL emit `agent-ix.extraction-frontend.ARTIFACT_NOT_LOWERED` at the artifact naming the engine's `reason`, non-blocking when the reason is `legacy-form` and blocking otherwise.
- If `availability.fields.lossy` is `true`, then the frontend SHALL emit one `DECLARED_LOSS` info naming the register row `lossy-extraction`.
- If two documents in one bundle lower to the same verbatim `displayName`, then the frontend SHALL raise `agent-ix.extraction-frontend.DUPLICATE_TYPE_NAME` at the second document in path order, naming both, before any identity of either is minted. Note: `displayName` is compared verbatim, so `Status` and `status` are two names (contract case (a)); two distinct names whose slugs coincide are `UNSLUGGABLE_NAME` (case (b)), and two distinct names with distinct slugs that nonetheless mint one identity are FR-095's `DUPLICATE_IDENTITY` (case (c)).
- If a document's `displayName` equals the name of a kernel scalar the bundle uses (FR-092), then the frontend SHALL raise blocking `DUPLICATE_TYPE_NAME` at that document naming the kernel scalar, before any identity of the document is minted (contract case (a)).

### The fields

- The frontend SHALL set `name` from `FieldDecl.name`, `typeRef` from the FR-092 resolution, `multiplicity` from `FieldDecl.type_ref.multiplicity` with `{lower: 1, upper: 1}` where absent, `presence` to `required` when `multiplicity.lower >= 1` and `optional` otherwise, `nullable` from `FieldDecl.nullable` with `false` where absent, `defaultKind` to `none`, and `unit` from `FieldDecl.type_ref.unit`.
- The frontend SHALL set the field's `origin.source` to the artifact's path at the line the engine's scan reports for the declaration and at the column where the declaration text begins: the start of the name cell for a table row, the first non-blank column for a fence line.
- If `FieldDecl.identity` is `true`, then the frontend SHALL carry it as the extension `ix://agent-ix/semantic-core/ext/identity-field` (version `1.0.0`, `required: false`, payload `{}`); IR v1.1 declares no `identity` member on a field.
- If `FieldDecl.type_ref.decimal` is present, then the frontend SHALL carry it as the extension `ix://agent-ix/semantic-core/ext/decimal-policy` (version `1.0.0`, `required: false`) with payload `{precision, scale}`.
- If a `FieldDecl` carries one or more constraints, then the frontend SHALL mint one `typeDefinition` of `kind: alias` at the alias identity of `contracts-v1.md` §Identity minting, `ix://<org>/<name>/type/<slug(artifact id)><Field>` with `<Field>` the slugged field name with its first character upper-cased (`FR-006`, `versionNumber` → `type/FR-006VersionNumber`; `FR-001`, `created_at` → `type/FR-001Created-at`), with `displayName` `<DisplayName>` followed by the field name verbatim with its first character upper-cased (`ConfigVersionVersionNumber`; `NoteCreated_at`), `target` the FR-092 resolution of the field's type (a kernel scalar, record, or enum definition; never another alias), `roles: []`, `unknownPolicy: reject`, `extensions: []`, `origin.source` the row's locus, and the row's constraints as its `constraints[]`.
- If a `FieldDecl` carries one or more constraints, then the frontend SHALL set the field's `typeRef` to that alias identity.
- If two field rows of one record carry distinct names whose slugs coincide (`created_at` beside `created__at`), then the frontend SHALL raise `agent-ix.extraction-frontend.UNSLUGGABLE_NAME` at the later row, blocking (contract case (b)).
- If a `FieldDecl` carries no constraint, then the frontend SHALL mint no alias for it, and its `typeRef` SHALL be the FR-092 resolution directly.
- The frontend SHALL emit every constraint on its field's alias and none on the record, so that a record's own `constraints[]` is always `[]`.
- The frontend SHALL lower each `Constraint` to one IR `constraint` under FR-029 with `appliesTo` the alias identity, `identity` `constraint/<Name>-<field>-<keyword>` (FR-095), `diagnosticCode` as `contracts-v1.md` §Identity minting derives it (FR-095), and the row's origin.
- The frontend SHALL carry `pattern` as `{regex, dialect}`, `enumValues` as `{values}`, `format` as `{name}`, and the bound keywords as `{value}`.
- The frontend SHALL NOT split a field name at a case boundary when forming the code: `versionNumber` yields `VERSIONNUMBER` and `version_number` yields `VERSION_NUMBER`, two distinct codes.
- If two constraints of one record yield the same `diagnosticCode`, then the frontend SHALL raise `agent-ix.extraction-frontend.DUPLICATE_CONSTRAINT` at the second row, blocking.
- If one field row carries the same constraint keyword twice, then the frontend SHALL raise `DUPLICATE_CONSTRAINT` at that row, blocking.
- If a constraint keyword is not applicable to the resolved kind under the RULES.md applicability table, then the frontend SHALL raise `agent-ix.extraction-frontend.CONSTRAINT_NOT_APPLICABLE` at the row, blocking, rather than dropping the constraint; this gate is the frontend's own, raised at the source row before any alias reaches a reader, and it agrees with the `crates/semantic-ir` reader's verdict over the alias's `target` (CON-4), so a document the frontend writes never carries a constraint either reader refuses.

### Enumeration artifacts

- The frontend SHALL lower an `object: enumeration` artifact to one `typeDefinition` of `kind: enumeration` with `displayName`, `roles`, and `origin` set by the record rules above.
- The frontend SHALL obtain the enumeration's rows by running the engine's body-extraction evaluator (`quire_rs::extract`, quire-rs FR-011) with the object type's `values_table` locator from the loaded module.
- The frontend SHALL NOT parse the `## Values` table itself.
- The frontend SHALL lower each row to one `variant` whose `name` is the row's `Value` cell verbatim, whose `identity` is `ix://<org>/<name>/variant/<Name>-<value>` (FR-095, both parts slugged), and whose `origin.source` is the row's line at column 3.
- If the evaluator reports the `values_table` locator unsatisfied (no `## Values` section or fewer than `min_rows` rows), then the frontend SHALL emit `ARTIFACT_NOT_LOWERED` at the artifact naming the evaluator's reason, blocking.
- If two rows of one enumeration carry distinct `Value` cells whose slugs coincide under the case-preserving slug (`a b` and `a_b`, not `Active` and `active`), then the frontend SHALL raise `agent-ix.extraction-frontend.UNSLUGGABLE_NAME` at the second row, blocking (contract case (b)).
- The frontend SHALL NOT emit a `typeDefinition` of `kind: alias` for an enumeration artifact; the only alias the frontend emits is the constrained-field alias of "The fields".

### Declared losses

- The frontend SHALL lower a `JsonObject` target to one package-local `kind: scalar` definition with `scalar: any` at `ix://<org>/<name>/type/JsonObject` (FR-139), with no declared loss.
- The frontend SHALL derive `presence` from `multiplicity.lower`, so a required-but-possibly-empty collection is emitted as `optional`.
- The frontend SHALL emit one `DECLARED_LOSS` naming `required-collection-presence` per collection field declared `0..*` or `*`; the source row authors no presence, so the frontend sets `presence: optional` and the loss names the field.
- The frontend SHALL record the row `required-collection-presence` in `losses.json` owned by FR-106.
- The frontend SHALL record the row `lossy-extraction` in `losses.json` citing quire-rs FR-072 (`availability.*.lossy`).
- The frontend SHALL emit each declared loss as one non-blocking `info` diagnostic per occurrence, coded `agent-ix.extraction-frontend.DECLARED_LOSS` naming the register row, so that a consumer can count them.

Rationale: contract `1.2.0` carries the unconstrained value as scalar `any`
(FR-139) and presence as an authored member (FR-106). A source row authors no
presence, so the `required-collection-presence` loss stays declared until the
row grammar carries one.
Field origins are re-derived through the engine's scan and `table_rows`
rather than read from the extraction, because `SemanticExtraction.fields`
carries no per-field locus (agent-ix/quire-rs#420); the engine's scanner is
still the only reader of the Markdown, as FR-091-CON-3 requires. The
`ext/identity-field` and `ext/decimal-policy` extensions (`required: false`)
are distinct by design from the `ext/identity` and `ext/decimal` extensions
(`required: true`) that FR-034 and `lowering.json` stamp on the semantic-core
kernel path: those describe the kernel's own declarations, these a domain
bundle's. Constraints take FR-034's alias-per-constrained-field form
(CR-036-4) because the FR-050 node reader (`src/compiler/ir/reader.mjs`)
resolves `constraint.appliesTo` as a type identity and raises
`UNRESOLVED_TYPE_REF` over a field-scoped subject, while
`agent_ix_semantic_ir::decide` accepts either; the one form both readers
resolve, and the repository's established form, is the alias whose `target`
is the resolved type. The alias identity `type/<slug(artifact id)><Field>`
and its `displayName` `<DisplayName><Field verbatim, capitalised>` are the
shared rule's (issue #87, CR-087-1, CR-087-2; `contracts-v1.md` §Identity
minting), exactly what `src/compiler/frontend/typespec/lower.mjs` produces,
so the TypeSpec frontend and this one mint the same alias node for the same
declaration; the `diagnosticCode` form is likewise the contract's, and the
worked codes (`CONFIGVERSION_VERSIONNUMBER_MAXLENGTH`) are rows of the shared
table of FR-095-AC-16 rather than prose here. The alias can collide with an
author-named type (an artifact `FR-001Revision` beside `FR-001.revision`), which
is why FR-095 checks every minted identity and raises `DUPLICATE_IDENTITY`
rather than assuming injectivity; equal verbatim names are refused first as
`DUPLICATE_TYPE_NAME`, and distinct names slugging alike as `UNSLUGGABLE_NAME`,
the contract's three cases in order.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-093-CON-1 | The frontend SHALL lower a record as a pure function of the `SemanticExtraction`, the resolutions, and the module roles, with `fields_form` influencing no emitted byte of `types[]` or of the diagnostics (`source.digest` differs between forms by construction, being a digest of the source bytes). | Determinism | Property |
| FR-093-CON-2 | The frontend SHALL derive no emitted field value from the field's name, the artifact's title, or the file path, other than `origin.source.path`, `identity`, `diagnosticCode`, and — for a constrained field — the alias `identity` and `displayName` its `typeRef` and its constraints' `appliesTo` name. | Correctness | Property |
| FR-093-CON-3 | The frontend SHALL record every loss it takes as a row in `losses.json`, so that an occurrence of a loss with no row fails the frontend's own test. | Integrity | Test |
| FR-093-CON-4 | The frontend SHALL agree with `agent_ix_semantic_ir::decide` on `CONSTRAINT_NOT_APPLICABLE` for every (kind, keyword) pair of the RULES.md table, asserted by one contract test that compares the frontend's applicability table with the reader's for the full cross product, and by the reader refusing an `alias` whose `target` is that kind. | Integrity | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-093-AC-1 | Two bundle roots, `fixtures/config-version-table/` and `fixtures/config-version-fence/`, each holding `FR-006` at the same relative path `spec/functional/FR-006-config-version-entity.md` in the table form and the fence form respectively and line-aligned so field origins agree, lift to byte-identical `types[]` and diagnostics; only `source.digest` differs, by construction. | Test (TC-1220) |
| FR-093-AC-2 | The lifted `ConfigVersion` record carries `roles: ["business:domain-object", "business:entity", "business:persistable"]`, `unknownPolicy: reject`, and seven fields in declaration order before normalization. | Test (TC-1221) |
| FR-093-AC-3 | `id | UUID | 1 | identity` lowers to `multiplicity {1,1}`, `presence required`, `nullable false`, `defaultKind none`, and the `identity-field` extension; `parent | ConfigVersion | 0..1` lowers to `{0,1}` and `optional`. | Test (TC-1222) |
| FR-093-AC-4 | `versionNumber | Integer | 1 | min: 1` emits one `kind: alias` definition `type/FR-006VersionNumber` with `target` `type/Integer`, `roles: []`, `unknownPolicy: reject`, origin at the row, and one `min` constraint with `operands.value: 1`, `appliesTo` the alias identity, and `diagnosticCode` `agent-ix.config-service.CONFIGVERSION_VERSIONNUMBER_MIN`; the field's `typeRef` is the alias identity, the record's `constraints` is `[]`, and no unconstrained field mints an alias. | Test (TC-1223) |
| FR-093-AC-5 | `createdBy | String | 1 | maxLength: 64` emits `maxLength` with `{value: 64}` and `diagnosticCode` `agent-ix.config-service.CONFIGVERSION_CREATEDBY_MAXLENGTH` on the alias `type/FR-006CreatedBy` targeting `type/String`; a `pattern /^[a-z]+$/` cell emits `{regex, dialect: "ecma-262"}`; an `enumValues a\|b` cell emits `{values: ["a","b"]}`; a row carrying two keywords yields one alias carrying both constraints. | Test (TC-1224) |
| FR-093-AC-6 | A `min` constraint on a `String` field raises `agent-ix.extraction-frontend.CONSTRAINT_NOT_APPLICABLE` at the row, blocking, and the document is not written; the same (kind, keyword) pair handed to `decide` on a type-scoped subject, and on an `alias` targeting that subject, yields the reader's `CONSTRAINT_NOT_APPLICABLE`, and the two applicability tables agree over the full RULES.md cross product. | Test (TC-1225) |
| FR-093-AC-7 | A `JsonObject` cell emits one `scalar: any` definition per package at `type/JsonObject` and no `DECLARED_LOSS`; `losses.json` carries no `unconstrained-value` row. | Test (TC-1226) |
| FR-093-AC-8 | A `1..*` collection field emits `presence: required`; a `*` field emits `optional`, and the register row `required-collection-presence` is cited by one `DECLARED_LOSS` per collection field declared `0..*` or `*` (no module marker of requiredness exists). | Test (TC-1227) |
| FR-093-AC-9 | The legacy free-column FR-006 emits no record and one non-blocking `ARTIFACT_NOT_LOWERED` naming `legacy-form`; a `both-forms` artifact emits a blocking one naming `both-forms`. | Test (TC-1228) |
| FR-093-AC-10 | Renaming every field to a random identifier changes only `name`, `identity`, `diagnosticCode`, and — for a constrained field — the alias `identity`, `displayName`, and `appliesTo` its `typeRef` names; never `multiplicity`, `presence`, `nullable`, an unconstrained field's `typeRef`, or an alias's `target`, `origin`, or operands. | Property (TC-1229) |
| FR-093-AC-11 | Every emitted fixture document passes the FR-050 reader and `decide` with zero `agent-ix.semantic-ir.*` diagnostics. | Test (TC-1230) |
| FR-093-AC-12 | The `business` fixture's `object: enumeration` artifact lowers to one `kind: enumeration` definition with one `variant` per `## Values` row, each named by its `Value` cell verbatim with identity `variant/<Name>-<value>` and origin at the row's line, column 3; an enumeration with no `## Values` section emits blocking `ARTIFACT_NOT_LOWERED`; every `kind: alias` definition in a fixture document is a constrained field's alias (identity `type/<slug(artifact id)><Field>`, `displayName` `<DisplayName>` plus the verbatim field name capitalised, targeting a non-alias definition, named by exactly that field's `typeRef`, carrying at least one constraint), and no alias is emitted for any other reason. | Test (TC-1333) |
| FR-093-AC-13 | Two documents both titled `Status` under distinct ids (the re-authored `negatives/DUPLICATE_TYPE_NAME` fixture) raise `DUPLICATE_TYPE_NAME` at the second path naming both, while `Status` and `status` are two names and raise nothing here (FR-095-AC-14); a row reading `min: 1, min: 2` raises `DUPLICATE_CONSTRAINT` at that row; fields `versionNumber` and `version_number` each carrying `min` yield the distinct codes `…VERSIONNUMBER_MIN` and `…VERSION_NUMBER_MIN` and raise nothing, because the shared rule does not split a case boundary; fields `created_at` and `created__at` on one record raise `UNSLUGGABLE_NAME` at the later row, and enumeration rows `a b` and `a_b` raise `UNSLUGGABLE_NAME` at the second row; a document whose `displayName` is a kernel scalar name the bundle uses raises blocking `DUPLICATE_TYPE_NAME` at that document naming the scalar (the lift-level outcome of FR-092-AC-8's fixture, also asserted by TC-1347). | Test (TC-1334) |
| FR-093-AC-14 | A `domain` artifact with no `## Properties` (`fields.state == not_applicable`) lowers to a `domain` construct with no `fields` member that the reader accepts; an extraction whose `availability.fields.lossy` is `true` yields one `DECLARED_LOSS` naming `lossy-extraction`. | Test (TC-1335) |

## Dependencies

- **Upstream**: [FR-092](./FR-092-resolve-type-tokens-to-declared-artifacts.md), [FR-027](./FR-027-declare-field-multiplicity-and-units.md), [FR-029](./FR-029-close-the-constraint-keyword-vocabulary.md), [FR-034](./FR-034-lower-semantic-core-declarations-to-ir.md), [FR-050](./FR-050-validate-and-normalize-the-emitted-ir.md), [FR-095](./FR-095-mint-package-identity-and-provenance.md) (the shared identity rule, `docs/semantic-data-system/contracts-v1.md` §Identity minting), `ix://agent-ix/quire-rs/FR-011`
- **Downstream**: [FR-094](./FR-094-lower-relationships-operations-and-clauses.md), [FR-097](./FR-097-normalize-validate-and-write-the-lifted-document.md), [FR-098](./FR-098-prove-fixture-goldens-and-cross-frontend-parity.md)
- **Constrained by**: [NFR-031](../non-functional/NFR-031-deterministic-and-hermetic-lifting.md)
