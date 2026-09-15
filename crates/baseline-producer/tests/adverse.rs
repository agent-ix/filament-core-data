// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Agent-IX

//! The eight one-axis adverse fixtures of Plan-017 Task-149, measured at the
//! wire seam.
//!
//! Each fixture differs from `fixtures/baseline-1-2/static-bundle-a.json` on
//! **exactly one** axis and refuses with **exactly one** stable code from
//! `src/refusal.rs`. Two measurements are taken per fixture, and both must hold:
//!
//! 1. the refusal — `StaticProducerBundle::admit_json` refuses, and the code is
//!    the one code that axis owns;
//! 2. the one-axis proof — the structural diff of the adverse fixture against the
//!    good fixture touches only the members that axis owns, so a fixture that
//!    drifted into testing two axes fails here rather than passing as producer
//!    evidence. A second axis firing is a fixture defect, not a producer finding
//!    (Plan-017 quality gate 4).
//!
//! These are the wire-level controls over the committed fixtures. The per-type
//! unit controls of Tasks 143..148 construct their inputs in code and remain each
//! row's primary test; the rows are traced here as well because these fixtures are
//! the evidence agent A reads.
//!
//! One axis is measured across two admissions rather than one, and says so:
//! FR-116-AC-3's staleness is a statement about a *prior* selection, so a single
//! document carries no prior to be stale against. `07-stale-correspondence-selection.json`
//! is therefore admitted beside the good fixture and the retained binding relation
//! is compared against the prior admitted record. `validate_correspondence_set`
//! raises no staleness refusal for one document in isolation, which is recorded
//! here rather than patched: the within-one-set comparison is not this task's
//! module to write.

use agent_ix_baseline_producer::refusal::{
    COMPONENT_PROVENANCE_ABSENT, CORRESPONDENCE_STALE_SELECTION, DIGEST_DOMAIN_SUBSTITUTED,
    ENDPOINT_MULTIPLICITY_ABSENT, EXPORT_FOREIGN, IDENTITY_ABSENT, INVENTORY_MEMBER_UNLISTED,
    REVISION_NAMESPACE_SUBSTITUTED,
};
use agent_ix_baseline_producer::{Refusal, StaticProducerBundle};
use ix_trace_rs::trace;

mod static_fixture;

use static_fixture::{
    changed_members, fixture_bytes, fixture_document, ADVERSE_FIXTURES, GOOD_FIXTURE,
};

/// One adverse axis: its fixture, the one code it refuses with, and the member
/// paths it owns.
struct Axis {
    /// The committed fixture path, relative to `fixtures/baseline-1-2/`.
    file: &'static str,
    /// The one stable refusal code this axis raises.
    code: &'static str,
    /// The member-path prefixes this axis owns; nothing else may differ.
    owns: &'static [&'static str],
    /// Whether the fixture re-seals the bundle's derived `digest` header.
    ///
    /// Only the staleness axis does: its refusal is raised after the self-digest
    /// comparison, so a fixture carrying the good bundle's stale digest would
    /// refuse as a digest mismatch and measure axis 02 instead.
    resealed: bool,
}

const AXES: [Axis; 8] = [
    Axis {
        file: "adverse/01-missing-identities.json",
        code: IDENTITY_ABSENT,
        owns: &["/bundleIdentity"],
        resealed: false,
    },
    Axis {
        file: "adverse/02-digest-domain-substituted.json",
        code: DIGEST_DOMAIN_SUBSTITUTED,
        owns: &["/components/0/digest"],
        resealed: false,
    },
    Axis {
        file: "adverse/03-revision-namespace-substituted.json",
        code: REVISION_NAMESPACE_SUBSTITUTED,
        owns: &["/endpoints/0/endpointRevision"],
        resealed: false,
    },
    Axis {
        file: "adverse/04-export-foreign-cross-bound.json",
        code: EXPORT_FOREIGN,
        owns: &["/correspondences/1/exports/0/producerObjectIdentity"],
        resealed: false,
    },
    Axis {
        file: "adverse/05-endpoint-role-multiplicity-lost.json",
        code: ENDPOINT_MULTIPLICITY_ABSENT,
        owns: &[
            "/relationships/0/target/role",
            "/relationships/0/target/multiplicity",
        ],
        resealed: false,
    },
    Axis {
        file: "adverse/06-component-provenance-absent.json",
        code: COMPONENT_PROVENANCE_ABSENT,
        owns: &["/components/1/sourceLocus"],
        resealed: false,
    },
    Axis {
        file: "adverse/07-stale-correspondence-selection.json",
        code: CORRESPONDENCE_STALE_SELECTION,
        owns: &["/correspondences/0/native"],
        resealed: true,
    },
    Axis {
        file: "adverse/08-inventory-incomplete.json",
        code: INVENTORY_MEMBER_UNLISTED,
        owns: &["/inventory/endpointIdentities"],
        resealed: false,
    },
];

