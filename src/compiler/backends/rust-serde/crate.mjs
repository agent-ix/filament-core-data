/**
 * The pure crate emitter (FR-056).
 *
 * `emitCrate` returns an ordered map of relative path to file text and touches
 * no filesystem: the repository `LICENSE` is handed in by `index.mjs`, which is
 * the one module in this backend that reads or writes a byte. That split is
 * what makes the determinism gate checkable — a pure function of the request
 * has nothing to vary with but the request.
 *
 * Nothing here decides a mapping. Every Rust form this module renders was
 * chosen by `mapping.mjs` from a row of `mapping-table.json`, and every
 * refusal was raised there; this module turns the model into bytes.
 *
 * Determinism rules the emitter obeys throughout: files are inserted into the
 * result map in code-point order of their path; every list that reaches an
 * emitted byte is either in the document's own declared order or sorted by code
 * point; no `Map` or `Set` iteration order reaches the output; and no `Date`,
 * `Math.random`, `process.env`, `process.cwd`, or child process is reachable
 * from this module's graph.
 */

import { createHash } from "node:crypto";
import {
	isEnumerationShaped,
	isRecordShaped,
	renderingOf,
	renderingView,
	typeIndex,
} from "../../constructs.mjs";
import {
	applyDiagnosticLimit,
	diagnostic,
	fragment,
	hasBlocking,
	RUST_BACKEND_CODES,
} from "./diagnostics.mjs";
import { byCodePoint, enforceLimits, mapDocument } from "./mapping.mjs";
import { lowerPattern, PUBLISHED_PATTERNS } from "./patterns.mjs";
import {
	atom,
	callArm,
	callLines,
	constItem,
	FN_CALL_WIDTH,
	MAX_WIDTH,
	matchArm,
	STRUCT_LIT_WIDTH,
	slice,
	some,
	struct,
} from "./rust-format.mjs";
import { renderProgram, SUPPORT_PRELUDE } from "./support-source.mjs";

/** The exact `serde` version the generated crate pins. */
export const SERDE_VERSION = "1.0.229";

/** The edition and MSRV of the declared support matrix. */
export const CRATE_EDITION = "2021";
export const CRATE_RUST_VERSION = "1.85.0";

/** The `mediaType` of an emitted file, a total function of its extension. */
export function mediaTypeOf(path) {
	if (path.endsWith(".rs")) return "text/x-rust";
	if (path.endsWith(".toml")) return "application/toml";
	if (path.endsWith(".md")) return "text/markdown";
	return "text/plain";
}

/** The four ECMAScript line terminators, none of which may enter a `///` line. */
const LINE_TERMINATOR_POINTS = new Set(["\n", "\r", "\u2028", "\u2029"]);

/** The longest a single derived doc-comment part may be, in code points. */
export const MAX_DOC_PART_CODE_POINTS = 200;

/**
 * Escapes derived documentation text.
 *
 * A `displayName` is constrained only to `minLength: 1`, so it can carry a line
 * terminator — which would end the `///` line and leave the rest of the text as
 * Rust source — and it can carry a fence, which would open a doc test rustdoc
 * then tries to compile. Both are neutralised here rather than trusted.
 */
export function escapeDoc(text) {
	const points = [...String(text)];
	const truncated =
		points.length > MAX_DOC_PART_CODE_POINTS
			? points.slice(0, MAX_DOC_PART_CODE_POINTS - 1).concat("…")
			: points;
	return truncated
		.map((ch) => {
			if (LINE_TERMINATOR_POINTS.has(ch)) return " ";
			if (ch === "`") return "\\`";
			if (ch === "\\") return "\\\\";
			return ch;
		})
		.join("");
}

function docLines(parts, indent = "", marker = "///") {
	const lines = [];
	parts.forEach((part, index) => {
		if (index > 0) lines.push(`${indent}${marker}`);
		lines.push(`${indent}${marker} ${escapeDoc(part)}`.trimEnd());
	});
	return lines;
}

/** A Rust string literal for arbitrary text. */
export function rustString(text) {
	let out = '"';
	for (const ch of String(text)) {
		const code = ch.codePointAt(0);
		if (ch === '"') out += '\\"';
		else if (ch === "\\") out += "\\\\";
		else if (ch === "\n") out += "\\n";
		else if (ch === "\r") out += "\\r";
		else if (ch === "\t") out += "\\t";
		else if (code < 0x20 || code === 0x7f) out += `\\u{${code.toString(16)}}`;
		else out += ch;
	}
	return `${out}"`;
}

/**
 * Canonical JSON for a value carried into metadata as text.
 *
 * Object members keep the order the document declared, because the metadata's
 * job is to preserve every member the IR carried rather than to normalise it.
 */
export function canonicalJson(value) {
	if (value === null) return "null";
	if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
	if (typeof value === "object") {
		const members = Object.keys(value).map(
			(key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`,
		);
		return `{${members.join(",")}}`;
	}
	return JSON.stringify(value);
}

function sha256(text) {
	return `sha256:${createHash("sha256").update(text, "utf8").digest("hex")}`;
}

const META = "crate::identity";

function optionStr(value) {
	return value === undefined || value === null
		? atom("None")
		: some(atom(rustString(value)));
}

function optionNumber(value) {
	return value === undefined || value === null
		? atom("None")
		: some(atom(String(value)));
}

function optionBool(value) {
	return value === undefined || value === null
		? atom("None")
		: some(atom(String(value)));
}

function locusMeta(locus) {
	if (locus === undefined || locus === null) return atom("None");
	return some(
		struct(`${META}::SourceLocusMeta`, [
			{
				name: "source_identity",
				value: atom(rustString(locus.sourceIdentity)),
			},
			{ name: "path", value: atom(rustString(locus.path)) },
			{ name: "start_line", value: atom(String(locus.startLine)) },
			{ name: "start_column", value: atom(String(locus.startColumn)) },
			{ name: "end_line", value: optionNumber(locus.endLine) },
			{ name: "end_column", value: optionNumber(locus.endColumn) },
		]),
	);
}

function originMeta(origin) {
	const generated =
		origin?.generated === undefined
			? atom("None")
			: some(
					struct(`${META}::GeneratedOriginMeta`, [
						{
							name: "generator_identity",
							value: atom(rustString(origin.generated.generatorIdentity)),
						},
						{
							name: "generator_version",
							value: atom(rustString(origin.generated.generatorVersion)),
						},
						{
							name: "input_identities",
							value: slice(
								(origin.generated.inputIdentities ?? []).map((identity) =>
									atom(rustString(identity)),
								),
							),
						},
					]),
				);
	return struct(`${META}::OriginMeta`, [
		{ name: "source", value: locusMeta(origin?.source) },
		{ name: "generated", value: generated },
	]);
}

function multiplicityMeta(multiplicity) {
	const value = multiplicity ?? { lower: 0 };
	return struct(`${META}::MultiplicityMeta`, [
		{ name: "lower", value: atom(String(value.lower)) },
		{ name: "upper", value: optionNumber(value.upper) },
		{ name: "ordered", value: optionBool(value.ordered) },
		{ name: "unique", value: optionBool(value.unique) },
	]);
}

function extensionMeta(extension) {
	return struct(`${META}::ExtensionMeta`, [
		{ name: "identity", value: atom(rustString(extension.identity)) },
		{ name: "version", value: atom(rustString(extension.version)) },
		{ name: "required", value: atom(String(extension.required === true)) },
		{ name: "capability", value: optionStr(extension.capability) },
		{
			name: "payload",
			value: atom(rustString(canonicalJson(extension.payload))),
		},
	]);
}

function fieldMeta(field) {
	return struct(`${META}::FieldMeta`, [
		{ name: "identity", value: atom(rustString(field.identity)) },
		{ name: "name", value: atom(rustString(field.name)) },
		{ name: "rust_name", value: atom(rustString(field.ident)) },
		{ name: "type_ref", value: atom(rustString(field.typeRef)) },
		{ name: "rust_type", value: atom(rustString(field.rustType)) },
		{ name: "row", value: atom(rustString(field.row)) },
		{ name: "presence", value: atom(rustString(field.presence)) },
		{ name: "nullable", value: atom(String(field.nullable)) },
		{ name: "multiplicity", value: multiplicityMeta(field.multiplicity) },
		{ name: "unit", value: optionStr(field.unit) },
		{ name: "default_kind", value: atom(rustString(field.defaultKind)) },
		{
			name: "default_value",
			value:
				field.defaultKind === "none"
					? atom("None")
					: some(atom(rustString(canonicalJson(field.defaultValue)))),
		},
		{ name: "origin", value: originMeta(field.origin) },
	]);
}

/**
 * The chain of accessors that reaches a constrained subject from the value a
 * fallible constructor was handed.
 *
 * A `scalar` newtype wraps its base directly, so the chain is empty. An `alias`
 * wraps the target's Rust type, so the chain is one `.get()` per alias hop; a
 * constraint on an alias to an alias to an `integer` reads through both. The
 * chain is computed here rather than assumed, because assuming it is what makes
 * a constraint on an alias silently compile against the wrong value.
 */
function subjectAccess(definition, byIdentity) {
	let current = definition;
	let expression = "value";
	const seen = new Set();
	while (current !== undefined && current.kind === "alias") {
		if (seen.has(current.identity)) return undefined;
		seen.add(current.identity);
		expression = `${expression}.get()`;
		current = byIdentity.get(current.target);
	}
	if (current === undefined) return undefined;
	return { expression, definition: current };
}

/** Emits one crate. Returns `{ files, diagnostics, state }`. */
export function emitCrate(request, options = {}) {
	const ir = request.ir;
	const limits = request.limits;
	const diagnostics = [...enforceLimits(ir, limits)];

	const outputRoot = String(request.outputRoot ?? "");
	if (!isTraversalFree(outputRoot)) {
		diagnostics.push(
			diagnostic(RUST_BACKEND_CODES.UNSAFE_OUTPUT_ROOT, {
				message: `the request's outputRoot ${fragment(outputRoot)} is not traversal-free under the intended-language predicate`,
			}),
		);
	}

	if (hasBlocking(diagnostics)) {
		return finish(new Map(), diagnostics, request, "invalid");
	}

	// A subtype renders with its inherited fields; the construct facts read the
	// authored document (FR-141).
	const view = renderingView(ir);
	const mapped = mapDocument(view, {
		allowedOmissions: request.profile?.allowedOmissions ?? [],
		authored: typeIndex(ir),
	});
	diagnostics.push(...mapped.diagnostics);
	if (mapped.model === undefined) {
		return finish(new Map(), diagnostics, request, "unsupported");
	}

	const byIdentity = new Map();
	for (const definition of view.types ?? [])
		byIdentity.set(definition.identity, definition);

	const model = mapped.model;
	const files = [];
	files.push(["Cargo.toml", renderCargoToml(model)]);
	files.push(["LICENSE", options.licenseText ?? ""]);
	files.push(["README.md", renderReadme(model)]);
	files.push(["src/identity.rs", renderIdentity(model)]);
	files.push(["src/lib.rs", renderLib(model)]);
	files.push(["src/provenance.rs", renderProvenance(request, model)]);
	files.push(["src/support.rs", renderSupport()]);
	files.push(["src/types.rs", renderTypesModule(model)]);

	const identitiesByPath = new Map();
	for (const type of model.types) {
		const path = `src/types/${type.moduleName}.rs`;
		const rendered = renderType(type, model, byIdentity, diagnostics);
		if (rendered === undefined) continue;
		files.push([path, rendered]);
		identitiesByPath.set(path, [type.identity]);
	}

	if (hasBlocking(diagnostics)) {
		return finish(new Map(), diagnostics, request, "unsupported");
	}

	const ordered = files.sort((left, right) => byCodePoint(left[0], right[0]));
	const map = new Map();
	for (const [path, text] of ordered) map.set(path, text);
	return finish(map, diagnostics, request, "success", identitiesByPath, model);
}

