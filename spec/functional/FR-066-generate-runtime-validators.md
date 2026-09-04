---
id: FR-066
title: "Generate runtime validators for every exported type"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-012"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-063"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-064"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-068"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-069"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/FR-029"
    type: "depends_on"
  - target: "ix://agent-ix/filament-core-data/NFR-024"
    type: "constrained_by"
  - target: "ix://agent-ix/filament-core-data/NFR-020"
    type: "constrained_by"
---
# [FR-066] Generate runtime validators for every exported type

## Description

The TypeScript backend SHALL generate, for every type the package exports, a
self-contained runtime validator that decides whether an untrusted value
satisfies the semantic contract and reports every failure with an RFC 6901
pointer and a stable code, without an unsafe cast and without a third-party
runtime dependency, so that a consumer checks input against the contract itself
rather than against an erased TypeScript type.

## Inputs

- A semantic IR document at `contractVersion` `1.1.0` that [FR-068](./FR-068-decide-and-report-ir-admissibility.md) has admitted
- The resolved type model [FR-064](./FR-064-lower-ir-type-definitions-to-typescript.md) builds: per type, its `kind`, its resolved scalar, its fields with `presence`, `nullable`, `multiplicity`, `defaultKind`, and `defaultValue`, and its `unknownPolicy`
- Each type's `constraints[]`, every entry carrying `keyword`, `operands`, `appliesTo`, and its own `diagnosticCode`
- The constraint applicability table of `src/compiler/ir/applicability.mjs`
- The canonical element form of [FR-069](./FR-069-canonicalize-and-classify-the-ir-surface.md), used to decide collection uniqueness
- `fixtures/semantic/v1/negative/cases.json` and `fixtures/semantic/v1/negative/reader-cases.json`

## Outputs

- `src/compiler/backends/typescript-v1/validators.mjs` exporting `renderValidators(model)`, which returns the generated validator source for a resolved type model
- `src/compiler/backends/typescript-v1/validators.d.mts` declaring `renderValidators` and the generated `ValidationError`, `ValidationResult`, and `ValidatorCode` shapes
- The generated `validators.ts` module of the emitted package, and its generated `errors.ts` carrying the closed structural-code list

## Behavior

### The validator API

- The backend SHALL generate one exported validator function per exported type, named `validate<Type>`.
- A generated validator SHALL be a pure function of its single argument, returning `{ ok: true; value: T }` or `{ ok: false; errors: readonly ValidationError[] }`.
- A generated validator SHALL NOT throw for any input value, including a value that is not an object, a value carrying a cyclic reference, and a value whose members are hostile.
- A generated validator SHALL report every failure it finds rather than stopping at the first, so that a caller sees the whole defect set in one pass.
- A generated `ValidationError` SHALL carry exactly `pointer`, `code`, and `message`.
- `pointer` SHALL be an RFC 6901 JSON pointer rooted at the validated value, so the empty string names the value itself.
- `code` SHALL be the offending constraint's own `diagnosticCode` where the failure is a constraint failure.
- `code` SHALL be one member of a closed structural-code list generated into `errors.ts` where the failure is structural rather than a constraint failure.
- The generated source SHALL contain no `as` type assertion, no `any`, no `@ts-expect-error`, and no non-null assertion, so that a successful result narrows to the generated type by inference rather than by fiat.
- A generated validator SHALL be reachable without importing the metadata module, so a validating consumer pays for validators alone.

### Presence, nullability, and the four combinations

- The backend SHALL treat presence and nullability as two independent axes.
- The backend SHALL generate the four presence and nullability combinations as four distinct accept and reject decisions:

| `presence` | `nullable` | property absent | property is `null` | property is a conforming value |
|---|---|---|---|---|
| `required` | `false` | reject | reject | accept |
| `required` | `true` | reject | accept | accept |
| `optional` | `false` | accept | reject | accept |
| `optional` | `true` | accept | accept | accept |

- A generated validator SHALL decide absence by an own-property test rather than by comparing the read value with `undefined`, so that a property explicitly present with the value `undefined` is not mistaken for an absent one.
- A generated validator SHALL reject a property present with the value `undefined`, for a required and for an optional field alike, because the generated package is compiled under `exactOptionalPropertyTypes` and an explicit `undefined` is not a member of the declared type.
- Where a field's `multiplicity` makes it a collection — `upper` absent or greater than one — the generated validator SHALL apply the presence and nullability decision to the collection and the element decision to each member.

### Constraint keywords

- The backend SHALL generate a check for every one of the eleven closed constraint keywords, with the operand reading each keyword's branch declares:

