/**
 * The FR-088 modular JSON Schema artifact's decision path.
 *
 * The index at `packages/semantic-kernel/json-schema/index.json` names the
 * thirty published documents; every one is registered and the golden
 * document's declaration is decided by its own `$id`. A schema validator
 * neither renames a member nor materializes a default, so the wire form it
 * answers with is the document it was handed.
 *
 * It imports nothing under `conformance/` (FR-090-CON-4) and reads no clock and
 * no environment variable (FR-090-CON-11).
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { loadGolden, REPO_ROOT } from "../golden.mjs";
import { unknownFateOf } from "../project.mjs";

const BASE = "https://schemas.agent-ix.org/semantic-core/0.3.0/";
const INDEX = resolve(
	REPO_ROOT,
	"packages/semantic-kernel/json-schema/index.json",
);

function compile() {
	const index = JSON.parse(readFileSync(INDEX, "utf8"));
	const ajv = new Ajv2020({ allErrors: true, strict: false });
	for (const document of index.documents) {
		ajv.addSchema(
			JSON.parse(readFileSync(resolve(dirname(INDEX), document.path), "utf8")),
		);
	}
	return ajv;
}

/** One answer per golden document, in corpus order. */
export function decide(golden = loadGolden()) {
	const ajv = compile();
	return golden.map((document) => {
		const validate = ajv.getSchema(`${BASE}${document.declaration}.json`);
		if (!validate) {
			return { id: document.id, resultState: "undecided" };
		}
		const ok = validate(document.instance);
		if (!ok) {
			return {
				id: document.id,
				resultState: "invalid",
				unknownFate: exercised(document) ? "rejected" : unknownFateOf(document),
			};
		}
		return {
			id: document.id,
			resultState: "success",
			wire: document.instance,
			unknownFate: exercised(document) ? "preserved" : unknownFateOf(document),
		};
	});
}

const exercised = (document) =>
	document.properties.includes("unknown-member-states");

if (import.meta.filename === process.argv[1]) {
	process.stdout.write(`${JSON.stringify(decide(), null, "\t")}\n`);
}
