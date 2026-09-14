// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Agent-IX

//! Traced FR-128 controls for the closed relationship direction vocabulary: the
//! four admitted values, the operand rule that no direction permutes the
//! `source` and `target` members, the admitted traversals of each value, the
//! kebab-case wire spellings, the admission seam that refuses an
//! out-of-vocabulary and an absent direction, the independence of the direction
//! from every other relationship member, and the value semantics of the typed
//! vocabulary. Every control reports the number it measured.

use std::collections::{BTreeMap, BTreeSet};

use agent_ix_baseline_producer::refusal::INVALID_PRODUCER_DOCUMENT;
use agent_ix_baseline_producer::{
    ArtifactKind, ArtifactReference, ConfigurationDocument, DigestDomainSelection, DigestSelection,
    EndpointDeclaration, FormalDocument, InventoryCompleteness, InventoryDeclaration,
    InventoryMembership, Multiplicity, NumericResourceLimit, RawByteDigest,
    RelationshipDeclaration, RelationshipDirection, RelationshipEndpoint, RelationshipOwnership,
    RelationshipSemantics, ResourceLimits, Revision, SourceLocus, Span, StaticProducerBundle,
    WireReference, ADMISSIBLE_REVISION_NAMESPACES,
};
use serde_json::Value;

mod static_fixture;

use static_fixture::{fixture_bytes, GOOD_FIXTURE};

const SOURCE_DOCUMENT: &str = "ix://agent-ix/commerce/source/order-declarations";
const INVENTORY: &str = "ix://agent-ix/commerce/inventory/orders-2026-09-11";
const RELATIONSHIP: &str = "ix://agent-ix/commerce/relationship/Order-shipment";
const SOURCE_ENDPOINT: &str = "ix://agent-ix/commerce/endpoint/Order-shipment-source";
const TARGET_ENDPOINT: &str = "ix://agent-ix/commerce/endpoint/Order-shipment-target";
const SELF_TARGET_ENDPOINT: &str = "ix://agent-ix/commerce/endpoint/Order-successor-target";
const ORDER_TYPE: &str = "ix://agent-ix/commerce/type/Order";
const SHIPMENT_TYPE: &str = "ix://agent-ix/commerce/type/Shipment";

