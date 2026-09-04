---
id: FR-053
title: "Declare the TypeSpec semantic vocabulary and mint semantic identities"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-010"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-031"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-034"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-028"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-029"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-019"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-020"
    type: "constrained_by"
---
# [FR-053] Declare the TypeSpec semantic vocabulary and mint semantic identities

## Description

The repository SHALL own one closed TypeSpec decorator vocabulary carrying the
semantics that TypeSpec's own type system cannot express, and one deterministic
identity minting rule shared with the semantic-core lowering of FR-034, so that
the same declaration produces the same identity whichever frontend reads it and
no semantic value is inferred from a declaration's spelling.

## Inputs

- A compiled TypeSpec `Program` and the resolved package of FR-047
- The semantic-core declaration grammar of FR-031 and its lowering table of FR-034 (`packages/semantic-core/lowering.json`)
- The closed constraint vocabulary of FR-029 and the edge categories of FR-028

## Outputs

- `src/compiler/frontend/typespec/lib/main.tsp`: the `extern dec` declarations of namespace `AgentIx.Semantic.Decorators`
- `src/compiler/frontend/typespec/lib/lib.mjs`: their implementations, exported as `$decorators`
- `src/compiler/frontend/typespec/lib/package.json`, declaring `"license": "AGPL-3.0-only"`
- `src/compiler/frontend/typespec/identity.mjs`: `mintIdentity(slot, parts, packageIdentity)`, `constraintDiagnosticCode(parts, keyword, packageName)`, and `slug(value)`
- `src/compiler/frontend/typespec/vocabulary.mjs`: the decorator state readers used by the lowering

## Behavior

### Vocabulary and delivery

- The library SHALL declare exactly these decorators and no others: `@role`, `@unknownPolicy`, `@unit`, `@multiplicity`, `@collection`, `@defaultKind`, `@identityField`, `@decimal`, `@relationship`, `@operations`, `@pre`, `@post`, `@clause`, `@semanticReference`, and `@semanticExtension`.
- The frontend SHALL make the library available by passing its absolute `main.tsp` path in the TypeSpec compiler's `additionalImports`, so that a compiled package neither imports the library nor names a path outside its own root.
- `@role`, `@relationship`, `@clause`, `@pre`, `@post`, and `@semanticExtension` SHALL be repeatable.
- If a single-valued decorator is applied twice to one target, then the frontend SHALL raise `agent-ix.compiler.DUPLICATE_DECORATOR` at the second application's locus, carrying the first application's locus as a related locus.
- If a decorator argument does not satisfy the declared shape or pattern for its parameter, then the frontend SHALL raise `agent-ix.compiler.INVALID_DECORATOR_ARGUMENT` at that decorator's locus, naming the parameter and the expected form.
- The declared argument patterns SHALL be: a `@role` name and a `@semanticExtension` capability matching `^[a-z0-9][a-z0-9.-]*:[a-zA-Z0-9][a-zA-Z0-9._-]*$`; an `@unknownPolicy` value in `preserve`/`reject`/`surface`; a `@unit` symbol matching `^[!-~]+$`; `@multiplicity` bounds that are non-negative integers with `upper >= lower` where `upper` is given; a `@defaultKind` value in `semantic`/`representation`/`migration`; a `@relationship` category in the FR-028 set, verb matching `^[A-Za-z_][A-Za-z0-9_]*$`, and target matching the `semanticIdentity` pattern; a `@clause` language matching the FR-028 language pattern and a `clauseId` matching `^[A-Za-z_][A-Za-z0-9_]*$`; a `@semanticReference` and `@semanticExtension` identity matching the `semanticIdentity` pattern; and a `@decimal` precision `>= 1` and scale `>= 0`.
- UCUM symbol membership SHALL NOT be checked; FR-034-AC-4 makes membership a consumer concern, and this requirement checks only the charset.

### Identity minting

- The frontend SHALL mint identities by the rules of FR-034, rooted at the package identity rather than at `<org>/<repo>`: `ix://<package identity>/type/<Name>`, `.../field/<Name>-<field>`, `.../field/<Name>-<operation>-<param>`, `.../relationship/<Name>-<verb>-<TargetName>`, `.../operation/<Name>-<name>`, `.../clause/<Name>-<clauseId>`, `.../constraint/<Name>-<field>-<keyword>` for a field constraint, `.../constraint/<Name>-<keyword>` for a type constraint, and `.../type/<KernelScalar>` for a kernel scalar definition.
- The frontend SHALL provide no decorator that overrides a minted identity, so an identity is a function of the declaration and its package alone.
- `slug(value)` SHALL replace every character outside `[A-Za-z0-9]` with `-`, collapse runs of `-`, and trim leading and trailing `-`.
- If two declarations mint the same identity, then the frontend SHALL raise `agent-ix.semantic-ir.DUPLICATE_IDENTITY` at the locus of the declaration that is later in the order of package-root-relative source path, then start line, then start column, carrying the earlier locus as a related locus.
- If slugging two distinct declaration names produces one identity, then the frontend SHALL raise `agent-ix.compiler.UNSLUGGABLE_NAME` at the later declaration's locus rather than emitting a colliding identity.

