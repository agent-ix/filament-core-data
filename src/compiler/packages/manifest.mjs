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
import { relative, resolve } from "node:path";
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

/** POSIX form of `path` relative to `root`; never absolute, never `..`-bearing. */
export function relativePosix(root, path) {
	return relative(resolve(root), resolve(path)).split(/[\\/]/).join("/");
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
		code,
		sourceIdentity,
		limits = DEFAULT_LIMITS,
	} = options;
	const path = relativePosix(packageRoot, absolutePath);
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
		return {
			diagnostics: [
				diagnostic(DIAGNOSTIC_CODES.PATH_ESCAPE, {
					message: `cannot read ${fragment(path)}: ${fragment(error.message)}`,
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
	} catch (error) {
		const position = error.position ?? { line: 1, column: 1 };
		return {
			text,
			path,
			diagnostics: [
				diagnostic(DIAGNOSTIC_CODES[code], {
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
			diagnostic(DIAGNOSTIC_CODES[code], {
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
