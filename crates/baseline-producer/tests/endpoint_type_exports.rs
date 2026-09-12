// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Agent-IX

//! Traced FR-127 controls: every endpoint `typeIdentity` resolves through exactly
//! one export mapping to an exact native export kind and an ordered export path,
//! and a type that resolves through none, or through a mapping whose kind names
//! no type, refuses under its own stable code. Every control reports the number
//! it measured.
//!
//! The fixture below is the same complete static selection the FR-117 controls
//! use, rebuilt here so this file is self-contained: it admits cleanly, and each
//! control mutates exactly one axis of it before re-sealing the bundle's own
//! canonical digest header. Every assertion is on `Refusal::code`, never on
//! message text; a message is only ever asserted to *name* the identity or the
//! offered kind the requirement says it must name.

use std::collections::{BTreeMap, BTreeSet};

use agent_ix_baseline_producer::refusal::{
    ENDPOINT_TYPE_EXPORT_ABSENT, ENDPOINT_TYPE_EXPORT_KIND_FOREIGN,
    ENDPOINT_TYPE_IDENTITY_DISAGREES, EXPORT_ABSENT, EXPORT_CROSS_BOUND, IDENTITY_KIND_AMBIGUOUS,
};
use agent_ix_baseline_producer::{
    ArtifactKind, ArtifactReference, ComponentDeclaration, ConfigurationDocument,
    DeclarationSource, DigestDomainSelection, DigestSelection, EndpointDeclaration, ExportKind,
    ExportRecord, FormalDocument, InventoryCompleteness, InventoryDeclaration, InventoryMembership,
    ModelSelection, Multiplicity, NativeArtifactReference, NativeSourceLabel, NumericResourceLimit,
    ProducerNativeCorrespondence, ProducerObjectReference, ProfileSelection, RawByteDigest,
    RelationshipDeclaration, RelationshipDirection, RelationshipEndpoint, RelationshipOwnership,
    RelationshipSemantics, ResourceLimits, Revision, SourceLocus, Span, StaticClosure,
    StaticProducerBundle, WireReference, ADMISSIBLE_REVISION_NAMESPACES, INTERFACE_VERSION,
};
use serde_json::json;

const BUNDLE: &str = "ix://agent-ix/commerce/bundle/orders-static-a";
const SOURCE_DOCUMENT: &str = "ix://agent-ix/commerce/source/order-declarations";
const INVENTORY: &str = "ix://agent-ix/commerce/inventory/orders-2026-09-11";
const CONFIGURATION: &str = "ix://agent-ix/commerce/config/evaluation-default";
const MODEL: &str = "ix://agent-ix/commerce/model/order-1-2";
const PROFILE: &str = "ix://agent-ix/quire/profile/order-assessment-1-2";
const NATIVE: &str = "ix://agent-ix/quire/artifact/order-assessment-1-2";
const NATIVE_MIRROR: &str = "ix://agent-ix/quire/artifact/order-assessment-mirror";
const DEFINITION: &str = "ix://agent-ix/quire/definition/core-assessment-1-2";
const COMPONENT: &str = "ix://agent-ix/commerce/component/orders";
const ENDPOINT_SOURCE: &str = "ix://agent-ix/commerce/endpoint/Order-shipment-source";
const ENDPOINT_TARGET: &str = "ix://agent-ix/commerce/endpoint/Order-shipment-target";
const RELATIONSHIP: &str = "ix://agent-ix/commerce/relationship/Order-shipment";
const RELATION: &str = "ix://agent-ix/commerce/binding/order-model-to-quire-artifact";
const RELATION_MIRROR: &str = "ix://agent-ix/commerce/binding/order-model-to-quire-mirror";
const TYPE_ORDER: &str = "ix://agent-ix/commerce/type/Order";
const TYPE_SHIPMENT: &str = "ix://agent-ix/commerce/type/Shipment";
const TYPE_INVOICE: &str = "ix://agent-ix/commerce/type/Invoice";
const ENDPOINT_UNKNOWN: &str = "ix://agent-ix/commerce/endpoint/no-such-endpoint";

/// The five kinds that name a producer record or a member of a type.
const FOREIGN_KINDS: [ExportKind; 5] = [
    ExportKind::Field,
    ExportKind::Operation,
    ExportKind::Component,
    ExportKind::Endpoint,
    ExportKind::Relationship,
];

