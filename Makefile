# =============================================================================
# filament-core-data Makefile
# =============================================================================
# Delegates to pnpm scripts. The agent-ix/nodejs-actions reusable CI/release
# workflows drive `make install`, `make lint`, `make test`, `make build`.
# =============================================================================

.PHONY: install
install:
	pnpm install
# The Node conformance suite starts the `python-backend` adapter as a process
# (conformance/adapters/registry.json), so the Python environment is a
# prerequisite of `make test-node` and not only of `make test-python`. Before
# this line `make install` provisioned half of what `make test` runs.
	poetry install

.PHONY: build
build:
	pnpm run build

# The three halves of the suite, one per toolchain, because one per toolchain is
# what a lane can install (issue #60).
#
# `test` was `test-node test-python`, and `test-node` ran `$(MAKE) rust` — so
# the Node lane, which installs no Rust toolchain, has been invoking cargo
# through a target named for another language. `make test-all` is the local
# everything; each named half is what a CI lane with that toolchain can run.
.PHONY: test
test: test-node test-python

.PHONY: test-all
test-all: test-node test-rust test-python

.PHONY: test-node
test-node:
	pnpm run test

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
# TypeScript generation backend (issue #22)
# -----------------------------------------------------------------------------
# `generate` reads one IR document and writes a generated package to a
# caller-named directory. `generate-typescript-check` regenerates the committed
# fixture into a scratch directory *outside* the tree and compares; it never
# rewrites a committed artifact in place, because regenerating inside the
# working tree is the defect issue #49 records, where three unrelated
# changed-path gates failed at random against a file another suite was part way
# through rewriting.
#
# Both call `node` directly: `package.json` gains no script, because NFR-025
# asserts its `exports`, `main`, `module`, `types`, `files` and every dependency
# block byte-unchanged.

GENERATE_IR ?= test/fixtures/backends/typescript/input/semantic-ir.json
GENERATE_TARGET ?= typescript
GENERATE_OUT ?= dist/generated/typescript
GENERATE_FIXTURE ?= test/fixtures/backends/typescript/expected

.PHONY: generate-typescript
generate-typescript:
	node src/compiler/cli.mjs generate --ir $(GENERATE_IR) --target $(GENERATE_TARGET) --out-root $(GENERATE_OUT) --manifest $(GENERATE_OUT)/output-manifest.json

.PHONY: generate-typescript-check
generate-typescript-check:
	@scratch=$$(mktemp -d) ; \
	trap 'rm -rf "$$scratch"' EXIT ; \
	node src/compiler/cli.mjs generate --ir $(GENERATE_IR) --target $(GENERATE_TARGET) --out-root "$$scratch" --manifest "$$scratch/output-manifest.json" ; \
	diff -ru $(GENERATE_FIXTURE) "$$scratch"

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

# The workspace lint gate (issue #60). Until this target existed, `cargo clippy`
# ran over exactly one crate — `extraction-frontend-test` — so every other
# member's lints were unmeasured. `--no-deps` keeps the gate about this
# workspace's own code, as NFR-033-AC-7 already requires of the crate-level run.
.PHONY: rust-clippy
rust-clippy: rust-toolchain-check
	@command -v cargo-clippy >/dev/null 2>&1 || cargo clippy --version >/dev/null 2>&1 || { echo "cargo clippy is not installed (rustup component add clippy): the workspace lint gate cannot run, and this is a failure rather than a skip"; exit 1; }
	cargo clippy --workspace --locked --all-targets --no-deps -- -D warnings

.PHONY: rust-test
rust-test: rust-toolchain-check
	cargo test --offline --workspace --locked

.PHONY: rust-conformance
rust-conformance: rust-toolchain-check
	cargo build --offline --locked -p agent-ix-conformance-adapter
	node conformance/runner/differential.mjs

.PHONY: rust-install-from-artifact
rust-install-from-artifact: rust-toolchain-check
	node scripts/rust-backend-harness.mjs install-from-artifact

.PHONY: rust-mutate
rust-mutate: rust-toolchain-check
	node scripts/rust-backend-harness.mjs mutate

.PHONY: rust-fuzz
rust-fuzz: rust-toolchain-check
	node scripts/rust-backend-harness.mjs fuzz

