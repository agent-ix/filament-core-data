//! The runtime consumption evidence (FR-061, TC-721 through TC-723).
//!
//! Each positive fixture is deserialized through the generated crate, asserted
//! on, re-serialized, and compared to its input under the canonical form
//! FR-059 declares: object members sorted by code point, array order preserved,
//! no insignificant whitespace. Byte identity is asserted only where the crate
//! retained the source bytes — a `SemanticValue::Object`'s member order and its
//! repeated names — because a value whose bytes the crate did not retain has no
//! byte to compare.
//!
//! Each invalid fixture is asserted rejected, with the error the rejection
//! carries named rather than merely counted.

use agent_ix_conformance::support::{SemanticValue, UnknownMembers};
use agent_ix_conformance::{Bundle, Envelope, Node, Payload, Root, Status};

// ---------------------------------------------------------------------------
// The fixtures, embedded so the test binary carries them into the scratch
// directory it is built in.
// ---------------------------------------------------------------------------

const ROOT: &str = include_str!("../fixtures/positive/root.json");
const NODE_MINIMAL: &str = include_str!("../fixtures/positive/node-minimal.json");
const NODE_FULL: &str = include_str!("../fixtures/positive/node-full.json");
const NODE_PAYLOAD_COUNT: &str = include_str!("../fixtures/positive/node-payload-count.json");
const BUNDLE: &str = include_str!("../fixtures/positive/bundle.json");
const ENVELOPE_PRESERVE: &str = include_str!("../fixtures/positive/envelope-preserve.json");

/// A retained object with a repeated member name.
///
/// It is a literal rather than a fixture file because a JSON document carrying
/// one is exactly what this repository's JSON linter refuses to hold, and the
/// retention of a repeated name is a fact about the crate that has to be
/// measured somewhere.
const REPEATED_NAME: &str = r#"{"label":"kept","dup":{"x":1,"x":2}}"#;

const MISSING_REQUIRED_MEMBER: &str = include_str!("../fixtures/invalid/missing-required-member.json");
const UNKNOWN_MEMBER_ON_REJECT: &str = include_str!("../fixtures/invalid/unknown-member-on-reject.json");
const OUT_OF_RANGE: &str = include_str!("../fixtures/invalid/out-of-range.json");
const PATTERN_VIOLATION: &str = include_str!("../fixtures/invalid/pattern-violation.json");
const DUPLICATE_UNIQUE_ITEM: &str = include_str!("../fixtures/invalid/duplicate-unique-item.json");
const BELOW_MULTIPLICITY_LOWER: &str = include_str!("../fixtures/invalid/below-multiplicity-lower.json");
const UNKNOWN_ENUM_VARIANT: &str = include_str!("../fixtures/invalid/unknown-enum-variant.json");
const REQUIRED_EXTENSION: &str = include_str!("../fixtures/invalid/required-extension.json");

// ---------------------------------------------------------------------------
// The canonical form FR-059 declares.
// ---------------------------------------------------------------------------

/// Renders JSON text in the declared canonical form.
///
/// `serde_json::Value`'s default map is a `BTreeMap`, so member order is by
/// code point; array order is preserved; `to_string` writes no insignificant
/// whitespace. The fixtures carry integer numbers only, so the ECMAScript
/// `Number::toString` rendering and `serde_json`'s agree on every number that
/// reaches this function.
fn canonical(text: &str) -> String {
    let value: serde_json::Value =
        serde_json::from_str(text.trim()).expect("the fixture is well-formed JSON");
    serde_json::to_string(&value).expect("a parsed value re-serializes")
}

/// Asserts a value of the named generated type round-trips to canonical
/// equality with its input.
///
/// It is a macro rather than a generic function on purpose: a generic bound
/// would have to name `serde::de::DeserializeOwned`, and `serde` is not a
/// dependency of this consumer. FR-061 declares the dependency set to be the
/// generated crate and `serde_json`, and nothing else.
macro_rules! assert_round_trip {
    ($type:ty, $name:expr, $source:expr) => {{
        let value: $type = serde_json::from_str($source.trim())
            .unwrap_or_else(|error| panic!("{} did not deserialize: {}", $name, error));
        let written = serde_json::to_string(&value).expect("the value re-serializes");
        assert_eq!(
            canonical(&written),
            canonical($source),
            "{} did not round-trip to canonical equality",
            $name
        );
    }};
}

/// The rejection an invalid fixture produced, as the error's own text.
macro_rules! rejection {
    ($type:ty, $source:expr) => {
        match serde_json::from_str::<$type>($source.trim()) {
            Ok(_) => panic!("the fixture was accepted where the contract rejects it"),
            Err(error) => error.to_string(),
        }
    };
}

// ---------------------------------------------------------------------------
// TC-721: the positive fixtures.
// ---------------------------------------------------------------------------

