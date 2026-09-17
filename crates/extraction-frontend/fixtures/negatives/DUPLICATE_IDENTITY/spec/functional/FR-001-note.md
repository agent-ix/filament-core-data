---
id: FR-001
title: Note
object: entity
type: FR
---
# FR-001: Note

## Description

An authored fixture record whose constrained field mints the `NoteRevision`
alias.

## Properties

| Field | Type | Multiplicity | Constraints |
|-------|------|--------------|-------------|
| revision | Integer | 1 | min: 1 |
| id | UUID | 1 | identity |
