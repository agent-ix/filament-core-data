import { emitFile } from "@typespec/compiler";
import { defaultGeneratorId } from "../../identity.mjs";
import { buildSemanticIr, serializeSemanticIr } from "../../ir.mjs";

export { defaultGeneratorId };

/**
 * `tsp --emit <absolute path to this directory>`; the generator identity
 * arrives as `--option "@agent-ix/semantic-ir-emitter.generator=<id>"`.
 */
export async function $onEmit(context) {
	const ir = buildSemanticIr(context.program, {
		generator: context.options?.generator,
		baseDir: process.cwd(),
	});
	await emitFile(context.program, {
		path: `${context.emitterOutputDir}/semantic-ir.json`,
		content: serializeSemanticIr(ir),
		newLine: "lf",
	});
}
