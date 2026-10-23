//! Payload
//!
//! Semantic identity: ix://agent-ix/conformance/type/Payload.

use serde::{Deserialize, Serialize};

/// Payload
///
/// Semantic identity: ix://agent-ix/conformance/type/Payload.
#[derive(Clone, Debug, PartialEq)]
pub enum Payload {
    /// payload-text
    ///
    /// Semantic identity: ix://agent-ix/conformance/variant/payload-text.
    Text(crate::Text),
    /// payload-count
    ///
    /// Semantic identity: ix://agent-ix/conformance/variant/payload-count.
    Count(crate::Count),
    /// A variant the contract does not declare, retained under this
    /// type's `surface` unknown policy.
    Unknown(crate::support::UnknownVariant),
}

impl Serialize for Payload {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        match self {
            Payload::Text(payload) => {
                crate::support::serialize_adjacent_payload(serializer, "text", payload)
            }
            Payload::Count(payload) => {
                crate::support::serialize_adjacent_payload(serializer, "count", payload)
            }
            Payload::Unknown(unknown) => unknown.serialize(serializer),
        }
    }
}

impl<'de> Deserialize<'de> for Payload {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        deserializer.deserialize_map(PayloadVisitor)
    }
}

struct PayloadVisitor;

impl<'de> serde::de::Visitor<'de> for PayloadVisitor {
    type Value = Payload;

    fn expecting(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.write_str("an adjacently tagged Payload")
    }

    fn visit_map<A>(self, mut access: A) -> Result<Self::Value, A::Error>
    where
        A: serde::de::MapAccess<'de>,
    {
        let Some(member) = access.next_key::<String>()? else {
            return Err(serde::de::Error::custom(
                "an adjacently tagged Payload requires kind",
            ));
        };
        let (tag, mut buffered) = match member.as_str() {
            "kind" => (access.next_value::<String>()?, None),
            "value" => {
                let value = access.next_value::<crate::support::SemanticValue>()?;
                let Some(member) = access.next_key::<String>()? else {
                    return Err(serde::de::Error::missing_field("kind"));
                };
                if member != "kind" {
                    return Err(serde::de::Error::unknown_field(&member, &["kind"]));
                }
                (access.next_value::<String>()?, Some(value))
            }
            _ => return Err(serde::de::Error::unknown_field(&member, &["kind", "value"])),
        };
        let value = match tag.as_str() {
            "text" => {
                let payload = match buffered.take() {
                    Some(value) => crate::support::deserialize_semantic(value)
                        .map_err(serde::de::Error::custom)?,
                    None => crate::support::read_adjacent_payload(&mut access)?,
                };
                Payload::Text(payload)
            }
            "count" => {
                let payload = match buffered.take() {
                    Some(value) => crate::support::deserialize_semantic(value)
                        .map_err(serde::de::Error::custom)?,
                    None => crate::support::read_adjacent_payload(&mut access)?,
                };
                Payload::Count(payload)
            }
            _ => {
                let unknown = match buffered.take() {
                    Some(value) => crate::support::UnknownVariant::Tagged(tag, value),
                    None => match access.next_key::<String>()? {
                        None => crate::support::UnknownVariant::Tag(tag),
                        Some(member) if member == "value" => {
                            crate::support::UnknownVariant::Tagged(tag, access.next_value()?)
                        }
                        Some(member) => {
                            return Err(serde::de::Error::unknown_field(&member, &["value"]));
                        }
                    },
                };
                Payload::Unknown(unknown)
            }
        };
        if let Some(member) = access.next_key::<String>()? {
            return Err(serde::de::Error::unknown_field(&member, &[]));
        }
        Ok(value)
    }
}

impl Payload {
    /// The non-blocking diagnostics this value carries.
    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {
        if let Payload::Unknown(unknown) = self {
            return vec![crate::support::Diagnostic::new(
                "agent-ix.rust-backend.UNKNOWN_MEMBER_SURFACED",
                "warning",
                "ix://agent-ix/filament-core-data/rust-backend",
                false,
                format!(
                    "the variant {} is not declared by ix://agent-ix/conformance/type/Payload",
                    unknown.tag()
                ),
            )];
        }
        Vec::new()
    }
}
