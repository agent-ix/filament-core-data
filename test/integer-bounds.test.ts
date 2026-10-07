import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { jsonSchemaBackend } from "../src/compiler/backends/json-schema-v1/index.mjs";
import { rustBackend } from "../src/compiler/backends/rust-serde/backend.mjs";
import { lowerConstraints } from "../src/compiler/backends/rust-serde/constraints.mjs";
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
		diagnostics: readonly {
			code: string;
			message: string;
			blocking: boolean;
		}[];
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
		expect(safe.diagnostics.filter((one) => one.blocking)).toEqual([]);
		expect(safe.state).toBe("success");
		expect(JSON.stringify(safe.files)).toContain("9007199254740991");
		const unsafe = generated(typescriptBackend, withBound("9007199254740993"));
		expect(unsafe.state).not.toBe("success");
		expect(unsafe.diagnostics.map((one) => one.code)).toContain(
			"agent-ix.typescript-backend.INTEGER_BOUND_NOT_EXACT",
		);
	});

	it("the JSON Schema backend emits a safe bound and refuses one past 2^53 (TC-1825)", () => {
		const safe = generated(
			jsonSchemaBackend as never,
			withBound("9007199254740991"),
		);
		expect(safe.diagnostics.filter((one) => one.blocking)).toEqual([]);
		expect(safe.state).toBe("success");
		expect(JSON.stringify(safe.files)).toContain("9007199254740991");
		const unsafe = generated(
			jsonSchemaBackend as never,
			withBound("9007199254740993"),
		);
		expect(unsafe.state).toBe("unsupported");
		expect(unsafe.diagnostics[0]?.message).toContain("9007199254740993");
	});

	it("the Rust backend emits an in-range string bound as the exact i64 literal and refuses one past i64 (TC-1825)", () => {
		const lowered = (value: string) =>
			(
				lowerConstraints as (
					definition: unknown,
					resolved: unknown,
				) => {
					checks: { value: unknown; form: string }[];
					diagnostics: { code: string }[];
				}
			)(
				{
					constraints: [
						{
							identity: "ix://acme/pkg/constraint/N-max",
							keyword: "max",
							appliesTo: "ix://acme/pkg/N",
							operands: { value },
						},
					],
				},
				{ kind: "scalar", scalar: "integer" },
			);
		// i64::MAX is kept as written, exact where a double would round it.
		const inRange = lowered("9223372036854775807");
		expect(inRange.diagnostics).toEqual([]);
		expect(inRange.checks[0]).toMatchObject({
			form: "numeric",
			value: "9223372036854775807",
		});
		// One past i64::MAX, and i64::MIN - 1, are refused.
		for (const value of ["9223372036854775808", "-9223372036854775809"]) {
			const refused = lowered(value);
			expect(refused.checks).toEqual([]);
			expect(refused.diagnostics.map((one) => one.code)).toEqual([
				"agent-ix.semantic-ir.INVALID_OPERAND",
			]);
		}
		// A non-canonical spelling is refused too.
		expect(lowered("0123").diagnostics).toHaveLength(1);

		// Through generation, the literal is the one the Rust source carries.
		const generated = rustBackend.generate(
			{
				contractVersion: "1.0.0",
				lockFingerprint: `sha256:${"a".repeat(64)}`,
				ir: withBound("9223372036854775807"),
				profile: JSON.parse(
					readFileSync(
						resolve(root, "fixtures/semantic/v1/positive/profile.json"),
						"utf8",
					),
				),
				mappings: [],
				backend: {
					identity: rustBackend.identity,
					version: rustBackend.version,
					supportedIrVersions: [...rustBackend.supportedIrVersions],
					supportedFeatures: [...rustBackend.supportedFeatures],
					options: {},
				},
				outputRoot: "generated/rust",
				limits: {
					maxInputBytes: 33554432,
					maxDepth: 256,
					maxNodes: 1000000,
					maxCollectionItems: 100000,
					maxDiagnostics: 1000,
				},
			} as never,
			{ host } as never,
		) as {
			files?: unknown;
			diagnostics: { code: string; blocking: boolean }[];
		};
		expect(generated.diagnostics.filter((one) => one.blocking)).toEqual([]);
		expect(JSON.stringify(generated.files)).toContain("9223372036854775807i64");
	});
});
