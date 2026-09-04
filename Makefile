# =============================================================================
# filament-core-data Makefile
# =============================================================================
# Delegates to pnpm scripts. The agent-ix/nodejs-actions reusable CI/release
# workflows drive `make install`, `make lint`, `make test`, `make build`.
# =============================================================================

.PHONY: install
install:
	pnpm install

.PHONY: build
build:
	pnpm run build

.PHONY: test
test: test-node test-python

.PHONY: test-node
test-node:
	pnpm run test
	$(MAKE) rust

# The Python half of the suite (issue #23, FR-072). Before this target the
# repository had no entry point that ran pytest at all: `make test` was vitest
# alone, and the 131 assertions issues #20 and #34 added under `tests/` ran only
# when someone remembered to. Every gate this repository states about absent
# tooling — fail with a provisioning message, never skip — needs somewhere to
# run, so it runs here.
.PHONY: test-python
test-python:
	poetry run pytest -q

.PHONY: lint
lint: lint-node lint-python

.PHONY: lint-node
lint-node:
	pnpm run lint
	node scripts/build-rust-backend-docs.mjs --check
	node src/compiler/backends/rust-serde/cli.mjs register --check
	node src/compiler/backends/rust-serde/cli.mjs mutations --check

# Issue #23 (SR-105 FND-1191). `ruff` and `black` were pinned dev dependencies
# that no target ran, so their findings accumulated unseen. `make lint` is the
# entry point the CI action calls, so it is where they belong.
.PHONY: lint-python
lint-python:
	poetry run ruff check python_backend tests scripts
	poetry run black --check python_backend tests scripts

.PHONY: typecheck
typecheck:
	pnpm run typecheck

.PHONY: format
format:
	pnpm run format

.PHONY: format-check
format-check:
	pnpm run format:check

.PHONY: generate
generate:
	pnpm run generate

# -----------------------------------------------------------------------------
# Python distribution (agent-ix-core-data)
# -----------------------------------------------------------------------------
# The TypeScript binding ships to npm from release.yml; the Python binding ships
# to internal-pypi from python-release.yml. agent-ix/python-service-actions calls
# `make version` to resolve what to publish, so this target is the Python side's
# contract with that action.
#
# Versioning is the house dynamic pattern: build-tools derives the version from
# the latest git tag, so publishing a new version means tagging, not editing
# pyproject.toml. The [tool.poetry] version is a placeholder.

POETRY = poetry
POE = $(POETRY) run poe

.PHONY: version
version:
	@$(POE) version

.PHONY: info
info:
	@$(POE) info

# -----------------------------------------------------------------------------
# semantic-core (issue #35) — compiled with the root-installed TypeSpec toolchain
# -----------------------------------------------------------------------------
# No workspace file and no package.json script: the build is a Makefile concern
# (NFR-014). The package itself ships to npm.ix (issue #40) for Wave 4 module
# consumption; the public packages remain issue #11.

.PHONY: semantic-core-compile
semantic-core-compile:
	pnpm exec tsp compile packages/semantic-core --no-emit

.PHONY: semantic-core-generate
semantic-core-generate:
	node packages/semantic-core/scripts/generate.mjs

.PHONY: semantic-core-check
semantic-core-check:
	node packages/semantic-core/scripts/generate.mjs --check

# -----------------------------------------------------------------------------
# Conformance corpus and differential oracle (issue #20)
# -----------------------------------------------------------------------------
# The corpus lives entirely under conformance/ (NFR-016). `make test` already
# runs its gates through test/conformance-corpus.test.ts, so CI needs no
# workflow change; these targets are for running it directly.
#
# `conformance` is clock-free and produces a byte-identical report for an
# unchanged corpus. `conformance-audit` is the only entry point that reads a
# clock: it reports divergence-register entries past their review date.
#
# Both call node directly: issue #9's non-disruption gate requires package.json
# to stay byte-identical to main, so the corpus adds no script there.

.PHONY: conformance
conformance:
	node conformance/runner/differential.mjs

.PHONY: conformance-audit
conformance-audit:
	node conformance/tools/audit.mjs

