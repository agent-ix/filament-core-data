// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Agent-IX

//! Traced FR-129 controls for a static bundle admitted against real native
//! artifact bytes. Every control reports the number it measured.
//!
//! The native side of this fixture is not a placeholder. `NATIVE_MODEL_BYTES`
//! are the exact committed bytes of a native rule-model artifact, and
//! `NATIVE_EXPORT_TABLE` is that artifact's own export table as the native
//! producer emitted it. Every type export this bundle declares is drawn from
//! that table, and the declared raw-byte digest is recomputed from those bytes
//! here rather than asserted.
//!
//! Admission itself reads no native bytes — the bundle carries none, by FR-117's
//! closed content classes. The recomputation below is verification, which is
//! where FR-129 puts it.

use ix_trace_rs::trace;
use std::collections::{BTreeMap, BTreeSet};
use std::process::Command;

use agent_ix_baseline_producer::refusal::{
    DIGEST_MISMATCH, DOCUMENT_RESOURCE_LIMIT, EXPORT_FOREIGN, INVALID_PRODUCER_DOCUMENT,
};
use agent_ix_baseline_producer::{
    ArtifactKind, ArtifactReference, ComponentDeclaration, ConfigurationDocument,
    DeclarationSource, DigestDomainSelection, DigestSelection, EndpointDeclaration, ExportKind,
    ExportRecord, FormalDocument, InventoryCompleteness, InventoryDeclaration, InventoryMembership,
    ModelSelection, Multiplicity, NativeArtifactReference, NativeSourceLabel, NumericResourceLimit,
    ProducerNativeCorrespondence, ProducerObjectReference, ProfileSelection, RawByteDigest,
    RelationshipDeclaration, RelationshipDirection, RelationshipEndpoint, RelationshipOwnership,
    RelationshipSemantics, ResourceLimits, Revision, SourceLocus, Span, StaticClosure,
    StaticProducerBundle, WireReference, ADMISSIBLE_REVISION_NAMESPACES,
};
use serde::Deserialize;
use serde_json::Value;
use sha2::{Digest, Sha256};

/// The exact committed bytes of the native rule-model artifact.
const NATIVE_MODEL_BYTES: &[u8] =
    include_bytes!("../../../fixtures/baseline-1-2/native/protocol-handoff-model.json");

/// That artifact's own export table, as the native producer emitted it.
const NATIVE_EXPORT_TABLE: &str =
    include_str!("../../../fixtures/baseline-1-2/native/protocol-handoff-export-table.json");

/// The identity the native artifact is selected by.
const NATIVE_ARTIFACT: &str = "ix://agent-ix/quire-spec-language/examples/protocol-handoff/model";

/// The digest the native producer itself records for those bytes.
const NATIVE_RAW_DIGEST: &str =
    "sha256:1a9441ec11c899c05d21c2c6f45392ce626a2d659255800a5f04eaec58d4f6a8";

const MAXIMUM_NATIVE_ARTIFACT_BYTES: &str = "maximumNativeArtifactBytes";
const MAXIMUM_NATIVE_EXPORT_TABLE_BYTES: &str = "maximumNativeExportTableBytes";
const MAXIMUM_NATIVE_EXPORTS: &str = "maximumNativeExports";
const MAXIMUM_NATIVE_EXPORT_PATH_SEGMENTS: &str = "maximumNativeExportPathSegments";
const MAXIMUM_NATIVE_DEFINITION_CLOSURE_ENTRIES: &str = "maximumNativeDefinitionClosureEntries";

const AUTHORITY: &str = "ix://agent-ix/quire-spec-language";
const MODEL: &str = "ix://agent-ix/protocol-handoff/model/workflow-1-2";
const PROFILE: &str = "ix://agent-ix/protocol-handoff/profile/workflow-1-2";
const CONFIGURATION: &str = "ix://agent-ix/protocol-handoff/config/default";
const INVENTORY: &str = "ix://agent-ix/protocol-handoff/inventory/2026-09-12";
const SOURCE_DOCUMENT: &str = "ix://agent-ix/protocol-handoff/source/model";
const DEFINITION: &str = "ix://agent-ix/quire/definition/native-edition-1";
const RELATION: &str = "ix://agent-ix/protocol-handoff/binding/model-to-native";
const COMPONENT: &str = "ix://agent-ix/protocol-handoff/component/workflow";

/// The two distinct native types this fixture's relationship resolves to.
const TYPE_WORKFLOW: &str = "ix://agent-ix/protocol-handoff/type/Workflow";
const TYPE_NOTICE: &str = "ix://agent-ix/protocol-handoff/type/Notice";

