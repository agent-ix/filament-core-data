---
id: NFR-027
title: "Reproducible and non-disruptive Python generation"
type: NFR
quality_attribute: reliability
relationships:
  - target: "ix://agent-ix/filament-core-data/US-013"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-074"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-076"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-077"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-078"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-079"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-080"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/NFR-017"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-021"
    type: "depends_on"
---
# [NFR-027] Reproducible and non-disruptive Python generation

## Statement

The repository SHALL make two clean generations from the same input set,
profile, and declared toolchain produce byte-identical artefacts and an
identical fingerprint on one host, with a regenerable and `--check`-verified
qualification report, publishing nothing, migrating no consumer, running every
added gate rather than skipping it, and leaving every artefact outside the
permitted paths byte-identical to `origin/main`.

## Scope

- Applies to: `python_backend/**`, `tests/test_python_backend*.py`, `test/python-backend*.test.ts`, `test/changed-paths.ts` and the six suites this change converts, `Makefile`, `pyproject.toml`, `poetry.lock`.
- Permitted paths: as [NFR-026](./NFR-026-sandboxed-python-generation.md).
- Prohibited paths: as [NFR-026](./NFR-026-sandboxed-python-generation.md).

## Rationale

A generated artefact that is not reproducible cannot be reviewed: a diff between
two runs is indistinguishable from a diff caused by a change. The pinned
generator has three sources of run-to-run variation — a timestamp header, an
external formatter selection the version itself warns will change, and
hash-ordered iteration — and each is closed by a declared profile option or a
fixed environment rather than by hoping.

Same-host reproduction and cross-host reproduction are different obligations and
are stated separately here. Issue #42 records what happens when they are
conflated: host-observed tool versions inside a byte-compared set make an
artefact irreproducible off the minting host, and TC-370 and TC-382 are blocked
on exactly that. This change therefore keeps every host-observed reading out of
every byte-compared artefact and claims only same-host byte identity plus a
declared-toolchain fingerprint that a second host can recompute.

The non-disruption half is the repository's standing rule, and its four known
failure shapes are recorded in `test/changed-paths.ts`. Six suites still resolve
their gates with `changedPathsFrom(root, "main" | "origin/main")` — the quiet
shape, which stops asserting once a change merges, and the accreting shape, which
annexes a later ticket's paths and then fails the earlier ticket for them. That
is open as issue #51, and it is not a background concern for this change: it is
why those six suites cannot see a new directory except by widening six
permitted-path lists, which issue #55 records as how a guard gets disabled
incrementally. This change converts the six rather than widen them, so its own
non-disruption claim rests on gates that assert.

The safety gate on issue #23 forbids PyPI publication and backend consumer
migration until the compatibility and release-readiness gates pass. Those gates
have not moved, so this change ships evidence and owned code, not a package.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| Byte differences between two clean generations on one host | 0 | 0 | Double-generation test |
| Toolchain fingerprint differences between two clean generations | 0 | 0 | Double-generation test |
| Host-observed readings inside a byte-compared artefact | 0 | 0 | Artefact scan |
| Clock, hostname, user, or absolute-path readings in generated output | 0 | 0 | Output scan |
| Qualification report or corpus account differences on re-measurement | 0 | 0 | `--check` gate |
| Changed paths outside the permitted list | 0 | 0 | History-pinned changed-path gate |
| Published packages, changed publication workflows, or migrated consumers | 0 | 0 | Branch diff |
| Changed-path gates in the repository whose range is computed against a moving ref | 0 | 0 | Guard source analysis |
| Permitted-path entries added to a merged suite's list by this change | 0 | 0 | Branch diff |
| Skipped tests in the added suites | 0 | 0 | Run report |
| Added gates with no execution path in the repository's own test entry point | 0 | 0 | Make target analysis |

## Verification

Generate twice into disjoint scratch roots and compare file maps and fingerprints
byte-for-byte; scan every committed artefact this change adds for a patch-level
interpreter version, a formatter version, a hostname, a user name, and an
absolute path; re-measure the qualification report and the corpus account and
compare to the committed ones, then mutate a committed one and confirm `--check`
fails; enumerate the branch's changed paths through `changedPathsOf` with
sentinels pinned to this change's own first and last commits and confirm none is
prohibited; assert the npm `files`/`exports`, `pyproject.toml`
`packages`/`include`, and every workflow are unchanged from `origin/main`; assert
by source analysis that no changed-path gate in `test/` resolves its range from
`main` or `origin/main` and that every `git diff` in a gate passes
`--no-renames`; confirm each converted suite still fails on the input it exists
to catch, by perturbation in a scratch clone; run the added suites through the
repository's own test entry point and read the skip count from the run's report.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| NFR-027-AC-1 | Two clean generations of every demonstrated profile on one host produce byte-identical file maps and identical fingerprints. | Integration |
| NFR-027-AC-2 | No generated byte and no committed artefact this change adds encodes a clock reading, a hostname, a user name, an absolute path, a patch-level interpreter version, or a formatter version. | Static |
| NFR-027-AC-3 | Re-measuring the qualification report and the corpus account reproduces the committed ones; a mutated committed artefact fails `--check`. | Snapshot |
| NFR-027-AC-4 | No path this branch changes falls outside the permitted list, measured over the branch's own historical change range. | Analysis |
| NFR-027-AC-5 | The npm `files` and `exports`, `pyproject.toml`'s `packages` and `include`, and every file under `.github/` are byte-identical to `origin/main`. | Analysis |
| NFR-027-AC-6 | No changed-path gate under `test/` resolves its range from `main` or `origin/main`, every one pins both endpoints to history through sentinel files, and every `git diff` a gate runs passes `--no-renames`. | Static |
| NFR-027-AC-7 | Every changed-path gate fails, saying it did not run, when its sentinels are absent from history, rather than asserting over an empty set — measured for each converted suite in a scratch clone. | Test |
| NFR-027-AC-8 | Each converted suite still fails on a prohibited path introduced into a simulated post-merge tree, so the conversion preserved what each gate catches. | Test |
| NFR-027-AC-9 | This change adds no entry to any merged suite's permitted-path list. | Analysis |
| NFR-027-AC-10 | Every gate this change adds runs from the repository's own test entry point, and the added suites report zero skipped tests read from the run's own report. | Test |
| NFR-027-AC-11 | Nothing was published: no publication workflow changed, no distribution manifest gained a path under `python_backend/`, and no consumer imports the generated package. | Analysis |
| NFR-027-AC-12 | Reverting this change restores the tree to its pre-change state exactly, including the six converted suites. | Test |

## Dependencies

- **Upstream**: [NFR-017](./NFR-017-deterministic-promoted-compilation.md), [NFR-021](./NFR-021-non-disruptive-compiler-core.md)
- **Downstream**: [FR-076](../functional/FR-076-run-python-generation-sandboxed.md), [FR-077](../functional/FR-077-qualify-each-python-output-family.md), [FR-079](../functional/FR-079-emit-the-python-package-layout.md), [FR-080](../functional/FR-080-type-check-and-validate-generated-python.md)
