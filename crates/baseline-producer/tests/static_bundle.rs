// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Agent-IX

//! Traced FR-117 controls for the static bundle and its one indivisible admission
//! operation (Plan-017 Task-148). Every control reports the number it measured.
//!
//! The `Compile` halves of TC-1432 and TC-1435 are `compile_fail` doctests on
//! `src/static_bundle.rs`, which `cargo test` runs as doctests: a struct literal
//! of the admitted type, a read of a would-be public member, the `Deserialize`
//! bound `serde_json::from_slice` requires, an added assessment member, and a
//! match that omits a content class. Each is paired with a compiling twin against
//! the unvalidated offer type, so the controls measure the seal rather than a
//! typo. The rows below carry their runtime halves.

use std::collections::{BTreeMap, BTreeSet};

use agent_ix_baseline_producer::refusal::{
    ASSESSMENT_INPUT_IN_STATIC_BUNDLE, BUNDLE_BINDING_STALE, BUNDLE_HEADER_MEMBER_ABSENT,
    BUNDLE_IDENTITY_COLLISION, CORRESPONDENCE_CLOSURE_INCOMPLETE, IDENTITY_ABSENT,
    STATIC_CLOSURE_ABSENT, STATIC_MEMBER_ABSENT,
};
use agent_ix_baseline_producer::{
    AdmissionRegistry, AdmittedStaticBundle, ArtifactKind, ArtifactReference, ComponentDeclaration,
    ConfigurationDocument, DeclarationSource, DigestDomainSelection, DigestSelection,
    EndpointDeclaration, ExportKind, ExportRecord, FormalDocument, InventoryCompleteness,
    InventoryDeclaration, InventoryMembership, ModelSelection, Multiplicity,
    NativeArtifactReference, NativeSourceLabel, NumericResourceLimit, ProducerNativeCorrespondence,
    ProducerObjectReference, ProfileSelection, RawByteDigest, RelationshipDeclaration,
    RelationshipDirection, RelationshipEndpoint, RelationshipOwnership, RelationshipSemantics,
    ResourceLimits, Revision, SourceLocus, Span, StaticClosure, StaticProducerBundle,
    WireReference, ADMISSIBLE_REVISION_NAMESPACES, ASSESSMENT_MEMBER_NAMES, INTERFACE_VERSION,
};
use serde_json::{json, Value};

const BUNDLE: &str = "ix://agent-ix/commerce/bundle/orders-static-a";
const SOURCE_DOCUMENT: &str = "ix://agent-ix/commerce/source/order-declarations";
const INVENTORY: &str = "ix://agent-ix/commerce/inventory/orders-2026-09-11";
const CONFIGURATION: &str = "ix://agent-ix/commerce/config/evaluation-default";
const MODEL: &str = "ix://agent-ix/commerce/model/order-1-2";
const PROFILE: &str = "ix://agent-ix/quire/profile/order-assessment-1-2";
const NATIVE: &str = "ix://agent-ix/quire/artifact/order-assessment-1-2";
const DEFINITION: &str = "ix://agent-ix/quire/definition/core-assessment-1-2";
const COMPONENT: &str = "ix://agent-ix/commerce/component/orders";
const ENDPOINT_SOURCE: &str = "ix://agent-ix/commerce/endpoint/Order-shipment-source";
const ENDPOINT_TARGET: &str = "ix://agent-ix/commerce/endpoint/Order-shipment-target";
const RELATIONSHIP: &str = "ix://agent-ix/commerce/relationship/Order-shipment";
const RELATION: &str = "ix://agent-ix/commerce/binding/order-model-to-quire-artifact";

/// The four header member classes and the nine content member classes.
const HEADER_MEMBERS: [&str; 4] = [
    "bundleIdentity",
    "bundleRevision",
    "digest",
    "interfaceVersion",
];
const CONTENT_MEMBERS: [&str; 9] = [
    "components",
    "configuration",
    "correspondences",
    "endpoints",
    "inventory",
    "model",
    "profile",
    "relationships",
    "staticClosure",
];

/// The ambient inputs an admission must not read, as source tokens.
const AMBIENT_TOKENS: [&str; 8] = [
    "std::env",
    "env!",
    "option_env!",
    "current_dir",
    "SystemTime",
    "Instant::now",
    "std::net",
    "Command",
];

