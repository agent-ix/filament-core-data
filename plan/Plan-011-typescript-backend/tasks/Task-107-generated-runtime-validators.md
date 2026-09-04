---
id: Task-107
title: "The generated runtime validators and the structural-code register"
type: Task
status: done
track: B
priority: P0
relationships:
  - target: "ix://agent-ix/filament-core-data/Task-106"
    type: depends_on
  - target: "ix://agent-ix/filament-core-data/FR-066"
    type: references
  - target: "ix://agent-ix/filament-core-data/TC-778"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-779"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-780"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-781"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-782"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-783"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-784"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-785"
    type: verifies
  - target: "ix://agent-ix/filament-core-data/TC-786"
    type: verifies
---
# Task-107: The generated runtime validators and the structural-code register

## Scope

Land `validators.mjs`: a self-contained runtime validator per exported type that decides an untrusted value against the semantic contract with an RFC 6901 pointer and a stable code on every failure, with no unsafe cast and no third-party runtime dependency.

## Subtasks

- [x] Generate one pure function per type returning `{ ok: true; value: T } | { ok: false; errors: readonly ValidationError[] }`, narrowing on success without a cast and never throwing for invalid input.
- [x] Carry `pointer`, `code` and `message` on every `ValidationError`, using the constraint's own `diagnosticCode` for a constraint failure and a code from the closed structural register otherwise.
- [x] Decide absence by an own-property test rather than by comparing the read value with `undefined`, and reject a property present with the value `undefined` for a required and an optional field alike — the generated package is compiled under `exactOptionalPropertyTypes` and an explicit `undefined` is not a member of the declared type.
- [x] Implement the four presence/nullability decisions as four distinct accept/reject tables, and apply the presence and nullability decision to a collection and the element decision to each member.
- [x] Implement every one of the eleven constraint keywords with the operand reading its branch declares, resolving the constraint's subject through the alias chain first.
- [x] Count `minLength`/`maxLength` in Unicode code points for a `string` subject and in decoded octets for a `bytes` subject, and state the base64 reading as a declared decision pending issue #58.
- [x] Compile a `pattern` operand's regex exactly as written, adding no anchor, flag or escape.
- [x] Reject a non-integral number, `NaN`, `±Infinity` and a magnitude above `Number.MAX_SAFE_INTEGER` for an `integer` subject, each with its own structural code; accept `-0` wherever `0` is accepted.
- [x] Implement `unknownPolicy`: `reject` invalidates at a pointer on the unknown member, `surface` reports it as a non-fatal surfaced error distinguishable from a rejection, and `preserve` carries it through to the result value unchanged as a separately named member rather than by widening the type with an index signature.
- [x] Enforce `ordered` and `unique` where declared, comparing elements by their canonical form rather than by reference.
- [x] Apply a `semantic` default when the property is absent, and never apply a `representation` or a `migration` default.
- [x] Harden against the object-shape hazards: `__proto__`, `constructor` and `prototype` as member names, a null-prototype input, a getter that throws, and `Symbol.toPrimitive`.
- [x] Terminate over a recursive type with a declared depth bound and a stable code at the bound, so a hostile input cannot exhaust the stack.
- [x] Order the error list by pointer then code, code point, never by locale; import nothing outside the generated package; read no clock, environment or network.
- [x] Generate the closed structural-code register into `errors.ts`, the eighth member of the emitted file set.

## Deliverables

- `src/compiler/backends/typescript-v1/validators.mjs`, `validators.d.mts`
- The generated `validators.ts` and `errors.ts` modules

## Notes

- The generated source contains no type assertion (`as <Type>`, `<Type>value`, non-null `!`), no `any` in a type position and no `@ts-expect-error`, measured syntactically. `as const` is mandated by FR-067 and is permitted.
- There is no third-party runtime validator. The generated in-package validator is what satisfies the target contract's declared `runtime-schema-validator` dependency, which is strictly stronger than the declaration.
