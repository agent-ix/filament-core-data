import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { jsonSchemaBackend } from "../src/compiler/backends/json-schema-v1/index.mjs";
import { typescriptBackend } from "../src/compiler/backends/typescript-v1/index.mjs";
import { createHost } from "../src/compiler/host.mjs";
import { readContractIr } from "../src/compiler/ir/reader.mjs";

/**
 * FR-050-AC-14 (TC-1825): an integer bound is a JSON number or a canonical
 * decimal string. The Node reader and the oracle accept the canonical strings
 * and refuse the rest with INVALID_OPERAND; the TypeScript and JSON Schema
 * backends emit a bound they can hold exactly and refuse one past 2^53.
 */

type Loose = { [name: string]: (...args: unknown[]) => unknown };
const root = resolve(import.meta.dirname, "..");
const oracle = (await import(
	/* @vite-ignore */ resolve(root, "conformance/oracle/oracle.mjs")
)) as unknown as Loose;

type Ir = { types: { constraints?: { operands: { value: unknown } }[] }[] };
const document = JSON.parse(
	readFileSync(
		resolve(root, "fixtures/semantic/v1/positive/config-version-v2.json"),
		"utf8",
	),
) as Ir;

/** The positive document with its integer `VersionNumber` `min` set to `value`. */
function withBound(value: unknown): Ir {
	const copy = structuredClone(document);
	const constraint = copy.types[5]?.constraints?.[0];
	if (!constraint) throw new Error("the fixture's VersionNumber constraint");
	constraint.operands.value = value;
	return copy;
}

const readerCodes = (ir: Ir) =>
	[...(readContractIr(ir as never) as Iterable<{ code: string }>)].map(
		(one) => one.code,
	);

const oracleCodes = (ir: Ir) =>
	(
		oracle.verdict({ ir }, []) as {
			diagnostics: { diagnostic: { code: string } }[];
		}
	).diagnostics.map((one) => one.diagnostic.code);

const host = createHost({ readRoots: [root] });
const generated = (backend: typeof typescriptBackend, ir: Ir) =>
	backend.generate({ ir } as never, { host } as never) as {
		state: string;
		files: unknown;
		diagnostics: { code: string; message: string }[];
	};

const operand = "agent-ix.semantic-ir.INVALID_OPERAND";
const ACCEPTED = ["18446744073709551615", "-9223372036854775809", "0", 7];
const REFUSED = ["01", "+1", " 1", "1 ", "-0", "1.0", "007", "zero"];

describe("FR-050-AC-14 integer bounds as canonical decimal strings", () => {
	it("the reader accepts canonical strings and refuses the rest (TC-1825)", () => {
		for (const value of ACCEPTED) {
			expect(readerCodes(withBound(value)), String(value)).toEqual([]);
		}
		for (const value of REFUSED) {
			expect(readerCodes(withBound(value)), value).toContain(operand);
		}
	});

	it("the oracle accepts canonical strings and refuses the rest (TC-1825)", () => {
		for (const value of ACCEPTED) {
			expect(oracleCodes(withBound(value)), String(value)).toEqual([]);
		}
		for (const value of REFUSED) {
			expect(oracleCodes(withBound(value)), value).toContain(operand);
		}
	});

	it("the TypeScript backend emits a safe bound and refuses one past 2^53 (TC-1825)", () => {
		const safe = generated(typescriptBackend, withBound("9007199254740991"));
		expect(safe.state).toBe("generated");
		expect(JSON.stringify(safe.files)).toContain("9007199254740991");
		const unsafe = generated(typescriptBackend, withBound("9007199254740993"));
		expect(unsafe.state).not.toBe("generated");
		expect(unsafe.diagnostics.map((one) => one.code)).toContain(
			"agent-ix.typescript-backend.INTEGER_BOUND_NOT_EXACT",
		);
	});

	it("the JSON Schema backend emits a safe bound and refuses one past 2^53 (TC-1825)", () => {
		const safe = generated(
			jsonSchemaBackend as never,
			withBound("9007199254740991"),
		);
		expect(safe.state).toBe("generated");
		expect(JSON.stringify(safe.files)).toContain("9007199254740991");
		const unsafe = generated(
			jsonSchemaBackend as never,
			withBound("9007199254740993"),
		);
		expect(unsafe.state).toBe("unsupported");
		expect(unsafe.diagnostics[0]?.message).toContain("9007199254740993");
	});
});
