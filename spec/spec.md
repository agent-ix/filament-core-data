---
type: master-requirements
name: filament-core-data
org: agent-ix
component_type: schema-library
tags:
  - semantic-data
  - schemas
  - rust
  - typescript
  - python
  - markdown
implementation_language: multi-language
depends_on: []
relationships:
  - target: "ix://agent-ix/quire-rs/spec"
    type: "depends_on"
    cardinality: "1:1"
  - target: "ix://agent-ix/quoin/spec"
    type: "depends_on"
    cardinality: "1:1"
standards_alignment:
  - iso-iec-ieee-29148
  - ieee-828
title: "Master Requirements Specification"
---
# Master Requirements Specification
## filament-core-data semantic data architecture

## 1. Purpose

This specification governs the durable architecture record and pre-migration
contract evidence for the Agent IX semantic data system. The record defines how
semantic data, authored knowledge, runtime state, generated language types,
storage formats, wire formats, and presentation forms relate without treating
any one representation as universal.

The first delivery governed by this specification is documentation-only. It
records accepted principles, provisional decisions, ownership boundaries, and
the evidence gates that later compiler and migration tickets must satisfy.

The second delivery is a read-only, revision-pinned census of current Filament
contracts. It records source facts, parity, conflicts, impact, uncertainty, and
active-work overlap without changing the measured systems.

The third delivery is an isolated, unpublished TypeSpec feasibility experiment.
It compiles one representative semantic slice through official and custom emitter
paths, exercises ordinary native consumers, and produces retained evidence for a
human schema-source decision.

The fourth delivery is the versioned semantic IR, package, mapping, profile,
compatibility, and generated-target contract. Its structural source is TypeSpec
(ADR-0005); the contract itself remains provisional on issue #9 until its IR
fields are frozen.

