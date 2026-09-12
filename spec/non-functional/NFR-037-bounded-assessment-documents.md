---
id: NFR-037
title: "Bounded assessment documents"
type: NFR
quality_attribute: security
relationships:
  - target: "ix://agent-ix/filament-core-data/FR-119"
    type: "constrains"
  - target: "ix://agent-ix/filament-core-data/FR-121"
    type: "constrains"
---
# NFR-037: Bounded assessment documents

## Statement

The producer SHALL refuse a hostile or oversized assessment document with a
blocking refusal naming the exceeded bound, within the resource limits the
configuration document declares, rather than exhausting memory, recursing
without limit, or taking unbounded time.

The producer SHALL take every bound it enforces from the configuration
document's declared resource limits rather than from a host-chosen value, so
that the refusal decision for one assessment document is identical on every
architecture of the set
[NFR-036](./NFR-036-byte-exact-producer-output.md) names.

## Scope

- Applies to: the parse, admission, and membership-validation path for every
  assessment document the producer reads — the population document, its finite
  `members` set, its field-member states, and its relationship-instance endpoint
  identities — and the blocking refusal that path emits when a declared bound is
  exceeded.
- Does not apply to: the semantic correctness of an admitted assessment
  document, which is the obligation of
  [FR-121](../functional/FR-121-emit-finite-population-membership-records.md)
  and the requirements it cites; the canonical byte and digest agreement of an
  admitted document, which is NFR-036; and the static bundle's own admission,
  which reads no assessment input at all
  ([FR-117](../functional/FR-117-admit-a-static-producer-bundle.md)).
- Operational context: an offline run over a fixed assessment document set with
  every bound — document byte bound, nesting-depth bound, member-count bound —
  supplied explicitly by the configuration document's declared `resourceLimits`
  ([FR-109](../functional/FR-109-declare-ecosystem-configuration-contracts.md)),
  no environment variable, working directory, wall clock, or network read
  contributing to any bound.
- Named architecture set: the set NFR-036 names —
  `x86_64-unknown-linux-gnu` and `aarch64-unknown-linux-gnu` — over which the
  refusal-decision agreement below is measured.

## Rationale

An assessment document is untrusted input. A population document is authored
outside this repository, arrives as bytes, and is read before anything about it
has been validated; its author is not this producer's author. A document with a
hundred thousand members, a member graph nested ten thousand deep, or a single
member carrying a hundred megabytes of field-member state must fail at a stated
bound naming that bound, never by allocating until the host kills the process
and never by running until an operator gives up. A process the host kills
reports nothing at all, which is the worst possible refusal: it is
indistinguishable from a crash, from a timeout, and from a correct rejection,
so no consumer can tell a hostile document from a broken producer.

The bounds are configuration data for the same reason NFR-036 makes FR-118's
`numericResourceLimit` a declared configuration member rather than a host
value. A host-chosen bound makes the admitted document set a property of the
machine that read it: one architecture admits a document a second refuses, and
both report success. Byte agreement would then be measured over two different
document sets, so the refusal decision has to be measured beside the bytes
rather than assumed from them. FR-109 already requires the configuration to
declare finite resource limits and already makes a changed limit value a
different configuration identity; this requirement is the measurement of that
declaration holding, not a second declaration of it.

Depth is the axis a byte bound does not cover. A document well inside its byte
bound can still carry a member structure deep enough to exhaust the stack of a
recursive reader, which fails as a stack overflow rather than as a refusal. It
is therefore bounded and measured on its own axis, and the refusal it produces
is the same blocking, named refusal every other bound produces — not a warning,
not a cache miss, and not an invitation to resubmit.

Peak memory is stated as a multiple of input size rather than as an absolute
number because it is the only form of the claim that survives a changed bound.
An absolute budget becomes false the moment the configuration declares a larger
document byte bound; a multiple stays true and stays checkable, and it is what
distinguishes a reader that streams a bounded document from one that expands it
several times over before deciding to refuse it.

