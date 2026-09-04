---
id: NFR-017
title: "Deterministic and reproducible promoted compilation"
type: NFR
quality_attribute: reliability
relationships:
  - target: "ix://agent-ix/filament-core-data/US-009"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-041"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/NFR-008"
    type: "depends_on"
---
# [NFR-017] Deterministic and reproducible promoted compilation

## Statement

The promoted compiler SHALL produce byte-identical output for the same inputs on
the same pinned toolchain, and the retained issue #4 evidence SHALL stay
reproducible on a host whose crates.io index has advanced past the versions the
evidence was minted against.

## Scope

- Applies to: `src/compiler/**` and the retained-evidence replay in `spikes/typespec-feasibility/`.
- Permitted paths: `src/compiler/**`, `spikes/typespec-feasibility/scripts/**`, `spikes/typespec-feasibility/package.json`, `spikes/typespec-feasibility/evidence/custom.json`, `spikes/typespec-feasibility/README.md`, `package.json`, `pnpm-lock.yaml`, `Makefile`, `biome.json`, `tsconfig*.json`, `test/**`, `docs/semantic-data-system/typespec-feasibility.md`, `spec/**`, `plan/**`, `reviews/**`.
- Prohibited paths: every other file under `spikes/typespec-feasibility/`, `schema/**`, `fixtures/**`, `packages/**`, `agent_ix_core_data/**`, `src/generated.ts`, `audit/**`, and every corpus repository.

## Rationale

The promotion's only honest oracle is that the promoted code reproduces the
frozen issue #4 goldens exactly. A generator that drifts by a byte cannot be
compared with the evidence it claims to inherit. The spike's Rust package pinned
only its direct dependencies, so its retained `Cargo.lock` drifted whenever a
transitive crate published; that made the retained-evidence gate fail for reasons
unrelated to any change, which is a determinism defect and not a reason to
rebaseline.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| Byte difference between two `src/compiler/` runs over the same IR | 0 | 0 | Repeat-run comparison |
| Retained evidence files changed by the promotion | 1 | 1 | Branch diff against `origin/main` |
| Retained evidence fields changed by the promotion | 1 | 1 | Branch diff against `origin/main` |
| `spike:typespec:check` exit code with a drifted crates.io index | 0 | 0 | Retained-evidence check |
| Unpinned transitive versions used by the retained Rust package | 0 | 0 | Lockfile seeding inspection |
| New runtime dependencies added by the promotion | 0 | 0 | Dependency inspection |

## Verification

Run `src/compiler/` twice over the same semantic IR and compare bytes; diff the
promotion branch against `origin/main` restricted to the retained evidence
paths; run `pnpm run spike:typespec:check` on a host whose crates.io index has
advanced; inspect `package.json` and `pnpm-lock.yaml` for added dependencies and
for `file:`/`link:` specifiers.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| NFR-017-AC-1 | Two runs of the compiler CLI over the same entrypoint produce identical bytes. | Test |
| NFR-017-AC-2 | The branch changes exactly one retained-evidence file and exactly one field within it. | Analysis |
| NFR-017-AC-3 | `spike:typespec:check` exits zero after the seeded lockfile fix on a host whose index carries a newer `syn`. | Test |
| NFR-017-AC-4 | `package.json` gains no dependency and keeps every `@typespec/*` version exactly pinned with no upper bound expression. | Analysis |
| NFR-017-AC-5 | No `.npmrc` is committed and no `file:`/`link:` specifier remains. | Analysis |

## Dependencies

- **Upstream**: [NFR-008](./NFR-008-deterministic-semantic-compilation.md), [NFR-006](./NFR-006-isolated-reproducible-spike.md)
- **Downstream**: [FR-044](../functional/FR-044-replay-the-frozen-spike-through-the-promoted-compiler.md), issue #19