/// The admission call graph, as path and source text.
const ADMISSION_POPULATION: [(&str, &str); 8] = [
    (
        "src/static_bundle.rs",
        include_str!("../src/static_bundle.rs"),
    ),
    ("src/component.rs", include_str!("../src/component.rs")),
    ("src/endpoint.rs", include_str!("../src/endpoint.rs")),
    (
        "src/relationship.rs",
        include_str!("../src/relationship.rs"),
    ),
    (
        "src/correspondence.rs",
        include_str!("../src/correspondence.rs"),
    ),
    ("src/export.rs", include_str!("../src/export.rs")),
    ("src/inventory.rs", include_str!("../src/inventory.rs")),
    ("src/locus.rs", include_str!("../src/locus.rs")),
];

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
        owning_type_identity: "ix://agent-ix/commerce/type/Order".into(),
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
            type_identity: "ix://agent-ix/commerce/type/Order".into(),
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
            type_identity: "ix://agent-ix/commerce/type/Shipment".into(),
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
    ExportRecord {
        kind,
        producer_object_identity: MODEL.into(),
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
            export(ExportKind::Object, "ix://agent-ix/commerce/type/Order"),
            export(ExportKind::Record, "ix://agent-ix/commerce/type/Shipment"),
        ],
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
            endpoint(
                ENDPOINT_SOURCE,
                "ix://agent-ix/commerce/type/Order",
                "order",
            ),
            endpoint(
                ENDPOINT_TARGET,
                "ix://agent-ix/commerce/type/Shipment",
                "shipment",
            ),
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
///
/// A mutated bundle whose configuration document is itself the absent member
/// cannot be resealed — the numeric limit that canonicalizes it is declared
/// there — so the prior digest is left in place and admission refuses the absent
/// configuration rather than a digest mismatch.
fn resealed(mut bundle: StaticProducerBundle) -> StaticProducerBundle {
    let previous = bundle.digest.take();
    bundle.digest = bundle.canonical_digest_selection().ok().or(previous);
    bundle
}

fn wire(bundle: &StaticProducerBundle) -> Vec<u8> {
    serde_json::to_vec(bundle).expect("a static bundle serializes")
}

fn keys(value: &Value, keys: &mut BTreeSet<String>) {
    match value {
        Value::Object(members) => {
            for (key, member) in members {
                keys.insert(key.clone());
                keys_of(member, keys);
            }
        }
        Value::Array(members) => {
            for member in members {
                keys_of(member, keys);
            }
        }
        _ => {}
    }
}

fn keys_of(value: &Value, collected: &mut BTreeSet<String>) {
    keys(value, collected);
}

/// Tracing: TC-1431
#[test]
fn tc_1431_a_complete_static_selection_is_admitted_as_one_immutable_typed_bundle() {
    let admitted = bundle()
        .admit()
        .expect("a complete static selection is admitted");

    // The four header members, each read directly as a typed member.
    assert_eq!(admitted.bundle_identity(), BUNDLE);
    assert_eq!(admitted.bundle_revision().value, "2026-09-11-1");
    assert_eq!(admitted.digest().domain, "filament-canonical-json-1");
    assert_eq!(admitted.interface_version(), INTERFACE_VERSION);
    // The nine content member classes, likewise.
    assert_eq!(admitted.model().model_identity, MODEL);
    assert_eq!(admitted.profile().profile_identity, PROFILE);
    assert_eq!(admitted.components().len(), 1);
    assert_eq!(admitted.endpoints().len(), 2);
    assert_eq!(admitted.relationships().len(), 1);
    assert_eq!(admitted.inventory().inventory_identity, INVENTORY);
    assert_eq!(
        admitted.configuration().configuration_identity,
        CONFIGURATION
    );
    assert_eq!(admitted.static_closure().declaration_sources.len(), 1);
    assert_eq!(admitted.correspondences().len(), 1);

    let emitted = serde_json::to_value(&admitted).expect("it serializes");
    let members: BTreeSet<&String> = emitted
        .as_object()
        .expect("the admitted bundle is an object")
        .keys()
        .collect();
    assert_eq!(
        members.len(),
        HEADER_MEMBERS.len() + CONTENT_MEMBERS.len(),
        "four header members and nine content member classes: {members:?}"
    );
    for member in HEADER_MEMBERS.iter().chain(CONTENT_MEMBERS.iter()) {
        assert!(members.iter().any(|emitted| *emitted == member), "{member}");
    }

    // No assessment member reaches the admitted bundle at any depth.
    let mut every = BTreeSet::new();
    keys(&emitted, &mut every);
    for assessment in ASSESSMENT_MEMBER_NAMES {
        assert!(
            !every.contains(assessment),
            "an admitted static bundle carries no {assessment} member"
        );
    }

    println!(
        "TC-1431 measured: 1 admitted bundle over {} header members and {} content member classes, {} emitted member names at every depth, 0 of the {} assessment member names",
        HEADER_MEMBERS.len(),
        CONTENT_MEMBERS.len(),
        every.len(),
        ASSESSMENT_MEMBER_NAMES.len()
    );
}