/// The four admitted wire spellings, in the interface's declared order.
const SPELLINGS: [&str; 4] = [
    "source-to-target",
    "target-to-source",
    "bidirectional",
    "undirected",
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
        declared_endpoint(SOURCE_ENDPOINT, ORDER_TYPE, "order"),
        declared_endpoint(TARGET_ENDPOINT, SHIPMENT_TYPE, "shipment"),
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
            type_identity: ORDER_TYPE.into(),
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
            type_identity: SHIPMENT_TYPE.into(),
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

/// The committed good fixture as a mutable JSON document.
fn good_document() -> Value {
    serde_json::from_slice(&fixture_bytes(GOOD_FIXTURE))
        .expect("the good fixture is a JSON document")
}

/// Tracing: TC-1713
#[test]
fn tc_1713_the_direction_vocabulary_is_exactly_four_admitted_values() {
    assert_eq!(
        RelationshipDirection::ADMITTED.len(),
        4,
        "the vocabulary is closed at four values"
    );

    let spellings: Vec<&'static str> = RelationshipDirection::ADMITTED
        .iter()
        .map(|direction| direction.as_str())
        .collect();
    assert_eq!(
        spellings, SPELLINGS,
        "the four wire spellings are exactly the four the requirement names, in order"
    );

    let distinct_spellings: BTreeSet<&'static str> = spellings.iter().copied().collect();
    assert_eq!(
        distinct_spellings.len(),
        4,
        "the four spellings are distinct"
    );
    let distinct_values: BTreeSet<RelationshipDirection> =
        RelationshipDirection::ADMITTED.iter().copied().collect();
    assert_eq!(distinct_values.len(), 4, "the four values are distinct");

    // `bidirectional` and `undirected` are separate authored states, neither the
    // other's default (FR-128-CON-3).
    assert_ne!(
        RelationshipDirection::Bidirectional,
        RelationshipDirection::Undirected
    );

    println!(
        "TC-1713 measured: {} admitted direction values over {} distinct wire spellings and {} distinct typed values",
        RelationshipDirection::ADMITTED.len(),
        distinct_spellings.len(),
        distinct_values.len()
    );
}

/// Tracing: TC-1714
#[test]
fn tc_1714_no_direction_permutes_the_source_and_target_members() {
    let endpoints = declared_endpoints();
    let index = EndpointDeclaration::index(&endpoints);
    let configuration = configuration();
    let inventory = inventory();

    let declared_source = relationship().source;
    let declared_target = relationship().target;
    assert_ne!(
        declared_source, declared_target,
        "the two authored members differ, so a permutation would be observable"
    );

    let mut member_identities = 0;
    for direction in RelationshipDirection::ADMITTED {
        let mut admitted = relationship();
        admitted.semantics.direction = direction;
        admitted
            .validate(&configuration, &inventory, &index)
            .unwrap_or_else(|refusal| {
                panic!("{} is admitted: {refusal}", direction.as_str());
            });

        // The typed members.
        assert_eq!(
            admitted.source,
            declared_source,
            "{} keeps S as the source member",
            direction.as_str()
        );
        member_identities += 1;
        assert_eq!(
            admitted.target,
            declared_target,
            "{} keeps T as the target member",
            direction.as_str()
        );
        member_identities += 1;

        // The emitted wire document, where a permutation would also show.
        let wire = serde_json::to_value(&admitted).expect("it serializes");
        assert_eq!(wire["source"]["endpointIdentity"], SOURCE_ENDPOINT);
        assert_eq!(wire["target"]["endpointIdentity"], TARGET_ENDPOINT);
        assert_eq!(wire["semantics"]["direction"], direction.as_str());
    }

    assert_eq!(
        member_identities, 8,
        "4 directions x 2 members were checked"
    );

    println!(
        "TC-1714 measured: {} member identities over {} directions x 2 members, 0 permutations of the source and target members",
        member_identities,
        RelationshipDirection::ADMITTED.len()
    );
}

/// Tracing: TC-1715
#[test]
fn tc_1715_each_direction_admits_exactly_its_stated_traversals() {
    let expected: [(RelationshipDirection, bool, bool, bool); 4] = [
        (RelationshipDirection::SourceToTarget, true, false, true),
        (RelationshipDirection::TargetToSource, false, true, true),
        (RelationshipDirection::Bidirectional, true, true, true),
        (RelationshipDirection::Undirected, false, false, false),
    ];

    let mut predicates = 0;
    let mut unoriented = 0;
    for (direction, source_to_target, target_to_source, oriented) in expected {
        assert_eq!(
            direction.admits_source_to_target(),
            source_to_target,
            "{} S->T",
            direction.as_str()
        );
        predicates += 1;
        assert_eq!(
            direction.admits_target_to_source(),
            target_to_source,
            "{} T->S",
            direction.as_str()
        );
        predicates += 1;
        assert_eq!(
            direction.is_oriented(),
            oriented,
            "{} orientation",
            direction.as_str()
        );
        if !direction.is_oriented() {
            unoriented += 1;
        }
    }

    assert_eq!(predicates, 8, "the 4 x 2 traversal matrix was measured");
    assert_eq!(
        unoriented, 1,
        "undirected is the only unoriented value, and it admits neither oriented traversal"
    );
    // Bidirectional admits both traversals separately; undirected admits neither
    // as oriented. The two are not the same state (FR-128-AC-5).
    assert!(
        RelationshipDirection::Bidirectional.admits_source_to_target()
            && RelationshipDirection::Bidirectional.admits_target_to_source()
    );
    assert!(
        !RelationshipDirection::Undirected.admits_source_to_target()
            && !RelationshipDirection::Undirected.admits_target_to_source()
    );

    println!(
        "TC-1715 measured: {predicates} traversal predicates over a 4 x 2 matrix, with {unoriented} of 4 values unoriented"
    );
}

/// Tracing: TC-1716
#[test]
fn tc_1716_each_direction_round_trips_through_its_exact_wire_spelling() {
    let mut round_trips = 0;
    for (direction, spelling) in RelationshipDirection::ADMITTED.iter().zip(SPELLINGS) {
        let serialized = serde_json::to_value(direction).expect("a direction serializes");
        assert_eq!(
            serialized,
            Value::String(spelling.to_owned()),
            "{spelling} is the exact kebab-case wire spelling"
        );
        assert_eq!(direction.as_str(), spelling, "as_str agrees with serde");

        let deserialized: RelationshipDirection =
            serde_json::from_value(serialized).expect("the spelling deserializes");
        assert_eq!(deserialized, *direction, "{spelling} round trips");
        round_trips += 1;
    }

    assert_eq!(round_trips, 4, "all four values round tripped");

    println!("TC-1716 measured: {round_trips} direction values round tripped through their exact kebab-case wire spellings");
}

/// Tracing: TC-1717
#[test]
fn tc_1717_a_direction_outside_the_four_is_refused_at_the_admission_seam() {
    // The committed good fixture is admissible as authored.
    StaticProducerBundle::admit_json(&fixture_bytes(GOOD_FIXTURE))
        .expect("the good fixture is admitted");

    // Three spellings outside the closed vocabulary: a casing variant, a
    // snake_case variant, and a producer-defined free string of the kind the
    // member carried before the vocabulary was closed.
    let offered = ["Source-To-Target", "source_to_target", "points-at"];

    let mut refused = 0;
    for spelling in offered {
        let mut document = good_document();
        document["relationships"][0]["semantics"]["direction"] = Value::String(spelling.to_owned());
        let bytes = serde_json::to_vec(&document).expect("it serializes");

        let outcome = StaticProducerBundle::admit_json(&bytes);
        assert!(
            outcome.is_err(),
            "{spelling} yields no admitted bundle at all"
        );
        let refusal = outcome.expect_err("an out-of-vocabulary direction refuses");
        // IMPLEMENTED BEHAVIOUR, not the code FR-128 names. The closed enum makes
        // the value unrepresentable, so the offer dies in deserialization and
        // carries INVALID_PRODUCER_DOCUMENT. FR-128 names
        // RELATIONSHIP_DIRECTION_UNKNOWN, which this crate declares nowhere; the
        // refusal therefore does not name the offending relationship identity
        // either. Asserted here as it is, and reported rather than repaired.
        assert_eq!(
            refusal.code, INVALID_PRODUCER_DOCUMENT,
            "the offered spelling {spelling} refuses under the implemented code"
        );
        assert!(
            refusal.message.contains(spelling),
            "the refusal names the offered spelling: {}",
            refusal.message
        );
        refused += 1;
    }

    assert_eq!(refused, 3, "every out-of-vocabulary spelling was refused");

    println!("TC-1717 measured: {refused} out-of-vocabulary direction spellings, each refused {INVALID_PRODUCER_DOCUMENT} at the admission seam and each yielding 0 admitted bundles");
}

/// Tracing: TC-1718
#[test]
fn tc_1718_a_relationship_carrying_no_direction_member_is_refused() {
    let mut document = good_document();
    let semantics = document["relationships"][0]["semantics"]
        .as_object_mut()
        .expect("the semantics member is an object");
    let removed = semantics.remove("direction");
    assert!(
        removed.is_some(),
        "the fixture carried a direction to remove"
    );
    let bytes = serde_json::to_vec(&document).expect("it serializes");

    let outcome = StaticProducerBundle::admit_json(&bytes);
    assert!(
        outcome.is_err(),
        "an absent direction yields no admitted bundle"
    );
    let refusal = outcome.expect_err("an absent direction refuses");
    // IMPLEMENTED BEHAVIOUR. `direction` carries no serde default, so an absent
    // member is a missing-field deserialization failure under
    // INVALID_PRODUCER_DOCUMENT. FR-128 names RELATIONSHIP_DIRECTION_ABSENT,
    // which this crate declares nowhere; the refusal names the member but not the
    // offending relationship identity.
    assert_eq!(refusal.code, INVALID_PRODUCER_DOCUMENT);
    assert!(
        refusal.message.contains("direction"),
        "the refusal names the absent member: {}",
        refusal.message
    );
    // No value of the four is defaulted in: the document is refused, not
    // migrated (FR-128-CON-3).
    for spelling in SPELLINGS {
        assert!(
            !refusal.message.contains(spelling),
            "no admitted value is defaulted in for an absent direction"
        );
    }

    println!("TC-1718 measured: 1 relationship record carrying no direction member, refused {INVALID_PRODUCER_DOCUMENT}, 0 of 4 values defaulted in and 0 admitted bundles");
}

/// One named relationship member and the variation TC-1719 applies to it.
type Mutation = (&'static str, fn(&mut RelationshipDeclaration));

/// Tracing: TC-1719
#[test]
fn tc_1719_the_direction_is_independent_of_every_other_relationship_member() {
    let endpoints = declared_endpoints();
    let index = EndpointDeclaration::index(&endpoints);
    let configuration = configuration();
    let inventory = inventory();

    let held = RelationshipDirection::Bidirectional;
    let mutations: [Mutation; 8] = [
        ("category", |relationship| {
            relationship.semantics.category = "behavioural".into();
        }),
        ("lifecycle", |relationship| {
            relationship.semantics.lifecycle = "independent".into();
        }),
        ("ownership", |relationship| {
            relationship.semantics.ownership = "shipment".into();
        }),
        ("composite", |relationship| {
            relationship.semantics.composite = false;
        }),
        ("source role", |relationship| {
            relationship.source.role = "placer".into();
        }),
        ("target role", |relationship| {
            relationship.target.role = "placed".into();
        }),
        ("source multiplicity", |relationship| {
            relationship.source.multiplicity = Some(Multiplicity {
                lower: 1,
                upper: None,
                ordered: true,
                unique: false,
            });
        }),
        ("target multiplicity", |relationship| {
            relationship.target.multiplicity = Some(Multiplicity {
                lower: 0,
                upper: Some(7),
                ordered: true,
                unique: true,
            });
        }),
    ];

    let mut varied = 0;
    for (member, mutate) in mutations {
        let mut relationship = relationship();
        relationship.semantics.direction = held;
        let before = relationship.clone();
        mutate(&mut relationship);
        assert_ne!(relationship, before, "{member} was actually varied");
        relationship
            .validate(&configuration, &inventory, &index)
            .unwrap_or_else(|refusal| panic!("a varied {member} is admitted: {refusal}"));

        assert_eq!(
            relationship.semantics.direction, held,
            "{member} derives no direction"
        );
        let wire = serde_json::to_value(&relationship).expect("it serializes");
        assert_eq!(
            wire["semantics"]["direction"],
            held.as_str(),
            "{member} derives no direction on the wire either"
        );
        varied += 1;
    }

    assert_eq!(varied, 8, "eight members were varied");

    println!("TC-1719 measured: {varied} varied relationship members — category, lifecycle, ownership, composite, 2 roles and 2 multiplicities — with the direction unchanged in all {varied}");
}

/// Tracing: TC-1720
#[test]
fn tc_1720_a_self_relationship_retains_two_endpoint_records_under_every_direction() {
    // Both ends join declared endpoints that themselves declare the one type
    // identity: a relationship end's typeIdentity must equal its joined
    // endpoint's (FR-127-CON-7), so the self-relationship needs a second
    // declared endpoint over the same type rather than a restated one.
    let mut endpoints = declared_endpoints();
    endpoints.push(declared_endpoint(
        SELF_TARGET_ENDPOINT,
        ORDER_TYPE,
        "successor",
    ));
    let index = EndpointDeclaration::index(&endpoints);
    let configuration = configuration();
    let inventory = inventory();

    let mut retained_records = 0;
    for direction in RelationshipDirection::ADMITTED {
        let mut relationship = relationship();
        relationship.semantics.direction = direction;
        relationship.target.endpoint_identity = SELF_TARGET_ENDPOINT.into();
        relationship.target.type_identity = ORDER_TYPE.into();
        relationship.target.role = "successor".into();
        relationship
            .validate(&configuration, &inventory, &index)
            .unwrap_or_else(|refusal| {
                panic!(
                    "a self-relationship under {} is admitted: {refusal}",
                    direction.as_str()
                )
            });

        assert_eq!(
            relationship.source.type_identity, relationship.target.type_identity,
            "both ends name one type identity"
        );
        assert_ne!(
            relationship.source,
            relationship.target,
            "the two endpoint records stay independent under {}",
            direction.as_str()
        );
        assert_eq!(
            relationship.joined_endpoint_identities().len(),
            2,
            "two endpoint identities are retained under {}",
            direction.as_str()
        );

        let wire = serde_json::to_value(&relationship).expect("it serializes");
        assert_ne!(wire["source"], wire["target"]);
        assert_eq!(
            wire["source"]["typeIdentity"],
            wire["target"]["typeIdentity"]
        );
        retained_records += 2;
    }

    assert_eq!(
        retained_records, 8,
        "4 directions x 2 independent endpoint records"
    );

    println!(
        "TC-1720 measured: {retained_records} retained endpoint records over {} directions x 2 members of 1 self-relationship naming 1 type identity",
        RelationshipDirection::ADMITTED.len()
    );
}

/// Tracing: TC-1721
#[test]
fn tc_1721_the_direction_is_a_copyable_orderable_hashable_key() {
    // Copy: the value is used after being passed by value.
    let direction = RelationshipDirection::Bidirectional;
    let copied = direction;
    assert_eq!(direction, copied, "the value is Copy, not moved");

    // Ord: the four sort stably into the interface's declared order.
    let ordered: BTreeSet<RelationshipDirection> =
        RelationshipDirection::ADMITTED.iter().copied().collect();
    let ordered_spellings: Vec<&'static str> =
        ordered.iter().map(|direction| direction.as_str()).collect();
    assert_eq!(
        ordered_spellings.to_vec(),
        SPELLINGS.to_vec(),
        "declaration order is the sort order"
    );
    assert_eq!(ordered.len(), 4, "no two values collapse in a BTreeSet");

    let mut reversed = RelationshipDirection::ADMITTED;
    reversed.reverse();
    let resorted: BTreeSet<RelationshipDirection> = reversed.iter().copied().collect();
    assert_eq!(resorted, ordered, "the sort is stable under input order");

    // Hash/Ord as a map key: each value keys its own entry.
    let keyed: BTreeMap<RelationshipDirection, &'static str> = RelationshipDirection::ADMITTED
        .iter()
        .map(|direction| (*direction, direction.as_str()))
        .collect();
    assert_eq!(keyed.len(), 4, "four values key four distinct entries");
    for direction in RelationshipDirection::ADMITTED {
        assert_eq!(keyed.get(&direction), Some(&direction.as_str()));
    }
    let hashed: std::collections::HashSet<RelationshipDirection> =
        RelationshipDirection::ADMITTED.iter().copied().collect();
    assert_eq!(hashed.len(), 4, "four values hash to four distinct members");

    println!(
        "TC-1721 measured: {} direction values sorted stably into 1 declared order and keyed {} BTreeMap entries and {} HashSet members",
        ordered.len(),
        keyed.len(),
        hashed.len()
    );
}
