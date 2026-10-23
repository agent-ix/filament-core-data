/** FR-146's dimension and unit graph, independent of type resolution. */
import { DIAGNOSTIC_CODES } from "../diagnostics.mjs";

const isObject = (value) =>
	value !== null && typeof value === "object" && !Array.isArray(value);

const I128_MIN = -(1n << 127n);
const I128_MAX = (1n << 127n) - 1n;

function integer(text) {
	if (typeof text !== "string" || !/^(0|-?[1-9][0-9]*)(?![\s\S])/.test(text))
		return { invalid: true };
	// An i128 has at most 39 digits and an optional sign.
	if (text.length > 40) return { outside: true };
	const value = BigInt(text);
	return value < I128_MIN || value > I128_MAX ? { outside: true } : { value };
}
function rational(text) {
	if (typeof text !== "string") return { invalid: true };
	const parts = text.split("/");
	if (parts.length === 1) return integer(text);
	if (parts.length !== 2) return { invalid: true };
	const n = integer(parts[0]);
	const d = integer(parts[1]);
	if (n.outside || d.outside) return { outside: true };
	if (n.invalid || d.invalid || n.value === 0n || d.value < 2n)
		return { invalid: true };
	let a = n.value < 0n ? -n.value : n.value;
	let b = d.value;
	while (b !== 0n) {
		const rest = a % b;
		a = b;
		b = rest;
	}
	return a === 1n ? { value: n.value } : { invalid: true };
}

/** Strong components with explicit stacks; authored graph depth is not JS call depth. */
function components(edges) {
	const seen = new Set();
	const order = [];
	for (let root = 0; root < edges.length; root++) {
		if (seen.has(root)) continue;
		seen.add(root);
		const stack = [[root, 0]];
		while (stack.length) {
			const top = stack[stack.length - 1];
			const next = edges[top[0]][top[1]++];
			if (next === undefined) {
				order.push(top[0]);
				stack.pop();
			} else if (!seen.has(next)) {
				seen.add(next);
				stack.push([next, 0]);
			}
		}
	}
	const reverse = edges.map(() => []);
	edges.forEach((targets, source) => {
		for (const target of targets) reverse[target].push(source);
	});
	seen.clear();
	const result = [];
	for (const root of order.reverse()) {
		if (seen.has(root)) continue;
		const group = [];
		const pending = [root];
		seen.add(root);
		while (pending.length) {
			const node = pending.pop();
			group.push(node);
			for (const source of reverse[node])
				if (!seen.has(source)) {
					seen.add(source);
					pending.push(source);
				}
		}
		if (group.length > 1 || edges[root].includes(root))
			result.push(group.sort((a, b) => a - b));
	}
	return result;
}