const ENDPOINT_SOURCE: &str = "ix://agent-ix/protocol-handoff/endpoint/workflow-notice-source";
const ENDPOINT_TARGET: &str = "ix://agent-ix/protocol-handoff/endpoint/workflow-notice-target";
const RELATIONSHIP: &str = "ix://agent-ix/protocol-handoff/relationship/workflow-notice";

/// The adjacent export-table manifest emitted by the native producer recipe.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct NativeExportTable {
    note: String,
    artifact_identity: String,
    artifact_raw_byte_digest: String,
    profile: String,
    exports: Vec<NativeExport>,
}

/// One entry of the native artifact's own export table.
#[derive(Clone, Deserialize)]
#[serde(deny_unknown_fields)]
struct NativeExport {
    kind: String,
    path: Vec<String>,
}

#[derive(Debug, PartialEq, Eq)]
struct FixtureRefusal {
    code: &'static str,
    subject: String,
}

impl FixtureRefusal {
    fn new(code: &'static str, subject: impl Into<String>) -> Self {
        Self {
            code,
            subject: subject.into(),
        }
    }
}

fn checked_bound(subject: &'static str, actual: usize, maximum: u64) -> Result<(), FixtureRefusal> {
    let actual =
        u64::try_from(actual).map_err(|_| FixtureRefusal::new(DOCUMENT_RESOURCE_LIMIT, subject))?;
    if actual > maximum {
        return Err(FixtureRefusal::new(DOCUMENT_RESOURCE_LIMIT, subject));
    }
    Ok(())
}

fn declared_bound(
    admitted: &agent_ix_baseline_producer::AdmittedStaticBundle,
    subject: &'static str,
) -> Result<u64, FixtureRefusal> {
    admitted
        .configuration()
        .resource_limits
        .declared_bounds
        .get(subject)
        .copied()
        .ok_or_else(|| FixtureRefusal::new(DOCUMENT_RESOURCE_LIMIT, subject))
}

fn parse_native_exports(
    admitted: &agent_ix_baseline_producer::AdmittedStaticBundle,
    table_bytes: &[u8],
) -> Result<NativeExportTable, FixtureRefusal> {
    checked_bound(
        MAXIMUM_NATIVE_EXPORT_TABLE_BYTES,
        table_bytes.len(),
        declared_bound(admitted, MAXIMUM_NATIVE_EXPORT_TABLE_BYTES)?,
    )?;
    let table: NativeExportTable = serde_json::from_slice(table_bytes)
        .map_err(|_| FixtureRefusal::new(INVALID_PRODUCER_DOCUMENT, "nativeExportTable"))?;
    if table.note.is_empty() || table.profile != "native-state-model/2" {
        return Err(FixtureRefusal::new(
            INVALID_PRODUCER_DOCUMENT,
            "nativeExportTable",
        ));
    }
    checked_bound(
        MAXIMUM_NATIVE_EXPORTS,
        table.exports.len(),
        declared_bound(admitted, MAXIMUM_NATIVE_EXPORTS)?,
    )?;
    let maximum_path_segments = declared_bound(admitted, MAXIMUM_NATIVE_EXPORT_PATH_SEGMENTS)?;
    for export in &table.exports {
        checked_bound(
            MAXIMUM_NATIVE_EXPORT_PATH_SEGMENTS,
            export.path.len(),
            maximum_path_segments,
        )?;
    }
    Ok(table)
}

/// Qualify the producer-owned fixture evidence without duplicating native-model admission.
fn verify_native_fixture(
    bundle: StaticProducerBundle,
    native_bytes: &[u8],
    table_bytes: &[u8],
) -> Result<agent_ix_baseline_producer::AdmittedStaticBundle, FixtureRefusal> {
    let admitted = bundle
        .admit()
        .map_err(|refusal| FixtureRefusal::new(refusal.code, refusal.message))?;
    checked_bound(
        MAXIMUM_NATIVE_ARTIFACT_BYTES,
        native_bytes.len(),
        declared_bound(&admitted, MAXIMUM_NATIVE_ARTIFACT_BYTES)?,
    )?;
    for correspondence in admitted.correspondences() {
        checked_bound(
            MAXIMUM_NATIVE_DEFINITION_CLOSURE_ENTRIES,
            correspondence.native_definition_closure.len(),
            declared_bound(&admitted, MAXIMUM_NATIVE_DEFINITION_CLOSURE_ENTRIES)?,
        )?;
    }

    let table = parse_native_exports(&admitted, table_bytes)?;
    let mut correspondences = admitted.correspondences().iter().filter(|candidate| {
        candidate.producer.identity == admitted.model().model_identity
            && candidate.native.identity == table.artifact_identity
    });
    let correspondence = correspondences
        .next()
        .ok_or_else(|| FixtureRefusal::new(EXPORT_FOREIGN, table.artifact_identity.clone()))?;
    if correspondences.next().is_some() {
        return Err(FixtureRefusal::new(EXPORT_FOREIGN, table.artifact_identity));
    }

    let recomputed = format!("sha256:{:x}", Sha256::digest(native_bytes));
    if correspondence.native.raw_byte_digest.value != recomputed
        || table.artifact_raw_byte_digest != recomputed
    {
        return Err(FixtureRefusal::new(DIGEST_MISMATCH, NATIVE_ARTIFACT));
    }

    for endpoint in admitted.endpoints() {
        let mut mappings = correspondence.exports.iter().filter(|export| {
            export.export_identity == endpoint.type_identity && export.kind.is_type()
        });
        let mapping = mappings
            .next()
            .ok_or_else(|| FixtureRefusal::new(EXPORT_FOREIGN, endpoint.type_identity.clone()))?;
        if mappings.next().is_some()
            || !table.exports.iter().any(|native| {
                native.kind == mapping.kind.as_str() && native.path == mapping.export_path
            })
        {
            return Err(FixtureRefusal::new(
                EXPORT_FOREIGN,
                endpoint.type_identity.clone(),
            ));
        }
    }
    Ok(admitted)
}

