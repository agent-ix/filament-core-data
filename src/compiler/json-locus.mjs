/**
 * Exact source loci for JSON inputs (FR-047).
 *
 * A manifest, lock, mapping, or profile defect has to be reported where it is
 * written, not at the top of the file, so the compiler needs the 1-based line
 * and column of an arbitrary JSON pointer within the document *text*. Nothing
 * in the standard library offers that: `JSON.parse` discards positions. This
 * module scans the text once and records, for every pointer it can reach, the
 * offset of the value token and of the member key that introduced it.
 *
 * The scanner is deliberately its own tokenizer rather than a parser reusing
 * `JSON.parse`: the caller needs positions for keys the parse would collapse
 * (duplicate members) and for values inside arrays, and it must terminate on
 * malformed input with a locus rather than an exception.
 */

/** JSON Pointer escaping, RFC 6901 §3. */
function escapeToken(token) {
	return String(token).replace(/~/g, "~0").replace(/\//g, "~1");
}

/** Builds a pointer from already-unescaped path segments. */
export function jsonPointer(segments) {
	if (segments.length === 0) return "";
	return `/${segments.map(escapeToken).join("/")}`;
}

const WHITESPACE = new Set([" ", "\t", "\n", "\r"]);

class Scanner {
	constructor(text) {
		this.text = text;
		this.index = 0;
	}

	skipWhitespace() {
		while (this.index < this.text.length && WHITESPACE.has(this.text[this.index])) {
			this.index += 1;
		}
	}

	peek() {
		return this.text[this.index];
	}

	/** Consumes a JSON string literal and returns its decoded value. */
	readString() {
		if (this.text[this.index] !== '"') throw this.error("expected a string");
		this.index += 1;
		let value = "";
		while (this.index < this.text.length) {
			const character = this.text[this.index];
			if (character === '"') {
				this.index += 1;
				return value;
			}
			if (character === "\\") {
				const escape = this.text[this.index + 1];
				this.index += 2;
				if (escape === "u") {
					value += String.fromCharCode(
						Number.parseInt(this.text.slice(this.index, this.index + 4), 16),
					);
					this.index += 4;
				} else {
					const simple = { '"': '"', "\\": "\\", "/": "/", b: "\b", f: "\f", n: "\n", r: "\r", t: "\t" };
					if (!(escape in simple)) throw this.error(`unknown escape \\${escape}`);
					value += simple[escape];
				}
				continue;
			}
			value += character;
			this.index += 1;
		}
		throw this.error("unterminated string");
	}

	/** Consumes a primitive token (number, true, false, null). */
	readPrimitive() {
		const start = this.index;
		while (
			this.index < this.text.length &&
			!WHITESPACE.has(this.text[this.index]) &&
			!",]}".includes(this.text[this.index])
		) {
			this.index += 1;
		}
		if (this.index === start) throw this.error("expected a value");
		return this.text.slice(start, this.index);
	}

	error(message) {
		const position = offsetToPosition(this.text, this.index);
		const error = new Error(
			`${message} at line ${position.line} column ${position.column}`,
		);
		error.position = position;
		return error;
	}
}

/** Converts a 0-based character offset to a 1-based line and column. */
export function offsetToPosition(text, offset) {
	let line = 1;
	let lineStart = 0;
	const bound = Math.min(offset, text.length);
	for (let index = 0; index < bound; index += 1) {
		if (text[index] === "\n") {
			line += 1;
			lineStart = index + 1;
		}
	}
	return { line, column: bound - lineStart + 1 };
}

/**
 * Indexes every JSON pointer in `text`.
 *
 * Returns a `Map` from pointer to `{ value, key }`, where `value` is the
 * position of the value token and `key` the position of the member key that
 * introduced it (the value position, for array elements and the root).
 */
export function indexJsonPointers(text) {
	const index = new Map();
	const scanner = new Scanner(text);

	const record = (pointer, valueOffset, keyOffset) => {
		if (index.has(pointer)) return;
		index.set(pointer, {
			value: offsetToPosition(text, valueOffset),
			key: offsetToPosition(text, keyOffset ?? valueOffset),
		});
	};

	const walk = (segments, keyOffset) => {
		scanner.skipWhitespace();
		const valueOffset = scanner.index;
		record(jsonPointer(segments), valueOffset, keyOffset);
		const character = scanner.peek();
		if (character === "{") {
			scanner.index += 1;
			scanner.skipWhitespace();
			if (scanner.peek() === "}") {
				scanner.index += 1;
				return;
			}
			for (;;) {
				scanner.skipWhitespace();
				const memberKeyOffset = scanner.index;
				const name = scanner.readString();
				scanner.skipWhitespace();
				if (scanner.peek() !== ":") throw scanner.error("expected ':'");
				scanner.index += 1;
				walk([...segments, name], memberKeyOffset);
				scanner.skipWhitespace();
				if (scanner.peek() === ",") {
					scanner.index += 1;
					continue;
				}
				if (scanner.peek() === "}") {
					scanner.index += 1;
					return;
				}
				throw scanner.error("expected ',' or '}'");
			}
		}
		if (character === "[") {
			scanner.index += 1;
			scanner.skipWhitespace();
			if (scanner.peek() === "]") {
				scanner.index += 1;
				return;
			}
			let position = 0;
			for (;;) {
				walk([...segments, String(position)], undefined);
				position += 1;
				scanner.skipWhitespace();
				if (scanner.peek() === ",") {
					scanner.index += 1;
					continue;
				}
				if (scanner.peek() === "]") {
					scanner.index += 1;
					return;
				}
				throw scanner.error("expected ',' or ']'");
			}
		}
		if (character === '"') {
			scanner.readString();
			return;
		}
		scanner.readPrimitive();
	};

	walk([], undefined);
	return index;
}

/**
 * Locates one JSON pointer in `text`.
 *
 * `prefer` selects the member key's position (`"key"`) or the value token's
 * position (`"value"`, the default). Where the exact pointer is absent — a
 * schema error reported against a member the document does not carry — the
 * nearest existing ancestor is used, so a diagnostic still lands inside the
 * structure that owns the defect rather than at the top of the file.
 */
export function locateJsonPointer(text, pointer, prefer = "value") {
	const index = typeof text === "string" ? indexJsonPointers(text) : text;
	let candidate = pointer;
	for (;;) {
		const entry = index.get(candidate);
		if (entry) return prefer === "key" ? entry.key : entry.value;
		if (candidate === "") return { line: 1, column: 1 };
		const cut = candidate.lastIndexOf("/");
		candidate = cut <= 0 ? "" : candidate.slice(0, cut);
	}
}