/** The intended-language predicate of FR-057, applied to the output root. */
export function isTraversalFree(value) {
	if (value.length === 0) return false;
	if (/[\u0000\n\r\u2028\u2029]/.test(value)) return false;
	if (value.includes("\\")) return false;
	if (value.startsWith("/")) return false;
	if (/^[A-Za-z]:/.test(value)) return false;
	return !value.split("/").includes("..");
}

function finish(
	files,
	rawDiagnostics,
	request,
	state,
	identitiesByPath,
	model,
) {
	const limited = applyDiagnosticLimit(
		rawDiagnostics,
		request.limits?.maxDiagnostics,
	);
	const blocking = hasBlocking(limited);
	const resolvedState = blocking ? state : "success";
	const emitted = blocking ? new Map() : files;
	const packageIdentity =
		model === undefined
			? `ix://${String(request.ir?.package?.identity ?? "unknown/unknown")}`
			: `ix://${model.package.identity}`;

	const entries = [];
	for (const [path, text] of emitted) {
		const identities = identitiesByPath?.get(path);
		entries.push({
			path,
			digest: sha256(text),
			mediaType: mediaTypeOf(path),
			semanticIdentities:
				identities === undefined
					? [packageIdentity]
					: [...identities].sort(byCodePoint),
		});
	}

	const manifest = {
		contractVersion: "1.0.0",
		requestFingerprint: sha256(canonicalJson(request)),
		backend:
			request.backend?.identity ??
			"ix://agent-ix/filament-core-data/rust-backend",
		state: resolvedState,
		files: entries,
		diagnostics: limited,
		normalizedFingerprint: sha256(
			entries.map((entry) => `${entry.path} ${entry.digest}\n`).join(""),
		),
	};
	return {
		files: emitted,
		diagnostics: limited,
		state: resolvedState,
		manifest,
	};
}

// ---------------------------------------------------------------------------
// Crate-level files
// ---------------------------------------------------------------------------

function renderCargoToml(model) {
	return `# Generated from the semantic contract ${model.package.identity}@${model.package.version}.
#
# \`publish = false\` is unconditional: the issue #21 safety gate forbids crate
# publication, and a manifest that permits it is one command away from breaching
# that gate.
#
# The empty \`[workspace]\` table makes the generated crate its own workspace
# root, so a crate emitted inside another workspace's directory tree builds as
# itself rather than as an unlisted member of the enclosing workspace.
#
# \`[lints.rust]\` carries the warning-free property with the crate. Without it
# the property is asserted by whoever happens to run the build, and the only
# other way to state it — \`RUSTFLAGS="-D warnings"\` — also denies warnings in
# \`serde\`, which fails for reasons that have nothing to do with this contract.
# Cargo applies this table to the local package alone, which is exactly the
# claim being made. The two crate-level attributes in \`src/lib.rs\` are kept as
# well: an attribute travels with the source file, a manifest key with the
# package, and a consumer reading either one should find the same answer.

[package]
name = "${model.crateName}"
version = "${model.package.version}"
edition = "${CRATE_EDITION}"
rust-version = "${CRATE_RUST_VERSION}"
license = "AGPL-3.0-or-later"
publish = false

[workspace]

[lints.rust]
unsafe_code = "forbid"
missing_docs = "deny"
warnings = "deny"

[dependencies]
serde = { version = "=${SERDE_VERSION}", features = ["derive"] }
`;
}

function renderReadme(model) {
	const lines = [
		`# ${model.crateName}`,
		"",
		`Generated Rust/Serde declarations for the semantic contract \`${model.package.identity}\` at version \`${model.package.version}\`.`,
		"",
		"This crate is generated. Edit the contract, not this crate: the next",
		"generation overwrites every file here, and a hand edit is invisible to the",
		"determinism gate that compares two generations byte for byte.",
		"",
		"## Provenance",
		"",
		`- Source identity: \`${model.source.identity}\``,
		`- Source version: \`${model.source.version}\``,
		`- Source digest: \`${model.source.digest}\``,
		`- Contract version: \`${model.contractVersion}\``,
		"",
		"The same values are exported as `&'static str` constants from",
		"`src/provenance.rs`, so a consumer can assert against them at run time.",
		"",
		"## Declared gaps",
		"",
		"The `format` constraint keyword is registered against no format in this",
		"crate, and the emptiness is the declared position rather than an omission.",
		"`format` takes a namespaced name, the only name any published artifact",
		"carries is `agent-ix:plain-text`, and no published artifact states the",
		"language that name checks: `common.schema.json` does not define it, FR-029",
		"says only that the name is namespaced, and no fixture pins a rejected value.",
		"Registering a check would be this backend deciding a cross-language",
		"validation rule that belongs to the constraint vocabulary — the same shape",
		"as choosing a JSON wire form for the `bytes` kernel scalar, which is filed",
		"as issue #58. Every `format` operand therefore raises",
		"`agent-ix.rust-backend.UNKNOWN_FORMAT` and stops generation until a",
		"definition is published.",
		"",
		"The set of capabilities this crate admits is empty, and the emptiness is a",
		"stated decision rather than an omission. `consumer-policy.schema.json` is",
		"sealed and carries no capability member, and the published `rust` row of",
		"`target-contracts.json` declares no capability list, so there is no",
		"published input a non-empty set could be read from. That is GAP-007 in",
		"`conformance/contract-gaps.json`, owned by issue #9. It follows that a",
		"required extension naming any capability is rejected, and that a",
		"`required: false` extension is preserved whatever its identity — see",
		"`decide_extension`.",
		"",
		"The `sourceLocus.path` pattern's published language and its intended",
		"language differ, because each of the pattern's guards is a lookahead over",
		"`.` and `.` stops at the first line terminator. `SourceLocusPath::try_new`",
		"decides the published language and `SourceLocusPath::is_traversal_free` the",
		"intended one; the two are separately named rather than one standing for the",
		"other. The divergence is GAP-002 and issue #56.",
		"",
		"## Licence",
		"",
		"AGPL-3.0-or-later. The repository `LICENSE` is carried verbatim beside this file.",
		"",
	];
	return lines.join("\n");
}

const PROVENANCE_TABLE = [
	["SOURCE_IDENTITY", (request) => request.ir.source.identity],
	["SOURCE_VERSION", (request) => request.ir.source.version],
	["SOURCE_DIGEST", (request) => request.ir.source.digest],
	["PACKAGE_IDENTITY", (request) => request.ir.package.identity],
	["PACKAGE_VERSION", (request) => request.ir.package.version],
	["MANIFEST_DIGEST", (request) => request.ir.package.manifestDigest],
	["LOCK_DIGEST", (request) => request.ir.package.lockDigest],
	["LOCK_FINGERPRINT", (request) => request.lockFingerprint],
	["CONTRACT_VERSION", (request) => request.ir.contractVersion],
	["GENERATOR_IDENTITY", (request) => request.backend?.identity],
	["GENERATOR_VERSION", (request) => request.backend?.version],
];

const PROVENANCE_DOCS = {
	SOURCE_IDENTITY:
		"The semantic identity of the source the contract was read from.",
	SOURCE_VERSION: "The version of the source the contract was read from.",
	SOURCE_DIGEST: "The digest of the source the contract was read from.",
	PACKAGE_IDENTITY:
		"The semantic contract package this crate was generated from.",
	PACKAGE_VERSION: "The version of the semantic contract package.",
	MANIFEST_DIGEST: "The digest of the package manifest.",
	LOCK_DIGEST: "The digest of the package lock.",
	LOCK_FINGERPRINT: "The lock fingerprint the compiler request carried.",
	CONTRACT_VERSION: "The IR contract version the document declared.",
	GENERATOR_IDENTITY:
		"The semantic identity of the backend that generated this crate.",
	GENERATOR_VERSION: "The version of the backend that generated this crate.",
};

function renderProvenance(request, model) {
	const lines = [
		"//! Provenance constants, each taken verbatim from the compiler request.",
		"//!",
		"//! The correspondence between a constant and the request member it comes",
		"//! from is published in FR-056 rather than inferred here, because the",
		"//! request's member set carries no `SOURCE_DIGEST`, `MANIFEST_DIGEST` or",
		"//! `LOCK_DIGEST` of its own and an implementer would otherwise have to",
		"//! invent the mapping — and the test comparing them would have to invent it",
		"//! a second time.",
		"//!",
		"//! No timestamp, hostname, working directory, user name or absolute path is",
		"//! written here or anywhere else in the crate.",
		"",
	];
	for (const [name, read] of PROVENANCE_TABLE) {
		const value = read(request);
		lines.push(`/// ${PROVENANCE_DOCS[name]}`);
		lines.push(
			...constItem("pub ", name, "&str", atom(rustString(value ?? ""))),
		);
		lines.push("");
	}
	lines.push(
		"/// The Cargo package name derived from the contract package identity.",
	);
	lines.push(
		...constItem(
			"pub ",
			"CRATE_NAME",
			"&str",
			atom(rustString(model.crateName)),
		),
	);
	return `${lines.join("\n")}\n`;
}

function renderSupport() {
	const identity = PUBLISHED_PATTERNS.semanticIdentity;
	const program = lowerPattern(identity.regex);
	const reader = RUST_BACKEND_CODES.UNKNOWN_REQUIRED_EXTENSION;
	const lines = [
		SUPPORT_PRELUDE.replace(/\n+$/, ""),
		"",
		"/// The semantic identity of the published `semanticIdentity` pattern.",
		...constItem(
			"pub ",
			"SEMANTIC_IDENTITY_CONSTRAINT",
			"&str",
			atom(rustString(identity.constraint)),
		),
		"",
		"/// The published `semanticIdentity` pattern, as text, for a rejection message.",
		...constItem(
			"pub ",
			"SEMANTIC_IDENTITY_SOURCE",
			"&str",
			atom(rustString(identity.regex)),
		),
		"",
		...renderProgram(
			"SEMANTIC_IDENTITY_PATTERN",
			"The published `semanticIdentity` pattern, lowered to a matcher program.",
			program,
			{ visibility: "pub ", instPath: "MatcherInst" },
		),
		"",
		"/// The code a rejected required extension is reported under.",
		"///",
		"/// It carries the published reader spelling rather than a generator one,",
		"/// because `conformance/diagnostic-codes.json` already names this defect and",
		"/// a second spelling for one defect is two registries that have to agree.",
		...constItem(
			"pub ",
			"UNKNOWN_REQUIRED_EXTENSION_CODE",
			"&str",
			atom(rustString(reader.code)),
		),
		"",
		"/// The severity the registry declares for that code.",
		...constItem(
			"pub ",
			"UNKNOWN_REQUIRED_EXTENSION_SEVERITY",
			"&str",
			atom(rustString(reader.severity)),
		),
		"",
		"/// The owner the registry declares for that code.",
		...constItem(
			"pub ",
			"UNKNOWN_REQUIRED_EXTENSION_OWNER",
			"&str",
			atom(rustString(reader.owner)),
		),
	];
	return `${lines.join("\n")}\n`;
}

