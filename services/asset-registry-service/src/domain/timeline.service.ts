import { nowIso } from "@crownx-jewel/shared-kernel";
import {
  timelineRepo,
  type TimelineEvent,
  type TimelineEventType
} from "../repo/timeline.repo";

export const timelineService = {
  append(input: {
    assetId: string;
    type: TimelineEventType;
    label: string;
    publicNote?: string;
    price?: number;
    at?: string;
  }): TimelineEvent[] {
    const event: TimelineEvent = {
      type: input.type,
      at: input.at || nowIso(),
      label: input.label,
      publicNote: input.publicNote,
      price: input.price
    };
    return timelineRepo.append(input.assetId, event);
  },

  get(assetId: string): TimelineEvent[] {
    return timelineRepo.get(assetId);
  },

  count(assetId: string): number {
    return timelineRepo.count(assetId);
  }
};

export type { TimelineEvent, TimelineEventType };
