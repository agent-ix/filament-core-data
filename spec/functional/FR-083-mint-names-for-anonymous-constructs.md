---
id: FR-083
title: "Mint names and identities for anonymous schema constructs"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-014"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-082"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-028"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-029"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-030"
    type: "constrained_by"
---
# [FR-083] Mint names and identities for anonymous schema constructs

## Description

The kernel lowering SHALL give every anonymous JSON Schema construct in the
`packages/semantic-core/generated/json-schema/` bundle a named IR type
definition and a semantic identity, deriving both from the construct's position
and its shape alone, so that the same bundle mints the same names on every run
and on every host, and so that adding an unrelated declaration to
`packages/semantic-core/main.tsp` moves no name a generated package already
exports.

Minting is forced, not chosen. `semantic-ir.schema.json#/$defs/field` types
`typeRef` as a single `common.schema.json#/$defs/semanticIdentity`: a field
names one declared type and can carry no inline structure. `TypeRef.json`'s
`target` is an `anyOf` of two `$ref`s written directly in the property position,
`MinConstraint.json`'s `keyword` is `{"type":"string","const":"min"}`,
`EnumValuesConstraint.json`'s `values` is an array whose `items` is an inline
three-branch `anyOf`, and `DefaultDecl.json`'s `value` is `{}`. None of those
four has a name in the bundle and none can be referenced by a `typeRef` until
one is minted. The alternative — widening `field.typeRef` to admit inline
structure — is an edit to a published schema and is refused by
[FR-084](./FR-084-record-provenance-and-refuse-unrepresentable-constructs.md).

A minted name is a published surface. Each of the four target packages exports
the name this requirement computes: a TypeScript `export interface`, a Rust
`pub struct`, a Pydantic class, and a JSON Schema document filename. A rule that
derived a name from a counter, from a content hash, or from the order the
lowering happened to walk the bundle would move every downstream name whenever
an unrelated declaration was added, which is a breaking change to consumers of a
package whose own contract did not change. That is the failure this requirement
exists to prevent, and it is why the rule below is positional and shape-keyed
rather than sequential.

## Inputs

- The 30 JSON Schema 2020-12 documents of `packages/semantic-core/generated/json-schema/`, whose byte-for-byte content `make semantic-core-check` gates
- The declared kernel type names, which are the `$id` basenames of those 30 documents — `TypeRef`, `Multiplicity`, `DecimalPolicy`, `ConstraintDecl`, `MinConstraint`, `EnumValuesConstraint`, `DefaultDecl`, `OperationDecl`, and the rest
- `packages/semantic-core/kernel-scalars.json`, whose nine entries fix the IR scalar each kernel scalar lowers to and whose `JsonObject` row prescribes `kind: record`, `fields: []`, `unknownPolicy: preserve`
- The closed keyword set FR-082 admits: `type`, `$ref`, `$id`, `$schema`, `properties`, `required`, `unevaluatedProperties`+`not`, `description`, `const`, `enum`, `anyOf`, `items`, `minItems`, `pattern`, `minLength`, `minimum`, `maximum`
- `schema/semantic/v1/semantic-ir.schema.json#/$defs/field`, `#/$defs/variant`, `#/$defs/typeDefinition`, and `#/$defs/constraint`
- `schema/semantic/v1/common.schema.json#/$defs/semanticIdentity`, whose pattern is `^ix://[a-z0-9][a-z0-9._-]*/[A-Za-z0-9][A-Za-z0-9._~:/-]*$`
- The canonicalization of [FR-048](./FR-048-build-and-verify-the-lock-and-fingerprint.md), used to compare two subschemas for identity of shape

## Outputs

- `src/compiler/frontend/json-schema/mint.mjs`, exporting `mintTypeName(owner, property, position)`, `mintIdentity(kind, owner, member)`, and `mintAll(bundle)` returning the complete mint table
- `src/compiler/frontend/json-schema/mint.d.mts` declaring that surface
- One `semantic-ir.schema.json#/$defs/typeDefinition` per minted construct, appended to the `types` array FR-082 assembles and written to the kernel IR document at `packages/semantic-kernel/semantic-ir.json`
- A mint table, the return value of `mintAll`, recording for every minted type its name, its identity, the owning document and JSON pointer of the position that minted it, every further position that resolved to it by deduplication, and the canonical form its deduplication key was taken over; `scripts/build-semantic-kernel.mjs --check` reports it rather than a separate committed file, so the table cannot drift from the document it explains

## Behavior

### The name rule

