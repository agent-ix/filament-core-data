---
id: FR-136
title: "Register the Python backends in the generation seam"
type: FR
relationships:
  - target: "ix://agent-ix/filament-core-data/US-019"
    type: "implements"
  - target: "ix://agent-ix/filament-core-data/FR-063"
    type: "depends_on"
---
# FR-136: Register the Python backends in the generation seam

## Description

The generation seam SHALL route a `python-pydantic-v2` or `python-dataclass`
target request to the Python backend and return its generated package, rather
than refusing either target as unimplemented.

[FR-063](./FR-063-declare-the-generation-backend-seam.md) states the mechanism a
registration replaces, and
[FR-130](./FR-130-register-the-rust-backend-in-the-generation-seam.md) is the
same replacement for `rust`. Python is the last declared target still reachable
only through a private command, which is what this requirement retires.

Two properties make this a route rather than a second implementation, and both
are stated because neither is obvious:

The generator is a Python program, so the path crosses a process boundary.
[ADR-0006](../../docs/semantic-data-system/adr/0006-frontend-host-boundary.md)
already settles that boundary: the effect is injected, one module outside the
pure set holds it, and the consumer never learns a process is involved. This
requirement adopts that decision rather than opening it again, which is why a
caller that injects no producer is refused instead of being served an empty
package.

The backend generates from JSON Schema, not from the IR. That is the shape of
the dependency and not a convenience — `datamodel-code-generator` reads JSON
Schema, so the IR reaches Python through the `json-schema` target's own
emission. The consequence is the point: there is no second lowering that could
drift from the one a `json-schema` consumer receives.

## Inputs

- A `compiler-request.schema.json` document carrying a semantic IR document
- The selected target name, one of `python-pydantic-v2` or `python-dataclass`
- The caller's injected host, through which repository artifacts are read
- The caller's injected producer, which runs the Python generator

## Outputs

- An `output-manifest.schema.json` document naming the Python backend's identity
- The generated package's files, each path relative to the request's output root
- `src/compiler/backends/python-v1/index.mjs`, the backend's contract with the
  seam, carrying no file-system and no child-process import
- `src/compiler/backends/python-v1/produce.mjs`, the one module that starts the
  generator's process, imported by the command line and by no backend
- `python_backend/runner/seam.py`, the generator's side of that boundary

## Behavior

- The generation seam SHALL select the Python backend when the caller names
  either Python target.
- The Python backend SHALL run the generator under the immutable profile its
  target declares in `python_backend/profiles.json`, and SHALL NOT restate that
  profile's settings.
- The Python backend SHALL hand the generator the `json-schema` target's own
  emitted documents, under the names that emission gave them.
- The Python backend SHALL hand the generator the `json-schema` target's
  `index.json` beside the documents, not among them, so the construct module
  can read the document's populations.
- The Python backend SHALL render every contract `2.0.0` construct kind by
  the rows of its identity and shape and the members it carries, and every
  model member by its own row, in the construct table below; it SHALL name no
  module construct kind in its source and SHALL NOT render one construct as
  another.
- The Python backend SHALL report a lowering refusal unchanged, rather than
  restating it in a second vocabulary.
- The Python backend SHALL refuse when no producer is injected, and SHALL NOT
  return an empty file set in its place.
- The Python backend SHALL report a producer that cannot run, exits non-zero, or
  answers with something other than a file map as a failed generation.
- The Python backend SHALL NOT start a child process directly when generating
  through the seam.
- The command-line entry point SHALL inject the repository's producer when the
  caller selects a Python target.

## Emitted set (ADR-0007)

[ADR-0007](../../docs/semantic-data-system/adr/0007-emitted-set-contract.md) specifies
the emitted set as five concepts realised idiomatically per language, not as a
filename contract. This section names where each concept lands in this target, as
that decision requires.

| ADR-0007 concept | Where it lands in this target |
|---|---|
| Types | one module per source schema document, named by the document's file name, which the `json-schema` target derives from the type's `displayName`, under the selected profile's model style |
| Validation | Pydantic's own validation, a property of the wrapped generator's chosen library and a legitimate realisation rather than a gap |
| Diagnostics | the seam's registry-coded refusals returned with the generation; this target emits no diagnostics module |
| Semantic identity | **not carried today.** `datamodel-code-generator` drops the `x-agent-ix-semantic-id` annotation the JSON Schema documents carry, so no emitted module declares it. Declared here as a gap owned by this requirement's backend rather than left unstated |
| Provenance | `PROVENANCE.json` |

