---
id: NFR-019
title: "Deterministic contract compilation and diagnostics"
type: NFR
quality_attribute: reliability
relationships:
  - target: "ix://agent-ix/filament-core-data/US-010"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-046"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-048"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-052"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/NFR-008"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-017"
    type: "depends_on"
---
# [NFR-019] Deterministic contract compilation and diagnostics

## Statement

The contract compiler SHALL produce byte-identical IR, lock, diagnostic,
inspection, and compatibility-report output for identical inputs on the pinned
toolchain, with every host-varying input — working directory, locale, clock,
hostname, environment, path separator, file-system enumeration order, and
search-path order — either supplied explicitly or excluded from the output.

## Scope

- Applies to: `src/compiler/frontend/**`, `src/compiler/packages/**`, `src/compiler/ir/**`, `src/compiler/compat/**`, `src/compiler/diagnostics.mjs`, `src/compiler/inspect.mjs`, `src/compiler/json-locus.mjs`, `src/compiler/pipeline.mjs`, `src/compiler/host.mjs`, `src/compiler/cli.mjs`, `src/compiler/index.mjs`, `src/compiler/index.d.mts`, and `fixtures/compiler/**`.
- Permitted paths: the applied paths above, `test/**`, `spec/**`, `plan/**`, `reviews/**`, `scripts/**`, `docs/semantic-data-system/compiler-diagnostics.md`, `docs/semantic-data-system/ir-compatibility-policy.md`, `Makefile`, `package.json` `scripts`, `spec/tests.md`.
- Prohibited paths, meaning this branch changes no byte of them (reading them, and invoking a program under them, remain permitted): `src/compiler/ir.mjs`, `src/compiler/compile.mjs`, `src/compiler/identity.mjs`, `src/compiler/emitters/**`, `src/compiler/backends/**`, `src/compiler/inventory.json`, `schema/**`, `fixtures/semantic/**`, `fixtures/semantic-core/**`, `fixtures/representative-core-payloads.json`, `packages/**`, `spikes/**`, `conformance/**`, `agent_ix_core_data/**`, `src/generated.ts`, `audit/**`, `tests/**`, `test/semantic-ir-v1-1-reader.ts`, `test/semantic-core-reader.ts`, `test/semantic-core-lowerer.ts`, `.github/**`, and every corpus repository.

## Rationale

The compiler is judged against an independently authored conformance corpus
(#20) and feeds four generator tickets. If two hosts disagree by a byte, the
corpus cannot tell a compiler defect from a host difference, and every golden
downstream inherits the ambiguity. The prototype path already showed three ways
this fails — a locale-dependent sort, an ambient working directory, and an
unpinned transitive lockfile — and issue #42 records that the retained issue #4
evidence remains host-coupled; this requirement does not repair that evidence,
which stays issue #42's. The contract path introduces three further ambient
inputs because it reads a package tree rather than a single entrypoint:
directory enumeration order, search-path order, and the host path separator.

Two-runs-in-one-process is a weak oracle for a cross-host claim, so the
verification below varies the inputs a second host would vary — working
directory, `TZ`, `LANG`, `LC_ALL`, enumeration order, search-path order, and the
simulated path separator — rather than only repeating the run.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| Byte difference between two `compile` runs over the same package | 0 | 0 | Repeat-run comparison |
| Byte difference between two `inspect`, `diff`, and lock-build runs | 0 | 0 | Repeat-run comparison |
| Byte difference across a changed working directory, `TZ`, `LANG`, and `LC_ALL` | 0 | 0 | Varied-environment run |
| Ambient inputs read without an explicit parameter (cwd, locale, clock, hostname, environment) | 0 | 0 | Purity and parameterisation tests |
| Output difference across two search-path permutations that select the same packages | 0 | 0 | Permutation test |
| Output difference across two directory-enumeration orders | 0 | 0 | Instrumented enumeration test |
| Output difference across two `Intl.Collator` locales | 0 | 0 | Locale test |
| Output difference across a simulated `\` path separator | 0 | 0 | Injected-host test |
| Reads or module loads performed outside the injected host | 0 | 0 | Instrumented-host run |
| New dependencies added to `package.json` | 0 | 0 | Dependency inspection |
| `@typespec/*` specifiers that are not an exact version | 0 | 0 | Dependency inspection |
| `file:`/`link:` specifiers and committed `.npmrc` files | 0 | 0 | Dependency inspection |
| Prohibited-path files changed | 0 | 0 | Branch diff |

## Verification

Compile, inspect, diff, and build the lock twice over the same fixture package
and compare bytes; repeat with a different working directory and with `TZ`,
`LANG`, and `LC_ALL` set to values a second host would carry; permute the
search-path order and the injected enumeration order and compare; sort the
emitted identities under two `Intl.Collator` locales and confirm the code-point
order is unchanged; drive a compile through an injected host that reports a `\`
separator and confirm the emitted paths are unchanged; count the reads and
module loads the injected host did not see; grep the compiler for `Date`,
`Date.now`, `process.env`, `process.cwd`, `process.platform`, `os.`,
`Math.random`, `localeCompare`, `toLocaleString`, `Intl`, `path.sep`, and
`node:fs`; diff the branch against `origin/main` restricted to the prohibited
paths; inspect `package.json` and `pnpm-lock.yaml`.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| NFR-019-AC-1 | Two `compile` runs over the same package produce identical IR, lock, and diagnostic bytes. | Test |
| NFR-019-AC-2 | Two `inspect` runs and two `diff` runs produce identical bytes. | Test |
| NFR-019-AC-3 | No module in scope references `Date`, `Date.now`, `process.env`, `process.cwd`, `process.platform`, `os.hostname`, `Math.random`, `localeCompare`, `toLocaleString`, `Intl`, `path.sep`, or `node:fs` outside a test. | Analysis |
| NFR-019-AC-4 | Two permutations of the search-path order that select the same packages produce identical output. | Test |
| NFR-019-AC-5 | Two injected directory-enumeration orders produce identical output. | Test |
| NFR-019-AC-6 | The emitted identity order is unchanged when compared against `Intl.Collator` orderings for at least two distinct locales. | Test |
| NFR-019-AC-7 | A compile with every environment variable cleared but `PATH`, and a compile with `TZ`, `LANG`, and `LC_ALL` set to values differing from the first run, both produce identical output. | Test |
| NFR-019-AC-8 | A compile driven from a different working directory produces identical output. | Test |
| NFR-019-AC-9 | A compile through an injected host reporting a `\` path separator produces identical emitted paths. | Test |
| NFR-019-AC-10 | Every file-system read and every JavaScript module load a fixture compile performs is observed by the injected host, counted at run time, and the count of unobserved operations is zero. | Test |
| NFR-019-AC-11 | The branch changes no file under the prohibited paths, verified by a diff against `origin/main`. | Analysis |
| NFR-019-AC-12 | `package.json` gains no dependency, every `@typespec/*` specifier is an exact version, no `.npmrc` is committed, and no `file:`/`link:` specifier exists. | Analysis |

## Dependencies

- **Upstream**: [NFR-008](./NFR-008-deterministic-semantic-compilation.md), [NFR-017](./NFR-017-deterministic-promoted-compilation.md), issue #42
- **Downstream**: [FR-046](../functional/FR-046-lower-typespec-to-contract-ir.md), [FR-048](../functional/FR-048-build-and-verify-the-lock-and-fingerprint.md), [FR-052](../functional/FR-052-provide-the-compiler-command-line.md), issue #20
