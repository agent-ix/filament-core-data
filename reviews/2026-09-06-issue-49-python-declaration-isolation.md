# Issue #49: Python and declaration isolation review

Base: `b8bc7079d20e180080f99d45e6db7f6a07f2e968`.
This is the implementing worker's review; independent review remains pending.

## Changes and falsification

- TC-902/941 copies the Python backend and published input schemas into a
  unique pytest scratch directory. The actual copied qualification module
  first passes `--check`; a child appends one byte to the copied report and
  terminates itself with SIGKILL. The test observes that termination and the
  retained mutation, then requires exit 1 naming the copied report and a fresh
  measurement mismatch.
- TC-921 follows the same route for the generated README and actual copied
  emitter `--check`. This was the second tracked Python writer in the same
  suite, discovered and explicitly included by the coordinator.
- Both Python probes snapshot every backend and published-input file (excluding
  interpreter caches), compare after the killed child and after the checker,
  and never restore source bytes. Python imports are rooted at the copied
  package, while the installed pinned toolchain is reused.
- TC-344 copies source and the real root compiler configuration, linking only
  installed dependencies. A valid consumer first compiles and the real runtime
  confirms the string return type. The interrupted child changes only the
  copied declaration return type to number. The unchanged consumer then fails
  with exactly TS2322 at `test/declaration-drift-probe.ts(2,7)`, not an arbitrary
  root typecheck error. Compiler source bytes and the source probe path's prior
  existence/content are compared before scratch cleanup.
- Only `test/declaration-drift-probe.ts` is removed from the changed-path
  mitigation. Neither Python path had an exception. The two tracked-schema
  regeneration exceptions remain; this change does not conceal those writers.

No production generator, generated artifact, qualification result, published
schema or independent oracle expectation changes. The source checkout remains
untouched by all three probes; cleanup deletes only their scratch directories.

## Verification

- Focused declaration interruption regression: **1 passed**, 58 unrelated
  cases skipped.
- Focused Python report and README interruption regressions: **2 passed**,
  41 unrelated cases deselected, 70.55 seconds.
- Concurrent compiler, semantic-core and Python tree suites: **99 passed**,
  three suites, 90.01 seconds. The declaration changed-path exception is absent
  throughout this run; no allowed-path list changes.
- Root TypeScript typecheck: zero errors.
- Authored JS/TS formatting, Python Black/Ruff, matrix consistency and diff
  whitespace checks: passed.
- Full Python qualification suite: **43 passed**, 198.92 seconds. The actual
  measurement, generated-tree, strict typing and validation checks remain green
  with the two tracked-file mutations removed.

The original Python environment used for compiler-only checks lacked
`datamodel-code-generator`; the clean-copy gate correctly failed before any
mutation. The existing `agent-ix-core-data-K2gJLEyT-py3.13` environment supplies
Python 3.13.11, datamodel-code-generator 0.76.0, Pydantic 2.12.5, msgspec 0.21.1
and mypy 1.19.1. No dependency or lockfile was edited and no package installed.

Commands (the absolute environment path is local provisioning, not an artifact
input or generated expectation):

```bash
node_modules/.bin/vitest run test/compiler.test.ts -t 'declarations drift'
/home/peter/.cache/pypoetry/virtualenvs/agent-ix-core-data-K2gJLEyT-py3.13/bin/python -m pytest tests/test_python_backend_qualification.py -k 'mutated_committed_report or mutated_generated_file' -q
VIRTUAL_ENV=/home/peter/.cache/pypoetry/virtualenvs/agent-ix-core-data-K2gJLEyT-py3.13 node_modules/.bin/vitest run test/compiler.test.ts test/semantic-core.test.ts test/python-backend.test.ts
/home/peter/.cache/pypoetry/virtualenvs/agent-ix-core-data-K2gJLEyT-py3.13/bin/python -m pytest tests/test_python_backend_qualification.py -q
node_modules/.bin/tsc --noEmit -p tsconfig.json
node scripts/test-matrix-summary.mjs --check
git diff --check
```

## Remaining gates

Full #49 closure still needs the tracked-schema regeneration writer and the
kernel test's in-place generation checks to be isolated. Kernel-test path
ownership and its positive-only purported staleness refusal remain evidence
defects. Generated-kernel formatting remains an owning-generator repair, never
a hand-edit to emitted bytes. None is closed or weakened by this package.
