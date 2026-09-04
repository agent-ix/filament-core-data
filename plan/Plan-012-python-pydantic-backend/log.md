---
type: log
title: "Plan-012 — Update Log"
description: "Chronological log of changes to the Plan-012 bundle."
---
# Plan-012 — Update Log

## History

* **2026-09-04** — Plan created from the corrected issue #23 specification (US-013, FR-072..080, NFR-026..027, TC-845..944, SR-097..104) with thirteen tasks. Two of them exist because the review found the ground was not what the specification assumed. Task-081 converts the six merged suites that still baseline their changed-path gates on a moving ref: with those unconverted, any new directory this bundle adds makes them red, and the only alternative is widening six permitted-path lists, which issue #55 records as how those guards were disabled incrementally in the first place. Task-088 replaces the corpus obligation the first draft delegated to issue #52: the `python-backend` slot's owning issue is #23, and it needs an IR reader emitting contract diagnostics, which a package of generated types cannot be — so the bundle produces a read-only account and files the reader rather than claiming a blocker.
