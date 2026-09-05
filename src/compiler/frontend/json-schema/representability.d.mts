/** The closed representability register (FR-084). Exactly two rows. */

export interface LossRow {
	readonly id: string;
	readonly code: string;
	readonly construct: string;
	readonly owner: string;
	readonly lost: string;
	readonly why: string;
}

export declare const KERNEL_LOSSES: readonly LossRow[];
export declare const KERNEL_LOSS_CODES: readonly string[];

/** Both directions, separately: a code with no row, and a row with no code. */
export declare function checkLossBijection(
	registry?: Record<string, { code: string }>,
): {
	readonly codesWithoutRow: readonly string[];
	readonly rowsWithoutCode: readonly string[];
};

/** A declared loss, or a refusal. There is no third answer. */
export declare function decide(
	construct: string,
):
	| {
			readonly outcome: "declared-loss";
			readonly row: LossRow;
			readonly diagnostic: { code: string; message: string; locus: string };
	  }
	| {
			readonly outcome: "refused";
			readonly diagnostic: { code: string; message: string; locus: string };
	  };
