import "./lib.mjs";

/**
 * The Agent IX semantic decorator vocabulary (FR-053).
 *
 * These fifteen decorators carry the semantics TypeSpec's own type system cannot
 * express: what a declaration *means* (roles, relationships, operations, formal
 * clauses), how a field is bounded (multiplicity, collection flags, units), and
 * what a package chooses to say beyond the closed vocabulary (extensions).
 *
 * The library is never imported by a compiled package. The frontend supplies its
 * absolute path through the TypeSpec compiler's `additionalImports`, so a
 * package's own sources name no path outside their package root — which is what
 * lets the compiler refuse every other JavaScript module outright.
 */
namespace AgentIx.Semantic.Decorators;

/**
 * A namespaced role this declaration plays, such as `agent-ix:entity`.
 * Repeatable. Structural kind is orthogonal to role: one record may be an
 * entity and a report at once.
 */
extern dec role(target: unknown, name: valueof string);

/** `preserve`, `reject`, or `surface`; the default is `reject`. */
extern dec unknownPolicy(target: unknown, policy: valueof string);

/** A UCUM case-sensitive symbol. Membership is a consumer concern; the charset is checked here. */
extern dec unit(target: TypeSpec.Reflection.ModelProperty, symbol: valueof string);

/** Explicit bounds, replacing the bounds derived from the property's type and optionality. */
extern dec multiplicity(
  target: TypeSpec.Reflection.ModelProperty,
  lower: valueof int32,
  upper?: valueof int32
);

/** `ordered` and `unique` flags for a collection-typed property. */
extern dec collection(
  target: TypeSpec.Reflection.ModelProperty,
  ordered: valueof boolean,
  unique: valueof boolean
);

/** `semantic`, `representation`, or `migration`, for a property that declares a default. */
extern dec defaultKind(
  target: TypeSpec.Reflection.ModelProperty,
  kind: valueof string
);

/** Marks a field as part of its record's identity; lowers to the semantic-core `identity` extension. */
extern dec identityField(target: TypeSpec.Reflection.ModelProperty);

/** Precision and scale for a decimal-valued field; lowers to the semantic-core `decimal` extension. */
extern dec decimal(
  target: TypeSpec.Reflection.ModelProperty,
  precision: valueof int32,
  scale: valueof int32
);

/** One typed edge out of a record. Repeatable. */
extern dec relationship(
  target: TypeSpec.Reflection.Model,
  verb: valueof string,
  category: valueof string,
  targetIdentity: valueof string,
  lower?: valueof int32,
  upper?: valueof int32,
  composite?: valueof boolean
);

/** Binds an interface's operations to the record they belong to. */
extern dec operations(
  target: TypeSpec.Reflection.Interface,
  owner: valueof string
);

/** A precondition clause id on an operation. Repeatable. */
extern dec pre(target: TypeSpec.Reflection.Operation, clauseId: valueof string);

/** A postcondition clause id on an operation. Repeatable. */
extern dec post(target: TypeSpec.Reflection.Operation, clauseId: valueof string);

/** One formal clause. The text is opaque and is never parsed. Repeatable. */
extern dec clause(
  target: unknown,
  language: valueof string,
  clauseId: valueof string,
  text: valueof string
);

/** Declares an empty model to be a reference to an identity in another package. */
extern dec semanticReference(
  target: TypeSpec.Reflection.Model,
  targetIdentity: valueof string
);

/** An extension node the closed vocabulary does not name. Repeatable. `payloadJson` is parsed as JSON. */
extern dec semanticExtension(
  target: unknown,
  identity: valueof string,
  version: valueof string,
  required: valueof boolean,
  payloadJson: valueof string
);
