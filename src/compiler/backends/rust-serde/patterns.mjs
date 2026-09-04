/**
 * The ECMA-262 pattern classifier and the matcher lowering (FR-057).
 *
 * The dialect is ECMA-262 **without** the `u`, `v`, `s`, `m`, `i`, and `g`
 * flags, decided over the subject's **UTF-16 code units**. That is the dialect
 * `src/compiler/ir/reader.mjs` already compiles, so it is the dialect the
 * repository's own reader accepts, and it is the one the differential harnesses
 * compare against. It has three consequences the lowering depends on:
 *
 * - `.` matches one code unit, not one code point, so an astral character is
 *   two subjects for `.` and a code-point matcher disagrees with the published
 *   engine on it (FR-057-AC-13).
 * - `^` matches only at position 0 and `$` only at the end, because there is no
 *   `m` flag.
 * - `.` excludes all four line terminators — U+000A, U+000D, U+2028, U+2029 —
 *   because there is no `s` flag.
 *
 * A pattern is `expressible` when every construct it uses lies in the declared
 * supported subset, `proved` when its exact text is a key of
 * `proved-validators.json`, and `unsupported` otherwise.
 *
 * The subset carries one restriction beyond the construct list, declared here
 * rather than discovered at the step bound: an **unbounded quantifier over an
 * atom that can match the empty string** — `(?:a?)*`, `(a|)+` — is
 * `unsupported`. ECMA-262 terminates such a loop with a per-iteration progress
 * check, this matcher has none, and lowering it anyway would produce a program
 * that spins to the step bound and disagrees with the published engine on a
 * subject the engine accepts. The combination is refused, which is the
 * declared position: no pattern is weakened to one this backend can run. An unsupported pattern
 * stops generation. It is never rewritten, relaxed, approximated, or carried as
 * an unvalidated `String`: a pattern the backend silently dropped is
 * indistinguishable in the generated source from a field that never had one.
 *
 * Pure apart from the two pinned tables read at module load, which is the
 * idiom `names.mjs` already established for `reserved-words.json`.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Reads one pinned table committed beside this module.
 *
 * The tables are the only input the emitter reads that is not the request, and
 * a missing one is a defect in the checkout rather than in the contract. It
 * therefore throws, naming the table: a backend that carried on without its
 * reserved-word list, its published patterns, or its proved-validator registry
 * would emit a crate degraded in exactly the way FR-058 exists to forbid, and
 * the degradation would be invisible in the generated source.
 */
function readPinnedTable(name) {
	try {
		return readFileSync(
			fileURLToPath(new URL(`./${name}`, import.meta.url)),
			"utf8",
		);
	} catch (cause) {
		throw new Error(
			`the pinned table \`${name}\` could not be read, so the backend refuses to emit a degraded crate`,
			{ cause },
		);
	}
}

const PROVED = JSON.parse(readPinnedTable("proved-validators.json"));

const PUBLISHED = JSON.parse(readPinnedTable("published-patterns.json"));
const READER_CODES = JSON.parse(
	readPinnedTable("published-diagnostic-codes.json"),
);

/** The proved-validator registry, keyed by exact pattern text. */
export const PROVED_VALIDATORS = Object.freeze(PROVED);

/**
 * The published patterns the generated crate enforces on its own support
 * types, extracted from `schema/semantic/v1/common.schema.json` rather than
 * retyped. `cli.mjs check` re-reads the schema and fails on any drift, so the
 * copy here cannot quietly diverge from the artefact it came from.
 */
export const PUBLISHED_PATTERNS = Object.freeze(PUBLISHED.patterns);

/**
 * The published *reader* codes the generated crate raises at run time.
 *
 * This is not a second generator registry. `diagnostics.mjs` closes the codes
 * the generator emits while it is producing a crate; `conformance/diagnostic-codes.json`
 * closes the codes a reader decides while it is deciding a value. A verdict the
 * generated crate reaches about a value it was handed belongs to the second
 * set, and minting an `agent-ix.rust-backend.*` spelling for a defect the
 * published set already names would be the duplication SR-066 FND-500 records.
 * `cli.mjs check` re-reads the published artefact and fails on any drift.
 */
export const PUBLISHED_READER_CODES = Object.freeze(READER_CODES.entries);

/** The owner the published reader codes are emitted under. */
export const PUBLISHED_READER_OWNER = READER_CODES.owner;

