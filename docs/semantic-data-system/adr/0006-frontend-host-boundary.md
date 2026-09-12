---
id: ADR-0006
title: "Reach the extraction frontend through the injected host"
type: ADR
status: normative
---
# ADR-0006: Reach the extraction frontend through the injected host

## Context

The `spec-bundle` frontend is registered and not implemented.
`src/compiler/frontend/spec-bundle/frontend.mjs` is twenty-seven lines that
return `FRONTEND_NOT_IMPLEMENTED`. It is a placeholder rather than a shim: it
spawns nothing and does not know that the implementation exists.

The implementation does exist. `crates/extraction-frontend` loads a repository
`spec/` tree through the Quire extraction contract and writes four artifacts —
the semantic IR document, its fingerprint, a diagnostics sidecar and a
provenance record — atomically, by temp-and-rename. Everything between load and
write is in memory. What is missing is the wire between the JavaScript seam and
that binary.

The obvious wire is a subprocess spawn followed by reading the sidecar the
binary wrote. That runs directly into a rule this repository states twice and
enforces:

> It lives outside `frontend/` because no module under that directory may touch
> `node:fs`: the frontends reach the file system only through the injected host,
> and a convenience read here would be the one exception that makes the rule
> unenforceable.
>
> — `src/compiler/dialects.mjs`

The rule is not decorative. `src/compiler/host.mjs` exists because the safety
and determinism properties the compiler claims are otherwise unobservable: "the
compiler reads nothing outside its roots" cannot be established by reading
source, because the pinned TypeSpec compiler does its own resolution and its own
dynamic import. It can be established by giving that compiler a host this
repository owns, so that a refusal is a refusal in fact rather than an assertion
about intent.

No ticket mentions this conflict. [#86](https://github.com/agent-ix/filament-core-data/issues/86)
describes roughly fifty lines of plumbing and says nothing about the boundary
those fifty lines cross. Left undecided, it gets decided by whoever writes the
plumbing, at the moment they discover the rule, under time pressure — and the
cheapest local move at that moment is an exemption.

The host today offers reads, an existence check, a directory walk, atomic
writes, and a module-load gate. It offers no way to run a program.

## Decision

The `spec-bundle` frontend reaches the Rust extraction binary **through the
injected host**, and the host gains a bounded process capability to make that
possible. No module under `src/compiler/frontend/` imports `node:fs`,
`node:child_process`, or any other ambient-effect module, and the rule gains no
exemption.

Concretely:

- The host gains a process capability alongside its read and write capabilities.
  A caller declares the executables a run may invoke, in the same shape
  `readRoots` and `writeTargets` already take. An invocation outside that
  declaration is refused and recorded, exactly as a read outside `readRoots` is.
- Every invocation is recorded on the host's `record`, with the executable's
  resolved real path, its digest, and its arguments — so a test asserts over
  what the compiler *did*, not over what the source appears to do. This is the
  same reason `record.reads` exists.
- The frontend names no absolute path and opens no file. It asks the host to run
  the lift and asks the host to read the artifacts the lift declares, within
  roots the caller declared.
- The frontend maps the exit code and the diagnostics sidecar into a
  `FrontendResult` and returns it. The seam's existing contract is unchanged: a
  blocking diagnostic and a non-null document still never come back together.

## Rationale

**The rule's purpose is observability and confinement, not abstinence.** A
frontend that performs no I/O at all would be a nice property, but it is not the
property the repository bought. The host was built because "it reads nothing
outside its roots" had to be *checkable*. A `node:fs` call inside a frontend is
unobservable — nothing records it, nothing confines it, and a test can only
assert that the source does not contain the string. A host call is observable by
construction. Routing the spawn through the host therefore satisfies the rule's
reason, where an exemption would satisfy neither the reason nor the letter.

**A subprocess is a larger ambient input than a file read, so it needs more of
the host, not less.** Spawning a program admits an executable of unknown
provenance, an environment, a working directory, and a non-deterministic exit.
Those are precisely the inputs the host exists to pin down. Recording the
executable's digest makes "which binary produced this document" answerable from
the record rather than from the reader's memory of what was on the path.

**The alternatives each cost more than they save.**

- *Exempt the frontend.* One exemption makes the rule unenforceable, which is
  the outcome `dialects.mjs` explicitly refuses for itself — that module moved
  out of `frontend/` rather than take the exemption it could have justified more
  easily than this one could.
- *Lift in the caller and pass the IR in as data.* This keeps the frontend pure
  and needs no new host capability, and it was the closest competitor. It is
  rejected because it relocates frontend selection into the call site: the seam
  exists so that a frontend is chosen by the `source.dialect` value the contract
  declares "rather than by whichever call site reached for it". A caller that
  must lift before it can select has already selected.
- *Reimplement the lift in JavaScript.* It duplicates 6,511 lines and creates a
  second producer of the same artifact, which is the divergence the conformance
  corpus exists to detect rather than to cause.

**This does not settle where the binary comes from.** Whether the compiler
invokes a built binary, a `cargo run`, or a published artifact is a separate
question about build and distribution. The decision here is that whichever it
is, it is invoked through the host and recorded there.

## Consequences

- `src/compiler/host.mjs` gains one capability and its refusal path, with the
  same test treatment the read path has: an allowed invocation, a refused one,
  and an assertion over `record`.
- `spec-bundle/frontend.mjs` becomes a shim over the host and flips
  `implemented` to `true` in the frontend registry. Its current diagnostic still
  names issue #36, which is closed; the accurate owner is #86.
- Every existing caller that constructs a host and does not declare an
  executable is unaffected, because an empty declaration permits nothing and no
  current path invokes anything.
- A gate asserts that no module under `src/compiler/frontend/` imports an
  ambient-effect module, so the rule this decision preserves is measured rather
  than restated. Today it is stated in two file headers and checked by neither.
- The determinism claims of the spec-bundle path become statements about a
  recorded executable digest, which is stronger than what the Rust binary's own
  gates can say about a JavaScript caller.

## Status

Normative. It governs the #86 wiring and any later frontend that reaches an
out-of-process producer. It changes no generated byte and no published schema.
