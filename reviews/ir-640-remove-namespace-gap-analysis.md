---
id: SR-12013
title: IR-640 namespace removal gap-analysis review
type: SpecReview
analysis: gap-analysis
scope: "agent-ix/filament-core-data PR298; IR-640; audits.rs, NFR-031, TC-1306 and Task-137"
review_set: subset
---

## Summary

Independent frozen-head review of PR298 at 9fae98dd535aa93dd499cfa30552b6a407e0097f, base 6a9ffdf676faf070427d76459a80c8743c3eb0ed. Explicit user authorized combined code/spec namespace removal. Source-only review; no Cargo/build/resolver/aggregate or namespace/security operation. No applicable AssuranceProfile found.

## Verdict

FAIL — Inherited coverage deficits remain explicitly owned; no introduced defect found.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | high | The inherited exact1546 untagged criteria remain unverified in the computed matrix; their established owner remains open assigned FCD296. | FR-001-AC-1; spec/functional/FR-001-indexed-architecture-record.md |
| FND-002 | high | FR-091-AC-12 and FR-091-AC-13 are still untagged on current main; their code and bindings await existing PR297 within the same open IR640. | FR-091-AC-12; spec/functional/FR-091-read-a-spec-bundle-through-the-extraction-contract.md |

## Coverage

Plan completion: not assessed

Fresh whole-repository computed matrix contains2169criteria:1548untagged,382method-without-symbol,235tagged,4ignored-only. Exact set comparison against retained original baseline proves1546 are the established FCD296 inventory and the other2 are FR091AC12/13 pending existing PR297. AC7 is tagged by the ordinary nonignored actual dependency audit at audits.rs:543; its method changes Static to Test. Current source/source-tag scan and changed runtime surface show no new unspecified production behavior, placeholder or hollow assertion. The four ignored-only rows FR099AC6,NFR032AC5,NFR033AC4/5 remain explicit named lanes; none is counted as passed here. Full optional semantic audit was not requested; local changed binding was checked. Existing FR091AC14 downstream adoption/matched-resource qualification is still unrun and owned by same openIR640; this PR does not deliver it. No whole-repository coverage PASS or whole-ticket completion.

## Examined units

- NFR-031-AC-7 (examined), spec/non-functional/NFR-031-deterministic-and-hermetic-lifting.md: An ordinary test obtains the crate's resolved normal dependency tree through `cargo tree --offline --locked -p agent-ix-extraction-frontend -e normal --prefix none`, asserts that the tree contains `agent-ix-extraction-frontend`, and asserts zero dependencies whose package names are in the audit's `SOCKET_CRATES` list. This is a dependency audit, without creating users, groups or namespaces or changing host security configuration.
- TC-1306 (examined), spec/tests.md: The offline locked normal dependency tree contains the extraction crate and no package named in the SOCKET_CRATES audit list
- Task-137 (examined), plan/Plan-014-extraction-frontend/tasks/Task-137-determinism-gates.md: IR-640 supersedes only the namespace-execution part of NFR-031-AC-7 and the corresponding historical FND-1445 recommendation in SR-164: TC-1306 retains the ordinary socket-dependency audit.
- NFR-031 measurement (examined), spec/non-functional/NFR-031-deterministic-and-hermetic-lifting.md: Socket-capable crates from the audit's `SOCKET_CRATES` list in the resolved normal dependency tree
- NFR-031 verification (examined), spec/non-functional/NFR-031-deterministic-and-hermetic-lifting.md: ordinary TC-1306 dependency audit with cargo in offline mode, confirm the
resolved normal tree contains the extraction crate and none of the
`SOCKET_CRATES` entries
- NFR-031 (context_only), spec/non-functional/NFR-031-deterministic-and-hermetic-lifting.md: The extraction frontend SHALL produce byte-identical IR and diagnostic output
for identical bundle, module, and limit inputs on the pinned toolchain, with
every host-varying input — working directory, `HOME`, locale, clock, hostname,
environment, network, cargo target directory, and file-system enumeration
order — either supplied explicitly or excluded from the output.
- FR-001-AC-1 (examined), spec/functional/FR-001-indexed-architecture-record.md: One root index links every required architecture document and ADR.
- FR-091-AC-12 (examined), spec/functional/FR-091-read-a-spec-bundle-through-the-extraction-contract.md: A consumer whose normal/build dependency paths to the pinned `quire-rs` package all pass through the frontend's public lift dependency has no activated normal/build path to the source parser packages excluded above. A scratch negative control restoring default features activates the excluded parsers and is rejected by the same graph check. The assertion inspects the resolved activated graph, not only manifest text or lockfile names.
- FR-091-AC-13 (examined), spec/functional/FR-091-read-a-spec-bundle-through-the-extraction-contract.md: With the selected features, real public `LiftRequest` calls over the existing positive model/enum and construct fixtures, negative bundles, and legacy controls retain their expected canonical document bytes, package/node identities, typed `Written`/`Blocked`/`Refused` outcomes and diagnostics; the real CLI retains FR-099 exit codes `0`, `1`, and `2`. Typed `body_extraction` remains the semantic oracle; no copied parser, mocked success, or replay bypass supplies the result.

## Dispositions

