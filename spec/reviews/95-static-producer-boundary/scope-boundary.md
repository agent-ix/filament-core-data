---
id: SR-206
title: "Scope-boundary review of the Producer interface 1.2.0 static boundary"
type: SpecReview
analysis: scope-boundary
scope: "US-016, FR-112..FR-118, NFR-036"
review_set: all
---
# Scope-boundary review

## Summary

Targeted review of the static/assessment split, the consumer boundary, and
per-obligation ownership across the static-boundary increment.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-1760 | medium | The consumer whose shapes this whole increment is defined against is never named as an external dependency. US-016 and FR-112..FR-118 speak of "the consumer's `SelectedDigest`", `Revision`, `ProducerObject`, `Correspondence`, `Export`, closed export vocabulary, and `ForeignLocus`, and FR-112 and FR-113 claim a 1:1 member mapping onto them; those records live in `quire-spec-language` (`src/protocol_artifact/wire.rs:179-243`), which no in-scope artifact names, pins by revision, marks assumed or guaranteed, or covers with a contract test. A "1:1 mapping" with no named, revisioned counterpart cannot be verified, and a consumer-side member change is undetectable here. Name the repository and the pinned wire revision as an upstream dependency of FR-112, FR-113, FR-114, and FR-116, and state whether the shape agreement is assumed or guaranteed by a named contract case. | US-016, FR-112, FR-113, FR-114, FR-116, quire-spec-language wire.rs |
| FND-1761 | medium | Consumer obligations are stated inside producer requirements, so two sides own one obligation and the acceptance criteria are verified through the consumer's code. FR-112 Behavior L46 "The consumer SHALL NOT default an absent `version`"; FR-117 Behavior "A native consumer SHALL complete recognition, resolution, and type/profile admission from the static bundle alone", "A consumer SHALL read every static bundle member it needs directly from that member", "A consumer SHALL NOT parse prose, default a member, or infer a field". FR-112-AC-1 then verifies that each member "arrives at the consumer's `SelectedDigest` without a defaulted member" and FR-117-AC-1 that the bundle "suffices for recognition, resolution, and type/profile admission" — both are observations of the consumer's behavior, not of the producer's output. Keep the producer obligation (always emit `version`; carry every member the consumer's shape requires) and move each consumer `SHALL` to a stated assumption about the consumer, or to the consumer's own spec. FR-109 L35-40 already carries the same idiom; this increment is the first to make it an acceptance criterion. | FR-112, FR-112-AC-1, FR-117, FR-117-AC-1, FR-109 |
| FND-1762 | medium | The inventory-closure and incomplete-inventory obligations are allocated twice, to two different producers. FR-110 Behavior already owns "a missing or conflicting required import SHALL refuse a closed inventory, while an explicitly incomplete inventory SHALL retain `unknown`", with FR-110-CON-1 forbidding a closed inventory from selecting an unlisted component, and FR-110 assigns its labelling duties to "the configuration producer". FR-114 restates both as duties of the static producer ("SHALL refuse admission of a component or endpoint that lies outside a closed declared inventory", "While an inventory declares itself explicitly incomplete, the producer SHALL retain `unknown`") and FR-114-AC-3 verifies them, while the log allocates the "incomplete inventory" adverse axis to FR-114 alone. Name one owner for closure refusal and for the `unknown` retention and have the other reference it. | FR-114, FR-114-AC-3, FR-110, FR-110-CON-1 |
| FND-1763 | medium | The static/assessment split leaks through the export vocabulary, and no side owns the refusal. The consumer's closed `ExportKind` includes `population` (`wire.rs:181`), FR-116 admits any kind "drawn from the consumer's closed export vocabulary" without excluding it, and correspondence records are members of the static bundle (FR-117). FR-117 refuses "an assessment input offered to the static bundle" and names a population in its prohibition list, but that clause is written about bundle inputs, not about an export kind inside a correspondence record FR-116 already admitted. A `population`-kind export therefore reaches a static bundle with FR-116 admitting it and FR-117's refusal aimed elsewhere. Either restrict FR-116's export kinds to the static subset (`relationship`, `component`, `endpoint`, and whichever type kinds are static) or state in FR-117 that an assessment-kind export is one of the assessment inputs it refuses. | FR-116, FR-116-CON-2, FR-117, FR-117-AC-3 |
| FND-1764 | medium | FR-116 makes a producer record's cardinality a function of native knowledge this repository does not own. "The producer SHALL emit exactly one correspondence record for each native clause role that consumes the selected producer model or profile" requires the producer to enumerate the consuming native clause roles; SR-195 recorded that native clause grammar and clause semantics are not this repository's (§2.2 likewise assigns formal clause text to `quire-contract-ir#52`). The consumer's own shape carries one nullable `Correspondence` per `Model` (`wire.rs:237`), not one per clause role, so the cardinality rule is stated against a population nobody here enumerates. Name the side that declares the consuming clause roles and cite it as an input, or restate the cardinality against a producer-side unit (one record per producer object selection) that the producer can count. | FR-116, FR-116-AC-1, SR-195, quire-spec-language wire.rs |
| FND-1765 | medium | Component and endpoint source provenance is required but its supplier is unallocated. FR-114 requires every component and endpoint locus to carry "the source artifact identity and revision, the authored formal document and its revision, and the byte span, mirroring the consumer's `ForeignLocus`" and refuses a record whose locus or formal document revision is absent; the same items appear only as FR-114 Inputs, so no in-scope requirement, and no named external owner, produces them. Located per-document extraction is the neighbouring work: §2.2 places "Modifying Quire parsing, validation, extraction, or byte-splice behavior" out of scope and records that quire-rs exposes no located per-document edge extraction (waiting on `quire-rs#418`), and the #36 review's FND-1433 found the engine's edge carries no line or column at all. As written FR-114's blocking refusals fire on data whose author this spec does not name. State who supplies the locus (an authoring step in this repo, or a named upstream) and whether the span is authored or extracted. | FR-114, FR-114-AC-2, FR-114-CON-4, spec.md §2.2, FND-1433 |
| FND-1766 | low | The scope sections were not moved with the increment. §1's thirteenth-delivery paragraph still describes issue #95 as specifying "the compatibility boundary for v1.1 without changing an existing producer, wire schema, or runtime", while FR-112 and FR-113 replace the producer's three-member digest triple and bare revision strings — the shapes the existing `crates/baseline-producer` emits (`DigestTriple`, committed at `296dc56`) — and NFR-036 constrains that producer's bytes. §2.1 gained no in-scope entry and §2.2 no out-of-scope entry for the static boundary, so the increment's boundary (static half only; the assessment half deferred; the consumer's wire not renegotiated) exists only in the §6 status paragraph and the log. Add the in-scope and out-of-scope entries and reword the §1 sentence to say which producer surface changes. | spec.md §1, spec.md §2.1, spec.md §2.2, FR-112, FR-113, NFR-036 |
| FND-1767 | low | NFR-036's infrastructure obligations have no named owner. The cross-architecture byte comparison, the "committed golden" the varied-environment and cross-architecture runs compare against, the planted-token control for the float audit, and the unprivileged network namespace are all environment and fixture work, not producer behavior; no artifact names the golden's path or the side that provides a second host architecture, and NFR-036 lists no infrastructure dependency. Name the golden artifact and the owner of the second-architecture run, or state that the gate reports unrunnable rather than passing when that architecture is unavailable — which the Verification paragraph already requires in general terms. | NFR-036, NFR-036 Measurement, NFR-036 Verification |
| FND-1768 | low | FR-114 reaches one measurement concept across the split it otherwise holds: "The producer SHALL NOT shrink an incomplete inventory's denominator to exclude an unlisted component or endpoint". A coverage denominator is computed while assessing a population, and the static bundle carries no coverage or assessment member (FR-117, NFR-036 Scope), so the obligation's subject sits on the assessment side while the requirement is a static declaration duty. Restate it as the static duty it can verify — the inventory declaration retains the unlisted member with `unknown` — and leave the denominator rule to the requirement that owns coverage. | FR-114, FR-117-CON-1, NFR-036 |
| FND-1769 | low | Observation, no action. The split holds in the assessment→static direction: FR-117 enumerates and refuses every assessment input class, FR-115 forbids population members and relationship instances in a relationship record, and NFR-036's Scope excludes populations, snapshots, windows, instances, observations, progress records, and observation closures explicitly. The eight adverse axes each land on one FR as the log claims. Two deliberate states are noted rather than reported: no acceptance criterion yet carries a TC reference, which the `spec-matrix` pass allocates; and the owner of the assessment half of the producer interface is recorded only as an open question in US-016 Notes, with no requirement claiming it. | US-016, FR-115-CON-2, FR-117, NFR-036 Scope |

## Verdict

**CONDITIONAL** — the increment is producer-side static contract work and the
assessment→static direction is clean: no requirement in scope mints, requires,
or reads a population, snapshot, window, instance, observation, progress record,
or observation closure. Four allocation defects remain. The consumer repository
whose wire shapes every requirement is written against is never named, pinned,
or marked assumed or guaranteed; four consumer `SHALL` clauses and two
acceptance criteria place obligations and verification on the consumer's side;
inventory closure and `unknown` retention are owned by both FR-110 and FR-114
under two different producers; and the export-kind vocabulary lets an assessment
export kind into a static bundle with the refusal unallocated. Component and
endpoint provenance loci are required with no supplier named on either side of
the boundary.

| Boundary | Allocation |
| --- | --- |
| Producer static emission: digests, revisions, identities, relationships, correspondence, canonical bytes | D / this repository; FR-112..FR-118, NFR-036, `crates/baseline-producer` — core |
| Consumer wire shapes and admission behavior | A / `quire-spec-language`; not renegotiated here, and not named as a dependency (FND-1760) |
| Consumer obligations on defaulting, inference, and prose-free reads | A; currently stated inside FR-112 and FR-117 (FND-1761) |
| Ecosystem inventory closure and incomplete-inventory disposition | FR-110's configuration producer; duplicated onto FR-114's static producer (FND-1762) |
| Component and endpoint source provenance loci and byte spans | Unallocated; the located-extraction neighbour is out of scope per §2.2 (FND-1765) |
| Native clause roles and clause semantics | Not this repository; FR-116's cardinality depends on them (FND-1764) |
| Assessment half: populations, snapshots, windows, observations, availability, progress | Deferred D/F campaign input; out of scope here and claimed by no requirement |
| Canonical-byte goldens, second host architecture, offline namespace | Repository infrastructure; owner unnamed in NFR-036 (FND-1767) |
| Test-case allocation for these acceptance criteria | The `spec-matrix` pass after this review |

## Dispositions

Applied in change record CR-095-1 against the orchestrator's decisions
D1..D24. A finding marked *applied* is closed by the cited decision; one
marked *carried to Plan-017* is an implementation obligation, not a spec
edit; one marked *declined* or *recorded* states why it changes nothing.

| ID | Disposition | Record |
| --- | --- | --- |
| FND-1760 | applied | D19 — `ix://agent-ix/quire-spec-language`, `src/protocol_artifact/wire.rs`, pinned `72507f856457ba0922719bd5d9f5cadcce4058cd`, marked an assumed external contract this increment maps onto rather than owns. |
| FND-1761 | applied | D11 — see FND-1706; FR-112-AC-1 and FR-117-AC-1 no longer verify consumer behavior. |
| FND-1762 | applied | D20 — FR-110 keeps sole ownership of inventory closure and the `unknown` disposition; FR-114 owns only membership and the closed-inventory refusal, and cites FR-110 (FR-114-CON-6). |
| FND-1763 | applied | D21 — FR-117 refuses a static bundle carrying a `population`-kind correspondence export, naming the offending export (AC-7), and FR-116 cites that refusal. |
| FND-1764 | applied | D22 — see FND-1702. |
| FND-1765 | applied | D23 — FR-114's Inputs name the supplier as the producer's own declaration source document with its revision, and the producer refuses a record whose locus is absent rather than synthesizing one (CON-5, AC-5). |
| FND-1766 | applied | D24 — spec.md gains the fourteenth-delivery paragraph, the §2.1 in-scope entry, and four §2.2 out-of-scope entries. |
| FND-1767 | carried to Plan-017 | D24 — see FND-1756. |
| FND-1768 | applied | D20 — the denominator phrasing is deleted from FR-114. |
| FND-1769 | no action | Observation recorded: the assessment-to-static direction is clean and each of the eight axes lands on one FR. |
