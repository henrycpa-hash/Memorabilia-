import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import { evaluateSegment, type SegmentDefinition, type FanProfile } from "@crownx-jewel/shared-crm";
import { crmRepo, type Segment, type LifecycleJourney } from "../repo/crm.repo";

export const crmService = {
  // Segments
  async createSegment(input: {
    creatorId: string;
    name: string;
    description?: string;
    definition: SegmentDefinition;
  }): Promise<Segment> {
    const s: Segment = {
      id: newId(),
      creatorId: input.creatorId,
      name: input.name,
      description: input.description || null,
      definition: input.definition,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    crmRepo.insertSegment(s);
    await publishOutbox({
      id: newId(),
      eventType: "crm.segment.created",
      aggregateId: s.id,
      aggregateType: "segment",
      payload: s,
      occurredAt: nowIso()
    });
    return s;
  },

  updateSegment(id: string, patch: { name?: string; description?: string; definition?: SegmentDefinition }) {
    return crmRepo.updateSegment(id, { ...patch, updatedAt: nowIso() });
  },
  removeSegment(id: string) { return crmRepo.removeSegment(id); },
  listSegments: () => crmRepo.listSegments(),
  segmentsForCreator: (c: string) => crmRepo.segmentsForCreator(c),
  findSegment: (id: string) => crmRepo.findSegment(id),

  /** Wave 5 ingests fan profile snapshots from the warehouse worker. */
  upsertProfile(p: FanProfile) { return crmRepo.upsertProfile(p); },
  listProfiles: () => crmRepo.listProfiles(),
  findProfile: (id: string) => crmRepo.findProfile(id),

  /** Materialize a segment into a list of userIds against current profiles. */
  async materialize(segmentId: string) {
    const segment = crmRepo.findSegment(segmentId);
    if (!segment) return null;
    const profiles = crmRepo.listProfiles();
    const userIds = evaluateSegment(segment.definition, profiles);
    const m = {
      id: newId(),
      segmentId,
      userIds,
      size: userIds.length,
      createdAt: nowIso()
    };
    crmRepo.insertMaterialization(m);
    await publishOutbox({
      id: newId(),
      eventType: "crm.segment.materialized",
      aggregateId: m.id,
      aggregateType: "segment_materialization",
      payload: { segmentId, size: userIds.length },
      occurredAt: nowIso()
    });
    return m;
  },

  latestMaterialization: (segmentId: string) => crmRepo.latestMaterialization(segmentId),

  // Lifecycle journeys
  createJourney(input: {
    creatorId: string;
    name: string;
    segmentId: string;
    triggerEventType: string;
    templateKey: string;
  }): LifecycleJourney {
    const j: LifecycleJourney = {
      id: newId(),
      creatorId: input.creatorId,
      name: input.name,
      segmentId: input.segmentId,
      triggerEventType: input.triggerEventType,
      templateKey: input.templateKey,
      enabled: true,
      createdAt: nowIso()
    };
    crmRepo.insertJourney(j);
    return j;
  },

  toggleJourney(id: string, enabled: boolean) {
    return crmRepo.updateJourney(id, { enabled });
  },
  listJourneys: () => crmRepo.listJourneys(),
  journeysForCreator: (c: string) => crmRepo.journeysForCreator(c)
};
