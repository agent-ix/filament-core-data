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
pointer and a stable code, without an unsafe type assertion and without a
third-party runtime dependency, so that a consumer checks input against the
contract itself rather than against an erased TypeScript type.

## Inputs

- A semantic IR document at `contractVersion` `1.1.0` that [FR-068](./FR-068-decide-and-report-ir-admissibility.md) has admitted
- The resolved type model [FR-064](./FR-064-lower-ir-type-definitions-to-typescript.md) builds: per type, its `kind`, its resolved scalar, its fields with `presence`, `nullable`, `multiplicity`, `defaultKind`, and `defaultValue`, and its `unknownPolicy`
- Each type's `constraints[]`, every entry carrying `keyword`, `operands`, `appliesTo`, and its own `diagnosticCode`
- The constraint applicability table of `src/compiler/ir/applicability.mjs`
- The canonical element form of [FR-069](./FR-069-canonicalize-and-classify-the-ir-surface.md), used to decide collection uniqueness
- The authored instance corpus under `test/fixtures/backends/typescript/instances/`, which this requirement also produces
- `ajv@8.20.0` and `ajv-formats@3.0.1`, already pinned devDependencies of this repository, used as the second decider of the differential check below

## Outputs

- `src/compiler/backends/typescript-v1/validators.mjs` exporting `renderValidators(model)`, which returns the generated validator source for a resolved type model
- `src/compiler/backends/typescript-v1/validators.d.mts` declaring `renderValidators` and the generated `ValidationError`, `ValidationResult`, and `ValidatorCode` shapes
- The generated `validators.ts` module of the emitted package
- The generated `errors.ts` module of the emitted package, carrying the closed structural-code list and the `ValidationError` and `ValidationResult` shapes; it is the eighth member of the closed file set [FR-065](./FR-065-generate-the-esm-package-and-export-surface.md) declares, and it carries its own `exports` subpath there
- `test/fixtures/backends/typescript/instances/**`, the authored instance corpus and the JSON Schema documents the differential check runs against

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
- A generated validator SHALL be reachable without importing the metadata module, so a validating consumer pays for validators alone.
- Where [FR-068](./FR-068-decide-and-report-ir-admissibility.md) returns an admissibility result of `lossy`, the backend SHALL generate validators for that document, because a `lossy` admissibility answer describes the document and not the target's ability to represent it.

### Generated source hygiene

- The generated source SHALL contain no type assertion, in either the `as <Type>` or the `<Type>value` form, so that a successful result narrows to the generated type by inference rather than by fiat.
- The generated source SHALL contain no non-null assertion.
- The generated source SHALL contain no `@ts-expect-error` and no `@ts-ignore`.
- The generated source SHALL use no `any` type.
- The generated source MAY use the `as const` assertion, which is not a type assertion in the sense banned above: it narrows a literal and adds no claim a reader could not check, and [FR-067](./FR-067-generate-identity-and-fingerprint-metadata.md) requires it on the identity and metadata objects.
- The check for the four prohibitions above SHALL be syntactic rather than lexical, so that the word `any` inside a JSDoc comment rendered from a `doc` extension is not counted as a type.

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
- The IR carries one `nullable` boolean per field and one `multiplicity`, so `nullable` on a collection field SHALL mean that the collection itself may be `null`, and SHALL NOT mean that a member may be `null`.

### Constraint keywords

- The backend SHALL generate a check for every one of the eleven closed constraint keywords, with the operand reading each keyword's branch declares:

| Keyword | Operand read | Generated check |
|---|---|---|
| `min`, `max`, `exclusiveMin`, `exclusiveMax` | `value` as a number for `integer` and `number`, and as an ISO-8601 string for `date` and `datetime` | ordered comparison against the resolved scalar's ordering |
| `minLength`, `maxLength` | `value` as a non-negative integer | Unicode code points of a `string` subject, or decoded octets of a `bytes` subject |
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
- If a constraint names a `format` the backend does not implement, then the backend SHALL record a representability loss through FR-068, rather than generating a validator that silently passes the value.
- A constraint whose keyword is inapplicable to its resolved subject SHALL never reach generated code, because FR-068 refuses such a document before generation begins.