/**
 * The largest matcher program the lowering will emit.
 *
 * A bounded quantifier expands, so `(?:ab){0,5000}` is a legal ECMA-262 pattern
 * whose lowering is 20000 instructions. The bound is declared rather than
 * discovered: without it a contract could make the emitter allocate without
 * limit, and NFR-020 measures that as a defect rather than as a big file.
 */
export const MAX_PROGRAM_LENGTH = 200000;

/** The four ECMAScript line terminators, as UTF-16 code units. */
export const LINE_TERMINATORS = Object.freeze([0x000a, 0x000d, 0x2028, 0x2029]);

const DIGIT_RANGES = [[0x30, 0x39]];
const WORD_RANGES = [
	[0x30, 0x39],
	[0x41, 0x5a],
	[0x5f, 0x5f],
	[0x61, 0x7a],
];
// The ECMA-262 `\s` set: WhiteSpace plus LineTerminator.
const SPACE_RANGES = [
	[0x0009, 0x000d],
	[0x0020, 0x0020],
	[0x00a0, 0x00a0],
	[0x1680, 0x1680],
	[0x2000, 0x200a],
	[0x2028, 0x2029],
	[0x202f, 0x202f],
	[0x205f, 0x205f],
	[0x3000, 0x3000],
	[0xfeff, 0xfeff],
];

class Unsupported extends Error {
	constructor(construct, offset) {
		super(`unsupported construct ${construct} at offset ${offset}`);
		this.construct = construct;
		this.offset = offset;
	}
}

/**
 * A recursive-descent parser for the declared subset.
 *
 * It is deliberately not a general ECMA-262 parser. Every construct outside the
 * subset raises `Unsupported` naming itself, and the name reaches the
 * `UNSUPPORTED_PATTERN` diagnostic, so a refusal says *which* construct could
 * not be expressed rather than only that one could not.
 */
class Parser {
	constructor(source) {
		this.units = [...String(source)].flatMap((ch) =>
			ch.codePointAt(0) > 0xffff
				? [ch.charCodeAt(0), ch.charCodeAt(1)]
				: [ch.charCodeAt(0)],
		);
		this.text = String(source);
		this.at = 0;
	}

	peek(offset = 0) {
		const index = this.at + offset;
		return index < this.text.length ? this.text[index] : undefined;
	}

	eat(ch) {
		if (this.peek() === ch) {
			this.at += 1;
			return true;
		}
		return false;
	}

	expect(ch, construct) {
		if (!this.eat(ch)) throw new Unsupported(construct, this.at);
	}

	parse() {
		const node = this.disjunction();
		if (this.at !== this.text.length) {
			throw new Unsupported(`\`${this.peek()}\``, this.at);
		}
		return node;
	}

	disjunction() {
		const alternatives = [this.alternative()];
		while (this.eat("|")) alternatives.push(this.alternative());
		return alternatives.length === 1
			? alternatives[0]
			: { type: "alt", alternatives };
	}

	alternative() {
		const terms = [];
		for (;;) {
			const ch = this.peek();
			if (ch === undefined || ch === "|" || ch === ")") break;
			terms.push(this.term());
		}
		return { type: "seq", terms };
	}

	term() {
		const ch = this.peek();
		if (ch === "^") {
			this.at += 1;
			return { type: "bol" };
		}
		if (ch === "$") {
			this.at += 1;
			return { type: "eol" };
		}
		const atom = this.atom();
		return this.quantified(atom);
	}

	quantified(atom) {
		const ch = this.peek();
		let min;
		let max;
		if (ch === "*") {
			this.at += 1;
			min = 0;
			max = Number.POSITIVE_INFINITY;
		} else if (ch === "+") {
			this.at += 1;
			min = 1;
			max = Number.POSITIVE_INFINITY;
		} else if (ch === "?") {
			this.at += 1;
			min = 0;
			max = 1;
		} else if (ch === "{") {
			const parsed = this.braceQuantifier();
			if (parsed === undefined) return atom;
			min = parsed.min;
			max = parsed.max;
		} else {
			return atom;
		}
		const lazy = this.eat("?");
		if (atom.type === "bol" || atom.type === "eol") {
			throw new Unsupported("a quantified assertion", this.at);
		}
		// An unbounded quantifier over an atom that can match the empty string
		// — `(?:a?)*` — needs ECMA-262's per-iteration progress check to
		// terminate. This matcher has no such check, so the combination is
		// refused rather than lowered to a program that would spin to the step
		// bound and disagree with the published engine. The refusal is the
		// declared position: no pattern is weakened to one this backend can run.
		if (max === Number.POSITIVE_INFINITY && matchesEmpty(atom)) {
			throw new Unsupported(
				"an unbounded quantifier over an atom that can match the empty string",
				this.at,
			);
		}
		return { type: "repeat", atom, min, max, lazy };
	}

