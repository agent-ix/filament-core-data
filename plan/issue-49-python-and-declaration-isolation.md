# Issue #49: remaining Python and declaration mutation probes

Base: `b8bc7079d20e180080f99d45e6db7f6a07f2e968`.

Own only TC-902/941's qualification-report mutation, TC-921's generated README
mutation, and TC-344's declaration mismatch. Their current teardown restores
tracked bytes (or deletes an untracked source probe), which cannot protect a
parallel reader or survive an interrupted process.

1. State scratch-only checks and interrupted-process preservation in FR-077,
   FR-079 and FR-041 before changing the tests.
2. Copy each checker and its real inputs into a unique scratch repository layout;
   use the installed pinned dependencies, never link files the probe mutates.
   First require the real checker to pass on the unmodified scratch copy.
3. Mutate only the copied artifact in a child that terminates via SIGKILL after
   writing. Require the signal and retained mutation, then call the actual
   checker and require the specific mismatch diagnostic and nonzero exit.
4. Snapshot source bytes before the experiment and compare before cleanup,
   including the declaration-probe source path's prior existence/content. Do
   not restore any source file in teardown.
5. Remove only the declaration-probe changed-path exception (no Python exception
   exists). Preserve both remaining tracked-schema regeneration exceptions.

TC-344 will mutate the copied declaration return type while leaving the actual
implementation and a valid consumer unchanged. This tests declaration drift
itself, rather than accepting any root typecheck failure from an invalid caller.

Do not edit production generators, generated artifacts, qualification results,
or independent oracle expectations. Kernel-test generation and generated-kernel
formatting remain separate packages.
