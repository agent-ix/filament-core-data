# GAP-011: propagate the accepted reference-target rule

This compiler prerequisite of issue #52 follows the
[existing owner ruling](https://github.com/agent-ix/filament-core-data/issues/52#issuecomment-5546123193).
The ruling is accepted input, not a new owner decision. Independent oracle repair
and register reconciliation belong to #74 and stay outside this compiler commit.

## Specification and preimplementation review

The compiler reader currently checks field references and relationship targets
but never checks a `reference` definition's `target`. A schema-valid empty
reference model can therefore name an undeclared identity. Add the missing rule
for both `reference` and `alias` using document types union supplied exports.
Keep existing inspector semantics: unresolved foreign identities without a
resolution produce visible suppressions; missing local identities or unresolved
identities with a supplied closed export set are errors. Compilation supplies
that closed set, so it cannot pass through an inspection suppression.

The shared positive assurance fixture currently contains the exact dangling
reference the owner rejected. Give that fixture a real local Actor declaration;
preserve the original foreign undeclared Actor reference in a negative control.
Do not alter independent corpus input or expected verdicts to repair this fixture.

## Implementation and verification

1. Amend the contract and existing FR-046/FR-050 criteria and matrix rows.
2. Add reader validation at the definition locus without changing public APIs,
   diagnostic vocabulary, schema bytes, or reference graph expansion semantics.
3. Exercise both supported versions and both structural kinds with local,
   imported, absent, and unknown-resolution targets. Check exact diagnostic
   codes/loci, suppressions, and determinism under reordered definitions.
4. Exercise real package compilation over declared imported exports and the
   original dangling-reference control; verify the CLI refuses without output.
5. Run the focused new suite and compiler-core regression suite in the isolated
   worktree, then formatting, matrix consistency and relevant type checks.

The oracle, conformance cases/expectations, Python reader, kernel generation and
downstream consumer migration are unchanged. Wiring the compiler adapter remains
subsequent issue #52 work; this commit does not claim that adapter is delivered.
