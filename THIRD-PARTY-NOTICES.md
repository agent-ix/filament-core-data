# Third-party notices

This repository is licensed AGPL-3.0-only with no carve-outs. The crates listed
here are third-party works redistributed or depended upon by the Rust side of
this repository; their upstream licences are preserved and are reproduced at the
locations named below. Nothing here relicenses a third-party work, and nothing
here weakens the AGPL-3.0-only terms of this repository's own source or of the
source its compiler generates.

The list is closed. Issue #21's FR-056 declares that exactly two third-party
crates are used, and the attribution gate fails on a crate present in any
lockfile this work produces — the workspace `Cargo.lock`, the generated crate's
lockfile, or either consumer's — and absent from this file. A transitively
acquired crate is therefore a failing gate, not a silent addition.

## Runtime dependency of the generated crate

| Crate | Version | SPDX | Upstream | Licence text |
|---|---|---|---|---|
| `serde` | 1.0.229 | `MIT OR Apache-2.0` | https://github.com/serde-rs/serde | `LICENSE-MIT` and `LICENSE-APACHE` in the published crate archive |

`serde` is the only entry of the generated crate's `[dependencies]` table, which
is what the published `rust` row of
`fixtures/semantic/v1/positive/target-contracts.json` declares
(`"runtimeDependencies": ["serde"]`). It is pinned with `=` so a resolve cannot
move it, and it is compatible with AGPL-3.0-only: a permissive licence may be
combined into a copyleft distribution, and the reverse is what is forbidden.

`serde` with `features = ["derive"]` pulls `serde_derive` and its proc-macro
support crates at build time. Those are build-time artefacts of the same
upstream project under the same SPDX expression; the attribution gate reads the
lockfiles and fails on any of them that is not covered by an entry here, so the
list is checked rather than asserted.

## Development dependency of the consumer crates

| Crate | Version | SPDX | Upstream | Licence text |
|---|---|---|---|---|
| `serde_json` | 1.0.151 | `MIT OR Apache-2.0` | https://github.com/serde-rs/json | `LICENSE-MIT` and `LICENSE-APACHE` in the published crate archive |

`serde_json` is the JSON front door the FR-061 runtime consumer feeds the
generated crate through. It is a `[dev-dependencies]` entry of the consumer
crates only. It is never a dependency of the generated crate, and it is never a
dependency of `crates/semantic-ir` or `crates/conformance-adapter`, which
declare none at all and carry their own JSON layer.

## Crates that are deliberately absent

| Crate | Why it is not here |
|---|---|
| `regex` | FR-057 refuses it. The pattern this backend must enforce uses four ECMAScript lookaheads, and RE2 — the engine behind `regex` — has no lookahead, so the crate would not solve the problem it looks like it solves. The matcher is generated instead. |
| `chrono`, `time` | The `date`, `datetime` and `duration` newtypes are generated and validated in the crate itself, so the published `serde`-only runtime dependency holds. |
| `uuid` | Same reason: the `uuid` newtype is generated. |
| `proptest`, `arbitrary`, a fuzzer | The property generators, the ECMA-262 reference engine and the mutation harness run on the Node side against the Rust binaries, so the Rust crates take no test-time dependency beyond `serde_json` in the consumers. |
