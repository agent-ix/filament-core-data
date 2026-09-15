//! Runtime evidence that an ordinary Rust crate can consume the packaged kernel.

use agent_ix_semantic_kernel::{
	ClauseRef, ConstraintDecl, FieldDecl, Identifier, KernelScalar, Multiplicity,
	MultiplicityLower, MultiplicityOrdered, MultiplicityUnique, MultiplicityUpper,
	OperationDecl, RelationDecl, TypeRef, TypeRefTarget,
};

const MULTIPLICITY_GOLDEN: &str = include_str!("../fixtures/PAR-0001.json");

fn constructed_field() -> FieldDecl {
	let multiplicity = Multiplicity::try_new(
		MultiplicityLower::try_new(1).expect("lower is valid"),
		Some(MultiplicityUpper::try_new(1).expect("upper is valid")),
		Some(MultiplicityOrdered::try_new(false).expect("ordered is valid")),
		Some(MultiplicityUnique::try_new(false).expect("unique is valid")),
	)
	.expect("multiplicity constructs");
	let target = TypeRef::try_new(
		TypeRefTarget::KernelScalar(KernelScalar::String),
		Some(multiplicity),
		None,
		None,
	)
	.expect("type reference constructs");
	FieldDecl::try_new(
		Identifier::try_new("unitSymbol".to_owned()).expect("identifier constructs"),
		target,
		None,
		None,
		None,
		None,
		None,
	)
	.expect("field declaration constructs")
}

macro_rules! rejects {
	($type:ty, $json:expr $(,)?) => {
		serde_json::from_str::<$type>($json)
			.expect_err("the forbidden document must be rejected")
			.to_string()
	};
}

/// TC-1544: constructs through the generated crate's public root and pins the
/// imports FR-089 requires a consumer to use.
#[test]
fn tc_1544_constructs_a_field_and_imports_the_kernel_surface() {
	let field = constructed_field();
	assert_eq!(field.name.get(), "unitSymbol");
	assert!(field.r#type.multiplicity.is_some());
	let _: Option<(RelationDecl, OperationDecl, ClauseRef, ConstraintDecl)> = None;
}

/// TC-1545: the consumer deserializes a positive FR-090 corpus document.
#[test]
fn tc_1545_deserializes_the_shared_positive_golden() {
	let golden: serde_json::Value = serde_json::from_str(MULTIPLICITY_GOLDEN)
		.expect("PAR-0001 is JSON");
	let value: Multiplicity = serde_json::from_value(
		golden.get("instance").expect("PAR-0001 carries an instance").clone(),
	)
		.expect("PAR-0001 deserializes through the packaged crate");
	assert_eq!(*value.lower.get(), 0);
	assert_eq!(*value.upper.expect("golden carries upper").get(), 1);
}

/// TC-1546: every closed grammar class named by FR-089 is refused with its
/// generated error, rather than merely producing a generic failure.
#[test]
fn tc_1546_rejects_each_closed_grammar_class() {
	let unknown = rejects!(FieldDecl,
		r#"{"name":"unitSymbol","type":{"target":"String"},"undeclared":1}"#,
	);
	assert!(unknown.contains("unknown field `undeclared`"), "{unknown}");

	let missing = rejects!(FieldDecl, r#"{"name":"unitSymbol"}"#);
	assert!(missing.contains("missing field `type`"), "{missing}");

	let scalar = rejects!(KernelScalar, r#""NotAKernelScalar""#);
	assert!(scalar.contains("unknown variant `NotAKernelScalar`"), "{scalar}");

	let constraint = rejects!(ConstraintDecl, r#"{"keyword":"notAKeyword"}"#);
	assert!(constraint.contains("data did not match any variant"), "{constraint}");

	let minimum = rejects!(Multiplicity, r#"{"lower":-1}"#);
	assert!(minimum.contains("keyword min"), "{minimum}");
}

/// TC-1547: identity and source provenance are read from the package itself.
#[test]
fn tc_1547_reads_identity_and_provenance_from_the_package() {
	assert_eq!(kernel_consumer::package_identity(), "agent-ix/semantic-kernel");
	assert_eq!(agent_ix_semantic_kernel::provenance::SOURCE_VERSION, "0.1.0");
	assert_eq!(
		agent_ix_semantic_kernel::provenance::SOURCE_DIGEST,
		"sha256:0000000000000000000000000000000000000000000000000000000000000000",
	);
}