	/**
	 * `{m}`, `{m,}`, `{m,n}`. A `{` that does not open one of the three is a
	 * literal `{` in ECMA-262 without the `u` flag, and the position is
	 * restored so it is parsed as one.
	 */
	braceQuantifier() {
		const start = this.at;
		this.at += 1;
		const first = this.digits();
		if (first === undefined) {
			this.at = start;
			return undefined;
		}
		if (this.eat("}")) return { min: first, max: first };
		if (!this.eat(",")) {
			this.at = start;
			return undefined;
		}
		if (this.eat("}")) return { min: first, max: Number.POSITIVE_INFINITY };
		const second = this.digits();
		if (second === undefined || !this.eat("}")) {
			this.at = start;
			return undefined;
		}
		if (second < first) throw new Unsupported("an inverted {m,n} bound", start);
		return { min: first, max: second };
	}

	digits() {
		let value;
		while (
			this.peek() !== undefined &&
			this.peek() >= "0" &&
			this.peek() <= "9"
		) {
			value = (value ?? 0) * 10 + Number(this.peek());
			this.at += 1;
		}
		return value;
	}

	atom() {
		const ch = this.peek();
		if (ch === undefined) throw new Unsupported("an empty atom", this.at);
		if (ch === ".") {
			this.at += 1;
			return { type: "dot" };
		}
		if (ch === "(") return this.group();
		if (ch === "[") return this.characterClass();
		if (ch === "\\") return this.atomEscape();
		if (ch === "*" || ch === "+" || ch === "?") {
			throw new Unsupported("a quantifier with no atom", this.at);
		}
		this.at += 1;
		return unitsOf(ch);
	}

	group() {
		const start = this.at;
		this.at += 1;
		if (this.eat("?")) {
			const next = this.peek();
			if (next === ":") {
				this.at += 1;
				const inner = this.disjunction();
				this.expect(")", "an unterminated group");
				return inner;
			}
			if (next === "=") throw new Unsupported("a lookahead `(?=`", start);
			if (next === "!")
				throw new Unsupported("a negative lookahead `(?!`", start);
			if (next === "<") {
				const after = this.peek(1);
				if (after === "=") throw new Unsupported("a lookbehind `(?<=`", start);
				if (after === "!")
					throw new Unsupported("a negative lookbehind `(?<!`", start);
				throw new Unsupported("a named group `(?<name>`", start);
			}
			throw new Unsupported("an unsupported group modifier", start);
		}
		// A capturing group. Its *capture* is never observed — a `pattern`
		// constraint asks only whether the subject matches — so it lowers as a
		// plain group. A backreference to it is refused below, which is what
		// makes ignoring the capture safe rather than convenient.
		const inner = this.disjunction();
		this.expect(")", "an unterminated group");
		return inner;
	}

	atomEscape() {
		const start = this.at;
		this.at += 1;
		const ch = this.peek();
		if (ch === undefined) throw new Unsupported("a trailing backslash", start);
		if (ch === "b") throw new Unsupported("the word boundary `\\b`", start);
		if (ch === "B") throw new Unsupported("the non-word boundary `\\B`", start);
		if (ch === "p" || ch === "P")
			throw new Unsupported("a Unicode property escape `\\p{…}`", start);
		if (ch === "k")
			throw new Unsupported("a named backreference `\\k<name>`", start);
		if (ch >= "1" && ch <= "9")
			throw new Unsupported(`a backreference \`\\${ch}\``, start);
		const cls = classEscape(ch);
		if (cls !== undefined) {
			this.at += 1;
			return cls;
		}
		return this.characterEscape();
	}