## Constructs (FR-142)

A contract `2.0.0` type reaches this target as the `json-schema` target's
schema for it (FR-100). `datamodel-code-generator` reads a document's instance
shape and drops every `x-agent-ix-*` annotation, so the runner renders the
construct annotations into one more module of the same package,
`constructs.py`, read from the same documents, and completes the generated
classes before it renders that module. Every constant in it is keyed by the
generated class name: the class the generator declared for the type, or, for a
construct shaped `interface` or `namespace`, which has no class, its `displayName` in class case, so
`Order Repository` is keyed `OrderRepository`.

| Construct or member | Rendering |
|---|---|
| `identified` constructs (business `entity`, `nested_entity`, `aggregate_root`, `process`) | the record's model class, whose `__eq__` and `__hash__` compare the canonical JSON form of its identity fields, so two instances with equal identity fields are one instance. Each identity field is read-only once constructed, because an instance's identity does not change once constructed: assigning or deleting it raises `AttributeError`, while its other fields stay assignable. `IDENTITY_FIELDS` names those fields |
| `value` × `record` (business `value_object`) | the record's model class, whose generated equality is field-by-field; `VALUE_EQUALITY` marks it |
| `identified` × `record` carrying `owner` (business `nested_entity`) | `OWNER` names the owner class |
| constructs carrying `members` (business `aggregate_root`, `domain`) | `MEMBERS` names the member classes |
| `none` × `enumeration` (business `enumeration`) | a `StrEnum` of its variants |
| `none` × `record` carrying `occurrenceField` (business `event`) | the record's model class, frozen: `ConfigDict(frozen=True)` on a pydantic model and `@dataclass(frozen=True)` on a dataclass, and declared unhashable with `__hash__ = None`, since an occurrence has no identity to hash by; `OCCURRENCE_FIELD` names the occurrence field and `IMMUTABLE` marks it |
| `none` × `state_machine` (business `state_machine`) | the machine's model class plus a `<Name>State` `StrEnum` of its states; `TRANSITIONS` lists each transition as (from, to, trigger, guard, emitted events) |
| `identified` × `sequence` (business `process`) | `STEPS` lists its ordered steps as (name, step kind, consumed events, emitted events) |
| `none` × `interface` (business `repository`) | a `typing.Protocol` in `constructs.py` whose methods are its operations, snake-cased, typed by the generated classes; `PERSISTS` names the persisted classes. No module of its own, since its schema admits no value |
| `none` × `namespace` (business `domain`) | no class, since its schema admits no value; `MEMBERS` and `VOCABULARY` in `constructs.py` |
| `supertypes` | the subtype's class carries its supertypes' fields and registers with each abstract ancestor, so `isinstance` holds; `SUPERTYPES` names the supertypes |
| `abstract` | an `abc.ABC` with one abstract property per field, which does not construct; `ABSTRACT` marks the type |
| `subsets`, `redefines` | `FIELD_SUBSETS` and `FIELD_REDEFINES`, by class and field name |
| operation `frame`, `requires`, `ensures` | `OPERATION_FRAMES` and `OPERATION_CLAUSES`, keyed `<Class>.<operation>` |
| document `populations` | `POPULATIONS`, each member as (class, lower, upper extent), read from `index.json` |
| `TYPE_KIND` | the construct kind of each type |

