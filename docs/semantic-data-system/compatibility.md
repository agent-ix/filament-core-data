---
id: ARCH-008
title: "Cross-representation compatibility policy"
status: normative
---
# Cross-representation compatibility policy

Compatibility is evaluated at the semantic-package level and projected into
each generated target. A change is not additive merely because one language can
compile it; all published consumer surfaces and retained compatibility formats
must agree.

## Change classes

| Class | Semantic effect | Release posture |
|---|---|---|
| Patch | Documentation, metadata, or generator correction with identical accepted values and meaning | Patch release after deterministic-output and fixture checks |
| Additive | New optional field/type/variant or capability that old readers can preserve or ignore safely | Minor release after cross-target compatibility checks |
| Breaking | Required field, removal, incompatible rename/type/meaning change, closed-enum expansion, identity change, or unknown-field rejection change | Major release plus staged consumer migration and human cutover |

## Required evolution rules

- A new **required field** is breaking unless every existing representation has
  an unambiguous compatible default whose semantics were already part of the
  contract.
- A field **removal** remains readable through a deprecation window and is
  breaking when old data or readers still rely on it.
- A **rename** uses a new stable field identity plus an alias/migration period;
  changing only a generated language identifier must not change semantic identity.
- An **enum** addition is additive only for open-enum consumers. Closed generated
  enums require an unknown variant or coordinated breaking release.
- **Unknown field** behavior is explicit per profile: preserve, ignore with
  provenance, or reject. Silent inconsistent defaults across targets are forbidden.
- Protobuf field numbers and enum numbers are never reused; removed numbers and
  names are **reserved**.
- JSON Schema `$id`, package identity, and semantic type/field identities remain
  stable across compatible releases.

## Representation-specific checks

| Target | Mandatory check |
|---|---|
| Rust | Old/new Serde fixtures, enum/unknown behavior, compile contract, conversion loss |
| TypeScript | Static API diff plus runtime-validator agreement |
| Python | Typed-model API diff plus validation/serialization fixtures |
| JSON Schema | Schema-diff classification and old/new instance validation |
| Protobuf | Descriptor compatibility, reserved numbers/names, unknown-field round trip |
| PostgreSQL | Additive DDL, row counts, backfill idempotency, dual-read/write, backup/restore, rollback rehearsal |
| Arrow/Parquet | Field IDs/names/types/nullability, metadata/provenance, old dataset readability |
| Markdown | Quire parse/validate/extract behavior, stable identity, structural and semantic round trips |

## Retired Avro boundary

The checked-in Avro protocol and its generated TypeScript/Python bindings were
retired after the final consumer census found zero in-scope readers and the
owner approved the irreversible cutover for issue #6. The repository retains
Avro only as a representation vocabulary where semantic contracts explicitly
name it; it no longer ships an Avro contract, adapter, or language binding.

## Unknown and stale consumers

An incomplete census keeps the compatibility gate closed. A consumer that is
unknown, unreachable, or stale is recorded explicitly; absence of a response is
not cutover evidence. Compatibility may be waived only by a named human decision
that records owner, impact, and rollback—not by silently deleting the consumer
from the list.
