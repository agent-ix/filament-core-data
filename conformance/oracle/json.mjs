/**
 * Canonical JSON, RFC 6901 pointers, and RFC 6902 patch application.
 *
 * Issue #20 (FR-035, FR-036). Written from the RFCs and from the
 * `RFC8785-JCS-with-identity-sorted-sets-v1` canonical form named in
 * `docs/semantic-data-system/contracts-v1.md`. Nothing here reads an
 * implementation under test.
 */

/** True for a plain JSON object (not null, not an array). */
export function isObject(value) {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Canonical serialization: object keys sorted by code point, no insignificant
 * whitespace. Array order is significant and is preserved.
 */
export function canonical(value) {
	if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
	if (isObject(value)) {
		const keys = Object.keys(value).sort(compareCodePoint);
		return `{${keys
			.map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
			.join(",")}}`;
	}
	return JSON.stringify(value === undefined ? null : value);
}

/** Code-point ordering. Never `localeCompare`: locale is excluded (NFR-015). */
export function compareCodePoint(left, right) {
	if (left === right) return 0;
	return left < right ? -1 : 1;
}

/** Escapes one RFC 6901 reference token. */
export function escapeToken(token) {
	return String(token).replace(/~/g, "~0").replace(/\//g, "~1");
}

/** Unescapes one RFC 6901 reference token. */
export function unescapeToken(token) {
	return String(token).replace(/~1/g, "/").replace(/~0/g, "~");
}

/** Joins path segments into an RFC 6901 pointer. */
export function pointer(...segments) {
	return segments.length === 0 ? "" : `/${segments.map(escapeToken).join("/")}`;
}

/** Splits an RFC 6901 pointer into its unescaped tokens. */
export function pointerTokens(text) {
	if (text === "") return [];
	if (!text.startsWith("/")) throw new Error(`not a JSON pointer: ${text}`);
	return text.slice(1).split("/").map(unescapeToken);
}

/** Resolves an RFC 6901 pointer, returning `undefined` when it does not exist. */
export function resolvePointer(document, text) {
	let node = document;
	for (const token of pointerTokens(text)) {
		if (Array.isArray(node)) {
			const index = Number(token);
			if (!Number.isInteger(index)) return undefined;
			node = node[index];
		} else if (isObject(node)) {
			if (!Object.hasOwn(node, token)) return undefined;
			node = node[token];
		} else {
			return undefined;
		}
	}
	return node;
}

function parent(document, text) {
	const tokens = pointerTokens(text);
	if (tokens.length === 0) throw new Error("operation needs a parent node");
	const last = tokens.pop();
	const holder = resolvePointer(
		document,
		tokens.length === 0 ? "" : `/${tokens.map(escapeToken).join("/")}`,
	);
	if (holder === undefined) {
		throw new Error(`patch path does not resolve: ${text}`);
	}
	return { holder, last };
}

function setAt(document, text, value) {
	if (text === "") return value;
	const { holder, last } = parent(document, text);
	if (Array.isArray(holder)) {
		const index = last === "-" ? holder.length : Number(last);
		if (!Number.isInteger(index) || index < 0 || index > holder.length) {
			throw new Error(`patch index out of range: ${text}`);
		}
		holder.splice(index, 0, value);
	} else if (isObject(holder)) {
		holder[last] = value;
	} else {
		throw new Error(`patch parent is not a container: ${text}`);
	}
	return document;
}

function replaceAt(document, text, value) {
	if (text === "") return value;
	const { holder, last } = parent(document, text);
	if (Array.isArray(holder)) {
		const index = Number(last);
		if (!Number.isInteger(index) || index < 0 || index >= holder.length) {
			throw new Error(`patch index out of range: ${text}`);
		}
		holder[index] = value;
	} else if (isObject(holder)) {
		if (!Object.hasOwn(holder, last)) {
			throw new Error(`replace target does not exist: ${text}`);
		}
		holder[last] = value;
	} else {
		throw new Error(`patch parent is not a container: ${text}`);
	}
	return document;
}

function removeAt(document, text) {
	const { holder, last } = parent(document, text);
	if (Array.isArray(holder)) {
		const index = Number(last);
		if (!Number.isInteger(index) || index < 0 || index >= holder.length) {
			throw new Error(`patch index out of range: ${text}`);
		}
		holder.splice(index, 1);
	} else if (isObject(holder)) {
		if (!Object.hasOwn(holder, last)) {
			throw new Error(`remove target does not exist: ${text}`);
		}
		delete holder[last];
	} else {
		throw new Error(`patch parent is not a container: ${text}`);
	}
	return document;
}

/**
 * Substitutes `$i` with the copy index and `$n` with its successor inside a
 * template's strings, so a repeated template can chain to the next copy.
 */
function substitute(value, index) {
	if (typeof value === "string") {
		return value
			.replaceAll("$i", String(index))
			.replaceAll("$n", String(index + 1));
	}
	if (Array.isArray(value)) return value.map((item) => substitute(item, index));
	if (isObject(value)) {
		const out = {};
		for (const [key, item] of Object.entries(value)) {
			out[substitute(key, index)] = substitute(item, index);
		}
		return out;
	}
	return value;
}

/**
 * Applies a patch to a deep copy of `document`.
 *
 * RFC 6902 `add`, `remove`, `replace`, `copy`, `move`, and `test` are
 * supported, plus one declared extension, `x-repeat`, which appends `count`
 * copies of `template` at `path` with `$i` replaced by the copy index — so a
 * case that sits on a depth or size limit stays inside the minimization budget.
 * An unsupported op, an unresolvable path, or a failed `test` throws, so a case
 * whose patch silently does nothing cannot exist.
 */
export function applyPatch(document, ops) {
	let result = structuredClone(document);
	for (const [index, op] of (ops ?? []).entries()) {
		if (!isObject(op) || typeof op.op !== "string") {
			throw new Error(`ops[${index}] is not a patch operation`);
		}
		const where = `ops[${index}] (${op.op} ${op.path})`;
		try {
			switch (op.op) {
				case "add":
					result = setAt(result, op.path, structuredClone(op.value));
					break;
				case "replace":
					result = replaceAt(result, op.path, structuredClone(op.value));
					break;
				case "remove":
					result = removeAt(result, op.path);
					break;
				case "copy":
					result = setAt(
						result,
						op.path,
						structuredClone(requireExisting(result, op.from)),
					);
					break;
				case "move": {
					const moved = structuredClone(requireExisting(result, op.from));
					result = removeAt(result, op.from);
					result = setAt(result, op.path, moved);
					break;
				}
				case "x-repeat": {
					const count = Number(op.count);
					if (!Number.isInteger(count) || count < 1) {
						throw new Error("x-repeat needs an integer count of at least 1");
					}
					for (let copy = 0; copy < count; copy += 1) {
						result = setAt(result, op.path, substitute(op.template, copy));
					}
					break;
				}
				case "test": {
					const actual = resolvePointer(result, op.path);
					if (canonical(actual) !== canonical(op.value)) {
						throw new Error("test failed");
					}
					break;
				}
				default:
					throw new Error(`unsupported op ${op.op}`);
			}
		} catch (error) {
			throw new Error(`${where}: ${error.message}`);
		}
	}
	return result;
}

function requireExisting(document, from) {
	const value = resolvePointer(document, from);
	if (value === undefined) throw new Error(`from does not resolve: ${from}`);
	return value;
}

/** Counts the JSON nodes of a value: every scalar, array, and object counts once. */
export function countNodes(value) {
	if (Array.isArray(value)) {
		return 1 + value.reduce((total, item) => total + countNodes(item), 0);
	}
	if (isObject(value)) {
		return (
			1 +
			Object.values(value).reduce((total, item) => total + countNodes(item), 0)
		);
	}
	return 1;
}
