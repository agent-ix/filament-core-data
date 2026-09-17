---
id: ARCH-IR-COMPATIBILITY-POLICY
title: "Semantic IR compatibility policy"
status: normative
---
# Semantic IR compatibility policy

Generated in part by `scripts/build-compiler-docs.mjs`; the disposition rank and
the added-node list are read from the code, and a test fails when they disagree.

## What may change within contract major version 1

1. A revision **may add an optional member**.
2. A revision **may widen a closed vocabulary**.
3. A revision **may not remove or retype a member**.
4. A revision **may not narrow a vocabulary**.

A revision that breaks rule 3 or rule 4 is classified `breaking` by
`diffSemanticContract`, whatever its version number says.

## How the three versions live in one file

`schema/semantic/v1/semantic-ir.schema.json` accepts `1.0.0`, `1.1.0`, and `2.0.0`
and discriminates on `contractVersion`. That is issue #34's decision, recorded
here rather than taken here: this policy cites the schema, and this repository's
compiler ticket changes no byte of it.

Contract `1.1.0` adds exactly these nodes:

- `field.multiplicity`
- `field.unit`
- `typeDefinition.relationships`
- `typeDefinition.operations`
- `typeDefinition.clauses`
- `constraint.keyword (closed)`
- `source.dialect (frontend)`

Contract `2.0.0` adds the scalar `any`, authored field presence, the model
members (`supertypes`, `abstract`, `subsets`, `redefines`, operation `frame`,
`requires`, `ensures`, document `populations`), module construct kinds
`{module, name}` declared as module data, and the `constructs` table that
carries each used kind's declaration
([ADR-0011](adr/0011-domain-packages-construct-kinds-are-module-data.md)). The `1.1.0` → `2.0.0` revision is additive: a `2.0.0`
document may carry every `1.1.0` node, and a `1.1.0` document carrying a
`2.0.0` node is refused.

A version uplift is classified `additive` when — and only when — projecting the
new document back to the old version reproduces the old document byte for byte.
Counting each materialised member as its own change would classify the very
revision the contract declares additive as breaking.

## Projections

`readIrAsContract(document, targetVersion, { dialect })` projects a document
between the declared versions.

- Projecting **down** to `1.0.0` drops every `1.1.0`-only member and returns
  every dropped identity in `loss`. A projection that dropped them silently
  would let a `1.0.0` consumer believe it had the whole contract.
- Projecting **up** to `1.1.0` or `2.0.0` derives each field's multiplicity from its
  presence and requires the caller to declare the frontend dialect, because the
  schema forbids the `1.0.0` constant on a `1.1.0` document and no rule can
  recover which frontend produced it. Without one the projection is refused with
  `agent-ix.compiler.MISSING_TARGET_DIALECT`.
- Projecting to the document's own version returns it unchanged.
- Projecting to any other version is refused with
  `agent-ix.compiler.UNKNOWN_CONTRACT_VERSION`.

A projection carries `source.digest` and the whole `package` block verbatim: it
is a view of a compile's output, not a new compile.

## Disposition rank

Least restrictive to most. An aggregate is the most restrictive entry, and an
entry with per-target results is the most restrictive of those.

1. `patch`
2. `additive`
3. `conditional`
4. `unknown`
5. `breaking`
6. `invalid`

## Absent inputs

Several families are not visible in an IR document at all — a profile's
authority, a mapping's edit direction, a reserved Protobuf number, a generated
name, the constraint vocabulary itself. Each arrives as a declared input, and
when an input is absent **the family is omitted and named in `requiredGates`**.
An absent input is a gap, never a `patch`: reporting "no change" for something
the diff could not look at is how a breaking release gets promoted.
