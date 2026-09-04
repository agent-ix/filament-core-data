/**
 * The JSON spelling the two generated artefacts are written in.
 *
 * `JSON.stringify(value, null, "\t")` expands every array and object, whatever
 * its length, and the repository's formatter collapses one that fits. A
 * generator whose output the formatter would rewrite makes `make lint` fail on
 * a file nobody edited, and the fix people learn is to run the formatter over
 * the generator's output — which means the artefact on disk is no longer the
 * one the generator produces, and the `--check` that compares them is checking
 * the formatter.
 *
 * So the spelling is produced here instead: a composite is written on one line
 * when it fits inside the formatter's line width at its indent, and expanded
 * when it does not. Tabs count as the formatter's indent width.
 */

/** The formatter's line width and the columns one indent tab stands for. */
const LINE_WIDTH = 80;
const TAB_COLUMNS = 2;

function scalar(value) {
	return JSON.stringify(value) ?? "null";
}

function inline(value) {
	if (Array.isArray(value)) return `[${value.map(inline).join(", ")}]`;
	if (value !== null && typeof value === "object") {
		const entries = Object.entries(value);
		if (entries.length === 0) return "{}";
		return `{ ${entries.map(([key, one]) => `${scalar(key)}: ${inline(one)}`).join(", ")} }`;
	}
	return scalar(value);
}

/**
 * `used` is the columns already spent on the line before this value starts —
 * the indent, the member name that introduces it, and the separator that
 * follows it. Measuring the value alone is what made the first version of this
 * disagree with the formatter on a four-element array: the array fitted and the
 * line it sat on did not.
 */
function write(value, depth, used) {
	if (value === null || typeof value !== "object") return scalar(value);
	const flat = inline(value);
	if (used + flat.length <= LINE_WIDTH) return flat;
	const pad = "\t".repeat(depth + 1);
	const inner = (depth + 1) * TAB_COLUMNS;
	if (Array.isArray(value)) {
		if (value.length === 0) return "[]";
		return `[\n${value
			.map((one) => `${pad}${write(one, depth + 1, inner + 1)}`)
			.join(",\n")}\n${"\t".repeat(depth)}]`;
	}
	const entries = Object.entries(value);
	if (entries.length === 0) return "{}";
	return `{\n${entries
		.map(
			([key, one]) =>
				`${pad}${scalar(key)}: ${write(one, depth + 1, inner + scalar(key).length + 3)}`,
		)
		.join(",\n")}\n${"\t".repeat(depth)}}`;
}

/** One generated artefact, in the spelling the formatter already agrees with. */
export function formatJson(value) {
	return `${write(value, 0, 0)}\n`;
}
