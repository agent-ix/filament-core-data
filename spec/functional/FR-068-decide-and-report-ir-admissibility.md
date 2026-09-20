---
id: FR-068
title: "Decide and report the admissibility of an IR document"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-012"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-063"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-029"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-036"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-024"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-025"
    type: "constrained_by"
---
# [FR-068] Decide and report the admissibility of an IR document

## Description

The TypeScript backend SHALL decide, from the published contract and its own
declared readings, whether a semantic IR document is admissible for generation,
and SHALL report every reason it is not as a stable diagnostic located by a JSON
pointer, so that the backend's answer can be compared with an oracle that never
saw its code.

This is the backend's own reader, and it is deliberately a second implementation
beside `src/compiler/ir/reader.mjs` rather than a call into it. A backend that
asks the compiler whether the compiler's own output is valid produces agreement
and no evidence: the two would fail together on every rule the compiler gets
wrong, and the conformance run would report a pass. The corpus of issue #20 is
an independent yardstick only for as long as the thing it measures was written
independently of it, and the same is true one layer down.

Two decisions are separated here and must not be conflated. *Admissibility* is a
contract-level judgement about the document — the judgement the oracle also
makes, in the vocabulary the corpus registers, and the only one an adapter
answer carries. *Representability* is a target-level judgement about TypeScript
— whether this backend can render an admissible document — and it is carried in
this backend's own diagnostic namespace and never mixed into an admissibility
answer. A document can be admissible and unrepresentable; that is a refusal to
generate, not a claim that the document is invalid.

Independence is claimed here and cannot be proved by an import ban alone. An
import ban is checkable and transcription is not, and
`conformance/diagnostic-codes.json` marks fifteen of its thirty codes
`provenance: "minted"` — spellings the corpus introduced, whose rules no
published clause states. So this requirement asks for two disclosures instead of
one assertion: a per-code derivation ledger saying where each rule was read
from, and a committed first-run divergence count. Neither makes independence
certain. Both make the claim falsifiable, which the import ban on its own does
not.

## Inputs

- A semantic IR document at `contractVersion` `2.0.0`
- The input bundle members that carry package context: `manifest`, `manifestDigest`, `lock`, `profile`, `mappings`, and `consumerPolicy`, each of which `conformance/schema/input-bundle.schema.json` makes optional, so only `ir` is guaranteed present
- `schema/semantic/v1/semantic-ir.schema.json` and `schema/semantic/v1/common.schema.json`
- `conformance/diagnostic-codes.json`, the corpus's closed register of the thirty codes an admissibility answer may carry, read by a test rather than by the backend
- `docs/semantic-data-system/contracts-v1.md`, the prose contract the rules are read from
- The declared limits of `schema/semantic/v1/compiler-request.schema.json#/properties/limits`

## Outputs

- `src/compiler/backends/typescript-v1/admit.mjs`: `admitIr(bundle, { limits, referencePolicy })` returning `{ resultState, diagnostics, suppressions, derivations }`, where each diagnostic is `{ pointer, diagnostic }`, each suppression is `{ rule, reason }`, and `derivations` is the per-code ledger
- `src/compiler/backends/typescript-v1/admit.d.mts` declaring that surface
- `src/compiler/backends/typescript-v1/loss.mjs`: `representability(ir)` returning the declared target losses, and `REFERENCE_POLICY`, the single named GAP-011 policy constant
- `src/compiler/backends/typescript-v1/loss.d.mts` declaring that surface

## Behavior

### The structural layer

- `admitIr` SHALL validate the document against the published `semantic-ir.schema.json` with a JSON Schema 2020-12 implementation.
- Where more than one schema error reports the same instance location, `admitIr` SHALL emit exactly one diagnostic at the deepest failing location rather than one per error.
- `admitIr` SHALL report a schema failure as `agent-ix.semantic-ir.SCHEMA_VIOLATION`.
- If the bundle carries no `ir` object, then `admitIr` SHALL emit one `agent-ix.semantic-ir.INVALID_DOCUMENT` at the pointer `""`.
- If the structural layer emits any diagnostic, then `admitIr` SHALL NOT consult the cross-field rules, so that a structurally invalid document yields one explanation rather than a cascade.

