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
pub use crate::types::count::Count;
pub use crate::types::millis::Millis;
pub use crate::types::node::Node;
pub use crate::types::node_ref::NodeRef;
pub use crate::types::payload::Payload;
pub use crate::types::root::Root;
pub use crate::types::status::Status;
pub use crate::types::text::Text;
pub use crate::types::text_list::TextList;
pub use crate::types::text_map::TextMap;

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
    ///
    /// Roles: agent-ix:value.
    Text,
    /// Count
    ///
    /// Semantic identity: ix://agent-ix/conformance/type/Count.
    Count,
    /// Millis
    ///
    /// Semantic identity: ix://agent-ix/conformance/type/Millis.
    Millis,
    /// Status
    ///
    /// Semantic identity: ix://agent-ix/conformance/type/Status.
    ///
    /// Roles: agent-ix:state.
    Status,
    /// TextList
    ///
    /// Semantic identity: ix://agent-ix/conformance/type/TextList.
    TextList,
    /// TextMap
    ///
    /// Semantic identity: ix://agent-ix/conformance/type/TextMap.
    TextMap,
    /// Payload
    ///
    /// Semantic identity: ix://agent-ix/conformance/type/Payload.
    Payload,
    /// NodeRef
    ///
    /// Semantic identity: ix://agent-ix/conformance/type/NodeRef.
    NodeRef,
    /// Node
    ///
    /// Semantic identity: ix://agent-ix/conformance/type/Node.
    ///
    /// Roles: agent-ix:entity.
    Node,
    /// Root
    ///
    /// Semantic identity: ix://agent-ix/conformance/type/Root.
    ///
    /// Roles: agent-ix:entity, agent-ix:aggregate.
    Root,
}

impl SemanticType {
    /// The semantic identity of the type the variant names.
    pub fn identity(&self) -> &'static str {
        match self {
            SemanticType::Text => "ix://agent-ix/conformance/type/Text",
            SemanticType::Count => "ix://agent-ix/conformance/type/Count",
            SemanticType::Millis => "ix://agent-ix/conformance/type/Millis",
            SemanticType::Status => "ix://agent-ix/conformance/type/Status",
            SemanticType::TextList => "ix://agent-ix/conformance/type/TextList",
            SemanticType::TextMap => "ix://agent-ix/conformance/type/TextMap",
            SemanticType::Payload => "ix://agent-ix/conformance/type/Payload",
            SemanticType::NodeRef => "ix://agent-ix/conformance/type/NodeRef",
            SemanticType::Node => "ix://agent-ix/conformance/type/Node",
            SemanticType::Root => "ix://agent-ix/conformance/type/Root",
        }
    }
}

/// Every extension identity the contract this crate was generated from
/// declares, ordered by code point.
pub const DECLARED_EXTENSION_IDENTITIES: &[&str] = &["ix://agent-ix/conformance/ext/doc"];

/// The capabilities this crate admits.
///
/// Empty, and empty is a stated decision rather than an omission.
/// `consumer-policy.schema.json` is sealed and carries no capability
/// member, and the published `rust` target contract declares no capability
/// list, so there is no published input a non-empty set could be read from.
/// That is GAP-007 in `conformance/contract-gaps.json`, owned by issue #9.
/// A crate that claimed to admit a capability nobody published would be
/// inventing the rule the gap records as missing.
pub const ADMITTED_CAPABILITIES: &[&str] = &[];

/// Decides one extension against this crate's declared set.
///
/// An empty result is acceptance; a blocking diagnostic is rejection. A
/// `required: false` extension is always preserved, whatever its identity.
pub fn decide_extension(extension: &support::Extension) -> Vec<support::Diagnostic> {
    extension.decide(DECLARED_EXTENSION_IDENTITIES, ADMITTED_CAPABILITIES)
}