### The scalar value domain

- The JSON wire form of the `bytes` kernel scalar, and the shape of a
  discriminated union's tag on the wire, are unspecified in the published
  contract and are recorded as `agent-ix/filament-core-data#58`, where issue
  #21 has already entered its own reading. The readings below are therefore a
  **declared backend decision pending #58** rather than settled contract, and
  this requirement SHALL say so where it states them. `conformance/thresholds.json`
  permits the `typescript-backend` slot zero divergences, so if #58 settles
  against a reading here the consequence is a reported failure for the owner to
  disposition, and this work SHALL NOT suppress it as a registered divergence.
- Pending `agent-ix/filament-core-data#58`, the backend SHALL render a `bytes`
  subject as a `string` carrying standard base64 as RFC 4648 §4 defines it, and
  the generated validator SHALL reject a value that is not well-formed base64
  under that alphabet.
- A `minLength` or `maxLength` over a `string` subject SHALL count Unicode code points rather than UTF-16 code units, so an astral character counts once.
- Pending `agent-ix/filament-core-data#58`, a `minLength` or `maxLength` over a `bytes` subject SHALL count the octets the base64 string decodes to, rather than the characters of its encoding.
- A generated validator for an `integer` subject SHALL reject a non-integral number with its own structural code.
- A generated validator for an `integer` or `number` subject SHALL reject `NaN` with its own structural code.
- A generated validator for an `integer` or `number` subject SHALL reject `Infinity` and `-Infinity` with its own structural code.
- A generated validator for an `integer` subject SHALL reject a magnitude above `Number.MAX_SAFE_INTEGER` with its own structural code, because beyond that bound a JSON number no longer round-trips through a JavaScript number.
- A generated validator SHALL accept `-0` wherever it accepts `0`, and the canonical form of FR-069 SHALL render both as `0`, so a collection declaring `unique: true` treats them as one member.
- The ISO-8601 `duration` scalar admits no total order, because `P1M` and `P30D` are not comparable without a calendar. The backend SHALL therefore record a representability loss through FR-068 for a `min`, `max`, `exclusiveMin`, or `exclusiveMax` constraint whose resolved subject is a `duration`, rather than inventing an ordering.

### Unknown members

- `unknownPolicy` is meaningful only on a `record`, because no other kind carries a declared member set. The backend SHALL therefore give `unknownPolicy` no validation effect on a `scalar`, `enum`, `union`, `alias`, `sequence`, `map`, or `reference` type, and [FR-067](./FR-067-generate-identity-and-fingerprint-metadata.md) SHALL carry the declared value into the metadata so nothing is dropped. The committed bases make this a real case rather than a hypothetical one: `conformance/bases/core-2-0.json` carries a `union` declaring `surface` and `package-2-0.json` carries a `map` declaring `preserve`.
- Where a `record` declares `unknownPolicy: "reject"`, the generated validator SHALL reject a value carrying a member the type does not declare, reporting a pointer at that member.
- Where a `record` declares `unknownPolicy: "surface"`, the generated validator SHALL report each undeclared member as a surfaced finding that leaves `ok` true and is distinguishable from a rejection by its code.
- Where a `record` declares `unknownPolicy: "preserve"`, the generated validator SHALL carry every undeclared member through to the result value unchanged.
- Where a `record` declares `preserve` or `surface`, the generated interface SHALL carry the undeclared members in one separately named readonly member of type `{ readonly [key: string]: unknown }` rather than in an index signature over the interface itself, because an index signature spanning the declared members widens each of them and dissolves the absent-versus-`undefined` distinction the four combinations above depend on.
- The generated validator SHALL populate that member with the undeclared members only, leaving every declared property at its declared type.

### Hostile and unusual input values