function renderTypesModule(model) {
	const lines = ["//! One module per generated type.", ""];
	const modules = model.types.map((type) => type.moduleName).sort(byCodePoint);
	for (const module of modules) lines.push(`pub mod ${module};`);
	return `${lines.join("\n")}\n`;
}

function renderLib(model) {
	const lines = [
		"#![forbid(unsafe_code)]",
		"#![deny(missing_docs)]",
		`//! Generated Rust/Serde declarations for \`${model.package.identity}\`.`,
		"//!",
		"//! Every declaration here is derived from the semantic contract by one",
		"//! published mapping. Nothing in this crate is hand-written and nothing in",
		"//! it should be hand-edited.",
		"",
		"pub mod identity;",
		"pub mod provenance;",
		"pub mod support;",
		"pub mod types;",
		"",
		"pub use crate::identity::{FieldMeta, TypeMeta, TYPES};",
	];
	const reexports = model.types
		.map(
			(type) => `pub use crate::types::${type.moduleName}::${type.typeName};`,
		)
		.sort(byCodePoint);
	lines.push(...reexports);
	lines.push("");
	lines.push(
		"/// One variant per generated type.",
		"///",
		"/// A consumer that matches exhaustively over this enum stops compiling when",
		"/// the contract gains a type, which is the point: a contract addition is a",
		"/// compile error in the consumer rather than a silent omission.",
		"#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]",
		"pub enum SemanticType {",
	);
	for (const type of model.types) {
		lines.push(...docLines(type.doc, "    "));
		lines.push(`    ${type.typeName},`);
	}
	lines.push("}");
	lines.push("");
	lines.push(
		"impl SemanticType {",
		"    /// The semantic identity of the type the variant names.",
		"    pub fn identity(&self) -> &'static str {",
		"        match self {",
	);
	for (const type of model.types) {
		lines.push(
			...matchArm(
				"            ",
				`SemanticType::${type.typeName}`,
				rustString(type.identity),
			),
		);
	}
	lines.push("        }", "    }", "}");

	const declared = [
		...new Set(
			[
				...model.extensions.map((extension) => extension.identity),
				...model.types.flatMap((type) =>
					type.extensions.map((extension) => extension.identity),
				),
			].sort(byCodePoint),
		),
	];
	lines.push(
		"",
		"/// Every extension identity the contract this crate was generated from",
		"/// declares, ordered by code point.",
		...constItem(
			"pub ",
			"DECLARED_EXTENSION_IDENTITIES",
			"&[&str]",
			slice(declared.map((identity) => atom(rustString(identity)))),
		),
		"",
		"/// The capabilities this crate admits.",
		"///",
		"/// Empty, and empty is a stated decision rather than an omission.",
		"/// `consumer-policy.schema.json` is sealed and carries no capability",
		"/// member, and the published `rust` target contract declares no capability",
		"/// list, so there is no published input a non-empty set could be read from.",
		"/// That is GAP-007 in `conformance/contract-gaps.json`, owned by issue #9.",
		"/// A crate that claimed to admit a capability nobody published would be",
		"/// inventing the rule the gap records as missing.",
		...constItem("pub ", "ADMITTED_CAPABILITIES", "&[&str]", slice([])),
		"",
		"/// Decides one extension against this crate's declared set.",
		"///",
		"/// An empty result is acceptance; a blocking diagnostic is rejection. A",
		"/// `required: false` extension is always preserved, whatever its identity.",
		"pub fn decide_extension(extension: &support::Extension) -> Vec<support::Diagnostic> {",
		"    extension.decide(DECLARED_EXTENSION_IDENTITIES, ADMITTED_CAPABILITIES)",
		"}",
	);
	return `${lines.join("\n")}\n`;
}

// ---------------------------------------------------------------------------
// Semantic identity
// ---------------------------------------------------------------------------

const IDENTITY_PRELUDE = `//! The semantic identity of everything this crate declares, emitted beside
//! the types it belongs to.
//!
//! Every member the IR carries survives generation into a \`const\` here:
//! \`roles\`, \`origin\`, \`relationships\`, \`operations\`, \`clauses\`,
//! \`occurrences\` and \`extensions\`. An \`operation\` reaches the crate as
//! data and never as a Rust function: it has no body in the IR, so a
//! generated function would have nothing to put in one.
//!
//! The crate's *provenance* — what it was generated from and by — is a
//! different concept and lives in \`provenance.rs\` (FR-137, ADR-0007). The two
//! were once named \`identity.rs\` and \`metadata.rs\` here and the opposite way
//! round in the generated TypeScript package, which is the defect that
//! renaming repairs.

/// A source locus the IR carried.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct SourceLocusMeta {
    /// The identity of the source the node came from.
    pub source_identity: &'static str,
    /// The path inside that source.
    pub path: &'static str,
    /// The one-based start line.
    pub start_line: u64,
    /// The one-based start column.
    pub start_column: u64,
    /// The one-based end line, where the IR carried one.
    pub end_line: Option<u64>,
    /// The one-based end column, where the IR carried one.
    pub end_column: Option<u64>,
}

/// A generated origin the IR carried.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct GeneratedOriginMeta {
    /// The generator's semantic identity.
    pub generator_identity: &'static str,
    /// The generator's version.
    pub generator_version: &'static str,
    /// The identities the generator consumed.
    pub input_identities: &'static [&'static str],
}

/// The origin of a node: a source locus, or a generation record.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct OriginMeta {
    /// The source locus, where the node came from a source.
    pub source: Option<SourceLocusMeta>,
    /// The generation record, where the node was generated.
    pub generated: Option<GeneratedOriginMeta>,
}

/// A multiplicity the IR carried.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct MultiplicityMeta {
    /// The lower bound.
    pub lower: u64,
    /// The upper bound, where the IR declared one.
    pub upper: Option<u64>,
    /// Whether the collection is ordered, where the IR declared it.
    pub ordered: Option<bool>,
    /// Whether the collection's items are unique, where the IR declared it.
    pub unique: Option<bool>,
}

/// An extension the IR carried.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct ExtensionMeta {
    /// The extension's semantic identity.
    pub identity: &'static str,
    /// The extension's version.
    pub version: &'static str,
    /// Whether a consumer must understand the extension.
    pub required: bool,
    /// The capability the extension claims.
    pub capability: Option<&'static str>,
    /// The extension payload, as canonical JSON text.
    pub payload: &'static str,
}

/// A relationship the IR carried.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct RelationshipMeta {
    /// The relationship's semantic identity.
    pub identity: &'static str,
    /// The verb.
    pub verb: &'static str,
    /// The edge category.
    pub category: &'static str,
    /// Whether the relationship is composite.
    pub composite: bool,
    /// The target type's semantic identity.
    pub target: &'static str,
    /// The relationship's multiplicity.
    pub multiplicity: MultiplicityMeta,
    /// The relationship's origin.
    pub origin: OriginMeta,
}

/// One parameter of an operation.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct ParamMeta {
    /// The parameter's semantic identity.
    pub identity: &'static str,
    /// The parameter's wire name.
    pub name: &'static str,
    /// The derived Rust identifier.
    pub rust_name: &'static str,
    /// The parameter type's semantic identity.
    pub type_ref: &'static str,
    /// The mapped Rust type, as text.
    pub rust_type: &'static str,
    /// Whether the parameter is nullable.
    pub nullable: bool,
    /// The parameter's multiplicity.
    pub multiplicity: MultiplicityMeta,
}

/// An operation's return.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct ReturnMeta {
    /// The return type's semantic identity.
    pub type_ref: &'static str,
    /// The mapped Rust type, as text.
    pub rust_type: &'static str,
    /// Whether the return is nullable.
    pub nullable: bool,
    /// The return's multiplicity.
    pub multiplicity: MultiplicityMeta,
}

/// An operation the IR carried.
///
/// It is metadata, not a function: the IR gives an operation no body.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct OperationMeta {
    /// The operation's semantic identity.
    pub identity: &'static str,
    /// The operation's wire name.
    pub name: &'static str,
    /// The parameters.
    pub params: &'static [ParamMeta],
    /// The return, where the operation declares one.
    pub returns: Option<ReturnMeta>,
    /// The identifiers of the precondition clauses.
    pub pre: &'static [&'static str],
    /// The identifiers of the postcondition clauses.
    pub post: &'static [&'static str],
    /// The operation's origin.
    pub origin: OriginMeta,
}

/// A clause the IR carried.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct ClauseMeta {
    /// The clause's semantic identity.
    pub identity: &'static str,
    /// The clause language.
    pub language: &'static str,
    /// The clause identifier operations refer to it by.
    pub clause_id: &'static str,
    /// The clause text.
    pub text: &'static str,
    /// The clause's source span, where the IR carried one.
    pub source_span: Option<SourceLocusMeta>,
    /// The clause's origin.
    pub origin: OriginMeta,
}

/// One generated field.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct FieldMeta {
    /// The field's semantic identity.
    pub identity: &'static str,
    /// The field's wire name.
    pub name: &'static str,
    /// The derived Rust identifier.
    pub rust_name: &'static str,
    /// The field type's semantic identity.
    pub type_ref: &'static str,
    /// The mapped Rust member type, as text.
    pub rust_type: &'static str,
    /// The mapping-table row the member type came from.
    pub row: &'static str,
    /// The derived presence.
    pub presence: &'static str,
    /// Whether the field is nullable.
    pub nullable: bool,
    /// The field's multiplicity.
    pub multiplicity: MultiplicityMeta,
    /// The UCUM symbol the field carries, where it carries one.
    pub unit: Option<&'static str>,
    /// The field's default kind.
    pub default_kind: &'static str,
    /// The field's default value as canonical JSON text, where it carries one.
    pub default_value: Option<&'static str>,
    /// The field's origin.
    pub origin: OriginMeta,
}

/// One generated type.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct TypeMeta {
    /// The type's semantic identity.
    pub identity: &'static str,
    /// The type's display name.
    pub display_name: &'static str,
    /// The IR kind.
    pub kind: &'static str,
    /// The derived Rust type name.
    pub rust_name: &'static str,
    /// The roles the IR carried, in document order.
    pub roles: &'static [&'static str],
    /// The unknown-member policy.
    pub unknown_policy: &'static str,
    /// The type's origin.
    pub origin: OriginMeta,
    /// The type's fields, for a record.
    pub fields: &'static [FieldMeta],
    /// The type's relationships.
    pub relationships: &'static [RelationshipMeta],
    /// The type's operations.
    pub operations: &'static [OperationMeta],
    /// The type's clauses.
    pub clauses: &'static [ClauseMeta],
    /// The type's extensions.
    pub extensions: &'static [ExtensionMeta],
}

/// An occurrence the IR carried.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct OccurrenceMeta {
    /// The occurrence's semantic identity.
    pub identity: &'static str,
    /// The type the occurrence is an instance of.
    pub definition: &'static str,
    /// The observation timestamp the IR carried.
    pub observed_at: &'static str,
    /// The observed value, as canonical JSON text.
    pub value: &'static str,
}
`;

function relationshipMeta(relationship) {
	return struct(`${META}::RelationshipMeta`, [
		{ name: "identity", value: atom(rustString(relationship.identity)) },
		{ name: "verb", value: atom(rustString(relationship.verb)) },
		{ name: "category", value: atom(rustString(relationship.category)) },
		{ name: "composite", value: atom(String(relationship.composite === true)) },
		{ name: "target", value: atom(rustString(relationship.target)) },
		{
			name: "multiplicity",
			value: multiplicityMeta(relationship.multiplicity),
		},
		{ name: "origin", value: originMeta(relationship.origin) },
	]);
}

