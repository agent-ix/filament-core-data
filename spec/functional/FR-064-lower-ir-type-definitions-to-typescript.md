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
  - target: "ix://agent-ix/filament-core-data/NFR-024"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-025"
    type: "constrained_by"
---
# [FR-064] Lower semantic IR type definitions to TypeScript declarations

## Description

The TypeScript backend SHALL render every `typeDefinition` of a contract IR
`1.1.0` document as an ordinary TypeScript declaration whose form is decided by
values the IR carries, so that no kind, no presence, and no nullability is
approximated, inferred from a name, or dropped.

## Inputs

- A contract IR `1.1.0` document admitted by [FR-068](./FR-068-decide-and-report-ir-admissibility.md), as the resolved model that requirement produces
- The eight `kind` values of `schema/semantic/v1/semantic-ir.schema.json#/$defs/typeDefinition`: `scalar`, `record`, `enum`, `union`, `alias`, `sequence`, `map`, `reference`
- The nine `scalar` values: `boolean`, `integer`, `number`, `string`, `bytes`, `date`, `datetime`, `duration`, `uuid`
- The `unknownPolicy` vocabulary of `common.schema.json`: `preserve`, `reject`, `surface`
- The `ix://agent-ix/semantic-core/ext/doc` extension carried on declarations and fields

## Outputs

- `src/compiler/backends/typescript-v1/types.mjs` exporting `renderTypes(model)`
- `src/compiler/backends/typescript-v1/types.d.mts`
- `src/compiler/backends/typescript-v1/names.mjs` exporting `identifierFor(identity, displayName)`, `moduleNameFor(identity)`, and `reserveNames(model)`
- `src/compiler/backends/typescript-v1/names.d.mts`
- The text of the generated `types.ts` module, returned to the caller and written by nobody here

## Behavior

### One rendering per kind

- A `scalar` definition SHALL render as an exported type alias to the TypeScript primitive its `scalar` member names.
- The `boolean` scalar SHALL render as `boolean`.
- The `integer` and `number` scalars SHALL each render as `number`.
- The `string`, `bytes`, `date`, `datetime`, `duration`, and `uuid` scalars SHALL each render as `string`.
- A scalar alias SHALL be emitted rather than collapsed into its primitive at every use site, so that the semantic name survives in consumer code and a later widening of its representation is one edit.
- A `record` definition SHALL render as an exported interface whose members are its `fields`.
- A `record` SHALL render with no `extends` clause, because the contract IR carries no base member; inheritance existed only in the frozen FR-041 prototype IR and is not carried forward.
- An `enum` definition SHALL render as a union of the string literals of its variants' `name` values.
- An `enum` variant SHALL render without a value, because the contract IR gives a variant no value member and the TypeSpec frontend reports an assigned enum member value as declared loss.
- A `union` definition SHALL render as a discriminated union with one member object per variant.
- A `union` variant carrying `payloadType` SHALL render as `{ readonly kind: "<name>"; readonly value: <PayloadType> }`.
- A `union` variant carrying no `payloadType` SHALL render as `{ readonly kind: "<name>" }`.
- The discriminant property name SHALL be a single exported constant, so that a consumer's `switch` over it narrows to `never` in the default arm.
- An `alias` definition SHALL render as an exported type alias to its `target`.
- An `alias` carrying constraints SHALL keep its own declaration rather than being inlined, so that [FR-066](./FR-066-generate-runtime-validators.md) has one place to attach those constraints.
- A `reference` definition SHALL render as an opaque branded type over the target identity string, so that a reference is not silently interchangeable with a plain `string`.
- Resolution of a `reference`'s `target` SHALL be decided by [FR-068](./FR-068-decide-and-report-ir-admissibility.md) and not by this requirement.
- A `sequence` definition SHALL render as `readonly <Item>[]`.
- A `map` definition SHALL render as an index-signature object type keyed by `string`, because the IR carries no key type and a map's keys are always strings.

### Fields: three independent axes

- A field whose `presence` is `optional` SHALL render with a `?` marker on its property name.
- A field whose `nullable` is `true` SHALL render with `| null` in its property type.
- A field whose `multiplicity.upper` is absent or greater than one SHALL render as a `readonly` array of its element type.
- The four presence and nullability combinations SHALL render as four distinct forms — `x: T`, `x: T | null`, `x?: T`, and `x?: T | null` — so that a consumer can tell an absent member from a null one.
- The renderer SHALL NOT write `undefined` into the type of a required field.
- The renderer SHALL take each of the three axes from the IR member that carries it, deriving none of them from a field name, a type name, or a rendered type string.
- A field's element type SHALL be resolved by looking up its `typeRef` in the document's `types`, because a `typeRef` is always a semantic identity and never an inline type.
- Every property SHALL be emitted `readonly`, because a generated contract type is a description of received data rather than a mutable model.

### Unknown members, documentation, and non-field nodes

