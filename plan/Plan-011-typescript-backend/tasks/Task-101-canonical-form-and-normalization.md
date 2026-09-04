---
id: Task-101
title: "The canonical form: JCS with identity-sorted sets"
type: Task
status: done
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-100"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-069"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-806"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-807"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-808"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-809"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-810"
    type: verifies
---
# Task-101: The canonical form: JCS with identity-sorted sets

## Scope

Land `canonical.mjs`: RFC 8785 JCS extended with identity-sorted sets over thirteen declared container paths, the `1.1.0` materialization, a total tie-break, and the `sha256:` digest. This comes first in the track because `normalized` is compared byte for byte on all 111 corpus cases and is the cheapest complete signal the ticket can get against the whole yardstick — it can be measured before a single diagnostic rule exists.

## Subtasks

- [x] Implement `canonicalize(value, { sets })`: object keys ordered by code point, `undefined`-valued keys dropped, a non-finite number refused with a named error rather than serialized, and a declared depth bound.
- [x] Declare `IDENTITY_SET_PATHS` as data in one place — the thirteen paths `/types`, `/types/*/fields`, `/types/*/variants`, `/types/*/constraints`, `/types/*/relationships`, `/types/*/operations`, `/types/*/clauses`, `/types/*/extensions`, `/types/*/fields/*/extensions`, `/types/*/operations/*/params`, `/types/*/operations/*/params/*/extensions`, `/occurrences`, `/extensions` — together with the key-ordering rule, so a later GAP-004 definition is a data edit.
- [x] Implement the total tie-break: equal identities order by the code-point order of their own canonical forms, and elements still equal keep their original array index. Duplicate identities exist in the corpus because `DUPLICATE_IDENTITY` is a registered code, and the adapter must still emit `normalized` for those cases.
- [x] Implement `normalizeIrForTarget(document)`: for `contractVersion` `1.1.0` materialize every field's and every operation parameter's `multiplicity` from `presence` when absent, re-derive `presence` from `multiplicity.lower`, and force `nullable` to a literal boolean; a `1.0.0` document gains no member.
- [x] Canonicalize `-0` to the same bytes as `0`.
- [x] Implement `digestOf(text)` returning `sha256:<64 hex>`.
- [x] Prove the module leaves its argument byte-identical for every corpus case, and that it computes no admissibility answer — canonicalization depends on nothing from FR-068, so the two requirements do not form a cycle.
- [x] Carry the GAP-004 citation in the module header, naming the gap row and issue #59 because the row's declared owner issue #9 is closed.
- [x] Measure G1: run `normalizeIrForTarget` over every one of the 111 corpus case inputs and compare the string with the oracle's `normalized` byte for byte. Record the first-run mismatch count before fixing anything.

## Deliverables

- `src/compiler/backends/typescript-v1/canonical.mjs`, `canonical.d.mts`

## Notes

- This is a second implementation beside `src/compiler/ir/normalize.mjs` and `src/compiler/packages/canonical.mjs`, deliberately. It imports neither, nor anything under `conformance/`. Agreement is evidence only while it was written independently.
- GAP-004 is the highest-volatility question this ticket carries, above GAP-011: `contracts-v1.md` names `RFC8785-JCS-with-identity-sorted-sets-v1` and defines it nowhere, `normalized` is compared byte for byte on all 111 cases, and the fingerprint FR-067 stamps into every generated file's banner derives from it.
- The first-run mismatch count is evidence and is recorded even when it is large. Fixing first and reporting the fixed number afterwards destroys the only honest measure of independence.
- G1 measured: **1 of 111** on the first run, **111 of 111** after separating the two named canonical forms. The single cause is `agent-ix/filament-core-data#67`, filed rather than absorbed.
