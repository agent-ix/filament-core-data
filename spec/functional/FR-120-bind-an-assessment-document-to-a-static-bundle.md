---
id: FR-120
title: "Bind an assessment document to a static bundle"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-017"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-109"
    type: "depends_on"
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
rewrites a static selection. The producer SHALL carry on that assessment
document the same configuration selection the bound static bundle carries. The
producer SHALL admit on that assessment document exactly the assessment member
of the consumer's closed export-kind vocabulary, whose static-versus-assessment
partition this requirement owns.

## Inputs

- The assessment document emitted under
  [FR-119](./FR-119-emit-assessment-document-selections.md), with its identity,
  its namespaced revision, and its canonical digest selection.
- The admitted static bundle of
  [FR-117](./FR-117-admit-a-static-producer-bundle.md), with the identity and
  the canonical digest selection under which it was admitted.
- The component, endpoint, and relationship export records the named static
  bundle declares, which are the export records the static half actually carries.
- The exported type identities of the model the named static bundle selects,
  which are the type vocabulary an object identity and a type identity resolve
  against.
- The assessment document's own configuration selection and the configuration
  selection the named static bundle carries, each named by its configuration
  identity, its namespaced revision, and its canonical digest selection, and each
  carrying the `resourceLimits` member that
  [FR-109](./FR-109-declare-ecosystem-configuration-contracts.md) declares.
- The correspondence exports the assessment document declares, each carrying one
  member of the consumer's closed export-kind vocabulary.

## Outputs

- One static-bundle binding on every assessment document, naming exactly one
  admitted static bundle by its identity and its canonical digest selection.
- A blocking refusal naming the stale static selection, the unadmitted static
  bundle, the foreign identity and the vocabulary it was resolved against, the
  static-side export kind offered on an assessment document, or both
  configuration selections of a mismatched pair, when the binding cannot be made.
- No static-bundle binding at all when the binding is refused.

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
- The producer SHALL resolve every component, endpoint, and relationship identity
  an assessment document names from the export records of the named static bundle
  alone.
- The producer SHALL resolve every object identity and every type identity an
  assessment document names from the exported type identities of the model that
  named static bundle selects, and from no other vocabulary.
- If an assessment document names a component, endpoint, or relationship
  identity that the named static bundle's export records do not carry, then the
  producer SHALL refuse the assessment document, naming that foreign identity
  and its export kind.
- If an assessment document names an object identity or a type identity that the
  named static bundle's selected model does not export, then the producer SHALL
  refuse the assessment document, naming that foreign identity and the exported
  type vocabulary it was resolved against.
- The producer SHALL NOT resolve an identity absent from those exports from
  another bundle, from an inventory entry, or from any other source.
- The producer SHALL carry on every assessment document the configuration
  selection that the bound static bundle carries.
- If an assessment document's configuration selection is not equal to the bound
  static bundle's configuration selection, then the producer SHALL refuse the
  assessment document, naming both configuration selections.
- The producer SHALL read every bound governing a bound pair from that one
  reconciled configuration selection's `resourceLimits` member, with
  `numericResourceLimit` inside it, which FR-109 owns and declares.
- The producer SHALL NOT carry a second spelling of that configuration member on
  either side of a bound pair.
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
- The producer SHALL leave the refusal of an assessment input offered at static
  admission to FR-117, which owns it, adding no second refusal of that input
  here.
- The producer SHALL partition the consumer's closed export-kind vocabulary into
  the one assessment member `population` and, at the pinned revision below, its
  remaining eleven static members, owning that partition for both halves.
- The producer SHALL admit, on an assessment document, a correspondence export
  whose kind is the assessment member `population`, which FR-117 refuses inside a
  static bundle.
