import type { SegmentDefinition, FanProfile } from "@crownx-jewel/shared-crm";

export type Segment = {
  id: string;
  creatorId: string;
  name: string;
  description: string | null;
  definition: SegmentDefinition;
  createdAt: string;
  updatedAt: string;
};

export type SegmentMaterialization = {
  id: string;
  segmentId: string;
  userIds: string[];
  size: number;
  createdAt: string;
};

export type LifecycleJourney = {
  id: string;
  creatorId: string;
  name: string;
  segmentId: string;
  triggerEventType: string; // e.g. "campaign.launched"
  templateKey: string;
  enabled: boolean;
  createdAt: string;
};

const segments: Segment[] = [];
const profiles = new Map<string, FanProfile>();
const materializations: SegmentMaterialization[] = [];
const journeys: LifecycleJourney[] = [];

export const crmRepo = {
  insertSegment(s: Segment) { segments.push(s); return s; },
  findSegment(id: string) { return segments.find((s) => s.id === id) || null; },
  listSegments() { return [...segments].sort((a, b) => b.createdAt.localeCompare(a.createdAt)); },
  segmentsForCreator(creatorId: string) {
    return segments.filter((s) => s.creatorId === creatorId);
  },
  updateSegment(id: string, patch: Partial<Segment>) {
    const s = segments.find((x) => x.id === id);
    if (s) Object.assign(s, patch);
    return s || null;
  },
  removeSegment(id: string) {
    const i = segments.findIndex((s) => s.id === id);
    if (i >= 0) segments.splice(i, 1);
    return true;
  },

  upsertProfile(p: FanProfile) { profiles.set(p.userId, p); return p; },
  listProfiles(): FanProfile[] { return Array.from(profiles.values()); },
  findProfile(userId: string) { return profiles.get(userId) || null; },

  insertMaterialization(m: SegmentMaterialization) { materializations.push(m); return m; },
  latestMaterialization(segmentId: string) {
    const list = materializations.filter((m) => m.segmentId === segmentId);
    return list[list.length - 1] || null;
  },

  insertJourney(j: LifecycleJourney) { journeys.push(j); return j; },
  listJourneys() { return [...journeys]; },
  journeysForCreator(creatorId: string) {
    return journeys.filter((j) => j.creatorId === creatorId);
  },
  findJourney(id: string) { return journeys.find((j) => j.id === id) || null; },
  updateJourney(id: string, patch: Partial<LifecycleJourney>) {
    const j = journeys.find((x) => x.id === id);
    if (j) Object.assign(j, patch);
    return j || null;
  }
};