### Constraints and minted aliases

- The frontend SHALL lower the TypeSpec core decorators `@minValue`, `@maxValue`, `@minValueExclusive`, `@maxValueExclusive`, `@pattern`, `@minLength`, `@maxLength`, `@minItems`, and `@format` to the closed IR keywords `min`, `max`, `exclusiveMin`, `exclusiveMax`, `pattern`, `minLength`, `maxLength`, `nonEmpty`, and `format`, and `@collection(unique: true)` to `unique`.
- The frontend SHALL attach a constraint to a type definition and never to a field, because `semantic-ir.schema.json` gives a field no `constraints` member.
- Where a constraint decorator is applied to a model property, the frontend SHALL mint an `alias` type definition `ix://<package identity>/type/<Name><Field>` targeting the property's declared type, set the field's `typeRef` to it, and attach the constraint to the alias with `appliesTo` set to the alias identity, exactly as FR-034 requires of the semantic-core lowering.
- The frontend SHALL derive each constraint's `diagnosticCode` as `agent-ix.<slug(package name)>.<upper snake of the slugged owner parts>_<upper snake of the keyword>`, where every `-` becomes `_` and every letter is upper-cased, so the value always matches the `diagnostic.code` pattern of `common.schema.json`.
- `constraint.diagnosticCode` is a datum of the emitted document naming the code a consumer raises when the constraint fails; it is not a compiler diagnostic code and SHALL NOT be required to appear in the FR-049 registry.
- If a constraint's keyword is not applicable to its resolved subject under the FR-050 applicability table, then the frontend SHALL raise `agent-ix.semantic-ir.CONSTRAINT_NOT_APPLICABLE` at the decorator's locus and SHALL NOT emit the constraint.

### Relationships, operations, and clauses

- The frontend SHALL lower each `@relationship(verb, category, target, lower, upper?, composite?)` on a `record` declaration to one IR relationship, with `composite` defaulting to `false` and multiplicity defaulting to `{ lower: 0, upper: 1 }`, matching FR-034.
- If `@relationship` or `@operations` names a declaration whose kind is not `record`, then the frontend SHALL raise `agent-ix.semantic-ir.NODES_ON_NON_RECORD` at the decorator's locus.
- The frontend SHALL lower each TypeSpec `op` declared in an interface carrying `@operations(<record>)` to one IR operation of that record, with `params` lowered as fields, `returns` lowered as `{ typeRef, multiplicity, nullable: false }`, and `pre`/`post` taken from the `@pre` and `@post` applications on the `op`.
- The frontend SHALL lower each `@clause(language, clauseId, text)` to one IR clause carrying a `sourceSpan` at the decorator's locus, and SHALL NOT parse `text`.
- If a `@pre` or `@post` argument names a `clauseId` the owning record does not declare, then the frontend SHALL raise `agent-ix.semantic-ir.DANGLING_CLAUSE_REF` at the decorator's locus.
- If two `@clause` applications on one declaration carry the same `clauseId`, then the frontend SHALL raise `agent-ix.semantic-ir.DUPLICATE_CLAUSE_ID` at the second application's locus.

### Extensions

- The frontend SHALL lower `@doc` on a model property to the extension `ix://agent-ix/semantic-core/ext/doc` (version `1.0.0`, `required: false`, payload `{ text }`) on that field, matching FR-034.
- The frontend SHALL lower `@identityField` to `ix://agent-ix/semantic-core/ext/identity` (version `1.0.0`, `required: false`, payload `{ identity: true }`) on the field.
- The frontend SHALL lower `@decimal(precision, scale)` to `ix://agent-ix/semantic-core/ext/decimal` (version `1.0.0`, `required: true`, payload `{ precision, scale }`) on the field.
- The frontend SHALL lower `@semanticExtension(identity, version, required, payloadJson)` to one extension carrying those values, with `payloadJson` parsed as JSON, so a package can carry a datum the closed vocabulary does not name.
- If `payloadJson` is not valid JSON, then the frontend SHALL raise `agent-ix.compiler.INVALID_DECORATOR_ARGUMENT` at the decorator's locus.

### Declared loss

