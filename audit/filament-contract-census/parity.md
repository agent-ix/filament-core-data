# Filament contract parity and conflict analysis

The machine-readable authorities are [parity.json](./parity.json),
[conflicts.json](./conflicts.json), and
[missing-contracts.json](./missing-contracts.json).

## Overall disposition

The current types are not broadly “bad.” They are mostly valid contracts for
their own planes, but repeated names conceal materially different identity,
authority, lifecycle, optionality, and provenance. The correct target is shared
semantic kernels plus explicit projection mappings—not one universal DTO or wire
format.

| Concept family | Disposition | Why |
|---|---|---|
| Avro → generated TypeScript/Python/fixtures | `fit` | One source and passing compatibility fixtures; Python output is less ergonomic but wire-valid |
| Document/Artifact/ObjectType/Graph across domain, DB, extraction, service, UI | `split-required` | Same nouns span different planes and identity scopes; unification needs kernel identity plus mappings |
| Domain event publication | `fit-with-extension` | Local publisher works, but lacks versioned event identity/provenance and known consumers |
| Python parser adapter over Quire | `fit-with-extension` | Correct ownership direction; exact adapter mapping is not generated or versioned independently |
| Module DSL/registry/catalog/config | `split-required` | Deliberate ownership split needs one manifest/package contract, not a new Quire responsibility |
| Legacy `spec_parser_lib` parsed models | `replacement-candidate` | Explicitly frozen, lossy, incomplete provenance; retain until consumer/parity gate |
| Rust DB migrations | `representation-local` | Physical schema is database-owned and should not become semantic authority |
| NDJSON backend transport | `representation-local` | Well suited to current local daemon/client boundary; Protobuf is optional future fit, not a prerequisite |
| `quire-corpus` truth set | `fit` | Strong identity, revision, provenance, positives/controls, and explicit not-computed states |
| Protobuf | `missing` | No concrete interface currently requires it |
| Arrow/Parquet QA projection | `missing` | Useful after run/result/evidence contracts stabilize |

## Field-level example: Document

| Dimension | Avro `CoreDocumentRecord` | Python `Document` / SQLModel | Rust extraction/persistence | Consequence |
|---|---|---|---|---|
| Identity | `id`, `projectId`, `relPath` strings | UUID `id`, tenant/container/physical-repo UUIDs, `path`, `commit_sha` | frontmatter identity plus application row/ref IDs | Requires explicit semantic definition/occurrence and repository identity mapping |
| Frontmatter | `frontmatterJson: string` | `dict[str, Any]` / JSON column | structured JSON value | Avro round-trip is syntactic JSON; schema-aware field access is lost |
| AST | nullable JSON string | optional dict/JSON | representation-specific | Cannot claim field parity without parsing/normalization profile |
| Kind | closed `CoreArtifactKind` | optional/open `doc_kind` string | module/archetype-derived open type | Closed/open vocabulary mismatch |
| Version/provenance | content hash, optional updated time | commit SHA, content hash, created/updated | extractor version and metadata | No common provenance envelope yet |

## Field-level example: Graph

Python domain/persistence graph nodes use UUID identity plus
`object_type_id`, `object_type_name`, tenant/container, optional document and
artifact UUIDs, a required `name`, and structured `data`. Avro uses string IDs,
project IDs, refs, and `dataJson`; Rust service/extraction has both canonical
graph objects and purpose-specific response nodes. These are comparable but not
equivalent. The conflict is real corpus/design work, not evidence that one
definition should overwrite the others.

## Existing dynamic-schema work

`filament-core-service#1` through `#4` are retained as the existing implementation
ledger. This audit does not duplicate them. Their eventual disposition must be
reconciled with `filament-core-data#9` and `quoin#293`.
