---
id: Task-151
title: "Report the static producer boundary to A, as static admission only"
type: Task
status: done
track: E
priority: P1
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-150"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-117"
    type: references
  - target: "ix://agent-ix/filament-core-data/US-016"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-1637"
    type: verifies
---
# Task-151: report the static producer boundary to A, as static admission only

## Scope

Hand A — the native consumer side — the delivered static boundary, and record the
FR-117 presentation claim that the delivery is static admission and nothing more.

The report states the mapping A needs and the boundaries A must not read past. It
does not negotiate the consumer's wire shapes: those are already selected, pinned
at `ix://agent-ix/quire-spec-language`, `src/protocol_artifact/wire.rs`, revision
`72507f856457ba0922719bd5d9f5cadcce4058cd`, and are not open here (FND-1760, D19).

## Subtasks

- [x] **Green: the member-for-member mapping.** Record which producer member
  supplies which consumer member: `DigestSelection` → `SelectedDigest`, `Revision` →
  `Revision`, `SourceLocus` → `ForeignLocus`/`ArtifactRef`/`Formal`/`Span`,
  `ExportRecord` → `Export { kind, path, locus }`, the five authored producer-object
  members → `ProducerObject` minus `interface`, and the admitted bundle's content
  classes → `Model { artifact, profile, exports, correspondence }`.
- [x] **Green: the unassigned indices.** State explicitly that every consumer `u32`
  index — `ProducerObject.interface`, `Correspondence.native`,
  `Correspondence.relation`, `Correspondence.exports`, `Definition.requires` — is
  left unassigned and is A's to assign when it assembles its own package
  (FR-116-CON-5, FND-1805).
- [x] **Green: the two carve-outs.** State that `ArtifactRef.digest` stays one
  raw-byte digest string and `NativeSource.revision` stays an editable native
  authority label; the producer authors neither as a selection and refuses neither
  (FR-112-CON-4, FR-113-CON-4).
- [x] **Green: the measured numbers.** Report what each gate measured, not that it
  passed: the golden document count, the permutation-set size, both architectures,
  the zero float-coercion sites, the zero ambient reads, and the eight adverse axes
  with their one refusal code each.
- [x] **Green: the two pre-existing reds.** Report `tc_1299` and `tc_1310` in
  `crates/extraction-frontend/tests/change_set.rs` as red and **not owned by this
  plan**: they measure the #36 changed-path diff from base `3b75e01` and list this
  increment's paths as unpermitted, and issue #92 retires them. State that no task
  edited them and that they were not added to any permitted-path list.
- [x] **Green: the presentation claim.** `tc_1637_` (`Manual`/`Inspection`,
  FR-117-AC-6 and AC-9): record that every member of an admitted static bundle is
  read without parsing prose, defaulting a member, or inferring a field; and that
  production of the bundle is recorded as **static admission only**, not as campaign
  acceptance of any assessment claim.
- [x] **Green: what A must not expect.** The assessment half — US-017,
  FR-119..FR-126, NFR-037, TC-1657..TC-1699 — is designed and reviewed and **not
  implemented**. A must not read a static admission as evidence of an assessment, and
  must not expect a population, snapshot, window, observation, progress record or
  closure from this interface; those remain later D and F campaign inputs. FR-126's
  `wireSchema` member and its version discipline are likewise not implemented, though
  the bundle does carry the interface version `1.2.0` as an FR-117 header member.
  Two upstream gaps stay open cross-repo items on A's side: a population document has
  no admissible consumer artifact kind (FND-1812) and no consumer vocabulary carries a
  `window` member (FND-1862).
- [x] **Green: the matrix.** Move TC-1600..TC-1656 off `🚧` in `spec/tests.md` as each
  landed, confirm `quire coverage --scope . --json` binds every one of those rows, and
  leave TC-1657..TC-1699 `🚧`.

## Exit conditions

- A has the member-for-member mapping, the unassigned-index list, the two carve-outs
  and the measured numbers.
- TC-1637 is recorded, and the delivery is stated as static admission only.
- Every TC-1600..TC-1656 row is bound under `quire coverage` and moved off `🚧`;
  every TC-1657..TC-1699 row is still `🚧`.
- `make rust-build`, `make rust-test`, `cargo fmt --check` green apart from the two
  pre-existing reds, and the repository's Rust review route
  (`agent-skills:rust-review` via `code-review`) run with its findings dispositioned.

## Deliverables

- The report to A, and its recorded measured numbers
- `spec/tests.md` rows TC-1600..TC-1656 moved off `🚧`
- `plan/Plan-017-producer-interface-1-2-implementation/log.md` closing entry

## Notes

- `Inspection`/`Manual` is the correct method for a presentation claim with no
  executable oracle (FND-1748); it is recorded so a later matrix pass does not
  re-raise it as an untested row.
- This task writes no producer code. If it finds a defect, that defect belongs to the
  task that owns the member, reopened — not to a new task here.
