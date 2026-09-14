---
id: FR-138
title: "Emit the SysML v2 textual target"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-019"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-063"
    type: "depends_on"
---
# FR-138: Emit the SysML v2 textual target

## Description

This requirement answers
[filament-core-data#37](https://github.com/agent-ix/filament-core-data/issues/37).

The generation seam SHALL carry a `sysml-v2-textual` target that emits SysML v2
textual notation from a semantic IR document, one top-level `package` per
emitted file.

The target SHALL be a one-way projection: no SysML artifact is read back as a
source of semantics by this repository.

SysML v2 is an interchange notation for model-based systems engineering tools,
not an authority. The distinction is load-bearing rather than editorial. SysML
v2 constrains user expressions with KerML rather than OCL, carries no temporal
operators, and states no operation pre- and post-condition form, so a clause the
semantic IR expresses has no faithful SysML equivalent in the general case. If
the projection were treated as a second authority, the two would disagree and
the disagreement would be settled by whichever artifact a reader happened to
open. The bounded IR profile therefore owns the semantics and this target owns
only the notation.

What cannot be expressed is declared, not dropped. A construct with no mapping
produces a diagnostic carrying its source locus, so a consumer reading the
emitted package knows the projection is partial and knows exactly where.

## Inputs

- A semantic IR document the seam has accepted
- The target profile naming the SysML v2 language revision the emission targets

## Outputs

- One `.sysml` file per emitted package, each carrying exactly one top-level
  `package`
- The emitted-set artifacts ADR-0007 requires of every target
- A diagnostic per construct the projection cannot carry

## Behavior

- The target SHALL be reachable through the generation seam, and SHALL NOT be
  delivered only by a private command line.
- The target SHALL map each IR type kind to a declared SysML v2 construct, and
  it SHALL state that mapping in one place rather than derive it per call site.
- Where a node has no mapping, the target SHALL emit a diagnostic naming the
  construct and its source locus, and it SHALL NOT emit a file that omits the
  node silently.
- The target SHALL produce byte-identical output for two runs over one input.
- The target SHALL declare its round trip as one-way.
- The target SHALL NOT read a `.sysml` file as an input to any other requirement
  in this repository.

## Emitted set (ADR-0007)

| Concept | Where it lands |
|---------|----------------|
| Types | One top-level `package` per emitted `.sysml` file, its members minted from the IR type kinds |
| Validation | The pinned SysML v2 pilot validator, run as a gate rather than emitted as code — the notation carries no runtime |
| Diagnostics | The seam's refusal set, plus one unsupported-construct code per unmappable node |
| Semantic identity | The declared element short name, carrying the semantic identity the IR assigned |
| Provenance | A package-level `doc` comment carrying source identity, source digest, contract version and generator identity |

## Constraints

| ID | Constraint | Type | Validation |
|----|------------|------|------------|
| FR-138-CON-1 | The emission SHALL be deterministic and independent of host locale, time zone and working directory | Design | Test |
| FR-138-CON-2 | No emitted SysML artifact SHALL be an input to any requirement in this repository | Design | Inspection |
| FR-138-CON-3 | The pinned validator SHALL run in a gate only, and SHALL NOT become a runtime dependency of any shipped package | Interface | Inspection |

## Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| FR-138-AC-1 | The seam registers the target implemented, and a request for it over an accepted document returns a non-empty file set with zero blocking diagnostics | Test |
| FR-138-AC-2 | Every emitted file carries exactly one top-level `package` | Test |
| FR-138-AC-3 | The pinned pilot validator accepts every emitted package of the kernel and of one domain bundle | Test |
| FR-138-AC-4 | Two runs over one input produce byte-identical output | Test |
| FR-138-AC-5 | Every IR node either maps to a named SysML construct or produces a diagnostic carrying its source locus | Test |
| FR-138-AC-6 | A node with no mapping produces a diagnostic and the file that would have carried it is not written silently truncated | Test |
| FR-138-AC-7 | The target declares its round trip as one-way, and no module of this repository reads a `.sysml` file | Analysis |

## Dependencies

- **Upstream**: [FR-063](./FR-063-declare-the-generation-backend-seam.md), the seam this target registers in
- **Upstream**: [FR-032](./FR-032-define-the-kernel-scalar-library.md), whose scalars the projection maps to library types
- **Downstream**: the representation and packaging work, which carries emitted packages to interchange tools
