/**
 * The generated ESM package: its closed file set, its named export surface, and
 * the walk that proves a single-type import reaches only that type (FR-065).
 *
 * `renderPackage` assembles; it does not render the module bodies. The five
 * source modules come from their owning requirements — `types.ts` from FR-064,
 * `validators.ts` and `errors.ts` from FR-066, `identity.ts` and
 * `provenance.ts` from FR-067 and FR-137 — and arrive here as text. This module owns the manifest, the
 * barrel, the licence, the headers, and the two static analyses.
 *
 * It writes no file. The caller decides where a package lands, which is what
 * lets the layout change without editing a backend (FR-042-CON-2, FR-065).
 *
 * ## No bundler, and why the walk is not a weaker check
 *
 * Every tree-shaking obligation here is a static reachable-symbol walk rather
 * than a bundle, because no bundler is reachable in this repository: `esbuild`,
 * `rollup` and `vite` sit in `pnpm-lock.yaml` only as transitive dependencies
 * of `vitest` under `node_modules/.pnpm/**`, neither `import("esbuild")` nor
 * `import("rollup")` resolves from the repository root, and NFR-025 freezes
 * both lockfiles against declaring one.
 *
 * The walk is not a concession. For a package that declares
 * `"sideEffects": false`, imports nothing outside itself, re-exports only by
 * name, and whose every export is a top-level binding with a side-effect-free
 * initializer, the reachable set *is* what a tree-shaker retains — and unlike a
 * bundle scan it cannot be defeated by minification. Those four conditions are
 * asserted before anything is collected, so the measurement cannot pass over a
 * package for which its conclusion would not hold (FR-065-AC-12).
 */

/**
 * The emitted file set, and it is closed. An added or removed path is a visible
 * change in the output manifest rather than an implementation detail
 * (FR-065-AC-1).
 */
export const PACKAGE_FILES = Object.freeze([
	"LICENSE",
	"errors.ts",
	"identity.ts",
	"index.ts",
	"package.json",
	"provenance.ts",
	"types.ts",
	"validators.ts",
]);

/** The five generated source modules, in `exports` subpath order. */
const SOURCE_MODULES = Object.freeze([
	"types",
	"validators",
	"errors",
	"identity",
	"provenance",
]);

/** The prefix half of the package-name rule, stated once so its inverse can be. */
const NAME_PREFIX = "@agent-ix/semantic-";

/** The separator the package name substitutes for the identity's `/`. */
const NAME_SEPARATOR = "__";

/**
 * The generated package's name, derived from the IR's `owner/name` identity by
 * one stated rule so that `identityFromPackageName` is its exact inverse
 * (FR-065-AC-4).
 */
export function packageNameFor(identity) {
	if (typeof identity !== "string" || !identity.includes("/")) {
		throw new TypeError(
			`package identity must be owner/name, received ${JSON.stringify(identity)}`,
		);
	}
	return `${NAME_PREFIX}${identity.replace("/", NAME_SEPARATOR)}`;
}

/** The inverse of `packageNameFor`, so the derivation is reversible in fact. */
export function identityFromPackageName(name) {
	if (typeof name !== "string" || !name.startsWith(NAME_PREFIX)) {
		throw new TypeError(
			`not a generated package name: ${JSON.stringify(name)}`,
		);
	}
	return name.slice(NAME_PREFIX.length).replace(NAME_SEPARATOR, "/");
}

/**
 * The fixed API surface: the public names that belong to the package rather
 * than to a type definition.
 *
 * FR-065-CON-5 bounds the *public* export set — what `index.ts` re-exports — to
 * the union of this list and the identity-derived exports. Stated as data
 * because the export-set test asserts over it, and a surface that grew by
 * accident would otherwise be indexed only in prose. `validate<Type>` and the
 * branded `<Type>Of` constructor are per-type members of the fixed surface and
 * are named by rule below rather than listed here.
 *
 * The names below were reconciled against what FR-066's and FR-067's renderers
 * actually emit rather than guessed. Neither requirement states a literal name
 * for a map, so the renderer's name is authoritative and this list follows it —
 * `TYPE_IDENTITY` rather than `TYPE_IDENTITIES`, `FIELD_IDENTITY` rather than
 * `FIELD_IDENTITIES`, `TYPE_RELATIONSHIPS` rather than `RELATIONSHIPS`,
 * `FIELD_UNIT` rather than `FIELD_UNITS`, and `PROVENANCE` rather than
 * `SEMANTIC_METADATA`. `ExportedTypeName` is the one name FR-067 does state, in
 * its `Record<ExportedTypeName, string>` typing rule, and it is public for that
 * reason.
 *
 * The list is not widened to whatever the renderers happen to export: a helper
 * that is not public API is either un-exported at its declaration or, where a
 * sibling generated module needs it, listed in `CROSS_MODULE_INTERNALS` below
 * and withheld from the barrel.
 */
