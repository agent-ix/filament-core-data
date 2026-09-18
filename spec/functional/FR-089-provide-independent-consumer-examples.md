---
id: FR-089
title: "Provide independent per-language consumer examples"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-014"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-085"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-086"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-087"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-028"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-029"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-030"
    type: "constrained_by"
---
# [FR-089] Provide independent per-language consumer examples

## Description

Each emitted kernel package SHALL be proven usable by one ordinary consumer
written the way a consumer outside this repository would write it — importing
the package through its declared public surface, never reaching into a private
module, never importing the generator that produced it — and that consumer SHALL
be executed by this repository's own suite rather than merely compiled, so that
"the kernel generates" and "the kernel is usable" remain two separate pieces of
evidence, as [FR-061](./FR-061-consume-the-generated-crate.md) already requires
of the issue #21 crate.

An example that builds and asserts nothing is a vacuous pass. It is the failure
this requirement exists to prevent, because a package that compiles is not a
package that carries the kernel: a generator can emit thirty syntactically valid
modules whose member names, presence rules, and identity metadata are all wrong,
and every one of them will compile.

## Inputs

- The generated kernel TypeScript package of [FR-085](./FR-085-generate-the-kernel-typescript-package.md)
  at `packages/semantic-kernel/typescript/`
- The generated kernel Rust crate of [FR-086](./FR-086-generate-the-kernel-rust-crate.md)
  at `packages/semantic-kernel/rust/`
- The generated kernel Python package of [FR-087](./FR-087-generate-the-kernel-python-package.md)
  at `packages/semantic-kernel/python/`
- `packages/semantic-core/inventory.json`, the exact declaration inventory of
  `AgentIx.Semantic.Core`: twenty-one models, one union (`ConstraintDecl`), four
  enums (`KernelScalar`, `EdgeCategory`, `ConstraintKeyword`, `DefaultKind`),
  and four scalars — the thirty declarations each package must have carried
- The thirty JSON Schema 2020-12 documents under
  `packages/semantic-core/generated/json-schema/`, from which the golden kernel
  instance documents this requirement deserializes are authored
- The shared golden corpus of kernel instance documents that
  [FR-090](./FR-090-prove-cross-language-agreement.md) declares under
  `packages/semantic-kernel/parity/golden/`; this requirement consumes it from
  one language at a time and never compares languages, which is FR-090's
  obligation
- The identity and provenance surfaces each package already emits: the validated
  dynamic `identity.ts` and `provenance.ts` API of the TypeScript backend, the
  provenance constants of the Rust crate that
  `crates/consumer-runtime/src/lib.rs` reads through
  `agent_ix_conformance::provenance::PACKAGE_IDENTITY`, and the `PROVENANCE.json`
  content fingerprint [FR-079](./FR-079-emit-the-python-package-layout.md)
  requires of every emitted Python package
- The two existing independent consumers read as the shape to match:
  `crates/consumer-compile-time/`, `crates/consumer-runtime/`, and
  `python_backend/examples/`

## Outputs

- `crates/kernel-consumer/`: the Rust consumer of the generated kernel crate,
  excluded from the root `Cargo.toml` workspace and carrying its own empty
  `[workspace]` table and `publish = false`, as
  `crates/consumer-runtime/Cargo.toml` does
- `packages/semantic-kernel/examples/typescript/`: an ESM consumer of the kernel
  TypeScript package, plus its assertions
- `packages/semantic-kernel/examples/python/`: a consumer module of the kernel
  Python package, following the `python_backend/examples/` precedent
- `packages/semantic-kernel/examples/README.md`: what each example demonstrates,
  which package it consumes, and which `make` target executes it
- `packages/semantic-kernel/examples/closures.json`: the measured dependency
  closure of each example — every package the example resolves, transitively,
  with its version — written by the run rather than by hand

## Behavior

### One example per emitted package

- This requirement SHALL provide exactly three examples: one for the TypeScript
  package, one for the Rust crate, and one for the Python package.
- This requirement SHALL provide no example for the modular JSON Schema artifact
  of [FR-088](./FR-088-ship-the-modular-kernel-json-schema.md), because that
  artifact has no language runtime to import it through; its consumption is
  evidenced by the schema-validation path of FR-088 itself.
