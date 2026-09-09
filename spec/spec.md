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

The eleventh delivery is the semantic kernel packages (issue #11): the issue #35
declaration grammar and kernel scalar library, lowered from its official JSON
Schema projection to one semantic IR v1.1 document and generated into native
Rust, TypeScript, and Python packages beside the modular JSON Schema bundle, with
independent consumer examples and a cross-language agreement measurement. It
generates every package and publishes none of them: publication passes
`agent-ix/quoin#290`, a human sign-off that has not been given.

The twelfth delivery is the spec-bundle extraction frontend (issue #36): a
Rust workspace member that reads a repository's spec bundle through the Quire
extraction contract (`agent-ix/quire-rs#388`) in-process, resolves every type
token to a declared artifact, enumeration, kernel scalar, or an explicit
failure state, and lowers the result to one semantic IR v1.1 document — a
domain package `ix://<org>/<repo>` — byte-deterministically, validated at
lift time by the independent Rust reader, with source-located diagnostics,
provenance-tracked read-only fixtures, and structural (not byte) parity
against the TypeSpec frontend on a shared case authored in both dialects.

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
- The generation backend seam keyed on the published target vocabulary, and the
  TypeScript backend behind it: the type projection, the ESM package and its
  export surface, the generated runtime validators, the identity and fingerprint
  metadata, the backend's own IR admissibility reader, its canonical form and
  compatibility classification, the `generate` command, and the
  `typescript-backend` conformance adapter that answers the issue #20 oracle.
- The Rust/Serde generation backend under `src/compiler/backends/rust-serde/`:
  the published IR-to-Rust mapping table, stable identifier derivation, crate
  emission with a finite static export surface and an explicit dynamic
  extension surface, constraint enforcement at the construction and
  deserialization boundary, and a closed `agent-ix.rust-backend.*` diagnostic
  registry that refuses unsupported constructs rather than degrading them.
- The decision procedure for ECMA-262 patterns an RE2-family engine cannot
  compile, and the proved hand-written validator that resolves GAP-002 for the
  published `sourceLocus.path` pattern with a differential equivalence harness.
- The `rust-backend` conformance adapter, its independent Rust semantic-IR
  reader, and the compile-time and runtime consumers built from the packaged
  crate artifact, with determinism, rustfmt, MSRV, branch-register, and
  mutation evidence.
- The pinned Python generation toolchain and its advisory floor, the immutable
  per-family target profiles, the owned schema-preparation pass and refusal
  guards, the sandboxed generator runner, the generated-source inspection, the
  per-family qualification verdicts and retained-gap register, and the generated
  package layout with its provenance, examples, static checking, and runtime
  validation — none of it published.
- The semantic kernel bundle declaration, the JSON Schema 2020-12 lowering to one
  semantic IR v1.1 kernel document, the minting rules that give an anonymous
  schema construct a stable name, the declared representability-loss register,
  the generated Rust, TypeScript, and Python kernel packages and the modular JSON
  Schema index beside them, independent per-language consumer examples, and the
  cross-language agreement measurement over a shared golden corpus of kernel
  instances.
- The spec-bundle extraction frontend: bundle and module loading through
  quire-rs, the closed type-token resolver, the lowering of field, enumeration,
  frontmatter-relationship, operation, and clause declarations to IR v1.1,
  package identity and provenance minting, the
  `agent-ix.extraction-frontend.*` diagnostic registry, lift-time validation
  and canonical bytes through `crates/semantic-ir`, the fingerprint sidecar,
  provenance-tracked fixtures with goldens and negatives, the structural
  shared-case parity gate, and the `extraction-frontend` command line with its
  Make targets — all under exact Rust 1.98.1 and AGPL-3.0-only, none of it
  published.

### 2.2 Out of Scope

- An IR-reading `json-schema` generation backend; the target is delegated to the
  upstream TypeSpec emitter (ADR-0005) and a domain package cannot reach it, so
  issue #36's fifth acceptance criterion is carried as a declared gap under
  issue #85.
- Re-authoring any corpus repository's artifacts into the typed-table form;
  `config-service` FR-006 is consumed as the provenance-tracked re-authoring
  quire-rs vendors, and the live file is a read-only negative control.
- Ruling issues #77, #78, #67, or #61; each requirement that touches one states
  the reading it takes and cites the issue, the owner rules them, and a ruling
  that contradicts a reading re-cuts the affected goldens as one deliberate
  commit under FR-098-CON-2.
- Cross-package imports in a domain package; a domain package has no lock to
  resolve an import against, so an imported or foreign type token is refused
  with `IMPORT_UNSUPPORTED` rather than lowered.
- Extracting `## Relationships` body lists; quire-rs exposes no located
  per-document edge extraction, so this delivery lowers relationships from
  frontmatter `relationships:` edges only and the body-list form waits on
  `agent-ix/quire-rs#418`.
- Wiring the Rust binary into the node-side `spec-bundle` seam
  (`src/compiler/frontend/spec-bundle/frontend.mjs`), which stays
  `FRONTEND_NOT_IMPLEMENTED` under this delivery; that bridge is issue #86.

- Publishing any kernel package to npm, crates.io, or a Python index, adding one
  to a packed manifest surface, or pushing a release tag. Publication passes
  `agent-ix/quoin#290` and is not part of issue #11; issue #11 generates,
  verifies, and records the publication step as blocked.
- Repairing a representability limit of semantic IR v1.1 by widening a closed
  vocabulary in `schema/**`, or repairing a defect in the issue #21, #22, or #23
  backends inside issue #11; each is recorded against its own owner.
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
  Wiring the corpus `python-backend` adapter slot, whose owning issue is #23:
  the slot needs an IR reader that emits contract diagnostics, which a package
  of generated types cannot produce, so issue #23 delivers a read-only advisory
  account, leaves the slot `unavailable` and its rows unmet, and files that
  reader as its own ticket. Deciding GAP-011, which couples in through the
  corpus's `reference`-target cases and is recorded as a disposition.
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
- Wiring the spec-bundle extraction frontend into the issue #19 node seam
  (issue #86); issue #19 registers the dialect as declared-unimplemented and
  issue #36 delivers the frontend as a Rust workspace member beside it.
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
- Publishing the generated TypeScript package to any registry, adding it to this
  repository's `exports`, `files`, or dependency blocks, or moving a CLI,
  backend, or React consumer onto it, as part of issue #22; publication remains
  issue #11 behind the `agent-ix/quoin#290` sign-off.
- Generating a Rust or a Python package as part of issue #22; those are issues
  #21 and #23, which own the sibling adapter slots.
- Editing any conformance case, base, oracle module, harness module, threshold,
  defect row, gap row, or mutation row as part of issue #22; a disagreement
  between the backend and the oracle is registered as a divergence with an owner
  and a verdict, never absorbed by moving the yardstick.
- Deciding the unresolved-`reference` question recorded as
  `conformance/contract-gaps.json` GAP-011 as part of issue #22; the backend
  adopts the corpus's published reading as a single declared policy constant and
  records the dependency on issue #9, which owns the contract.
- Rewriting the frozen issue #4 TypeScript backend or regenerating its golden as
  part of issue #22; the contract-IR backend is a second backend beside it.
- Adding a dependency to `package.json`, `pnpm-lock.yaml`, `pyproject.toml`, or
  `poetry.lock` as part of issue #22 — including a bundler, a property-test
  generator, or a runtime validator; every gate this ticket declares is met with
  what those files already carry, or the gate is restated so that it can be.
- Registering a divergence in `conformance/divergences.json` as part of issue
  #22; a suppressed divergence counts as a matched case, so a disagreement this
  ticket cannot close is reported and left failing for the owner rather than
  absorbed.
- Narrowing a backend's declared `supportedFeatures`, or declaring a corpus case
  `unsupportedBy` this backend, to reduce the set of cases it must answer;
  the declared coverage is not the implementer's to shrink.
- Accepting a `conformance/thresholds.json` row, which stays `proposed` until the
  issue #11 publication gate acts on it.
- Publishing any crate, adding a crate to a registry, or moving any downstream
  Rust consumer as part of issue #21; publication passes the issue #7
  cross-language gate and the release-readiness gate, neither of which has
  moved.
- The TypeScript (issue #22) and Python (issue #23) backends; issue #21 answers
  the same mapping questions only for Rust and shares no generated code with
  them.
- Deciding GAP-011, the unstated resolution rule for a `reference` kind's
  target; issue #21 records the dependency, adopts the corpus oracle's reading
  for its adapter, and leaves the contract decision to issue #9.
- Changing the published schemas, fixtures, or any conformance artefact other
  than the `rust-backend` slot of `conformance/adapters/registry.json`, which
  the corpus itself declares is the owning issue's to supply.
- The ecosystem-wide property, fuzz, mutation, and adversarial testing program
  (issue #25); issue #21 covers only its own mapping branches.

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
| User | [US-001](./usecase/US-001-understand-data-authority.md) through [US-011](./usecase/US-011-consume-semantic-contracts-in-rust.md) | Reader, implementer, migration-review, tool-selection, schema-author, module-author, module-maintainer, compiler-maintainer, package-author, and Rust-consumer outcomes |
| Functional | [FR-001](./functional/FR-001-indexed-architecture-record.md) through [FR-062](./functional/FR-062-cover-every-mapping-branch.md) | Architecture, census, feasibility, semantic IR, package, mapping, generation, compatibility, IR v1.1 declaration, semantic-core grammar, prototype-promotion, compiler-core, and Rust/Serde backend behavior |
| Non-functional | [NFR-001](./non-functional/NFR-001-traceable-record.md) through [NFR-023](./non-functional/NFR-023-non-disruptive-rust-backend.md) | Traceability, readability, reproducibility, isolation, evidence honesty, parity, security, portability, non-disruption, additive revision, kernel discipline, deterministic promoted compilation, rollback, bounded and safe compilation, compiler-core non-disruption, and hermetic deterministic Rust generation |
| User | [US-001](./usecase/US-001-understand-data-authority.md) through [US-013](./usecase/US-013-generate-governed-python-types.md) | Reader, implementer, migration-review, tool-selection, schema-author, module-author, module-maintainer, compiler-maintainer, package-author, and Python-consumer outcomes |
| Functional | [FR-001](./functional/FR-001-indexed-architecture-record.md) through [FR-080](./functional/FR-080-type-check-and-validate-generated-python.md) | Architecture, census, feasibility, semantic IR, package, mapping, generation, compatibility, IR v1.1 declaration, semantic-core grammar, prototype-promotion, compiler-core, and qualified Python generation behavior |
| Non-functional | [NFR-001](./non-functional/NFR-001-traceable-record.md) through [NFR-027](./non-functional/NFR-027-reproducible-non-disruptive-python-generation.md) | Traceability, readability, reproducibility, isolation, evidence honesty, parity, security, portability, non-disruption, additive revision, kernel discipline, deterministic promoted compilation, rollback, bounded and safe compilation, compiler-core non-disruption, sandboxed Python generation, and reproducible non-disruptive Python generation |
| User | [US-001](./usecase/US-001-understand-data-authority.md) through [US-014](./usecase/US-014-consume-the-semantic-kernel-natively.md) | Reader, implementer, migration-review, tool-selection, schema-author, module-author, module-maintainer, compiler-maintainer, package-author, Rust-consumer, TypeScript-consumer, Python-consumer, and semantic-kernel-consumer outcomes |
| Functional | [FR-001](./functional/FR-001-indexed-architecture-record.md) through [FR-090](./functional/FR-090-prove-cross-language-agreement.md) | Architecture, census, feasibility, semantic IR, package, mapping, generation, compatibility, IR v1.1 declaration, semantic-core grammar, prototype-promotion, compiler-core, Rust/Serde, TypeScript, qualified Python generation, and semantic kernel packaging behavior |
| Non-functional | [NFR-001](./non-functional/NFR-001-traceable-record.md) through [NFR-030](./non-functional/NFR-030-non-disruptive-kernel-packaging.md) | Traceability, readability, reproducibility, isolation, evidence honesty, parity, security, portability, non-disruption, additive revision, kernel discipline, deterministic and hermetic kernel generation, portable dependency-free kernel packages, and non-disruptive kernel packaging behind the publication gate |
| User | [US-001](./usecase/US-001-understand-data-authority.md) through [US-015](./usecase/US-015-lift-a-spec-bundle-into-a-domain-package.md) | Reader, implementer, migration-review, tool-selection, schema-author, module-author, module-maintainer, compiler-maintainer, package-author, Rust-consumer, TypeScript-consumer, Python-consumer, semantic-kernel-consumer, and domain-author outcomes |
| Functional | [FR-001](./functional/FR-001-indexed-architecture-record.md) through [FR-099](./functional/FR-099-provide-the-extraction-frontend-command-line.md) | Architecture, census, feasibility, semantic IR, package, mapping, generation, compatibility, IR v1.1 declaration, semantic-core grammar, prototype-promotion, compiler-core, Rust/Serde, TypeScript, qualified Python generation, semantic kernel packaging, and spec-bundle extraction frontend behavior |
| Non-functional | [NFR-001](./non-functional/NFR-001-traceable-record.md) through [NFR-033](./non-functional/NFR-033-qualified-toolchain-and-licensed-dependencies.md) | Traceability, readability, reproducibility, isolation, evidence honesty, parity, security, portability, non-disruption, additive revision, kernel discipline, deterministic and hermetic kernel generation, portable dependency-free kernel packages, non-disruptive kernel packaging, deterministic and hermetic lifting, non-disruptive extraction frontend, and qualified toolchain and licensed dependencies |

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
