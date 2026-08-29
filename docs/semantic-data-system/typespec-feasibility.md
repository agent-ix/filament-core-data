---
id: ARCH-009
title: "TypeSpec feasibility gate"
status: provisional
resolution_gate: "https://github.com/agent-ix/filament-core-data/issues/4"
---
# TypeSpec feasibility gate

TypeSpec is the preferred candidate for the package/type schema source because
it is designed for API/schema modeling and emitter composition. It is not an
accepted implementation dependency until issue #4 produces the evidence below.
The fallback is modular JSON Schema 2020-12 plus explicit package, export,
target, mapping, and profile metadata.

## Capability matrix

| Capability | Pass evidence | Failure disposition |
|---|---|---|
| Reusable packages and imports | Two independent module packages import a small semantic core without flattening identity/version ownership | Use modular JSON Schema `$id`/`$defs`/`$ref` and package manifests |
| Rust generation | Native Serde-compatible structs/enums preserve constraints and discriminated unions | JSON Schema-driven Rust emitter or explicit IR adapter |
| TypeScript generation | Static types and runtime validation agree on golden fixtures | JSON Schema types plus selected validator generation |
| Python generation | Ordinary typed models validate golden fixtures without authoring decorators/custom `@` tags | JSON Schema-driven typed-model emitter |
| JSON Schema 2020-12 | Stable `$id`, modular references, constraints, and unknown-field policy round-trip | Gate fails; fallback itself is not viable until corrected |
| Protobuf mapping | Stable field numbers/reservations can be declared outside language-specific source | Keep Protobuf as a separately mapped boundary artifact |
| Markdown metadata | Frontmatter, heading, prose, table, and extraction mappings survive without forcing renderer ownership into Quire | Keep mappings in module/profile metadata |
| Determinism | Repeated generation is byte-identical after normalized tool metadata | Reject toolchain for governed publication |
| Compatibility diff | Patch/additive/breaking examples classify consistently across targets | Keep compatibility classifier outside TypeSpec |
| Toolchain operation | Pinned, reproducible CLI/library integration works in CI and Rust-oriented orchestration | Adopt JSON Schema source and revisit later |

## Pass rule

The gate passes only if all P0 capabilities—package/import identity, four core
consumer surfaces, deterministic generation, and reproducible CI operation—pass
with checked-in fixtures. A partial pass may justify an emitter experiment but
does not make TypeSpec authoritative.

## Fail rule and fallback

If a P0 capability fails, TypeSpec remains a non-authoritative experiment. The
program adopts modular JSON Schema 2020-12 as schema source and stores the
non-JSON-Schema concerns in versioned package/profile/mapping metadata. The
semantic IR and emitter interfaces remain representation-independent so the
source choice can be revisited without rewriting consumers.

## Promotion

Issue #4 records tool versions, fixtures, command lines, failures, performance,
and a go/no-go recommendation. A human review promotes
[ADR-0004](adr/0004-conditional-typespec-source.md) to normative or records the
fallback decision. Until then, no compiler or module migration may require
TypeSpec inputs.