### The cross-field rules

- Where a rule in the table below does not hold of the document, `admitIr` SHALL emit one diagnostic under the code named beside that rule; where a rule holds, `admitIr` SHALL emit nothing for it.

| Rule that must hold | Code reported where it does not |
|---|---|
| A `typeRef` resolves, through aliases, to a declared definition | `UNRESOLVED_TYPE_REF` |
| A `sequence`'s `items` and a `map`'s `values` resolve to a declared definition | `UNRESOLVED_ELEMENT_TYPE` |
| A variant's `payloadType` resolves to a declared definition | `UNRESOLVED_VARIANT_PAYLOAD` |
| An occurrence's `definition` resolves to a declared definition | `UNRESOLVED_OCCURRENCE_DEFINITION` |
| An alias chain revisits no definition already on the chain | `ALIAS_CYCLE` |
| A resolution walk stays within the declared depth bound | `DEPTH_LIMIT_EXCEEDED` |
| Node identities are unique within each list; an extension `identity` is unique per node — within one node's `extensions[]` and within the document-level `extensions[]` — and is never entered into the declaration-identity set, so two definitions each carrying `ix://agent-ix/semantic-core/ext/kernel-scalar` are admissible | `DUPLICATE_IDENTITY` |
| Field names are unique within a record | `DUPLICATE_FIELD_NAME` |
| Operation parameter names are unique within an operation | `DUPLICATE_PARAM` |
| `clauseId` is unique within a type | `DUPLICATE_CLAUSE_ID` |
| An operation's `pre` and `post` name a `clauseId` declared on the same type | `DANGLING_CLAUSE_REF` |
| A source-originated clause carries a `sourceSpan` | `MISSING_SOURCE_SPAN` |
| A constraint keyword applies to the scalar its subject resolves to | `CONSTRAINT_NOT_APPLICABLE` |
| A bound operand is typed and ranged for its resolved scalar | `INVALID_OPERAND` |
| A `pattern` regex compiles under ECMA-262 | `INVALID_PATTERN` |
| A relationship target resolves to a document type or a lock export | `UNRESOLVED_RELATIONSHIP_TARGET` |
| A relationship's `sourceEnd.type`, where present, names the type declaring the relationship | `INVALID_RELATIONSHIP_SOURCE` |
| The graph of `composite: true` relationships is acyclic | `COMPOSITE_CYCLE` |
| `multiplicity.upper`, where present, is not less than `lower` | `INVALID_MULTIPLICITY` |
| `unit` appears only on a field resolving to a `scalar` | `UNIT_ON_NON_SCALAR` |
| Every manifest import resolves to a package the lock carries | `UNRESOLVED_IMPORT` |
| The package import graph is acyclic | `PACKAGE_CYCLE` |
| The lock agrees with the manifest and the source digests it records | `STALE_LOCK` |
| A mapping names a target the published target vocabulary declares | `UNKNOWN_MAPPING_TARGET` |
| A mapping that loses information declares that loss | `UNDECLARED_LOSS` |
| A `required: true` extension names a capability the consumer policy admits | `UNKNOWN_REQUIRED_EXTENSION` |

