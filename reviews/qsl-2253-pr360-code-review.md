---
id: SR-16503
title: QSL-2253 PR 360 code-review
type: SpecReview
analysis: code-review
scope: "agent-ix/filament-core-data@cfd8b6dcbaea63a514a85b0f67e3fdfff7cd5e58; PR 360; crates/semantic-ir/src/rules.rs, crates/semantic-ir/src/constructs.rs, crates/semantic-ir/RULES.md, crates/semantic-ir/tests/tuple_union.rs, crates/semantic-ir/tests/model_document.rs, src/compiler/ir/reader.mjs, test/semantic-ir-v1-1-reader.ts, test/tuple-union.test.ts, conformance/diagnostic-codes.json, fixtures/semantic/v1/clock-units/clock-cases.json, fixtures/semantic/v1/tuple-union/cases.json, docs/semantic-data-system/contracts-v1.md"
review_set: subset
---

## Summary

Ticket: QSL-2253. Code review of `git diff origin/main...HEAD` at head cfd8b6dc,
with the rust-review lane folded in. The change removes three refusals: the Rust
`INVALID_CLOCK_MEMBER` on a Clock variant `payloadType` (rules.rs), the Rust
`INVALID_TUPLE_POSITION` on a literal Clock position `typeRef` (constructs.rs),
and the Node and independent TypeScript `INVALID_CLOCK_MEMBER` on a Clock payload
(reader.mjs, semantic-ir-v1-1-reader.ts). The Node reader and the TypeScript
reader never refused a Clock position, and the old shared vector already
recorded `node: admits` for it, so all three readers now agree. The Python
reader (tests/semantic_ir_reader.py) never refused either.

Refusals that must stay are still in place: `INVALID_OPTION_INNER` for an option
over Clock (rules.rs:1664), the Clock member-shape `INVALID_CLOCK_MEMBER` checks
on fields, parameters and results, and the map-key rule (`KEY_NATIVES` leaves out
Clock; tuples and payload unions are never key types). `UNRESOLVED_VARIANT_PAYLOAD`
still runs after the removed block, and `special_type_ref` still exempts Clock
from it. The constant `CLOCK_TYPE_REF` was deleted from constructs.rs along with
its only use. Nothing else references it.

Rust-review lane: no new panic, unsafe, integer conversion, lock or async
surface. Pure deletions in the reader code. The tests still use `expect` only in
test code.

Gate run by the reviewer: `make rust-test` under `flock /tmp/cargo-slot.lock`
(result in Verdict). Vitest on tuple-union and clock-units: 30/30 pass.
`tsc --noEmit`, `build-compatibility-cases --check` and `build-compiler-docs
--check` pass. `biome format` on the 6 touched ts/mjs/json files is clean. The
`biome format .` failures in clock-units-independent-reader.test.ts,
compiler-core.test.ts and option-value-type.test.ts are on files this PR does
not change, and those files are byte-identical to origin/main, so main fails
the same way. The wider vitest suites fail only on `spawnSync poetry ENOENT` /
`.venv/bin/python ENOENT` (no Python environment on this host).

## Verdict

PASS with one low finding. `make rust-test` exit 0 (367 tests passed, 0 failed, 49 test binaries, plus the kernel Rust consumer). The code matches FSpec FR-322 "Clock positions and
payloads" and FR-154-AC-25 on filament-specification origin/main.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | low | RULES.md's Clock-admission row lists every type position where Clock is admitted (field, parameter, result, alias target, items, values, variant payloadType, reference target, appliesTo) but leaves out tuple position `typeRef`, which this PR now admits. The PR edited the `INVALID_TUPLE_POSITION` row but left this list as it was. | crates/semantic-ir/RULES.md:233 |

## Coverage

Read the full diff, the surrounding code in rules.rs (per_type variant loop,
option inner, key_end) and constructs.rs (tuple), and grepped all readers (Rust,
Node, TS, Python) for any remaining Clock payload or position refusal. None
remain. Remaining `INVALID_TUPLE_POSITION` uses are identity-only.

Plan completion: not assessed

## New findings (disposition pass 1)

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-002 | medium | The fix round's `keptRef` helper in test/tuple-union.test.ts is not biome-formatted (one 95-column line; biome wants the parameters one per line). `biome format .` (the first step of `pnpm run lint` / `make lint-node`) now fails on 4 files instead of the 3 untouched baseline files, so this PR adds a lint failure on a touched file. | test/tuple-union.test.ts:243-244 |

## Dispositions

| FND | outcome | reason |
| --- | --- | --- |
| FND-001 | fixed | ace34cc6: the RULES.md:233 list now includes tuple position `typeRef`. |