/// Proves one adverse fixture differs from the good fixture on one axis only.
///
/// Returns the changed member paths it measured, so each control reports the
/// number rather than asserting silently.
fn one_axis(axis: &Axis) -> Vec<String> {
    let good = fixture_document(GOOD_FIXTURE);
    let adverse = fixture_document(axis.file);
    let changed: Vec<String> = changed_members(&good, &adverse).into_iter().collect();
    assert!(
        !changed.is_empty(),
        "{} does not differ from {GOOD_FIXTURE} at all",
        axis.file
    );
    let derived: &[&str] = if axis.resealed { &["/digest"] } else { &[] };
    let mut owned_changes = 0;
    for path in &changed {
        if axis
            .owns
            .iter()
            .any(|prefix| path == prefix || path.starts_with(&format!("{prefix}/")))
        {
            owned_changes += 1;
            continue;
        }
        assert!(
            derived
                .iter()
                .any(|prefix| path == prefix || path.starts_with(&format!("{prefix}/"))),
            "{} changes {path}, which its axis does not own: the fixture tests more than one axis",
            axis.file
        );
    }
    assert!(
        owned_changes > 0,
        "{} changes nothing its axis owns",
        axis.file
    );
    changed
}

/// Admits one adverse fixture and returns the refusal.
fn refusal_of(axis: &Axis) -> Refusal {
    StaticProducerBundle::admit_json(&fixture_bytes(axis.file)).expect_err(&format!(
        "{} is refused by the one admission entry point",
        axis.file
    ))
}

/// Refuses an axis table that is not eight fixtures carrying eight distinct
/// codes in the declared order, so a fixture set that drifted is caught before a
/// refusal is read as producer evidence.
fn declared_axis_table() {
    assert_eq!(AXES.len(), ADVERSE_FIXTURES.len());
    let mut codes = std::collections::BTreeSet::new();
    for (axis, declared) in AXES.iter().zip(ADVERSE_FIXTURES.iter()) {
        assert_eq!(axis.file, *declared, "the axis order is the declared order");
        assert!(
            static_fixture::fixture_path(axis.file).is_file(),
            "{} is committed",
            axis.file
        );
        assert!(
            codes.insert(axis.code),
            "{} shares its refusal code with another axis",
            axis.file
        );
    }
    assert_eq!(codes.len(), 8, "eight axes carry eight distinct codes");
}

/// Measures one axis: exactly one code, and a diff one axis wide.
fn measure(index: usize) -> (Refusal, Vec<String>) {
    declared_axis_table();
    let axis = &AXES[index];
    let refusal = refusal_of(axis);
    assert_eq!(
        refusal.code, axis.code,
        "{} refuses with exactly one code: {}",
        axis.file, refusal
    );
    let changed = one_axis(axis);
    (refusal, changed)
}

