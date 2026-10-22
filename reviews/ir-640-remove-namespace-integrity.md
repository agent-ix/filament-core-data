---
id: SR-12015
title: IR-640 namespace removal integrity review
type: SpecReview
analysis: integrity
scope: "agent-ix/filament-core-data PR298; IR-640; audits.rs, NFR-031, TC-1306 and Task-137"
review_set: subset
---

## Summary

Independent frozen-head review of PR298 at 9fae98dd535aa93dd499cfa30552b6a407e0097f, base 6a9ffdf676faf070427d76459a80c8743c3eb0ed. Explicit user authorized combined code/spec namespace removal. Source-only review; no Cargo/build/resolver/aggregate or namespace/security operation. No applicable AssuranceProfile found.

## Verdict

PASS — No defect found in this method scope.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | low | No findings (placeholder) | - |

## Coverage

US015 to constrained NFR031/FR091..097 ownership and existing depends_on relationships are unchanged. AC7 is one measurable dependency-tree obligation; success/root-presence/forbidden-list emptiness are conjuncts of the same audit. Measurement row, verification description, catalog and actual test now name the same observable. No contradictory runtime-network-isolation claim remains in the edited normative contract. Historical SR164/FND1445 remains immutable; Task137 explicitly supersedes only its network-namespace recommendation, preserving its unrelated evidence findings. Missing cargo/nonzero cargo result fails explicitly; no successful-empty fallback.

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
