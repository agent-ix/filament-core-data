---
id: FR-064
title: "Lower semantic IR type definitions to TypeScript declarations"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-012"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-063"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-020"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-027"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-028"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-068"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-024"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-025"
    type: "constrained_by"
---
# [FR-064] Lower semantic IR type definitions to TypeScript declarations

## Description

The TypeScript backend SHALL resolve a contract IR `2.0.0` document into one
declared model and render every `typeDefinition` in it as an ordinary TypeScript
declaration whose form is decided by values the IR carries, so that no kind, no
presence, and no nullability is approximated, inferred from a name, or dropped,
and so that every other renderer of this backend reads one resolved artifact
rather than the raw document.

## Inputs

- A contract IR `2.0.0` document that [FR-068](./FR-068-decide-and-report-ir-admissibility.md) has admitted
- The eight `kind` values of `schema/semantic/v1/semantic-ir.schema.json#/$defs/typeDefinition`: `scalar`, `record`, `enum`, `union`, `alias`, `sequence`, `map`, `reference`
- At contract `2.0.0`, the module construct kinds of [FR-142](./FR-142-declare-one-construct-per-object-type.md), their declarations in the document's `constructs` table, and their `identityFields`
- The nine `scalar` values: `boolean`, `integer`, `number`, `string`, `bytes`, `date`, `datetime`, `duration`, `uuid`
- The `unknownPolicy` vocabulary of `common.schema.json`: `preserve`, `reject`, `surface`
- The `ix://agent-ix/semantic-core/ext/doc` extension carried on declarations and fields

## Outputs

- `src/compiler/backends/typescript-v1/model.mjs` exporting `buildModel(ir)`, the resolved model every renderer of this backend consumes
- `src/compiler/backends/typescript-v1/model.d.mts` declaring the model's shape
- `src/compiler/backends/typescript-v1/types.mjs` exporting `renderTypes(model)`
- `src/compiler/backends/typescript-v1/types.d.mts`
- `src/compiler/backends/typescript-v1/names.mjs` exporting `identifierFor(identity, displayName)`, `moduleNameFor(identity)`, and `reserveNames(model)`
- `src/compiler/backends/typescript-v1/names.d.mts`
- The text of the generated `types.ts` module, returned to the caller and written by nobody here

## Behavior

### The resolved model

- `buildModel` SHALL produce the one artifact `renderTypes`, `renderValidators`, `renderIdentity`, `renderMetadata`, and `renderPackage` consume, so that the shape five modules exchange is declared in one place rather than settled by whichever module was written first.
- The model SHALL carry the IR document's `package` block and its `contractVersion` verbatim.
- The model SHALL carry one entry per type definition, in code-point order of `identity`.
- Each entry SHALL carry the definition's `identity`, the TypeScript identifier `identifierFor` minted for it, its `kind`, its `roles`, its `unknownPolicy`, its `constraints`, its `extensions`, and its `origin`.
- Each entry whose `kind` resolves through the alias chain to a `scalar` SHALL carry the resolved `scalar` value, so that no consumer of the model re-walks the alias chain.
- Each `record` entry SHALL carry its fields in code-point order of field `identity`, each field carrying its `name`, its `typeRef`, its resolved element entry, its `unit` where the IR carries one, its `defaultKind` and `defaultValue`, and the three axes — optional, nullable, and collection — already decided from `presence`, `nullable`, and `multiplicity`.
- Each `record` entry SHALL carry its `relationships` and its `operations` as the IR carries them, for [FR-067](./FR-067-generate-identity-and-fingerprint-metadata.md) and [FR-068](./FR-068-decide-and-report-ir-admissibility.md) to consume.
- Each `enum` and `union` entry SHALL carry its variants in code-point order of variant `identity`, each variant carrying its `name` and its resolved `payloadType` entry where it declares one.
- `buildModel` SHALL attach each `constraint` to the entry its `appliesTo` names, resolved through the alias chain, so that a renderer never resolves applicability for itself.
- The model SHALL carry the document's `occurrences` and its document-level `extensions`, so that [FR-067](./FR-067-generate-identity-and-fingerprint-metadata.md) can render them and nothing in the document reaches the output unrendered and undeclared.
- `buildModel` SHALL be total over a document [FR-068](./FR-068-decide-and-report-ir-admissibility.md) has admitted, returning a model for every such document rather than failing on a shape the admissibility answer accepted.
- `buildModel` SHALL return the same model for the same document on every call, reading no file, no environment variable, no clock, and no network.

