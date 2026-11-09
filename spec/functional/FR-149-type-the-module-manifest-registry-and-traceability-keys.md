---
id: FR-149
title: "Type the module manifest's artifact data schema, registry and traceability keys"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-005"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-142"
    type: "references"
---
# FR-149: Type the module manifest's artifact data schema, registry and traceability keys

## Description

This requirement answers Linear PLAT-206 and the schema half of PLAT-900.
`schema/semantic/v1/module-manifest.schema.json` closes its root with
`additionalProperties: false`, yet live modules declare eight root keys it did
not name, and an artifact type's `data_schema` was an untyped object. The
schema is the contract the module loader and the installer enforce, so a key it
cannot see or a form it cannot type is unenforced.

The schema shapes below mirror the typed readers in quire-rs
(`src/vocab.rs`, `src/traceability.rs`, `src/grammar/mod.rs`,
`src/loader/manifest.rs`); where quire-rs ignores an unknown member the schema
does too, and where it denies one the schema does. Relations between members of
one declaration (a trace target named by a reference, a marker named by a legacy
form, a regular expression's validity, one status value in one class) are
checked by the consumer at module load and are not restated here.

## Inputs

- A module manifest document

## Outputs

- A validation verdict from the published `module-manifest.schema.json`

## Behavior

- An artifact type's `data_schema` SHALL take the same two forms as an object type's (quoin FR-073): an inline JSON Schema object, or `{schema: <module-relative path to a .json file>}`. An object carrying `schema` or `digest` together with any other key, a path that is absolute, climbs with `..` or does not end in `.json`, and a non-object SHALL be refused.
- `lexicon`, `observable_verbs` and `vacuous_predicates` SHALL each be a map from term to `{definition: string, category?: string}`.
- `ambiguity_terms` SHALL be a map from term to `{definition, category?}` and SHALL refuse any other member of an entry.
- `property_idioms` SHALL be a map from phrase to `{definition, shape, category?}`, where `shape` is one of `round-trip`, `idempotence`, `ordering`, `invariant`, `error-case`, `lifecycle`, `concurrency`, `universal`, `example`, `unclassified`.
- `grammar_severity` SHALL be a map from a `<grammar>:<check>` key (two non-empty halves, no whitespace, exactly one colon) to `off`, `warning` or `error`.
- `verification_catalog` SHALL be a map from method id to an entry with non-blank `name`, `class` and `definition` and optional `evidence_kind`, `cost`, `applicability` (rule name to a list of strings) and `tooling` (a list of strings), and SHALL refuse any other member.
- `traceability` SHALL be the declarative traceability model: `exclude`, `source_exclude`, `trace_targets`, `document_references`, `status`, `trace_tags` (`markers`, `legacy`, `implements`), `vocabularies` (`test_type`, `test_type_column`, `no_source_symbol`, `retired`), `obligations`, `required_relations`, `acyclic_edges` and `vocabulary_coverage`, each entry with the required and optional members the quire-rs reader declares, and SHALL refuse an undeclared member at any level of it.
- A trace target SHALL declare `from` as `table_row` (the default), `list_item` or `heading`. A `table_row` target SHALL declare `id_column` and no `pattern`; a `list_item` or `heading` target SHALL declare `pattern` and no `id_column`.
- A `trace_tags.implements` form SHALL accept `syntax: rust_attribute` for language `rust` only; a `markers` or `legacy` form SHALL refuse `syntax`.
- An obligation SHALL NOT name both `target` and `archetype`, and SHALL name one of them; an obligation naming `archetype` SHALL also name `section` and `id_format`. A combinatorial `strength` SHALL be at least 1.
- A required relation SHALL declare a non-empty `edges` and a `direction` of `outgoing`, `incoming` or `either`.

The scalar-or-list `section` is one named definition (`SectionList` for the list form). The `oneOf` of a string and that list stays at each use, because the Python generation inspection classifies a root-level `oneOf` definition as degraded.

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-149-AC-1 | An artifact type with an inline `data_schema` or a `{schema: "schemas/a.data.json"}` reference is accepted; a reference alongside another key or `digest`, a `digest` alone, an absolute, `..` or non-`.json` path, an empty path and a string `data_schema` are refused. | Test (TC-1898) |
| FR-149-AC-2 | `lexicon`, `observable_verbs`, `vacuous_predicates`, `ambiguity_terms` and `property_idioms` entries with the stated members are accepted; an entry missing `definition`, with a non-string member, a property idiom with a missing or unknown `shape`, and an ambiguity term with an extra member are refused, while a lexicon entry with an extra member is accepted. | Test (TC-1899) |
| FR-149-AC-3 | `grammar_severity` with `ac:vacuous-outcome: error` is accepted; a key with no colon, two colons, an empty half or whitespace, and a level outside `off`, `warning`, `error` are refused. | Test (TC-1900) |
| FR-149-AC-4 | A full `verification_catalog` entry is accepted; an entry missing `class`, with a blank `class`, an empty `name`, an undeclared member, a non-list `applicability` value or a string `tooling` is refused. | Test (TC-1901) |
| FR-149-AC-5 | A `traceability` block exercising every member, including `from: list_item` and `heading` targets, `retired` and an `implements` `syntax`, is accepted; an undeclared member, an empty `section` list, a trace target whose `id_column` and `pattern` disagree with its `from`, a `syntax` outside an `implements` form or on a non-Rust form, a non-list `retired`, an obligation naming both or neither of `target` and `archetype` or `archetype` without `section` or `id_format`, a combinatorial `strength` of 0, a required relation with no `edges`, an unknown `direction` or a `check` containing a colon, a marker of an unknown `language`, a status without `column` and a document reference without `targets` are refused. | Test (TC-1902) |

## Dependencies

- **Referenced**: [FR-142](./FR-142-declare-construct-kinds-as-module-data.md) (object-type declarations in the same manifest), quoin FR-073 (the `data_schema` reference form), quire-rs FR-043, FR-047, FR-048, FR-050, FR-052, FR-054 and FR-056 (the typed readers)
