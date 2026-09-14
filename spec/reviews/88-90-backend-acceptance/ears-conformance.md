---
id: SR-187
title: "EARS review of the #88/#90 backend acceptance change (CR-088-1, CR-090-1)"
type: SpecReview
analysis: ears-conformance
scope: "FR-050, FR-055, FR-062, FR-068 (changed sentences of commit b97813b only)"
review_set: all
---
# EARS conformance review

## Summary

The diff against `origin/main` changes eleven requirement-bearing sentences:
two rule-table cells (FR-050 L78, FR-068 L94), six Behavior bullets (FR-055
L110–117 and L118–121; FR-062 L95–99 and L100–101; FR-068 L117 and L118), and
five AC rows (FR-055-AC-15/16, FR-062-AC-15, FR-068-AC-25/26). `spec/tests.md`
and `spec/log.md` are not requirement statements and are out of this lens.
`quire validate --summary` (quoin 0.13.0 engine) over the four files reports
five findings — `ears:non-singular` at FR-055 L134 and L137 and FR-062 L168
and L169, `quality:agentless-passive` at FR-055 L135 — every one on a line
outside the diff, so none of the changed sentences is engine-flagged. Read
against the EARS patterns, every changed sentence names a subject and none
uses an `On`/`Upon`/`After`/`During` trigger; the dominant defect is
non-singularity (the FR-055 mapping bullet carries four `SHALL`, the FR-062
register bullet two) and, second, obligations phrased over an implementation
set (`the declaration-identity set`) or inside a `so that` / `because` clause
rather than as an observable `If …, then <subject> SHALL <response>`. Nothing
found changes what gets built — each owner ruling (per-node extension
identity on #88; kernel scalar mapped onto its support type on #90) is stated
unambiguously somewhere in its bullet or AC — so no finding is high.
Verdict: CONDITIONAL — seven medium findings on statement form, three low;
no high.

Line numbers are lines in the named file on branch `fix/88-90-backend-acceptance`.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-1660 | medium | Non-singular: FR-055 L110–117 (`Scopes and collisions`, first added bullet) packs four obligations into one `If …, then` statement — `SHALL map the definition onto the support type`, `SHALL emit no newtype`, `SHALL render every typeRef … as crate::support::<Support>`, `SHALL treat the crate's existing re-export … as the definition's rendering`. The first is the ruling's name for the other three, not a separate observable; the engine did not flag the bullet. Split into one bullet per observable (no newtype; typeRef rendering; re-export is the rendering) under one shared condition, so each maps to its half of FR-055-AC-15. | FR-055 |
| FND-1661 | medium | Non-system subject and change-relative response: FR-055 L118–121 `A definition that derives a reserved crate name with any other scalar, or with any kind other than scalar, SHALL keep raising NAME_COLLISION under the rule above` makes the data value the actor and states the response relative to the prior spec state (`keep raising`), which a reader of the merged text cannot resolve. This is an unwanted-behaviour statement; restate as `If a definition derives a reserved crate name and is not a kind: scalar definition whose scalar is the support type's own scalar, then the backend SHALL raise NAME_COLLISION naming both identities and SHALL write no file` (or reference the L100–103 collision bullet by name rather than `the rule above`). | FR-055 |
| FND-1662 | medium | Response hidden in a purpose clause: FR-068 L117 `admitIr SHALL decide the uniqueness of an extension identity against a set local to the node …, so that two entries … sharing an identity raise DUPLICATE_IDENTITY at the second entry's identity pointer`. The only observable — the diagnostic and its pointer — sits after `so that`, which EARS reads as rationale, while the `SHALL` governs an implementation choice (`a set local to the node`). Restate as `If two entries of one node's extensions[], or of the document-level extensions[], share an identity, then admitIr SHALL raise DUPLICATE_IDENTITY at the second entry's identity pointer.` | FR-068 |
| FND-1663 | medium | Implementation-phrased prohibition with the observable stated without `SHALL`: FR-068 L118 `admitIr SHALL NOT enter an extension identity into the declaration-identity set it decides DUPLICATE_IDENTITY over for types, fields, …` obliges a data structure no test observes; the verifiable statement — `a document whose several definitions each carry ix://agent-ix/semantic-core/ext/kernel-scalar is admissible` — follows a semicolon with no `SHALL` and reads as an example. Restate as `admitIr SHALL NOT raise DUPLICATE_IDENTITY for an extension identity that recurs across nodes` and keep the kernel-scalar document as the AC-25 instance. | FR-068 |
| FND-1664 | medium | Rule-table cell that the table's governing sentence cannot apply to: FR-068 L94 (and its copy at FR-050 L78) now reads `Node identities are unique within each list; an extension identity is unique per node …; and is never entered into the declaration-identity set, so two definitions each carrying … are admissible`. The table is governed by FR-068 L84 `Where a rule in the table below does not hold of the document, admitIr SHALL emit one diagnostic`, so each cell must be a predicate of the document; `is never entered into the declaration-identity set` is a predicate of the implementation and has no `does not hold` case, and the `so …` tail is an example, not a rule. Also the one obligation now lives in two requirements verbatim (FR-050, FR-068), so an edit to one strands the other's AC. Reduce each cell to the two document predicates (`node identities are unique within each list; extension identities are unique within one extensions[] list`) and let FR-050 reference FR-068's row. | FR-050, FR-068 |
| FND-1665 | medium | Non-singular and self-duplicating: FR-062 L95–99 `The register SHALL carry one name-derivation row per support scalar …, each naming the case that exercises the mapping …, and each SHALL be bound to a case` states the binding obligation twice inside one bullet (`each naming the case` and `each SHALL be bound to a case`) with two `SHALL`; the engine did not flag it. Keep one obligation: `The register SHALL carry one name-derivation row per support scalar (date, datetime, duration, uuid), contributed by names.mjs and naming the case that exercises FR-055's support-type mapping for that scalar` — the L102–103 bullet already obliges every row to name a case. | FR-062 |
| FND-1666 | medium | Verification obligation written as Behavior with a command as the actor: FR-062 L100–101 `node src/compiler/backends/rust-serde/cli.mjs register --check SHALL pass after the register is regenerated with those rows` names no system behaviour beyond what L104–105 (`regenerated by a script and checked in --check mode`) already obliges, and `after the register is regenerated` is a temporal trigger outside the `When`/`While`/`If` set. FR-062-AC-15 already carries the pass/fail check; delete the bullet or fold it into the Verification column. | FR-062 |
| FND-1667 | low | Rationale and issue citations inside the obligation sentence: FR-055 L116–117 `because a kernel scalar is a known quantity and not a user type (agent-ix/filament-core-data#90, owner ruling of 2026-09-09)`, FR-055 L120–121 `so the mapping onto a support type is admitted only where the derived name and the scalar agree`, FR-068 L118 `because an extension identity names a capability … (agent-ix/filament-core-data#88, owner ruling of 2026-09-09)`, FR-062 L98–99 `(agent-ix/filament-core-data#90)`. The ruling citations are the traceability the brief requires — keep them, but as a Rationale sentence or a trailing note under the bullet, so the `SHALL` clause is one testable statement. | FR-055, FR-062, FR-068 |
| FND-1668 | low | AC rows bundling independent cases onto one TC, so a failure on one half is not attributable: FR-055-AC-15 (L157) asserts the `uuid` case in full and `the same holds for date, datetime, and duration` (four cases, TC-1357); FR-055-AC-16 (L158) a `scalar: string` named `Uuid` and a `kind: record` named `Date` (TC-1358); FR-068-AC-25 (L250) a positive (three kernel-scalar definitions admissible) and a negative (two `ext/doc` on one field) case (TC-1355); FR-062-AC-15 (L194) row count, contributor, case binding, `--check` pass, and `--check` failure on removal (TC-1359). The Test Matrix maps each to one row; consider one AC (or one TC) per case so the matrix can go red on exactly the failing case. | FR-055, FR-062, FR-068 |
| FND-1669 | low | Engine coverage note: `quire validate --summary` flagged none of the changed sentences — not the four-`SHALL` bullet at FR-055 L110 nor the two-`SHALL` bullet at FR-062 L95 — while it reports five findings on pre-existing lines outside the diff (FR-055 L134, L135, L137; FR-062 L168, L169), so `--strict` would neither gate FND-1660 nor FND-1665. Recorded so the engine's clean read of the diff is not mistaken for conformance; no action on the spec. | FR-055, FR-062 |

## Proposed rewrites

Representative rewrites; no requirement file is edited by this review, and
none alters the owner rulings on #88 or #90.

- FR-055 L110–117, as three bullets under one condition: `If a kind: scalar definition whose scalar is one of date, datetime, duration, or uuid derives the type identifier of that scalar's support type (Date, DateTime, Duration, Uuid), then the backend SHALL emit no newtype for it.` / `… then the backend SHALL render every typeRef to it as crate::support::<Support>.` / `… then the backend SHALL treat the crate's existing re-export of that support type as the definition's rendering.` Rationale (separate sentence): `A kernel scalar is a known quantity and not a user type — agent-ix/filament-core-data#90, owner ruling of 2026-09-09.`
- FR-055 L118–121: `If a definition derives a reserved crate name and is not a kind: scalar definition whose scalar is that support type's own scalar, then the backend SHALL raise one blocking NAME_COLLISION naming both identities and SHALL write no file.`
- FR-068 L117: `If two entries of one node's extensions[], or two entries of the document-level extensions[], share an identity, then admitIr SHALL raise DUPLICATE_IDENTITY at the second entry's identity pointer.`
- FR-068 L118: `admitIr SHALL NOT raise DUPLICATE_IDENTITY for an extension identity that recurs across nodes.` Rationale: `An extension identity names a capability the node carries, not a declaration the document makes — agent-ix/filament-core-data#88, owner ruling of 2026-09-09.`
- FR-068 L94 (and FR-050 L78 by reference): `Node identities are unique within each list, and extension identities are unique within one extensions[] list` | `DUPLICATE_IDENTITY`.
- FR-062 L95–99: `The register SHALL carry one name-derivation row per support scalar (date, datetime, duration, uuid), contributed by names.mjs and naming the case that exercises FR-055's support-type mapping for that scalar.`
- FR-062 L100–101: delete; FR-062-AC-15 and the L104–105 bullet already carry the `--check` obligation.
