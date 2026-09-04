#![forbid(unsafe_code)]
#![deny(missing_docs)]
//! Generated Rust/Serde declarations for `agent-ix/conformance`.
//!
//! Every declaration here is derived from the semantic contract by one
//! published mapping. Nothing in this crate is hand-written and nothing in
//! it should be hand-edited.

pub mod identity;
pub mod metadata;
pub mod support;
pub mod types;

pub use crate::metadata::{FieldMeta, TypeMeta, TYPES};
pub use crate::types::leaf::Leaf;
pub use crate::types::text::Text;

/// One variant per generated type.
///
/// A consumer that matches exhaustively over this enum stops compiling when
/// the contract gains a type, which is the point: a contract addition is a
/// compile error in the consumer rather than a silent omission.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum SemanticType {
    /// Text
    ///
    /// Semantic identity: ix://agent-ix/conformance/type/Text.
    Text,
    /// Leaf
    ///
    /// Semantic identity: ix://agent-ix/conformance/type/Leaf.
    Leaf,
}

impl SemanticType {
    /// The semantic identity of the type the variant names.
    pub fn identity(&self) -> &'static str {
        match self {
            SemanticType::Text => "ix://agent-ix/conformance/type/Text",
            SemanticType::Leaf => "ix://agent-ix/conformance/type/Leaf",
        }
    }
}
