import "@typespec/json-schema";

using TypeSpec.JsonSchema;

/**
 * Semantic-core L3 declaration grammar and kernel scalar library.
 *
 * Issue agent-ix/filament-core-data#35 (FR-031..034). Every Quire object module
 * imports this namespace; it declares what a field, type reference, constraint,
 * relation, operation, clause reference, and enum value *is*, and the closed set
 * of kernel scalars a declaration may bottom out in. It declares no domain
 * vocabulary (NFR-014). Cross-property rules that JSON Schema cannot express
 * are enforced by the semantic-core reader (FR-031, "Grammar rules the reader
 * enforces").
 */
@jsonSchema("https://schemas.agent-ix.org/semantic-core/0.1.0/")
namespace AgentIx.Semantic.Core;

// ---------------------------------------------------------------------------
// Support scalars (patterns aligned with the IR common.schema.json)
// ---------------------------------------------------------------------------

/** A declaration name: letters, digits, underscore; no leading digit. */
@pattern("^[A-Za-z_][A-Za-z0-9_]*$")
scalar Identifier extends string;

/** A stable semantic identity, same pattern as the IR `semanticIdentity`. */
@pattern("^ix://[a-z0-9][a-z0-9._-]*/[A-Za-z0-9][A-Za-z0-9._~:/-]*$")
scalar SemanticId extends string;

/** UCUM case-sensitive symbol charset: printable ASCII, no whitespace. Membership is a consumer concern (FR-034-AC-4). */
@pattern("^[!-~]+$")
scalar UnitSymbol extends string;

/** `ocl`, `sysml`, `fretish`, or a namespaced `<ns>:<name>` language (FR-028). */
@pattern("^(ocl|sysml|fretish|[a-z0-9][a-z0-9.-]*:[A-Za-z0-9][A-Za-z0-9._-]*)$")
scalar ClauseLanguage extends string;

// ---------------------------------------------------------------------------
// Closed vocabularies
// ---------------------------------------------------------------------------

/** Kernel scalar library (FR-032); representations in kernel-scalars.json. */
enum KernelScalar {
  UUID,
  Boolean,
  Integer,
  Decimal,
  String,
  Timestamp,
  Duration,
  Bytes,
  JsonObject,
}

/** FR-040 edge categories; equal to the IR `relationship.category` set. */
enum EdgeCategory {
  structural,
  behavioral,
  dataflow,
  dependency,
  realization,
  governance,
  traceability,
}

/** FR-029 closed keyword set; equal to the IR `constraint.keyword` set. */
enum ConstraintKeyword {
  min,
  max,
  exclusiveMin,
  exclusiveMax,
  pattern,
  minLength,
  maxLength,
  enumValues,
  nonEmpty,
  unique,
  format,
}

/** IR `defaultKind` minus `none` (an absent default lowers to `none`). */
enum DefaultKind {
  semantic,
  representation,
  migration,
}

// ---------------------------------------------------------------------------
// Grammar models
// ---------------------------------------------------------------------------

/** FR-027 multiplicity; absent `upper` is unbounded. Reader: upper >= lower; flags only on collections. */
model Multiplicity {
  @minValue(0) lower: int32;
  @minValue(0) upper?: int32;
  ordered?: boolean;
  unique?: boolean;
}

/** Precision and scale for a `Decimal` target (FR-032). */
model DecimalPolicy {
  @minValue(1) precision: int32;
  @minValue(0) scale: int32;
}

/** A reference to a kernel scalar or a semantic type. Reader: `decimal` iff target is Decimal; `unit` only on unit-allowed scalars. */
model TypeRef {
  target: SemanticId | KernelScalar;
  multiplicity?: Multiplicity;
  unit?: UnitSymbol;
  decimal?: DecimalPolicy;
}

/** A declared default; `value` shape is decided by the target scalar (FR-031-CON-2 exception). */
model DefaultDecl {
  kind: DefaultKind;
  value?: unknown;
}

/** Source span of a declaration or clause, same shape as the IR `sourceLocus`. */
model SourceLocus {
  sourceIdentity: SemanticId;
  @minLength(1) path: string;
  @minValue(1) startLine: int32;
  @minValue(1) startColumn: int32;
  @minValue(1) endLine?: int32;
  @minValue(1) endColumn?: int32;
}

/** `min`: number for numeric scalars, ISO 8601 string for temporal scalars. */
model MinConstraint {
  keyword: ConstraintKeyword.min;
  value: float64 | string;
}

model MaxConstraint {
  keyword: ConstraintKeyword.max;
  value: float64 | string;
}

model ExclusiveMinConstraint {
  keyword: ConstraintKeyword.exclusiveMin;
  value: float64 | string;
}

model ExclusiveMaxConstraint {
  keyword: ConstraintKeyword.exclusiveMax;
  value: float64 | string;
}

model PatternConstraint {
  keyword: ConstraintKeyword.pattern;
  @minLength(1) regex: string;
  dialect: "ecma-262";
}

model MinLengthConstraint {
  keyword: ConstraintKeyword.minLength;
  @minValue(0) value: int32;
}

model MaxLengthConstraint {
  keyword: ConstraintKeyword.maxLength;
  @minValue(0) value: int32;
}

model EnumValuesConstraint {
  keyword: ConstraintKeyword.enumValues;
  @minItems(1) values: (string | float64 | boolean)[];
}

model NonEmptyConstraint {
  keyword: ConstraintKeyword.nonEmpty;
}

model UniqueConstraint {
  keyword: ConstraintKeyword.unique;
}

model FormatConstraint {
  keyword: ConstraintKeyword.format;
  @pattern("^[a-z0-9][a-z0-9.-]*:[A-Za-z0-9][A-Za-z0-9._-]*$") name: string;
}

/** FR-029 constraint declaration, discriminated on `keyword`. */
union ConstraintDecl {
  MinConstraint,
  MaxConstraint,
  ExclusiveMinConstraint,
  ExclusiveMaxConstraint,
  PatternConstraint,
  MinLengthConstraint,
  MaxLengthConstraint,
  EnumValuesConstraint,
  NonEmptyConstraint,
  UniqueConstraint,
  FormatConstraint,
}

/** A field declaration (one typed Properties row). Reader: unique by name; identity only on 1..1 non-JsonObject. */
model FieldDecl {
  name: Identifier;
  type: TypeRef;
  identity?: boolean;
  nullable?: boolean;
  default?: DefaultDecl;
  doc?: string;
  constraints?: ConstraintDecl[];
}

/** A relationship declaration (FR-028). Absent multiplicity lowers to 0..1; absent composite to false. */
model RelationDecl {
  verb: Identifier;
  category: EdgeCategory;
  composite?: boolean;
  target: SemanticId;
  multiplicity?: Multiplicity;
}

/** A clause reference: language, id, and where the clause text lives. Text itself is never parsed here. */
model ClauseRef {
  language: ClauseLanguage;
  clauseId: Identifier;
  sourceSpan?: SourceLocus;
}

/** An operation declaration (FR-028). Reader: params unique by name; returns carries no unit. */
model OperationDecl {
  name: Identifier;
  params: FieldDecl[];
  returns?: TypeRef;
  pre?: ClauseRef[];
  post?: ClauseRef[];
}

/** An enum member declaration; lowers to an IR variant. */
model EnumValue {
  value: Identifier;
  doc?: string;
}