The fifth delivery is semantic IR v1.1 (issue #34): an additive revision that
adds field multiplicity and units, first-class relationships, operations, and
opaque formal clauses, a closed constraint vocabulary, and binds the source
dialect and manifest targets to their contracts, so Wave 4 module declarations
are representable without loss.

The sixth delivery is the semantic-core declaration grammar and kernel scalar
library (issue #35): TypeSpec models every Quire object module imports, their
official JSON Schema projection, and a zero-loss lowering to IR v1.1.

The seventh delivery is the promotion of the issue #4 prototype emitters into
`src/` (issue #27): the semantic-IR emitter, the TypeScript and Rust generation
backends, and the governed Python JSON Schema adapter become owned, tested,
deterministic repository code behind one narrow build interface, while the spike
stays frozen, non-canonical, and reproducible.

The eighth delivery is the TypeSpec frontend and the versioned semantic IR
compiler core (issue #19): one frontend seam, a TypeSpec lowering to contract IR
`1.1.0`, package/import/export/profile/target resolution with locks, fingerprints
and cycle diagnostics, a stable source-located diagnostic registry, a normalized
serialization, an inspect command, and a compatibility-diff and schema-evolution
API — all of it deterministic, bounded against untrusted input, and landed
without publishing a package or moving a consumer.

The ninth delivery is the semantic conformance corpus and its independent
differential oracle (issue #20): contract-derived cases, an oracle that decides
them without reading any implementation under test, and a harness that judges
every declared Rust, TypeScript, and Python implementation against that oracle
rather than against one another.

The tenth delivery is the qualified Python generation route (issue #23): the
established `datamodel-code-generator` is pinned above both published advisory
floors and measured, family by family, against a construct-isolating
qualification corpus and the published v1 schemas; the repository owns only the
schema preparation, the refusal guards, the sandboxed runner, the
generated-source inspection, and the layout, and records every retained gap
rather than acquiring a hand-written Python generator.

## 2. Scope

### 2.1 In Scope

- An indexed architecture document bundle under `docs/semantic-data-system/`.
- Accepted decisions for concern-specific authority, generated-package
  ownership, and best-fit representations.
- TypeSpec as the structural schema source (ADR-0005), with JSON Schema and
  Protobuf as generated projections.
- The semantic metamodel, data planes, package model, representation mappings,
  compatibility policy, review method, and staged roadmap at design-record
  fidelity.
- Explicit ownership boundaries among `filament-core-data`, Quire, Quoin,
  module repositories, and downstream Filament consumers.
- Compatibility dispositions for existing Quire architectural decisions.
- A source-cited inventory of Filament schemas, DTOs, database entities, wire
  payloads, generated bindings, JSON-lines records, and Quire extraction contracts.
- Field-level parity, conflict, missing-contract, and repository impact evidence
  pinned to inspected revisions.
- A validated contract-census SpecReview that preserves unknown and
  low-confidence findings.
- A pinned TypeSpec vertical slice covering package identity, core semantic
  objects, events, verification evidence, recursion, extensions, optionality,
  nullability, versioning, and deprecation.
- Experimental JSON Schema, Protobuf, semantic IR, Rust, TypeScript, Python,
  Arrow, and Markdown outputs with compile, golden, diagnostic, determinism,
  compatibility, and maintenance-cost evidence.
- A recommendation that applies the ADR pass rule as written and leaves the
  decision to the owner.
- A complete source-independent semantic IR and type-system contract.
- Versioned package/import/export/profile/lock and fingerprint contracts.
- Representation mapping and transformation contracts for Markdown, JSON,
  PostgreSQL, Protobuf, Avro, Arrow, Parquet, CSV, and TSV.
- Generated Rust, TypeScript, Python, and JSON Schema target contracts without
  selecting an unqualified implementation backend.
- Cross-target compatibility, determinism, portability, security, legacy bridge,
  dynamic-module, and non-disruption requirements.
- IR v1.1 node shapes for multiplicity, units, relationships, operations,
  clauses, and typed constraints, with golden and negative fixtures.
- The semantic-core L3 declaration grammar and kernel scalar library in
  TypeSpec under `packages/semantic-core/`, its emitted JSON Schema, and its
  lowering table to IR v1.1.
- The promoted semantic-IR emitter, TypeScript and Rust generation backends, and
  Python JSON Schema adapter under `src/compiler/`, with a written disposition
  for every issue #4 prototype component and a frozen spike that still replays.
- The frontend seam and its dialect registry, the TypeSpec semantic decorator
  library, and the lowering from a compiled TypeSpec program to contract semantic
  IR `1.1.0`.
- Package graph resolution, lock building and verification, the v1 fingerprint
  canonicalization, and exact source loci for JSON inputs.
- The closed compiler diagnostic registry, its published document, and the
  deterministic diagnostic ordering and limits.
- The compiler-side IR reader, the normalized serialization and IR fingerprint,
  the `compile`, `inspect`, and `diff` commands, and the compatibility-diff and
  IR schema-evolution projections with their goldens and published policy.
- A versioned semantic conformance corpus under `conformance/` with positive,
  negative, boundary, and evolution cases per IR construct and compatibility
  rule, contract-cited provenance, and minimization rules.
- An independent JSON-level semantic oracle, a differential harness with a
  declared adapter registry and divergence register, coverage accounting,
  promotion thresholds, and a downstream fixture import API.
- The pinned Python generation toolchain and its advisory floor, the immutable
  per-family target profiles, the owned schema-preparation pass and refusal
  guards, the sandboxed generator runner, the generated-source inspection, the
  per-family qualification verdicts and retained-gap register, and the generated
  package layout with its provenance, examples, static checking, and runtime
  validation — none of it published.

### 2.2 Out of Scope

- Implementing the production semantic compiler or production emitter framework;
  issue #4 may implement only an isolated disposable experimental emitter, and
  issue #27 may only promote that prototype without changing its output — the
  production compiler is issue #19.
- Generating, publishing, or consuming new Rust, TypeScript, or Python packages.
- Changing Avro, database, API, Tauri, Protobuf, Arrow, Parquet, or Markdown
  runtime behavior.
- Modifying Quire parsing, validation, extraction, or byte-splice behavior.
- Modifying Quoin catalog installation or module enforcement.
- Migrating persisted data, rewriting the corpus, or removing legacy contracts.
- Self-promoting or self-rejecting a schema source from the spike; the decision
  is the owner's.
- Correcting any contract finding while the issue #10 census is being collected.
- Approving consumer, database, wire-format, package, enforcement, or retirement
  changes from audit recommendations alone.
- Implementing or publishing the production compiler, custom codegen, generated
  packages, module-manifest adoption, or consumer migrations as part of issue #9.
- Parsing, normalizing, or typechecking formal clause text in the IR; clause
  semantics belong to the formal-clause frontends (`agent-ix/quire-contract-ir#52`).
- Editing any corpus repository for issue #34; config-service FR-006 is a
  read-only worked example.
- Changing the frozen TypeSpec spike or any backend as part of issue #34.
- Module vocabulary (entity, endpoint, process, requirement, …) in the
  semantic-core kernel; publishing `@agent-ix/semantic-core` (issue #11);
  a custom emitter for issue #35.
- Publishing the generated Python package to PyPI or migrating any backend
  consumer onto it; both wait on the issue #23 safety gate. Introducing a
  hand-written Python code generator, absent a reviewed P0 qualification gap.
  Wiring the corpus `python-backend` adapter slot, which is issue #52 and is
  blocked on GAP-011.
- Revising the emitted semantic-IR shape, generating or publishing a Rust,
  TypeScript, or Python package, or moving any consumer as part of issue #27;
  those belong to issues #19, #21, #22, #23, and #11.
- Building the independent conformance corpus and oracle (issue #20); issues #27
  and #19 neither read nor edit it, because that independence is the point. The
  three-way IR reader agreement issue #19 stands up is a drift guard inside this
  repository's own tests, not a substitute for that corpus.
- Adding a public `./compiler` package export, a runtime dependency for the
  promoted compiler, or a supported `datamodel-code-generator` invocation;
  those belong to issues #11 and #23.
- Repairing the retained issue #4 evidence's host couplings (issue #42); issue
  #27 records them and fixes only the lockfile seeding, which changes no
  retained byte.
- Implementing the spec-bundle extraction frontend (issue #36); issue #19 builds
  the seam and the shared fixture harness it will plug into, and registers the
  dialect as declared-unimplemented.
- Editing the frozen prototype path or regenerating the four issue #4 goldens as
  part of issue #19; the contract IR is a second lowering beside the prototype,
  not a rewrite of it.
- Publishing a language package, adding a public compiler export, generating a
  Rust, TypeScript, or Python package, or moving any consumer as part of issue
  #19; those remain issues #11, #21, #22, and #23.
- Emitting a target or representation from the compiler; issue #19 stops at the
  IR, its lock, its diagnostics, and its compatibility report.
- Implementing, fixing, or repairing any compiler, frontend, or backend the
  conformance corpus judges (issues #19, #21, #22, #23, #27); the corpus
  records a divergence rather than repairing the implementation that causes it.
- Wiring the corpus's `compiler-frontend` adapter to the issue #19 compiler as
  part of issue #20; that connection is its own ticket, so that neither side
  assumes the other owns it.
- Publishing the corpus as its own package, moving it to a corpus repository,
  or adding it to the published package's `exports` or `files`, as part of
  issue #20; enlarging the published surface belongs to the issue #11 gate.
- Cross-language generated-package serialization and deserialization parity,
  which has no package to serialize until issues #21, #22, and #23 ship; the
  corpus records it as an unmet coverage area with those owners.

## 3. System Overview

### 3.1 Semantic-first model

The architecture separates semantic meaning from its representations. Concrete
domain types remain directly usable; the system is not a generic entity-attribute-
value store and does not require one universal runtime envelope.

### 3.2 Concern-specific authority

Authority is assigned by concern:

- Human- and agent-authored durable knowledge is authoritative in typed Markdown.
- Transactional and operational state is authoritative in its owning database or
  event store.
- Interface payloads conform to versioned schema packages.
- Analytical datasets are derived and retain transformation provenance.
- Generated language types and validation schemas are derived from the accepted
  schema source and package metadata.

### 3.3 Architectural planes

- **Meta plane** — packages, type definitions, mappings, profiles, and
  compatibility policy.
- **Definition plane** — specifications, architecture, policy, plans, and other
  authored knowledge.
- **Execution and observation plane** — runs, results, evidence, events,
  incidents, and measurements.
- **Presentation plane** — documents, reports, UI views, tables, exports, and
  LLM-oriented text.

## 4. Ownership Boundaries

| Owner | Responsibility | Explicit non-responsibility |
|---|---|---|
| `filament-core-data` | Semantic IR, shared kernel, package/projection contracts, the promoted prototype compiler under `src/compiler/` (issue #27), the production compiler in issue #19 | Domain vocabulary ownership and application persistence policy |
| Quire | Parse, validate, extract, and byte-splice typed Markdown | Cross-language generation, template rendering, application policy, registry sourcing |
| Quoin | Module catalog, locks, installation, skills, and workflows | Runtime domain persistence and compiler ownership |
| Module repositories | Domain vocabulary, constraints, skeletons, mappings, examples, and module versions | Shared compiler implementation |
| Filament consumers | Application adapters, persistence mappings, API/IPC projections, and migrations | Independent competing definitions of shared contracts |

## 5. Requirements Architecture

| Class | Artifacts | Purpose |
|---|---|---|
| Stakeholder | [StR-001](./stakeholder/StR-001-durable-semantic-data-governance.md) | Durable governance need |
| User | [US-001](./usecase/US-001-understand-data-authority.md) through [US-013](./usecase/US-013-generate-governed-python-types.md) | Reader, implementer, migration-review, tool-selection, schema-author, module-author, module-maintainer, compiler-maintainer, package-author, and Python-consumer outcomes |
| Functional | [FR-001](./functional/FR-001-indexed-architecture-record.md) through [FR-080](./functional/FR-080-type-check-and-validate-generated-python.md) | Architecture, census, feasibility, semantic IR, package, mapping, generation, compatibility, IR v1.1 declaration, semantic-core grammar, prototype-promotion, compiler-core, and qualified Python generation behavior |
| Non-functional | [NFR-001](./non-functional/NFR-001-traceable-record.md) through [NFR-027](./non-functional/NFR-027-reproducible-non-disruptive-python-generation.md) | Traceability, readability, reproducibility, isolation, evidence honesty, parity, security, portability, non-disruption, additive revision, kernel discipline, deterministic promoted compilation, rollback, bounded and safe compilation, compiler-core non-disruption, sandboxed Python generation, and reproducible non-disruptive Python generation |

## 6. Decision Status Model

- **Normative** content is accepted and governs later work until superseded.
- **Provisional** content is a candidate whose named evidence gate has not passed.
- **Informative** content explains context and carries no requirement.
- **Historical** content records a retired decision and is normative of nothing.

The architecture principles and the TypeSpec source decision (ADR-0005) are
normative. Exact metamodel fields, generated package registry names, and
individual migration dispositions remain provisional until their owning tickets
pass.

## 7. Verification Strategy

- Quire validation checks requirement and process-artifact structure.
- Link and inventory checks prove the record is navigable and complete.
- Inspection checks ownership, status labeling, and conflict dispositions.
- The Test Matrix maps every acceptance criterion to an explicit verification
  case before this ticket enters specification review.
- Machine-readable census artifacts are schema-validated and checked for stable
  identifiers, resolvable evidence loci, deterministic ordering, and complete
  dispositions.
- TypeSpec feasibility uses pinned compilation, native consumer builds, shared
  golden fixtures, invalid-source diagnostics, clean-run fingerprints,
  compatibility examples, and an independent evidence review.

## 8. Program Relationships

- Project 17 program epic: `agent-ix/filament-core-data#3`.
- Project 18 companion epic: `agent-ix/quoin#286`.
- Architecture companion: `agent-ix/quoin#289`.
- TypeSpec feasibility and source decision: `agent-ix/filament-core-data#4`
  (resolved; ADR-0005).
- Corpus reviews: `agent-ix/filament-core-data#10` and `agent-ix/quoin#288`.

## 9. Change Management

Changes to normative principles require an ADR that identifies affected
requirements, compatibility consequences, and superseded decisions. Provisional
content becomes normative only through its named gate. Historical material must
remain clearly fenced from current architecture.

## 10. References

- ISO/IEC/IEEE 29148 — Requirements engineering.
- IEEE 828 — Configuration management.
- Quire ADR 0004 — rendering/template removal and direct Markdown authoring.
- `filament-core-data` issue #3 — semantic data platform program epic.
- `quoin` issue #286 — semantic module contracts program epic.
