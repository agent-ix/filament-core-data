---
id: ARCH-RET-001
title: "Legacy Avro boundary retirement"
status: normative
---
# Legacy Avro boundary retirement

Issue #6's final consumer census found no in-scope production reader of the
checked-in Avro protocol. `filament-ide`, the only locally discovered external
dependency, is out of scope by the 2026-09-13 owner amendment.

The owner approved irreversible retirement on 2026-09-14. This change removes
the Avro protocol, generated TypeScript and Python bindings, generator,
representative Avro fixture, package exports, and manual npm/Python binding
release workflows. The semantic representation vocabulary remains intact: an
artifact may still describe Avro as a format without reviving this retired
package boundary.

Each removal is isolated in this commit, so reverting it restores the retired
boundary without changing the semantic kernel packages or their consumers.
