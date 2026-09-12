// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Agent-IX
//! The static producer bundle and its one indivisible admission operation
//! ([FR-117](../../../spec/functional/FR-117-admit-a-static-producer-bundle.md)).
//!
//! [`StaticProducerBundle`] is the **unvalidated offer**: four header members —
//! the bundle identity, the bundle's namespaced revision, the bundle's canonical
//! digest selection, and the producer interface version FR-126 declares — and
//! exactly nine content member classes: the selected model, the selected profile,
//! the component declarations, the endpoint declarations, the relationship
//! records, the inventory declaration, the configuration document, the
//! configuration's static prerequisite closure, and the correspondence records.
//! The type is closed over those nine content classes and over the exclusion of
//! every assessment member class, and over no header member (FR-117-CON-1,
//! FND-1800, FND-1820, E1).
//!
//! [`AdmittedStaticBundle`] is the **admitted** bundle, and the only way to
//! obtain one is [`StaticProducerBundle::admit`] or
//! [`StaticProducerBundle::admit_json`], which construct and validate
//! indivisibly. The admitted type has no public constructor, no public member and
//! no `Deserialize` implementation, so no caller can hold an unvalidated value of
//! it, and a refused admission yields no value of it at all (FR-117-CON-2). This
//! replaces Plan-016's `ProducerBundle::from_json` plus its separate public
//! `validate`, which was exactly the construct-then-validate bypass FR-117
//! forbids (FND-1712, D4).
//!
//! The bundle requires, contains and mints **no** population, snapshot, window,
//! workflow instance, relationship instance, observation record, progress record
//! or observation closure. Plan-016's assessment types live in
//! [`crate::assessment`] and nothing in this module references them.
//!
//! No ambient input reaches an admission: this module reads no environment
//! variable, no working directory, no clock, no network and starts no process
//! (FR-117-CON-3, NFR-036-M-7).
//!
//! ## The member-set closure control (TC-1432, `Compile`)
//!
//! An assessment member is not a member of this type:
//!
//! ```compile_fail
//! use agent_ix_baseline_producer::StaticProducerBundle;
//! fn read(bundle: StaticProducerBundle) {
//!     let StaticProducerBundle { population, .. } = bundle;
//! }
//! ```
//!
//! and the nine content classes cannot be matched partially, so a match that
//! omits one fails to compile:
//!
//! ```compile_fail
//! use agent_ix_baseline_producer::StaticProducerBundle;
//! fn read(bundle: StaticProducerBundle) {
//!     // omits `static_closure` and `correspondences`
//!     let StaticProducerBundle {
//!         bundle_identity, bundle_revision, digest, interface_version, model, profile,
//!         components, endpoints, relationships, inventory, configuration,
//!     } = bundle;
//! }
//! ```
//!
//! while the complete member set compiles:
//!
//! ```
//! use agent_ix_baseline_producer::StaticProducerBundle;
//! fn read(bundle: StaticProducerBundle) {
//!     let StaticProducerBundle {
//!         bundle_identity, bundle_revision, digest, interface_version, model, profile,
//!         components, endpoints, relationships, inventory, configuration, static_closure,
//!         correspondences,
//!     } = bundle;
//! }
//! ```
//!
//! ## The unconstructibility control (TC-1435, `Compile`)
//!
//! A struct literal of the admitted type does not compile, because it has no
//! public member to initialize:
//!
//! ```compile_fail
//! use agent_ix_baseline_producer::AdmittedStaticBundle;
//! let bundle = AdmittedStaticBundle { identity: String::new() };
//! ```
//!
//! a read of a would-be public member does not compile:
//!
//! ```compile_fail
//! use agent_ix_baseline_producer::AdmittedStaticBundle;
//! fn read(bundle: &AdmittedStaticBundle) -> &str {
//!     &bundle.identity
//! }
//! ```
//!
//! and there is no deserialization path into it at all, so the bound
//! `serde_json::from_slice::<AdmittedStaticBundle>` requires does not hold:
//!
//! ```compile_fail
//! use agent_ix_baseline_producer::AdmittedStaticBundle;
//! fn deserializes<'de, T: serde::Deserialize<'de>>() {}
//! fn control() {
//!     deserializes::<AdmittedStaticBundle>();
//! }
//! ```
//!
//! The same three constructions compile against the unvalidated offer type, which
//! is what makes the three controls above measurements rather than noise:
//!
//! ```
//! use agent_ix_baseline_producer::{AdmittedStaticBundle, StaticProducerBundle};
//! fn deserializes<'de, T: serde::Deserialize<'de>>() {}
//! fn control(bundle: &StaticProducerBundle) {
//!     let _ = StaticProducerBundle::default();
//!     let _ = &bundle.bundle_identity;
//!     deserializes::<StaticProducerBundle>();
//! }
//! // The admitted bundle is read through its accessors instead.
//! fn read(bundle: &AdmittedStaticBundle) -> &str {
//!     bundle.bundle_identity()
//! }
//! ```

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::canonical::{document_digest, CanonicalPolicy};
use crate::component::ComponentDeclaration;
use crate::configuration::ConfigurationDocument;
use crate::correspondence::{validate_correspondence_set, ProducerNativeCorrespondence};
use crate::digest::{DigestSelection, CANONICAL_JSON_DOMAIN, DIGEST_DOMAIN_VERSION};
use crate::endpoint::EndpointDeclaration;
use crate::export::DeclaredExports;
use crate::inventory::InventoryDeclaration;
use crate::locus::DeclarationSource;
use crate::model::{ModelSelection, ProfileSelection};
use crate::refusal::{
    Refusal, ASSESSMENT_INPUT_IN_STATIC_BUNDLE, BUNDLE_BINDING_STALE, BUNDLE_HEADER_MEMBER_ABSENT,
    BUNDLE_IDENTITY_COLLISION, DOCUMENT_RESOURCE_LIMIT, IDENTITY_ABSENT, IDENTITY_MISMATCH,
    INVALID_PRODUCER_DOCUMENT, STATIC_CLOSURE_ABSENT, STATIC_MEMBER_ABSENT,
    UNKNOWN_BASELINE_VERSION,
};
use crate::relationship::RelationshipDeclaration;
use crate::revision::{Revision, PRODUCER_REVISION_NAMESPACE};
use crate::BASELINE_VERSION;

