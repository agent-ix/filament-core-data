---
id: ADR-0002
title: "Own semantic compilation and generated packages in filament-core-data"
type: ADR
status: normative
---
# ADR-0002: Own semantic compilation and generated packages in filament-core-data

## Context

Quire is the generic typed-Markdown engine, Quoin distributes module contracts,
module repositories own vocabulary, and Filament applications own adapters.
Placing cross-language code generation in any of those components would mix
parser, catalog, domain, or application responsibilities.

## Decision

`filament-core-data` owns the semantic IR, small shared kernel,
package/profile/mapping contract, compatibility comparison, compiler, and Rust,
TypeScript, Python, JSON Schema, and later target emitters. Domain module
repositories own definitions and mappings. Quoin distributes them. Quire parses,
validates, extracts, and byte-splices Markdown. Consumers own framework and
persistence adapters.

Generated output uses a small `semantic-core` plus independently versioned module
packages. No generated semantic package depends on UI, ORM, Tauri, application
persistence, or migrations.

*Amendment (issue #35, 2026-09-03).* The "small shared kernel" this ADR
assigns to `filament-core-data` includes the semantic-core declaration grammar
(`packages/semantic-core/`, TypeSpec, official JSON Schema projection) whose
inventory is pinned in `packages/semantic-core/inventory.json`; module
repositories import it and keep their domain vocabulary in their own packages.

## Consequences

- Static native types and open dynamic modules can coexist.
- Compiler behavior has one implementation owner.
- Module owners approve semantic changes without owning generator internals.
- Consumer-specific concerns stay out of shared packages.
- Python receives ordinary typed output; decorators/custom `@` tags do not become
  the schema-authoring source.

## Alternatives considered

- **Generate in Quire:** rejected because it restores responsibilities beyond
  generic document parsing/validation and couples Quire to language toolchains.
- **Generate in Quoin:** rejected because distribution/workflows are not compiler
  ownership.
- **Generate independently in each application:** rejected because contracts and
  compatibility logic would drift.

## Compatibility

The current Avro generator and bindings remain untouched. Later tickets may
adapt them behind the same ownership boundary only after golden compatibility
passes.

## Supersession

Supersedes no prior decision. It preserves Quire's rendering-removal and generic
JSON behavior.
