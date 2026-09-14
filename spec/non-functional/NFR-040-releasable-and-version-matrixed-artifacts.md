---
id: NFR-040
title: "Releasable and version-matrixed artifacts"
type: NFR
relationships:
  - target: "ix://agent-ix/filament-core-data/NFR-019"
    type: "depends_on"
---
# NFR-040: Releasable and version-matrixed artifacts

## Statement

The release process SHALL publish only artifacts that identify the source, compiler, IR, backend and schema they were produced from.

The release process SHALL declare a version combination as supported only where that combination has been measured against the conformance corpus.

## Scope

- Applies to: the compiler, the semantic IR, each generation backend, and each
  generated package, which version independently and are consumed independently.
- Applies to: the declared support matrix over source format, compiler version,
  IR contract version, backend version, runtime language version and generated
  package version.
- Out of scope: where artifacts are published. Nothing here publishes to any
  public registry, and release remains manual — that policy is settled elsewhere
  and this requirement does not reopen it.
- Out of scope: the decision to release at all, which is a human go/no-go.

## Rationale

This requirement answers [filament-core-data#26](https://github.com/agent-ix/filament-core-data/issues/26).

Four things version independently here and are consumed independently: the
compiler, the IR contract, each backend, and each generated package. A consumer
holds some combination of them, and today nothing states which combinations are
supported — so every combination is either implicitly supported, which no
evidence backs, or implicitly unsupported, which would make the artifacts
unusable. Neither is a position this repository has taken deliberately.

A generated package that does not carry its own provenance cannot be diagnosed
after the fact. When a consumer reports that a type is wrong, the first question
is which compiler, which IR version and which backend produced it; an artifact
that cannot answer turns a bounded investigation into an unbounded one. The
generated crates already carry source, package, manifest and lock digests for
exactly this reason — this requirement generalises the property rather than
inventing it.

"Supported" is only meaningful if it is measured. A matrix that lists
combinations nobody ran is a claim, and the conformance corpus is the thing that
turns it into evidence. So the matrix is derived from what was measured rather
than asserted alongside it, which also means a combination cannot quietly remain
listed after it stops passing.

Rollback is included because a release process that cannot be reversed is one
that has to be right first time. Rehearsing it matters more than documenting it:
a procedure nobody has executed is an assumption.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|--------|--------|-----------|--------|
| Published artifacts identifying source, compiler, IR, backend and schema | all | all | Inspection |
| Declared supported combinations measured against the conformance corpus | all | all | Test |
| Supported combinations listed but unmeasured | 0 | 0 | Analysis |
| Rehearsed rollback procedures | 1 | 1 | Demonstration |
| Artifacts published to a public registry | 0 | 0 | Inspection |
| Release workflows with a trigger other than manual dispatch | 0 | 0 | Inspection |

## Verification

Read each published artifact and confirm it names the source identity and
digest, the compiler version, the IR contract version, the backend identity and
version, and the schema fingerprint it was produced against. Confirm the support
matrix names only combinations for which a corpus run exists, and that removing
a combination's evidence removes it from the matrix rather than leaving it
listed.

Rehearse a rollback: publish, roll back, and confirm the previously published
compatible artifacts remain retrievable — a rollback that removes them is a
withdrawal, which is a different operation with different consequences.

Confirm by inspection that no workflow publishes to a public registry and that
every release workflow is manually dispatched.

## Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| NFR-040-AC-1 | Every published artifact identifies its source, compiler, IR, backend and schema fingerprints | Inspection |
| NFR-040-AC-2 | Every combination the version matrix declares carries a conformance corpus run, and removing a combination's run removes its row | Test |
| NFR-040-AC-3 | Two builds of one artifact from one source produce identical bytes, so a published artifact can be reproduced rather than trusted | Test |
| NFR-040-AC-4 | A rollback is rehearsed, and previously published compatible artifacts remain retrievable afterwards | Demonstration |
| NFR-040-AC-5 | No artifact is published to any public registry, and every release workflow is manually dispatched | Inspection |
| NFR-040-AC-6 | An install-from-artifact consumer exists for each generated language and builds against the published artifact rather than the working tree | Test |
| NFR-040-AC-7 | The first supported version and its downstream canaries are named by a recorded human decision, not derived | Inspection |

## Dependencies

- **Upstream**: [NFR-019](./NFR-019-deterministic-contract-compilation.md), without which "reproduce the artifact" is not a well-defined operation
- **Downstream**: the downstream migration gate, which cannot name a first supported version before the matrix says which versions are supported
