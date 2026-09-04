/**
 * Reading and locating the JSON inputs of a compile (FR-047).
 *
 * Every manifest, mapping, profile, and lock is untrusted data, so it is
 * schema-validated before any field is read, and every defect is reported at the
 * position in the file that declared it. That second half is why this module
 * keeps the raw text alongside the parsed value: `JSON.parse` throws positions
 * away, and a diagnostic at the top of a 400-line manifest is not a diagnostic a
 * human can act on.
 */
import { basename, relative, resolve } from "node:path";
import {
	DIAGNOSTIC_CODES,
	DEFAULT_LIMITS,
	diagnostic,
	fragment,
} from "../diagnostics.mjs";
import { indexJsonPointers, locateJsonPointer } from "../json-locus.mjs";
import { digest } from "./canonical.mjs";
import {
	errorMessage,
	errorPointer,
	schemaValidators,
} from "../schema-validate.mjs";

/**
 * POSIX form of `path` relative to `root`; never absolute, never `..`-bearing.
 *
 * A caller may name a lock or a limits file anywhere, and `sourceLocus.path`
 * forbids `..` outright, so a document outside the root is named by its own file
 * name. A locus the schema rejects is worse than a coarser one.
 */
export function relativePosix(root, path) {
	const rel = relative(resolve(root), resolve(path)).split(/[\\/]/).join("/");
	return rel === "" || rel.startsWith("../") || rel === ".."
		? basename(path)
		: rel;
}

/**
 * Reads one published-schema document.
 *
 * Returns `{ value, text, path, digest, locate, diagnostics }`. On any defect
 * `value` is `undefined` and `diagnostics` is non-empty; the caller never sees a
 * half-read document.
 */
export function readDocument(host, options) {
	const {
		absolutePath,
		packageRoot,
		schemaName,
		entry,
		limits = DEFAULT_LIMITS,
	} = options;
	const path = relativePosix(packageRoot, absolutePath);
	// The source identity may depend on what the document says — a candidate
	// package's identity is not known until its manifest is read — so the caller
	// may pass a function of the parsed value. Every locus a candidate emits then
	// names the package it came from, rather than a shared placeholder that makes
	// two loci from two manifests indistinguishable.
	const identityOf = (value) =>
		typeof options.sourceIdentity === "function"
			? options.sourceIdentity(value)
			: options.sourceIdentity;
	let sourceIdentity = identityOf(undefined);
	const diagnostics = [];
	const locus = (pointer, prefer = "key") => ({
		sourceIdentity,
		path,
		startLine: 1,
		startColumn: 1,
		...(() => {
			try {
				const position = locateJsonPointer(index, pointer, prefer);
				return { startLine: position.line, startColumn: position.column };
			} catch {
				return {};
			}
		})(),
	});

	let text;
	try {
		// The size is checked from the directory entry, before the bytes are read:
		// checking afterwards means the oversized document is already in memory,
		// which is the thing the limit exists to prevent.
		const declared = host.sizeOf?.(absolutePath);
		if (declared !== undefined && declared > limits.maxInputBytes) {
			return {
				diagnostics: [
					diagnostic(DIAGNOSTIC_CODES.LIMIT_MAX_INPUT_BYTES, {
						message: `${path} is ${declared} bytes, over the maxInputBytes limit of ${limits.maxInputBytes}`,
						locus: { sourceIdentity, path, startLine: 1, startColumn: 1 },
					}),
				],
			};
		}
		const bytes = host.readBytes(absolutePath);
		if (bytes.length > limits.maxInputBytes) {
			return {
				diagnostics: [
					diagnostic(DIAGNOSTIC_CODES.LIMIT_MAX_INPUT_BYTES, {
						message: `${path} is ${bytes.length} bytes, over the maxInputBytes limit of ${limits.maxInputBytes}`,
						locus: { sourceIdentity, path, startLine: 1, startColumn: 1 },
					}),
				],
			};
		}
		text = bytes.toString("utf8");
	} catch (error) {
		// A refusal and an absent file are different defects: one says the caller
		// pointed outside its declared roots, the other that a document the
		// manifest names is not there. Reporting both as `PATH_ESCAPE` told a
		// package author to look for a security problem they did not have.
		const escaped = error?.name === "PathEscapeError";
		return {
			diagnostics: [
				diagnostic(escaped ? DIAGNOSTIC_CODES.PATH_ESCAPE : entry, {
					message: escaped
						? `${path} lies outside every declared root`
						: `cannot read ${fragment(path)}: ${fragment(error.message)}`,
					locus: { sourceIdentity, path, startLine: 1, startColumn: 1 },
				}),
			],
		};
	}

	let index;
	let value;
	try {
		index = indexJsonPointers(text);
		value = JSON.parse(text);
		sourceIdentity = identityOf(value) ?? sourceIdentity;
	} catch (error) {
		const position = error.position ?? { line: 1, column: 1 };
		return {
			text,
			path,
			diagnostics: [
				diagnostic(entry, {
					message: `${path} is not valid JSON: ${fragment(error.message)}`,
					locus: {
						sourceIdentity,
						path,
						startLine: position.line,
						startColumn: position.column,
					},
				}),
			],
		};
	}

	for (const error of schemaValidators(host).errors(schemaName, value)) {
		diagnostics.push(
			diagnostic(entry, {
				message: `${path}: ${fragment(errorMessage(error))}`,
				locus: locus(errorPointer(error)),
			}),
		);
	}
	if (diagnostics.length > 0) return { text, path, diagnostics };

	return {
		value,
		text,
		path,
		digest: digest(text),
		locate: locus,
		diagnostics,
	};
}
