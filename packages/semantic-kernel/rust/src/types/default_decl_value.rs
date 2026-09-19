//! DefaultDeclValue
//!
//! Semantic identity: ix://agent-ix/semantic-core/DefaultDeclValue.

use serde::{Deserialize, Serialize};

/// The fields of `DefaultDeclValue`, in the order the contract declares them.
pub const FIELDS: &[crate::identity::FieldMeta] = &[];

/// DefaultDeclValue
///
/// Semantic identity: ix://agent-ix/semantic-core/DefaultDeclValue.
#[derive(Clone, Debug, PartialEq, Serialize)]
pub struct DefaultDeclValue {
    /// The members the contract did not declare, retained under this
    /// record's `preserve` unknown policy.
    #[serde(flatten)]
    pub unknown_members: crate::support::UnknownMembers,
}

/// The deserialization shape of `DefaultDeclValue`.
///
/// It exists so that `Deserialize` can route through `try_new`: serde has
/// no post-deserialization hook, and a value that skipped the constructor
/// would be a value the contract's constraints never saw.
#[derive(Deserialize)]
struct DefaultDeclValueWire {
    #[serde(flatten)]
    unknown_members: crate::support::UnknownMembers,
}

impl DefaultDeclValue {
    /// Builds the record, enforcing every bound and uniqueness rule the
    /// contract declares on its members. Deserialization routes through
    /// this constructor.
    pub fn try_new(
        unknown_members: crate::support::UnknownMembers,
    ) -> Result<Self, crate::support::ValidationError> {
        Ok(Self { unknown_members })
    }

    /// The non-blocking diagnostics this value carries.
    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {
        Vec::new()
    }
}

impl<'de> Deserialize<'de> for DefaultDeclValue {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let wire = DefaultDeclValueWire::deserialize(deserializer)?;
        Self::try_new(wire.unknown_members).map_err(serde::de::Error::custom)
    }
}
