---
id: Task-129
title: "FR-096 diagnostic registry and locus rule"
type: Task
status: done
track: B
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-128"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-096"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-1259"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1260"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1261"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1262"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1263"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1265"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1266"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1269"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1345"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1346"
    type: verifies
---
# Task-129: FR-096 diagnostic registry and locus rule

## Scope

`diagnostics.rs`: the closed `Code` enum over the twenty-six names FR-096
lists, `Code::severity()`, `Code::blocking()`, `struct Diagnostic` shaped as
`common.schema.json#/$defs/diagnostic`, the `ENGINE_DIAGNOSTIC` and
`INVALID_IR` wraps, and `sort_diagnostics`. Every later task emits through
this enum; Task-128's provisional string codes are replaced here.

## Subtasks

- [x] **Red.** `tests/diagnostics.rs`: `tc_1259_` (every variant serialises to the published pattern and validates with and without `locus`), `tc_1260_` (severity/blocking table variant by variant, incl. `KERNEL_NAME_SHADOWED` warning non-blocking, `INVALID_IR`/`DUPLICATE_CONSTRAINT`/`CONSTRAINT_NOT_APPLICABLE`/`IMPORT_UNSUPPORTED`/`DUPLICATE_ARTIFACT_ID` error blocking, `ARTIFACT_NOT_LOWERED` by reason, `ENGINE_DIAGNOSTIC` by mapped severity), `tc_1261_` (grep gate: no literal `agent-ix.extraction-frontend.`/`agent-ix.compiler.`/`agent-ix.semantic-ir.` under `src/`, planted literal in `lower.rs` fails), `tc_1262_`, `tc_1263_`, `tc_1265_`, `tc_1266_` (proptest: list vs reverse, two `LC_ALL`), `tc_1269_` (4000-char token → message ≤ 120), `tc_1345_` (`line: Some(0)` → no locus), `tc_1346_` (reader diagnostic → one `INVALID_IR`, no locus, code + instance pointer in message, reader diagnostic in `causes[0]`).
- [x] **Green: enum and table.** `enum Code` (closed, D2 additions included), `Display` as `agent-ix.extraction-frontend.<NAME>`, severity/blocking fixed per code with the two data-dependent cases (engine severity, `ARTIFACT_NOT_LOWERED` reason).
- [x] **Green: wraps.** `from_engine(SemanticDiagnostic, path) -> Diagnostic` (message begins with the engine code; `causes[0]` reproduces `code`, `message`, `reason`; severity map `error→error`, `warning→warning`, `advisory→info`; locus only when `line >= 1`); `from_reader(ReaderDiagnostic) -> Diagnostic` as `INVALID_IR` with no locus.
- [x] **Green: locus, order, hygiene.** `owner` `ix://agent-ix/filament-core-data/extraction-frontend`; module diagnostics at the manifest line 1 col 1; bundle diagnostics at `spec.md` line 1 col 1; `sort_diagnostics` by `locus.path`, `startLine`, `startColumn`, `code`, `message` under code-point comparison, locus-free first; token truncation with `…` at 100 chars; no absolute path, timestamp, hostname or duration in any message.
- [x] **Refactor.** Replace Task-128's provisional refusal strings with `Code` variants; re-run `tests/bundle.rs`.
- [x] **Falsify.** Plant a string literal in `lower.rs` (scratch) and prove `tc_1261_` fails.

## Deliverables

- `src/diagnostics.rs`; `tests/diagnostics.rs`
- `Refusal` re-based on `Code`

## Notes

- Locus rule is the declared reading of issue #61; cite it in the module doc comment.
- The docs page `extraction-frontend-diagnostics.md` and TC-1271 belong to Task-138 (closing sentinel), not here; the generator function lives here, the file is written last.
- TC-1264 (resolver locus), TC-1267/TC-1270/TC-1272 (corpus-wide) and TC-1268 (exit codes) are verified by Task-131, Task-136 and Task-135 respectively.
- Parallel with Task-130; touches no file Task-130 owns. Unblocks: Task-131.
