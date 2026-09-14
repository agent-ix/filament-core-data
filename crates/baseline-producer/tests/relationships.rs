// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Agent-IX

//! Traced FR-115 controls for the complete relationship record (Plan-017
//! Task-146). Every control reports the number it measured.

use std::collections::{BTreeMap, BTreeSet};

use agent_ix_baseline_producer::refusal::{
    ENDPOINT_MULTIPLICITY_ABSENT, ENDPOINT_ROLE_ABSENT, RELATIONSHIP_ENDPOINT_PROJECTION_LOSS,
    RELATIONSHIP_ENDPOINT_UNKNOWN, RELATIONSHIP_MEMBER_ABSENT, RELATIONSHIP_OWNERSHIP_ABSENT,
};
use agent_ix_baseline_producer::{
    ArtifactKind, ArtifactReference, ConfigurationDocument, DigestDomainSelection, DigestSelection,
    EndpointDeclaration, FormalDocument, InventoryCompleteness, InventoryDeclaration,
    InventoryMembership, Multiplicity, NumericResourceLimit, RawByteDigest,
    RelationshipDeclaration, RelationshipDirection, RelationshipEndpoint, RelationshipOwnership,
    RelationshipSemantics, RequestedEndpointProjection, ResourceLimits, Revision, SourceLocus,
    Span, WireReference, ADMISSIBLE_REVISION_NAMESPACES,
};
use serde_json::Value;

const SOURCE_DOCUMENT: &str = "ix://agent-ix/commerce/source/order-declarations";
const INVENTORY: &str = "ix://agent-ix/commerce/inventory/orders-2026-09-11";
const RELATIONSHIP: &str = "ix://agent-ix/commerce/relationship/Order-shipment";
const SOURCE_ENDPOINT: &str = "ix://agent-ix/commerce/endpoint/Order-shipment-source";
const TARGET_ENDPOINT: &str = "ix://agent-ix/commerce/endpoint/Order-shipment-target";
const SELF_TARGET_ENDPOINT: &str = "ix://agent-ix/commerce/endpoint/Order-successor-target";

fn configuration() -> ConfigurationDocument {
    ConfigurationDocument {
        configuration_identity: "ix://agent-ix/commerce/config/evaluation-default".into(),
        baseline_version: "1.2.0".into(),
        digest: DigestSelection::canonical(format!("sha256:{}", "0".repeat(64))),
        model_authority: "ix://agent-ix/commerce/model-authority/primary".into(),
        profile_identities: BTreeSet::new(),
        adapter_identities: BTreeSet::new(),
        mapping_targets: BTreeSet::new(),
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
        trusted_references: BTreeSet::new(),
    }
}

fn locus() -> SourceLocus {
    SourceLocus {
        source: ArtifactReference {
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
        },
        formal: FormalDocument {
            document: "ix://agent-ix/commerce/formal/order-declarations".into(),
            revision: Revision::producer("2026-09-11-1"),
        },
        span: Span {
            start: 64,
            end: 192,
        },
    }
}

fn declared_endpoint(identity: &str, type_identity: &str, role: &str) -> EndpointDeclaration {
    EndpointDeclaration {
        endpoint_identity: identity.into(),
        endpoint_revision: Revision::producer("2026-09-11-1"),
        digest: DigestSelection::canonical(format!("sha256:{}", "2".repeat(64))),
        component_identity: "ix://agent-ix/commerce/component/orders".into(),
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

fn declared_endpoints() -> Vec<EndpointDeclaration> {
    vec![
        declared_endpoint(
            SOURCE_ENDPOINT,
            "ix://agent-ix/commerce/type/Order",
            "order",
        ),
        declared_endpoint(
            TARGET_ENDPOINT,
            "ix://agent-ix/commerce/type/Shipment",
            "shipment",
        ),
    ]
}

fn inventory() -> InventoryDeclaration {
    InventoryDeclaration {
        inventory_identity: INVENTORY.into(),
        completeness: InventoryCompleteness::Complete,
        component_identities: BTreeSet::new(),
        endpoint_identities: BTreeSet::from([
            SOURCE_ENDPOINT.to_owned(),
            TARGET_ENDPOINT.to_owned(),
        ]),
        relationship_identities: BTreeSet::from([RELATIONSHIP.to_owned()]),
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
            endpoint_identity: SOURCE_ENDPOINT.into(),
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
            endpoint_identity: TARGET_ENDPOINT.into(),
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
            model_identity: "ix://agent-ix/commerce/model/order-1-2".into(),
            profile_identity: "ix://agent-ix/quire/profile/order-assessment-1-2".into(),
            configuration_identity: "ix://agent-ix/commerce/config/evaluation-default".into(),
        }),
        inventory_membership: Some(InventoryMembership::new(
            INVENTORY,
            InventoryCompleteness::Complete,
        )),
    }
}

