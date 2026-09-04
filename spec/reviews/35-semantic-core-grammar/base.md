---
id: SR-044
title: "Base review of the semantic-core declaration grammar"
type: SpecReview
analysis: base
scope: "US-007, FR-031..034, NFR-014, spec/tests.md TC-248..276"
review_set: all
---
# Base specification review

## Summary

The issue #35 specification adds one user story, four functional requirements,
one non-functional requirement, and 29 test cases for the semantic-core L3
declaration grammar, kernel scalar library, JSON Schema projection, and
zero-loss lowering to IR v1.1. All 31 new acceptance criteria and constraints
map to at least one test case; no test case traces to an absent criterion;
Quire reports zero errors and zero grammar findings. The bundle is ready for
the seven analyses.

## Checklist Results

| Area | Result | Evidence |
|---|---|---|
| ID format and uniqueness | Pass | US-007, FR-031..034, NFR-014, TC-248..276 continue the sequences; no remote branch allocates beyond them |
| User story quality | Pass | US-007 has the story shape, four examples, options, constraints, dependencies, priority, traceability |
| Functional requirement quality | Pass | Inputs, outputs, EARS-shaped behavior, constraints with validation, measurable ACs, dependencies on every FR |
| Coverage (Rule 1) | Pass | 31/31 → TC-248..276 (scripted check, 2026-09-03) |
| Option permutation (Rule 2) | Pass | `TypeRef.target` × extension, closed enumerations, package version rows |
| Constraint boundary (Rule 3) | Pass | FR-031..034 CON rows, `UnitSymbol`, grammar `Multiplicity` min/below-min |
| Error path (Rule 4) | Pass | ERR-045..049 |
| State transition (Rule 5) | Pass | package version, raw → normalized → post-#31 bundle |
| Edge case (Rule 6) | Pass | EC-032..035 |
| Cross-referencing | Pass | FR → US-007 `implements`; NFR-014 → US-007 `constrains`; relative body links validate |

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-203 | low | US-007 carries illustrative examples rather than an AC table, per the installed US archetype (same disposition as FND-030/FND-086); EX-1..4 map to TC-262, TC-271, TC-258, TC-263. | US-007 |
| FND-204 | low | TC-248 is the repository's first `Compile`-typed row; the manifest vocabulary admits it and the failure mode is a TypeSpec compile error. | TC-248, FR-031-AC-1 |
| FND-205 | low | TC-268 reuses both IR v1.1 readers (TypeScript and Python) from issue #34; the Python side needs the poetry environment, as TC-232 already does. | TC-268, FR-034-AC-2 |

## Gate Result

| Gate | Result | Evidence |
|---|---|---|
| IDs, structure, and EARS grammar | Pass | Quire: zero errors, zero grammar warnings |
| Requirement clarity and atomicity | Pass | One `shall` per statement after the grammar pass |
| Complete traceability | Pass | 31/31 mapped; TC-248..276 |
| Failure, transition, boundary, and option coverage | Pass | ERR-045..049, EC-032..035, permutation and boundary rows |
| Small kernel and non-disruption scope | Pass | NFR-014; no spike, backend, publication, or corpus change permitted |
| Analyses | Pass after remediation | SR-037..043 in this directory; dispositions below |

## Dispositions of analysis findings

Applied to the specification on 2026-09-03 before planning (FR-031..034 and
NFR-014 rewritten; matrix TC-248..279):

| Theme | Findings | Change |
|---|---|---|
| Kernel inventory undecidable | FND-187, FND-145, FND-165, FND-181, FND-155 | FR-031 enumerates the exact declaration inventory in `inventory.json` (nine grammar models incl. eleven per-keyword constraint models, four enums, four scalars); NFR-014 gates on that file; ARCH-005's other kernel concepts deferred explicitly |
| Decimal extension and cross-property rules | FND-193, FND-142, FND-171, FND-132, FND-190, FND-194, FND-143, FND-144 | `TypeRef.decimal: DecimalPolicy` is a typed grammar property; cross-property rules (bounds, flags, decimal presence, unit applicability, `returns.unit`, uniqueness, identity flag) become reader-enforced grammar rules with negative fixtures (FR-031-AC-7, TC-277); US-007-EX-4 and FR-032-AC-2 reworded to the reader |
| Lowering has no source for IR-required properties | FND-130, FND-131, FND-141, FND-133, FND-177, FND-183, FND-166, FND-148, FND-147, FND-146, FND-134, FND-135 | FR-034 defines the lowering context (package identity, `SourceLocus` per declaration, clause-text map), identity minting rules, package-local kernel definitions with the `kernel-scalar` extension, alias-per-constrained-field with `appliesTo` on the alias, `nullable`/`default` on `FieldDecl`, named extension identities with version/required/payload, `returns.unit` forbidden, archetype-instance input shape; a reference lowerer is an output (TC-268, TC-279) |
| `SemanticId` / `SourceLocus` mismatch | FND-130, FND-179 | Both take the IR `common.schema.json` patterns and shapes |
| Version-aware emission unsatisfiable | FND-176, FND-139, FND-152 | `@versioned` dropped; package semver carries the version; FR-031-AC-6 tests file-level additivity on regeneration; `$id` base bound to the package version |
| Restated vocabularies | FND-182, FND-174, FND-178, FND-136 | FR-031-AC-4 contract test equates `EdgeCategory`, `ConstraintKeyword`, `ClauseLanguage` with the IR schema (TC-251); kernel equivalence by name via the `kernel-scalar` extension |
| Fixtures without an owner | FND-159, FND-149, FND-185 | FR-033 outputs the FR-006 `FieldDecl[]` fixture and per-model negatives at named paths under `fixtures/semantic-core/` |
| Emitter realities | FND-173, FND-138, FND-157 | Sealing accepted in either emitted form; #31 normalization records a no-op when no relative `$id` is emitted; removal is one change across build and backend |
| Verification-method alignment | FND-167, FND-169, FND-170, FND-171, FND-172 | Analysis↔Static, Test↔Unit pairs realigned; FR-032-AC-5 → Test/Unit; NFR-014-AC-2 → Inspection/Manual; TC-258 mutation-based |
| Missing spike metric row | FND-168, FND-155 | NFR-014-AC-5 + TC-278 |
| Workspace scaffold | FND-164, FND-176 | No workspace file; compile with the root toolchain; `Makefile` target and `package.json` scripts only |
| UCUM membership | FND-144, FND-140, FND-193 | `UnitSymbol` claims the charset pattern only; membership is a consumer concern (FR-034-AC-4 reworded) |
| Bounds enforcement | FND-192, FND-137 | Documented for consumers, explicitly not evaluated by the reader (FR-032) |
| EARS shape | FND-194, FND-196, FND-197, FND-198, FND-199 | Descriptions split; process subjects replaced; scope gate defined as FR-031-AC-2's inventory test |
| Dependency cycle FR-031↔FR-032 | FND-158 | `KernelScalar` enum declared by FR-031; FR-032 owns the table and policy |
| Housekeeping | FND-163, FND-156, FND-157 | Frontmatter edges added (FR-029, FR-020, FR-032→FR-033); `spec/index.md` description |

Not changed: FND-160 (clause text comes from the lowering context by design), FND-153,
FND-180/FND-175 (single-host reproducibility plus recorded digest accepted), FND-203..205.
