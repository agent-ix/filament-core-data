---
id: FR-044
title: "Replay the frozen spike through the promoted compiler"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-009"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-041"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-042"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-043"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-006"
    type: "depends_on"
---
# [FR-044] Replay the frozen spike through the promoted compiler

## Description

The issue #4 spike SHALL drive the promoted `src/compiler/` modules instead of
its own emitter package, and the promotion SHALL change exactly one field of one
retained-evidence file, the delta this requirement records.

## Inputs

- `spikes/typespec-feasibility/scripts/run-experiment.mjs` and the retained evidence under `spikes/typespec-feasibility/{generated,evidence,report.md}`
- The promoted `src/compiler/` build interface
- The committed `spikes/typespec-feasibility/generated/custom/rust/Cargo.lock`
- The changed-path allowlist in `test/typespec-feasibility.test.ts` (TC-123/TC-124), which is the gate that actually enforces NFR-006

## Outputs

- A `run-experiment.mjs` that imports the promoted backends and calls the promoted compiler CLI, naming no `@agent-ix/typespec-semantic-ir-emitter-spike` dependency
- A deleted `spikes/typespec-feasibility/emitter/` package, and root and spike `package.json` files with no `file:` dependency
- An amended changed-path allowlist in `test/typespec-feasibility.test.ts` covering `src/compiler/`, `tsconfig.json`, `tsconfig.build.json`, `plan/Plan-007-*`, and the new test file
- A `## Retained evidence` note in `docs/semantic-data-system/typespec-feasibility.md` recording that the retained evidence is a historical issue #4 record which the promotion does not update
- A one-paragraph amendment to [NFR-006](../non-functional/NFR-006-isolated-reproducible-spike.md) recording that the spike's isolation now means "changes nothing outside itself" rather than "imports nothing outside itself", because its generators moved into `src/compiler/`

## Behavior