/// The `export.rs` source text, for the vocabulary census of TC-1507.
const EXPORT_SOURCE: &str = include_str!("../src/export.rs");

/// The `refusal.rs` source text, for the stable-code census of TC-1505 and TC-1510.
const REFUSAL_SOURCE: &str = include_str!("../src/refusal.rs");

fn configuration() -> ConfigurationDocument {
    let mut configuration = ConfigurationDocument {
        configuration_identity: CONFIGURATION.into(),
        baseline_version: "1.2.0".into(),
        digest: DigestSelection::canonical(format!("sha256:{}", "0".repeat(64))),
        model_authority: "ix://agent-ix/commerce/model-authority/primary".into(),
        profile_identities: BTreeSet::from([PROFILE.to_owned()]),
        adapter_identities: BTreeSet::from(["ix://agent-ix/commerce/adapter/orders".to_owned()]),
        mapping_targets: BTreeSet::from([PROFILE.to_owned()]),
        loss_policy: "ix://agent-ix/commerce/loss-policy/refuse".into(),
        resource_limits: ResourceLimits {
            numeric_resource_limit: Some(NumericResourceLimit::new(4096, 6144)),
            declared_bounds: BTreeMap::new(),
        },
        digest_selections: DigestDomainSelection::baseline(),
        revision_namespaces: ADMISSIBLE_REVISION_NAMESPACES
            .iter()
            .map(|namespace| (*namespace).to_owned())
            .collect(),
        trusted_references: BTreeSet::from([
            "ix://agent-ix/commerce/trust/model-registry".to_owned()
        ]),
    };
    configuration.digest = agent_ix_baseline_producer::configuration_digest(&configuration)
        .expect("the configuration digest computes");
    configuration
}

fn artifact_reference() -> ArtifactReference {
    ArtifactReference {
        ref_version: "3".into(),
        kind: ArtifactKind::Source,
        authority: "ix://agent-ix/commerce/model-authority/primary".into(),
        identity: SOURCE_DOCUMENT.into(),
        revision: Revision::producer("2026-09-11-1"),
        digest: RawByteDigest::new(format!("sha256:{}", "d".repeat(64)))
            .expect("a raw-byte digest string is admitted"),
        wire: WireReference {
            identity: "filament-core-data/producer-bundle".into(),
            version: "1.2.0".into(),
        },
    }
}

fn formal() -> FormalDocument {
    FormalDocument {
        document: "ix://agent-ix/commerce/formal/order-declarations".into(),
        revision: Revision::producer("2026-09-11-1"),
    }
}

fn locus() -> SourceLocus {
    SourceLocus {
        source: artifact_reference(),
        formal: formal(),
        span: Span {
            start: 64,
            end: 192,
        },
    }
}

fn component() -> ComponentDeclaration {
    ComponentDeclaration {
        component_identity: COMPONENT.into(),
        component_revision: Revision::producer("2026-09-11-1"),
        digest: DigestSelection::canonical(format!("sha256:{}", "1".repeat(64))),
        repository_identity: "ix://agent-ix/commerce/repository/orders".into(),
        repository_revision: Revision::producer("2026-09-11-1"),
        role_identities: BTreeSet::from(["ix://agent-ix/commerce/role/orders".to_owned()]),
        owning_type_identity: TYPE_ORDER.into(),
        source_locus: Some(locus()),
        inventory_membership: InventoryMembership::new(INVENTORY, InventoryCompleteness::Complete),
    }
}