/// The native artifact's export table, read from its committed bytes.
fn native_exports() -> Vec<NativeExport> {
    serde_json::from_str::<NativeExportTable>(NATIVE_EXPORT_TABLE)
        .expect("the export table parses")
        .exports
}

/// The one native export of `kind` whose final path segment is `name`.
fn native_export_of(name: &str) -> NativeExport {
    let mut matching = native_exports()
        .into_iter()
        .filter(|export| export.path.last().map(String::as_str) == Some(name));
    let found = matching
        .next()
        .unwrap_or_else(|| panic!("the native export table declares {name}"));
    assert!(
        matching.next().is_none(),
        "{name} names exactly one native export"
    );
    found
}

fn configuration() -> ConfigurationDocument {
    let mut configuration = ConfigurationDocument {
        configuration_identity: CONFIGURATION.into(),
        baseline_version: "1.2.0".into(),
        digest: DigestSelection::canonical(format!("sha256:{}", "0".repeat(64))),
        model_authority: AUTHORITY.into(),
        profile_identities: BTreeSet::from([PROFILE.to_owned()]),
        adapter_identities: BTreeSet::new(),
        mapping_targets: BTreeSet::from([PROFILE.to_owned()]),
        loss_policy: "ix://agent-ix/protocol-handoff/loss-policy/refuse".into(),
        resource_limits: ResourceLimits {
            numeric_resource_limit: Some(NumericResourceLimit::new(4096, 6144)),
            declared_bounds: BTreeMap::from([
                (MAXIMUM_NATIVE_ARTIFACT_BYTES.to_owned(), 4_096),
                (MAXIMUM_NATIVE_EXPORT_TABLE_BYTES.to_owned(), 4_096),
                (MAXIMUM_NATIVE_EXPORTS.to_owned(), 32),
                (MAXIMUM_NATIVE_EXPORT_PATH_SEGMENTS.to_owned(), 4),
                (MAXIMUM_NATIVE_DEFINITION_CLOSURE_ENTRIES.to_owned(), 8),
            ]),
        },
        digest_selections: DigestDomainSelection::baseline(),
        revision_namespaces: ADMISSIBLE_REVISION_NAMESPACES
            .iter()
            .map(|namespace| (*namespace).to_owned())
            .collect(),
        trusted_references: BTreeSet::from([AUTHORITY.to_owned()]),
    };
    configuration.digest = agent_ix_baseline_producer::configuration_digest(&configuration)
        .expect("the configuration digest computes");
    configuration
}

fn artifact_reference() -> ArtifactReference {
    ArtifactReference {
        ref_version: "3".into(),
        kind: ArtifactKind::Source,
        authority: AUTHORITY.into(),
        identity: SOURCE_DOCUMENT.into(),
        revision: Revision::producer("1"),
        digest: RawByteDigest::new(NATIVE_RAW_DIGEST.to_owned())
            .expect("a raw-byte digest string is admitted"),
        wire: WireReference {
            identity: "filament-core-data/producer-bundle".into(),
            version: "1.2.0".into(),
        },
    }
}

fn locus() -> SourceLocus {
    SourceLocus {
        source: artifact_reference(),
        formal: FormalDocument {
            document: "ix://agent-ix/protocol-handoff/formal/model".into(),
            revision: Revision::producer("1"),
        },
        span: Span { start: 0, end: 64 },
    }
}

