# Compiler baseline typecheck: implementing review

Parent: `bac1157370ecb6088d3934ca16a25899a8c406d4`, on isolated branch
`contract-agent-core/49-scratch-fixtures`. Independent review remains pending.

## Scope and ownership

FR-066 owns the generator defect: an empty field-name register lacked an element
type. The renderer now emits `const declared: string[] = [];` for empty registers
only. Nonempty output is unchanged. The owning kernel generator reproduced the
single changed generated line; no generated artifact was patched by hand.
No semantic IR input, independent oracle, published schema or disputed corpus
expectation changed.

The other pre-existing root typecheck defects are repaired without suppressions:

- duplicate imports in `test/semantic-kernel.test.ts` are removed;
- the existing Rust writer exports receive a declaration using the shared request,
  manifest and sink shapes; its implementation and refusal behavior are unchanged;
- the kernel test types its existing request fixture, passes the declared
  formatter, and keeps the backend's readonly result instead of asserting a
  mutable shape;
- the compiler test's code collector accepts code-bearing entries and preserves
  their actual type, rather than claiming partial loss diagnostics have all
  fields of a complete compiler diagnostic.

FR-066-AC-30 owns the new three-policy regression. TC-1110 executes the generated
kernel strict gate recorded by FR-085-AC-9 with all four original strict options.
This later backend recovery discharges that specific defect; it does not close
FR-085's remaining requirements or retroactively amend #11's path ownership.

## Falsification and verification

- Root `tsc --noEmit -p tsconfig.json`: zero errors (previously TS7034, TS7005,
  TS2352, TS2300, TS7016 and TS2345 at the listed baseline loci).
- New strict-generation suite: **4 passed**. For each zero-field record policy
  (`reject`, `preserve`, `surface`), generate real package bytes into unique
  scratch, require successful strict compilation, remove only the explicit
  empty-register element type there, and require exit 2 with both TS7034 and
  TS7005 in `validators.ts`. The fourth test compiles the committed kernel.
- Focused kernel generation and independent-consumer tests: **8 passed**,
  34 unrelated cases skipped. The Rust SourceLocusPath collision refusal remains.
- Initial compiler-core + TypeScript backend run: **150 passed, 3 failed**.
  All three failures attribute the uncommitted new Rust declaration to historical
  #19/#22 path sets. No allowlist is widened; rerun after this later change has its
  own commit identity.
- Committed-head compiler-core + TypeScript backend + new strict suite:
  **157 passed**, three suites, 34.74 seconds. All historical ownership checks
  pass without allowlist changes. Worktree and shared source checkout are clean.
- `node scripts/build-semantic-kernel.mjs --check`: 12 artifacts current.
- Authored-source formatting, test-matrix consistency and `git diff --check`:
  passed. The generated kernel validator still fails Biome formatting; the
  baseline at `bac1157` already differs from its formatted bytes. The generator
  bypasses the injected formatter. Do not hand-format generated source to hide
  this separate existing FR-085-AC-19 defect; only the one emitter-owned type
  annotation changes in the generated diff.
- Sandbox subprocess launches initially failed with EPERM; the same focused
  tests passed when rerun with approved local subprocess execution.

Commands:

```bash
node_modules/.bin/tsc --noEmit -p tsconfig.json
node_modules/.bin/vitest run test/compiler-baseline-typecheck.test.ts
node_modules/.bin/vitest run test/semantic-kernel.test.ts -t 'generated language trees|independent consumer'
VIRTUAL_ENV=/home/peter/.cache/pypoetry/virtualenvs/agent-ix-core-data-XYJq1g-D-py3.13 node_modules/.bin/vitest run test/compiler-core.test.ts test/typescript-backend.test.ts
node scripts/build-semantic-kernel.mjs --check
node scripts/test-matrix-summary.mjs --check
git diff --check
```

## Still open, not hidden by this repair

Full #49 isolation remains open for the Python qualification-report mutation,
the compiler declaration mismatch probe, and tracked schema regeneration. The
kernel suite additionally runs its generator in place and has a positive-only
test named as a staleness refusal; those are separate safety/evidence repairs.
Its NFR-030 path checks still compare moving `main...HEAD`, so this later compiler
maintenance branch is not an appropriate path set for the original #11 scope.
No broad kernel suite, application migration or full release qualification was
claimed here. Rust #80, Python #81, lowering fidelity #78 and kernel packaging/
publication gates remain open.
