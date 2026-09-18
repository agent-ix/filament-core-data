//! Independent Rust reader for the Filament semantic IR v1 contract.
//!
//! Every rule this crate decides is derived from `schema/semantic/v1/*.json`,
//! `docs/semantic-data-system/contracts-v1.md`, and
//! `conformance/diagnostic-codes.json`, and from nothing else.
//! `crates/semantic-ir/RULES.md` beside this file records the derivation source
//! of each one, and FR-059-CON-1 forbids this crate to read or link
//! `conformance/oracle/` or `src/compiler/ir/`.
//!
//! ```
//! use agent_ix_semantic_ir::{decide, json::parse};
//! // fcd#179: contract 1.0.0 is deleted; `schema::semantic_ir` closes
//! // `contractVersion` to `["2.0.0"]` (`expect_enum` in `schema.rs`), so this
//! // document's single diagnostic is SCHEMA_VIOLATION at `/ir/contractVersion`,
//! // "contractVersion is a closed enumeration and 1.0.0 is not a member" —
//! // real version enforcement, not an artifact of the fragment's other
//! // absent members.
//! let bundle = parse(r#"{"ir":{"contractVersion":"1.0.0"}}"#).expect("a document");
//! let verdict = decide(&bundle);
//! assert!(!verdict.diagnostics.is_empty());
//! ```
#![forbid(unsafe_code)]
#![deny(missing_docs)]

pub mod compat;
pub mod constructs;
pub mod diag;
pub mod json;
pub mod normalize;
pub mod number;
pub mod patch;
pub mod regex262;
pub mod rules;
pub mod schema;
pub mod vocabulary;

use crate::diag::{Located, Severity};
use crate::json::{to_canonical_string, Json};

/// The three states a verdict can take.
///
/// `spec/functional/FR-036`: "`success` when it emits no diagnostic, `invalid`
/// when it emits at least one diagnostic of severity `error`, and `lossy` when
/// it emits at least one diagnostic and none of severity `error`".
/// `unsupported`, `unavailable` and `partial` are adapter states, not verdicts.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ResultState {
    /// No diagnostic.
    Success,
    /// At least one error.
    Invalid,
    /// At least one diagnostic, none an error.
    Lossy,
}

impl ResultState {
    /// The wire name.
    pub fn as_str(self) -> &'static str {
        match self {
            ResultState::Success => "success",
            ResultState::Invalid => "invalid",
            ResultState::Lossy => "lossy",
        }
    }
}

/// One verdict over one input bundle.
pub struct Verdict {
    /// The result state.
    pub result_state: ResultState,
    /// The ordered diagnostics.
    pub diagnostics: Vec<Located>,
    /// The corpus comparison form of the bundle's IR document.
    pub normalized: String,
}

/// Decides one input bundle.
///
/// The schema layer runs first, and when it produces any diagnostic it is the
/// only layer that speaks, so a schema-decided case is decided once.
/// `normalized` is produced either way, because the harness compares the string
/// unconditionally.
pub fn decide(bundle: &Json) -> Verdict {
    let mut diagnostics = schema::decide(bundle);
    if diagnostics.is_empty() {
        diagnostics = rules::decide(bundle);
    }
    order(&mut diagnostics);
    // An `info` diagnostic is advisory: a document carrying only advisories is
    // accepted as it stands.
    let result_state = if diagnostics
        .iter()
        .all(|diagnostic| diagnostic.severity == Severity::Info)
    {
        ResultState::Success
    } else if diagnostics
        .iter()
        .any(|diagnostic| diagnostic.severity == Severity::Error)
    {
        ResultState::Invalid
    } else {
        ResultState::Lossy
    };
    Verdict {
        result_state,
        diagnostics,
        normalized: normalize::normalized(bundle),
    }
}

/// Orders diagnostics by `pointer` under a code-point comparison, then by
/// `code`, then by `message`, then by the canonical form of the diagnostic, so
/// that no two diagnostics tie and no comparison is locale-sensitive.
fn order(diagnostics: &mut [Located]) {
    diagnostics.sort_by(|left, right| {
        left.pointer
            .as_bytes()
            .cmp(right.pointer.as_bytes())
            .then_with(|| left.code.as_bytes().cmp(right.code.as_bytes()))
            .then_with(|| left.message.as_bytes().cmp(right.message.as_bytes()))
            .then_with(|| {
                let locus = |diagnostic: &Located| {
                    diagnostic
                        .locus
                        .as_ref()
                        .map(to_canonical_string)
                        .unwrap_or_default()
                };
                locus(left).into_bytes().cmp(&locus(right).into_bytes())
            })
    });
}

/// Whether a bundle's document layer accepts it.
pub fn is_valid(bundle: &Json) -> bool {
    decide(bundle).result_state != ResultState::Invalid
}
