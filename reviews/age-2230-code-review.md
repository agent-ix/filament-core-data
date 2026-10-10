---
id: SR-257
title: AGE-2230 PR 275 code-review
type: SpecReview
analysis: code-review
scope: agent-ix/filament-core-data@423a922c45101985bfeca57fc2aeca813226e948; PR 275;
  .npmignore, crates/extraction-frontend/src/lower.rs, crates/extraction-frontend/tests/lower.rs,
  crates/semantic-ir/src/lib.rs, crates/semantic-ir/src/rules.rs, src/compiler/backends/rust-serde/crate.mjs,
  test/semantic-kernel.test.ts
review_set: subset
---

## Summary

Ticket: AGE-2230. Reviewed all seven changed paths at the immutable PR #275 head. The decimal policy lookup reads the nested policy from its owning node, the lowerer admits current float scalar names, integer-bound controls enforce canonical strings, and generated numeric comparisons remove a redundant borrow/dereference. The unavailable-adapter control retains a positive case count and asserts status, matched, failed, and unmet counts. No new code defect, stub, duplicate authority, weakened CI lane or source warning suppression was found.

## Verdict

PASS for the PR delta; no new code or Rust findings.

## Findings

| ID | Severity | Summary | Refs |
| --- | --- | --- | --- |
| FND-001 | low | No findings (placeholder) | - |

## Coverage

Scope: exact PR delta plus whole-repository computed matrix. Code-review includes the Rust lane; no spec/plan changes, so spec-review and subanalyses do not apply. No applicable AssuranceProfile exists. The default Rust-style and repository Makefile conventions were read. Optional gap semantic review was not requested. Reverse-gap/source-hollowness inspection is limited to changed behavior; this is not a whole-source completeness claim.

Verified: make rust-build (build and fmt), make rust-clippy, make rust-check (goldens, determinism, rustfmt), make typecheck format-check, and root npm pack inspection (LICENSE, README.md, package.json only). Workspace tests and architecture compilation are recorded separately in the adjacent logs. The first focused Node attempt failed during suite collection because it inherited unavailable Python/Cargo paths; no failed test assertion is attributed to the PR from that attempt. The corrected-environment attempt is recorded separately.

Reconciliation: quoin 0.28.3 / quire 0.36.2 (engine 0.50.2), 155 requirements, 2151 criteria: tagged 221; untagged 1547; tagged-by-ignored-test 4; method-without-symbol 379. All 2151 carry no run evidence. quire matrix --strict exits 1. No changed requirement or trace tag introduced these gaps.

Plan completion: not assessed

Tool friction: the installed pnpm launcher could not open its database; invoking the installed pinned pnpm 10.33.4 directly succeeded. The skill command quoin write --types SpecReview omitted a required repository argument; quoin write . --types SpecReview succeeded. Quire emitted duplicate archetype/inverse warnings from the active module configuration; matrix generation completed.

## Examined scope