The bound the refusal names and the bound the code enforces are measured against
each other. A refusal naming a number the code does not enforce is worse than no
refusal, because it tells a consumer the document was too large by a margin that
never applied. The shipped producer already carries one such bound as a crate
constant — `MAX_PRODUCER_DOCUMENT_BYTES` in `crates/baseline-producer/src/lib.rs`,
refusing with `DOCUMENT_RESOURCE_LIMIT` — which is exactly the drift this
requirement measures: a constant in the source is a host-independent bound but
it is not the configuration's declared bound, so the two can disagree silently.

A gate whose apparatus does not exist is not a passing gate. Fuzzing needs a
corpus and a runner; a peak-memory measurement needs a harness that caps and
reports; a cross-architecture refusal comparison needs a second architecture's
runner. Each of those is apparatus rather than producer behaviour, so each is
owned by Plan-017, and a gate whose apparatus Plan-017 has not yet provided
fails reporting that it did not run.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|---|---|---|---|
| Assessment documents exceeding the configuration's declared document byte bound that are refused with a blocking refusal naming that bound, as a percentage of the declared oversized-document population — one document per bound-crossing case, sized one byte past the declared bound (unit: documents) | 100% | 100% | One-past-the-bound probe per case, asserting the refusal and the bound it names (`negative-abuse-testing`) |
| Assessment documents exceeding the configuration's declared nesting-depth bound that are refused with a blocking refusal naming that bound, rather than overflowing a stack or aborting the process, as a percentage of the declared over-deep-document population — one document per nesting axis, nested one level past the declared bound (unit: documents) | 100% | 100% | One-past-the-bound depth probe per nesting axis, asserting a returned refusal and no abnormal termination (`negative-abuse-testing`) |
| Assessment documents exceeding the configuration's declared member-count bound that are refused with a blocking refusal naming that bound, as a percentage of the declared over-populated-document population — one document per counted member class, carrying one member past the declared bound (unit: documents) | 100% | 100% | One-past-the-bound member-count probe per counted member class, asserting the refusal and the bound it names (`negative-abuse-testing`) |
| Peak resident memory reached while refusing or admitting one assessment document, as a multiple of that document's input byte size, measured over the bounded-input probe set at and one past each declared bound (unit: multiples of input size) | < 4x | 4x | Instrumented probe run under a resident-memory cap that reports the measured peak (`performance-benchmarking`) |
| Wall time to reach the refusal decision for one assessment document at or one past a declared bound, measured over the bounded-input probe set (unit: seconds per document) | < 5 s | 5 s | Instrumented probe run under a wall-time cap that reports the measured time (`performance-benchmarking`) |
| Refusal decisions that agree across the architecture set NFR-036 names, under one configuration document's declared resource limits, as a percentage of the bounded-input probe set's documents (unit: refusal decisions) | 100% | 100% | Per-architecture refusal comparison against one committed decision golden, run on `x86_64-unknown-linux-gnu` and on `aarch64-unknown-linux-gnu` (`golden-approval-testing`) |
| Enforced bounds whose value differs from the configuration document's declared resource limit for that bound, counted over the declared bound population — the document byte bound, the nesting-depth bound, and each counted member-class bound (unit: bounds) | 0 | 0 | Test reading the configuration's declared limit and the value the refusal names, comparing both against the value enforced (`contract-testing`) |
| Bounds enforced from a host-chosen value — a crate constant, an environment variable, a working directory, a wall clock, or a network read — rather than from the configuration document, counted over the same declared bound population with no exemption, since the Statement excludes them outright (unit: bounds) | 0 | 0 | Static analysis of the assessment-document read path, with a planted host-derived bound on a scratch copy as the control that the scan fails (`sast`) |
| Abnormal terminations — a panic, a stack overflow, an allocation abort, or a hang past the declared wall-time cap — over the generated assessment-document corpus (unit: terminations) | 0 | 0 | Fuzzing of the assessment-document parse and admission surface under a failing panic hook and the declared memory and time caps (`fuzzing`) |
| Structurally valid but hostile assessment documents reaching the admission path that return a result or a named refusal rather than terminating abnormally, as a percentage of the grammar-generated corpus (unit: documents) | 100% | 100% | Grammar-based fuzzing from the assessment-document shape, so generated documents reach past the parser into admission (`grammar-based-fuzzing`) |