	/** `\n \r \t \f \v \0 \xHH \uHHHH` and identity escapes. */
	characterEscape() {
		const start = this.at;
		const ch = this.peek();
		const simple = {
			n: 0x0a,
			r: 0x0d,
			t: 0x09,
			f: 0x0c,
			v: 0x0b,
		};
		if (Object.hasOwn(simple, ch)) {
			this.at += 1;
			return { type: "char", unit: simple[ch] };
		}
		if (ch === "0") {
			const next = this.peek(1);
			if (next !== undefined && next >= "0" && next <= "9") {
				throw new Unsupported("a legacy octal escape", start);
			}
			this.at += 1;
			return { type: "char", unit: 0x0000 };
		}
		if (ch === "x") {
			const hex = this.text.slice(this.at + 1, this.at + 3);
			if (!/^[0-9A-Fa-f]{2}$/.test(hex)) {
				throw new Unsupported("a malformed `\\xHH` escape", start);
			}
			this.at += 3;
			return { type: "char", unit: Number.parseInt(hex, 16) };
		}
		if (ch === "u") {
			if (this.peek(1) === "{") {
				throw new Unsupported("a code-point escape `\\u{…}`", start);
			}
			const hex = this.text.slice(this.at + 1, this.at + 5);
			if (!/^[0-9A-Fa-f]{4}$/.test(hex)) {
				throw new Unsupported("a malformed `\\uHHHH` escape", start);
			}
			this.at += 5;
			return { type: "char", unit: Number.parseInt(hex, 16) };
		}
		if (ch === "c") {
			const letter = this.peek(1);
			if (letter === undefined || !/^[A-Za-z]$/.test(letter)) {
				throw new Unsupported("a malformed control escape `\\c`", start);
			}
			this.at += 2;
			return { type: "char", unit: letter.toUpperCase().charCodeAt(0) % 32 };
		}
		// An identity escape: the escaped character stands for itself.
		this.at += 1;
		return unitsOf(ch);
	}

	characterClass() {
		const start = this.at;
		this.at += 1;
		const negated = this.eat("^");
		const ranges = [];
		for (;;) {
			const ch = this.peek();
			if (ch === undefined)
				throw new Unsupported("an unterminated class", start);
			if (ch === "]") {
				this.at += 1;
				break;
			}
			const first = this.classAtom();
			if (first.ranges !== undefined) {
				ranges.push(...first.ranges);
				continue;
			}
			if (
				this.peek() === "-" &&
				this.peek(1) !== undefined &&
				this.peek(1) !== "]"
			) {
				this.at += 1;
				const second = this.classAtom();
				if (second.ranges !== undefined) {
					throw new Unsupported("a class escape as a range bound", this.at);
				}
				if (second.unit < first.unit) {
					throw new Unsupported("an inverted class range", this.at);
				}
				ranges.push([first.unit, second.unit]);
				continue;
			}
			ranges.push([first.unit, first.unit]);
		}
		return { type: "class", negated, ranges: normalizeRanges(ranges) };
	}

	classAtom() {
		const ch = this.peek();
		if (ch === "\\") {
			const start = this.at;
			this.at += 1;
			const next = this.peek();
			if (next === "b") {
				// Inside a class `\b` is the backspace, not a word boundary.
				this.at += 1;
				return { unit: 0x0008 };
			}
			if (next === "B") throw new Unsupported("`\\B` inside a class", start);
			if (next === "p" || next === "P")
				throw new Unsupported("a Unicode property escape `\\p{…}`", start);
			if (next === "k")
				throw new Unsupported("a named backreference `\\k<name>`", start);
			const cls = classEscape(next);
			if (cls !== undefined) {
				this.at += 1;
				return { ranges: cls.negated ? complement(cls.ranges) : cls.ranges };
			}
			const escaped = this.characterEscape();
			if (escaped.type !== "char") {
				throw new Unsupported("a multi-unit escape inside a class", start);
			}
			return { unit: escaped.unit };
		}
		const unit = this.text.charCodeAt(this.at);
		this.at += 1;
		return { unit };
	}
}

/** True when the node can match the empty string. */
function matchesEmpty(node) {
	switch (node.type) {
		case "char":
		case "dot":
		case "class":
			return false;
		case "bol":
		case "eol":
			return true;
		case "seq":
			return node.terms.every((term) => matchesEmpty(term));
		case "alt":
			return node.alternatives.some((branch) => matchesEmpty(branch));
		case "repeat":
			return node.min === 0 || matchesEmpty(node.atom);
		default:
			return true;
	}
}

/** A literal character, which is two nodes when it is an astral code point. */
function unitsOf(ch) {
	const units = [];
	for (let index = 0; index < ch.length; index += 1) {
		units.push({ type: "char", unit: ch.charCodeAt(index) });
	}
	return units.length === 1 ? units[0] : { type: "seq", terms: units };
}