- Each example SHALL be an independent unit of its own language's build — its
  own crate, its own module, its own entry file — so that removing the generated
  package makes the example fail rather than makes it disappear.

### Consumption from the packaged artifact

- `crates/kernel-consumer/` SHALL be excluded from the root `Cargo.toml`
  workspace, SHALL be built against the **unpacked** `cargo package` artifact of
  the generated kernel crate in a scratch directory, and SHALL declare no `path`
  dependency resolving outside that scratch directory. This is the
  [FR-061](./FR-061-consume-the-generated-crate.md) precedent applied to the
  kernel, and it is the whole point of the arrangement: a build that only works
  in place is a failure rather than a convenience, because it proves the
  generator's working tree consumable and says nothing about the artifact a
  consumer would receive.
- The packaging step SHALL be exactly `cargo package --offline --no-verify`, and
  SHALL pass no `--registry`, no `--index`, and no publish `--dry-run`, because
  a dry-run publish still contacts an index.
- The TypeScript and Python examples SHALL likewise import their packages by the
  package's declared entry point rather than by a relative path into the
  generator's output tree, so that the surface under test is the surface a
  consumer resolves.

### What each example demonstrates

Each of the three examples SHALL demonstrate all five of the following, and a
run that omits any one of them SHALL fail:

- **Import a kernel type.** The example SHALL import at least `FieldDecl`,
  `TypeRef`, `Multiplicity`, `RelationDecl`, `OperationDecl`, `ClauseRef`,
  `ConstraintDecl`, and `KernelScalar` by the names the package exports them
  under, so that a rename in the generator is a failure here and not a silent
  API break for a downstream reader.
- **Construct a valid value.** The example SHALL construct a `FieldDecl` in the
  language's own idiom — a literal satisfying the emitted type in TypeScript, a
  struct expression in Rust, a model constructor in Python — carrying a
  `multiplicity`, because contract version `2.0.0` requires `multiplicity` on
  every field and a constructed value that omits it is not a kernel value.
- **Deserialize a golden document.** The example SHALL deserialize at least one
  positive kernel instance document from
  `packages/semantic-kernel/parity/golden/` into the imported types and assert
  the member values it carries, rather than asserting only that deserialization
  did not throw.
- **Reject a document the contract forbids.** The example SHALL be refused at
  least one negative document per class the kernel grammar closes: an undeclared
  member on a `reject` record, a member absent that `multiplicity.lower >= 1`
  makes required, a `KernelScalar` variant outside the closed enum, a
  `ConstraintDecl` variant whose discriminant names no declared keyword, and a
  value violating a `pattern` or a `minimum`/`maximum` bound. The example SHALL
  name the error the rejection carries, as
  `python_backend/examples/pydantic_v2_basemodel.py` does by returning the
  `ValidationError` text, so that a package that rejects everything for the
  wrong reason does not read as a pass.
- **Read the identity and provenance metadata.** The example SHALL read the
  package's own semantic identity, the source version, and the source
  fingerprint back out of the package, and assert them equal to the values
  recorded for the kernel bundle. A package whose metadata says it was generated
  from something else is a package no consumer can trace, and that is exactly
  what this assertion catches.

### Public surface only

- Each example SHALL import the package only through the entry point the package
  declares — the `exports` map for the TypeScript package, the crate root for
  the Rust crate, the package `__init__` and its `__all__` for the Python
  package.
- No example SHALL import a module by a deep path the package's declared surface
  does not expose, and no example SHALL read a file inside the package
  directory to reach a value the surface does not export.
- No example SHALL import anything under `src/compiler/`, anything under
  `python_backend/`, or anything under `packages/semantic-core/scripts/`. An
  example that reaches into the generator is not an independent consumer; it is
  a second test of the generator wearing a consumer's name.
- No example SHALL import `conformance/oracle/index.mjs`. The oracle decides
  whether a corpus judgement is right; an example that consulted it would be
  grading itself against the same reasoning it is meant to test independently.
- Where the Python package's `__init__.py` excludes a name from `__all__`
  because two modules declare it, as FR-079 requires for the seven measured
  collisions, the example SHALL reach that type as `<module>.<Name>` and SHALL
  NOT reintroduce the excluded name by any other route.

### The dependency closure

- The measured, transitive dependency closure of each example SHALL contain no
  persistence package, no Tauri package, no user-interface or component
  framework, no ORM, and no application framework.