function paramMeta(param, model) {
	return struct(`${META}::ParamMeta`, [
		{ name: "identity", value: atom(rustString(param.identity)) },
		{ name: "name", value: atom(rustString(param.name)) },
		{ name: "rust_name", value: atom(rustString(snake(param.name))) },
		{ name: "type_ref", value: atom(rustString(param.typeRef)) },
		{
			name: "rust_type",
			value: atom(rustString(metadataRustType(param, model))),
		},
		{ name: "nullable", value: atom(String(param.nullable === true)) },
		{ name: "multiplicity", value: multiplicityMeta(param.multiplicity) },
	]);
}

function operationMeta(operation, constant, model) {
	const returns =
		operation.returns === undefined
			? atom("None")
			: some(
					struct(`${META}::ReturnMeta`, [
						{
							name: "type_ref",
							value: atom(rustString(operation.returns.typeRef)),
						},
						{
							name: "rust_type",
							value: atom(
								rustString(metadataRustType(operation.returns, model)),
							),
						},
						{
							name: "nullable",
							value: atom(String(operation.returns.nullable === true)),
						},
						{
							name: "multiplicity",
							value: multiplicityMeta(operation.returns.multiplicity),
						},
					]),
				);
	return struct(`${META}::OperationMeta`, [
		{ name: "identity", value: atom(rustString(operation.identity)) },
		{ name: "name", value: atom(rustString(operation.name)) },
		{ name: "params", value: atom(`${constant}_PARAMS`) },
		{ name: "returns", value: returns },
		{
			name: "pre",
			value: slice(
				(operation.pre ?? [])
					.filter((entry) => typeof entry === "string")
					.map((entry) => atom(rustString(entry))),
			),
		},
		{
			name: "post",
			value: slice(
				(operation.post ?? [])
					.filter((entry) => typeof entry === "string")
					.map((entry) => atom(rustString(entry))),
			),
		},
		{ name: "origin", value: originMeta(operation.origin) },
	]);
}

function clauseMeta(clause) {
	return struct(`${META}::ClauseMeta`, [
		{ name: "identity", value: atom(rustString(clause.identity)) },
		{ name: "language", value: atom(rustString(clause.language)) },
		{ name: "clause_id", value: atom(rustString(clause.clauseId)) },
		{ name: "text", value: atom(rustString(clause.text)) },
		{ name: "source_span", value: locusMeta(clause.sourceSpan) },
		{ name: "origin", value: originMeta(clause.origin) },
	]);
}

function typeMeta(type) {
	const fields = isRecordShaped(type)
		? atom(`crate::types::${type.moduleName}::FIELDS`)
		: slice([]);
	const named = (list, suffix) =>
		list.length > 0 ? atom(`${type.constantName}_${suffix}`) : slice([]);
	return struct(`${META}::TypeMeta`, [
		{ name: "identity", value: atom(rustString(type.identity)) },
		{ name: "display_name", value: atom(rustString(type.displayName)) },
		{ name: "kind", value: atom(rustString(type.kind)) },
		{ name: "rust_name", value: atom(rustString(type.typeName)) },
		{
			name: "roles",
			value: slice(type.roles.map((role) => atom(rustString(role)))),
		},
		{ name: "unknown_policy", value: atom(rustString(type.unknownPolicy)) },
		{ name: "origin", value: originMeta(type.origin) },
		{ name: "fields", value: fields },
		{
			name: "relationships",
			value: named(type.relationships, "RELATIONSHIPS"),
		},
		{ name: "operations", value: named(type.operations, "OPERATIONS") },
		{ name: "clauses", value: named(type.clauses, "CLAUSES") },
		{ name: "extensions", value: named(type.extensions, "EXTENSIONS") },
	]);
}

function occurrenceMeta(occurrence) {
	return struct(`${META}::OccurrenceMeta`, [
		{ name: "identity", value: atom(rustString(occurrence.identity)) },
		{ name: "definition", value: atom(rustString(occurrence.definition)) },
		{ name: "observed_at", value: atom(rustString(occurrence.observedAt)) },
		{ name: "value", value: atom(rustString(canonicalJson(occurrence.value))) },
	]);
}

function renderIdentity(model) {
	const lines = [IDENTITY_PRELUDE.replace(/\n+$/, ""), ""];

	for (const type of model.types) {
		if (type.relationships.length > 0) {
			lines.push(
				...constItem(
					"",
					`${type.constantName}_RELATIONSHIPS`,
					"&[RelationshipMeta]",
					slice(type.relationships.map(relationshipMeta)),
				),
				"",
			);
		}
		for (const operation of type.operations) {
			const constant = `${type.constantName}_OP_${screaming(operation.name)}`;
			lines.push(
				...constItem(
					"",
					`${constant}_PARAMS`,
					"&[ParamMeta]",
					slice(
						(operation.params ?? []).map((param) => paramMeta(param, model)),
					),
				),
				"",
			);
		}
		if (type.operations.length > 0) {
			lines.push(
				...constItem(
					"",
					`${type.constantName}_OPERATIONS`,
					"&[OperationMeta]",
					slice(
						type.operations.map((operation) =>
							operationMeta(
								operation,
								`${type.constantName}_OP_${screaming(operation.name)}`,
								model,
							),
						),
					),
				),
				"",
			);
		}
		if (type.clauses.length > 0) {
			lines.push(
				...constItem(
					"",
					`${type.constantName}_CLAUSES`,
					"&[ClauseMeta]",
					slice(type.clauses.map(clauseMeta)),
				),
				"",
			);
		}
		if (type.extensions.length > 0) {
			lines.push(
				...constItem(
					"",
					`${type.constantName}_EXTENSIONS`,
					"&[ExtensionMeta]",
					slice(type.extensions.map(extensionMeta)),
				),
				"",
			);
		}
	}

	lines.push(
		"/// Every generated type, in the order the contract declares them.",
		...constItem(
			"pub ",
			"TYPES",
			"&[TypeMeta]",
			slice(model.types.map(typeMeta)),
		),
		"",
		"/// Every occurrence the contract carried, in document order.",
		...constItem(
			"pub ",
			"OCCURRENCES",
			"&[OccurrenceMeta]",
			slice(model.occurrences.map(occurrenceMeta)),
		),
		"",
		"/// Every extension the contract package carried, in document order.",
		...constItem(
			"pub ",
			"PACKAGE_EXTENSIONS",
			"&[ExtensionMeta]",
			slice(model.extensions.map(extensionMeta)),
		),
	);
	if (carriesConstructData(model)) lines.push(...constructPrelude(model));
	return `${lines.join("\n")}\n`;
}

/** The mapped Rust type of an operation parameter or return, as metadata text. */
function metadataRustType(node, model) {
	const type = model.types.find((entry) => entry.identity === node.typeRef);
	const base = type === undefined ? "()" : `crate::${type.typeName}`;
	let rendered = base;
	if (node.nullable === true)
		rendered = `crate::support::Nullable<${rendered}>`;
	const upper = node.multiplicity?.upper;
	if (upper === undefined || upper > 1) rendered = `Vec<${rendered}>`;
	if ((node.multiplicity?.lower ?? 1) === 0) rendered = `Option<${rendered}>`;
	return rendered;
}

function screaming(text) {
	return String(text)
		.replace(/[^A-Za-z0-9]+/g, "_")
		.replace(/([a-z0-9])([A-Z])/g, "$1_$2")
		.toUpperCase();
}

function snake(text) {
	return String(text)
		.replace(/[^A-Za-z0-9]+/g, "_")
		.replace(/([a-z0-9])([A-Z])/g, "$1_$2")
		.toLowerCase();
}

// ---------------------------------------------------------------------------
// Per-type modules
// ---------------------------------------------------------------------------

/**
 * A function signature, on one line where it fits and one parameter per line
 * where it does not — which is what `rustfmt` does at the pinned `max_width`.
 */
function signature(indent, head, parameters, returnType) {
	const inline = `${indent}${head}(${parameters.join(", ")}) -> ${returnType} {`;
	if (inline.length <= MAX_WIDTH) return [inline];
	return [
		`${indent}${head}(`,
		...parameters.map((parameter) => `${indent}    ${parameter},`),
		`${indent}) -> ${returnType} {`,
	];
}

/**
 * `Ok(Self { .. })`, inline while the struct literal stays inside
 * `struct_lit_width`, and one field per line beyond it.
 */
function okSelf(indent, fields) {
	const body = fields.join(", ");
	const inline = fields.length === 0 ? "Self {}" : `Self { ${body} }`;
	if (
		body.length <= STRUCT_LIT_WIDTH &&
		indent.length + inline.length + 4 <= MAX_WIDTH
	) {
		return [`${indent}Ok(${inline})`];
	}
	return [
		`${indent}Ok(Self {`,
		...fields.map((field) => `${indent}    ${field},`),
		`${indent}})`,
	];
}

/**
 * The `Self::try_new(..).map_err(..)` call a `Deserialize` ends with.
 *
 * Three forms, because `rustfmt` breaks this shape in two stages and measuring
 * only `max_width` finds the wrong one. When the whole expression does not fit,
 * the formatter breaks the *method chain* first and leaves the call on one line,
 * indenting the chained call by four; it breaks the argument list only when the
 * arguments themselves exceed `fn_call_width`.
 *
 * Measured against rustfmt 1.9.0-stable (Rust 1.98.1) under the pinned
 * `rustfmt.toml` rather than reasoned about. Emitting the fully-broken form for a call whose arguments
 * fit inside `fn_call_width` produced output the formatter rewrites — a real
 * `rustfmt --check` failure that no corpus base reaches, because their records
 * carry two or eight fields and both of those land in the other two branches.
 * It was found while building the FR-061 consumer contract, on a three-field
 * record.
 */
function tryNewCall(indent, arguments_) {
	const tail = ".map_err(serde::de::Error::custom)";
	const joined = arguments_.join(", ");
	const inline = `${indent}Self::try_new(${joined})${tail}`;
	if (inline.length <= MAX_WIDTH) return [inline];
	if (joined.length <= FN_CALL_WIDTH) {
		return [`${indent}Self::try_new(${joined})`, `${indent}    ${tail}`];
	}
	return [
		`${indent}Self::try_new(`,
		...arguments_.map((argument) => `${indent}    ${argument},`),
		`${indent})`,
		`${indent}${tail}`,
	];
}

function renderType(type, model, byIdentity, diagnostics) {
	if (isRecordShaped(type) && type.abstract === true)
		return renderAbstract(type);
	if (isRecordShaped(type))
		return renderRecord(type, model, byIdentity, diagnostics);
	if (isEnumerationShaped(type) || type.kind === "union")
		return renderEnum(type);
	if (renderingOf(type) === "interface") return renderInterface(type);
	if (renderingOf(type) === "namespace") return renderNamespace(type);
	return renderNewtype(type, model, byIdentity, diagnostics);
}

/**
 * The module header of one generated type.
 *
 * Where the type's `unknownPolicy` is inert for its kind, the header says so.
 * The statement goes here rather than into the type's own doc comment because
 * FR-056 fixes that comment as a total function of four parts and a fifth
 * sentence would change a derivation the goldens measure; the module doc is the
 * generated documentation for the same node and carries the record without
 * moving that function.
 */