### One rendering per kind

- A `scalar` definition SHALL render as an exported type alias to the TypeScript primitive its `scalar` member names.
- The `boolean` scalar SHALL render as `boolean`.
- The `integer` and `number` scalars SHALL each render as `number`.
- The `string`, `bytes`, `date`, `datetime`, `duration`, and `uuid` scalars SHALL each render as `string`.
- The `bytes` scalar SHALL render as a `string` carrying standard base64 as RFC 4648 §4 defines it, as a declared backend decision pending `agent-ix/filament-core-data#58`, which records that the published contract states no wire form for the `bytes` kernel scalar.
- The renderer SHALL name that encoding in the rendered declaration's JSDoc, so that a consumer is never left to guess whether the string holds base64, base64url, or hex.
- This requirement SHALL record that reading as a decision rather than present it as settled contract, because issue #21 has recorded a different reading against the same gap and only the contract's owner can reconcile them.
- The renderer SHALL emit a scalar alias rather than collapse it into its primitive at every use site, so that the semantic name survives in consumer code and a later widening of its representation is one edit.
- A `record` definition SHALL render as an exported interface whose members are its `fields`.
- A module construct whose shape is `record`, `state_machine` or `sequence` SHALL render as a `record` renders, with the record's validator, and SHALL be named by `kind.name`. Its model entry SHALL carry its identity field names in declared order where its identity is `identified`, and its construct members, read by `constructOf` in `src/compiler/constructs.mjs` from the members its declaration admits, for [FR-067](./FR-067-generate-identity-and-fingerprint-metadata.md). The backend names no module construct kind in its source.
- A `value_object` SHALL also render `<Name>Equals(left, right)`, true exactly when every member is equal.
- An `entity`, `nested_entity`, `aggregate_root` or `process` that is not abstract SHALL also render `<Name>Equals(left, right)`, true exactly when every identity field is equal by canonical form, whatever its other fields hold.
- An abstract type SHALL render as an exported interface with no validator and no `<Name>Equals`, because no value is an instance of an abstract type except through a subtype.
- If a field, item, value, alias target or union payload names an abstract type, then the backend SHALL raise `ABSTRACT_TYPE_HELD` at that member and write no file. A `reference` MAY target an abstract type, since it holds the target's identity rather than a value of it.
- An `event` renders every property `readonly`, which is its immutability.
- A `state_machine` SHALL also render `export type <Name>State`, a union of the string literals of its state names.
- An `enumeration` definition SHALL render as an `enum` renders, with its validator.
- A `repository` definition SHALL render as an exported interface with one method signature per operation, its parameters and return rendered by the field rules, a return whose lower bound is zero as `| undefined`, and no validator, because a repository holds no state.
- A `domain` definition SHALL render no type and no validator, because a domain is a namespace; its members and vocabulary are carried by [FR-067](./FR-067-generate-identity-and-fingerprint-metadata.md).
- If a derived `<Name>State` or `<Name>Equals` identifier equals another minted identifier, then the backend SHALL raise `IDENTIFIER_COLLISION` and write no file.
- A subtype's construct members SHALL be read from the document as authored, so `FIELD_SUBSETS` and `FIELD_REDEFINES` key a field by the type declaring it.
- A subtype SHALL render its effective fields: its supertypes' fields, farthest first, then its own, with each redefined field left out. If two effective fields carry one name, then the backend SHALL raise `IDENTIFIER_COLLISION` at the type's `fields` and write no file.
- An entity's Quire meaning, that its instances are told apart by the identity fields, is `<Name>Equals`; the generated type also carries the identity field names. `loss.mjs` records the construct in `RENDERED_NOT_LOST`, so the row is named rather than silent, and generation raises no diagnostic for it.
- A `record` SHALL render with no `extends` clause: a subtype's interface carries its inherited fields itself, so a redefining field stands in place of the inherited one rather than intersecting it.
- An `enum` definition SHALL render as a union of the string literals of its variants' `name` values.
- An `enum` variant SHALL render without a value, because the contract IR gives a variant no value member and the TypeSpec frontend reports an assigned enum member value as declared loss.
- A `union` definition SHALL render as a discriminated union with one member object per variant, as a declared backend decision pending `agent-ix/filament-core-data#58`, which records that the published contract states no JSON wire form for a discriminated union.
- A `union` variant carrying `payloadType` SHALL render as `{ readonly kind: "<name>"; readonly value: <PayloadType> }`.
- A `union` variant carrying no `payloadType` SHALL render as `{ readonly kind: "<name>" }`.
- The renderer SHALL emit the discriminant property name as a single exported constant, so that a consumer's `switch` over it narrows to `never` in the default arm and so that a later ruling on `agent-ix/filament-core-data#58` moves one declaration rather than every union.
- An `alias` definition SHALL render as an exported type alias to its `target`.
- An `alias` carrying constraints SHALL keep its own declaration rather than being inlined, so that [FR-066](./FR-066-generate-runtime-validators.md) has one place to attach those constraints.
- A `reference` definition SHALL render as an opaque branded type over the target identity string, so that a reference is not silently interchangeable with a plain `string`.
- [FR-068](./FR-068-decide-and-report-ir-admissibility.md) SHALL decide the resolution of a `reference`'s `target`, leaving this requirement to render the type it names and nothing more.
- A `sequence` definition SHALL render as `readonly <Item>[]`.
- A `map` definition SHALL render as an index-signature object type keyed by `string`, because the IR carries no key type and a map's keys are always strings.

