/** SysML v2 textual projection of contract IR (FR-138, FR-144). */
import { DIAGNOSTIC_CODES, diagnostic, fragment } from "../../diagnostics.mjs";

const SCALARS = Object.freeze({
	boolean: "ScalarValues::Boolean",
	integer: "ScalarValues::Integer",
	decimal: "ScalarValues::Real",
	float32: "ScalarValues::Real",
	float64: "ScalarValues::Real",
	string: "ScalarValues::String",
});

const KIND_CONSTRUCTS = Object.freeze({
	record: "item def",
	enum: "enum def",
	alias: "alias",
	scalar: "ScalarValues",
});

const IDENTIFIER = /^[A-Za-z_][A-Za-z_0-9]*$/;

function sourceLocus(node) {
	return node?.origin?.source;
}

function unsupported(node, reason, diagnostics) {
	diagnostics.push(
		diagnostic(DIAGNOSTIC_CODES.SYSML_UNSUPPORTED_CONSTRUCT, {
			message: `${fragment(node?.identity ?? node?.name ?? "node")}: ${reason}`,
			...(sourceLocus(node) ? { locus: sourceLocus(node) } : {}),
		}),
	);
}

function identifier(name, node, diagnostics) {
	if (IDENTIFIER.test(name ?? "")) return name;
	unsupported(
		node,
		`name ${fragment(name)} is not a SysML identifier`,
		diagnostics,
	);
	return null;
}

function scalarName(type) {
	return type?.kind === "scalar" ? SCALARS[type.scalar] : undefined;
}

function refuseUnmappedMembers(node, names, diagnostics) {
	for (const name of names) {
		for (const member of node[name] ?? []) {
			unsupported(member, `${name} has no SysML mapping`, diagnostics);
		}
	}
}

function fieldType(field, types, diagnostics) {
	const type = types.get(field.typeRef);
	if (!type) {
		unsupported(
			field,
			`type ${fragment(field.typeRef)} has no SysML mapping`,
			diagnostics,
		);
		return null;
	}
	const scalar = scalarName(type);
	if (scalar) {
		if (
			type.scalar === "decimal" ||
			type.scalar === "float32" ||
			type.scalar === "float64"
		) {
			const lost =
				type.scalar === "decimal"
					? `decimal policy precision ${type.decimal?.precision}, scale ${type.decimal?.scale}`
					: `${type.scalar} width ${type.scalar === "float32" ? 32 : 64}`;
			diagnostics.push(
				diagnostic(DIAGNOSTIC_CODES.SYSML_DECLARED_LOSS, {
					message: `field ${fragment(field.name)} maps ${type.scalar} to ScalarValues::Real and loses ${lost}`,
					...(sourceLocus(field) ? { locus: sourceLocus(field) } : {}),
				}),
			);
		}
		return scalar;
	}
	if (type.kind === "record" || type.kind === "enum")
		return identifier(type.displayName, type, diagnostics);
	unsupported(
		field,
		`type ${fragment(field.typeRef)} has no SysML field mapping`,
		diagnostics,
	);
	return null;
}

function renderRecord(type, types, diagnostics) {
	const name = identifier(type.displayName, type, diagnostics);
	if (!name) return null;
	const fields = [];
	for (const field of type.fields ?? []) {
		refuseUnmappedMembers(field, ["constraints", "extensions"], diagnostics);
		if (field.defaultKind !== "none" || field.nullable === true) {
			unsupported(
				field,
				"field default or nullability has no SysML mapping",
				diagnostics,
			);
		}
		const fieldName = identifier(field.name, field, diagnostics);
		const target = fieldType(field, types, diagnostics);
		if (!fieldName || !target) continue;
		const multiplicity = field.multiplicity;
		const lower = multiplicity?.lower ?? 1;
		const upper = multiplicity?.upper ?? "*";
		const cardinality =
			lower === 1 && upper === 1 ? "" : ` [${lower}..${upper}]`;
		fields.push(`    attribute ${fieldName} : ${target}${cardinality};`);
	}
	return [`  item def ${name} {`, ...fields, "  }"].join("\n");
}

function renderEnum(type, diagnostics) {
	const name = identifier(type.displayName, type, diagnostics);
	if (!name) return null;
	const variants = [];
	for (const variant of type.variants ?? []) {
		const variantName = identifier(variant.name, type, diagnostics);
		if (variantName) variants.push(`    ${variantName};`);
	}
	return [`  enum def ${name} {`, ...variants, "  }"].join("\n");
}

function renderType(type, types, diagnostics) {
	refuseUnmappedMembers(
		type,
		[
			"clauses",
			"constraints",
			"extensions",
			"operations",
			"relationships",
			"members",
		],
		diagnostics,
	);
	if (!Object.hasOwn(KIND_CONSTRUCTS, type.kind)) {
		unsupported(
			type,
			`kind ${fragment(type.kind)} has no SysML mapping`,
			diagnostics,
		);
		return null;
	}
	if (type.kind === "scalar") {
		if (!scalarName(type))
			unsupported(
				type,
				`scalar ${fragment(type.scalar)} has no SysML mapping`,
				diagnostics,
			);
		return null;
	}
	if (type.kind === "record") return renderRecord(type, types, diagnostics);
	if (type.kind === "enum") return renderEnum(type, diagnostics);
	const name = identifier(type.displayName, type, diagnostics);
	const target = types.get(type.target);
	const targetName =
		scalarName(target) ??
		identifier(target?.displayName, target ?? type, diagnostics);
	if (!name || !targetName) return null;
	return `  alias ${name} for ${targetName};`;
}

/** Seam-facing backend; emission has no IO or process effects. */
export const sysmlBackend = Object.freeze({
	identity: "ix://agent-ix/filament-core-data/sysml-target",
	version: "0.1.0",
	target: "sysml-v2-textual",
	owningIssue: "agent-ix/filament-core-data#37",
	supportedIrVersions: Object.freeze(["2.0.0"]),
	supportedFeatures: Object.freeze(Object.keys(KIND_CONSTRUCTS)),
	generate(request) {
		const ir = request.ir;
		const diagnostics = [];
		const types = new Map(
			(ir.types ?? []).map((type) => [type.identity, type]),
		);
		const packageName = "Model";
		const definitions = [];
		refuseUnmappedMembers(ir, ["extensions", "constructs"], diagnostics);
		for (const type of ir.types ?? []) {
			const definition = renderType(type, types, diagnostics);
			if (definition) definitions.push(definition);
		}
		for (const occurrence of ir.occurrences ?? []) {
			unsupported(occurrence, "occurrence has no SysML mapping", diagnostics);
		}
		if (diagnostics.some((entry) => entry.blocking)) {
			return { state: "unsupported", files: [], diagnostics };
		}
		const provenance = `source ${ir.source?.identity}; digest ${ir.source?.digest}; contract ${ir.contractVersion}; generator ${sysmlBackend.identity}`;
		const text = [
			`package ${packageName} {`,
			`  doc /* ${provenance} */`,
			...definitions,
			"}",
			"",
		].join("\n");
		return {
			state: "success",
			files: [
				{
					path: "model.sysml",
					mediaType: "text/x-sysml",
					identities: (ir.types ?? [])
						.filter((type) => type.kind !== "scalar")
						.map((type) => type.identity),
					text,
				},
			],
			diagnostics,
		};
	},
});
