// The compiler-core fixture package (FR-046, FR-053).
//
// One declaration per row of the structural-kind table, so the table is
// exercised by a package rather than by a unit test's idea of one. Nothing here
// imports the decorator library: the frontend injects it by absolute path, which
// is what lets the compiler refuse every other JavaScript module outright.
using AgentIx.Semantic.Decorators;

namespace AgentIx.Semantic;

/** Row 3: a scalar over a built-in, carrying type-level constraints. */
@minLength(1)
@maxLength(4096)
@pattern("^[^\\u0000]*$")
@format("agent-ix:plain-text")
scalar Text extends string;

/** Row 3 again, over a numeric built-in. */
@minValue(0)
@maxValue(86400)
scalar Seconds extends float64;

/** Row 2: a scalar over a package scalar is an alias, not a second scalar. */
scalar ArtifactId extends Text;

/** Row 4: an integer indexer is a sequence. */
model TagList is Array<Text>;

/** Row 5: a string indexer is a map. */
model Attributes is Record<Text>;

/** Row 7. */
enum Status {
  draft,
  review,
  final,
}

/** Row 8. */
union Payload {
  text: Text,
  id: ArtifactId,
}

/** Row 1: an empty model referring to a declaration in this package. */
@semanticReference("ix://agent-ix/assurance/type/Actor")
model ActorRef {}

/** GAP-011: a reference's target must actually be declared. */
model Actor {
  id: ArtifactId;
}

/** A record whose name says nothing about its role; @role does. */
@role("agent-ix:entity")
@role("agent-ix:report")
@unknownPolicy("preserve")
@relationship("belongs_to", "structural", "ix://agent-ix/assurance/type/Project", 0, 1)
@relationship("derives_from", "traceability", "ix://agent-ix/assurance/type/Artifact", 0, 1)
@clause("ocl", "not_archived", "context Artifact inv: self.summary <> 'archived'")
@clause("sysml", "bounded", "constraint { self.duration >= 0 }")
model Artifact {
  /** Required, single-valued, non-null, part of the record's identity. */
  @identityField
  id: ArtifactId;

  /** Optional and single-valued: multiplicity 0..1. */
  summary?: Text;

  /** Required but nullable: nullability comes from the union, not the spelling. */
  note: Text | null;

  /** A unit, on a field resolving through no alias to a scalar. */
  @unit("s")
  duration?: Seconds;

  /** An inline collection: multiplicity 1..* with both flags declared. */
  @collection(true, true)
  tags: Text[];

  /** A default, and its declared kind. */
  @defaultKind("migration")
  status: Status = Status.draft;

  /** A field-level constraint mints an alias and retargets the field to it. */
  @minLength(3)
  code: Text;

  /** A field typed by a built-in directly mints a package-local kernel scalar. */
  revision: int32;

  /** A named sequence used as a field type is single-valued at the field. */
  labels: TagList;

  /** A decimal policy, carried as the semantic-core extension. */
  @decimal(12, 2)
  weight?: Seconds;
}

/** The relationship target, so the edge resolves inside this package. */
@role("agent-ix:entity")
model Project {
  @identityField
  id: ArtifactId;
  name: Text;
}

/** A record whose name ends in `Event` and which declares no role. */
model AuditEvent {
  at: utcDateTime;
  actor: ActorRef;
}

/** A private export, so the manifest's visibility rule has something to bind to. */
model InternalNote {
  body: Text;
}

/** A record with a nullable alias field: `NullableText` is not null. */
scalar NullableText extends Text;

model Envelope {
  payload: Payload;
  attributes: Attributes;
  note: NullableText;
}

@operations("Artifact")
interface ArtifactOperations {
  @pre("not_archived")
  @post("bounded")
  archive(reason: Text, force?: boolean): Status;
}
