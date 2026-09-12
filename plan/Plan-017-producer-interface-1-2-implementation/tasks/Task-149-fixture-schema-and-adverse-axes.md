---
id: Task-149
title: "Static bundle fixture, published JSON Schema, eight one-axis adverse fixtures, and the NFR-036 goldens"
type: Task
status: todo
track: D
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-148"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/NFR-036"
    type: references
  - target: "ix://agent-ix/filament-core-data/FR-117"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-1450"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1451"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1453"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1455"
    type: verifies
---
# Task-149: static bundle fixture, published JSON Schema, eight one-axis adverse fixtures, and the NFR-036 goldens

## Scope

Author the wire-level evidence the plan owns:
`fixtures/baseline-1-2/static-bundle-a.json` as the admitted static bundle wire
form, `schema/baseline/v1/static-bundle.schema.json` as its published JSON Schema,
and eight one-axis adverse fixtures under
`fixtures/baseline-1-2/adverse/<axis>.json`. Then cut the committed NFR-036 golden
byte strings from the admitted fixture bundle and add the golden-comparison,
insertion-order-permutation and semantic-order gates over them.

Each adverse fixture mutates **exactly one** axis of the good fixture and must
refuse with **exactly one** refusal code. A second axis firing is a fixture defect,
not a producer finding.

## Subtasks

- [ ] **Green: the good fixture.** `fixtures/baseline-1-2/static-bundle-a.json` — one
  model, one profile, at least two components, at least three endpoints (so a
  self-relationship has two distinct endpoint identities over one type identity), at
  least two relationships including one self-relationship, one inventory declaration,
  one configuration document carrying its declared `digestSelections`,
  `revisionNamespaces` and `resourceLimits.numericResourceLimit`, the static
  prerequisite closure, and at least two correspondence records whose export mappings
  cover the `component`, `endpoint` and `relationship` kinds. A display-name
  collision across a repository, a component, a role and an endpoint is authored on
  purpose (TC-1413's input), and one authored exact decimal beyond binary64 exists so
  the fixture exercises Task-143's seam.
- [ ] **Green: the published schema.** `schema/baseline/v1/static-bundle.schema.json`,
  in the shape `schema/baseline/v1/producer-bundle.schema.json` already establishes:
  four header members required, the nine content member classes required, every
  assessment member class prohibited (`additionalProperties: false` plus explicit
  `not` on the assessment names), `DigestSelection` four members required,
  `Revision` two members required, and the locus's raw-byte digest typed as a string
  rather than a selection. A schema round-trip test validates the good fixture and
  rejects each adverse fixture that is a shape violation.
- [ ] **Green: the eight adverse fixtures.** One axis each, one code each:
  `01-missing-identities.json` (`IDENTITY_ABSENT`);
  `02-digest-domain-substituted.json` (`DIGEST_DOMAIN_SUBSTITUTED` / `DIGEST_MISMATCH`);
  `03-revision-namespace-substituted.json` (`REVISION_NAMESPACE_SUBSTITUTED`);
  `04-export-foreign-cross-bound.json` (`EXPORT_FOREIGN` / `EXPORT_CROSS_BOUND`);
  `05-endpoint-role-multiplicity-lost.json` (`ENDPOINT_ROLE_ABSENT` /
  `ENDPOINT_MULTIPLICITY_ABSENT`);
  `06-component-provenance-absent.json` (`COMPONENT_PROVENANCE_ABSENT` /
  `ENDPOINT_PROVENANCE_ABSENT`);
  `07-stale-correspondence-selection.json` (`CORRESPONDENCE_STALE_SELECTION`);
  `08-inventory-incomplete.json` (`INVENTORY_MEMBER_UNLISTED` /
  `INVENTORY_INCOMPLETE_UNKNOWN`). Each is diffed against the good fixture in the
  test to prove the mutation is one axis wide.
- [ ] **Red: goldens.** `tests/byte_exact.rs`: `tc_1450_` (every digested document of
  the admitted bundle canonicalizes to the same byte string and digest across two
  runs in one process and two runs in two separate processes, and equals the
  committed golden), `tc_1453_` (the same bytes under a changed locale, environment
  and working directory against the same golden).
- [ ] **Red: order properties.** `tc_1451_` (property: every digested document's
  digest is unchanged when its object keys and set-array members are supplied in a
  permuted insertion order, one paired run per permutation of the **declared
  permutation set**, which this task declares and commits beside the golden),
  `tc_1455_` (property: every semantic-order array is emitted in the
  producer-declared order, measured per array against that declaration, with a
  permuted-array paired run whose digest **must differ**).
- [ ] **Green: golden bytes.** Commit the golden canonical byte strings under
  `fixtures/baseline-1-2/golden/` — one file per digested document — written once by
  a single sanctioned writer path, never rewritten by a test.
- [ ] **Falsify.** Perturb one golden byte and prove `tc_1450_` fails naming the
  document. Add a second axis to one adverse fixture and prove its one-axis diff
  check fails.

## Exit conditions

- The good fixture admits; each of the eight adverse fixtures refuses on exactly one
  axis with exactly one code, proven by a one-axis diff against the good fixture.
- The published JSON Schema validates the good fixture and rejects every shape-level
  adverse fixture.
- Committed goldens exist for every digested document, and TC-1450, TC-1451, TC-1453
  and TC-1455 pass against them, each reporting the number it measured.
- `make rust-build`, `make rust-test` and `cargo fmt --check` green apart from the
  two pre-existing reds.

## Deliverables

- `fixtures/baseline-1-2/static-bundle-a.json`
- `fixtures/baseline-1-2/adverse/01-…json` .. `08-…json`
- `fixtures/baseline-1-2/golden/` and the declared permutation set beside it
- `schema/baseline/v1/static-bundle.schema.json`
- `crates/baseline-producer/tests/byte_exact.rs`, `tests/adverse.rs`, `tests/schema.rs`

## Notes

- This task is half of NFR-036's declared apparatus (NFR-036 Verification,
  FND-1756/FND-1767). The other half — the second architecture, the instrumented
  ambient-read run and the network namespace — is Task-150, and until it lands
  TC-1448, TC-1452 and TC-1456 fail reporting that they did not run.
- Goldens are cut once, here. No earlier task commits one and no test rewrites one.
- Unblocks: Task-150.
