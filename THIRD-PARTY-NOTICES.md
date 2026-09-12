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

## Transitive dependencies of the extraction frontend crate (issue #36)

The extraction frontend, `crates/extraction-frontend` (issue #36, FR-091..099,
NFR-031..033), is the third workspace member and the first to declare
dependencies: `quire-rs` (git, rev `8b8020e`) for the spec-bundle engine,
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

The rows are the non-member packages of `cargo +1.98.1 metadata --locked
--offline` at the lock this change produced, one row per package version, in
the same shape as the rows above. The attribution gate (TC-742, NFR-023-AC-7)
reads the workspace lock and fails on any locked crate absent from this file;
NFR-032 admits these rows as the additions that lock proves and nothing else.
`crates/extraction-frontend/THIRD-PARTY-NOTICES.md` carries the crate-local
register that NFR-033-AC-6 checks against the same lock. `quire-rs` and
`ix-trace-rs` are AGPL-3.0-or-later, which an AGPL-3.0-only work may link.

| Crate | Version | SPDX | Upstream | Licence text |
|---|---|---|---|---|
| `ahash` | 0.8.12 | `MIT OR Apache-2.0` | https://github.com/tkaitchuck/ahash | licence files in the published crate archive |
| `aho-corasick` | 1.1.5 | `Unlicense OR MIT` | https://github.com/BurntSushi/aho-corasick | licence files in the published crate archive |
| `anstream` | 1.0.0 | `MIT OR Apache-2.0` | https://github.com/rust-cli/anstyle.git | licence files in the published crate archive |
| `anstyle` | 1.0.14 | `MIT OR Apache-2.0` | https://github.com/rust-cli/anstyle.git | licence files in the published crate archive |
| `anstyle-parse` | 1.0.0 | `MIT OR Apache-2.0` | https://github.com/rust-cli/anstyle.git | licence files in the published crate archive |
| `anstyle-query` | 1.1.5 | `MIT OR Apache-2.0` | https://github.com/rust-cli/anstyle.git | licence files in the published crate archive |
| `anstyle-wincon` | 3.0.11 | `MIT OR Apache-2.0` | https://github.com/rust-cli/anstyle.git | licence files in the published crate archive |
| `anyhow` | 1.0.104 | `MIT OR Apache-2.0` | https://github.com/dtolnay/anyhow | licence files in the published crate archive |
| `autocfg` | 1.5.1 | `Apache-2.0 OR MIT` | https://github.com/cuviper/autocfg | licence files in the published crate archive |
| `base64` | 0.22.1 | `MIT OR Apache-2.0` | https://github.com/marshallpierce/rust-base64 | licence files in the published crate archive |
| `bit-set` | 0.5.3 | `MIT/Apache-2.0` | https://github.com/contain-rs/bit-set | licence files in the published crate archive |
| `bit-set` | 0.8.0 | `Apache-2.0 OR MIT` | https://github.com/contain-rs/bit-set | licence files in the published crate archive |
| `bit-vec` | 0.6.3 | `MIT/Apache-2.0` | https://github.com/contain-rs/bit-vec | licence files in the published crate archive |
| `bit-vec` | 0.8.0 | `Apache-2.0 OR MIT` | https://github.com/contain-rs/bit-vec | licence files in the published crate archive |
| `bitflags` | 2.13.1 | `MIT OR Apache-2.0` | https://github.com/bitflags/bitflags | licence files in the published crate archive |
| `block-buffer` | 0.10.4 | `MIT OR Apache-2.0` | https://github.com/RustCrypto/utils | licence files in the published crate archive |
| `bstr` | 1.13.1 | `MIT OR Apache-2.0` | https://github.com/BurntSushi/bstr | licence files in the published crate archive |
| `bumpalo` | 3.20.3 | `MIT OR Apache-2.0` | https://github.com/fitzgen/bumpalo | licence files in the published crate archive |
| `bytecount` | 0.6.9 | `Apache-2.0/MIT` | https://github.com/llogiq/bytecount | licence files in the published crate archive |
| `cc` | 1.4.5 | `MIT OR Apache-2.0` | https://github.com/rust-lang/cc-rs | licence files in the published crate archive |
| `cfg-if` | 1.0.4 | `MIT OR Apache-2.0` | https://github.com/rust-lang/cfg-if | licence files in the published crate archive |
| `clap` | 4.6.6 | `MIT OR Apache-2.0` | https://github.com/clap-rs/clap | licence files in the published crate archive |
| `clap_builder` | 4.6.6 | `MIT OR Apache-2.0` | https://github.com/clap-rs/clap | licence files in the published crate archive |
| `clap_derive` | 4.6.4 | `MIT OR Apache-2.0` | https://github.com/clap-rs/clap | licence files in the published crate archive |
| `clap_lex` | 1.1.0 | `MIT OR Apache-2.0` | https://github.com/clap-rs/clap | licence files in the published crate archive |
| `colorchoice` | 1.0.5 | `MIT OR Apache-2.0` | https://github.com/rust-cli/anstyle.git | licence files in the published crate archive |
| `cpufeatures` | 0.2.17 | `MIT OR Apache-2.0` | https://github.com/RustCrypto/utils | licence files in the published crate archive |
| `crossbeam-deque` | 0.8.8 | `MIT OR Apache-2.0` | https://github.com/crossbeam-rs/crossbeam | licence files in the published crate archive |
| `crossbeam-epoch` | 0.9.21 | `MIT OR Apache-2.0` | https://github.com/crossbeam-rs/crossbeam | licence files in the published crate archive |
| `crossbeam-utils` | 0.8.23 | `MIT OR Apache-2.0` | https://github.com/crossbeam-rs/crossbeam | licence files in the published crate archive |
| `crypto-common` | 0.1.7 | `MIT OR Apache-2.0` | https://github.com/RustCrypto/traits | licence files in the published crate archive |
| `deranged` | 0.5.8 | `MIT OR Apache-2.0` | https://github.com/jhpratt/deranged | licence files in the published crate archive |
| `digest` | 0.10.7 | `MIT OR Apache-2.0` | https://github.com/RustCrypto/traits | licence files in the published crate archive |
| `displaydoc` | 0.2.7 | `MIT OR Apache-2.0` | https://github.com/yaahc/displaydoc | licence files in the published crate archive |
| `either` | 1.18.0 | `MIT OR Apache-2.0` | https://github.com/rayon-rs/either | licence files in the published crate archive |
| `equivalent` | 1.0.2 | `Apache-2.0 OR MIT` | https://github.com/indexmap-rs/equivalent | licence files in the published crate archive |
| `errno` | 0.3.14 | `MIT OR Apache-2.0` | https://github.com/lambda-fairy/rust-errno | licence files in the published crate archive |
| `fancy-regex` | 0.13.0 | `MIT` | https://github.com/fancy-regex/fancy-regex | licence files in the published crate archive |
| `fastrand` | 2.5.0 | `Apache-2.0 OR MIT` | https://github.com/smol-rs/fastrand | licence files in the published crate archive |
| `find-msvc-tools` | 0.1.12 | `MIT OR Apache-2.0` | https://github.com/rust-lang/cc-rs | licence files in the published crate archive |
| `fnv` | 1.0.7 | `Apache-2.0 / MIT` | https://github.com/servo/rust-fnv | licence files in the published crate archive |
| `form_urlencoded` | 1.2.2 | `MIT OR Apache-2.0` | https://github.com/servo/rust-url | licence files in the published crate archive |
| `fraction` | 0.15.4 | `MIT OR Apache-2.0` | https://github.com/dnsl48/fraction.git | licence files in the published crate archive |
| `futures-core` | 0.3.34 | `MIT OR Apache-2.0` | https://github.com/rust-lang/futures-rs | licence files in the published crate archive |
| `futures-task` | 0.3.34 | `MIT OR Apache-2.0` | https://github.com/rust-lang/futures-rs | licence files in the published crate archive |
| `futures-util` | 0.3.34 | `MIT OR Apache-2.0` | https://github.com/rust-lang/futures-rs | licence files in the published crate archive |
| `generator` | 0.8.9 | `MIT/Apache-2.0` | https://github.com/Xudong-Huang/generator-rs.git | licence files in the published crate archive |
| `generic-array` | 0.14.7 | `MIT` | https://github.com/fizyk20/generic-array.git | licence files in the published crate archive |
| `getrandom` | 0.2.17 | `MIT OR Apache-2.0` | https://github.com/rust-random/getrandom | licence files in the published crate archive |
| `getrandom` | 0.3.4 | `MIT OR Apache-2.0` | https://github.com/rust-random/getrandom | licence files in the published crate archive |
| `getrandom` | 0.4.3 | `MIT OR Apache-2.0` | https://github.com/rust-random/getrandom | licence files in the published crate archive |
| `globset` | 0.4.20 | `Unlicense OR MIT` | https://github.com/BurntSushi/ripgrep/tree/master/crates/globset | licence files in the published crate archive |
| `hashbrown` | 0.17.1 | `MIT OR Apache-2.0` | https://github.com/rust-lang/hashbrown | licence files in the published crate archive |
| `heck` | 0.5.0 | `MIT OR Apache-2.0` | https://github.com/withoutboats/heck | licence files in the published crate archive |
| `icu_collections` | 2.3.0 | `Unicode-3.0` | https://github.com/unicode-org/icu4x | licence files in the published crate archive |
| `icu_locale_core` | 2.3.0 | `Unicode-3.0` | https://github.com/unicode-org/icu4x | licence files in the published crate archive |
| `icu_normalizer` | 2.3.0 | `Unicode-3.0` | https://github.com/unicode-org/icu4x | licence files in the published crate archive |
| `icu_normalizer_data` | 2.3.0 | `Unicode-3.0` | https://github.com/unicode-org/icu4x | licence files in the published crate archive |
| `icu_properties` | 2.3.0 | `Unicode-3.0` | https://github.com/unicode-org/icu4x | licence files in the published crate archive |
| `icu_properties_data` | 2.3.0 | `Unicode-3.0` | https://github.com/unicode-org/icu4x | licence files in the published crate archive |
| `icu_provider` | 2.3.1 | `Unicode-3.0` | https://github.com/unicode-org/icu4x | licence files in the published crate archive |
| `idna` | 1.1.0 | `MIT OR Apache-2.0` | https://github.com/servo/rust-url/ | licence files in the published crate archive |
| `idna_adapter` | 1.2.2 | `Apache-2.0 OR MIT` | https://github.com/hsivonen/idna_adapter | licence files in the published crate archive |
| `ignore` | 0.4.33 | `Unlicense OR MIT` | https://github.com/BurntSushi/ripgrep/tree/master/crates/ignore | licence files in the published crate archive |
| `indexmap` | 2.14.2 | `Apache-2.0 OR MIT` | https://github.com/indexmap-rs/indexmap | licence files in the published crate archive |
| `is_terminal_polyfill` | 1.70.2 | `MIT OR Apache-2.0` | https://github.com/polyfill-rs/is_terminal_polyfill | licence files in the published crate archive |
| `iso8601` | 0.6.5 | `MIT` | https://github.com/badboy/iso8601 | licence files in the published crate archive |
| `itoa` | 1.0.18 | `MIT OR Apache-2.0` | https://github.com/dtolnay/itoa | licence files in the published crate archive |
| `ix-trace-rs` | 0.1.0 | `AGPL-3.0-or-later` | https://github.com/agent-ix/ix-trace-rs | `LICENSE` in the repository at the pinned revision |
| `js-sys` | 0.3.105 | `MIT OR Apache-2.0` | https://github.com/wasm-bindgen/wasm-bindgen/tree/master/crates/js-sys | licence files in the published crate archive |
| `jsonschema` | 0.18.3 | `MIT` | https://github.com/Stranger6667/jsonschema-rs | licence files in the published crate archive |
| `lazy_static` | 1.5.0 | `MIT OR Apache-2.0` | https://github.com/rust-lang-nursery/lazy-static.rs | licence files in the published crate archive |
| `libc` | 0.2.189 | `MIT OR Apache-2.0` | https://github.com/rust-lang/libc | licence files in the published crate archive |
| `linux-raw-sys` | 0.12.1 | `Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT` | https://github.com/sunfishcode/linux-raw-sys | licence files in the published crate archive |
| `litemap` | 0.8.3 | `Unicode-3.0` | https://github.com/unicode-org/icu4x | licence files in the published crate archive |
| `lock_api` | 0.4.14 | `MIT OR Apache-2.0` | https://github.com/Amanieu/parking_lot | licence files in the published crate archive |
| `log` | 0.4.34 | `MIT OR Apache-2.0` | https://github.com/rust-lang/log | licence files in the published crate archive |
| `loom` | 0.7.2 | `MIT` | https://github.com/tokio-rs/loom | licence files in the published crate archive |
| `matchers` | 0.2.0 | `MIT` | https://github.com/hawkw/matchers | licence files in the published crate archive |
| `memchr` | 2.8.3 | `Unlicense OR MIT` | https://github.com/BurntSushi/memchr | licence files in the published crate archive |
| `nom` | 8.0.0 | `MIT` | https://github.com/rust-bakery/nom | licence files in the published crate archive |
| `nu-ansi-term` | 0.50.3 | `MIT` | https://github.com/nushell/nu-ansi-term | licence files in the published crate archive |
| `num` | 0.4.3 | `MIT OR Apache-2.0` | https://github.com/rust-num/num | licence files in the published crate archive |
| `num-bigint` | 0.4.8 | `MIT OR Apache-2.0` | https://github.com/rust-num/num-bigint | licence files in the published crate archive |
| `num-cmp` | 0.1.0 | `MIT/Apache-2.0` | https://github.com/lifthrasiir/num-cmp | licence files in the published crate archive |
| `num-complex` | 0.4.6 | `MIT OR Apache-2.0` | https://github.com/rust-num/num-complex | licence files in the published crate archive |
| `num-conv` | 0.2.2 | `MIT OR Apache-2.0` | https://github.com/jhpratt/num-conv | licence files in the published crate archive |
| `num-integer` | 0.1.47 | `MIT OR Apache-2.0` | https://github.com/rust-num/num-integer | licence files in the published crate archive |
| `num-iter` | 0.1.46 | `MIT OR Apache-2.0` | https://github.com/rust-num/num-iter | licence files in the published crate archive |
| `num-rational` | 0.4.2 | `MIT OR Apache-2.0` | https://github.com/rust-num/num-rational | licence files in the published crate archive |
| `num-traits` | 0.2.19 | `MIT OR Apache-2.0` | https://github.com/rust-num/num-traits | licence files in the published crate archive |
| `once_cell` | 1.21.4 | `MIT OR Apache-2.0` | https://github.com/matklad/once_cell | licence files in the published crate archive |
| `once_cell_polyfill` | 1.70.2 | `MIT OR Apache-2.0` | https://github.com/polyfill-rs/once_cell_polyfill | licence files in the published crate archive |
| `parking_lot` | 0.12.5 | `MIT OR Apache-2.0` | https://github.com/Amanieu/parking_lot | licence files in the published crate archive |
| `parking_lot_core` | 0.9.12 | `MIT OR Apache-2.0` | https://github.com/Amanieu/parking_lot | licence files in the published crate archive |
| `percent-encoding` | 2.3.2 | `MIT OR Apache-2.0` | https://github.com/servo/rust-url/ | licence files in the published crate archive |
| `pin-project-lite` | 0.2.17 | `Apache-2.0 OR MIT` | https://github.com/taiki-e/pin-project-lite | licence files in the published crate archive |
| `potential_utf` | 0.1.6 | `Unicode-3.0` | https://github.com/unicode-org/icu4x | licence files in the published crate archive |
| `powerfmt` | 0.2.0 | `MIT OR Apache-2.0` | https://github.com/jhpratt/powerfmt | licence files in the published crate archive |
| `ppv-lite86` | 0.2.21 | `MIT OR Apache-2.0` | https://github.com/cryptocorrosion/cryptocorrosion | licence files in the published crate archive |
| `proc-macro2` | 1.0.107 | `MIT OR Apache-2.0` | https://github.com/dtolnay/proc-macro2 | licence files in the published crate archive |
| `proptest` | 1.11.0 | `MIT OR Apache-2.0` | https://github.com/proptest-rs/proptest | licence files in the published crate archive |
| `quick-error` | 1.2.3 | `MIT/Apache-2.0` | http://github.com/tailhook/quick-error | licence files in the published crate archive |
| `quire-rs` | 0.46.0 | `AGPL-3.0-or-later` | https://github.com/agent-ix/quire-rs | `LICENSE` in the repository at the pinned revision |
| `quote` | 1.0.47 | `MIT OR Apache-2.0` | https://github.com/dtolnay/quote | licence files in the published crate archive |
| `r-efi` | 5.3.0 | `MIT OR Apache-2.0 OR LGPL-2.1-or-later` | https://github.com/r-efi/r-efi | licence files in the published crate archive |
| `r-efi` | 6.0.0 | `MIT OR Apache-2.0 OR LGPL-2.1-or-later` | https://github.com/r-efi/r-efi | licence files in the published crate archive |
| `rand` | 0.9.5 | `MIT OR Apache-2.0` | https://github.com/rust-random/rand | licence files in the published crate archive |
| `rand_chacha` | 0.9.0 | `MIT OR Apache-2.0` | https://github.com/rust-random/rand | licence files in the published crate archive |
| `rand_core` | 0.9.5 | `MIT OR Apache-2.0` | https://github.com/rust-random/rand | licence files in the published crate archive |
| `rand_xorshift` | 0.4.0 | `MIT OR Apache-2.0` | https://github.com/rust-random/rngs | licence files in the published crate archive |
| `rayon` | 1.12.0 | `MIT OR Apache-2.0` | https://github.com/rayon-rs/rayon | licence files in the published crate archive |
| `rayon-core` | 1.13.0 | `MIT OR Apache-2.0` | https://github.com/rayon-rs/rayon | licence files in the published crate archive |
| `redox_syscall` | 0.5.18 | `MIT` | https://gitlab.redox-os.org/redox-os/syscall | licence files in the published crate archive |
| `regex` | 1.13.1 | `MIT OR Apache-2.0` | https://github.com/rust-lang/regex | licence files in the published crate archive |
| `regex-automata` | 0.4.18 | `MIT OR Apache-2.0` | https://github.com/rust-lang/regex | licence files in the published crate archive |
| `regex-syntax` | 0.8.11 | `MIT OR Apache-2.0` | https://github.com/rust-lang/regex | licence files in the published crate archive |
| `rustix` | 1.1.4 | `Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT` | https://github.com/bytecodealliance/rustix | licence files in the published crate archive |
| `rustversion` | 1.0.23 | `MIT OR Apache-2.0` | https://github.com/dtolnay/rustversion | licence files in the published crate archive |
| `rusty-fork` | 0.3.1 | `MIT/Apache-2.0` | https://github.com/altsysrq/rusty-fork | licence files in the published crate archive |
| `ryu` | 1.0.23 | `Apache-2.0 OR BSL-1.0` | https://github.com/dtolnay/ryu | licence files in the published crate archive |
| `same-file` | 1.0.6 | `Unlicense/MIT` | https://github.com/BurntSushi/same-file | licence files in the published crate archive |
| `scoped-tls` | 1.0.1 | `MIT/Apache-2.0` | https://github.com/alexcrichton/scoped-tls | licence files in the published crate archive |
| `scopeguard` | 1.2.0 | `MIT OR Apache-2.0` | https://github.com/bluss/scopeguard | licence files in the published crate archive |
| `serde` | 1.0.228 | `MIT OR Apache-2.0` | https://github.com/serde-rs/serde | licence files in the published crate archive |
| `serde_core` | 1.0.228 | `MIT OR Apache-2.0` | https://github.com/serde-rs/serde | licence files in the published crate archive |
| `serde_derive` | 1.0.228 | `MIT OR Apache-2.0` | https://github.com/serde-rs/serde | licence files in the published crate archive |
| `serde_json` | 1.0.151 | `MIT OR Apache-2.0` | https://github.com/serde-rs/json | licence files in the published crate archive |
| `serde_yaml` | 0.9.34+deprecated | `MIT OR Apache-2.0` | https://github.com/dtolnay/serde-yaml | licence files in the published crate archive |
| `sha2` | 0.10.9 | `MIT OR Apache-2.0` | https://github.com/RustCrypto/hashes | licence files in the published crate archive |
| `sharded-slab` | 0.1.7 | `MIT` | https://github.com/hawkw/sharded-slab | licence files in the published crate archive |
| `shlex` | 2.0.1 | `MIT OR Apache-2.0` | https://github.com/comex/rust-shlex | licence files in the published crate archive |
| `slab` | 0.4.12 | `MIT` | https://github.com/tokio-rs/slab | licence files in the published crate archive |
| `smallvec` | 1.16.0 | `MIT OR Apache-2.0` | https://github.com/servo/rust-smallvec | licence files in the published crate archive |
| `stable_deref_trait` | 1.2.1 | `MIT OR Apache-2.0` | https://github.com/storyyeller/stable_deref_trait | licence files in the published crate archive |
| `strsim` | 0.11.1 | `MIT` | https://github.com/rapidfuzz/strsim-rs | licence files in the published crate archive |
| `syn` | 2.0.119 | `MIT OR Apache-2.0` | https://github.com/dtolnay/syn | licence files in the published crate archive |
| `syn` | 3.0.5 | `MIT OR Apache-2.0` | https://github.com/dtolnay/syn | licence files in the published crate archive |
| `synstructure` | 0.13.2 | `MIT` | https://github.com/mystor/synstructure | licence files in the published crate archive |
| `tempfile` | 3.27.0 | `MIT OR Apache-2.0` | https://github.com/Stebalien/tempfile | licence files in the published crate archive |
| `thiserror` | 2.0.20 | `MIT OR Apache-2.0` | https://github.com/dtolnay/thiserror | licence files in the published crate archive |
| `thiserror-impl` | 2.0.20 | `MIT OR Apache-2.0` | https://github.com/dtolnay/thiserror | licence files in the published crate archive |
| `thread_local` | 1.1.10 | `MIT OR Apache-2.0` | https://github.com/Amanieu/thread_local-rs | licence files in the published crate archive |
| `time` | 0.3.55 | `MIT OR Apache-2.0` | https://github.com/time-rs/time | licence files in the published crate archive |
| `time-core` | 0.1.9 | `MIT OR Apache-2.0` | https://github.com/time-rs/time | licence files in the published crate archive |
| `time-macros` | 0.2.32 | `MIT OR Apache-2.0` | https://github.com/time-rs/time | licence files in the published crate archive |
| `tinystr` | 0.8.4 | `Unicode-3.0` | https://github.com/unicode-org/icu4x | licence files in the published crate archive |
| `tinyvec` | 1.13.2 | `Zlib OR Apache-2.0 OR MIT` | https://github.com/Lokathor/tinyvec | licence files in the published crate archive |
| `tinyvec_macros` | 0.1.1 | `MIT OR Apache-2.0 OR Zlib` | https://github.com/Soveu/tinyvec_macros | licence files in the published crate archive |
| `tracing` | 0.1.44 | `MIT` | https://github.com/tokio-rs/tracing | licence files in the published crate archive |
| `tracing-core` | 0.1.36 | `MIT` | https://github.com/tokio-rs/tracing | licence files in the published crate archive |
| `tracing-log` | 0.2.0 | `MIT` | https://github.com/tokio-rs/tracing | licence files in the published crate archive |
| `tracing-subscriber` | 0.3.23 | `MIT` | https://github.com/tokio-rs/tracing | licence files in the published crate archive |
| `typenum` | 1.20.1 | `MIT OR Apache-2.0` | https://github.com/paholg/typenum | licence files in the published crate archive |
| `unarray` | 0.1.4 | `MIT OR Apache-2.0` | https://github.com/cameron1024/unarray | licence files in the published crate archive |
| `unicode-ident` | 1.0.24 | `(MIT OR Apache-2.0) AND Unicode-3.0` | https://github.com/dtolnay/unicode-ident | licence files in the published crate archive |
| `unicode-normalization` | 0.1.25 | `MIT OR Apache-2.0` | https://github.com/unicode-rs/unicode-normalization | licence files in the published crate archive |
| `unsafe-libyaml` | 0.2.11 | `MIT` | https://github.com/dtolnay/unsafe-libyaml | licence files in the published crate archive |
| `url` | 2.5.8 | `MIT OR Apache-2.0` | https://github.com/servo/rust-url | licence files in the published crate archive |
| `utf8_iter` | 1.0.4 | `Apache-2.0 OR MIT` | https://github.com/hsivonen/utf8_iter | licence files in the published crate archive |
| `utf8parse` | 0.2.2 | `Apache-2.0 OR MIT` | https://github.com/alacritty/vte | licence files in the published crate archive |
| `uuid` | 1.26.0 | `Apache-2.0 OR MIT` | https://github.com/uuid-rs/uuid | licence files in the published crate archive |
| `valuable` | 0.1.1 | `MIT` | https://github.com/tokio-rs/valuable | licence files in the published crate archive |
| `version_check` | 0.9.5 | `MIT/Apache-2.0` | https://github.com/SergioBenitez/version_check | licence files in the published crate archive |
| `wait-timeout` | 0.2.1 | `MIT/Apache-2.0` | https://github.com/alexcrichton/wait-timeout | licence files in the published crate archive |
| `walkdir` | 2.5.0 | `Unlicense/MIT` | https://github.com/BurntSushi/walkdir | licence files in the published crate archive |
| `wasi` | 0.11.1+wasi-snapshot-preview1 | `Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT` | https://github.com/bytecodealliance/wasi | licence files in the published crate archive |
| `wasip2` | 1.0.4+wasi-0.2.12 | `Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT` | https://github.com/bytecodealliance/wasi-rs | licence files in the published crate archive |
| `wasm-bindgen` | 0.2.128 | `MIT OR Apache-2.0` | https://github.com/wasm-bindgen/wasm-bindgen | licence files in the published crate archive |
| `wasm-bindgen-macro` | 0.2.128 | `MIT OR Apache-2.0` | https://github.com/wasm-bindgen/wasm-bindgen/tree/master/crates/macro | licence files in the published crate archive |
| `wasm-bindgen-macro-support` | 0.2.128 | `MIT OR Apache-2.0` | https://github.com/wasm-bindgen/wasm-bindgen/tree/main/crates/macro-support | licence files in the published crate archive |
| `wasm-bindgen-shared` | 0.2.128 | `MIT OR Apache-2.0` | https://github.com/wasm-bindgen/wasm-bindgen/tree/master/crates/shared | licence files in the published crate archive |
| `winapi-util` | 0.1.11 | `Unlicense OR MIT` | https://github.com/BurntSushi/winapi-util | licence files in the published crate archive |
| `windows-link` | 0.2.1 | `MIT OR Apache-2.0` | https://github.com/microsoft/windows-rs | licence files in the published crate archive |
| `windows-result` | 0.4.1 | `MIT OR Apache-2.0` | https://github.com/microsoft/windows-rs | licence files in the published crate archive |
| `windows-sys` | 0.61.2 | `MIT OR Apache-2.0` | https://github.com/microsoft/windows-rs | licence files in the published crate archive |
| `wit-bindgen` | 0.57.1 | `Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT` | https://github.com/bytecodealliance/wit-bindgen | licence files in the published crate archive |
| `writeable` | 0.6.4 | `Unicode-3.0` | https://github.com/unicode-org/icu4x | licence files in the published crate archive |
| `yoke` | 0.8.3 | `Unicode-3.0` | https://github.com/unicode-org/icu4x | licence files in the published crate archive |
| `yoke-derive` | 0.8.2 | `Unicode-3.0` | https://github.com/unicode-org/icu4x | licence files in the published crate archive |
| `zerocopy` | 0.8.57 | `BSD-2-Clause OR Apache-2.0 OR MIT` | https://github.com/google/zerocopy | licence files in the published crate archive |
| `zerocopy-derive` | 0.8.57 | `BSD-2-Clause OR Apache-2.0 OR MIT` | https://github.com/google/zerocopy | licence files in the published crate archive |
| `zerofrom` | 0.1.8 | `Unicode-3.0` | https://github.com/unicode-org/icu4x | licence files in the published crate archive |
| `zerofrom-derive` | 0.1.7 | `Unicode-3.0` | https://github.com/unicode-org/icu4x | licence files in the published crate archive |
| `zerotrie` | 0.2.5 | `Unicode-3.0` | https://github.com/unicode-org/icu4x | licence files in the published crate archive |
| `zerovec` | 0.11.8 | `Unicode-3.0` | https://github.com/unicode-org/icu4x | licence files in the published crate archive |
| `zerovec-derive` | 0.11.6 | `Unicode-3.0` | https://github.com/unicode-org/icu4x | licence files in the published crate archive |
| `zmij` | 1.0.23 | `MIT` | https://github.com/dtolnay/zmij | licence files in the published crate archive |
