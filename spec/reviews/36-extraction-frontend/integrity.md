---
id: SR-162
title: "Integrity review of the extraction frontend (issue #36)"
type: SpecReview
analysis: integrity
scope: "spec/usecase/US-015-*.md, spec/functional/FR-091-*.md..FR-099-*.md, spec/non-functional/NFR-031-*.md..NFR-033-*.md"
review_set: all
---
# Integrity review

## Summary

US-015 is elaborated by FR-091..099 and constrained by NFR-031..033 under
StR-001. Every acceptance criterion names a verification method and a unique
TC id in the reserved TC-1200..1329 range; the dependency graph is acyclic;
the crate name, binary name, and `crates/extraction-frontend` path are used
consistently; the five `limits.json` keys of NFR-031 match the five
`LIMIT_*` codes of FR-096 one for one; the three extension identities are each
defined once; and the treatment of `parent` as a field rather than a
relationship is stated the same way in US-015-EX-1, FR-091-AC-1, FR-093-AC-3,
FR-094-CON-1, and FR-094-AC-8. The set is not yet single-interpretation.
Three highs: the FR-097 dev-dependency on the unpublished workspace crate
`crates/semantic-ir` can only be a `path` dependency, which NFR-033 forbids
without exception; the diagnostic registry FR-096 closes is opened again by
FR-097 (`agent-ix.compiler.INVALID_IR`) and FR-093
(`agent-ix.semantic-ir.CONSTRAINT_NOT_APPLICABLE`), both of which
FR-096-CON-2 prohibits; and no requirement lowers an enumeration or import
to a type definition, so the `enum`, `alias`, and `Import` nodes that
FR-092-AC-7, FR-092-AC-10, FR-097, and FR-098-AC-3 presuppose have no
producer. Six mediums are textual contradictions or hidden assumptions
(engine pass-through wording, an identity pattern outside FR-095's closed
list, a fixture layout that trips `DUPLICATE_TYPE_NAME`, a one-document-per-
code negatives rule that eight codes cannot meet, fixtures the ACs cite that
FR-098 never lists, always-written versus opt-in sidecars, and an FR-040 edge
rule that blocks any domain artifact with an ordinary `traces_to` edge). No
requirement file was edited by this review.

## Findings

