---
id: Task-088
title: "The read-only conformance-corpus account and the filed adapter-reader ticket"
type: Task
status: todo
track: D
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/FR-077"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-903"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-904"
    type: verifies
---
# Task-088: The read-only conformance-corpus account and the filed adapter-reader ticket

## Scope

Say honestly what the generated Python surface can and cannot decide about the conformance corpus, leave the slot unavailable and its rows unmet, and file the reader that could wire it.

## Subtasks

- [ ] Implement `corpus_account.py`: build each case's bundle, run its `ir` member through the generated `pydantic_v2.BaseModel` surface, and record accept, reject, agreement with the oracle's `resultState`, or `undecidable-by-this-surface`.
- [ ] Emit `corpus-account.json` with decided, agreed, disagreed, and undecidable counts that sum to the case count, and a statement that the backend's corpus rows remain unmet.
- [ ] Assert that every file under `conformance/` is byte-identical to `origin/main`.
- [ ] File the adapter-reader ticket in the house shape, naming the `adapter-result.schema.json` contract, the registry slot, the `thresholds.json` proposal it must answer, and GAP-011's coupling through the `reference`-target cases.
- [ ] Record a GAP-011 disposition row in `gaps.json` rather than deciding it.

## Deliverables

- `python_backend/runner/corpus_account.py`
- `python_backend/qualification/corpus-account.json`
- A filed GitHub issue for the `python-backend` adapter reader

## Notes

- The account is not an adapter result and must not be mistaken for one: an adapter result carries a `resultState`, contract diagnostics with registry codes, and a normalized form, none of which a generated type package can produce.
- Agreement is reported only over the cases actually decided, never as corpus coverage.
