import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";

const planningBase = () => process.env.ENTERPRISE_PLANNING_SERVICE_URL || "http://localhost:4065";

export type CrmProvider = "salesforce" | "hubspot" | "dynamics" | "manual_csv";

export type SyncStatus = "synced" | "pending" | "stale" | "error";

export type CrmAccountSync = {
  id: string;
  externalAccountId: string;
  internalAccountId: string | null;
  provider: CrmProvider;
  status: SyncStatus;
  /** Snapshot of CRM-side fields at last sync. */
  payload: {
    name: string;
    owner: string;
    segment: string;
    industry?: string;
    annualRevenueCents?: number;
  };
  lastSyncedAt: string;
  createdAt: string;
};

export type CrmOpportunitySync = {
  id: string;
  externalOpportunityId: string;
  internalOpportunityId: string | null;
  externalAccountId: string;
  provider: CrmProvider;
  status: SyncStatus;
  /** Native CRM stage (varies per provider) and normalized platform stage. */
  externalStage: string;
  platformStage: PlatformStage;
  /** CRM-supplied probability in basis points. */
  probabilityBps: number;
  estimatedCloseDate: string | null;
  amountCents: number;
  ownerUserId: string | null;
  lastSyncedAt: string;
  createdAt: string;
};

export type PlatformStage =
  | "discovery"
  | "qualification"
  | "evaluation"
  | "diligence"
  | "negotiation"
  | "executed"
  | "closed_lost";

export type ForecastReconciliation = {
  id: string;
  accountId: string;
  periodKey: string;
  /** Platform forecast snapshot (from enterprise-planning-service). */
  platformForecast: {
    expectedRevenueCents: number;
    confidenceBand: string;
  };
  /** CRM forecast snapshot (probability-weighted opportunity amount sum). */
  crmForecast: {
    weightedRevenueCents: number;
    rawAmountCents: number;
    opportunityCount: number;
  };
  /** Variance: platform - crm (cents). Positive = platform forecasts more. */
  varianceCents: number;
  /** Variance as percent of CRM forecast. */
  variancePct: number;
  createdAt: string;
};

const accountSyncs: CrmAccountSync[] = [];
const opportunitySyncs: CrmOpportunitySync[] = [];
const reconciliations: ForecastReconciliation[] = [];

/**
 * Stage probability normalization tables. Each provider has its own native
 * stage ladder; we map to the canonical platform stage ladder.
 */
const STAGE_MAPS: Record<CrmProvider, Record<string, PlatformStage>> = {
  salesforce: {
    "Prospecting": "discovery",
    "Qualification": "qualification",
    "Needs Analysis": "qualification",
    "Value Proposition": "evaluation",
    "Id. Decision Makers": "evaluation",
    "Proposal/Price Quote": "negotiation",
    "Negotiation/Review": "negotiation",
    "Closed Won": "executed",
    "Closed Lost": "closed_lost"
  },
  hubspot: {
    "appointmentscheduled": "discovery",
    "qualifiedtobuy": "qualification",
    "presentationscheduled": "evaluation",
    "decisionmakerboughtin": "diligence",
    "contractsent": "negotiation",
    "closedwon": "executed",
    "closedlost": "closed_lost"
  },
  dynamics: {
    "Qualify": "qualification",
    "Develop": "evaluation",
    "Propose": "negotiation",
    "Close": "executed"
  },
  manual_csv: {
    "discovery": "discovery", "qualification": "qualification", "evaluation": "evaluation",
    "diligence": "diligence", "negotiation": "negotiation", "executed": "executed", "closed_lost": "closed_lost"
  }
};

function normalizeStage(provider: CrmProvider, externalStage: string): PlatformStage {
  return STAGE_MAPS[provider][externalStage] || "discovery";
}

async function fetchOk<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

