# Issue #49: kernel and legacy binding generation isolation

Base: `362b72284008e85c1acbc3977050380ff50a8580`.

Scope: `test/schema.test.ts`'s tracked TypeScript/Python binding regeneration,
and `test/semantic-kernel.test.ts`'s generation, changed-environment generation,
and currently positive-only staleness probe. Production generators, schemas,
generated outputs, and independent oracle expectations remain unchanged.

1. State scratch-only and interrupted-process source preservation in the owning
   FR-026 and NFR-028 before editing the tests.
2. Copy the actual generators, declared inputs and output baselines into unique
   scratch roots. Link only installed dependencies; never link mutable probes.
3. Regenerate real outputs after removing only the copied output files so byte
   equality cannot be satisfied by retaining a preexisting file. Preserve the
   different-environment comparison against the unchanged source baseline.
4. Run the real kernel `--check` successfully on the healthy copy. A child
   corrupts copied `losses.json`, terminates with SIGKILL, and leaves that byte
   visible. Require the real checker to exit 1 naming the stale artifact.
   For the legacy generator, perform the same interrupted mutation on each
   copied binding, prove the comparison sees it, then require real regeneration
   to reproduce the original binding bytes.
5. Compare source input/output snapshots before cleanup. Cleanup removes only
   the unique scratch root and never restores source files.
6. Remove the two remaining changed-path exceptions only after the probes are
   isolated; retain every history/content attribution check. Qualify core,
   kernel, legacy, and compiler/staleness tests concurrently.

Generated-kernel formatting and the kernel suite's moving-main path gates are
separate baseline defects. Its historical TC-1103/1104 identifiers also conflict
with the specification matrix; changed tests will name their owning requirement
explicitly without claiming to repair unrelated traceability.
