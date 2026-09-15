---
id: ARCH-011
title: "Staged semantic data program roadmap"
status: normative
---
# Staged semantic data program roadmap

This roadmap orders the program; it does not activate blocked tickets. Readers
move before writers, additive paths precede replacement, and every disruptive
wave has a human go-or-hold decision.

## Program waves

| Wave | Outcome | Required gate before promotion |
|---|---|---|
| 1. Record and census | Durable architecture plus Filament and Quire/Quoin inventories | **advisory gate:** reviews are complete, evidence-backed, and active-work conflicts have owners |
| 2. Feasibility and detailed spec | TypeSpec decision (recorded in ADR-0005) plus semantic IR/package/projection specification | Reviewed issue #9 specification |
| 3. Compiler and packages | Deterministic compiler, generated semantic-core/module packages, compatibility classifier, and retained legacy bridges | **compatibility gate:** cross-language golden fixtures and selected active target readers agree; retired boundaries have a zero-reader census |
| 4. Consumer readiness | Complete consumer census, version availability, adapter plans, and rollback ownership | All known consumers classified; unknown/stale consumers keep the gate closed |
| 5. Additive consumer migration | New readers first, then dual-write or additive writers where necessary | Per-consumer evidence; no shared replacement hidden in a feature PR |
| 6. Persistence and analytics | Governed PostgreSQL changes plus Arrow/Parquet QA projections | **database gate:** backup/restore, row counts, idempotent backfill, dual-read, and rollback rehearsal pass |
| 7. Publication | Versioned packages available to every target consumer | **publication gate:** deterministic builds, signatures/provenance, registry availability, and install tests pass |
| 8. Cutover and retirement | New authority/writers selected and legacy paths removed | **final cutover gate:** every known reader migrated, rollback retained, owners explicitly approve |

## Gate behavior

Every gate records evidence, reviewer, date, decision, known unknowns, and a
go-or-hold result. “No response,” “tests unavailable,” and “consumer unknown” are
hold conditions, not implied passes. A high corpus failure rate causes the
advisory gate to pause or hold; the contract is not weakened automatically.

## Database rollback contract

Any database wave records pre/post row counts, backup and restore verification,
schema and data migration versions, idempotent backfill evidence, dual-read/write
comparison, performance impact, and a rehearsed rollback. Destructive DDL is
forbidden before final cutover.

## Stop conditions

Promotion stops when:

- active feature work owns an overlapping DTO, schema, persistence, extraction,
  or API boundary;
- compatibility fixtures diverge across Rust, TypeScript, Python, JSON Schema,
  or a selected active wire/storage target;
- a provisional decision is treated as final;
- rollback or consumer ownership is missing;
- corpus evidence is incomplete or materially fails the proposed contract.

Stopping a migration ticket does not force unrelated board moves. The ticket
records the owner/dependency and resumes only after the named condition changes.
