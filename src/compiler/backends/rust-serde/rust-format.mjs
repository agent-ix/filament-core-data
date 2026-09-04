/**
 * The formatting rules the emitter is a fixed point of (FR-060, NFR-022).
 *
 * The generated crate must be `rustfmt`-clean *as emitted*, and generation may
 * not shell out to `rustfmt` — a child process on the generation path is a
 * hermeticity failure, and it would make the emitted bytes depend on whichever
 * formatter happened to be on the host's path. So the small part of `rustfmt`'s
 * behaviour the emitted constructs actually exercise is reproduced here, under
 * the repository's pinned `rustfmt.toml`:
 *
 * - `max_width = 100`, `tab_spaces = 4`, `use_small_heuristics = "Default"`,
 *   which fixes `struct_lit_width` at 18.
 * - A struct literal is written on one line only when that line is at most 18
 *   characters wide and fits; otherwise one field per line.
 * - A slice literal is written on one line when it fits; otherwise one element
 *   per line — except for the single-element case, where `rustfmt` overflows the
 *   one element onto the opening bracket's line.
 * - A `const` item whose value does not fit breaks after the `=` and indents the
 *   value by four.
 *
 * The rules are a *claim*, and the claim is checked: `rustfmt --check` over the
 * generated output is the gate, and any construct this module gets wrong shows
 * up there as a diff rather than as a silent divergence.
 */

/** The pinned `max_width`. */
export const MAX_WIDTH = 100;

/** `use_small_heuristics = "Default"` fixes `struct_lit_width` at 18. */
export const STRUCT_LIT_WIDTH = 18;

/** `use_small_heuristics = "Default"` fixes `fn_call_width` at 60. */
export const FN_CALL_WIDTH = 60;

/**
 * A call, on one line while its arguments stay inside `fn_call_width` and the
 * line fits, and one argument per line beyond that.
 *
 * `head` carries everything up to the opening parenthesis and `suffix`
 * everything after the closing one, so a call nested inside another — the
 * `return Err(Error::new(..));` every generated check ends with — is rendered
 * by one call to this function rather than by two that have to agree.
 */
export function callLines(indent, head, args, suffix) {
	const joined = args.join(", ");
	const inline = `${indent}${head}(${joined})${suffix}`;
	// `fn_call_width` bounds each call, so an *enclosing* call — the `Err(..)`
	// around every generated failure — has to be measured too. Its own argument
	// is this whole call, and when that exceeds the bound `rustfmt` breaks the
	// outer one even though the inner arguments would have fitted.
	const nested = head.lastIndexOf("(");
	const enclosing = nested === -1 ? "" : `${head.slice(nested + 1)}(${joined})`;
	if (
		joined.length <= FN_CALL_WIDTH &&
		enclosing.length <= FN_CALL_WIDTH &&
		inline.length <= MAX_WIDTH
	) {
		return [inline];
	}
	return [
		`${indent}${head}(`,
		...args.map((argument) => `${indent}    ${argument},`),
		`${indent})${suffix}`,
	];
}

const INDENT = "    ";

/** A literal token rendered as written. */
export function atom(text) {
	return { kind: "atom", text: String(text) };
}

/** A struct literal. */
export function struct(path, fields) {
	return { kind: "struct", path, fields };
}

/** `Some(<value>)`, or `None` for `undefined` and `null`. */
export function some(value) {
	return value === undefined || value === null
		? atom("None")
		: { kind: "call", path: "Some", value };
}

/** A slice literal `&[..]`. */
export function slice(items) {
	return { kind: "slice", items };
}

function inlineOf(value) {
	switch (value.kind) {
		case "atom":
			return value.text;
		case "call":
			return `${value.path}(${inlineOf(value.value)})`;
		case "struct":
			return value.fields.length === 0
				? `${value.path} {}`
				: `${value.path} { ${value.fields.map((field) => `${field.name}: ${inlineOf(field.value)}`).join(", ")} }`;
		case "slice":
			return `&[${value.items.map(inlineOf).join(", ")}]`;
		default:
			throw new TypeError(`unknown value kind \`${value.kind}\``);
	}
}