- If an assessment document declares a correspondence export whose kind is a
  static member of that vocabulary, then the producer SHALL refuse the assessment
  document, naming that export kind.
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
| FR-120-CON-4 | The producer SHALL own the static-versus-assessment partition of the consumer's closed export-kind vocabulary for both halves, admitting its one assessment member on an assessment document and leaving the refusal of that member inside a static bundle to FR-117. | Traceability | Inspection |
| FR-120-CON-5 | The producer SHALL treat a changed static selection as requiring a new assessment document rather than an edit of an existing one. | Integrity | Test |
| FR-120-CON-6 | The producer SHALL carry one configuration selection across a bound assessment document and static bundle pair, refusing a mismatched pair rather than governing the pair by two selections. | Integrity | Test |
| FR-120-CON-7 | The producer SHALL spell the reconciled configuration's limit member `resourceLimits`, with `numericResourceLimit` inside it, in every requirement of this interface that reads it, taking the declaration from FR-109 and adding no second spelling. | Traceability | Inspection |
| FR-120-CON-8 | The producer SHALL resolve a component, endpoint, or relationship identity against the bound bundle's export records and an object or type identity against the bound bundle's selected model's exported type identities, resolving neither against a record class the static half does not declare. | Interface | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
| --- | --- | --- |
| FR-120-AC-1 | An assessment document naming exactly one admitted static bundle by its identity and its admitted canonical digest selection binds, every component, endpoint, and relationship identity it names resolves from that bundle's export records, and every object and type identity it names resolves from that bundle's selected model's exported type identities. | Test |
| FR-120-AC-2 | An assessment document whose named static bundle carries a canonical digest selection differing from the admitted bundle's is refused as a stale static selection. | Test |
| FR-120-AC-3 | An assessment document naming a static bundle that was never admitted is refused, and the refusal names the unadmitted static bundle. | Test |
| FR-120-AC-4 | An assessment document naming a component, endpoint, or relationship identity absent from the bound bundle's export records is refused naming that identity and its export kind, an assessment document naming an object or type identity absent from that bundle's selected model's exported type identities is refused naming that identity and the type vocabulary, and neither identity is resolved from any other source. | Test |
| FR-120-AC-5 | An assessment document offered where a static admission is expected is refused under FR-117-AC-3, which owns that refusal, and this requirement states no second refusal for that input. | Inspection |
| FR-120-AC-6 | A changed static selection yields a new assessment document, and no existing assessment document is edited to carry it. | Test |
| FR-120-AC-7 | A correspondence export of the assessment kind `population` is admitted on an assessment document and names its owning assessment document, while the same export kind inside a static bundle remains refused under FR-117-AC-7. | Test |
| FR-120-AC-8 | An admitted static bundle names no assessment document and exposes no member that could, and a static admission completes with no assessment document present. | Compile |
| FR-120-AC-9 | An assessment document whose configuration selection differs from the bound static bundle's is refused, and the refusal names both configuration selections. | Test |
| FR-120-AC-10 | An assessment document declaring a correspondence export whose kind is a static member of the consumer's closed export-kind vocabulary is refused, and the refusal names that export kind. | Test |

## Dependencies

- [FR-117](./FR-117-admit-a-static-producer-bundle.md) defines the admitted
  static bundle this requirement names, the identity and canonical digest
  selection under which it was admitted, and the static member classes whose
  export records and selected model an assessment document resolves against; it
  owns the refusal of a `population`-kind correspondence export inside that
  bundle and, under FR-117-AC-3, the refusal of an assessment input offered at
  static admission, neither of which this requirement refuses a second time.
- [FR-119](./FR-119-emit-assessment-document-selections.md) defines the
  assessment document interface members — identity, namespaced revision,
  canonical digest selection, and authorizing configuration selection — that
  this requirement binds to one static bundle.
- [FR-109](./FR-109-declare-ecosystem-configuration-contracts.md) declares the
  configuration document, its identity, and its `resourceLimits` member with
  `numericResourceLimit` inside it, which this requirement reconciles across a
  bound pair and does not redeclare.
- The consumer wire contract this requirement maps onto is an assumed external
  contract that this increment maps onto rather than owns:
  `ix://agent-ix/quire-spec-language`, file `src/protocol_artifact/wire.rs`,
  pinned at revision `72507f856457ba0922719bd5d9f5cadcce4058cd`, whose
  `Export { kind, path, locus }` carries the closed `ExportKind` vocabulary this
  requirement partitions — its one assessment member `population` and, at that
  revision, its remaining eleven static members — and whose
  `BindingRequirement { name, kind, type, authority, contract, model, subject,
  anchor, scope, relation, requires, locus }` names its static authority
  separately from the later assessment input it requires.
- Consumer boundary, recorded as context and not as a requirement of this
  bundle: the consumer completes recognition, resolution, and type/profile
  admission from the admitted static bundle alone, reads an assessment
  document's static binding directly from that binding's members, and treats a
  `population` export kind as carrying no authority beyond its named owner.
- [Baseline 1.2 contract](../../docs/semantic-data-system/baseline-1-2.md) is
  the authoritative producer contract for the static/assessment binding
  partition.