function classEscape(ch) {
	switch (ch) {
		case "d":
			return { type: "class", negated: false, ranges: DIGIT_RANGES };
		case "D":
			return { type: "class", negated: true, ranges: DIGIT_RANGES };
		case "w":
			return { type: "class", negated: false, ranges: WORD_RANGES };
		case "W":
			return { type: "class", negated: true, ranges: WORD_RANGES };
		case "s":
			return { type: "class", negated: false, ranges: SPACE_RANGES };
		case "S":
			return { type: "class", negated: true, ranges: SPACE_RANGES };
		default:
			return undefined;
	}
}

/** Sorts and merges ranges, so one class has one canonical lowering. */
function normalizeRanges(ranges) {
	const sorted = [...ranges].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
	const merged = [];
	for (const [lo, hi] of sorted) {
		const last = merged[merged.length - 1];
		if (last !== undefined && lo <= last[1] + 1) {
			last[1] = Math.max(last[1], hi);
			continue;
		}
		merged.push([lo, hi]);
	}
	return merged;
}

function complement(ranges) {
	const merged = normalizeRanges(ranges);
	const out = [];
	let cursor = 0;
	for (const [lo, hi] of merged) {
		if (lo > cursor) out.push([cursor, lo - 1]);
		cursor = hi + 1;
	}
	if (cursor <= 0xffff) out.push([cursor, 0xffff]);
	return out;
}

/**
 * Classifies a pattern.
 *
 * `expressible` is decided first because it is decided by the pattern's own
 * text; `proved` is a registry lookup and the two are disjoint by construction
 * — the one registered pattern carries four lookaheads and is not expressible.
 */
export function classifyPattern(regex) {
	const text = String(regex);
	try {
		parsePattern(text);
		return "expressible";
	} catch (error) {
		if (!(error instanceof Unsupported)) throw error;
		if (Object.hasOwn(PROVED_VALIDATORS.entries, text)) return "proved";
		return "unsupported";
	}
}

/**
 * The construct that made a pattern unsupported, for the diagnostic message.
 * Returns `undefined` for a pattern that is expressible or proved.
 */
export function unsupportedConstruct(regex) {
	const text = String(regex);
	try {
		parsePattern(text);
		return undefined;
	} catch (error) {
		if (!(error instanceof Unsupported)) throw error;
		if (Object.hasOwn(PROVED_VALIDATORS.entries, text)) return undefined;
		return error.construct;
	}
}

/** The registry entry for a proved pattern, or `undefined`. */
export function provedEntry(regex) {
	const entries = PROVED_VALIDATORS.entries;
	return Object.hasOwn(entries, String(regex))
		? entries[String(regex)]
		: undefined;
}

/** Parses to the subset AST. Throws `Unsupported` outside the subset. */
export function parsePattern(regex) {
	return new Parser(regex).parse();
}

/** Shifts every jump target in a fragment by `delta`. */
function shift(fragment, delta) {
	return fragment.map((inst) => {
		if (inst.op === "jump") return { op: "jump", x: inst.x + delta };
		if (inst.op === "split")
			return { op: "split", x: inst.x + delta, y: inst.y + delta };
		return inst;
	});
}

function guard(fragment) {
	if (fragment.length > MAX_PROGRAM_LENGTH) {
		throw new Unsupported(
			`a lowering longer than the declared ${MAX_PROGRAM_LENGTH}-instruction bound`,
			0,
		);
	}
	return fragment;
}

function compile(node) {
	switch (node.type) {
		case "char":
			return [{ op: "char", unit: node.unit }];
		case "dot":
			return [{ op: "any" }];
		case "class":
			return [{ op: "class", negated: node.negated, ranges: node.ranges }];
		case "bol":
			return [{ op: "bol" }];
		case "eol":
			return [{ op: "eol" }];
		case "seq": {
			let out = [];
			for (const term of node.terms)
				out = guard(out.concat(shift(compile(term), out.length)));
			return out;
		}
		case "alt": {
			// Right-nested, so priority is left to right exactly as ECMA-262 orders
			// alternatives.
			const [head, ...rest] = node.alternatives;
			const left = compile(head);
			const right =
				rest.length === 1
					? compile(rest[0])
					: compile({ type: "alt", alternatives: rest });
			const total = 1 + left.length + 1 + right.length;
			return guard([
				{ op: "split", x: 1, y: 1 + left.length + 1 },
				...shift(left, 1),
				{ op: "jump", x: total },
				...shift(right, 1 + left.length + 1),
			]);
		}
		case "repeat":
			return guard(compileRepeat(node));
		default:
			throw new Unsupported(`an unknown node \`${node.type}\``, 0);
	}
}

