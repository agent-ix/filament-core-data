// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Agent-IX

//! The one sanctioned writer of Plan-017 Task-149's committed wire evidence.
//!
//! It writes `fixtures/baseline-1-2/static-bundle-a.json`, the eight one-axis
//! adverse mutations of it under `fixtures/baseline-1-2/adverse/`, the declared
//! digested-document set, the declared insertion-order permutation set, and one
//! golden canonical byte string per digested document under
//! `fixtures/baseline-1-2/golden/`.
//!
//! It is `#[ignore]`d, so no gate runs it and **no test rewrites a golden**
//! (Plan-017 coordination rule: "goldens are cut once, in Task-149"). Run it
//! explicitly, and only when the fixture itself is meant to change:
//!
//! ```text
//! cargo test --offline -p agent-ix-baseline-producer --test golden_writer -- --ignored
//! ```
//!
//! The bundle below is authored through the typed API and sealed by
//! `StaticProducerBundle::canonical_digest_selection`, so the committed fixture is
//! the wire form of a bundle the admission entry point admits rather than
//! hand-written JSON that happens to parse.

use std::collections::{BTreeMap, BTreeSet};
use std::path::Path;

use agent_ix_baseline_producer::{
    document_digest, ArtifactKind, ArtifactReference, CanonicalPolicy, ComponentDeclaration,
    ConfigurationDocument, DeclarationSource, DigestDomainSelection, DigestSelection,
    EndpointDeclaration, ExportKind, ExportRecord, FormalDocument, InventoryCompleteness,
    InventoryDeclaration, InventoryMembership, ModelSelection, Multiplicity,
    NativeArtifactReference, NativeSourceLabel, NumericResourceLimit, ProducerNativeCorrespondence,
    ProducerObjectReference, ProfileSelection, RawByteDigest, RelationshipDeclaration,
    RelationshipDirection, RelationshipEndpoint, RelationshipOwnership, RelationshipSemantics,
    ResourceLimits, Revision, SourceLocus, Span, StaticClosure, StaticProducerBundle,
    WireReference, ADMISSIBLE_REVISION_NAMESPACES, INTERFACE_VERSION,
};
use serde_json::{json, Value};

mod static_fixture;

use static_fixture::{
    array_declarations, digest_input_bytes, fixture_path, permuted_text, DeclaredPermutation,
};

const BUNDLE: &str = "ix://agent-ix/commerce/bundle/orders-static-a";
const CONFIGURATION: &str = "ix://agent-ix/commerce/config/evaluation-default";
const MODEL: &str = "ix://agent-ix/commerce/model/order-1-2";
const PROFILE: &str = "ix://agent-ix/quire/profile/order-assessment-1-2";
const INVENTORY: &str = "ix://agent-ix/commerce/inventory/orders-2026-09-11";
const AUTHORITY: &str = "ix://agent-ix/commerce/model-authority/primary";

/// The declaration source documents the static closure supplies.
const ORDER_SOURCE: &str = "ix://agent-ix/commerce/source/order-declarations";
const SHIPMENT_SOURCE: &str = "ix://agent-ix/commerce/source/shipment-declarations";

/// The display-name collision quartet TC-1613 reads: one display name `orders`
/// carried by a repository, a component, a role and an endpoint, which stay four
/// distinct identities (FR-114-CON-1, EC-170).
const REPOSITORY_ORDERS: &str = "ix://agent-ix/commerce/repository/orders";
const COMPONENT_ORDERS: &str = "ix://agent-ix/commerce/component/orders";
const ROLE_ORDERS: &str = "ix://agent-ix/commerce/role/orders";
const ENDPOINT_ORDERS: &str = "ix://agent-ix/commerce/endpoint/orders";

const COMPONENT_SHIPMENTS: &str = "ix://agent-ix/commerce/component/shipments";
const REPOSITORY_SHIPMENTS: &str = "ix://agent-ix/commerce/repository/shipments";
const ROLE_SHIPMENTS: &str = "ix://agent-ix/commerce/role/shipments";

