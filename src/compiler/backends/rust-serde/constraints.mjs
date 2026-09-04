/**
 * Constraint lowering for the Rust/Serde backend (FR-057).
 *
 * The eleven keywords of FR-029 are lowered onto the subject the constraint's
 * `appliesTo` resolves to, and onto no other. Three conventions are stated here
 * rather than inherited, because Rust and serde each have a default that
 * differs from the one the contract needs:
 *
 * - Length counts **Unicode scalar values**, which is what the published
 *   schema's own `minLength` counts for a JSON string — not UTF-8 bytes, which
 *   is what `String::len` counts, and not UTF-16 code units, which is what the
 *   pattern matcher counts.
 * - Numeric equality for `enumValues` and `unique` is IEEE-754 equality
 *   extended so that `NaN` equals no value including itself and `-0.0` equals
 *   `0.0`. Rust's `PartialEq` for `f64` already decides exactly that, and the
 *   convention is named because `Ord`-based deduplication would decide the
 *   other one.
 * - A `date` or `datetime` bound is compared as a **normalized instant**, so
 *   `2019-12-31T23:00:00-05:00` orders after `2020-01-01T00:00:00Z`. The bound
 *   operand is normalized at generation time, so the generated crate compares
 *   two integers and never re-parses a literal.
 *
 * Two refusals are the load-bearing ones. A bound on a `duration` raises
 * `UNORDERED_SUBJECT`, because ISO 8601 durations are not totally ordered:
 * `P1M` and `P30D` have no contract-defined order, and any comparison this
 * backend picked would be a rule it invented. A constraint that is not
 * applicable to its resolved subject raises `CONSTRAINT_NOT_APPLICABLE` rather
 * than being dropped, because a silently dropped constraint is
 * indistinguishable in the generated source from a type that never carried one.
 *
 * Pure: no filesystem, clock, environment, or network access.
 */

import { applies, isKeyword } from "../../ir/applicability.mjs";
import { RUST_BACKEND_CODES, diagnostic, fragment } from "./diagnostics.mjs";
import {
	classifyPattern,
	lowerPattern,
	provedEntry,
	unsupportedConstruct,
} from "./patterns.mjs";

/**
 * The generated format registry.
 *
 * It is empty at this revision, and the emptiness is the declared position
 * rather than an omission. `format` takes a namespaced name and the only name
 * any published artifact carries is `agent-ix:plain-text`, whose checked
 * language no published artifact states: `common.schema.json` does not define
 * it, FR-029 says only that the name is namespaced, and no fixture pins a
 * rejected value. Registering a check for it would be this backend deciding a
 * cross-language validation rule that belongs to the constraint vocabulary,
 * exactly as choosing a wire form for `bytes` would. Every `format` operand
 * therefore raises `UNKNOWN_FORMAT` until a definition is published.
 */
export const FORMAT_REGISTRY = Object.freeze({});

/** The four bound keywords, which share one subject rule and one refusal. */
const BOUNDS = Object.freeze(["min", "max", "exclusiveMin", "exclusiveMax"]);

/** Subjects a bound keyword may name but this backend cannot order. */
const UNORDERED = Object.freeze(["duration"]);

/**
 * Lowers one type's constraints.
 *
 * `resolved` is the subject's structural kind and, for a scalar, its scalar
 * name, already resolved through any chain of aliases. Returns the checks the
 * emitter renders and the diagnostics the run must carry.
 */