- A definition whose `unknownPolicy` is `reject` SHALL render closed, with no index signature.
- A definition whose `unknownPolicy` is `preserve` SHALL render with an index signature admitting unknown members, carrying a generated marker naming `preserve`.
- A definition whose `unknownPolicy` is `surface` SHALL render with an index signature admitting unknown members, carrying a generated marker naming `surface` that is distinguishable from the `preserve` form.
- The `text` of an `ix://agent-ix/semantic-core/ext/doc` extension SHALL render as a JSDoc comment on the declaration or property that carries it.
- A record's `relationships` SHALL NOT appear as members of its rendered interface, because a relationship carries no name and is not part of the record's serialized shape.
- A record's `relationships` SHALL render as a separate exported readonly descriptor naming each relationship's identity, verb, category, composite flag, target, and multiplicity.
- A record's `operations` SHALL NOT render into the generated type surface; their omission is reported as declared loss by [FR-068](./FR-068-decide-and-report-ir-admissibility.md) rather than passed over.

### Names, order, and purity

- `identifierFor` SHALL derive a TypeScript identifier from a definition's `displayName`.
- If a derived identifier is a TypeScript reserved word, then `identifierFor` SHALL mangle it by a stated deterministic rule rather than emitting invalid source.
- If two distinct identities derive the same identifier, then `reserveNames` SHALL raise a blocking `agent-ix.compiler.IDENTIFIER_COLLISION` diagnostic naming both identities, rather than letting one declaration overwrite the other.
- Declarations SHALL be emitted in code-point order of `identity`, because declaration order is not recoverable from the IR and input array order must not reach the output.
- A cycle among `typeRef`, `target`, `items`, `values`, and `payloadType` SHALL render as an ordinary mutually recursive TypeScript declaration.
- The renderer SHALL terminate on a cyclic model rather than recursing without bound.
- `renderTypes` SHALL return the same string for the same model on every call.
- `renderTypes` SHALL read no file, no environment variable, no clock, and no network.

### What must not appear

- No rendered declaration SHALL contain the type `any`.
- The type `unknown` SHALL appear only in the index signature an `unknownPolicy` of `preserve` or `surface` asked for.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-064-CON-1 | The renderer SHALL NOT read `src/compiler/backends/typescript.mjs`, `src/compiler/backends/type-names.mjs`, or any other module written against the frozen FR-041 prototype IR; those consume a different document shape and their textual-substitution mechanism is exactly what FR-042-CON-5 records as fragile. | Integrity | Static analysis |
| FR-064-CON-2 | The renderer SHALL decide every value from an IR member, never from a display name, a namespace prefix, or a rendered type string; the prototype's `role`, `nullable`, `recursive`, and `extensionPoint` name heuristics are the defect this constraint exists to exclude. | Integrity | Static analysis |
| FR-064-CON-3 | The renderer SHALL handle all eight `kind` values exhaustively, so that an unhandled kind fails its own contract test rather than falling through to a default rendering. | Completeness | Test |
| FR-064-CON-4 | No generated declaration SHALL name a TypeScript decorator, so that a consumer cannot mistake the generated types for the schema source; TypeSpec is the structural source under ADR-0005. | Portability | Static analysis |
| FR-064-CON-5 | The renderer SHALL emit no file; text placement belongs to [FR-065](./FR-065-generate-the-esm-package-and-export-surface.md), as FR-042-CON-2 already requires of the prototype backends. | Maintainability | Purity test |

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
| FR-064-AC-12 | A record carrying two relationships renders no relationship member in its interface and one readonly descriptor naming both relationships with their six recorded members. | Unit |
| FR-064-AC-13 | A `displayName` equal to a TypeScript reserved word renders a mangled identifier by the stated rule, and the same input yields the same identifier on a second run. | Unit |
| FR-064-AC-14 | Two distinct identities whose display names derive the same identifier produce one blocking `agent-ix.compiler.IDENTIFIER_COLLISION` diagnostic naming both, and no declaration is emitted. | Unit |
| FR-064-AC-15 | Rendering a model whose `types` array is reversed produces byte-identical output to rendering it in its committed order. | Property |
| FR-064-AC-16 | `renderTypes` called twice on the same model returns identical strings, and performs no filesystem, clock, environment, or network access during a call. | Test |
| FR-064-AC-17 | No rendered output of any fixture model contains the token `any`, and every occurrence of `unknown` sits in an index signature whose definition declared `preserve` or `surface`. | Static |

## Dependencies

- **Upstream**: [FR-020](./FR-020-define-semantic-type-system-and-identity.md), [FR-027](./FR-027-declare-field-multiplicity-and-units.md), [FR-028](./FR-028-represent-relationships-operations-and-clauses.md), [FR-063](./FR-063-declare-the-generation-backend-seam.md), [FR-068](./FR-068-decide-and-report-ir-admissibility.md)
- **Downstream**: [FR-065](./FR-065-generate-the-esm-package-and-export-surface.md), [FR-066](./FR-066-generate-runtime-validators.md), [FR-067](./FR-067-generate-identity-and-fingerprint-metadata.md), [FR-070](./FR-070-run-the-typescript-conformance-adapter.md)
- **Constrained by**: [NFR-024](../non-functional/NFR-024-portable-deterministic-generated-typescript.md), [NFR-025](../non-functional/NFR-025-non-disruptive-typescript-backend.md)
