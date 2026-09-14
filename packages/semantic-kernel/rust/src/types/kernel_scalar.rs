//! KernelScalar
//!
//! Semantic identity: ix://agent-ix/semantic-core/type/KernelScalar.

use serde::{Deserialize, Serialize};

/// KernelScalar
///
/// Semantic identity: ix://agent-ix/semantic-core/type/KernelScalar.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum KernelScalar {
    /// UUID
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/KernelScalar/variant/UUID.
    #[serde(rename = "UUID")]
    Uuid,
    /// Boolean
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/KernelScalar/variant/Boolean.
    Boolean,
    /// Integer
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/KernelScalar/variant/Integer.
    Integer,
    /// Decimal
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/KernelScalar/variant/Decimal.
    Decimal,
    /// String
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/KernelScalar/variant/String.
    String,
    /// Timestamp
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/KernelScalar/variant/Timestamp.
    Timestamp,
    /// Duration
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/KernelScalar/variant/Duration.
    Duration,
    /// Bytes
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/KernelScalar/variant/Bytes.
    Bytes,
    /// JsonObject
    ///
    /// Semantic identity: ix://agent-ix/semantic-core/type/KernelScalar/variant/JsonObject.
    JsonObject,
}

impl KernelScalar {
    /// The non-blocking diagnostics this value carries.
    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {
        Vec::new()
    }
}
