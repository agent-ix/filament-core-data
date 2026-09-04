/**
 * `inspect`: a deterministic summary of an IR document (FR-052).
 *
 * The point of an inspection command is to answer "what is in this document"
 * without opening it, and to answer it the same way twice. Everything printed is
 * either read from the document or counted from it; nothing is timed, measured
 * against the clock, or ordered by anything but identity.
 *
 * It also reports what it could *not* check. Given no package resolution, the
 * reader cannot tell a valid cross-package relationship from a dangling one, so
 * `inspect` prints the suppressions rather than either inventing a verdict or
 * quietly skipping the rule.
 */
import { canonicalize } from "./packages/canonical.mjs";
import { fingerprintIr } from "./ir/normalize.mjs";
import { readContractIr } from "./ir/reader.mjs";

function byCodePoint(left, right) {
	if (left < right) return -1;
	if (left > right) return 1;
	return 0;
}

function count(value) {
	return Array.isArray(value) ? value.length : 0;
}

/** Builds the summary record the text and JSON forms both print. */
export function inspectIr(document, options = {}) {
	const diagnostics = readContractIr(document, options);
	const types = Array.isArray(document?.types) ? document.types : [];
	const kinds = {};
	for (const definition of types) {
		const kind = String(definition.kind);
		kinds[kind] = (kinds[kind] ?? 0) + 1;
	}
	return {
		contractVersion: document?.contractVersion ?? null,
		package: {
			identity: document?.package?.identity ?? null,
			version: document?.package?.version ?? null,
			manifestDigest: document?.package?.manifestDigest ?? null,
			lockDigest: document?.package?.lockDigest ?? null,
		},
		source: {
			identity: document?.source?.identity ?? null,
			dialect: document?.source?.dialect ?? null,
			digest: document?.source?.digest ?? null,
		},
		fingerprint: fingerprintIr(document),
		typeCount: types.length,
		kinds: Object.fromEntries(
			Object.entries(kinds).sort((left, right) =>
				byCodePoint(left[0], right[0]),
			),
		),
		types: [...types]
			.map((definition) => ({
				identity: String(definition.identity),
				kind: String(definition.kind),
				fields: count(definition.fields),
				constraints: count(definition.constraints),
				relationships: count(definition.relationships),
				operations: count(definition.operations),
				clauses: count(definition.clauses),
			}))
			.sort((left, right) => byCodePoint(left.identity, right.identity)),
		diagnostics: diagnostics.map((entry) => ({
			code: entry.code,
			message: entry.message,
		})),
		suppressed: diagnostics.suppressions ?? [],
	};
}

/** The human-readable form; byte-identical across runs. */
export function formatInspection(summary) {
	const lines = [
		`contract        ${summary.contractVersion}`,
		`package         ${summary.package.identity} ${summary.package.version}`,
		`manifest        ${summary.package.manifestDigest}`,
		`lock            ${summary.package.lockDigest}`,
		`source          ${summary.source.identity} (${summary.source.dialect})`,
		`source digest   ${summary.source.digest}`,
		`fingerprint     ${summary.fingerprint}`,
		`types           ${summary.typeCount}`,
	];
	for (const [kind, total] of Object.entries(summary.kinds)) {
		lines.push(`  ${kind.padEnd(12)}  ${total}`);
	}
	lines.push(
		"",
		"identity  kind  fields constraints relationships operations clauses",
	);
	for (const entry of summary.types) {
		lines.push(
			`${entry.identity}  ${entry.kind}  ${entry.fields} ${entry.constraints} ${entry.relationships} ${entry.operations} ${entry.clauses}`,
		);
	}
	if (summary.suppressed.length > 0) {
		lines.push("", "suppressed (no package resolution supplied):");
		for (const entry of summary.suppressed) {
			lines.push(`  ${entry.rule}  ${entry.identity}`);
		}
	}
	if (summary.diagnostics.length > 0) {
		lines.push("", "diagnostics:");
		for (const entry of summary.diagnostics) {
			lines.push(`  ${entry.code}  ${entry.message}`);
		}
	}
	return `${lines.join("\n")}\n`;
}

/** The canonical JSON form of the same record. */
export function inspectionJson(summary) {
	return `${canonicalize(summary)}\n`;
}