function moduleHeader(type) {
	const lines = [
		`//! ${escapeDoc(type.displayName)}`,
		"//!",
		`//! Semantic identity: ${escapeDoc(type.identity)}.`,
	];
	if (type.unknownDisposition === "inert") {
		lines.push(
			"//!",
			`//! Unknown policy: \`${escapeDoc(type.unknownPolicy)}\`, which is inert for a`,
			`//! \`${type.kind}\` — the kind has no unknown member for a policy to govern. The`,
			"//! declared value is carried verbatim in this type's metadata constant.",
		);
	}
	lines.push("");
	return lines;
}

function checkConstants(type, checks, byIdentity) {
	const lines = [];
	checks.forEach((check, index) => {
		if (check.form === "matcher") {
			lines.push(
				...renderProgram(
					`${type.constantName}_PATTERN_${index}`,
					`The pattern of ${check.identity}, lowered to a matcher program.`,
					check.program,
					{ visibility: "", instPath: "crate::support::MatcherInst" },
				),
				"",
			);
		}
		if (check.form === "enumValues") {
			const rustType =
				check.scalar === "boolean"
					? "bool"
					: check.scalar === "integer"
						? "i64"
						: check.scalar === "number"
							? "f64"
							: "&str";
			const values = check.values.map((value) =>
				typeof value === "string"
					? rustString(value)
					: typeof value === "boolean"
						? String(value)
						: check.scalar === "integer"
							? `${value}i64`
							: `${renderF64(value)}`,
			);
			lines.push(
				`/// The values ${check.identity} admits.`,
				...constItem(
					"",
					`${type.constantName}_ENUM_${index}`,
					`&[${rustType}]`,
					slice(values.map(atom)),
				),
				"",
			);
		}
	});
	return lines;
}

function renderF64(value) {
	return Number.isInteger(value) ? `${value}.0f64` : `${value}f64`;
}

/**
 * Renders the body of one constraint check against `expression`.
 *
 * Every generated failure is a `return Err(ValidationError::…(..));`, and the
 * arguments go through `callLines` so the emitted form is already the one
 * `rustfmt` would choose.
 */
function renderCheck(type, check, index, expression, subjectScalar) {
	const identity = rustString(check.identity);
	const keyword = rustString(check.keyword);
	const at = rustString("");
	const fail = (operand, input) =>
		callLines(
			"                ",
			input === undefined
				? "return Err(crate::support::ValidationError::new"
				: "return Err(crate::support::ValidationError::with_input",
			input === undefined
				? [identity, keyword, at, operand]
				: [identity, keyword, at, operand, input],
			");",
		);
	const lines = [];
	// A scalar newtype hands its constructor the base by value, so `value` is
	// already the `i64` or `f64` a numeric comparison needs. An alias reaches its
	// base through one `get()` per hop, which yields a reference, so the copy is
	// taken here rather than left for the comparison to fail on.
	const owned = expression === "value" ? "value" : `(*${expression})`;
	const COMPARISONS = {
		min: "<",
		max: ">",
		exclusiveMin: "<=",
		exclusiveMax: ">=",
	};

	switch (check.form) {
		case "length": {
			const comparison = check.keyword === "minLength" ? "<" : ">";
			lines.push(
				`            if ${expression}.chars().count() ${comparison} ${check.value}usize {`,
				...fail(rustString(String(check.value)), `${expression}.as_str()`),
				"            }",
			);
			break;
		}
		case "numeric": {
			const literal =
				check.scalar === "integer"
					? `${check.value}i64`
					: renderF64(check.value);
			lines.push(
				`            if ${owned} ${COMPARISONS[check.keyword]} ${literal} {`,
				...fail(rustString(String(check.value))),
				"            }",
			);
			break;
		}
		case "instant": {
			const reader =
				check.scalar === "date"
					? "crate::support::date_instant"
					: "crate::support::date_time_instant";
			const head = `            let instant_${index} = ${reader}(${expression}.as_str())`;
			const opener = `${head}.ok_or_else(|| {`;
			lines.push(
				...(opener.length <= MAX_WIDTH
					? [opener]
					: [head, "                .ok_or_else(|| {"]),
				...callLines(
					opener.length <= MAX_WIDTH
						? "                "
						: "                    ",
					"crate::support::ValidationError::with_input",
					[
						identity,
						keyword,
						at,
						rustString(check.value),
						`${expression}.as_str()`,
					],
					"",
				),
				opener.length <= MAX_WIDTH
					? "            })?;"
					: "                })?;",
				`            if instant_${index} ${COMPARISONS[check.keyword]} ${check.instant.toString()}i128 {`,
				...fail(rustString(check.value), `${expression}.as_str()`),
				"            }",
			);
			break;
		}
		case "matcher": {
			const program = `${type.constantName}_PATTERN_${index}`;
			lines.push(
				`            if crate::support::matches_pattern(${program}, ${expression}.as_str())`,
				"                != crate::support::MatchOutcome::Matched",
				"            {",
				...fail(rustString(check.regex), `${expression}.as_str()`),
				"            }",
			);
			break;
		}
		case "proved": {
			lines.push(
				`            if crate::support::${check.validator}::try_new(${expression}.to_string())`,
				"                .is_err()",
				"            {",
				...fail(rustString(check.regex), `${expression}.as_str()`),
				"            }",
			);
			break;
		}
		case "enumValues": {
			const constant = `${type.constantName}_ENUM_${index}`;
			const numeric =
				check.scalar === "integer" ||
				check.scalar === "number" ||
				check.scalar === "boolean";
			const subject = numeric ? owned : `${expression}.as_str()`;
			lines.push(
				`            if !${constant}.contains(&${subject}) {`,
				...fail(rustString(canonicalJson(check.values))),
				"            }",
			);
			break;
		}
		case "nonEmpty": {
			const test =
				check.subject === "string"
					? `${expression}.chars().count() == 0`
					: `${expression}.is_empty()`;
			lines.push(
				`            if ${test} {`,
				...fail(rustString("a non-empty value")),
				"            }",
			);
			break;
		}
		case "unique": {
			lines.push(
				`            for left in 0..${expression}.len() {`,
				`                for right in (left + 1)..${expression}.len() {`,
				`                    if ${expression}[left] == ${expression}[right] {`,
				...callLines(
					"                        ",
					"return Err(crate::support::ValidationError::new",
					[identity, keyword, at, rustString("pairwise distinct items")],
					");",
				),
				"                    }",
				"                }",
				"            }",
			);
			break;
		}
		default:
			break;
	}
	return lines;
}

/**
 * `let inner = <T as Deserialize>::deserialize(deserializer)?;`, wrapped the
 * way `rustfmt` wraps it when the mapped inner type is wide.
 */
function innerDeserialize(indent, inner) {
	const call = `<${inner} as Deserialize>::deserialize(deserializer)?;`;
	const oneLine = `${indent}let inner = ${call}`;
	if (oneLine.length <= MAX_WIDTH) return [oneLine];
	const nested = `${indent}    ${call}`;
	if (nested.length <= MAX_WIDTH) return [`${indent}let inner =`, nested];
	return [
		`${indent}let inner =`,
		`${indent}    <${inner} as Deserialize>::deserialize(`,
		`${indent}        deserializer,`,
		`${indent}    )?;`,
	];
}

function renderNewtype(type, model, byIdentity, diagnostics) {
	const lines = moduleHeader(type);
	const inner = type.inner;
	const definition = byIdentity.get(type.identity);
	const access = subjectAccess(definition, byIdentity);
	const subjectDefinition = access?.definition;
	const subjectScalar = subjectDefinition?.scalar;
	const expression = access?.expression ?? "value";
	const checks = type.checks ?? [];

	lines.push("use serde::{Deserialize, Serialize};", "");
	lines.push(...checkConstants(type, checks, byIdentity));
	lines.push(...docLines(type.doc));
	lines.push(
		// A newtype an identity field reaches has `Eq` and `Hash` (FR-054).
		type.derivesHash === true
			? "#[derive(Clone, Debug, PartialEq, Eq, Hash, Serialize)]"
			: "#[derive(Clone, Debug, PartialEq, Serialize)]",
		"#[serde(transparent)]",
		`pub struct ${type.typeName}(${inner});`,
		"",
		`impl ${type.typeName} {`,
		"    /// Builds the value, enforcing every constraint the contract declares",
		"    /// on it. Deserialization routes through this constructor, so a value",
		"    /// that violates a constraint cannot arrive from the wire either.",
		...signature(
			"    ",
			"pub fn try_new",
			[`value: ${inner}`],
			"Result<Self, crate::support::ValidationError>",
		),
	);
	if (checks.length > 0) {
		lines.push("        {");
		checks.forEach((check, index) => {
			lines.push(...renderCheck(type, check, index, expression, subjectScalar));
		});
		lines.push("        }");
	}
	lines.push(
		"        Ok(Self(value))",
		"    }",
		"",
		"    /// The wrapped value.",
		`    pub fn get(&self) -> &${inner} {`,
		"        &self.0",
		"    }",
		"",
		"    /// The wrapped value, consuming the newtype.",
		`    pub fn into_inner(self) -> ${inner} {`,
		"        self.0",
		"    }",
		"",
		"    /// The non-blocking diagnostics this value carries.",
		"    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {",
		"        Vec::new()",
		"    }",
		"}",
		"",
		`impl<'de> Deserialize<'de> for ${type.typeName} {`,
		"    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>",
		"    where",
		"        D: serde::Deserializer<'de>,",
		"    {",
		...innerDeserialize("        ", inner),
		"        Self::try_new(inner).map_err(serde::de::Error::custom)",
		"    }",
		"}",
	);
	return `${lines.join("\n")}\n`;
}

/**
 * An `enum` or a `union`.
 *
 * Under `reject` the derive is enough: serde's own default makes an
 * unrecognised variant a deserialization error. Under `preserve` or `surface`
 * the type gains a generated catch-all `Unknown` variant, and the two impls are
 * written out rather than derived — serde's `#[serde(other)]` is a unit-variant
 * attribute for an internally or adjacently tagged enum, and neither a
 * string-shaped enum nor an externally tagged union is one of those, so a
 * derived catch-all cannot keep the tag it caught.
 */
function renderEnum(type) {
	const lines = moduleHeader(type);
	const catchAll = type.unknownDisposition === "variant-catchall";
	const union = type.kind === "union";
	lines.push("use serde::{Deserialize, Serialize};", "");
	lines.push(...docLines(type.doc));
	lines.push(
		catchAll
			? "#[derive(Clone, Debug, PartialEq)]"
			: "#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]",
	);
	if (union && type.wireForm === "untagged") lines.push("#[serde(untagged)]");
	lines.push(`pub enum ${type.typeName} {`);
	for (const variant of type.variants) {
		lines.push(...docLines(variant.doc, "    "));
		if (variant.rename !== undefined && !catchAll) {
			lines.push(`    #[serde(rename = ${rustString(variant.rename)})]`);
		}
		lines.push(
			variant.payload === undefined
				? `    ${variant.ident},`
				: `    ${variant.ident}(${variant.payload}),`,
		);
	}
	if (catchAll) {
		lines.push(
			"    /// A variant the contract does not declare, retained under this",
			`    /// type's \`${type.unknownPolicy}\` unknown policy.`,
			union
				? "    Unknown(crate::support::UnknownVariant),"
				: "    Unknown(String),",
		);
	}
	lines.push("}", "");

	if (catchAll) {
		lines.push(...(union ? unionImpls(type) : stringEnumImpls(type)), "");
	}

	lines.push(
		`impl ${type.typeName} {`,
		"    /// The non-blocking diagnostics this value carries.",
		"    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {",
	);
	if (catchAll && type.unknownPolicy === "surface") {
		lines.push(
			`        if let ${type.typeName}::Unknown(unknown) = self {`,
			"            return vec![crate::support::Diagnostic::new(",
			`                ${rustString(SURFACED.code)},`,
			`                ${rustString(SURFACED.severity)},`,
			`                ${rustString(SURFACED.owner)},`,
			`                ${SURFACED.blocking},`,
			...(union
				? formatCall(
						"                ",
						`"the variant {} is not declared by ${escapeDoc(type.identity)}"`,
						"unknown.tag()",
					)
				: formatCall(
						"                ",
						`"the variant {unknown} is not declared by ${escapeDoc(type.identity)}"`,
					)),
			"            )];",
			"        }",
		);
	}
	lines.push("        Vec::new()", "    }", "}");
	return `${lines.join("\n")}\n`;
}

