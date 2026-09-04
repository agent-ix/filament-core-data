/**
 * The type-reference graph, its strongly connected components, and the
 * indirection decision (FR-054 "Recursion").
 *
 * The graph is built over *every* reference edge the IR carries, not over
 * record fields alone: a field's `typeRef`, an `alias`'s and a `reference`'s
 * `target`, a `sequence`'s `items`, a `map`'s `values`, a `variant`'s
 * `payloadType`, an operation parameter's `typeRef`, and an operation's
 * `returns.typeRef`. Building it over fields alone is the defect SR-082
 * FND-949 caught: a cycle that closes through an alias target or through a
 * union variant payload is just as infinite in Rust as one closing through a
 * record field, and the emitted crate does not compile.
 *
 * Every edge carries the *position* at which the target's Rust type is
 * materialized, because that is what decides whether a `Box` can be
 * introduced at all:
 *
 * - `direct` — the target's Rust type appears inline (a single-valued field, an
 *   alias target, a variant payload). This is the only position a `Box` can be
 *   introduced at, and it is introduced exactly when the target lies in the
 *   owner's own strongly connected component.
 * - `collection` — the target's Rust type appears behind a `Vec` or a
 *   `BTreeMap`, which already carries the indirection, so no `Box` is added.
 * - `identity` — a `reference` kind maps to `SemanticIdentity` and does not
 *   materialize the target's Rust type at all. The edge is still in the graph,
 *   because it still closes cycles for every *other* edge's decision, but there
 *   is no position to box.
 * - `metadata` — an operation parameter or return. The mapped type reaches the
 *   crate as `const` metadata text rather than as a member, so again the edge
 *   closes cycles without offering a position to box.
 *
 * The decision depends on the graph alone, so two runs over one document box
 * the same edges. Component numbering is assigned in the document's declared
 * type order rather than in the order Tarjan happens to close components, so
 * the numbering itself is a function of the document too.
 *
 * Pure: no filesystem, clock, environment, or network access.
 */

/** The positions at which a reference edge may materialize its target. */
export const POSITIONS = Object.freeze({
	DIRECT: "direct",
	COLLECTION: "collection",
	IDENTITY: "identity",
	METADATA: "metadata",
});

/**
 * Every edge of one IR document, in a declared order: types in document order,
 * and within a type the order this function visits them, which is fixed.
 *
 * `edgeKey` is the stable name of the position the mapper looks the decision up
 * by, so `mapping.mjs` never has to reconstruct the traversal.
 */
export function collectEdges(ir) {
	const edges = [];
	const push = (from, to, position, edgeKey) => {
		if (typeof to !== "string") return;
		edges.push({ from, to, position, edgeKey });
	};

	for (const definition of ir.types ?? []) {
		const from = definition.identity;
		switch (definition.kind) {
			case "record":
				break;
			case "alias":
				push(from, definition.target, POSITIONS.DIRECT, `${from}#target`);
				break;
			case "reference":
				push(from, definition.target, POSITIONS.IDENTITY, `${from}#target`);
				break;
			case "sequence":
				push(from, definition.items, POSITIONS.COLLECTION, `${from}#items`);
				break;
			case "map":
				push(from, definition.values, POSITIONS.COLLECTION, `${from}#values`);
				break;
			default:
				break;
		}

		for (const field of definition.fields ?? []) {
			push(
				from,
				field.typeRef,
				isCollection(field.multiplicity)
					? POSITIONS.COLLECTION
					: POSITIONS.DIRECT,
				`${field.identity}#typeRef`,
			);
		}
		for (const variant of definition.variants ?? []) {
			if (variant.payloadType === undefined) continue;
			push(
				from,
				variant.payloadType,
				POSITIONS.DIRECT,
				`${variant.identity}#payloadType`,
			);
		}
		for (const operation of definition.operations ?? []) {
			for (const param of operation.params ?? []) {
				push(
					from,
					param.typeRef,
					POSITIONS.METADATA,
					`${param.identity}#typeRef`,
				);
			}
			if (operation.returns !== undefined) {
				push(
					from,
					operation.returns.typeRef,
					POSITIONS.METADATA,
					`${operation.identity}#returns`,
				);
			}
		}
	}
	return edges;
}