const ENDPOINT_SHIPMENT_SOURCE: &str = "ix://agent-ix/commerce/endpoint/Order-shipment-source";
const ENDPOINT_SHIPMENT_TARGET: &str = "ix://agent-ix/commerce/endpoint/Order-shipment-target";
const ENDPOINT_SUCCESSOR_SOURCE: &str = "ix://agent-ix/commerce/endpoint/Order-successor-source";
const ENDPOINT_SUCCESSOR_TARGET: &str = "ix://agent-ix/commerce/endpoint/Order-successor-target";

const RELATIONSHIP_SHIPMENT: &str = "ix://agent-ix/commerce/relationship/Order-shipment";
const RELATIONSHIP_SUCCESSOR: &str = "ix://agent-ix/commerce/relationship/Order-successor";

const TYPE_ORDER: &str = "ix://agent-ix/commerce/type/Order";
const TYPE_SHIPMENT: &str = "ix://agent-ix/commerce/type/Shipment";

const RELATION_MODEL: &str = "ix://agent-ix/commerce/binding/order-model-to-quire-artifact";
const RELATION_PROFILE: &str = "ix://agent-ix/commerce/binding/order-profile-to-quire-artifact";
const NATIVE_MODEL: &str = "ix://agent-ix/quire/artifact/order-assessment-1-2";
const NATIVE_PROFILE: &str = "ix://agent-ix/quire/artifact/order-profile-1-2";
const DEFINITION_CORE: &str = "ix://agent-ix/quire/definition/core-assessment-1-2";
const DEFINITION_ORDER: &str = "ix://agent-ix/quire/definition/order-assessment-1-2";

const REVISION: &str = "2026-09-11-1";

/// A raw-byte digest of bytes this producer does not hold: the native artifact's
/// own bytes and the declaration source document's own bytes are external, so
/// their digests are authored values rather than values recomputed here.
fn raw(nibble: char) -> String {
    format!("sha256:{}", nibble.to_string().repeat(64))
}

