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
