/**
 * The degradation scan (NFR-022, FR-058-AC-5, FR-062-AC-10).
 *
 * A *degraded* declaration is one whose emitted Rust type is not the type the
 * mapping table states for the row the declaration selected — a `String` where
 * the table says `Uuid`, a bare `T` where it says `Option<T>`. The scan reads
 * the expectation from `mapping-table.json` and the observation from the mapped
 * model, and it compares the two. It does not read the expectation from the
 * emitter, which is what makes it capable of failing: a scan whose expectation
 * came from the code under test agrees with every mutation of that code, and a
 * scan that cannot fail is not evidence (FR-062 "the negative control").
 *
 * Pure: the model and the table are arguments.
 */

import { byCodePoint } from "./mapping.mjs";

/** Scalar forms the table names that the crate materializes under `support`. */
const SUPPORT_TYPES = Object.freeze([
	"Date",
	"DateTime",
	"Duration",
	"SemanticValue",
	"Uuid",
]);

/** The Rust type the table states for a scalar row. */
export function expectedScalarType(rustForm) {
	if (rustForm === null) return null;
	return SUPPORT_TYPES.includes(rustForm)
		? `crate::support::${rustForm}`
		: rustForm;
}

/**
 * The Rust member type the table states for a field row, given the element
 * type the member's `typeRef` mapped to.
 *
 * `Nullable` is the crate's own, so the table's short spelling is expanded to
 * the path the emitter must use; `T` is the element.
 */
export function expectedMemberType(rustForm, element) {
	return rustForm
		.replaceAll("Nullable", "crate::support::Nullable")
		.replace(/\bT\b/, element);
}

/**
 * Scans one mapped model against the mapping table.
 *
 * Returns the degraded declarations, each naming the declaration, the row it
 * selected, the type the table states and the type the model carries. An empty
 * array is a clean scan.
 */
export function scanDegradation(model, table) {
	const byRow = new Map(table.rows.map((row) => [row.rowKey, row]));
	const degraded = [];
	const report = (declaration, rowKey, expected, observed) => {
		degraded.push({ declaration, row: rowKey, expected, observed });
	};

	for (const type of model.types) {
		if (type.kind === "scalar") {
			const row = byRow.get(`scalar:${type.scalar}`);
			if (row === undefined) {
				report(type.identity, `scalar:${type.scalar}`, "a mapping row", "none");
				continue;
			}
			const expected = expectedScalarType(row.rustForm);
			if (type.inner !== expected) {
				report(type.identity, row.rowKey, expected, type.inner);
			}
		}
		for (const field of type.fields ?? []) {
			const row = byRow.get(field.row);
			if (row === undefined) {
				report(field.identity, String(field.row), "a mapping row", "none");
				continue;
			}
			const expected = expectedMemberType(row.rustForm, field.element);
			if (field.rustType !== expected) {
				report(field.identity, row.rowKey, expected, field.rustType);
			}
		}
	}

	degraded.sort((left, right) =>
		byCodePoint(left.declaration, right.declaration),
	);
	return degraded;
}

/** One line per degraded declaration, for a gate's failure output. */
export function describeDegradation(degraded) {
	return degraded.map(
		(one) =>
			`${one.declaration} selected the row \`${one.row}\`, which states ${one.expected}, and carries ${one.observed}`,
	);
}