/// Tracing: TC-1617
#[test]
fn tc_1617_a_relationship_record_carries_every_authored_member() {
    let endpoints = declared_endpoints();
    let index = EndpointDeclaration::index(&endpoints);
    let relationship = relationship();
    relationship
        .validate(&configuration(), &inventory(), &index)
        .expect("a complete relationship record is admitted");

    let wire = serde_json::to_value(&relationship).expect("it serializes");
    for member in [
        "relationshipIdentity",
        "relationshipName",
        "relationshipRevision",
        "digest",
        "source",
        "target",
        "semantics",
        "ownership",
        "inventoryMembership",
    ] {
        assert!(
            wire.get(member).is_some(),
            "{member} is a separate authored member"
        );
    }
    for member in [
        "category",
        "direction",
        "composite",
        "lifecycle",
        "ownership",
    ] {
        assert!(
            wire["semantics"].get(member).is_some(),
            "semantics.{member}"
        );
    }
    let ownership = relationship
        .ownership
        .as_ref()
        .expect("the triple is present");
    let triple = BTreeSet::from([
        &ownership.model_identity,
        &ownership.profile_identity,
        &ownership.configuration_identity,
    ]);
    assert_eq!(triple.len(), 3, "the ownership triple is three identities");

    println!(
        "TC-1617 measured: 1 relationship record over 9 authored members, 5 semantics members and an ownership triple of {} distinct identities",
        triple.len()
    );
}

/// Tracing: TC-1618
#[test]
fn tc_1618_the_two_endpoint_records_stay_independent_members() {
    // A self-relationship: two separately declared endpoint records naming one
    // type identity. The second endpoint declares that type itself rather than
    // the relationship side restating a type its endpoint does not carry, which
    // FR-127-CON-7 refuses.
    let mut endpoints = declared_endpoints();
    endpoints.push(declared_endpoint(
        SELF_TARGET_ENDPOINT,
        "ix://agent-ix/commerce/type/Order",
        "successor",
    ));
    let index = EndpointDeclaration::index(&endpoints);
    let mut relationship = relationship();
    // Both endpoints name one type identity; they stay independent records.
    relationship.target.type_identity = relationship.source.type_identity.clone();
    relationship.target.endpoint_identity = SELF_TARGET_ENDPOINT.into();
    relationship
        .validate(&configuration(), &inventory(), &index)
        .expect("independent endpoint records are admitted under one type identity");

    assert_eq!(
        relationship.source.type_identity,
        relationship.target.type_identity
    );
    assert_ne!(
        relationship.source.endpoint_identity,
        relationship.target.endpoint_identity
    );
    assert_ne!(relationship.source.role, relationship.target.role);
    assert_ne!(
        relationship.source.multiplicity,
        relationship.target.multiplicity
    );

    println!("TC-1618 measured: 2 endpoint records under 1 shared type identity retained 2 endpoint identities, 2 roles and 2 multiplicities");
}

/// Tracing: TC-1619
#[test]
fn tc_1619_a_self_relationship_emits_two_independent_endpoint_records() {
    let self_type = "ix://agent-ix/commerce/type/Order";
    let endpoints = vec![
        declared_endpoint(SOURCE_ENDPOINT, self_type, "predecessor"),
        declared_endpoint(TARGET_ENDPOINT, self_type, "successor"),
    ];
    let index = EndpointDeclaration::index(&endpoints);
    let mut relationship = relationship();
    relationship.source.type_identity = self_type.into();
    relationship.target.type_identity = self_type.into();
    relationship.source.role = "predecessor".into();
    relationship.target.role = "successor".into();
    relationship
        .validate(&configuration(), &inventory(), &index)
        .expect("a self-relationship is admitted");

    let wire = serde_json::to_value(&relationship).expect("it serializes");
    assert_ne!(wire["source"], wire["target"]);
    assert_eq!(
        wire["source"]["typeIdentity"],
        wire["target"]["typeIdentity"]
    );
    let identities = relationship.joined_endpoint_identities();
    assert_eq!(identities.len(), 2, "two endpoint identities are retained");

    println!(
        "TC-1619 measured: 1 self-relationship over 1 type identity emitted {} independent endpoint records with 2 roles and 2 multiplicities",
        identities.len()
    );
}

