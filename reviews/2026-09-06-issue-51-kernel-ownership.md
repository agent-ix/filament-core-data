# Issue #51: kernel ownership gate repair

## Pre-fix evidence

Base: `822225bcf2882a91e60c68c41bb5062e4a15db98`. Existing owner issue #51
already tracks this defect family; Task-081 converted six older callers.

`git log --diff-filter=A -1` independently locates both US-014 and
`packages/semantic-kernel/bundle.json` at the actual kernel squash
`3b75e01c652ba00bb07c352ff5467419401e792b`. That commit owns 74 paths. The
originally planned closing documentation sentinel is absent from history.

Before replacing the resolver, the native focused command ran eight tests:
seven failed and the rename control passed. The two real gates wrongly name
`docs/semantic-data-system/contracts-v1.md` and
`src/compiler/backends/rust-serde/index.d.mts`, changes from later tickets.
Synthetic controls fail separately on accretion, squash-empty range, omitted
dirty changes, a restored transient committed write, and missing history.
The rename control already passes because the old caller uses `--no-renames`.

```sh
VIRTUAL_ENV=/home/peter/.cache/pypoetry/virtualenvs/agent-ix-core-data-K2gJLEyT-py3.13 \
PATH=/home/peter/.cache/pypoetry/virtualenvs/agent-ix-core-data-K2gJLEyT-py3.13/bin:$PATH \
node node_modules/vitest/vitest.mjs run test/semantic-kernel.test.ts \
  -t 'kernel ownership history|changes only permitted paths|changes no byte of any prohibited path'
```

These tests operate on real temporary Git histories; the corpus CLI still runs
against its real isolated clone. No oracle, schema, generated output, or
production compiler code is edited. Sandboxed Vitest workers did not complete;
the recorded failure run used approved native subprocess execution.

## Implementation and qualification

The red controls and CR note are banked in
`e678ff1b93790cfe89ba701906d9c6b63973560d` before the resolver repair.

The kernel caller now uses the existing per-commit `changedPathsUnion` helper
and the two real historical sentinels. The `test/compiler-core.test.ts`
allowance already explicitly approved in NFR-030/#83 is restored for the
original kernel diagnostic tests. Every other local allowance and prohibition
is unchanged; the shared helper itself is unchanged.

Native focused controls: **8/8 passed** after the repair, including the two
previously failing real gates. Concurrent native qualification: **287/287
passed in seven suites**, 81.76 seconds (compiler 59, compiler-core 132,
semantic-core 28, legacy schema 4, Python backend tree 12, explicit reference
fixture authoring 4, kernel 48). The semantic-core/kernel/legacy regeneration
and negative probes ran concurrently using their real scratch-isolated inputs.

```sh
VIRTUAL_ENV=/home/peter/.cache/pypoetry/virtualenvs/agent-ix-core-data-K2gJLEyT-py3.13 \
PATH=/home/peter/.cache/pypoetry/virtualenvs/agent-ix-core-data-K2gJLEyT-py3.13/bin:$PATH \
node node_modules/vitest/vitest.mjs run test/compiler.test.ts \
  test/compiler-core.test.ts test/semantic-core.test.ts test/schema.test.ts \
  test/python-backend.test.ts test/fixture-authoring.test.ts test/semantic-kernel.test.ts
```

Also passed: root `tsc --noEmit`, authored-file Biome formatting, Quire validation
of NFR-030, `git diff --check`, pinned Python kernel tests 2/2, and native
staleness checks for the kernel (12 artifacts), compatibility (40 pairs),
evolution (2 goldens), compiler documentation (2 documents), and matrix summary.
No tracked oracle/schema/compiler/generated output bytes changed.

The touched ownership tests now trace to the matrix's actual TC-1105 and the
specific NFR-030 criteria they exercise. The old comments called these
TC-1100/1101 despite those matrix rows owning unrelated determinism/closure
requirements; unrelated historical numbering and planned-status debt remain.

This is not closure of the unfinished kernel packages or all of NFR-030.
