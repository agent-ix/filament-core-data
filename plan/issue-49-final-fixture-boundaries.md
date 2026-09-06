# Issue #49: fixture-local debris and inherited authoring mode

Base: `b3cc413be962c09c4c2893b60f7e95ef708640c2`.

1. Specify TC-484 scratch-only source-root exclusion under FR-048 and the
   ordinary-test/explicit-authoring boundary under FR-034 before implementation.
2. Copy the assurance fixture and run the actual content digest before and after
   a SIGKILL writer creates only copied `NOTES.tmp`. Preserve source enumeration,
   exclusion, order independence and source bytes before scratch cleanup.
3. Replace the test's inherited golden-writing flag with an explicit refusal
   naming `node scripts/write-semantic-core-lowered.mjs --write`.
4. Preserve authoring in that separate command: execute the unchanged reference
   lowerer with pinned TypeScript transpilation and Biome rendering; default
   stdout only, `--write` only for the fixed validated existing fixture path.
   Unknown arguments and symbolic-link redirection refuse before writing.
5. Exercise normal and inherited-flag paths natively, with exact current-fixture
   byte parity, scratch-only interrupted mutation/regeneration and source checks.
6. Repeat the write inventory and concurrent core/kernel/staleness qualification.
   Do not claim zero cache writes, repair unrelated moving-main ownership gates,
   change schemas/goldens, or promote this reference tool to production codegen.
