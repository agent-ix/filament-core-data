import { execFileSync } from "node:child_process";
import {
	mkdtempSync,
	readFileSync,
	readdirSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
	generateTarget,
	selectBackend,
} from "../src/compiler/backends/seam.mjs";
import { sysmlBackend } from "../src/compiler/backends/sysml-v2/index.mjs";
import { DEFAULT_LIMITS } from "../src/compiler/diagnostics.mjs";
import { createHost } from "../src/compiler/host.mjs";

const root = resolve(import.meta.dirname, "..");
const fixture = JSON.parse(
	readFileSync(
		resolve(root, "fixtures/semantic/v1/positive/config-version-v2.json"),
		"utf8",
	),
);

function numericDocument() {
	const scalar = structuredClone(
		fixture.types.find((type: { kind: string }) => type.kind === "scalar"),
	);
	const record = structuredClone(
		fixture.types.find(
			(type: { kind: string; fields?: unknown[] }) =>
				type.kind === "record" && (type.fields?.length ?? 0) > 0,
		),
	);
	const baseField = structuredClone(record.fields[0]);
	const types = ["integer", "decimal", "float32"].map((kind) => ({
		...structuredClone(scalar),
		identity: `${fixture.source.identity}/type/${kind}`,
		displayName: kind,
		scalar: kind,
		...(kind === "decimal" ? { decimal: { precision: 5, scale: 2 } } : {}),
	}));
	record.identity = `${fixture.source.identity}/type/NumericDocument`;
	record.displayName = "NumericDocument";
	record.fields = types.map((type) => ({
		...structuredClone(baseField),
		identity: `${record.identity}/${type.scalar}`,
		name: type.scalar,
		typeRef: type.identity,
	}));
	delete record.identityFields;
	return { ...structuredClone(fixture), types: [...types, record] };
}

describe("SysML v2 textual target", () => {
	/** Trace: FR-138-AC-7. */
	it("declares one-way generation with no filesystem reader in the backend", () => {
		expect(sysmlBackend.roundTrip).toBe("one-way");
		const source = readFileSync(
			resolve(root, "src/compiler/backends/sysml-v2/index.mjs"),
			"utf8",
		);
		expect(source).not.toMatch(/from ["']node:fs["']/);
		expect(source).not.toMatch(/readFileSync|readText/);
	});

	/** Trace: FR-138-AC-7. Analyze the shipped source tree for SysML input paths. */
	it("has no module that reads a SysML artifact", () => {
		const visit = (directory: string): string[] =>
			readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
				const path = resolve(directory, entry.name);
				return entry.isDirectory() ? visit(path) : [path];
			});
		const mentions = visit(resolve(root, "src"))
			.filter((path) => /\.(mjs|mts|js|ts|py|rs)$/.test(path))
			.filter((path) => readFileSync(path, "utf8").includes(".sysml"))
			.map((path) => path.slice(root.length + 1));
		expect(mentions).toEqual([
			"src/compiler/backends/sysml-v2/index.mjs",
			"src/compiler/diagnostics.mjs",
		]);
	});

	/** Trace: FR-138-AC-1, FR-138-AC-7, FR-144-AC-21. */
	it("writes the SysML file through the generate command", () => {
		const scratch = mkdtempSync(resolve(tmpdir(), "age-2232-sysml-"));
		try {
			const input = resolve(scratch, "numeric-ir.json");
			const output = resolve(scratch, "out");
			writeFileSync(input, JSON.stringify(numericDocument()));
			execFileSync(
				process.execPath,
				[
					resolve(root, "src/compiler/cli.mjs"),
					"generate",
					"--ir",
					input,
					"--target",
					"sysml-v2-textual",
					"--out-root",
					output,
				],
				{ cwd: root },
			);
			expect(readdirSync(output)).toContain("model.sysml");
			expect(readFileSync(resolve(output, "model.sysml"), "utf8")).toContain(
				"attribute decimal : ScalarValues::Real;",
			);
		} finally {
			rmSync(scratch, { recursive: true, force: true });
		}
	});

	/** Trace: FR-138-AC-1, FR-144-AC-21. */
	it("writes the numeric document and declares each Real policy or width loss", () => {
		const backend = selectBackend("sysml-v2-textual").backend;
		if (!backend) throw new Error("SysML target is unimplemented");
		const ir = numericDocument();
		const request = {
			contractVersion: "1.0.0",
			lockFingerprint: `sha256:${"a".repeat(64)}`,
			ir,
			profile: {
				contractVersion: "1.0.0",
				identity: "ix://agent-ix/filament-core-data/profile/sysml-v2-textual",
				version: "1.0.0",
				authority: "semantic-source",
				editDirection: "read-only",
				roundTrip: "one-way",
				unknownPolicy: "reject",
				allowedOmissions: [],
				enrichment: false,
				materializationLifetime: "durable",
			},
			mappings: [],
			backend: {
				identity: backend.identity,
				version: backend.version,
				supportedIrVersions: [...backend.supportedIrVersions],
				supportedFeatures: [...backend.supportedFeatures],
				options: {},
			},
			outputRoot: "generated/sysml-v2-textual",
			limits: { ...DEFAULT_LIMITS },
		};
		let emitted = "";
		const result = generateTarget(request, {
			target: "sysml-v2-textual",
			host: createHost({ readRoots: [root] }),
			format(text) {
				emitted = text;
				return text;
			},
		});
		expect(result.state).toBe("success");
		expect(result.files).toHaveLength(1);
		expect(result.files[0].path).toMatch(/\.sysml$/);
		expect(emitted).toContain("attribute integer : ScalarValues::Integer;");
		expect(emitted).toContain("attribute decimal : ScalarValues::Real;");
		expect(emitted).toContain("attribute float32 : ScalarValues::Real;");
		const losses = result.diagnostics.filter(
			(d) => d.code === "agent-ix.sysml-target.DECLARED_LOSS",
		);
		expect(losses).toHaveLength(2);
		expect(losses.every((d) => !d.blocking)).toBe(true);
		expect(losses.map((d) => d.message).join(" ")).toMatch(/decimal.*5.*2/);
		expect(losses.map((d) => d.message).join(" ")).toMatch(/float32.*32/);
	});

	/** Trace: FR-138-AC-2, FR-138-AC-4. */
	it("emits one top-level package with deterministic bytes", () => {
		const ir = numericDocument();
		const first = sysmlBackend.generate({ ir });
		const second = sysmlBackend.generate({ ir });
		expect(first).toEqual(second);
		expect(first.files).toHaveLength(1);
		expect(first.files[0].text.match(/^package /gm)).toHaveLength(1);
	});

	/** Trace: FR-138-AC-5, FR-138-AC-6. */
	it("refuses an unmapped source-located construct without a truncated file", () => {
		const ir = numericDocument();
		ir.types[0].kind = "sequence";
		const result = sysmlBackend.generate({ ir });
		expect(result.state).toBe("unsupported");
		expect(result.files).toEqual([]);
		expect(result.diagnostics).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: "agent-ix.sysml-target.UNSUPPORTED_CONSTRUCT",
					blocking: true,
					locus: ir.types[0].origin.source,
				}),
			]),
		);
	});
});
