---
id: ARCH-CONTRACTS-V1
title: "Semantic contract v1"
status: provisional
resolution_gate: "https://github.com/agent-ix/filament-core-data/issues/9"
---
# Semantic contract v1

This record specifies the portable data contracts proposed by issue #9. It is
executable and suitable for independent implementations. It remains provisional
on issue #9 until its IR fields are frozen. It does not implement a compiler,
publish a package, change a consumer, or alter the current Avro contract.

## Authority and layers

The v1 structural source is TypeSpec, per
[ADR-0005](adr/0005-typespec-structural-source.md). Package metadata, mappings,
build profiles, locks, and compatibility evidence are separate versioned inputs
because a structural type language cannot express all of their concerns. The
TypeSpec frontend normalizes the compiled program and these inputs into
`semantic-ir-v1`. The IR is the versioned compiler exchange boundary, not a
second authoring source. JSON Schema 2020-12 and Protobuf are official-emitter
projections of the TypeSpec source, never authoring sources.

Existing Avro remains a compatibility representation until its reader retirement
gate.
Markdown, JSON, database rows, Protobuf messages, Avro values, Arrow/Parquet
batches, CSV/TSV files, and generated language objects are representations or
projections selected for concrete boundaries.

```text
structural source + package + mappings + profile + lock
                         |
                    semantic IR
                         |
            target or representation contract
                         |
              output manifest + diagnostics
```

## Published schema inventory

All identifiers below are rooted at
`https://schemas.agent-ix.org/filament-core-data/v1/`.

| Schema | Contract |
|---|---|
| `common.schema.json` | SemVer, digests, identities, origins, extensions, diagnostics, and result states |
| `semantic-ir.schema.json` | Source-independent IR envelope, definitions, occurrences, types, fields, constraints, roles, and recursion |
| `package-manifest.schema.json` | Package identity/version, sources, imports, exports, named profiles, targets, and mappings |
| `package-lock.schema.json` | Exact transitive closure, content/source identities, canonicalization, and fingerprint |
| `mapping.schema.json` | Correspondences plus typed codec/lens/projection/extraction/rendering/aggregation/enrichment/materialization behavior |
| `profile.schema.json` | Authority, edit direction, round trip, unknown policy, omissions, enrichment, and lifetime |
| `representation.schema.json` | Markdown, JSON, PostgreSQL, Protobuf, Avro, Arrow/Parquet, CSV, and TSV refinements |
| `compiler-request.schema.json` | Locked compiler input and backend capability boundary |
| `output-manifest.schema.json` | Complete emitted-file inventory, result state, diagnostics, and normalized fingerprint |
| `target-contract.schema.json` | Rust, TypeScript, Python, and JSON Schema API/runtime expectations and backend qualification |
| `compatibility-report.schema.json` | Per-change and aggregate compatibility dispositions, consumers, evidence, and gates |
| `legacy-adapter.schema.json` | Explicit source/target versions, preservation, omissions, diagnostics, and retirement prerequisites |
| `consumer-policy.schema.json` | Dynamic/generated mode and preserve/reject/surface policy over one identity graph |

Positive, negative, compatibility, representation, Markdown, package-graph, and
legacy evidence is published under `fixtures/semantic/v1/`. A consumer can
validate it using only these files and a JSON Schema 2020-12 implementation.

## Semantic model

The closed structural vocabulary is scalar, record, enum, discriminated union,
alias/newtype, sequence, map, and semantic reference. Structural kind is
orthogonal to namespaced roles such as entity, event, observation, evidence, or
report. This lets one record carry several domain meanings without creating
different incompatible structural kinds.

Package, type, field, variant, constraint, occurrence, mapping, and profile
identities are explicit. Display names, generated identifiers, source paths,
documentation, timestamps, and database revisions never substitute for stable
semantic identity. Definitions and occurrences remain separate.

Fields independently encode required/optional presence, nullable/non-nullable
values, and no/semantic/representation/migration defaults. Constraints retain
their identity, keyword, operands, applicability, diagnostic, and origin.
Recursive references retain graph identity. Open and closed definitions declare
whether unknowns are preserved, rejected, or surfaced; unknowns never become a
known zero value.

## Packages, locks, and fingerprints

A package identity is opaque `owner/name`, independent of registry URL or
checkout path. Imports name compatible versions and required exports or
capabilities. Exports refer to stable semantic identities; profiles select
public exports, targets, mappings, options, and compatibility posture without
mutating definitions.

Locks resolve the complete dependency graph to exact versions, content digests,
source identities, and dependencies. Package cycles are rejected with every
locus. Recursive type graphs are preserved and are not package cycles.

The v1 fingerprint uses SHA-256 over a named
`RFC8785-JCS-with-identity-sorted-sets-v1` canonical byte form. It includes
schema bytes, manifest, mappings, profiles, resolved packages, and compiler
contract version. Object ordering and semantically-set ordering are normalized.
Source path, working directory, timestamp, hostname, and locale are excluded.
Every included semantic byte change changes the fingerprint; excluded ordering
does not.

## Mappings and profiles

Exports, targets, mappings, and profile options are independent selections.
Profiles declare authority, edit direction, round-trip level, unknown behavior,
allowed omissions, enrichment, and materialization lifetime. Preservation is
one of byte-lossless, structure-lossless, semantic-lossless, declared-lossy, or
one-way.