/// Tracing: TC-1620
#[test]
fn tc_1620_absent_roles_multiplicities_and_collapsed_projections_refuse() {
    let endpoints = declared_endpoints();
    let index = EndpointDeclaration::index(&endpoints);
    let configuration = configuration();
    let inventory = inventory();

    let mut no_role = relationship();
    no_role.source.role = String::new();
    let first = no_role
        .validate(&configuration, &inventory, &index)
        .expect_err("a source omitting its role refuses");
    assert_eq!(first.code, ENDPOINT_ROLE_ABSENT);
    assert!(first.message.contains(RELATIONSHIP));

    let mut no_multiplicity = relationship();
    no_multiplicity.target.multiplicity = None;
    let second = no_multiplicity
        .validate(&configuration, &inventory, &index)
        .expect_err("a target omitting its multiplicity refuses");
    assert_eq!(second.code, ENDPOINT_MULTIPLICITY_ABSENT);
    assert!(second.message.contains(RELATIONSHIP));

    let mut no_ownership = relationship();
    no_ownership.ownership = None;
    assert_eq!(
        no_ownership
            .validate(&configuration, &inventory, &index)
            .expect_err("an absent ownership triple refuses")
            .code,
        RELATIONSHIP_OWNERSHIP_ABSENT
    );
    let mut no_revision = relationship();
    no_revision.relationship_revision = None;
    assert_eq!(
        no_revision
            .validate(&configuration, &inventory, &index)
            .expect_err("an absent namespaced revision refuses")
            .code,
        RELATIONSHIP_MEMBER_ABSENT
    );

    // The requested projection collapses the two roles into one. It refuses with
    // a named loss record carrying the relationship identity and both authored
    // roles, and never guesses a value.
    let relationship = relationship();
    let loss = relationship
        .project_endpoints(&RequestedEndpointProjection {
            endpoint_identity: "ix://agent-ix/commerce/endpoint/Order-shipment".into(),
            role: "order".into(),
            multiplicity: relationship.source.multiplicity.clone(),
        })
        .expect_err("a collapsing projection refuses");
    assert_eq!(loss.refusal.code, RELATIONSHIP_ENDPOINT_PROJECTION_LOSS);
    assert_eq!(loss.relationship_identity, RELATIONSHIP);
    assert_eq!(loss.source_role, "order");
    assert_eq!(loss.target_role, "shipment");
    assert_eq!(loss.source_multiplicity, relationship.source.multiplicity);
    assert_eq!(loss.target_multiplicity, relationship.target.multiplicity);

    println!("TC-1620 measured: 4 blocking member refusals naming the relationship, and 1 refused projection emitting a named loss record carrying the relationship identity and both authored roles and multiplicities");
}

/// Tracing: TC-1621
#[test]
fn tc_1621_every_endpoint_join_goes_through_a_declared_endpoint_identity() {
    let endpoints = declared_endpoints();
    let index = EndpointDeclaration::index(&endpoints);
    let configuration = configuration();
    let inventory = inventory();

    let relationship = relationship();
    relationship
        .validate(&configuration, &inventory, &index)
        .expect("both endpoint records join declared endpoints");
    for identity in relationship.joined_endpoint_identities() {
        assert!(
            index.contains_key(identity),
            "{identity} resolves in the declared endpoint vocabulary"
        );
    }

    // A coinciding type identity, role, or display name resolves nothing: the
    // vocabulary is keyed by endpoint identity alone.
    let coincidence: Vec<&EndpointDeclaration> = endpoints
        .iter()
        .filter(|endpoint| endpoint.type_identity == relationship.source.type_identity)
        .collect();
    assert_eq!(coincidence.len(), 1);
    let mut unknown = relationship.clone();
    unknown.source.endpoint_identity = "ix://agent-ix/commerce/endpoint/not-declared".into();
    let refusal = unknown
        .validate(&configuration, &inventory, &index)
        .expect_err("a source endpointIdentity naming no declared endpoint refuses");
    assert_eq!(refusal.code, RELATIONSHIP_ENDPOINT_UNKNOWN);
    assert!(refusal.message.contains(RELATIONSHIP));
    assert!(
        refusal
            .message
            .contains("the bundle's declared endpoint records"),
        "the refusal names the vocabulary it resolved against: {}",
        refusal.message
    );

    println!(
        "TC-1621 measured: 2 endpoint joins resolved by identity against {} declared endpoints, and 1 unknown identity refused {RELATIONSHIP_ENDPOINT_UNKNOWN} naming the relationship and its vocabulary",
        index.len()
    );
}

/// Tracing: TC-1622
#[test]
fn tc_1622_a_relationship_identity_is_authored_and_names_no_population_member() {
    let endpoints = declared_endpoints();
    let index = EndpointDeclaration::index(&endpoints);
    let relationship = relationship();
    relationship
        .validate(&configuration(), &inventory(), &index)
        .expect("the record is admitted");

    // The identity is authored: no foreign key, field identity, or relationship
    // instance spelling appears in it, and no member of the record supplies it.
    let foreign_key = "orders.shipment_id";
    let field = "ix://agent-ix/commerce/field/Order-shipment";
    let instance = "ix://agent-ix/commerce/relationship-instance/order-1001-shipment-9001";
    for candidate in [foreign_key, field, instance] {
        assert_ne!(relationship.relationship_identity, candidate);
    }

    let wire = serde_json::to_value(&relationship).expect("it serializes");
    let mut keys = Vec::new();
    collect_keys(&wire, &mut keys);
    for prohibited in [
        "population",
        "populationIdentity",
        "relationshipInstance",
        "relationshipInstances",
        "members",
        "observationRecords",
    ] {
        assert!(
            !keys.iter().any(|key| key == prohibited),
            "a relationship record carries no {prohibited} member"
        );
    }

    println!(
        "TC-1622 measured: 3 reconstruction sources none of which supplies the authored relationship identity, and {} emitted member names of which 0 is a population member or a relationship instance",
        keys.len()
    );
}

fn collect_keys(value: &Value, keys: &mut Vec<String>) {
    match value {
        Value::Object(members) => {
            for (key, member) in members {
                keys.push(key.clone());
                collect_keys(member, keys);
            }
        }
        Value::Array(members) => {
            for member in members {
                collect_keys(member, keys);
            }
        }
        _ => {}
    }
}