export function lowerConstraints(definition, resolved, options = {}) {
	const checks = [];
	const diagnostics = [];
	const locus = definition.origin?.source;
	const raise = (entry, message) =>
		diagnostics.push(
			diagnostic(entry, { message, ...(locus ? { locus } : {}) }),
		);

	for (const constraint of definition.constraints ?? []) {
		const keyword = String(constraint.keyword);
		const identity = String(constraint.identity);

		if (!isKeyword(keyword)) {
			raise(
				RUST_BACKEND_CODES.UNSUPPORTED_CONSTRUCT,
				`the constraint ${fragment(identity)} names the keyword ${fragment(keyword)}, which is outside the closed eleven-keyword vocabulary`,
			);
			continue;
		}
		if (resolved === undefined) {
			raise(
				RUST_BACKEND_CODES.UNRESOLVED_TYPE_REF,
				`the constraint ${fragment(identity)} applies to ${fragment(constraint.appliesTo)}, which resolves to nothing`,
			);
			continue;
		}
		if (BOUNDS.includes(keyword) && UNORDERED.includes(resolved.scalar)) {
			raise(
				RUST_BACKEND_CODES.UNORDERED_SUBJECT,
				`the constraint ${fragment(identity)} bounds a ${resolved.scalar} subject, and the contract states no order over it`,
			);
			continue;
		}
		if (!applies(keyword, resolved.kind, resolved.scalar)) {
			raise(
				RUST_BACKEND_CODES.CONSTRAINT_NOT_APPLICABLE,
				`the constraint ${fragment(identity)} names the keyword ${keyword}, which does not apply to a subject of kind ${resolved.kind}${resolved.scalar ? ` (${resolved.scalar})` : ""}`,
			);
			continue;
		}

		const lowered = lowerOne(
			constraint,
			keyword,
			identity,
			resolved,
			raise,
			options,
		);
		if (lowered !== undefined) checks.push(lowered);
	}
	return { checks, diagnostics };
}

function lowerOne(constraint, keyword, identity, resolved, raise, options) {
	const operands = constraint.operands ?? {};
	switch (keyword) {
		case "min":
		case "max":
		case "exclusiveMin":
		case "exclusiveMax":
			return lowerBound(constraint, keyword, identity, resolved, raise);
		case "minLength":
		case "maxLength": {
			const value = operands.value;
			if (!Number.isInteger(value) || value < 0) {
				raise(
					RUST_BACKEND_CODES.INVALID_OPERAND,
					`the constraint ${fragment(identity)} takes a non-negative integer length, not ${fragment(JSON.stringify(value))}`,
				);
				return undefined;
			}
			return { identity, keyword, form: "length", value };
		}
		case "pattern":
			return lowerPatternConstraint(constraint, identity, raise, options);
		case "enumValues":
			return lowerEnumValues(constraint, identity, resolved, raise);
		case "nonEmpty":
			return { identity, keyword, form: "nonEmpty", subject: resolved.kind };
		case "unique":
			return { identity, keyword, form: "unique" };
		case "format": {
			const name = String(operands.name);
			if (!Object.hasOwn(FORMAT_REGISTRY, name)) {
				raise(
					RUST_BACKEND_CODES.UNKNOWN_FORMAT,
					`the constraint ${fragment(identity)} names the format ${fragment(name)}, which the generated registry does not carry`,
				);
				return undefined;
			}
			return { identity, keyword, form: "format", name };
		}
		default:
			raise(
				RUST_BACKEND_CODES.UNSUPPORTED_CONSTRUCT,
				`the constraint ${fragment(identity)} selects no lowering row`,
			);
			return undefined;
	}
}

function lowerBound(constraint, keyword, identity, resolved, raise) {
	const value = constraint.operands?.value;
	const scalar = resolved.scalar;
	if (scalar === "integer" || scalar === "number") {
		if (typeof value !== "number" || !Number.isFinite(value)) {
			raise(
				RUST_BACKEND_CODES.INVALID_OPERAND,
				`the constraint ${fragment(identity)} bounds a ${scalar} subject with ${fragment(JSON.stringify(value))}, which is not a finite JSON number`,
			);
			return undefined;
		}
		if (scalar === "integer" && !Number.isInteger(value)) {
			raise(
				RUST_BACKEND_CODES.INVALID_OPERAND,
				`the constraint ${fragment(identity)} bounds an integer subject with the non-integer ${fragment(String(value))}`,
			);
			return undefined;
		}
		return { identity, keyword, form: "numeric", scalar, value };
	}
	if (typeof value !== "string") {
		raise(
			RUST_BACKEND_CODES.INVALID_OPERAND,
			`the constraint ${fragment(identity)} bounds a ${scalar} subject with ${fragment(JSON.stringify(value))}, which is not a JSON string`,
		);
		return undefined;
	}
	const instant =
		scalar === "date" ? dateInstant(value) : dateTimeInstant(value);
	if (instant === undefined) {
		raise(
			RUST_BACKEND_CODES.INVALID_OPERAND,
			`the constraint ${fragment(identity)} bounds a ${scalar} subject with ${fragment(value)}, which is not an RFC 3339 ${scalar}`,
		);
		return undefined;
	}
	return { identity, keyword, form: "instant", scalar, value, instant };
}

