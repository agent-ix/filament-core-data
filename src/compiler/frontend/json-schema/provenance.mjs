/**
 * Generation provenance (FR-084).
 *
 * Records what produced an artifact, from the *declared* toolchain only.
 *
 * Nothing the host observes enters the record. A patch-level interpreter, a
 * formatter bump or a different machine must not move a byte-compared
 * artifact, and the way to guarantee that is to give the fingerprint nothing
 * host-shaped to read. Issue #23 learned this precise lesson and its
 * `toolchain_fingerprint` says so in a comment; the same rule applies here for
 * the same reason.
 *
 * The record also carries the publication gate. An artifact that says who
 * generated it but not whether it may be published invites the reasonable
 * assumption that it may be.
 */

import { createHash } from "node:crypto";

/**
 * A stable digest over declared values.
 *
 * Keys are sorted, so a record built in a different order digests the same:
 * the fingerprint identifies the values, not the insertion order of the object
 * that happened to carry them.
 */
function digest(value) {
	const canonical = (node) => {
		if (Array.isArray(node)) return node.map(canonical);
		if (node !== null && typeof node === "object") {
			/** @type {Record<string, unknown>} */
			const out = {};
			for (const key of Object.keys(node).sort())
				out[key] = canonical(node[key]);
			return out;
		}
		return node;
	};
	return `sha256:${createHash("sha256")
		.update(JSON.stringify(canonical(value)))
		.digest("hex")}`;
}

/**
 * The provenance record for one generated target.
 *
 * @param {{
 *   target: string,
 *   semanticCore: string,
 *   emissionDigest: string,
 *   inputDigest: string,
 *   losses: readonly { id: string, code: string, construct: string }[],
 * }} input
 */
export function provenanceOf(input) {
	const declared = {
		target: input.target,
		semanticCore: input.semanticCore,
		emissionDigest: input.emissionDigest,
		inputDigest: input.inputDigest,
	};
	return Object.freeze({
		$comment:
			"Issue #11, FR-084. Generated, never hand-edited. The fingerprint is over the declared toolchain only: nothing the host observes enters it.",
		...declared,
		// Losses travel with the artifact rather than in a separate document,
		// because a consumer reading the package is the person who needs to know
		// what the package cannot represent.
		losses: Object.freeze(
			input.losses.map((l) =>
				Object.freeze({ id: l.id, code: l.code, construct: l.construct }),
			),
		),
		toolchainFingerprint: digest(declared),
		published: false,
		publicationGate: Object.freeze({
			issue: "agent-ix/quoin#290",
			state: "not-taken",
		}),
	});
}

/**
 * Whether a provenance record leaks anything host-shaped.
 *
 * Checked rather than asserted in prose: the failure mode is that someone adds
 * a convenient field — a path, a hostname, a timestamp — and every artifact
 * stops being byte-comparable across machines, which is discovered much later
 * as a determinism test that fails only in CI.
 */
export function hostLeaks(record, host) {
	const text = JSON.stringify(record);
	/** @type {string[]} */
	const found = [];
	for (const [name, value] of Object.entries(host)) {
		if (typeof value !== "string" || value.length < 3) continue;
		if (text.includes(value)) found.push(name);
	}
	return Object.freeze(found);
}
