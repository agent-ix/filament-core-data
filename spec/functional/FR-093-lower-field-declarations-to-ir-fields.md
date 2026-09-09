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
  - target: "ix://agent-ix/filament-core-data/NFR-031"
    type: "constrained_by"
---
# [FR-093] Lower field declarations to IR record fields with declared losses

## Description

The extraction frontend SHALL lower each object-typed artifact whose `fields`
are `available` to one IR `typeDefinition` of `kind: record`, and each
`FieldDecl` to one IR `field`, taking every multiplicity, constraint, identity,
and nullability value from the declaration and never from a name, so that the
table form and the fence form of one declaration produce identical IR.

## Inputs

- The `SemanticExtraction` of FR-091: `fields: Option<Vec<FieldDecl>>`, `fields_form`, `availability.fields`
- The resolutions of FR-092
- The module's object-type `roles` (`domain-object`, `persistable`, …) from the loaded manifest
- The FR-029 closed constraint vocabulary and the FR-050 applicability table

## Outputs

- `crates/extraction-frontend/src/lower.rs`: `lower_record(extraction, resolutions, ctx) -> Result<TypeDefinition, Vec<Diagnostic>>`
- One `record` per lowered artifact; one `field` per `FieldDecl`; one `constraint` per `Constraint` entry
- `crates/extraction-frontend/losses.json`: the closed register of representability losses this frontend declares, with a code, the construct, and the issue that owns it

## Behavior

### The record

- The frontend SHALL set `displayName` to the artifact's `title` with whitespace removed only where the module's `data_schema` names the type by that form, and otherwise to the artifact's frontmatter `name`; where neither yields a semantic-core `Identifier`, the frontend SHALL raise `agent-ix.extraction-frontend.UNNAMEABLE_ARTIFACT` at the frontmatter.
- The frontend SHALL set `roles` to `<module short name>:<object type>` (for example `business:entity`) followed by each manifest role as `<module short name>:<role>`, sorted and de-duplicated.
- The frontend SHALL set `unknownPolicy` to `reject`.
- The frontend SHALL set the record's `origin.source` to the artifact's `path` at line 1, column 1, with `sourceIdentity` `ix://<org>/<name>/spec`.
- If `availability.fields.state` is `unavailable` or `missing`, then the frontend SHALL NOT emit a record for that artifact and SHALL emit `agent-ix.extraction-frontend.ARTIFACT_NOT_LOWERED` at the artifact naming the engine's `reason`, non-blocking when the reason is `legacy-form` and blocking otherwise.
- If two documents in one bundle lower to the same `displayName`, then the frontend SHALL raise `agent-ix.extraction-frontend.DUPLICATE_TYPE_NAME` at the second document.

### The fields

- The frontend SHALL set `name` from `FieldDecl.name`, `typeRef` from the FR-092 resolution, `multiplicity` from `FieldDecl.type_ref.multiplicity` with `{lower: 1, upper: 1}` where absent, `presence` to `required` when `multiplicity.lower >= 1` and `optional` otherwise, `nullable` from `FieldDecl.nullable` with `false` where absent, `defaultKind` to `none`, and `unit` from `FieldDecl.type_ref.unit`.
- The frontend SHALL set the field's `origin.source` to the artifact's path at the row's line and column 3 for a table row, and at the fence line for a fence line, exactly as the engine reports them.
- Where `FieldDecl.identity` is `true`, the frontend SHALL carry it as the extension `ix://agent-ix/semantic-core/ext/identity-field` (version `1.0.0`, `required: false`, payload `{}`), because IR v1.1 has no `identity` member on a field.
- Where `FieldDecl.type_ref.decimal` is present, the frontend SHALL carry it as the extension `ix://agent-ix/semantic-core/ext/decimal-policy` with payload `{precision, scale}`.
- Each `Constraint` SHALL become one IR `constraint` under FR-029 with `appliesTo` the field's identity, `diagnosticCode` `agent-ix.<name>.<SCREAMING_FIELD>_<KEYWORD>`, and the row's origin; `pattern` carries `{regex, dialect}`, `enumValues` carries `{values}`, `format` carries `{name}`, and the bound keywords carry `{value}`.
- If a constraint keyword is not applicable to the resolved kind under the FR-050 table, then the frontend SHALL raise `agent-ix.semantic-ir.CONSTRAINT_NOT_APPLICABLE` at the row rather than dropping the constraint.

### Declared losses (issue #78, unruled)