# -----------------------------------------------------------------------------
# Promoted prototype compiler (issue #27)
# -----------------------------------------------------------------------------
# The narrow build interface lives in src/compiler/. It is repo-internal for
# issue #27: package.json `exports` gains no `./compiler` entry and @typespec/*
# stay devDependencies until issue #11 publishes.

ENTRYPOINT ?= spikes/typespec-feasibility/main.tsp
OUT ?= dist/semantic-ir.json
GENERATOR ?=

.PHONY: compiler-emit-ir
compiler-emit-ir:
	node src/compiler/cli.mjs emit-ir --entrypoint $(ENTRYPOINT) $(if $(GENERATOR),--generator $(GENERATOR),) --out $(OUT)

# -----------------------------------------------------------------------------
# Contract compiler (issue #19)
# -----------------------------------------------------------------------------
# The contract path: resolve a package graph, build and verify its lock, run the
# selected frontend, validate, and write one versioned IR document. `emit-ir`
# above stays the frozen issue #4 prototype route.

PACKAGE ?= test/fixtures/compiler/packages/assurance
COMPILE_OUT ?= dist/compiler/semantic-ir.json
IR ?= $(COMPILE_OUT)
PROFILE ?= default
ENTRY ?= types/main.tsp

.PHONY: compiler-compile
compiler-compile:
	node src/compiler/cli.mjs compile --package $(PACKAGE) --profile $(PROFILE) --entrypoint $(ENTRY) --out $(COMPILE_OUT)

.PHONY: compiler-inspect
compiler-inspect:
	node src/compiler/cli.mjs inspect --ir $(IR) --package $(PACKAGE)

.PHONY: compiler-diff
compiler-diff:
	node src/compiler/cli.mjs diff --old $(OLD) --new $(NEW) --out $(DIFF_OUT)

# -----------------------------------------------------------------------------
# Rust/Serde semantic codegen backend (issue #21)
# -----------------------------------------------------------------------------
# The generator is JavaScript under `src/compiler/backends/rust-serde/`; the
# reader, the conformance adapter and the two consumers are Rust under
# `crates/`. These targets call `node` and `cargo` directly: `package.json` is a
# prohibited path under NFR-023, so nothing here adds a script there.
#
# CARGO_TARGET_DIR is set on every target rather than left to `.cargo/config.toml`,
# because the environment variable takes precedence over the config key and the
# authoring host sets it globally. A determinism gate that compares a rebuilt
# artifact against one another checkout left behind measures nothing.
#
# No target is allowed to skip. A gate whose toolchain is missing fails saying
# it could not run, which is what NFR-022-AC-1 requires.

# Inside `node_modules/`, deliberately. The directory has to be per-worktree, or
# a shared cargo target serves a determinism gate an artifact another checkout
# built; and it has to be somewhere `biome format .` does not walk, or every
# `make lint` after a `make rust-build` fails on cargo's own fingerprint JSON.
# `node_modules/` is already gitignored and already skipped by biome, so it is
# the one directory that satisfies both without touching `biome.json`, which
# NFR-023 prohibits.
export CARGO_TARGET_DIR := $(CURDIR)/node_modules/.cache/rust-target
RUST_OUT ?= $(CARGO_TARGET_DIR)/generated

.PHONY: rust-toolchain-check
rust-toolchain-check:
	@command -v cargo >/dev/null || { echo "cargo is not on PATH: the Rust gates cannot run, and this is a failure rather than a skip"; exit 1; }
	@command -v rustfmt >/dev/null || { echo "rustfmt is not on PATH: the FR-060 formatter gate cannot run, and this is a failure rather than a skip"; exit 1; }

.PHONY: rust-generate
rust-generate: rust-toolchain-check
	node src/compiler/backends/rust-serde/cli.mjs generate --out $(RUST_OUT)

