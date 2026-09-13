/**
 * FR-136 — the Python backends' registration in the generation seam.
 * Test cases TC-1530..TC-1536 of `spec/tests.md`.
 *
 * The generator itself is not under test here; `tests/` covers what it emits
 * and the conformance corpus covers what its types accept. What is under test
 * is that the documented entry point reaches it, that reaching it changes
 * nothing, and that every way of not reaching it is a refusal rather than an
 * empty package.
 *
 * Two cases carry the weight. TC-1535 asserts that the documents handed to the
 * generator are the `json-schema` target's own, under its own names — the
 * emitted documents `$ref` one another by relative file name, so a rename in
 * transit breaks every reference that resolved before it, and would do so
 * silently. TC-1534 drives the failure arm through a substituted command rather
 * than a stub, so the refusal under test is the one a broken environment
 * actually produces.
 *
 * TC-1531 and TC-1532 run the real generator, which is a child process and
 * costs seconds rather than milliseconds. That is the price of testing the
 * registration rather than a description of it.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { jsonSchemaBackend } from "../src/compiler/backends/json-schema-v1/index.mjs";
import {
	identity as pythonIdentity,
	pythonDataclassBackend,
	pythonPydanticBackend,
} from "../src/compiler/backends/python-v1/index.mjs";
import { poetryProducer } from "../src/compiler/backends/python-v1/produce.mjs";
import { generateTarget, selectBackend } from "../src/compiler/backends/seam.mjs";
import { createHost } from "../src/compiler/host.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (path: string) =>
	JSON.parse(readFileSync(resolve(root, path), "utf8"));

type Manifest = {
	state: string;
	backend: string;
	files: { path: string; digest: string; mediaType: string }[];
	diagnostics: { code: string; message: string; blocking?: boolean }[];
};

/** A generation request over a real lifted document. */
function pythonRequest(backend: { identity: string; version: string }) {
	return {
		contractVersion: "1.0.0",
		lockFingerprint: `sha256:${"a".repeat(64)}`,
		ir: readJson(
			"crates/extraction-frontend/fixtures/config-version-table/expected/semantic-ir.json",
		),
		profile: readJson("fixtures/semantic/v1/positive/profile.json"),
		mappings: [],
		backend: {
			identity: backend.identity,
			version: backend.version,
			supportedIrVersions: [...pythonPydanticBackend.supportedIrVersions],
			supportedFeatures: [...pythonPydanticBackend.supportedFeatures],
			options: {},
		},
		outputRoot: "generated/python",
		limits: {
			maxInputBytes: 33554432,
			maxDepth: 256,
			maxNodes: 1000000,
			maxCollectionItems: 100000,
			maxDiagnostics: 1000,
		},
	};
}

const host = () => createHost({ readRoots: [root] });

