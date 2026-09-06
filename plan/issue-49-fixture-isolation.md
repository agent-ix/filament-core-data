# Issue #49: isolate the semantic-core regeneration probe

Base: `3b75e01` (current recorded `origin/main`). Owning requirement:
FR-033-AC-4; matrix row TC-264. The issue body calls the probe TC-266, but
the actual source and matrix bind it to TC-264.

## Reviewed implementation plan

1. Copy `packages/semantic-core` into a unique temporary repository layout,
   with the root package manifest and formatter configuration. Resolve the
   pinned installed dependencies through a directory link; never link the
   package files that the probe mutates.
2. Keep the real package's read-only generation check and digest comparison.
   Run the same generator's `--check` against the unmodified copy to distinguish
   a usable copied environment from a false rejection caused by setup failure.
3. Change one copied schema byte in a child process that terminates abruptly
   before any restoration can run. Require that the child actually reached the
   mutation and died from the requested signal.
4. Require the actual generator check to exit 1 naming the copied schema.
   Compare the entire source package with its pre-probe byte inventory before
   deleting the temporary tree. Cleanup is housekeeping, never restoration.
5. Remove only this schema's exception from the changed-path helper. Keep
   unrelated known writers explicit; do not widen path gates or serialize tests
   to conceal races.

## Preimplementation review

- The copied generator computes its root from its own path, so copying only
  generated output would be insufficient. Preserve its relative package layout.
- A nonzero check result alone is insufficient: first require a clean-copy pass,
  then an exit-1 mismatch naming `EnumValue.json`.
- Assert the mutated bytes remain after the child exits. This distinguishes
  interrupted execution from a child that never mutated or silently restored.
- Snapshot source files, not Git stat-cache flags; do not write source files in
  teardown. Retain the independent changed-path gate's sensitivity to a real
  uncommitted schema edit.
- No production generator/API/schema bytes or consumer contracts change.

## Verification and remaining boundaries

Run the focused TC-264 regression, semantic-core suite, changed-path suite and
TypeScript checking in this isolated worktree. Review the final diff and record
the observed results in the closing review. Existing Python qualification-report
mutations and the compiler declaration-drift probe are adjacent issue #49
residuals, not evidence that this narrowly scoped repair protects all suites.
