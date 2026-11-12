---
id: SR-16501
title: PLAT-1482 PR 355 gap-analysis
type: SpecReview
analysis: gap-analysis
scope: "agent-ix/filament-core-data; PR 355; spec/functional/FR-149-type-the-module-manifest-registry-and-traceability-keys.md, schema/semantic/v1/module-manifest.schema.json, test/module-manifest.test.ts; read-only comparison with quire-rs origin/main src/traceability.rs, src/loader/record_validation.rs, src/loader/manifest.rs and FR-058 / FR-069"
review_set: subset
relationships:
  - target: ix://agent-ix/filament-core-data/FR-149
    type: references
---

## Summary

Ticket: PLAT-1482. This is a planless gap analysis of FR-149-AC-10 and
FR-149-AC-11 against the schema, the tests and the quire-rs loader that the
spec cites. Plan completion was not assessed.

Each schema shape was compared with the loader through Ajv probes.

- `where` (WhereSelector::parse) has an exact key set, and the schema rejects
  a non-object, `null`, a missing or non-string `field`, and a missing,
  non-list or empty `values` or a non-string entry, as the loader does.
  ` x ` is accepted by both. Duplicates after the fold are accepted by the
  schema and refused by the loader, which is correct: the loader is stricter.
- `record_validation` has the exact two keys, both required.

`quire matrix --scope .` reports FR-149-AC-1..11 as untagged. The
`/// Trace:` comments in the TypeScript tests are not harvested, and this
already held for AC-1..9 on main, so it is not a defect of this PR.

## Verdict

PASS WITH FINDINGS. The where/record_validation shapes match the loader
except at the edges listed below.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | medium | `record_validation` is typed only on `ArtifactTypeEntry`. quire-rs resolves it on every archetype section (`section_of`: artifact_types, object_types, archetypes), and FR-069 runs the check for the `object:` archetype too. `ObjectTypeEntry` is open, so `object_types[].record_validation: {bogus: 1}` is accepted unchecked. Lift the shape into a `$defs` entry and `$ref` it from ObjectTypeEntry. | schema/semantic/v1/module-manifest.schema.json:414 |
| FND-002 | low | The schema refuses a blank `locate_absence_at` (`\S`), but the loader refuses only an empty one (FR-069-AC-22 "empty"). A `yield_pattern.match` key `" "`, whose name the schema leaves unconstrained, with `locate_absence_at: " "` loads in quire-rs and is refused by the schema. Use `minLength: 1`. | schema/semantic/v1/module-manifest.schema.json:424 |
| FND-003 | low | `\S` (ECMA-262) and Rust `str::trim` disagree on whitespace. U+FEFF is `\s` in JS but not Rust White_Space, so `field: "﻿"` or `values: ["﻿"]` loads in quire-rs and Ajv refuses it. U+0085 goes the other way, which is harmless. | schema/semantic/v1/module-manifest.schema.json:1554 |
| FND-004 | low | `record_validation: null` is read as absent by the loader (`Option<Value>` with `serde(default)`, src/loader/manifest.rs:481-482), so it loads, while the schema refuses it. `where: null` is refused on both sides. The fix belongs in quire-rs: refuse null as `where` does. | schema/semantic/v1/module-manifest.schema.json:414 |

## Disposition (fix round 1)

- FND-001 (gap, record_validation on every archetype section): fixed. `$defs/RecordValidation` is referenced from `ArtifactTypeEntry`, `ObjectTypeEntry` and `ArchetypeEntry`; FR-149 and FR-149-AC-11 widened; tests per section.
- FND-002: fixed. `locate_absence_at` uses `minLength: 1`; AC-11 says "empty".
- FND-003: accepted, no change. U+FEFF is `\s` in JS but not Rust trim; harmless edge.
- FND-004: no change here. The schema is right to refuse null; the quire-rs side is filed separately.