### Fields: three independent axes

- A field whose `presence` is `optional` SHALL render with a `?` marker on its property name.
- A field whose `nullable` is `true` SHALL render with `| null` in its property type.
- A field whose `multiplicity.upper` is absent or greater than one SHALL render as a `readonly` array of its element type.
- The four presence and nullability combinations SHALL render as four distinct forms — `x: T`, `x: T | null`, `x?: T`, and `x?: T | null` — so that a consumer can tell an absent member from a null one.
- The renderer SHALL NOT write `undefined` into the type of a required field.
- The renderer SHALL take each of the three axes from the IR member that carries it, deriving none of them from a field name, a type name, or a rendered type string.
- `buildModel` SHALL resolve a field's element type by looking its `typeRef` up in the document's `types`, because a `typeRef` is always a semantic identity and never an inline type.
- The renderer SHALL emit every property `readonly`, because a generated contract type is a description of received data rather than a mutable model.

### Unknown members, documentation, and non-field nodes

- A `record` whose `unknownPolicy` is `reject` SHALL render closed, with no index signature.
- A `record` whose `unknownPolicy` is `preserve` SHALL render with an index signature admitting unknown members, carrying a generated marker naming `preserve`.
- A `record` whose `unknownPolicy` is `surface` SHALL render with an index signature admitting unknown members, carrying a generated marker naming `surface` that is distinguishable from the `preserve` form.
- The renderer SHALL give an `unknownPolicy` on a definition whose kind is not `record` no rendering effect, because only a record has members an unknown member could join; `conformance/bases/core-2-0.json` and `package-2-0.json` carry a `union` declaring `surface` and a `map` declaring `preserve`, so the case is real rather than hypothetical.
- The renderer SHALL carry every such policy into the metadata of [FR-067](./FR-067-generate-identity-and-fingerprint-metadata.md), so that a policy with no rendering effect is still declared rather than dropped.
- The `text` of an `ix://agent-ix/semantic-core/ext/doc` extension SHALL render as a JSDoc comment on the declaration or property that carries it.
- A record's `relationships` SHALL NOT appear as members of its rendered interface, because a relationship carries no name and is not part of the record's serialized shape.
- This requirement SHALL render no relationship descriptor; [FR-067](./FR-067-generate-identity-and-fingerprint-metadata.md) is the descriptor's one owner, so that two modules cannot each satisfy a criterion with a different shape.
- A record's `operations` SHALL NOT render into the generated type surface; their omission is reported as declared loss by [FR-068](./FR-068-decide-and-report-ir-admissibility.md) rather than passed over.