```yaml
scope:
- id: .npmignore
  path: .npmignore
  role: examined
  excerpt: '# The private workspace root has no distribution payload. Keep pack inspection

    # from including generated packages or qualification inputs by default.

    *

    '
- id: crates/extraction-frontend/src/lower.rs
  path: crates/extraction-frontend/src/lower.rs
  role: examined
  excerpt: "//! FR-093: lower each object-typed artifact to one IR `typeDefinition`\
    \ \u2014\n//! from the engine's `FieldDecl`s, or through [`crate::enumeration`]\
    \ for an\n//! enumeration, then shaped into its FR-143 construct by\n//! [`crate::constructs`]\
    \ \u2014 with every field, multiplicity, constraint,\n//! identity and nullability\
    \ value taken from the engine's declaration and\n//! never from a name.\n//!\n\
    //! # What a record is a function of\n//!\n//! [`lower_record`] reads the `SemanticExtraction`,\
    \ the FR-092 resolutions\n"
- id: crates/extraction-frontend/tests/lower.rs
  path: crates/extraction-frontend/tests/lower.rs
  role: examined
  excerpt: '//! FR-093: records, fields, constraints, enumerations and the declared

    //! losses, over committed fixture bundles under the fixture-domain

    //! module. Nothing here reads the environment.


    use std::collections::{BTreeMap, BTreeSet};

    use std::fs;

    use std::path::{Path, PathBuf};


    mod common;


    use agent_ix_extraction_frontend::diagnostics::{Code, Diagnostic, Locus, Severity,
    WireCode};

    use agent_ix_extraction_frontend::document::assemble;

    use agent_ix_extraction_frontend::enumeration::VALUE_COLUMN;'
- id: crates/semantic-ir/src/lib.rs
  path: crates/semantic-ir/src/lib.rs
  role: examined
  excerpt: '//! Independent Rust reader for the Filament semantic IR v1 contract.

    //!

    //! Every rule this crate decides is derived from `schema/semantic/v1/*.json`,

    //! `docs/semantic-data-system/contracts-v1.md`, and

    //! `conformance/diagnostic-codes.json`, and from nothing else.

    //! `crates/semantic-ir/RULES.md` beside this file records the derivation source

    //! of each one, and FR-059-CON-1 forbids this crate to read or link

    //! `conformance/oracle/` or `src/compiler/ir/`.

    //!

    //! ```

    //! use agent_ix_se'
- id: crates/semantic-ir/src/rules.rs
  path: crates/semantic-ir/src/rules.rs
  role: examined
  excerpt: '//! The cross-field rules, and the package-context rules.

    //!

    //! Every code emitted here has a `conformance/diagnostic-codes.json` row, and

    //! `crates/semantic-ir/RULES.md` cites the clause each rule was derived from.


    use std::cell::RefCell;

    use std::collections::{BTreeSet, HashMap, HashSet};


    use crate::diag::{child, index, locus_for, owner_for, Located, Severity};

    use crate::json::Json;

    use crate::regex262;

    use crate::schema::SCHEMA_VIOLATION;

    use crate::vocabulary::Shape;


    /// The limits t'
- id: src/compiler/backends/rust-serde/crate.mjs
  path: src/compiler/backends/rust-serde/crate.mjs
  role: examined
  excerpt: "/**\n * The pure crate emitter (FR-056).\n *\n * `emitCrate` returns an\
    \ ordered map of relative path to file text and touches\n * no filesystem: the\
    \ repository `LICENSE` is handed in by `index.mjs`, which is\n * the one module\
    \ in this backend that reads or writes a byte. That split is\n * what makes the\
    \ determinism gate checkable \u2014 a pure function of the request\n * has nothing\
    \ to vary with but the request.\n *\n * Nothing here decides a mapping. Every\
    \ Rust form this module renders was\n * chosen by `mapp"
- id: test/semantic-kernel.test.ts
  path: test/semantic-kernel.test.ts
  role: examined
  excerpt: "import { execFileSync } from \"node:child_process\";\nimport {\n\tcpSync,\n\
    \texistsSync,\n\tmkdirSync,\n\treaddirSync,\n\treadFileSync,\n\trmSync,\n\tstatSync,\n\
    \twriteFileSync,\n} from \"node:fs\";\nimport { tmpdir } from \"node:os\";\nimport\
    \ { join, resolve } from \"node:path\";\nimport Ajv2020 from \"ajv/dist/2020.js\"\
    ;\nimport addFormats from \"ajv-formats\";\nimport { describe, expect, it } from\
    \ \"vitest\";\nimport {\n\tvalidateClauseRef,\n\tvalidateFieldDecl,\n\tvalidateMultiplicity,\n\
    } from \"../packages/semantic-kernel/typescript/va"
- id: FR-050-AC-14
  path: spec/functional/FR-050-validate-and-normalize-the-emitted-ir.md
  role: examined
  excerpt: Every code the table adds for [FR-144](./FR-144-carry-exact-numeric-scalars-under-one-literal-encoding.md)
    (`INVALID_DEFAULT_VALUE`, `INTEGER_OUTSIDE_I128`, `DECIMAL_POLICY_MISSING`, `DECIMAL_POLICY_CONFLICT`,
    `INEXACT_INTEGER`, `INEXACT_NUMBER`) and the FR-144 `INVALID_OPERAND` spellings
    fire from the compiler's reader on a constructed document, and the compiler's
    reader, the TypeScript reader and the Python reader produce the same codes at
    the same pointers for each; an `integer` bound written as the JSON number `1`
    raises `INVALID_OPERAND` and `"1"` raises nothing.
- id: FR-087-AC-15
  path: spec/functional/FR-087-generate-the-kernel-python-package.md
  role: examined
  excerpt: No path under `packages/semantic-kernel/` appears in the packed file list
    of any distribution this repository builds, checked against the packed list rather
    than the manifest text alone; and no file under `.github/` names `semantic-kernel`.
- id: FR-093-AC-6
  path: spec/functional/FR-093-lower-field-declarations-to-ir-fields.md
  role: examined
  excerpt: A `min` constraint on a `String` field raises `agent-ix.extraction-frontend.CONSTRAINT_NOT_APPLICABLE`
    at the row, blocking, and the document is not written; the same (kind, keyword)
    pair handed to `decide` on a type-scoped subject, and on an `alias` targeting
    that subject, yields the reader's `CONSTRAINT_NOT_APPLICABLE`, and the two applicability
    tables agree over the full RULES.md cross product.
- id: FR-144-AC-2
  path: spec/functional/FR-144-carry-exact-numeric-scalars-under-one-literal-encoding.md
  role: examined
  excerpt: On an `integer` subject, a `max` of `"18446744073709551615"`, of `"170141183460469231731687303715884105727"`
    and of `"-170141183460469231731687303715884105728"` is accepted; `"170141183460469231731687303715884105728"`
    and `"-170141183460469231731687303715884105729"` raise `INTEGER_OUTSIDE_I128`
    at the operand naming the value and the limit; `"01"`, `"+1"`, `" 1"`, `"-0"`,
    `"1.0"` and the JSON number `1` raise `INVALID_OPERAND` at the operand.
- id: FR-144-AC-4
  path: spec/functional/FR-144-carry-exact-numeric-scalars-under-one-literal-encoding.md
  role: examined
  excerpt: 'A field typed `ix://quire/native/Decimal` carrying `decimal: {precision:
    5, scale: 2}` is accepted with a `max` of `"999.99"` and a `defaultValue` of `"1.5"`;
    `"1000"` and `"0.001"` raise `INVALID_OPERAND`, `"1.50"`, `"-0"`, `".5"`, `"1e2"`
    and the JSON number `1.5` raise `INVALID_OPERAND`, and a `defaultValue` of `"1.50"`
    raises `INVALID_DEFAULT_VALUE`.'
- id: FR-144-AC-12
  path: spec/functional/FR-144-carry-exact-numeric-scalars-under-one-literal-encoding.md
  role: examined
  excerpt: 'The spec-bundle frontend lifts `versionNumber | Integer | 1 | min: 1`
    with operand `"1"`, a constrained `Decimal` row with policy `(10, 2)` and `min:
    1.50` to an alias carrying `decimal` `{precision: 10, scale: 2}` and operand `"1.5"`,
    and a `Decimal` row with no policy to a blocking `DECIMAL_POLICY_MISSING` at the
    row.'
- id: NFR-032-AC-5
  path: spec/non-functional/NFR-032-non-disruptive-extraction-frontend.md
  role: examined
  excerpt: After the full crate suite runs, `git status --porcelain` is empty in this
    repository's fixture directories.
bindings:
- test_id: tc_1225_min_on_string_is_blocking_constraint_not_applicable_and_the_reader_agrees_over_the_cross_product
  ac_id: FR-093-AC-6
  trace: correct
- test_id: tc_1826_spec_bundle_lifts_numeric_rows_and_canonicalizes_the_ir
  ac_id: FR-144-AC-12
  trace: correct
```


## Final gate results

`make spec-to-targets` passed (all five targets including architecture compile checks). The corrected-environment unavailable-adapter Vitest case passed: 1 passed, 51 filtered. Workspace `make rust-test` failed at unchanged `crates/extraction-frontend/tests/payload.rs:195`, TC-1293: `["createdAt: required", "createdBy: required", "data: required", "hash: required", "id: required"]`. The test reads an unchanged committed snapshot fixture; neither source of this failure changed in PR #275. This is an inherited full-gate failure, not a full gate pass. Changed lowerer tests TC-1224, TC-1225 and TC-1826 passed in that run. The worktree is clean at the reviewed SHA.