/** The two impls of a string-shaped `enum` that carries a catch-all. */
function stringEnumImpls(type) {
	const lines = [`impl Serialize for ${type.typeName} {`];
	lines.push(
		"    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>",
		"    where",
		"        S: serde::Serializer,",
		"    {",
		"        serializer.serialize_str(match self {",
	);
	for (const variant of type.variants) {
		lines.push(
			...matchArm(
				"            ",
				`${type.typeName}::${variant.ident}`,
				rustString(variant.name),
			),
		);
	}
	lines.push(
		...matchArm(
			"            ",
			`${type.typeName}::Unknown(tag)`,
			"tag.as_str()",
		),
		"        })",
		"    }",
		"}",
		"",
		`impl<'de> Deserialize<'de> for ${type.typeName} {`,
		"    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>",
		"    where",
		"        D: serde::Deserializer<'de>,",
		"    {",
		"        let tag = String::deserialize(deserializer)?;",
		"        Ok(match tag.as_str() {",
	);
	for (const variant of type.variants) {
		lines.push(
			...matchArm(
				"            ",
				rustString(variant.name),
				`${type.typeName}::${variant.ident}`,
			),
		);
	}
	lines.push(
		...matchArm("            ", "_", `${type.typeName}::Unknown(tag)`),
		"        })",
		"    }",
		"}",
	);
	return lines;
}

/** The two impls of an externally tagged `union` that carries a catch-all. */
function unionImpls(type) {
	const lines = [`impl Serialize for ${type.typeName} {`];
	lines.push(
		"    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>",
		"    where",
		"        S: serde::Serializer,",
		"    {",
		"        use serde::ser::SerializeMap;",
		"        match self {",
	);
	for (const variant of type.variants) {
		if (variant.payload === undefined) {
			lines.push(
				...callArm(
					"            ",
					`${type.typeName}::${variant.ident}`,
					"serializer.serialize_str",
					[rustString(variant.name)],
					",",
				),
			);
			continue;
		}
		lines.push(
			`            ${type.typeName}::${variant.ident}(payload) => {`,
			"                let mut map = serializer.serialize_map(Some(1))?;",
			`                map.serialize_entry(${rustString(variant.name)}, payload)?;`,
			"                map.end()",
			"            }",
		);
	}
	lines.push(
		...matchArm(
			"            ",
			`${type.typeName}::Unknown(unknown)`,
			"unknown.serialize(serializer)",
		),
		"        }",
		"    }",
		"}",
		"",
		`impl<'de> Deserialize<'de> for ${type.typeName} {`,
		"    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>",
		"    where",
		"        D: serde::Deserializer<'de>,",
		"    {",
		`        deserializer.deserialize_any(${type.typeName}Visitor)`,
		"    }",
		"}",
		"",
		`struct ${type.typeName}Visitor;`,
		"",
		`impl<'de> serde::de::Visitor<'de> for ${type.typeName}Visitor {`,
		`    type Value = ${type.typeName};`,
		"",
		"    fn expecting(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {",
		`        formatter.write_str(${rustString(`an externally tagged ${type.typeName}`)})`,
		"    }",
		"",
		"    fn visit_str<E>(self, tag: &str) -> Result<Self::Value, E>",
		"    where",
		"        E: serde::de::Error,",
		"    {",
		"        Ok(match tag {",
	);
	for (const variant of type.variants) {
		if (variant.payload !== undefined) continue;
		lines.push(
			...matchArm(
				"            ",
				rustString(variant.name),
				`${type.typeName}::${variant.ident}`,
			),
		);
	}
	lines.push(
		...callArm(
			"            ",
			"_",
			`${type.typeName}::Unknown(crate::support::UnknownVariant::Tag`,
			["tag.to_owned()"],
			"),",
		),
		"        })",
		"    }",
		"",
		"    fn visit_map<A>(self, mut access: A) -> Result<Self::Value, A::Error>",
		"    where",
		"        A: serde::de::MapAccess<'de>,",
		"    {",
		"        let Some(tag) = access.next_key::<String>()? else {",
		...callLines(
			"            ",
			"return Err(serde::de::Error::custom",
			[rustString(`an externally tagged ${type.typeName} carries one member`)],
			");",
		),
		"        };",
		"        let value = match tag.as_str() {",
	);
	for (const variant of type.variants) {
		if (variant.payload === undefined) {
			lines.push(
				`            ${rustString(variant.name)} => {`,
				"                access.next_value::<serde::de::IgnoredAny>()?;",
				`                ${type.typeName}::${variant.ident}`,
				"            }",
			);
			continue;
		}
		lines.push(
			...callArm(
				"            ",
				rustString(variant.name),
				`${type.typeName}::${variant.ident}`,
				["access.next_value()?"],
				",",
			),
		);
	}
	lines.push(
		...callArm(
			"            ",
			"_",
			`${type.typeName}::Unknown(crate::support::UnknownVariant::Tagged`,
			["tag", "access.next_value()?"],
			"),",
		),
		"        };",
		"        Ok(value)",
		"    }",
		"}",
	);
	return lines;
}

/**
 * A `format!` call, wrapped when its arguments make the line too wide.
 *
 * `rustfmt` gives a sole literal a line of its own with no trailing comma, and
 * gives each argument of a longer call a line with one, so both shapes are
 * emitted here rather than approximated by one.
 */
function formatCall(indent, ...args) {
	const inline = `${indent}format!(${args.join(", ")}),`;
	if (inline.length <= MAX_WIDTH) return [inline];
	if (args.length === 1) {
		return [`${indent}format!(`, `${indent}    ${args[0]}`, `${indent}),`];
	}
	return [
		`${indent}format!(`,
		...args.slice(0, -1).map((argument) => `${indent}    ${argument},`),
		`${indent}    ${args[args.length - 1]}`,
		`${indent}),`,
	];
}

// The generated `validate` reports the registry's own code and owner rather
// than a spelling of them: a literal here would be a second registry that the
// closure gate could not see.
const SURFACED = RUST_BACKEND_CODES.UNKNOWN_MEMBER_SURFACED;

function renderRecord(type, model, byIdentity, diagnostics) {
	const lines = moduleHeader(type);
	const retains = type.unknownPolicy !== "reject";
	// An immutable construct: its members are private and read through accessors.
	const immutable = type.construct?.immutable === true;
	const visibility = immutable ? "" : "pub ";
	lines.push("use serde::{Deserialize, Serialize};", "");

	lines.push(...recordItems(type));

	for (const field of type.fields) {
		if (field.defaultKind !== "semantic") continue;
		const rendered = renderDefault(field, model, byIdentity);
		if (rendered === undefined) {
			diagnostics.push(
				diagnostic(RUST_BACKEND_CODES.INVALID_DEFAULT_VALUE, {
					message: `the field ${fragment(field.identity)} declares the default ${fragment(JSON.stringify(field.defaultValue))}, which its mapped Rust type \`${field.rustType}\` does not admit`,
					...(field.origin?.source ? { locus: field.origin.source } : {}),
				}),
			);
			continue;
		}
		lines.push(
			`fn default_${field.ident.replace(/^r#/, "")}() -> ${field.rustType} {`,
			`    ${rendered}`,
			"}",
			"",
		);
	}

	lines.push(...docLines(type.doc));
	// An identified construct compares and hashes by its identity fields, so
	// its `PartialEq` is written out rather than derived (FR-054).
	const byIdentityFields = (type.identityMembers ?? []).length > 0;
	lines.push(
		byIdentityFields
			? "#[derive(Clone, Debug, Serialize)]"
			: "#[derive(Clone, Debug, PartialEq, Serialize)]",
	);
	// A record with no members at all is written `{}` on one line, which is the
	// form `rustfmt` produces and the form an empty brace pair collapses to.
	const empty = type.fields.length === 0 && !retains;
	lines.push(`pub struct ${type.typeName} ${empty ? "{}" : "{"}`);
	for (const field of type.fields) {
		lines.push(...docLines(field.doc, "    "));
		const attributes = [];
		if (field.rename !== undefined) {
			attributes.push(`rename = ${rustString(field.rename)}`);
		}
		if (field.presence === "optional") {
			attributes.push('skip_serializing_if = "Option::is_none"');
		}
		if (attributes.length > 0) {
			lines.push(`    #[serde(${attributes.join(", ")})]`);
		}
		lines.push(`    ${visibility}${field.ident}: ${field.rustType},`);
	}
	if (retains) {
		lines.push(
			"    /// The members the contract did not declare, retained under this",
			`    /// record's \`${type.unknownPolicy}\` unknown policy.`,
			"    #[serde(flatten)]",
			`    ${visibility}unknown_members: crate::support::UnknownMembers,`,
		);
	}
	lines.push(...(empty ? [""] : ["}", ""]));
	if (byIdentityFields) lines.push(...identityEquality(type));
	for (const supertype of type.implements ?? [])
		lines.push(...supertypeImpl(type, supertype));

	// The wire struct carries the deserialization half of the attribute set.
	lines.push(
		`/// The deserialization shape of \`${type.typeName}\`.`,
		"///",
		"/// It exists so that `Deserialize` can route through `try_new`: serde has",
		"/// no post-deserialization hook, and a value that skipped the constructor",
		"/// would be a value the contract's constraints never saw.",
		"#[derive(Deserialize)]",
	);
	if (!retains) lines.push("#[serde(deny_unknown_fields)]");
	lines.push(`struct ${type.typeName}Wire ${empty ? "{}" : "{"}`);
	for (const field of type.fields) {
		const attributes = [];
		if (field.rename !== undefined) {
			attributes.push(`rename = ${rustString(field.rename)}`);
		}
		if (field.defaultKind === "semantic") {
			attributes.push(
				`default = "crate::types::${type.moduleName}::default_${field.ident.replace(/^r#/, "")}"`,
			);
		} else if (field.presence === "optional") {
			attributes.push("default");
		}
		if (field.presence === "optional" && field.nullable) {
			attributes.push('deserialize_with = "crate::support::present_or_absent"');
		}
		if (attributes.length > 0) {
			lines.push(`    #[serde(${attributes.join(", ")})]`);
		}
		lines.push(`    ${field.ident}: ${field.rustType},`);
	}
	if (retains) {
		lines.push(
			"    #[serde(flatten)]",
			"    unknown_members: crate::support::UnknownMembers,",
		);
	}
	lines.push(...(empty ? [""] : ["}", ""]));

	const parameters = type.fields.map(
		(field) => `${field.ident}: ${field.rustType}`,
	);
	if (retains)
		parameters.push("unknown_members: crate::support::UnknownMembers");

	lines.push(`impl ${type.typeName} {`);
	lines.push(
		"    /// Builds the record, enforcing every bound and uniqueness rule the",
		"    /// contract declares on its members. Deserialization routes through",
		"    /// this constructor.",
	);
	lines.push(
		...signature(
			"    ",
			"pub fn try_new",
			parameters,
			"Result<Self, crate::support::ValidationError>",
		),
	);
	for (const field of type.fields) {
		lines.push(...renderFieldChecks(field));
	}
	const initialisers = type.fields.map((field) => field.ident);
	if (retains) initialisers.push("unknown_members");
	lines.push(...okSelf("        ", initialisers), "    }", "");

	lines.push("    /// The non-blocking diagnostics this value carries.");
	lines.push("    pub fn validate(&self) -> Vec<crate::support::Diagnostic> {");
	if (type.unknownPolicy === "surface") {
		lines.push(
			"        self.unknown_members",
			"            .members()",
			"            .keys()",
			"            .map(|name| {",
			"                crate::support::Diagnostic::new(",
			`                    ${rustString(SURFACED.code)},`,
			`                    ${rustString(SURFACED.severity)},`,
			`                    ${rustString(SURFACED.owner)},`,
			`                    ${SURFACED.blocking},`,
			...formatCall(
				"                    ",
				`"the member {name} is not declared by ${escapeDoc(type.identity)}"`,
			),
			"                )",
			"            })",
			"            .collect()",
		);
	} else {
		lines.push("        Vec::new()");
	}
	lines.push("    }", "}", "");

	if (immutable) lines.push(...accessors(type, retains));

	const arity = type.fields.length + (retains ? 1 : 0);
	lines.push(
		`impl<'de> Deserialize<'de> for ${type.typeName} {`,
		"    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>",
		"    where",
		"        D: serde::Deserializer<'de>,",
		"    {",
		// A record with no members binds `_wire`: the wire shape is still
		// deserialized, so an undeclared member is still refused, but nothing
		// reads it and an unused binding is an error under `-D warnings`.
		`        let ${arity === 0 ? "_wire" : "wire"} = ${type.typeName}Wire::deserialize(deserializer)?;`,
	);
	const arguments_ = type.fields.map((field) => `wire.${field.ident}`);
	if (retains) arguments_.push("wire.unknown_members");
	lines.push(...tryNewCall("        ", arguments_));
	lines.push("    }", "}");
	return `${lines.join("\n")}\n`;
}