- A generated validator SHALL read every member of the validated value as an own property, without invoking an inherited accessor, so a prototype-chain member cannot satisfy a declared field.
- A generated validator SHALL read every member through an operation that cannot invoke a getter, so a getter that throws cannot make the validator throw and a getter returning a different value on each read cannot make the check disagree with the value returned.
- A generated validator SHALL treat `__proto__`, `constructor`, and `prototype` as ordinary member names, matching them against the declared field set by the same rule as every other name.
- A generated validator SHALL NOT assign an undeclared member onto the result value by plain property assignment; under `unknownPolicy: "preserve"` it SHALL build the preserved-member object with a null prototype, so a preserved `__proto__` member cannot mutate a prototype.
- A generated validator SHALL accept an input object whose prototype is `null`, because such an object is a legitimate result of `JSON.parse` reviving and of `Object.create(null)`.
- A generated validator SHALL NOT coerce a value through `Symbol.toPrimitive`, `valueOf`, or `toString`; a value of the wrong JavaScript type SHALL be rejected rather than converted.

### Collections and defaults

- Where a field's `multiplicity` declares `unique: true`, the generated validator SHALL reject a collection two of whose members share the canonical form FR-069 defines, rather than comparing by reference or by `===`.
- Where a field's `multiplicity` declares `ordered: false`, the generated validator SHALL accept any member order.
- Where a field's `multiplicity` declares `ordered: false`, the generated validator SHALL NOT reorder the value it returns.
- Where a field's `multiplicity` declares `lower` greater than zero on a collection, the generated validator SHALL reject a collection shorter than `lower`.
- Where a field's `multiplicity` declares an `upper`, the generated validator SHALL reject a collection longer than `upper`.
- Where a field declares `defaultKind: "semantic"`, the generated validator SHALL substitute its `defaultValue` when the property is absent, so the returned value is complete.
- Where a field declares `defaultKind: "semantic"`, the generated validator SHALL validate the substituted `defaultValue` against the field's own declared type and constraints, so a default the contract itself rejects is a defect the validator reports rather than a value it hands on.
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

### The instance corpus and the differential check

- The conformance corpus carries no instance payloads: `conformance/schema/input-bundle.schema.json` is `additionalProperties: false` over `ir`, `manifest`, `manifestDigest`, `lock`, `profile`, `mappings`, and `consumerPolicy`, so a corpus case supplies a contract *document* and never an instance of a declared type. This requirement SHALL therefore author its own instance corpus rather than claim one that does not exist.
- The repository SHALL carry an authored instance corpus under `test/fixtures/backends/typescript/instances/`, each case naming the IR document it is validated against, the semantic identity of the type under test, the payload, and the expected verdict.
- A case whose expected verdict is a rejection SHALL additionally name the expected RFC 6901 pointer and the expected code.
- Every instance case SHALL be authored from the published contract and from the IR document it names, and SHALL NOT be recorded from a run of the generated validator, because an expectation minted by the implementation under test is not evidence — the discipline `provenance.blessedFromRun` states for the conformance corpus applies here unchanged.
- The repository SHALL carry, beside each instance case, a JSON Schema 2020-12 document describing the same type, authored from the same contract.
- For every instance case, the generated validator's accept-or-reject verdict SHALL equal the verdict `ajv@8.20.0` reaches against that JSON Schema document.
- The differential check SHALL be run by the test suite rather than by the generator, so the generator never sees the second decider's answer.
- The rationale SHALL be recorded beside the check: two deciders written independently from the same contract are evidence about the contract, and a generator compared only with its own output is evidence about nothing.
- If the two deciders disagree, then the test SHALL fail rather than record a suppression, and the disagreement SHALL be resolved by fixing whichever decider the contract shows to be wrong.

## Constraints

