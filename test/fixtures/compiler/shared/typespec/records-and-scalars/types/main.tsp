// The two-dialect shared case (FR-098 "Cross-frontend parity"): one record
// over kernel scalars only, so every scalar this frontend mints
// (`type/String`, `type/Integer`, `type/Boolean`, `type/Timestamp`) is one
// the spec-bundle frontend mints from its typed table too. No package-local
// `scalar` is declared: the typed table cannot author one. The five roles
// are the ones the fixture-domain `entity` object type confers, so
// both dialects declare the same `roles`.
using AgentIx.Semantic.Decorators;

namespace AgentIx.Semantic;

@role("fixture-domain:aggregate-member")
@role("fixture-domain:composite-owner")
@role("fixture-domain:domain-object")
@role("fixture-domain:entity")
@role("fixture-domain:persistable")
model Note {
  @identityField
  id: string;

  body?: string;

  // The constrained field: a field-level constraint mints an alias on both sides.
  @minValue(1)
  revision: integer;

  createdAt: utcDateTime;

  active: boolean;
}