/// TC-721: every positive fixture deserializes, carries the values the fixture
/// states, and round-trips to canonical equality.
#[test]
fn tc_721_positive_fixtures_round_trip() {
    let root: Root = serde_json::from_str(ROOT.trim()).expect("root.json deserializes");
    assert_eq!(root.name.get(), "alpha");
    assert_eq!(root.node.get().as_str(), "ix://agent-ix/conformance/node/1");
    assert_round_trip!(Root, "root.json", ROOT);

    let minimal: Node =
        serde_json::from_str(NODE_MINIMAL.trim()).expect("node-minimal.json deserializes");
    assert_eq!(minimal.id.get(), "n1");
    assert_eq!(minimal.status, Status::Draft);
    assert!(minimal.label.is_none());
    assert!(minimal.children.is_none());
    assert_round_trip!(Node, "node-minimal.json", NODE_MINIMAL);

    let full: Node = serde_json::from_str(NODE_FULL.trim()).expect("node-full.json deserializes");
    assert_eq!(full.status, Status::Final);
    assert!(
        full.label.as_ref().expect("label is present").is_null(),
        "a present JSON null is a present member, not an absent one"
    );
    assert_eq!(full.children.as_ref().expect("children present").len(), 2);
    assert_eq!(full.tags.as_ref().expect("tags present").get().len(), 2);
    assert_eq!(full.attrs.as_ref().expect("attrs present").get().len(), 1);
    assert!(matches!(full.payload, Some(Payload::Text(_))));
    assert_round_trip!(Node, "node-full.json", NODE_FULL);

    let counted: Node = serde_json::from_str(NODE_PAYLOAD_COUNT.trim())
        .expect("node-payload-count.json deserializes");
    match counted.payload.as_ref().expect("payload present") {
        Payload::Count(count) => assert_eq!(*count.get(), 42),
        other => panic!("expected a count payload, found {other:?}"),
    }
    assert_round_trip!(Node, "node-payload-count.json", NODE_PAYLOAD_COUNT);

    let bundle: Bundle = serde_json::from_str(BUNDLE.trim()).expect("bundle.json deserializes");
    assert_eq!(bundle.parts.len(), 2);
    assert_round_trip!(Bundle, "bundle.json", BUNDLE);

    let envelope: Envelope =
        serde_json::from_str(ENVELOPE_PRESERVE.trim()).expect("envelope-preserve.json deserializes");
    assert_eq!(envelope.label.get(), "kept");
    assert_round_trip!(Envelope, "envelope-preserve.json", ENVELOPE_PRESERVE);
}

// ---------------------------------------------------------------------------
// TC-723: the `preserve` policy.
// ---------------------------------------------------------------------------

/// The retained member named `name`, or a panic naming what was retained.
fn retained<'a>(members: &'a UnknownMembers, name: &str) -> &'a SemanticValue {
    members
        .members()
        .get(name)
        .unwrap_or_else(|| panic!("`{name}` was not retained; retained: {members:?}"))
}

/// TC-723: an unknown member on a `preserve` type survives the round trip —
/// canonically equal, and byte-identical in the members whose source bytes the
/// crate retained.
#[test]
fn tc_723_preserve_type_retains_unknown_members() {
    let envelope: Envelope =
        serde_json::from_str(ENVELOPE_PRESERVE.trim()).expect("envelope-preserve.json deserializes");

    assert_eq!(
        envelope.unknown_members.len(),
        2,
        "two members the contract does not declare arrived"
    );

    // Member order inside a retained object is a fact about the value, so it
    // is retained and asserted byte for byte rather than canonically.
    let extra = retained(&envelope.unknown_members, "extra");
    assert_eq!(
        serde_json::to_string(extra).expect("the retained value re-serializes"),
        "{\"b\":1,\"a\":2}",
        "the retained object did not keep its arrival order"
    );

    // A repeated name is a second fact a map would have discarded. It is
    // written here rather than in a fixture file because a JSON document with
    // a repeated member name is exactly what a JSON linter refuses to hold.
    let repeated: Envelope = serde_json::from_str(REPEATED_NAME)
        .expect("a preserve record accepts a retained object with a repeated name");
    let dup = retained(&repeated.unknown_members, "dup");
    match dup {
        SemanticValue::Object(members) => {
            assert_eq!(members.len(), 2, "the repeated name was collapsed");
            assert_eq!(members[0].0, "x");
            assert_eq!(members[1].0, "x");
        }
        other => panic!("expected a retained object, found {other:?}"),
    }
    assert_eq!(
        serde_json::to_string(dup).expect("the retained value re-serializes"),
        "{\"x\":1,\"x\":2}"
    );

    assert_eq!(retained(&envelope.unknown_members, "flag"), &SemanticValue::Bool(true));

    // A `preserve` policy raises no diagnostic; a `surface` policy does.
    assert!(envelope.validate().is_empty());

    let surfaced: Payload = serde_json::from_str("{\"other\":1}").expect("a surface union accepts");
    assert_eq!(surfaced.validate().len(), 1);
    assert_eq!(
        surfaced.validate()[0].code(),
        "agent-ix.rust-backend.UNKNOWN_MEMBER_SURFACED"
    );

    // The same member is outside a `reject` type's accepted input space.
    let error = rejection!(Root, UNKNOWN_MEMBER_ON_REJECT);
    assert!(
        error.contains("unknown field `surprise`"),
        "expected an unknown-field rejection, found {error}"
    );
}

