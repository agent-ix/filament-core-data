---
type: log
title: "Plan-008 — Update Log"
description: "Chronological log of changes to the Plan-008 bundle."
---
# Plan-008 — Update Log

## History

* **2026-09-04** — Plan created from the validated issue #19 specification (US-010, FR-045..053, NFR-019..021, TC-398..619, SR-065..072) with twelve tasks on two tracks. Guards first, because six changed-path allowlists on `main` fail on any path a later ticket adds; then the three primitives (injected host, diagnostic registry, JSON loci) that every determinism and safety claim is measured through; then the package side and the frontend on track A, the IR reader and the compatibility work on track B, joined behind `compilePackage` and the CLI. FR-049's registry-completeness criteria are the closing gate rather than a prerequisite. Ids continue after Plan-007's Task-067; Task-048..059 and TC-280..319 remain the parallel issue #20 branch's.
* **2026-09-04** — Tasks 068–078 done. `src/compiler/` now holds the injected host, the diagnostic registry over two namespaces, the exact JSON pointer locator, the RFC 8785 canonical form with its 33 vectors, the lock and the v1 fingerprint, the package resolver, the frontend seam with the registered-and-refused `spec-bundle` dialect, the fifteen-decorator TypeSpec vocabulary and FR-034's identity minting, the lowering to contract IR `1.1.0`, the IR reader and normalizer, the compatibility classifier and the two contract-version projections, the pipeline, and the three commands behind a fifteen-symbol interface. `make test`: **299 vitest cases across 9 files, all passing**; `make lint`, `make build` and `make typecheck` green.

  Six findings the implementation forced into the open, each fixed and recorded rather than worked around: the seam read `common.schema.json` with `node:fs`, which FR-046-CON-4 forbids under `frontend/` (the vocabulary moved to `dialects.mjs`); decorator argument defects were collected but never surfaced; a host refusal is caught by the TypeSpec compiler and re-reported as its own `js-error`, so `UNTRUSTED_MODULE` and `PATH_ESCAPE` arrived as generic compile errors; `SOURCE_OUTSIDE_PACKAGE` was declared and unreachable; three registry codes were named dynamically, defeating the static extractor FR-049-AC-2 requires; and the packed-file gate caught that `fixtures/` is a *published* directory, so the compiler fixture corpus moved to `test/fixtures/compiler/` rather than growing the tarball.

  Two measured limits are recorded rather than papered over. TypeSpec target-checks its own decorators, so the frontend-side constraint-applicability check is unreachable through the nine mapped core decorators; the shared table is what is under test and the rule is exercised through the reader. And the baseline: `origin/main` at 51febd4 is **168 of 173**, not 173/173 — five issue #27 gates assert properties of the promotion's own branch diff and cannot pass once #27 merged. Filed as #48 and repaired here as the state facts they protect.