- A construct occupying the property `<propertyName>` of the declared type `<OwnerType>` SHALL mint the name `<OwnerType><PropertyName>`, where `<PropertyName>` is `<propertyName>` with its first code point upper-cased and no other character changed.
- The rule SHALL compose left to right for a construct nested inside a minted type, so a construct one level deeper carries the enclosing mint's whole name as its owner prefix, and no intermediate segment is elided.
- `TypeRef.json`'s `target` SHALL mint `TypeRefTarget`, a `union` whose two variants are the `SemanticId` and `KernelScalar` targets its `anyOf` `$ref`s name.
- `MinConstraint.json`'s `keyword` SHALL mint `MinConstraintKeyword`, an `enum` carrying the single variant `min`, because the property is `{"type":"string","const":"min"}` and a one-member enum is the representation that keeps the discriminant checkable in every target.
- `DefaultDecl.json`'s `value` SHALL mint `DefaultDeclValue` under the `JsonObject` lowering of `kernel-scalars.json` — `kind: record`, `fields: []`, `unknownPolicy: "preserve"` — and that mint is the subject of the first declared loss of [FR-084](./FR-084-record-provenance-and-refuse-unrepresentable-constructs.md).
- `DecimalPolicy.json`'s `precision` SHALL mint `DecimalPolicyPrecision`, a `scalar` of `integer` carrying a `min` constraint of `1` and a `max` constraint of `2147483647`, taken from the property's `minimum` and `maximum`.
- The name SHALL be computed from the owner and the property alone; no part of it SHALL be read from the construct's own content, so that changing a `description` or a `maximum` never renames a type.

### Element and member positions

- Where a property is `{"type":"array","items":<S>}` and `<S>` is anonymous, the element schema SHALL mint `<OwnerType><PropertyName>Item`, because the array itself lowers to the field's `multiplicity` rather than to a type and only its element needs a name.
- `EnumValuesConstraint.json`'s `values` SHALL therefore mint `EnumValuesConstraintValuesItem`, a `union` over the `string`, `number`, and `boolean` branches of its inline `items.anyOf`, while `minItems: 1` lowers to `multiplicity.lower: 1` on the field and mints nothing.
- Where a property is `{"type":"array","items":{"$ref":<R>}}`, no mint SHALL occur and the field's `typeRef` SHALL be the identity `<R>` resolves to, which is why `OperationDecl.json`'s `params`, `pre`, and `post` mint no type.
- A variant of a minted `union` whose branch is a `$ref` SHALL be named for the basename of the referenced `$id`; a variant whose branch is an inline scalar SHALL be named for the IR scalar that branch lowers to, with its first code point upper-cased — `Number`, `String`, `Boolean`.
- A variant of a minted `enum` SHALL carry the member value verbatim as its `name`, because the member value is what appears on the wire and a transformed name would make the enum's own discriminant unrecoverable from the IR.

### Deduplication by canonical form

- Two anonymous constructs whose subschemas have the same canonical form under the FR-048 canonicalization SHALL mint exactly one type, and every position carrying that shape SHALL reference the one minted identity.
- The deduplication key SHALL be taken over the subschema with `description` removed and with every `$ref` resolved to the absolute `$id` it names, so that a prose edit does not split one mint into two and a relative reference does not fail to match an absolute one carrying the same target.
- Where two or more positions share a canonical form, the minted name SHALL be the one computed for the least position, ordering positions by owning type name and then by property name, both by code point.
- `Multiplicity.json`'s `lower` and `upper` and `DecimalPolicy.json`'s `scale` are the measured instance of this: all three are `{"type":"integer","minimum":0,"maximum":2147483647}`, `DecimalPolicy` precedes `Multiplicity` by code point, so the three positions SHALL mint the single type `DecimalPolicyScale` and all three fields SHALL carry its identity as their `typeRef`.
- `DecimalPolicy.json`'s `precision` SHALL NOT join that mint, because its `minimum` is `1` and its canonical form therefore differs; two shapes are two types even where they differ in one operand.
- The mint table SHALL record every position that resolved to a deduplicated mint, so that a reader can see that `Multiplicity.lower` is typed by a name derived from `DecimalPolicy` and why, rather than discovering it in generated source.

### Collision and the numeric suffix

- A computed name that equals a declared kernel type name, or a name an earlier mint already took, SHALL take the least integer suffix greater than or equal to `2` that leaves the name unused — `<Name>2`, then `<Name>3` — comparing against the declared names and the mints taken so far in the same order the mint runs.
- The suffix SHALL be appended to the computed name and SHALL replace no part of it, so a suffixed name still names its owner and its property.
- A collision SHALL NOT be resolved by renaming the declared kernel type, because a declared name is the bundle's and this lowering reads the bundle and never edits it.
- The suffix SHALL be the only source of a digit at the end of a minted name, and the mint table SHALL record every suffixed name together with the name it collided with.

### What a name is never derived from

