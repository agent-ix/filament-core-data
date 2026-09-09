---
id: FR-001
title: Audit
object: entity
type: FR
---

# FR-001: Audit

## Description

An authored fixture artifact.

## Properties

| Field | Type | Multiplicity | Constraints |
|-------|------|--------------|-------------|
| id | UUID | 1 | identity |
| createdBy | String | 1 | maxLength: 64 |
| code | String | 1 | pattern: /^[a-z]+$/ |
| mode | String | 1 | enumValues: a\|b |
| contact | String | 1 | format: iana:email |
| count | Integer | 1 | min: 1, max: 10 |
| payload | Bytes | 1 | nonEmpty, minLength: 1 |