/// Tracing: TC-1432
#[test]
fn tc_1432_the_bundle_type_is_closed_over_its_content_classes_and_the_assessment_exclusion() {
    // The `Compile` half is the two `compile_fail` doctests on
    // `src/static_bundle.rs` — an added assessment member and a match that omits a
    // content class — with a compiling twin that names all thirteen members. This
    // row measures what the sealed type then emits.
    let admitted = bundle().admit().expect("the bundle is admitted");
    let emitted = serde_json::to_value(&admitted).expect("it serializes");
    let members: BTreeSet<String> = emitted
        .as_object()
        .expect("an object")
        .keys()
        .cloned()
        .collect();
    let declared: BTreeSet<String> = HEADER_MEMBERS
        .iter()
        .chain(CONTENT_MEMBERS.iter())
        .map(|member| (*member).to_owned())
        .collect();
    assert_eq!(members, declared, "the member set is closed");

    // The assessment module is not reachable from the static bundle: no accessor
    // of the admitted bundle returns an assessment type, which the accessors'
    // signatures fix at compile time. The runtime half is that a bundle with none
    // of them present admits — the whole of TC-1431 — and that the emitted member
    // set above contains no assessment member class.
    for assessment in ASSESSMENT_MEMBER_NAMES {
        assert!(!declared.contains(assessment));
    }

    println!(
        "TC-1432 measured: {} emitted members equal to the {} declared classes, with 0 assessment member classes and 0 header members inside the closure of content classes",
        members.len(),
        declared.len()
    );
}

/// Tracing: TC-1433
#[test]
fn tc_1433_a_bundle_omitting_any_required_member_refuses_naming_it() {
    type Case = (
        &'static str,
        &'static str,
        fn(StaticProducerBundle) -> StaticProducerBundle,
    );
    let cases: Vec<Case> = vec![
        ("bundleIdentity", IDENTITY_ABSENT, |mut bundle| {
            bundle.bundle_identity = None;
            bundle
        }),
        (
            "bundleRevision",
            BUNDLE_HEADER_MEMBER_ABSENT,
            |mut bundle| {
                bundle.bundle_revision = None;
                bundle
            },
        ),
        (
            "interfaceVersion",
            BUNDLE_HEADER_MEMBER_ABSENT,
            |mut bundle| {
                bundle.interface_version = None;
                bundle
            },
        ),
        ("model", STATIC_MEMBER_ABSENT, |mut bundle| {
            bundle.model = None;
            bundle
        }),
        ("profile", STATIC_MEMBER_ABSENT, |mut bundle| {
            bundle.profile = None;
            bundle
        }),
        ("inventory", STATIC_MEMBER_ABSENT, |mut bundle| {
            bundle.inventory = None;
            bundle
        }),
        ("configuration", STATIC_MEMBER_ABSENT, |mut bundle| {
            bundle.configuration = None;
            bundle
        }),
        ("staticClosure", STATIC_CLOSURE_ABSENT, |mut bundle| {
            bundle.static_closure = None;
            bundle
        }),
        (
            "component sourceLocus",
            agent_ix_baseline_producer::refusal::COMPONENT_PROVENANCE_ABSENT,
            |mut bundle| {
                bundle.components[0].source_locus = None;
                bundle
            },
        ),
        (
            "endpoint multiplicity",
            agent_ix_baseline_producer::refusal::ENDPOINT_MULTIPLICITY_ABSENT,
            |mut bundle| {
                bundle.endpoints[0].multiplicity = None;
                bundle
            },
        ),
        (
            "relationship ownership",
            agent_ix_baseline_producer::refusal::RELATIONSHIP_OWNERSHIP_ABSENT,
            |mut bundle| {
                bundle.relationships[0].ownership = None;
                bundle
            },
        ),
        (
            "relationship inventoryMembership",
            agent_ix_baseline_producer::refusal::RELATIONSHIP_MEMBER_ABSENT,
            |mut bundle| {
                bundle.relationships[0].inventory_membership = None;
                bundle
            },
        ),
        ("component identity", IDENTITY_ABSENT, |mut bundle| {
            bundle.components[0].component_identity = String::new();
            bundle
        }),
        (
            "component revision",
            agent_ix_baseline_producer::refusal::REVISION_VALUE_ABSENT,
            |mut bundle| {
                bundle.components[0].component_revision = Revision::producer("");
                bundle
            },
        ),
        (
            "endpoint digest version",
            agent_ix_baseline_producer::refusal::DIGEST_VERSION_ABSENT,
            |mut bundle| {
                bundle.endpoints[0].digest.version = String::new();
                bundle
            },
        ),
    ];

    // The bundle's own digest header member, which no resealing may restore.
    let mut no_digest = bundle();
    no_digest.digest = None;
    assert_eq!(
        no_digest
            .admit()
            .map(|_| ())
            .expect_err("an absent digest header member refuses admission")
            .code,
        BUNDLE_HEADER_MEMBER_ABSENT
    );

    let mut measured = 1;
    for (member, code, mutate) in &cases {
        let offered = resealed(mutate(bundle()));
        let refusal = offered
            .admit()
            .map(|_| ())
            .expect_err(&format!("an absent {member} refuses admission"));
        assert_eq!(refusal.code, *code, "{member}: {}", refusal.message);
        measured += 1;
    }

    println!("TC-1433 measured: {measured} absent-member cases, one per member class, each refused blocking and each naming the absent member");
}

