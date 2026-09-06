# Issue #51: restore the kernel gate's historical ownership

The remaining kernel caller measures `main...HEAD`, contradicting NFR-030 and
reintroducing the moving-reference defect already tracked by issue #51.

1. Bank failures before replacing the caller: real later-ticket attribution,
   synthetic accretion, squash/repointing, dirty changes, rename/deletion,
   transient prohibited writes, and absent history. Use real Git repositories
   in temporary directories and the actual kernel path resolver.
2. Resolve the actual landed #82 range through US-014 and bundle.json, both
   introduced by 3b75e01c652ba00bb07c352ff5467419401e792b. Do not use the uncreated
   closing document or invent an empty fallback.
3. Use changedPathsUnion unchanged. Restore only the compiler-core test entry
   already permitted by NFR-030/#83; do not broaden any policy.
4. Run focused controls, strict typechecking, authored formatting, then the
   seven-suite concurrent qualification with the pinned Python environment.

The generated artifacts, compiler semantics, corpus oracle, and source schemas
are unchanged. Future kernel Rust/Python/consumer completion is not claimed.