fn component() -> ComponentDeclaration {
    ComponentDeclaration {
        component_identity: COMPONENT.into(),
        component_revision: Revision::producer("1"),
        digest: DigestSelection::canonical(format!("sha256:{}", "1".repeat(64))),
        repository_identity: "ix://agent-ix/protocol-handoff/repository/model".into(),
        repository_revision: Revision::producer("1"),
        role_identities: BTreeSet::from(
            ["ix://agent-ix/protocol-handoff/role/workflow".to_owned()],
        ),
        owning_type_identity: TYPE_WORKFLOW.into(),
        source_locus: Some(locus()),
        inventory_membership: InventoryMembership::new(INVENTORY, InventoryCompleteness::Complete),
    }
}

fn endpoint(identity: &str, type_identity: &str, role: &str) -> EndpointDeclaration {
    EndpointDeclaration {
        endpoint_identity: identity.into(),
        endpoint_revision: Revision::producer("1"),
        digest: DigestSelection::canonical(format!("sha256:{}", "2".repeat(64))),
        component_identity: COMPONENT.into(),
        type_identity: type_identity.into(),
        role: role.into(),
        multiplicity: Some(Multiplicity {
            lower: 0,
            upper: Some(1),
            ordered: false,
            unique: true,
        }),
        source_locus: Some(locus()),
        inventory_membership: InventoryMembership::new(INVENTORY, InventoryCompleteness::Complete),
    }
}

/// A type export mapping drawn from the native artifact's own export table.
fn type_export(export_identity: &str, native_name: &str) -> ExportRecord {
    let native = native_export_of(native_name);
    let kind = match native.kind.as_str() {
        "enum" => ExportKind::Enum,
        "object" => ExportKind::Object,
        "record" => ExportKind::Record,
        "reference" => ExportKind::Reference,
        "scalar" => ExportKind::Scalar,
        "variant" => ExportKind::Variant,
        other => panic!("{native_name} is exported as {other}, which names no type"),
    };
    ExportRecord {
        kind,
        producer_object_identity: MODEL.into(),
        export_identity: export_identity.into(),
        export_path: native.path,
        locus: Some(locus()),
    }
}

/// A record export mapping, which the native table does not declare.
fn record_export(kind: ExportKind, export_identity: &str, path: &[&str]) -> ExportRecord {
    ExportRecord {
        kind,
        producer_object_identity: MODEL.into(),
        export_identity: export_identity.into(),
        export_path: path.iter().map(|segment| (*segment).to_owned()).collect(),
        locus: Some(locus()),
    }
}

fn correspondence() -> ProducerNativeCorrespondence {
    ProducerNativeCorrespondence {
        binding_relation_identity: RELATION.into(),
        producer: ProducerObjectReference {
            object_kind: "model".into(),
            authority: AUTHORITY.into(),
            identity: MODEL.into(),
            revision: Revision::producer("1.2.0"),
            digest: DigestSelection::canonical(format!("sha256:{}", "4".repeat(64))),
        },
        native: NativeArtifactReference {
            identity: NATIVE_ARTIFACT.into(),
            revision: Revision::native("1"),
            // The real digest of the committed bytes, recomputed in TC-1722.
            raw_byte_digest: DigestSelection::native_bytes(NATIVE_RAW_DIGEST.to_owned()),
        },
        native_definition_closure: vec![NativeArtifactReference {
            identity: DEFINITION.into(),
            revision: Revision::native("1"),
            raw_byte_digest: DigestSelection::native_bytes(format!("sha256:{}", "7".repeat(64))),
        }],
        required_native_definition_identities: BTreeSet::from([DEFINITION.to_owned()]),
        configuration_identity: Some(CONFIGURATION.into()),
        exports: vec![
            record_export(ExportKind::Component, COMPONENT, &["workflow", "component"]),
            record_export(
                ExportKind::Endpoint,
                ENDPOINT_SOURCE,
                &["workflow", "notice", "source"],
            ),
            record_export(
                ExportKind::Endpoint,
                ENDPOINT_TARGET,
                &["workflow", "notice", "target"],
            ),
            record_export(
                ExportKind::Relationship,
                RELATIONSHIP,
                &["workflow", "notice"],
            ),
            type_export(TYPE_WORKFLOW, "Workflow"),
            type_export(TYPE_NOTICE, "Notice"),
        ],
    }
}

