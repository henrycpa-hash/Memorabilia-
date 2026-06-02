import type { NotificationChannel } from "./channels";

export type AutomationRule = {
  id: string;
  eventType: string;
  audienceType: string;
  templateKey: string;
  channels: NotificationChannel[];
  delayMinutes: number;
  enabled: boolean;
};

/**
 * Wave 4 default automation rule set. The automation-orchestrator-service
 * loads these into its in-memory store on boot and exposes them via /rules.
 *
 * Each rule maps an event type → audience → channels with a default delay.
 * Operators can override individual rules via the API in Wave 4 and via the
 * ops-console UI in Wave 5.
 */
export const DEFAULT_AUTOMATION_RULES: AutomationRule[] = [
  {
    id: "rule_auction_ending_soon",
    eventType: "auction.ending_soon",
    audienceType: "asset_watchers",
    templateKey: "auction_ending_soon_email",
    channels: ["in_app", "email"],
    delayMinutes: 0,
    enabled: true
  },
  {
    id: "rule_outbid",
    eventType: "auction.bid.outbid",
    audienceType: "previous_winning_bidder",
    templateKey: "outbid_alert",
    channels: ["in_app", "push"],
    delayMinutes: 0,
    enabled: true
  },
  {
    id: "rule_offer_accepted",
    eventType: "offer.accepted",
    audienceType: "buyer_of_offer",
    templateKey: "offer_accepted_settlement_cta",
    channels: ["in_app", "push"],
    delayMinutes: 0,
    enabled: true
  },
  {
    id: "rule_dispute_opened",
    eventType: "dispute.opened",
    audienceType: "all_parties",
    templateKey: "dispute_opened",
    channels: ["in_app", "email"],
    delayMinutes: 0,
    enabled: true
  },
  {
    id: "rule_creator_drop",
    eventType: "campaign.launched",
    audienceType: "asset_watchers",
    templateKey: "creator_drop_launch",
    channels: ["in_app", "push"],
    delayMinutes: 0,
    enabled: true
  },
  {
    id: "rule_settlement_completed",
    eventType: "settlement.completed",
    audienceType: "buyer_and_seller",
    templateKey: "settlement_completed_share_cta",
    channels: ["in_app", "email"],
    delayMinutes: 0,
    enabled: true
  },
  {
    id: "rule_countdown_72h",
    eventType: "campaign.countdown_72h",
    audienceType: "asset_watchers",
    templateKey: "countdown_72h",
    channels: ["in_app"],
    delayMinutes: 0,
    enabled: true
  },
  {
    id: "rule_countdown_24h",
    eventType: "campaign.countdown_24h",
    audienceType: "asset_watchers",
    templateKey: "countdown_24h",
    channels: ["in_app", "email"],
    delayMinutes: 0,
    enabled: true
  }
];
