import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { expect, it } from "vitest";
import { emitCrate } from "../src/compiler/backends/rust-serde/crate.mjs";

const prefix = `ix:${"/"}${"/"}agent-ix/nonempty`;

const document = {
	contractVersion: "2.0.0",
	canonicalization: { algorithm: "rfc8785-v1" },
	source: {
		identity: `${prefix}/source/typespec`,
		version: "1.0.0",
		dialect: "typespec",
	},
	package: {
		identity: "agent-ix/nonempty",
		version: "1.0.0",
		mappingVersions: ["1.0.0"],
		profileVersions: ["1.0.0"],
	},
	types: [
		{
			identity: `${prefix}/type/Run`,
			displayName: "Run",
			kind: "record",
			roles: [],
			constraints: [],
			extensions: [],
			unknownPolicy: "reject",
			fields: [
				{
					identity: `${prefix}/Run/id`,
					name: "id",
					typeRef: `ix:${"/"}${"/"}filament/native/String`,
					multiplicity: { lower: 1, upper: 1 },
					presence: "required",
					nullable: false,
					constraints: [
						{
							identity: `${prefix}/constraint/Run-id-nonEmpty`,
							keyword: "nonEmpty",
							operands: {},
							appliesTo: `${prefix}/Run/id`,
						},
					],
				},
				{
					identity: `${prefix}/Run/group`,
					name: "group",
					typeRef: `ix:${"/"}${"/"}filament/native/String`,
					multiplicity: { lower: 0, upper: 1 },
					presence: "optional",
					nullable: false,
					constraints: [
						{
							identity: `${prefix}/constraint/Run-group-nonEmpty`,
							keyword: "nonEmpty",
							operands: {},
							appliesTo: `${prefix}/Run/group`,
						},
					],
				},
			],
		},
	],
	occurrences: [],
	extensions: [],
};

it("a nonEmpty check on a native-typed field is emitted without a stray borrow and compiles", () => {
	const result = emitCrate(
		{ ir: document, outputRoot: "generated/rust", limits: {} } as never,
		{ licenseText: "" },
	);
	expect(result.diagnostics.filter((entry) => entry.blocking)).toEqual([]);
	const source = [...result.files.entries()]
		.filter(([path]) => path.endsWith(".rs"))
		.map(([, text]) => text)
		.join("\n");
	expect(source).toContain("is_empty()");
	expect(source).not.toMatch(/if &\w+\.is_empty\(\)/);
	expect(source).not.toMatch(/\*\w+\.is_empty\(\)/);

	const directory = mkdtempSync(join(tmpdir(), "fcd-rust-nonempty-"));
	try {
		for (const [relative, text] of result.files) {
			const path = join(directory, relative);
			mkdirSync(dirname(path), { recursive: true });
			writeFileSync(path, text);
		}
		try {
			execFileSync("cargo", ["check", "--offline"], {
				cwd: directory,
				encoding: "utf8",
				stdio: "pipe",
			});
		} catch (error) {
			const failed = error as { stdout?: Buffer; stderr?: Buffer };
			throw new Error(
				`${failed.stdout?.toString() ?? ""}\n${failed.stderr?.toString() ?? String(error)}`,
			);
		}
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
}, 120000);
