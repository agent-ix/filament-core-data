---
id: SR-16475
title: "Code review of IR-1073 Python test gate"
type: SpecReview
analysis: code-review
scope: "agent-ix/filament-core-data; Makefile, README.md, test/exact-numeric-traces.test.ts, test/numeric-backend-matrix.test.ts; IR-1073"
review_set: subset
---

## Summary

Reviewed PR #323 at 1a7516f4ed1ee53f1adc5dc3d311a49435b6c53b against IR-1073. The two numeric subprocesses use the repository interpreter and retain their assertions, but some Make entry points can still bypass the prerequisite.

## Verdict

**CONDITIONAL** — the sequential default path is improved, but the parallel aggregate path and two direct targets can still produce unrelated failures before the prerequisite message.

## Coverage

- Examined IR-1073 deliverable: tests and Makefile targets resolve the project interpreter deterministically, fail with one clear prerequisite message when Poetry or `.venv` is absent, and document prerequisites.
- Examined changed Makefile and README lines, both changed numeric tests, `package.json` test script, `scripts/check-sysml-pilot.mjs`, `scripts/spec-to-targets.mjs`, and relevant target dependencies.
- `test` and `test-all` inherit `VIRTUAL_ENV` through their prerequisite graph; `test-node` prepends `.venv/bin` to PATH; the changed tests invoke `.venv/bin/python` explicitly. The changed subprocess assertions remain intact.
- No applicable AssuranceProfile found for the changed behavior.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | medium | A parallel `make test-all` starts other gate work before the Python prerequisite fails, so the promised single early failure is not guaranteed. | Makefile:40 |
| FND-002 | medium | Standalone `test-rust` and `sysml-pilot-check` can invoke Poetry without `python-test-env-check`, so these Make test entry points do not give the promised prerequisite message. | Makefile:53, Makefile:355 |

## Evidence

For FND-001, `make -j4 -f Makefile -f /tmp/ir1073-review/parallel.mk test-all` with a delayed failing prerequisite and harmless override of the gate recipes printed `sysml-gate-started` before Make reported `prerequisite-failed`. The ordinary dependency graph has the same sibling relation: `python-test-env-check` and `sysml-pilot-check` are separate prerequisites of `test-all`.

For FND-002, `make -n test-rust` begins with `rust-toolchain-check` and Rust gate commands, with no `python-test-env-check`. `spec-to-targets` invokes `poetry run python3`; `sysml-pilot-check` invokes `poetry run python` directly.
