// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Agent-IX

//! Traced FR-114 controls for the component, endpoint, locus and inventory
//! declarations (Plan-017 Task-145). Every control reports the number it
//! measured.
//!
//! The locus rows measure the mapping onto the pinned consumer `ForeignLocus`,
//! `ArtifactRef`, `Formal` and `Span` records —
//! `ix://agent-ix/quire-spec-language`, `src/protocol_artifact/wire.rs`,
//! revision `72507f856457ba0922719bd5d9f5cadcce4058cd` — which this crate maps
//! onto member for member and never edits.

use ix_trace_rs::trace;
use std::collections::{BTreeMap, BTreeSet};

use agent_ix_baseline_producer::refusal::{
    COMPONENT_PROVENANCE_ABSENT, COMPONENT_PROVENANCE_UNSUPPLIED, FORMAL_REVISION_ABSENT,
    INVENTORY_INCOMPLETE_UNKNOWN, INVENTORY_MEMBER_UNLISTED, REVISION_NAMESPACE_SUBSTITUTED,
};
use agent_ix_baseline_producer::{
    ArtifactKind, ArtifactReference, ComponentDeclaration, ConfigurationDocument,
    DeclarationSource, DigestDomainSelection, DigestSelection, EndpointDeclaration, FormalDocument,
    InventoryCompleteness, InventoryDeclaration, InventoryMembership, Multiplicity,
    NativeSourceLabel, NumericResourceLimit, RawByteDigest, ResourceLimits, Revision, SourceLocus,
    Span, WireReference, ADMISSIBLE_REVISION_NAMESPACES,
};
use serde_json::Value;

const SOURCE_DOCUMENT: &str = "ix://agent-ix/commerce/source/order-declarations";
const INVENTORY: &str = "ix://agent-ix/commerce/inventory/orders-2026-09-11";

/// The members the pinned consumer `ForeignLocus` record declares.
const CONSUMER_FOREIGN_LOCUS_MEMBERS: [&str; 3] = ["formal", "source", "span"];
/// The seven members the pinned consumer `ArtifactRef` record declares.
const CONSUMER_ARTIFACT_REF_MEMBERS: [&str; 7] = [
    "authority",
    "digest",
    "identity",
    "kind",
    "refVersion",
    "revision",
    "wire",
];

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

