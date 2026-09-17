/**
 * The contract 1.2.0 object-type constructs and model members (FR-141, FR-142).
 *
 * The one Node list of construct kinds. The reader, and every backend that
 * refuses what it does not render, read it from here; the schema's `kind` enum
 * and the Rust and Python copies are held to it by a parity test.
 *
 * A leaf module: it imports nothing, so a backend may read it without reaching
 * the reader, the schema layer or the filesystem.
 */

/** One construct kind per business object type, in schema order. */
export const CONSTRUCT_KINDS = Object.freeze([
	"entity",
	"value_object",
	"nested_entity",
	"aggregate_root",
	"enumeration",
	"event",
	"state_machine",
	"process",
	"repository",
	"domain",
]);

/**
 * The construct kinds every backend renders (FR-054, FR-064, FR-079, FR-100):
 * an `entity` is a record-shaped type that also names its identity fields.
 * Every other construct kind stays refused by name until its rendering lands
 * (filament-core-data#147).
 */
export const RENDERED_CONSTRUCT_KINDS = Object.freeze(["entity"]);

/** Whether `kind` is rendered as a record-shaped type: a record or an entity. */
export function isRecordShaped(kind) {
	return kind === "record" || RENDERED_CONSTRUCT_KINDS.includes(kind);
}

/**
 * The names of an entity's identity fields, in `identityFields` order, or
 * `undefined` for a type that is not an entity. An identity field that names
 * no field of the type is dropped here; the readers refuse such a document
 * before any backend runs (FR-142).
 */
export function identityFieldNames(type) {
	if (type?.kind !== "entity") return undefined;
	const byIdentity = new Map(
		(Array.isArray(type.fields) ? type.fields : []).map((field) => [
			field?.identity,
			field?.name,
		]),
	);
	return (Array.isArray(type.identityFields) ? type.identityFields : [])
		.map((identity) => byIdentity.get(identity))
		.filter((name) => typeof name === "string");
}

/** The constructs that carry relationships and operations as a record does. */
export const EDGE_KINDS = Object.freeze([
	"record",
	...CONSTRUCT_KINDS.filter((kind) => kind !== "enumeration"),
]);

/**
 * Every contract 1.2.0 construct kind and model member no backend renders yet, with a pointer to
 * each occurrence in `ir`.
 *
 * `abstract: false`, an empty frame and empty lists carry no meaning a backend could drop, so
 * only a present `abstract: true` or a non-empty list is reported.
 */
export function unrenderedNodes(ir) {
	const found = [];
	const nonEmpty = (value) => Array.isArray(value) && value.length > 0;
	if (nonEmpty(ir?.populations))
		found.push({ pointer: "/populations", member: "populations" });
	(Array.isArray(ir?.types) ? ir.types : []).forEach((type, index) => {
		const at = `/types/${index}`;
		if (
			CONSTRUCT_KINDS.includes(type?.kind) &&
			!RENDERED_CONSTRUCT_KINDS.includes(type.kind)
		)
			found.push({ pointer: `${at}/kind`, member: `kind ${type.kind}` });
		if (nonEmpty(type?.supertypes))
			found.push({ pointer: `${at}/supertypes`, member: "supertypes" });
		if (type?.abstract === true)
			found.push({ pointer: `${at}/abstract`, member: "abstract" });
		(Array.isArray(type?.fields) ? type.fields : []).forEach((field, f) => {
			if (nonEmpty(field?.subsets))
				found.push({ pointer: `${at}/fields/${f}/subsets`, member: "subsets" });
			if (typeof field?.redefines === "string")
				found.push({
					pointer: `${at}/fields/${f}/redefines`,
					member: "redefines",
				});
		});
		(Array.isArray(type?.operations) ? type.operations : []).forEach(
			(operation, o) => {
				for (const member of ["frame", "requires", "ensures"]) {
					const value = operation?.[member];
					if (
						value !== undefined &&
						(member === "frame"
							? ["modifies", "creates", "deletes"].some((one) =>
									nonEmpty(value?.[one]),
								)
							: nonEmpty(value))
					)
						found.push({
							pointer: `${at}/operations/${o}/${member}`,
							member,
						});
				}
			},
		);
	});
	return found;
}
