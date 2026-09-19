/**
 * The lowering from a compiled TypeSpec program to contract semantic IR 2.0.0
 * (FR-046, FR-053).
 *
 * The rule this module is written to obey is negative: **no IR value is derived
 * from a declaration's spelling.** The prototype emitter that issue #27 promoted
 * decides a type's `role` by asking whether its name ends in `Event`, and its
 * `nullable` by asking whether the rendered type name contains the substring
 * `null`. Both are heuristics that happen to work on one package, and both are
 * frozen there deliberately (FR-041-CON-1) rather than carried forward. Here a
 * role comes from `@role`, nullability comes from the union's variant types, and
 * a structural kind comes from a closed, first-match table over what the
 * declaration *is*.
 *
 * The lowering is a pure function of the compiled program and the resolved
 * package: no clock, no environment, no working directory, no file system.
 */
import {
	getDoc,
	getFormat,
	getMaxLength,
	getMaxValue,
	getMaxValueExclusive,
	getMinItems,
	getMinLength,
	getMinValue,
	getMinValueExclusive,
	getNamespaceFullName,
	getPattern,
	getSourceLocation,
	navigateProgram,
} from "@typespec/compiler";
import {
	DEFAULT_LIMITS,
	DIAGNOSTIC_CODES,
	diagnostic,
	fragment,
} from "../../diagnostics.mjs";
import {
	constraintDiagnosticCode,
	mintIdentity,
	nativeTypeRef,
	slug,
} from "./identity.mjs";
import { applies } from "../../ir/applicability.mjs";
import {
	defects as decoratorDefects,
	read as readState,
} from "./vocabulary.mjs";

const TARGET_NAMESPACE = "AgentIx.Semantic";

/** Built-in TypeSpec scalar to IR scalar. Closed: an unmapped base is a defect. */
const BUILTIN_SCALARS = new Map([
	["boolean", "boolean"],
	["int8", "integer"],
	["int16", "integer"],
	["int32", "integer"],
	["int64", "integer"],
	["integer", "integer"],
	["safeint", "integer"],
	["uint8", "integer"],
	["uint16", "integer"],
	["uint32", "integer"],
	["uint64", "integer"],
	["float", "number"],
	["float32", "number"],
	["float64", "number"],
	["decimal", "number"],
	["decimal128", "number"],
	["numeric", "number"],
	["string", "string"],
	["url", "string"],
	["bytes", "bytes"],
	["plainDate", "date"],
	["plainTime", "datetime"],
	["utcDateTime", "datetime"],
	["offsetDateTime", "datetime"],
	["duration", "duration"],
]);

/**
 * IR scalar to the FR-032 kernel scalar a package-local definition is named for.
 *
 * The table is the shared vocabulary, so it is complete against FR-032 rather
 * than trimmed to what this frontend reaches. `uuid` is here and unreachable
 * from TypeSpec: no built-in maps to it, and a package that wants one declares a
 * scalar with a `format` constraint. `any` is named `JsonObject`, the kernel
 * scalar `packages/semantic-core/kernel-scalars.json` declares over it, so a
 * TypeSpec `unknown` and a spec bundle's `JsonObject` cell mint one identity.
 */
const KERNEL_NAMES = new Map([
	["any", "JsonObject"],
	["boolean", "Boolean"],
	["integer", "Integer"],
	["number", "Decimal"],
	["string", "String"],
	["bytes", "Bytes"],
	["datetime", "Timestamp"],
	["duration", "Duration"],
	["uuid", "UUID"],
]);

/** The `ix://quire/native/<Name>` prefix a kernel scalar reference takes. */
const NATIVE_PREFIX = "ix://quire/native/";

/** `KERNEL_NAMES` inverted: the kernel name to the IR scalar it resolves
 * to, for reading a native reference back (gap 1 of FCD #199/#200). */
const NATIVE_IR_SCALARS = new Map(
	Array.from(KERNEL_NAMES, ([irScalar, name]) => [name, irScalar]),
);

const EXTENSION_BASE = "ix://agent-ix/semantic-core/ext";

function byCodePoint(left, right) {
	if (left < right) return -1;
	if (left > right) return 1;
	return 0;
}

