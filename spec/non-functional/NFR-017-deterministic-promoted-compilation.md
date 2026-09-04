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
the same pinned toolchain, with every host-varying input — working directory,
locale, and transitive dependency resolution — supplied explicitly rather than
read from the ambient environment.

## Scope

- Applies to: `src/compiler/**` and the retained-evidence replay in `spikes/typespec-feasibility/`.
- Permitted paths: `src/compiler/**`, `spikes/typespec-feasibility/scripts/**`, `spikes/typespec-feasibility/package.json`, `spikes/typespec-feasibility/evidence/custom.json`, `spikes/typespec-feasibility/emitter/**` (deletion only), `spikes/typespec-feasibility/README.md`, `package.json`, `pnpm-lock.yaml`, `Makefile`, `biome.json`, `tsconfig.json`, `tsconfig.build.json`, `test/**`, `docs/semantic-data-system/typespec-feasibility.md`, `spec/**`, `plan/**`, `reviews/**`.
- Prohibited paths: every other file under `spikes/typespec-feasibility/` (in particular `generated/**`, the rest of `evidence/**`, `report.md`, `main.tsp`, `packages/**`, `mappings/**`, `fixtures/**`, `tspconfig.yaml`), `schema/**`, `fixtures/**`, `packages/**`, `agent_ix_core_data/**`, `src/generated.ts`, `audit/**`, `pyproject.toml`, `poetry.lock`, `tests/**`, `.github/**`, and every corpus repository.

## Rationale

The promotion's only honest oracle is that the promoted code reproduces the
frozen issue #4 goldens exactly, so a generator that drifts by a byte cannot be
compared with the evidence it claims to inherit. Three ambient inputs threaten
that: the emitter relativises source loci against the process working directory,
type ordering was expressed with `localeCompare`, whose result depends on the
host's ICU data, and the spike's generated Rust package pinned only its direct
dependencies so its retained lockfile was replaced on every run. Issue #42
records two further host couplings in the retained evidence itself, which this
requirement does not repair.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| Byte difference between two `src/compiler/` CLI runs over the same entrypoint | 0 | 0 | Repeat-run comparison |
| Ambient inputs read by the compiler without an explicit parameter (cwd, locale, clock, environment) | 0 | 0 | Purity and parameterisation tests |
| Retained evidence files changed by the promotion | 1 | 1 | Branch diff against `origin/main` |
| Retained evidence fields changed by the promotion | 1 | 1 | Branch diff against `origin/main` |
| Retained Rust lockfile entries replaced by a run | 0 | 0 | Lockfile seeding test |
| New dependencies added to `package.json` by the promotion | 0 | 0 | Dependency inspection |
| `@typespec/*` specifiers that are not an exact version | 0 | 0 | Dependency inspection |
| `file:`/`link:` specifiers and committed `.npmrc` files remaining | 0 | 0 | Dependency inspection |

## Verification

Run the compiler CLI twice over the same entrypoint and compare bytes; run the
backends and adapter twice and compare; sort the golden type ids under two
`Intl.Collator` locales and confirm the implemented code-point order is
unchanged; build the IR under two `baseDir` values and confirm the loci differ
as declared; diff the promotion branch against `origin/main` restricted to the
retained-evidence paths; copy the committed lockfile into a generated Rust
package and confirm `cargo check --offline --locked` leaves it unchanged;
inspect `package.json` and `pnpm-lock.yaml`.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| NFR-017-AC-1 | Two runs of the compiler CLI over the same entrypoint produce identical bytes, and two calls of each backend and of the adapter return identical results. | Test |
| NFR-017-AC-2 | The branch changes exactly one retained-evidence file and exactly one field within it. | Analysis |
| NFR-017-AC-3 | The type order the compiler emits is unchanged when compared against `Intl.Collator` orderings for at least two distinct locales, proving the ordering is locale-independent. | Test |
| NFR-017-AC-4 | The compiler takes the working directory as an explicit `baseDir` parameter; two values yield correspondingly different loci for the same entrypoint. | Test |
| NFR-017-AC-5 | Seeding the committed lockfile into a generated Rust package and running `cargo check --offline --locked` leaves the lockfile byte-identical. | Test |
| NFR-017-AC-6 | `package.json` gains no dependency, every `@typespec/*` specifier is an exact version with no range expression, no `.npmrc` is committed, and no `file:`/`link:` specifier remains. | Analysis |
| NFR-017-AC-7 | The two retained-evidence host couplings recorded in issue #42 are named in `docs/semantic-data-system/typespec-feasibility.md` rather than silently repaired. | Inspection |

## Dependencies

- **Upstream**: [NFR-008](./NFR-008-deterministic-semantic-compilation.md), [NFR-006](./NFR-006-isolated-reproducible-spike.md), issue #42
- **Downstream**: [FR-044](../functional/FR-044-replay-the-frozen-spike-through-the-promoted-compiler.md), issue #19
