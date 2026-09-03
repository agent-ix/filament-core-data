---
id: ARCH-006
title: "Generated semantic package contract"
status: normative
---
# Generated semantic package contract

## Package topology

```text
semantic-core                small stable kernel
├── module: iso-spec         independently versioned vocabulary package
├── module: architecture     independently versioned vocabulary package
├── module: qa               independently versioned vocabulary package
└── module: <domain>         independently versioned project/domain package
```

Each module package declares its dependency on a compatible semantic-core
version and on other module packages it imports. A module version controls its
semantic type versions. The compiler version is recorded but does not replace
the package version.

## Package definition separates five concerns

| Concern | Question answered |
|---|---|
| Schema source | What semantic definitions and constraints are authoritative? |
| Package metadata | Who owns and versions this package, and what does it depend on? |
| Exports | Which semantic types are public? |
| Targets | Which Rust, TypeScript, Python, JSON Schema, wire, or analytical artifacts are generated? |
| Mappings/profiles | How do exported types appear in a target and which named build selects them? |

A configuration may choose outputs and mappings independently. “Generate
Python” selects a target. It does not declare the Markdown headings, database
columns, or Protobuf field numbers for the same type.

## Consumer surfaces

### Rust

- Native structs, enums, newtypes, and tagged unions.
- Serde-compatible serialization at profiles that select JSON or another Serde
  codec.
- Stable semantic IDs and version metadata without forcing every value into a
  generic JSON map.
- Optional validators and conversion traits that remain framework-neutral.

### TypeScript

- Static types and discriminated unions.
- Runtime validation helpers derived from JSON Schema rather than pretending
  erased TypeScript types validate input.
- ESM-compatible package exports and schema/profile metadata.

### Python

- Ordinary typed models, enums, and validation/conversion functions.
- Dataclasses or a lightweight runtime model may be emitted if the selected
  target proves suitable, but the schema author does not encode contracts in
  Python decorators or a custom `@` tag syntax.
- Type hints are generated from the accepted semantic definition, not scraped
  as the canonical source from application classes.

### JSON Schema

- Modular Draft 2020-12 schemas with stable `$id`, `$defs`, references, and
  explicit unknown-field behavior.
- Portable validation and exchange surface for dynamic tools and LLM workflows.
- Generated from the TypeSpec source by the official emitter; never an
  authoring source ([ADR-0005](adr/0005-typespec-structural-source.md)).

## Dependency exclusions

Generated semantic packages exclude UI, React, ORM, SQLAlchemy, Tauri,
application persistence, database migrations, web frameworks, network clients,
and deployment policy. A consumer-specific adapter package may depend on both a
semantic package and one of those frameworks; the semantic package may not
depend back on the adapter.

## Determinism and publication

Given the same accepted source, package metadata, profile, and compiler version,
generation must be byte-reproducible after normalized tool metadata. Published
packages include source and compiler digests and cross-language golden fixtures.
Exact registry names and publication mechanics remain provisional until their
own tickets and publication gate pass.

## Compatibility ownership

The module owner approves semantic changes. `filament-core-data` implements the
comparison and emitter rules. Package publishers prove generated outputs agree.
Consumers decide when to upgrade and own their adapters. No consumer can publish
a divergent package under the same semantic identity and version.