export const crmRevopsService = {
  async syncAccount(input: {
    externalAccountId: string;
    internalAccountId?: string;
    provider: CrmProvider;
    payload: CrmAccountSync["payload"];
  }): Promise<CrmAccountSync> {
    let existing = accountSyncs.find((a) => a.externalAccountId === input.externalAccountId && a.provider === input.provider);
    if (existing) {
      existing.payload = input.payload;
      existing.internalAccountId = input.internalAccountId || existing.internalAccountId;
      existing.status = "synced";
      existing.lastSyncedAt = nowIso();
      return existing;
    }
    const a: CrmAccountSync = {
      id: newId(),
      externalAccountId: input.externalAccountId,
      internalAccountId: input.internalAccountId || null,
      provider: input.provider,
      status: "synced",
      payload: input.payload,
      lastSyncedAt: nowIso(),
      createdAt: nowIso()
    };
    accountSyncs.push(a);
    await publishOutbox({
      id: newId(),
      eventType: "crm.account.synced",
      aggregateId: a.id,
      aggregateType: "crm_account_sync",
      payload: { id: a.id, externalAccountId: a.externalAccountId, provider: a.provider, name: a.payload.name },
      occurredAt: nowIso()
    });
    return a;
  },

  async syncOpportunity(input: {
    externalOpportunityId: string;
    externalAccountId: string;
    internalOpportunityId?: string;
    provider: CrmProvider;
    externalStage: string;
    probabilityBps?: number;
    estimatedCloseDate?: string;
    amountCents: number;
    ownerUserId?: string;
  }): Promise<CrmOpportunitySync> {
    const platformStage = normalizeStage(input.provider, input.externalStage);
    let existing = opportunitySyncs.find((o) => o.externalOpportunityId === input.externalOpportunityId && o.provider === input.provider);
    if (existing) {
      existing.externalStage = input.externalStage;
      existing.platformStage = platformStage;
      existing.probabilityBps = input.probabilityBps ?? existing.probabilityBps;
      existing.estimatedCloseDate = input.estimatedCloseDate || existing.estimatedCloseDate;
      existing.amountCents = input.amountCents;
      existing.ownerUserId = input.ownerUserId || existing.ownerUserId;
      existing.status = "synced";
      existing.lastSyncedAt = nowIso();
      return existing;
    }
    const o: CrmOpportunitySync = {
      id: newId(),
      externalOpportunityId: input.externalOpportunityId,
      externalAccountId: input.externalAccountId,
      internalOpportunityId: input.internalOpportunityId || null,
      provider: input.provider,
      status: "synced",
      externalStage: input.externalStage,
      platformStage,
      probabilityBps: input.probabilityBps ?? defaultProbabilityForStage(platformStage),
      estimatedCloseDate: input.estimatedCloseDate || null,
      amountCents: input.amountCents,
      ownerUserId: input.ownerUserId || null,
      lastSyncedAt: nowIso(),
      createdAt: nowIso()
    };
    opportunitySyncs.push(o);
    await publishOutbox({
      id: newId(),
      eventType: "crm.opportunity.synced",
      aggregateId: o.id,
      aggregateType: "crm_opportunity_sync",
      payload: { id: o.id, externalOpportunityId: o.externalOpportunityId, platformStage: o.platformStage, amountCents: o.amountCents },
      occurredAt: nowIso()
    });
    return o;
  },

  /**
   * Reconcile platform forecast vs CRM forecast for a given account+period.
   * Pulls platform forecast best-effort from enterprise-planning-service;
   * computes CRM forecast as probability-weighted opportunity amount sum.
   */
  async reconcile(input: {
    accountId: string;
    periodKey: string;
    /** External CRM accountId to match opportunities. */
    externalAccountId: string;
  }): Promise<ForecastReconciliation> {
    // Pull platform forecast (last run)
    const planRuns = await fetchOk<Array<{
      id: string; periodKey: string; scenarios: Array<{ scenarioType: string; expectedRevenueCents: number; confidenceBand: string }>;
    }>>(`${planningBase()}/planning/forecasts?accountId=${input.accountId}`);
    let platformExpected = 0;
    let confidence = "medium";
    if (planRuns && planRuns.length > 0) {
      const r = planRuns.find((x) => x.periodKey === input.periodKey) || planRuns[0];
      const baseCase = r.scenarios.find((s) => s.scenarioType === "base_case");
      if (baseCase) {
        platformExpected = baseCase.expectedRevenueCents;
        confidence = baseCase.confidenceBand;
      }
    }

    // CRM-side: weighted sum of opportunities for this externalAccountId
    const opps = opportunitySyncs.filter((o) => o.externalAccountId === input.externalAccountId && o.platformStage !== "closed_lost");
    let weighted = 0;
    let raw = 0;
    for (const o of opps) {
      raw += o.amountCents;
      weighted += Math.floor((o.amountCents * o.probabilityBps) / 10000);
    }

    const variance = platformExpected - weighted;
    const variancePct = weighted === 0 ? 0 : Math.round((variance / weighted) * 10000) / 100;

    const rec: ForecastReconciliation = {
      id: newId(),
      accountId: input.accountId,
      periodKey: input.periodKey,
      platformForecast: { expectedRevenueCents: platformExpected, confidenceBand: confidence },
      crmForecast: { weightedRevenueCents: weighted, rawAmountCents: raw, opportunityCount: opps.length },
      varianceCents: variance,
      variancePct,
      createdAt: nowIso()
    };
    reconciliations.push(rec);
    await publishOutbox({
      id: newId(),
      eventType: "crm.forecast.reconciled",
      aggregateId: rec.id,
      aggregateType: "forecast_reconciliation",
      payload: { id: rec.id, accountId: rec.accountId, periodKey: rec.periodKey, varianceCents: variance, variancePct },
      occurredAt: nowIso()
    });
    return rec;
  },

  /** Mark accounts/opportunities stale if their last sync is older than the cutoff. */
  markStale(maxAgeSeconds: number) {
    const cutoff = Date.now() - maxAgeSeconds * 1000;
    let n = 0;
    for (const a of accountSyncs) {
      if (a.status === "synced" && new Date(a.lastSyncedAt).getTime() < cutoff) { a.status = "stale"; n++; }
    }
    for (const o of opportunitySyncs) {
      if (o.status === "synced" && new Date(o.lastSyncedAt).getTime() < cutoff) { o.status = "stale"; n++; }
    }
    return { stale: n };
  },

  // Read APIs
  listAccounts: (provider?: CrmProvider, status?: SyncStatus) =>
    accountSyncs.filter((a) => (!provider || a.provider === provider) && (!status || a.status === status)),
  findAccountByExternal: (externalId: string, provider: CrmProvider) =>
    accountSyncs.find((a) => a.externalAccountId === externalId && a.provider === provider) || null,
  listOpportunities: (provider?: CrmProvider, externalAccountId?: string) =>
    opportunitySyncs.filter((o) => (!provider || o.provider === provider) && (!externalAccountId || o.externalAccountId === externalAccountId)),
  listReconciliations: (accountId?: string) =>
    reconciliations.filter((r) => !accountId || r.accountId === accountId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  pipelineSummary() {
    const accountsByStatus: Record<SyncStatus, number> = { synced: 0, pending: 0, stale: 0, error: 0 };
    for (const a of accountSyncs) accountsByStatus[a.status]++;
    const oppsByStage: Record<PlatformStage, number> = {
      discovery: 0, qualification: 0, evaluation: 0, diligence: 0, negotiation: 0, executed: 0, closed_lost: 0
    };
    for (const o of opportunitySyncs) oppsByStage[o.platformStage]++;
    return {
      totalAccounts: accountSyncs.length,
      totalOpportunities: opportunitySyncs.length,
      totalReconciliations: reconciliations.length,
      accountsByStatus,
      oppsByPlatformStage: oppsByStage
    };
  }
};

function defaultProbabilityForStage(stage: PlatformStage): number {
  switch (stage) {
    case "discovery": return 1000;
    case "qualification": return 2000;
    case "evaluation": return 3500;
    case "diligence": return 6000;
    case "negotiation": return 8000;
    case "executed": return 10000;
    case "closed_lost": return 0;
  }
}
