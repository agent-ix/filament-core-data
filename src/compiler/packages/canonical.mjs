/**
 * The `RFC8785-JCS-with-identity-sorted-sets-v1` canonical byte form (FR-048).
 *
 * RFC 8785 (JSON Canonicalization Scheme) fixes three things: object members are
 * serialised in ascending order of their names' UTF-16 code units, numbers use
 * the ECMAScript number-to-string algorithm, and strings use the shortest
 * escaping. The platform already implements the last two exactly — `JSON.stringify`
 * of a primitive is RFC 8785's output for that primitive — so this module owns
 * the key ordering, the traversal, and one addition the algorithm's name
 * declares: arrays the caller marks as *identity-keyed sets* are sorted by their
 * members' `identity` before serialisation, because a set's order carries no
 * meaning and must not affect the canonical bytes.
 *
 * Every other array's order is meaningful and is preserved.
 */
import { DEFAULT_LIMITS, DIAGNOSTIC_CODES } from "../diagnostics.mjs";

export class CanonicalLimitError extends Error {
	constructor(limit, value) {
		super(`canonicalization exceeded ${limit} (${value})`);
		this.name = "CanonicalLimitError";
		this.limit = limit;
		this.value = value;
		this.entry = DIAGNOSTIC_CODES.LIMIT_MAX_DEPTH;
	}
}

function isObject(value) {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function byCodeUnits(left, right) {
	if (left < right) return -1;
	if (left > right) return 1;
	return 0;
}

function renderString(value, path) {
	for (let index = 0; index < value.length; index += 1) {
		const code = value.charCodeAt(index);
		if (code >= 0xd800 && code <= 0xdbff) {
			const next = value.charCodeAt(index + 1);
			if (next >= 0xdc00 && next <= 0xdfff) {
				index += 1;
				continue;
			}
			throw new TypeError(`unpaired UTF-16 surrogate at ${path}`);
		}
		if (code >= 0xdc00 && code <= 0xdfff) {
			throw new TypeError(`unpaired UTF-16 surrogate at ${path}`);
		}
	}
	return JSON.stringify(value);
}

/**
 * `options.sets` names, by `/`-joined path, each array whose order is not
 * semantic; the IR normalizer declares the IR's node lists there. `*` stands for
 * an array element, so `/types/*\/fields` names every type's field list.
 */
export function canonicalize(value, options = {}) {
	const sets =
		options.sets instanceof Set ? options.sets : new Set(options.sets ?? []);
	const maxDepth = options.maxDepth ?? DEFAULT_LIMITS.maxDepth;

	const walk = (node, path, depth) => {
		if (depth > maxDepth) throw new CanonicalLimitError("maxDepth", depth);
		if (Array.isArray(node)) {
			const items = sets.has(path)
				? [...node].sort((left, right) =>
						byCodeUnits(
							isObject(left) ? String(left.identity ?? "") : String(left),
							isObject(right) ? String(right.identity ?? "") : String(right),
						),
					)
				: node;
			return `[${items
				.map((item) => walk(item, `${path}/*`, depth + 1))
				.join(",")}]`;
		}
		if (isObject(node)) {
			const keys = Object.keys(node)
				.filter((key) => node[key] !== undefined)
				.sort(byCodeUnits);
			return `{${keys
				.map(
					(key) =>
						`${renderString(key, `${path}/${key}`)}:${walk(node[key], `${path}/${key}`, depth + 1)}`,
				)
				.join(",")}}`;
		}
		if (typeof node === "number" && !Number.isFinite(node)) {
			throw new TypeError(`non-finite number is not canonicalizable: ${node}`);
		}
		return typeof node === "string"
			? renderString(node, path)
			: JSON.stringify(node === undefined ? null : node);
	};

	return walk(value, "", 0);
}
