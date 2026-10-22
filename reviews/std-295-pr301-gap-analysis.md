---
id: SR-15523
title: STD-295 PR 301 gap-analysis
type: SpecReview
analysis: gap-analysis
scope: "agent-ix/filament-core-data@2469e44cf3ad15cf6f1df0fc7ba35c6b803070cb; PR 301; spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md, spec/tests.md"
review_set: subset
---

## Summary

Ticket: STD-295. Planless gap analysis of the spec-only PR at head 2469e44c. `quire matrix --scope .` lists FR-146-AC-1 to AC-8, CON-1 and CON-2 as `untagged`, with no binders. The PR adds no production code, schema or fixture, and the PR body assigns the implementation to QSL-882 (schema, readers and backends). No code outside `spec/` carries an FR-146 tag, and none claims the behaviour.

## Verdict

PASS for a spec-only change. No gap is attributable to this PR. The untagged criteria are the expected state until QSL-882 lands, and every AC and CON has a TC row (TC-1842 to TC-1849) ready for that work. The defects that block merging are in the spec text, recorded in SR-15520 and SR-15522.

Plan completion: not assessed

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | low | No findings (placeholder) | - |

## Coverage

- Requirement to TC: FR-146-AC-1 to AC-8 map to TC-1842 to TC-1849, CON-1 to TC-1842 to TC-1845 and TC-1847, and CON-2 to TC-1848.
- TC to test: none yet (all untagged), owned by QSL-882.
- Code with no owning requirement: none in the diff.

## Examined scope

```yaml
scope:
- {id: FR-146, path: spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md, role: examined, excerpt: "The semantic IR at contract `2.0.0` SHALL carry three things a timed domain model needs"}
- {id: spec/tests.md#TC-1842..TC-1849, path: spec/tests.md, role: examined, excerpt: "TC-1842 .. TC-1849 rows mapping FR-146-AC-1..AC-8, CON-1, CON-2"}
```