| Keyword | Operand read | Generated check |
|---|---|---|
| `min`, `max`, `exclusiveMin`, `exclusiveMax` | `value` as a number for `integer` and `number`, and as an ISO-8601 string for `date`, `datetime`, and `duration` | ordered comparison against the resolved scalar's ordering |
| `minLength`, `maxLength` | `value` as a non-negative integer | length of the `string` in Unicode code points, or of the `bytes` in octets |
| `pattern` | `regex` and `dialect` | ECMA-262 match |
| `enumValues` | `values` | membership in the declared set |
| `nonEmpty` | none | length greater than zero |
| `unique` | none | no two members share a canonical form |
| `format` | `name` | the named format's declared check |

- The backend SHALL resolve a constraint's subject through the alias chain before selecting its check, because a constraint hangs on a type and the frontend mints an alias type per constrained property.
- The backend SHALL report the constraint's own `diagnosticCode` on a constraint failure.
- The backend SHALL NOT mint a code of its own for a constraint failure.
- The backend SHALL compile a `pattern` operand's `regex` exactly as written.
- The backend SHALL NOT add an anchor, a flag, or an escape of its own to a `pattern` operand's `regex`.
- If a `pattern` operand names a dialect other than `ecma-262`, then the backend SHALL treat the document as inadmissible through FR-068 rather than generating an approximate check.
- The backend SHALL generate a `format` check only for a format name the target contract declares the backend implements.
- If a constraint names a `format` the backend does not implement, then the backend SHALL record a declared loss through FR-068, rather than generating a validator that silently passes the value.
- A constraint whose keyword is inapplicable to its resolved subject SHALL never reach generated code, because FR-068 refuses such a document before generation begins.
- `minLength` and `maxLength` over a `string` SHALL count Unicode code points rather than UTF-16 units, so an astral character counts once.

### Unknown members

- Where a type declares `unknownPolicy: "reject"`, the generated validator SHALL reject a value carrying a member the type does not declare, reporting a pointer at that member.
- Where a type declares `unknownPolicy: "surface"`, the generated validator SHALL report each undeclared member as a surfaced finding that leaves `ok` true and is distinguishable from a rejection by its code.
- Where a type declares `unknownPolicy: "preserve"`, the generated validator SHALL carry every undeclared member through to the result value unchanged.

### Collections and defaults

- Where a field's `multiplicity` declares `unique: true`, the generated validator SHALL reject a collection two of whose members share the canonical form FR-069 defines, rather than comparing by reference or by `===`.
- Where a field's `multiplicity` declares `ordered: false`, the generated validator SHALL accept any member order.
- Where a field's `multiplicity` declares `ordered: false`, the generated validator SHALL NOT reorder the value it returns.
- Where a field's `multiplicity` declares `lower` greater than zero on a collection, the generated validator SHALL reject a collection shorter than `lower`.
- Where a field's `multiplicity` declares an `upper`, the generated validator SHALL reject a collection longer than `upper`.
- Where a field declares `defaultKind: "semantic"`, the generated validator SHALL substitute its `defaultValue` when the property is absent, so the returned value is complete.
- Where a field declares `defaultKind: "representation"` or `defaultKind: "migration"`, the generated validator SHALL leave the property absent, because those defaults belong to a representation mapping and to a migration respectively and not to the semantic contract.
- Where a field declares `defaultKind: "none"`, the generated validator SHALL substitute nothing.

### Termination, purity, and ordering