- The frontend SHALL lower a `JsonObject` target to one package-local `record` named `JsonObject` with `fields: []` and `unknownPolicy: preserve`, as `kernel-scalars.json` prescribes, and SHALL record the row `unconstrained-value` in `losses.json` citing #78.
- The frontend SHALL derive `presence` from `multiplicity.lower`, so a required-but-possibly-empty collection is emitted as `optional`, and SHALL record the row `required-collection-presence` in `losses.json` citing #78.
- Each declared loss SHALL be emitted as one non-blocking `info` diagnostic per occurrence, coded `agent-ix.extraction-frontend.DECLARED_LOSS` naming the register row, so that a consumer can count them.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-093-CON-1 | The frontend SHALL lower a record as a pure function of the `SemanticExtraction`, the resolutions, and the module roles, with `fields_form` influencing no emitted byte. | Determinism | Metamorphic test |
| FR-093-CON-2 | The frontend SHALL derive no emitted field value from the field's name, the artifact's title, or the file path, other than `origin.source.path`. | Correctness | Metamorphic test |
| FR-093-CON-3 | The frontend SHALL record every loss it takes as a row in `losses.json`, so that an occurrence of a loss with no row fails the frontend's own test. | Integrity | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-093-AC-1 | `config-version.table.md` and `config-version.fence.md`, lifted under the same bundle, produce byte-identical IR documents. | Test (TC-1220) |
| FR-093-AC-2 | The lifted `ConfigVersion` record carries `roles: ["business:domain-object", "business:entity", "business:persistable"]`, `unknownPolicy: reject`, and seven fields in declaration order before normalization. | Test (TC-1221) |
| FR-093-AC-3 | `id | UUID | 1 | identity` lowers to `multiplicity {1,1}`, `presence required`, `nullable false`, `defaultKind none`, and the `identity-field` extension; `parent | ConfigVersion | 0..1` lowers to `{0,1}` and `optional`. | Test (TC-1222) |
| FR-093-AC-4 | `versionNumber | Integer | 1 | min: 1` emits one `min` constraint with `operands.value: 1`, `appliesTo` the field identity, and a `diagnosticCode` matching the published pattern. | Test (TC-1223) |
| FR-093-AC-5 | `createdBy | String | 1 | maxLength: 64` emits `maxLength` with `{value: 64}`; a `pattern /^[a-z]+$/` cell emits `{regex, dialect: "ecma-262"}`; an `enumValues a\|b` cell emits `{values: ["a","b"]}`. | Test (TC-1224) |
| FR-093-AC-6 | A `min` constraint on a `String` field raises `CONSTRAINT_NOT_APPLICABLE` at the row and the document is not written. | Test (TC-1225) |
| FR-093-AC-7 | A `JsonObject` cell emits the `JsonObject` open record once per package and one `DECLARED_LOSS` info naming `unconstrained-value`; `losses.json` carries that row citing #78. | Test (TC-1226) |
| FR-093-AC-8 | A `1..*` collection field emits `presence: required`; a `*` field emits `optional`, and the register row `required-collection-presence` is cited by one `DECLARED_LOSS` per `0..*`-declared collection the module marks required. | Test (TC-1227) |
| FR-093-AC-9 | The legacy free-column FR-006 emits no record and one non-blocking `ARTIFACT_NOT_LOWERED` naming `legacy-form`; a `both-forms` artifact emits a blocking one naming `both-forms`. | Test (TC-1228) |
| FR-093-AC-10 | Renaming every field to a random identifier changes only `name`, `identity`, and `diagnosticCode` values, never `multiplicity`, `presence`, `nullable`, or `typeRef`. | Property (TC-1229) |
| FR-093-AC-11 | Every emitted fixture document passes the FR-050 reader with zero `agent-ix.semantic-ir.*` diagnostics. | Test (TC-1230) |

## Dependencies

- **Upstream**: [FR-092](./FR-092-resolve-type-tokens-to-declared-artifacts.md), [FR-027](./FR-027-declare-field-multiplicity-and-units.md), [FR-029](./FR-029-close-the-constraint-keyword-vocabulary.md), [FR-034](./FR-034-lower-semantic-core-declarations-to-ir.md), [FR-050](./FR-050-validate-and-normalize-the-emitted-ir.md)
- **Downstream**: [FR-094](./FR-094-lower-relationships-operations-and-clauses.md), [FR-097](./FR-097-normalize-validate-and-write-the-lifted-document.md), [FR-098](./FR-098-prove-fixture-goldens-and-cross-frontend-parity.md)
- **Constrained by**: [NFR-031](../non-functional/NFR-031-deterministic-and-hermetic-lifting.md)
