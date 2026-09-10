---
id: FR-103
title: "Declare ecosystem configuration contracts"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-015"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-100"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-102"
    type: "depends_on"
---
# FR-103: Declare ecosystem configuration contracts

## Description

The baseline ecosystem configuration contract SHALL make the authority,
profiles, adapters, mapping targets, loss policy, resource limits, and trusted
configuration references explicit, versioned, and content-digested inputs.

## Behavior

- The configuration SHALL identify its contract version and content digest.
- The configuration SHALL select a model authority and semantic profile definitions explicitly.
- The configuration SHALL declare every source adapter and mapping target it permits.
- The configuration SHALL declare loss/refusal policy and finite resource limits.
- A consumer SHALL refuse an unknown configuration version or digest mismatch.
- A consumer SHALL NOT select semantic behavior from an environment variable, working directory, or network lookup.
- A linker SHALL distinguish the static model/profile/configuration selections
  needed for admission from the concrete population, window, and observation
  inputs required only by a selected assessment.
- A consumer SHALL retain a producer-object/native-artifact correspondence with
  each digest's named domain and SHALL refuse cross-domain substitution.

## Constraints

| ID | Constraint | Type | Validation |
| --- | --- | --- | --- |
| FR-103-CON-1 | A semantic result SHALL retain the exact configuration identity it consumed. | Traceability | Test |
| FR-103-CON-2 | A configuration change SHALL produce a distinct semantic input identity. | Integrity | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
| --- | --- | --- |
| FR-103-AC-1 | An unknown profile reference is refused before model or population evaluation. | Test |
| FR-103-AC-2 | Changing only a resource-limit value changes the configuration identity and remains observable in the result. | Test |
| FR-103-AC-3 | A consumer with no explicit configuration refuses rather than selecting a current-directory or environment default. | Test |
| FR-103-AC-4 | A clause package links against an exact model/profile/configuration closure with no population records, while an assessment needing an absent selected window reports its own missing-input disposition. | Test |
| FR-103-AC-5 | A producer canonical-object digest and a native raw-byte digest both validate only in their named domain; substituting either for the other refuses the binding. | Test |

## Dependencies

- [US-015](../usecase/US-015-lift-a-spec-bundle-into-a-domain-package.md) supplies the compilation/extraction outcome.
- [FR-100](./FR-100-author-field-presence-independently.md) and [FR-102](./FR-102-bind-populations-to-model-contracts.md) supply the selected contracts.
- [Baseline 1.2 contract](../../docs/semantic-data-system/baseline-1-2.md) is the authoritative contract text.
