---
id: Task-147
title: "FR-116 correspondence records and their export mappings"
type: Task
status: todo
track: C
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-146"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-116"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-1623"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1624"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1625"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1626"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1627"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1628"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1629"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-1630"
    type: verifies
---
# Task-147: FR-116 correspondence records and their export mappings

## Scope

Complete `ProducerNativeCorrespondence` so that one selected pair of one producer
object and one native artifact yields exactly one immutable record, carried in the
producer's **own bundle document** rather than in a consumer table entry
(FND-1710), holding: the five authored producer-object members (`kind`,
`authority`, `identity`, namespaced `revision`, canonical `digest` selection), the
native artifact selection, the native definition closure with each entry's
revision and raw-byte digest, the binding-relation identity, the authorizing
configuration provenance, and **one `ExportRecord` per exported component,
endpoint and relationship record**, each carrying the formal export locus the
consumer's export record requires.

The producer authors five producer-object members and **not a sixth**: the
`interface` member is a `u32` index the consumer assigns when it assembles its own
package, and the obligation to author it was withdrawn (FND-1805, FND-1801, E2).
Every other consumer `u32` index — `Correspondence.native`,
`Correspondence.relation`, `Correspondence.exports`, `Definition.requires` — is
likewise left unassigned (FR-116-CON-5).

## Subtasks

- [ ] **Red: shape.** `tests/correspondence.rs`: `tc_1623_` (`Compile`: one
  selected pair yields exactly one correspondence record whose five authored
  producer-object members, native selection, native definition closure,
  binding-relation identity, configuration provenance and export mappings are
  each readable as separate members, and whose producer object carries **no**
  authored interface member — a compile-time control that the type has five
  producer-object members and no sixth), `tc_1629_` (every emitted export mapping
  carries its exporting producer object identity, its `exportKind` from the
  consumer's closed export-kind vocabulary, its ordered `exportPath` segments and
  its formal export locus; the record carries no consumer table index and no
  producer-object interface index; and no export kind FR-120 partitions to the
  assessment side is emitted), `tc_1630_` (`Static`: a producer canonical digest
  selection and a native raw-byte digest selection stay distinct members when
  their hash text coincides, and every consumer `u32` table index including the
  interface index is left unassigned).
- [ ] **Red: export refusals.** `tc_1624_` (an export mapping naming an export its
  named producer object does not export refuses — foreign; one naming an export
  owned by another correspondence's producer object refuses — cross-bound).
- [ ] **Red: staleness and provenance.** `tc_1625_` (changing the producer object
  selection or the native artifact selection while retaining the prior binding
  relation refuses), `tc_1626_` (a presentation-only native re-encoding is admitted
  only through a new native artifact selection and a new correspondence record,
  never through a digest substitution under the retained relation), `tc_1627_` (a
  record submitted without the configuration provenance that authorized its
  relation refuses; one whose required native definition-closure identities are
  incomplete refuses), `tc_1628_` (two correspondence records naming one selected
  pair refuse — **both** of them, per FR-116's Behavior — and a producer object the
  consumer does not select yields no correspondence record).
- [ ] **Green: export record.** `ExportRecord { kind: ExportKind, identity,
  path: Vec<String>, locus: SourceLocus }` with `ExportKind` the subset of the
  consumer's closed vocabulary this producer actually emits — `component`,
  `endpoint`, `relationship`, `object`, `field`, `scalar`, `enum`, `record`,
  `reference`, `operation`, `variant` — cited from the pinned consumer contract and
  never minted here. The `population` kind FR-120 partitions to the assessment side
  is not in the enum at all (FND-1803, FND-1825, E3).
- [ ] **Green: correspondence members.** Add `exports: Vec<ExportRecord>`, both
  sides' `Revision`, per-entry revision and raw-byte digest on each
  `native_definition_closure` entry, `binding_relation_identity` and
  `configuration_identity` as separate members.
- [ ] **Green: refusal codes.** `EXPORT_FOREIGN`, `EXPORT_CROSS_BOUND`,
  `CORRESPONDENCE_STALE_SELECTION`,
  `CORRESPONDENCE_CONFIGURATION_MISMATCH`,
  `CORRESPONDENCE_CLOSURE_INCOMPLETE`, plus the duplicate-pair refusal — each
  blocking, each naming the absent, foreign, duplicated, or stale member.
- [ ] **Falsify.** Assign a `u32` interface index in a scratch copy and prove
  `tc_1630_` fails. Substitute a digest under a retained relation in a scratch
  copy and prove `tc_1626_` fails.

## Exit conditions

- One correspondence record per selected (producer object, native artifact) pair,
  carried in the producer's own bundle document, with one export mapping per
  exported component, endpoint and relationship record.
- Foreign, cross-bound, duplicate-pair, stale-selection, absent-provenance and
  incomplete-closure inputs all refuse blocking, each naming the offending member.
- No consumer `u32` index is assigned anywhere, and matching hash text is never
  presented as evidence of semantic equivalence.
- TC-1623..TC-1630 are traced executable controls.
- `make rust-build`, `make rust-test` and `cargo fmt --check` green apart from
  the two pre-existing reds.

## Deliverables

- `crates/baseline-producer/src/correspondence.rs`, `src/export.rs`
- `crates/baseline-producer/tests/correspondence.rs`

## Notes

- FR-111 owns the circular and unresolved-support control that retains `unknown`
  with its path, and governs termination of the native definition closure this
  record enumerates (FND-1719, FND-1835). Cite it; do not write a second
  termination rule.
- FR-117 owns the refusal of an assessment-kind correspondence export **inside a
  static bundle** (FND-1763, FR-116-AC-9); this task keeps the kind out of the
  enum and Task-148 raises the admission refusal.
- Unblocks: Task-148 (the correspondence records are one of the nine content
  member classes).