| FND | outcome | reason |
| --- | --- | --- |
| FND-001 | deferred | Deferred outside PR298 to existing open assigned agent-ix/filament-core-data#296, which owns the same exact1546 inherited untagged criterion inventory. No new waiver, fixed finding or repository PASS. |
| FND-002 | deferred | Deferred outside this namespace-removal PR to existing open PR297 and same open IR-640: FR-091-AC-12/13 feature isolation and semantic controls await delivery there. Current PR298 matrix remains1548untagged, not1546. Downstream FR091AC14 adoption/matched-resource qualification also remains sameIR640 and is not claimed done. |

## Narrow carryforward at corrected generated-model head

At exact6705a003, existing source namespace removal, normative spec, catalog, task and all test trace bindings are unchanged from reviewedce7. Exactly3generated Population.symmetric field lines now conform to the already-owned schema and FR079AC4/CON2; no new reverse ownership gap or trace claim. The source-only computed criterion matrix inputs/binders remain unchanged:2169total/1548untagged/382method-without-symbol/235tagged/4ignored-only. No fresh matrix execution at6705 is claimed. FND001 remains DEFERRED exact1546FCD296; FND002 remains DEFERRED FR091AC12/13existingPR297/sameIR640. AC14downstream matchedconsumer qualification remainssameopenIR640. SR12012newFND002 records the inherited generated-code drift separately and FIXED by actualproducer; this does not repair repositorycoverage. Fullgap verdict remains FAIL. All seven prior spec lens PASS conclusions carry forward over byte-identical normative inputs; fullaggregate remainsrootpending.

## New findings (disposition pass 3)

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-003 | high | Ten unchanged historical review artifacts fail structural validation under the installed Quire catalog, so the additional whole-history scan fails despite valid active specifications and all nine current PR298 reviews. | reviews/2026-09-04-plan-010-rust-serde-backend-gap-analysis.md; agent-ix/filament-core-data#300 |

## Dispositions (round 3)

| FND | outcome | reason |
| --- | --- | --- |
| FND-003 | deferred | Deferred outside PR298 to existing open agent-ix/filament-core-data#300, the FCD assurance/documentation baseline owner. All ten exact failing blobs match main6a9; no declared repository CI/Make gate or contributor policy requires this added whole-history scan. The repair must first establish intended catalog/module and archival status, preserve original findings/evidence and tracker copies, then perform any supported migration. This is not a validity waiver or a claim the broad scan passed; scoped298 acceptance still requires actual normal gates plus active-spec/current-SR validation. Existing FCD296 criterion debt and openIR640 feature/adoption qualification remain separate. |

## Historical-review baseline and actual gate scope

Independent static checks at hash-frozen5ce411dce97ee09bde2b7c2b5f8d12816f7b404d prove all ten diagnostic files byte-identical to main6a9ffdf676faf070427d76459a80c8743c3eb0ed. Examined actual failures: missing Summary/Findings or frontmatter, legacy table column/severity/Escape Cause values, and unregistered Evidence archetype. They are real current-catalog structural failures, not falsely passing documents. No migration is performed in PR298 and original review meaning is not rewritten.

Gate-policy inspection: CONTRIBUTING only adds CLA; Makefile declares install/build/lint/test and test-all:test-node test-rust test-python sysml-pilot-check, with no make spec or historical Quire glob. Local build-test workflow delegates to nodejs-actions reusable workflow; its actual source invokes make install/test/lint and production-high pnpm audit, with no historical-review validator. Static search of local workflows/scripts/package.json/Makefile and active FR/NFR found no requirement for this extra broad history scan. Thus finding is nonblocking for this narrow delivery under existing scope once all declared normal gates actually pass; it does not waive a mandatory gate.

Root05 evidence separately records active spec+plan validation exit0, current nine typedSR validation exit0, and extra broad spec+plan+historicalreviews scan exit3. The private operational bundle must retain a failed result if it incorporates that failed extra phase; no bundle-all-green/all8PASS claim. Current full Node/Rust/Python suite execution remains root-owned and pending; previous/current partial phase observations are not whole-suite acceptance. This reviewer performed only read-only source/API/evidence checks and operations-scratch review authoring, no Cargo/build/test/resolver/namespace/security operation.

Existing SR12013 FND001 remains DEFERRED exact1546FCD296; FND002 remains DEFERRED FR091AC12/13 existingPR297/sameopenIR640. AC14matchedconsumer qualification is also still openIR640. Fullgap remains FAIL. Prior findings/dispositions and seven spec-lens/code conclusions are preserved; additional structural artifact debt does not become1546newfindings.

Examined historical artifact paths:

- reviews/2026-09-04-plan-010-rust-serde-backend-gap-analysis.md
- reviews/2026-09-04-python-backend-gap-analysis.md
- reviews/2026-09-04-rust-serde-backend-code-review.md
- reviews/2026-09-04-typescript-backend-gap-analysis.md
- reviews/2026-10-09-fcd-268-float32-boundary-design.md
- reviews/age-2229-fr144-evidence.md
- reviews/plat-990-e3bd0f72-code-review.disposition-1.comment.md
- reviews/plat-990-e3bd0f72-gap-analysis.disposition-1.comment.md
- reviews/plat-990-e3bd0f72-spec-review-dependency.disposition-1.comment.md
- reviews/plat-990-e3bd0f72-spec-review-ears-conformance.disposition-1.comment.md