### Names, order, and purity

- `identifierFor` SHALL derive a TypeScript identifier from a definition's `displayName`.
- If a derived identifier is a TypeScript reserved word, then `identifierFor` SHALL mangle it by a stated deterministic rule rather than emitting invalid source.
- If two distinct identities derive the same identifier, then `reserveNames` SHALL raise a blocking `agent-ix.typescript-backend.IDENTIFIER_COLLISION` diagnostic naming both identities, rather than letting one declaration overwrite the other.
- `reserveNames` SHALL run while `buildModel` builds the model, so that a collision is reported before any file could be emitted rather than after a partial package exists.
- The `IDENTIFIER_COLLISION` code SHALL sit in the `agent-ix.typescript-backend.` representability register of [FR-068](./FR-068-decide-and-report-ir-admissibility.md), because a name that two identities share is a statement about what this target can render and not a statement that the document is invalid.
- The renderer SHALL treat a change to a definition's `displayName` with an unchanged `identity` as a change to the generated public API, because the identifier is minted from the display name while the contract identity did not move.
- The generated identity map of [FR-067](./FR-067-generate-identity-and-fingerprint-metadata.md) SHALL be what makes that change visible, mapping the new identifier to the unchanged identity so that a consumer diffing the package can see the rename for what it is.
- The renderer SHALL derive no semantic value from a `displayName`, taking the identifier from it and nothing else.
- The renderer SHALL emit declarations in code-point order of `identity`, because declaration order is not recoverable from the IR and input array order must not reach the output.
- A cycle among `typeRef`, `target`, `items`, `values`, and `payloadType` SHALL render as an ordinary mutually recursive TypeScript declaration.
- The renderer SHALL terminate on a cyclic model rather than recursing without bound.
- `renderTypes` SHALL return the same string for the same model on every call.
- `renderTypes` SHALL read no file, no environment variable, no clock, and no network.

### What must not appear