fn locus() -> SourceLocus {
    SourceLocus {
        source: artifact_reference(),
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

fn declaration_sources() -> Vec<DeclarationSource> {
    vec![DeclarationSource {
        source: artifact_reference(),
        native: NativeSourceLabel::new(
            "ix://agent-ix/quire/source/order-declarations",
            "editable-draft-7",
        ),
        path: "models/orders.tsp".into(),
        formal: FormalDocument {
            document: "ix://agent-ix/commerce/formal/order-declarations".into(),
            revision: Revision::producer("2026-09-11-1"),
        },
    }]
}

fn component(identity: &str) -> ComponentDeclaration {
    ComponentDeclaration {
        component_identity: identity.into(),
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

fn endpoint(identity: &str) -> EndpointDeclaration {
    EndpointDeclaration {
        endpoint_identity: identity.into(),
        endpoint_revision: Revision::producer("2026-09-11-1"),
        digest: DigestSelection::canonical(format!("sha256:{}", "2".repeat(64))),
        component_identity: "ix://agent-ix/commerce/component/orders".into(),
        type_identity: "ix://agent-ix/commerce/type/Order".into(),
        role: "order".into(),
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

fn inventory(completeness: InventoryCompleteness) -> InventoryDeclaration {
    InventoryDeclaration {
        inventory_identity: INVENTORY.into(),
        completeness,
        component_identities: BTreeSet::from(
            ["ix://agent-ix/commerce/component/orders".to_owned()],
        ),
        endpoint_identities: BTreeSet::from([
            "ix://agent-ix/commerce/endpoint/orders-shipment-source".to_owned(),
        ]),
        relationship_identities: BTreeSet::new(),
    }
}

fn members(value: &impl serde::Serialize) -> BTreeSet<String> {
    serde_json::to_value(value)
        .expect("a declared record serializes")
        .as_object()
        .expect("a declared record is an object")
        .keys()
        .cloned()
        .collect()
}

fn supplied() -> BTreeSet<&'static str> {
    BTreeSet::from([SOURCE_DOCUMENT])
}

/// Tracing: TC-1611; FR-114-AC-1, FR-114-CON-3
#[trace("TC-1611", "FR-114-AC-1")]
#[trace("TC-1611", "FR-114-CON-3")]
#[test]
fn tc_1611_a_component_record_carries_its_six_authored_members() {
    let configuration = configuration();
    let component = component("ix://agent-ix/commerce/component/orders");
    component
        .validate(
            &configuration,
            &inventory(InventoryCompleteness::Complete),
            &supplied(),
        )
        .expect("a complete component record is admitted");

    let emitted = members(&component);
    for member in [
        "componentIdentity",
        "componentRevision",
        "digest",
        "sourceLocus",
        "inventoryMembership",
        "owningTypeIdentity",
        "repositoryIdentity",
        "roleIdentities",
    ] {
        assert!(emitted.contains(member), "{member} is a separate member");
    }
    // Six authored classes, each read directly and none merged into another.
    assert_ne!(component.component_identity, component.repository_identity);
    assert_ne!(component.component_revision.value, component.digest.value);
    assert_eq!(component.component_revision.value, "2026-09-11-1");
    assert_eq!(component.digest.version, "1");
    assert!(component.source_locus.is_some());
    assert_eq!(component.inventory_membership.inventory_identity, INVENTORY);

    println!(
        "TC-1611 measured: 1 component record, {} emitted members covering 6 authored classes — identity, namespaced revision, canonical digest selection, locus, ownership, inventory membership",
        emitted.len()
    );
}

/// Tracing: TC-1612; FR-114-AC-1
#[trace("TC-1612", "FR-114-AC-1")]
#[test]
fn tc_1612_an_endpoint_record_adds_its_four_own_members() {
    let configuration = configuration();
    let endpoint = endpoint("ix://agent-ix/commerce/endpoint/orders-shipment-source");
    endpoint
        .validate(
            &configuration,
            &inventory(InventoryCompleteness::Complete),
            &supplied(),
        )
        .expect("a complete endpoint record is admitted");

    let emitted = members(&endpoint);
    for member in [
        "endpointIdentity",
        "endpointRevision",
        "digest",
        "sourceLocus",
        "inventoryMembership",
        "componentIdentity",
        "typeIdentity",
        "role",
        "multiplicity",
    ] {
        assert!(emitted.contains(member), "{member} is a separate member");
    }
    // None of the four endpoint-specific members is reconstructed from another.
    assert_ne!(endpoint.endpoint_identity, endpoint.component_identity);
    assert_ne!(endpoint.endpoint_identity, endpoint.type_identity);
    assert_ne!(endpoint.role, endpoint.type_identity);
    assert_eq!(
        endpoint.multiplicity.as_ref().expect("authored").upper,
        Some(1)
    );

    println!(
        "TC-1612 measured: 1 endpoint record, {} emitted members covering 6 shared authored classes plus owning component identity, type identity, role and multiplicity",
        emitted.len()
    );
}

/// Tracing: TC-1613; FR-114-AC-1, FR-114-CON-1, FR-114-CON-2
#[trace("TC-1613", "FR-114-AC-1")]
#[trace("TC-1613", "FR-114-CON-1")]
#[trace("TC-1613", "FR-114-CON-2")]
#[test]
fn tc_1613_four_identities_sharing_one_display_name_stay_four_identities() {
    let configuration = configuration();
    let display_name = "orders";
    let repository = format!("ix://agent-ix/commerce/repository/{display_name}");
    let component_identity = format!("ix://agent-ix/commerce/component/{display_name}");
    let role = format!("ix://agent-ix/commerce/role/{display_name}");
    let endpoint_identity = format!("ix://agent-ix/commerce/endpoint/{display_name}");

    let mut declared = component(&component_identity);
    declared.repository_identity = repository.clone();
    declared.role_identities = BTreeSet::from([role.clone()]);
    let mut declared_endpoint = endpoint(&endpoint_identity);
    declared_endpoint.component_identity = component_identity.clone();

    let mut inventory = inventory(InventoryCompleteness::Complete);
    inventory.component_identities = BTreeSet::from([component_identity.clone()]);
    inventory.endpoint_identities = BTreeSet::from([endpoint_identity.clone()]);
    declared
        .validate(&configuration, &inventory, &supplied())
        .expect("the component is admitted");
    declared_endpoint
        .validate(&configuration, &inventory, &supplied())
        .expect("the endpoint is admitted");

    let identities: BTreeSet<&String> =
        BTreeSet::from([&repository, &component_identity, &role, &endpoint_identity]);
    assert_eq!(
        identities.len(),
        4,
        "one display name does not merge four identities"
    );

    // No component identity is reconstructed from a path, a package name, or a
    // deployment name: the locus path, the wire identity and the repository
    // identity are all separate members, and none of them equals the identity.
    let path = declaration_sources()[0].path.clone();
    let package = declared
        .source_locus
        .as_ref()
        .expect("locus")
        .source
        .wire
        .identity
        .clone();
    let deployment = format!("{display_name}-deployment");
    for candidate in [&path, &package, &deployment] {
        assert_ne!(
            &declared.component_identity, candidate,
            "the authored identity is not the {candidate} spelling"
        );
    }

    println!(
        "TC-1613 measured: 1 display name over {} distinct identities, and 3 reconstruction sources (path, package name, deployment name) none of which supplies the authored component identity",
        identities.len()
    );
}

/// Tracing: TC-1614; FR-114-AC-2, FR-114-CON-4
#[trace("TC-1614", "FR-114-AC-2")]
#[trace("TC-1614", "FR-114-CON-4")]
#[test]
fn tc_1614_an_absent_locus_and_an_absent_formal_revision_refuse() {
    let configuration = configuration();
    let inventory = inventory(InventoryCompleteness::Complete);

    let mut no_locus = component("ix://agent-ix/commerce/component/orders");
    no_locus.source_locus = None;
    let refusal = no_locus
        .validate(&configuration, &inventory, &supplied())
        .expect_err("a component with no locus refuses");
    assert_eq!(refusal.code, COMPONENT_PROVENANCE_ABSENT);
    assert!(refusal.message.contains(&no_locus.component_identity));

    let mut no_formal_revision = endpoint("ix://agent-ix/commerce/endpoint/orders-shipment-source");
    let mut broken = locus();
    broken.formal.revision = Revision::producer("");
    no_formal_revision.source_locus = Some(broken);
    let second = no_formal_revision
        .validate(&configuration, &inventory, &supplied())
        .expect_err("an endpoint whose locus names no formal document revision refuses");
    assert_eq!(second.code, FORMAL_REVISION_ABSENT);
    assert!(second
        .message
        .contains(&no_formal_revision.endpoint_identity));

    // A native authority label never substitutes for the authored formal revision.
    let mut substituted = endpoint("ix://agent-ix/commerce/endpoint/orders-shipment-source");
    let mut native_formal = locus();
    native_formal.formal.revision = Revision::native("editable-draft-7");
    substituted.source_locus = Some(native_formal);
    let third = substituted
        .validate(&configuration, &inventory, &supplied())
        .expect_err("a native label is not a formal document revision");
    assert_eq!(third.code, REVISION_NAMESPACE_SUBSTITUTED);

    println!("TC-1614 measured: 3 blocking locus refusals — absent locus, absent formal revision, native label substituted for it — each naming the offending record");
}

/// Tracing: TC-1615; Closed refuses the outsider; explicitly incomplete admits it carrying FR-110's retained `unknown`
#[trace("TC-1615", "FR-114-AC-3")]
#[trace("TC-1615", "FR-114-CON-6")]
#[test]
fn tc_1615_a_closed_inventory_refuses_an_unlisted_member_and_an_incomplete_one_admits_it() {
    let configuration = configuration();
    let unlisted = component("ix://agent-ix/commerce/component/payments");

    let closed = inventory(InventoryCompleteness::Complete);
    let refusal = unlisted
        .validate(&configuration, &closed, &supplied())
        .expect_err("a component outside a closed declared inventory refuses admission");
    assert_eq!(refusal.code, INVENTORY_MEMBER_UNLISTED);
    assert!(refusal.message.contains(&unlisted.component_identity));

    // The same component under an explicitly incomplete inventory is admitted,
    // carrying the completeness member with the retained `unknown` disposition
    // FR-110 owns. This module mints no second `unknown` and declares no closure.
    let incomplete = inventory(InventoryCompleteness::Incomplete);
    let mut admitted = unlisted.clone();
    admitted.inventory_membership =
        InventoryMembership::new(INVENTORY, InventoryCompleteness::Incomplete);
    admitted
        .validate(&configuration, &incomplete, &supplied())
        .expect("an unlisted member of an explicitly incomplete inventory is admitted");
    assert_eq!(
        admitted.inventory_membership.completeness.disposition(),
        "unknown"
    );

    // A membership may carry FR-110's disposition but never mint one.
    let minted = unlisted.clone();
    assert_eq!(
        minted
            .validate(&configuration, &incomplete, &supplied())
            .expect_err("a membership claiming completeness its inventory does not declare refuses")
            .code,
        INVENTORY_INCOMPLETE_UNKNOWN
    );

    println!("TC-1615 measured: 1 component over 2 inventories — refused {INVENTORY_MEMBER_UNLISTED} under the closed one, admitted under the explicitly incomplete one carrying the retained unknown disposition — plus 1 minted-disposition refusal");
}

/// Tracing: TC-1616; FR-114-AC-4, FR-114-AC-5, FR-114-CON-5
#[trace("TC-1616", "FR-114-AC-4")]
#[trace("TC-1616", "FR-114-AC-5")]
#[trace("TC-1616", "FR-114-CON-5")]
#[test]
fn tc_1616_a_full_locus_is_admitted_and_an_unsupplied_locus_refuses() {
    let configuration = configuration();
    let inventory = inventory(InventoryCompleteness::Complete);
    let declared = component("ix://agent-ix/commerce/component/orders");
    declared
        .validate(&configuration, &inventory, &supplied())
        .expect("a full locus is admitted");

    let declared_locus = declared
        .source_locus
        .as_ref()
        .expect("the locus is present");
    assert_eq!(
        members(declared_locus),
        CONSUMER_FOREIGN_LOCUS_MEMBERS
            .iter()
            .map(|member| (*member).to_owned())
            .collect::<BTreeSet<_>>(),
        "the locus maps onto the pinned consumer ForeignLocus member for member"
    );
    assert_eq!(
        members(&declared_locus.source),
        CONSUMER_ARTIFACT_REF_MEMBERS
            .iter()
            .map(|member| (*member).to_owned())
            .collect::<BTreeSet<_>>(),
        "all seven ArtifactRef members are present; a five-member locus is a wrong answer"
    );
    // The `source` digest is one raw-byte string, admitted rather than refused
    // as a non-canonical selection, and the `formal` revision and `span` are read
    // directly.
    let wire = serde_json::to_value(declared_locus).expect("the locus serializes");
    assert!(matches!(wire["source"]["digest"], Value::String(_)));
    assert_eq!(wire["source"]["kind"], Value::String("source".into()));
    assert_eq!(
        wire["formal"]["revision"]["value"],
        Value::String("2026-09-11-1".into())
    );
    assert_eq!(wire["span"]["start"], Value::from(64));
    assert_eq!(wire["span"]["end"], Value::from(192));

    // A locus no declaration source document supplies refuses, and no record
    // carrying a synthesized locus is emitted for it.
    let mut unsupplied = declared.clone();
    let mut elsewhere = locus();
    elsewhere.source.identity = "ix://agent-ix/commerce/source/not-declared".into();
    unsupplied.source_locus = Some(elsewhere);
    let refusal = unsupplied
        .validate(
            &configuration,
            &inventory,
            &BTreeSet::from([SOURCE_DOCUMENT]),
        )
        .expect_err("an unsupplied locus refuses");
    assert_eq!(refusal.code, COMPONENT_PROVENANCE_UNSUPPLIED);
    assert!(refusal.message.contains("no locus is synthesized"));

    println!(
        "TC-1616 measured: 1 full locus admitted over {} ForeignLocus members and {} ArtifactRef members with 1 raw-byte digest string, and 1 unsupplied locus refused {COMPONENT_PROVENANCE_UNSUPPLIED} with no synthesized locus emitted",
        CONSUMER_FOREIGN_LOCUS_MEMBERS.len(),
        CONSUMER_ARTIFACT_REF_MEMBERS.len()
    );
}
