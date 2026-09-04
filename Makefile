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
# No workspace file and no package.json script: the package is private until
# issue #11 publishes it, so the build is a Makefile concern (NFR-014).

.PHONY: semantic-core-compile
semantic-core-compile:
	pnpm exec tsp compile packages/semantic-core --no-emit

.PHONY: semantic-core-generate
semantic-core-generate:
	node packages/semantic-core/scripts/generate.mjs

.PHONY: semantic-core-check
semantic-core-check:
	node packages/semantic-core/scripts/generate.mjs --check
