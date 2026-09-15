#!/usr/bin/env node
/** Execute the independent TypeScript kernel consumer (FR-089). */

import {
	cpSync,
	existsSync,
	mkdtempSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EXAMPLE = join(ROOT, "packages/semantic-kernel/examples/typescript");
const PACKAGE = join(ROOT, "packages/semantic-kernel/typescript");
const NAME = "@agent-ix/semantic-agent-ix__semantic-kernel";
const TSC = join(ROOT, "node_modules/.bin/tsc");
const GOLDEN = join(ROOT, "packages/semantic-kernel/parity/golden/PAR-0001.json");
const CONSTRAINT_GOLDEN = join(ROOT, "packages/semantic-kernel/parity/golden/PAR-0027.json");
const CLOSURES = join(ROOT, "packages/semantic-kernel/examples/closures.json");

function run(command, args, options) {
	try {
		return execFileSync(command, args, { encoding: "utf8", ...options });
	} catch (error) {
		const output = `${error.stdout ?? ""}${error.stderr ?? ""}`;
		throw new Error(
			`${command} ${args.join(" ")} failed: ${error.message ?? "unknown error"}\n${output}`,
		);
	}
}

function recordClosure(packages) {
	const current = existsSync(CLOSURES)
		? JSON.parse(readFileSync(CLOSURES, "utf8"))
		: { $comment: "FR-089. Written by the consumer execution harnesses." };
	current.typescript = { packages };
	writeFileSync(CLOSURES, `${JSON.stringify(current, null, "\t")}\n`);
}

const scratch = mkdtempSync(join(tmpdir(), "fcd-kernel-ts-consumer-"));
try {
	const packageRoot = join(scratch, "node_modules", ...NAME.split("/"));
	const app = join(scratch, "app");
	mkdirSync(packageRoot, { recursive: true });
	mkdirSync(join(app, "node_modules", "@agent-ix"), { recursive: true });
	cpSync(PACKAGE, packageRoot, { recursive: true });
	cpSync(EXAMPLE, app, {
		recursive: true,
		filter: (path) => !path.includes("node_modules"),
	});
	if (
		readFileSync(join(app, "PAR-0001.json"), "utf8") !==
		readFileSync(GOLDEN, "utf8")
	) {
		throw new Error("the TypeScript consumer fixture diverged from golden PAR-0001");
	}
	if (
		readFileSync(join(app, "PAR-0027.json"), "utf8") !==
		readFileSync(CONSTRAINT_GOLDEN, "utf8")
	) {
		throw new Error("the TypeScript consumer fixture diverged from golden PAR-0027");
	}

	// Keep the published type entry intact for the type check, then add the JS
	// runtime entry a compiler would produce. Node never strips files inside
	// node_modules, so executing the source `.ts` package directly would test a
	// Node limitation rather than the consumer or its public surface.
	const manifestPath = join(packageRoot, "package.json");
	const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
	for (const entry of Object.values(manifest.exports)) {
		entry.default = entry.default.replace(/\.ts$/, ".js");
	}
	writeFileSync(manifestPath, `${JSON.stringify(manifest, null, "\t")}\n`);

	run(TSC, ["--outDir", packageRoot, "--module", "NodeNext", "--moduleResolution", "NodeNext", "--target", "ES2022", "--declaration", "false", "--skipLibCheck", "true", "errors.ts", "identity.ts", "index.ts", "provenance.ts", "types.ts", "validators.ts"], { cwd: packageRoot });
	cpSync(packageRoot, join(app, "node_modules", ...NAME.split("/")), {
		recursive: true,
	});
	run(TSC, ["--outDir", join(app, "dist"), "--module", "NodeNext", "--moduleResolution", "NodeNext", "--target", "ES2022", "--strict", "true", "--resolveJsonModule", "true", "consumer.ts"], { cwd: app });
	cpSync(join(app, "PAR-0001.json"), join(app, "dist", "PAR-0001.json"));
	cpSync(join(app, "PAR-0027.json"), join(app, "dist", "PAR-0027.json"));
	writeFileSync(
		join(app, "dist", "run.mjs"),
		'import { run } from "./consumer.js";\nconst assertions = run();\nif (assertions === 0) throw new Error("zero assertions");\nconsole.log(`kernel TypeScript consumer: ${assertions} assertions`);\n',
	);
	process.stdout.write(run("node", [join(app, "dist", "run.mjs")], { cwd: app }));
	recordClosure([{ name: NAME, version: manifest.version }]);
} finally {
	rmSync(scratch, { recursive: true, force: true });
}
