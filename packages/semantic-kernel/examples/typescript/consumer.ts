/** An ordinary, dependency-free TypeScript consumer of the kernel (FR-089). */

import {
	PROVENANCE,
	TYPE_IDENTITY,
	validateConstraintDecl,
	validateFieldDecl,
	validateKernelScalar,
	validateMultiplicity,
} from "@agent-ix/semantic-agent-ix__semantic-kernel";
import type {
	ClauseRef,
	ConstraintDecl,
	FieldDecl,
	KernelScalar,
	Multiplicity,
	OperationDecl,
	RelationDecl,
	TypeRef,
} from "@agent-ix/semantic-agent-ix__semantic-kernel";
import PAR_0001 from "./PAR-0001.json" with { type: "json" };
import PAR_0027 from "./PAR-0027.json" with { type: "json" };

let assertions = 0;

function assert(condition: unknown, message: string): asserts condition {
	assertions += 1;
	if (!condition) throw new Error(message);
}

function rejected(result: { readonly ok: boolean }, name: string): void {
	assert(
		!result.ok,
		`${name} was accepted where the kernel grammar rejects it`,
	);
}

/** Executes every FR-089 demonstration and returns its non-zero assertion count. */
export function run(): number {
	const field: FieldDecl = {
		name: "unitSymbol",
		type: {
			target: "String",
			multiplicity: { lower: 1, upper: 1, ordered: false, unique: false },
		},
		constraints: [{ keyword: "min", value: 0 }],
	};
	const constructed = validateFieldDecl(field);
	assert(constructed.ok, "a valid FieldDecl with multiplicity was rejected");

	// These declarations are deliberately named through the public type surface:
	// removing or renaming any required import makes this consumer fail to check.
	const imported: readonly [
		TypeRef | undefined,
		Multiplicity | undefined,
		RelationDecl | undefined,
		OperationDecl | undefined,
		ClauseRef | undefined,
		ConstraintDecl | undefined,
		KernelScalar | undefined,
	] = [
		undefined,
		undefined,
		undefined,
		undefined,
		undefined,
		undefined,
		undefined,
	];
	assert(imported.length === 7, "the required public types were not imported");

	const positive = validateMultiplicity(PAR_0001.instance);
	assert(positive.ok, "PAR-0001 did not deserialize");
	if (positive.ok) assert(positive.value.upper === 1, "PAR-0001 lost upper");
	const constraint = validateConstraintDecl(PAR_0027.instance);
	assert(constraint.ok, "PAR-0027 did not preserve its numeric operand");
	if (constraint.ok)
		assert(constraint.value.keyword === "min", "PAR-0027 lost its keyword");

	rejected(
		validateFieldDecl({ ...field, undeclared: 1 }),
		"an undeclared member on a reject record",
	);
	rejected(
		validateFieldDecl({ name: "unitSymbol" }),
		"a missing required member",
	);
	rejected(validateKernelScalar("NotAKernelScalar"), "an unknown KernelScalar");
	rejected(
		validateConstraintDecl({ keyword: "notAKeyword" }),
		"an unknown ConstraintDecl keyword",
	);
	rejected(validateMultiplicity({ lower: -1 }), "a minimum-bound violation");

	assert(
		TYPE_IDENTITY.FieldDecl === "ix://agent-ix/semantic-core/FieldDecl",
		"the package identity metadata is wrong",
	);
	assert(PROVENANCE.sourceVersion === "0.2.0", "the source version is wrong");
	assert(
		PROVENANCE.sourceDigest ===
			"sha256:0000000000000000000000000000000000000000000000000000000000000000",
		"the source digest is wrong",
	);
	assert(assertions > 0, "the consumer executed no assertions");
	return assertions;
}
