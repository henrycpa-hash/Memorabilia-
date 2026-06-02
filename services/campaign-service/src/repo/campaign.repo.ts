export type CampaignType =
  | "countdown_drop"
  | "loyalty_reward"
  | "referral_boost"
  | "watchlist_conversion"
  | "holder_only_drop"
  | "auction_promo"
  | "post_sale_highlight";

export type CampaignStatus = "draft" | "scheduled" | "live" | "ended" | "canceled";

export type AudienceType =
  | "all_followers"
  | "all_watchers"
  | "asset_watchers"
  | "creator_holders"
  | "top_collectors"
  | "referral_participants"
  | "inactive_users_reactivation";

export type Campaign = {
  id: string;
  creatorId: string;
  campaignType: CampaignType;
  title: string;
  description: string | null;
  status: CampaignStatus;
  startsAt: string;
  endsAt: string;
  audienceType: AudienceType;
  rewardType: string | null;
  assetId: string | null;
  createdAt: string;
};

export type CampaignEvent = {
  id: string;
  campaignId: string;
  eventType: "click" | "convert" | "view" | "share";
  payloadJson: Record<string, unknown>;
  createdAt: string;
};

const campaigns: Campaign[] = [];
const events: CampaignEvent[] = [];

export const campaignRepo = {
  insert(c: Campaign) {
    campaigns.push(c);
    return c;
  },
  findById(id: string) {
    return campaigns.find((c) => c.id === id) || null;
  },
  list() {
    return [...campaigns].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  listForCreator(creatorId: string) {
    return campaigns.filter((c) => c.creatorId === creatorId);
  },
  listLive() {
    return campaigns.filter((c) => c.status === "live");
  },
  update(id: string, patch: Partial<Campaign>) {
    const c = campaigns.find((x) => x.id === id);
    if (c) Object.assign(c, patch);
    return c || null;
  },

  insertEvent(e: CampaignEvent) {
    events.push(e);
    return e;
  },
  listEvents(campaignId: string) {
    return events
      .filter((e) => e.campaignId === campaignId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },
  countEventsByType(campaignId: string, type: CampaignEvent["eventType"]) {
    return events.filter((e) => e.campaignId === campaignId && e.eventType === type).length;
  }
};