- `admitIr` SHALL decide the uniqueness of an extension `identity` against a set local to the node that carries the `extensions[]` list, so that two entries of one node's `extensions[]`, or two entries of the document-level `extensions[]`, sharing an `identity` raise `DUPLICATE_IDENTITY` at the second entry's `identity` pointer.
- `admitIr` SHALL NOT enter an extension `identity` into the declaration-identity set it decides `DUPLICATE_IDENTITY` over for `types`, `fields`, `variants`, `operations`, `relationships`, `clauses`, and `occurrences`, because an extension identity names a capability the node carries and not a declaration the document makes; a document whose several definitions each carry `ix://agent-ix/semantic-core/ext/kernel-scalar` is admissible (agent-ix/filament-core-data#88, owner ruling of 2026-09-09).
- Every code in the table SHALL be written with the `agent-ix.semantic-ir.` prefix the register publishes.
- If an alias chain is both cyclic and deeper than the bound, then `admitIr` SHALL report `ALIAS_CYCLE`, because a cycle is the more specific fact and a depth report would hide it.
- `admit.mjs` SHALL declare its own closed code register as an exported frozen object, in the manner of `DIAGNOSTIC_CODES`, and SHALL spell a code nowhere else.
- That register SHALL stand in exact bijection with the `agent-ix.semantic-ir.` codes of `conformance/diagnostic-codes.json`, asserted in both directions by a test rather than by an import, because a module under `src/` that reads the corpus at run time makes the corpus a dependency of the thing it judges.
- `admitIr` SHALL mint no code outside that register.

### Absent inputs and suppression

- Six of the rules above read `manifest`, `lock`, `mappings`, or `consumerPolicy`, and `conformance/schema/input-bundle.schema.json` requires none of them, so a bundle carrying only `ir` cannot decide them.
- Where a rule's declared input is absent from the bundle, `admitIr` SHALL record a suppression naming the rule and the missing input, and SHALL emit no diagnostic for that rule.
- `admitIr` SHALL NOT decide a rule whose input is absent by assuming a value for that input, because a guess that happens to agree is indistinguishable from a decision that was made.
- `admitIr` SHALL NOT drop a suppression silently, so that a rule which never ran is visible rather than being reported as a rule that passed.
- The suppressions channel SHALL be separate from `diagnostics`, so that a suppression contributes nothing to `resultState` and nothing to the adapter's comparison with the oracle.
- This mirrors the `suppressions` channel `src/compiler/ir/reader.mjs` already carries, and the shape is copied deliberately while the implementation is not.

### Severity, locus, and owner

- Every code in this requirement's register SHALL carry severity `error`, and `admitIr` SHALL stamp that severity on every diagnostic it emits.
- `admitIr` SHALL set a diagnostic's `blocking` to `true`, following the severity.
- `admitIr` SHALL set a diagnostic's `locus` to the nearest enclosing node's `origin.source`, or to a clause's `sourceSpan` where the failing node is a clause, in each case only where that node carries one and the value satisfies `common.schema.json#/$defs/sourceLocus`.
- If no enclosing node carries a usable locus, then `admitIr` SHALL emit the diagnostic with no `locus` member.
- Each diagnostic's `owner` SHALL be the nearest enclosing node's `identity`, and the backend's own identity where no ancestor carries one.
- `conformance/diagnostic-codes.json` records a code, a deciding layer, a rule and a citation for each of its thirty codes, and records neither a severity nor a locus-derivation rule; no published contract document states either, and `conformance/corpus.mjs` nonetheless keys a diagnostic comparison on `[pointer, code, severity, locus]`.
- The two rules above SHALL therefore be recorded as this backend's declared reading of an unstated contract, citing `agent-ix/filament-core-data#61`, which records that neither is derivable from any published artifact, rather than presented as a rule the contract states.
- The locus rule SHALL be applied against the published `sourceLocus` shape as it stands, and `agent-ix/filament-core-data#56` — which records that the published path pattern's traversal and absolute-path guards do not apply past a line terminator — SHALL be cited beside it rather than worked around here.

### The result state

- If `admitIr` emits no diagnostic, then it SHALL return `resultState` `success`.
- If `admitIr` emits any diagnostic of severity `error`, then it SHALL return `resultState` `invalid`.
- If `admitIr` emits diagnostics and none has severity `error`, then it SHALL return `resultState` `lossy`.
- Because every registered code carries severity `error`, `admitIr` SHALL return only `success` or `invalid` for the register as it stands, and the `lossy` arm SHALL exist for a code the register may later carry at severity `warning`; the arm is stated so that adding such a code needs no new rule, and it is not dead specification.
- All 111 committed corpus cases expect `success` or `invalid` and none expects `lossy`, which is the observable evidence for the paragraph above rather than a claim about the oracle's code.
- `admitIr` SHALL NOT return `partial`, `unsupported`, or `unavailable`, because the published contract states no rule that assigns them, which `conformance/contract-gaps.json` records as GAP-006.
- A `lossy` admissibility answer SHALL NOT refuse generation; a document whose only diagnostics are non-error is generated from, and the output manifest carries `state: "lossy"` with its files.
- A representability loss SHALL refuse generation, emitting zero files under `state: "unsupported"`, because the committed `typescript` target contract sets `unsupportedFeaturePolicy` to `fail`.

### Diagnostic form and order

- Every emitted diagnostic SHALL validate against `common.schema.json#/$defs/diagnostic`.
- `admitIr` SHALL carry the RFC 6901 pointer beside the diagnostic rather than inside it, because the published diagnostic is sealed against an in-document location, which `conformance/contract-gaps.json` records as GAP-003.
- `admitIr` SHALL order diagnostics by pointer, then code, then message, then canonical form, comparing every one of them by code point.
- `admitIr` SHALL NOT order diagnostics by any locale-sensitive comparison, so that the answer does not move with the host's ICU data.

### The derivation ledger

- `admit.mjs` SHALL export a `derivations` ledger carrying one entry for every code in its register.
- Each ledger entry SHALL record whether the rule behind its code was read from a published contract clause or from the corpus's own register.
- A ledger entry recording a published clause SHALL name the artifact and quote the clause it was read from.
- A ledger entry recording the corpus register SHALL say so plainly, because `conformance/diagnostic-codes.json` marks fifteen of thirty codes `provenance: "minted"` and a rule read from the yardstick is not a rule read from the contract.
- The ledger SHALL be complete over the register, so a code with no entry fails the backend's own contract test.
- The ledger SHALL be data rather than prose, so that a reviewer counts the two provenances instead of reading for them.

### Target representability

- `representability` SHALL report a construct the TypeScript target has no representation for as a declared loss naming the owning type's identity and the construct.
- `representability` SHALL NOT treat an `operation` as declared loss; an operation is rendered as readonly descriptor data by [FR-067](./FR-067-generate-identity-and-fingerprint-metadata.md), which is neither generating behaviour nor degrading the construct.
- `representability` SHALL NOT treat a `clause` as declared loss; a clause is rendered as readonly descriptor data by FR-067, with its text carried opaquely, because the IR itself never parses clause text and `agent-ix/quire-contract-ir#52` owns clause semantics.
- The distinction this requirement draws is between a construct the target cannot *represent* and one the target does not *execute*. An operation and a clause are contract data that the generated package hands a consumer, exactly as a relationship, a role, a unit, an extension and an occurrence are; refusing to generate for them would refuse every real document. This was measured rather than reasoned: with an operation and a clause treated as loss, 66 of the 70 corpus cases the reader admits refuse to generate, which is a target contract no consumer could use.
- `representability` SHALL reserve declared loss for a construct whose omission would make the generated package *silently wrong* — a check the validator would skip, or a value it would substitute — which is what `docs/semantic-data-system/contracts-v1.md` means by never degrading to `any`, a generic map, or an empty model.
- `representability` SHALL treat a `format` constraint whose name this backend implements no check for as declared loss.
- `representability` SHALL NOT treat a `defaultKind` of `representation` or `migration` as declared loss; the field's `defaultKind` and `defaultValue` are rendered as readonly metadata by FR-067 and the generated validator applies only a `semantic` default, which [FR-066](./FR-066-generate-runtime-validators.md) already states.
- `representability` SHALL treat a `min`, `max`, `exclusiveMin`, or `exclusiveMax` constraint whose subject resolves to the `duration` scalar as declared loss, because ISO-8601 designators admit no total order — `P1M` and `P30D` are not comparable without a calendar — and an invented ordering would be a silent wrong answer rather than a declared missing one.
- `representability` SHALL report every loss under the `agent-ix.typescript-backend.` prefix.
- `representability` SHALL declare its own closed register of loss codes under that prefix, so the two prefixes are two registers and neither leaks into the other.
- `representability` SHALL NOT contribute a diagnostic to an admissibility answer, because a target's inability to render a document is not a statement that the document is invalid.
- `representability` SHALL treat `unknownPolicy` on a kind other than `record` as neither loss nor defect, because the committed bases carry a `union` at `surface` and a `map` at `preserve` and the policy has no rendering or validation effect on those kinds.

### The GAP-011 reference policy

- `REFERENCE_POLICY` SHALL be the one place the backend decides whether a `reference` kind's unresolvable `target` is a defect, admitting exactly the two settings `strict` and `open`.
- `REFERENCE_POLICY` SHALL default to `strict`, under which an unresolvable `reference` target yields `UNRESOLVED_TYPE_REF` at `/ir/types/<index>/target`.
- The default SHALL be recorded as conformance with the corpus's published reading, which cases REF-001..004 pin, rather than as a ruling on the contract.
- `docs/semantic-data-system/contracts-v1.md` states a resolution rule for relationship targets and none for a `reference` target; that gap is `conformance/contract-gaps.json` GAP-011, and this requirement SHALL NOT settle it.
- The GAP-011 row names `agent-ix/filament-core-data#9` as its owner and that issue is closed, so no live ticket can decide it today; `agent-ix/filament-core-data#59` records exactly that and asks for a live owner, and this requirement SHALL cite the gap row together with #59 rather than describe #9 as a pending decision.
- A `reference` target may name an identity an imported package exports rather than one the document declares, so resolution can depend on the imported-export set the bundle's `lock` and `manifest` carry.
- Where the bundle carries no `lock` and no `manifest`, `REFERENCE_POLICY` SHALL treat the imported-export set as unknown, and `admitIr` SHALL decide the reference against the document's own declarations alone under the `strict` default while recording a suppression naming the missing input.
- When a live owner settles GAP-011, changing this backend to the settled reading SHALL be one edit to `REFERENCE_POLICY`, requiring no change elsewhere in the backend.

### Independence, bounds, and purity

- `admit.mjs` and `loss.mjs` SHALL NOT import `src/compiler/ir/reader.mjs`, `src/compiler/ir/schema.mjs`, `src/compiler/ir/applicability.mjs`, or `src/compiler/compat/diff.mjs`.
- `admit.mjs` and `loss.mjs` SHALL NOT import any module under `conformance/`.
- The declared graph-depth bound SHALL be 256, the bound the conformance corpus declares and the bound an adapter answer is compared against.
- `src/compiler/diagnostics.mjs` carries a `DEFAULT_LIMITS.maxDepth` of 128 for the compiler, which is half this bound; the two are deliberately different numbers for two different components, and the disagreement between them is recorded as `agent-ix/filament-core-data#62`, which this requirement cites rather than resolves.
- `admitIr` SHALL take a caller-supplied `limits` and SHALL apply its own declared bounds where the caller supplies none, so the bound is never read from an ambient default that belongs to another component.
- `admitIr` SHALL terminate on a cyclic document, on one exceeding the depth bound, on one exceeding `maxNodes`, and on one whose arrays exceed `maxCollectionItems`, reporting the corresponding bound rather than recursing without bound.
- `admitIr` SHALL truncate its diagnostic list at `maxDiagnostics` rather than growing it without bound.
- `admitIr` SHALL read no clock, no environment variable, and no network.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-068-CON-1 | The backend's reader is deliberately a second implementation beside the compiler's; it SHALL NOT import the compiler's reader, its schema layer, or its applicability table, so that agreement between them is evidence rather than a tautology. | Correctness | Static analysis |
| FR-068-CON-2 | The admissibility code vocabulary SHALL stand in bijection with the `agent-ix.semantic-ir.` half of `conformance/diagnostic-codes.json`, so a rule with no registered code is reported as target representability under the backend's own prefix rather than minted into `agent-ix.semantic-ir.`. The bijection is asserted by a test; no module under `src/` imports or reads a file under `conformance/`. | Integrity | Test |
| FR-068-CON-3 | `REFERENCE_POLICY` SHALL be the only place in the backend that decides reference-target resolution, so a search for that decision elsewhere finds nothing. | Maintainability | Static analysis |
| FR-068-CON-4 | This requirement SHALL NOT edit any file under `conformance/cases/`, `conformance/bases/`, or `conformance/oracle/`; a disagreement with the oracle is recorded, never absorbed. | Non-disruption | Change-set diff |
| FR-068-CON-5 | `admitIr` SHALL leave its argument byte-identical, so the bundle a caller passes is never mutated by the decision made about it. | Correctness | Property test |
| FR-068-CON-6 | Neither module SHALL throw for any input, so every refusal is a returned diagnostic and a hostile document cannot end a conformance run. | Safety | Fuzz |
| FR-068-CON-7 | `admit.mjs` SHALL record the severity rule and the locus rule in its derivation ledger as this backend's declared reading of a contract that states neither, rather than presenting either as contract text. | Integrity | Test |
| FR-068-CON-8 | `admitIr` SHALL record a suppression for a rule whose declared input the bundle omits, never reporting that rule as satisfied, because a rule that never ran is not a rule that passed. | Correctness | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-068-AC-1 | Every positive fixture under `fixtures/semantic/v1/positive/` and every conformance base yields `resultState` `success` and zero diagnostics. | Test |
| FR-068-AC-2 | Every rule of the code table fires on a constructed document that violates it and produces exactly its named code at a hand-computed pointer. | Test |
| FR-068-AC-3 | A document with three schema errors at one instance location yields one `SCHEMA_VIOLATION` at the deepest failing location, not three. | Unit |
| FR-068-AC-4 | A structurally invalid document yields only structural diagnostics; no cross-field code appears in its answer. | Unit |
| FR-068-AC-5 | A document that is both alias-cyclic and over the depth bound yields `ALIAS_CYCLE` and not `DEPTH_LIMIT_EXCEEDED`. | Unit |
| FR-068-AC-6 | A document with no diagnostic returns `success` and one with an error diagnostic returns `invalid`; a register entry temporarily set to severity `warning` returns `lossy`; no other value is ever returned. | Test |
| FR-068-AC-7 | Diagnostic order is byte-identical when the suite is re-run under `LC_ALL=tr_TR.UTF-8` and from a different working directory. | Integration |
| FR-068-AC-8 | Every diagnostic the module emits over the whole corpus validates against `common.schema.json#/$defs/diagnostic`, and no diagnostic object carries a pointer member. | Property |
| FR-068-AC-9 | Every code the module can emit is present in `conformance/diagnostic-codes.json`, every code that register carries is present in the module's register, and a deliberately minted code fails the check. | Static |
| FR-068-AC-10 | An IR carrying an unimplemented `format` name and a `min` on a `duration` subject yields exactly two declared losses naming those constructs and their owning type identities, both under the `agent-ix.typescript-backend.` prefix; the same IR carrying an operation, a clause and a `migration` default yields no further loss, and every one of the 70 corpus cases the reader admits generates. | Test |
| FR-068-AC-11 | A declared loss blocks generation and contributes no member to the admissibility answer for the same document. | Test |
| FR-068-AC-12 | With `REFERENCE_POLICY` at `strict`, an unresolvable `reference` target yields `UNRESOLVED_TYPE_REF` at `/ir/types/<index>/target`; with it at `open`, the same document yields no diagnostic; no other line of the backend changes between the two runs. | Test |
| FR-068-AC-13 | `admit.mjs` and `loss.mjs` contain no import of the compiler's reader, schema layer, applicability table, or diff module, and none of any module under `conformance/`. | Static |
| FR-068-AC-14 | A document exceeding each of the depth bound, `maxNodes`, `maxCollectionItems`, and `maxDiagnostics` returns the corresponding bounded answer and does not throw. | Test |
| FR-068-AC-15 | Over 512 mutated documents the module returns an answer, never throws, and leaves its input byte-unchanged. | Fuzz |
| FR-068-AC-16 | A run with every environment variable cleared but `PATH` produces an identical answer for every corpus case. | Integration |
| FR-068-AC-17 | Every diagnostic the module emits carries severity `error` and `blocking` true, and a `locus` exactly when the nearest enclosing node carries a schema-valid `origin.source` or `sourceSpan`; a constructed document whose failing node has no such ancestor yields a diagnostic with no `locus` member. | Test |
| FR-068-AC-18 | A bundle carrying only `ir` records one suppression for each of the six rules whose input is absent, emits no diagnostic for any of them, and returns the same `resultState` as the same document with those inputs supplied and satisfied. | Test |
| FR-068-AC-19 | Suppressions contribute no member to `diagnostics`, no change to `resultState`, and no member to the adapter result the harness compares. | Unit |
| FR-068-AC-20 | The derivation ledger carries one entry per registered code, each naming either a quoted published clause that occurs verbatim in the named artifact or the corpus register; a code with no entry, and a quoted clause that does not occur, each fail the check. | Test |
| FR-068-AC-21 | The count of ledger entries derived from the corpus register is reported alongside the conformance figures, so a reader sees how much of the rule set was read from the yardstick rather than from the contract. | Analysis |
| FR-068-AC-22 | `admitIr` applies a declared depth bound of 256 where the caller supplies no `limits`, and does not read `DEFAULT_LIMITS` from `src/compiler/diagnostics.mjs`. | Static |
| FR-068-AC-23 | A document whose only diagnostics are non-error generates, and its output manifest carries `state: "lossy"` with a non-empty `files` array; a document carrying a representability loss emits zero files under `state: "unsupported"`. | Test |
| FR-068-AC-24 | An IR carrying a `union` at `unknownPolicy: "surface"` and a `map` at `unknownPolicy: "preserve"` — both of which the committed bases carry — yields neither a diagnostic nor a declared loss for the policy. | Unit |
| FR-068-AC-25 | A document declaring three `kind: scalar` definitions each carrying one extension with `identity` `ix://agent-ix/semantic-core/ext/kernel-scalar` yields `resultState` `success` and zero diagnostics; the same document with two extensions both at `identity` `ix://agent-ix/semantic-core/ext/doc` on one field yields exactly one `DUPLICATE_IDENTITY` at `/ir/types/N/fields/M/extensions/1/identity` and no diagnostic at any type's `extensions` pointer. | Unit (TC-1355) |
| FR-068-AC-26 | `node src/compiler/cli.mjs generate --target typescript` over the lifted `config-version-table` IR — whose definitions carry the kernel-scalar extension more than once — exits zero with zero diagnostics and writes a non-empty file set. | Integration (TC-1356) |

## Dependencies

- **Upstream**: [FR-029](./FR-029-close-the-constraint-keyword-vocabulary.md), [FR-036](./FR-036-implement-the-independent-semantic-oracle.md), [FR-063](./FR-063-declare-the-generation-backend-seam.md)
- **Downstream**: [FR-064](./FR-064-lower-ir-type-definitions-to-typescript.md), [FR-066](./FR-066-generate-runtime-validators.md), [FR-070](./FR-070-run-the-typescript-conformance-adapter.md), [FR-071](./FR-071-provide-the-generate-command-and-surface-fixtures.md)
- **Constrained by**: [NFR-024](../non-functional/NFR-024-portable-deterministic-generated-typescript.md), [NFR-025](../non-functional/NFR-025-non-disruptive-typescript-backend.md)
- **Open contract questions**: GAP-003 (the sealed diagnostic carries no in-document location), GAP-006 (`resultState` admits values no rule assigns), and GAP-011 (the resolution rule for a `reference` target) are recorded in `conformance/contract-gaps.json`. All three name `agent-ix/filament-core-data#9` as their owner and that issue is closed, so none of them has a live decider; `agent-ix/filament-core-data#59` records that and asks for one, and this requirement cites the gap rows together with #59 rather than treating #9 as pending. `agent-ix/filament-core-data#61` records that the `severity` and `locus` of a semantic-IR diagnostic are derivable from no published artifact, which is why this requirement declares both rules itself. `agent-ix/filament-core-data#62` records the 128-against-256 depth-bound disagreement between `src/compiler/diagnostics.mjs` and the corpus. `agent-ix/filament-core-data#56` records that the published `sourceLocus` path pattern's guards do not apply past a line terminator, which bears on every locus this requirement emits.
