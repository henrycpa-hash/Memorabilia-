import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import {
  evaluateResidency,
  type ResidencyAssignmentStatus,
  type ResidencyEvaluation,
  type ResidencyEvaluationInput,
  type ResidencyPolicyRules,
  type ResidencyPolicyStatus,
  type ResidencyRegionKey
} from "@crownx-jewel/shared-residency";

export type ResidencyRegion = {
  id: string;
  regionKey: ResidencyRegionKey;
  displayName: string;
  rules: ResidencyPolicyRules;
  status: ResidencyPolicyStatus;
  createdAt: string;
};

export type TenantResidencyAssignment = {
  id: string;
  tenantId: string;
  regionId: string;
  regionKey: ResidencyRegionKey;
  status: ResidencyAssignmentStatus;
  createdAt: string;
  updatedAt: string;
};

export type ResidencyEvaluationRecord = {
  id: string;
  tenantId: string | null;
  regionId: string;
  subjectType: string;
  subjectId: string;
  input: ResidencyEvaluationInput;
  evaluation: ResidencyEvaluation;
  createdAt: string;
};

const regions: ResidencyRegion[] = [];
const assignments: TenantResidencyAssignment[] = [];
const evals: ResidencyEvaluationRecord[] = [];

/** Seed common regions on boot. */
function seed() {
  if (regions.length > 0) return;
  const seeds: Array<{ key: ResidencyRegionKey; name: string; rules: ResidencyPolicyRules }> = [
    {
      key: "us_east", name: "US East (Virginia)",
      rules: {
        allowedStorageRegions: ["us_east", "us_west"],
        allowedProcessingRegions: ["us_east", "us_west"],
        exportBoundaries: [],
        crossRegionReplicationAllowed: true
      }
    },
    {
      key: "eu_west", name: "EU West (Ireland)",
      rules: {
        allowedStorageRegions: ["eu_west", "eu_central"],
        allowedProcessingRegions: ["eu_west", "eu_central", "uk"],
        exportBoundaries: ["eu_west", "eu_central", "uk"],
        crossRegionReplicationAllowed: false,
        notes: "GDPR boundary; storage must remain in EU/UK"
      }
    },
    {
      key: "uk", name: "United Kingdom",
      rules: {
        allowedStorageRegions: ["uk", "eu_west"],
        allowedProcessingRegions: ["uk", "eu_west", "eu_central"],
        exportBoundaries: ["uk", "eu_west", "eu_central"],
        crossRegionReplicationAllowed: false,
        notes: "UK GDPR boundary"
      }
    },
    {
      key: "apac_singapore", name: "APAC Singapore",
      rules: {
        allowedStorageRegions: ["apac_singapore", "apac_tokyo"],
        allowedProcessingRegions: ["apac_singapore", "apac_tokyo"],
        exportBoundaries: ["apac_singapore", "apac_tokyo"],
        crossRegionReplicationAllowed: true
      }
    }
  ];
  for (const s of seeds) {
    regions.push({
      id: newId(),
      regionKey: s.key,
      displayName: s.name,
      rules: s.rules,
      status: "active",
      createdAt: nowIso()
    });
  }
}
seed();

export const residencyService = {
  async createRegion(input: {
    regionKey: ResidencyRegionKey;
    displayName: string;
    rules: ResidencyPolicyRules;
  }): Promise<ResidencyRegion> {
    const r: ResidencyRegion = {
      id: newId(),
      regionKey: input.regionKey,
      displayName: input.displayName,
      rules: input.rules,
      status: "active",
      createdAt: nowIso()
    };
    regions.push(r);
    return r;
  },

  archiveRegion(id: string) {
    const r = regions.find((x) => x.id === id);
    if (!r) return null;
    r.status = "archived";
    return r;
  },

  async assignTenant(input: { tenantId: string; regionId: string }): Promise<TenantResidencyAssignment | null> {
    const region = regions.find((r) => r.id === input.regionId);
    if (!region) return null;

    // Suspend any prior active assignments for this tenant
    for (const a of assignments) {
      if (a.tenantId === input.tenantId && a.status === "active") {
        a.status = "suspended";
        a.updatedAt = nowIso();
      }
    }
    const a: TenantResidencyAssignment = {
      id: newId(),
      tenantId: input.tenantId,
      regionId: region.id,
      regionKey: region.regionKey,
      status: "active",
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    assignments.push(a);
    await publishOutbox({
      id: newId(),
      eventType: "residency.tenant.assigned",
      aggregateId: a.id,
      aggregateType: "tenant_residency",
      payload: a,
      occurredAt: nowIso()
    });
    return a;
  },

  /**
   * Evaluate a proposed action against the tenant's resolved residency policy.
   */
  async evaluateAction(input: {
    tenantId: string;
    subjectType: string;
    subjectId: string;
    action: ResidencyEvaluationInput["action"];
    targetRegion: ResidencyRegionKey;
    sourceRegion?: ResidencyRegionKey;
  }): Promise<ResidencyEvaluationRecord | null> {
    const a = assignments.find((x) => x.tenantId === input.tenantId && x.status === "active");
    if (!a) return null;
    const region = regions.find((r) => r.id === a.regionId);
    if (!region) return null;

    const evaluation = evaluateResidency(
      { action: input.action, targetRegion: input.targetRegion, sourceRegion: input.sourceRegion },
      region.rules
    );

    const rec: ResidencyEvaluationRecord = {
      id: newId(),
      tenantId: input.tenantId,
      regionId: region.id,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      input: { action: input.action, targetRegion: input.targetRegion, sourceRegion: input.sourceRegion },
      evaluation,
      createdAt: nowIso()
    };
    evals.push(rec);

    if (evaluation.result !== "allow") {
      await publishOutbox({
        id: newId(),
        eventType: "residency.action.denied",
        aggregateId: rec.id,
        aggregateType: "residency_evaluation",
        payload: rec,
        occurredAt: nowIso()
      });
    }

    return rec;
  },

  // Read APIs
  listRegions: () => regions.filter((r) => r.status === "active"),
  findRegion: (id: string) => regions.find((r) => r.id === id) || null,
  findRegionByKey: (key: ResidencyRegionKey) => regions.find((r) => r.regionKey === key) || null,
  listAssignments: () => [...assignments].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  assignmentForTenant: (tenantId: string) => assignments.find((a) => a.tenantId === tenantId && a.status === "active") || null,
  listEvaluations: (limit?: number) => {
    const sorted = [...evals].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return limit ? sorted.slice(0, limit) : sorted;
  },
  recentDenials: (limit = 50) =>
    [...evals].filter((e) => e.evaluation.result !== "allow").sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit)
};
