// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Agent-IX
//! The two-member namespaced revision of
//! [FR-113](../../../spec/functional/FR-113-emit-namespaced-revisions.md).
//!
//! Every revision this producer authors is `{ namespace, value }`, mapping
//! member for member onto the pinned consumer `Revision { namespace, value }`.
//! A bare revision string is not a revision (FR-113-CON-2): it carries no
//! namespace, so it establishes nothing and [`Revision::from_wire`] refuses it.
//!
//! Two revisions sharing one `value` spelling under the two declared namespaces
//! stay two distinct revisions and never merge (FR-113-CON-3). That is a
//! consequence of the type rather than a check: `namespace` participates in
//! `PartialEq` and in `Ord`, so no comparison in this crate can reach a `value`
//! without its namespace.
//!
//! The consumer-owned `NativeSource.revision` is an editable native authority
//! label, not a formal revision. It is modelled by [`NativeSourceLabel`], which
//! is admitted and never refused as a malformed revision selection
//! (FR-113-CON-4, FR-113-AC-6, FND-1714, FND-1715).

use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::refusal::{
    Refusal, REVISION_NAMESPACE_ABSENT, REVISION_NAMESPACE_SUBSTITUTED,
    REVISION_NAMESPACE_UNDECLARED, REVISION_NAMESPACE_UNKNOWN, REVISION_VALUE_ABSENT,
};
use crate::ConfigurationDocument;

/// The namespace of every producer-object revision.
pub const PRODUCER_REVISION_NAMESPACE: &str = "filament-core-data/producer-object-revision-1";
/// The namespace of every native artifact and native definition revision.
pub const NATIVE_REVISION_NAMESPACE: &str = "quire-native/definition-revision-1";

/// The complete closed admissible revision-namespace vocabulary of this interface.
pub const ADMISSIBLE_REVISION_NAMESPACES: [&str; 2] =
    [PRODUCER_REVISION_NAMESPACE, NATIVE_REVISION_NAMESPACE];

/// A producer-authored two-member revision selection.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Revision {
    /// The explicitly selected namespace; never defaulted and never inferred.
    pub namespace: String,
    /// The opaque revision value within that namespace.
    pub value: String,
}

impl Revision {
    /// Authors a revision under an explicitly named namespace.
    pub fn new(namespace: impl Into<String>, value: impl Into<String>) -> Self {
        Self {
            namespace: namespace.into(),
            value: value.into(),
        }
    }

    /// Authors a producer-object revision.
    pub fn producer(value: impl Into<String>) -> Self {
        Self::new(PRODUCER_REVISION_NAMESPACE, value)
    }

    /// Authors a native artifact or native definition revision.
    pub fn native(value: impl Into<String>) -> Self {
        Self::new(NATIVE_REVISION_NAMESPACE, value)
    }

    /// Reads a revision from one transmitted JSON member.
    ///
    /// A bare string refuses as [`REVISION_NAMESPACE_ABSENT`] and binds nothing;
    /// so does an object carrying no `namespace` member (FR-113-AC-3).
    pub fn from_wire(value: &Value) -> Result<Self, Refusal> {
        match value {
            Value::String(text) => Err(Refusal::new(
                REVISION_NAMESPACE_ABSENT,
                format!("{text} is a bare revision string and carries no namespace"),
            )),
            Value::Object(members) => {
                if !members.contains_key("namespace") {
                    return Err(Refusal::new(
                        REVISION_NAMESPACE_ABSENT,
                        "revision declares no namespace member",
                    ));
                }
                serde_json::from_value(value.clone()).map_err(|error| {
                    Refusal::new(REVISION_NAMESPACE_ABSENT, format!("revision: {error}"))
                })
            }
            other => Err(Refusal::new(
                REVISION_NAMESPACE_ABSENT,
                format!("{other} is not a two-member revision selection"),
            )),
        }
    }

    /// Refuses a revision of one class presented under the other class's namespace.
    pub fn validate_namespace(&self, namespace: &str) -> Result<(), Refusal> {
        if self.namespace.is_empty() {
            return Err(Refusal::new(
                REVISION_NAMESPACE_ABSENT,
                format!("revision {} declares no namespace", self.value),
            ));
        }
        if self.namespace != namespace {
            return Err(Refusal::new(
                REVISION_NAMESPACE_SUBSTITUTED,
                format!(
                    "expected namespace {namespace}, got {} on revision {}",
                    self.namespace, self.value
                ),
            ));
        }
        self.validate_value()
    }

    /// Refuses a namespace outside the closed admissible vocabulary.
    pub fn validate_vocabulary(&self) -> Result<(), Refusal> {
        if self.namespace.is_empty() {
            return Err(Refusal::new(
                REVISION_NAMESPACE_ABSENT,
                format!("revision {} declares no namespace", self.value),
            ));
        }
        if !ADMISSIBLE_REVISION_NAMESPACES.contains(&self.namespace.as_str()) {
            return Err(Refusal::new(
                REVISION_NAMESPACE_UNKNOWN,
                format!(
                    "{} lies outside the closed admissible revision-namespace vocabulary",
                    self.namespace
                ),
            ));
        }
        self.validate_value()
    }

    /// Refuses a namespace the configuration document does not declare as a selection.
    ///
    /// Outside the vocabulary and inside it but undeclared are two separate
    /// refusals (FND-1723, FR-113-AC-4).
    pub fn validate_selected(&self, configuration: &ConfigurationDocument) -> Result<(), Refusal> {
        self.validate_vocabulary()?;
        if !configuration.revision_namespaces.contains(&self.namespace) {
            return Err(Refusal::new(
                REVISION_NAMESPACE_UNDECLARED,
                format!(
                    "{} does not declare the in-vocabulary namespace {}",
                    configuration.configuration_identity, self.namespace
                ),
            ));
        }
        Ok(())
    }

    fn validate_value(&self) -> Result<(), Refusal> {
        if self.value.is_empty() {
            return Err(Refusal::new(
                REVISION_VALUE_ABSENT,
                format!("revision in {} declares no value", self.namespace),
            ));
        }
        Ok(())
    }
}

/// The consumer-owned `NativeSource` record: an editable native authority label.
///
/// Its `revision` member is a label, not a formal revision, and this interface
/// does not govern it: a source-provenance record carrying it is admitted and
/// it never refuses as a malformed revision selection (FR-113-CON-4).
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct NativeSourceLabel {
    /// The native source identity.
    pub identity: String,
    /// The editable native authority label; not a formal revision.
    pub revision: String,
}

impl NativeSourceLabel {
    /// Admits one native authority label. This constructor refuses nothing.
    pub fn new(identity: impl Into<String>, revision: impl Into<String>) -> Self {
        Self {
            identity: identity.into(),
            revision: revision.into(),
        }
    }
}
