---
id: NFR-029
title: "Portable, dependency-free semantic kernel packages"
type: NFR
quality_attribute: portability
relationships:
  - target: "ix://agent-ix/filament-core-data/US-014"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-085"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-086"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-087"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-088"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-089"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-090"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/NFR-009"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-014"
    type: "depends_on"
---
# [NFR-029] Portable, dependency-free semantic kernel packages

## Statement

Each generated kernel package SHALL carry the declaration grammar, the kernel
scalar library, and nothing else — no persistence layer, no object-relational
mapper, no Tauri, no user-interface framework, no application package, and no
network transport — so that any program in its language can depend on the kernel
without inheriting a stack.

## Scope

- Applies to: the emitted TypeScript package, the emitted Rust crate, the
  emitted Python package, the modular JSON Schema bundle, and the consumer
  examples of [FR-089](../functional/FR-089-provide-independent-consumer-examples.md).
- Applies to the **transitive** dependency closure of each, not to its direct
  dependency list. A single direct dependency that pulls a framework two levels
  down breaches this requirement exactly as a direct one would.
- Not applied to: this repository's own development toolchain, which is where
  the generators, the type checkers, and the test harnesses legitimately live.

## Rationale

`packages/semantic-core/main.tsp` declares a grammar and a scalar library:
twenty-one models, one union, four enums, four scalars, and no domain
vocabulary, which is what
[NFR-014](./NFR-014-small-kernel-discipline.md) already requires of the source.
A generated package that widens that is no longer the kernel — it is the kernel
plus whatever the generator's ecosystem considered normal, and the next consumer
inherits both.

The failure this prevents is specific and it has a shape. A generated type
acquires a decorator so that some ORM can persist it; the decorator brings a
runtime; the runtime brings a version constraint; and a program that only wanted
to name a `FieldDecl` now cannot build without a database driver. At that point
the kernel has stopped being a shared vocabulary and has become a framework
choice imposed on every consumer, which is the outcome
[NFR-009](./NFR-009-cross-language-semantic-parity.md) exists to avoid on the
parity side and this requirement on the portability side.

Two properties follow from the same principle and are stated here rather than
left implicit.

The first is the **static export surface**. Every type the kernel declares is a
statically analysable export, so a consumer that imports one type bundles one
type. Dynamic values — the identity map, the constraint descriptors, the
provenance metadata — remain reachable, but through an explicit, validated API
rather than by reflection over the package. That is the acceptance criterion
issue #11 states as "finite static exports while dynamic values remain available
through an explicit validated API", and the TypeScript backend's
`identity.ts`/`provenance.ts` split already implements it.

The second is **runtime validation without a runtime dependency**. Each package
validates untrusted input against the contract using code it carries, not a
third-party validator resolved at run time. `#22`'s committed `typescript` target
row declares a `runtime-schema-validator` dependency it does not have, and
`FR-063-CON-2` already records that the generated in-package validator is
strictly stronger than the declaration; the kernel packages inherit that
strength.

The licence position is not decoration either. Everything original is
AGPL-3.0-only. `serde` is the Rust crate's only third-party dependency, pinned
exactly. `datamodel-code-generator` is MIT, pinned at `0.76.0`, attributed in the
emitted `PROVENANCE.json`, and is a **build-time** dependency that appears in no
emitted package's closure.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| Persistence, ORM, Tauri, UI-framework or application packages in any emitted package's transitive closure | 0 | 0 | Dependency-closure test |
| Third-party runtime dependencies of the emitted TypeScript package | 0 | 0 | Dependency-closure test |
| Third-party runtime dependencies of the emitted Rust crate | 1 (`serde`, pinned exactly) | 1 | Dependency-closure test |
| Third-party runtime dependencies of the emitted Python package beyond the declared Pydantic pin | 0 | 0 | Dependency-closure test |
| Network or filesystem access performed by an emitted package at run time | 0 | 0 | Instrumented run |
| `$ref`s in the JSON Schema bundle that do not resolve inside the bundle | 0 | 0 | Offline resolution test |
| Emitted source files without an AGPL-3.0-only declaration | 0 | 0 | Licence inspection |
| Unpinned or unattributed third-party dependencies | 0 | 0 | Licence inspection |
| Kernel type names absent from the package's static export surface | 0 | 0 | Export-set test |
| Dynamic contract values reachable other than through the declared validated API | 0 | 0 | Analysis |

## Verification

Resolve each emitted package's transitive dependency closure with its own
language's tooling and assert the closure against a declared deny list of
persistence, ORM, Tauri, UI-framework, and application package names, plus a
positive assertion of the exact permitted set. Import each package under an
instrumented runtime and assert no socket is opened and no file is read.
Resolve every `$ref` in the JSON Schema bundle with the network disabled.
Compare each package's export surface with the kernel inventory in both
directions, so a missing type and an unexpected one each fail. Inspect every
emitted file for the licence header and every dependency for a pin and an
attribution.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| NFR-029-AC-1 | The transitive dependency closure of each emitted package contains no persistence layer, ORM, Tauri, UI framework, application package, or network transport, asserted per language against its own resolver rather than against a hand-listed direct dependency set. | Test |
| NFR-029-AC-2 | The emitted TypeScript package resolves zero third-party runtime dependencies, and its validator is code the package carries. | Test |
| NFR-029-AC-3 | The emitted Rust crate's closure is exactly `serde` at its pinned version, and the pin is exact rather than a range. | Test |
| NFR-029-AC-4 | The emitted Python package's closure adds nothing beyond the declared Pydantic pin, and `datamodel-code-generator` appears in no runtime closure. | Test |
| NFR-029-AC-5 | Importing each emitted package under an instrumented runtime opens no socket and reads no file. | Test |
| NFR-029-AC-6 | Every `$ref` in the modular JSON Schema bundle resolves inside the bundle with the network disabled. | Test |
| NFR-029-AC-7 | Each package's static export surface equals the kernel's declared type set plus the minted types, checked in both directions so a missing export and an unexpected one each fail. | Unit |
| NFR-029-AC-8 | Every contract value that is not a type — identity, constraints, provenance, occurrence data — is reachable through the declared validated API and through no other route, and a consumer that imports a single type does not pull the whole descriptor table into its bundle. | Analysis |
| NFR-029-AC-9 | Every emitted source file and every emitted package manifest declares AGPL-3.0-only, and every third-party dependency is pinned, licence-compatible, and attributed in the package's own provenance. | Static |
| NFR-029-AC-10 | Each consumer example of [FR-089](../functional/FR-089-provide-independent-consumer-examples.md) satisfies the same closure assertion as the package it consumes, so an example cannot demonstrate portability while depending on a framework. | Test |

## Dependencies

- **Upstream**: [NFR-009](./NFR-009-cross-language-semantic-parity.md),
  [NFR-014](./NFR-014-small-kernel-discipline.md)
- **Downstream**: the publication gate `agent-ix/quoin#290`
- **Constrains**: [FR-085](../functional/FR-085-generate-the-kernel-typescript-package.md) through [FR-090](../functional/FR-090-prove-cross-language-agreement.md)