/// The producer interface version FR-126 declares, carried as a header member.
///
/// FR-117 obliges the bundle to carry it. FR-126's own obligations — the
/// `wireSchema` member, the four separately named versions, the
/// one-interface-version-per-document-set rule and the v1.1 projection document
/// set — are not implemented by this plan.
pub const INTERFACE_VERSION: &str = "1.2.0";

/// The largest static bundle document this crate parses.
const MAX_STATIC_DOCUMENT_BYTES: usize = 1_048_576;

/// The assessment member names a static admission refuses, naming the member.
///
/// These are the assessment member classes FR-117 excludes. They are refused at
/// the wire seam as well as being absent from the type, so an offered assessment
/// member is named in the refusal rather than reported as an unknown field.
pub const ASSESSMENT_MEMBER_NAMES: [&str; 12] = [
    "availability",
    "observationClosure",
    "observationRecords",
    "population",
    "populationIdentity",
    "progress",
    "progressRecords",
    "relationshipInstances",
    "snapshot",
    "window",
    "windowIdentity",
    "workflowInstance",
];

/// The export kind FR-120 partitions to the assessment side.
const ASSESSMENT_EXPORT_KIND: &str = "population";

/// The configuration's static prerequisite closure.
///
/// This is **not** the native definition closure FR-116 owns: they are distinct
/// members carrying distinct refusals (FR-117-CON-5, FND-1727). An absent static
/// prerequisite closure refuses as [`STATIC_CLOSURE_ABSENT`], while an incomplete
/// native definition closure refuses as
/// [`crate::refusal::CORRESPONDENCE_CLOSURE_INCOMPLETE`].
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct StaticClosure {
    /// The static configuration selection.
    pub configuration_identity: String,
    /// The canonical digest selection of the selected configuration document.
    pub configuration_digest: DigestSelection,
    /// The static model selection.
    pub model_identity: String,
    /// The canonical digest selection of the selected model.
    pub model_digest: DigestSelection,
    /// The static profile selection.
    pub profile_identity: String,
    /// The canonical digest selection of the selected profile.
    pub profile_digest: DigestSelection,
    /// The declaration source documents that supply every declared locus.
    pub declaration_sources: Vec<DeclarationSource>,
}

