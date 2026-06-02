/**
 * Wave 4 warehouse fact event types. These are the durable, append-only facts
 * the analytics-warehouse-service stores; dashboards read these rows.
 */
export const FactEventTypes = {
  ListingPublished: "listing_published",
  OfferSubmitted: "offer_submitted",
  OfferAccepted: "offer_accepted",
  AuctionClosed: "auction_closed",
  SaleCompleted: "sale_completed",
  PayoutReleased: "payout_released",
  ShareCardRendered: "share_card_rendered",
  CampaignLaunched: "campaign_launched",
  CampaignClicked: "campaign_clicked",
  CampaignConverted: "campaign_converted",
  SettlementHeld: "settlement_held",
  DisputeOpened: "dispute_opened",
  DisputeResolved: "dispute_resolved",
  FraudFlagRaised: "fraud_flag_raised"
} as const;

export type FactEventType = (typeof FactEventTypes)[keyof typeof FactEventTypes];

/**
 * Canonical fact envelope. amount/userId/creatorId are optional because not
 * every fact has a money or party dimension (e.g. share_card_rendered).
 */
export type MarketFact = {
  id: string;
  eventDate: string;
  eventType: FactEventType;
  assetId: string;
  creatorId?: string | null;
  amount?: string | null;
  userId?: string | null;
  sourceId: string;
  createdAt: string;
};
