---
id: SR-173
title: "Integrity review of the shared identity-minting rule (issue #87)"
type: SpecReview
analysis: integrity
scope: "docs/semantic-data-system/contracts-v1.md §Identity minting, spec/functional/FR-034-*.md, FR-053-*.md, FR-093-*.md, FR-094-*.md, FR-095-*.md, FR-096-*.md, FR-098-*.md, FR-099-*.md, spec/tests.md (TC-1223..1354 rows CR-087-1 touches)"
review_set: all
---
# Integrity review

## Summary

Verdict: CONDITIONAL. The CR-087-1 commit (`86320f0`) states the identity
rule once in `docs/semantic-data-system/contracts-v1.md` §Identity minting and
makes FR-034, FR-053, FR-093, FR-094, and FR-095 cite it; the slot list, the
case-preserving slug, the `field/<Name>-<operation>-<param>` parameter form
(no `param/` slot), the `type/<Name><Field>` alias, and the
`UPPER_SNAKE` `diagnosticCode` form are now stated the same way in every one
of those files, every new or rewritten criterion names a TC, the FND range
is unused, and `Status`/`status` is decided the same way everywhere. The
rule is not yet single-interpretation. Three highs are residual
contradictions inside the set the ruling asked to unify: the contract
section says both that an empty slug part is dropped and that it raises
`UNSLUGGABLE_NAME`; the `type/` slot is stated as verbatim in FR-095 and as
slugged in the contract on the strength of a false lemma (an `Identifier`
may contain `_`, which `slug` rewrites, so the two implementations the
contract names already disagree on `Config_Version`); and FR-053, left
"unchanged otherwise", still raises `UNSLUGGABLE_NAME` for two names that
slug to one identity and `agent-ix.semantic-ir.DUPLICATE_IDENTITY` for a
collision, while the contract, FR-095, and EC-161 assign `DUPLICATE_IDENTITY`
to the first case and nothing in the compiler namespace to the second. Six
mediums: the contract's closing rule has an unstated partition
(`DUPLICATE_TYPE_NAME` versus `DUPLICATE_IDENTITY`); `diagnosticCode` is
not injective over the case-distinct names the rule declares distinct; the
alias `displayName` is stated by FR-093 alone and differs from what
`identity.mjs` and the FR-034 lowerer produce for an underscored field;
FR-095-AC-6's "exactly one pattern" is no longer decidable for the
`type/` slot; FR-034's stated `diagnosticCode` form and its reference
lowerer do not slug the package or the field; FR-095-AC-16's node test
and shared table fall outside every stated change-set bound; and four
matrix rows the new `DUPLICATE_IDENTITY` variant turns red are still
`✅ passed`. No finding proposes reopening the rule choice. No requirement
file was edited by this review.

## Findings

