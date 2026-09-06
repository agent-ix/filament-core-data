# Issue #49: TC-306 divergence register isolation

Base: `3ac4c133863ea828aeb91c935e081cee31502468`.

Own only the two TC-306 tests that write tracked
`conformance/divergences.json` and restore in `finally`. Preserve their seeded
entry semantics and the real differential runner/audit. Do not edit the oracle,
schemas, expectations, production runner, or committed register/output.

1. Specify scratch-only probes and interrupted-process preservation in FR-037.
2. Create an independent scratch checkout using the source repository's local
   objects, then set scratch `origin/main` to the exact source predecessor hash.
   The checkout, refs, index, generated coverage, and Cargo target are scratch
   only. Link only installed Node dependencies; do not bypass corpus gates.
3. Require the real runner/audit to complete successfully on the unchanged
   register. Write the original seeded entry to the copied register in a child
   that terminates with SIGKILL; observe the signal and exact retained bytes.
4. Require an actual exit-1 unreproduced-divergence or expired-entry diagnostic,
   not an arbitrary command failure. Compare source corpus names and byte
   fingerprints before cleanup, without source restoration.
5. Run the focused TC-306 probes and inventory other test writers read-only.
   A clean diff alone does not establish safety under interruption.

Approved adjacent writer discovered during this inventory:
`test/semantic-kernel.test.ts` invokes the differential CLI, which writes
`conformance/coverage.json`. Route that invocation through the same isolated
clone, preserving real adapters and predecessor gates. Earlier #49 slice
`3ac4c1` explicitly did not claim complete closure.