/// One unvalidated static bundle offer.
///
/// Every member whose absence FR-117 refuses is an `Option` or a possibly empty
/// collection, because an absent member is a representable state the admission
/// refuses **naming that member** rather than a state a default fills in
/// (FR-117-AC-2).
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct StaticProducerBundle {
    /// Header: the bundle's own identity.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bundle_identity: Option<String>,
    /// Header: the bundle's own namespaced revision.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bundle_revision: Option<Revision>,
    /// Header: the bundle's own canonical digest selection.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub digest: Option<DigestSelection>,
    /// Header: the producer interface version FR-126 declares.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub interface_version: Option<String>,
    /// Content class 1: the selected model.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<ModelSelection>,
    /// Content class 2: the selected profile.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub profile: Option<ProfileSelection>,
    /// Content class 3: the component declarations.
    #[serde(default)]
    pub components: Vec<ComponentDeclaration>,
    /// Content class 4: the endpoint declarations.
    #[serde(default)]
    pub endpoints: Vec<EndpointDeclaration>,
    /// Content class 5: the relationship records.
    #[serde(default)]
    pub relationships: Vec<RelationshipDeclaration>,
    /// Content class 6: the inventory declaration.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub inventory: Option<InventoryDeclaration>,
    /// Content class 7: the configuration document.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub configuration: Option<ConfigurationDocument>,
    /// Content class 8: the configuration's static prerequisite closure.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub static_closure: Option<StaticClosure>,
    /// Content class 9: the correspondence records.
    #[serde(default)]
    pub correspondences: Vec<ProducerNativeCorrespondence>,
}