Transformation variants have distinct obligations:

- codecs define encoding/decoding behavior;
- lenses define get-put, put-get, and put-put laws plus conflict policy;
- projections and extractions define selected loci and declared omissions;
- renderings define presentation without claiming semantic authority;
- aggregations define grouping, window, ordering, late-data, and aggregate semantics;
- enrichments name external sources and preserve them in provenance;
- materializations name lifetime and external writes.

Every transform declares purity, determinism, reads, writes, failure states, and
retry idempotency. Pure transforms have no external effects. Declared loss lists
every omitted identity; undeclared loss fails.

## Representation profiles

The representation fixture catalog records required mapping fields, best-fit
uses, explicit non-uses, and compatibility methods. Markdown maps frontmatter,
headings, prose, tables, lists, fenced blocks, relationships, and extraction
loci, and distinguishes byte, structural, and semantic round trips. JSON names
media type, schema, discriminator, canonicalization, and unknown policy.

PostgreSQL profiles describe logical mapping and provenance only; physical DDL,
indexes, transactions, and migrations remain consumer-owned. Protobuf profiles
use explicit numbers and permanent reservations—declaration order assigns
nothing. Avro is explicitly a compatibility bridge. Arrow/Parquet declare order,
types, nullability, metadata, partitioning, and loss. CSV/TSV require an external
schema and forbid implicit type inference.

Protobuf, Arrow, and Parquet are presently unselected in the fixture catalog
because no accepted consuming boundary supplies their performance and
compatibility gate. Describing a format does not select it.

## Compiler and generated targets

The compiler request contains the complete locked IR, selected profile,
mappings, backend identity/version/features/options, and a relative output root.
The output manifest reconciles every emitted file to its digest, media type, and
semantic identities. Invalid, unsupported, or unavailable results emit zero
files and at least one diagnostic.

All adapters and backends share diagnostics with a stable namespaced code,
severity, message, owner, source locus, causal chain, related loci, and blocking
disposition. Unsupported features fail or use an explicitly approved lossy
target. They never degrade to `any`, generic maps, or empty models.

Rust exposes native structs, enums, newtypes, unions, Serde behavior, and
framework-neutral validation. TypeScript pairs static types with runtime
validation from the same lock. Python uses qualified generation for Pydantic v2
and standard dataclasses through a governed schema adapter; authored decorators
or custom `@` tags are not a schema language. Generated semantic packages
exclude UI, ORM, SQLAlchemy, Tauri, network clients, database migrations, and
application services.

Upstream generators are qualified first. Any retained Agent IX custom compiler
or code generator is a separately versioned reusable product licensed
AGPL-3.0-or-later, with its own conformance, release, ownership, security, and
incident gates. No such implementation is part of issue #9.

## Compatibility

Reports classify patch, additive, conditional, breaking, unknown, and invalid
changes across semantic, profile, mapping, representation, and generated-target
surfaces. Cross-target disagreement produces the most restrictive result and
names the disagreement. Unknown or stale consumers remain visible and prevent a
compatible promotion.

Required additions, removals, incompatible meaning/type changes, stable identity
changes, and unknown-policy tightening are breaking. Optional additions are
additive only when every target and known consumer preserves, ignores, or
surfaces them as declared. Open/closed enum behavior is consumer policy, not a
language default. Authority, edit direction, preservation, loss, provenance,
and lifetime changes may break an unchanged structural schema. Reuse of a
reserved Protobuf name or number is breaking and invalid.

## Dynamic and legacy consumers

Dynamic validation and finite generated exports share package, type, field,
profile, mapping, and fingerprint identities. Static consumers declare whether
unknown modules and extensions are preserved, rejected, or surfaced. Legacy
adapters name exact source and target versions, preservation, omissions,
diagnostics, and retirement prerequisites.

The retained Quoin manifest inventory and Avro bridge are compatibility
controls. Missing versions, imports, adapters, contradictory identities, and
unknown required capabilities fail with diagnostics and no empty-model success.
Quire retains document parsing/rendering; Quoin retains registry and install
policy; modules retain their domain contracts; the compiler compiles; consumers
retain application and persistence policy.

## Safety and reproducibility

Locked validation and future compilation are offline and deterministic. Paths,
timestamps, hostnames, locale, and map ordering are normalized or excluded.
Schemas, metadata, mappings, examples, options, names, and references are
untrusted. Implementations must prevent code execution, undeclared network
access, path/symlink escape, and writes outside a fresh output root. Graph depth,
reference expansion, collection sizes, input bytes, and diagnostic volume must
have declared finite limits and terminate with source-located diagnostics.

## Promotion boundary

Issue #9 may change requirements, these contract schemas, examples, fixtures,
tests, reviews, and plans. It may not implement a production compiler, publish
or enforce a package, change a catalog pin, migrate a database, alter a consumer,
rewrite Quoin manifests, change current Avro/generated bindings, or retire a
legacy path. Those actions remain separately ticketed and gated.

The structural-source decision is recorded: the owner selected TypeSpec on
[issue #4](https://github.com/agent-ix/filament-core-data/issues/4)
(2026-09-03, ADR-0005). This document remains provisional on issue #9 only for
its IR field set and must not trigger downstream adoption on its own.
