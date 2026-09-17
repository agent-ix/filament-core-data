# Third-party notices — agent-ix-extraction-frontend

This crate is licensed AGPL-3.0-or-later (see `LICENSE`). It links the crates
below, each under the licence its manifest declares. The list is generated
from the locked graph (`cargo +1.98.1 tree --locked --edges normal,build -p
agent-ix-extraction-frontend`) and is checked against `Cargo.lock` by
`tests/toolchain.rs::tc_1325_…` (NFR-033-AC-6): every third-party crate
reachable from this crate over normal and build edges has a row naming its
version and licence. Regenerate the tables when the lock moves.

`quire-rs` is AGPL-3.0-or-later, the same licence as this crate;
`deny.toml` admits it by an explicit entry rather than by widening the
allowlist. `jsonschema` reaches the graph only through `quire-rs`'s default
features; this crate declares no `jsonschema` dependency of its own
(NFR-033-AC-3).

## Linked (normal and build edges)

| Crate | Version | Licence | Source |
|---|---|---|---|
| `ahash` | `0.8.12` | MIT OR Apache-2.0 | crates.io |
| `aho-corasick` | `1.1.5` | Unlicense OR MIT | crates.io |
| `anstream` | `1.0.0` | MIT OR Apache-2.0 | crates.io |
| `anstyle` | `1.0.14` | MIT OR Apache-2.0 | crates.io |
| `anstyle-parse` | `1.0.0` | MIT OR Apache-2.0 | crates.io |
| `anstyle-query` | `1.1.5` | MIT OR Apache-2.0 | crates.io |
| `anyhow` | `1.0.104` | MIT OR Apache-2.0 | crates.io |
| `autocfg` | `1.5.1` | Apache-2.0 OR MIT | crates.io |
| `base64` | `0.22.1` | MIT OR Apache-2.0 | crates.io |
| `bit-set` | `0.5.3` | MIT/Apache-2.0 | crates.io |
| `bit-vec` | `0.6.3` | MIT/Apache-2.0 | crates.io |
| `block-buffer` | `0.10.4` | MIT OR Apache-2.0 | crates.io |
| `bstr` | `1.13.1` | MIT OR Apache-2.0 | crates.io |
| `bytecount` | `0.6.9` | Apache-2.0/MIT | crates.io |
| `cfg-if` | `1.0.4` | MIT OR Apache-2.0 | crates.io |
| `clap` | `4.6.6` | MIT OR Apache-2.0 | crates.io |
| `clap_builder` | `4.6.6` | MIT OR Apache-2.0 | crates.io |
| `clap_derive` | `4.6.4` | MIT OR Apache-2.0 | crates.io |
| `clap_lex` | `1.1.0` | MIT OR Apache-2.0 | crates.io |
| `colorchoice` | `1.0.5` | MIT OR Apache-2.0 | crates.io |
| `cpufeatures` | `0.2.17` | MIT OR Apache-2.0 | crates.io |
| `crossbeam-deque` | `0.8.8` | MIT OR Apache-2.0 | crates.io |
| `crossbeam-epoch` | `0.9.21` | MIT OR Apache-2.0 | crates.io |
| `crossbeam-utils` | `0.8.23` | MIT OR Apache-2.0 | crates.io |
| `crypto-common` | `0.1.7` | MIT OR Apache-2.0 | crates.io |
| `deranged` | `0.5.8` | MIT OR Apache-2.0 | crates.io |
| `digest` | `0.10.7` | MIT OR Apache-2.0 | crates.io |
| `displaydoc` | `0.2.7` | MIT OR Apache-2.0 | crates.io |
| `either` | `1.18.0` | MIT OR Apache-2.0 | crates.io |
| `equivalent` | `1.0.2` | Apache-2.0 OR MIT | crates.io |
| `fancy-regex` | `0.13.0` | MIT | crates.io |
| `form_urlencoded` | `1.2.2` | MIT OR Apache-2.0 | crates.io |
| `fraction` | `0.15.4` | MIT OR Apache-2.0 | crates.io |
| `generic-array` | `0.14.7` | MIT | crates.io |
| `getrandom` | `0.3.4` | MIT OR Apache-2.0 | crates.io |
| `getrandom` | `0.4.3` | MIT OR Apache-2.0 | crates.io |
| `globset` | `0.4.20` | Unlicense OR MIT | crates.io |
| `hashbrown` | `0.17.1` | MIT OR Apache-2.0 | crates.io |
| `heck` | `0.5.0` | MIT OR Apache-2.0 | crates.io |
| `icu_collections` | `2.3.0` | Unicode-3.0 | crates.io |
| `icu_locale_core` | `2.3.0` | Unicode-3.0 | crates.io |
| `icu_normalizer` | `2.3.0` | Unicode-3.0 | crates.io |
| `icu_normalizer_data` | `2.3.0` | Unicode-3.0 | crates.io |
| `icu_properties` | `2.3.0` | Unicode-3.0 | crates.io |
| `icu_properties_data` | `2.3.0` | Unicode-3.0 | crates.io |
| `icu_provider` | `2.3.1` | Unicode-3.0 | crates.io |
| `idna` | `1.1.0` | MIT OR Apache-2.0 | crates.io |
| `idna_adapter` | `1.2.2` | Apache-2.0 OR MIT | crates.io |
| `ignore` | `0.4.33` | Unlicense OR MIT | crates.io |
| `indexmap` | `2.14.2` | Apache-2.0 OR MIT | crates.io |
| `is_terminal_polyfill` | `1.70.2` | MIT OR Apache-2.0 | crates.io |
| `iso8601` | `0.6.5` | MIT | crates.io |
| `itoa` | `1.0.18` | MIT OR Apache-2.0 | crates.io |
| `jsonschema` | `0.18.3` | MIT | crates.io |
| `lazy_static` | `1.5.0` | MIT OR Apache-2.0 | crates.io |
| `libc` | `0.2.189` | MIT OR Apache-2.0 | crates.io |
| `libyaml-rs` | `0.3.0` | MIT | crates.io |
| `litemap` | `0.8.3` | Unicode-3.0 | crates.io |
| `lock_api` | `0.4.14` | MIT OR Apache-2.0 | crates.io |
| `log` | `0.4.34` | MIT OR Apache-2.0 | crates.io |
| `memchr` | `2.8.3` | Unlicense OR MIT | crates.io |
| `nom` | `8.0.0` | MIT | crates.io |
| `num` | `0.4.3` | MIT OR Apache-2.0 | crates.io |
| `num-bigint` | `0.4.8` | MIT OR Apache-2.0 | crates.io |
| `num-cmp` | `0.1.0` | MIT/Apache-2.0 | crates.io |
| `num-complex` | `0.4.6` | MIT OR Apache-2.0 | crates.io |
| `num-conv` | `0.2.2` | MIT OR Apache-2.0 | crates.io |
| `num-integer` | `0.1.47` | MIT OR Apache-2.0 | crates.io |
| `num-iter` | `0.1.46` | MIT OR Apache-2.0 | crates.io |
| `num-rational` | `0.4.2` | MIT OR Apache-2.0 | crates.io |
| `num-traits` | `0.2.19` | MIT OR Apache-2.0 | crates.io |
| `once_cell` | `1.21.4` | MIT OR Apache-2.0 | crates.io |
| `parking_lot` | `0.12.5` | MIT OR Apache-2.0 | crates.io |
| `parking_lot_core` | `0.9.12` | MIT OR Apache-2.0 | crates.io |
| `percent-encoding` | `2.3.2` | MIT OR Apache-2.0 | crates.io |
| `potential_utf` | `0.1.6` | Unicode-3.0 | crates.io |
| `powerfmt` | `0.2.0` | MIT OR Apache-2.0 | crates.io |
| `proc-macro2` | `1.0.107` | MIT OR Apache-2.0 | crates.io |
| `quire-rs` | `0.46.0` | AGPL-3.0-or-later | https://github.com/agent-ix/quire-rs?rev=96df8b1#96df8b1d |
| `quote` | `1.0.47` | MIT OR Apache-2.0 | crates.io |
| `rayon` | `1.12.0` | MIT OR Apache-2.0 | crates.io |
| `rayon-core` | `1.13.0` | MIT OR Apache-2.0 | crates.io |
| `regex` | `1.13.1` | MIT OR Apache-2.0 | crates.io |
| `regex-automata` | `0.4.18` | MIT OR Apache-2.0 | crates.io |
| `regex-syntax` | `0.8.11` | MIT OR Apache-2.0 | crates.io |
| `ryu` | `1.0.23` | Apache-2.0 OR BSL-1.0 | crates.io |
| `same-file` | `1.0.6` | Unlicense/MIT | crates.io |
| `scopeguard` | `1.2.0` | MIT OR Apache-2.0 | crates.io |
| `serde` | `1.0.228` | MIT OR Apache-2.0 | crates.io |
| `serde_core` | `1.0.228` | MIT OR Apache-2.0 | crates.io |
| `serde_derive` | `1.0.228` | MIT OR Apache-2.0 | crates.io |
| `serde_json` | `1.0.151` | MIT OR Apache-2.0 | crates.io |
| `sha2` | `0.10.9` | MIT OR Apache-2.0 | crates.io |
| `smallvec` | `1.16.0` | MIT OR Apache-2.0 | crates.io |
| `stable_deref_trait` | `1.2.1` | MIT OR Apache-2.0 | crates.io |
| `strsim` | `0.11.1` | MIT | crates.io |
| `syn` | `2.0.119` | MIT OR Apache-2.0 | crates.io |
| `syn` | `3.0.5` | MIT OR Apache-2.0 | crates.io |
| `synstructure` | `0.13.2` | MIT | crates.io |
| `thiserror` | `2.0.20` | MIT OR Apache-2.0 | crates.io |
| `thiserror-impl` | `2.0.20` | MIT OR Apache-2.0 | crates.io |
| `time` | `0.3.55` | MIT OR Apache-2.0 | crates.io |
| `time-core` | `0.1.9` | MIT OR Apache-2.0 | crates.io |
| `time-macros` | `0.2.32` | MIT OR Apache-2.0 | crates.io |
| `tinystr` | `0.8.4` | Unicode-3.0 | crates.io |
| `tinyvec` | `1.13.2` | Zlib OR Apache-2.0 OR MIT | crates.io |
| `tinyvec_macros` | `0.1.1` | MIT OR Apache-2.0 OR Zlib | crates.io |
| `typenum` | `1.20.1` | MIT OR Apache-2.0 | crates.io |
| `unicode-ident` | `1.0.24` | (MIT OR Apache-2.0) AND Unicode-3.0 | crates.io |
| `unicode-normalization` | `0.1.25` | MIT OR Apache-2.0 | crates.io |
| `url` | `2.5.8` | MIT OR Apache-2.0 | crates.io |
| `utf8_iter` | `1.0.4` | Apache-2.0 OR MIT | crates.io |
| `utf8parse` | `0.2.2` | Apache-2.0 OR MIT | crates.io |
| `uuid` | `1.26.0` | Apache-2.0 OR MIT | crates.io |
| `version_check` | `0.9.5` | MIT/Apache-2.0 | crates.io |
| `walkdir` | `2.5.0` | Unlicense/MIT | crates.io |
| `writeable` | `0.6.4` | Unicode-3.0 | crates.io |
| `yaml_serde` | `0.10.7` | MIT OR Apache-2.0 | crates.io |
| `yoke` | `0.8.3` | Unicode-3.0 | crates.io |
| `yoke-derive` | `0.8.2` | Unicode-3.0 | crates.io |
| `zerocopy` | `0.8.57` | BSD-2-Clause OR Apache-2.0 OR MIT | crates.io |
| `zerofrom` | `0.1.8` | Unicode-3.0 | crates.io |
| `zerofrom-derive` | `0.1.7` | Unicode-3.0 | crates.io |
| `zerotrie` | `0.2.5` | Unicode-3.0 | crates.io |
| `zerovec` | `0.11.8` | Unicode-3.0 | crates.io |
| `zerovec-derive` | `0.11.6` | Unicode-3.0 | crates.io |
| `zmij` | `1.0.23` | MIT | crates.io |

## Development only (dev edges; not linked into the binary)

| Crate | Version | Licence | Source |
|---|---|---|---|
| `bitflags` | `2.13.1` | MIT OR Apache-2.0 | crates.io |
| `fastrand` | `2.5.0` | Apache-2.0 OR MIT | crates.io |
| `ix-trace-rs` | `0.1.0` | AGPL-3.0-or-later | https://github.com/agent-ix/ix-trace-rs?tag=v0.1.1#2ce4ebf4 |
| `linux-raw-sys` | `0.12.1` | Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT | crates.io |
| `rustix` | `1.1.4` | Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT | crates.io |
| `tempfile` | `3.27.0` | MIT OR Apache-2.0 | crates.io |

