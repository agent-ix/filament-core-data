---
id: FR-085
title: "Generate the kernel TypeScript package"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-014"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-082"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-084"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-028"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-029"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-030"
    type: "constrained_by"
---
# [FR-085] Generate the kernel TypeScript package

## Description

The semantic kernel's TypeScript package SHALL be produced by running the
already-implemented `typescript` backend of `agent-ix/filament-core-data#22`
over the kernel IR document FR-082 lowers, and the emitted bytes SHALL be
committed under `packages/semantic-kernel/typescript/`, so that the
kernel's TypeScript surface is a generation from the contract rather than a
second emitter maintained beside it. This requirement orchestrates; it renders
nothing. Every rule about what the emitted package contains is already stated by
[FR-064](./FR-064-lower-ir-type-definitions-to-typescript.md),
[FR-065](./FR-065-generate-the-esm-package-and-export-surface.md),
[FR-066](./FR-066-generate-runtime-validators.md) and
[FR-067](./FR-067-generate-identity-and-fingerprint-metadata.md), and this
requirement restates none of them; it names the input, the committed output
tree, the regeneration gate, and the one criterion it cannot close.

## Inputs

- `packages/semantic-kernel/semantic-ir.json`, the kernel IR document FR-082 produces: one `semantic-ir.schema.json` document at `contractVersion` `1.1.0`, carrying the 53 types lowered from the 30 JSON Schema 2020-12 documents under `packages/semantic-core/generated/json-schema/`
- The provenance block and the representability register FR-084 records on that document, including its `source.dialect` of `typespec` — `packages/semantic-core/main.tsp` is the authored source and the emitted bundle is the pinned official emitter's projection of it, which is transport and not source
- `src/compiler/backends/typescript-v1/index.mjs`, exporting `typescriptBackend` with `supportedIrVersions` of exactly `["1.1.0"]` and `owningIssue` of `agent-ix/filament-core-data#22`
- `src/compiler/backends/seam.mjs` `generateTarget(request, options)` of [FR-063](./FR-063-declare-the-generation-backend-seam.md), reached through `src/compiler/cli.mjs generate` as the `generate-typescript` target of the `Makefile` already reaches it. Both modules are read and invoked; `src/compiler/backends/**` is a prohibited path for this issue and no byte of either changes here
- The closed eight-file set `PACKAGE_FILES` of `src/compiler/backends/typescript-v1/package-layout.mjs`
- `test/fixtures/backends/typescript/expected/`, read as the shape a committed generated tree takes — the eight files plus the `output-manifest.json` the CLI writes beside them
- This repository's committed `LICENSE`, which the emitted `LICENSE` copies verbatim
- The injected formatter of [FR-071](./FR-071-provide-the-generate-command-and-surface-fixtures.md) and the style `biome.json` configures

## Outputs

- `packages/semantic-kernel/typescript/`: the committed generated package — `LICENSE`, `errors.ts`, `identity.ts`, `index.ts`, `provenance.ts`, `package.json`, `types.ts`, `validators.ts`, and the `output-manifest.json` the CLI writes beside them, and no other path
- `scripts/build-semantic-kernel.mjs`, the orchestrating generator: it builds the compiler request, calls the existing backend through the CLI seam, and carries a `--check` verb. This requirement adds the TypeScript half of that script and shares it with FR-086; neither owns it alone
- `make semantic-kernel`, which regenerates the tree in place, invoked deliberately when the kernel IR moves
- `make semantic-kernel-check`, which runs `scripts/build-semantic-kernel.mjs --check`: it regenerates into a scratch directory outside the working tree, compares, and reports every blocked gate by name
- `test/semantic-kernel.test.ts`, the Node-side suite carrying this requirement's criteria
- The blocked-criteria record in `docs/semantic-data-system/semantic-kernel-packages.md`, naming `agent-ix/filament-core-data#22` for the `strict` typecheck and `agent-ix/quoin#290` for publication