- A minted name SHALL NOT be derived from a counter over the constructs minted so far.
- A minted name SHALL NOT be derived from a digest, hash, or fingerprint of the construct or of the bundle.
- A minted name SHALL NOT be derived from the order in which the lowering visited documents, properties, or `anyOf` branches, and SHALL NOT depend on the file-system enumeration order of `packages/semantic-core/generated/json-schema/`.
- A minted name SHALL NOT be derived from a clock, an environment variable, or a locale-sensitive case conversion; case folding SHALL be performed against the invariant mapping so that a Turkish locale produces the same `I` as any other.
- Adding a declaration to `packages/semantic-core/main.tsp` that mints no colliding name SHALL leave every previously minted name and identity byte-identical, which is the property that makes the exported surface of the four generated packages stable.

### Minted identities

- A minted type SHALL carry the identity `ix://agent-ix/semantic-core/<Name>`.
- A field SHALL carry the identity `ix://agent-ix/semantic-core/field/<Owner>.<name>`, where `<Owner>` is the owning type's name — declared or minted — and `<name>` is the JSON Schema property name verbatim, because `field.name` is the wire member name and an identity that transformed it would no longer locate the member.
- A variant SHALL carry the identity `ix://agent-ix/semantic-core/variant/<Owner>.<name>`, where `<name>` is the variant name assigned above.
- A constraint SHALL carry the identity `ix://agent-ix/semantic-core/constraint/<Owner>.<keyword>`, where `<keyword>` is the FR-029 keyword the constraint declares, so `DecimalPolicyPrecision` carries exactly `ix://agent-ix/semantic-core/constraint/DecimalPolicyPrecision.min` and `ix://agent-ix/semantic-core/constraint/DecimalPolicyPrecision.max`.
- Every emitted identity SHALL match `common.schema.json#/$defs/semanticIdentity`; a name or member that would produce a string outside that pattern SHALL be refused under FR-084 rather than escaped, transliterated, or truncated into one.
- Identities SHALL be unique within each list the IR carries, which is what the numeric suffix guarantees and what `agent-ix.semantic-ir.DUPLICATE_IDENTITY` reports where it does not hold.
- The `agent-ix/semantic-core` owner segment SHALL be the kernel package identity FR-084 records in the IR's `package.identity`, so a minted identity and the package block name the same package.

### Order

