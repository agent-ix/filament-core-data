import type { EmitContext } from "@typespec/compiler";

/** The emitter's own `name@version`, stamped when the caller supplies none. */
export declare function defaultGeneratorId(): string;

/** TypeSpec emitter entry point; reads `generator` from the emitter options. */
export declare function $onEmit(
	context: EmitContext<{ generator?: string }>,
): Promise<void>;