- The spike SHALL obtain its semantic IR from the promoted compiler CLI.
- The spike SHALL stamp the historical generator identity `@agent-ix/typespec-semantic-ir-emitter-spike@0.0.0` into that IR, so `generated/custom/semantic-ir.json` stays byte-identical to the issue #4 record.
- The spike SHALL obtain its TypeScript, Rust, and Python-input outputs from the promoted backends.
- The spike SHALL copy the committed `Cargo.lock` into each freshly generated Rust package before running `cargo check --offline --locked`, so the retained transitive versions are verified rather than replaced.
- If no committed `Cargo.lock` exists while the runner is in `--check` mode, then the runner SHALL fail naming the missing lockfile rather than generate one, because generating one is a silent rebaseline.
- Where the runner is in generate mode and no committed lockfile exists, the runner SHALL generate one once.
- Exactly one retained byte range SHALL change: the `command` field of `spikes/typespec-feasibility/evidence/custom.json` becomes `node src/compiler/cli.mjs emit-ir --entrypoint spikes/typespec-feasibility/main.tsp --generator @agent-ix/typespec-semantic-ir-emitter-spike@0.0.0 --out generated/custom/semantic-ir.json`, replacing `pnpm exec tsp compile spikes/typespec-feasibility/main.tsp --emit @agent-ix/typespec-semantic-ir-emitter-spike`, because the emitter package that command named no longer exists.
- The promotion SHALL change no other byte under `spikes/typespec-feasibility/generated/`, `spikes/typespec-feasibility/evidence/`, or `spikes/typespec-feasibility/report.md`.
- The promotion SHALL NOT amend the retained `capabilities.json` or `report.md` claims that the promotion supersedes; those are the historical issue #4 record, and the superseding statement belongs in `docs/semantic-data-system/typespec-feasibility.md`.
- The promotion SHALL remove the `@agent-ix/typespec-semantic-ir-emitter-spike` dependency from the root `package.json` and from `spikes/typespec-feasibility/package.json`.
- The regenerated `pnpm-lock.yaml` SHALL name no `@agent-ix/typespec-semantic-ir-emitter-spike` entry and no `file:` or `link:` specifier.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-044-CON-1 | The declared delta SHALL be exactly one field of one file; any further retained-evidence change is a defect, not a rebaseline. | Integrity | Retained-evidence diff test |
| FR-044-CON-2 | The maintainer SHALL NOT regenerate the committed `Cargo.lock`; seeding it is the determinism fix, and rewriting it would discard the transitive versions the issue #4 evidence was minted against. | Reproducibility | Branch diff against `origin/main` |
| FR-044-CON-3 | No `file:` or `link:` dependency specifier SHALL remain anywhere in the repository after the promotion. | Maintainability | Dependency inspection |
| FR-044-CON-4 | `cargo check --offline --locked` resolves from the local cargo cache and consults no index, so seeding the lockfile pins the transitive set but does not fetch it; the maintainer SHALL record a host whose cache lacks a pinned crate as an unmet host prerequisite rather than regenerate the lockfile. | Reproducibility | Host prerequisite inspection |
| FR-044-CON-5 | A full green `pnpm run spike:typespec:check` additionally requires the host floor recorded in issue #42; the maintainer SHALL NOT edit retained evidence to make the check pass on a non-conforming host. | Integrity | Issue #42 |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-044-AC-1 | On a host meeting the issue #42 floor, `pnpm run spike:typespec:check` exits zero on the promotion branch. Blocked on issue #42; the per-component byte-identity in FR-041-AC-2, FR-042-AC-1, FR-042-AC-2 and FR-043-AC-1 is the evidence available without it. | Test |
| FR-044-AC-2 | The branch's changed-path set names no file under `spikes/typespec-feasibility/generated`, `spikes/typespec-feasibility/evidence`, or `spikes/typespec-feasibility/report.md` other than `evidence/custom.json`, and the committed `evidence/custom.json` carries exactly the keys of the frozen issue #4 record with only `command` differing, holding the after string recorded in Behavior. The field comparison is made against the frozen record transcribed into the test rather than against `origin/main`, which carries the promoted content once the branch merges. | Analysis |
| FR-044-AC-3 | `spikes/typespec-feasibility/generated/custom/rust/Cargo.lock` is byte-identical to `origin/main`, and the runner copies it into the generated package rather than calling `cargo generate-lockfile` when it exists. | Test |
| FR-044-AC-4 | With no committed lockfile present, the runner in `--check` mode exits non-zero naming the missing lockfile instead of generating one. | Test |
| FR-044-AC-5 | Neither `package.json` names `@agent-ix/typespec-semantic-ir-emitter-spike`, and `spikes/typespec-feasibility/emitter/` is absent from the tree. | Analysis |
| FR-044-AC-6 | `pnpm-lock.yaml` holds no `file:` or `link:` specifier and no spike-emitter entry, and `pnpm install --frozen-lockfile` succeeds. | Test |
| FR-044-AC-7 | `spikes/typespec-feasibility/scripts/run-experiment.mjs` imports from `src/compiler/` and defines no local `emitTypeScript`, `emitRust`, or `normalizeJsonSchemaForPython`. | Analysis |
| FR-044-AC-8 | The branch changes no file under `spikes/typespec-feasibility/` other than `scripts/run-experiment.mjs`, `package.json`, `evidence/custom.json`, and the deleted `emitter/` directory. | Test |
| FR-044-AC-9 | The changed-path allowlist in `test/typespec-feasibility.test.ts` covers every path the branch changes, and TC-123/TC-124 pass. | Test |
| FR-044-AC-10 | Zero package publications, schema mutations, consumer mutations, and external repository mutations are established by a changed-path check over `git diff --no-renames origin/main...HEAD`, not by reading the counters `run-experiment.mjs` writes into `evidence/validation.json`. That check is negative and passes vacuously on an empty diff, so it is paired with tree evidence that the promotion is in place: `spikes/typespec-feasibility/emitter/` is absent, the spike manifest names no spike-emitter dependency, and `scripts/run-experiment.mjs` imports `src/compiler/index.mjs`. | Test |
| FR-044-AC-11 | `docs/semantic-data-system/typespec-feasibility.md` carries a `## Retained evidence` note stating that `capabilities.json` and `report.md` remain the historical issue #4 record and are superseded by, not updated to match, the promotion. | Inspection |
| FR-044-AC-12 | NFR-006 gains exactly one paragraph recording that the spike now imports the promoted compiler while still changing nothing outside itself. | Inspection |

## Dependencies

- **Upstream**: [FR-041](./FR-041-promote-the-semantic-ir-emitter.md), [FR-042](./FR-042-promote-the-language-backends.md), [FR-043](./FR-043-govern-the-python-generation-adapter.md), [NFR-006](../non-functional/NFR-006-isolated-reproducible-spike.md), issue #42
- **Downstream**: [NFR-018](../non-functional/NFR-018-non-disruptive-promotion-and-rollback.md)
