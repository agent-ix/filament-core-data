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

## Required disposition

Replace only the moving kernel caller with the existing per-commit union
helper and real historical sentinels. Restore the `test/compiler-core.test.ts`
allowance already explicitly approved in NFR-030/#83 for the original kernel
diagnostic tests. Keep every other local allowance and prohibition unchanged.
This is not closure of the unfinished kernel packages or all of NFR-030.
