---
id: SR-084
title: "Scope and boundary review of the Rust/Serde semantic codegen backend"
type: SpecReview
analysis: scope-boundary
scope: "US-011, FR-054..FR-062, NFR-022..NFR-023, spec/spec.md, spec/index.md, spec/log.md"
review_set: all
---
# Scope and boundary review

## Summary

Issue #21 owns one language backend inside `filament-core-data`: the published
IR-to-Rust/Serde mapping table, the identifier derivation, crate emission with a
finite static export surface and a named dynamic surface, constraint enforcement
at the construction and deserialization boundary, the ECMA-262-under-RE2
decision procedure, the closed `agent-ix.rust-backend.*` diagnostic registry,
the `rust-backend` conformance adapter and its independent Rust reader,
determinism and rustfmt evidence, two consumers built from a packaged artifact,
and a mapping-branch register with a mutation catalogue. The stop lines are
stated in §2.2 in five entries and enforced by path in NFR-023, and the ticket's
publication gate is enforced three ways — `publish = false` emitted
unconditionally (FR-056-CON-3), no registry contact in any step
(FR-061-CON-1/AC-7/AC-8), and two zero-target metrics in NFR-023.

The boundary with the neighbours is drawn deliberately in most places. FR-059
records the GAP-011 dependency and refuses to decide it — "This requirement
SHALL record the dependency and SHALL NOT decide it" — and §2.2 repeats the
allocation to issue #9; US-011's Notes leaves the same question open. The
TypeScript and Python backends are excluded by name and share no generated code.
The issue #25 testing programme is excluded and FR-062 covers only this
backend's own branches. The one `conformance/` write is not an exception this
ticket invented: `conformance/adapters/registry.json` states in its own header
that "Supplying the command and an adapter-result emitter is the owning issue's
obligation, not issue #20's".

**FR-059 and NFR-016 can both hold.** NFR-016 binds one change set, not a
standing exclusivity claim over `conformance/`: its statement is "The issue #20
change set SHALL change no prototype, compiler source, …", its permitted list is
issue #20's own, and its gate in `test/conformance-corpus.test.ts` resolves both
ends of its range from `CHANGE_SENTINELS` through `changeRange`, so issue #21's
paths fall outside it entirely. The residual risk is prose, not mechanism:
NFR-016's Verification still says "Diff the branch against `main`" and
NFR-016-AC-1/AC-2 still say "The branch changes no file under … `/src/`" and
"byte-identical to `main`", which read on this branch would flag `crates/**` and
`src/compiler/backends/rust-serde/**`. The implemented gate does not, and
NFR-023 cites NFR-016 as upstream without noting the divergence.

Where the boundary does not hold is inside this ticket's own text. FR-059's
Outputs and FR-059-CON-2 claim a second `conformance/` file that NFR-023
prohibits and FR-059-AC-12 denies; the licence value the spec commits to
disagrees with the published `rust` target contract it may not edit; the
third-party half of the ticket's Licence clause is allocated to no requirement;
and GAP-002 is owned by this issue in a register this issue is forbidden to
write. NFR-023's permitted list is the right shape but is not total over the
paths the plan will need.

## Findings