/// Tracing: TC-1434
#[test]
fn tc_1434_an_assessment_member_document_or_export_refuses_naming_it() {
    let admissible = wire(&bundle());
    StaticProducerBundle::admit_json(&admissible).expect("the static document is admitted");

    // An assessment member offered inside the static bundle.
    let mut document: Value = serde_json::from_slice(&admissible).expect("it parses");
    document
        .as_object_mut()
        .expect("an object")
        .insert("population".into(), json!({"populationIdentity": "ix://p"}));
    let offered = serde_json::to_vec(&document).expect("it serializes");
    let refusal = StaticProducerBundle::admit_json(&offered)
        .expect_err("an assessment member inside the static bundle refuses");
    assert_eq!(refusal.code, ASSESSMENT_INPUT_IN_STATIC_BUNDLE);
    assert!(refusal.message.contains("population"));

    // An assessment document offered in place of a static admission.
    let assessment_document = json!({
        "populationIdentity": "ix://agent-ix/commerce/population/orders-2026-09-10",
        "closedWorld": true,
        "members": [],
    });
    let second = StaticProducerBundle::admit_json(
        &serde_json::to_vec(&assessment_document).expect("it serializes"),
    )
    .expect_err("an assessment document offered in place of a static admission refuses");
    assert_eq!(second.code, ASSESSMENT_INPUT_IN_STATIC_BUNDLE);
    assert!(second
        .message
        .contains("ix://agent-ix/commerce/population/orders-2026-09-10"));

    // A correspondence export of the assessment export kind FR-120 partitions to
    // the assessment side. It is not a variant of `ExportKind` at all, so it can
    // only arrive on the wire — and it refuses there, naming the export.
    let mut with_assessment_export: Value = serde_json::from_slice(&admissible).expect("it parses");
    with_assessment_export["correspondences"][0]["exports"][0]["kind"] = json!("population");
    let third = StaticProducerBundle::admit_json(
        &serde_json::to_vec(&with_assessment_export).expect("it serializes"),
    )
    .expect_err("an assessment-kind correspondence export refuses");
    assert_eq!(third.code, ASSESSMENT_INPUT_IN_STATIC_BUNDLE);
    assert!(third.message.contains(COMPONENT) && third.message.contains("population"));
    assert!(!ExportKind::EMITTED
        .iter()
        .any(|kind| kind.as_str() == "population"));

    println!("TC-1434 measured: 3 assessment offers — 1 member, 1 document, 1 export kind — each refused {ASSESSMENT_INPUT_IN_STATIC_BUNDLE} naming what was offered, and 0 retained");
}