fn bundle() -> StaticProducerBundle {
    let configuration = configuration();
    let model = ModelSelection {
        model_identity: MODEL.into(),
        model_revision: Revision::producer("1.2.0"),
        digest: DigestSelection::canonical(format!("sha256:{}", "8".repeat(64))),
    };
    let profile = ProfileSelection {
        profile_identity: PROFILE.into(),
        profile_revision: Revision::producer("1.2.0"),
        digest: DigestSelection::canonical(format!("sha256:{}", "9".repeat(64))),
    };
    let mut bundle = StaticProducerBundle {
        bundle_identity: Some("ix://agent-ix/protocol-handoff/bundle/native-1-2".to_owned()),
        bundle_revision: Some(Revision::producer("2026-09-12-1")),
        digest: None,
        interface_version: Some("1.2.0".to_owned()),
        model: Some(model.clone()),
        profile: Some(profile.clone()),
        components: vec![component()],
        endpoints: vec![
            endpoint(ENDPOINT_SOURCE, TYPE_WORKFLOW, "workflow"),
            endpoint(ENDPOINT_TARGET, TYPE_NOTICE, "notice"),
        ],
        relationships: vec![RelationshipDeclaration {
            relationship_identity: RELATIONSHIP.into(),
            relationship_name: "notice".into(),
            relationship_revision: Some(Revision::producer("1")),
            digest: Some(DigestSelection::canonical(format!(
                "sha256:{}",
                "3".repeat(64)
            ))),
            source: RelationshipEndpoint {
                endpoint_identity: ENDPOINT_SOURCE.into(),
                type_identity: TYPE_WORKFLOW.into(),
                role: "workflow".into(),
                multiplicity: Some(Multiplicity {
                    lower: 1,
                    upper: Some(1),
                    ordered: false,
                    unique: false,
                }),
            },
            target: RelationshipEndpoint {
                endpoint_identity: ENDPOINT_TARGET.into(),
                type_identity: TYPE_NOTICE.into(),
                role: "notice".into(),
                multiplicity: Some(Multiplicity {
                    lower: 0,
                    upper: None,
                    ordered: true,
                    unique: false,
                }),
            },
            semantics: RelationshipSemantics {
                category: "structural".into(),
                direction: RelationshipDirection::SourceToTarget,
                composite: false,
                lifecycle: "workflow-owned".into(),
                ownership: "workflow".into(),
            },
            ownership: Some(RelationshipOwnership {
                model_identity: MODEL.into(),
                profile_identity: PROFILE.into(),
                configuration_identity: CONFIGURATION.into(),
            }),
            inventory_membership: Some(InventoryMembership::new(
                INVENTORY,
                InventoryCompleteness::Complete,
            )),
        }],
        inventory: Some(InventoryDeclaration {
            inventory_identity: INVENTORY.into(),
            completeness: InventoryCompleteness::Complete,
            component_identities: BTreeSet::from([COMPONENT.to_owned()]),
            endpoint_identities: BTreeSet::from([
                ENDPOINT_SOURCE.to_owned(),
                ENDPOINT_TARGET.to_owned(),
            ]),
            relationship_identities: BTreeSet::from([RELATIONSHIP.to_owned()]),
        }),
        configuration: Some(configuration.clone()),
        static_closure: Some(StaticClosure {
            configuration_identity: CONFIGURATION.into(),
            configuration_digest: configuration.digest.clone(),
            model_identity: MODEL.into(),
            model_digest: model.digest.clone(),
            profile_identity: PROFILE.into(),
            profile_digest: profile.digest.clone(),
            declaration_sources: vec![DeclarationSource {
                source: artifact_reference(),
                native: NativeSourceLabel {
                    identity: NATIVE_ARTIFACT.into(),
                    revision: "1".into(),
                },
                path: "examples/protocol-handoff/model.json".into(),
                formal: FormalDocument {
                    document: "ix://agent-ix/protocol-handoff/formal/model".into(),
                    revision: Revision::producer("1"),
                },
            }],
        }),
        correspondences: vec![correspondence()],
    };
    bundle.digest = Some(
        bundle
            .canonical_digest_selection()
            .expect("the bundle's own canonical digest computes"),
    );
    bundle
}

fn bundle_with_native_bounds(bounds: BTreeMap<String, u64>) -> StaticProducerBundle {
    let mut bundle = bundle();
    let configuration = bundle
        .configuration
        .as_mut()
        .expect("the fixture carries its configuration");
    configuration.resource_limits.declared_bounds = bounds;
    configuration.digest = agent_ix_baseline_producer::configuration_digest(configuration)
        .expect("the bounded configuration digest computes");
    bundle
        .static_closure
        .as_mut()
        .expect("the fixture carries its static closure")
        .configuration_digest = configuration.digest.clone();
    bundle.digest = Some(
        bundle
            .canonical_digest_selection()
            .expect("the bounded bundle's own canonical digest computes"),
    );
    bundle
}

