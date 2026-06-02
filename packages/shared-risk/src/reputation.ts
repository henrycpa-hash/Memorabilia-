/**
 * User reputation (Wave 4 heuristic).
 *
 *   base                  50
 *   + successful trades   +3 each
 *   + watch followers     +0.1 each
 *   - dispute rate (0..1) -20 * rate
 *   - fraud flags         -10 each
 *
 * Floored at 0 so degraded accounts never go negative. Wave 5 will replace
 * this with a calibrated graph-walk over the trade network.
 */
export function computeUserReputation(input: {
  successfulTrades: number;
  disputeRate: number;
  fraudFlags: number;
  watchFollowers: number;
}): number {
  return Math.max(
    0,
    50 +
      input.successfulTrades * 3 +
      input.watchFollowers * 0.1 -
      input.disputeRate * 20 -
      input.fraudFlags * 10
  );
}

/**
 * Creator momentum (Wave 4 heuristic).
 *
 * Higher is hotter. Used to surface "trending creators" boards and to reward
 * campaign-effective creators with placement boosts.
 */
export function computeCreatorMomentum(input: {
  authenticatedAssetCount: number;
  resaleVelocity: number;
  campaignConversionRate: number;
  referralConversionRate: number;
}): number {
  return (
    input.authenticatedAssetCount * 2 +
    input.resaleVelocity * 10 +
    input.campaignConversionRate * 50 +
    input.referralConversionRate * 40
  );
}

export type ReputationTier = "new" | "trusted" | "preferred" | "elite";

export function reputationTier(score: number): ReputationTier {
  if (score >= 250) return "elite";
  if (score >= 150) return "preferred";
  if (score >= 75) return "trusted";
  return "new";
}
