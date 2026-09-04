---
type: index
title: "filament-core-data requirements index"
description: "Index of the semantic data architecture, contract-census, TypeSpec-feasibility, semantic-contract, IR v1.1, semantic-core grammar, prototype-promotion, compiler-core, conformance-corpus, Rust/Serde backend, and qualified Python generation requirements bundle."
okf_version: "0.1"
---
# filament-core-data requirements

## Contents

* [Master Requirements Specification](./spec.md) - Governs the semantic data architecture record.
* [StR-001: Durable semantic data governance](./stakeholder/StR-001-durable-semantic-data-governance.md) - Captures the stakeholder need.
* [US-001: Understand data authority](./usecase/US-001-understand-data-authority.md) - Reader outcome for authority and ownership.
* [US-002: Plan safe semantic-data adoption](./usecase/US-002-plan-safe-adoption.md) - Implementer outcome for gates and provisional decisions.
* [US-003: Assess Filament contract fit](./usecase/US-003-assess-contract-fit.md) - Migration reviewer outcome for the read-only contract census.
* [US-004: Evaluate the structural schema source](./usecase/US-004-evaluate-structural-schema-source.md) - Compiler owner outcome for the isolated TypeSpec spike (resolved: TypeSpec, ADR-0005).
* [US-005: Author portable semantic packages](./usecase/US-005-author-portable-semantic-packages.md) - Schema-owner outcome for the semantic IR, packages, mappings, and generated targets.
* [US-006: Declare typed domain structure](./usecase/US-006-declare-typed-domain-structure.md) - Module-author outcome for lossless IR v1.1 declarations.
* [US-007: Declare archetypes against a shared grammar](./usecase/US-007-declare-archetypes-against-a-shared-grammar.md) - Module-maintainer outcome for the semantic-core declaration grammar.
* [US-008: Judge a compiler against an independent corpus](./usecase/US-008-judge-a-compiler-against-an-independent-corpus.md) - Reviewer outcome for the conformance corpus and differential oracle.
* [US-009: Build generated packages from a supported compiler](./usecase/US-009-build-from-a-supported-compiler.md) - Compiler-maintainer outcome for promoting the issue #4 prototype emitters into `src/`.
* [US-010: Compile a semantic package to versioned IR](./usecase/US-010-compile-a-semantic-package.md) - Package-author outcome for the TypeSpec frontend and the versioned semantic IR compiler core.
* [US-011: Consume semantic contracts as native Rust types](./usecase/US-011-consume-semantic-contracts-in-rust.md) - Rust-consumer outcome for the Rust/Serde semantic codegen backend.
* [US-013: Generate governed Python types from a qualified upstream generator](./usecase/US-013-generate-governed-python-types.md) - Python-consumer outcome for the qualified `datamodel-code-generator` route.
* [Functional requirements](./functional/) - Required architecture-record, census, feasibility, semantic-contract, package, projection, and compatibility behavior.
* [Non-functional requirements](./non-functional/) - Traceability, reproducibility, parity, security, portability, evidence honesty, isolation, and safety qualities.
* [Update log](./log.md) - Chronological bundle changes.
