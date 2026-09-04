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
