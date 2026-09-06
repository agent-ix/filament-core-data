# GAP-011 compiler prerequisite: review and gap account

Parent commit: `597596e01dbe6d7cf68bacb931262633aea2f4cd` (#49 isolation),
on base `3b75e01c652ba00bb07c352ff5467419401e792b`.
This is the implementing worker's review; independent review remains pending.

## Accepted contract and resulting behavior

The [owner ruled on 2026-09-04](https://github.com/agent-ix/filament-core-data/issues/52#issuecomment-5546123193)
that reference targets must resolve to document declarations or locked package
exports. This change records that ruling in the normative contract and applies
it in the compiler's semantic IR reader to reference and alias definitions.
No public API or schema vocabulary changes.

With a known export set, an unresolved target produces blocking
`UNRESOLVED_TYPE_REF` at its definition's source locus. With unknown package
resolution, only a foreign identity can be reported as an explicit suppression;
a missing local target is still rejected. Compilation supplies a closed resolved
export set, so the inspector's unknown state cannot make compilation pass.

The compiler's positive assurance fixture now declares its Actor locally and
points ActorRef to that declaration. The regression restores the original
foreign undeclared Actor target in a temporary copy and requires failure from
both the library and CLI; the CLI writes no IR output. Declaring and resolving
a real imported Actor export makes the same temporary package compile.

## Review findings and dispositions

- The independent oracle and corpus must not move to match the compiler.
  `conformance/**`, the published schema and the two earlier independent readers
  are untouched. Oracle #74 and its register update remain separate work.
- A nonempty reference identity is not enough. Tests cover known-empty exports,
  a supplied matching export, a local declaration, unknown resolution, missing
  local declarations, both contract versions, both structural kinds, exact
  diagnostic loci, and reordered local definitions.
- Matching a foreign name to a local declaration would violate identity. The
  negative compile keeps a local Actor while its reference names the distinct
  foreign Actor, and still refuses it.
- The rule checks linkage, not recursive value expansion. It does not add a
  new heap/reference execution model or change alias-cycle semantics.

## Verification

- Focused new suite: **5 passed**, including real CLI rejection and imported
  package compilation.
- Focused strict TypeScript compilation of the new suite: passed.
- Initial combined run: **136 passed, 1 failed**. The only failure was the
  historical issue #19 path gate attributing the uncommitted normative contract
  amendment to #19. Its specification excludes paths owned by later commits.
  No permitted-path list was expanded; verify again after the later change has
  a commit identity.
- Committed-head combined suite: **137 passed**, two suites, 19.52 seconds.
  The historical ownership gate passes without a code or allow-list change.
- Formatter, matrix-summary check and `git diff --check`: passed. The source
  tree is clean after the suite. The diff over `conformance/**`, `schema/**` and
  both earlier independent readers is empty.

Commands:

```bash
VIRTUAL_ENV=/home/peter/.cache/pypoetry/virtualenvs/agent-ix-core-data-XYJq1g-D-py3.13 pnpm exec vitest run test/compiler-reference-resolution.test.ts test/compiler-core.test.ts
node_modules/.bin/tsc --noEmit --strict --skipLibCheck --moduleResolution bundler --module esnext --target es2022 --esModuleInterop test/compiler-reference-resolution.test.ts
node scripts/test-matrix-summary.mjs --check
git diff --check
```

Full repository typecheck retains the unchanged defects enumerated in the #49
review. This prerequisite does not deliver the #52 compiler adapter, the #74
oracle fix, the #65 Python reader, or semantic-kernel repairs. Stale GAP-011
backend policy prose and the conformance register need reconciliation in their
own integration changes; this review does not claim those surfaces are repaired.
