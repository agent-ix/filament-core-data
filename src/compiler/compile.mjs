import { NodeHost, compile } from "@typespec/compiler";
import { buildSemanticIr } from "./ir.mjs";

/**
 * Compile a TypeSpec entrypoint and return its semantic IR.
 *
 * Rejects with the compiler's diagnostics rather than returning a partial
 * document, so a caller can never mistake a failed compile for an empty package
 * (FR-041-AC-3).
 */
export async function compileSemanticIr(options) {
	const { entrypoint, generator, baseDir = process.cwd() } = options;
	const program = await compile(NodeHost, entrypoint, { noEmit: true });
	const errors = program.diagnostics.filter(
		(diagnostic) => diagnostic.severity === "error",
	);
	if (errors.length > 0) {
		throw new Error(
			`TypeSpec compilation failed for ${entrypoint}:\n${errors
				.map((diagnostic) => {
					const target = diagnostic.target;
					const file = target?.file?.path ?? "unknown";
					return `${file}: ${diagnostic.code}: ${diagnostic.message}`;
				})
				.join("\n")}`,
		);
	}
	return buildSemanticIr(program, { generator, baseDir });
}