impl StaticProducerBundle {
    /// Constructs and validates one admitted static bundle, indivisibly.
    ///
    /// There is no order in which a caller can observe a constructed but
    /// unvalidated [`AdmittedStaticBundle`]: the value is built only after every
    /// refusal below has been cleared, and a refusal returns no value of the type.
    pub fn admit(self) -> Result<AdmittedStaticBundle, Refusal> {
        let Some(bundle_identity) = self.bundle_identity.filter(|value| !value.is_empty()) else {
            return Err(Refusal::new(
                IDENTITY_ABSENT,
                "the static bundle declares no bundleIdentity header member",
            ));
        };
        let Some(bundle_revision) = self.bundle_revision else {
            return Err(Refusal::new(
                BUNDLE_HEADER_MEMBER_ABSENT,
                format!("{bundle_identity} declares no bundleRevision header member"),
            ));
        };
        let Some(digest) = self.digest else {
            return Err(Refusal::new(
                BUNDLE_HEADER_MEMBER_ABSENT,
                format!("{bundle_identity} declares no digest header member"),
            ));
        };
        let Some(interface_version) = self.interface_version.filter(|value| !value.is_empty())
        else {
            return Err(Refusal::new(
                BUNDLE_HEADER_MEMBER_ABSENT,
                format!("{bundle_identity} declares no interfaceVersion header member"),
            ));
        };
        if interface_version != INTERFACE_VERSION {
            return Err(Refusal::new(
                UNKNOWN_BASELINE_VERSION,
                format!(
                    "{bundle_identity} declares interfaceVersion {interface_version}, not {INTERFACE_VERSION}"
                ),
            ));
        }

        let Some(configuration) = self.configuration else {
            return Err(Refusal::new(
                STATIC_MEMBER_ABSENT,
                format!("{bundle_identity} declares no configuration document"),
            ));
        };
        if configuration.baseline_version != BASELINE_VERSION {
            return Err(Refusal::new(
                UNKNOWN_BASELINE_VERSION,
                format!(
                    "{} declares baselineVersion {}, not {BASELINE_VERSION}",
                    configuration.configuration_identity, configuration.baseline_version
                ),
            ));
        }
        let policy = CanonicalPolicy::from_configuration(&configuration)?;
        bundle_revision.validate_namespace(PRODUCER_REVISION_NAMESPACE)?;
        bundle_revision.validate_selected(&configuration)?;
        digest.validate_domain(CANONICAL_JSON_DOMAIN, DIGEST_DOMAIN_VERSION)?;
        digest.validate_selected(&configuration)?;

        let Some(model) = self.model else {
            return Err(Refusal::new(
                STATIC_MEMBER_ABSENT,
                format!("{bundle_identity} declares no selected model"),
            ));
        };
        model.validate(&configuration)?;
        let Some(profile) = self.profile else {
            return Err(Refusal::new(
                STATIC_MEMBER_ABSENT,
                format!("{bundle_identity} declares no selected profile"),
            ));
        };
        profile.validate(&configuration)?;
        let Some(inventory) = self.inventory else {
            return Err(Refusal::new(
                STATIC_MEMBER_ABSENT,
                format!("{bundle_identity} declares no inventory declaration"),
            ));
        };
        let Some(static_closure) = self.static_closure else {
            return Err(Refusal::new(
                STATIC_CLOSURE_ABSENT,
                format!(
                    "{bundle_identity} declares no static prerequisite closure of its configuration"
                ),
            ));
        };
        validate_static_closure(
            &static_closure,
            &bundle_identity,
            &configuration,
            &model,
            &profile,
        )?;
        let declaration_sources = DeclarationSource::supplied(&static_closure.declaration_sources);

        for component in &self.components {
            component.validate(&configuration, &inventory, &declaration_sources)?;
        }
        for endpoint in &self.endpoints {
            endpoint.validate(&configuration, &inventory, &declaration_sources)?;
        }
        let endpoint_index = EndpointDeclaration::index(&self.endpoints);
        for relationship in &self.relationships {
            relationship.validate(&configuration, &inventory, &endpoint_index)?;
        }
        let declared = DeclaredExports::new(&self.components, &self.endpoints, &self.relationships);
        validate_correspondence_set(&self.correspondences, &configuration, &declared)?;

        let admitted = AdmittedStaticBundle {
            key: AdmittedBundleKey {
                bundle_identity: bundle_identity.clone(),
                bundle_revision: bundle_revision.clone(),
                digest: digest.clone(),
            },
            bundle_identity,
            bundle_revision,
            digest,
            interface_version,
            model,
            profile,
            components: self.components,
            endpoints: self.endpoints,
            relationships: self.relationships,
            inventory,
            configuration,
            static_closure,
            correspondences: self.correspondences,
        };
        // The bundle's own canonical digest selection is taken over its canonical
        // bytes with its own `digest` member excluded, which FR-118 owns.
        let recomputed = document_digest(&admitted, &policy)?;
        admitted.digest.require_recomputed(&recomputed)?;
        Ok(admitted)
    }

    /// The canonical digest selection this bundle's own `digest` header member must carry.
    ///
    /// It is taken over the Filament Canonical JSON 1 bytes of this bundle with its
    /// own `digest` member excluded, under the numeric limit its configuration
    /// document declares. FR-118 owns both the canonicalization and that
    /// self-digest exclusion; this method restates neither and only names which
    /// document is digested (FR-112-CON-2).
    pub fn canonical_digest_selection(&self) -> Result<DigestSelection, Refusal> {
        let Some(configuration) = self.configuration.as_ref() else {
            return Err(Refusal::new(
                STATIC_MEMBER_ABSENT,
                "a static bundle declares no configuration document, so no numeric limit is declared",
            ));
        };
        let policy = CanonicalPolicy::from_configuration(configuration)?;
        document_digest(self, &policy)
    }