describe("TC-1530..1536 the Python backends reached through the seam (FR-136)", () => {
	/** Traces: TC-1530; FR-136-AC-1. */
	it("registers both Python targets as implemented under one identity", () => {
		for (const target of ["python-pydantic-v2", "python-dataclass"]) {
			const entry = selectBackend(target);
			expect(entry.implemented, `${target} is not implemented`).toBe(true);
			expect(entry.backend.identity).toBe(pythonIdentity);
			expect(entry.backend.target).toBe(target);
		}
		expect(pythonPydanticBackend.profileId).toBe("pydantic_v2_basemodel");
		expect(pythonDataclassBackend.profileId).toBe("pydantic_v2_dataclass");
		console.log(
			`TC-1530 measured: both Python targets implemented under ${pythonIdentity}`,
		);
	});

	/** Traces: TC-1531; FR-136-AC-2. */
	it("generates a package for the python-pydantic-v2 target", () => {
		const manifest = generateTarget(pythonRequest(pythonPydanticBackend), {
			target: "python-pydantic-v2",
			host: host(),
			produce: poetryProducer(),
		}) as never as Manifest;

		expect(manifest.state).toBe("success");
		expect(manifest.backend).toBe(pythonIdentity);
		expect(
			manifest.diagnostics.filter((d) => d.blocking === true),
		).toStrictEqual([]);
		const paths = manifest.files.map((f) => f.path);
		expect(paths).toContain("__init__.py");
		expect(paths.filter((p) => p.endsWith(".py")).length).toBeGreaterThan(1);
		console.log(
			`TC-1531 measured: python-pydantic-v2 state=${manifest.state} files=${manifest.files.length} blocking=0`,
		);
	}, 300000);

	/** Traces: TC-1532; FR-136-AC-3. */
	it("generates a package for the python-dataclass target under its own profile", () => {
		const manifest = generateTarget(pythonRequest(pythonDataclassBackend), {
			target: "python-dataclass",
			host: host(),
			produce: poetryProducer(),
		}) as never as Manifest;

		expect(manifest.state).toBe("success");
		expect(manifest.files.length).toBeGreaterThan(0);
		expect(pythonDataclassBackend.profileId).not.toBe(
			pythonPydanticBackend.profileId,
		);
		console.log(
			`TC-1532 measured: python-dataclass state=${manifest.state} files=${manifest.files.length} profile=${pythonDataclassBackend.profileId}`,
		);
	}, 300000);

	/**
	 * Traces: TC-1533; FR-136-AC-4.
	 *
	 * An empty file set would be a package: a consumer would import it and find
	 * nothing, with no diagnostic to say why. So the missing producer is a
	 * refusal with zero files, not a generation that produced none.
	 */
	it("refuses rather than emitting an empty package when no producer is injected", () => {
		const manifest = generateTarget(pythonRequest(pythonPydanticBackend), {
			target: "python-pydantic-v2",
			host: host(),
		}) as never as Manifest;

		expect(manifest.state).toBe("unavailable");
		expect(manifest.files).toStrictEqual([]);
		const refusal = manifest.diagnostics.find((d) =>
			d.code.endsWith("BACKEND_CONTRACT_VIOLATION"),
		);
		expect(refusal?.message).toContain("producer");
		console.log(
			`TC-1533 measured: producerless request state=${manifest.state} code=${refusal?.code}`,
		);
	});

	/** Traces: TC-1534; FR-136-AC-5. */
	it("reports a producer that exits non-zero as a failed generation", () => {
		const manifest = generateTarget(pythonRequest(pythonPydanticBackend), {
			target: "python-pydantic-v2",
			host: host(),
			produce: poetryProducer({ command: ["false"] }),
		}) as never as Manifest;

		expect(manifest.state).toBe("invalid");
		expect(manifest.files).toStrictEqual([]);
		const refusal = manifest.diagnostics.find((d) =>
			d.code.endsWith("BACKEND_CONTRACT_VIOLATION"),
		);
		expect(refusal?.message).toContain("pydantic_v2_basemodel");
		console.log(
			`TC-1534 measured: failing producer state=${manifest.state} code=${refusal?.code}`,
		);
	});

	/**
	 * Traces: TC-1535; FR-136-CON-3, FR-136-AC-6.
	 *
	 * The comparison runs the `json-schema` backend's own entry point rather
	 * than a fixture this file wrote: a fixture the test authors cannot be
	 * evidence that the two agree.
	 */
	it("hands the generator the json-schema target's own documents and names", () => {
		const seen: Record<string, unknown>[] = [];
		const manifest = generateTarget(pythonRequest(pythonPydanticBackend), {
			target: "python-pydantic-v2",
			host: host(),
			produce: (documents: Record<string, unknown>) => {
				seen.push(documents);
				return { "__init__.py": "" };
			},
		}) as never as Manifest;
		expect(manifest.state).toBe("success");
		expect(seen.length).toBe(1);

		const lowered = jsonSchemaBackend.generate(
			pythonRequest(pythonPydanticBackend),
			{ host: host() },
		) as { state: string; files: { path: string; text: string }[] };
		expect(lowered.state).toBe("success");

		const expected = lowered.files.filter((f) => f.path !== "index.json");
		expect(expected.length).toBeGreaterThan(0);
		expect(Object.keys(seen[0]).sort()).toStrictEqual(
			expected.map((f) => f.path).sort(),
		);
		expect(Object.keys(seen[0])).not.toContain("index.json");
		for (const file of expected)
			expect(seen[0][file.path], `document differs at ${file.path}`).toStrictEqual(
				JSON.parse(file.text),
			);
		console.log(
			`TC-1535 measured: ${expected.length} documents handed to the producer under the lowering's own names`,
		);
	});

	/**
	 * Traces: TC-1536; FR-136-AC-7, FR-136-CON-2.
	 *
	 * The seam is imported by every generation path, so a process spawn in the
	 * module it imports for one backend would make the seam impure for all of
	 * them. This is why `produce.mjs` is its own module and is imported by the
	 * command line rather than by the backend.
	 */
	it("registers a backend module that names no file-system or process module", () => {
		const source = readFileSync(
			resolve(root, "src/compiler/backends/python-v1/index.mjs"),
			"utf8",
		);
		// Over the module's imports, not over its prose: the header explains why
		// the child process is absent, and a substring search would read that
		// explanation as the violation it documents.
		const imported = [
			...source.matchAll(/^import[^;]*?from\s+"([^"]+)";/gm),
		].map((match) => match[1]);
		expect(imported.length).toBeGreaterThan(0);
		expect(imported).not.toContain("node:fs");
		expect(imported).not.toContain("node:child_process");
		expect(
			imported.filter((name) => name.includes("fs") || name.includes("child")),
		).toStrictEqual([]);
		console.log(
			"TC-1536 measured: python-v1/index.mjs names no file-system and no child-process module",
		);
	});
});