fn configuration() -> ConfigurationDocument {
    let mut configuration = ConfigurationDocument {
        configuration_identity: CONFIGURATION.into(),
        baseline_version: "1.2.0".into(),
        digest: DigestSelection::canonical(raw('0')),
        model_authority: AUTHORITY.into(),
        profile_identities: BTreeSet::from([PROFILE.to_owned()]),
        adapter_identities: BTreeSet::from(["ix://agent-ix/commerce/adapter/orders".to_owned()]),
        mapping_targets: BTreeSet::from([PROFILE.to_owned()]),
        loss_policy: "ix://agent-ix/commerce/loss-policy/refuse".into(),
        resource_limits: ResourceLimits {
            numeric_resource_limit: Some(NumericResourceLimit::new(4096, 6144)),
            // The second bound is one authored exact decimal past binary64's
            // exact integer range (2^53 + 1). It is carried so the fixture
            // exercises Task-143's parse seam: without `arbitrary_precision` the
            // lexeme reaching the canonicalizer would be 9007199254740992 and
            // the committed golden would not reproduce.
            declared_bounds: BTreeMap::from([
                ("maximumStaticBundleBytes".to_owned(), 1_048_576_u64),
                (
                    "maximumExactDecimalCoefficient".to_owned(),
                    9_007_199_254_740_993_u64,
                ),
            ]),
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
        .expect("the configuration document digests");
    configuration
}

fn source_reference(identity: &str, nibble: char) -> ArtifactReference {
    ArtifactReference {
        ref_version: "3".into(),
        kind: ArtifactKind::Source,
        authority: AUTHORITY.into(),
        identity: identity.into(),
        revision: Revision::producer(REVISION),
        digest: RawByteDigest::new(raw(nibble)).expect("a raw-byte digest string is admitted"),
        wire: WireReference {
            identity: "filament-core-data/producer-bundle".into(),
            version: "1.2.0".into(),
        },
    }
}

fn formal(document: &str) -> FormalDocument {
    FormalDocument {
        document: document.into(),
        revision: Revision::producer(REVISION),
    }
}

fn locus(source: &str, nibble: char, formal_document: &str, start: u32, end: u32) -> SourceLocus {
    SourceLocus {
        source: source_reference(source, nibble),
        formal: formal(formal_document),
        span: Span { start, end },
    }
}

fn order_locus(start: u32, end: u32) -> SourceLocus {
    locus(
        ORDER_SOURCE,
        'd',
        "ix://agent-ix/commerce/formal/order-declarations",
        start,
        end,
    )
}

fn shipment_locus(start: u32, end: u32) -> SourceLocus {
    locus(
        SHIPMENT_SOURCE,
        'e',
        "ix://agent-ix/commerce/formal/shipment-declarations",
        start,
        end,
    )
}

fn membership() -> InventoryMembership {
    InventoryMembership::new(INVENTORY, InventoryCompleteness::Complete)
}

/// Seals one record's own canonical digest selection over its own canonical
/// bytes, with its `digest` member excluded (FR-118-CON-4).
fn seal<T: serde::Serialize>(record: &T, policy: &CanonicalPolicy) -> DigestSelection {
    document_digest(record, policy).expect("a record digests")
}

fn component(
    identity: &str,
    repository: &str,
    role: &str,
    owning_type: &str,
    locus: SourceLocus,
    policy: &CanonicalPolicy,
) -> ComponentDeclaration {
    let mut component = ComponentDeclaration {
        component_identity: identity.into(),
        component_revision: Revision::producer(REVISION),
        digest: DigestSelection::canonical(raw('0')),
        repository_identity: repository.into(),
        repository_revision: Revision::producer(REVISION),
        role_identities: BTreeSet::from([role.to_owned()]),
        owning_type_identity: owning_type.into(),
        source_locus: Some(locus),
        inventory_membership: membership(),
    };
    component.digest = seal(&component, policy);
    component
}

#[allow(clippy::too_many_arguments)]
fn endpoint(
    identity: &str,
    component_identity: &str,
    type_identity: &str,
    role: &str,
    multiplicity: Multiplicity,
    locus: SourceLocus,
    policy: &CanonicalPolicy,
) -> EndpointDeclaration {
    let mut endpoint = EndpointDeclaration {
        endpoint_identity: identity.into(),
        endpoint_revision: Revision::producer(REVISION),
        digest: DigestSelection::canonical(raw('0')),
        component_identity: component_identity.into(),
        type_identity: type_identity.into(),
        role: role.into(),
        multiplicity: Some(multiplicity),
        source_locus: Some(locus),
        inventory_membership: membership(),
    };
    endpoint.digest = seal(&endpoint, policy);
    endpoint
}

fn multiplicity(lower: u32, upper: Option<u32>, ordered: bool, unique: bool) -> Multiplicity {
    Multiplicity {
        lower,
        upper,
        ordered,
        unique,
    }
}

#[allow(clippy::too_many_arguments)]
fn relationship(
    identity: &str,
    name: &str,
    source: RelationshipEndpoint,
    target: RelationshipEndpoint,
    semantics: RelationshipSemantics,
    policy: &CanonicalPolicy,
) -> RelationshipDeclaration {
    let mut relationship = RelationshipDeclaration {
        relationship_identity: identity.into(),
        relationship_name: name.into(),
        relationship_revision: Some(Revision::producer(REVISION)),
        digest: None,
        source,
        target,
        semantics,
        ownership: Some(RelationshipOwnership {
            model_identity: MODEL.into(),
            profile_identity: PROFILE.into(),
            configuration_identity: CONFIGURATION.into(),
        }),
        inventory_membership: Some(membership()),
    };
    relationship.digest = Some(seal(&relationship, policy));
    relationship
}

fn relationship_endpoint(
    endpoint_identity: &str,
    type_identity: &str,
    role: &str,
    multiplicity: Multiplicity,
) -> RelationshipEndpoint {
    RelationshipEndpoint {
        endpoint_identity: endpoint_identity.into(),
        type_identity: type_identity.into(),
        role: role.into(),
        multiplicity: Some(multiplicity),
    }
}

fn export(
    kind: ExportKind,
    producer_object: &str,
    export_identity: &str,
    path: &[&str],
    locus: SourceLocus,
) -> ExportRecord {
    ExportRecord {
        kind,
        producer_object_identity: producer_object.into(),
        export_identity: export_identity.into(),
        export_path: path.iter().map(|segment| (*segment).to_owned()).collect(),
        locus: Some(locus),
    }
}

/// The complete static selection this fixture carries.
fn bundle() -> StaticProducerBundle {
    let configuration = configuration();
    let policy = CanonicalPolicy::from_configuration(&configuration)
        .expect("the configuration declares its numeric resource limit");

    let mut model = ModelSelection {
        model_identity: MODEL.into(),
        model_revision: Revision::producer("1.2.0"),
        digest: DigestSelection::canonical(raw('0')),
    };
    model.digest = seal(&model, &policy);
    let mut profile = ProfileSelection {
        profile_identity: PROFILE.into(),
        profile_revision: Revision::producer("1.2.0"),
        digest: DigestSelection::canonical(raw('0')),
    };
    profile.digest = seal(&profile, &policy);

    let components = vec![
        component(
            COMPONENT_ORDERS,
            REPOSITORY_ORDERS,
            ROLE_ORDERS,
            TYPE_ORDER,
            order_locus(64, 192),
            &policy,
        ),
        component(
            COMPONENT_SHIPMENTS,
            REPOSITORY_SHIPMENTS,
            ROLE_SHIPMENTS,
            TYPE_SHIPMENT,
            shipment_locus(32, 160),
            &policy,
        ),
    ];

    let endpoints = vec![
        endpoint(
            ENDPOINT_ORDERS,
            COMPONENT_ORDERS,
            TYPE_ORDER,
            "orders",
            multiplicity(0, None, false, true),
            order_locus(192, 240),
            &policy,
        ),
        endpoint(
            ENDPOINT_SHIPMENT_SOURCE,
            COMPONENT_ORDERS,
            TYPE_ORDER,
            "order",
            multiplicity(0, Some(1), false, true),
            order_locus(240, 320),
            &policy,
        ),
        endpoint(
            ENDPOINT_SHIPMENT_TARGET,
            COMPONENT_SHIPMENTS,
            TYPE_SHIPMENT,
            "shipment",
            multiplicity(1, Some(1), false, true),
            shipment_locus(160, 240),
            &policy,
        ),
        // Two distinct endpoint identities over one type identity: the
        // self-relationship's two sides stay independent records (FR-115-CON-3).
        endpoint(
            ENDPOINT_SUCCESSOR_SOURCE,
            COMPONENT_ORDERS,
            TYPE_ORDER,
            "predecessor",
            multiplicity(0, Some(1), false, true),
            order_locus(320, 400),
            &policy,
        ),
        endpoint(
            ENDPOINT_SUCCESSOR_TARGET,
            COMPONENT_ORDERS,
            TYPE_ORDER,
            "successor",
            multiplicity(0, None, true, true),
            order_locus(400, 480),
            &policy,
        ),
    ];

    let relationships = vec![
        relationship(
            RELATIONSHIP_SHIPMENT,
            "shipment",
            relationship_endpoint(
                ENDPOINT_SHIPMENT_SOURCE,
                TYPE_ORDER,
                "order",
                multiplicity(0, Some(1), false, true),
            ),
            relationship_endpoint(
                ENDPOINT_SHIPMENT_TARGET,
                TYPE_SHIPMENT,
                "shipment",
                multiplicity(1, Some(1), false, true),
            ),
            RelationshipSemantics {
                category: "structural".into(),
                direction: RelationshipDirection::SourceToTarget,
                composite: true,
                lifecycle: "order-owned".into(),
                ownership: "order".into(),
            },
            &policy,
        ),
        relationship(
            RELATIONSHIP_SUCCESSOR,
            "successor",
            relationship_endpoint(
                ENDPOINT_SUCCESSOR_SOURCE,
                TYPE_ORDER,
                "predecessor",
                multiplicity(0, Some(1), false, true),
            ),
            relationship_endpoint(
                ENDPOINT_SUCCESSOR_TARGET,
                TYPE_ORDER,
                "successor",
                multiplicity(0, None, true, true),
            ),
            RelationshipSemantics {
                category: "associative".into(),
                direction: RelationshipDirection::SourceToTarget,
                composite: false,
                lifecycle: "order-independent".into(),
                ownership: "none".into(),
            },
            &policy,
        ),
    ];

    let inventory = InventoryDeclaration {
        inventory_identity: INVENTORY.into(),
        completeness: InventoryCompleteness::Complete,
        component_identities: components
            .iter()
            .map(|component| component.component_identity.clone())
            .collect(),
        endpoint_identities: endpoints
            .iter()
            .map(|endpoint| endpoint.endpoint_identity.clone())
            .collect(),
        relationship_identities: relationships
            .iter()
            .map(|relationship| relationship.relationship_identity.clone())
            .collect(),
    };

    let static_closure = StaticClosure {
        configuration_identity: CONFIGURATION.into(),
        configuration_digest: configuration.digest.clone(),
        model_identity: MODEL.into(),
        model_digest: model.digest.clone(),
        profile_identity: PROFILE.into(),
        profile_digest: profile.digest.clone(),
        declaration_sources: vec![
            DeclarationSource {
                source: source_reference(ORDER_SOURCE, 'd'),
                native: NativeSourceLabel::new(
                    "ix://agent-ix/quire/source/order-declarations",
                    "editable-draft-7",
                ),
                path: "models/orders.tsp".into(),
                formal: formal("ix://agent-ix/commerce/formal/order-declarations"),
            },
            DeclarationSource {
                source: source_reference(SHIPMENT_SOURCE, 'e'),
                native: NativeSourceLabel::new(
                    "ix://agent-ix/quire/source/shipment-declarations",
                    "editable-draft-3",
                ),
                path: "models/shipments.tsp".into(),
                formal: formal("ix://agent-ix/commerce/formal/shipment-declarations"),
            },
        ],
    };

    // Two correspondence records over two distinct selected pairs. The model's
    // record exports both components, all five endpoints and one relationship;
    // the profile's record exports the other relationship. Every declared record
    // is owed exactly one export mapping, and the two records together cover the
    // `component`, `endpoint` and `relationship` export kinds.
    let correspondences = vec![
        ProducerNativeCorrespondence {
            binding_relation_identity: RELATION_MODEL.into(),
            producer: ProducerObjectReference {
                object_kind: "model".into(),
                authority: AUTHORITY.into(),
                identity: MODEL.into(),
                revision: Revision::producer("1.2.0"),
                digest: model.digest.clone(),
            },
            native: NativeArtifactReference {
                identity: NATIVE_MODEL.into(),
                revision: Revision::native("1.2.0"),
                raw_byte_digest: DigestSelection::native_bytes(raw('5')),
            },
            native_definition_closure: vec![
                NativeArtifactReference {
                    identity: DEFINITION_CORE.into(),
                    revision: Revision::native("1.2.0"),
                    raw_byte_digest: DigestSelection::native_bytes(raw('6')),
                },
                NativeArtifactReference {
                    identity: DEFINITION_ORDER.into(),
                    revision: Revision::native("1.2.0"),
                    raw_byte_digest: DigestSelection::native_bytes(raw('7')),
                },
            ],
            required_native_definition_identities: BTreeSet::from([
                DEFINITION_CORE.to_owned(),
                DEFINITION_ORDER.to_owned(),
            ]),
            configuration_identity: Some(CONFIGURATION.into()),
            exports: vec![
                export(
                    ExportKind::Component,
                    MODEL,
                    COMPONENT_ORDERS,
                    &["orders", "component"],
                    order_locus(64, 192),
                ),
                export(
                    ExportKind::Component,
                    MODEL,
                    COMPONENT_SHIPMENTS,
                    &["shipments", "component"],
                    shipment_locus(32, 160),
                ),
                export(
                    ExportKind::Endpoint,
                    MODEL,
                    ENDPOINT_ORDERS,
                    &["orders", "endpoint"],
                    order_locus(192, 240),
                ),
                export(
                    ExportKind::Endpoint,
                    MODEL,
                    ENDPOINT_SHIPMENT_SOURCE,
                    &["orders", "Order", "shipment", "source"],
                    order_locus(240, 320),
                ),
                export(
                    ExportKind::Endpoint,
                    MODEL,
                    ENDPOINT_SHIPMENT_TARGET,
                    &["shipments", "Shipment", "shipment", "target"],
                    shipment_locus(160, 240),
                ),
                export(
                    ExportKind::Endpoint,
                    MODEL,
                    ENDPOINT_SUCCESSOR_SOURCE,
                    &["orders", "Order", "successor", "source"],
                    order_locus(320, 400),
                ),
                export(
                    ExportKind::Endpoint,
                    MODEL,
                    ENDPOINT_SUCCESSOR_TARGET,
                    &["orders", "Order", "successor", "target"],
                    order_locus(400, 480),
                ),
                export(
                    ExportKind::Relationship,
                    MODEL,
                    RELATIONSHIP_SHIPMENT,
                    &["orders", "Order", "shipment"],
                    order_locus(240, 320),
                ),
                export(
                    ExportKind::Object,
                    MODEL,
                    TYPE_ORDER,
                    &["orders", "Order"],
                    order_locus(64, 192),
                ),
                export(
                    ExportKind::Record,
                    MODEL,
                    TYPE_SHIPMENT,
                    &["shipments", "Shipment"],
                    shipment_locus(32, 160),
                ),
            ],
        },
        ProducerNativeCorrespondence {
            binding_relation_identity: RELATION_PROFILE.into(),
            producer: ProducerObjectReference {
                object_kind: "profile".into(),
                authority: AUTHORITY.into(),
                identity: PROFILE.into(),
                revision: Revision::producer("1.2.0"),
                digest: profile.digest.clone(),
            },
            native: NativeArtifactReference {
                identity: NATIVE_PROFILE.into(),
                revision: Revision::native("1.2.0"),
                raw_byte_digest: DigestSelection::native_bytes(raw('8')),
            },
            native_definition_closure: vec![NativeArtifactReference {
                identity: DEFINITION_CORE.into(),
                revision: Revision::native("1.2.0"),
                raw_byte_digest: DigestSelection::native_bytes(raw('6')),
            }],
            required_native_definition_identities: BTreeSet::from([DEFINITION_CORE.to_owned()]),
            configuration_identity: Some(CONFIGURATION.into()),
            exports: vec![export(
                ExportKind::Relationship,
                PROFILE,
                RELATIONSHIP_SUCCESSOR,
                &["orders", "Order", "successor"],
                order_locus(320, 400),
            )],
        },
    ];

    let mut bundle = StaticProducerBundle {
        bundle_identity: Some(BUNDLE.into()),
        bundle_revision: Some(Revision::producer(REVISION)),
        digest: None,
        interface_version: Some(INTERFACE_VERSION.into()),
        model: Some(model),
        profile: Some(profile),
        components,
        endpoints,
        relationships,
        inventory: Some(inventory),
        configuration: Some(configuration),
        static_closure: Some(static_closure),
        correspondences,
    };
    bundle.digest = Some(
        bundle
            .canonical_digest_selection()
            .expect("the bundle's own canonical digest computes"),
    );
    bundle
}

/// The declared digested-document set of the admitted bundle.
///
/// One entry per document NFR-036's Scope names — the bundle itself, its model,
/// its profile, its components, its endpoints, its relationships, its
/// configuration document, its static prerequisite closure and its correspondence
/// records — each of which carries a canonical digest selection of its own.
fn declared_documents(bundle: &Value) -> Vec<(String, Vec<String>)> {
    let mut declared = vec![
        ("bundle".to_owned(), Vec::new()),
        ("model".to_owned(), vec!["model".to_owned()]),
        ("profile".to_owned(), vec!["profile".to_owned()]),
        ("configuration".to_owned(), vec!["configuration".to_owned()]),
        (
            "static-closure".to_owned(),
            vec!["staticClosure".to_owned()],
        ),
    ];
    for member in [
        "components",
        "endpoints",
        "relationships",
        "correspondences",
    ] {
        let count = bundle[member]
            .as_array()
            .expect("a content class is an array")
            .len();
        for index in 0..count {
            declared.push((
                format!("{member}-{index}"),
                vec![member.to_owned(), index.to_string()],
            ));
        }
    }
    declared
}

/// The declared insertion-order permutation set of TC-1651.
fn permutation_set() -> Vec<DeclaredPermutation> {
    [
        ("declared-order", "declared", "declared", 0),
        ("reversed-keys", "reverse", "declared", 0),
        ("reversed-set-members", "declared", "reverse", 0),
        ("reversed-keys-and-set-members", "reverse", "reverse", 0),
        ("rotated-keys-and-set-members", "rotate", "rotate", 0),
        ("seeded-shuffle-1", "seeded", "seeded", 1),
        ("seeded-shuffle-7", "seeded", "seeded", 7),
        ("seeded-shuffle-104729", "seeded", "seeded", 104_729),
    ]
    .into_iter()
    .map(|(name, key_order, set_order, seed)| DeclaredPermutation {
        name: name.to_owned(),
        key_order: key_order.to_owned(),
        set_order: set_order.to_owned(),
        seed,
    })
    .collect()
}

/// The eight one-axis adverse mutations, each named by its axis.
///
/// Each closure changes exactly the members its axis owns and nothing else. The
/// `resealed` flag is the second half of the one-axis contract: only the stale
/// correspondence axis re-seals the bundle's own derived `digest` header, because
/// that axis' refusal is raised after the self-digest comparison rather than
/// before it.
struct Axis {
    file: &'static str,
    resealed: bool,
    mutate: fn(&mut Value),
}

const AXES: [Axis; 8] = [
    Axis {
        file: "adverse/01-missing-identities.json",
        resealed: false,
        mutate: |document| {
            document
                .as_object_mut()
                .expect("a bundle document")
                .remove("bundleIdentity");
        },
    },
    Axis {
        file: "adverse/02-digest-domain-substituted.json",
        resealed: false,
        mutate: |document| {
            document["components"][0]["digest"]["domain"] = json!("quire-native-bytes-1");
        },
    },
    Axis {
        file: "adverse/03-revision-namespace-substituted.json",
        resealed: false,
        mutate: |document| {
            document["endpoints"][0]["endpointRevision"]["namespace"] =
                json!("quire-native/definition-revision-1");
        },
    },
    Axis {
        file: "adverse/04-export-foreign-cross-bound.json",
        resealed: false,
        mutate: |document| {
            document["correspondences"][1]["exports"][0]["producerObjectIdentity"] = json!(MODEL);
        },
    },
    Axis {
        file: "adverse/05-endpoint-role-multiplicity-lost.json",
        resealed: false,
        mutate: |document| {
            // The axis FR-115-AC-3 owns: a relationship endpoint record that
            // loses its multiplicity, which is refused rather than defaulted.
            document["relationships"][0]["target"]
                .as_object_mut()
                .expect("a relationship target endpoint record")
                .remove("multiplicity");
        },
    },
    Axis {
        file: "adverse/06-component-provenance-absent.json",
        resealed: false,
        mutate: |document| {
            document["components"][1]
                .as_object_mut()
                .expect("a component record")
                .remove("sourceLocus");
        },
    },
    Axis {
        file: "adverse/07-stale-correspondence-selection.json",
        resealed: true,
        mutate: |document| {
            document["correspondences"][0]["native"]["rawByteDigest"]["value"] =
                json!("sha256:9999999999999999999999999999999999999999999999999999999999999999");
        },
    },
    Axis {
        file: "adverse/08-inventory-incomplete.json",
        resealed: false,
        mutate: |document| {
            let listed = document["inventory"]["endpointIdentities"]
                .as_array_mut()
                .expect("the inventory lists its endpoints");
            listed.retain(|identity| identity != ENDPOINT_SUCCESSOR_TARGET);
        },
    },
];

fn write(name: &str, contents: &str) {
    let path = fixture_path(name);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).expect("the fixture directory exists");
    }
    std::fs::write(&path, contents).unwrap_or_else(|error| panic!("{name} is written: {error}"));
    println!("wrote {}", relative(&path));
}