# The consolidated Rust gates `make test` runs. They are the edit-loop set: the
# long property, fuzz and mutation runs are `rust-deep`, which is scheduled
# separately (FR-060-AC-15).
#
# `rust-toolchain-check` is a prerequisite of every one of them, so a machine
# with no Rust toolchain fails here naming what it could not run. That is the
# intended reading: an absent toolchain is a red suite, never a green one.
.PHONY: rust
rust: rust-check rust-build rust-clippy rust-test rust-conformance rust-install-from-artifact

# The Rust half of the suite, named where a reader looks for it (issue #60).
#
# Every gate below already ran, but only as a step inside `test-node` — so the
# Makefile's own vocabulary said this repository had a Node half and a Python
# half, and anyone asking "what runs the Rust gates" had to read the recipe of a
# target named for another language. The extraction-frontend crate's gates were
# not in `make test` at any depth.
.PHONY: test-rust
test-rust: rust extraction-frontend-test spec-to-targets

# The qualification toolchain, for a CI lane that has to install it before it can
# run anything. Printed rather than duplicated in the workflow, so the version
# lives in exactly one place (NFR-033: named once in the Makefile).
.PHONY: print-extraction-toolchain
print-extraction-toolchain:
	@echo $(EXTRACTION_TOOLCHAIN)

.PHONY: rust-deep
rust-deep: rust-mutate rust-fuzz
	node scripts/rust-backend-harness.mjs properties --deep

# The semantic kernel (issue #11). `semantic-kernel` writes every generated
# artifact; `semantic-kernel-check` writes nothing and fails if any would
# change. Generation only: publication passes agent-ix/quoin#290.
.PHONY: semantic-kernel
semantic-kernel:
	node scripts/build-semantic-kernel.mjs

# The digest baseline is written by a *different* script from the one that
# writes the crate, and the two reach the emitter through different entry
# points, so one emitter change has to move two artifacts by two deliberate
# acts before the check goes green again (FR-086-CON-4).
.PHONY: semantic-kernel-digests
semantic-kernel-digests:
	node scripts/build-semantic-kernel-digests.mjs --write

# The kernel scratch lives outside the working tree, and outside every
# CARGO_TARGET_DIR a `rust-*` target writes to, so no check can pass by
# comparing a file to itself, none can be served a stale artifact another gate
# left behind, and none can leave the tree dirty (FR-086-CON-3, FR-086-AC-10).
KERNEL_SCRATCH := $(shell printf '%s/fcd-semantic-kernel-%s' "$${TMPDIR:-/tmp}" "$(notdir $(CURDIR))")

# Neither writing target is a prerequisite here: a check that regenerates its
# own baseline compares a file to itself.
.PHONY: semantic-kernel-check
semantic-kernel-check:
	node scripts/build-semantic-kernel.mjs --check
	node scripts/check-semantic-kernel-crate.mjs --tree $(KERNEL_SCRATCH)/tree
	node scripts/build-semantic-kernel-digests.mjs --check
	node scripts/check-semantic-kernel-crate.mjs --manifest
	node scripts/check-semantic-kernel-crate.mjs --rustfmt
	node scripts/check-semantic-kernel-crate.mjs --build $(KERNEL_SCRATCH)/build
	node scripts/check-semantic-kernel-crate.mjs --gate
	rm -rf $(KERNEL_SCRATCH)