function byIdentity(left, right) {
	return byCodePoint(String(left.identity), String(right.identity));
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

/** Walks a scalar's base chain to the first name the built-in table knows. */
function builtinBase(scalar) {
	let current = scalar;
	while (current) {
		if (BUILTIN_SCALARS.has(current.name)) return current.name;
		current = current.baseScalar;
	}
	return undefined;
}

export function createLowering(options) {
	const {
		program,
		packageIdentity,
		packageRoot,
		sourceIdentity,
		packageRoots = [],
	} = options;
	const diagnostics = [];
	const state = (key, target) => readState(program, key, target);

	const posix = (path) => path.split(/[\\/]/).join("/");

	/** The package-root-relative locus of a declaration, or `undefined`. */
	const locusOf = (target, node) => {
		const location = node
			? getSourceLocation(node)
			: getSourceLocation(target, { locateId: true });
		if (!location?.file) return undefined;
		const filePath = location.file.path;
		const marker = `${packageRoot}/`;
		if (!filePath.startsWith(marker)) return undefined;
		const position = location.file.getLineAndCharacterOfPosition(location.pos);
		return {
			sourceIdentity,
			path: posix(filePath.slice(marker.length)),
			startLine: position.line + 1,
			startColumn: position.character + 1,
		};
	};

	const spanOf = (target, node) => {
		const start = locusOf(target, node);
		if (!start) return undefined;
		const location = node
			? getSourceLocation(node)
			: getSourceLocation(target, { locateId: true });
		const end = location.file.getLineAndCharacterOfPosition(location.end);
		return { ...start, endLine: end.line + 1, endColumn: end.character + 1 };
	};

	/** The declared roots a source file may legitimately come from. */
	const knownRoots = [packageRoot, ...packageRoots].filter(Boolean);

	/** Where a declaration's file is, or `undefined` when it has none. */
	const fileOf = (target, node) => {
		const location = node
			? getSourceLocation(node)
			: getSourceLocation(target, { locateId: true });
		return location?.file?.path;
	};

	/**
	 * An origin for a declaration the package owns, or a generated one for a
	 * declaration reached through an imported package — whose file cannot be
	 * named by a package-root-relative path, because `sourceLocus.path` forbids
	 * `..`. A file under no declared root at all is a defect, not a generated
	 * origin: inventing provenance for it would hide where it came from.
	 */
	const originOf = (target, node) => {
		const locus = locusOf(target, node);
		if (locus) return { source: locus };
		const file = fileOf(target, node);
		if (file && !knownRoots.some((known) => file.startsWith(`${known}/`))) {
			diagnostics.push(
				diagnostic(DIAGNOSTIC_CODES.SOURCE_OUTSIDE_PACKAGE, {
					message: `a declaration's source file lies beneath no declared package root`,
				}),
			);
		}
		return {
			generated: {
				generatorIdentity: "ix://agent-ix/filament-core-data/compiler/typespec",
				generatorVersion: "1.1.0",
				inputIdentities: [sourceIdentity],
			},
		};
	};

	const raise = (entry, message, locus, related) => {
		diagnostics.push(
			diagnostic(entry, {
				message,
				...(locus ? { locus } : {}),
				...(related?.length ? { related } : {}),
			}),
		);
	};

	return {
		diagnostics,
		state,
		locusOf,
		spanOf,
		originOf,
		raise,
		posix,
		program,
		packageIdentity,
		sourceIdentity,
	};
}

/** The declared members of the target namespace, in a stable order. */
function collectDeclarations(program) {
	const declarations = [];
	const add = (type) => {
		if (!type.name || typeof type.name !== "string") return;
		if (!inTargetNamespace(type)) return;
		declarations.push(type);
	};
	const interfaces = [];
	navigateProgram(program, {
		model: add,
		enum: add,
		scalar: add,
		union: add,
		interface: (type) => {
			if (inTargetNamespace(type)) interfaces.push(type);
		},
	});
	declarations.sort((left, right) => byCodePoint(left.name, right.name));
	interfaces.sort((left, right) => byCodePoint(left.name, right.name));
	return { declarations, interfaces };
}

/** The first-match structural-kind classification of FR-046. */
export function classify(type, context) {
	if (type.kind === "Model") {
		if (context.state("semanticReference", type)) {
			const hasMembers = type.properties.size > 0 || Boolean(type.indexer);
			return hasMembers ? { kind: "invalid-reference" } : { kind: "reference" };
		}
		if (type.indexer) {
			const key = type.indexer.key?.name;
			if (key === "integer") return { kind: "sequence" };
			if (key === "string") return { kind: "map" };
			return { kind: "unsupported" };
		}
		return { kind: "record" };
	}
	if (type.kind === "Scalar") {
		if (type.baseScalar && inTargetNamespace(type.baseScalar)) {
			return { kind: "alias", target: type.baseScalar };
		}
		const base = builtinBase(type);
		return base
			? { kind: "scalar", scalar: BUILTIN_SCALARS.get(base) }
			: { kind: "unsupported-scalar" };
	}
	if (type.kind === "Enum") return { kind: "enum" };
	if (type.kind === "Union") return { kind: "union" };
	return { kind: "unsupported" };
}

export {
	BUILTIN_SCALARS,
	KERNEL_NAMES,
	EXTENSION_BASE,
	TARGET_NAMESPACE,
	byIdentity,
	byCodePoint,
	collectDeclarations,
	builtinBase,
	inTargetNamespace,
	namespaceOf,
};

/**
 * Lowers one compiled program into a contract IR `2.0.0` document.
 *
 * Returns `{ ir, diagnostics }`. `ir` is `null` whenever any diagnostic blocks,
 * because a caller must never be able to mistake a partial document for a
 * complete one (FR-045-CON-2).
 */
export function lowerProgram(options) {
	const context = createLowering(options);
	const { program, packageIdentity, sourceIdentity } = context;
	const { declarations, interfaces } = collectDeclarations(program);

	const byName = new Map();
	for (const declaration of declarations) {
		const previous = byName.get(declaration.name);
		if (previous) continue;
		byName.set(declaration.name, declaration);
	}

	// Slug collisions are caught before anything is minted: two distinct names
	// that reduce to one identity would otherwise produce a document in which two
	// declarations claim to be the same thing.
	const seenSlugs = new Map();
	for (const declaration of declarations) {
		const key = slug(declaration.name);
		const first = seenSlugs.get(key);
		if (first && first !== declaration.name) {
			context.raise(
				DIAGNOSTIC_CODES.UNSLUGGABLE_NAME,
				`${fragment(declaration.name)} and ${fragment(first)} reduce to the same identity ${fragment(key)}`,
				context.locusOf(declaration),
			);
		} else if (!first) {
			seenSlugs.set(key, declaration.name);
		}
	}

	// Decorator argument defects and second applications are collected while the
	// program compiles; they surface here so they carry the same registry codes,
	// the same locus discipline and the same ordering as everything else.
	for (const defect of decoratorDefects(program)) {
		if (defect.kind === "duplicate") {
			// `DecoratorContext` exposes the decorated target, not the application,
			// so both applications share one node. The applications are recoverable
			// from the target's own decorator list, in source order, which is what
			// lets the diagnostic land on the *second* one and name the first.
			const applications = (defect.target?.decorators ?? [])
				.filter(
					(item) =>
						`@${item.definition?.name ?? item.decorator?.name ?? ""}`.replace(
							/^@@/,
							"@",
						) === defect.decorator,
				)
				.map((item) => item.node)
				.filter(Boolean)
				.sort((left, right) => (left.pos ?? 0) - (right.pos ?? 0));
			const second = applications[1] ?? defect.node;
			const first = applications[0];
			context.raise(
				DIAGNOSTIC_CODES.DUPLICATE_DECORATOR,
				`${fragment(defect.decorator)} is applied more than once to one declaration`,
				context.locusOf(defect.target, second),
				first && first !== second
					? [context.locusOf(defect.target, first)].filter(Boolean)
					: [],
			);
			continue;
		}
		context.raise(
			DIAGNOSTIC_CODES.INVALID_DECORATOR_ARGUMENT,
			`${fragment(defect.decorator)} parameter ${fragment(defect.parameter)} expects ${fragment(defect.expected)}, got ${fragment(defect.value)}`,
			context.locusOf(defect.target, defect.node),
		);
	}

	// A kernel scalar mints no package node (gap 1 of FCD #199/#200): the
	// `typeRef` is its native reference, resolved by `resolvedKindOf` below
	// without a `definitions` lookup.
	const useKernel = (irScalar, at) => {
		const name = KERNEL_NAMES.get(irScalar);
		if (!name) {
			context.raise(
				DIAGNOSTIC_CODES.UNSUPPORTED_SCALAR_BASE,
				`the IR scalar ${fragment(irScalar)} has no kernel scalar, so it cannot be used directly as a member type; declare a package scalar over it`,
				at,
			);
			return undefined;
		}
		return nativeTypeRef(name);
	};

	const typeIdentity = (name) => mintIdentity(packageIdentity, "type", [name]);

	/** Resolves a member type to an IR `typeRef`, minting a kernel definition if needed. */
	const resolveMemberType = (type, at) => {
		if (!type) return undefined;
		if (type.kind === "Intrinsic" && type.name === "unknown")
			return useKernel("any", at);
		if (type.kind === "Scalar") {
			if (inTargetNamespace(type) && byName.has(type.name)) {
				return typeIdentity(type.name);
			}
			const base = builtinBase(type);
			if (!base) {
				context.raise(
					DIAGNOSTIC_CODES.UNSUPPORTED_SCALAR_BASE,
					`${fragment(type.name)} extends no built-in scalar this compiler maps`,
					at,
				);
				return undefined;
			}
			return useKernel(BUILTIN_SCALARS.get(base), at);
		}
		if (
			(type.kind === "Model" ||
				type.kind === "Enum" ||
				type.kind === "Union") &&
			inTargetNamespace(type) &&
			byName.has(type.name)
		) {
			return typeIdentity(type.name);
		}
		return undefined;
	};

	/** Strips the `null` variant, reporting whether it was there. */
	const unwrapNullable = (type) => {
		if (type?.kind !== "Union") return { type, nullable: false };
		const variants = [...type.variants.values()];
		const nulls = variants.filter(
			(variant) =>
				variant.type.kind === "Intrinsic" && variant.type.name === "null",
		);
		if (nulls.length === 0) return { type, nullable: false };
		const rest = variants.filter((variant) => !nulls.includes(variant));
		return {
			type: rest.length === 1 ? rest[0].type : undefined,
			nullable: true,
		};
	};

	/** Anonymous `T[]` / `Record<T>` used inline on a property. */
	const collectionItem = (type) => {
		if (type?.kind !== "Model" || !type.indexer) return undefined;
		if (type.name && byName.has(type.name)) return undefined;
		return type.indexer.key?.name === "integer"
			? type.indexer.value
			: undefined;
	};

	const decoratorLocus = (record, target) =>
		context.locusOf(target, record?.node) ?? context.locusOf(target);

	/** The core constraint decorators, lowered to the closed keyword set. */
	const constraintsOf = (target) => {
		const found = [];
		const push = (keyword, operands, decorator) =>
			found.push({ keyword, operands, decorator });
		const min = getMinValue(program, target);
		if (min !== undefined) push("min", { value: min }, "@minValue");
		const max = getMaxValue(program, target);
		if (max !== undefined) push("max", { value: max }, "@maxValue");
		const exclusiveMin = getMinValueExclusive(program, target);
		if (exclusiveMin !== undefined)
			push("exclusiveMin", { value: exclusiveMin }, "@minValueExclusive");
		const exclusiveMax = getMaxValueExclusive(program, target);
		if (exclusiveMax !== undefined)
			push("exclusiveMax", { value: exclusiveMax }, "@maxValueExclusive");
		const pattern = getPattern(program, target);
		if (pattern !== undefined)
			push("pattern", { regex: pattern, dialect: "ecma-262" }, "@pattern");
		const minLength = getMinLength(program, target);
		if (minLength !== undefined)
			push("minLength", { value: minLength }, "@minLength");
		const maxLength = getMaxLength(program, target);
		if (maxLength !== undefined)
			push("maxLength", { value: maxLength }, "@maxLength");
		const minItems = getMinItems(program, target);
		if (minItems !== undefined && minItems >= 1)
			push("nonEmpty", {}, "@minItems");
		const format = getFormat(program, target);
		if (format !== undefined) push("format", { name: format }, "@format");
		// Collection uniqueness has exactly one home in this frontend:
		// `multiplicity.unique`. Issue #34's own integrity review (SR-029 FND-059)
		// recorded that `multiplicity.unique` and the `unique` constraint keyword
		// are two homes for one fact with no rule saying which a declaration uses.
		// An inline collection field has no sequence *definition* to attach a
		// constraint to — its typeRef is the item type — so emitting one here
		// would attach `unique` to a string and be refused by the applicability
		// table, correctly. The keyword stays in the closed vocabulary for
		// documents other frontends produce, and the reader still checks it.
		return found;
	};

	const definitions = new Map();
	const emit = (definition) => {
		definitions.set(definition.identity, definition);
		return definition;
	};

	/** Resolves a `typeRef`'s kind and scalar: a native reference resolves
	 * directly over the closed kernel scalar set (gap 1 of FCD #199/#200), an
	 * authored alias (`scalar X extends Y`) follows its `target`, and every
	 * other authored type resolves through `definitions`. */
	const resolvedKindOf = (identity, seen = new Set()) => {
		if (identity?.startsWith(NATIVE_PREFIX)) {
			const name = identity.slice(NATIVE_PREFIX.length);
			const irScalar = NATIVE_IR_SCALARS.get(name);
			return irScalar ? { kind: "scalar", scalar: irScalar } : undefined;
		}
		if (seen.has(identity)) return undefined;
		seen.add(identity);
		const definition = definitions.get(identity);
		if (!definition) return undefined;
		if (definition.kind === "alias")
			return resolvedKindOf(definition.target, seen);
		return { kind: definition.kind, scalar: definition.scalar };
	};

	// ---- pass one: every declaration becomes a definition -------------------
	for (const declaration of declarations) {
		// A declaration the IR cannot carry in full is declared loss, not a
		// silent omission. Three shapes reach this: a templated declaration, whose
		// parameters have no IR member; a `@doc` on a target the extension table
		// does not cover; and an enum member's assigned value, below.
		if (Array.isArray(declaration.templateMapper?.args)) {
			context.raise(
				DIAGNOSTIC_CODES.UNSUPPORTED_LOSS,
				`${fragment(declaration.name)} is a template instance, and the IR has no member for a template argument`,
				context.locusOf(declaration),
			);
			continue;
		}
		const identity = typeIdentity(declaration.name);
		const classification = classify(declaration, context);
		const origin = context.originOf(declaration);
		const roles = [
			...new Set(
				(context.state("role", declaration) ?? []).map((item) => item.name),
			),
		].sort(byCodePoint);
		const unknownPolicy =
			context.state("unknownPolicy", declaration)?.policy ?? "reject";
		const extensions = [];
		// A doc comment on a declaration is carried, not dropped: the same
		// semantic-core `doc` extension FR-034 puts on a field and on an enum's
		// member docs. Dropping it would be undeclared loss.
		const declarationDoc = getDoc(program, declaration);
		if (declarationDoc !== undefined) {
			extensions.push({
				identity: `${EXTENSION_BASE}/doc`,
				version: "1.0.0",
				required: false,
				payload: { text: declarationDoc },
			});
		}
		for (const item of context.state("semanticExtension", declaration) ?? []) {
			extensions.push({
				identity: item.identity,
				version: item.version,
				required: item.required,
				payload: item.payload,
			});
		}

		const base = {
			identity,
			displayName: declaration.name,
			kind: classification.kind,
			roles,
			origin,
			constraints: [],
			extensions,
			unknownPolicy,
		};

		if (classification.kind === "invalid-reference") {
			context.raise(
				DIAGNOSTIC_CODES.UNSUPPORTED_DECLARATION,
				`${fragment(declaration.name)} carries @semanticReference but declares members; a reference is an empty model`,
				context.locusOf(declaration),
			);
			continue;
		}
		if (classification.kind === "unsupported") {
			context.raise(
				DIAGNOSTIC_CODES.UNSUPPORTED_DECLARATION,
				`${fragment(declaration.name)} matches no row of the structural-kind table`,
				context.locusOf(declaration),
			);
			continue;
		}
		if (classification.kind === "unsupported-scalar") {
			context.raise(
				DIAGNOSTIC_CODES.UNSUPPORTED_SCALAR_BASE,
				`${fragment(declaration.name)} extends no built-in scalar this compiler maps`,
				context.locusOf(declaration),
			);
			continue;
		}

		if (classification.kind === "reference") {
			emit({
				...base,
				target: context.state("semanticReference", declaration).targetIdentity,
			});
			continue;
		}
		if (classification.kind === "alias") {
			emit({ ...base, target: typeIdentity(classification.target.name) });
			continue;
		}
		if (classification.kind === "scalar") {
			emit({ ...base, scalar: classification.scalar });
			continue;
		}
		if (classification.kind === "sequence") {
			const items = resolveMemberType(
				declaration.indexer.value,
				context.locusOf(declaration),
			);
			if (!items) {
				context.raise(
					DIAGNOSTIC_CODES.UNRESOLVED_TYPE_REF,
					`the item type of ${fragment(declaration.name)} does not resolve`,
					context.locusOf(declaration),
				);
				continue;
			}
			emit({ ...base, items });
			continue;
		}
		if (classification.kind === "map") {
			const values = resolveMemberType(
				declaration.indexer.value,
				context.locusOf(declaration),
			);
			if (!values) {
				context.raise(
					DIAGNOSTIC_CODES.UNRESOLVED_TYPE_REF,
					`the value type of ${fragment(declaration.name)} does not resolve`,
					context.locusOf(declaration),
				);
				continue;
			}
			emit({ ...base, values });
			continue;
		}
		if (classification.kind === "enum") {
			const variants = [];
			for (const member of declaration.members.values()) {
				if (member.value !== undefined) {
					context.raise(
						DIAGNOSTIC_CODES.UNSUPPORTED_LOSS,
						`enum member ${fragment(`${declaration.name}.${member.name}`)} declares the value ${fragment(member.value)}, which the IR variant node has no member for`,
						context.locusOf(member),
					);
				}
				variants.push({
					identity: mintIdentity(packageIdentity, "variant", [
						declaration.name,
						member.name,
					]),
					name: member.name,
					origin: context.originOf(member),
				});
			}
			emit({ ...base, variants: variants.sort(byIdentity) });
			continue;
		}
		if (classification.kind === "union") {
			const variants = [];
			for (const variant of declaration.variants.values()) {
				const name =
					typeof variant.name === "string" ? variant.name : undefined;
				if (!name) {
					context.raise(
						DIAGNOSTIC_CODES.UNSUPPORTED_DECLARATION,
						`${fragment(declaration.name)} declares an unnamed variant; a union variant carries a name`,
						context.locusOf(declaration),
					);
					continue;
				}
				const payloadType = resolveMemberType(
					variant.type,
					context.locusOf(declaration),
				);
				variants.push({
					identity: mintIdentity(packageIdentity, "variant", [
						declaration.name,
						name,
					]),
					name,
					...(payloadType ? { payloadType } : {}),
					origin: context.originOf(declaration),
				});
			}
			emit({ ...base, variants: variants.sort(byIdentity) });
			continue;
		}
		emit({ ...base, fields: [] });
	}

	// ---- pass two: record members, which need every definition to resolve ----
	// A member type may resolve to an export of an imported package rather than
	// to a declaration in this one.
	const importedExports = new Set(options.importedExports ?? []);

	/** Lowers one model property (or operation parameter) to an IR field node. */
	const lowerField = (declaration, property, identityParts, ownerParts) => {
		const at = context.locusOf(property);
		const fieldIdentity = mintIdentity(packageIdentity, "field", [
			...ownerParts,
			property.name,
		]);
		const nullable = unwrapNullable(property.type);
		const item = collectionItem(nullable.type);
		const memberType = item ?? nullable.type;
		let typeRef = resolveMemberType(memberType, at);
		if (!typeRef) {
			context.raise(
				DIAGNOSTIC_CODES.UNRESOLVED_TYPE_REF,
				`the type of ${fragment(identityParts.join("."))} resolves to no declaration in this package, no built-in scalar, and no imported export`,
				at,
			);
			return undefined;
		}

		const declared = context.state("multiplicity", property);
		const authoredPresence = context.state("presence", property);
		const collection = context.state("collection", property);
		let multiplicity;
		if (declared) {
			if (declared.upper !== undefined && declared.upper < declared.lower) {
				context.raise(
					DIAGNOSTIC_CODES.INVALID_MULTIPLICITY,
					`@multiplicity(${declared.lower}, ${declared.upper}) declares an upper bound below its lower bound`,
					decoratorLocus(declared, property),
				);
				return undefined;
			}
			const impliedOptional = declared.lower === 0;
			if (!authoredPresence && impliedOptional !== Boolean(property.optional)) {
				context.raise(
					DIAGNOSTIC_CODES.MULTIPLICITY_CONTRADICTS_OPTIONALITY,
					`@multiplicity declares lower ${declared.lower} on a property marked ${property.optional ? "optional" : "required"}; the two must agree`,
					decoratorLocus(declared, property),
				);
				return undefined;
			}
			multiplicity = { lower: declared.lower };
			if (declared.upper !== undefined) multiplicity.upper = declared.upper;
		} else if (item) {
			multiplicity = { lower: property.optional ? 0 : 1 };
		} else {
			multiplicity = { lower: property.optional ? 0 : 1, upper: 1 };
		}

		// Every emitted multiplicity carries `ordered` and `unique` (QSpec
		// model-complete.md); a property with no `@collection` decorator emits
		// both as `false`.
		if (collection) {
			multiplicity.ordered = collection.ordered;
			multiplicity.unique = collection.unique;
		} else {
			multiplicity.ordered = false;
			multiplicity.unique = false;
		}

		const constraints = constraintsOf(property);
		let fieldConstraints;
		if (constraints.length > 0) {
			// Gap 1 of FCD #199/#200: a constrained property keeps its constraints
			// on the field itself, `appliesTo` the field's own identity; `typeRef`
			// stays the field's resolved type, no synthetic alias.
			const resolved = resolvedKindOf(typeRef) ?? { kind: "record" };
			const attached = [];
			for (const item of constraints) {
				if (!applies(item.keyword, resolved.kind, resolved.scalar)) {
					context.raise(
						DIAGNOSTIC_CODES.CONSTRAINT_NOT_APPLICABLE,
						`${fragment(item.keyword)} does not apply to ${fragment(resolved.kind === "scalar" ? String(resolved.scalar) : resolved.kind)}`,
						at,
					);
					continue;
				}
				attached.push({
					identity: mintIdentity(packageIdentity, "constraint", [
						...ownerParts,
						property.name,
						item.keyword,
					]),
					keyword: item.keyword,
					operands: item.operands,
					appliesTo: fieldIdentity,
					diagnosticCode: constraintDiagnosticCode(
						packageIdentity,
						[...ownerParts, property.name],
						item.keyword,
					),
					origin: context.originOf(property),
				});
			}
			if (attached.length > 0) fieldConstraints = attached.sort(byIdentity);
		}

		const extensions = [];
		const doc = getDoc(program, property);
		if (doc !== undefined) {
			extensions.push({
				identity: `${EXTENSION_BASE}/doc`,
				version: "1.0.0",
				required: false,
				payload: { text: doc },
			});
		}
		if (context.state("identityField", property)) {
			extensions.push({
				identity: `${EXTENSION_BASE}/identity`,
				version: "1.0.0",
				required: false,
				payload: { identity: true },
			});
		}
		const decimalPolicy = context.state("decimal", property);
		if (decimalPolicy) {
			extensions.push({
				identity: `${EXTENSION_BASE}/decimal`,
				version: "1.0.0",
				required: true,
				payload: {
					precision: decimalPolicy.precision,
					scale: decimalPolicy.scale,
				},
			});
		}
		for (const extension of context.state("semanticExtension", property) ??
			[]) {
			extensions.push({
				identity: extension.identity,
				version: extension.version,
				required: extension.required,
				payload: extension.payload,
			});
		}

		const field = {
			identity: fieldIdentity,
			name: property.name,
			typeRef,
			multiplicity,
			presence:
				authoredPresence?.presence ??
				(multiplicity.lower >= 1 ? "required" : "optional"),
			nullable: nullable.nullable,
			defaultKind: "none",
			origin: context.originOf(property),
			extensions: extensions.sort(byIdentity),
			...(fieldConstraints ? { constraints: fieldConstraints } : {}),
		};

		const kindDecorator = context.state("defaultKind", property);
		if (property.defaultValue !== undefined) {
			field.defaultKind = kindDecorator?.kind ?? "semantic";
			field.defaultValue = literalOf(property.defaultValue);
		} else if (kindDecorator) {
			context.raise(
				DIAGNOSTIC_CODES.DEFAULT_KIND_WITHOUT_VALUE,
				"@defaultKind names a default kind for a property that declares no default",
				decoratorLocus(kindDecorator, property),
			);
			return undefined;
		}

		const unit = context.state("unit", property);
		if (unit) {
			const resolved = resolvedKindOf(typeRef);
			if (!resolved || resolved.kind !== "scalar") {
				context.raise(
					DIAGNOSTIC_CODES.UNIT_ON_NON_SCALAR,
					`@unit applies only where the field's type resolves to a scalar (resolved ${fragment(resolved?.kind ?? "nothing")})`,
					decoratorLocus(unit, property),
				);
				return undefined;
			}
			field.unit = unit.symbol;
		}
		return field;
	};

	const operationsByOwner = new Map();
	for (const iface of interfaces) {
		const binding = context.state("operations", iface);
		if (!binding) continue;
		const list = operationsByOwner.get(binding.owner) ?? [];
		list.push(iface);
		operationsByOwner.set(binding.owner, list);
	}

	for (const declaration of declarations) {
		const identity = typeIdentity(declaration.name);
		const definition = definitions.get(identity);
		if (!definition) continue;

		const clauses = [];
		const clauseIds = new Set();
		for (const item of context.state("clause", declaration) ?? []) {
			if (clauseIds.has(item.clauseId)) {
				context.raise(
					DIAGNOSTIC_CODES.DUPLICATE_CLAUSE_ID,
					`clause id ${fragment(item.clauseId)} is declared twice on ${fragment(declaration.name)}`,
					decoratorLocus(item, declaration),
				);
				continue;
			}
			clauseIds.add(item.clauseId);
			const span = context.spanOf(declaration, item.node);
			clauses.push({
				identity: mintIdentity(packageIdentity, "clause", [
					declaration.name,
					item.clauseId,
				]),
				language: item.language,
				clauseId: item.clauseId,
				text: item.text,
				...(span ? { sourceSpan: span } : {}),
				origin: context.originOf(declaration, item.node),
			});
		}
		if (clauses.length > 0) definition.clauses = clauses.sort(byIdentity);

		const relationships = context.state("relationship", declaration) ?? [];
		const bound = operationsByOwner.get(declaration.name) ?? [];
		if (definition.kind !== "record") {
			if (relationships.length > 0 || bound.length > 0) {
				context.raise(
					DIAGNOSTIC_CODES.NODES_ON_NON_RECORD,
					`relationships and operations require a record; ${fragment(declaration.name)} is a ${fragment(definition.kind)}`,
					context.locusOf(declaration),
				);
			}
			continue;
		}

		definition.fields = [];
		for (const property of declaration.properties.values()) {
			const field = lowerField(
				declaration,
				property,
				[declaration.name, property.name],
				[declaration.name],
			);
			if (field) definition.fields.push(field);
		}
		definition.fields.sort(byIdentity);

		if (relationships.length > 0) {
			definition.relationships = relationships
				.map((item) => {
					const targetName = item.targetIdentity.slice(
						item.targetIdentity.lastIndexOf("/") + 1,
					);
					// FR-094 "Relationships" (gap 3 of FCD #199/#200): `@relationship`
					// authors only the target end's cardinality ("this record has
					// `lower..upper` of the target"), so it lowers to `targetEnd`,
					// with the same FR-034 defaulting the flat shape used. The source
					// end's multiplicity is not yet authorable by either frontend
					// (source-multiplicity authoring is future FCD #201) and is
					// always `0..unbounded`, mirroring the extraction-frontend's
					// identical default for the same gap (edges.rs).
					const targetMultiplicity = { lower: item.lower ?? 0 };
					if (item.upper !== undefined) targetMultiplicity.upper = item.upper;
					else if (item.lower === undefined) targetMultiplicity.upper = 1;
					targetMultiplicity.ordered = false;
					targetMultiplicity.unique = false;
					return {
						identity: mintIdentity(packageIdentity, "relationship", [
							declaration.name,
							item.verb,
							targetName,
						]),
						category: item.category,
						composite: item.composite ?? false,
						direction: "source-to-target",
						sourceEnd: {
							role: item.verb,
							multiplicity: { lower: 0, ordered: false, unique: false },
							type: identity,
						},
						targetEnd: {
							multiplicity: targetMultiplicity,
							type: item.targetIdentity,
						},
						origin: context.originOf(declaration, item.node),
					};
				})
				.sort(byIdentity);
		}

		if (bound.length > 0) {
			const operations = [];
			for (const iface of bound) {
				for (const operation of iface.operations.values()) {
					const params = [];
					const names = new Set();
					for (const parameter of operation.parameters.properties.values()) {
						if (names.has(parameter.name)) {
							context.raise(
								DIAGNOSTIC_CODES.DUPLICATE_PARAM,
								`operation ${fragment(operation.name)} declares the parameter ${fragment(parameter.name)} twice`,
								context.locusOf(parameter),
							);
							continue;
						}
						names.add(parameter.name);
						const field = lowerField(
							declaration,
							parameter,
							[declaration.name, operation.name, parameter.name],
							[declaration.name, operation.name],
						);
						if (field) params.push(field);
					}
					const pre = (context.state("pre", operation) ?? []).map(
						(item) => item.clauseId,
					);
					const post = (context.state("post", operation) ?? []).map(
						(item) => item.clauseId,
					);
					for (const [side, list] of [
						["pre", pre],
						["post", post],
					]) {
						for (const clauseId of list) {
							if (clauseIds.has(clauseId)) continue;
							context.raise(
								DIAGNOSTIC_CODES.DANGLING_CLAUSE_REF,
								`${side} names the clause id ${fragment(clauseId)}, which ${fragment(declaration.name)} does not declare`,
								context.locusOf(operation),
							);
						}
					}
					const node = {
						identity: mintIdentity(packageIdentity, "operation", [
							declaration.name,
							operation.name,
						]),
						name: operation.name,
						params: params.sort(byIdentity),
						pre: [...new Set(pre)].sort(byCodePoint),
						post: [...new Set(post)].sort(byCodePoint),
						origin: context.originOf(operation),
					};
					const returnType = unwrapNullable(operation.returnType);
					const returnItem = collectionItem(returnType.type);
					const typeRef = resolveMemberType(
						returnItem ?? returnType.type,
						context.locusOf(operation),
					);
					if (typeRef) {
						node.returns = {
							typeRef,
							// Every emitted multiplicity carries `ordered` and `unique`
							// (QSpec model-complete.md); a return type never declares
							// either, so both are always `false`.
							multiplicity: returnItem
								? { lower: 1, ordered: false, unique: false }
								: { lower: 1, upper: 1, ordered: false, unique: false },
							nullable: false,
						};
					}
					operations.push(node);
				}
			}
			definition.operations = operations.sort(byIdentity);
		}
	}

	// Type-level constraints on scalars and their aliases.
	for (const declaration of declarations) {
		const definition = definitions.get(typeIdentity(declaration.name));
		if (!definition) continue;
		const found = constraintsOf(declaration);
		if (found.length === 0) continue;
		const resolved = resolvedKindOf(definition.identity) ?? {
			kind: definition.kind,
			scalar: definition.scalar,
		};
		const attached = [];
		for (const item of found) {
			if (!applies(item.keyword, resolved.kind, resolved.scalar)) {
				context.raise(
					DIAGNOSTIC_CODES.CONSTRAINT_NOT_APPLICABLE,
					`${fragment(item.keyword)} does not apply to ${fragment(resolved.kind === "scalar" ? String(resolved.scalar) : resolved.kind)}`,
					context.locusOf(declaration),
				);
				continue;
			}
			attached.push({
				identity: mintIdentity(packageIdentity, "constraint", [
					declaration.name,
					item.keyword,
				]),
				keyword: item.keyword,
				operands: item.operands,
				appliesTo: definition.identity,
				diagnosticCode: constraintDiagnosticCode(
					packageIdentity,
					[declaration.name],
					item.keyword,
				),
				origin: context.originOf(declaration),
			});
		}
		definition.constraints = attached.sort(byIdentity);
	}

	// The emitted document is bounded: a package that declares more definitions
	// than `maxNodes`, or a list longer than `maxCollectionItems`, is refused
	// rather than compiled into a document no reader will accept.
	const limits = options.limits ?? DEFAULT_LIMITS;
	if (definitions.size > limits.maxNodes) {
		context.raise(
			DIAGNOSTIC_CODES.LIMIT_MAX_NODES,
			`the package declares ${definitions.size} types, over the maxNodes limit of ${limits.maxNodes}`,
		);
	}
	for (const definition of definitions.values()) {
		for (const key of [
			"fields",
			"variants",
			"constraints",
			"relationships",
			"operations",
			"clauses",
			"extensions",
		]) {
			const list = definition[key];
			if (!Array.isArray(list) || list.length <= limits.maxCollectionItems) {
				continue;
			}
			context.raise(
				DIAGNOSTIC_CODES.LIMIT_MAX_COLLECTION_ITEMS,
				`${fragment(definition.displayName)} declares ${list.length} ${key}, over the maxCollectionItems limit of ${limits.maxCollectionItems}`,
				context.locusOf(undefined) ?? undefined,
			);
		}
	}

	const types = [...definitions.values()].sort(byIdentity);
	const ir = {
		contractVersion: "2.0.0",
		source: {
			identity: sourceIdentity,
			version: options.packageVersion,
			dialect: "typespec",
			digest: options.sourceDigest,
		},
		package: options.packageBlock,
		constructs: [],
		types,
		occurrences: [],
		extensions: [],
	};
	return { ir, diagnostics: context.diagnostics };
}

/** The literal value of a TypeSpec default, in the JSON form the IR carries. */
function literalOf(value) {
	if (value === undefined || value === null) return null;
	switch (value.valueKind) {
		case "StringValue":
			return value.value;
		case "NumericValue":
			return Number(value.value.asNumber?.() ?? value.value);
		case "BooleanValue":
			return value.value;
		case "EnumValue":
			return value.value?.name ?? String(value.value);
		case "NullValue":
			return null;
		case "ArrayValue":
			return (value.values ?? []).map(literalOf);
		case "ObjectValue":
			return Object.fromEntries(
				[...(value.properties ?? new Map())].map(([key, entry]) => [
					key,
					literalOf(entry.value),
				]),
			);
		default:
			return String(value.value ?? "");
	}
}
