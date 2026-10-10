/** FR-138-AC-3: emit kernel and domain packages for the pinned pilot. */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { sysmlBackend } from "../src/compiler/backends/sysml-v2/index.mjs";
import { createHost } from "../src/compiler/host.mjs";
import { schemaValidators } from "../src/compiler/schema-validate.mjs";

const root = resolve(import.meta.dirname, "..");
const seed = JSON.parse(
	readFileSync(
		resolve(root, "fixtures/semantic/v1/positive/config-version-v2.json"),
		"utf8",
	),
);
const scalarTable = JSON.parse(
	readFileSync(
		resolve(root, "packages/semantic-core/kernel-scalars.json"),
		"utf8",
	),
).scalars;
const kinds = ["Integer", "Decimal", "Float32"];
const baseScalar = seed.types.find((type) => type.kind === "scalar");
const baseRecord = seed.types.find(
	(type) => type.kind === "record" && type.fields.length > 0,
);
const baseField = baseRecord.fields[0];
const kernelOrigin = {
	source: {
		sourceIdentity: "ix://agent-ix/semantic-core/kernel-scalars",
		path: "packages/semantic-core/kernel-scalars.json",
		startLine: 1,
		startColumn: 1,
	},
};
const kernelTypes = kinds.map((name) => ({
	...structuredClone(baseScalar),
	identity: `ix://agent-ix/semantic-core/type/${name}`,
	displayName: name,
	scalar: scalarTable[name].irScalar,
	origin: kernelOrigin,
	...(name === "Decimal" ? { decimal: { precision: 5, scale: 2 } } : {}),
}));
const kernelRecord = {
	...structuredClone(baseRecord),
	identity: "ix://agent-ix/semantic-core/type/ScalarProjection",
	displayName: "ScalarProjection",
	origin: kernelOrigin,
	fields: kernelTypes.map((type) => ({
		...structuredClone(baseField),
		identity: `ix://agent-ix/semantic-core/field/${type.displayName}`,
		name: type.displayName.toLowerCase(),
		typeRef: type.identity,
		origin: kernelOrigin,
	})),
};
delete kernelRecord.identityFields;
const kernel = {
	...seed,
	package: { ...seed.package, identity: "agent-ix/semantic-core" },
	source: {
		...seed.source,
		identity: "ix://agent-ix/semantic-core/kernel-scalars",
	},
	types: [...kernelTypes, kernelRecord],
};
const domainPath =
	"fixtures/semantic/v1/positive/sysml-config-domain-bundle.json";
const domain = JSON.parse(readFileSync(resolve(root, domainPath), "utf8"));
const validators = schemaValidators(createHost({ readRoots: [root] }), root);
const scratch = mkdtempSync(join(tmpdir(), "sysml-pilot-check-"));
try {
	const paths = [];
	for (const [name, ir] of [
		["kernel", kernel],
		["config-domain", domain],
	]) {
		const errors = validators.errors("semantic-ir.schema.json", ir);
		if (errors.length > 0) {
			throw new Error(
				`${name} is not an accepted semantic IR document: ${JSON.stringify(errors)}`,
			);
		}
		const result = sysmlBackend.generate({ ir });
		if (result.state !== "success" || result.files.length === 0) {
			throw new Error(
				`${name} projection refused: ${JSON.stringify(result.diagnostics)}`,
			);
		}
		for (const [index, file] of result.files.entries()) {
			const path = join(scratch, `${name}-${index}.sysml`);
			writeFileSync(path, file.text);
			paths.push(path);
		}
	}
	const python = process.env.SYSML_PILOT_PYTHON ?? "poetry";
	const args = process.env.SYSML_PILOT_PYTHON
		? [resolve(root, "scripts/check-sysml-pilot.py"), ...paths]
		: [
				"run",
				"python",
				resolve(root, "scripts/check-sysml-pilot.py"),
				...paths,
			];
	const check = spawnSync(python, args, {
		cwd: root,
		stdio: "inherit",
		env: process.env,
	});
	if (check.error) throw check.error;
	if (check.status !== 0) process.exitCode = check.status ?? 1;
} finally {
	rmSync(scratch, { recursive: true, force: true });
}