/// Tracing: TC-1722; FR-129-AC-1, FR-129-CON-1
#[trace("TC-1722", "FR-129-AC-1")]
#[trace("TC-1722", "FR-129-CON-1")]
#[test]
fn tc_1722_the_declared_native_digest_recomputes_from_the_committed_bytes() {
    let recomputed = format!("sha256:{:x}", Sha256::digest(NATIVE_MODEL_BYTES));
    assert_eq!(
        recomputed, NATIVE_RAW_DIGEST,
        "the declared native raw-byte digest is the SHA-256 of the committed bytes"
    );

    let admitted =
        verify_native_fixture(bundle(), NATIVE_MODEL_BYTES, NATIVE_EXPORT_TABLE.as_bytes())
            .expect("the native-backed bundle evidence qualifies");
    let declared = &admitted.correspondences()[0].native.raw_byte_digest;
    assert_eq!(
        declared.value, recomputed,
        "the correspondence carries the recomputed digest"
    );
    assert_eq!(
        declared.domain, "quire-native-bytes-1",
        "native bytes stay in the native raw-byte domain"
    );

    println!(
        "TC-1722 measured: 1 native artifact of {} bytes, digest recomputed and equal in domain {}",
        NATIVE_MODEL_BYTES.len(),
        declared.domain
    );
}

/// Tracing: TC-1723; FR-129-AC-2, FR-129-CON-2
#[trace("TC-1723", "FR-129-AC-2")]
#[trace("TC-1723", "FR-129-CON-2")]
#[test]
fn tc_1723_a_canonical_json_rendering_yields_a_different_digest() {
    let parsed: Value = serde_json::from_slice(NATIVE_MODEL_BYTES).expect("the artifact parses");
    let recanonicalized = serde_json::to_vec(&parsed).expect("the artifact reserializes");
    let raw = format!("sha256:{:x}", Sha256::digest(NATIVE_MODEL_BYTES));
    let canonical = format!("sha256:{:x}", Sha256::digest(&recanonicalized));
    assert_ne!(
        raw, canonical,
        "a reserialized rendering is not the raw bytes, so the domains cannot substitute"
    );
    assert_eq!(raw, NATIVE_RAW_DIGEST, "the declared digest is the raw one");

    println!(
        "TC-1723 measured: 2 digests over 1 artifact, raw {} bytes against reserialized {} bytes, unequal",
        NATIVE_MODEL_BYTES.len(),
        recanonicalized.len()
    );
}

/// Tracing: TC-1724; FR-127-AC-12, FR-127-CON-5, FR-129-AC-3, FR-129-CON-4
#[trace("TC-1724", "FR-127-AC-12")]
#[trace("TC-1724", "FR-127-CON-5")]
#[trace("TC-1724", "FR-129-AC-3")]
#[trace("TC-1724", "FR-129-CON-4")]
#[test]
fn tc_1724_every_endpoint_type_resolves_to_the_native_export_table() {
    let admitted =
        verify_native_fixture(bundle(), NATIVE_MODEL_BYTES, NATIVE_EXPORT_TABLE.as_bytes())
            .expect("the native-backed bundle evidence qualifies");
    let table = native_exports();

    let mut resolved = 0;
    for endpoint in admitted.endpoints() {
        let export = admitted
            .endpoint_type_export(&endpoint.endpoint_identity)
            .expect("every endpoint's model type resolves");
        assert!(export.kind.is_type(), "the resolved kind names a type");
        let native = table
            .iter()
            .find(|candidate| candidate.path == export.export_path)
            .expect("the resolved path is one the native artifact declared");
        assert_eq!(
            native.kind,
            export.kind.as_str(),
            "the resolved kind is the native artifact's, not one the producer chose"
        );
        resolved += 1;
    }
    assert_eq!(resolved, 2, "both endpoints resolved");

    println!(
        "TC-1724 measured: {resolved} endpoint type identities resolved against {} native export-table entries",
        table.len()
    );
}

/// Tracing: TC-1725; FR-129-AC-4, FR-129-AC-7, FR-129-CON-5
#[trace("TC-1725", "FR-129-AC-4")]
#[trace("TC-1725", "FR-129-AC-7")]
#[trace("TC-1725", "FR-129-CON-5")]
#[test]
fn tc_1725_the_relationship_resolves_two_distinct_native_types() {
    let admitted = bundle()
        .admit()
        .expect("the native-backed bundle is admitted");
    let relationship = &admitted.relationships()[0];

    let source = admitted
        .endpoint_type_export(&relationship.source.endpoint_identity)
        .expect("the source end resolves");
    let target = admitted
        .endpoint_type_export(&relationship.target.endpoint_identity)
        .expect("the target end resolves");

    assert_ne!(
        source.export_identity, target.export_identity,
        "the two ends resolve to two distinct type identities"
    );
    assert_ne!(
        source.export_path, target.export_path,
        "the two ends resolve to two distinct native exports"
    );
    assert_eq!(source.export_path, vec!["Workflow".to_owned()]);
    assert_eq!(target.export_path, vec!["Notice".to_owned()]);
    assert_eq!(source.kind, ExportKind::Object);
    assert_eq!(target.kind, ExportKind::Record);

    println!(
        "TC-1725 measured: 1 relationship over 2 distinct native type exports, {} and {}",
        source.kind.as_str(),
        target.kind.as_str()
    );
}