    /// Reads one static bundle document and admits it, indivisibly.
    ///
    /// The deserialized offer is a value local to this function: it is never
    /// returned, borrowed out, or otherwise observable, so there is no
    /// deserialization path that yields an [`AdmittedStaticBundle`] without
    /// passing through [`Self::admit`].
    pub fn admit_json(bytes: &[u8]) -> Result<AdmittedStaticBundle, Refusal> {
        if bytes.len() > MAX_STATIC_DOCUMENT_BYTES {
            return Err(Refusal::new(
                DOCUMENT_RESOURCE_LIMIT,
                "static bundle document exceeds 1 MiB",
            ));
        }
        let document: Value = serde_json::from_slice(bytes)
            .map_err(|error| Refusal::new(INVALID_PRODUCER_DOCUMENT, error.to_string()))?;
        refuse_assessment_input(&document)?;
        let offer: Self = serde_json::from_value(document)
            .map_err(|error| Refusal::new(INVALID_PRODUCER_DOCUMENT, error.to_string()))?;
        offer.admit()
    }
}

fn validate_static_closure(
    closure: &StaticClosure,
    bundle_identity: &str,
    configuration: &ConfigurationDocument,
    model: &ModelSelection,
    profile: &ProfileSelection,
) -> Result<(), Refusal> {
    if closure.configuration_identity != configuration.configuration_identity
        || closure.configuration_digest != configuration.digest
    {
        return Err(Refusal::new(
            IDENTITY_MISMATCH,
            format!(
                "{bundle_identity} static closure names configuration {} but the bundle carries {}",
                closure.configuration_identity, configuration.configuration_identity
            ),
        ));
    }
    if closure.model_identity != model.model_identity || closure.model_digest != model.digest {
        return Err(Refusal::new(
            IDENTITY_MISMATCH,
            format!(
                "{bundle_identity} static closure names model {} but the bundle selects {}",
                closure.model_identity, model.model_identity
            ),
        ));
    }
    if closure.profile_identity != profile.profile_identity
        || closure.profile_digest != profile.digest
    {
        return Err(Refusal::new(
            IDENTITY_MISMATCH,
            format!(
                "{bundle_identity} static closure names profile {} but the bundle selects {}",
                closure.profile_identity, profile.profile_identity
            ),
        ));
    }
    if closure.declaration_sources.is_empty() {
        return Err(Refusal::new(
            STATIC_CLOSURE_ABSENT,
            format!("{bundle_identity} static closure supplies no declaration source document"),
        ));
    }
    for source in &closure.declaration_sources {
        if source.source.identity.is_empty() || source.path.is_empty() {
            return Err(Refusal::new(
                IDENTITY_ABSENT,
                format!(
                    "{bundle_identity} static closure carries an unidentified declaration source"
                ),
            ));
        }
        source.source.revision.validate_selected(configuration)?;
        source
            .formal
            .revision
            .validate_namespace(PRODUCER_REVISION_NAMESPACE)?;
        source.formal.revision.validate_selected(configuration)?;
    }
    Ok(())
}

/// Refuses an assessment member, an assessment document, or an assessment export.
///
/// The refusal names the offered member, document, or export rather than
/// reporting an unknown field, and nothing offered here is silently retained
/// (FR-117-AC-3, FR-117-AC-7, FND-1763, D21).
fn refuse_assessment_input(document: &Value) -> Result<(), Refusal> {
    let mut offered = Vec::new();
    collect_assessment_members(document, &mut offered);
    if let Some(member) = offered.first() {
        // An assessment document offered in place of a static admission names
        // itself through its own identity member.
        let identifying = document
            .get("populationIdentity")
            .or_else(|| document.get("windowIdentity"))
            .or_else(|| document.get("observationRecordIdentity"))
            .or_else(|| document.get("availabilityFactIdentity"))
            .and_then(Value::as_str);
        return Err(Refusal::new(
            ASSESSMENT_INPUT_IN_STATIC_BUNDLE,
            match identifying {
                Some(identity) => format!(
                    "the assessment document {identity} was offered in place of a static admission; its {member} member is not retained"
                ),
                None => format!("the assessment member {member} was offered inside a static bundle"),
            },
        ));
    }
    if let Some(correspondences) = document.get("correspondences").and_then(Value::as_array) {
        for correspondence in correspondences {
            let exports = correspondence.get("exports").and_then(Value::as_array);
            for export in exports.into_iter().flatten() {
                if export.get("kind").and_then(Value::as_str) == Some(ASSESSMENT_EXPORT_KIND) {
                    let identity = export
                        .get("exportIdentity")
                        .and_then(Value::as_str)
                        .unwrap_or(ASSESSMENT_EXPORT_KIND);
                    return Err(Refusal::new(
                        ASSESSMENT_INPUT_IN_STATIC_BUNDLE,
                        format!(
                            "the correspondence export {identity} carries the assessment export kind {ASSESSMENT_EXPORT_KIND}"
                        ),
                    ));
                }
            }
        }
    }
    Ok(())
}

