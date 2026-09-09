---
id: Task-132
title: "FR-093 records, fields, constraints, enumerations, losses.json, limits.json"
type: Task
status: todo
track: A
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-131"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-093"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-1220"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1221"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1222"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1223"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1224"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1225"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1226"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1227"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1228"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1229"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1333"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1334"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1335"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1347"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1305"
    type: verifies
---
# Task-132: FR-093 records, fields, constraints, enumerations, losses.json, limits.json

## Scope

`lower.rs`: `lower_record(extraction, resolutions, ctx)` and
`lower_enum(document, rows, ctx)`; the `losses.json` register; the NFR-031
`limits.json` data file and its five `LIMIT_*` checks (three in `bundle.rs`
after `load_repo`, two here), because `maxFieldsPerRecord` and
`maxClauseBytes` are enforced in this path (SR-163 step 5).

## Subtasks

- [ ] **Fixtures.** Author `fixtures/both-forms/`; begin `fixtures/business/` with the `domain` (no `## Properties`), `entity`, `value_object` and `enumeration` (`## Values`) artifacts under the vendored module (`PROVENANCE.json` `authored`); author `fixtures/negatives/{ARTIFACT_NOT_LOWERED,UNNAMEABLE_ARTIFACT,DUPLICATE_TYPE_NAME,DUPLICATE_CONSTRAINT,CONSTRAINT_NOT_APPLICABLE,DECLARED_LOSS}/` and `constructed.json` stubs for the five `LIMIT_*` codes naming their `tc_1305_` constructing functions.
- [ ] **Red.** `tests/lower.rs`: `tc_1220_` (table root vs fence root, `normalized` bytes identical), `tc_1221_` (roles `business:domain-object`, `business:entity`, `business:persistable`, `unknownPolicy reject`, seven fields in declaration order), `tc_1222_`, `tc_1223_` (`VERSION_NUMBER_MIN`), `tc_1224_`, `tc_1225_` (frontend `CONSTRAINT_NOT_APPLICABLE` and `decide` agree over the full RULES.md cross product), `tc_1226_` (`JsonObject` record + `DECLARED_LOSS unconstrained-value`, every taken loss has a row), `tc_1227_`, `tc_1228_`, `tc_1229_` (proptest rename), `tc_1333_` (enum variants via `quire_rs::extract` `values_table`, `variant/<enum-slug>-<value-slug>`, origin row col 3; no `## Values` → blocking; no `kind: alias` anywhere), `tc_1334_`, `tc_1335_`, `tc_1347_` (`Status`/`status` → `DUPLICATE_TYPE_NAME` at the second, no duplicate `field/status-*`). `tests/limits.rs`: `tc_1305_` (five constructed bundles one past each limit, one blocking `LIMIT_*` naming the file's value, under 512 MiB / 30 s).
- [ ] **Green: record.** `displayName` (frontmatter `name` if `Identifier`, else `title`, else `UNNAMEABLE_ARTIFACT`), roles sorted/deduped, `unknownPolicy reject`, origin at path line 1 col 1; `not_applicable` → `fields: []`; `unavailable`/`missing` → `ARTIFACT_NOT_LOWERED` (non-blocking iff `legacy-form`); `lossy` → `DECLARED_LOSS lossy-extraction`; `DUPLICATE_TYPE_NAME` on equal slugs at the second path (D8).
- [ ] **Green: fields and constraints.** Field members from `FieldDecl` only (name, typeRef, multiplicity default `{1,1}`, presence from `lower`, nullable default false, `defaultKind none`, unit); origin row line col 3 / fence line; `identity-field` and `decimal-policy` extensions; constraints under FR-029 with `diagnosticCode agent-ix.<name>.<SCREAMING_FIELD>_<KEYWORD>`; `DUPLICATE_CONSTRAINT` on repeated keyword or colliding code; `CONSTRAINT_NOT_APPLICABLE` from the RULES.md table.
- [ ] **Green: enumerations and losses.** `lower_enum` through the engine evaluator, never a crate parser (D4); `losses.json` rows `unconstrained-value` (#78), `required-collection-presence` (#78), `lossy-extraction` (quire-rs FR-072).
- [ ] **Green: limits.** `limits.json` with `maxDocuments`, `maxDocumentBytes`, `maxFieldsPerRecord`, `maxClauseBytes`, `maxDepth`, read at run time (`include_str!` is fine; the number in the diagnostic is read from the parsed file, not restated).
- [ ] **Refactor.** Feed `UNNAMEABLE_ARTIFACT`/`DUPLICATE_TYPE_NAME` outcomes back into Task-131's pass-one map.
- [ ] **Falsify.** Swap `fields_form` on a scratch extraction and prove no byte moves (`tc_1220_` is the control).

## Deliverables

- `src/lower.rs`, `src/limits.rs`, `losses.json`, `limits.json`; `tests/lower.rs`, `tests/limits.rs`
- `fixtures/both-forms/`, the first four `fixtures/business/` artifacts, six `fixtures/negatives/<CODE>/` bundles, five `constructed.json` stubs

## Notes

- Readings of issue #78 (`JsonObject` open record, presence from `multiplicity.lower`) are cited in `losses.json` and the module doc; a contrary ruling removes them in one commit.
- TC-1230 (both readers, zero `agent-ix.semantic-ir.*`) is verified by Task-134.
- Unblocks: Task-133.