export const FIXED_API_SURFACE = Object.freeze([
	// The type surface (FR-064).
	"UNION_DISCRIMINANT",
	// The validator surface (FR-066).
	"ValidationError",
	"ValidationResult",
	"VALIDATION_CODES",
	"StructuralCode",
	"MAX_VALIDATION_DEPTH",
	"PRESERVED_MEMBER",
	// The descriptor types that name the shapes of the maps below (FR-067).
	"ExportedTypeName",
	"ExportedFieldKey",
	"ExtensionDescriptor",
	"RelationshipDescriptor",
	"FieldDescriptor",
	"OperationDescriptor",
	"ClauseDescriptor",
	"VariantDescriptor",
	"ConstraintDescriptor",
	"DefaultDescriptor",
	"OccurrenceDescriptor",
	// The identity and contract-data maps (FR-067).
	"TYPE_IDENTITY",
	"TYPE_KIND",
	"TYPE_ROLES",
	"TYPE_UNKNOWN_POLICY",
	"TYPE_EXTENSIONS",
	"TYPE_RELATIONSHIPS",
	"FIELD_IDENTITY",
	"FIELD_EXTENSIONS",
	"FIELD_UNIT",
	// The provenance and document-level data (FR-067).
	"PROVENANCE",
	"DOCUMENT_EXTENSIONS",
	"OCCURRENCES",
	"TYPE_OPERATIONS",
	"TYPE_CLAUSES",
	"TYPE_VARIANTS",
	"TYPE_CONSTRAINTS",
	"FIELD_DEFAULT",
]);

/**
 * Names one generated module exports so that another can import it, and which
 * `index.ts` therefore does *not* re-export.
 *
 * A generated package is several modules, so a helper `validators.ts` needs
 * from `errors.ts` has to cross a module boundary and must be exported at its
 * declaration. That is a fact about ES modules, not a decision to make the
 * helper public. Each entry carries the reason it cannot simply be private, so
 * the list is auditable rather than a second surface that grows quietly.
 */
export const CROSS_MODULE_INTERNALS = Object.freeze({
	fail: "records one ValidationError; called from every generated check",
	join: "appends one RFC 6901 token to a pointer",
	ownKeys: "own enumerable keys, without reaching the prototype chain",
	ownMember: "reads one own member without invoking an accessor",
	sortErrors: "orders a finding list by pointer then code, code-unit",
	isPlainObject:
		"rejects an array, a null and a non-object before member reads",
	isUniqueCollection:
		"decides `unique` by canonical form rather than reference",
	copyAccessor: "carries an accessor-valued member without invoking it",
	codePointLength: "counts a string in code points for minLength and maxLength",
	isBase64: "decides the base64 form of a `bytes` scalar",
	base64OctetLength: "counts a `bytes` value in decoded octets",
	Member:
		"the return type of `ownMember`, needed to name it across the boundary",
	MemberState: "the discriminant of `Member`, for the same reason",
});

/** The rules that mint a fixed-surface name from a type's identifier. */
const PER_TYPE_SURFACE = Object.freeze([
	(identifier) => `validate${identifier}`,
	(identifier) => `${identifier}Of`,
]);

/** `SPDX-License-Identifier`, on every generated file, source or not. */
const SPDX = "SPDX-License-Identifier: AGPL-3.0-only";

/**
 * The provenance banner. It names the backend, its version and the fingerprint
 * of the document generated from — and no clock value, no host name, no user
 * and no working directory, because each of those is a determinism leak this
 * repository has shipped before (NFR-024, DEF-PROTO-009, DEF-PROTO-014).
 */
function banner(model, fingerprint, comment) {
	const lines = [
		SPDX,
		"",
		"Generated by the Agent IX TypeScript semantic backend. Do not edit.",
		`backend: ${model.backend.identity}@${model.backend.version}`,
		`contract: ${model.contractVersion}`,
		`package: ${model.package.identity}@${model.package.version}`,
		`fingerprint: ${fingerprint}`,
	];
	if (comment === "json") return lines;
	return `/**\n${lines.map((line) => ` * ${line}`.trimEnd()).join("\n")}\n */\n`;
}