- The `types` array SHALL be ordered by type `identity` under code-point comparison, declared and minted types interleaved by that one order rather than declared types first.
- `fields`, `variants`, and `constraints` SHALL each be ordered by member `identity` under code-point comparison.
- Every comparison SHALL be by code point; no ordering SHALL use a locale-sensitive collation, so the document does not move with the host's ICU data.
- Two runs over the same bundle SHALL produce byte-identical IR, which is the observable form of every rule in this section.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-083-CON-1 | `mint.mjs` SHALL NOT read a file, a clock, an environment variable, or a network socket; the bundle is passed to it as parsed values by FR-082, so nothing about a mint can depend on where the process was run. | Determinism | Static |
| FR-083-CON-2 | Minting SHALL edit no file under `schema/**`, `fixtures/**`, `conformance/**`, `packages/semantic-core/**`, `src/compiler/backends/**`, `src/compiler/cli.mjs`, or `package.json`; the bundle and the published contract are read only, and a construct that cannot be named is a refusal under FR-084 rather than a schema widening. Its own artifacts are `src/compiler/frontend/json-schema/mint.mjs` with its `.d.mts`, the emitted `packages/semantic-kernel/semantic-ir.json`, `scripts/build-semantic-kernel.mjs`, and `test/semantic-kernel.test.ts`. | Non-disruption | Change-set diff |
| FR-083-CON-3 | A minted name SHALL be a pure function of the owning type name, the property name, and the canonical form of the subschema; no other input SHALL reach it. Asserted by minting the bundle with its documents supplied in reversed order and comparing the two mint tables byte for byte. | Determinism | Property |
| FR-083-CON-4 | Minting SHALL introduce no diagnostic code of its own; a construct it cannot name is reported by FR-084's register under a code that register already carries, so the two requirements do not both own a refusal vocabulary. | Integrity | Static |
| FR-083-CON-5 | The mint table SHALL be data rather than prose, carrying the owning document and JSON pointer for every entry, so a reviewer can recompute a name from the bundle without reading `mint.mjs`. | Traceability | Inspection |
| FR-083-CON-6 | `mintAll` SHALL NOT throw for any input the FR-082 lowering hands it, so a defect in the bundle is a returned refusal rather than a crash that leaves no mint table to inspect. | Safety | Fuzz |
| FR-083-CON-7 | A collision SHALL NOT be resolved by dropping either construct or by merging two distinct canonical forms into one type; both survive, and the later takes the suffix. | Correctness | Unit |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-083-AC-1 | Lowering the committed bundle mints `TypeRefTarget`, `MinConstraintKeyword`, `EnumValuesConstraintValuesItem`, `DefaultDeclValue`, and `DecimalPolicyPrecision`, each with the kind, scalar, constraints, and variants stated above, hand-checked against the owning document. | Test |
| FR-083-AC-2 | `TypeRefTarget` is a `union` with exactly two variants named `SemanticId` and `KernelScalar` whose `payloadType` members are the identities those two `$id`s lower to. | Unit |
| FR-083-AC-3 | `MinConstraintKeyword` is an `enum` with exactly one variant whose `name` is the string `min`, equal to the `const` in `MinConstraint.json`. | Unit |
| FR-083-AC-4 | `EnumValuesConstraintValuesItem` is a `union` over `String`, `Number`, and `Boolean`, and the owning `values` field carries `multiplicity.lower: 1` taken from `minItems`, with no `upper`. | Unit |
| FR-083-AC-5 | `DecimalPolicyPrecision` is a `scalar` of `integer` carrying exactly the constraints `ix://agent-ix/semantic-core/constraint/DecimalPolicyPrecision.min` with operand `1` and `.max` with operand `2147483647`. | Unit |
| FR-083-AC-6 | `Multiplicity.lower`, `Multiplicity.upper`, and `DecimalPolicy.scale` all carry the single `typeRef` `ix://agent-ix/semantic-core/DecimalPolicyScale`, and the mint table records all three positions against that one mint. | Test |
| FR-083-AC-7 | `DecimalPolicyPrecision` and `DecimalPolicyScale` are two distinct types, and a test that equalises their `minimum` values collapses them to one, proving the deduplication key reads the operand. | Unit |
| FR-083-AC-8 | A synthetic bundle whose property position would mint the declared name `TypeRef` mints `TypeRef2`; a third colliding shape mints `TypeRef3`; the declared `TypeRef` is unchanged. | Unit |
| FR-083-AC-9 | Minting the bundle with its documents supplied in reversed order, and again with every `anyOf` branch list reversed where reversal preserves the canonical form, yields a byte-identical mint table and a byte-identical `types` array. | Property |
| FR-083-AC-10 | Adding one synthetic declaration to a copy of the bundle changes no name, no identity, and no `typeRef` of any type the original bundle minted; only the new type's own entries appear in the diff. | Test |
| FR-083-AC-11 | Every minted identity matches `common.schema.json#/$defs/semanticIdentity`, and a synthetic enum member carrying a code point outside that pattern yields the FR-084 refusal rather than an escaped identity. | Test |
| FR-083-AC-12 | Every identity in `types`, and in each type's `fields`, `variants`, and `constraints`, is unique, and the whole document is admitted by `src/compiler/ir/reader.mjs` with no `agent-ix.semantic-ir.DUPLICATE_IDENTITY`. | Test |
| FR-083-AC-13 | `types` is ordered by `identity` and each member list is ordered by `identity`, both under code-point comparison; the suite re-run under `LC_ALL=tr_TR.UTF-8` and from a different working directory produces byte-identical output. | Integration |
| FR-083-AC-14 | `mint.mjs` matches none of `Date.now`, `new Date`, `process.env`, `process.cwd`, `node:fs`, `node:net`, `node:https`, `Math.random`, `createHash`, or `toLocaleUpperCase`, and spells no diagnostic code. | Static |
| FR-083-AC-15 | Over 256 mutated bundles `mintAll` returns a mint table or a refusal and never throws, and leaves its argument byte-unchanged. | Fuzz |
| FR-083-AC-16 | The exported type-name set of the generated TypeScript package, the `pub` item set of the generated Rust crate, the generated Pydantic class set, and the generated JSON Schema document basenames all carry every minted name, so the mint table and the four published surfaces agree in all four directions. | Integration |

## Dependencies

- **Upstream**: FR-082 (the lowering that hands `mint.mjs` its constructs and consumes its table), [FR-029](./FR-029-close-the-constraint-keyword-vocabulary.md) (the closed constraint keyword vocabulary a minted constraint identity names), [FR-048](./FR-048-build-and-verify-the-lock-and-fingerprint.md) (the canonicalization the deduplication key is taken over), [FR-050](./FR-050-validate-and-normalize-the-emitted-ir.md)
- **Downstream**: FR-084, FR-085, FR-086, FR-087, FR-088, FR-089, FR-090 — each of the four target packages exports the names this requirement computes, and the cross-language corpus compares instances keyed on them
- **Constrained by**: NFR-028, NFR-029, NFR-030
- **Verified by**: `test/semantic-kernel.test.ts`, driven through `scripts/build-semantic-kernel.mjs` and its `--check` verb
- **Read and never edited**: `packages/semantic-core/**` — including the 30 bundle documents and `kernel-scalars.json` — every document under `schema/semantic/v1/`, and everything under `fixtures/**` and `conformance/**`
