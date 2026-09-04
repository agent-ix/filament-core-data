import {
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
import { defaultGeneratorId } from "./identity.mjs";

/**
 * Schema version of the emitted semantic IR. Frozen at the issue #4 prototype
 * value by FR-041-CON-1; revising the emitted shape belongs to issue #19.
 */
export const SEMANTIC_IR_SCHEMA_VERSION = "1.0.0";

const TARGET_NAMESPACE = "AgentIx.Semantic";

/**
 * Locale-independent code-point ordering (FR-041, NFR-017-AC-3).
 * A collator-based comparison varies with the host's ICU data, which would let
 * the emitted order — and therefore every downstream golden — differ between
 * machines. This comparison cannot.
 */
function byCodePoint(left, right) {
	if (left < right) return -1;
	if (left > right) return 1;
	return 0;
}

function namespaceOf(type) {
	return type.namespace ? getNamespaceFullName(type.namespace) : "";
}

function inTargetNamespace(type) {
	const namespace = namespaceOf(type);
	return (
		namespace === TARGET_NAMESPACE ||
		namespace.startsWith(`${TARGET_NAMESPACE}.`)
	);
}

function sourceOf(type, baseDir) {
	const location = getSourceLocation(type, { locateId: true });
	if (!location) return "synthetic";
	const marker = `${baseDir}/`;
	const path = location.file.path.startsWith(marker)
		? relative(baseDir, location.file.path)
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

function record(program, type, baseDir) {
	const packageName = namespaceOf(type);
	const base = {
		id: `${packageName}.${type.name}`,
		name: type.name,
		package: packageName,
		kind: type.kind.toLowerCase(),
		role: semanticRole(type.name, type.kind),
		source: sourceOf(type, baseDir),
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
					source: sourceOf(property, baseDir),
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

/**
 * Build the semantic IR from an already-compiled TypeSpec program.
 *
 * `generator` and `baseDir` are explicit inputs: the identity stamped into the
 * document follows the caller rather than the call site, and source loci are
 * relative to a declared directory rather than an ambient `process.cwd()`.
 */
export function buildSemanticIr(program, options = {}) {
	const { generator = defaultGeneratorId(), baseDir = process.cwd() } = options;
	const types = new Map();
	const add = (type) => {
		if (!type.name || !inTargetNamespace(type)) return;
		const item = record(program, type, baseDir);
		types.set(item.id, item);
	};
	navigateProgram(program, { model: add, enum: add, scalar: add });
	return {
		schemaVersion: SEMANTIC_IR_SCHEMA_VERSION,
		generator,
		types: [...types.values()].sort((left, right) =>
			byCodePoint(left.id, right.id),
		),
	};
}

/**
 * The serialisation every byte-identity criterion in the issue #27 bundle
 * compares against (FR-041).
 */
export function serializeSemanticIr(ir) {
	return `${JSON.stringify(ir, null, 2)}\n`;
}
