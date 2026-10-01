---
id: FR-006
title: Snapshot Entity
object: entity
type: FR
name: Snapshot
relationships:
  - target: "ix://agent-ix/docs-service/FR-005"
    type: references
---

# FR-006: Snapshot Entity

## Description

The service SHALL persist configuration versions as immutable `Snapshot` entities.

## Properties


```sysml
  attribute id : UUID[1] { identity }
  attribute versionNumber : Integer[1] { min: 1 }
  attribute data : JsonObject[1]
  attribute hash : String[1] { nonEmpty }
  ref item parent : Snapshot[0..1]
  attribute createdAt : Timestamp[1]
  attribute createdBy : String[1] { maxLength: 64 }
```
## Invariants

### immutable

```ocl
context Snapshot inv immutable: self.versionNumber = self.versionNumber@pre and self.data = self.data@pre and self.hash = self.hash@pre
```
