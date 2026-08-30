# Filament contract inventory

The authoritative machine-readable inventory is [inventory.json](./inventory.json).
It contains 24 independently owned contract surfaces and explicitly enumerates
the types within each surface.

## Coverage by repository

| Repository | Contract surfaces | Main observations |
|---|---|---|
| `filament-core-data` | Avro, generated TypeScript/Python, JSON fixtures, explicit Protobuf and Arrow/Parquet absences | Avro is a compatibility contract; structured fields are often JSON strings; Python generation yields dictionaries/validation rather than classes |
| `filament-domain-events` | 21 strict Pydantic domain types | Broadest Python semantic vocabulary; UUID/tenant model differs from Avro project-string records and lacks universal transform provenance |
| `filament-core-service` | 16 SQLModel/PostgreSQL entities plus unenveloped BaseModel event publication | Persistence is database-authoritative; defaults/nullability exist in both Python and SQL; event version/identity/consumer contract is incomplete |
| `filament-parser-lib` | Loader graph refs, extraction DSL/registry, legacy parsed ISO objects | Compatibility branch delegates Tier 2 to Quire; legacy output is lossy and lacks uniform source loci |
| `filament-ide-rs` | Extraction DTOs, persistence rows/migrations, service DTOs, NDJSON envelopes, generated TS bindings | Most typed and operationally complete stack, but it is application-specific and duplicates shared Document/Artifact/Graph/ObjectType concepts |
| `quire-rs` | Extraction DSL/results, immutable corpus API, compiled open registry | Correct parser/extractor boundary; Markdown bytes remain authoritative for authored knowledge while extracted views are derived |
| `quoin` | Ten pinned default modules and CLI/config schema | Strong distribution provenance; module schemas remain dynamic and their full type-fit review belongs to `quoin#288` |
| `quire-corpus` | Complete-graph truth-set contract | Strong identity/version/provenance and explicit `not-computed`; it tests graph producers rather than defining runtime business entities |

## Representation coverage

All required families have a disposition. Avro, Python/Pydantic, SQLModel/SQL,
Rust/Serde/Specta, generated TypeScript, JSON fixtures, NDJSON, Quire extraction,
module catalog, and governed corpus are present. Protobuf and Arrow/Parquet are
explicitly missing: they remain best-fit future projections, not implicit gaps
that may be treated as empty implementations.

## Cross-cutting inventory findings

- `Document`, `Artifact`, `ObjectType`, `GraphNode`, and `GraphEdge` recur in at
  least four contract families with different identity, nullability, and dynamic
  JSON boundaries.
- Versioning is mostly package/migration based. Only selected extraction/backend
  paths carry explicit runtime version information.
- Provenance is strongest in Quire/quire-corpus and the Rust extraction/index
  pipeline; it is incomplete across Avro records, Python domain entities, and
  generic event publication.
- Database and service DTOs are valid representation-local contracts; they are
  not automatically candidates to become the shared semantic schema.