/// Tracing: TC-1435
#[test]
fn tc_1435_a_refused_admission_yields_no_value_of_the_admitted_type() {
    // The `Compile` half is the three `compile_fail` doctests on
    // `src/static_bundle.rs`: a struct literal of the admitted type, a read of a
    // would-be public member, and the `Deserialize` bound `from_slice` requires.
    // Each has a compiling twin against `StaticProducerBundle`.
    let mut broken = bundle();
    broken.bundle_identity = None;
    let outcome: Result<AdmittedStaticBundle, _> = resealed(broken).admit();
    assert!(outcome.is_err(), "a refused admission returns Err");
    assert_eq!(
        outcome.expect_err("refused").code,
        IDENTITY_ABSENT,
        "and names the absent member"
    );

    // There is also no deserialization path into the admitted type at run time:
    // the admitted bundle's own emitted document goes back in only through
    // admission.
    let admitted = bundle().admit().expect("the bundle is admitted");
    let emitted = serde_json::to_vec(&admitted).expect("it serializes");
    let readmitted = StaticProducerBundle::admit_json(&emitted)
        .expect("the emitted document is admissible again, through admission");
    assert_eq!(readmitted.key(), admitted.key());

    println!("TC-1435 measured: 1 refused admission yielding 0 values of the admitted type, 3 compile_fail controls with 3 compiling twins, and 1 round trip that goes back in only through the admission operation");
}

/// Tracing: TC-1436
#[test]
fn tc_1436_an_admission_reads_no_ambient_input() {
    let first = bundle().admit().expect("the bundle is admitted");

    // Altered environment, altered working directory: the admitted bundle is
    // identical, byte for byte.
    let restore = std::env::current_dir().expect("a working directory");
    std::env::set_var("FILAMENT_PRODUCER_PROBE", "altered");
    std::env::set_var("LC_ALL", "tr_TR.UTF-8");
    std::env::set_var("TZ", "Pacific/Kiritimati");
    std::env::set_current_dir(std::env::temp_dir()).expect("the temporary directory exists");
    let second = bundle().admit().expect("the bundle is admitted again");
    std::env::set_current_dir(&restore).expect("the working directory is restored");
    std::env::remove_var("FILAMENT_PRODUCER_PROBE");

    assert_eq!(
        serde_json::to_vec(&first).expect("it serializes"),
        serde_json::to_vec(&second).expect("it serializes"),
        "an altered environment and working directory produce the identical admitted bundle"
    );
    assert_eq!(first.key(), second.key());

    // The static half of the audit over the admission call graph. NFR-036-M-7
    // carries no exemption list, so one admitted read fails this row; the full
    // instrumented offline run and the unprivileged network namespace are
    // Task-150's apparatus.
    let mut sites = Vec::new();
    let mut lines = 0;
    for (path, source) in ADMISSION_POPULATION {
        lines += source.lines().count();
        for (index, line) in source.lines().enumerate() {
            if line.trim_start().starts_with("//") {
                continue;
            }
            for token in AMBIENT_TOKENS {
                if line.contains(token) {
                    sites.push(format!("{path}:{} {token}", index + 1));
                }
            }
        }
    }
    assert!(
        sites.is_empty(),
        "the admission call graph reached {} ambient read(s): {sites:#?}",
        sites.len()
    );

    println!(
        "TC-1436 measured: 2 admissions under 3 altered environment variables and 1 altered working directory producing 1 identical admitted bundle, and {} files / {lines} lines of the admission call graph carrying {} of the {} prohibited ambient tokens",
        ADMISSION_POPULATION.len(),
        sites.len(),
        AMBIENT_TOKENS.len()
    );
}

/// Tracing: TC-1438
#[test]
fn tc_1438_a_static_admission_completes_from_static_inputs_alone() {
    // The bundle carries no population, snapshot, window, instance, observation,
    // progress record or observation closure, and admission completes from the
    // static members of the configuration document and the inventory declaration.
    let offered = bundle();
    assert!(offered.configuration.is_some() && offered.inventory.is_some());
    let admitted = offered.admit().expect("a static admission completes");
    let emitted = serde_json::to_value(&admitted).expect("it serializes");
    let mut every = BTreeSet::new();
    keys(&emitted, &mut every);
    for assessment in ASSESSMENT_MEMBER_NAMES {
        assert!(!every.contains(assessment));
    }

    // The configuration's static prerequisite closure and FR-116's native
    // definition closure are distinct members carrying distinct refusals.
    let mut no_static_closure = bundle();
    no_static_closure.static_closure = None;
    let first = resealed(no_static_closure)
        .admit()
        .expect_err("an absent static prerequisite closure refuses");
    assert_eq!(first.code, STATIC_CLOSURE_ABSENT);

    let mut incomplete_native = bundle();
    incomplete_native.correspondences[0]
        .native_definition_closure
        .clear();
    let second = resealed(incomplete_native)
        .admit()
        .expect_err("an incomplete native definition closure refuses");
    assert_eq!(second.code, CORRESPONDENCE_CLOSURE_INCOMPLETE);
    assert_ne!(first.code, second.code, "two closures, two refusals");

    println!("TC-1438 measured: 1 admission from the configuration document and the inventory declaration alone, reaching 0 population obligations, and 2 distinct closure refusals over 2 distinct members");
}

