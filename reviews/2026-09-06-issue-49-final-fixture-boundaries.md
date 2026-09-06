# Issue #49 final inventoried fixture boundaries: implementing review

Base: `b3cc413be962c09c4c2893b60f7e95ef708640c2`.
Coordinator independent review remains the integration gate.

## Scope

The preceding read-only inventory identified two remaining source-writing test
boundaries. FR-048 and FR-034 were amended before implementation; neither
compiler semantics, the reference lowerer, a schema, nor a golden byte changed.

- TC-484 now copies the assurance package before proving that a non-source
  `NOTES.tmp` file is excluded from its digest. The real digest matches before
  and after a child writes that copied file and terminates with SIGKILL. The
  signal, null status and retained bytes are asserted. Source names and byte
  fingerprints are checked before cleanup, with no source restoration. Existing
  source enumeration, order-independence and schema-byte assertions remain.
- The ordinary lowered-fixture reader refuses an inherited
  `SEMANTIC_CORE_WRITE_LOWERED=1` flag instead of rewriting its expected fixture.
  Its diagnostic names the deliberate replacement command.
- `node scripts/write-semantic-core-lowered.mjs` executes the existing reference
  lowerer through the installed pinned TypeScript transpiler and formats its
  JSON with the installed pinned Biome tool. Default behavior writes only stdout.
  Exactly `--write` is required to overwrite the fixed existing lowered-fixture
  target. Extra arguments and symbolic-link redirection refuse before writing.
  This is reference-fixture maintenance, not a production extraction frontend.

## Native controls

Four focused controls passed in 4.40 seconds:

1. The actual source-root digest remains unchanged by the killed scratch writer.
2. The authoring command's default stdout is exactly the committed fixture bytes,
   even with the legacy flag inherited; copied input/output fingerprints do not move.
3. Explicit `--write` regenerates an interrupted mutation only in scratch;
   unknown arguments return 2 and symbolic-link redirection returns 1 with the
   expected message, preserving both the link destination and source bytes.
4. A real ordinary semantic-core Vitest case, run in a scratch clone with the
   current test implementation and legacy flag, exits exactly 1 with the named
   authoring-command refusal and leaves its golden unchanged. The flag is not
   silently ignored and an arbitrary subprocess failure cannot satisfy the test.

Root TypeScript checking passed. The owning specifications validated successfully.
The final concurrent qualification is recorded below after execution.

## Refreshed inventory disposition

The preceding inventory in `2026-09-06-issue-49-divergence-isolation.md` remains
the bounded search record. Its last two open entries are now addressed. Repeating
the searches for direct writes, removals, mutation flags and writing subprocess
entrypoints found no additional ordinary-test source-data writer. The explicit
authoring command is deliberately outside ordinary test execution; its tests call
`--write` only in scratch. Tests may still create ignored compilation, bytecode,
checker and package-manager caches. This is not a zero-filesystem-write claim.

All enumerated #49 tracked-data and untracked-fixture probe hazards now have
scratch isolation or an explicit refusal boundary. Issue closure still belongs
to the coordinator after independent review and qualification; the unrelated
moving-main kernel ownership gates and generated-kernel formatting remain open.
