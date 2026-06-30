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