- The closure SHALL be measured from the resolved lock the example builds
  against — `Cargo.lock` for the Rust example, the pnpm lock entry for the
  TypeScript example, and the resolved environment for the Python example — and
  written to `packages/semantic-kernel/examples/closures.json` by the run, so
  that the assertion is over what actually resolved and not over what a manifest
  declared it would.
- Each example SHALL declare, beyond the generated package it consumes, only its
  language's serialization front door: `serde_json` at a pinned exact version as
  a `[dev-dependencies]` entry for the Rust example, following
  `crates/consumer-runtime/Cargo.toml`; the standard `JSON` global and no
  dependency at all for the TypeScript example; and `pydantic` — the family
  runtime the generated package already requires — and the standard library for
  the Python example.
- The generated kernel packages themselves SHALL gain no dependency from this
  requirement. An example is a consumer; a consumer cannot add to what it
  consumes.

### Execution, and the vacuous pass

- Every example SHALL be executed by this repository's own suite: the TypeScript
  example under `make test-node`, the Python example under `make test-python`,
  and the Rust example under `make rust-test`. An example that is compiled,
  linted, or type-checked but never run is not executed within the meaning of
  this requirement.
- An example SHALL fail its run by a non-zero exit rather than by printing a
  message, so that a broken example is a red gate and never stale documentation
  — the property `python_backend/examples/__init__.py` already states for the
  FR-079 examples.
- Each example SHALL make at least one assertion per demonstration named above,
  and the run SHALL count the assertions each example executed and fail an
  example whose executed-assertion count is zero for any of the five.
- A negative demonstration SHALL fail if the forbidden document is accepted.
  Asserting that a rejection merely occurred somewhere in the example is not
  sufficient; each forbidden class is asserted on its own, as
  [FR-061](./FR-061-consume-the-generated-crate.md) requires of the eight
  invalid classes under `crates/consumer-runtime/fixtures/invalid/`.
- No example SHALL be marked skipped, expected-to-fail, or conditionally
  disabled to obtain a green run. Where a package cannot yet carry an example,
  the absence is recorded against the issue that owns the blockage and the
  criterion fails until that issue moves.

### The recorded blockage

- The TypeScript example's strict type-check criterion SHALL be recorded as
  blocked on `agent-ix/filament-core-data#22`, because a generated package
  containing a zero-field record emits `const declared = [];` in `validators.ts`
  and fails `tsc --strict` with TS7034/TS7005, and the kernel reaches that
  record through the `JsonObject` lowering the unconstrained `DefaultDecl.value`
  produces.
- This requirement SHALL NOT add the generated kernel package to the
  `exclude` list of `tsconfig.json`, and SHALL NOT relax `strict`, to obtain a
  clean type-check. Excluding the package would hide the defect in the exact
  artifact the example exists to exercise.
- This requirement SHALL NOT repair the stale
  `test/fixtures/rust-serde/goldens/**` and `test/fixtures/rust-serde/digests.json`
  that make `make rust-check` red, recorded against
  `agent-ix/filament-core-data#21`; the Rust example is executed by
  `make rust-test` and its result is reported separately from that red gate
  rather than being used to declare it green.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-089-CON-1 | Each example SHALL import its generated package by that package's public surface only — nothing under `src/compiler/`, nothing under `python_backend/`, nothing under `packages/semantic-core/scripts/`, nothing under `conformance/oracle/`, no package-internal module reached by a deep path, and no file read inside the package directory to obtain a value the surface does not export. An example that reaches into the generator is not an independent consumer. | Integrity | Static analysis |
