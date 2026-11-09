# @agent-ix/semantic-core

The semantic-core L3 declaration grammar and kernel scalar library, published as
TypeSpec source plus the JSON Schema documents generated from it.

## Contents

- `main.tsp`: the TypeSpec source (namespace `AgentIx.Semantic.Core`) defining
  the declaration grammar: multiplicities, type references, field, relation and
  operation declarations, constraints, defaults, and the kernel scalar set.
- `generated/json-schema/`: one JSON Schema (draft 2020-12) document per
  declaration, emitted from `main.tsp` with `@typespec/json-schema`. Do not edit
  these by hand; they are regenerated from the TypeSpec source.
- `kernel-scalars.json`: the kernel scalar representation table.
- `inventory.json`: the declaration inventory of the namespace.
- `lowering.json`: the table mapping each grammar property to its IR property.

## Install

```sh
npm install @agent-ix/semantic-core
```

`@typespec/compiler` and `@typespec/json-schema` (1.15.0) are peer dependencies,
needed only if you compile `main.tsp` yourself. The generated JSON Schema files
need no build step.

## Versions and `$id` paths

Every generated schema `$id` and `$ref` is rooted at
`https://schemas.agent-ix.org/semantic-core/<version>/`, where `<version>` is
the version of this package. A release therefore changes the schema identifiers
together with the package version.

## License

AGPL-3.0-or-later.

## Repository

https://github.com/agent-ix/filament-core-data (directory `packages/semantic-core`)