/** Collect every FR-146 graph defect, retaining authored array positions. */
export function checkUnitGraph(document, raise) {
	const dimensions = Array.isArray(document.dimensions)
		? document.dimensions
		: [];
	const units = Array.isArray(document.units) ? document.units : [];
	const emit = (code, pointer, message, node) =>
		raise(
			DIAGNOSTIC_CODES[code],
			`${pointer}: ${message}`,
			node?.origin?.source,
		);
	const index = (nodes, label) => {
		const found = new Map();
		nodes.forEach((node, position) => {
			if (!isObject(node)) return;
			if (found.has(node.identity))
				emit(
					"DUPLICATE_IDENTITY",
					`/ir/${label}/${position}/identity`,
					"the identity is already declared",
					node,
				);
			else found.set(node.identity, position);
			if (
				node.identity !==
				`ix://${document.package?.identity}/${label === "units" ? "unit" : "dimension"}/${node.name}`
			)
				emit(
					"INVALID_UNIT_GRAPH",
					`/ir/${label}/${position}/identity`,
					"identity must name the package and declaration",
					node,
				);
		});
		return found;
	};
	const dimensionIds = index(dimensions, "dimensions");
	const unitIds = index(units, "units");
	const dimensionEdges = dimensions.map(() => []);
	dimensions.forEach((node, position) => {
		if (!isObject(node)) return;
		const at = `/ir/dimensions/${position}`;
		const terms = Array.isArray(node.terms) ? node.terms : [];
		if (node.base && terms.length)
			emit(
				"INVALID_UNIT_GRAPH",
				`${at}/terms`,
				"a base dimension has no terms",
				node,
			);
		terms.forEach((term, offset) => {
			if (!isObject(term)) return;
			const termAt = `${at}/terms/${offset}`;
			const target = dimensionIds.get(term.dimension);
			if (target === undefined)
				emit(
					"UNRESOLVED_DIMENSION_REF",
					`${termAt}/dimension`,
					"no dimension has this identity",
					node,
				);
			else dimensionEdges[position].push(target);
			const parsed = integer(term.exponent);
			if (parsed.outside || parsed.invalid)
				emit(
					parsed.outside ? "INTEGER_OUTSIDE_I128" : "INVALID_OPERAND",
					`${termAt}/exponent`,
					"expected a canonical i128 integer",
					node,
				);
			else if (parsed.value === 0n)
				emit(
					"INVALID_UNIT_GRAPH",
					`${termAt}/exponent`,
					"dimension exponents are nonzero",
					node,
				);
			if (offset && terms[offset - 1]?.dimension >= term.dimension)
				emit(
					"INVALID_UNIT_GRAPH",
					termAt,
					"dimension terms must be strictly ordered",
					node,
				);
		});
	});
	for (const group of components(dimensionEdges)) {
		const first = group[0];
		const members = new Set(group);
		const offset = dimensions[first].terms.findIndex((term) =>
			members.has(dimensionIds.get(term?.dimension)),
		);
		emit(
			"INVALID_UNIT_GRAPH",
			`/ir/dimensions/${first}/terms/${offset}`,
			`dimension cycle: ${group.map((i) => dimensions[i].name).join(", ")}`,
			dimensions[first],
		);
	}
	const unitEdges = units.map(() => []);
	const roots = new Map();
	units.forEach((node, position) => {
		if (!isObject(node)) return;
		const at = `/ir/units/${position}`;
		if (!dimensionIds.has(node.dimension))
			emit(
				"UNRESOLVED_DIMENSION_REF",
				`${at}/dimension`,
				"no dimension has this identity",
				node,
			);
		for (const name of ["scale", "offset"]) {
			const parsed = rational(node[name]);
			if (parsed.outside || parsed.invalid)
				emit(
					parsed.outside ? "INTEGER_OUTSIDE_I128" : "INVALID_OPERAND",
					`${at}/${name}`,
					"expected a canonical i128 rational",
					node,
				);
		}
		if (node.scale === "0")
			emit(
				"INVALID_UNIT_GRAPH",
				`${at}/scale`,
				"a unit scale is nonzero",
				node,
			);
		if (node.target !== undefined) {
			const target = unitIds.get(node.target);
			if (target === undefined)
				emit(
					"UNRESOLVED_UNIT_REF",
					`${at}/target`,
					"no unit has this identity",
					node,
				);
			else {
				unitEdges[position].push(target);
				if (
					dimensionIds.has(node.dimension) &&
					dimensionIds.has(units[target].dimension) &&
					units[target].dimension !== node.dimension
				)
					emit(
						"INVALID_UNIT_GRAPH",
						`${at}/target`,
						`unit dimensions differ: ${node.dimension}, ${units[target].dimension}`,
						node,
					);
			}
		} else {
			if (roots.has(node.dimension))
				emit(
					"INVALID_UNIT_GRAPH",
					at,
					`dimension ${node.dimension} already has root ${units[roots.get(node.dimension)].name}`,
					node,
				);
			else roots.set(node.dimension, position);
			if (
				node.scale !== "1" &&
				node.scale !== "0" &&
				rational(node.scale).value !== undefined
			)
				emit(
					"INVALID_UNIT_GRAPH",
					`${at}/scale`,
					"a root unit has scale 1",
					node,
				);
			if (node.offset !== "0" && rational(node.offset).value !== undefined)
				emit(
					"INVALID_UNIT_GRAPH",
					`${at}/offset`,
					"a root unit has offset 0",
					node,
				);
		}
	});
	for (const group of components(unitEdges)) {
		const first = group[0];
		const names = [];
		let cursor = first;
		do {
			names.push(units[cursor].name);
			cursor = unitEdges[cursor][0];
		} while (cursor !== first);
		emit(
			"INVALID_UNIT_GRAPH",
			`/ir/units/${first}/target`,
			`unit cycle: ${names.join(", ")}`,
			units[first],
		);
	}
}