- If a declaration carries a datum the IR has no member for — an enum member's assigned value, a TypeSpec template parameter, or a `@doc` on a target the extension table does not cover — then the frontend SHALL raise `agent-ix.compiler.UNSUPPORTED_LOSS` at that declaration's locus, naming the datum, and SHALL NOT emit a document that silently omits it.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-053-CON-1 | The minted identities and the constraint-alias rule SHALL equal those of FR-034, so the TypeSpec frontend and the semantic-core lowering cannot disagree about what a declaration is called. | Consistency | Differential test |
| FR-053-CON-2 | The library SHALL declare no decorator beyond the fifteen named here; adding one is a compatibility change under FR-051. | Portability | Test |
| FR-053-CON-3 | The frontend SHALL reach the library by the absolute path it supplies to `additionalImports`, so the library enters neither `package.json` nor a `file:` or `link:` specifier. | Maintainability | Dependency inspection |
| FR-053-CON-4 | The library SHALL declare no decorator that overrides a minted identity or that lets an IR value be derived from a declaration's name, namespace, or file path. | Correctness | Metamorphic test |
| FR-053-CON-5 | Every manifest this requirement adds SHALL declare `"license": "AGPL-3.0-only"`. | Legal | Licence inspection |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-053-AC-1 | The library declares exactly the fifteen named decorators; a test reading `main.tsp` fails when a sixteenth appears. | Test |
| FR-053-AC-2 | A package compiles against the library with no `import` statement of its own and no path containing `..`, driven through `additionalImports`. | Test |
| FR-053-AC-3 | A second application of each single-valued decorator raises `DUPLICATE_DECORATOR` at the second locus with the first as a related locus. | Test |
| FR-053-AC-4 | Every declared argument pattern rejects at least one malformed value with `INVALID_DECORATOR_ARGUMENT` at the decorator's line and column, and accepts at least one well-formed value. | Test |
| FR-053-AC-5 | `@unit("furlong")` is accepted and `@unit("a b")` is rejected on charset, proving UCUM membership is not checked and the charset is. | Test |
| FR-053-AC-6 | For a worked package, every minted identity equals the identity FR-034's rules give the same declaration, computed by a shared table rather than by two hand-written lists. | Test |
| FR-053-AC-7 | Renaming every declaration in a fixture package changes only the identities and display names, and no `role`, `nullable`, `unknownPolicy`, `unit`, `composite`, or `kind` value. | Property |
| FR-053-AC-8 | A constrained model property mints the alias type, retargets the field, and attaches the constraint to the alias with `appliesTo` equal to the alias identity. | Test |
| FR-053-AC-9 | Every derived `diagnosticCode` matches the `common.schema.json` code pattern, including for a package named `core.data` and a field named `a_b.c`. | Property |
| FR-053-AC-10 | Two declarations minting one identity raise `DUPLICATE_IDENTITY` at the later locus by the declared source order, and two names slugging to one identity raise `UNSLUGGABLE_NAME`. | Test |
| FR-053-AC-11 | `CONSTRAINT_NOT_APPLICABLE`, `NODES_ON_NON_RECORD`, `DANGLING_CLAUSE_REF`, and `DUPLICATE_CLAUSE_ID` each fire at the decorator's locus and emit no node. | Test |
| FR-053-AC-12 | Relationships, operations, and clauses lower with the FR-034 defaults for `composite`, relationship multiplicity, and `returns.nullable`. | Test |
| FR-053-AC-13 | Each of the four extension lowerings produces the identity, version, `required` flag, and payload FR-034 names, and `@semanticExtension` carries an arbitrary parsed payload. | Test |
| FR-053-AC-14 | An enum member with an assigned value raises `UNSUPPORTED_LOSS` at the member's locus, and no document is written. | Test |
| FR-053-AC-15 | Every added manifest declares `AGPL-3.0-only`, and `package.json` gains no dependency and no `file:`/`link:` specifier. | Analysis |

## Dependencies

- **Upstream**: [FR-031](./FR-031-define-the-semantic-core-declaration-grammar.md), [FR-034](./FR-034-lower-semantic-core-declarations-to-ir.md), [FR-028](./FR-028-represent-relationships-operations-and-clauses.md), [FR-029](./FR-029-close-the-constraint-keyword-vocabulary.md), [FR-045](./FR-045-define-the-frontend-seam.md)
- **Downstream**: [FR-046](./FR-046-lower-typespec-to-contract-ir.md), [FR-050](./FR-050-validate-and-normalize-the-emitted-ir.md)
- **Constrained by**: [NFR-019](../non-functional/NFR-019-deterministic-contract-compilation.md), [NFR-020](../non-functional/NFR-020-bounded-and-safe-compilation.md)