/**
 * A collection iff `upper` is absent or greater than one (FR-054 "Fields").
 *
 * A `1.0.0` document reaches this function with the multiplicity already
 * derived from `presence`, so an absent `multiplicity` here means the caller
 * skipped the derivation, and treating it as unbounded would silently make a
 * scalar member a `Vec`. It is therefore read as the single-valued shape the
 * derivation would have produced.
 */
export function isCollection(multiplicity) {
	if (multiplicity === undefined || multiplicity === null) return false;
	const upper = multiplicity.upper;
	if (upper === undefined) return true;
	return upper > 1;
}

/**
 * Tarjan's strongly connected components over the edge set.
 *
 * Returns a `Map` from type identity to a component index. Two identities share
 * an index exactly when each is reachable from the other.
 */
export function components(nodes, edges) {
	const out = new Map();
	for (const node of nodes) out.set(node, []);
	for (const edge of edges) {
		if (!out.has(edge.from) || !out.has(edge.to)) continue;
		out.get(edge.from).push(edge.to);
	}

	const index = new Map();
	const low = new Map();
	const onStack = new Set();
	const stack = [];
	const found = [];
	let counter = 0;

	// Iterative rather than recursive: a 1024-deep chain of aliases is a legal
	// document under the declared limits, and a recursive Tarjan would reach the
	// host's stack limit as a crash rather than as a diagnostic.
	for (const root of nodes) {
		if (index.has(root)) continue;
		const work = [{ node: root, next: 0 }];
		index.set(root, counter);
		low.set(root, counter);
		counter += 1;
		stack.push(root);
		onStack.add(root);

		while (work.length > 0) {
			const frame = work[work.length - 1];
			const neighbours = out.get(frame.node);
			if (frame.next < neighbours.length) {
				const target = neighbours[frame.next];
				frame.next += 1;
				if (!index.has(target)) {
					index.set(target, counter);
					low.set(target, counter);
					counter += 1;
					stack.push(target);
					onStack.add(target);
					work.push({ node: target, next: 0 });
				} else if (onStack.has(target)) {
					low.set(frame.node, Math.min(low.get(frame.node), index.get(target)));
				}
				continue;
			}
			work.pop();
			if (work.length > 0) {
				const parent = work[work.length - 1].node;
				low.set(parent, Math.min(low.get(parent), low.get(frame.node)));
			}
			if (low.get(frame.node) === index.get(frame.node)) {
				const group = [];
				for (;;) {
					const popped = stack.pop();
					onStack.delete(popped);
					group.push(popped);
					if (popped === frame.node) break;
				}
				found.push(group);
			}
		}
	}

	// Renumber in the caller's declared node order, so the component index is a
	// function of the document rather than of the traversal.
	const componentOf = new Map();
	const rank = new Map();
	for (const group of found) {
		for (const member of group) componentOf.set(member, group);
	}
	let next = 0;
	const result = new Map();
	for (const node of nodes) {
		const group = componentOf.get(node);
		if (!rank.has(group)) {
			rank.set(group, next);
			next += 1;
		}
		result.set(node, rank.get(group));
	}
	return result;
}

/**
 * Builds the graph and decides the indirection at every edge.
 *
 * Returns `{ edges, componentOf, boxed, selfEdges }`, where `boxed` is a `Set`
 * of `edgeKey` values the emitter must wrap in `Box<_>`. A `Set` is safe to
 * hand to the emitter because the emitter only ever *queries* it; nothing
 * iterates it into an emitted byte.
 */
export function buildGraph(ir) {
	const nodes = (ir.types ?? []).map((definition) => definition.identity);
	const edges = collectEdges(ir);
	const componentOf = components(nodes, edges);
	const boxed = new Set();
	for (const edge of edges) {
		if (edge.position !== POSITIONS.DIRECT) continue;
		if (!componentOf.has(edge.from) || !componentOf.has(edge.to)) continue;
		if (componentOf.get(edge.from) !== componentOf.get(edge.to)) continue;
		boxed.add(edge.edgeKey);
	}
	return { edges, componentOf, boxed };
}