This requirement adds no module to the issue #22 TypeScript backend's directory, no
second renderer, and no kernel-specific branch inside the backend. If the kernel
document needs behaviour the backend does not have, that is a change to issue
#22's requirements and not a fork here.

## Behavior

### Running the existing backend

- `scripts/build-semantic-kernel.mjs` SHALL generate the kernel package by the same route the `generate-typescript` target already runs — `src/compiler/cli.mjs generate --ir packages/semantic-kernel/semantic-ir.json --target typescript --out-root <dir> --manifest <dir>/output-manifest.json` — so the kernel is generated by the route every other TypeScript generation takes.
- The generation SHALL pass through `generateTarget`, so the kernel document is validated against `compiler-request.schema.json`, admitted by FR-068, and answered with an `output-manifest.schema.json` document, exactly as any other request is.
- The manifest for a completed kernel generation SHALL carry `state: "success"`, one `files[]` entry per emitted file, and no blocking diagnostic. This is the measured result recorded in the issue #11 baseline: `state: "success"`, eight files, a discriminated `ConstraintDecl`, the finite static export surface, and the validated dynamic descriptor API.
- If the backend returns any other state, then the kernel package SHALL NOT be committed and the state SHALL be reported with its diagnostics rather than worked around; a `state` other than `success` over the kernel document is a defect in FR-082's lowering or in issue #22's backend, and this requirement owns neither.
- This requirement SHALL NOT pass an option, a flag, or a request member that no other caller of the backend passes, so that the kernel package is evidence about the backend and not about a bespoke configuration of it.

### The committed output tree

- The committed tree SHALL be `packages/semantic-kernel/typescript/`, beside the kernel IR document it was generated from and beside the other three target trees, so that a reader finds the kernel's IR and its four target artifacts in one directory rather than scattered by language.
- The committed path set SHALL be exactly the nine paths named in Outputs. An added or removed path is a visible change in the tree and in the output manifest, because `PACKAGE_FILES` is closed.
- Committing the tree under `packages/` SHALL add no package-manager workspace member: this repository declares no `pnpm-workspace.yaml` and no `workspaces` member in its root `package.json`, so `packages/semantic-kernel/` is a plain directory and FR-065-CON-1 continues to hold unchanged.
- The committed tree SHALL be a generated artifact and SHALL NOT be hand-edited. A change to a committed byte that a regeneration does not reproduce is a defect the check below reports.

### The regeneration gate

- `make semantic-kernel-check` SHALL regenerate the package into a scratch directory created outside the working tree and SHALL compare that directory against the committed tree file by file.
- The check SHALL NOT write inside the working tree and SHALL NOT rewrite a committed artifact in place. Regenerating a committed artifact inside the working tree is the defect `agent-ix/filament-core-data#49` records, where three unrelated changed-path gates failed at random because a gate read a file another suite was part way through rewriting; `make generate-typescript-check` already avoids it with a `mktemp -d` scratch and a `trap` cleanup, and this gate takes the same shape rather than inventing a second one.
- `make semantic-kernel-check` SHALL leave `git status --porcelain` empty, so a check that passed by dirtying the tree is not available.
- The check SHALL name the differing file when the comparison fails, rather than reporting that the tree differs.
- Regeneration SHALL be the only way the committed tree changes, and `make semantic-kernel` SHALL be the only target that writes into it.

### Package metadata and the publication gate

- The generated `package.json` SHALL declare `"type": "module"`, `"sideEffects": false`, `"license": "AGPL-3.0-or-later"`, a `version` equal to the kernel document's `package.version`, and the `exports` map FR-065 states — all of them emitted by `renderPackage` and none of them written here.
- The generated package name SHALL be whatever `packageNameFor` derives from the kernel document's `package.identity` by the single stated rule of FR-065, and this requirement SHALL NOT override it: for a `package.identity` of `agent-ix/semantic-core` the emitted name is `@agent-ix/semantic-agent-ix__semantic-core`, and the identity is recoverable from it by `identityFromPackageName`. A hand-chosen name would break that inverse and would be the first place the kernel package stopped being a generation.
- The generated `package.json` SHALL carry no registry entry: no `publishConfig`, no `repository`-driven publish configuration, and no `dependencies`, `peerDependencies`, or `optionalDependencies` member. `renderPackage` emits none of these, so the absence is carried by the emitter rather than asserted by a reviewer.
- This requirement SHALL NOT run `npm publish`, `pnpm publish`, or `npm pack --publish`, SHALL NOT push a tag, and SHALL NOT add the generated package to any registry configuration. Publication passes `agent-ix/quoin#290`, a human sign-off that has not moved, and the step is recorded as blocked on that issue by name rather than described as future work.
- The absence of a registry entry SHALL be a gated property rather than a convention: a `publishConfig`, a `private: false` claim, or a registry-bearing member appearing in the committed `package.json` fails the check naming the member.

