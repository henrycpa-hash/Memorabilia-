import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import {
  detectBreaches,
  type SlaBreach as SharedBreach,
  type SlaObservation,
  type SlaProfileStatus,
  type SlaTargets
} from "@crownx-jewel/shared-sla";

export type SlaProfile = {
  id: string;
  tenantId: string | null;
  partnerId: string | null;
  profileName: string;
  targets: SlaTargets;
  status: SlaProfileStatus;
  createdAt: string;
  updatedAt: string;
};

export type SlaBreachRecord = SharedBreach & {
  id: string;
  profileId: string;
  startedAt: string;
  endedAt: string | null;
  payloadJson: Record<string, unknown>;
  createdAt: string;
};

const profiles: SlaProfile[] = [];
const breaches: SlaBreachRecord[] = [];

export const slaService = {
  async createProfile(input: {
    tenantId?: string;
    partnerId?: string;
    profileName: string;
    targets: SlaTargets;
  }): Promise<SlaProfile> {
    const p: SlaProfile = {
      id: newId(),
      tenantId: input.tenantId || null,
      partnerId: input.partnerId || null,
      profileName: input.profileName,
      targets: input.targets,
      status: "active",
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    profiles.push(p);
    await publishOutbox({
      id: newId(),
      eventType: "sla.profile.created",
      aggregateId: p.id,
      aggregateType: "sla_profile",
      payload: p,
      occurredAt: nowIso()
    });
    return p;
  },

  suspendProfile(id: string) {
    const p = profiles.find((x) => x.id === id);
    if (!p) return null;
    p.status = "suspended";
    p.updatedAt = nowIso();
    return p;
  },

  /**
   * Submit a fresh observation against a profile. Detects breaches against
   * the profile's targets and persists each breach. Returns the breach list
   * (may be empty if all targets were met).
   */
  async observe(input: {
    profileId: string;
    observation: SlaObservation;
    payload?: Record<string, unknown>;
  }): Promise<{ profile: SlaProfile; breaches: SlaBreachRecord[] } | null> {
    const profile = profiles.find((p) => p.id === input.profileId);
    if (!profile) return null;
    const detected = detectBreaches(input.observation, profile.targets);
    const newBreaches: SlaBreachRecord[] = detected.map((b) => ({
      id: newId(),
      profileId: profile.id,
      ...b,
      startedAt: nowIso(),
      endedAt: null,
      payloadJson: input.payload || {},
      createdAt: nowIso()
    }));
    for (const b of newBreaches) {
      breaches.push(b);
      await publishOutbox({
        id: newId(),
        eventType: "sla.breach.opened",
        aggregateId: b.id,
        aggregateType: "sla_breach",
        payload: b,
        occurredAt: nowIso()
      });
    }
    return { profile, breaches: newBreaches };
  },

  async resolveBreach(id: string) {
    const b = breaches.find((x) => x.id === id);
    if (!b) return null;
    b.endedAt = nowIso();
    await publishOutbox({
      id: newId(),
      eventType: "sla.breach.resolved",
      aggregateId: b.id,
      aggregateType: "sla_breach",
      payload: { breachId: b.id, resolvedAt: b.endedAt },
      occurredAt: nowIso()
    });
    return b;
  },

  list: () => [...profiles].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  byTenant: (tenantId: string) => profiles.filter((p) => p.tenantId === tenantId),
  byPartner: (partnerId: string) => profiles.filter((p) => p.partnerId === partnerId),
  findById: (id: string) => profiles.find((p) => p.id === id) || null,

  listBreaches: (profileId?: string) =>
    breaches.filter((b) => !profileId || b.profileId === profileId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  openBreaches: () => breaches.filter((b) => !b.endedAt)
};
