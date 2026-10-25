---
id: SR-16206
title: "spec-review of package-identity segments in unit typeRefs (filament-core-data PR 303)"
type: SpecReview
analysis: base
scope: "agent-ix/filament-core-data@a08c77ff; spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md; spec/tests.md"
review_set: subset
relationships:
  - target: ix://agent-ix/filament-core-data/FR-146
    type: references
  - target: ix://agent-ix/filament-core-data/TC-1852
    type: references
---

# Spec review of package-identity segments in unit typeRefs (filament-core-data PR 303)

## Summary

Ticket: STD-327 (from QSpec PR #376, STD-308 and STD-309). One spec-review
pass over `git diff origin/main...a08c77ff`. Oracles: FCD FR-146 (the whole
"Quantity type references" section and FR-146-AC-6), FCD
`schema/semantic/v1/common.schema.json#/$defs/packageIdentity`
(`^[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*$`), and QSpec main FR-322
"Model-owned members" step 4 (the STD-309 package-unit naming).

The repository has no CLAUDE.md or AGENTS.md. Gates, run at the head:
`quire validate --scope . 'spec/**/*.md'` exits 0 with 0 failure lines.
origin/main is an ancestor of the head. The PR changes only the spec: no
source, schema, fixture or test outside `spec/` and `reviews/` names
`quire/unit`, so no reader implements FR-146 yet and `make ci` does not
apply.

Examined, clean:

- Consistency with QSpec STD-309. QSpec FR-322 step 4 says a `typeRef`
  `ix://quire/unit/<p>/<name>` whose leading segments `<p>` equal a
  `model_selections` identity names that row's unit, and that any other
  `typeRef` names a source unit by its qualified declaration name. A
  `model_selections` identity is an FCD package identity (`org/name`, each
  segment `^[a-z0-9][a-z0-9._-]*$`). The widened FR-146 admits every such
  `<p>` before a unit name that matches the unit `name` pattern, so every
  name QSpec can spell is now well formed in FCD. QSpec needs no change.
- The change is a strict widening. Every typeRef that was well formed
  before is still well formed. The unit-name segment keeps its pattern.
  FCD still does not resolve `<name>`, so a well-formed name with no
  selection is the consumer's `missing-name`, as before.
- FR-146-AC-9 can fail on each branch: hyphenated and dotted package
  segments are accepted on all three member kinds, and a bad unit name
  (hyphen, leading digit), a bad earlier segment (leading `-` or `.`) and
  an empty segment each refuse `UNRESOLVED_TYPE_REF` at the `typeRef`.
  TC-1852 matches the AC and traces FR-146-CON-1 for reader parity, as
  TC-1842 to TC-1849 do.
- Ids. FR-146-AC-9 and TC-1852 are not on main and are not added by the
  other open FCD PRs (#292, #84).
- Behaviour-only wording. The owner question is labelled "lead default, not
  an owner answer" in the PR body.

## Findings

| ID | Severity | Summary | Refs | Escape Cause |
| --- | --- | --- | --- | --- |
| FND-001 | low | [nit] FR-146 calls `^[a-z0-9][a-z0-9._-]*$` "the package-identity segment pattern ... of `common.schema.json#/$defs/packageIdentity`", but that definition is the whole two-segment pattern `^[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*$` and defines no segment pattern. The rule also admits any number of earlier segments, each matching either pattern, so it is looser than "a package identity followed by a name" (for example `ix://quire/unit/a-b/c.d/e-f/ms` is well formed). That is acceptable because FCD does not resolve the name, but the sentence should say so. Fix: write "the pattern of each `/`-separated segment of `common.schema.json#/$defs/packageIdentity`", and optionally say that the reader checks segment form only, not that the leading segments make up one package identity. | spec/functional/FR-146-carry-clock-fields-and-a-dimension-and-unit-graph.md:250-254 | wrong-requirement |

## Verdict

Mergeable. The widening agrees with QSpec STD-309's `<package identity>/<name>`
naming and needs no QSpec change. FR-146-AC-9 and TC-1852 are testable, and
the ids are unique. FND-001 is a wording nit that can be fixed in this PR or
left. Widening the FCD pattern, rather than reopening STD-309, is a lead
default and not an owner answer, and the PR body says so.