- No rendered declaration SHALL contain `any` in a type position or as an identifier, measured over the parsed source rather than over its comment text, because a JSDoc comment rendered from a `doc` extension may legitimately contain the English word.
- The renderer SHALL place the type `unknown` only in the index signature an `unknownPolicy` of `preserve` or `surface` asked for.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-064-CON-1 | The renderer SHALL NOT read `src/compiler/backends/typescript.mjs`, `src/compiler/backends/type-names.mjs`, or any other module written against the frozen FR-041 prototype IR; those consume a different document shape and their textual-substitution mechanism is exactly what FR-042-CON-5 records as fragile. | Integrity | Static analysis |
| FR-064-CON-2 | The renderer SHALL decide every value from an IR member, never from a display name, a namespace prefix, or a rendered type string; the prototype's `role`, `nullable`, `recursive`, and `extensionPoint` name heuristics are the defect this constraint exists to exclude. | Integrity | Static analysis |
| FR-064-CON-3 | The renderer SHALL handle all eight `kind` values exhaustively, so that an unhandled kind fails its own contract test rather than falling through to a default rendering. | Completeness | Test |
| FR-064-CON-4 | No generated declaration SHALL name a TypeScript decorator, so that a consumer cannot mistake the generated types for the schema source; TypeSpec is the structural source under ADR-0005. | Portability | Static analysis |
| FR-064-CON-5 | The renderer SHALL emit no file; text placement belongs to [FR-065](./FR-065-generate-the-esm-package-and-export-surface.md), as FR-042-CON-2 already requires of the prototype backends. | Maintainability | Purity test |
| FR-064-CON-6 | `buildModel` SHALL be the only module of this backend that walks the raw IR document; `renderTypes`, `renderValidators`, `renderIdentity`, `renderMetadata`, and `renderPackage` read the model and never the document, so that a resolution rule has one implementation rather than five. | Maintainability | Static analysis |
| FR-064-CON-7 | The model SHALL carry every node the IR document declares, including `occurrences`, document-level `extensions`, and each field's `unit`, so that a construct reaching the model unrendered is a visible omission in [FR-067](./FR-067-generate-identity-and-fingerprint-metadata.md) rather than a silent drop under a `fail` policy. | Completeness | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-064-AC-1 | A model carrying one definition of each of the eight kinds renders eight declarations, one per kind, and the rendered text of each matches its committed snapshot. | Snapshot |
| FR-064-AC-2 | Each of the nine `scalar` values renders to its declared TypeScript primitive: `boolean` to `boolean`, `integer` and `number` to `number`, and the remaining six to `string`. | Unit |
| FR-064-AC-3 | A record renders as an interface with no `extends` clause, even when its fields' types are themselves records. | Unit |
| FR-064-AC-4 | An enum renders as a union of its variants' names as string literals, in code-point order of variant identity. | Unit |
| FR-064-AC-5 | A union with one payload-carrying and one payload-free variant renders both member shapes, and a `switch` over the exported discriminant constant narrows the default arm to `never` under `tsc`. | Compile |
| FR-064-AC-6 | A `reference` renders as a branded type, and assigning a plain `string` to it fails `tsc` while assigning a value produced by the generated constructor succeeds. | Compile |
| FR-064-AC-7 | The four presence and nullability combinations render as four distinct property forms, and no required field's rendered type contains `undefined`. | Unit |
| FR-064-AC-8 | A field whose `multiplicity.upper` is absent renders as a `readonly` array, and a field whose `upper` is `1` renders as a scalar property. | Unit |
| FR-064-AC-9 | A model whose `typeRef` cycle spans three records renders three mutually recursive interfaces, `tsc` accepts them, and the renderer terminates. | Compile |
| FR-064-AC-10 | The three `unknownPolicy` values render three distinguishable forms, and the `reject` form carries no index signature. | Unit |
| FR-064-AC-11 | A `doc` extension on a declaration and on a field each render as a JSDoc comment attached to that declaration or property. | Snapshot |
| FR-064-AC-12 | A record carrying two relationships renders no relationship member in its interface, and `types.ts` contains no relationship descriptor, because [FR-067](./FR-067-generate-identity-and-fingerprint-metadata.md) is the descriptor's only owner. | Unit |
| FR-064-AC-13 | A `displayName` equal to a TypeScript reserved word renders a mangled identifier by the stated rule, and the same input yields the same identifier on a second run. | Unit |
| FR-064-AC-14 | Two distinct identities whose display names derive the same identifier produce one blocking `agent-ix.typescript-backend.IDENTIFIER_COLLISION` diagnostic naming both, raised while the model is built and before any file map exists. | Unit |
| FR-064-AC-15 | Rendering a model whose `types` array is reversed produces byte-identical output to rendering it in its committed order. | Property |
| FR-064-AC-16 | `renderTypes` called twice on the same model returns identical strings, and performs no filesystem, clock, environment, or network access during a call. | Test |
| FR-064-AC-17 | No rendered output of any fixture model uses `any` in a type position or as an identifier, asserted over the parsed source so that a JSDoc comment containing the English word passes; and every occurrence of the type `unknown` sits in an index signature whose record declared `preserve` or `surface`. | Static |
| FR-064-AC-18 | `buildModel` over the `core-2-0` and `package-2-0` conformance bases returns a model carrying every declared type, field, variant, constraint, relationship, operation, occurrence, document-level extension, and field `unit`, and a count of each against the source document agrees. | Unit |
| FR-064-AC-19 | `buildModel` called twice on the same document returns deeply equal models, performs no filesystem, clock, environment, or network access, and leaves its argument byte-identical. | Property |
| FR-064-AC-20 | A `bytes` scalar renders as `string` and its JSDoc names RFC 4648 §4 base64, and the reading is recorded against `agent-ix/filament-core-data#58` rather than as settled contract. | Snapshot |
| FR-064-AC-21 | A `union` declaring `surface` and a `map` declaring `preserve` — both present in the committed conformance bases — render with no index signature and no unknown-member marker, while their policies appear in the generated metadata. | Unit |
| FR-064-AC-22 | Changing only a definition's `displayName` changes the generated identifier and the generated identity map's key, while the identity that map records is unchanged, so a rename is visible in a package diff. | Unit |
| FR-064-AC-23 | A `2.0.0` document whose `ConfigVersion` and `ConfigOverlay` are `entity` constructs generates an interface and a validator for each that compile under `tsc`, the validator refuses a value missing the identity field, and `TYPE_KIND` records `entity`. | Unit (TC-1763) |
| FR-064-AC-24 | Generating the lifted `config-version-table` golden, whose types carry artifact-id identities and declared display names, exports `validateConfigVersion` and a `TYPE_IDENTITY` map whose `ConfigVersion` entry is `ix://agent-ix/config-service/type/FR-006`, and no exported type name derives from an artifact id. | Test (TC-1767) |
| FR-064-AC-25 | Generating the contract `2.0.0` constructs fixture succeeds and compiles under `tsc`: each record-shaped construct exports an interface and a validator, `OrderLineEquals` compares members, `OrderEquals` compares `id` alone, `Party` exports an interface with no validator and no `PartyEquals`, `OrderLifecycleState` is the union of the state names, `OrderStatus` is the union of its variants, `OrderRepository` is an interface of its method signatures, `Ordering` exports no type, and `Order` carries its own fields and the fields it redefines once each. | Test (TC-1773) |
| FR-064-AC-26 | Generating the constructs fixture with `OrderStatus` renamed `OrderLifecycleState`, `OrderEquals` or `OrderLineEquals` raises `IDENTIFIER_COLLISION`; with `Order.status` naming the abstract `Party` raises `ABSTRACT_TYPE_HELD`, while a `reference` type targeting `Party` generates; with `Order.id` redefining nothing raises `IDENTIFIER_COLLISION`; each writes no file. With an unredefined `Party.remark` subsetting `labels`, `FIELD_SUBSETS` keys it `Party.remark` alone. | Test (TC-1781) |

