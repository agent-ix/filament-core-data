---
id: SR-12012
title: IR-640 namespace removal code-review review
type: SpecReview
analysis: code-review
scope: "agent-ix/filament-core-data PR298; IR-640; audits.rs, NFR-031, TC-1306, Task-137 and three python_backend/generated Population classes"
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

Rust/code lane: four changed paths inspected, including all removed helper callers/imports and the remaining cargo helper. No production code, dependency or CI recipe changes. Both namespace tests/helpers are removed; remaining plain test preserves the real offline locked cargo-tree invocation, success check, actual extraction-crate presence and all14 SOCKET_CRATES exclusions. A forbidden listed dependency makes the final assertion fail; an empty/malformed command result cannot pass the root-presence check. No stub, mock, cfg bypass, new panic/unsafe/cast/concurrency surface or surviving namespace operation. Executable-source scan over crates/scripts/test/tests/.github/Makefile found no unshare/setns/namespace/user/group/security-configuration calls. Historical text is not executed. Author-focused fmt/audit/clippy receipts report exit0, peak1983848448B in16GiB/swap0, no OOM and unchanged tracked inputs; these are inspected author runs, not reviewer executions. Full aggregate remains lead-owned and unrun. No runtime isolation or complete absence of arbitrary socket code is inferred from a finite package-name list.

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

## New findings (disposition pass 2)

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-002 | high | Inherited committed Python Population models omit the schema-owned optional symmetric Boolean, so actual regeneration differs and the existing reproducibility gates fail. | FR-079-AC-4; python_backend/generated/msgspec_struct/semantic_ir_schema.py:571; python_backend/generated/pydantic_v2_basemodel/semantic_ir_schema.py:866; python_backend/generated/pydantic_v2_dataclass/semantic_ir_schema.py:672 |

## Dispositions

| FND | outcome | reason |
| --- | --- | --- |
| FND-002 | fixed | Actual producer at6705a003 adds exactly optional Population.symmetric in all three existing profiles. Fresh-process emitter/validator checks and the same three original reproducibility tests pass; no test or report weakening. |

## Narrow final Python/code/Rust disposition

At exact6705a003 the only source delta after ce7ec93 is three lines emitted by the existing actual producer: msgspec Population.symmetric uses bool|UnsetType=UNSET; both Pydantic profiles use bool|None=None, matching their existing profile conventions. Authoritative schema already declares optional Boolean symmetric with additionalProperties=false; this repair changes no schema, public contract decision, generator, dependencies, locks, tests, expectations, namespace/security behavior or old Rust/spec semantics. Existing generator owns all outputs, rather than a new handwritten/cross-owner implementation. No new path/input/state/concurrency/resource/security surface or test stub. Existing known family-level optional/null/coercion semantics remain measured limitations; this pass does not claim stronger validation semantics. Actual diagnosis demonstrates schema/generator/old committed outputs were byte-identical to main6a9 before repair, and identifies inherited PR293/QSL871 omission. I independently verified exactly the three one-line additions and all four original PR298 code/spec inputs unchanged.

Inspected author terminal receipt: actual emission, fresh-process emit--check and validate--check succeed; the same three originally failed pytest checks now3PASS in19.61s; validation.json and report.json stay unchanged after correct models are emitted. Earlier scratch validation produced from stale imported committed models was diagnostic, not accepted corrected validation evidence. Original aggregate failure is retained: Node711PASS plus normal fullRustPASS including ordinary TC1306, Python555PASS/3FAIL at oldce7. Those are old-head phase observations, not a new-head full aggregate result. Repair scope16GiB/swap0 peak97161216B/events0, owned scope gone/guards empty, external IR954Cargo explicitly separate; no claim of globally empty process inventory. Reviewer ran no test/build/resolver/namespace/security command. Root owns final actual all-gate decision.

Current code/Python/Rust verdict: PASS, newly surfaced inherited FND-002 FIXED; original review and placeholder preserved.
