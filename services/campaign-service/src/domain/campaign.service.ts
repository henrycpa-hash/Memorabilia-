import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import {
  campaignRepo,
  type Campaign,
  type CampaignEvent,
  type CampaignType,
  type AudienceType
} from "../repo/campaign.repo";

export const campaignService = {
  async create(input: {
    creatorId: string;
    campaignType: CampaignType;
    title: string;
    description?: string;
    startsAt: string;
    endsAt: string;
    audienceType: AudienceType;
    rewardType?: string;
    assetId?: string;
  }): Promise<Campaign> {
    const c: Campaign = {
      id: newId(),
      creatorId: input.creatorId,
      campaignType: input.campaignType,
      title: input.title,
      description: input.description || null,
      status: "scheduled",
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      audienceType: input.audienceType,
      rewardType: input.rewardType || null,
      assetId: input.assetId || null,
      createdAt: nowIso()
    };
    campaignRepo.insert(c);

    await publishOutbox({
      id: newId(),
      eventType: "campaign.created",
      aggregateId: c.id,
      aggregateType: "campaign",
      payload: c,
      occurredAt: nowIso()
    });
    return c;
  },

  async launch(id: string): Promise<Campaign | null> {
    const c = campaignRepo.update(id, { status: "live" });
    if (c) {
      await publishOutbox({
        id: newId(),
        eventType: "campaign.launched",
        aggregateId: c.id,
        aggregateType: "campaign",
        payload: { campaignId: c.id, audienceType: c.audienceType },
        occurredAt: nowIso()
      });
    }
    return c;
  },

  async end(id: string): Promise<Campaign | null> {
    return campaignRepo.update(id, { status: "ended" });
  },

  async track(input: {
    campaignId: string;
    eventType: CampaignEvent["eventType"];
    payload?: Record<string, unknown>;
  }): Promise<CampaignEvent> {
    const e: CampaignEvent = {
      id: newId(),
      campaignId: input.campaignId,
      eventType: input.eventType,
      payloadJson: input.payload || {},
      createdAt: nowIso()
    };
    campaignRepo.insertEvent(e);

    if (input.eventType === "click" || input.eventType === "convert") {
      await publishOutbox({
        id: newId(),
        eventType: `campaign.${input.eventType}ed`,
        aggregateId: input.campaignId,
        aggregateType: "campaign",
        payload: { campaignId: input.campaignId, ...input.payload },
        occurredAt: nowIso()
      });
    }
    return e;
  },

  list() {
    return campaignRepo.list();
  },
  findById(id: string) {
    return campaignRepo.findById(id);
  },
  listForCreator(creatorId: string) {
    return campaignRepo.listForCreator(creatorId);
  },
  listLive() {
    return campaignRepo.listLive();
  },
  events(campaignId: string) {
    return campaignRepo.listEvents(campaignId);
  },
  metrics(campaignId: string) {
    return {
      campaignId,
      views: campaignRepo.countEventsByType(campaignId, "view"),
      clicks: campaignRepo.countEventsByType(campaignId, "click"),
      conversions: campaignRepo.countEventsByType(campaignId, "convert"),
      shares: campaignRepo.countEventsByType(campaignId, "share")
    };
  }
};
