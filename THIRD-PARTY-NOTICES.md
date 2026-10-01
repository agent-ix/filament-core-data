# Third-party notices

This repository is licensed AGPL-3.0-or-later with no carve-outs. The crates listed
here are third-party works redistributed or depended upon by the Rust side of
this repository; their upstream licences are preserved and are reproduced at the
locations named below. Nothing here relicenses a third-party work, and nothing
here weakens the AGPL-3.0-or-later terms of this repository's own source or of the
source its compiler generates.

The list is closed. Issue #21's FR-056 declares that exactly two third-party
crates are used. A transitively acquired crate is an addition to this file, not
a silent one. Versions are the lock's business and are not repeated here.

## Runtime dependency of the generated crate

| Crate | SPDX | Upstream | Licence text |
|---|---|---|---|
| `serde` | `MIT OR Apache-2.0` | https://github.com/serde-rs/serde | `LICENSE-MIT` and `LICENSE-APACHE` in the published crate archive |

`serde` is the only entry of the generated crate's `[dependencies]` table, which
is what the published `rust` row of
`fixtures/semantic/v1/positive/target-contracts.json` declares
(`"runtimeDependencies": ["serde"]`). It is pinned with `=` so a resolve cannot
move it, and it is compatible with AGPL-3.0-or-later: a permissive licence may be
combined into a copyleft distribution, and the reverse is what is forbidden.

`serde` with `features = ["derive"]` pulls `serde_derive` and its proc-macro
support crates at build time. Those are build-time artefacts of the same
upstream project under the same SPDX expression; the attribution gate reads the
lockfiles and fails on any of them that is not covered by an entry here, so the
list is checked rather than asserted.

## Development dependency of the consumer crates

| Crate | SPDX | Upstream | Licence text |
|---|---|---|---|
| `serde_json` | `MIT OR Apache-2.0` | https://github.com/serde-rs/json | `LICENSE-MIT` and `LICENSE-APACHE` in the published crate archive |

`serde_json` is the JSON front door the FR-061 runtime consumer feeds the
generated crate through. It is a `[dev-dependencies]` entry of the consumer
crates only. It is never a dependency of the generated crate, and it is never a
dependency of `crates/semantic-ir` or `crates/conformance-adapter`, which
declare none at all and carry their own JSON layer.

## Build-time dependency of the Python generation route

| Package | SPDX | Upstream | Licence text |
|---|---|---|---|
| `datamodel-code-generator` | `MIT` | https://github.com/koxudaxi/datamodel-code-generator | `LICENSE` in the published distribution |

Copyright (c) 2019 Koudai Takahashi. `datamodel-code-generator` is an attributed,
pinned third-party dependency of `python_backend/`; its licence is preserved and
its source is neither vendored nor forked. It is a build-time dependency and
appears in no emitted package's closure.

## Crates that are deliberately absent

| Crate | Why it is not here |
|---|---|
| `regex` | FR-057 refuses it. The pattern this backend must enforce uses four ECMAScript lookaheads, and RE2 — the engine behind `regex` — has no lookahead, so the crate would not solve the problem it looks like it solves. The matcher is generated instead. |
| `chrono`, `time` | The `date`, `datetime` and `duration` newtypes are generated and validated in the crate itself, so the published `serde`-only runtime dependency holds. |
| `uuid` | Same reason: the `uuid` newtype is generated. |
| `proptest`, `arbitrary`, a fuzzer | The property generators, the ECMA-262 reference engine and the mutation harness run on the Node side against the Rust binaries, so the Rust crates take no test-time dependency beyond `serde_json` in the consumers. |

## Transitive dependencies of the extraction frontend crate (issue #36)