/// Tracing: TC-1439
#[test]
fn tc_1439_the_admitted_bundle_key_is_identity_revision_and_digest_together() {
    let mut registry = AdmissionRegistry::new();
    let first = registry
        .admit(bundle())
        .expect("the first bundle is admitted");
    let key = first.key().clone();
    assert_eq!(key.bundle_identity, BUNDLE);
    assert_eq!(key.bundle_revision, *first.bundle_revision());
    assert_eq!(key.digest, *first.digest());

    // One identity and one revision under two different canonical digest
    // selections is an identity collision, naming both selections.
    let mut different_bytes = bundle();
    different_bytes.components[0].role_identities =
        BTreeSet::from(["ix://agent-ix/commerce/role/orders-2".to_owned()]);
    let collision = resealed(different_bytes.clone());
    let collision_digest = collision.digest.clone().expect("it is sealed");
    let refusal = registry
        .admit(collision)
        .expect_err("one identity and revision under two digests refuses");
    assert_eq!(refusal.code, BUNDLE_IDENTITY_COLLISION);
    assert!(
        refusal.message.contains(&key.digest.value)
            && refusal.message.contains(&collision_digest.value),
        "both canonical digest selections are named: {}",
        refusal.message
    );

    // A re-admission of one bundle identity over different bytes is a different
    // admitted bundle under a different key, and a binding naming the earlier one
    // refuses as stale naming both selections rather than resolving forward.
    let mut readmitted = different_bytes;
    readmitted.bundle_revision = Some(Revision::producer("2026-09-11-2"));
    let readmitted = registry
        .admit(resealed(readmitted))
        .expect("a re-admission over different bytes is a different admitted bundle");
    assert_ne!(readmitted.key(), &key);
    let stale = registry
        .resolve_binding(&key)
        .expect_err("a binding naming the earlier admitted bundle is stale");
    assert_eq!(stale.code, BUNDLE_BINDING_STALE);
    assert!(
        stale.message.contains(&key.digest.value)
            && stale.message.contains(&readmitted.digest().value),
        "both canonical digest selections are named: {}",
        stale.message
    );
    registry
        .resolve_binding(readmitted.key())
        .expect("the current admitted bundle resolves");

    // The header identity, revision and digest stay distinct members from the
    // model's and the profile's even when their spellings coincide.
    let mut coinciding = bundle();
    coinciding.model = Some(ModelSelection {
        model_identity: BUNDLE.into(),
        model_revision: Revision::producer("2026-09-11-1"),
        digest: model().digest,
    });
    coinciding.static_closure = Some(StaticClosure {
        model_identity: BUNDLE.into(),
        ..static_closure()
    });
    coinciding.correspondences[0].producer.identity = BUNDLE.into();
    for export in &mut coinciding.correspondences[0].exports {
        export.producer_object_identity = BUNDLE.into();
    }
    coinciding.relationships[0].ownership = Some(RelationshipOwnership {
        model_identity: BUNDLE.into(),
        profile_identity: PROFILE.into(),
        configuration_identity: CONFIGURATION.into(),
    });
    let admitted = resealed(coinciding)
        .admit()
        .expect("coinciding spellings are admitted as distinct members");
    assert_eq!(admitted.bundle_identity(), admitted.model().model_identity);
    assert_eq!(admitted.bundle_revision(), &admitted.model().model_revision);
    assert_ne!(admitted.digest(), &admitted.model().digest);
    let emitted = serde_json::to_value(&admitted).expect("it serializes");
    assert_eq!(emitted["bundleIdentity"], emitted["model"]["modelIdentity"]);
    assert_ne!(emitted["digest"], emitted["model"]["digest"]);

    println!("TC-1439 measured: 1 admitted-bundle key of identity + revision + digest, 1 identity collision naming 2 digest selections, 1 re-admission under a second key with 1 stale binding naming 2 selections, and 1 coinciding-spelling bundle whose header members stay distinct from the model's");
}