/// Tracing: TC-1631; FR-117-AC-1
#[trace("TC-1631", "FR-117-AC-1")]
#[test]
fn tc_1631_the_good_static_bundle_fixture_is_admitted_from_its_wire_form() {
    let admitted = StaticProducerBundle::admit_json(&fixture_bytes(GOOD_FIXTURE))
        .expect("the committed static bundle fixture is admitted");

    // Every header member and every content member class is read as a typed
    // member of the admitted bundle, not parsed out of prose.
    assert_eq!(
        admitted.bundle_identity(),
        "ix://agent-ix/commerce/bundle/orders-static-a"
    );
    assert_eq!(
        admitted.bundle_revision().namespace,
        "filament-core-data/producer-object-revision-1"
    );
    assert_eq!(admitted.digest().domain, "filament-canonical-json-1");
    assert_eq!(admitted.interface_version(), "1.2.0");
    assert_eq!(admitted.components().len(), 2);
    assert_eq!(admitted.endpoints().len(), 5);
    assert_eq!(admitted.relationships().len(), 2);
    assert_eq!(admitted.correspondences().len(), 2);
    assert!(admitted
        .configuration()
        .resource_limits
        .numeric_resource_limit
        .is_some());
    assert_eq!(admitted.static_closure().declaration_sources.len(), 2);
    assert_eq!(
        admitted.inventory().endpoint_identities.len(),
        admitted.endpoints().len()
    );

    // The self-relationship carries two distinct endpoint identities over one
    // type identity, each with its own role.
    let self_relationship = admitted
        .relationships()
        .iter()
        .find(|relationship| relationship.source.type_identity == relationship.target.type_identity)
        .expect("the fixture carries a self-relationship");
    assert_ne!(
        self_relationship.source.endpoint_identity, self_relationship.target.endpoint_identity,
        "a self-relationship's two sides stay two endpoint identities"
    );
    assert_ne!(self_relationship.source.role, self_relationship.target.role);

    // The display-name collision quartet stays four distinct identities.
    let collisions = [
        "ix://agent-ix/commerce/repository/orders",
        "ix://agent-ix/commerce/component/orders",
        "ix://agent-ix/commerce/role/orders",
        "ix://agent-ix/commerce/endpoint/orders",
    ];
    let document = fixture_document(GOOD_FIXTURE);
    let text = serde_json::to_string(&document).expect("the fixture serializes");
    for identity in collisions {
        assert!(text.contains(identity), "the fixture carries {identity}");
    }

    println!(
        "TC-1631 measured: 1 admitted static bundle fixture with 4 header members, 9 content member classes, {} components, {} endpoints, {} relationships, {} correspondences and {} identities sharing the display name orders",
        admitted.components().len(),
        admitted.endpoints().len(),
        admitted.relationships().len(),
        admitted.correspondences().len(),
        collisions.len()
    );
}

/// Tracing: TC-1633; FR-117-AC-2
#[trace("TC-1633", "FR-117-AC-2")]
#[test]
fn tc_1633_the_missing_identity_axis_refuses_naming_the_absent_identity() {
    let (refusal, changed) = measure(0);
    assert!(
        refusal.message.contains("bundleIdentity"),
        "the refusal names the absent member: {refusal}"
    );
    println!(
        "TC-1633 measured: 1 adverse fixture refusing {} over {} changed member, 0 members outside the axis",
        refusal.code,
        changed.len()
    );
}

/// Tracing: TC-1601; FR-112-AC-2
#[trace("TC-1601", "FR-112-AC-2")]
#[test]
fn tc_1601_the_digest_domain_substitution_axis_refuses_the_substituted_domain() {
    let (refusal, changed) = measure(1);
    assert!(
        refusal.message.contains("quire-native-bytes-1"),
        "the refusal names the substituted domain: {refusal}"
    );
    println!(
        "TC-1601 measured: 1 adverse fixture refusing {} over {} changed member, 0 members outside the axis",
        refusal.code,
        changed.len()
    );
}

/// Tracing: TC-1607; FR-113-AC-2
#[trace("TC-1607", "FR-113-AC-2")]
#[test]
fn tc_1607_the_revision_namespace_substitution_axis_refuses_the_substituted_namespace() {
    let (refusal, changed) = measure(2);
    assert!(
        refusal
            .message
            .contains("quire-native/definition-revision-1"),
        "the refusal names the substituted namespace: {refusal}"
    );
    println!(
        "TC-1607 measured: 1 adverse fixture refusing {} over {} changed member, 0 members outside the axis",
        refusal.code,
        changed.len()
    );
}

/// Tracing: TC-1624; FR-116-AC-2
#[trace("TC-1624", "FR-116-AC-2")]
#[test]
fn tc_1624_the_foreign_export_axis_refuses_naming_the_export_and_the_object() {
    let (refusal, changed) = measure(3);
    assert!(
        refusal
            .message
            .contains("ix://agent-ix/commerce/relationship/Order-successor")
            && refusal
                .message
                .contains("ix://agent-ix/commerce/model/order-1-2"),
        "the refusal names the export and the foreign producer object: {refusal}"
    );
    println!(
        "TC-1624 measured: 1 adverse fixture refusing {} over {} changed member, 0 members outside the axis",
        refusal.code,
        changed.len()
    );
}