/// Tracing: TC-1726; FR-129-AC-5, FR-129-AC-11
#[trace("TC-1726", "FR-129-AC-5")]
#[trace("TC-1726", "FR-129-AC-11")]
#[test]
fn tc_1726_an_altered_native_digest_refuses() {
    let mut altered = bundle();
    // Change the selected native digest, then correctly reseal the producer
    // bundle so the outer canonical seal cannot be the source of the refusal.
    altered.correspondences[0].native.raw_byte_digest.value =
        NATIVE_RAW_DIGEST.replace("1a9441ec", "1a9441ed");
    altered.digest = Some(
        altered
            .canonical_digest_selection()
            .expect("the altered producer bundle reseals"),
    );
    let refusal =
        verify_native_fixture(altered, NATIVE_MODEL_BYTES, NATIVE_EXPORT_TABLE.as_bytes())
            .expect_err("the resealed bundle is refused against unchanged native bytes");
    assert_eq!(
        refusal.code, DIGEST_MISMATCH,
        "native-evidence verification, not the outer seal, detects the mismatch"
    );

    let mut regenerated = NATIVE_MODEL_BYTES.to_vec();
    regenerated.push(b'\n');
    let bytes_refusal =
        verify_native_fixture(bundle(), &regenerated, NATIVE_EXPORT_TABLE.as_bytes())
            .expect_err("replacement bytes refuse against the retained selection");
    assert_eq!(bytes_refusal.code, DIGEST_MISMATCH);

    let mut changed_table: Value =
        serde_json::from_str(NATIVE_EXPORT_TABLE).expect("the export table parses");
    changed_table["exports"]
        .as_array_mut()
        .expect("exports is an array")
        .iter_mut()
        .find(|export| export["path"] == serde_json::json!(["Workflow"]))
        .expect("Workflow is exported")["path"] = serde_json::json!(["Workflow", "Reordered"]);
    let changed_table = serde_json::to_vec(&changed_table).expect("the changed table serializes");
    let export_refusal = verify_native_fixture(bundle(), NATIVE_MODEL_BYTES, &changed_table)
        .expect_err("a changed native export path refuses");
    assert_eq!(export_refusal.code, EXPORT_FOREIGN);

    println!(
        "TC-1726 measured: 1 resealed selected-digest mismatch, 1 replacement-byte mismatch, and 1 changed export path refused under {} / {}",
        refusal.code,
        export_refusal.code
    );
}

/// Tracing: TC-1727; FR-129-AC-6
#[trace("TC-1727", "FR-129-AC-6")]
#[test]
fn tc_1727_the_native_table_carries_kinds_the_static_vocabulary_cannot_spell() {
    let table = native_exports();
    let spellable: BTreeSet<&str> = ExportKind::EMITTED
        .iter()
        .map(|kind| kind.as_str())
        .collect();

    let unspellable: BTreeSet<&str> = table
        .iter()
        .map(|export| export.kind.as_str())
        .filter(|kind| !spellable.contains(kind))
        .collect();

    assert!(
        unspellable.contains("population"),
        "a real native export table carries the assessment-side population kind"
    );
    assert_eq!(
        unspellable.len(),
        1,
        "population is the only native kind the static vocabulary cannot spell"
    );

    println!(
        "TC-1727 measured: {} native export kinds, {} unspellable in the static vocabulary: {:?}",
        table
            .iter()
            .map(|export| export.kind.as_str())
            .collect::<BTreeSet<_>>()
            .len(),
        unspellable.len(),
        unspellable
    );
}

/// Tracing: TC-1728; FR-129-AC-1
#[trace("TC-1728", "FR-129-AC-1")]
#[test]
fn tc_1728_no_fixture_digest_is_placeholder_fill() {
    let admitted = bundle()
        .admit()
        .expect("the native-backed bundle is admitted");
    let native = &admitted.correspondences()[0].native.raw_byte_digest.value;
    let hex = native.trim_start_matches("sha256:");
    let distinct: BTreeSet<char> = hex.chars().collect();
    assert!(
        distinct.len() > 4,
        "the native digest is a real hash, not repeated fill"
    );

    println!(
        "TC-1728 measured: 1 native digest over {} distinct hexadecimal characters",
        distinct.len()
    );
}