| ID | Severity | Summary | Refs | Escape Cause |
|---|---|---|---|---|
| FND-1530 | high | `contracts-v1.md` §Identity minting states two outcomes for one input. The slug paragraph says "Each part is slugged, empty parts are dropped, and the parts are joined by `-`"; the closing paragraph says "If a name slugs to the empty string, the frontend raises `UNSLUGGABLE_NAME` at that declaration." Both cannot hold for `slug("--")`. The two implementations the section names already split on it: `src/compiler/frontend/typespec/identity.mjs` `mintIdentity` filters empty parts and raises nothing, `crates/extraction-frontend/src/identity.rs` `slug` returns `Unsluggable`, and FR-095-AC-7 asserts the second reading. The shared table of FR-095-AC-16 cannot carry a row for this case without one side going red. | contracts-v1.md §Identity minting, FR-095 "Node identities", FR-095-AC-7, FR-095-AC-16, TC-1252, TC-1352, TC-1353 | wrong-requirement |
| FND-1531 | high | The `type/` slot is stated as slugged and as verbatim, reconciled by a lemma that is false. The contract table says every part is slugged and adds "For a name that is already an `Identifier`, the slug is the name verbatim"; FR-095 says `<Name>` is "the record's `displayName` verbatim ... verbatim and slugged are the same string, because a `displayName` is an `Identifier` and `slug` maps an `Identifier` to itself." FR-031 defines `Identifier` as `^[A-Za-z_][A-Za-z0-9_]*$`, so `slug("Config_Version")` is `Config-Version`, not the name. `identity.mjs` slugs the type name (`mintIdentity` slugs every part), `identity.rs` `type_identity` uses `display_name` verbatim; for any underscored record or enumeration name the two frontends mint two `type/` identities, two alias identities, and two `typeRef` targets, which FR-098-AC-7 would fail. The kernel-scalar row (`type/<KernelScalar>`) is unaffected. The sentence must choose slugged or verbatim; it may not derive one from the other. | contracts-v1.md §Identity minting, FR-095 "Node identities", FR-031, FR-092 Outputs, FR-098-AC-7, TC-1251, TC-1291 | wrong-requirement |
| FND-1532 | high | The closing rules of the shared section are not FR-053's. FR-053 "Identity minting" says "If slugging two distinct declaration names produces one identity, then the frontend SHALL raise `agent-ix.compiler.UNSLUGGABLE_NAME` at the later declaration's locus" and "If two declarations mint the same identity, then the frontend SHALL raise `agent-ix.semantic-ir.DUPLICATE_IDENTITY`"; FR-053-AC-10 asserts both. The contract says a name that "slugs to the empty string" is `UNSLUGGABLE_NAME` and two declarations minting one identity (`created_at` beside `created-at` included, per EC-161) is `DUPLICATE_IDENTITY`; FR-095 and ERR-281 say the same. `src/compiler/frontend/typespec/lower.mjs` raises `UNSLUGGABLE_NAME` for the slug collision and never `DUPLICATE_IDENTITY` (that code is the FR-050 reader's, `src/compiler/ir/reader.mjs`), so the TypeSpec frontend does emit the colliding alias the contract says a frontend "never emits" and relies on the reader to refuse it. EC-161 binds `created_at`/`created-at` to TC-1353 with `DUPLICATE_IDENTITY` while FR-053-AC-10 binds the same input to `UNSLUGGABLE_NAME`. The commit's "FR-053 text unchanged otherwise" left the one paragraph the ruling required to become the same. | FR-053 "Identity minting", FR-053-AC-10, contracts-v1.md §Identity minting, FR-095 "Node identities", ERR-281, EC-161, TC-1351, TC-1353 | wrong-requirement |
| FND-1533 | medium | The contract's closing rule reads "If two declarations mint one identity, the frontend raises `DUPLICATE_IDENTITY`"; FR-093 and FR-095 partition that event three ways the contract does not state: two documents with equal verbatim `displayName` (one `type/Status` twice) are `DUPLICATE_TYPE_NAME` (FR-093 "The record", FR-093-AC-13); a `displayName` equal to a kernel scalar the bundle uses (one `type/UUID` twice) is `DUPLICATE_TYPE_NAME` (FR-093, FR-095-AC-14 "still refused"); only "two distinct names that nonetheless mint one identity" are `DUPLICATE_IDENTITY`. The partition is consistent between FR-093 and FR-095 but contradicts the contract sentence, which is the one place the ruling said the rule lives, and a TypeSpec reader of the contract has no way to learn it. | contracts-v1.md §Identity minting, FR-093 "The record", FR-093-AC-13, FR-095 "Node identities", FR-095-AC-14, FR-092-AC-8, TC-1334, TC-1347, TC-1351 | wrong-requirement |
| FND-1534 | medium | The rule declares `Status` and `status` "distinct identities, not a collision" (contract; FR-095 "two names minting two distinct identity sets"; FR-095-AC-14 "lifts with zero diagnostics about them"), but `diagnosticCode` upper-cases the slug, so a constrained field `x` with `min` on each yields one code `agent-ix.<pkg>.STATUS_X_MIN` twice in one document. FR-093's `DUPLICATE_CONSTRAINT` is scoped to "two constraints of one record", `crates/semantic-ir/RULES.md` and `src/compiler/ir/reader.mjs` check no `diagnosticCode` uniqueness, and neither the contract nor FR-095 says whether a document-wide duplicate `diagnosticCode` is a defect, a collision, or accepted. The same fold applies to `created_at`/`createdAt` (`CREATED_AT` versus `CREATEDAT` are distinct, but `Created_At`/`created_at` are not). | contracts-v1.md §Identity minting, FR-095 "Node identities", FR-095-AC-14, FR-093 "The fields", FR-093-AC-13, TC-1334, TC-1347 | missing-requirement |
| FND-1535 | medium | The alias `displayName` is outside the shared statement and stated two ways by its implementations. The contract fixes the alias identity `type/<Name><Field>` and says nothing about the alias node's `displayName`; FR-093 sets it to `<DisplayName><Field>` with `<Field>` "the slugged field name with its first character upper-cased" (`created_at` → `NoteCreated-at`); `identity.mjs`/`lower.mjs` set `aliasName` to `${owner}${capitalize(property.name)}` unslugged (`NoteCreated_at`), as does FR-034's `test/semantic-core-lowerer.ts` (`${owner}${pascal(name)}`); FR-053 states no alias `displayName` at all. `displayName` survives the FR-098 parity projection (`types[]` is kept whole), so FR-098-AC-7 depends on a datum the one rule does not fix. | contracts-v1.md §Identity minting, FR-093 "The fields", FR-093-AC-12, FR-053 "Constraints and minted aliases", FR-034, FR-098-AC-7, TC-1333, TC-1291 | missing-requirement |
| FND-1536 | medium | FR-095-AC-6 asserts "every identity ... matches exactly one pattern of the closed list ... asserted by regex over every node." Under the old list the alias `type/<DisplayName>.<fieldName>` was regex-distinguishable from `type/<DisplayName>` by its dot; under the shared rule `type/NoteRevision` (alias) and `type/NoteRevision` (record) are one string class by construction, so "exactly one" is not decidable by regex and the criterion as written cannot be met or refuted for the `type/` slot. FR-094-AC-13 ("match the minting patterns of FR-095 exactly") inherits the same shape for the two `field/` patterns (`<Name>-<field>` versus `<Name>-<operation>-<param>`), which a regex over the identity alone cannot tell apart for a field named with a `-`-bearing slug. | FR-095-AC-6, FR-094-AC-13, TC-1251, TC-1243 | wrong-requirement |
| FND-1537 | medium | FR-034 now says "The identity, alias, and `diagnosticCode` rules above are the one identity-minting rule of ... §Identity minting", but the rule above it is `agent-ix.<repo>.<NAME>_<FIELD>_<KEYWORD>` with no slug on `<repo>` or the parts, and its Output `test/semantic-core-lowerer.ts` (line 142) emits `agent-ix.${repo}.${owner.toUpperCase()}_${name.toUpperCase()}_${keyword.toUpperCase()}`. The contract's form is `agent-ix.<slug(package name) lower-cased>.<UPPER_SNAKE(...)>`. For package `core.data` or field `a_b.c` (exactly the FR-053-AC-9 cases) the two forms differ, and FR-034's produces a code outside the `common.schema.json` pattern `^agent-ix\.[a-z0-9-]+\.[A-Z][A-Z0-9_]+$`. FR-053-CON-1's differential test runs on a worked package with plain names and cannot see it. The contract names FR-034 as one of three implementations; FR-034's text and lowerer implement a narrower rule. | FR-034 Behavior, FR-034 Outputs, contracts-v1.md §Identity minting, FR-053-CON-1, FR-053-AC-9, FR-095-AC-16 | wrong-requirement |
| FND-1538 | medium | FR-095 Outputs and FR-095-AC-16 add `test/fixtures/compiler/shared/identity-cases.json` and "a node test against `src/compiler/frontend/typespec/identity.mjs`" (TC-1353). No stated change-set bound admits them: NFR-032 permits under `test/` only `cases.json` members, `test/fixtures/compiler/shared/spec-bundle/**`, and `.../typespec/records-and-scalars/**`, and prohibits `test/*.test.ts`; FR-098-AC-10 says the change set outside the crate "is exactly `cases.json`, ... `records-and-scalars/`, and files under `shared/spec-bundle/`"; FR-099-CON-1/AC-5 say "exactly six paths". FR-095-CON-4 bounds only `src/compiler`, `packages`, `conformance`, `schema`, and no sentence scopes NFR-032 or FR-099-CON-1 to the issue #36 range, so as written TC-1353 and TC-1299/TC-1310/TC-1294 cannot all be green. The node test's file path is also unnamed. | FR-095 Outputs, FR-095-AC-16, FR-095-CON-4, NFR-032, FR-098-AC-10, FR-099-CON-1, FR-099-AC-5, TC-1353, TC-1294, TC-1299, TC-1310, TC-1354 | missing-requirement |
| FND-1539 | medium | Matrix rows the new registry variant turns red are still `✅ passed`: FR-096-AC-2 now names `DUPLICATE_IDENTITY` but TC-1260 is neither retitled nor pending; FR-096-AC-13/TC-1271 requires `extraction-frontend-diagnostics.md` to regenerate "byte for byte" from the enum, and the committed doc now says 27 codes with a `DUPLICATE_IDENTITY` row while the enum has 26; FR-096-AC-14/TC-1272 and FR-098-AC-4/TC-1288 require the `negatives/` set to equal the enum and `negatives/DUPLICATE_IDENTITY` to emit its code; the FR-096 coverage row stays `✅ Complete`. At low severity, also unaddressed: FR-094 "Relationships" writes `<TargetName>` without saying whose name (`edges.rs` uses the resolved artifact's `displayName`, the contract says "target type name", the frontmatter token may be an id such as `FR-005`); the contract fixes the code prefix as the literal `agent-ix.` for every `<org>` (the schema pattern requires it, but the section does not say so); FR-053's `slug` "replace every character ... collapse runs" and the contract's "replace every run with one `-`" are equivalent but worded as two algorithms. | FR-096-AC-2, FR-096-AC-13, FR-096-AC-14, FR-098-AC-4, TC-1260, TC-1271, TC-1272, TC-1288, FR-094 "Relationships", FR-094-AC-1, contracts-v1.md §Identity minting, FR-053 "Identity minting" | correct-requirement-no-evidence |

## Traceability Matrix

| US | FR/NFR | StR | Verification |
|---|---|---|---|
| US-007 | FR-034 (Behavior, one added sentence; AC-1..5 unchanged) | StR-001 | FR-053-CON-1 differential test; no TC id on the added sentence |
| US-010 | FR-053 (Identity minting, one added sentence; AC-6, AC-10) | StR-001 | TC-1353 (AC-6); AC-10 has no TC id and contradicts EC-161 (FND-1532) |
| US-015 | FR-093 (AC-4, AC-5, AC-12, AC-13; Behavior "The record", "The fields", "Enumeration artifacts") | StR-001 | TC-1223, TC-1224, TC-1333, TC-1334 |
| US-015 | FR-094 (Relationships, Operations, Clauses; AC-11, AC-13) | StR-001 | TC-1241, TC-1243 |
| US-015 | FR-095 (Node identities; CON-4; AC-6, AC-7, AC-14, AC-16) | StR-001 | TC-1251, TC-1252, TC-1347, TC-1351, TC-1352, TC-1353, TC-1354 |
| US-015 | FR-096 (registry; AC-2) | StR-001 | TC-1260 (not retitled, FND-1539) |
| US-015 | FR-098 (Rationale, inventory, parity; AC-6, AC-7) | StR-001 | TC-1290, TC-1291 |
| US-015 | FR-099 (evidence skip list) | StR-001 | TC-1298 (unchanged row) |
| — | contracts-v1.md §Identity minting | — | Normative doc; verified only through FR-034/FR-053/FR-095 and the AC-16 table |

## Cross-checks performed

| Check | Result |
|---|---|
| Slot list: contract table versus FR-053 list versus FR-095 closed list versus FR-094 statements | `type`, `field` (incl. parameter), `variant`, `relationship`, `operation`, `clause`, field `constraint`, alias, kernel scalar agree in all four; type `constraint/<Name>-<keyword>` appears in the contract and FR-053 only (the spec-bundle frontend has no type constraints; not a defect); `param/` appears nowhere (`identity.rs` still has `NodeKind::Param`, pending implementation) |
| `slug` definition: contract, FR-053, FR-095 | Same function (case-preserving, `[A-Za-z0-9]`, runs to one `-`, trimmed); empty-slug outcome stated two ways in the contract (FND-1530); `type/` part slugged or verbatim unresolved (FND-1531) |
| Alias form: contract, FR-034, FR-053, FR-093, FR-095, `identity.mjs`, `semantic-core-lowerer.ts` | Identity `type/<Name><Field>` agrees everywhere; `<Field>` capitalisation of the slug agrees between contract/FR-093/FR-095 and `identity.mjs`; alias `displayName` unstated by the contract and differs between FR-093 and both node implementations for underscored fields (FND-1535) |
| `diagnosticCode` form: contract, FR-034, FR-053, FR-093, FR-095, `identity.mjs` | Contract, FR-053, FR-093, FR-095, and `identity.mjs` agree (`slug(pkg)` lower, `UPPER_SNAKE` of slugged parts, camelCase not split); FR-034's text and lowerer omit the slug (FND-1537); the literal `agent-ix.` prefix is assumed for every org (FND-1539) |
| Collision codes: contract, FR-053, FR-095, FR-096, ERR-281, EC-161 | FR-095/FR-096/ERR-281/EC-161 agree with the contract; FR-053 assigns `UNSLUGGABLE_NAME` to the slug-collision case and a `semantic-ir` code to the identity collision (FND-1532); `DUPLICATE_TYPE_NAME` carve-outs unstated by the contract (FND-1533) |
| `Status`/`status` outcome: contract, FR-093, FR-095-AC-14, FR-093-AC-13, TC-1334, TC-1347, EC-154 | Distinct identities, no diagnostic, in every place; `diagnosticCode` fold unaddressed (FND-1534) |
| `versionNumber`/`version_number` codes: FR-093 Behavior, FR-093-AC-13, TC-1334, boundary row | `VERSIONNUMBER_MIN` versus `VERSION_NUMBER_MIN`, distinct, no diagnostic, stated the same way in all four |
| Shared case `records-and-scalars`: FR-098 Rationale/AC-7 versus fixture trees | Both dialects declare `Note.revision` with `min: 1`/`@minValue(1)`, so `type/NoteRevision` is minted on both sides as FR-098 states |
| Registry: FR-096 enum list, severity table, AC-2; `extraction-frontend-diagnostics.md`; FR-098 negatives inventory | 27 codes in all three; `DUPLICATE_IDENTITY` error/blocking everywhere; matrix rows TC-1260/1271/1272/1288 not updated (FND-1539) |
| TC ids on every changed or added AC | TC-1223, 1224, 1241, 1251, 1252, 1290, 1291, 1333, 1334, 1347 retitled; TC-1351..1354 added, each bound once; FR-053-AC-10 and FR-034's added sentence carry no TC (pre-existing style for those files) |
| Change-set bounds versus new Outputs | `identity-cases.json` and the node test outside NFR-032, FR-098-AC-10, FR-099-CON-1 (FND-1538); FR-095-CON-4's four directories consistent with FR-098-AC-10's `src/compiler/frontend/**` |
| Hidden-assumption probes (external CLI, multi-source lookup, pagination, concurrency, auth, unimplemented package) | None applicable to this change; the one lookup over multiple sources (the collision check over "every minted identity of one lift") has a stated tie-break (path, line, column) |

## Coverage Result

| Scope | Obligations | Matrix cases | Result |
|---|---|---|---|
| Issue #87 shared identity rule | 1 contract section; FR-034 +1 sentence; FR-053 +1 sentence; FR-093 3 Behavior sections + 4 ACs; FR-094 4 statements + 1 AC; FR-095 Node identities + CON-4 + 4 ACs; FR-096 +1 variant; FR-098 Rationale + 2 statements + 2 ACs; FR-099 +1 clause | TC-1223, 1224, 1241, 1251, 1252, 1290, 1291, 1333, 1334, 1347 retitled `🚧`; TC-1351..1354 added `🚧`; ERR-281, EC-161 added; ERR-261, EC-154 restated | Every rewritten criterion names a TC; 3 high, 6 medium interpretation defects; four FR-096/FR-098 rows carry a stale `✅` |
| Existing corpus | TC-001..1350 | untouched except the rows above | Untouched |