/**
 * The metadata constants of a record-shaped type: its fields, its identity
 * fields where it carries them, its construct members and its states.
 */
function recordItems(type) {
	// Field metadata lives beside the record it belongs to.
	const lines = [
		`/// The fields of \`${type.typeName}\`, in the order the contract declares them.`,
		...constItem(
			"pub ",
			"FIELDS",
			"&[crate::identity::FieldMeta]",
			slice(type.fields.map(fieldMeta)),
		),
		"",
	];
	if (type.identityFields !== undefined) {
		lines.push(
			`/// The fields that tell instances of \`${type.typeName}\` apart, in the order the contract declares them.`,
			...constItem(
				"pub ",
				"IDENTITY_FIELDS",
				"&[&str]",
				slice(type.identityFields.map((name) => atom(rustString(name)))),
			),
			"",
		);
	}
	lines.push(...constructItems(type));
	if (type.states !== undefined) lines.push(...renderStates(type));
	return lines;
}

/**
 * `PartialEq`, `Eq` and `Hash` over an identified construct's identity fields:
 * two instances with equal identity fields are one instance (FR-054).
 */
function identityEquality(type) {
	const members = type.identityMembers;
	const comparisons = members.map((ident) => `self.${ident} == other.${ident}`);
	const inline = `        ${comparisons.join(" && ")}`;
	const body =
		inline.length <= MAX_WIDTH
			? [inline]
			: comparisons.map((one, index) =>
					index === 0 ? `        ${one}` : `            && ${one}`,
				);
	const hashes = members.flatMap((ident) => {
		const call = `        ::std::hash::Hash::hash(&self.${ident}, state);`;
		return call.length <= MAX_WIDTH
			? [call]
			: [
					"        ::std::hash::Hash::hash(",
					`            &self.${ident},`,
					"            state,",
					"        );",
				];
	});
	return [
		`/// Instances of \`${type.typeName}\` are equal when their identity fields are equal.`,
		`impl PartialEq for ${type.typeName} {`,
		"    fn eq(&self, other: &Self) -> bool {",
		...body,
		"    }",
		"}",
		"",
		`impl Eq for ${type.typeName} {}`,
		"",
		`/// Instances of \`${type.typeName}\` hash by their identity fields.`,
		`impl ::std::hash::Hash for ${type.typeName} {`,
		"    fn hash<H: ::std::hash::Hasher>(&self, state: &mut H) {",
		...hashes,
		"    }",
		"}",
		"",
	];
}

/** A concrete subtype's implementation of an abstract supertype's trait. */
function supertypeImpl(type, supertype) {
	if (supertype.members.length === 0)
		return [`impl ${supertype.path} for ${type.typeName} {}`, ""];
	const lines = [`impl ${supertype.path} for ${type.typeName} {`];
	supertype.members.forEach((member, index) => {
		if (index > 0) lines.push("");
		lines.push(
			`    fn ${member.ident}(&self) -> &${member.rustType} {`,
			`        &self.${member.ident}`,
			"    }",
		);
	});
	lines.push("}", "");
	return lines;
}

/**
 * An abstract record-shaped type: a trait with one accessor per field, which
 * each concrete subtype implements. No value of the type itself exists
 * (FR-054).
 */
function renderAbstract(type) {
	const lines = moduleHeader(type);
	lines.push(...recordItems(type), ...docLines(type.doc));
	if (type.fields.length === 0) {
		lines.push(`pub trait ${type.typeName} {}`);
		return `${lines.join("\n")}\n`;
	}
	lines.push(`pub trait ${type.typeName} {`);
	type.fields.forEach((field, index) => {
		if (index > 0) lines.push("");
		lines.push(
			...docLines(field.doc, "    "),
			`    fn ${field.ident}(&self) -> &${field.rustType};`,
		);
	});
	lines.push("}");
	return `${lines.join("\n")}\n`;
}

/**
 * The bounds and uniqueness a collection member carries.
 *
 * `multiplicity.ordered` is recorded in the field's metadata constant and not
 * enforced here: `Vec` is ordered, and there is no unordered Rust collection
 * the mapping table declares to switch to.
 */
function renderFieldChecks(field) {
	if (!field.collection) return [];
	const lines = [];
	const multiplicity = field.multiplicity;
	const identity = rustString(field.identity);
	const path = rustString(field.name);
	const body = [];
	const boundFailure = (keyword, operand, indent) =>
		callLines(
			indent,
			"return Err(crate::support::ValidationError::new",
			[identity, rustString(keyword), path, operand],
			");",
		);
	if (multiplicity.lower > 0) {
		body.push(
			`            if items.len() < ${multiplicity.lower}usize {`,
			...boundFailure(
				"multiplicity.lower",
				rustString(String(multiplicity.lower)),
				"                ",
			),
			"            }",
		);
	}
	if (multiplicity.upper !== undefined) {
		body.push(
			`            if items.len() > ${multiplicity.upper}usize {`,
			...boundFailure(
				"multiplicity.upper",
				rustString(String(multiplicity.upper)),
				"                ",
			),
			"            }",
		);
	}
	if (multiplicity.unique === true) {
		body.push(
			"            for left in 0..items.len() {",
			"                for right in (left + 1)..items.len() {",
			"                    if items[left] == items[right] {",
			...boundFailure(
				"multiplicity.unique",
				rustString("pairwise distinct items"),
				"                        ",
			),
			"                    }",
			"                }",
			"            }",
		);
	}
	if (body.length === 0) return [];
	if (field.presence === "optional") {
		lines.push(`        if let Some(items) = &${field.ident} {`);
		lines.push(...body);
		lines.push("        }");
	} else {
		lines.push("        {");
		lines.push(`            let items = &${field.ident};`);
		lines.push(...body);
		lines.push("        }");
	}
	return lines;
}

/**
 * The Rust expression for a `semantic` default.
 *
 * A default that the mapped Rust type does not admit is `undefined`, and the
 * caller raises `INVALID_DEFAULT_VALUE` rather than rendering a value that
 * would not compile.
 */
function renderDefault(field, model, byIdentity) {
	const target = model.types.find((entry) => entry.identity === field.typeRef);
	if (target === undefined) return undefined;
	const build = (value) => {
		if (target.kind === "enum") {
			if (typeof value !== "string") return undefined;
			const variant = target.variants.find((entry) => entry.name === value);
			return variant === undefined
				? undefined
				: `crate::${target.typeName}::${variant.ident}`;
		}
		if (target.kind === "scalar") {
			const literal = scalarLiteral(target.scalar, value);
			return literal === undefined
				? undefined
				: `crate::${target.typeName}::try_new(${literal})\n        .expect("the contract declares a default its own constraints reject")`;
		}
		return undefined;
	};

	let expression;
	if (field.collection) {
		if (!Array.isArray(field.defaultValue)) return undefined;
		const items = field.defaultValue.map((item) => {
			const built = build(item);
			if (built === undefined) return undefined;
			return field.nullable
				? `crate::support::Nullable::Value(${built})`
				: built;
		});
		if (items.some((item) => item === undefined)) return undefined;
		expression = `vec![${items.join(", ")}]`;
	} else {
		if (field.nullable && field.defaultValue === null) {
			expression = "crate::support::Nullable::Null";
		} else {
			const built = build(field.defaultValue);
			if (built === undefined) return undefined;
			expression = field.nullable
				? `crate::support::Nullable::Value(${built})`
				: built;
		}
	}
	return field.presence === "optional" ? `Some(${expression})` : expression;
}

function scalarLiteral(scalar, value) {
	switch (scalar) {
		case "boolean":
			return typeof value === "boolean" ? String(value) : undefined;
		case "integer":
			return typeof value === "number" && Number.isInteger(value)
				? `${value}i64`
				: undefined;
		case "number":
			return typeof value === "number" && Number.isFinite(value)
				? renderF64(value)
				: undefined;
		default:
			return typeof value === "string"
				? `String::from(${rustString(value)})`
				: undefined;
	}
}

// ---------------------------------------------------------------------------
// Constructs (FR-142)
// ---------------------------------------------------------------------------

const strings = (list) => slice(list.map((one) => atom(rustString(one))));

/**
 * The module constants a construct carries beside its type: each member the
 * construct declares, and none it does not, so a plain `record` or an
 * identified record module is unchanged.
 */
