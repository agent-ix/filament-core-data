---
id: ADR-0004
title: "Use TypeSpec conditionally as the schema source"
type: ADR
status: provisional
resolution_gate: "https://github.com/agent-ix/filament-core-data/issues/4"
---
# ADR-0004: Use TypeSpec conditionally as the schema source

## Context

The schema source must support modular semantic packages and reliable Rust,
TypeScript, Python, and JSON Schema consumer surfaces while leaving mappings and
representation selection explicit. TypeSpec is promising but its emitter and
tooling fit for this exact multi-language system is unproven.

## Provisional decision

Prefer TypeSpec only if the [feasibility gate](../typespec-feasibility.md) passes
all P0 capabilities with reproducible checked-in evidence. Until then, TypeSpec
is exploratory and no downstream contract may require it.

If the gate fails, use modular JSON Schema 2020-12 as the schema source, with
versioned package/export/target/mapping/profile metadata for concerns JSON Schema
does not express. Keep the semantic IR independent enough that this fallback
does not change consumer contracts.

## Consequences

- Tool enthusiasm cannot bypass empirical cross-language evidence.
- JSON Schema remains a generated surface in either outcome and the fallback
  authoring source in the failure outcome.
- Protobuf numbers, Markdown mappings, SQL mappings, and analytical profiles are
  not assumed to emerge implicitly from language decorators.
- Compiler implementation waits for the recorded decision.

## Alternatives considered

- **Adopt TypeSpec immediately:** rejected because emitter completeness,
  determinism, versioning, and Rust/Python fit are unproven.
- **Adopt Avro as the new universal source:** rejected because the program needs
  broader schema, mapping, document, and package concerns.
- **Use Python decorators:** rejected because they make one consumer language an
  ambiguous authoring authority and complicate Rust/TypeScript parity.

## Compatibility

Neither outcome changes the current Avro contract until bridges, golden fixtures,
consumer readiness, and final cutover pass.

## Supersession and promotion

This decision is provisional, supersedes nothing, and is resolved only by
[filament-core-data#4](https://github.com/agent-ix/filament-core-data/issues/4).
Promotion records the exact evidence and accepted source; failure records the
JSON Schema 2020-12 fallback as normative.
