# @agent-ix/semantic-schema

JSON Schema (draft 2020-12) documents for the filament-core-data semantic
package contract v1. Data only: no build step and no runtime dependency.

## Contents

The documents live under `semantic/v1/`:

- `module-manifest.schema.json`: the filament module manifest, including its
  optional `semantic` block.
- `module-semantic-block.schema.json`: the `semantic` block of a module manifest.
- `package-manifest.schema.json`, `output-manifest.schema.json`,
  `compiler-request.schema.json`, `target-contract.schema.json`,
  `mapping.schema.json`, `profile.schema.json`, `representation.schema.json`,
  `consumer-policy.schema.json`, `compatibility-report.schema.json`,
  `semantic-ir.schema.json`, and `common.schema.json`: the other contract
  documents.
- `construct-vocabulary.json`: the construct vocabulary.

## Install

```sh
npm install @agent-ix/semantic-schema
```

## Versions and `$id` paths

The package version is independent of the schema identifiers. Each document's
`$id` has the form
`https://schemas.agent-ix.org/filament-core-data/v1/<file>`; the `v1` segment is
the contract version and does not change with the package version.

## License

AGPL-3.0-or-later.

## Repository

https://github.com/agent-ix/filament-core-data (directory `schema`)
