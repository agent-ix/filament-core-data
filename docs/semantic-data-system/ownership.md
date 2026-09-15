---
id: ARCH-004
title: "Repository and subsystem ownership boundaries"
status: normative
---
# Repository and subsystem ownership boundaries

| Owner | Owns | Does not own |
|---|---|---|
| `filament-core-data` | Semantic IR, shared kernel, package/profile/mapping contracts, compatibility comparison, compiler and emitters in later tickets | Domain vocabulary content, application persistence policy, UI, ORM, or migration behavior |
| Quire | Parse, validate, extract, address, and byte-splice typed Markdown using module-provided contracts | Template rendering, schema-package publication, cross-language generation, application policy, registry sourcing |
| Quoin | Module catalog, locks, installation, update, skills, workflows, and authoring-contract discovery | Parser semantics, runtime domain persistence, compiler implementation, or application adapters |
| Module repositories | Domain vocabulary, constraints, archetypes, skeletons, mappings, examples, and module versions | Shared compiler implementation or consumer persistence policy |
| Filament consumers | Application adapters, API/IPC projections, ORM and PostgreSQL mappings, UI presentation, runtime state, and migrations | Independent competing definitions of shared semantic contracts |

## Dependency direction

```text
domain modules ──definitions/mappings──> filament-core-data compiler contract
       │                                      │
       └──catalog distribution via Quoin      ├──generated semantic packages
                                              └──schemas/profiles
typed Markdown ──parse/validate/extract via Quire──> consumer adapters
generated packages ──consume──> Filament applications and services
```

Quire and the future compiler may share JSON Schema vocabulary and common
semantic kernel types, but neither calls into consumer UI, ORM, database, or
Tauri code. Consumers depend on versioned generated packages and mappings;
generated packages never depend on consumers.

## Boundary consequences

- Direct Markdown authoring remains intact. A schema compiler does not restore a
  template-rendering feature to Quire.
- Quire may expose generic JSON values for open runtime archetypes. That does not
  prevent finite domain packages from exposing native Rust structs and enums.
- Quoin distributes a module; it does not become authoritative for the domain
  vocabulary inside that module.
- A consumer may add an adapter field or storage index. It may not silently fork
  a shared type with the same semantic identity.
- Compiler, publication, and migrations remain separate tickets with their own
  evidence and promotion gates.

## Current compatibility baseline

The former Avro protocol and checked-in TypeScript/Python bindings were retired
at the repository boundary after issue #6's final reader census and owner
approval. This repository now publishes no Avro contract surface.