| ID | Constraint | Type | Validation |
|---|---|---|---|
| FR-066-CON-1 | The generated validator SHALL have no third-party runtime dependency; the checks are generated code, not calls into a validator library. The `ajv` of the differential check is a test-time decider and never enters the generated package. | Portability | Dependency-closure test |
| FR-066-CON-2 | The generated source SHALL contain no type assertion, no non-null assertion, no `any` type, and no `@ts-expect-error`, so that no defect can be hidden behind a cast. The `as const` assertion is exempt and is required by FR-067. | Correctness | Static analysis |
| FR-066-CON-3 | The backend SHALL NOT weaken a check to make a fixture pass; a payload the contract rejects and the validator accepts is a defect in the validator, recorded and fixed rather than absorbed by editing the fixture. | Integrity | Branch diff against the committed fixtures |
| FR-066-CON-4 | The generated validator SHALL terminate on a cyclic input value and on an input exceeding the declared depth limit, rather than recursing without bound. | Safety | Fuzz |
| FR-066-CON-5 | The backend SHALL generate the closed structural-code list into the package, so a code the validator emits is a code the package declares. | Maintainability | Test |
| FR-066-CON-6 | A generated validator SHALL be a pure function of its argument, reading no clock, no environment variable, no file, and no socket. | Determinism | Purity test |
| FR-066-CON-7 | The instance corpus SHALL be authored from the contract and never recorded from a run of the generated validator; a case whose expectation was produced by the implementation under test is not evidence and is refused. | Integrity | Branch diff |
| FR-066-CON-8 | The differential check SHALL add no dependency to either lockfile; `ajv@8.20.0` and `ajv-formats@3.0.1` are already pinned devDependencies and are the only second decider used. | Non-disruption | Lockfile comparison |
| FR-066-CON-9 | The backend SHALL record the `bytes` wire form, its length unit, and the wire shape of a union's discriminator as declared decisions pending `agent-ix/filament-core-data#58`, in one named place each, so that settling #58 is one edit rather than a search. This ticket decides #58 for nobody, and a divergence arising from it is reported for the owner rather than suppressed. | Integrity | Static analysis |

## Acceptance Criteria

