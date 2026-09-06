#!/usr/bin/env node
/** FR-034 reference-fixture authoring only; not a production extraction frontend. */
import { execFileSync } from "node:child_process";
import { lstatSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = realpathSync(
	resolve(dirname(fileURLToPath(import.meta.url)), ".."),
);
const targetPath =
	"fixtures/semantic-core/positive/config-version-lowered.json";
const target = join(root, targetPath);
const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && args[0] !== "--write")) {
	process.stderr.write(
		"usage: node scripts/write-semantic-core-lowered.mjs [--write]\n",
	);
	process.exit(2);
}

try {
	if (
		args[0] === "--write" &&
		(realpathSync(target) !== target || !lstatSync(target).isFile())
	) {
		throw new Error(
			`refusing redirected or non-file authoring target: ${targetPath}`,
		);
	}
	if (args[0] === "--write" && lstatSync(target).nlink > 1) {
		throw new Error(`refusing hardlinked authoring target: ${targetPath}`);
	}
	// Execute the same reference lowerer as the tests; transpilation introduces
	// no second lowering recipe, fixture expectation, or generated source file.
	const compiled = ts.transpileModule(
		readFileSync(join(root, "test/semantic-core-lowerer.ts"), "utf8"),
		{
			fileName: "semantic-core-lowerer.ts",
			reportDiagnostics: true,
			compilerOptions: {
				target: ts.ScriptTarget.ES2022,
				module: ts.ModuleKind.ESNext,
			},
		},
	);
	const errors =
		compiled.diagnostics?.filter(
			(entry) => entry.category === ts.DiagnosticCategory.Error,
		) ?? [];
	if (errors.length > 0)
		throw new Error(
			errors
				.map((entry) =>
					ts.flattenDiagnosticMessageText(entry.messageText, "\n"),
				)
				.join("\n"),
		);
	const { lower } = await import(
		`data:text/javascript;base64,${Buffer.from(compiled.outputText).toString("base64")}`
	);
	const input = readFileSync(
		join(
			root,
			"fixtures/semantic-core/positive/config-version-field-decls.json",
		),
		"utf8",
	);
	const rendered = execFileSync(
		join(root, "node_modules/.bin/biome"),
		["format", "--stdin-file-path", targetPath],
		{
			cwd: root,
			encoding: "utf8",
			input: `${JSON.stringify(lower(JSON.parse(input), input), null, "\t")}\n`,
		},
	);
	if (args[0] === "--write") {
		writeFileSync(target, rendered);
		process.stdout.write(`wrote ${targetPath}\n`);
	} else process.stdout.write(rendered);
} catch (error) {
	process.stderr.write(
		`${error instanceof Error ? error.message : String(error)}\n`,
	);
	process.exitCode = 1;
}