# The goldens under `test/fixtures/rust-serde/goldens/` are transcribed once, by
# `cli.mjs generate --out` writing into them. `rust-check` never writes there:
# it regenerates into a scratch directory under CARGO_TARGET_DIR and compares,
# so the check cannot pass by comparing a file to itself and cannot leave the
# tree dirty (FR-060-CON-1).
#
# The goldens hold the emitted *crates*. The output manifests generation writes
# beside them are not transcribed: they are `JSON.stringify` output that
# `biome format` reformats, so a committed manifest would make `make lint` and
# `make rust-check` demand two different files. The manifest is gated instead
# by `--manifests`, which reads the freshly generated ones and checks the file
# list each carries is sorted by path by code point (FR-060-AC-10).
GOLDENS := test/fixtures/rust-serde/goldens
RUST_GOLDEN_SCRATCH := $(CARGO_TARGET_DIR)/golden-write
RUST_CHECK_SCRATCH := $(CARGO_TARGET_DIR)/golden-check

.PHONY: rust-goldens
rust-goldens:
	rm -rf $(GOLDENS) $(RUST_GOLDEN_SCRATCH)
	mkdir -p $(GOLDENS) $(RUST_GOLDEN_SCRATCH)
	node src/compiler/backends/rust-serde/cli.mjs generate --out $(RUST_GOLDEN_SCRATCH)
	for crate in $(RUST_GOLDEN_SCRATCH)/*/; do cp -r "$$crate" $(GOLDENS)/; done

# The digest baseline is written by a *different* script from the one that
# writes the goldens, and the two reach the emitter through different entry
# points, so a single emitter change has to move two artifacts by two
# deliberate acts before the check goes green again (FR-060-AC-12).
.PHONY: rust-digests
rust-digests:
	node scripts/build-rust-backend-goldens.mjs --write-digests

.PHONY: rust-check
rust-check: rust-toolchain-check
	node src/compiler/backends/rust-serde/cli.mjs check
	rm -rf $(RUST_CHECK_SCRATCH)
	mkdir -p $(RUST_CHECK_SCRATCH)
	node src/compiler/backends/rust-serde/cli.mjs generate --out $(RUST_CHECK_SCRATCH)
	for crate in $(GOLDENS)/*/; do diff -ru "$$crate" "$(RUST_CHECK_SCRATCH)/$$(basename $$crate)"; done
	node scripts/build-rust-backend-goldens.mjs --manifests $(RUST_CHECK_SCRATCH)
	node scripts/build-rust-backend-goldens.mjs --check-digests
	node scripts/build-rust-backend-goldens.mjs --determinism
	node scripts/build-rust-backend-goldens.mjs --rustfmt
	node scripts/build-rust-backend-goldens.mjs --matrix

.PHONY: rust-docs
rust-docs:
	node scripts/build-rust-backend-docs.mjs

.PHONY: rust-docs-check
rust-docs-check:
	node scripts/build-rust-backend-docs.mjs --check

.PHONY: rust-build
rust-build: rust-toolchain-check
	cargo build --offline --workspace --locked
	cargo fmt --all -- --check

.PHONY: rust-test
rust-test: rust-toolchain-check
	cargo test --offline --workspace --locked

.PHONY: rust-conformance
rust-conformance: rust-toolchain-check
	cargo build --offline --locked -p agent-ix-conformance-adapter
	node conformance/runner/differential.mjs

.PHONY: rust-install-from-artifact
rust-install-from-artifact: rust-toolchain-check
	node src/compiler/backends/rust-serde/cli.mjs install-from-artifact

.PHONY: rust-mutate
rust-mutate: rust-toolchain-check
	node src/compiler/backends/rust-serde/cli.mjs mutate

.PHONY: rust-fuzz
rust-fuzz: rust-toolchain-check
	node src/compiler/backends/rust-serde/cli.mjs fuzz

# The consolidated Rust gates `make test` runs. They are the edit-loop set: the
# long property, fuzz and mutation runs are `rust-deep`, which is scheduled
# separately (FR-060-AC-15).
#
# `rust-toolchain-check` is a prerequisite of every one of them, so a machine
# with no Rust toolchain fails here naming what it could not run. That is the
# intended reading: an absent toolchain is a red suite, never a green one.
.PHONY: rust
rust: rust-check rust-build rust-test rust-conformance rust-install-from-artifact

.PHONY: rust-deep
rust-deep: rust-mutate rust-fuzz
	node src/compiler/backends/rust-serde/cli.mjs properties --deep