fn relative(path: &Path) -> String {
    path.components()
        .skip_while(|component| component.as_os_str() != "fixtures")
        .map(|component| component.as_os_str().to_string_lossy().into_owned())
        .collect::<Vec<_>>()
        .join("/")
}

fn pretty(document: &Value) -> String {
    format!(
        "{}\n",
        serde_json::to_string_pretty(document).expect("a document pretty-prints")
    )
}

/// The one sanctioned writer path. Ignored: no gate runs it and no test rewrites
/// a golden.
#[test]
#[ignore = "the sanctioned Task-149 fixture, schema-input and golden writer; run explicitly"]
fn write_the_committed_static_bundle_evidence() {
    let bundle = bundle();
    let admitted = bundle
        .clone()
        .admit()
        .expect("the authored static selection is admitted");
    let wire = serde_json::to_value(&bundle).expect("the offer serializes");
    let admitted_wire = serde_json::to_value(&admitted).expect("the admitted bundle serializes");
    assert_eq!(
        wire, admitted_wire,
        "the committed fixture is the wire form of the admitted bundle"
    );

    write(static_fixture::GOOD_FIXTURE, &pretty(&wire));

    let policy = CanonicalPolicy::from_configuration(
        bundle
            .configuration
            .as_ref()
            .expect("the bundle carries its configuration"),
    )
    .expect("the configuration declares its numeric resource limit");

    // The declared digested-document set, and one golden per document.
    let documents = declared_documents(&admitted_wire);
    let declaration = json!({
        "declaredBy": "Plan-017 Task-149",
        "requirement": "NFR-036",
        "documents": documents
            .iter()
            .map(|(name, path)| json!({
                "name": name,
                "path": path,
                "golden": format!("golden/{name}.canonical-json.txt"),
            }))
            .collect::<Vec<_>>(),
    });
    write("golden/declared-documents.json", &pretty(&declaration));

    for (name, path) in &documents {
        let mut document = &admitted_wire;
        for segment in path {
            document = match segment.parse::<usize>() {
                Ok(index) => &document[index],
                Err(_) => &document[segment.as_str()],
            };
        }
        let bytes =
            digest_input_bytes(document, &policy).expect("a digested document canonicalizes");
        write(&format!("golden/{name}.canonical-json.txt"), &bytes);
    }

    let permutations = permutation_set();
    let permutation_declaration = json!({
        "declaredBy": "Plan-017 Task-149",
        "requirement": "NFR-036",
        "permutations": permutations
            .iter()
            .map(|permutation| json!({
                "name": permutation.name,
                "keyOrder": permutation.key_order,
                "setOrder": permutation.set_order,
                "seed": permutation.seed,
            }))
            .collect::<Vec<_>>(),
    });
    write(
        "golden/permutation-set.json",
        &pretty(&permutation_declaration),
    );

    // Every declared permutation must at least be a permutation of this fixture:
    // a declaration naming an order the writer cannot emit is a declaration
    // defect, caught here rather than in the gate that reads it.
    for permutation in &permutations {
        let text = permuted_text(&admitted_wire, permutation, &array_declarations());
        serde_json::from_str::<Value>(&text)
            .unwrap_or_else(|error| panic!("{} emits a JSON document: {error}", permutation.name));
    }

    for axis in &AXES {
        let mut mutated = wire.clone();
        (axis.mutate)(&mut mutated);
        assert_ne!(mutated, wire, "{} changes the document", axis.file);
        if axis.resealed {
            let mut offer: StaticProducerBundle =
                serde_json::from_value(mutated.clone()).expect("the mutation still deserializes");
            offer.digest = Some(
                offer
                    .canonical_digest_selection()
                    .expect("the mutated bundle's own digest recomputes"),
            );
            mutated = serde_json::to_value(&offer).expect("the resealed offer serializes");
        }
        write(axis.file, &pretty(&mutated));
    }

    println!(
        "Task-149 writer measured: 1 admitted fixture, {} adverse fixtures, {} declared digested documents with {} goldens, {} declared permutations",
        AXES.len(),
        documents.len(),
        documents.len(),
        permutations.len()
    );
}