function compileRepeat(node) {
	const body = compile(node.atom);
	const { min, max, lazy } = node;
	if (max === Number.POSITIVE_INFINITY) {
		if (min === 0) return star(body, lazy);
		let out = [];
		for (let index = 0; index < min - 1; index += 1) {
			out = guard(out.concat(shift(body, out.length)));
		}
		return guard(out.concat(shift(plus(body, lazy), out.length)));
	}
	let out = [];
	for (let index = 0; index < min; index += 1) {
		out = guard(out.concat(shift(body, out.length)));
	}
	// `X{2,4}` is `XX(?:X(?:X)?)?`: nesting the optionals, rather than
	// concatenating them, is what makes a failed inner copy stop the outer one
	// instead of letting a later copy match with an earlier one skipped.
	let optional = [];
	for (let index = 0; index < max - min; index += 1) {
		optional = guard(opt(body.concat(shift(optional, body.length)), lazy));
	}
	return guard(out.concat(shift(optional, out.length)));
}

function star(body, lazy) {
	const entry = lazy
		? { op: "split", x: 1 + body.length + 1, y: 1 }
		: { op: "split", x: 1, y: 1 + body.length + 1 };
	return [entry, ...shift(body, 1), { op: "jump", x: 0 }];
}

function plus(body, lazy) {
	const entry = lazy
		? { op: "split", x: body.length + 1, y: 0 }
		: { op: "split", x: 0, y: body.length + 1 };
	return [...body, entry];
}

function opt(body, lazy) {
	const entry = lazy
		? { op: "split", x: 1 + body.length, y: 1 }
		: { op: "split", x: 1, y: 1 + body.length };
	return [entry, ...shift(body, 1)];
}

/**
 * Lowers an expressible pattern to the matcher program the generated crate
 * executes. Throws `Unsupported` for a pattern outside the subset, which the
 * caller has already classified.
 */
export function lowerPattern(regex) {
	const ast = parsePattern(regex);
	const body = compile(ast);
	return {
		source: String(regex),
		instructions: [...body, { op: "match" }],
	};
}

/**
 * Runs a lowered program against a subject, over UTF-16 code units, with the
 * step bound the generated matcher declares. This is the JavaScript twin of the
 * emitted Rust matcher and exists so the emitter's own tests can compare the
 * two implementations against `RegExp` without a Rust toolchain.
 */
export function runProgram(program, subject, stepBound = 1000000) {
	const units = [];
	for (let index = 0; index < subject.length; index += 1) {
		units.push(subject.charCodeAt(index));
	}
	let steps = 0;
	for (let start = 0; start <= units.length; start += 1) {
		const stack = [{ pc: 0, at: start }];
		while (stack.length > 0) {
			steps += 1;
			if (steps > stepBound) return { bounded: true };
			const frame = stack.pop();
			const inst = program.instructions[frame.pc];
			switch (inst.op) {
				case "match":
					return { matched: true };
				case "char":
					if (units[frame.at] === inst.unit)
						stack.push({ pc: frame.pc + 1, at: frame.at + 1 });
					break;
				case "any":
					if (
						frame.at < units.length &&
						!LINE_TERMINATORS.includes(units[frame.at])
					)
						stack.push({ pc: frame.pc + 1, at: frame.at + 1 });
					break;
				case "class": {
					if (frame.at >= units.length) break;
					const unit = units[frame.at];
					let inside = false;
					for (const [lo, hi] of inst.ranges) {
						if (unit >= lo && unit <= hi) {
							inside = true;
							break;
						}
					}
					if (inside !== inst.negated)
						stack.push({ pc: frame.pc + 1, at: frame.at + 1 });
					break;
				}
				case "bol":
					if (frame.at === 0) stack.push({ pc: frame.pc + 1, at: frame.at });
					break;
				case "eol":
					if (frame.at === units.length)
						stack.push({ pc: frame.pc + 1, at: frame.at });
					break;
				case "split":
					stack.push({ pc: inst.y, at: frame.at });
					stack.push({ pc: inst.x, at: frame.at });
					break;
				case "jump":
					stack.push({ pc: inst.x, at: frame.at });
					break;
				default:
					break;
			}
		}
	}
	return { matched: false };
}
