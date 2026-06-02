import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import {
  evaluateExportControl,
  isPromotionAutoApproved,
  type ExportControlRules,
  type ExportControlType,
  type ExportEvaluation,
  type SovereignAssignmentStatus,
  type SovereignClassPolicy,
  type SovereignTier
} from "@crownx-jewel/shared-sovereignty";

export type SovereignClass = {
  id: string;
  classKey: string;
  displayName: string;
  tier: SovereignTier;
  policy: SovereignClassPolicy;
  createdAt: string;
};

export type TenantSovereignAssignment = {
  id: string;
  tenantId: string;
  sovereignClassId: string;
  classKey: string;
  status: SovereignAssignmentStatus;
  createdAt: string;
  updatedAt: string;
};

export type SovereignExportControl = {
  id: string;
  tenantId: string;
  controlType: ExportControlType;
  rules: ExportControlRules;
  createdAt: string;
};

export type ExportEvaluationRecord = {
  id: string;
  tenantId: string;
  controlType: ExportControlType;
  destinationRegion: string;
  evaluation: ExportEvaluation;
  createdAt: string;
};

export type PromotionRequest = {
  id: string;
  tenantId: string;
  fromEnvironment: string;
  toEnvironment: string;
  status: "pending" | "auto_approved" | "approved" | "denied";
  approverUserId: string | null;
  decisionAt: string | null;
  rationale: string;
  createdAt: string;
};

const classes: SovereignClass[] = [];
const assignments: TenantSovereignAssignment[] = [];
const controls: SovereignExportControl[] = [];
const evals: ExportEvaluationRecord[] = [];
const promotions: PromotionRequest[] = [];

/** Seed the four standard sovereign classes on boot. */
function seed() {
  if (classes.length > 0) return;
  const seeds: Array<{ key: string; name: string; tier: SovereignTier; policy: SovereignClassPolicy }> = [
    {
      key: "commercial_default", name: "Commercial (multi-tenant)", tier: "commercial",
      policy: {
        allowedRegions: ["us_east", "us_west", "eu_west", "apac_singapore"],
        blockedRegions: [],
        crossRegionRoutingAllowed: true,
        promotionRequiresApproval: false,
        keyMaterialPosture: "local_kms"
      }
    },
    {
      key: "regulated_enterprise", name: "Regulated Enterprise", tier: "regulated_enterprise",
      policy: {
        allowedRegions: ["us_east", "eu_west"],
        blockedRegions: [],
        crossRegionRoutingAllowed: true,
        promotionRequiresApproval: true,
        keyMaterialPosture: "hsm",
        notes: "FedRAMP-style controls; cross-region OK within same trust zone"
      }
    },
    {
      key: "sovereign_eu", name: "Sovereign EU (GDPR)", tier: "sovereign_dedicated",
      policy: {
        allowedRegions: ["eu_west", "eu_central"],
        blockedRegions: ["us_east", "us_west", "apac_singapore", "apac_tokyo"],
        crossRegionRoutingAllowed: false,
        promotionRequiresApproval: true,
        keyMaterialPosture: "byok",
        notes: "EU-only; no cross-region routing; bring-your-own-key required"
      }
    },
    {
      key: "air_gapped_gov", name: "Air-gapped Government", tier: "air_gapped",
      policy: {
        allowedRegions: ["us_east"],
        blockedRegions: ["us_west", "eu_west", "eu_central", "uk", "apac_singapore", "apac_tokyo", "canada", "brazil"],
        crossRegionRoutingAllowed: false,
        promotionRequiresApproval: true,
        keyMaterialPosture: "hsm",
        notes: "No outbound traffic; all promotions require sovereign-approval gate"
      }
    }
  ];
  for (const s of seeds) {
    classes.push({
      id: newId(),
      classKey: s.key,
      displayName: s.name,
      tier: s.tier,
      policy: s.policy,
      createdAt: nowIso()
    });
  }
}
seed();

