/**
 * The FR-085 TypeScript package's decision path.
 *
 * The package's own generated validator for the golden document's declaration
 * decides it, and the value the validator narrows to is the wire form. Nothing
 * else in this module decides anything: there is no second check, no
 * canonicalization and no comparison here.
 *
 * It imports nothing under `conformance/` (FR-090-CON-4) and reads no clock and
 * no environment variable (FR-090-CON-11).
 */

import * as validators from "../../typescript/validators.js";
import { loadGolden } from "../golden.mjs";
import { unknownFateOf } from "../project.mjs";

const SURFACED = "agent-ix.typescript-backend.UNKNOWN_MEMBER_SURFACED";
const PRESERVED_MEMBER = "__unknown";

const exercised = (document) =>
	document.properties.includes("unknown-member-states");

/** One answer per golden document, in corpus order. */
export function decide(golden = loadGolden()) {
	return golden.map((document) => {
		// The emitter must reach whichever of the 30 generated validators the
		// document names. Naming them statically here would be a second
		// hand-maintained list of the declarations the inventory already owns,
		// and a list that drifted would excuse a declaration from measurement.
		// biome-ignore lint/performance/noDynamicNamespaceImportAccess: explained above
		const validate = validators[`validate${document.declaration}`];
		if (typeof validate !== "function") {
			return { id: document.id, resultState: "undecided" };
		}
		const result = validate(document.instance);
		if (!result.ok) {
			return {
				id: document.id,
				resultState: "invalid",
				unknownFate: exercised(document) ? "rejected" : unknownFateOf(document),
			};
		}
		let fate = unknownFateOf(document);
		if (exercised(document)) {
			const surfaced = result.surfaced.some((entry) => entry.code === SURFACED);
			const retained =
				result.value !== null &&
				typeof result.value === "object" &&
				PRESERVED_MEMBER in result.value;
			fate = surfaced ? "surfaced" : retained ? "preserved" : "dropped";
		}
		return {
			id: document.id,
			resultState: "success",
			wire: JSON.parse(JSON.stringify(result.value)),
			unknownFate: fate,
		};
	});
}

if (import.meta.filename === process.argv[1]) {
	process.stdout.write(`${JSON.stringify(decide(), null, "\t")}\n`);
}