| FR-089-CON-2 | The measured transitive closure of each example SHALL contain no persistence, Tauri, user-interface, ORM, or application-framework package, asserted against `packages/semantic-kernel/examples/closures.json` as the run wrote it and never against a hand-maintained list of declared dependencies. | Portability | Dependency-closure test |
| FR-089-CON-3 | An example that executes zero assertions for any one of the five demonstrations SHALL fail. A compiling example that asserts nothing is a vacuous pass and is forbidden; the run counts assertions rather than trusting that a file which ran has checked something. | Correctness | Test |
| FR-089-CON-4 | No example SHALL be skipped, marked expected-to-fail, or disabled by a condition to obtain a green run, and no generated kernel package added to `tsconfig.json` `exclude` or excluded from lint or type-check for the same purpose. | Integrity | Inspection |
| FR-089-CON-5 | The root `Cargo.toml` workspace SHALL exclude `crates/kernel-consumer/`; that crate SHALL build against the unpacked `cargo package --offline --no-verify` artifact in a scratch directory and declare no `path` dependency resolving outside it. A build that only works in the generator's tree is a failure. | Correctness | Inspection and test |
| FR-089-CON-6 | Every manifest this requirement adds SHALL carry its language's non-publishable marker — `publish = false` in `crates/kernel-consumer/Cargo.toml`, as `crates/consumer-runtime/Cargo.toml` carries it — and this requirement SHALL invoke no `cargo publish`, no `npm publish`, no PyPI upload, no tag push, and no publish `--dry-run`. The publication gate of [FR-090](./FR-090-prove-cross-language-agreement.md) covers the examples as well as the packages. | Safety | Analysis |
| FR-089-CON-7 | No example SHALL read a clock, an environment variable, a network socket, or a host-observed version, so that a run in CI and a run on a maintainer's machine produce the same result. | Determinism | Static analysis |
| FR-089-CON-8 | This requirement SHALL add no dependency to any generated kernel package and edit no file under `packages/semantic-kernel/typescript/`, `packages/semantic-kernel/rust/`, `packages/semantic-kernel/python/`, or `packages/semantic-core/generated/`. An example that had to change the package to pass would be evidence that the package is not consumable. | Non-disruption | Manifest comparison |
| FR-089-CON-9 | This requirement SHALL leave the npm package's `exports`, `main`, `module`, `types`, and `files`, the Python distribution's `packages` and `include`, and every publication workflow unchanged, following the same non-disruption rule [FR-079](./FR-079-emit-the-python-package-layout.md) states for `python_backend/generated/`. | Non-disruption | Manifest comparison |
| FR-089-CON-10 | This requirement SHALL write no file under `conformance/`, which NFR-030 makes a prohibited path for issue #11 in its entirety, and edit no golden kernel instance document under `packages/semantic-kernel/parity/golden/` to make an example pass. A document an example cannot decide is a finding owned by [FR-090](./FR-090-prove-cross-language-agreement.md), not an input to be adjusted. | Integrity | Inspection |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-089-AC-1 | Three examples exist — `crates/kernel-consumer/`, `packages/semantic-kernel/examples/typescript/`, and `packages/semantic-kernel/examples/python/` — one per emitted kernel package, and each is executed by `make rust-test`, `make test-node`, and `make test-python` respectively, proven by observing a non-zero exit from each target after a deliberate assertion inversion in its example. | Test |
| FR-089-AC-2 | Each example imports `FieldDecl`, `TypeRef`, `Multiplicity`, `RelationDecl`, `OperationDecl`, `ClauseRef`, `ConstraintDecl`, and `KernelScalar` from its package's declared entry point, and renaming any one of those exports in the generated package makes that example fail to build or import. | Integration |
| FR-089-AC-3 | Each example constructs a `FieldDecl` carrying a `multiplicity` and asserts its member values; a constructed value omitting `multiplicity` is rejected by the package in each of the three languages. | Test |
| FR-089-AC-4 | Each example deserializes at least one positive golden kernel instance document from `packages/semantic-kernel/parity/golden/` and asserts the member values it carries, including at least one nested `TypeRef` target and one `ConstraintDecl` variant, rather than asserting only that no error was raised. | Test |
| FR-089-AC-5 | Each example is refused, with the error named, on one document per forbidden class: an undeclared member on a `reject` record, a member absent that `multiplicity.lower >= 1` makes required, a `KernelScalar` variant outside the closed enum, a `ConstraintDecl` variant naming no declared keyword, a `pattern` violation, and a value outside a declared `minimum`/`maximum`. Accepting any one of them fails the example. | Test |
| FR-089-AC-6 | Each example reads its package's semantic identity, source version, and source fingerprint back from the package and asserts them equal to the values recorded for the kernel bundle; a package whose recorded fingerprint is altered makes the example fail. | Integration |
| FR-089-AC-7 | No example's source matches an import of a path under `src/compiler/`, `python_backend/`, `packages/semantic-core/scripts/`, or `conformance/`, nor a deep import into the consumed package below its declared entry point. | Static |
| FR-089-AC-8 | `packages/semantic-kernel/examples/closures.json` is written by the run from the resolved locks, and the assertion that no persistence, Tauri, user-interface, ORM, or application-framework package appears reads that file; injecting such a package into one example's manifest makes the assertion fail naming the example and the package. | Test |
| FR-089-AC-9 | The Rust example declares the generated kernel crate and `serde_json` at a pinned exact version as a dev-dependency and nothing else; the TypeScript example declares no dependency beyond the generated package; the Python example declares only the generated package, `pydantic`, and the standard library. | Analysis |
| FR-089-AC-10 | `crates/kernel-consumer/` builds offline with `-D warnings` against the unpacked artifact in a scratch directory; its `Cargo.toml` contains no `path` dependency resolving outside that directory, it does not appear in the root `Cargo.toml` workspace members, and a build attempted against the generator's output tree instead of the unpacked artifact fails. | Test |
| FR-089-AC-11 | Removing an assertion from any one of the five demonstrations in any one example makes the run fail naming that example and that demonstration, so a silently emptied example cannot pass. | Test |
| FR-089-AC-12 | No example is skipped, marked expected-to-fail, or conditionally disabled, checked over the collected test inventory of all three suites rather than by reading the files. | Inspection |
| FR-089-AC-13 | No generated kernel package appears in `tsconfig.json` `exclude`, and the TypeScript example's strict type-check criterion is recorded as failing and blocked on `agent-ix/filament-core-data#22`, naming that issue, rather than reported as passing. | Inspection |
| FR-089-AC-14 | `crates/kernel-consumer/Cargo.toml` carries `publish = false`, and the recorded command list for this requirement contains `cargo package --offline --no-verify` and contains no `cargo publish`, no `npm publish`, no PyPI upload, no tag push, no `--registry`, no `--index`, and no publish `--dry-run`. | Analysis |
| FR-089-AC-15 | No example's source matches `Date.now`, `new Date`, `process.env`, `process.cwd`, `datetime.now`, `os.environ`, `std::time`, `std::env`, or any socket API, and two runs of every example produce byte-identical output. | Static |
| FR-089-AC-16 | `git status --porcelain` is empty after every example runs, except for `packages/semantic-kernel/examples/closures.json` when a closure genuinely changed, which is a reviewed diff rather than a silent rewrite. | Test |
| FR-089-AC-17 | Nothing under `packages/semantic-kernel/typescript/`, `packages/semantic-kernel/rust/`, `packages/semantic-kernel/python/`, `packages/semantic-core/generated/`, or `conformance/` differs before and after the examples run, compared byte-for-byte. | Test |
| FR-089-AC-18 | Where the Python package excludes a colliding type name from `__all__`, the example reaches that type as `<module>.<Name>` and no example re-exports the excluded name. | Static |

