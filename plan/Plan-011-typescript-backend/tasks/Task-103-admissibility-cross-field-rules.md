---
id: Task-103
title: "The admissibility cross-field rules, suppressions, limits, and the GAP-011 policy"
type: Task
status: pending
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-102"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-068"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-795"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-796"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-798"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-799"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-800"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-803"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-805"
    type: verifies
---
# Task-103: The admissibility cross-field rules, suppressions, limits, and the GAP-011 policy

## Scope

Land the rest of `admit.mjs`: every cross-field rule the schema cannot express, the suppression channel for absent optional inputs, the declared bounds, and the single named GAP-011 reference policy.

## Subtasks

- [ ] Implement type-reference resolution through aliases, element and variant-payload resolution, and occurrence-definition resolution.
- [ ] Implement alias-cycle detection *before* the depth bound, so a document that is both cyclic and over-deep yields `ALIAS_CYCLE` and not `DEPTH_LIMIT_EXCEEDED` — a cycle is the more specific fact.
- [ ] Implement duplicate identity, duplicate field name, duplicate operation parameter, and duplicate clause id detection; dangling `pre`/`post` clause references; and the missing `sourceSpan` on a source-originated clause.
- [ ] Implement constraint applicability against the resolved scalar, operand type and range, and the uncompilable `pattern`.
- [ ] Implement relationship-target resolution and composite-relationship cycle detection, multiplicity bounds and presence agreement, `ordered`/`unique` on a non-collection, and `unit` on a non-scalar.
- [ ] Implement the `1.1.0`-only-node-in-a-`1.0.0`-document rule, unresolved imports, package cycles, the stale lock, the unknown mapping target, undeclared loss, and the unknown required extension.
- [ ] Add the suppression channel. `conformance/schema/input-bundle.schema.json` requires only `ir`; six rules read `manifest`, `lock`, `mappings` or `consumerPolicy`. A rule whose input is absent is suppressed and recorded — never decided by guessing and never silently skipped. Suppressions contribute no diagnostic, no `resultState` change, and no member of the adapter result.
- [ ] Apply a declared graph-depth bound of 256 where the caller supplies no limits, and do not read `DEFAULT_LIMITS` from `src/compiler/diagnostics.mjs`, which carries 128. Cite issue #62 for the disagreement.
- [ ] Bound `maxNodes`, `maxCollectionItems` and `maxDiagnostics`, returning a bounded answer at each and never throwing.
- [ ] Implement `REFERENCE_POLICY` in `loss.mjs` as the single named GAP-011 constant with two settings, defaulting to `strict` — the corpus's published reading. Flipping it to `open` must change no other line of the backend. Where `importedExports` is absent the rule is suppressed rather than decided.
- [ ] Prove the module never throws over 512 mutated documents and leaves its input byte-unchanged.
- [ ] Measure G2: run the admissibility answer over all 111 cases and all 44 expected diagnostic rows, and record the first-run divergence count before fixing anything.

## Deliverables

- `src/compiler/backends/typescript-v1/admit.mjs` (cross-field rules, suppressions, limits)

## Notes

- GAP-011's declared owner, issue #9, is closed. The policy constant defaults to the corpus's reading, which is conformance with the published yardstick and not a ruling on the contract; issue #59 carries the ownership question.
- A rule whose input is absent must be suppressed and recorded. Deciding it by guessing produces a divergence on every case whose bundle carries only `ir` — three of the four committed bases do.
- The first-run divergence count is recorded before any fix. After the first run every change is tuning.
- Never widen a rule or narrow the register to make a case agree. A disagreement that cannot be closed is reported for the owner and left failing.