export const sovereignService = {
  async createClass(input: {
    classKey: string;
    displayName: string;
    tier: SovereignTier;
    policy: SovereignClassPolicy;
  }): Promise<SovereignClass> {
    const c: SovereignClass = {
      id: newId(),
      classKey: input.classKey,
      displayName: input.displayName,
      tier: input.tier,
      policy: input.policy,
      createdAt: nowIso()
    };
    classes.push(c);
    return c;
  },

  async assignTenant(input: { tenantId: string; sovereignClassId: string }): Promise<TenantSovereignAssignment | null> {
    const cls = classes.find((c) => c.id === input.sovereignClassId);
    if (!cls) return null;
    // Suspend prior active assignments
    for (const a of assignments) {
      if (a.tenantId === input.tenantId && a.status === "active") {
        a.status = "suspended";
        a.updatedAt = nowIso();
      }
    }
    const a: TenantSovereignAssignment = {
      id: newId(),
      tenantId: input.tenantId,
      sovereignClassId: cls.id,
      classKey: cls.classKey,
      status: "active",
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    assignments.push(a);
    await publishOutbox({
      id: newId(),
      eventType: "sovereign.tenant.assigned",
      aggregateId: a.id,
      aggregateType: "sovereign_assignment",
      payload: a,
      occurredAt: nowIso()
    });
    return a;
  },

  async createExportControl(input: {
    tenantId: string;
    controlType: ExportControlType;
    rules: ExportControlRules;
  }): Promise<SovereignExportControl> {
    const c: SovereignExportControl = {
      id: newId(),
      tenantId: input.tenantId,
      controlType: input.controlType,
      rules: input.rules,
      createdAt: nowIso()
    };
    controls.push(c);
    return c;
  },

  async evaluateExport(input: {
    tenantId: string;
    controlType: ExportControlType;
    destinationRegion: string;
  }): Promise<ExportEvaluationRecord> {
    const ctl = controls.find((c) => c.tenantId === input.tenantId && c.controlType === input.controlType);
    const evaluation = ctl
      ? evaluateExportControl({ controlType: input.controlType, destinationRegion: input.destinationRegion, rules: ctl.rules })
      : { decision: "allow" as const, reasons: ["no export control configured; default allow"], evaluatedAt: nowIso() };

    const rec: ExportEvaluationRecord = {
      id: newId(),
      tenantId: input.tenantId,
      controlType: input.controlType,
      destinationRegion: input.destinationRegion,
      evaluation,
      createdAt: nowIso()
    };
    evals.push(rec);
    if (evaluation.decision !== "allow") {
      await publishOutbox({
        id: newId(),
        eventType: "sovereign.export.blocked",
        aggregateId: rec.id,
        aggregateType: "export_evaluation",
        payload: rec,
        occurredAt: nowIso()
      });
    }
    return rec;
  },

  /**
   * Submit a promotion request for a tenant moving between environments.
   * If the tenant's sovereign class auto-approves promotions for its tier,
   * the request is auto-approved; otherwise it stays pending.
   */
  async submitPromotion(input: {
    tenantId: string;
    fromEnvironment: string;
    toEnvironment: string;
    rationale: string;
  }): Promise<PromotionRequest | null> {
    const a = assignments.find((x) => x.tenantId === input.tenantId && x.status === "active");
    if (!a) return null;
    const cls = classes.find((c) => c.id === a.sovereignClassId);
    if (!cls) return null;

    const auto = isPromotionAutoApproved(cls.tier, cls.policy);
    const p: PromotionRequest = {
      id: newId(),
      tenantId: input.tenantId,
      fromEnvironment: input.fromEnvironment,
      toEnvironment: input.toEnvironment,
      status: auto ? "auto_approved" : "pending",
      approverUserId: null,
      decisionAt: auto ? nowIso() : null,
      rationale: input.rationale,
      createdAt: nowIso()
    };
    promotions.push(p);
    return p;
  },

  approvePromotion(id: string, approverUserId: string) {
    const p = promotions.find((x) => x.id === id);
    if (!p) return null;
    p.status = "approved";
    p.approverUserId = approverUserId;
    p.decisionAt = nowIso();
    return p;
  },

  denyPromotion(id: string, approverUserId: string) {
    const p = promotions.find((x) => x.id === id);
    if (!p) return null;
    p.status = "denied";
    p.approverUserId = approverUserId;
    p.decisionAt = nowIso();
    return p;
  },

  // Read APIs
  listClasses: () => [...classes],
  findClass: (id: string) => classes.find((c) => c.id === id) || null,
  classByKey: (key: string) => classes.find((c) => c.classKey === key) || null,
  listAssignments: () => [...assignments].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  assignmentForTenant: (tenantId: string) => assignments.find((a) => a.tenantId === tenantId && a.status === "active") || null,
  listControls: (tenantId?: string) => controls.filter((c) => !tenantId || c.tenantId === tenantId),
  listEvaluations: (limit?: number) => {
    const sorted = [...evals].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return limit ? sorted.slice(0, limit) : sorted;
  },
  listPromotions: () => [...promotions].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  pendingPromotions: () => promotions.filter((p) => p.status === "pending")
};
