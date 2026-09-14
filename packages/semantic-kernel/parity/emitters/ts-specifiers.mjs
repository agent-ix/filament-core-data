/**
 * A module resolution hook, and nothing else.
 *
 * The generated TypeScript package spells its own imports with the `.js`
 * specifiers TypeScript's `NodeNext` resolution requires of an ESM package, and
 * Node's type stripping does not rewrite them. This hook maps those specifiers
 * back onto the package's own `.ts` files so an ordinary Node consumer can
 * import the package as generated, without a build step and without the package
 * being edited.
 *
 * It decides nothing about any golden document: it resolves module specifiers
 * inside one directory and defers everything else. It reads no clock and no
 * environment variable (FR-090-CON-11).
 */

const PACKAGE = "/packages/semantic-kernel/typescript/";

/** Resolves `./x.js` to `./x.ts` inside the generated package alone. */
export function resolve(specifier, context, nextResolve) {
	if (specifier.endsWith(".js")) {
		const candidate = new URL(specifier, context.parentURL).pathname;
		if (candidate.includes(PACKAGE)) {
			return nextResolve(`${specifier.slice(0, -3)}.ts`, context);
		}
	}
	return nextResolve(specifier, context);
}
