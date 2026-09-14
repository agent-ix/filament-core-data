---
id: ADR-INDEX
title: "Semantic data architecture decision index"
status: normative
---
# Semantic data architecture decision index

| Decision | Status | Supersedes | Resolution gate |
|---|---|---|---|
| [ADR-0001: Concern-specific authority](0001-concern-specific-authority.md) | normative | — | — |
| [ADR-0002: Generated-package ownership](0002-generated-package-ownership.md) | normative | — | — |
| [ADR-0003: Best-fit representations](0003-best-fit-representations.md) | normative | — | — |
| [ADR-0004: Conditional TypeSpec source](0004-conditional-typespec-source.md) | historical | — | resolved by [ADR-0005](0005-typespec-structural-source.md) |
| [ADR-0005: TypeSpec structural source](0005-typespec-structural-source.md) | normative | ADR-0004 | — |
| [ADR-0006: Inject the extraction producer](0006-frontend-host-boundary.md) | normative | — | — |
| [ADR-0007: Emitted-set contract](0007-emitted-set-contract.md) | normative | — | — |
| [ADR-0008: One backend delivery path](0008-one-backend-delivery-path.md) | normative | — | — |
| [ADR-0009: Reference target resolution](0009-reference-target-resolution.md) | normative | — | ruled under agent-ix/filament-core-data#59 |
| [ADR-0010: Reserved-namespace resolution](0010-reserved-namespace-resolution.md) | normative | — | ruled under agent-ix/filament-core-data#80 |

Accepted decisions remain normative until an indexed successor explicitly
supersedes them. A historical decision links exactly one current successor. The
supersession graph is acyclic; a conflicting or cyclic proposal fails review
rather than choosing a winner by file order.

See the [conflict register](../conflicts.md) for compatibility with existing
Quire, Quoin, module, and Avro decisions.