/// Tracing: TC-1729; FR-129-AC-8, FR-129-CON-6
#[trace("TC-1729", "FR-129-AC-8")]
#[trace("TC-1729", "FR-129-CON-6")]
#[test]
fn tc_1729_fixture_qualification_is_stable_under_an_empty_environment_and_changed_directory() {
    let first = verify_native_fixture(bundle(), NATIVE_MODEL_BYTES, NATIVE_EXPORT_TABLE.as_bytes())
        .expect("the parent qualification succeeds");
    let expected = format!("QUALIFIED:{}", first.digest().value);

    let executable = std::env::current_exe().expect("the test executable is named");
    let mut command = if cfg!(target_os = "linux") {
        let mut command = Command::new("unshare");
        command.arg("-Urn").arg(&executable);
        command
    } else {
        Command::new(&executable)
    };
    let output = command
        .arg("--ignored")
        .arg("--exact")
        .arg("tc_1729_child_qualifies_only_explicit_inputs")
        .arg("--nocapture")
        .env_clear()
        .env("TZ", "Pacific/Kiritimati")
        .current_dir(std::env::temp_dir())
        .output()
        .expect("the child qualification runs");
    assert!(
        output.status.success(),
        "the altered-environment child succeeds: {}",
        String::from_utf8_lossy(&output.stderr)
    );
    assert!(
        String::from_utf8_lossy(&output.stdout).contains(&expected),
        "the child emits the identical qualified bundle digest"
    );

    println!(
        "TC-1729 measured: 2 qualifications with identical digest, second under an empty environment, changed TZ, changed working directory, and (on Linux) an isolated network namespace"
    );
}

#[test]
#[ignore = "child process of TC-1729"]
fn tc_1729_child_qualifies_only_explicit_inputs() {
    let admitted =
        verify_native_fixture(bundle(), NATIVE_MODEL_BYTES, NATIVE_EXPORT_TABLE.as_bytes())
            .expect("explicit fixture inputs qualify");
    println!("QUALIFIED:{}", admitted.digest().value);
}

/// Tracing: TC-1730; FR-129-AC-13, FR-129-CON-8
#[trace("TC-1730", "FR-129-AC-13")]
#[trace("TC-1730", "FR-129-CON-8")]
#[test]
fn tc_1730_each_native_evidence_bound_admits_at_limit_and_refuses_one_past() {
    let table = serde_json::from_str::<NativeExportTable>(NATIVE_EXPORT_TABLE)
        .expect("the export table parses");
    let maximum_path_segments = table
        .exports
        .iter()
        .map(|export| export.path.len())
        .max()
        .expect("the native table has exports");
    let exact_bounds = BTreeMap::from([
        (
            MAXIMUM_NATIVE_ARTIFACT_BYTES.to_owned(),
            u64::try_from(NATIVE_MODEL_BYTES.len()).expect("artifact length fits u64"),
        ),
        (
            MAXIMUM_NATIVE_EXPORT_TABLE_BYTES.to_owned(),
            u64::try_from(NATIVE_EXPORT_TABLE.len()).expect("table length fits u64"),
        ),
        (
            MAXIMUM_NATIVE_EXPORTS.to_owned(),
            u64::try_from(table.exports.len()).expect("export count fits u64"),
        ),
        (
            MAXIMUM_NATIVE_EXPORT_PATH_SEGMENTS.to_owned(),
            u64::try_from(maximum_path_segments).expect("path length fits u64"),
        ),
        (
            MAXIMUM_NATIVE_DEFINITION_CLOSURE_ENTRIES.to_owned(),
            u64::try_from(bundle().correspondences[0].native_definition_closure.len())
                .expect("closure count fits u64"),
        ),
    ]);

    verify_native_fixture(
        bundle_with_native_bounds(exact_bounds.clone()),
        NATIVE_MODEL_BYTES,
        NATIVE_EXPORT_TABLE.as_bytes(),
    )
    .expect("all five native evidence inputs admit at their exact bounds");

    for subject in [
        MAXIMUM_NATIVE_ARTIFACT_BYTES,
        MAXIMUM_NATIVE_EXPORT_TABLE_BYTES,
        MAXIMUM_NATIVE_EXPORTS,
        MAXIMUM_NATIVE_EXPORT_PATH_SEGMENTS,
        MAXIMUM_NATIVE_DEFINITION_CLOSURE_ENTRIES,
    ] {
        let mut one_below = exact_bounds.clone();
        let maximum = one_below
            .get_mut(subject)
            .expect("every native evidence bound is declared");
        *maximum = maximum
            .checked_sub(1)
            .expect("every measured input is nonzero");
        let refusal = verify_native_fixture(
            bundle_with_native_bounds(one_below),
            NATIVE_MODEL_BYTES,
            NATIVE_EXPORT_TABLE.as_bytes(),
        )
        .expect_err("an actual input one past its declared bound refuses");
        assert_eq!(refusal.code, DOCUMENT_RESOURCE_LIMIT);
        assert_eq!(refusal.subject, subject);
    }
    println!("TC-1730 measured: 5 exact bounds admitted and 5 one-past values refused");
}
