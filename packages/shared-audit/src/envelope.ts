/**
 * The canonical envelope every audit log entry uses across CrownX Jewel.
 *
 * - actorId / actorRole identify the user-or-system that took the action
 * - actionType is a stable verb-style name like "asset.created" or "auction.bid.placed"
 * - aggregateType + aggregateId locate the affected entity
 * - correlationId stitches the chain across multiple services
 * - payloadJson is a free-form record of action specifics (NOT user PII)
 */
export type AuditEnvelope = {
  id: string;
  actorId: string;
  actorRole: string;
  actionType: string;
  aggregateType: string;
  aggregateId: string;
  correlationId?: string;
  payloadJson: Record<string, unknown>;
  createdAt: string;
};

/**
 * Stable Wave 3 audit verbs. Services should reference these constants rather
 * than typing the strings inline so renames stay safe.
 */
export const AuditActions = {
  UserLogin: "user.login",
  CreatorProfileCreate: "creator_profile.create",
  AssetCreate: "asset.create",
  EvidenceUploadIntentCreate: "evidence.upload_intent.create",
  EvidenceComplete: "evidence.complete",
  AuthCaseCreate: "auth_case.create",
  AuthCaseApprove: "auth_case.approve",
  CoaIssue: "coa.issue",
  ListingCreate: "listing.create",
  WatchlistAdd: "watchlist.add",
  WatchlistRemove: "watchlist.remove",
  OfferSubmit: "offer.submit",
  OfferCounter: "offer.counter",
  OfferAccept: "offer.accept",
  OfferReject: "offer.reject",
  AuctionCreate: "auction.create",
  AuctionBidPlace: "auction.bid.place",
  OrderComplete: "order.complete",
  PayoutItemCreate: "payout_item.create",
  ShareCardCreate: "share_card.create"
} as const;

export type AuditActionName = (typeof AuditActions)[keyof typeof AuditActions];
