---
id: NFR-042
title: "One entry point runs every language's gates"
type: NFR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-009"
    type: "traces_to"
  - target: "ix://agent-ix/filament-core-data/NFR-038"
    type: "depends_on"
---
# NFR-042: One entry point runs every language's gates

## Statement

Every automated gate this repository declares SHALL run from one named command,
whichever language it is written in, and that command SHALL be the one the
dispatchable lane invokes.

## Scope

- Applies to: the TypeScript suites, the Python suites, the Rust suites, and the
  harness scripts each drives.
- Applies to: the decision about which events start a run, which SHALL be
  recorded rather than left as the absence of a trigger.
- Out of scope: adding an event trigger. The `workflow_dispatch`-only policy is
  settled elsewhere and this requirement does not reopen it.
- Out of scope: publication. No gate here publishes to any registry.

## Rationale

This requirement answers [filament-core-data#66](https://github.com/agent-ix/filament-core-data/issues/66).

A hundred and thirty-one Python assertions ran in no entry point. They were
written so a defect could not hide behind a single runtime — a second reader of
the corpus and a second reader of the IR revision — and then executed only when
someone remembered to type the command by hand. A gate no entry point runs is a
gate in name only, and the failure is invisible to the verification standard
this repository uses: a branch, its post-merge state, and its post-merge state
with a sibling are all green when nothing runs the assertions in any of them.

That is the specific shape worth naming. An absent gate does not report absence.
It reports success, in the same green the presence of the gate would produce,
which is why this went unnoticed across two tickets that each added assertions
believing the other half ran them.

The second half is the trigger decision. Manual dispatch is a deliberate house
pattern here, because runners cannot install the packages that live only on the
local registry and an event-triggered run would fail at install on every push,
teaching everyone to ignore a red pipeline. That reasoning is sound and is
nowhere written down, so the current state reads as an oversight. Recording it
costs a paragraph and stops the next reader from fixing what is not broken.

## Measurement and Evaluation

| Metric | Target | Threshold | Method |
|--------|--------|-----------|--------|
| Declared gates reachable from the named command | all | all | Inspection |
| Languages whose suites the named command runs | all declared | all declared | Inspection |
| Gates the dispatchable lane runs that the named command does not | 0 | 0 | Inspection |
| Deliberately broken assertions, per language, that fail the named command | all | all | Test |
| Event triggers added to any workflow | 0 | 0 | Inspection |
| Trigger decisions recorded in a readable place | 1 | 1 | Inspection |

## Verification

Break one assertion in each language in turn and observe the named command
fails each time, reporting the language and the failing case. This is a
falsification rather than an assertion: a command that runs a suite and a
command that merely names it are indistinguishable while everything passes.

Read the lane and observe it invokes the named command rather than a per
language subset, and that its trigger set is unchanged. Read the recorded
decision and observe it states why dispatch is manual, rather than the absence
of a trigger being the only evidence.

Remove a language's toolchain and observe the command fails naming the missing
toolchain, and never skips.

## Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| NFR-042-AC-1 | One named command runs every declared gate in every language | Inspection |
| NFR-042-AC-2 | The dispatchable lane invokes that command and runs no gate outside it | Inspection |
| NFR-042-AC-3 | A deliberately broken assertion in each language fails that command, demonstrated per language | Test |
| NFR-042-AC-4 | A missing toolchain fails the command naming the toolchain, and never skips | Test |
| NFR-042-AC-5 | The trigger decision and its reasoning are recorded, and no workflow gains an event trigger | Inspection |
| NFR-042-AC-6 | No gate is reachable only through a target named for another language | Inspection |

## Dependencies

- **Upstream**: [NFR-038](./NFR-038-runnable-rust-gates-on-two-platforms.md), which puts the Rust gates in the lane this command covers
- **Downstream**: every bundle whose evidence is a suite run, which becomes measurable once one command runs all of them