## Verification

Read one assessment document at each declared bound and one past it — the
document byte bound, the nesting-depth bound, and each counted member-class
bound — and confirm each over-bound document returns exactly one blocking
refusal naming that bound, that the number the refusal names equals the
configuration document's declared limit and equals the value enforced, and that
no probe terminates abnormally; run the whole probe set under a resident-memory
cap and a wall-time cap, recording the measured peak as a multiple of input size
and the measured time per document rather than asserting a pass alone; repeat
the probe set on each architecture of the set NFR-036 names —
`x86_64-unknown-linux-gnu` and `aarch64-unknown-linux-gnu` — under one
configuration document and compare the refusal decisions against one committed
decision golden; audit the assessment-document read path for every bound taken
from a crate constant, an environment variable, a working directory, a wall
clock, or a network read, confirm the audit reports no hit rather than excusing
one, and confirm it fails on a scratch copy carrying a planted host-derived
bound; and fuzz the parse and admission surface, both from raw bytes and from
the assessment-document grammar, under a failing panic hook and the declared
memory and time caps. Every gate reports the number it measured, and a gate
that cannot run fails saying so rather than passing.

The apparatus these gates need is not producer behaviour and is owned by
Plan-017: the bounded-input probe set and its configuration documents, the fuzz
corpus, the fuzz runner and its panic hook, the resident-memory and wall-time
instrumentation, the committed refusal-decision golden, the second architecture
of the named set and the runner that provides it, and the planted host-derived
bound control. Where Plan-017 has not yet provided one of them, the gate
depending on it fails reporting that it did not run.

## Dependencies

- **Upstream**: [FR-119](../functional/FR-119-emit-assessment-document-selections.md) defines the assessment document selections whose reading these bounds hold; [FR-121](../functional/FR-121-emit-finite-population-membership-records.md) defines the finite `members` set, field-member states, and relationship-instance endpoint identities the member-count and nesting-depth bounds are counted over; [FR-109](../functional/FR-109-declare-ecosystem-configuration-contracts.md) declares the finite resource limits these bounds are read from and makes a changed limit a distinct configuration identity
- **Downstream**: none — no artifact in this repository depends on this requirement; its own declared edges `constrains` FR-119 and FR-121
- **Sibling constraint**: [NFR-036](./NFR-036-byte-exact-producer-output.md) names the architecture set over which the refusal-decision agreement above is measured and holds the admitted document's bytes byte-exact; this requirement holds the admit-versus-refuse decision identical, and the two together are why byte agreement is measured over one document set rather than two
- **Apparatus owner**: Plan-017 owns the bounded-input probe set, the fuzz corpus and runner, the memory and time instrumentation, the committed refusal-decision golden, the second architecture of the named set, and the planted host-derived-bound control; a gate whose apparatus is missing fails reporting that it did not run
- **Assumed external contract, not owned here**: the consumer contract at `ix://agent-ix/quire-spec-language`, file `src/protocol_artifact/wire.rs`, pinned at revision `72507f856457ba0922719bd5d9f5cadcce4058cd`, whose records the assessment documents these bounds govern are read into; this increment maps onto that contract rather than owning it, and the consumer's own input bounds are that repository's obligation
- [Baseline 1.2 contract](../../docs/semantic-data-system/baseline-1-2.md) is the authoritative producer contract for the population, snapshot, and window documents these bounds govern and for the configuration document's declared resource limits