function constructItems(type) {
	const facts = type.construct ?? {};
	const lines = [];
	const item = (doc, name, rustType, value) =>
		lines.push(`/// ${doc}`, ...constItem("pub ", name, rustType, value), "");
	const named = `\`${type.typeName}\``;
	if (facts.supertypes !== undefined)
		item(
			`The semantic identities of the direct supertypes of ${named}.`,
			"SUPERTYPES",
			"&[&str]",
			strings(facts.supertypes),
		);
	if (facts.abstract === true)
		item(
			`Whether ${named} is abstract: every instance is an instance of a subtype.`,
			"ABSTRACT",
			"bool",
			atom("true"),
		);
	if (facts.owner !== undefined)
		item(
			`The semantic identity of the type that owns ${named}.`,
			"OWNER",
			"&str",
			atom(rustString(facts.owner)),
		);
	if (facts.members !== undefined)
		item(
			`The semantic identities of the members of ${named}.`,
			"MEMBERS",
			"&[&str]",
			strings(facts.members),
		);
	if (facts.occurrenceField !== undefined)
		item(
			`The member of ${named} that records when the occurrence happened.`,
			"OCCURRENCE_FIELD",
			"&str",
			atom(rustString(facts.occurrenceField)),
		);
	if (facts.transitions !== undefined)
		item(
			`The transitions of ${named}, in the order the contract declares them.`,
			"TRANSITIONS",
			"&[crate::identity::TransitionMeta]",
			slice(facts.transitions.map(transitionMeta)),
		);
	if (facts.steps !== undefined)
		item(
			`The steps of ${named}, in the order the contract declares them.`,
			"STEPS",
			"&[crate::identity::StepMeta]",
			slice(facts.steps.map(stepMeta)),
		);
	if (facts.persists !== undefined)
		item(
			`The semantic identities of the types ${named} persists.`,
			"PERSISTS",
			"&[&str]",
			strings(facts.persists),
		);
	if (facts.vocabulary !== undefined)
		item(
			`The vocabulary of ${named}, in the order the contract declares it.`,
			"VOCABULARY",
			"&[crate::identity::TermMeta]",
			slice(
				facts.vocabulary.map((term) =>
					struct(`${META}::TermMeta`, [
						{ name: "term", value: atom(rustString(term.term)) },
						{ name: "doc", value: atom(rustString(term.doc)) },
					]),
				),
			),
		);
	const links = (map) =>
		slice(
			Object.entries(map).map(([field, targets]) =>
				struct(`${META}::FieldLinkMeta`, [
					{ name: "field", value: atom(rustString(field)) },
					{ name: "targets", value: strings([targets].flat()) },
				]),
			),
		);
	if (facts.subsets !== undefined)
		item(
			`The members of ${named} whose values are a subset of other members' values.`,
			"FIELD_SUBSETS",
			"&[crate::identity::FieldLinkMeta]",
			links(facts.subsets),
		);
	if (facts.redefines !== undefined)
		item(
			`The members of ${named} that redefine an inherited member.`,
			"FIELD_REDEFINES",
			"&[crate::identity::FieldLinkMeta]",
			links(facts.redefines),
		);
	if (facts.operationContracts !== undefined)
		item(
			`The frame and inline Quire clauses of the operations of ${named}.`,
			"OPERATION_CONTRACTS",
			"&[crate::identity::OperationContractMeta]",
			slice(
				Object.entries(facts.operationContracts).map(([operation, contract]) =>
					operationContractMeta(operation, contract),
				),
			),
		);
	return lines;
}

function transitionMeta(transition) {
	return struct(`${META}::TransitionMeta`, [
		{ name: "identity", value: atom(rustString(transition.identity)) },
		{ name: "from", value: atom(rustString(transition.from)) },
		{ name: "to", value: atom(rustString(transition.to)) },
		{ name: "trigger", value: atom(rustString(transition.trigger)) },
		{ name: "guard", value: optionStr(transition.guard) },
		{ name: "emits", value: strings(transition.emits) },
	]);
}

function stepMeta(step) {
	return struct(`${META}::StepMeta`, [
		{ name: "identity", value: atom(rustString(step.identity)) },
		{ name: "name", value: atom(rustString(step.name)) },
		{ name: "step_kind", value: atom(rustString(step.stepKind)) },
		{ name: "consumes", value: strings(step.consumes) },
		{ name: "emits", value: strings(step.emits) },
	]);
}

function operationContractMeta(operation, contract) {
	const clauses = (list) =>
		slice(
			(list ?? []).map((clause) =>
				struct(`${META}::InlineClauseMeta`, [
					{ name: "language", value: atom(rustString(clause.language)) },
					{ name: "text", value: atom(rustString(clause.text)) },
				]),
			),
		);
	const frame =
		contract.frame === undefined
			? atom("None")
			: some(
					struct(`${META}::FrameMeta`, [
						{ name: "modifies", value: strings(contract.frame.modifies) },
						{ name: "creates", value: strings(contract.frame.creates) },
						{ name: "deletes", value: strings(contract.frame.deletes) },
					]),
				);
	return struct(`${META}::OperationContractMeta`, [
		{ name: "operation", value: atom(rustString(operation)) },
		{ name: "frame", value: frame },
		{ name: "pre", value: clauses(contract.pre) },
		{ name: "post", value: clauses(contract.post) },
	]);
}

/** A state machine's states: one fieldless enum, serde-named by state name. */
function renderStates(type) {
	const lines = [
		`/// The states of \`${type.typeName}\`, in the order the contract declares them.`,
		"#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]",
		`pub enum ${type.typeName}State {`,
	];
	for (const state of type.states) {
		lines.push(
			`    /// ${escapeDoc(state.name)}`,
			"    ///",
			`    /// Semantic identity: ${escapeDoc(state.identity)}.`,
		);
		if (state.rename !== undefined)
			lines.push(`    #[serde(rename = ${rustString(state.rename)})]`);
		lines.push(`    ${state.ident},`);
	}
	lines.push("}", "");
	return lines;
}

/** The read accessors of an immutable record's private members. */
function accessors(type, retains) {
	const members = type.fields.map((field) => ({
		ident: field.ident,
		rustType: field.rustType,
		doc: `The \`${escapeDoc(field.name)}\` member.`,
	}));
	if (retains)
		members.push({
			ident: "unknown_members",
			rustType: "crate::support::UnknownMembers",
			doc: "The members the contract did not declare.",
		});
	if (members.length === 0) return [];
	const lines = [`impl ${type.typeName} {`];
	members.forEach((member, index) => {
		if (index > 0) lines.push("");
		lines.push(
			`    /// ${member.doc}`,
			`    pub fn ${member.ident}(&self) -> &${member.rustType} {`,
			`        &self.${member.ident}`,
			"    }",
		);
	});
	lines.push("}", "");
	return lines;
}

/** An interface construct: a trait with one method per operation, holding no state. */
function renderInterface(type) {
	const lines = moduleHeader(type);
	lines.push(...constructItems(type));
	lines.push(...docLines(type.doc), `pub trait ${type.typeName} {`);
	type.methods.forEach((method, index) => {
		if (index > 0) lines.push("");
		lines.push(...docLines(method.doc, "    "));
		const parameters = [
			method.receiver,
			...method.params.map((param) => `${param.ident}: ${param.rustType}`),
		];
		const tail = method.returns === undefined ? ";" : ` -> ${method.returns};`;
		const inline = `    fn ${method.ident}(${parameters.join(", ")})${tail}`;
		if (inline.length <= MAX_WIDTH) lines.push(inline);
		else
			lines.push(
				`    fn ${method.ident}(`,
				...parameters.map((parameter) => `        ${parameter},`),
				`    )${tail}`,
			);
	});
	lines.push("}");
	return `${lines.join("\n")}\n`;
}

/** A namespace construct, rendered as a unit struct beside its members. */
function renderNamespace(type) {
	const lines = moduleHeader(type);
	lines.push(...constructItems(type));
	lines.push(
		...docLines(type.doc),
		"#[derive(Clone, Copy, Debug, PartialEq, Eq)]",
		`pub struct ${type.typeName};`,
	);
	return `${lines.join("\n")}\n`;
}

/**
 * Whether the crate carries a construct member beyond identity fields, and so
 * the descriptor types those members' constants are written with.
 */
function carriesConstructData(model) {
	const plain = new Set(["kind", "identityFields", "equality", "immutable"]);
	return (
		model.populations.length > 0 ||
		model.types.some((type) =>
			Object.keys(type.construct ?? {}).some((key) => !plain.has(key)),
		)
	);
}

const CONSTRUCT_PRELUDE = `/// One transition of a state machine.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct TransitionMeta {
    /// The transition's semantic identity.
    pub identity: &'static str,
    /// The state the transition leaves.
    pub from: &'static str,
    /// The state the transition enters.
    pub to: &'static str,
    /// The operation that fires the transition.
    pub trigger: &'static str,
    /// The identifier of the clause that must hold, where one guards it.
    pub guard: Option<&'static str>,
    /// The semantic identities of the events the transition emits.
    pub emits: &'static [&'static str],
}

/// One step of a process.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct StepMeta {
    /// The step's semantic identity.
    pub identity: &'static str,
    /// The step's name.
    pub name: &'static str,
    /// The step kind.
    pub step_kind: &'static str,
    /// The semantic identities of the events the step consumes.
    pub consumes: &'static [&'static str],
    /// The semantic identities of the events the step emits.
    pub emits: &'static [&'static str],
}

/// One term of a domain's vocabulary.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct TermMeta {
    /// The term.
    pub term: &'static str,
    /// What the term means.
    pub doc: &'static str,
}

/// A member linked to other members by \`subsets\` or \`redefines\`.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct FieldLinkMeta {
    /// The member's wire name.
    pub field: &'static str,
    /// The wire names of the members it links to.
    pub targets: &'static [&'static str],
}

/// An operation's frame: the members and types it may change.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct FrameMeta {
    /// The members the operation may modify.
    pub modifies: &'static [&'static str],
    /// The types the operation may create instances of.
    pub creates: &'static [&'static str],
    /// The types the operation may delete instances of.
    pub deletes: &'static [&'static str],
}

/// An inline clause an operation carried.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct InlineClauseMeta {
    /// The clause language.
    pub language: &'static str,
    /// The clause text.
    pub text: &'static str,
}

/// An operation's frame and inline clauses.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct OperationContractMeta {
    /// The operation's wire name.
    pub operation: &'static str,
    /// The operation's frame, where it declares one.
    pub frame: Option<FrameMeta>,
    /// The inline clauses of the operation's \`pre\`.
    pub pre: &'static [InlineClauseMeta],
    /// The inline clauses of the operation's \`post\`.
    pub post: &'static [InlineClauseMeta],
}

/// One member type of a population and its extent.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct PopulationMemberMeta {
    /// The member type's semantic identity.
    pub type_ref: &'static str,
    /// The extent, as canonical JSON text.
    pub extent: &'static str,
}

/// A population the contract declared.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct PopulationMeta {
    /// The population's semantic identity.
    pub identity: &'static str,
    /// The population's display name.
    pub display_name: &'static str,
    /// The member types and their extents.
    pub members: &'static [PopulationMemberMeta],
}`;

function constructPrelude(model) {
	return [
		"",
		CONSTRUCT_PRELUDE,
		"",
		"/// Every population the contract declared, in document order.",
		...constItem(
			"pub ",
			"POPULATIONS",
			"&[PopulationMeta]",
			slice(
				model.populations.map((population) =>
					struct(`${META}::PopulationMeta`, [
						{ name: "identity", value: atom(rustString(population.identity)) },
						{
							name: "display_name",
							value: atom(rustString(population.displayName)),
						},
						{
							name: "members",
							value: slice(
								population.members.map((member) =>
									struct(`${META}::PopulationMemberMeta`, [
										{
											name: "type_ref",
											value: atom(rustString(member.typeRef)),
										},
										{
											name: "extent",
											value: atom(rustString(canonicalJson(member.extent))),
										},
									]),
								),
							),
						},
					]),
				),
			),
		),
	];
}
