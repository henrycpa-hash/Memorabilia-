/**
 * Wave 4 KPI catalog. The analytics-warehouse-service derives these from the
 * underlying fact rows on demand; Wave 5 will pre-aggregate them into a
 * materialized rollup table.
 */
export const MarketKpiKeys = {
  GMV: "gmv",
  PrimarySales: "primary_sales",
  SecondarySales: "secondary_sales",
  AvgSettlementCompletionMinutes: "avg_settlement_completion_minutes",
  PayoutReleaseLagMinutes: "payout_release_lag_minutes",
  DisputeRate: "dispute_rate",
  AuctionCloseSuccessRate: "auction_close_success_rate"
} as const;

export const GrowthKpiKeys = {
  StoryViews: "story_views",
  WatchlistAdditions: "watchlist_additions",
  ReferralConversions: "referral_conversions",
  ShareCardClicks: "share_card_clicks",
  CampaignConversionByAudience: "campaign_conversion_by_audience",
  CreatorMomentumIndex: "creator_momentum_index"
} as const;

export const TrustKpiKeys = {
  AuthApprovalTurnaroundHours: "auth_approval_turnaround_hours",
  FraudAlertRate: "fraud_alert_rate",
  SettlementHoldRate: "settlement_hold_rate",
  DisputeResolutionTimeHours: "dispute_resolution_time_hours",
  TrustedSellerIndex: "trusted_seller_index"
} as const;

export type AnyKpiKey =
  | (typeof MarketKpiKeys)[keyof typeof MarketKpiKeys]
  | (typeof GrowthKpiKeys)[keyof typeof GrowthKpiKeys]
  | (typeof TrustKpiKeys)[keyof typeof TrustKpiKeys];
