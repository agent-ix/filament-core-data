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
        use serde::ser::SerializeMap;
        match self {
            Payload::Text(payload) => {
                let mut map = serializer.serialize_map(Some(1))?;
                map.serialize_entry("text", payload)?;
                map.end()
            }
            Payload::Count(payload) => {
                let mut map = serializer.serialize_map(Some(1))?;
                map.serialize_entry("count", payload)?;
                map.end()
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
        deserializer.deserialize_any(PayloadVisitor)
    }
}

struct PayloadVisitor;

impl<'de> serde::de::Visitor<'de> for PayloadVisitor {
    type Value = Payload;

    fn expecting(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.write_str("an externally tagged Payload")
    }

    fn visit_str<E>(self, tag: &str) -> Result<Self::Value, E>
    where
        E: serde::de::Error,
    {
        Ok(match tag {
            _ => Payload::Unknown(crate::support::UnknownVariant::Tag(tag.to_owned())),
        })
    }

    fn visit_map<A>(self, mut access: A) -> Result<Self::Value, A::Error>
    where
        A: serde::de::MapAccess<'de>,
    {
        let Some(tag) = access.next_key::<String>()? else {
            return Err(serde::de::Error::custom(
                "an externally tagged Payload carries one member",
            ));
        };
        let value = match tag.as_str() {
            "text" => Payload::Text(access.next_value()?),
            "count" => Payload::Count(access.next_value()?),
            _ => Payload::Unknown(crate::support::UnknownVariant::Tagged(
                tag,
                access.next_value()?,
            )),
        };
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
