---
id: SR-165
title: "Risk and complexity review of the spec-bundle extraction frontend"
type: SpecReview
analysis: risk-complexity
scope: "US-015, FR-091..099, NFR-031..033"
review_set: all
---
# Risk and complexity review

## Summary

Issue #36 adds one Rust workspace crate that reads a spec bundle through
`quire_rs::semantic::extract_semantic`, lowers the result to semantic IR
`1.1.0`, canonicalizes it, and proves parity with the TypeSpec frontend on the
shared cases. Every requirement was scored on technical risk and volatility
against the code the frontend will consume (`quire-rs` at `17b80e4`..`a874fb6`,
`crates/semantic-ir`, the three shared TypeSpec cases) and against the four
unruled inputs (#77, #78, #67, #61). Three items are unsatisfiable as written
and should be reworded before `spec-to-plan`: the cross-frontend parity gate
(FR-098) has zero reachable cases because every shared case declares a
package-local `scalar`, which is not one of the three permitted single-dialect
reasons; the relationship lowering (FR-094) has no engine API to consume, so
the frontend must parse `## Relationships` and locate frontmatter edges itself;
and the table/fence byte-identity criterion (FR-093-AC-1) cannot hold inside one
bundle because `origin.source.path` is an emitted byte. The remaining risk is
volatility: an unreleased engine pinned by git rev, three declared readings
whose reversal rewrites goldens, and a canonical form that duplicates an
algorithm the crate is forbidden to link.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-1450 | high | Cross-frontend parity is unreachable on all three shared cases. `scalars-and-records`, `enums-and-unions`, and `collections-and-units` each declare a package-local `scalar Text extends string` (the third also `scalar Seconds extends float64` with `@unit`, the first `@minLength` on the scalar and `@role`), which the typed `Field \| Type \| Multiplicity \| Constraints` table cannot author: a table declares fields on an object artifact and names only kernel scalars or bundle artifacts. FR-098 permits a single-dialect reason naming only `union`, `sequence`, or `map`, so FR-098-AC-6 fails on every case and FR-098-AC-7 is satisfied vacuously with zero comparisons. FR-098-CON-1 forbids touching the `typespec` trees, so the fix is a spec change: either widen the reason vocabulary to name `scalar` (and record 0/3 parity honestly), or add a fourth shared case authored in both dialects with kernel scalars only, which FR-045 must permit. Decide before tasking; the parity track otherwise ships a green test that observed nothing. | FR-098 Behavior, FR-098-AC-6, FR-098-AC-7, FR-098-CON-1, FR-045 |
| FND-1451 | high | FR-094 has no engine API for its edge input. `quire_rs::semantic::SemanticExtraction` carries `fields`, `clauses`, `clause_text`, `operations` and nothing for `## Relationships`; the only public per-document edge surface is `quire_rs::corpus::harvest_edges(&LoadedDocument) -> Vec<(target_id, edge_type)>`, which carries no locus, no verb for a body link beyond the constant `references`, and no relative-link edges (those live in the `pub(crate)` corpus `resolve`). `extract_filament_core` is the Filament tier path and returns `CoreGraphEdgeRef` without line/column. So the frontend must itself parse the bullet grammar `` - `<name>`: <verb> → <Target> (<id>) [<n>..<m>] `` and locate `relationships:` frontmatter entries to satisfy FR-094-AC-1/AC-7 (bullet locus at column 3) — a second Markdown reading outside the letter of FR-091-CON-3 (which names only Properties/Invariants/Operations) but against its spirit and US-015's drift rule. Complexity is high and volatility is high: when quire-rs adds a `RelationshipDecl` to the extraction (the natural next step of quoin#293), this module is deleted and every relationship golden re-cut. Mitigation: file the quire-rs ticket now, confine the parser to `edges.rs` behind one function, and state the reading in FR-094 the way #77/#78 readings are stated. | FR-094 Inputs, FR-094 Behavior, FR-094-AC-1, FR-094-AC-7, FR-091-CON-3, US-015 Options |
| FND-1452 | medium | The table/fence byte-identity criterion cannot hold in the fixture layout FR-098 describes. `fixtures/config-version/` holds "the `table` and `fence` copies of `FR-006`" in one bundle: both carry `id: FR-006` and `title: ConfigVersion`, so FR-093 raises `DUPLICATE_TYPE_NAME` at the second and `BundleIndex::from_documents` indexes the id twice (FR-092 `Ambiguous`); and even lifted separately, `origin.source.path` (FR-093 record and field origins, FR-094 clause `sourceSpan.path`) is an emitted byte, so `config-version.table.md` and `config-version.fence.md` differ by path. FR-093-AC-1, NFR-031-AC-3, and US-015-EX-2 need two bundles whose copy of FR-006 sits at the same bundle-relative path; FR-093-CON-1's "fields_form influencing no emitted byte" is then testable. Cheap to fix in the spec now; a plan built on the single-bundle layout discovers it on the first golden. | FR-093-AC-1, FR-093-CON-1, FR-098 Outputs, NFR-031-AC-3, US-015-EX-2 |
| FND-1453 | medium | The engine pin is an unreleased git rev, and the rev the spec names is too early. No release tag contains quire-rs #388 (`17b80e4`; `v0.45.0` predates it, HEAD is `0.46.0` unreleased), so NFR-033 pins by `rev`. But FR-091 requires `Registry::load_module_set`, which landed in #411 (`a874fb6`) two commits after #388; the pin must be at or after `a874fb6`, not "the revision containing #388" as NFR-033 words it. Volatility: every rev bump rewrites `Cargo.lock`, `<out>.provenance.json` (which names the rev, FR-095-AC-9) and therefore every fixture's committed provenance golden; a tag cut by quire-agent-c moves the specifier shape. Mitigation: word the pin as "at or after #411", keep the rev out of `expected/semantic-ir.json` (it is not there today; keep it that way), and let the provenance golden be regenerated by `--write-goldens` as a single deliberate commit per bump. | NFR-033 Rationale, NFR-033-AC-3, FR-091 Behavior, FR-095 Provenance, FR-095-AC-9, FR-098-AC-1 |
| FND-1454 | medium | FR-097's canonical form duplicates an algorithm the crate may not link and is not literally the #22 reading it claims. `crates/semantic-ir/src/number.rs` already implements ECMAScript `Number::toString` and `json.rs` the member ordering, but FR-097-CON-1 forbids a runtime dependency, so `canonical.rs` re-implements both; the number layout is the subtle part (exponent thresholds `1e21`/`1e-7`, shortest round-trip digits) and IR numbers are today all small integers (`multiplicity`, `min`, `maxLength`, `precision`), so exposure is low but the property test must cover the thresholds anyway. Ordering: FR-097 says "UTF-16 code units" (RFC 8785 literally) while `json.rs` and `conformance/README.md` sort by code point (`as_bytes().cmp`); identical on the BMP, divergent for astral vs U+E000..U+FFFF names — none exist in the schema, so choose one wording and cite it. If #67 rules for the identity-sorted-set form as the document form, `canonical.rs` gains the thirteen container paths and every golden and `.fingerprint` is re-cut: moderate rework, one module. | FR-097 Canonical form, FR-097-CON-1, FR-097-AC-3, FR-097-AC-5, issue #67 |
| FND-1455 | medium | Three declared readings, rated for rework if ruled the other way. #77 (FR-095 `source.dialect: spec-bundle`): a third dialect value for projections does not change what an authored Markdown bundle stamps — rework nil. #78 (FR-093 losses): if IR gains an any-type or a `presence` member independent of `multiplicity.lower`, the `JsonObject` record, the `required-collection-presence` derivation, both `losses.json` rows and every `DECLARED_LOSS` emission are removed and all goldens re-cut — moderate, confined to `lower.rs` and `losses.json`; but the reading is also coupled to the reader (`PRESENCE_MULTIPLICITY_MISMATCH` in `crates/semantic-ir/RULES.md`), which is a prohibited path, so the frontend cannot move first. #61 (FR-096 locus = engine locus): if the published rule derives locus from the nearest ancestor node rather than the engine's row line/column, every `negatives` golden and FR-096-AC-6/AC-7 change — moderate, one module. All three are correctly cited; slice each into its own task so a ruling reverts one commit. | FR-095 source block, FR-093 Declared losses, FR-096 Locus, issues #77, #78, #61 |
| FND-1456 | medium | Two requirements disagree on which registry owns `INVALID_IR`. FR-097 Validation and its Outputs emit "one blocking `agent-ix.compiler.INVALID_IR` per schema error"; FR-096 lists `INVALID_IR` in the closed `agent-ix.extraction-frontend.*` enum, and FR-096-CON-2 forbids emitting any `agent-ix.compiler.*` code as the frontend's own, carrying the reader's code only under `causes`. FR-099-AC-3 tests the bare name `INVALID_IR` so either passes. Left unresolved, the generated diagnostics document, the `negatives` golden for this code, and FR-096-AC-3's string-literal grep are built on whichever the implementer picks; fix FR-097 to the FR-096 form before tasking. | FR-097 Validation, FR-097 Outputs, FR-096 Registry, FR-096-CON-2, FR-099-AC-3 |
| FND-1457 | medium | Toolchain policy is owned elsewhere and the crate runs on a toolchain the workspace does not. `1.98.1` is installed here and `cargo-deny`/`cargo-audit` are on the path, so NFR-033's gates can run today; but the workspace resolves `Cargo.lock` under `rust-toolchain.toml` `1.94.1` while this crate's gates run `cargo +1.98.1 --locked`, so a lockfile-format or resolver difference between the two cargos turns every gate red with a `Cargo.lock` diff that NFR-032 forbids fixing outside the `members` entries. The `1.98.1` number is quire-agent-c's open sweep (quire-rs#417, quire-cli#82, ix-trace-rs#6, quire-contract-ir PR #62); if the sweep lands on a different patch or bumps the workspace channel, NFR-033-AC-1/AC-2 and the Makefile block change — trivial rework, but the two agents edit the same root `Makefile` and `Cargo.toml`, so sequence the landing. Mitigation: prove `cargo +1.98.1 build --locked` leaves `Cargo.lock` byte-unchanged as the first plan task; rebase onto the sweep if it merges first. | NFR-033 Statement, NFR-033-AC-1, NFR-033-AC-2, NFR-033-AC-10, FR-099 Make targets, NFR-032-AC-3 |
| FND-1458 | medium | FR-092's `Stale` and `Ambiguous` states impose an ordering the requirement does not state. `Stale` needs the set of artifacts refused or not lowered under FR-091/FR-093 before any token is resolved, so lowering is two-pass (extract all, then resolve, then lower); `Ambiguous` needs every name match, while `BundleIndex::from_documents` builds `names` per entry and the engine's own resolver returns the first hit. The engine already classifies each target to a kernel name, `ix://…/type/…`, or the `unresolved/<Token>` placeholder with `reason`, so the frontend re-classifies a classified value; complexity is medium and the failure mode is a one-pass implementation that never produces `Stale`. Mitigation: name the pass order in FR-092 Behavior and make TC-1215 a two-document fixture. | FR-092 Behavior, FR-092-AC-4, FR-092-AC-6, FR-091 Outputs |
| FND-1459 | low | Parallel-edit and staleness hazards, none blocking. PR #84 (`contract-agent-core/49-scratch-fixtures`, mergeable) adds TC-921..TC-1109 rows to `spec/tests.md`; this branch's FRs cite TC-1200..TC-1329, none yet in `spec/tests.md` (branch max TC-1108), so no id collision, but the matrix step must land after #84 or rebase over its hunks. The module installed under `~/.ix` is `spec-objects-business 0.2.0` while the repository manifest is `0.3.0` (`semantic_core 0.1.0`, `contract_version 1.0.0`, tags to `v0.6.0`); FR-091 ignores ambient modules so only fixture provenance is exposed — FR-098's `fixtures/business` must be copied from the repository checkout, never from `~/.ix`. #85 (json-schema target) is a declared gap with no rework here: the payload helper is test-only and unexported, so a later backend adds nothing to this crate. | FR-098 Backend acceptance, FR-098-AC-1, FR-091-AC-1, FR-091-AC-4, issue #85, PR #84 |

## Risk Register

| Req | Tech Risk | Volatility | Complexity | Drivers | Mitigation |
|---|---|---|---|---|---|
| US-015 | Medium | High | - | Aggregates FR-091..099; EX-2 needs the two-bundle layout; four unruled inputs | Reword EX-2 per FND-1452; one task per declared reading (FND-1455) |
| FR-091 | Medium | Medium | Low | In-process consumption of an unreleased engine; `load_module_set` post-dates #388 | Pin at or after `a874fb6` (FND-1453); AC-8 grep as the drift gate |
| FR-092 | Medium | Low | Medium | Two-pass ordering for `Stale`; `Ambiguous` re-scan; closed enums with six states | State the pass order (FND-1458); property test over mutated tokens (AC-9) is the right control |
| FR-093 | Medium | Medium | Medium | #78 losses; byte-identity across forms vs path in origin; constraint applicability table | Two-bundle fixture (FND-1452); losses isolated in `lower.rs` + `losses.json` (FND-1455) |
| FR-094 | High | High | High | No engine relationship API; own bullet and frontmatter parser; category from registries; composite set | Confine to `edges.rs`, file quire-rs ticket, declare the reading (FND-1451) |
| FR-095 | Low | Medium | Low | SHA-256 recipes, slug rules; provenance names the git rev | Independent digest recomputation (AC-3/AC-4); provenance golden regenerated per pin bump (FND-1453) |
| FR-096 | Medium | Medium | Medium | Closed registry of 23 codes; #61 locus reading; INVALID_IR namespace conflict | Fix FR-097 wording (FND-1456); locus module isolated (FND-1455) |
| FR-097 | High | Medium | Medium-High | Re-implemented JCS + ECMAScript numbers; UTF-16 vs code-point wording; atomic write; two external readers as gates | Threshold property tests, one ordering wording (FND-1454); `node` absence fails not skips (AC-11) |
| FR-098 | High | High | High | Parity unreachable on 3/3 cases; read-only proof via git + hashes; per-code negatives; goldens | Widen reason vocabulary or add a kernel-scalar-only case (FND-1450); fixtures from repo checkout (FND-1459) |
| FR-099 | Low | Medium | Low | Exit-code contract; Makefile block shared with the toolchain sweep | Sequence landing with the sweep (FND-1457) |
| NFR-031 | Medium | Low | Medium | Five limits with probe tests; HashMap audit; enumeration-order injection; fuzz under panic hook | Limits as data read by both diagnostic and test (AC-6); mirror the quire-rs audit |
| NFR-032 | Medium | Low | Medium | Sentinel-bounded change range; `Cargo.lock` must not drift under the second cargo | Prove lock stability first (FND-1457) |
| NFR-033 | Medium | High | Low | Git-rev pin; policy owned by another agent; `jsonschema ~0.18` coupled to quire-rs's line | Pin wording (FND-1453); rebase over the sweep (FND-1457) |

## Top hazards

1. FND-1450 - FR-098 parity observes nothing: every shared case declares a package-local `scalar`, which is not a permitted single-dialect reason.
2. FND-1451 - FR-094 has no engine relationship API; the frontend must parse `## Relationships` and frontmatter edges itself, and that module is deleted when quire-rs exposes one.
3. FND-1452 - table/fence byte-identity cannot hold in one bundle; `origin.source.path` and `DUPLICATE_TYPE_NAME` both break it.
4. FND-1453 / FND-1457 - unreleased engine at a git rev that must post-date #411, on a toolchain the workspace lockfile was not resolved under, with the policy owned by a parallel sweep.
5. FND-1454 / FND-1456 - the canonical serializer is a forbidden-to-share duplicate of `crates/semantic-ir`, and two requirements name different registries for `INVALID_IR`.

## Risk Ranking

| Rank | Req | Why |
|---:|---|---|
| 1 | FR-098 | Unsatisfiable parity gate as worded; highest golden surface |
| 2 | FR-094 | Own Markdown parsing against the program's drift rule; high churn when the engine catches up |
| 3 | FR-097 | Duplicated canonical algorithm; #67 open; two external readers as hard gates |
| 4 | FR-093 | #78 losses and the cross-form identity criterion |
| 5 | NFR-033 / FR-091 | Unreleased engine by git rev; toolchain owned elsewhere |
| 6 | FR-092 | Two-pass resolver ordering unstated |
| 7 | FR-096 | 23-code registry; #61 locus reading; INVALID_IR conflict |
| 8 | NFR-031 | Five limits, fuzz, audit — well-specified, mechanical |
| 9 | FR-095 | Digest recipes independently checkable |
| 10 | NFR-032 | Sentinel range pattern already proven on #20/#21 |
| 11 | FR-099 | Thin CLI over FR-097 |

## Failure-domain gaps

No `spec-failure-domain-analysis` deliverable exists yet under
`spec/reviews/36-extraction-frontend/`; the failure-domain review for this
issue should be authored beside this one. The gaps that also raise risk here
are identity confusion between the table and fence copies of one artifact
(FND-1452), the ordering dependency behind `Unresolved::Stale` (FND-1458), and
the unstated relationship-declaration source (FND-1451).