fn endpoint(identity: &str, type_identity: &str, role: &str) -> EndpointDeclaration {
    EndpointDeclaration {
        endpoint_identity: identity.into(),
        endpoint_revision: Revision::producer("2026-09-11-1"),
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

fn relationship() -> RelationshipDeclaration {
    RelationshipDeclaration {
        relationship_identity: RELATIONSHIP.into(),
        relationship_name: "shipment".into(),
        relationship_revision: Some(Revision::producer("2026-09-11-1")),
        digest: Some(DigestSelection::canonical(format!(
            "sha256:{}",
            "3".repeat(64)
        ))),
        source: RelationshipEndpoint {
            endpoint_identity: ENDPOINT_SOURCE.into(),
            type_identity: TYPE_ORDER.into(),
            role: "order".into(),
            multiplicity: Some(Multiplicity {
                lower: 0,
                upper: Some(1),
                ordered: false,
                unique: false,
            }),
        },
        target: RelationshipEndpoint {
            endpoint_identity: ENDPOINT_TARGET.into(),
            type_identity: TYPE_SHIPMENT.into(),
            role: "shipment".into(),
            multiplicity: Some(Multiplicity {
                lower: 1,
                upper: Some(1),
                ordered: false,
                unique: false,
            }),
        },
        semantics: RelationshipSemantics {
            category: "structural".into(),
            direction: RelationshipDirection::SourceToTarget,
            composite: true,
            lifecycle: "order-owned".into(),
            ownership: "order".into(),
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
    }
}

fn inventory() -> InventoryDeclaration {
    InventoryDeclaration {
        inventory_identity: INVENTORY.into(),
        completeness: InventoryCompleteness::Complete,
        component_identities: BTreeSet::from([COMPONENT.to_owned()]),
        endpoint_identities: BTreeSet::from([
            ENDPOINT_SOURCE.to_owned(),
            ENDPOINT_TARGET.to_owned(),
        ]),
        relationship_identities: BTreeSet::from([RELATIONSHIP.to_owned()]),
    }
}

fn export(kind: ExportKind, export_identity: &str) -> ExportRecord {
    export_owned(kind, export_identity, MODEL)
}

/// One export mapping attributed to a named producer object.
fn export_owned(kind: ExportKind, export_identity: &str, producer: &str) -> ExportRecord {
    ExportRecord {
        kind,
        producer_object_identity: producer.into(),
        export_identity: export_identity.into(),
        export_path: vec!["orders".into(), kind.as_str().into()],
        locus: Some(locus()),
    }
}

fn correspondence() -> ProducerNativeCorrespondence {
    ProducerNativeCorrespondence {
        binding_relation_identity: RELATION.into(),
        producer: ProducerObjectReference {
            object_kind: "model".into(),
            authority: "ix://agent-ix/commerce/model-authority/primary".into(),
            identity: MODEL.into(),
            revision: Revision::producer("1.2.0"),
            digest: DigestSelection::canonical(format!("sha256:{}", "4".repeat(64))),
        },
        native: NativeArtifactReference {
            identity: NATIVE.into(),
            revision: Revision::native("1.2.0"),
            raw_byte_digest: DigestSelection::native_bytes(format!("sha256:{}", "5".repeat(64))),
        },
        native_definition_closure: vec![NativeArtifactReference {
            identity: DEFINITION.into(),
            revision: Revision::native("1.2.0"),
            raw_byte_digest: DigestSelection::native_bytes(format!("sha256:{}", "6".repeat(64))),
        }],
        required_native_definition_identities: BTreeSet::from([DEFINITION.to_owned()]),
        configuration_identity: Some(CONFIGURATION.into()),
        exports: vec![
            export(ExportKind::Component, COMPONENT),
            export(ExportKind::Endpoint, ENDPOINT_SOURCE),
            export(ExportKind::Endpoint, ENDPOINT_TARGET),
            export(ExportKind::Relationship, RELATIONSHIP),
            export(ExportKind::Object, TYPE_ORDER),
            export(ExportKind::Record, TYPE_SHIPMENT),
        ],
    }
}

/// A second correspondence over a second producer object and native artifact.
fn mirror_correspondence(exports: Vec<ExportRecord>) -> ProducerNativeCorrespondence {
    ProducerNativeCorrespondence {
        binding_relation_identity: RELATION_MIRROR.into(),
        producer: ProducerObjectReference {
            object_kind: "profile".into(),
            authority: "ix://agent-ix/commerce/model-authority/primary".into(),
            identity: PROFILE.into(),
            revision: Revision::producer("1.2.0"),
            digest: DigestSelection::canonical(format!("sha256:{}", "8".repeat(64))),
        },
        native: NativeArtifactReference {
            identity: NATIVE_MIRROR.into(),
            revision: Revision::native("1.2.0"),
            raw_byte_digest: DigestSelection::native_bytes(format!("sha256:{}", "9".repeat(64))),
        },
        native_definition_closure: vec![NativeArtifactReference {
            identity: DEFINITION.into(),
            revision: Revision::native("1.2.0"),
            raw_byte_digest: DigestSelection::native_bytes(format!("sha256:{}", "6".repeat(64))),
        }],
        required_native_definition_identities: BTreeSet::from([DEFINITION.to_owned()]),
        configuration_identity: Some(CONFIGURATION.into()),
        exports,
    }
}

fn model() -> ModelSelection {
    ModelSelection {
        model_identity: MODEL.into(),
        model_revision: Revision::producer("1.2.0"),
        digest: DigestSelection::canonical(format!("sha256:{}", "4".repeat(64))),
    }
}

fn profile() -> ProfileSelection {
    ProfileSelection {
        profile_identity: PROFILE.into(),
        profile_revision: Revision::producer("1.2.0"),
        digest: DigestSelection::canonical(format!("sha256:{}", "7".repeat(64))),
    }
}

fn static_closure() -> StaticClosure {
    StaticClosure {
        configuration_identity: CONFIGURATION.into(),
        configuration_digest: configuration().digest,
        model_identity: MODEL.into(),
        model_digest: model().digest,
        profile_identity: PROFILE.into(),
        profile_digest: profile().digest,
        declaration_sources: vec![DeclarationSource {
            source: artifact_reference(),
            native: NativeSourceLabel::new(
                "ix://agent-ix/quire/source/order-declarations",
                "editable-draft-7",
            ),
            path: "models/orders.tsp".into(),
            formal: formal(),
        }],
    }
}

/// One complete static selection, with its own canonical digest header computed.
fn bundle() -> StaticProducerBundle {
    let mut bundle = StaticProducerBundle {
        bundle_identity: Some(BUNDLE.into()),
        bundle_revision: Some(Revision::producer("2026-09-11-1")),
        digest: None,
        interface_version: Some(INTERFACE_VERSION.into()),
        model: Some(model()),
        profile: Some(profile()),
        components: vec![component()],
        endpoints: vec![
            endpoint(ENDPOINT_SOURCE, TYPE_ORDER, "order"),
            endpoint(ENDPOINT_TARGET, TYPE_SHIPMENT, "shipment"),
        ],
        relationships: vec![relationship()],
        inventory: Some(inventory()),
        configuration: Some(configuration()),
        static_closure: Some(static_closure()),
        correspondences: vec![correspondence()],
    };
    bundle.digest = Some(
        bundle
            .canonical_digest_selection()
            .expect("the bundle's own canonical digest computes"),
    );
    bundle
}

/// Recomputes the bundle's own digest header member after a mutation.
fn resealed(mut bundle: StaticProducerBundle) -> StaticProducerBundle {
    let previous = bundle.digest.take();
    bundle.digest = bundle.canonical_digest_selection().ok().or(previous);
    bundle
}

/// Replaces the export mapping of one identity in the first correspondence.
fn with_type_export(
    mut bundle: StaticProducerBundle,
    replacement: ExportRecord,
) -> StaticProducerBundle {
    for export in &mut bundle.correspondences[0].exports {
        if export.export_identity == replacement.export_identity {
            *export = replacement.clone();
        }
    }
    resealed(bundle)
}

/// Tracing: TC-1500
#[test]
fn tc_1500_every_endpoint_type_identity_resolves_to_exactly_one_export_mapping() {
    let admitted = bundle()
        .admit()
        .expect("a complete static selection is admitted");

    let mut resolved = 0;
    for endpoint in admitted.endpoints() {
        let export = admitted
            .endpoint_type_export(&endpoint.endpoint_identity)
            .expect("every endpoint's named model type resolves to an export mapping");
        // The kind and the ordered path are separate readable members: neither is
        // parsed out of the other, and the type is not recovered from a segment.
        assert!(
            export.kind.is_type(),
            "{} resolves to a type kind",
            endpoint.endpoint_identity
        );
        assert_eq!(export.export_identity, endpoint.type_identity);
        assert_eq!(export.export_path, vec!["orders", export.kind.as_str()]);
        assert!(
            !export
                .export_path
                .iter()
                .any(|segment| segment == &endpoint.type_identity),
            "no export path segment spells the model type identity"
        );

        // Exactly one export mapping in the whole bundle resolves that identity.
        let mappings = admitted
            .correspondences()
            .iter()
            .flat_map(|correspondence| correspondence.exports.iter())
            .filter(|candidate| candidate.export_identity == endpoint.type_identity)
            .count();
        assert_eq!(
            mappings, 1,
            "{} is owed one mapping",
            endpoint.type_identity
        );
        resolved += 1;
    }
    assert_eq!(resolved, 2);
    assert_eq!(
        admitted
            .type_export_of(TYPE_ORDER)
            .expect("the Order type resolves")
            .kind,
        ExportKind::Object
    );
    assert_eq!(
        admitted
            .type_export_of(TYPE_SHIPMENT)
            .expect("the Shipment type resolves")
            .kind,
        ExportKind::Record
    );

    println!(
        "TC-1500 measured: {resolved} endpoint type identities, each resolving to exactly 1 export mapping whose kind and 2-segment export_path are read as separate members"
    );
}

/// Tracing: TC-1501
#[test]
fn tc_1501_an_unexported_model_type_refuses_distinctly_from_an_unexported_record() {
    let mut unexported_type = bundle();
    unexported_type.correspondences[0]
        .exports
        .retain(|export| export.export_identity != TYPE_ORDER);
    let type_refusal = resealed(unexported_type)
        .admit()
        .expect_err("a model type no correspondence exports is refused");
    assert_eq!(type_refusal.code, ENDPOINT_TYPE_EXPORT_ABSENT);
    assert!(
        type_refusal.message.contains(TYPE_ORDER),
        "the refusal names the model type identity: {}",
        type_refusal.message
    );

    let mut unexported_record = bundle();
    unexported_record.correspondences[0]
        .exports
        .retain(|export| export.export_identity != COMPONENT);
    let record_refusal = resealed(unexported_record)
        .admit()
        .expect_err("a declared record no correspondence exports is refused");
    assert_eq!(record_refusal.code, EXPORT_ABSENT);
    assert!(
        record_refusal.message.contains(COMPONENT),
        "the refusal names the declared record: {}",
        record_refusal.message
    );

    assert_ne!(
        type_refusal.code, record_refusal.code,
        "the model-type code is distinct from the declared-record code"
    );

    println!(
        "TC-1501 measured: 2 refusals under 2 distinct codes, {} for the unexported model type and {} for the unexported declared record",
        type_refusal.code, record_refusal.code
    );
}

/// Tracing: TC-1502
#[test]
fn tc_1502_each_non_type_kind_offered_for_a_model_type_refuses_as_kind_foreign() {
    let mut refused = 0;
    for kind in FOREIGN_KINDS {
        assert!(!kind.is_type(), "{} names no type", kind.as_str());
        let offered = ExportRecord {
            kind,
            ..export(ExportKind::Object, TYPE_ORDER)
        };
        let Err(refusal) = with_type_export(bundle(), offered).admit() else {
            panic!(
                "{} is refused for a model type, not admitted",
                kind.as_str()
            );
        };
        assert_eq!(
            refusal.code,
            ENDPOINT_TYPE_EXPORT_KIND_FOREIGN,
            "{} refuses under the model-type kind code",
            kind.as_str()
        );
        assert!(
            refusal.message.contains(TYPE_ORDER) && refusal.message.contains(kind.as_str()),
            "the refusal names the model type and the offered kind: {}",
            refusal.message
        );
        refused += 1;
    }
    assert_eq!(refused, FOREIGN_KINDS.len());
    println!("TC-1502 measured: {refused} refused non-type kinds, each under ENDPOINT_TYPE_EXPORT_KIND_FOREIGN");
}

/// Tracing: TC-1503
#[test]
fn tc_1503_each_of_the_six_type_kinds_is_admitted_for_a_declared_model_type() {
    let mut admitted_kinds = 0;
    for kind in ExportKind::TYPE_KINDS {
        assert!(kind.is_type(), "{} names a type", kind.as_str());
        let offered = ExportRecord {
            kind,
            ..export(ExportKind::Object, TYPE_ORDER)
        };
        let admitted = with_type_export(bundle(), offered)
            .admit()
            .unwrap_or_else(|refusal| panic!("{} is admitted: {refusal}", kind.as_str()));
        assert_eq!(
            admitted
                .endpoint_type_export(ENDPOINT_SOURCE)
                .expect("the endpoint's model type resolves")
                .kind,
            kind,
            "the admitted mapping keeps the kind the native artifact declared"
        );
        admitted_kinds += 1;
    }
    assert_eq!(admitted_kinds, ExportKind::TYPE_KINDS.len());
    println!("TC-1503 measured: {admitted_kinds} admitted type kinds");
}

/// Tracing: TC-1504
#[test]
fn tc_1504_two_endpoints_naming_one_type_resolve_to_the_one_mapping_it_is_owed() {
    let mut shared = bundle();
    shared.endpoints[1].type_identity = TYPE_ORDER.into();
    shared.relationships[0].target.type_identity = TYPE_ORDER.into();
    shared.correspondences[0]
        .exports
        .retain(|export| export.export_identity != TYPE_SHIPMENT);

    let admitted = resealed(shared)
        .admit()
        .expect("two endpoints naming one model type owe one mapping, not two");

    let source = admitted
        .endpoint_type_export(ENDPOINT_SOURCE)
        .expect("the source endpoint's model type resolves");
    let target = admitted
        .endpoint_type_export(ENDPOINT_TARGET)
        .expect("the target endpoint's model type resolves");
    assert_eq!(source, target, "both endpoints resolve to the one mapping");
    assert_eq!(source.export_identity, TYPE_ORDER);

    let mappings = admitted
        .correspondences()
        .iter()
        .flat_map(|correspondence| correspondence.exports.iter())
        .filter(|export| export.export_identity == TYPE_ORDER)
        .count();
    assert_eq!(mappings, 1);
    assert_eq!(admitted.endpoints().len(), 2);

    println!(
        "TC-1504 measured: 2 endpoints naming 1 model type identity resolving to {mappings} export mapping, over {} total export mappings",
        admitted.correspondences()[0].exports.len()
    );
}

/// Tracing: TC-1505
#[test]
fn tc_1505_an_identity_declared_as_a_record_and_as_a_model_type_refuses() {
    // One identity cannot admit both: a record admits exactly its own kind and a
    // model type admits any type kind, so no single export mapping satisfies
    // both. Keeping the record admission silently would leave an admitted
    // endpoint whose model type resolved to no type export at all, which is the
    // hole FR-127-CON-8 closes.
    let mut collided = bundle();
    collided.endpoints[0].type_identity = COMPONENT.into();
    collided.relationships[0].source.type_identity = COMPONENT.into();
    collided.correspondences[0]
        .exports
        .retain(|export| export.export_identity != TYPE_ORDER);

    let refusal = resealed(collided.clone())
        .admit()
        .expect_err("one identity declared as both a record and a model type refuses");
    assert_eq!(
        refusal.code, IDENTITY_KIND_AMBIGUOUS,
        "the collision refuses under its own code"
    );
    assert!(
        refusal.message.contains(COMPONENT),
        "the refusal names the colliding identity"
    );
    assert!(
        refusal.message.contains(ENDPOINT_SOURCE),
        "the refusal names the endpoint that named it as a model type"
    );

    // Offering the type admission instead does not rescue it: the collision is
    // refused before any export kind is considered.
    let mut typed = collided;
    for export in &mut typed.correspondences[0].exports {
        if export.export_identity == COMPONENT {
            export.kind = ExportKind::Object;
        }
    }
    let second = resealed(typed)
        .admit()
        .expect_err("the collision refuses under either offered kind");
    assert_eq!(second.code, IDENTITY_KIND_AMBIGUOUS);

    println!(
        "TC-1505 measured: 1 colliding identity refused {} under 2 offered export kinds, 0 admitted bundles",
        refusal.code
    );
}

/// Tracing: TC-1506
#[test]
fn tc_1506_a_model_type_mapping_owned_by_another_producer_object_refuses_as_cross_bound() {
    let mut cross_bound = bundle();
    cross_bound
        .correspondences
        .push(mirror_correspondence(vec![export_owned(
            ExportKind::Object,
            TYPE_ORDER,
            PROFILE,
        )]));

    let refusal = resealed(cross_bound)
        .admit()
        .expect_err("a model type exported by two producer objects is refused");
    assert_eq!(refusal.code, EXPORT_CROSS_BOUND);
    assert!(
        refusal.message.contains(TYPE_ORDER)
            && refusal.message.contains(MODEL)
            && refusal.message.contains(PROFILE),
        "the refusal names the model type and both producer objects: {}",
        refusal.message
    );

    println!(
        "TC-1506 measured: 1 model type exported by 2 producer objects, refused under {}",
        refusal.code
    );
}

/// Tracing: TC-1507
#[test]
fn tc_1507_the_export_vocabulary_is_eleven_kinds_of_which_exactly_six_name_a_type() {
    assert_eq!(ExportKind::EMITTED.len(), 11);
    assert_eq!(ExportKind::TYPE_KINDS.len(), 6);

    let type_kinds: BTreeSet<&str> = ExportKind::TYPE_KINDS
        .iter()
        .map(|kind| kind.as_str())
        .collect();
    assert_eq!(
        type_kinds,
        BTreeSet::from(["enum", "object", "record", "reference", "scalar", "variant"])
    );

    let mut typed = 0;
    for kind in ExportKind::EMITTED {
        assert_eq!(
            kind.is_type(),
            type_kinds.contains(kind.as_str()),
            "{} agrees with TYPE_KINDS",
            kind.as_str()
        );
        if kind.is_type() {
            typed += 1;
        }
    }
    assert_eq!(typed, ExportKind::TYPE_KINDS.len());

    // The assessment-side `population` kind is not a variant of this vocabulary
    // at all: it is unrepresentable rather than constructible-and-refused.
    assert!(
        !EXPORT_SOURCE.contains("Population"),
        "no `population` variant is declared in the static export vocabulary"
    );
    let population: Result<ExportKind, _> = serde_json::from_value(json!("population"));
    assert!(
        population.is_err(),
        "a `population` export kind does not deserialize into the static vocabulary"
    );
    for kind in ExportKind::EMITTED {
        let round_trip: ExportKind = serde_json::from_value(json!(kind.as_str()))
            .unwrap_or_else(|error| panic!("{} deserializes: {error}", kind.as_str()));
        assert_eq!(round_trip, kind);
    }

    println!(
        "TC-1507 measured: {} emitted export kinds, {typed} of them type kinds, 0 population variants, {} kinds round-tripping through their closed spelling",
        ExportKind::EMITTED.len(),
        ExportKind::EMITTED.len()
    );
}

/// Tracing: TC-1508
#[test]
fn tc_1508_type_export_lookup_is_total_over_declared_endpoints_and_stable_across_calls() {
    let admitted = bundle().admit().expect("the fixture admits");

    assert!(
        admitted.endpoint_type_export(ENDPOINT_UNKNOWN).is_none(),
        "an endpoint identity no declaration carries resolves to no mapping"
    );

    let mut declared = 0;
    for endpoint in admitted.endpoints() {
        assert!(
            admitted
                .endpoint_type_export(&endpoint.endpoint_identity)
                .is_some(),
            "{} resolves",
            endpoint.endpoint_identity
        );
        declared += 1;
    }

    let first = admitted.endpoint_type_exports();
    let second = admitted.endpoint_type_exports();
    assert_eq!(first, second, "two calls yield the identical mapping");
    let ordered: Vec<&str> = first.keys().copied().collect();
    let mut sorted = ordered.clone();
    sorted.sort_unstable();
    assert_eq!(
        ordered, sorted,
        "the pairs are ordered by endpoint identity"
    );
    assert_eq!(ordered, vec![ENDPOINT_SOURCE, ENDPOINT_TARGET]);
    assert_eq!(first.len(), declared);

    println!(
        "TC-1508 measured: 1 unknown endpoint resolving to None, {declared} declared endpoints resolving to Some, {} ordered pairs identical across 2 calls",
        first.len()
    );
}

/// Tracing: TC-1509
#[test]
fn tc_1509_a_relationship_end_disagreeing_with_its_joined_endpoint_refuses() {
    let mut disagreeing = bundle();
    disagreeing.relationships[0].source.type_identity = TYPE_INVOICE.into();

    let refusal = resealed(disagreeing)
        .admit()
        .expect_err("a relationship-side type spelling no endpoint declares is refused");
    assert_eq!(refusal.code, ENDPOINT_TYPE_IDENTITY_DISAGREES);
    assert!(
        refusal.message.contains(TYPE_INVOICE) && refusal.message.contains(TYPE_ORDER),
        "the refusal names both spellings: {}",
        refusal.message
    );

    println!(
        "TC-1509 measured: 1 relationship end over 2 named type spellings, refused under {}",
        refusal.code
    );
}

/// Tracing: TC-1510
#[test]
fn tc_1510_two_mappings_for_one_model_type_under_one_producer_object_refuse_as_cross_bound() {
    // FR-127 specifies `ENDPOINT_TYPE_EXPORT_DUPLICATE` for this case. No such
    // code exists in `refusal.rs`; the implemented behaviour folds it into the
    // cross-bound refusal, which distinguishes the two cases by message alone.
    let mut duplicated = bundle();
    duplicated.correspondences[0]
        .exports
        .push(export(ExportKind::Record, TYPE_ORDER));

    let refusal = resealed(duplicated)
        .admit()
        .expect_err("one model type carrying two export mappings is refused");
    assert_eq!(refusal.code, EXPORT_CROSS_BOUND);
    assert!(
        refusal.message.contains(TYPE_ORDER) && refusal.message.contains(MODEL),
        "the refusal names the model type and the one owning producer object: {}",
        refusal.message
    );
    assert!(
        !REFUSAL_SOURCE.contains("ENDPOINT_TYPE_EXPORT_DUPLICATE"),
        "no ENDPOINT_TYPE_EXPORT_DUPLICATE code is declared"
    );
    assert!(
        !REFUSAL_SOURCE.contains("EXPORT_PATH_DISAGREES")
            && !REFUSAL_SOURCE.contains("EXPORT_KIND_DISAGREES"),
        "neither disagreement code is declared"
    );

    println!(
        "TC-1510 measured: 2 export mappings for 1 model type under 1 producer object, refused under {} rather than a distinct duplicate code",
        refusal.code
    );
}

/// Tracing: TC-1511
#[test]
fn tc_1511_the_authored_ordered_export_path_is_retained_exactly_as_offered() {
    let authored = vec![
        "quire".to_owned(),
        "types".to_owned(),
        "Order".to_owned(),
        "v2".to_owned(),
    ];
    let admitted = with_type_export(
        bundle(),
        ExportRecord {
            export_path: authored.clone(),
            ..export(ExportKind::Object, TYPE_ORDER)
        },
    )
    .admit()
    .expect("an ordered export path of four segments is admitted");
    let retained = admitted
        .endpoint_type_export(ENDPOINT_SOURCE)
        .expect("the model type resolves");
    assert_eq!(retained.export_path, authored, "the order is retained");
    assert_eq!(retained.export_path.len(), 4);

    // FR-127 specifies `EXPORT_PATH_DISAGREES` for a path reordered, truncated or
    // re-segmented relative to the native artifact's own export table. The static
    // bundle carries no native export table, so the reordered path below is
    // admitted and retained rather than refused.
    let reordered: Vec<String> = authored.iter().rev().cloned().collect();
    let permuted = with_type_export(
        bundle(),
        ExportRecord {
            export_path: reordered.clone(),
            ..export(ExportKind::Object, TYPE_ORDER)
        },
    )
    .admit()
    .expect("no native export table contradicts the reordered path");
    assert_eq!(
        permuted
            .endpoint_type_export(ENDPOINT_SOURCE)
            .expect("the model type resolves")
            .export_path,
        reordered
    );
    assert_ne!(authored, reordered);

    println!(
        "TC-1511 measured: 2 admissions over 4-segment export paths, both retained in the authored order, 0 EXPORT_PATH_DISAGREES refusals implemented"
    );
}

/// Tracing: TC-1512
#[test]
fn tc_1512_resolution_is_by_identity_not_by_path_and_is_identical_across_admissions() {
    // The Shipment mapping's final path segment spells `Order`. A coinciding
    // segment is not a resolution: the Order endpoint still resolves to the
    // mapping whose *export identity* is the Order type.
    let coinciding = with_type_export(
        bundle(),
        ExportRecord {
            export_path: vec!["orders".to_owned(), "Order".to_owned()],
            ..export(ExportKind::Record, TYPE_SHIPMENT)
        },
    );
    let admitted = coinciding.clone().admit().expect("the fixture admits");
    let source = admitted
        .endpoint_type_export(ENDPOINT_SOURCE)
        .expect("the source endpoint's model type resolves");
    assert_eq!(source.export_identity, TYPE_ORDER);
    assert_eq!(source.kind, ExportKind::Object);
    assert_eq!(
        admitted
            .endpoint_type_export(ENDPOINT_TARGET)
            .expect("the target endpoint's model type resolves")
            .export_identity,
        TYPE_SHIPMENT
    );

    let again = coinciding.admit().expect("the same document admits again");
    let first: Vec<(&str, &ExportRecord)> = admitted
        .endpoint_type_exports()
        .into_iter()
        .collect::<Vec<_>>();
    let second: Vec<(&str, &ExportRecord)> = again
        .endpoint_type_exports()
        .into_iter()
        .collect::<Vec<_>>();
    assert_eq!(first.len(), second.len());
    for (left, right) in first.iter().zip(second.iter()) {
        assert_eq!(left.0, right.0);
        assert_eq!(left.1, right.1);
    }

    println!(
        "TC-1512 measured: 1 coinciding final path segment resolving 0 types by path, {} endpoint/mapping pairs identical in order across 2 admissions of one document",
        first.len()
    );
}