fn collect_assessment_members(value: &Value, offered: &mut Vec<String>) {
    match value {
        Value::Object(members) => {
            for (key, member) in members {
                if ASSESSMENT_MEMBER_NAMES.contains(&key.as_str()) {
                    offered.push(key.clone());
                }
                collect_assessment_members(member, offered);
            }
        }
        Value::Array(members) => {
            for member in members {
                collect_assessment_members(member, offered);
            }
        }
        _ => {}
    }
}

/// The key of one admitted static bundle: identity, revision and digest together.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdmittedBundleKey {
    /// The bundle identity.
    pub bundle_identity: String,
    /// The bundle's namespaced revision.
    pub bundle_revision: Revision,
    /// The bundle's canonical digest selection.
    pub digest: DigestSelection,
}

/// One admitted static bundle.
///
/// There is no public constructor, no public member, and no `Deserialize`
/// implementation: every member is read through its accessor, and the only way to
/// obtain a value is [`StaticProducerBundle::admit`] or
/// [`StaticProducerBundle::admit_json`].
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdmittedStaticBundle {
    #[serde(skip)]
    key: AdmittedBundleKey,
    bundle_identity: String,
    bundle_revision: Revision,
    digest: DigestSelection,
    interface_version: String,
    model: ModelSelection,
    profile: ProfileSelection,
    components: Vec<ComponentDeclaration>,
    endpoints: Vec<EndpointDeclaration>,
    relationships: Vec<RelationshipDeclaration>,
    inventory: InventoryDeclaration,
    configuration: ConfigurationDocument,
    static_closure: StaticClosure,
    correspondences: Vec<ProducerNativeCorrespondence>,
}

impl AdmittedStaticBundle {
    /// The admitted-bundle key: identity, revision and digest together.
    pub fn key(&self) -> &AdmittedBundleKey {
        &self.key
    }

    /// Header: the bundle identity.
    pub fn bundle_identity(&self) -> &str {
        &self.bundle_identity
    }

    /// Header: the bundle's namespaced revision.
    pub fn bundle_revision(&self) -> &Revision {
        &self.bundle_revision
    }

    /// Header: the bundle's canonical digest selection.
    pub fn digest(&self) -> &DigestSelection {
        &self.digest
    }

    /// Header: the producer interface version.
    pub fn interface_version(&self) -> &str {
        &self.interface_version
    }

    /// Content: the selected model.
    pub fn model(&self) -> &ModelSelection {
        &self.model
    }

    /// Content: the selected profile.
    pub fn profile(&self) -> &ProfileSelection {
        &self.profile
    }

    /// Content: the component declarations.
    pub fn components(&self) -> &[ComponentDeclaration] {
        &self.components
    }

    /// Content: the endpoint declarations.
    pub fn endpoints(&self) -> &[EndpointDeclaration] {
        &self.endpoints
    }

    /// Content: the relationship records.
    pub fn relationships(&self) -> &[RelationshipDeclaration] {
        &self.relationships
    }

