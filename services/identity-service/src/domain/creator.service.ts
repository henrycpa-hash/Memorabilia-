import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import { EventTypes } from "@crownx-jewel/shared-events/event-types";
import type { CreatorProfile } from "@crownx-jewel/contracts";
import { creatorRepo } from "../repo/creator.repo";

export const creatorService = {
  async create(input: {
    userId: string;
    publicHandle: string;
    creatorType: CreatorProfile["creatorType"];
  }): Promise<CreatorProfile> {
    const existing = creatorRepo.findByHandle(input.publicHandle);
    if (existing) return existing;

    const creator: CreatorProfile = {
      id: newId(),
      userId: input.userId,
      publicHandle: input.publicHandle,
      creatorType: input.creatorType,
      verified: true,
      createdAt: nowIso()
    };
    creatorRepo.insert(creator);

    await publishOutbox({
      id: newId(),
      eventType: EventTypes.CreatorCreated,
      aggregateId: creator.id,
      aggregateType: "creator_profile",
      payload: creator,
      occurredAt: nowIso()
    });

    return creator;
  },

  list() {
    return creatorRepo.list();
  }
};
