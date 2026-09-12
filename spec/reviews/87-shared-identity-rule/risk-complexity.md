---
id: SR-176
title: "Risk and complexity review of the shared identity-minting rule"
type: SpecReview
analysis: risk-complexity
scope: "docs/semantic-data-system/contracts-v1.md §Identity minting, FR-034, FR-053, FR-093, FR-094, FR-095, FR-096, FR-098, FR-099, spec/tests.md, spec/log.md CR-087-1"
review_set: all
---
# Risk and complexity review

## Summary

Issue #87 (CR-087-1, commit `86320f0`) states one identity-minting rule in
`docs/semantic-data-system/contracts-v1.md` §Identity minting and makes
FR-034, FR-053, and FR-095 cite it, rewriting FR-095's minting section and
the FR-093/FR-094/FR-096/FR-098 sentences that depended on the old
spec-bundle rule. Every touched requirement was scored on technical risk and
volatility against the two implementations the contract names
(`src/compiler/frontend/typespec/identity.mjs` + `lower.mjs`, and
`crates/extraction-frontend/src/identity.rs` + `lower.rs`), the `Identifier`
grammar of FR-031, and the goldens the change re-cuts. The rule choice is not
at issue (the owner ruled; Phase 0 chose FR-053's rule with reasons). The
risk is in how the rule is stated and traced: two sentences of the contract
are false of the code it says already implements it — the TypeSpec frontend
does not raise `DUPLICATE_IDENTITY` itself and FR-095-CON-4 forbids the byte
that would make it do so, and "an `Identifier` slugs to itself" fails on the
underscore `Identifier` admits, which is exactly where the two `type/`
minters diverge. Both are cheap to fix in the spec before `spec-to-plan`;
left as written, the shared-table test of FR-095-AC-16 goes green while the
parity the contract promises does not hold on names with an underscore, and
the `negatives/DUPLICATE_IDENTITY` case has no TypeSpec twin. Technical risk
is otherwise low (a slug, a concatenation, a hash-set check) and the rework
is confined to the extraction crate and its goldens, as Phase 0 measured.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-1560 | high | The contract's collision rule is not implemented by the TypeSpec frontend, and FR-095-CON-4 forbids the change that would implement it. `contracts-v1.md` §Identity minting says the rule "is stated here once and implemented unchanged by every frontend" and, under "Two rules close the function", that "the frontend raises `DUPLICATE_IDENTITY` … it never emits a colliding identity". `src/compiler/frontend/typespec/lower.mjs` lines 326–342 do the only pre-mint check: a `Map` of `slug(declaration.name)` over top-level declarations, raising `UNSLUGGABLE_NAME` (not `DUPLICATE_IDENTITY`) when two names slug alike. The case the contract, FR-095-AC-14, and `negatives/DUPLICATE_IDENTITY` all name — an author-named `NoteRevision` beside `Note` with a constrained `revision`, whose alias `constraintAliasIdentity` mints as `type/NoteRevision` — passes that check, is emitted, and is refused only by the reader (`src/compiler/ir/reader.mjs:449`, `agent-ix.semantic-ir.DUPLICATE_IDENTITY`), against the contract's "never emits". FR-095-CON-4 and TC-1354 then require `git diff --stat origin/main -- src/compiler` to be empty, so the sentence stays false for one of the two frontends by construction, and FR-095-AC-16's shared table cannot see it, because the table asserts minting functions, not the collision pass. Fix in the spec: either state the collision rule as "raised before emission by the extraction frontend (FR-095) and at read time by the FR-050 reader for a TypeSpec document, and never emitted unrefused", citing `reader.mjs`, or drop "implemented unchanged by every frontend" for that paragraph and let FR-053 carry its own reading; and add a `negatives`-style TypeSpec case to FR-053-AC-10 or record in FR-098 that the parity case must not contain a collision. | contracts-v1.md §Identity minting ("implemented unchanged by every frontend"; "Two rules close the function"), FR-095-CON-4, FR-095-AC-14, FR-095-AC-16, FR-053 Identity minting bullets 6–7, FR-053-AC-10, TC-1351, TC-1354 |
| FND-1561 | high | "An `Identifier` slugs to itself" is false, and it is the sentence the two `type/` minters disagree on. `contracts-v1.md` §Identity minting: "For a name that is already an `Identifier`, the slug is the name verbatim"; FR-095 Node identities, `type` bullet: "verbatim and slugged are the same string, because a `displayName` is an `Identifier` and `slug` maps an `Identifier` to itself". FR-031 gives `Identifier` the pattern `^[A-Za-z_][A-Za-z0-9_]*$`, so `Config_Version` and `created_at` are `Identifier`s and `slug` maps them to `Config-Version` and `created-at` (the contract's own example two paragraphs earlier). Today `identity.mjs` slugs every part including `type` (`mintIdentity(packageIdentity, "type", [name])`, `lower.mjs:402`), so a TypeSpec `model Config_Version` mints `type/Config-Version`, while `identity.rs::type_identity` takes the `displayName` verbatim, `type/Config_Version`; FR-095's sentence instructs the extraction side to keep doing so. The owner part of every `field/`, `constraint/`, `relationship/`, `operation/`, `clause/`, `variant/` identity and the alias `type/<Name><Field>` then differ between frontends for any record or field whose name carries `_` — a common Markdown-authored form (`created_at` is the contract's example). Byte-parity (FR-098-AC-7) holds on `records-and-scalars` only because none of its names carries an underscore. Fix: strike "verbatim" and the two false sentences; state `type/<slug(Name)>` and note that `slug` is the identity on `[A-Za-z0-9]+` names only. TC-1352/TC-1353 will catch a `created_at` field row but not the `type/` row unless the table carries one; add it. | contracts-v1.md §Identity minting (slug paragraph, last sentence), FR-095 Node identities `type` bullet, FR-093 The fields (alias bullet), FR-095-AC-16, FR-098-AC-7, FR-031 `Identifier` |
| FND-1562 | medium | The contract states two outcomes for an empty slug and the two implementations each do one. `contracts-v1.md` §Identity minting: "Each part is slugged, empty parts are dropped, and the parts are joined by `-`", then "If a name slugs to the empty string, the frontend raises `UNSLUGGABLE_NAME` at that declaration". `identity.mjs::mintIdentity` filters empty parts silently (`.filter((part) => part.length > 0)`); `identity.rs::slug` returns `Err(Unsluggable)`. The case is unreachable from TypeSpec (every name is an `Identifier`) and reachable from Markdown (an enumeration `Value` cell of `***`, FR-095-AC-7), so no fixture today exposes the disagreement, but a shared-table row (`FR-095-AC-16`) with an empty part has no single expected value. Fix: keep one sentence — "raises `UNSLUGGABLE_NAME`; a part is never silently dropped" — and give `identity-cases.json` an error-row form, or state that error rows are Rust-only and why. | contracts-v1.md §Identity minting (slug paragraph; "Two rules close the function"), FR-095 Node identities slug bullet ("empty parts are dropped"), FR-095-AC-7, FR-095-AC-16 |
| FND-1563 | medium | FR-053's own text, left "unchanged otherwise" by the log, contradicts the contract it now cites, so the "one rule stated once" is stated three ways. FR-053 Identity minting bullet 7: "If slugging two distinct declaration names produces one identity, then the frontend SHALL raise `agent-ix.compiler.UNSLUGGABLE_NAME`" — that event is the contract's `DUPLICATE_IDENTITY` case, and `UNSLUGGABLE_NAME` in the contract means an empty slug; FR-053-AC-10 encodes the FR-053 reading and `lower.mjs:333` implements it. FR-053 bullet 6 names `agent-ix.semantic-ir.DUPLICATE_IDENTITY` where FR-095 names `agent-ix.extraction-frontend.DUPLICATE_IDENTITY` and the contract names a bare code with no statement that each frontend serialises it under its own registry. FR-034 is named as an implementation of the whole table, but FR-034 Behavior bullet 1 lists neither `variant/` nor `field/<Name>-<operation>-<param>`, and FR-053 says `variant` "is this requirement's addition to FR-034's list". Risk: a plan task that implements "the contract" and one that implements "FR-053" disagree on the collision code and its registry. Fix: restate FR-053 bullet 7 to the contract's two-rule form, add one contract sentence on registries, and either add `variant` and the parameter slot to FR-034 or say the contract's table is FR-034's plus FR-053's additions. | FR-053 Identity minting bullets 6–7, FR-053-AC-10, FR-095 Node identities `DUPLICATE_IDENTITY` bullet, FR-096 Registry, contracts-v1.md §Identity minting slot table, FR-034 Behavior bullet 1 |
| FND-1564 | medium | Two codes claim the same event and no precedence is stated. FR-093 Records: "If two documents in one bundle lower to the same `displayName` (verbatim …), then the frontend SHALL raise `DUPLICATE_TYPE_NAME`", and "If a document's `displayName` equals the name of a kernel scalar the bundle uses … blocking `DUPLICATE_TYPE_NAME`"; FR-095 Node identities: "If two declarations of one lift mint the same identity … `DUPLICATE_IDENTITY`". Two documents titled `Status` mint `type/Status` twice, and a `UUID`-titled artifact collides with the kernel definition `type/UUID`, so both rules fire on both fixtures. FR-098-AC-4 / TC-1288 require each `negatives/<CODE>/` bundle to yield "exactly its code as the first blocking diagnostic" and TC-1334/TC-1347 assert `DUPLICATE_TYPE_NAME`, so the intended order is name check first, but no sentence says the collision pass runs only over identities the name check admitted, and the contract's ordering by "package-root-relative source path, then start line, then start column" is undefined for a generated-origin node (kernel scalar definitions, the `JsonObject` record, FR-034's spanless operations), which carry no path. Fix: one FR-095 sentence — the collision check runs after FR-093's name checks and excludes their refusals; a generated-origin node is earlier than every source-located node. | FR-093 Records `DUPLICATE_TYPE_NAME` bullets, FR-095 Node identities `DUPLICATE_IDENTITY` bullet, contracts-v1.md "Two rules close the function", FR-098-AC-4, FR-093-AC-13, FR-095-AC-14, TC-1288 |
| FND-1565 | medium | The parity gate is now unconditional on one case, and its holding rests on facts outside this change. FR-098 Behavior: "the comparison SHALL hold, because both frontends implement the one identity-minting rule"; FR-098-AC-7 adds "every identity, the `type/NoteRevision` alias, and every `diagnosticCode` included". Phase 0 G5 established that the TypeSpec half's `@minValue(1) revision: integer` mints the alias and that the FR-098 projection materialises the three empty lists, so the four recorded differences in `cases.json` reduce to minting. That is sound today; the volatility is that the assertion is a byte comparison against the output of a frontend this change may not touch (FR-095-CON-4, FR-098-CON-1): a later FR-046/FR-053 change, the #88 fix, or a re-authoring of `shared/typespec/records-and-scalars/` re-cuts the spec-bundle golden and flips TC-1291 with no extraction-crate commit. FND-1561 makes it worse: the case passes only because no name in it carries `_`. Mitigation: pin the TypeSpec half's sha256 in the parity test the way FR-094-AC-8 pins the #34 fixture, so a red TC-1291 names which side moved; keep the case free of underscores until FND-1561 is fixed, then add one `_` name deliberately. | FR-098 Rationale, FR-098 Behavior (comparison bullet), FR-098-AC-6, FR-098-AC-7, FR-098-CON-1, FR-095-CON-4, TC-1290, TC-1291 |
| FND-1566 | low | Rework is small and confined, but the log's count of it is not a measurement. `spec/log.md` CR-087-1 says adopting FR-053's rule "changes only the extraction crate and its 12 goldens". Counted on this branch: files carrying an old-rule identity (`type/ConfigVersion.…`, `type/Note.…`, `/param/`, `field/config-version…`, `field/note-…`) are 7 `expected/semantic-ir.json` (`config-version-table`, `config-version-fence`, `business`, `edges/artifact-axis`, `edges/dedupe`, `negatives/ENGINE_DIAGNOSTIC`, plus the fingerprint sidecar of each), 4 test files (`tests/identity.rs`, `tests/lower.rs`, `tests/parity.rs`, `tests/clauses.rs`), `src/identity.rs` (`slug` case, `alias_display_name`, `NodeKind::Param` removal, `diagnostic_code` move), `src/lower.rs::diagnostic_code` and the `DUPLICATE_TYPE_NAME` key, and a doc comment in `src/canonical.rs:46`; new: the collision pass, `negatives/DUPLICATE_IDENTITY/`, `test/fixtures/compiler/shared/identity-cases.json`, and a node test outside the crate (the first `test/` file this track adds; FR-098-AC-10's outside-the-crate set and FR-099-CON-1's six paths do not yet name it). Technical risk is low (a regex, a capitalisation, a `HashMap`); say what "12 goldens" counts, and add the node test path to FR-098-AC-10 or FR-099-CON-1 before TC-1294/TC-1299 turn red on it. | spec/log.md CR-087-1, FR-095 Outputs, FR-095-AC-16, FR-098-AC-10, FR-099-CON-1, TC-1294, TC-1299, TC-1353 |

## Risk Register

| Req | Tech Risk | Volatility | Complexity | Drivers | Mitigation |
|---|---|---|---|---|---|
| FR-034 | Low | Low | Low | One citing sentence; its own rule table lacks `variant/` and the parameter slot the contract attributes to it | Restate the attribution (FND-1563); no code change |
| FR-053 | Medium | Low | Low | Cited as the reference implementation while its collision bullet, code namespace, and `lower.mjs` disagree with the contract; CON-4 freezes the code | Fix bullet 7 and AC-10 wording; state the reader-refusal reading (FND-1560, FND-1563) |
| FR-093 | Low | Medium | Medium | `DUPLICATE_TYPE_NAME` now verbatim; alias `<DisplayName><Field>`; `diagnosticCode` no case split; precedence against `DUPLICATE_IDENTITY` unstated | Precedence sentence (FND-1564); TC-1334 as the boundary row it already is |
| FR-094 | Low | Low | Low | Parameter slot moves to `field/`; three pattern restatements | Regex property TC-1243 already covers it; drop `NodeKind::Param` |
| FR-095 | Medium | Medium | Medium | Verbatim-vs-slug `type/` sentence false on `_` (FND-1561); empty-slug rule doubled (FND-1562); collision pass ordering over generated nodes; shared table is a new cross-language artefact | Strike "verbatim"; one empty-slug sentence; ordering sentence; error-row form for the table |
| FR-096 | Low | Low | Low | One code added to a closed enum, a table, and the rendered registry (27) | TC-1259/TC-1260 mechanical |
| FR-098 | Medium | High | Medium | Parity unconditional on one case, byte-compared against a frontend this change may not touch; holds today by Phase 0 G5 and by the absence of `_` names | Pin the TypeSpec half's sha; keep or add `_` names deliberately (FND-1565, FND-1561) |
| FR-099 | Low | Low | Low | Skip list shrinks to TC-1292 | None |

## Top hazards

1. FND-1560 — the contract says every frontend refuses a colliding identity before emission; the TypeSpec frontend does not, and FR-095-CON-4 forbids making it so. Decide the reading before a plan task tries to satisfy both.
2. FND-1561 — "an `Identifier` slugs to itself" is false on `_`, and it is the sentence that keeps `type_identity` verbatim on one side and slugged on the other; parity survives only because the one shared case has no underscore.
3. FND-1564 / FND-1562 — two codes for one event and two outcomes for one empty slug; both surface as a `negatives` bundle or a shared-table row with no single expected value.
4. FND-1565 — the parity gate's red can be caused by a commit outside the crate; pin the other half.

## Risk Ranking

| Rank | Req | Why |
|---:|---|---|
| 1 | FR-095 | Owns the false `verbatim` sentence, the doubled empty-slug rule, the collision pass, and the shared table |
| 2 | FR-053 | Reference implementation whose text and code disagree with the contract, frozen by CON-4 |
| 3 | FR-098 | Unconditional byte parity against a moving, untouchable half |
| 4 | FR-093 | Precedence of `DUPLICATE_TYPE_NAME` over `DUPLICATE_IDENTITY` |
| 5 | FR-094 | Slot rename, mechanical |
| 6 | FR-096 | Enum addition, mechanical |
| 7 | FR-034 / FR-099 | Citation and skip-list edits |

## Failure-domain gaps

The failure-domain review for this issue (SR-172,
`spec/reviews/87-shared-identity-rule/failure-domain.md`) is being authored
beside this one and was not available to cross-check. The gaps that also
raise risk here are identity confusion between an author-named type and a
minted alias when only one frontend refuses it (FND-1560), the `_`
`Identifier` on which the two `type/` minters diverge (FND-1561), the
undefined order of a generated-origin node in the collision rule (FND-1564),
and the doubled empty-slug outcome (FND-1562).

## Verdict

CONDITIONAL. The rule choice stands and the technical work is small; the two
high findings are sentences of the contract and FR-095 that are false of the
code the contract names and that the shared-table test cannot detect. Fix
them (FND-1560, FND-1561) and state the two precedences (FND-1562, FND-1564)
before `spec-to-plan`.
