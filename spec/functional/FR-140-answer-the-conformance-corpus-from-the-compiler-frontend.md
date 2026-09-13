---
id: FR-140
title: "Answer the conformance corpus from the compiler frontend"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-008"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-037"
    type: "depends_on"
---
# FR-140: Answer the conformance corpus from the compiler frontend

## Description

This requirement answers
[filament-core-data#52](https://github.com/agent-ix/filament-core-data/issues/52).

The conformance corpus's compiler-frontend slot SHALL carry a command that
answers every corpus case, and the differential harness SHALL judge the compiler
against the independent oracle rather than against another implementation.

The corpus was authored independently of the compiler, deliberately, and neither
ticket wired them together. The consequence is stated rather than softened:
every adapter slot reads unavailable, the harness records only unmet rows, and
the corpus has never judged anything. A green harness over an unavailable slot
is the empty-population case the standing evidence rule names, so wiring the
slot is what converts the corpus from a description into a gate.

The first run is already known to produce a divergence, and that divergence is
not an implementation defect. The compiler emits a document its own inspector
accepts and the oracle rejects, because the published contract states a
resolution rule for relationship targets and states none for a reference kind's
target. Both readings are defensible, which is precisely a contract gap. The
gap is settled before the slot is wired, because a divergence with no assignable
verdict trains its readers to disposition the next one by convenience.

## Inputs

- The corpus cases and the independent oracle's verdicts
- The compiler under test, invoked through its published command line
- The registered contract-gap set, including the unresolved reference-target rule

## Outputs

- One adapter result document per corpus case
- A disposition for every divergence, each carrying an owner and a review date
- The coverage account for the slot

## Behavior

- The slot SHALL carry a command and SHALL report available only when that
  command answers every case.
- The harness SHALL compare each result against the oracle's verdict and SHALL
  NOT compare it against another adapter's.
- The harness SHALL disposition every divergence as an implementation defect, a
  corpus defect, or a contract gap, each with a named owner and a review date.
- The contract SHALL settle the reference-target resolution gap before the slot
  reports available.
- Where settling the gap moves the corpus, the corpus version SHALL take a major
  increment.
- No change SHALL edit the corpus's expected results or the compiler to make the
  other pass without a recorded verdict.
- The remaining slots SHALL stay unavailable, each naming its owning issue.

## Constraints

| ID | Constraint | Type | Validation |
|----|------------|------|------------|
| FR-140-CON-1 | The adapter SHALL share no module with the oracle | Design | Analysis |
| FR-140-CON-2 | An unavailable slot SHALL count as no passes rather than as no cases | Integrity | Test |
| FR-140-CON-3 | A corpus expectation SHALL NOT change without a recorded verdict and a corpus version increment | Integrity | Inspection |

## Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| FR-140-AC-1 | The compiler-frontend slot reports available and answers every corpus case | Test |
| FR-140-AC-2 | The slot's unmet count reaches zero, and the other slots stay unavailable naming their owning issues | Test |
| FR-140-AC-3 | Every divergence carries a disposition, an owner and a review date | Inspection |
| FR-140-AC-4 | The reference-target resolution rule is recorded in the contract before the slot reports available | Inspection |
| FR-140-AC-5 | A corpus expectation changed by that ruling moves with a major corpus version increment | Test |
| FR-140-AC-6 | The adapter imports no module of the oracle, and the oracle imports no module of the compiler | Analysis |
| FR-140-AC-7 | With the adapter command removed, the slot reports unavailable and no case is counted as passing | Test |

## Dependencies

- **Upstream**: [FR-037](./FR-037-run-the-differential-conformance-harness.md), the harness this slot answers
- **Upstream**: [FR-052](./FR-052-provide-the-compiler-command-line.md), the published command the adapter invokes
- **Downstream**: [FR-090](./FR-090-prove-cross-language-agreement.md), whose cross-language claim rests on a corpus that has judged something