function structFitsInline(value, column) {
	// `struct_lit_width` bounds the *body* of the literal, not the whole of it,
	// so `Self { name, node }` stays on one line while a nineteen-character
	// measurement of the whole would wrongly break it.
	const body = value.fields
		.map((field) => `${field.name}: ${inlineOf(field.value)}`)
		.join(", ");
	return (
		body.length <= STRUCT_LIT_WIDTH &&
		column + inlineOf(value).length <= MAX_WIDTH
	);
}

/**
 * Renders a value as lines.
 *
 * The first line carries no indentation — the caller places it after whatever
 * prefix it is emitting — and every later line is indented from `depth`.
 */
export function renderValue(value, depth, column) {
	const pad = INDENT.repeat(depth);
	switch (value.kind) {
		case "atom":
			return [value.text];
		case "call": {
			const inner = value.value;
			if (
				(inner.kind === "atom" || inner.kind === "slice") &&
				column + inlineOf(value).length <= MAX_WIDTH
			) {
				return [inlineOf(value)];
			}
			if (
				inner.kind === "struct" &&
				structFitsInline(inner, column + value.path.length + 1)
			) {
				return [inlineOf(value)];
			}
			const lines = renderValue(inner, depth, column + value.path.length + 1);
			lines[0] = `${value.path}(${lines[0]}`;
			lines[lines.length - 1] = `${lines[lines.length - 1]})`;
			return lines;
		}
		case "struct": {
			if (structFitsInline(value, column)) return [inlineOf(value)];
			const lines = [`${value.path} {`];
			for (const field of value.fields) {
				const inner = renderValue(
					field.value,
					depth + 1,
					pad.length + INDENT.length + field.name.length + 2,
				);
				inner[0] = `${pad}${INDENT}${field.name}: ${inner[0]}`;
				inner[inner.length - 1] = `${inner[inner.length - 1]},`;
				lines.push(...inner);
			}
			lines.push(`${pad}}`);
			return lines;
		}
		case "slice": {
			const inline = inlineOf(value);
			if (column + inline.length <= MAX_WIDTH) return [inline];
			if (value.items.length === 1) {
				// `rustfmt` overflows a sole element onto the bracket's line rather
				// than giving it a line of its own.
				const inner = renderValue(value.items[0], depth, column + 2);
				inner[0] = `&[${inner[0]}`;
				inner[inner.length - 1] = `${inner[inner.length - 1]}]`;
				return inner;
			}
			const lines = ["&["];
			for (const item of value.items) {
				const inner = renderValue(item, depth + 1, pad.length + INDENT.length);
				inner[0] = `${pad}${INDENT}${inner[0]}`;
				inner[inner.length - 1] = `${inner[inner.length - 1]},`;
				lines.push(...inner);
			}
			lines.push(`${pad}]`);
			return lines;
		}
		default:
			throw new TypeError(`unknown value kind \`${value.kind}\``);
	}
}

/**
 * Renders `<visibility>const NAME: TYPE = <value>;` at the top level, breaking
 * after the `=` when the one-line form does not fit.
 */
export function constItem(visibility, name, type, value) {
	const prefix = `${visibility}const ${name}: ${type} = `;
	const lines = renderValue(value, 0, prefix.length);
	if (lines.length === 1) {
		if (prefix.length + lines[0].length + 1 <= MAX_WIDTH) {
			return [`${prefix}${lines[0]};`];
		}
		return [`${visibility}const ${name}: ${type} =`, `${INDENT}${lines[0]};`];
	}
	lines[0] = `${prefix}${lines[0]}`;
	lines[lines.length - 1] = `${lines[lines.length - 1]};`;
	return lines;
}