    /// Content: the inventory declaration.
    pub fn inventory(&self) -> &InventoryDeclaration {
        &self.inventory
    }

    /// Content: the configuration document.
    pub fn configuration(&self) -> &ConfigurationDocument {
        &self.configuration
    }

    /// Content: the configuration's static prerequisite closure.
    pub fn static_closure(&self) -> &StaticClosure {
        &self.static_closure
    }

    /// Content: the correspondence records.
    pub fn correspondences(&self) -> &[ProducerNativeCorrespondence] {
        &self.correspondences
    }
}

/// The admitted static bundles of one producer run, keyed as FR-117 keys them.
///
/// The registry exists because two of FR-117's refusals are statements about a
/// set of admissions rather than about one document: an identity collision
/// between two bundles carrying one identity and one revision, and a binding that
/// names an earlier admitted bundle of an identity re-admitted over different
/// bytes.
#[derive(Debug, Clone, Default)]
pub struct AdmissionRegistry {
    digests: BTreeMap<(String, String, String), DigestSelection>,
    latest: BTreeMap<String, AdmittedBundleKey>,
}

impl AdmissionRegistry {
    /// An empty registry.
    pub fn new() -> Self {
        Self::default()
    }

    /// Admits one static bundle into this registry.
    ///
    /// Two bundles carrying one bundle identity and one namespaced revision with
    /// different canonical digest selections refuse as an identity collision,
    /// naming **both** selections (FR-117-CON-6, AC-10).
    pub fn admit(&mut self, bundle: StaticProducerBundle) -> Result<AdmittedStaticBundle, Refusal> {
        let admitted = bundle.admit()?;
        self.register(&admitted)?;
        Ok(admitted)
    }

    /// Reads one static bundle document and admits it into this registry.
    pub fn admit_json(&mut self, bytes: &[u8]) -> Result<AdmittedStaticBundle, Refusal> {
        let admitted = StaticProducerBundle::admit_json(bytes)?;
        self.register(&admitted)?;
        Ok(admitted)
    }

    /// The key of the bundle most recently admitted under one bundle identity.
    pub fn latest(&self, bundle_identity: &str) -> Option<&AdmittedBundleKey> {
        self.latest.get(bundle_identity)
    }

    /// Refuses a binding that names an admitted bundle superseded by different bytes.
    ///
    /// The refusal names both canonical digest selections and resolves nothing
    /// forward: a binding made to one admitted static bundle is never carried
    /// forward to a later bundle admitted under the same identity (FR-117-AC-11).
    pub fn resolve_binding(&self, key: &AdmittedBundleKey) -> Result<&AdmittedBundleKey, Refusal> {
        let Some(latest) = self.latest.get(&key.bundle_identity) else {
            return Err(Refusal::new(
                IDENTITY_MISMATCH,
                format!("no admitted static bundle carries {}", key.bundle_identity),
            ));
        };
        if latest == key {
            return Ok(latest);
        }
        Err(Refusal::new(
            BUNDLE_BINDING_STALE,
            format!(
                "the binding naming {} at digest {} is stale: {} is now admitted at digest {}",
                key.bundle_identity, key.digest.value, latest.bundle_identity, latest.digest.value
            ),
        ))
    }

    fn register(&mut self, admitted: &AdmittedStaticBundle) -> Result<(), Refusal> {
        let identity = admitted.bundle_identity().to_owned();
        let revision = admitted.bundle_revision().clone();
        let slot = (
            identity.clone(),
            revision.namespace.clone(),
            revision.value.clone(),
        );
        if let Some(declared) = self.digests.get(&slot) {
            if declared != admitted.digest() {
                return Err(Refusal::new(
                    BUNDLE_IDENTITY_COLLISION,
                    format!(
                        "{identity} at revision {} is already admitted at digest {} and is now offered at digest {}",
                        revision.value,
                        declared.value,
                        admitted.digest().value
                    ),
                ));
            }
            return Ok(());
        }
        self.digests.insert(slot, admitted.digest().clone());
        self.latest.insert(identity, admitted.key().clone());
        Ok(())
    }
}
