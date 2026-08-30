---
id: ADR-0003
title: "Select representations per measured boundary"
type: ADR
status: normative
---
# ADR-0003: Select representations per measured boundary

## Context

The ecosystem uses PostgreSQL and TypeScript/React heavily, Rust for CLIs and
backends, Python for some backends, JSON for broad interoperability, Avro for the
current core contract, and Markdown for authored knowledge. Protobuf and Arrow
solve different performance and shape problems.

## Decision

Use representation profiles and evidence to choose formats per boundary:

- Markdown for authored/reviewed knowledge and LLM-oriented text;
- JSON plus JSON Schema for portable dynamic interchange and validation;
- PostgreSQL for transactional state;
- Protobuf for measured compact typed RPC/event boundaries;
- Avro as the retained current compatibility representation and where its
  ecosystem is specifically useful;
- Arrow for in-memory columnar interchange and Parquet for durable analytics;
- CSV/TSV only for constrained flat exchange with an external schema.

Exports, targets, mappings, and profiles remain separate. Loss, failure,
provenance, determinism, purity, and effects are explicit.

## Consequences

- There is no forced Protobuf-versus-Arrow-versus-JSON winner.
- A service can use Protobuf while QA materializes the same semantic occurrences
  as Arrow/Parquet and a report projects them to Markdown.
- Specialized formats require measured benefit and compatible adapters.
- Cross-format golden fixtures and schema diffs become release evidence.

## Alternatives considered

- **Protobuf everywhere:** rejected because it is poor for authored prose,
  dynamic LLM exchange, databases, and analytics.
- **Arrow everywhere:** rejected because columnar batches are not transactional,
  human-authored, or ideal control-plane messages.
- **JSON everywhere:** rejected because some measured wires and analytical
  workloads justify binary/columnar formats.
- **Avro everywhere:** rejected as an assumption about future best fit, while
  preserving its existing consumers.

## Compatibility

No existing boundary changes. A future format change remains additive until all
known readers pass and the owning cutover gate approves retirement.

## Supersession

Supersedes no prior decision.
