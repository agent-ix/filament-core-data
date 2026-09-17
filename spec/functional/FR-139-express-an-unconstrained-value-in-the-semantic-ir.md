---
id: FR-139
title: "Express an unconstrained value in the semantic IR"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-006"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-032"
    type: "depends_on"
---
# FR-139: Express an unconstrained value in the semantic IR

## Description

This requirement answers the unconstrained-value half of
[filament-core-data#78](https://github.com/agent-ix/filament-core-data/issues/78)
and of [#93](https://github.com/agent-ix/filament-core-data/issues/93). The
presence half of both is answered by
[FR-106](./FR-106-author-field-presence-independently.md); the two halves are
independent, so each is stated and verified on its own.

The semantic IR SHALL carry a declaration for a value whose shape the source
contract deliberately leaves open, distinctly from a record with no fields.

A kernel grammar declares a default value whose shape "is decided by the target
scalar". That grammar means *any JSON value*: a default of `3`, `"draft"`,
`true`, `null`, or `[1, 2]` is expressible in the source. A zero-field record
with an open unknown policy means *any JSON object*, so the IR carries the
unconstrained value as the kernel scalar `any` and never as that record.

The revision is additive within one schema file. A 1.1 document remains a valid
1.2 document, and a 1.2 document carrying the new declaration is refused by a
1.1 reader with a named diagnostic rather than being silently read as the
record it is not.

## Inputs

- A source declaration whose value shape the contract leaves open
- The contract version the reader declares support for

## Outputs

- An IR declaration denoting an unconstrained value, distinct from a zero-field
  record
- A named refusal where a reader does not support the revision that introduced it

## Behavior

- The IR SHALL admit a declaration denoting a value of unconstrained shape.
- The IR SHALL keep that declaration distinct from a record declaring no fields,
  in the emitted document and in every generated package.
- The revision introducing it SHALL be additive: a document valid under the
  prior contract version SHALL remain valid under the revised one.
- A reader supporting only the prior version SHALL refuse a document carrying
  the new declaration, with the diagnostic the register already publishes for a
  node of a later revision.
- A backend that cannot carry an unconstrained value in its target language SHALL
  record a named loss rather than emit the narrowed record.
- The contract document SHALL state which of the two readings is normative, so a
  consumer reads the answer rather than inferring it from an emitter.

## Constraints

| ID | Constraint | Type | Validation |
|----|------------|------|------------|
| FR-139-CON-1 | An unconstrained value and a zero-field record SHALL NOT compare equal at any layer | Correctness | Test |
| FR-139-CON-2 | The revision SHALL change no byte of a document valid under the prior version | Compatibility | Test |
| FR-139-CON-3 | A backend SHALL NOT substitute the narrowed record for an unconstrained value without a recorded loss | Integrity | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| FR-139-AC-1 | A default of a number, string, boolean, null and array each round-trips through the IR without narrowing | Test |
| FR-139-AC-2 | An unconstrained value and a zero-field record produce distinct IR documents and distinct generated declarations | Test |
| FR-139-AC-3 | Every document valid under the prior contract version validates unchanged under the revised one | Test |
| FR-139-AC-4 | A prior-version reader refuses a document carrying the new declaration with the published later-revision diagnostic, and never accepts it as a record | Test |
| FR-139-AC-5 | A backend unable to carry the declaration records a named loss naming the construct and its locus | Test |
| FR-139-AC-6 | The contract document states the normative reading, and no emitter is the only place it can be found | Inspection |

## Dependencies

- **Upstream**: [FR-032](./FR-032-define-the-kernel-scalar-library.md), which declares the kernel scalars this revision extends
- **Upstream**: [FR-106](./FR-106-author-field-presence-independently.md), the presence half of the same revision
- **Downstream**: [FR-081](./FR-081-declare-the-semantic-kernel-bundle.md), whose declared-loss register closes when this lands
