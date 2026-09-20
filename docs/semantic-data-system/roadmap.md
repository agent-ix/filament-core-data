---
id: ARCH-011
title: "Staged semantic data program roadmap"
status: normative
---
# Staged semantic data program roadmap

This document records the gate definitions, gate behavior, database rollback
contract, and stop conditions that govern disruptive changes to the semantic
data program. It does not activate blocked tickets.

## Gate behavior

Every gate records evidence, reviewer, date, decision, known unknowns, and a
go-or-hold result. “No response,” “tests unavailable,” and “consumer unknown” are
hold conditions, not implied passes. A high corpus failure rate causes the
advisory gate to pause or hold; the contract is not weakened automatically.

## Compatibility gate

Cross-language golden fixtures and every selected active target reader agree,
and any retired boundary carries a zero-reader census.

## Database gate: rollback contract

Any database wave records pre/post row counts, backup and restore verification,
schema and data migration versions, idempotent backfill evidence, dual-read/write
comparison, performance impact, and a rehearsed rollback. Destructive DDL is
forbidden before final cutover.

## Publication gate

Builds are deterministic, signatures and provenance are attached, the registry
holds the release, and install tests pass.

## Final cutover gate

Every known reader has migrated, rollback is retained, and owners explicitly
approve.

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