/** Tab-indented JSON with a terminating newline: the repository's own style. */
function renderJson(value) {
	return `${JSON.stringify(value, null, "\t")}\n`;
}

/**
 * The generated `package.json`.
 *
 * No `dependencies`, `peerDependencies` or `optionalDependencies` member — not
 * an empty one, no member at all, so a parse cannot find one (FR-065-AC-2). The
 * banner rides in `$comment` members because JSON carries no comment syntax and
 * dropping the provenance from one of the eight files would leave a hole in
 * exactly the file a consumer reads first.
 */
function renderManifest(model, fingerprint) {
	const exportsMap = {
		".": { types: "./index.ts", default: "./index.ts" },
	};
	for (const name of SOURCE_MODULES) {
		exportsMap[`./${name}`] = {
			types: `./${name}.ts`,
			default: `./${name}.ts`,
		};
	}
	return renderJson({
		$comment: banner(model, fingerprint, "json").filter(
			(line) => line.length > 0,
		),
		name: packageNameFor(model.package.identity),
		version: model.package.version,
		license: "AGPL-3.0-only",
		type: "module",
		sideEffects: false,
		exports: exportsMap,
	});
}

/**
 * Reads the public names a generated module declares.
 *
 * A regular-expression reader is sound here because this module also decides
 * the text it reads: every generated export is one of five declaration forms at
 * the start of a line, and `export *` is never emitted — a fact the walk's
 * third enabling condition asserts rather than assumes.
 */
const EXPORT_DECLARATION =
	/^export\s+(?:type|interface|const|function|class)\s+([A-Za-z_$][\w$]*)/gm;
