import {
	emitFile,
	getDeprecated,
	getDiscriminator,
	getNamespaceFullName,
	getPattern,
	getSourceLocation,
	getTypeName,
	navigateProgram,
} from "@typespec/compiler";
import {
	getAddedOnVersions,
	getRemovedOnVersions,
	getVersion,
} from "@typespec/versioning";
import { relative } from "node:path";

const SCHEMA_VERSION = "1.0.0";
const TARGET_NAMESPACE = "AgentIx.Semantic";

function namespaceOf(type) {
	return type.namespace ? getNamespaceFullName(type.namespace) : "";
}

function sourceOf(type) {
	const location = getSourceLocation(type, { locateId: true });
	if (!location) return "synthetic";
	const marker = `${process.cwd()}/`;
	const path = location.file.path.startsWith(marker)
		? relative(process.cwd(), location.file.path)
		: location.file.path;
	const position = location.file.getLineAndCharacterOfPosition(location.pos);
	return `${path}:${position.line + 1}`;
}

function semanticRole(name, kind) {
	if (kind === "Enum" || kind === "Scalar") return "definition";
	if (name.endsWith("Event")) return "occurrence";
	if (
		name.includes("Run") ||
		name.includes("Evidence") ||
		name.includes("Result")
	) {
		return "observation";
	}
	if (name.endsWith("Message")) return "projection";
	return "definition";
}

function versionRecord(version) {
	return { name: version.name, value: version.value, index: version.index };
}

function metadataOf(program, type) {
	const pattern = getPattern(program, type);
	const discriminator = getDiscriminator(program, type);
	const namespaceVersions = type.namespace
		? getVersion(program, type.namespace)?.getVersions().map(versionRecord)
		: undefined;
	return {
		constraints: pattern ? { pattern } : {},
		discriminator: discriminator?.propertyName ?? null,
		versioning: {
			packageVersions: namespaceVersions ?? [],
			added: (getAddedOnVersions(program, type) ?? []).map(versionRecord),
			removed: (getRemovedOnVersions(program, type) ?? []).map(versionRecord),
		},
		deprecated: getDeprecated(program, type) ?? null,
	};
}

function record(program, type) {
	const packageName = namespaceOf(type);
	const id = `${packageName}.${type.name}`;
	const base = {
		id,
		name: type.name,
		package: packageName,
		kind: type.kind.toLowerCase(),
		role: semanticRole(type.name, type.kind),
		source: sourceOf(type),
		...metadataOf(program, type),
	};
	if (type.kind === "Model") {
		return {
			...base,
			base: type.baseModel ? getTypeName(type.baseModel) : null,
			fields: [...type.properties.values()].map((property) => {
				const fieldType = getTypeName(property.type);
				return {
					name: property.name,
					type: fieldType,
					optional: property.optional,
					nullable: fieldType.includes("null"),
					recursive: fieldType.includes(type.name),
					extensionPoint: fieldType.includes("Record<"),
					source: sourceOf(property),
					...metadataOf(program, property),
				};
			}),
		};
	}
	if (type.kind === "Enum") {
		return {
			...base,
			members: [...type.members.values()].map((member) => ({
				name: member.name,
				value: member.value ?? member.name,
			})),
		};
	}
	return {
		...base,
		base: type.baseScalar ? getTypeName(type.baseScalar) : null,
	};
}

export async function $onEmit(context) {
	const types = new Map();
	const add = (type) => {
		const namespace = namespaceOf(type);
		if (
			type.name &&
			(namespace === TARGET_NAMESPACE ||
				namespace.startsWith(`${TARGET_NAMESPACE}.`))
		) {
			const item = record(context.program, type);
			types.set(item.id, item);
		}
	};
	navigateProgram(context.program, {
		model: add,
		enum: add,
		scalar: add,
	});
	const ir = {
		schemaVersion: SCHEMA_VERSION,
		generator: "@agent-ix/typespec-semantic-ir-emitter-spike@0.0.0",
		types: [...types.values()].sort((left, right) =>
			left.id.localeCompare(right.id),
		),
	};
	await emitFile(context.program, {
		path: `${context.emitterOutputDir}/semantic-ir.json`,
		content: `${JSON.stringify(ir, null, 2)}\n`,
		newLine: "lf",
	});
}