### The export surface

- The committed `index.ts` SHALL re-export every public symbol by name and SHALL contain no `export *` form, so the kernel's TypeScript surface is finite, statically analysable and diffable — the property that makes a removed kernel export a visible manifest change rather than a silent one.
- The static export surface SHALL be the union FR-065 declares and nothing else: one identity-derived export per kernel type definition, plus the fixed API surface — the discriminant constant, the branded-reference constructor, one `validate<Type>` per exported type, `ValidationError`, `ValidationResult`, the structural-code register, and the identity, metadata, roles, extension, occurrence and relationship maps.
- The dynamic descriptor API SHALL be the generated `identity.ts` and `provenance.ts` of FR-067, carrying every contract datum the kernel document holds that a TypeScript type cannot express: each type's `roles[]`, `unknownPolicy`, relationship descriptors, each field's identity and `unit`, every operation, clause, default, extension and occurrence.
- The descriptor API SHALL be validated rather than free-form: the identity map is typed over the union of exported names, so a kernel type with no identity entry and an entry naming an unexported name each fail the typecheck instead of producing a partial map at run time.
- The two surfaces together SHALL account for every node of the kernel document: FR-067's node audit finds each node either rendered or named in a declared representability loss, and FR-084 owns the loss register the kernel's two declared losses are recorded in.

### Source version and fingerprint metadata

- The committed `provenance.ts` SHALL carry the kernel document's `contractVersion`, its `source.identity`, `source.version`, `source.dialect` and `source.digest`, its `package.identity`, `package.version`, `package.manifestDigest`, `package.mappingVersions`, `package.profileVersions` and `package.lockDigest`, the normalized IR fingerprint, and the backend identity and backend version — so a consumer can say which contract revision and which generator produced the bytes it is holding without reading a side-car file.
- The recorded `source.dialect` SHALL be `typespec`, the value FR-082 sets and FR-084 justifies, and this requirement SHALL NOT restate that justification or reopen it.
- Every committed file SHALL begin with the `SPDX-License-Identifier: AGPL-3.0-or-later` header and the banner naming the backend identity, the backend version and the IR fingerprint, and SHALL name no clock value, hostname, user, working directory or tool path.
- The fingerprint SHALL be computed over the normalized document, so a re-serialization of the kernel IR that changes no meaning does not churn the committed tree.

### The blocked strict typecheck