const EXPORT_LIST = /^export\s*\{([^}]*)\}(?:\s*from\s*"([^"]*)")?/gm;
const EXPORT_STAR = /^export\s*\*/m;
const IMPORT_FROM = /^import\s[^"]*"([^"]*)"/gm;

/** Every name a module exports, whether declared or re-exported. */
export function exportedNames(source) {
	const names = new Set();
	for (const match of source.matchAll(EXPORT_DECLARATION)) names.add(match[1]);
	for (const match of source.matchAll(EXPORT_LIST)) {
		for (const clause of match[1].split(",")) {
			const text = clause.trim();
			if (text.length === 0) continue;
			const parts = text.split(/\s+as\s+/);
			names.add((parts[1] ?? parts[0]).trim());
		}
	}
	return [...names].sort(compareCodeUnits);
}

/** The names a module re-exports, with the specifier each came from. */
function reExports(source) {
	const out = [];
	for (const match of source.matchAll(EXPORT_LIST)) {
		if (match[2] === undefined) continue;
		for (const clause of match[1].split(",")) {
			const text = clause.trim();
			if (text.length === 0) continue;
			const parts = text.split(/\s+as\s+/);
			out.push({
				local: parts[0].trim(),
				exported: (parts[1] ?? parts[0]).trim(),
				from: match[2],
			});
		}
	}
	return out;
}

/** Every specifier a module imports from. */
function importSpecifiers(source) {
	return [...source.matchAll(IMPORT_FROM)].map((match) => match[1]);
}

/** Code-unit ordering. Never `localeCompare`, which reads the host's collator. */
function compareCodeUnits(left, right) {
	if (left === right) return 0;
	return left < right ? -1 : 1;
}

/** `./types.js` and `./types.ts` and `./types` all name the `types.ts` module. */
function moduleOf(specifier) {
	const bare = specifier.replace(/^\.\//, "").replace(/\.(?:ts|js|mjs)$/, "");
	return `${bare}.ts`;
}

/**
 * The barrel.
 *
 * Every public symbol is re-exported *by name*. No wildcard: only a named
 * surface can be asserted against and diffed, and the walk's third enabling
 * condition depends on it (FR-065-AC-5).
 */
function renderBarrel(model, fingerprint, modules) {
	const permitted = new Set(permittedExports(model));
	const withheld = new Set(withheldExports());
	const blocks = [banner(model, fingerprint)];
	const leaked = [];
	for (const name of SOURCE_MODULES) {
		const names = exportedNames(modules[name] ?? "");
		for (const entry of names) {
			if (!permitted.has(entry) && !withheld.has(entry)) {
				leaked.push(`${name}.ts:${entry}`);
			}
		}
		const published = names.filter((entry) => permitted.has(entry));
		if (published.length === 0) continue;
		blocks.push(
			`export {\n${published.map((entry) => `\t${entry},`).join("\n")}\n} from "./${name}.js";\n`,
		);
	}
	// A name that is neither public API nor a declared cross-module internal is a
	// surface leak. Refusing here is deliberate: the alternative — dropping it
	// silently from the barrel — would leave the module still exporting it, so a
	// consumer reaching past `index.ts` would find an API nobody declared.
	if (leaked.length > 0) {
		throw new Error(
			`generated modules export names outside the declared surface: ${leaked.sort().join(", ")}`,
		);
	}
	return blocks.join("\n");
}

/**
 * Assembles the package.
 *
 * `parts` carries the five rendered module bodies, the licence text and the IR
 * fingerprint, and every one of them is required. An earlier draft rendered a
 * refusing placeholder for a part the caller omitted, so that this module could
 * be built before FR-066's and FR-067's renderers landed. That fallback is
 * deleted rather than kept: with the real renderers in place its only remaining
 * effect would be to turn a forgotten argument into a package that looks
 * complete and rejects every value, which is a worse failure than a thrown
 * `TypeError` naming the missing part.
 *
 * The licence is copied from this repository's own committed `LICENSE` rather
 * than restated, because a generated package with an invented licence would be
 * worse than one that fails to build (FR-065-AC-11).
 *
 * A representability loss returns an empty file map with the loss diagnostics,
 * because the committed target contract declares `unsupportedFeaturePolicy` of
 * `fail`. An admissibility result of `lossy` is a different thing and generates
 * the full map (FR-065-AC-13).
 */
export function renderPackage(model, parts = {}) {
	const losses = model.losses ?? [];
	if (losses.length > 0) {
		return { files: [], losses };
	}
	const fingerprint = parts.fingerprint;
	if (typeof fingerprint !== "string" || !fingerprint.startsWith("sha256:")) {
		throw new TypeError(
			"renderPackage requires parts.fingerprint, the digest of the normalized document",
		);
	}
	if (typeof parts.license !== "string" || parts.license.length === 0) {
		throw new TypeError(
			"renderPackage requires parts.license, this repository's committed LICENSE text",
		);
	}

	const modules = {};
	for (const name of SOURCE_MODULES) {
		const supplied = parts[name];
		if (typeof supplied !== "string" || supplied.length === 0) {
			throw new TypeError(
				`renderPackage requires parts.${name}, the rendered body of ${name}.ts`,
			);
		}
		modules[name] = withHeader(supplied, model, fingerprint);
	}

	const files = [
		{
			path: "package.json",
			text: renderManifest(model, fingerprint),
			identities: [],
		},
		{
			path: "LICENSE",
			text: parts.license,
			identities: [],
		},
		{
			path: "index.ts",
			text: renderBarrel(model, fingerprint, modules),
			identities: [],
		},
		...SOURCE_MODULES.map((name) => ({
			path: `${name}.ts`,
			text: modules[name],
			identities:
				name === "types"
					? (model.types ?? []).map((entry) => entry.identity)
					: [],
		})),
	].sort((left, right) => compareCodeUnits(left.path, right.path));

	return { files, losses: [] };
}

/** Prefixes a supplied module body with the SPDX header and the banner. */
function withHeader(source, model, fingerprint) {
	return source.startsWith("/**") && source.includes(SPDX)
		? source
		: `${banner(model, fingerprint)}\n${source}`;
}

/**
 * The four conditions under which a reachable-symbol walk means what it claims.
 *
 * Asserted before anything is collected. A walk that reported a set over a
 * package failing one of them would be a number with no property behind it,
 * which is the shape of gate this repository refuses (FR-065, FR-071-AC-11).
 */
export function enablingConditions(files) {
	const byPath = new Map(files.map((file) => [file.path, file.text]));
	const failures = [];

	const manifestText = byPath.get("package.json");
	let manifest;
	try {
		manifest = JSON.parse(manifestText ?? "");
	} catch {
		manifest = undefined;
	}
	if (manifest?.sideEffects !== false) {
		failures.push(
			'package.json does not declare "sideEffects": false, so a bundler may not drop an unused module',
		);
	}

	for (const [path, text] of byPath) {
		if (!path.endsWith(".ts")) continue;
		for (const specifier of importSpecifiers(text)) {
			if (!specifier.startsWith("./") && !specifier.startsWith("../")) {
				failures.push(
					`${path} imports the non-relative specifier ${specifier}, so the package's external closure is not empty`,
				);
			}
		}
		if (EXPORT_STAR.test(text)) {
			failures.push(
				`${path} re-exports by wildcard, so its export surface cannot be named`,
			);
		}
		for (const line of text.split("\n")) {
			if (!line.startsWith("export const ")) continue;
			if (/^export const [\w$]+(?::[^=]*)? = (?:[\w$.]+\()/.test(line)) {
				failures.push(
					`${path} initializes an export by calling a function, so its initializer may have a side effect`,
				);
			}
		}
	}
	return failures;
}

/**
 * The symbols a consumer reaches by importing one named export.
 *
 * Follows relative import specifiers and named re-exports through the package's
 * own module graph and collects the top-level bindings reached. For a package
 * satisfying `enablingConditions`, that set is exactly what a tree-shaker
 * retains.
 *
 * Throws when a condition fails, rather than returning a set: a number that
 * does not measure the property is worse than no number (FR-071-AC-11).
 */
export function reachableSymbols(files, entryExport, entryModule = "index.ts") {
	const failures = enablingConditions(files);
	if (failures.length > 0) {
		throw new Error(
			`the reachable-symbol walk cannot report a set for this package: ${failures.join("; ")}`,
		);
	}
	const byPath = new Map(files.map((file) => [file.path, file.text]));
	const reached = new Set();
	const seen = new Set();

	const visit = (modulePath, name) => {
		const key = `${modulePath}#${name}`;
		if (seen.has(key)) return;
		seen.add(key);
		const source = byPath.get(modulePath);
		if (source === undefined) return;

		const forwarded = reExports(source).find(
			(entry) => entry.exported === name,
		);
		if (forwarded !== undefined) {
			visit(moduleOf(forwarded.from), forwarded.local);
			return;
		}
		if (!exportedNames(source).includes(name)) return;
		reached.add(`${modulePath}:${name}`);
		// A referenced name may live in this module or in one it imports. The
		// same-module arm matters more than it looks: every generated type sits in
		// `types.ts`, which imports nothing, so a walk that followed only import
		// specifiers would report a record's own name and none of the types its
		// fields reference — a smaller surface than a tree-shaker keeps, which is
		// the direction a surface check must never err in.
		for (const referenced of referencedNames(source, name)) {
			visit(modulePath, referenced);
			for (const specifier of importSpecifiers(source)) {
				visit(moduleOf(specifier), referenced);
			}
		}
	};

	visit(entryModule, entryExport);
	return [...reached].sort(compareCodeUnits);
}

/**
 * The identifiers a declaration's own text mentions.
 *
 * Deliberately over-approximate: a name the declaration does not really need
 * only ever *adds* to the reached set, so the check errs towards reporting a
 * larger surface than a bundler would keep and never towards missing one that
 * grew.
 */
function referencedNames(source, name) {
	const start = new RegExp(
		`^export\\s+(?:type|interface|const|function|class)\\s+${name}\\b`,
		"m",
	).exec(source);
	if (start === null) return [];
	const rest = source.slice(start.index);
	const end = rest.indexOf("\nexport ", 1);
	const block = end < 0 ? rest : rest.slice(0, end);
	return [...new Set(block.match(/[A-Za-z_$][\w$]*/g) ?? [])].filter(
		(identifier) => identifier !== name,
	);
}

/**
 * The export set a package is permitted: the identity-derived names plus the
 * fixed API surface, and nothing else (FR-065-CON-5, FR-065-AC-20).
 */
export function permittedExports(model) {
	const names = new Set(FIXED_API_SURFACE);
	for (const entry of model.types ?? []) {
		names.add(entry.identifier);
		for (const mint of PER_TYPE_SURFACE) names.add(mint(entry.identifier));
	}
	return [...names].sort(compareCodeUnits);
}

/**
 * The names a generated module exports that the barrel withholds: the declared
 * cross-module internals, and nothing else.
 *
 * A name a module exports that is neither permitted nor a declared internal is
 * a surface leak, and `renderBarrel` refuses rather than re-exporting it, so
 * the failure is a thrown error at generation time instead of a wider public
 * API nobody noticed.
 */
export function withheldExports() {
	return Object.keys(CROSS_MODULE_INTERNALS).sort(compareCodeUnits);
}