The extraction frontend, `crates/extraction-frontend` (issue #36, FR-091..099,
NFR-031..033), is the third workspace member and the first to declare
dependencies: `quire-rs` (git) for the spec-bundle engine,
`agent-ix-semantic-ir` by `path`, and `serde`, `serde_json`, `sha2` and `clap`
directly, with `ix-trace-rs` and `tempfile` as development dependencies. Every
crate in this section reaches the workspace `Cargo.lock` through those
declarations — most of them transitively through `quire-rs`, whose own
development graph the lock also records — and none of them is a dependency of
the generated crate, of either consumer crate, or of `crates/semantic-ir` or
`crates/conformance-adapter`, which still declare none at all. The two sections
above and the closed list they describe are unchanged: `regex`, `time`,
`uuid` and `proptest` appear below because `quire-rs` links them, not because
the Rust/Serde backend does.

The rows are the non-member packages of `cargo metadata --locked
--offline`, in the same shape as the rows above.
`crates/extraction-frontend/THIRD-PARTY-NOTICES.md` carries the crate-local
register. `quire-rs` and `ix-trace-rs` are AGPL-3.0-or-later, the same
licence as this work.

| Crate | SPDX | Upstream | Licence text |
|---|---|---|---|
| `agent-ix-semantic-schema` | `AGPL-3.0-or-later` | https://github.com/agent-ix/filament-core-data | `LICENSE` in the repository at the pinned tag |
| `ahash` | `MIT OR Apache-2.0` | https://github.com/tkaitchuck/ahash | licence files in the published crate archive |
| `aho-corasick` | `Unlicense OR MIT` | https://github.com/BurntSushi/aho-corasick | licence files in the published crate archive |
| `anstream` | `MIT OR Apache-2.0` | https://github.com/rust-cli/anstyle.git | licence files in the published crate archive |
| `anstyle` | `MIT OR Apache-2.0` | https://github.com/rust-cli/anstyle.git | licence files in the published crate archive |
| `anstyle-parse` | `MIT OR Apache-2.0` | https://github.com/rust-cli/anstyle.git | licence files in the published crate archive |
| `anstyle-query` | `MIT OR Apache-2.0` | https://github.com/rust-cli/anstyle.git | licence files in the published crate archive |
| `anstyle-wincon` | `MIT OR Apache-2.0` | https://github.com/rust-cli/anstyle.git | licence files in the published crate archive |
| `anyhow` | `MIT OR Apache-2.0` | https://github.com/dtolnay/anyhow | licence files in the published crate archive |
| `autocfg` | `Apache-2.0 OR MIT` | https://github.com/cuviper/autocfg | licence files in the published crate archive |
| `base64` | `MIT OR Apache-2.0` | https://github.com/marshallpierce/rust-base64 | licence files in the published crate archive |
| `bit-set` | `MIT/Apache-2.0` | https://github.com/contain-rs/bit-set | licence files in the published crate archive |
| `bit-set` | `Apache-2.0 OR MIT` | https://github.com/contain-rs/bit-set | licence files in the published crate archive |
| `bit-vec` | `MIT/Apache-2.0` | https://github.com/contain-rs/bit-vec | licence files in the published crate archive |
| `bit-vec` | `Apache-2.0 OR MIT` | https://github.com/contain-rs/bit-vec | licence files in the published crate archive |
| `bitflags` | `MIT OR Apache-2.0` | https://github.com/bitflags/bitflags | licence files in the published crate archive |
| `block-buffer` | `MIT OR Apache-2.0` | https://github.com/RustCrypto/utils | licence files in the published crate archive |
| `bstr` | `MIT OR Apache-2.0` | https://github.com/BurntSushi/bstr | licence files in the published crate archive |
| `bumpalo` | `MIT OR Apache-2.0` | https://github.com/fitzgen/bumpalo | licence files in the published crate archive |
| `bytecount` | `Apache-2.0/MIT` | https://github.com/llogiq/bytecount | licence files in the published crate archive |
| `cc` | `MIT OR Apache-2.0` | https://github.com/rust-lang/cc-rs | licence files in the published crate archive |
| `cfg-if` | `MIT OR Apache-2.0` | https://github.com/rust-lang/cfg-if | licence files in the published crate archive |
| `clap` | `MIT OR Apache-2.0` | https://github.com/clap-rs/clap | licence files in the published crate archive |
| `clap_builder` | `MIT OR Apache-2.0` | https://github.com/clap-rs/clap | licence files in the published crate archive |
| `clap_derive` | `MIT OR Apache-2.0` | https://github.com/clap-rs/clap | licence files in the published crate archive |
| `clap_lex` | `MIT OR Apache-2.0` | https://github.com/clap-rs/clap | licence files in the published crate archive |
| `colorchoice` | `MIT OR Apache-2.0` | https://github.com/rust-cli/anstyle.git | licence files in the published crate archive |
| `cpufeatures` | `MIT OR Apache-2.0` | https://github.com/RustCrypto/utils | licence files in the published crate archive |
| `crossbeam-deque` | `MIT OR Apache-2.0` | https://github.com/crossbeam-rs/crossbeam | licence files in the published crate archive |
| `crossbeam-epoch` | `MIT OR Apache-2.0` | https://github.com/crossbeam-rs/crossbeam | licence files in the published crate archive |
| `crossbeam-utils` | `MIT OR Apache-2.0` | https://github.com/crossbeam-rs/crossbeam | licence files in the published crate archive |
| `crypto-common` | `MIT OR Apache-2.0` | https://github.com/RustCrypto/traits | licence files in the published crate archive |
| `deranged` | `MIT OR Apache-2.0` | https://github.com/jhpratt/deranged | licence files in the published crate archive |
| `digest` | `MIT OR Apache-2.0` | https://github.com/RustCrypto/traits | licence files in the published crate archive |
| `displaydoc` | `MIT OR Apache-2.0` | https://github.com/yaahc/displaydoc | licence files in the published crate archive |
| `either` | `MIT OR Apache-2.0` | https://github.com/rayon-rs/either | licence files in the published crate archive |
| `equivalent` | `Apache-2.0 OR MIT` | https://github.com/indexmap-rs/equivalent | licence files in the published crate archive |
| `errno` | `MIT OR Apache-2.0` | https://github.com/lambda-fairy/rust-errno | licence files in the published crate archive |
| `fancy-regex` | `MIT` | https://github.com/fancy-regex/fancy-regex | licence files in the published crate archive |
| `fastrand` | `Apache-2.0 OR MIT` | https://github.com/smol-rs/fastrand | licence files in the published crate archive |
| `find-msvc-tools` | `MIT OR Apache-2.0` | https://github.com/rust-lang/cc-rs | licence files in the published crate archive |
| `fnv` | `Apache-2.0 / MIT` | https://github.com/servo/rust-fnv | licence files in the published crate archive |
| `form_urlencoded` | `MIT OR Apache-2.0` | https://github.com/servo/rust-url | licence files in the published crate archive |
| `fraction` | `MIT OR Apache-2.0` | https://github.com/dnsl48/fraction.git | licence files in the published crate archive |
| `futures-core` | `MIT OR Apache-2.0` | https://github.com/rust-lang/futures-rs | licence files in the published crate archive |
| `futures-task` | `MIT OR Apache-2.0` | https://github.com/rust-lang/futures-rs | licence files in the published crate archive |
| `futures-util` | `MIT OR Apache-2.0` | https://github.com/rust-lang/futures-rs | licence files in the published crate archive |
| `generator` | `MIT/Apache-2.0` | https://github.com/Xudong-Huang/generator-rs.git | licence files in the published crate archive |
| `generic-array` | `MIT` | https://github.com/fizyk20/generic-array.git | licence files in the published crate archive |
| `getrandom` | `MIT OR Apache-2.0` | https://github.com/rust-random/getrandom | licence files in the published crate archive |
| `getrandom` | `MIT OR Apache-2.0` | https://github.com/rust-random/getrandom | licence files in the published crate archive |
| `getrandom` | `MIT OR Apache-2.0` | https://github.com/rust-random/getrandom | licence files in the published crate archive |
| `globset` | `Unlicense OR MIT` | https://github.com/BurntSushi/ripgrep/tree/master/crates/globset | licence files in the published crate archive |
| `hashbrown` | `MIT OR Apache-2.0` | https://github.com/rust-lang/hashbrown | licence files in the published crate archive |
| `heck` | `MIT OR Apache-2.0` | https://github.com/withoutboats/heck | licence files in the published crate archive |
| `icu_collections` | `Unicode-3.0` | https://github.com/unicode-org/icu4x | licence files in the published crate archive |
| `icu_locale_core` | `Unicode-3.0` | https://github.com/unicode-org/icu4x | licence files in the published crate archive |
| `icu_normalizer` | `Unicode-3.0` | https://github.com/unicode-org/icu4x | licence files in the published crate archive |
| `icu_normalizer_data` | `Unicode-3.0` | https://github.com/unicode-org/icu4x | licence files in the published crate archive |
| `icu_properties` | `Unicode-3.0` | https://github.com/unicode-org/icu4x | licence files in the published crate archive |
| `icu_properties_data` | `Unicode-3.0` | https://github.com/unicode-org/icu4x | licence files in the published crate archive |
| `icu_provider` | `Unicode-3.0` | https://github.com/unicode-org/icu4x | licence files in the published crate archive |
| `idna` | `MIT OR Apache-2.0` | https://github.com/servo/rust-url/ | licence files in the published crate archive |
| `idna_adapter` | `Apache-2.0 OR MIT` | https://github.com/hsivonen/idna_adapter | licence files in the published crate archive |
| `ignore` | `Unlicense OR MIT` | https://github.com/BurntSushi/ripgrep/tree/master/crates/ignore | licence files in the published crate archive |
| `indexmap` | `Apache-2.0 OR MIT` | https://github.com/indexmap-rs/indexmap | licence files in the published crate archive |
| `is_terminal_polyfill` | `MIT OR Apache-2.0` | https://github.com/polyfill-rs/is_terminal_polyfill | licence files in the published crate archive |
| `iso8601` | `MIT` | https://github.com/badboy/iso8601 | licence files in the published crate archive |
| `itoa` | `MIT OR Apache-2.0` | https://github.com/dtolnay/itoa | licence files in the published crate archive |
| `ix-trace-rs` | `AGPL-3.0-or-later` | https://github.com/agent-ix/ix-trace-rs | `LICENSE` in the repository at the pinned revision |
| `js-sys` | `MIT OR Apache-2.0` | https://github.com/wasm-bindgen/wasm-bindgen/tree/master/crates/js-sys | licence files in the published crate archive |
| `jsonschema` | `MIT` | https://github.com/Stranger6667/jsonschema-rs | licence files in the published crate archive |
| `lazy_static` | `MIT OR Apache-2.0` | https://github.com/rust-lang-nursery/lazy-static.rs | licence files in the published crate archive |
| `libc` | `MIT OR Apache-2.0` | https://github.com/rust-lang/libc | licence files in the published crate archive |
| `libyaml-rs` | `MIT` | https://github.com/yaml/libyaml-rs | licence files in the published crate archive |
| `linux-raw-sys` | `Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT` | https://github.com/sunfishcode/linux-raw-sys | licence files in the published crate archive |
| `litemap` | `Unicode-3.0` | https://github.com/unicode-org/icu4x | licence files in the published crate archive |
| `lock_api` | `MIT OR Apache-2.0` | https://github.com/Amanieu/parking_lot | licence files in the published crate archive |
| `log` | `MIT OR Apache-2.0` | https://github.com/rust-lang/log | licence files in the published crate archive |
| `loom` | `MIT` | https://github.com/tokio-rs/loom | licence files in the published crate archive |
| `matchers` | `MIT` | https://github.com/hawkw/matchers | licence files in the published crate archive |
| `memchr` | `Unlicense OR MIT` | https://github.com/BurntSushi/memchr | licence files in the published crate archive |
| `nom` | `MIT` | https://github.com/rust-bakery/nom | licence files in the published crate archive |
| `nu-ansi-term` | `MIT` | https://github.com/nushell/nu-ansi-term | licence files in the published crate archive |
| `num` | `MIT OR Apache-2.0` | https://github.com/rust-num/num | licence files in the published crate archive |
| `num-bigint` | `MIT OR Apache-2.0` | https://github.com/rust-num/num-bigint | licence files in the published crate archive |
| `num-cmp` | `MIT/Apache-2.0` | https://github.com/lifthrasiir/num-cmp | licence files in the published crate archive |
| `num-complex` | `MIT OR Apache-2.0` | https://github.com/rust-num/num-complex | licence files in the published crate archive |
| `num-conv` | `MIT OR Apache-2.0` | https://github.com/jhpratt/num-conv | licence files in the published crate archive |
| `num-integer` | `MIT OR Apache-2.0` | https://github.com/rust-num/num-integer | licence files in the published crate archive |
| `num-iter` | `MIT OR Apache-2.0` | https://github.com/rust-num/num-iter | licence files in the published crate archive |
| `num-rational` | `MIT OR Apache-2.0` | https://github.com/rust-num/num-rational | licence files in the published crate archive |
| `num-traits` | `MIT OR Apache-2.0` | https://github.com/rust-num/num-traits | licence files in the published crate archive |
| `once_cell` | `MIT OR Apache-2.0` | https://github.com/matklad/once_cell | licence files in the published crate archive |
| `once_cell_polyfill` | `MIT OR Apache-2.0` | https://github.com/polyfill-rs/once_cell_polyfill | licence files in the published crate archive |
| `parking_lot` | `MIT OR Apache-2.0` | https://github.com/Amanieu/parking_lot | licence files in the published crate archive |
| `parking_lot_core` | `MIT OR Apache-2.0` | https://github.com/Amanieu/parking_lot | licence files in the published crate archive |
| `percent-encoding` | `MIT OR Apache-2.0` | https://github.com/servo/rust-url/ | licence files in the published crate archive |
| `pin-project-lite` | `Apache-2.0 OR MIT` | https://github.com/taiki-e/pin-project-lite | licence files in the published crate archive |
| `potential_utf` | `Unicode-3.0` | https://github.com/unicode-org/icu4x | licence files in the published crate archive |
| `powerfmt` | `MIT OR Apache-2.0` | https://github.com/jhpratt/powerfmt | licence files in the published crate archive |
| `ppv-lite86` | `MIT OR Apache-2.0` | https://github.com/cryptocorrosion/cryptocorrosion | licence files in the published crate archive |
| `proc-macro2` | `MIT OR Apache-2.0` | https://github.com/dtolnay/proc-macro2 | licence files in the published crate archive |
| `proptest` | `MIT OR Apache-2.0` | https://github.com/proptest-rs/proptest | licence files in the published crate archive |
| `quick-error` | `MIT/Apache-2.0` | http://github.com/tailhook/quick-error | licence files in the published crate archive |
| `quire-code-parse` | `AGPL-3.0-or-later` | https://github.com/agent-ix/quire-code-rs | `LICENSE` in the repository at the pinned revision |
| `quire-rs` | `AGPL-3.0-or-later` | https://github.com/agent-ix/quire-rs | `LICENSE` in the repository at the pinned revision |
| `quire-rust-extraction` | `AGPL-3.0-or-later` | https://github.com/agent-ix/quire-rs | `LICENSE` in the repository at the pinned revision |
| `quote` | `MIT OR Apache-2.0` | https://github.com/dtolnay/quote | licence files in the published crate archive |
| `r-efi` | `MIT OR Apache-2.0 OR LGPL-2.1-or-later` | https://github.com/r-efi/r-efi | licence files in the published crate archive |
| `r-efi` | `MIT OR Apache-2.0 OR LGPL-2.1-or-later` | https://github.com/r-efi/r-efi | licence files in the published crate archive |
| `rand` | `MIT OR Apache-2.0` | https://github.com/rust-random/rand | licence files in the published crate archive |
| `rand_chacha` | `MIT OR Apache-2.0` | https://github.com/rust-random/rand | licence files in the published crate archive |
| `rand_core` | `MIT OR Apache-2.0` | https://github.com/rust-random/rand | licence files in the published crate archive |
| `rand_xorshift` | `MIT OR Apache-2.0` | https://github.com/rust-random/rngs | licence files in the published crate archive |
| `rayon` | `MIT OR Apache-2.0` | https://github.com/rayon-rs/rayon | licence files in the published crate archive |
| `rayon-core` | `MIT OR Apache-2.0` | https://github.com/rayon-rs/rayon | licence files in the published crate archive |
| `redox_syscall` | `MIT` | https://gitlab.redox-os.org/redox-os/syscall | licence files in the published crate archive |
| `regex` | `MIT OR Apache-2.0` | https://github.com/rust-lang/regex | licence files in the published crate archive |
| `regex-automata` | `MIT OR Apache-2.0` | https://github.com/rust-lang/regex | licence files in the published crate archive |
| `regex-syntax` | `MIT OR Apache-2.0` | https://github.com/rust-lang/regex | licence files in the published crate archive |
| `rustix` | `Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT` | https://github.com/bytecodealliance/rustix | licence files in the published crate archive |
| `rustversion` | `MIT OR Apache-2.0` | https://github.com/dtolnay/rustversion | licence files in the published crate archive |
| `rusty-fork` | `MIT/Apache-2.0` | https://github.com/altsysrq/rusty-fork | licence files in the published crate archive |
| `ryu` | `Apache-2.0 OR BSL-1.0` | https://github.com/dtolnay/ryu | licence files in the published crate archive |
| `same-file` | `Unlicense/MIT` | https://github.com/BurntSushi/same-file | licence files in the published crate archive |
| `scoped-tls` | `MIT/Apache-2.0` | https://github.com/alexcrichton/scoped-tls | licence files in the published crate archive |
| `scopeguard` | `MIT OR Apache-2.0` | https://github.com/bluss/scopeguard | licence files in the published crate archive |
| `serde` | `MIT OR Apache-2.0` | https://github.com/serde-rs/serde | licence files in the published crate archive |
| `serde_core` | `MIT OR Apache-2.0` | https://github.com/serde-rs/serde | licence files in the published crate archive |
| `serde_derive` | `MIT OR Apache-2.0` | https://github.com/serde-rs/serde | licence files in the published crate archive |
| `serde_json` | `MIT OR Apache-2.0` | https://github.com/serde-rs/json | licence files in the published crate archive |
| `sha2` | `MIT OR Apache-2.0` | https://github.com/RustCrypto/hashes | licence files in the published crate archive |
| `sharded-slab` | `MIT` | https://github.com/hawkw/sharded-slab | licence files in the published crate archive |
| `shlex` | `MIT OR Apache-2.0` | https://github.com/comex/rust-shlex | licence files in the published crate archive |
| `slab` | `MIT` | https://github.com/tokio-rs/slab | licence files in the published crate archive |
| `smallvec` | `MIT OR Apache-2.0` | https://github.com/servo/rust-smallvec | licence files in the published crate archive |
| `stable_deref_trait` | `MIT OR Apache-2.0` | https://github.com/storyyeller/stable_deref_trait | licence files in the published crate archive |
| `streaming-iterator` | `MIT OR Apache-2.0` | https://github.com/sfackler/streaming-iterator | licence files in the published crate archive |
| `strsim` | `MIT` | https://github.com/rapidfuzz/strsim-rs | licence files in the published crate archive |
| `syn` | `MIT OR Apache-2.0` | https://github.com/dtolnay/syn | licence files in the published crate archive |
| `syn` | `MIT OR Apache-2.0` | https://github.com/dtolnay/syn | licence files in the published crate archive |
| `synstructure` | `MIT` | https://github.com/mystor/synstructure | licence files in the published crate archive |
| `tempfile` | `MIT OR Apache-2.0` | https://github.com/Stebalien/tempfile | licence files in the published crate archive |
| `thiserror` | `MIT OR Apache-2.0` | https://github.com/dtolnay/thiserror | licence files in the published crate archive |
| `thiserror-impl` | `MIT OR Apache-2.0` | https://github.com/dtolnay/thiserror | licence files in the published crate archive |
| `thread_local` | `MIT OR Apache-2.0` | https://github.com/Amanieu/thread_local-rs | licence files in the published crate archive |
| `time` | `MIT OR Apache-2.0` | https://github.com/time-rs/time | licence files in the published crate archive |
| `time-core` | `MIT OR Apache-2.0` | https://github.com/time-rs/time | licence files in the published crate archive |
| `time-macros` | `MIT OR Apache-2.0` | https://github.com/time-rs/time | licence files in the published crate archive |
| `tinystr` | `Unicode-3.0` | https://github.com/unicode-org/icu4x | licence files in the published crate archive |
| `tinyvec` | `Zlib OR Apache-2.0 OR MIT` | https://github.com/Lokathor/tinyvec | licence files in the published crate archive |
| `tinyvec_macros` | `MIT OR Apache-2.0 OR Zlib` | https://github.com/Soveu/tinyvec_macros | licence files in the published crate archive |
| `tracing` | `MIT` | https://github.com/tokio-rs/tracing | licence files in the published crate archive |
| `tracing-core` | `MIT` | https://github.com/tokio-rs/tracing | licence files in the published crate archive |
| `tracing-log` | `MIT` | https://github.com/tokio-rs/tracing | licence files in the published crate archive |
| `tracing-subscriber` | `MIT` | https://github.com/tokio-rs/tracing | licence files in the published crate archive |
| `tree-sitter` | `MIT` | https://github.com/tree-sitter/tree-sitter | licence files in the published crate archive |
| `tree-sitter-language` | `MIT` | https://github.com/tree-sitter/tree-sitter | licence files in the published crate archive |
| `tree-sitter-python` | `MIT` | https://github.com/tree-sitter/tree-sitter-python | licence files in the published crate archive |
| `tree-sitter-rust` | `MIT` | https://github.com/tree-sitter/tree-sitter-rust | licence files in the published crate archive |
| `tree-sitter-typescript` | `MIT` | https://github.com/tree-sitter/tree-sitter-typescript | licence files in the published crate archive |
| `typenum` | `MIT OR Apache-2.0` | https://github.com/paholg/typenum | licence files in the published crate archive |
| `unarray` | `MIT OR Apache-2.0` | https://github.com/cameron1024/unarray | licence files in the published crate archive |
| `unicode-ident` | `(MIT OR Apache-2.0) AND Unicode-3.0` | https://github.com/dtolnay/unicode-ident | licence files in the published crate archive |
| `unicode-normalization` | `MIT OR Apache-2.0` | https://github.com/unicode-rs/unicode-normalization | licence files in the published crate archive |
| `url` | `MIT OR Apache-2.0` | https://github.com/servo/rust-url | licence files in the published crate archive |
| `utf8_iter` | `Apache-2.0 OR MIT` | https://github.com/hsivonen/utf8_iter | licence files in the published crate archive |
| `utf8parse` | `Apache-2.0 OR MIT` | https://github.com/alacritty/vte | licence files in the published crate archive |
| `uuid` | `Apache-2.0 OR MIT` | https://github.com/uuid-rs/uuid | licence files in the published crate archive |
| `valuable` | `MIT` | https://github.com/tokio-rs/valuable | licence files in the published crate archive |
| `version_check` | `MIT/Apache-2.0` | https://github.com/SergioBenitez/version_check | licence files in the published crate archive |
| `wait-timeout` | `MIT/Apache-2.0` | https://github.com/alexcrichton/wait-timeout | licence files in the published crate archive |
| `walkdir` | `Unlicense/MIT` | https://github.com/BurntSushi/walkdir | licence files in the published crate archive |
| `wasi` | `Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT` | https://github.com/bytecodealliance/wasi | licence files in the published crate archive |
| `wasip2` | `Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT` | https://github.com/bytecodealliance/wasi-rs | licence files in the published crate archive |
| `wasm-bindgen` | `MIT OR Apache-2.0` | https://github.com/wasm-bindgen/wasm-bindgen | licence files in the published crate archive |
| `wasm-bindgen-macro` | `MIT OR Apache-2.0` | https://github.com/wasm-bindgen/wasm-bindgen/tree/master/crates/macro | licence files in the published crate archive |
| `wasm-bindgen-macro-support` | `MIT OR Apache-2.0` | https://github.com/wasm-bindgen/wasm-bindgen/tree/main/crates/macro-support | licence files in the published crate archive |
| `wasm-bindgen-shared` | `MIT OR Apache-2.0` | https://github.com/wasm-bindgen/wasm-bindgen/tree/master/crates/shared | licence files in the published crate archive |
| `winapi-util` | `Unlicense OR MIT` | https://github.com/BurntSushi/winapi-util | licence files in the published crate archive |
| `windows-link` | `MIT OR Apache-2.0` | https://github.com/microsoft/windows-rs | licence files in the published crate archive |
| `windows-result` | `MIT OR Apache-2.0` | https://github.com/microsoft/windows-rs | licence files in the published crate archive |
| `windows-sys` | `MIT OR Apache-2.0` | https://github.com/microsoft/windows-rs | licence files in the published crate archive |
| `wit-bindgen` | `Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT` | https://github.com/bytecodealliance/wit-bindgen | licence files in the published crate archive |
| `writeable` | `Unicode-3.0` | https://github.com/unicode-org/icu4x | licence files in the published crate archive |
| `yaml_serde` | `MIT OR Apache-2.0` | https://github.com/yaml/yaml-serde | licence files in the published crate archive |
| `yoke` | `Unicode-3.0` | https://github.com/unicode-org/icu4x | licence files in the published crate archive |
| `yoke-derive` | `Unicode-3.0` | https://github.com/unicode-org/icu4x | licence files in the published crate archive |
| `zerocopy` | `BSD-2-Clause OR Apache-2.0 OR MIT` | https://github.com/google/zerocopy | licence files in the published crate archive |
| `zerocopy-derive` | `BSD-2-Clause OR Apache-2.0 OR MIT` | https://github.com/google/zerocopy | licence files in the published crate archive |
| `zerofrom` | `Unicode-3.0` | https://github.com/unicode-org/icu4x | licence files in the published crate archive |
| `zerofrom-derive` | `Unicode-3.0` | https://github.com/unicode-org/icu4x | licence files in the published crate archive |
| `zerotrie` | `Unicode-3.0` | https://github.com/unicode-org/icu4x | licence files in the published crate archive |
| `zerovec` | `Unicode-3.0` | https://github.com/unicode-org/icu4x | licence files in the published crate archive |
| `zerovec-derive` | `Unicode-3.0` | https://github.com/unicode-org/icu4x | licence files in the published crate archive |
| `zmij` | `MIT` | https://github.com/dtolnay/zmij | licence files in the published crate archive |