| ID | Severity | Summary | Refs | Escape Cause |
|---|---|---|---|---|
| FND-1420 | high | FR-097-CON-1 and FR-097-AC-12 require `agent-ix-semantic-ir` under `[dev-dependencies]`. That crate is a workspace member with `publish = false` (`crates/semantic-ir/Cargo.toml`), so the only specifier that can reach it is `path = "../semantic-ir"`; NFR-033's metric table sets "`path`, `file:`, or `link:` dependencies" to 0 and NFR-033-AC-3 asserts "no `path` ... dependency exists" with no carve-out, and NFR-032 forbids publishing it. TC-1284 and TC-1322 cannot both pass. | FR-097-CON-1, FR-097-AC-12, NFR-033-AC-3, NFR-032-AC-6, TC-1284, TC-1322 | wrong-requirement |
| FND-1421 | high | The closed registry is opened from two sides. FR-096 lists `INVALID_IR` as `agent-ix.extraction-frontend.INVALID_IR` and FR-096-CON-2 says a reader finding "is carried under `INVALID_IR` with the reader's code in `causes`" and forbids emitting any `agent-ix.compiler.*` or `agent-ix.semantic-ir.*` code as the frontend's own; FR-097 Outputs and Behavior then emit "one `agent-ix.compiler.INVALID_IR` per schema error", and FR-093 raises `agent-ix.semantic-ir.CONSTRAINT_NOT_APPLICABLE` directly "at the row". Neither foreign code is in the enum, so FR-096-AC-3 (no literal outside the enum), FR-096-AC-14 (every code emitted by a test), and FR-098-AC-4 (one negatives document per registry code) cannot be reconciled with FR-093-AC-6 and FR-097-AC-2 as written. | FR-096, FR-096-CON-2, FR-096-AC-3, FR-097, FR-097-AC-2, FR-093, FR-093-AC-6, TC-1225, TC-1261, TC-1274 | wrong-requirement |
| FND-1422 | high | No requirement produces a type definition for anything but a record and a kernel scalar. FR-093 lowers "each object-typed artifact whose `fields` are `available`" to `kind: record`; FR-092 resolves a token to `Enumeration(ArtifactRef)` or `Import(PackageExport)` and FR-092-AC-7 makes the `typeRef` "the enumeration's identity", but nothing lowers an enumeration artifact to `kind: enum` with `variants`, nothing emits an `alias`, and the emitted document has no imports or lock block for an `Import` to point at (FR-095 emits only `source` and `package`). FR-097 sorts `variants`, FR-098-AC-3 requires the business golden to carry `enum` and `alias` definitions, and FR-092-AC-10 requires the FR-050 reader to find zero `UNRESOLVED_TYPE_REF`; all three presuppose a producer that no FR specifies. | FR-092, FR-092-AC-7, FR-092-AC-8, FR-092-AC-10, FR-093, FR-097, FR-098-AC-3, TC-1216, TC-1217, TC-1219, TC-1287 | missing-requirement |
| FND-1423 | medium | Engine pass-through is stated two ways. FR-091 says each `SemanticDiagnostic` is carried into FR-096 "unchanged in code, severity, line, and column" and FR-091-AC-9 asserts "the same code, severity"; FR-096 wraps each one as `ENGINE_DIAGNOSTIC` with the engine code only in `causes[0]` and maps `advisory→info`. A `semantic.unresolved-type` advisory therefore arrives with a different wire code and a different severity, so TC-1208 and TC-1262/TC-1263 assert different things about the same diagnostic. | FR-091, FR-091-AC-9, FR-096, FR-096-AC-4, FR-096-AC-5, TC-1208, TC-1262, TC-1263 | wrong-requirement |
| FND-1424 | medium | FR-095 declares a closed set of six node-identity patterns and FR-094-AC-13/FR-095-AC-6 assert "every emitted node" matches one by regex; FR-094 mints operation parameters as `ix://<org>/<name>/operation/<record-slug>-<op>/param/<param>`, a seventh pattern FR-095 never lists (it is `semanticIdentity`-valid, so only the closed list is violated). FR-093 also states no identity for the `JsonObject` record or the kernel-scalar definitions it mints (FR-046 uses `ix://<package>/type/<KernelScalar>`; FR-095's `type/<DisplayName>` may or may not be the same rule). | FR-094, FR-094-AC-13, FR-095, FR-095-AC-6, FR-092, TC-1243, TC-1251 | missing-requirement |
| FND-1425 | medium | The `config-version` fixture bundle holds both the `table` and the `fence` copy of `FR-006` (FR-098 Outputs). Two documents with one artifact id and one title in one bundle collide in the `BundleIndex` keyed by id (FR-091 Outputs, FR-091-AC-1 "one `SemanticExtraction` for `FR-006` keyed by id") and trip `DUPLICATE_TYPE_NAME` under FR-093; FR-093-AC-1 "lifted under the same bundle" and NFR-031-AC-3 do not say whether the two copies are lifted together or as two bundles, and no layout that satisfies both FR-091-AC-1 and FR-093-AC-1 is described. | FR-098, FR-091-AC-1, FR-093, FR-093-AC-1, NFR-031-AC-3, TC-1200, TC-1220, TC-1302 | wrong-requirement |
| FND-1426 | medium | FR-098-AC-4 requires every FR-096 code to be "emitted by exactly one `negatives` document" with no second code. Eight codes are not document-scoped and cannot meet that shape: `MODULE_WITHOUT_SEMANTIC_BLOCK`, `MODULE_REFUSED`, `BUNDLE_UNIDENTIFIED` (module/bundle refusals, exit 2 under FR-099), `DUPLICATE_TYPE_NAME` (needs two documents), `OUTPUT_UNWRITABLE` (an output-path condition), `INVALID_IR` (post-assembly fault injection per FR-097-AC-2), and `LIMIT_MAX_DOCUMENTS` (a bundle-count limit). The five `LIMIT_*` codes additionally have no owning FR: FR-096 Inputs take defects only "from FR-091 through FR-095 and FR-097", no FR Output names `limits.json`, and NFR-031 alone describes their emission. FR-099-AC-2 ("a `negatives` document with a blocking code exits `1`") is then wrong for the refusal codes, which exit `2`. | FR-098-AC-4, FR-096, FR-099-AC-2, NFR-031-AC-6, TC-1288, TC-1296, TC-1305 | missing-requirement |
| FND-1427 | medium | Acceptance criteria cite fixtures FR-098's inventory does not contain: an `operations.md` fixture (FR-094-AC-11), a "three-defect fixture" (FR-096-AC-9, while FR-098 negatives are single-defect by construction), two artifacts titled `Status` (FR-092-AC-4), a `both-forms` artifact (FR-093-AC-9), an enumeration artifact (FR-092-AC-7), an imported module with an export list (FR-092-AC-8), and a second module declaring object types (FR-095-AC-11); FR-098 lists only the spec-objects-business `0.3.0` module "and its skeleton set". FR-092-AC-1 also says "exactly the five scalar definitions" and names four. | FR-098, FR-094-AC-11, FR-096-AC-9, FR-092-AC-1, FR-092-AC-4, FR-092-AC-7, FR-092-AC-8, FR-093-AC-9, FR-095-AC-11 | missing-requirement |
| FND-1428 | medium | What a lift writes, and what the change touches, are each stated two ways. FR-095 Outputs write `<out>.provenance.json` "beside the emitted document" and FR-096 Outputs write "a diagnostics JSON array beside the document" unconditionally; FR-099 writes each only when `--provenance`/`--diagnostics` is given and prints diagnostics to stderr otherwise; US-015-EX-4 says "the only files written are the requested output document and its diagnostics" while FR-097 always writes `<out>.fingerprint`. Separately, FR-099-AC-5 asserts the change set outside the crate and the FR-098 fixture paths "is exactly the `members` line, `Cargo.lock`, and the Makefile block", which excludes `docs/semantic-data-system/extraction-frontend-diagnostics.md` — an FR-096 Output and the NFR-032 closing sentinel. TC-1299 and TC-1310 disagree on that path. | FR-095, FR-096, FR-097, FR-099, FR-099-AC-5, US-015-EX-4, NFR-032, TC-1295, TC-1299, TC-1310 | wrong-requirement |
| FND-1429 | medium | FR-094 takes "one [relationship] per FR-040 edge whose source is the record's document" and resolves every target through FR-092, which resolves only object and enumeration artifacts, imports, and kernel scalars; an `Unresolved` target raises blocking `UNRESOLVED_RELATIONSHIP_TARGET`. A domain artifact carrying the ordinary `traces_to`/`implements` frontmatter edge to a requirement or use-case (the form every spec under `quire` authors) therefore blocks its own lift. The quire-rs re-authoring has no frontmatter edges, so the fixture corpus never exercises the rule; no filter by target kind, verb category, or object-typedness is stated. Also unaddressed at low severity: NFR-032's prohibited globs `fixtures/**` and `tests/**` are unanchored and read as matching `crates/extraction-frontend/fixtures/` and `tests/`; `ext/decimal-policy` is given a payload but no `version` or `required` (the other two extensions have both); NFR-031's rationale calls the table/fence identity "the fifth acceptance criterion of issue #36" while US-015 and FR-098 name the `json-schema` payload check as that criterion; FR-097 names an "adapter binary" that no Behavior uses; `spec/tests.md` carries none of TC-1200..1329 yet, which NFR-033-AC-8 requires. | FR-094, FR-092, FR-094-AC-5, NFR-032, FR-093, NFR-031, FR-097, NFR-033-AC-8, TC-1235 | missing-requirement |

## Traceability Matrix

| US | FR/NFR | StR | Verification |
|---|---|---|---|
| US-015 (EX-1, EX-3, EX-5) | FR-091 (AC-1..10, CON-1..3) | StR-001 | TC-1200..1209 |
| US-015 (EX-3) | FR-092 (AC-1..10, CON-1..2) | StR-001 | TC-1210..1219 |
| US-015 (EX-1, EX-2) | FR-093 (AC-1..11, CON-1..3) | StR-001 | TC-1220..1230 |
| US-015 (EX-1) | FR-094 (AC-1..15, CON-1..3) | StR-001 | TC-1231..1245 |
| US-015 (EX-1) | FR-095 (AC-1..13, CON-1..3) | StR-001 | TC-1246..1258 |
| US-015 (EX-3) | FR-096 (AC-1..14, CON-1..3) | StR-001 | TC-1259..1272 |
| US-015 (EX-1, EX-2) | FR-097 (AC-1..12, CON-1..3) | StR-001 | TC-1273..1284 |
| US-015 (EX-2, EX-4) | FR-098 (AC-1..10, CON-1..3) | StR-001 | TC-1285..1294 |
| US-015 | FR-099 (AC-1..5, CON-1..3) | StR-001 | TC-1295..1299 |
| US-015 (EX-1, EX-2, EX-4) | NFR-031 (AC-1..10, 14 metrics) | StR-001 | TC-1300..1309 |
| US-015 (EX-4) | NFR-032 (AC-1..10, 16 metrics) | StR-001 | TC-1310..1319 |
| US-015 | NFR-033 (AC-1..10, 16 metrics) | StR-001 | TC-1320..1329 |

## Cross-checks performed

| Check | Result |
|---|---|
| Diagnostic codes named in FR-091..099 and NFR-031 versus the FR-096 closed list | 23 registry codes, all named by at least one FR or NFR-031; two foreign codes raised as the frontend's own (FND-1421); `LIMIT_*` owned by no FR (FND-1426) |
| Identity patterns used in FR-093/FR-094 versus FR-095 | Five of six FR-095 patterns used verbatim; operation-parameter pattern outside the list (FND-1424) |
| `ext/kernel-scalar`, `ext/identity-field`, `ext/decimal-policy` | Each defined once (FR-092, FR-093, FR-093); `decimal-policy` lacks `version`/`required` (FND-1429) |
| NFR-031 `limits.json` keys versus FR-096 `LIMIT_*` | Five for five, names agree |
| FR-098 fixture names versus FR-091/FR-093 ACs | `config-version`, `table`/`fence`, `legacy` agree; seven cited fixtures unlisted (FND-1427); table+fence in one bundle collide (FND-1425) |
| TC ids in AC cells | TC-1200..1329 each used exactly once; FR-097-AC-8's reference to TC-1279 is a deliberate comparison, not a reuse |
| Crate name, binary, path | `agent-ix-extraction-frontend`, `extraction-frontend`, `crates/extraction-frontend` used consistently in FR-097..099, NFR-031..033 |
| NFR-032 permitted/prohibited paths versus FR Outputs | Every FR Output is a permitted path; FR-099-AC-5 excludes one permitted Output (FND-1428); unanchored `fixtures/**`/`tests/**` (FND-1429) |
| FR-097 dev-dependency versus NFR-032/NFR-033 | Direction permitted by NFR-032; specifier forbidden by NFR-033 (FND-1420) |
| `parent` as field versus `config-version-v1-1.json` | Stated consistently in US-015-EX-1, FR-091-AC-1 (seven fields), FR-093-AC-3, FR-094-CON-1, FR-094-AC-8; the #34 fixture is named as not the comparison target in FR-094-CON-1 only |

## Coverage Result

| Scope | Obligations | Matrix cases | Result |
|---|---|---|---|
| Issue #36 extraction frontend | 100 FR criteria, 27 FR constraints, 30 NFR criteria, 46 NFR metrics | TC-1200..1329 named in AC cells; none yet present in `spec/tests.md` | Every criterion names a TC; 3 high, 6 medium interpretation defects; matrix rows pending the spec-matrix phase |
| Existing corpus | TC-001..1120 | untouched | Untouched |