# -----------------------------------------------------------------------------
# Spec-bundle extraction frontend (issue #36)
# -----------------------------------------------------------------------------
# `crates/extraction-frontend` is qualified on exactly Rust 1.98.1 (NFR-033)
# while the rest of the workspace stays on `rust-toolchain.toml`'s 1.94.1, so
# every gate here invokes `cargo +$(EXTRACTION_TOOLCHAIN)` explicitly. A gate
# that ran on whatever `cargo` resolves to would measure the host, not the
# crate. An absent toolchain is a red gate naming the toolchain — never a skip
# (FR-099-AC-4, NFR-033-AC-2).
#
# `--locked` on every cargo call: the workspace lock was resolved under 1.94.1
# and this crate's additions under 1.98.1, so a resolver difference surfaces
# as a red gate with a Cargo.lock diff rather than as a silent rewrite.
# CARGO_TARGET_DIR is the per-worktree directory exported above.
#
# `clippy --no-deps`: the crate's path dependency `agent-ix-semantic-ir` is a
# workspace member qualified on 1.94.1's clippy, and cargo lints workspace
# path dependencies along with the requested package. Linting it under 1.98.1's
# newer lint set would measure another member's code against a toolchain it
# does not claim; NFR-033's "qualified on 1.98.1" covers this crate alone.
#
# Task-127 landed the toolchain gate, build and test; Task-135 (FR-099) the
# rest. `extraction-frontend-lift` takes BUNDLE, MODULES (space-separated,
# each one `--module`; the fixtures need both module roots) and OUT.
# `extraction-frontend-goldens` is the only writer of `fixtures/*/expected/`:
# it lifts every fixture bundle into a staging directory under
# CARGO_TARGET_DIR and installs the result, because a bundle root refuses a
# direct write (FR-097). `extraction-frontend-check` regenerates into a scratch
# directory under CARGO_TARGET_DIR and `diff -ru`s each committed `expected/`
# against it; it never writes under `fixtures/`, and a fixture that is not a
# bundle root (`negatives/<CODE>/constructed.json`) is not regenerated and so
# not diffed. `extraction-frontend-audit` scans the workspace lock (cargo
# audit reads it as written and has no `--locked`); `--deny yanked` mirrors
# the crate's `deny.toml` advisory policy, which cargo audit cannot read.
# EXTRACTION_FIXTURES, EXTRACTION_MANIFEST and EXTRACTION_LOCKFILE point the
# check, deny and audit gates at a scratch copy so `tests/make.rs` can
# falsify them without touching the tree.

EXTRACTION_TOOLCHAIN ?= 1.98.1
EXTRACTION_CRATE := agent-ix-extraction-frontend

.PHONY: extraction-frontend-toolchain
extraction-frontend-toolchain:
	@rustup run $(EXTRACTION_TOOLCHAIN) cargo --version >/dev/null 2>&1 || { echo "Rust toolchain $(EXTRACTION_TOOLCHAIN) is not installed (rustup toolchain install $(EXTRACTION_TOOLCHAIN)): the extraction-frontend gates cannot run, and this is a failure rather than a skip"; exit 1; }

.PHONY: extraction-frontend-build
extraction-frontend-build: extraction-frontend-toolchain
	cargo +$(EXTRACTION_TOOLCHAIN) build --locked -p $(EXTRACTION_CRATE)
	cargo +$(EXTRACTION_TOOLCHAIN) fmt -p $(EXTRACTION_CRATE) -- --check

.PHONY: extraction-frontend-test
extraction-frontend-test: extraction-frontend-toolchain
	cargo +$(EXTRACTION_TOOLCHAIN) test --locked -p $(EXTRACTION_CRATE)
	cargo +$(EXTRACTION_TOOLCHAIN) clippy --locked -p $(EXTRACTION_CRATE) --no-deps --all-targets -- -D warnings

# `extraction-frontend-evidence` runs the crate's `#[ignore]`d static-evidence
# tests (the Make, change-set, audit and toolchain rehearsals, which nest
# `cargo test`, `make`, or the network-backed `cargo deny`/`cargo audit`), so
# the rows they bind have a named producer (SR-170 FND-1505). A test
# `#[ignore]`d as *blocked* on an open issue fails by design until the issue
# closes and is skipped here by name; run one deliberately with
# `cargo +1.98.1 test -p agent-ix-extraction-frontend -- --ignored --exact <name>`.
#
# The list is empty, and empty is the point rather than an omission. Every test
# that was ever named here is now live: TC-1290 and TC-1291 unblocked when #87
# closed, TC-1292's two halves when #88 and #90 did. An entry left behind after
# its issue closes skips nothing while still asserting the test is blocked, so
# the list is emptied as each one lands rather than kept as a record of what
# used to be.
EXTRACTION_BLOCKED_TESTS :=
.PHONY: extraction-frontend-evidence
extraction-frontend-evidence: extraction-frontend-toolchain
	cargo +$(EXTRACTION_TOOLCHAIN) test -p $(EXTRACTION_CRATE) --locked --offline --no-fail-fast -- --ignored $(foreach test,$(EXTRACTION_BLOCKED_TESTS),--skip $(test))

