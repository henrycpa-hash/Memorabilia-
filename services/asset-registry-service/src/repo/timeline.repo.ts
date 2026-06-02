export type TimelineEventType =
  | "asset_registered"
  | "evidence_uploaded"
  | "auth_approved"
  | "coa_issued"
  | "listing_created"
  | "auction_created"
  | "offer_accepted"
  | "sale_completed"
  | "ownership_transferred";

export type TimelineEvent = {
  type: TimelineEventType;
  at: string;
  label: string;
  publicNote?: string;
  price?: number;
};

const timelines = new Map<string, TimelineEvent[]>();

export const timelineRepo = {
  append(assetId: string, event: TimelineEvent): TimelineEvent[] {
    const existing = timelines.get(assetId) || [];
    existing.push(event);
    existing.sort((a, b) => a.at.localeCompare(b.at));
    timelines.set(assetId, existing);
    return existing;
  },
  get(assetId: string): TimelineEvent[] {
    return [...(timelines.get(assetId) || [])];
  },
  list(): Record<string, TimelineEvent[]> {
    return Object.fromEntries(timelines);
  },
  count(assetId: string): number {
    return (timelines.get(assetId) || []).length;
  }
};
