/**
 * A type of the alias construct shape renders as the core alias kind in every
 * backend: a named type that is transparent over its target (FR-142).
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { jsonSchemaBackend } from "../src/compiler/backends/json-schema-v1/index.mjs";
import { typescriptBackend } from "../src/compiler/backends/typescript-v1/index.mjs";
import { createHost } from "../src/compiler/host.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const document = () =>
	JSON.parse(
		readFileSync(
			resolve(root, "fixtures/semantic/v1/reader-contract/k2-boundary.json"),
			"utf8",
		),
	);
const generate = (backend: typeof typescriptBackend) =>
	backend.generate(
		{ ir: document() } as never,
		{ host: createHost({ readRoots: [root] }) } as never,
	) as unknown as {
		state: string;
		files: { path: string; text: string }[];
		diagnostics: { code: string; blocking: boolean }[];
	};

describe("construct-shaped aliases in the Node backends", () => {
	/** Trace: FR-142-AC-15 */
	it("renders an alias construct as an alias in the TypeScript backend", () => {
		const result = generate(typescriptBackend);
		expect(result.diagnostics.filter((one) => one.blocking)).toEqual([]);
		expect(result.state).toBe("success");
		const types = result.files.find((file) => file.path.endsWith("types.ts"));
		expect(types?.text).toMatch(/export type Instant = /);
		expect(types?.text).toMatch(/export type InstantAlias = /);
	});

	/** Trace: FR-142-AC-15 */
	it("renders an alias construct as a transparent schema in the JSON Schema backend", () => {
		const result = generate(jsonSchemaBackend as never);
		expect(result.diagnostics.filter((one) => one.blocking)).toEqual([]);
		expect(result.state).toBe("success");
		const alias = result.files.find(
			(file) => file.path === "InstantAlias.json",
		);
		expect(JSON.parse(alias?.text ?? "{}").allOf).toEqual([
			{ $ref: "./Instant.json" },
		]);
	});

	/** Trace: FR-100-AC-15 */
	it("renders an alias of a document scalar inline, carrying the constraints of the chain", () => {
		const ir = JSON.parse(
			readFileSync(
				resolve(
					root,
					"fixtures/semantic/v1/positive/semantic-ir-v2-constructs.json",
				),
				"utf8",
			),
		);
		const byName = (name: string) =>
			ir.types.find((one: { displayName: string }) => one.displayName === name);
		// OrderNote (maxLength) becomes an alias of OrderLineKind (enumValues).
		byName("OrderNote").target = byName("OrderLineKind").identity;
		const result = jsonSchemaBackend.generate(
			{ ir } as never,
			{ host: createHost({ readRoots: [root] }) } as never,
		) as unknown as { state: string; files: { path: string; text: string }[] };
		expect(result.state).toBe("success");
		const schema = (name: string) =>
			JSON.parse(
				result.files.find((file) => file.path === `${name}.json`)?.text ?? "{}",
			);
		const kind = schema("OrderLineKind");
		expect(kind.type).toBe("string");
		expect(kind.enum).toEqual(["physical", "digital"]);
		expect(kind.allOf).toBeUndefined();
		const note = schema("OrderNote");
		expect(note.type).toBe("string");
		expect(note.enum).toEqual(["physical", "digital"]);
		expect(note.maxLength).toBeDefined();
		expect(note.allOf).toBeUndefined();
	});
});
