//! FR-097 "Validation at lift time": the independent reader decides every
//! assembled document before any write.
//!
//! [`validate`] is the only constructor of [`ValidDocument`], and
//! [`crate::write::Emission::Document`] is the only way `<out>` reaches disk;
//! a document the reader rejected therefore has no path to the output file
//! (FR-097-CON-3). Every reader diagnostic — schema and cross-field alike —
//! becomes one blocking `INVALID_IR` through [`crate::Diagnostic::reader`].

use agent_ix_semantic_ir::{decide, ResultState};
use serde_json::Value;

use crate::canonical::{bundle_of, canonical_bytes, sort_node_lists};
use crate::diagnostics::Diagnostic;

/// A document `agent_ix_semantic_ir::decide` returned a success verdict
/// over, with the bytes the reader's canonical form gives it.
#[derive(Debug, Clone, PartialEq)]
pub struct ValidDocument {
    value: Value,
    bytes: Vec<u8>,
    result_state: ResultState,
}

impl ValidDocument {
    /// The sorted document the reader accepted.
    pub fn value(&self) -> &Value {
        &self.value
    }

    /// The bytes `<out>` receives: `normalized(&{"ir": document})`.
    pub fn bytes(&self) -> &[u8] {
        &self.bytes
    }

    /// The reader's state, always [`ResultState::Success`].
    pub fn result_state(&self) -> ResultState {
        self.result_state
    }
}

/// One `INVALID_IR` per reader diagnostic over `document` as it stands
/// (FR-097 "Validation at lift time"); empty exactly when the reader
/// returns success with no diagnostic. The caller sorts the node lists
/// first; [`validate`] does both.
pub fn validate_document(document: &Value) -> Vec<Diagnostic> {
    let verdict = decide(&bundle_of(document));
    let mut out: Vec<Diagnostic> = verdict.diagnostics.iter().map(Diagnostic::reader).collect();
    if out.is_empty() && verdict.result_state != ResultState::Success {
        // Unreachable by the reader's own definition of its states, kept so
        // a non-success verdict can never pass silently.
        out.push(Diagnostic::frontend(
            crate::diagnostics::Code::InvalidIr,
            format!(
                "the reader returned `{}` with no diagnostic",
                verdict.result_state.as_str()
            ),
            None,
        ));
    }
    out
}

/// Sort the node lists of `document`, decide it, and return it as a
/// [`ValidDocument`] with its canonical bytes — or the `INVALID_IR`
/// diagnostics that refuse it.
pub fn validate(mut document: Value) -> Result<ValidDocument, Vec<Diagnostic>> {
    sort_node_lists(&mut document);
    let diagnostics = validate_document(&document);
    if !diagnostics.is_empty() {
        return Err(diagnostics);
    }
    let bytes = canonical_bytes(&document);
    Ok(ValidDocument {
        value: document,
        bytes,
        result_state: ResultState::Success,
    })
}