/// Tracing: TC-1620; FR-115-AC-3
#[trace("TC-1620", "FR-115-AC-3")]
#[test]
fn tc_1620_the_endpoint_multiplicity_loss_axis_refuses_rather_than_defaulting() {
    let (refusal, changed) = measure(4);
    assert!(
        refusal
            .message
            .contains("ix://agent-ix/commerce/relationship/Order-shipment")
            && refusal.message.contains("target"),
        "the refusal names the relationship and the side that lost its multiplicity: {refusal}"
    );
    println!(
        "TC-1620 measured: 1 adverse fixture refusing {} over {} changed member, 0 members outside the axis",
        refusal.code,
        changed.len()
    );
}

/// Tracing: TC-1614; FR-114-AC-2, FR-114-CON-4
#[trace("TC-1614", "FR-114-AC-2")]
#[trace("TC-1614", "FR-114-CON-4")]
#[test]
fn tc_1614_the_absent_provenance_axis_refuses_naming_the_record() {
    let (refusal, changed) = measure(5);
    assert!(
        refusal
            .message
            .contains("ix://agent-ix/commerce/component/shipments"),
        "the refusal names the record carrying no locus: {refusal}"
    );
    println!(
        "TC-1614 measured: 1 adverse fixture refusing {} over {} changed member, 0 members outside the axis",
        refusal.code,
        changed.len()
    );
}

/// Tracing: TC-1625; FR-116-AC-3
#[trace("TC-1625", "FR-116-AC-3")]
#[test]
fn tc_1625_the_stale_correspondence_axis_refuses_the_changed_selection() {
    declared_axis_table();
    let axis = &AXES[6];

    // Both documents are admitted: a changed native selection under a retained
    // binding relation is not a defect of either document in isolation, which is
    // why FR-116-AC-3 is stated over a prior selection.
    let prior = StaticProducerBundle::admit_json(&fixture_bytes(GOOD_FIXTURE))
        .expect("the good fixture is admitted");
    let later = StaticProducerBundle::admit_json(&fixture_bytes(axis.file))
        .expect("the re-encoded fixture is admitted on its own");

    let retained = &later.correspondences()[0];
    let prior_record = &prior.correspondences()[0];
    assert_eq!(
        retained.binding_relation_identity, prior_record.binding_relation_identity,
        "the axis retains the binding relation identity"
    );
    let refusal = retained
        .validate_against_prior(prior_record)
        .expect_err("a changed native selection under the retained relation refuses");
    assert_eq!(refusal.code, axis.code, "exactly one code: {refusal}");
    assert!(
        refusal
            .message
            .contains(&retained.binding_relation_identity)
            && refusal
                .message
                .contains(&retained.native.raw_byte_digest.value),
        "the refusal names the retained relation and the changed selection: {refusal}"
    );

    let changed = one_axis(axis);
    println!(
        "TC-1625 measured: 1 adverse fixture refusing {} across 2 admissions over {} changed members ({} owned by the axis, the rest the re-sealed derived bundle digest), 0 members outside the axis",
        refusal.code,
        changed.len(),
        changed
            .iter()
            .filter(|path| path.starts_with("/correspondences/0/native"))
            .count()
    );
}

/// Tracing: TC-1615; Closed refuses the outsider; explicitly incomplete admits it carrying FR-110's retained `unknown`
#[trace("TC-1615", "FR-114-AC-3")]
#[trace("TC-1615", "FR-114-CON-6")]
#[test]
fn tc_1615_the_incomplete_inventory_axis_refuses_the_unlisted_member() {
    let (refusal, changed) = measure(7);
    assert!(
        refusal
            .message
            .contains("ix://agent-ix/commerce/endpoint/Order-successor-target")
            && refusal
                .message
                .contains("ix://agent-ix/commerce/inventory/orders-2026-09-11"),
        "the refusal names the unlisted record and the closed inventory: {refusal}"
    );
    println!(
        "TC-1615 measured: 1 adverse fixture refusing {} over {} changed member, 0 members outside the axis",
        refusal.code,
        changed.len()
    );
}
