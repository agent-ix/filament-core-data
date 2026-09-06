# Issue #49: code review and closing gap account

Base: `3b75e01c652ba00bb07c352ff5467419401e792b`, also verified as GitHub main
on 2026-09-06. This is the implementing worker's review and measured account;
independent coordinator review and integration remain pending.

## Change and review

FR-033-AC-4 and TC-264 now require isolated negative regeneration and source
preservation after abrupt mutator termination. The package and formatter inputs
are copied into a unique temporary repository layout; only installed dependencies
are linked. The real generator must accept the clean copy before the mutation.
A subprocess appends a byte to the copied `EnumValue.json` and kills itself with
SIGKILL. The test requires that signal, the retained changed byte, and exit 1
from the actual generator naming that file. It compares every source-package
file's bytes before cleanup, so a successful teardown cannot hide source damage.

The obsolete EnumValue exception was removed from the changed-path helper.
Production generation, schemas, package metadata, compiler behavior and corpus
expectations are unchanged. The test uses the same installed pinned TypeSpec and
formatter dependencies as the repository generator; no alternative oracle was
introduced. Remaining shared-tree writers retain their existing explicit account.

## Measured verification

- Focused interruption regression: 1 passed, 27 deselected.
- `VIRTUAL_ENV=/home/peter/.cache/pypoetry/virtualenvs/agent-ix-core-data-XYJq1g-D-py3.13 pnpm exec vitest run test/semantic-core.test.ts test/python-backend.test.ts`:
  **40 passed**, two suites, 41.59 seconds. The Python-backend file here tests
  tree and historical-range controls; this does not claim the Python runtime
  qualification suite ran.
- `node_modules/.bin/tsc --noEmit --strict --skipLibCheck --moduleResolution bundler --module esnext --target es2022 --esModuleInterop test/semantic-core.test.ts test/changed-paths.ts`:
  passed.
- Formatter on both changed TypeScript files, matrix-summary `--check`, and
  `git diff --check`: passed.
- The source package has no diff after the runs; the shared main checkout also
  remains clean. No source file is restored by the repaired probe.

The initial combined run passed 39 tests and lacked `jsonschema` in the new
worktree's empty Poetry environment. The final run selected the existing project
Python 3.13.11 environment. A sandboxed retry also produced `spawnSync EPERM`
for Git, pnpm and Poetry; the final scoped run was automatically approved outside
that subprocess restriction. Neither failure was reclassified as a passing test.

## Existing baseline failures and remaining gates

`pnpm run typecheck` fails in unchanged files at this base:

- `packages/semantic-kernel/typescript/validators.ts:1155` and `:1159`:
  implicit-any `declared` array (TS7034, TS7005).
- `test/compiler-core.test.ts:4873`: incomplete diagnostic-object cast (TS2352).
- `test/semantic-kernel.test.ts`: duplicate imports at lines 1–14 (TS2300),
  missing Rust backend module declaration at line 16 (TS7016), incompatible
  mutable output cast at line 476 (TS2352), and generation request missing
  contractVersion/lockFingerprint/limits at line 477 (TS2345).

`git diff 3b75e01 --` over those three files is empty. These errors do not appear
in the focused strict compilation of this change. Full repository lint/test,
independent review and integration acceptance are not claimed by the focused run.

Issue #49 also records Python qualification-report mutation and the compiler
declaration-drift probe; `test/schema.test.ts` still regenerates tracked Avro
bindings. This repair does not close those adjacent interruption hazards, remove
their path exceptions, or establish that every repository suite can survive a
killed run without debris. It closes the EnumValue mutation hazard only.