function lowerPatternConstraint(constraint, identity, raise, options) {
	const regex = String(constraint.operands?.regex ?? "");
	const classification = classifyPattern(regex);
	if (classification === "unsupported") {
		raise(
			RUST_BACKEND_CODES.UNSUPPORTED_PATTERN,
			`the constraint ${fragment(identity)} carries the pattern ${fragment(regex)}, which this backend cannot express: ${unsupportedConstruct(regex)}`,
		);
		return undefined;
	}
	if (classification === "proved") {
		const entry = provedEntry(regex);
		return {
			identity,
			keyword: "pattern",
			form: "proved",
			regex,
			validator: entry.validator,
		};
	}
	try {
		return {
			identity,
			keyword: "pattern",
			form: "matcher",
			regex,
			program: lowerPattern(regex),
			programName: options.programName?.(identity) ?? undefined,
		};
	} catch (error) {
		raise(
			RUST_BACKEND_CODES.UNSUPPORTED_PATTERN,
			`the constraint ${fragment(identity)} carries the pattern ${fragment(regex)}, which this backend cannot express: ${error.construct ?? error.message}`,
		);
		return undefined;
	}
}

function lowerEnumValues(constraint, identity, resolved, raise) {
	const values = constraint.operands?.values ?? [];
	const scalar = resolved.scalar;
	const admits = (value) => {
		switch (scalar) {
			case "boolean":
				return typeof value === "boolean";
			case "integer":
				return typeof value === "number" && Number.isInteger(value);
			case "number":
				return typeof value === "number" && Number.isFinite(value);
			default:
				return typeof value === "string";
		}
	};
	for (const value of values) {
		if (admits(value)) continue;
		raise(
			RUST_BACKEND_CODES.INVALID_OPERAND,
			`the constraint ${fragment(identity)} admits ${fragment(JSON.stringify(value))}, whose JSON type a ${scalar} subject does not admit`,
		);
		return undefined;
	}
	return {
		identity,
		keyword: "enumValues",
		form: "enumValues",
		scalar,
		values,
	};
}

/** Days from 1970-01-01 to a proleptic Gregorian date, Howard Hinnant's algorithm. */
export function daysFromCivil(year, month, day) {
	const y = year - (month <= 2 ? 1 : 0);
	const era = Math.floor(y / 400);
	const yoe = y - era * 400;
	const doy =
		Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1;
	const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
	return era * 146097 + doe - 719468;
}

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_TIME =
	/^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(?:[Zz]|([+-])(\d{2}):(\d{2}))$/;

function validCivil(year, month, day) {
	if (month < 1 || month > 12 || day < 1) return false;
	const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
	const lengths = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
	return day <= lengths[month - 1];
}

/** An RFC 3339 full-date as nanoseconds since the epoch, or `undefined`. */
export function dateInstant(text) {
	const match = DATE.exec(String(text));
	if (match === null) return undefined;
	const [, y, m, d] = match.map(Number);
	if (!validCivil(y, m, d)) return undefined;
	return BigInt(daysFromCivil(y, m, d)) * 86400000000000n;
}

/** An RFC 3339 date-time as nanoseconds since the epoch, or `undefined`. */
export function dateTimeInstant(text) {
	const match = DATE_TIME.exec(String(text));
	if (match === null) return undefined;
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const hour = Number(match[4]);
	const minute = Number(match[5]);
	const second = Number(match[6]);
	if (!validCivil(year, month, day)) return undefined;
	// A leap second is refused rather than folded onto :59. Folding would make
	// two distinct texts one instant and the ordering would stop being a
	// function of the value.
	if (hour > 23 || minute > 59 || second > 59) return undefined;
	const fraction = (match[7] ?? "").slice(0, 9).padEnd(9, "0");
	let nanos =
		BigInt(daysFromCivil(year, month, day)) * 86400000000000n +
		BigInt(hour) * 3600000000000n +
		BigInt(minute) * 60000000000n +
		BigInt(second) * 1000000000n +
		BigInt(fraction === "" ? 0 : Number(fraction));
	if (match[8] !== undefined) {
		const offsetHour = Number(match[9]);
		const offsetMinute = Number(match[10]);
		if (offsetHour > 23 || offsetMinute > 59) return undefined;
		const offset =
			(BigInt(offsetHour) * 3600n + BigInt(offsetMinute) * 60n) * 1000000000n;
		nanos = match[8] === "+" ? nanos - offset : nanos + offset;
	}
	return nanos;
}