// ---------------------------------------------------------------------------
// TC-722: the eight invalid classes.
// ---------------------------------------------------------------------------

/// TC-722, class 1: a missing required member.
#[test]
fn tc_722_missing_required_member() {
    let error = rejection!(Root, MISSING_REQUIRED_MEMBER);
    assert!(
        error.contains("missing field `name`"),
        "found {error}"
    );
}

/// TC-722, class 2: an unknown member on a `reject` type.
#[test]
fn tc_722_unknown_member_on_reject_type() {
    let error = rejection!(Root, UNKNOWN_MEMBER_ON_REJECT);
    assert!(
        error.contains("unknown field `surprise`"),
        "found {error}"
    );
}

/// TC-722, class 3: an out-of-range constrained value.
#[test]
fn tc_722_out_of_range_constrained_value() {
    let error = rejection!(Node, OUT_OF_RANGE);
    assert!(
        error.contains("ix://agent-ix/conformance/constraint/count-min")
            && error.contains("keyword min")
            && error.contains("operand 0"),
        "found {error}"
    );
}

/// TC-722, class 4: a pattern violation.
#[test]
fn tc_722_pattern_violation() {
    let error = rejection!(Root, PATTERN_VIOLATION);
    assert!(
        error.contains("keyword pattern") && error.contains("input not-an-identity"),
        "found {error}"
    );
}

/// TC-722, class 5: a duplicate item on a `unique` collection.
#[test]
fn tc_722_duplicate_item_on_unique_collection() {
    let error = rejection!(Node, DUPLICATE_UNIQUE_ITEM);
    assert!(
        error.contains("keyword multiplicity.unique")
            && error.contains("ix://agent-ix/conformance/field/node-children"),
        "found {error}"
    );
}

/// TC-722, class 6: a collection below `multiplicity.lower`.
#[test]
fn tc_722_collection_below_multiplicity_lower() {
    let error = rejection!(Bundle, BELOW_MULTIPLICITY_LOWER);
    assert!(
        error.contains("keyword multiplicity.lower")
            && error.contains("ix://agent-ix/conformance/field/bundle-parts")
            && error.contains("operand 2"),
        "found {error}"
    );
}

/// TC-722, class 7: an unknown variant of a closed enum.
#[test]
fn tc_722_unknown_closed_enum_variant() {
    let error = rejection!(Node, UNKNOWN_ENUM_VARIANT);
    assert!(
        error.contains("unknown variant `archived`"),
        "found {error}"
    );
}

/// TC-722, class 8: a required extension the crate does not admit.
///
/// The contract declares `ix://agent-ix/conformance/ext/sealing` `required`, so
/// the generated metadata carries it with `required: true`. No generated type
/// admits it as a member: `Bundle`'s unknown policy is `reject`, so a value
/// carrying the extension is refused rather than retained. The assertion names
/// both halves — the metadata the crate carries and the refusal it produces —
/// because the refusal alone would be indistinguishable from class 2.
#[test]
fn tc_722_required_extension_the_crate_does_not_admit() {
    let sealing = agent_ix_conformance::metadata::PACKAGE_EXTENSIONS
        .iter()
        .find(|entry| entry.identity == "ix://agent-ix/conformance/ext/sealing")
        .expect("the contract declares the sealing extension");
    assert!(sealing.required, "the extension is a required one");
    assert_eq!(sealing.capability, Some("sealing"));

    let admits_it = agent_ix_conformance::TYPES.iter().any(|entry| {
        entry.unknown_policy != "reject"
            && entry
                .extensions
                .iter()
                .any(|extension| extension.identity == sealing.identity)
    });
    assert!(!admits_it, "no generated type admits the extension");

    let error = rejection!(Bundle, REQUIRED_EXTENSION);
    assert!(
        error.contains("unknown field `ix://agent-ix/conformance/ext/sealing`"),
        "found {error}"
    );
}

// ---------------------------------------------------------------------------
// The consumer reads the packaged crate, not the generator's tree.
// ---------------------------------------------------------------------------

/// TC-719: the crate under test is the packaged one, identified by the
/// provenance constants it carries.
#[test]
fn tc_719_reads_the_packaged_crate() {
    assert_eq!(consumer_runtime::package_identity(), "agent-ix/conformance");
    assert_eq!(consumer_runtime::exported_type_count(), 12);
}
