# Third-party notices — agent-ix-extraction-frontend

This crate is licensed AGPL-3.0-or-later (see `LICENSE`). It links the crates
below, each under the licence its manifest declares. The list is generated
from the locked graph (`cargo tree --locked --edges normal,build -p
agent-ix-extraction-frontend`): every third-party crate reachable from this
crate over normal and build edges has a row naming its licence. The versions
are the lock's business and are not repeated here.

`quire-rs` is AGPL-3.0-or-later, the same licence as this crate;
`deny.toml` admits it by an explicit entry rather than by widening the
allowlist. `jsonschema` reaches the graph only through `quire-rs`'s default
features; this crate declares no `jsonschema` dependency of its own
(NFR-033-AC-3).

## Linked (normal and build edges)

| Crate | Licence | Source |
|---|---|---|
| `agent-ix-semantic-schema` | AGPL-3.0-or-later | https://github.com/agent-ix/filament-core-data |
| `ahash` | MIT OR Apache-2.0 | crates.io |
| `aho-corasick` | Unlicense OR MIT | crates.io |
| `anstream` | MIT OR Apache-2.0 | crates.io |
| `anstyle` | MIT OR Apache-2.0 | crates.io |
| `anstyle-parse` | MIT OR Apache-2.0 | crates.io |
| `anstyle-query` | MIT OR Apache-2.0 | crates.io |
| `anyhow` | MIT OR Apache-2.0 | crates.io |
| `autocfg` | Apache-2.0 OR MIT | crates.io |
| `base64` | MIT OR Apache-2.0 | crates.io |
| `bit-set` | MIT/Apache-2.0 | crates.io |
| `bit-vec` | MIT/Apache-2.0 | crates.io |
| `block-buffer` | MIT OR Apache-2.0 | crates.io |
| `bstr` | MIT OR Apache-2.0 | crates.io |
| `bytecount` | Apache-2.0/MIT | crates.io |
| `cc` | MIT OR Apache-2.0 | https://github.com/rust-lang/cc-rs |
| `cfg-if` | MIT OR Apache-2.0 | crates.io |
| `clap` | MIT OR Apache-2.0 | crates.io |
| `clap_builder` | MIT OR Apache-2.0 | crates.io |
| `clap_derive` | MIT OR Apache-2.0 | crates.io |
| `clap_lex` | MIT OR Apache-2.0 | crates.io |
| `colorchoice` | MIT OR Apache-2.0 | crates.io |
| `cpufeatures` | MIT OR Apache-2.0 | crates.io |
| `crossbeam-deque` | MIT OR Apache-2.0 | crates.io |
| `crossbeam-epoch` | MIT OR Apache-2.0 | crates.io |
| `crossbeam-utils` | MIT OR Apache-2.0 | crates.io |
| `crypto-common` | MIT OR Apache-2.0 | crates.io |
| `deranged` | MIT OR Apache-2.0 | crates.io |
| `digest` | MIT OR Apache-2.0 | crates.io |
| `displaydoc` | MIT OR Apache-2.0 | crates.io |
| `either` | MIT OR Apache-2.0 | crates.io |
| `equivalent` | Apache-2.0 OR MIT | crates.io |
| `fancy-regex` | MIT | crates.io |
| `find-msvc-tools` | MIT OR Apache-2.0 | https://github.com/rust-lang/cc-rs |
| `form_urlencoded` | MIT OR Apache-2.0 | crates.io |
| `fraction` | MIT OR Apache-2.0 | crates.io |
| `generic-array` | MIT | crates.io |
| `getrandom` | MIT OR Apache-2.0 | crates.io |
| `getrandom` | MIT OR Apache-2.0 | crates.io |
| `globset` | Unlicense OR MIT | crates.io |
| `hashbrown` | MIT OR Apache-2.0 | crates.io |
| `heck` | MIT OR Apache-2.0 | crates.io |
| `icu_collections` | Unicode-3.0 | crates.io |
| `icu_locale_core` | Unicode-3.0 | crates.io |
| `icu_normalizer` | Unicode-3.0 | crates.io |
| `icu_normalizer_data` | Unicode-3.0 | crates.io |
| `icu_properties` | Unicode-3.0 | crates.io |
| `icu_properties_data` | Unicode-3.0 | crates.io |
| `icu_provider` | Unicode-3.0 | crates.io |
| `idna` | MIT OR Apache-2.0 | crates.io |
| `idna_adapter` | Apache-2.0 OR MIT | crates.io |
| `ignore` | Unlicense OR MIT | crates.io |
| `indexmap` | Apache-2.0 OR MIT | crates.io |
| `is_terminal_polyfill` | MIT OR Apache-2.0 | crates.io |
| `iso8601` | MIT | crates.io |
| `itoa` | MIT OR Apache-2.0 | crates.io |
| `jsonschema` | MIT | crates.io |
| `lazy_static` | MIT OR Apache-2.0 | crates.io |
| `libc` | MIT OR Apache-2.0 | crates.io |
| `libyaml-rs` | MIT | crates.io |
| `litemap` | Unicode-3.0 | crates.io |
| `lock_api` | MIT OR Apache-2.0 | crates.io |
| `log` | MIT OR Apache-2.0 | crates.io |
| `memchr` | Unlicense OR MIT | crates.io |
| `nom` | MIT | crates.io |
| `num` | MIT OR Apache-2.0 | crates.io |
| `num-bigint` | MIT OR Apache-2.0 | crates.io |
| `num-cmp` | MIT/Apache-2.0 | crates.io |
| `num-complex` | MIT OR Apache-2.0 | crates.io |
| `num-conv` | MIT OR Apache-2.0 | crates.io |
| `num-integer` | MIT OR Apache-2.0 | crates.io |
| `num-iter` | MIT OR Apache-2.0 | crates.io |
| `num-rational` | MIT OR Apache-2.0 | crates.io |
| `num-traits` | MIT OR Apache-2.0 | crates.io |
| `once_cell` | MIT OR Apache-2.0 | crates.io |
| `parking_lot` | MIT OR Apache-2.0 | crates.io |
| `parking_lot_core` | MIT OR Apache-2.0 | crates.io |
| `percent-encoding` | MIT OR Apache-2.0 | crates.io |
| `potential_utf` | Unicode-3.0 | crates.io |
| `powerfmt` | MIT OR Apache-2.0 | crates.io |
| `proc-macro2` | MIT OR Apache-2.0 | crates.io |
| `quire-code-parse` | AGPL-3.0-or-later | https://github.com/agent-ix/quire-code-rs |
| `quire-rs` | AGPL-3.0-or-later | https://github.com/agent-ix/quire-rs |
| `quire-rust-extraction` | AGPL-3.0-or-later | https://github.com/agent-ix/quire-rs |
| `quote` | MIT OR Apache-2.0 | crates.io |
| `rayon` | MIT OR Apache-2.0 | crates.io |
| `rayon-core` | MIT OR Apache-2.0 | crates.io |
| `regex` | MIT OR Apache-2.0 | crates.io |
| `regex-automata` | MIT OR Apache-2.0 | crates.io |
| `regex-syntax` | MIT OR Apache-2.0 | crates.io |
| `ryu` | Apache-2.0 OR BSL-1.0 | crates.io |
| `same-file` | Unlicense/MIT | crates.io |
| `scopeguard` | MIT OR Apache-2.0 | crates.io |
| `serde` | MIT OR Apache-2.0 | crates.io |
| `serde_core` | MIT OR Apache-2.0 | crates.io |
| `serde_derive` | MIT OR Apache-2.0 | crates.io |
| `serde_json` | MIT OR Apache-2.0 | crates.io |
| `sha2` | MIT OR Apache-2.0 | crates.io |
| `shlex` | MIT OR Apache-2.0 | https://github.com/comex/rust-shlex |
| `smallvec` | MIT OR Apache-2.0 | crates.io |
| `stable_deref_trait` | MIT OR Apache-2.0 | crates.io |
| `streaming-iterator` | MIT OR Apache-2.0 | crates.io |
| `strsim` | MIT | crates.io |
| `syn` | MIT OR Apache-2.0 | crates.io |
| `syn` | MIT OR Apache-2.0 | crates.io |
| `synstructure` | MIT | crates.io |
| `thiserror` | MIT OR Apache-2.0 | crates.io |
| `thiserror-impl` | MIT OR Apache-2.0 | crates.io |
| `time` | MIT OR Apache-2.0 | crates.io |
| `time-core` | MIT OR Apache-2.0 | crates.io |
| `time-macros` | MIT OR Apache-2.0 | crates.io |
| `tinystr` | Unicode-3.0 | crates.io |
| `tinyvec` | Zlib OR Apache-2.0 OR MIT | crates.io |
| `tinyvec_macros` | MIT OR Apache-2.0 OR Zlib | crates.io |
| `tree-sitter` | MIT | crates.io |
| `tree-sitter-language` | MIT | crates.io |
| `tree-sitter-python` | MIT | crates.io |
| `tree-sitter-rust` | MIT | crates.io |
| `tree-sitter-typescript` | MIT | crates.io |
| `typenum` | MIT OR Apache-2.0 | crates.io |
| `unicode-ident` | (MIT OR Apache-2.0) AND Unicode-3.0 | crates.io |
| `unicode-normalization` | MIT OR Apache-2.0 | crates.io |
| `url` | MIT OR Apache-2.0 | crates.io |
| `utf8_iter` | Apache-2.0 OR MIT | crates.io |
| `utf8parse` | Apache-2.0 OR MIT | crates.io |
| `uuid` | Apache-2.0 OR MIT | crates.io |
| `version_check` | MIT/Apache-2.0 | crates.io |
| `walkdir` | Unlicense/MIT | crates.io |
| `writeable` | Unicode-3.0 | crates.io |
| `yaml_serde` | MIT OR Apache-2.0 | crates.io |
| `yoke` | Unicode-3.0 | crates.io |
| `yoke-derive` | Unicode-3.0 | crates.io |
| `zerocopy` | BSD-2-Clause OR Apache-2.0 OR MIT | crates.io |
| `zerofrom` | Unicode-3.0 | crates.io |
| `zerofrom-derive` | Unicode-3.0 | crates.io |
| `zerotrie` | Unicode-3.0 | crates.io |
| `zerovec` | Unicode-3.0 | crates.io |
| `zerovec-derive` | Unicode-3.0 | crates.io |
| `zmij` | MIT | crates.io |

## Development only (dev edges; not linked into the binary)

| Crate | Licence | Source |
|---|---|---|
| `bitflags` | MIT OR Apache-2.0 | crates.io |
| `fastrand` | Apache-2.0 OR MIT | crates.io |
| `ix-trace-rs` | AGPL-3.0-or-later | https://github.com/agent-ix/ix-trace-rs |
| `linux-raw-sys` | Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT | crates.io |
| `rustix` | Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT | crates.io |
| `tempfile` | MIT OR Apache-2.0 | crates.io |