EXTRACTION_FIXTURES ?= crates/extraction-frontend/fixtures
EXTRACTION_MANIFEST ?= crates/extraction-frontend/Cargo.toml
EXTRACTION_LOCKFILE ?= Cargo.lock
EXTRACTION_GOLDEN_STAGING := $(CARGO_TARGET_DIR)/extraction-frontend-goldens
EXTRACTION_CHECK_SCRATCH := $(CARGO_TARGET_DIR)/extraction-frontend-check
EXTRACTION_RUN := cargo +$(EXTRACTION_TOOLCHAIN) run --locked -p $(EXTRACTION_CRATE) --bin extraction-frontend --
MODULES ?= $(EXTRACTION_FIXTURES)/modules/spec-objects-business $(EXTRACTION_FIXTURES)/modules/edge-vocabulary

.PHONY: extraction-frontend-lift
extraction-frontend-lift: extraction-frontend-toolchain
	@test -n "$(BUNDLE)" || { echo "BUNDLE=<bundle root> is required"; exit 2; }
	@test -n "$(OUT)" || { echo "OUT=<document path> is required"; exit 2; }
	$(EXTRACTION_RUN) lift --bundle $(BUNDLE) $(foreach module,$(MODULES),--module $(module)) --out $(OUT)

.PHONY: extraction-frontend-goldens
extraction-frontend-goldens: extraction-frontend-toolchain
	rm -rf $(EXTRACTION_GOLDEN_STAGING)
	$(EXTRACTION_RUN) lift --write-goldens --fixtures $(EXTRACTION_FIXTURES) --staging $(EXTRACTION_GOLDEN_STAGING)

.PHONY: extraction-frontend-check
extraction-frontend-check: extraction-frontend-toolchain
	rm -rf $(EXTRACTION_CHECK_SCRATCH)
	$(EXTRACTION_RUN) lift --write-goldens --fixtures $(EXTRACTION_FIXTURES) --into $(EXTRACTION_CHECK_SCRATCH)
	@status=0; for expected in $$(find $(EXTRACTION_FIXTURES) -type d -name expected | sort); do \
	  test -f "$$expected/../spec/spec.md" || continue; \
	  rel=$${expected#$(EXTRACTION_FIXTURES)/}; \
	  echo "diff -ru $$expected $(EXTRACTION_CHECK_SCRATCH)/$$rel"; \
	  diff -ru "$$expected" "$(EXTRACTION_CHECK_SCRATCH)/$$rel" || status=1; \
	done; exit $$status

# -----------------------------------------------------------------------------
# The end-to-end spec path (EPIC #100 criterion 2)
# -----------------------------------------------------------------------------
# One gate for the whole chain: markdown bundle -> Rust lift -> semantic IR ->
# every generated target. The lift and each backend already have gates of their
# own; none of them asserts that the two halves join, because every backend gate
# reads a hand-written IR fixture rather than the frontend's actual output.
#
# `SPEC_PIPELINE_BUNDLE` is overridable so the chain can be run against any
# bundle root on the dev host without editing this file. The default is the
# business bundle, which is the repository's only bundle authored wholly in the
# typed-table form the lift requires.

SPEC_PIPELINE_BUNDLE ?= $(EXTRACTION_FIXTURES)/business
SPEC_PIPELINE_STAGING := $(CARGO_TARGET_DIR)/spec-to-targets

.PHONY: spec-to-targets
spec-to-targets: extraction-frontend-toolchain
	rm -rf $(SPEC_PIPELINE_STAGING)
	mkdir -p $(SPEC_PIPELINE_STAGING)
	$(EXTRACTION_RUN) lift --bundle $(SPEC_PIPELINE_BUNDLE) $(foreach module,$(MODULES),--module $(module)) --out $(SPEC_PIPELINE_STAGING)/semantic-ir.json
	node scripts/spec-to-targets.mjs $(SPEC_PIPELINE_STAGING)/semantic-ir.json $(SPEC_PIPELINE_STAGING)

.PHONY: extraction-frontend-deny
extraction-frontend-deny: extraction-frontend-toolchain
	cargo +$(EXTRACTION_TOOLCHAIN) deny --manifest-path $(EXTRACTION_MANIFEST) check

.PHONY: extraction-frontend-audit
extraction-frontend-audit: extraction-frontend-toolchain
	cargo +$(EXTRACTION_TOOLCHAIN) audit --file $(EXTRACTION_LOCKFILE) --deny yanked
