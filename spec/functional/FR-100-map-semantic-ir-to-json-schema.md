---
id: FR-100
title: "Map semantic IR v1.1 definitions to JSON Schema 2020-12"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-015"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-050"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-063"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-034"
    type: "constrained_by"
---
# FR-100: Map semantic IR v1.1 definitions to JSON Schema 2020-12

## Description

The JSON Schema backend SHALL map every admissible semantic IR v1.1 type
definition to a deterministic JSON Schema 2020-12 document, so that a domain
package's API boundary can validate a value without relying on a source
frontend, a generated programming-language package, or an ambient registry.

## Inputs

- One semantic IR `1.1.0` document admitted by the backend's independent
  admissibility reader.
- The `json-schema` target-contract row in
  `fixtures/semantic/v1/positive/target-contracts.json`.
- A JSON Schema 2020-12 vocabulary and the semantic IR's eight structural kinds,
  nine kernel scalars, multiplicity, nullability, presence, constraints,
  unknown-policy, extensions, and provenance members.

## Outputs

- One `<derived-type-name>.json` schema document for every IR definition.
- One `index.json` document listing each emitted schema path, `$id`, SHA-256
  digest, and semantic identity.
- `src/compiler/backends/json-schema-v1/index.mjs`, which maps IR values to
  JSON values and does not read a filesystem, clock, environment, or network.

## Behavior

### Schema identity and references

- The backend SHALL emit `$schema` as
  `https://json-schema.org/draft/2020-12/schema` in every schema document.
- The backend SHALL emit a stable absolute `$id` derived from the package
  identity and definition identity in every schema document.
- The backend SHALL emit `x-agent-ix-semantic-id` equal to the owning semantic
  identity on every root schema and every field-derived schema node.
- When a type reference names another document definition, the backend SHALL
  render a sibling relative `$ref` to that definition's emitted `.json` file.
- The backend SHALL sort emitted definitions by semantic identity and object
  members by code-unit order.

### Structural kinds and scalars

- A `record` definition SHALL render as an object schema whose `properties`
  members are its fields and whose `required` array contains exactly fields
  whose presence is `required`.
- An `enum` definition SHALL render an `enum` array of its variant wire names.
- A `union` definition SHALL render a `oneOf` with one branch per variant; a
  payload-free variant SHALL constrain its tag alone and a payload-carrying
  variant SHALL constrain its tag and payload.
- An `alias` definition SHALL render the schema of its target and its own
  constraints in an `allOf` composition.
- A `sequence` definition SHALL render `type: array` and an `items` schema for
  its element definition.
- A `map` definition SHALL render `type: object` and an
  `additionalProperties` schema for its value definition.
- A `reference` definition SHALL render a string schema carrying the target
  semantic identity as an `x-agent-ix-reference-target` annotation.
- A scalar definition SHALL render `boolean` for `boolean`, `integer` for
  `integer`, `number` for `number`, and `string` for `string`, `bytes`, `date`,
  `datetime`, `duration`, and `uuid`.
- The backend SHALL attach `format: date`, `date-time`, `duration`, or `uuid`
  to the corresponding scalar schemas.

### Fields, constraints, and unknown members

- The backend SHALL render a nullable field as a schema accepting its base
  schema or `null`.
- The backend SHALL render a collection field as `type: array`; it SHALL map
  multiplicity bounds to `minItems` and `maxItems`, and it SHALL map unique
  collections to `uniqueItems: true`.
- The backend SHALL map the admitted `min`, `max`, `exclusiveMin`,
  `exclusiveMax`, `minLength`, `maxLength`, `pattern`, `format`, `enumValues`,
  `nonEmpty`, and `unique` constraints to their JSON Schema 2020-12
  counterparts; collection bounds arise from field multiplicity.
- The backend SHALL map `iana:email`, `iana:uri`, and the supported
  `agent-ix:` date, date-time, duration, UUID, email, and URI formats to their
  enforcing JSON Schema format names; it SHALL refuse every other format name
  rather than emit an annotation a validator can silently ignore.
- A record with `unknownPolicy: reject` SHALL render
  `additionalProperties: false`.
- A record with `unknownPolicy: preserve` or `surface` SHALL permit undeclared
  properties and SHALL retain its policy as an `x-agent-ix-unknown-policy`
  annotation.
- The backend SHALL retain roles, origin, relationships, operations, clauses,
  occurrences, units, and optional extensions as `x-agent-ix-*` annotations.
- If an extension is required and the backend has no declared annotation mapping
  for it, then the backend SHALL return a blocking declared-loss diagnostic and
  emit no schema file.

## Emitted set (ADR-0007)

[ADR-0007](../../docs/semantic-data-system/adr/0007-emitted-set-contract.md) specifies
the emitted set as five concepts realised idiomatically per language, not as a
filename contract. This section names where each concept lands in this target, as
that decision requires.

| ADR-0007 concept | Where it lands in this target |
|---|---|
| Types | one `<TypeName>.json` document per declared type |
| Validation | the JSON Schema 2020-12 keywords those documents carry, checked by any conforming validator; nothing further is emitted because the document *is* the validator |
| Diagnostics | the seam's registry-coded refusals returned with the generation; this target emits no diagnostics file, and that is the realisation rather than a gap |
| Semantic identity | the `x-agent-ix-semantic-id` annotation carried inline on each definition |
| Provenance | `index.json` |

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-100-CON-1 | The mapping module SHALL not import a source frontend, the conformance oracle, or a filesystem module. | Independence | Analysis |
| FR-100-CON-2 | The backend SHALL not replace an unrepresentable construct with a weaker schema. | Integrity | Test |
| FR-100-CON-3 | Every `$ref` SHALL be a same-document fragment or a sibling `.json` path. | Compatibility | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-100-AC-1 | One fixture containing all eight structural kinds and nine scalars emits a valid 2020-12 schema for every definition. | Test (TC-1361) |
| FR-100-AC-2 | The lifted config-version-table `ConfigVersion.json` has its seven field names, the six required field names, and the declared scalar and `min` constraints. | Test (TC-1362) |
| FR-100-AC-3 | The four presence/nullability combinations and collection bounds accept and reject the independent test values stated by their schemas. | Test (TC-1363) |
| FR-100-AC-4 | A record at `unknownPolicy: reject` rejects an extra property; `preserve` and `surface` accept it and retain distinct annotations. | Test (TC-1364) |
| FR-100-AC-5 | Every emitted `$ref` resolves using only the generated sibling file set, and an external or parent-path reference fails the generator test. | Test (TC-1365) |
| FR-100-AC-6 | A required unknown extension produces a blocking diagnostic and zero emitted files. | Test (TC-1366) |

## Dependencies

- **Upstream**: [FR-050](./FR-050-validate-and-normalize-the-emitted-ir.md), [FR-063](./FR-063-declare-the-generation-backend-seam.md)
- **Downstream**: issue #85 implementation and [FR-098](./FR-098-prove-fixture-goldens-and-cross-frontend-parity.md)
- **Constrained by**: [NFR-034](../non-functional/NFR-034-deterministic-json-schema-generation.md)
