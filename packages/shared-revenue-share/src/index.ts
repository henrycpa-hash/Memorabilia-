/**
 * Wave 8 revenue-share primitives. Trees, splits, waterfall calculations,
 * minimum guarantees, caps.
 */
export type RevenueShareScope = "platform" | "tenant" | "partner_tier" | "creator" | "campaign";

export type RevenueShareTreeStatus = "draft" | "active" | "superseded" | "archived";

export type SplitNode = {
  beneficiaryId: string;
  beneficiaryRole: "platform" | "tenant" | "partner" | "agency" | "creator" | "intermediary";
  /** Either percentage 0-100 OR a fixed cents amount. */
  percentage?: number;
  fixedCentsBeforeSplit?: number;
  /** Caps applied to this beneficiary's share regardless of percentage. */
  minimumGuaranteeCents?: number;
  maximumCents?: number;
  /** Sub-splits — when present, this node's share is further divided. */
  children?: SplitNode[];
};

export type SplitTree = {
  rootCurrency: string;
  splits: SplitNode[];
};

export type SplitOutcome = {
  beneficiaryId: string;
  beneficiaryRole: SplitNode["beneficiaryRole"];
  amountCents: number;
  rationale: string;
};

/**
 * Deterministic waterfall: subtract any fixed-cents pre-splits first, then
 * apply percentages to the remainder. Apply minimums and maximums per node.
 * Returns a flat list of beneficiary outcomes.
 */
export function calculateWaterfall(
  totalCents: number,
  tree: SplitTree
): { outcomes: SplitOutcome[]; remainderCents: number } {
  const outcomes: SplitOutcome[] = [];
  let remaining = totalCents;

  // First pass: pre-split fixed amounts
  const passes = [...tree.splits];
  const afterFixed: SplitNode[] = [];
  for (const node of passes) {
    if (node.fixedCentsBeforeSplit && node.fixedCentsBeforeSplit > 0) {
      const take = Math.min(remaining, node.fixedCentsBeforeSplit);
      remaining -= take;
      outcomes.push({
        beneficiaryId: node.beneficiaryId,
        beneficiaryRole: node.beneficiaryRole,
        amountCents: take,
        rationale: `fixed pre-split ${take}c`
      });
    }
    if (node.percentage && node.percentage > 0) afterFixed.push(node);
  }

  // Second pass: percentage splits on remainder
  for (const node of afterFixed) {
    const pct = node.percentage || 0;
    let amount = Math.floor((remaining * pct) / 100);
    let rationale = `${pct}% of ${remaining}c = ${amount}c`;
    if (node.minimumGuaranteeCents != null && amount < node.minimumGuaranteeCents) {
      amount = node.minimumGuaranteeCents;
      rationale += ` → bumped to MG ${amount}c`;
    }
    if (node.maximumCents != null && amount > node.maximumCents) {
      amount = node.maximumCents;
      rationale += ` → capped to ${amount}c`;
    }
    outcomes.push({
      beneficiaryId: node.beneficiaryId,
      beneficiaryRole: node.beneficiaryRole,
      amountCents: amount,
      rationale
    });
  }

  // Recompute remainder after percentage payouts
  const totalPaid = outcomes.reduce((a, o) => a + o.amountCents, 0);
  const remainder = totalCents - totalPaid;
  return { outcomes, remainderCents: remainder };
}
