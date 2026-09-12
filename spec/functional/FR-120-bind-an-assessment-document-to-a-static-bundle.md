---
id: FR-120
title: "Bind an assessment document to a static bundle"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-017"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-117"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-119"
    type: "depends_on"
---
# FR-120: Bind an assessment document to a static bundle

## Description

The producer SHALL name, on every assessment document it emits, exactly one
admitted static bundle by that bundle's identity and its canonical digest
selection together, so that no assessment document re-admits, widens, or
rewrites a static selection.

## Inputs

- The assessment document emitted under
  [FR-119](./FR-119-emit-assessment-document-selections.md), with its identity,
  its namespaced revision, and its canonical digest selection.
- The admitted static bundle of
  [FR-117](./FR-117-admit-a-static-producer-bundle.md), with the identity and
  the canonical digest selection under which it was admitted.
- The object, type, relationship, component, and endpoint identities that the
  named static bundle exports.
- The correspondence exports the assessment document declares, including any
  export whose kind is the assessment kind `population`.

## Outputs

- One static-bundle binding on every assessment document, naming exactly one
  admitted static bundle by its identity and its canonical digest selection.
- A blocking refusal naming the stale static selection, the unadmitted static
  bundle, or the foreign identity, when the binding cannot be made.
- A blocking refusal naming static admission as the missing input when an
  assessment document is offered in place of a static admission.

## Behavior

- The producer SHALL name on every assessment document exactly one admitted
  static bundle.
- The producer SHALL name that static bundle by its identity and its canonical
  digest selection together.
- The producer SHALL NOT name a static bundle by its identity alone.
- If a named static bundle's canonical digest selection does not match the
  canonical digest selection of the admitted bundle bearing that identity, then
  the producer SHALL refuse the assessment document as a stale static selection.
- If an assessment document names a static bundle that was never admitted, then
  the producer SHALL refuse the assessment document, naming the unadmitted
  static bundle.
- If an assessment document names an object, type, relationship, component, or
  endpoint identity that the named static bundle does not export, then the
  producer SHALL refuse the assessment document, naming the foreign identity.
- The producer SHALL resolve every object, type, relationship, component, and
  endpoint identity an assessment document names from the exports of the named
  static bundle alone.
- The producer SHALL NOT resolve an identity absent from the named static
  bundle's exports from another bundle, from an inventory entry, or from any
  other source.
- The producer SHALL emit a new assessment document when its static selection
  changes.
- The producer SHALL NOT edit an existing assessment document to carry a changed
  static selection.
- The producer SHALL NOT re-admit, widen, or rewrite a static selection through
  an assessment document.
- The producer SHALL keep the static-bundle binding one-directional, naming no
  assessment document on a static bundle.
- The producer SHALL NOT require any assessment document in order to admit a
  static bundle.
- If an assessment document is offered in place of a static admission, then the
  producer SHALL refuse it, naming static admission as the missing input.
- The producer SHALL admit, on an assessment document, a correspondence export
  whose kind is the assessment kind `population`, which FR-117 refuses inside a
  static bundle.
- The producer SHALL name, on every admitted `population`-kind correspondence
  export, the assessment document that owns it.
- The producer SHALL emit each static-binding refusal as a blocking input
  refusal.
- The producer SHALL NOT emit a static-binding refusal as a warning, a cache
  miss, or an invitation to refetch a different bundle.
- The producer SHALL NOT present an assessment document's static binding as
  campaign acceptance of any assessment claim.

## Constraints

| ID | Constraint | Type | Validation |
| --- | --- | --- | --- |
| FR-120-CON-1 | The producer SHALL carry on every assessment document exactly one static-bundle binding whose named bundle identity and canonical digest selection are separate typed members. | Integrity | Compile |
| FR-120-CON-2 | The producer SHALL complete a static admission with no assessment document present, so that no assessment document is a prerequisite of recognition, resolution, or type/profile admission. | Integrity | Test |
| FR-120-CON-3 | The producer SHALL keep the static-bundle binding one-directional, exposing on the static bundle type no member that names an assessment document. | Interface | Compile |
| FR-120-CON-4 | The producer SHALL keep the FR-117 refusal of a `population`-kind correspondence export inside a static bundle distinct from this requirement's admission of that export kind on an assessment document, which names its owning document. | Traceability | Inspection |
| FR-120-CON-5 | The producer SHALL treat a changed static selection as requiring a new assessment document rather than an edit of an existing one. | Integrity | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
| --- | --- | --- |
| FR-120-AC-1 | An assessment document naming exactly one admitted static bundle by its identity and its admitted canonical digest selection binds, and every object, type, relationship, component, and endpoint identity it names resolves from that bundle's exports. | Test |
| FR-120-AC-2 | An assessment document whose named static bundle carries a canonical digest selection differing from the admitted bundle's is refused as a stale static selection. | Test |
| FR-120-AC-3 | An assessment document naming a static bundle that was never admitted is refused, and the refusal names the unadmitted static bundle. | Test |
| FR-120-AC-4 | An assessment document naming an object, type, relationship, component, or endpoint identity that the named static bundle does not export is refused, and that identity is not resolved from any other source. | Test |
| FR-120-AC-5 | An assessment document offered in place of a static admission is refused, and the refusal names static admission as the missing input. | Test |
| FR-120-AC-6 | A changed static selection yields a new assessment document, and no existing assessment document is edited to carry it. | Test |
| FR-120-AC-7 | A correspondence export of the assessment kind `population` is admitted on an assessment document and names its owning assessment document, while the same export kind inside a static bundle remains refused under FR-117-AC-7. | Test |
| FR-120-AC-8 | An admitted static bundle names no assessment document and exposes no member that could, and a static admission completes with no assessment document present. | Compile |

## Dependencies

- [FR-117](./FR-117-admit-a-static-producer-bundle.md) defines the admitted
  static bundle this requirement names, the identity and canonical digest
  selection under which it was admitted, and the nine static member classes
  whose exports an assessment document resolves against; it owns the refusal of
  a `population`-kind correspondence export inside that bundle, which this
  requirement admits on an assessment document instead.
- [FR-119](./FR-119-emit-assessment-document-selections.md) defines the
  assessment document interface members — identity, namespaced revision,
  canonical digest selection, and authorizing configuration selection — that
  this requirement binds to one static bundle.
- The consumer wire contract this requirement maps onto is an assumed external
  contract that this increment maps onto rather than owns:
  `ix://agent-ix/quire-spec-language`, file `src/protocol_artifact/wire.rs`,
  pinned at revision `72507f856457ba0922719bd5d9f5cadcce4058cd`, whose
  `Export { kind, path, locus }` carries the closed `ExportKind` vocabulary
  including the assessment kind `population`, and whose
  `BindingRequirement { name, kind, authority, contract, ... }` names its static
  authority separately from the later assessment input it requires.
- Consumer boundary, recorded as context and not as a requirement of this
  bundle: the consumer completes recognition, resolution, and type/profile
  admission from the admitted static bundle alone, reads an assessment
  document's static binding directly from that binding's members, and treats a
  `population` export kind as carrying no authority beyond its named owner.
- [Baseline 1.2 contract](../../docs/semantic-data-system/baseline-1-2.md) is
  the authoritative producer contract for the static/assessment binding
  partition.