Carried, not enforced: clauses
[#159](https://github.com/agent-ix/filament-core-data/issues/159), guards
[#160](https://github.com/agent-ix/filament-core-data/issues/160), transitions
[#161](https://github.com/agent-ix/filament-core-data/issues/161), subsets
[#162](https://github.com/agent-ix/filament-core-data/issues/162), frames
[#163](https://github.com/agent-ix/filament-core-data/issues/163) and populations
[#164](https://github.com/agent-ix/filament-core-data/issues/164) are carried in
`constructs.py` as data and checked by no generated code; the backend emits one
non-blocking `CONSTRUCT_MEMBER_UNENFORCED` per member kind the document declares.

The runner refuses, and the producer exits non-zero, when a generated module is
named `constructs.py` in any letter case, a type's field holds a value of an abstract type (a `reference` to one holds its identity and is allowed), a type's name
derives no Python class name, or an identity field is no attribute of its
generated class.

## Constraints

| ID | Constraint | Type | Validation |
|----|------------|------|------------|
| FR-136-CON-1 | The files generated through the seam SHALL be byte-identical to the package the runner's own entry point generates from the same schema documents | Integrity | Test |
| FR-136-CON-2 | The module the seam imports SHALL import no file-system and no child-process module, so registering a backend leaves the seam pure for every target | Design | Inspection |
| FR-136-CON-3 | The schema documents handed to the generator SHALL be the `json-schema` target's own bytes under its own names, so no rename can break a `$ref` that resolved before it | Integrity | Test |

## Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| FR-136-AC-1 | Both Python targets are registered as implemented and name this requirement's backend identity | Test (TC-1530) |
| FR-136-AC-2 | A `python-pydantic-v2` request over an accepted IR document returns state `success` with a non-empty file set and zero blocking diagnostics | Test (TC-1531) |
| FR-136-AC-3 | A `python-dataclass` request over the same document returns state `success` under its own profile | Test (TC-1532) |
| FR-136-AC-4 | A request with no injected producer returns state `unavailable` carrying `BACKEND_CONTRACT_VIOLATION`, and no files | Test (TC-1533) |
| FR-136-AC-5 | A producer that exits non-zero returns state `invalid` carrying `BACKEND_CONTRACT_VIOLATION` naming the profile, and no files | Test (TC-1534) |
| FR-136-AC-6 | The documents handed to the producer are the `json-schema` target's own documents under its own names, with its manifest excluded | Test (TC-1535) |
| FR-136-AC-7 | The module the seam imports for the Python backend names no file-system and no child-process module | Test (TC-1536) |
| FR-136-AC-8 | A `python-pydantic-v2` and a `python-dataclass` request over a `2.0.0` document whose `ConfigVersion` is an `entity` each return state `success` with a `ConfigVersion.py` module declaring class `ConfigVersion`, and a `constructs.py` whose `TYPE_KIND` maps it to `entity` and whose `IDENTITY_FIELDS` maps it to `id` | Test (TC-1765) |
| FR-136-AC-9 | A `python-pydantic-v2` and a `python-dataclass` request over the lifted config-version-table golden each return state `success` with `ConfigVersion.py` and `JsonObject.py` modules and no module named from an artifact id, while the `json-schema` document the modules generate from carries `x-agent-ix-semantic-id` `ix://agent-ix/config-service/type/FR-006` | Test (TC-1769) |
| FR-136-AC-10 | A `python-pydantic-v2` and a `python-dataclass` request over the constructs fixture each return state `success`; every class is named by its type's `displayName` and none is named `Model`; `OrderLifecycle.py` declares `OrderLifecycleState`; no module is named for the repository or the domain; and `constructs.py` carries each construct table row and the `OrderRepository` protocol | Test (TC-1775) |
| FR-136-AC-11 | Over the constructs fixture, in both Python targets, two `Order` instances with one `id` and different other fields are equal and hash equal, instances with different `id`s are unequal, an `Order` is an instance of `Party`, `Party()` raises `TypeError`, assigning an `Order`'s `id` raises `AttributeError` while assigning its `status` succeeds, assigning a field of an `OrderPlaced` instance raises, and `hash` of an `OrderPlaced` raises `TypeError` | Test (TC-1783) |
| FR-136-AC-12 | `constructs.py` over an entity titled `Config Overlay` and a repository titled `Order Repository` keys every table `ConfigOverlay` and `OrderRepository` and compiles; rendering beside a generated `constructs.py` or `Constructs.py`, refining a type whose field holds an abstract type, and refining an identity field its class does not declare each raise `ConstructError`, while a field holding a `reference` to the abstract type refines | Test (TC-1784) |

## Dependencies

- **Upstream**: [US-019](../usecase/US-019-reach-every-generated-target-through-one-seam.md) reaching every target through one seam; [FR-063](./FR-063-declare-the-generation-backend-seam.md) the seam and its registry
- **Downstream**: [FR-132](./FR-132-answer-the-conformance-corpus-from-python.md) the Python surface the corpus already exercises, unchanged by this requirement
