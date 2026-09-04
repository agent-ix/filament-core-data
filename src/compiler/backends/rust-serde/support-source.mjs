import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { atom, constItem, slice, struct } from "./rust-format.mjs";

/**
 * The text of the generated `src/support.rs` (FR-057, FR-054).
 *
 * It lives beside the emitter rather than inside it because it is a *fixed*
 * emitted artefact: nothing in it varies with the contract except the two
 * matcher programs the emitter substitutes, and keeping 800 lines of Rust out
 * of the emitter's control flow is what lets `crate.mjs` be read as a mapping
 * from the model to files.
 *
 * Everything the mapping depends on is here and nothing else is: `Nullable`,
 * `present_or_absent`, `SemanticValue` with its `NumberLexeme` and its ordered
 * `Object`, `UnknownMembers`, `Extension`, `SemanticIdentity`,
 * `SourceLocusPath` with both of its predicates, the four validated scalar
 * newtypes, the generated matcher runtime, and `ValidationError`. The crate
 * depends on `serde` alone, so the matcher is generated rather than linked and
 * the instant arithmetic is written out rather than taken from a date library.
 */

/**
 * Renders one matcher program as a `const` slice of instructions, as lines.
 *
 * The instruction values go through the same formatter every other emitted
 * literal does, so a `Class` instruction wide enough for `rustfmt` to break is
 * emitted already broken.
 */
export function renderProgram(name, doc, program, options = {}) {
	const visibility = options.visibility ?? "pub ";
	const path = options.instPath ?? "MatcherInst";
	return [
		`/// ${doc}`,
		...constItem(
			visibility,
			name,
			`&[${path}]`,
			slice(program.instructions.map((inst) => instructionValue(inst, path))),
		),
	];
}

function instructionValue(inst, path) {
	switch (inst.op) {
		case "char":
			return atom(`${path}::Char(${inst.unit})`);
		case "any":
			return atom(`${path}::Any`);
		case "class":
			return struct(`${path}::Class`, [
				{ name: "negated", value: atom(String(inst.negated)) },
				{
					name: "ranges",
					value: slice(inst.ranges.map(([lo, hi]) => atom(`(${lo}, ${hi})`))),
				},
			]);
		case "bol":
			return atom(`${path}::Bol`);
		case "eol":
			return atom(`${path}::Eol`);
		case "split":
			return atom(`${path}::Split(${inst.x}, ${inst.y})`);
		case "jump":
			return atom(`${path}::Jump(${inst.x})`);
		case "match":
			return atom(`${path}::Match`);
		default:
			throw new TypeError(`unknown matcher instruction \`${inst.op}\``);
	}
}

/**
 * The fixed part of `src/support.rs`, held as Rust source beside this module.
 *
 * It is a separate file rather than a template literal because it is Rust, and
 * Rust doc comments are full of backticks: embedding 800 lines of it in a
 * JavaScript string would mean escaping every one of them, and an escape that
 * went wrong would be a defect in the emitted crate rather than in this file.
 * Held as `.rs` it can also be read, and diffed, as what it is.
 */
export const SUPPORT_PRELUDE = readFileSync(
	fileURLToPath(new URL("./support-template.rs", import.meta.url)),
	"utf8",
);