## Dependencies

- **Upstream**: [FR-020](./FR-020-define-semantic-type-system-and-identity.md), [FR-027](./FR-027-declare-field-multiplicity-and-units.md), [FR-028](./FR-028-represent-relationships-operations-and-clauses.md), [FR-063](./FR-063-declare-the-generation-backend-seam.md), [FR-068](./FR-068-decide-and-report-ir-admissibility.md)
- **Downstream**: [FR-065](./FR-065-generate-the-esm-package-and-export-surface.md), [FR-066](./FR-066-generate-runtime-validators.md), [FR-067](./FR-067-generate-identity-and-fingerprint-metadata.md), [FR-070](./FR-070-run-the-typescript-conformance-adapter.md)
- **Constrained by**: [NFR-024](../non-functional/NFR-024-portable-deterministic-generated-typescript.md), [NFR-025](../non-functional/NFR-025-non-disruptive-typescript-backend.md)
- **Open contract questions this requirement records rather than decides**: `agent-ix/filament-core-data#58`, which records that the published contract states no JSON wire form for a discriminated union and none for the `bytes` kernel scalar. This requirement declares a reading for each, names it a decision, and keeps it to one exported constant and one rendering rule so that a ruling moves one edit. Issue #21 has recorded a different reading against the same gap. `agent-ix/filament-core-data#59` records that the closed issue #9 can no longer own the register these gaps sit in.
