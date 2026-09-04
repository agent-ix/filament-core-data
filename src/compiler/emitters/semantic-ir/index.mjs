import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { emitFile } from "@typespec/compiler";
import { buildSemanticIr, serializeSemanticIr } from "../../ir.mjs";

const here = dirname(fileURLToPath(import.meta.url));

/**
 * The emitter's own identity, used when the caller supplies no `generator`
 * option (FR-041-AC-8).
 */
export function defaultGeneratorId() {
	const manifest = JSON.parse(
		readFileSync(resolve(here, "package.json"), "utf8"),
	);
	return `${manifest.name}@${manifest.version}`;
}

/**
 * `tsp --emit <absolute path to this directory>`; the generator identity
 * arrives as `--option "@agent-ix/semantic-ir-emitter.generator=<id>"`.
 */
export async function $onEmit(context) {
	const generator = context.options?.generator ?? defaultGeneratorId();
	const ir = buildSemanticIr(context.program, {
		generator,
		baseDir: process.cwd(),
	});
	await emitFile(context.program, {
		path: `${context.emitterOutputDir}/semantic-ir.json`,
		content: serializeSemanticIr(ir),
		newLine: "lf",
	});
}
