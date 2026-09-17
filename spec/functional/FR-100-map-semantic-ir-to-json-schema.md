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

- One `<derived-type-name>.json` schema document for every IR definition, the
  name derived from the definition's `displayName`, or from the last segment
  of its identity where it declares none.
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
- If two definitions derive file names equal when compared case-insensitively,
  then the backend SHALL return a blocking diagnostic naming each path and
  every identity that derives it, and emit no file.
- If a definition derives `index.json`, compared case-insensitively, then the
  backend SHALL return a blocking diagnostic naming the path and the identity
  and stating that it collides with the backend's `index.json`, and emit no
  file.

### Structural kinds and scalars

- A `record` definition SHALL render as an object schema whose `properties`
  members are its fields and whose `required` array contains exactly fields
  whose presence is `required`.
- A contract `2.0.0` `identified` × `record` construct SHALL render as a
  `record` renders, and SHALL carry its identity field names, in the order
  `identityFields` declares them, as `x-agent-ix-identity-fields`. Its
  instances being told apart by those fields is its Quire meaning over
  instances, which no schema keyword states; the annotation carries the names.
- Every construct kind of
  [FR-142](./FR-142-declare-one-construct-per-object-type.md) SHALL carry
  `x-agent-ix-kind` set to `kind.name`, and SHALL render by the row of its
  identity and shape and the members it carries; the backend names no module
  construct kind in its source:

| Identity × shape | Schema | Annotations |
|---|---|---|
| `value` × `record` (business `value_object`) | as for `record` | `x-agent-ix-equality: "value"` |
| `identified` × `record` carrying `owner` (business `nested_entity`) | as for `identified` × `record` | `x-agent-ix-owner` |
| `identified` × `record` carrying `members` (business `aggregate_root`) | as for `identified` × `record` | `x-agent-ix-members`; its clauses in `x-agent-ix-clauses` |
| `none` × `enumeration` (business `enumeration`) | as for `enum` | none |
| `none` × `record` carrying `occurrenceField` (business `event`) | as for `record`, plus `readOnly: true` | `x-agent-ix-occurrence-field` |
| `none` × `state_machine` (business `state_machine`) | as for `record`, plus `$defs.<Name>State`, a string `enum` of its state names | `x-agent-ix-states`, `x-agent-ix-transitions` |
| `identified` × `sequence` (business `process`) | as for `identified` × `record` | `x-agent-ix-steps` |
| `none` × `interface` (business `repository`) | `not: {}`, which no instance satisfies | `x-agent-ix-persists`; its operations in `x-agent-ix-operations` |
| `none` × `namespace` (business `domain`) | `not: {}`, which no instance satisfies | `x-agent-ix-members`, `x-agent-ix-vocabulary` |

- A subtype SHALL render its effective fields: its supertypes' fields,
  farthest first, then its own, with each redefined field left out, and SHALL
  carry `x-agent-ix-supertypes`. A redefining property SHALL carry
  `x-agent-ix-redefines` and a subsetting property `x-agent-ix-subsets`, each
  naming field identities. An abstract type SHALL carry
  `x-agent-ix-abstract: true`. An operation's `frame`, `pre` and `post`
  SHALL be carried in `x-agent-ix-operations`, and the document's populations
  in `index.json` as `x-agent-ix-populations`.
- The construct annotations of a subtype SHALL be read from the document as
  authored, where the subtype's fields are its own; an inherited property
  carries its own `x-agent-ix-subsets`.
- Value equality, abstractness, subsets, clauses, guards and frames are Quire
  meaning no schema keyword states; the annotations carry them. For clauses
  [#159](https://github.com/agent-ix/filament-core-data/issues/159), guards [#160](https://github.com/agent-ix/filament-core-data/issues/160), transitions [#161](https://github.com/agent-ix/filament-core-data/issues/161), subsets [#162](https://github.com/agent-ix/filament-core-data/issues/162), frames
  [#163](https://github.com/agent-ix/filament-core-data/issues/163) and populations [#164](https://github.com/agent-ix/filament-core-data/issues/164) the backend SHALL emit one non-blocking
  `CONSTRUCT_MEMBER_UNENFORCED` per member kind the document declares. If two
  effective fields of a subtype carry one name, then the backend SHALL return a
  blocking diagnostic at the type's `fields` and emit no file.
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
| FR-100-AC-7 | The lifted config-version-table golden renders `ConfigOverlay.json` and `ConfigVersion.json` as object schemas carrying `x-agent-ix-kind: entity` and `x-agent-ix-identity-fields: ["id"]`, no file is named from an artifact id, and a record schema carries neither annotation. | Test (TC-1764) |
| FR-100-AC-8 | The lifted config-version-table golden renders `ConfigVersion.json` whose `$id` ends `/ConfigVersion.json` and whose `x-agent-ix-semantic-id` is `ix://agent-ix/config-service/type/FR-006`: the file and `$id` carry the declared name and the annotation carries the artifact id. | Test (TC-1768) |
| FR-100-AC-9 | Two definitions whose display names `Config Overlay` and `Config-Overlay` derive `Config-Overlay.json`, or `Status` and `status`, produce one blocking diagnostic naming the paths and both identities; a definition named `index` produces one blocking diagnostic stating it collides with the backend's `index.json`; each emits zero files. | Test (TC-1771) |
| FR-100-AC-10 | Generating the contract `2.0.0` constructs fixture emits one schema per construct carrying its kind's schema and annotations: value equality, `readOnly` and the occurrence field on an event, owner and identity fields on a nested entity, members on an aggregate root and a domain, the variant `enum` of an enumeration, `$defs.OrderLifecycleState` and the transitions of a state machine, the steps of a process, `not: {}` and `x-agent-ix-persists` on a repository, the vocabulary of a domain, and supertypes, redefines, subsets, abstract, operation frame and clauses, and populations. | Test (TC-1774) |
| FR-100-AC-11 | Generating the constructs fixture with an unredefined `Party.remark` that subsets `labels` succeeds, `Order.json` carries `remark` with that subset and `x-agent-ix-identity-fields: ["id"]`; with `Order.id` redefining nothing it returns one blocking diagnostic at `/ir/types/<Order>/fields` naming `id` and emits no file. | Test (TC-1782) |

## Dependencies

- **Upstream**: [FR-050](./FR-050-validate-and-normalize-the-emitted-ir.md), [FR-063](./FR-063-declare-the-generation-backend-seam.md)
- **Downstream**: issue #85 implementation and [FR-098](./FR-098-prove-fixture-goldens-and-cross-frontend-parity.md)
- **Constrained by**: [NFR-034](../non-functional/NFR-034-deterministic-json-schema-generation.md)