- A generated validator over a recursive type SHALL terminate on every input.
- A generated validator SHALL bound its own recursion at a declared depth limit generated into the package.
- If a value nests past that declared depth limit, then the generated validator SHALL report the structural exceeded-depth code rather than exhausting the stack.
- A generated validator SHALL read no clock.
- A generated validator SHALL read no environment variable.
- A generated validator SHALL open no network connection.
- A generated validator SHALL read no file.
- A generated validator SHALL import nothing outside the generated package.
- For one input, a generated validator SHALL order its error list by `pointer` and then by `code`, compared by code point rather than by locale, so the list is byte-stable across hosts.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-066-CON-1 | The generated validator SHALL have no third-party runtime dependency; the checks are generated code, not calls into a validator library. | Portability | Dependency-closure test |
| FR-066-CON-2 | The generated source SHALL contain no `as` assertion, no `any`, no non-null assertion, and no `@ts-expect-error`, so that no defect can be hidden behind a cast. | Correctness | Static analysis |
| FR-066-CON-3 | The backend SHALL NOT weaken a check to make a fixture pass; a payload the contract rejects and the validator accepts is a defect in the validator, recorded and fixed rather than absorbed by editing the fixture. | Integrity | Branch diff against the committed fixtures |
| FR-066-CON-4 | The generated validator SHALL terminate on a cyclic input value and on an input exceeding the declared depth limit, rather than recursing without bound. | Safety | Fuzz |
| FR-066-CON-5 | The backend SHALL generate the closed structural-code list into the package, so a code the validator emits is a code the package declares. | Maintainability | Test |
| FR-066-CON-6 | A generated validator SHALL be a pure function of its argument, reading no clock, no environment variable, no file, and no socket. | Determinism | Purity test |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-066-AC-1 | Every positive payload derived from `fixtures/semantic/v1/positive/` is accepted by the generated validator for its type, and the returned value equals the input except for applied semantic defaults. | Test |
| FR-066-AC-2 | Every negative case in `fixtures/semantic/v1/negative/cases.json` and `reader-cases.json`, projected to a payload, is rejected, and no rejection is produced by a thrown exception. | Test |
| FR-066-AC-3 | The four presence and nullability combinations produce the twelve accept and reject decisions of the table above, asserted cell by cell. | Unit |
| FR-066-AC-4 | A property explicitly present with the value `undefined` is rejected for a required field and for an optional field, while the same field with the property absent is accepted only where `presence` is `optional`. | Unit |
| FR-066-AC-5 | Each of the eleven constraint keywords fires on a constructed value and reports that constraint's own `diagnosticCode` at the expected pointer. | Test |
| FR-066-AC-6 | A `pattern` operand whose regex is unanchored matches an embedded substring, proving the generator added no anchor; an anchored operand rejects the same value. | Unit |
| FR-066-AC-7 | A constraint naming a `format` the backend does not implement produces a declared loss through FR-068 and no generated package, rather than a validator that accepts every value for that field. | Test |
| FR-066-AC-8 | `unknownPolicy` `reject`, `surface`, and `preserve` produce, for one undeclared member, a rejection with a pointer at that member, a surfaced finding with `ok` true, and a returned value carrying the member unchanged, respectively. | Unit |
| FR-066-AC-9 | A collection declaring `unique: true` rejects two structurally equal members that are not reference-equal, and accepts two members differing only in object key order. | Property |
| FR-066-AC-10 | A collection declaring `ordered: false` accepts a permuted value and returns it in the caller's order. | Unit |
| FR-066-AC-11 | A field declaring `defaultKind: "semantic"` gains its `defaultValue` when absent; a field declaring `representation` or `migration` does not. | Unit |
| FR-066-AC-12 | A validator over a self-referential record type terminates on a value nested past the declared depth limit and reports the exceeded-depth code. | Fuzz |
| FR-066-AC-13 | Over 512 mutated payloads no generated validator throws, and every rejection carries a code from the closed list or a constraint's own `diagnosticCode`. | Fuzz |
| FR-066-AC-14 | The generated source contains zero occurrences of `as `, `any`, `!.`, and `@ts-expect-error`, measured by a lexical scan of every emitted `.ts` file. | Static |
| FR-066-AC-15 | The generated package's runtime dependency closure is empty, and the generated validators import no module outside the package. | Analysis |
| FR-066-AC-16 | For one invalid input the error list is byte-identical across two runs and under `LC_ALL=tr_TR.UTF-8`. | Property |
| FR-066-AC-17 | `tsc --noEmit` accepts a consumer that reads `result.value` only inside an `if (result.ok)` branch and rejects the same consumer reading it outside that branch. | Compile |

## Dependencies

- **Upstream**: [FR-063](./FR-063-declare-the-generation-backend-seam.md), [FR-064](./FR-064-lower-ir-type-definitions-to-typescript.md), [FR-068](./FR-068-decide-and-report-ir-admissibility.md), [FR-069](./FR-069-canonicalize-and-classify-the-ir-surface.md), [FR-029](./FR-029-close-the-constraint-keyword-vocabulary.md)
- **Downstream**: [FR-065](./FR-065-generate-the-esm-package-and-export-surface.md), [FR-070](./FR-070-run-the-typescript-conformance-adapter.md), [FR-071](./FR-071-provide-the-generate-command-and-surface-fixtures.md), issue #11 publication
- **Constrained by**: [NFR-024](../non-functional/NFR-024-portable-deterministic-generated-typescript.md), [NFR-020](../non-functional/NFR-020-bounded-and-safe-compilation.md)