| ID | Criteria | Verification |
|---|---|---|
| FR-066-AC-1 | Every instance case in `test/fixtures/backends/typescript/instances/` whose expected verdict is acceptance is accepted by the generated validator for its named type, and the returned value equals the input except for applied semantic defaults and preserved unknown members. | Test |
| FR-066-AC-2 | Every instance case whose expected verdict is rejection is rejected, at the expected pointer and with the expected code, and no rejection is produced by a thrown exception. | Test |
| FR-066-AC-3 | The four presence and nullability combinations produce the twelve accept and reject decisions of the table above, asserted cell by cell. | Unit |
| FR-066-AC-4 | A property explicitly present with the value `undefined` is rejected for a required field and for an optional field, while the same field with the property absent is accepted only where `presence` is `optional`. | Unit |
| FR-066-AC-5 | Each of the eleven constraint keywords fires on a constructed value and reports that constraint's own `diagnosticCode` at the expected pointer. | Test |
| FR-066-AC-6 | A `pattern` operand whose regex is unanchored matches an embedded substring, proving the generator added no anchor; an anchored operand rejects the same value. | Unit |
| FR-066-AC-7 | A constraint naming a `format` the backend does not implement produces a representability loss through FR-068 and no generated package, rather than a validator that accepts every value for that field. | Test |
| FR-066-AC-8 | `unknownPolicy` `reject`, `surface`, and `preserve` on a `record` produce, for one undeclared member, a rejection with a pointer at that member, a surfaced finding with `ok` true, and a returned value carrying the member unchanged, respectively. | Unit |
| FR-066-AC-9 | A collection declaring `unique: true` rejects two structurally equal members that are not reference-equal, and accepts two members differing only in object key order. | Property |
| FR-066-AC-10 | A collection declaring `ordered: false` accepts a permuted value and returns it in the caller's order. | Unit |
| FR-066-AC-11 | A field declaring `defaultKind: "semantic"` gains its `defaultValue` when absent; a field declaring `representation` or `migration` does not; and a `semantic` default that violates its own field's constraints is reported rather than substituted. | Unit |
| FR-066-AC-12 | A validator over a self-referential record type terminates on a value nested past the declared depth limit and reports the exceeded-depth code. | Fuzz |
| FR-066-AC-13 | Over 512 mutated payloads no generated validator throws, and every rejection carries a code from the closed list or a constraint's own `diagnosticCode`. | Fuzz |
| FR-066-AC-14 | A syntactic scan of every emitted `.ts` file finds no type assertion, no non-null assertion, no `any` type, and no `@ts-expect-error`, while the `as const` assertions FR-067 requires are present and are not counted; the same scan run over a file whose only `any` is the English word inside a JSDoc comment reports nothing. | Static |
| FR-066-AC-15 | The generated package's runtime dependency closure is empty, and the generated validators import no module outside the package. | Analysis |
| FR-066-AC-16 | For one invalid input the error list is byte-identical across two runs and under `LC_ALL=tr_TR.UTF-8`. | Property |
| FR-066-AC-17 | `tsc --noEmit` accepts a consumer that reads `result.value` only inside an `if (result.ok)` branch and rejects the same consumer reading it outside that branch. | Compile |
| FR-066-AC-18 | For every instance case, the generated validator and `ajv@8.20.0` running the case's authored JSON Schema document reach the same accept-or-reject verdict; a seeded defect in either decider makes the check fail. | Test |
| FR-066-AC-19 | `errors.ts` is emitted, is the eighth member of the FR-065 file set, carries the closed structural-code list, and is reachable through its own `exports` subpath. | Unit |
| FR-066-AC-20 | A `bytes` subject rejects a string that is not well-formed base64, and a `maxLength` of 3 on a `bytes` subject accepts a four-character base64 string decoding to three octets while rejecting one decoding to four. | Unit |
| FR-066-AC-21 | An `integer` subject rejects `1.5`, `NaN`, `Infinity`, `-Infinity`, and `Number.MAX_SAFE_INTEGER + 2`, each with its own structural code, and accepts `-0` wherever it accepts `0`. | Unit |
| FR-066-AC-22 | An ordering constraint whose resolved subject is a `duration` produces a representability loss through FR-068 and no generated package. | Unit |
| FR-066-AC-23 | An input carrying `__proto__`, `constructor`, and `prototype` as declared member names validates by the ordinary rule; the same names as undeclared members under `preserve` are carried into a null-prototype preserved-member object and mutate no prototype. | Unit |
| FR-066-AC-24 | An input whose prototype is `null` validates identically to the same value with the default prototype; an input whose declared member is an inherited accessor is rejected as absent; and an input whose getter throws produces a rejection rather than a thrown exception. | Unit |
| FR-066-AC-25 | An input whose member is an object defining `Symbol.toPrimitive`, `valueOf`, or `toString` returning a conforming primitive is rejected as the wrong JavaScript type. | Unit |
| FR-066-AC-26 | A `record` declaring `preserve` renders its undeclared members in one separately named readonly member rather than an index signature, and the four presence and nullability forms still typecheck distinctly under `exactOptionalPropertyTypes`. | Compile |
| FR-066-AC-27 | `unknownPolicy` declared on a `union` and on a `map` produces no validation effect, and the declared value appears in the FR-067 metadata for both. | Unit |
| FR-066-AC-28 | A document whose admissibility result is `lossy` generates validators; a document carrying a representability loss generates none. | Unit |
| FR-066-AC-29 | The `bytes` wire form, its length unit, and the union discriminator's wire shape each appear as a single named declared decision citing `agent-ix/filament-core-data#58`, and `conformance/divergences.json` carries no entry attributed to that question. | Static |

## Dependencies

- **Upstream**: [FR-063](./FR-063-declare-the-generation-backend-seam.md), [FR-064](./FR-064-lower-ir-type-definitions-to-typescript.md), [FR-068](./FR-068-decide-and-report-ir-admissibility.md), [FR-069](./FR-069-canonicalize-and-classify-the-ir-surface.md), [FR-029](./FR-029-close-the-constraint-keyword-vocabulary.md)
- **Downstream**: [FR-065](./FR-065-generate-the-esm-package-and-export-surface.md), [FR-070](./FR-070-run-the-typescript-conformance-adapter.md), [FR-071](./FR-071-provide-the-generate-command-and-surface-fixtures.md), issue #11 publication
- **Constrained by**: [NFR-024](../non-functional/NFR-024-portable-deterministic-generated-typescript.md), [NFR-020](../non-functional/NFR-020-bounded-and-safe-compilation.md)