- The kernel package SHALL be typechecked under `strict`, `exactOptionalPropertyTypes`, `noUnusedLocals` and `noUnusedParameters` — the options `test/fixtures/backends/typescript/tsconfig.json` sets and FR-065-AC-8 demands of every generated package.
- That typecheck SHALL be a dedicated gate this requirement states and `test/semantic-kernel.test.ts` runs, compiling the committed tree as its own program through the TypeScript compiler API. It is not `pnpm typecheck`: the root `tsconfig.json` `include` is `["src", "test", "scripts"]`, so `packages/semantic-kernel/typescript/` is outside that program already, and `tsconfig.json` is a prohibited path for this issue. No `exclude` entry is needed and none is permitted.
- That typecheck does not pass today, and this requirement records why rather than working around it. The kernel document reaches the `JsonObject` lowering FR-082 applies to `DefaultDecl.value`, which is `unknown` in `packages/semantic-core/main.tsp` and `{}` in the emitted schema; that lowering mints a `record` with `fields: []`, and a generated package containing a zero-field record emits `const declared = [];` in `validators.ts`, which fails `tsc --strict` with TS7034 and TS7005. The defect is the backend's, it is reopened as `agent-ix/filament-core-data#22`, and it is not repaired here.
- FR-085-AC-9 SHALL therefore be recorded as **blocked on `agent-ix/filament-core-data#22`**, with the defect, the TypeScript error codes and the reproducing construct named. It SHALL NOT be re-typed as a lesser criterion, restated against weaker compiler options, marked satisfied, or dropped.
- The committed tree SHALL NOT be added to `biome.json`'s ignore configuration. `biome.json` is a prohibited path for this issue, and it is also unnecessary: FR-065 makes the backend emit the exact style `biome.json` configures, so `biome format .` over the committed tree is already a no-op. If it is not a no-op, that is a divergence between the emitter's declared style and the repository's formatter, and it SHALL be recorded as a finding against `agent-ix/filament-core-data#22` rather than silenced with an ignore entry.
- The committed tree SHALL NOT be added to the root `tsconfig.json` `exclude` list — neither as a repair nor as a tidy-up — and no `@ts-nocheck` pragma, `@ts-expect-error` comment or per-file suppression SHALL be introduced anywhere for the purpose of making this typecheck report clean. Adding an `exclude` entry would state, in the one file a reader consults to learn what this repository compiles, that the kernel package is deliberately not compiled, converting a named, owned, reproducible backend defect into an invisible one. `tsconfig.json` is byte-unchanged on this branch; its single existing `exclude` entry for `test/fixtures/backends/typescript` is FR-065's and stays as it is.
- The blocked set SHALL be recorded in two places, because each catches a reader the other misses: `docs/semantic-data-system/semantic-kernel-packages.md` SHALL carry a row per blocked criterion with its owning issue and its unblocking condition, for a reader who never runs the gate; and `make semantic-kernel-check` SHALL print the same set on every run, for a reader who never opens the document. A blocked criterion recorded in only one of the two is recorded in neither place a given reader will look.
- The defect SHALL NOT be dodged by changing the input either. Reshaping the kernel IR so the zero-field record never appears — dropping `DefaultDecl.value`, or lowering it to something other than the `JsonObject` form FR-082 prescribes — would make the gate green by removing the construct that exercises it, which is the same evasion as an `exclude` entry wearing different clothes.
- The blocked criterion SHALL name the unblocking condition exactly: when `agent-ix/filament-core-data#22` emits a zero-field record's `declared` register with an explicit element type, this requirement's typecheck runs unchanged and either passes or reports a different defect.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-085-CON-1 | This requirement SHALL add no TypeScript emitter, no module to the issue #22 TypeScript backend's directory, and no kernel-specific branch inside the existing backend. A construct the backend cannot render is a change request against `agent-ix/filament-core-data#22`, not a second renderer here, because two emitters for one target are two answers to one question and the committed tree would stop being evidence about the backend. | Scope | Inspection |
| FR-085-CON-2 | The check SHALL regenerate into a scratch directory outside the working tree and never rewrite a committed artifact in place, so it cannot pass by comparing a file to itself and cannot leave the tree dirty — the defect `agent-ix/filament-core-data#49` records. | Correctness | Test |
| FR-085-CON-3 | No `npm publish`, `pnpm publish`, `npm pack --publish`, registry token, `publishConfig` member, or tag push SHALL appear in any target, script or committed manifest this requirement adds. Publication is blocked on `agent-ix/quoin#290` and the block is enforced by the absence of the mechanism rather than by an intention to refrain. | Safety | Inspection |
| FR-085-CON-4 | This requirement SHALL record the `strict` typecheck criterion as blocked on `agent-ix/filament-core-data#22` with the defect named, and never soften it, re-scope it to weaker compiler options, or remove it. A gate this ticket cannot pass is reported red with an owner; it is never re-typed until it is green. | Honesty | Inspection |
| FR-085-CON-5 | This requirement SHALL add no `tsconfig.json` `exclude` entry, `@ts-nocheck`, `@ts-expect-error` or equivalent suppression for the generated kernel tree, and never reshape the kernel IR to avoid emitting the construct that triggers the defect. Either move would make the issue #22 defect invisible to every future reader while leaving it in the shipped bytes. `tsconfig.json` is in any case a prohibited path for this issue. | Honesty | Static |
| FR-085-CON-6 | The committed tree SHALL be reproduced byte-for-byte by a regeneration on a clean checkout, so a hand-edit to a generated file is a check failure rather than a divergence nobody notices. | Integrity | Test |
| FR-085-CON-7 | The generated package SHALL declare no third-party runtime dependency and keep every `import` specifier in every committed module relative, so the kernel's TypeScript dependency closure is empty and a consumer acquires the kernel without acquiring a framework. | Portability | Static |
| FR-085-CON-8 | `src/compiler/backends/**`, `tsconfig.json`, `biome.json`, `package.json` and `pnpm-lock.yaml` are prohibited paths for this issue and SHALL be byte-unchanged. The two targets are added to the `Makefile` alone, following the precedent that the corpus and both backends add no `package.json` script. | Non-disruption | Change-set diff |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-085-AC-1 | Running the CLI over the FR-082 kernel IR with `--target typescript` returns an `output-manifest.schema.json`-valid manifest with `state: "success"`, eight `files[]` entries, and no blocking diagnostic. | Integration |
| FR-085-AC-2 | The committed `packages/semantic-kernel/typescript/` path set is exactly `LICENSE`, `errors.ts`, `identity.ts`, `index.ts`, `provenance.ts`, `package.json`, `types.ts`, `validators.ts`, and `output-manifest.json`, and no other path. | Test |
| FR-085-AC-3 | `make semantic-kernel-check` regenerates into a scratch directory outside the working tree, compares byte for byte against the committed tree, names the differing file when they differ, and leaves `git status --porcelain` empty in both the passing and the failing case. | Test |
| FR-085-AC-4 | The committed `package.json` declares `type: "module"`, `sideEffects: false`, `license: "AGPL-3.0-or-later"`, the kernel document's `package.version`, and the FR-065 `exports` map; and parsing it yields no `dependencies`, `peerDependencies`, `optionalDependencies`, or `publishConfig` member. Adding any one of them fails the check naming the member. | Unit |
| FR-085-AC-5 | The committed package name equals `packageNameFor(package.identity)` for the kernel document's identity, and `identityFromPackageName` applied to the committed name reproduces that identity. | Property |
| FR-085-AC-6 | The recorded command list for every target this requirement adds contains no `npm publish`, no `pnpm publish`, no `--registry`, no `--access`, and no `git tag`, checked against the recorded list rather than by reading the `Makefile` by eye. | Inspection |
| FR-085-AC-7 | The committed `index.ts` contains no `export *` form, and its exported name set equals the identity-derived exports of the kernel's type definitions plus the FR-065 fixed API surface; an added name outside both sets fails the export-set test. | Unit |
| FR-085-AC-8 | The committed `identity.ts` and `provenance.ts` expose every kernel type's `roles[]` and `unknownPolicy`, every `record`'s relationship descriptors, every field's identity and its `unit` where declared, and every operation, clause, default, extension and occurrence the kernel document carries; and a node-audit walk over the kernel IR finds each node either rendered or named in the FR-084 loss register. | Test |
| FR-085-AC-9 | **Blocked on `agent-ix/filament-core-data#22`.** The committed kernel package typechecks with zero errors under `strict`, `exactOptionalPropertyTypes`, `noUnusedLocals` and `noUnusedParameters`. It does not: the kernel's `JsonObject` lowering of `DefaultDecl.value` produces a zero-field record, for which the backend emits `const declared = [];` in `validators.ts`, failing with TS7034 and TS7005. The criterion is recorded blocked with that defect, those error codes and that construct named; it is not restated against weaker options and it is not marked satisfied. | Compile |
| FR-085-AC-10 | `tsconfig.json` is byte-unchanged on this branch, carrying exactly its existing single `exclude` entry, `test/fixtures/backends/typescript`, and no entry for `packages/semantic-kernel/typescript`; and no committed file of the generated tree contains `@ts-nocheck` or `@ts-expect-error`. | Static |
| FR-085-AC-11 | Every committed file begins with the `SPDX-License-Identifier: AGPL-3.0-or-later` header and the banner naming the backend identity, the backend version and the IR fingerprint; and no committed byte outside a copied `occurrences[].observedAt` value matches a date, time, hostname, user or absolute-path pattern. | Static |
| FR-085-AC-12 | The committed `provenance.ts` carries the kernel document's `contractVersion`, all four `source` members with `source.dialect` equal to `typespec`, all six `package` members, the normalized IR fingerprint, and the backend identity and version, each byte-equal to the document's value or to the independently recomputed digest. | Test |
| FR-085-AC-13 | Two generations of the kernel package at different wall-clock times, under two working directories, two `HOME` values, and `LANG=C` against `LANG=tr_TR.UTF-8`, produce byte-identical trees. | Test |
| FR-085-AC-14 | Every `import` specifier in every committed module begins with `./` or `../`, and no committed module names a package in any of the seven prohibited dependency categories. | Static |
| FR-085-AC-15 | The committed `LICENSE` is byte-identical to this repository's committed `LICENSE`. | Test |
| FR-085-AC-16 | This branch changes no byte under `src/compiler/backends/**` and no byte of `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, or `biome.json`, and adds exactly two `Makefile` targets. | Analysis |
| FR-085-AC-17 | Hand-editing one byte of a committed generated file makes `make semantic-kernel-check` fail naming that file, so the tree cannot drift from the emitter unnoticed. | Test |
| FR-085-AC-18 | `make semantic-kernel-check` reports the two blocked gates by name on every run — the `strict` typecheck blocked on `agent-ix/filament-core-data#22`, and publication blocked on `agent-ix/quoin#290` — each with its owning issue and its unblocking condition, and never exits silently clean while one stands; a blocked gate carrying no owning issue fails the check. | Inspection |
| FR-085-AC-19 | Running the repository's pinned `biome format` over the committed kernel tree reports no change, and `biome.json` carries no ignore entry for `packages/semantic-kernel/typescript`; a tree the formatter would rewrite fails this criterion as a finding against `agent-ix/filament-core-data#22` rather than being ignored. | Static |
| FR-085-AC-20 | `docs/semantic-data-system/semantic-kernel-packages.md` carries one row per blocked criterion — the `strict` typecheck blocked on `agent-ix/filament-core-data#22`, publication blocked on `agent-ix/quoin#290` — each with its owning issue and its unblocking condition, and a row carrying no owning issue fails the gate. | Inspection |

## Dependencies

- **Upstream**: FR-082 (the kernel IR document), FR-084 (kernel provenance and the representability register), [FR-063](./FR-063-declare-the-generation-backend-seam.md), [FR-064](./FR-064-lower-ir-type-definitions-to-typescript.md), [FR-065](./FR-065-generate-the-esm-package-and-export-surface.md), [FR-066](./FR-066-generate-runtime-validators.md), [FR-067](./FR-067-generate-identity-and-fingerprint-metadata.md), [FR-071](./FR-071-provide-the-generate-command-and-surface-fixtures.md)
- **Downstream**: FR-089 (per-language consumer examples), FR-090 (cross-language agreement and the publication gate)
- **Constrained by**: NFR-028 (deterministic and hermetic kernel generation), NFR-029 (portable, dependency-free kernel packages), NFR-030 (non-disruptive kernel packaging behind the publication gate)
- **Blocked criteria this requirement records rather than closes**: FR-085-AC-9, the `strict` typecheck of the emitted kernel package, blocked on the reopened `agent-ix/filament-core-data#22`; and publication, blocked on `agent-ix/quoin#290`. Neither is closed here and neither is hidden.
