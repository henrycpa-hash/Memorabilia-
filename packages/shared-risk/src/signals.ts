/**
 * CrownX Jewel fraud signal catalog (Wave 4).
 *
 * Each signal carries a numeric weight that contributes to a subject's score.
 * Wave 5 swaps this for an ML inference service; Wave 4 uses these explicit
 * weights so behavior is auditable and explainable.
 */
export const FraudSignals = {
  AccountAgeUnder7Days: { key: "account_age_days_under_7", weight: 20 },
  DeviceOverlapDetected: { key: "device_overlap_detected", weight: 25 },
  PayoutDestinationChangeRecent: {
    key: "payout_destination_change_recent",
    weight: 20
  },
  HighDisputeRate: { key: "high_dispute_rate", weight: 15 },
  RepeatedBidRingPattern: { key: "repeated_bid_ring_pattern", weight: 30 },
  ExtremePriceJump: { key: "extreme_price_jump", weight: 15 },
  ExcessiveCanceledNegotiations: {
    key: "excessive_canceled_negotiations",
    weight: 10
  },
  WatchlistSpikeFromCluster: {
    key: "watchlist_spike_from_cluster",
    weight: 10
  },
  OfferSpam: { key: "offer_spam", weight: 10 },
  RepeatedCounterofferLoop: { key: "repeated_counteroffer_loop", weight: 10 }
} as const;

export type FraudSignalKey = (typeof FraudSignals)[keyof typeof FraudSignals]["key"];

export const ALL_SIGNAL_KEYS: FraudSignalKey[] = Object.values(FraudSignals).map(
  (s) => s.key
) as FraudSignalKey[];

export function weightOf(key: string): number {
  for (const s of Object.values(FraudSignals)) {
    if (s.key === key) return s.weight;
  }
  return 0;
}