| ID | Severity | Summary | Refs |
|---|---|---|---|
| FND-978 | high | Three statements about the `conformance/` write set cannot all hold. FR-059 Outputs names "`conformance/divergences.json` entries only where a divergence is genuinely required", and FR-059-CON-2 says the requirement "SHALL change exactly one file under `conformance/`: the `rust-backend` entry of `adapters/registry.json`, plus `divergences.json` only where a divergence is genuinely registered" — itself a contradiction ("exactly one file … plus"). NFR-023 Scope prohibits "every path under `conformance/` except `conformance/adapters/registry.json`", NFR-023-AC-3 requires "Every file under `conformance/` except `adapters/registry.json` is byte-unchanged", and FR-059-AC-12 asserts "The changed-path set under `conformance/` for this branch is exactly `adapters/registry.json`". Either the divergence register is writable here and NFR-023/AC-12 are wrong, or it is not and FR-059 has an output it cannot produce and a divergence path it cannot take. Nothing allocates the write to another ticket either. | FR-059 Outputs, FR-059-CON-2, FR-059-AC-12, NFR-023 Scope, NFR-023-AC-3 |
| FND-979 | high | The licence value this ticket commits to disagrees with the published contract it is generating against, on a path it may not edit. FR-056 requires `Cargo.toml` to "declare `license = \"AGPL-3.0-only\"`", FR-056-CON-4 requires the crate to "declare `AGPL-3.0-only` with no carve-out", and NFR-023-AC-7 measures "Every added package manifest declares `AGPL-3.0-only`". The published `rust` row of `fixtures/semantic/v1/positive/target-contracts.json` — which FR-054 Inputs cites as the row that "fixes the native API surface" — carries `"customSourceLicense": "AGPL-3.0-or-later"`, and `test/semantic-contract.test.ts:663` asserts that value. `fixtures/**` is on NFR-023's prohibited list, so this ticket can neither reconcile the two nor record the discrepancy where the contract lives. No requirement names the conflict, and no §2.2 entry allocates the `customSourceLicense` field to issue #9 or issue #34 for repair. | FR-056 Crate manifest, FR-056-CON-4, NFR-023-AC-7, NFR-023 Scope, `fixtures/semantic/v1/positive/target-contracts.json` rust row |
| FND-980 | high | Half of the ticket's Licence clause is allocated to no requirement. The clause requires original and generated source to be AGPL-3.0-only *and* third-party dependencies to be "license-compatible, pinned, reviewed, and attributed; their upstream licenses are preserved". Pinning is covered for one crate (FR-056 `serde` at an exact `=` version; FR-054-CON-4; NFR-022's "Runtime dependencies of a generated crate other than `serde`" metric). Compatibility review, attribution, and upstream-licence preservation are covered nowhere: no requirement names a NOTICE or third-party-licence artifact, no acceptance criterion inspects an upstream licence, and NFR-023-AC-7 reaches only *added* package manifests, not the licences of what they depend on. The gap is widest for development dependencies, which no requirement bounds at all although FR-057-CON-3 needs "an ECMA-262 engine", FR-062 needs a property generator and a mutation harness, and FR-059-AC-11 needs a fuzzer — none of these are runtime deps, so FR-054-CON-4 and NFR-022's metric do not see them. | issue #21 Licence, FR-054-CON-4, FR-056 Crate manifest, NFR-022 Measurement, NFR-023-AC-7 |
| FND-981 | high | This issue owns GAP-002 in a register it is forbidden to write, and no requirement says how the gap is closed. `conformance/contract-gaps.json` records GAP-002 with `"owningIssue": "agent-ix/filament-core-data#21"` and `"status": "open"`, and its artifact is `schema/semantic/v1/common.schema.json`. FR-057 resolves the gap operationally with a proved validator and FR-059 states it "SHALL be answered by the proved validator … not by a registered divergence". But `schema/**` is prohibited, so the pattern cannot be repaired here; `conformance/**` other than the registry is prohibited, so the gap row cannot be moved off `open` here; and FR-059-AC-14 requires the *GAP-011* dependency to be "recorded in the divergence or gap register", both of which are prohibited paths. §2.2 has no entry saying that repairing the published `sourceLocus.path` pattern is out of scope or naming who owns the repair, so the record leaves GAP-002 permanently open against an issue that will close. | `conformance/contract-gaps.json` GAP-002, FR-057 Inputs, FR-059 Divergence and dependency, FR-059-AC-14, NFR-023 Scope, spec.md §2.2 |
| FND-982 | medium | NFR-023's permitted list is not total over the paths this work needs, and NFR-023-AC-1 ("Every path in this change's own set is permitted and none is prohibited") fails for a path that is neither. Unallocated: `test/changed-paths.ts`, which NFR-023's own Verification mandates using and which this ticket's gate may need to extend; the sibling gates' cumulative allow-lists in `test/*.test.ts` other than `test/rust-backend*.ts`, which NFR-016 explicitly permits for its own ticket and NFR-023 does not mention; `.github/**`, although NFR-022's operational context names "an offline CI runner"; a vendor directory or `.cargo/config.toml` for the "vendored or cached dependency set" of FR-061-CON-1; a repository-root `rustfmt.toml` for the hand-written `crates/**`, where only the *emitted* one is named; and the request's `outputRoot` itself, which FR-056 leaves entirely to the caller while FR-056-CON-5 only forbids writing outside it. | NFR-023 Scope, NFR-023-AC-1, NFR-023 Verification, NFR-016 Scope, FR-056 Outputs, FR-061-CON-1 |
| FND-983 | medium | `package.json` is prohibited while two acceptance criteria route through `make lint`. FR-058-AC-10 requires the published code table to be checked "by a `--check` mode that `make lint` runs" and FR-062-CON-4 requires the register and catalogue to be "generated and `--check`ed by `make lint`". NFR-023 prohibits `package.json` outright. NFR-016 met the same problem and stated its resolution in the requirement — "the Make targets call `node` directly rather than adding a script" — NFR-023 states nothing, so the wiring is an unallocated decision the plan will have to invent against a prohibited path. | FR-058-AC-10, FR-062-CON-4, NFR-023 Scope, NFR-016 Scope |
| FND-984 | medium | Two wire-form decisions are taken unilaterally in a backend requirement. FR-054 decides "A `union` SHALL be externally tagged. The IR declares no discriminator member, so a `tag`/`content` pair would be a name this backend invented", and maps the kernel scalar `bytes` to `Vec<u8>`, whose JSON encoding under serde is a decision no artifact in the repository states — `bytes` appears in `semantic-ir.schema.json` and nowhere in `contracts-v1.md`. The JSON representation of a semantic value belongs to the representation and wire projections (FR-023, issue #24) and its cross-language agreement to the issue #7 gate; both are the ground the TypeScript and Python backends will have to match. FR-054 records neither as a dependency, no §2.2 entry mentions representation or wire form for this ticket, and issue #24 is named nowhere in the bundle. This is deciding, not recording — the opposite of the discipline FR-059 applies to GAP-011. | FR-054 Structural kinds, FR-054 kernel scalar table, FR-023, NFR-009, issue #24, issue #7 |
| FND-985 | medium | The corpus threshold row for this backend is `proposed` and nobody can accept it. `conformance/thresholds.json` states that "Every row is `proposed` until that issue accepts it: issue #20 measures and proposes, it does not impose a gate on another ticket", and the `rust-backend` row proposes `permittedDivergences: 1` with the rationale "One divergence is permitted for the RE2 locus-pattern gap recorded as GAP-002". FR-059 declines that divergence, answering GAP-002 with a proved validator instead, so the row's budget is unused and its rationale is stale. `conformance/thresholds.json` is prohibited, FR-059's Inputs cite the row without accepting or correcting it, and no requirement or §2.2 entry says who moves the row from `proposed` to accepted or where this ticket's acceptance is recorded. | `conformance/thresholds.json` rust-backend row, FR-059 Inputs, FR-059 Divergence and dependency, NFR-023 Scope |
| FND-986 | medium | The changed-path gate is the right shape but the range is specified one step short of what issue #20 measured. NFR-023 takes the fixed-at-both-ends form, names `--no-renames` ("passing `--no-renames` to every `git diff` so a move cannot hide a deletion"), uses the shared helper ("with `changeRange` from `test/changed-paths.ts`") rather than a private copy, and therefore cannot empty on a squash merge — it is immune to the four degradations in `test/changed-paths.ts` and NFR-021's Rationale. What it does not address is the fifth, which `test/conformance-corpus.test.ts` documents and works around: `changedPathsOf`'s tree diff over `base..tip` "annexes the trunk — measured here at 456 paths, 74 of them the trunk's, against a true change set of 182" on a branch that merged `origin/main`. NFR-023 says only "Confirm every path in that range", never the `--first-parent --no-merges` union that corpus gate uses, and NFR-023-AC-10 rehearses only a later change landing *on top*, not a trunk merge *inside* the range. NFR-023 also never names its sentinel artifacts, although its Scope depends on "sentinel artifacts this change creates" and `changeRange` collapses to a single commit when only one sentinel resolves. | NFR-023 Scope, NFR-023 Verification, NFR-023-AC-9, NFR-023-AC-10, `test/changed-paths.ts`, `test/conformance-corpus.test.ts` `corpusChangedPaths` |
| FND-987 | medium | NFR-023-AC-11 is not checkable and names no checker. It reads "The permitted-path list is not widened to absorb accretion: the list this branch lands equals the list it opened with, or every addition is justified in the update log by a named requirement rather than by a failing gate", verified by "Inspection". The first disjunct has no pinned baseline — the opening list exists only in the history of NFR-023 itself, which sits on the permitted `spec/**` path and can be amended on the same branch that widens it, and no artifact records the list as it opened. The second disjunct is satisfied by the branch author writing a justification in `spec/log.md`, also a permitted path, about their own widening; "by a named requirement rather than by a failing gate" is a statement about motive, which no inspection can distinguish. Every other criterion in NFR-023 is Analysis or Test against a measurable quantity; this one is the only self-attested row, and it is the row guarding the list every other row is measured against. | NFR-023-AC-11, NFR-023 Scope, spec/log.md |
| FND-988 | medium | Three interfaces with the outside world are used but not bounded. (1) The `rustfmt` binary: FR-060-AC-3 runs `rustfmt --check` over every generated crate and the emitted source must be its fixed point, but FR-060's Inputs pin only "the pinned `rustfmt.toml`" — no requirement pins the rustfmt version, although a formatter upgrade moves the fixed point and breaks the FR-060-AC-4 goldens while NFR-022's determinism target reads 0. (2) The cargo registry and the crates.io index: NFR-022 assumes "an offline workstation and an offline CI runner, both with the pinned Rust toolchain and a warm cargo cache" and FR-061-CON-1 says builds run "offline against the vendored or cached dependency set", but no requirement says which of vendored or cached, where the vendored tree lives (see FND-982), or what populates `Cargo.lock` the first time. (3) `cargo package` in FR-061 is the one step that reaches packaging machinery; it is bounded by FR-061-CON-1 and AC-8 but no requirement forbids a `--registry` or dry-run publish invocation by name. | FR-060 Inputs, FR-060-AC-3, NFR-022 Scope, FR-061 Install from artifact, FR-061-CON-1 |
| FND-989 | medium | The publication gate covers emitted manifests and not the hand-written ones. FR-056-CON-3 ("The emitted `Cargo.toml` SHALL carry `publish = false`, and no code path SHALL emit a manifest without it") and NFR-023-AC-5 ("Every *emitted* crate manifest carries `publish = false`") both quantify over generated output. This ticket also adds four hand-written crates — `crates/semantic-ir/`, `crates/conformance-adapter/`, `crates/consumer-compile-time/`, `crates/consumer-runtime/` — plus a root workspace `Cargo.toml`, all on the permitted list and none required to carry `publish = false`. `crates/semantic-ir/` is precisely the crate a future publication would reach first, and it is the one the safety gate does not name. NFR-023's "Crates published by this work" metric measures the outcome; nothing structurally prevents it for these four. | FR-056-CON-3, NFR-023-AC-5, NFR-023 Measurement, FR-059 Outputs, FR-061 Outputs, issue #21 Safety gate |
| FND-990 | low | Two statements about the blast radius of GAP-011 disagree. FR-059 says "if issue #9 settles it the other way, the adapter's rule and the corpus's cases move together" — a change confined to the adapter and the corpus. FR-054's `reference` row, however, already fixes the generated form as "`pub struct N(SemanticIdentity);` newtype over the validated identity, not over the target's Rust type", which makes generation insensitive to how #9 settles the question, and US-011's Notes poses the open question as whether "a backend emit a type for it". The mapping table answers that question in the negative while FR-059 describes the answer as pending. Neither is wrong on its own; no requirement says whether a #9 resolution can reach FR-054's row. | FR-054 Structural kinds, FR-059 Divergence and dependency, US-011 Notes, GAP-011 |

## Boundary Allocation

| Concern | Owner | Class |
|---|---|---|
| Rust-consumer outcome: the generated crate is the contract (US-011) | filament-core-data issue #21 | core |
| IR-to-Rust/Serde total mapping table and its published document (FR-054) | filament-core-data issue #21 (wire forms, see FND-984) | core |
| Identifier derivation, reserved words, collisions, wire renames (FR-055) | filament-core-data issue #21 | core |
| Crate emission, static export surface, provenance, output manifest (FR-056) | filament-core-data issue #21 | core |
| Constraint enforcement, the ECMA-262 decision procedure, proved validators (FR-057) | filament-core-data issue #21 (GAP-002 record unallocated, FND-981) | core |
| Closed `agent-ix.rust-backend.*` diagnostic registry and refusal (FR-058) | filament-core-data issue #21 | cross-cutting |
| `rust-backend` adapter, independent Rust reader, corpus agreement (FR-059) | filament-core-data issue #21 (divergence register unallocated, FND-978) | core |
| Determinism, rustfmt fixed point, MSRV and platform matrix (FR-060) | filament-core-data issue #21 | cross-cutting |
| Compile-time and runtime consumers, install-from-artifact (FR-061) | filament-core-data issue #21 | infrastructure |
| Branch register, property tests, mutation catalogue (FR-062) | filament-core-data issue #21 | cross-cutting |
| Hermeticity and byte determinism of generation (NFR-022) | filament-core-data issue #21 | cross-cutting |
| Path gate, publication gate, revert rehearsal, licence gate (NFR-023) | filament-core-data issue #21 (range shape, FND-986; AC-11, FND-987) | cross-cutting |
| Third-party licence compatibility, review, and attribution | unallocated (see FND-980) | cross-cutting |
| `conformance/adapters/registry.json` `rust-backend` command and status | filament-core-data issue #21, by the registry's own ownership statement | infrastructure |
| Corpus cases, bases, oracle, coverage, defects, divergences, thresholds, gaps | filament-core-data issue #20, read-only here | external to this ticket |
| Semantic IR node shapes, `schema/**`, `fixtures/semantic/**` | filament-core-data issues #9 and #34, read-only here | external to this ticket |
| GAP-011 reference-target resolution rule, GAP-003/004/006/007 | filament-core-data issue #9 | external to this ticket |
| Compiler core, frontend, IR reader, lock and fingerprint (FR-045..052) | filament-core-data issue #19, read-only here | external to this ticket |
| Frozen prototype Rust emitter `src/compiler/backends/rust.mjs` and issue #4 goldens | filament-core-data issue #27, frozen here | external to this ticket |
| TypeScript and Python generation backends | filament-core-data issues #22 and #23 | external to this ticket |
| Representation and wire projection backends | filament-core-data issue #24 (named nowhere in the bundle, FND-984) | external to this ticket |
| Cross-language payload parity and the migration gate | filament-core-data issue #7 | external to this ticket |
| Crate publication, registry naming, published export surface | filament-core-data issue #11 | external to this ticket |
| Ecosystem property, fuzz, mutation, and adversarial programme | filament-core-data issue #25 | external to this ticket |
| Retained-evidence host floor | filament-core-data issue #42 | external to this ticket |
| Clause text parsing and typechecking | `agent-ix/quire-contract-ir#52` | external |
| Rust toolchain, `rustfmt`, cargo, crates.io | Upstream Rust project | external |

## External Dependencies

| Dependency | Type | Assumed or Guaranteed | Contract |
|---|---|---|---|
| `serde` with `derive`, exact `=` version | Sole runtime crate dependency | Guaranteed | FR-054-CON-4, FR-056-AC-2/AC-14, NFR-022 manifest-inspection metric |
| Rust toolchain at the declared MSRV and edition | Pinned host toolchain | Guaranteed | FR-060 support matrix, FR-060-AC-7, `rust-toolchain.toml` on the permitted list |
| `rustfmt` binary | External formatter defining the emitted fixed point | Assumed (see FND-988) | FR-060-AC-3; `rustfmt.toml` is pinned, the binary version is not |
| cargo registry / crates.io index | Dependency resolution and lock population | Assumed (see FND-988) | NFR-022 "warm cargo cache" context; FR-061-CON-1 offline build; no requirement names the population step |
| `cargo package` / packaging machinery | Artifact production, not publication | Guaranteed | FR-061 Install from artifact, FR-061-CON-1, FR-061-AC-7/AC-8, FR-056-CON-3 |
| Network | Denied throughout | Guaranteed | NFR-022 offline-run metric, FR-059-CON-4, FR-061-AC-7, NFR-022-AC-4 |
| An ECMA-262 regular-expression engine | Oracle for the proved-validator differential harness | Assumed (see FND-980) | FR-057-CON-3, FR-057-AC-5/AC-6; the engine is not named and is not licence-accounted |
| `schema/semantic/v1/*.schema.json` and `common.schema.json` | Published contract, read-only | Guaranteed | FR-054 Inputs, FR-057 Inputs, NFR-023-AC-4 byte-unchanged |
| `docs/semantic-data-system/contracts-v1.md` | The reader's only other derivation source | Guaranteed | FR-059-CON-1 independence constraint, FR-059-AC-7 module-graph scan |
| `fixtures/semantic/v1/positive/target-contracts.json` rust row | Published target contract, read-only | Assumed (see FND-979) | FR-054 Inputs cite it; its `customSourceLicense` contradicts FR-056-CON-4 and cannot be reconciled here |
| `fixtures/semantic/v1/target-verdicts.json` | Published expected verdicts, read-only | Guaranteed | FR-059-AC-10 |
| `conformance/corpus.json`, `bases/`, `cases/` via the FR-039 import API | Independent yardstick, read-only | Guaranteed | FR-059 Inputs, FR-059-AC-1..AC-6, NFR-023-AC-3 byte-unchanged |
| `conformance/oracle/` | The judge; must not be read or transliterated | Guaranteed | FR-059-CON-1, FR-059-AC-7 |
| `conformance/adapters/registry.json` `rust-backend` slot | The one permitted write | Guaranteed | Registry header ownership statement, FR-059 Outputs, NFR-023-AC-3, FR-059-AC-13 |
| `conformance/divergences.json`, `contract-gaps.json`, `thresholds.json` | Registers this ticket must appear in but may not write | Assumed (see FND-978, FND-981, FND-985) | Prohibited by NFR-023 Scope; required by FR-059 Outputs, FR-059-AC-14, and the `proposed` threshold row |
| Issue #20 gate `test/conformance-corpus.test.ts` | Sibling isolation gate over a fixed historical range | Guaranteed | `changeRange(REPO, CHANGE_SENTINELS)`; issue #21's paths fall outside it |
| Issue #19 gate NFR-021 | Sibling isolation gate, fixed at both ends by PR #54 | Guaranteed | NFR-021 Scope; issue #21's paths fall outside it |
| `test/changed-paths.ts` `changeRange` | Shared range helper this ticket's gate must use | Guaranteed | NFR-023 Verification, NFR-023-AC-9 (the file's own path is unallocated, FND-982) |
| Issue #9 GAP-011 resolution | Pending contract decision | Assumed | FR-059 records the dependency and does not decide it; FR-054's mapping is insensitive to it (FND-990) |
| Issues #22, #23, #7 payload parity | Downstream consumers of this backend's wire decisions | Assumed (see FND-984) | No criterion compares this backend's union tagging or `bytes` encoding to a sibling's |
| Downstream Rust consumers `filament-ide-rs`, `quire-rs` | Not moved by this ticket | Guaranteed | spec.md §2.2, NFR-023 "Downstream repositories changed" metric |

The §2.1 delta, the §2.2 stop lines, and NFR-023's path lists agree with the
ticket's safety gate on the question that gate is about: no crate is published,
no consumer moves, no schema or fixture is edited, no corpus artefact but the
adapter slot is written. They disagree with each other on the divergence
register, they leave the third-party half of the Licence clause to nobody, and
they leave a gap this issue owns in a file this issue cannot write. The four
high findings are all inside issue #21's own text; none of them moves work into
or out of the ticket, and FR-059's use of the `rust-backend` slot is exactly the
obligation the corpus declared for it.
