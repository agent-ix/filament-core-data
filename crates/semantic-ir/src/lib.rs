//! Independent Rust reader for the Filament semantic IR v1 contract.
//!
//! Every rule this crate decides is derived from `schema/semantic/v1/*.json`,
//! `docs/semantic-data-system/contracts-v1.md`, and
//! `conformance/diagnostic-codes.json`, and from nothing else. `RULES.md`
//! beside this file records the derivation source of each one.
#![forbid(unsafe_code)]
#![deny(missing_docs)]

pub mod json;
pub mod number;