## Dependencies

- **Upstream**: [FR-085](./FR-085-generate-the-kernel-typescript-package.md), [FR-086](./FR-086-generate-the-kernel-rust-crate.md), [FR-087](./FR-087-generate-the-kernel-python-package.md)
- **Downstream**: [FR-090](./FR-090-prove-cross-language-agreement.md), which compares across the languages these examples exercise one at a time
- **Constrained by**: [NFR-028](../non-functional/NFR-028-deterministic-kernel-generation.md), [NFR-029](../non-functional/NFR-029-portable-semantic-kernel-packages.md), [NFR-030](../non-functional/NFR-030-non-disruptive-kernel-packaging.md), which makes `conformance/**` a prohibited path for issue #11 in its entirety
- **Precedent read rather than restated**: [FR-061](./FR-061-consume-the-generated-crate.md) for the independent-consumer rule and the build-from-artifact arrangement, `crates/consumer-compile-time/` and `crates/consumer-runtime/` for its Rust shape, and [FR-079](./FR-079-emit-the-python-package-layout.md) with `python_backend/examples/` for its Python shape
- **Blockages this requirement records rather than repairs**: `agent-ix/filament-core-data#22`, the `const declared = [];` emission that fails `tsc --strict` on a zero-field record; and `agent-ix/filament-core-data#21`, the stale `test/fixtures/rust-serde/goldens/**` and `test/fixtures/rust-serde/digests.json` that make `make rust-check` red on `main`
