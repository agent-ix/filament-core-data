---
id: Task-113
title: "The IR-surface compatibility classifier"
type: Task
status: done
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-104"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-069"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-811"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-812"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-813"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-814"
    type: verifies
---
# Task-113: The IR-surface compatibility classifier

## Scope

Land `classify.mjs`: the ordered-pair classification over the IR surface, with the modelled-change set exported as data because it is itself part of what the corpus agreement tests.

## Subtasks

- [x] Classify into `patch`, `additive`, `conditional`, `breaking`, `unknown` or `invalid`, folding to the most restrictive recorded change under `CLASSIFICATION_ORDER`.
- [x] Implement every stated rule as its own rule: type removed breaking, type added additive, changed `kind`/`scalar`/`target`/`items`/`values` breaking, field became required breaking, field became optional additive, nullability change breaking, default change conditional, relationship added or removed conditional, required extension added breaking, optional extension added additive, extension removed breaking, package identity change breaking, unknown-policy move to `reject` breaking and any other unknown-policy change conditional.
- [x] Implement the rules the draft omitted and the published policy requires: a removed field breaking, an added required field breaking, an added optional field additive and softened to `patch` by a consumer policy admitting unknown members, a removed enum or union variant breaking, and an added variant to a closed generated enum breaking per ARCH-008.
- [x] Implement the contract-version rule as the normative round-trip rule of `ir-compatibility-policy.md`: a version uplift whose down-projection reproduces the `before` document byte for byte is `additive`, and one whose projection does not is `conditional`. Record the possible disagreement with the corpus's flat reading as issue #64.
- [x] Send a change the rules do not model to `unknown` and never to `patch`; an unclassifiable change must not pass as compatible.
- [x] Force `invalid` when either side of the pair is inadmissible.
- [x] Export `MODELLED_CHANGES` as data, and fail the module's own contract test when a rule this requirement states is absent from that list.
- [x] Read no clock, and import neither the compiler's diff or evolution module nor anything under `conformance/`.
- [x] Never override `compatibility-report.schema.json`, which stays the authority for the profile, mapping, representation, target and consumer surfaces.
- [x] Measure G4: classify the twenty-five `kind: "compatibility"` corpus cases and record the first-run divergence count before fixing anything.

## Deliverables

- `src/compiler/backends/typescript-v1/classify.mjs`, `classify.d.mts`

## Notes

- There are twenty-five compatibility cases, not five: `breaking` 12, `conditional` 7, `patch` 3, and one each of `additive`, `unknown` and `invalid`.
- The `unknown` case is the awkward one. Because `unknown` is the catch-all for a change the rules do not model, a backend modelling *more* change kinds than the oracle turns that case's `unknown` into something specific and diverges — a better implementation failing the gate. `MODELLED_CHANGES` is exported so that boundary is visible rather than accidental, and CON-7 forbids narrowing it to make a case agree.
- TC-814 is a static analysis over `canonical.mjs` and `classify.mjs` together, so it closes here even though most of what it asserts belongs to Task-101.
- G4 first run **1 of 25**, final **25 of 25** under the default `VERSION_UPLIFT_POLICY` of `"corpus"`. Three rules in FR-069 contradicted `compatibility.md`, which is normative and which the corpus follows; the requirement was corrected rather than the implementation bent.
