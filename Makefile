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
test:
	pnpm run test

.PHONY: lint
lint:
	pnpm run lint

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

export CARGO_TARGET_DIR := $(CURDIR)/target
RUST_OUT ?= $(CURDIR)/target/generated

.PHONY: rust-toolchain-check
rust-toolchain-check:
	@command -v cargo >/dev/null || { echo "cargo is not on PATH: the Rust gates cannot run, and this is a failure rather than a skip"; exit 1; }
	@command -v rustfmt >/dev/null || { echo "rustfmt is not on PATH: the FR-060 formatter gate cannot run, and this is a failure rather than a skip"; exit 1; }

.PHONY: rust-generate
rust-generate: rust-toolchain-check
	node src/compiler/backends/rust-serde/cli.mjs generate --out $(RUST_OUT)

.PHONY: rust-check
rust-check: rust-toolchain-check
	node src/compiler/backends/rust-serde/cli.mjs check

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

.PHONY: rust-deep
rust-deep: rust-mutate rust-fuzz
	node src/compiler/backends/rust-serde/cli.mjs properties --deep
