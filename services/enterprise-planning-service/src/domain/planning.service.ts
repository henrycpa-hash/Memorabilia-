import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import {
  computeReadinessScore,
  runForecast,
  type AccountPlanMilestone,
  type ConfidenceBand,
  type ForecastAssumptions,
  type ForecastResult,
  type ScenarioType
} from "@crownx-jewel/shared-forecasting";

const billingBase = () => process.env.BILLING_METERING_SERVICE_URL || "http://localhost:4039";
const reportingBase = () => process.env.REPORTING_SERVICE_URL || "http://localhost:4028";
const salesBase = () => process.env.SALES_DILIGENCE_AUTOMATION_SERVICE_URL || "http://localhost:4059";

export type StrategicAccountStatus = "active" | "paused" | "expansion" | "renewal" | "churned";

export type StrategicAccount = {
  id: string;
  accountName: string;
  ownerUserId: string | null;
  /** Optional CRM linkage (Wave 11 will sync). */
  crmAccountRef: string | null;
  /** Optional opportunityId from sales-diligence-automation-service. */
  opportunityId: string | null;
  /** Sovereignty class linkage (commercial / regulated_enterprise / sovereign / air_gapped). */
  sovereigntyTier: "commercial" | "regulated_enterprise" | "sovereign_dedicated" | "air_gapped";
  status: StrategicAccountStatus;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type AccountPlan = {
  id: string;
  accountId: string;
  periodKey: string;
  milestones: AccountPlanMilestone[];
  /** Free-form blockers / dependencies / strategic notes. */
  blockers: string[];
  dependencies: string[];
  /** Cached readiness score from milestones. */
  readinessScore: number;
  authorUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ScenarioModel = {
  id: string;
  accountId: string;
  scenarioName: string;
  assumptions: ForecastAssumptions;
  createdAt: string;
};

export type ForecastRun = {
  id: string;
  accountId: string;
  periodKey: string;
  scenarioModelId: string | null;
  scenarios: ForecastResult[];
  /** Highest-confidence scenario across the bundle. */
  primaryConfidence: ConfidenceBand;
  /** Optional CRM-side baseline pulled at runtime. */
  crmBaselineCents: number | null;
  /** Variance between platform forecast vs CRM (Wave 11 wiring). */
  varianceVsCrmCents: number | null;
  createdAt: string;
};

const accounts: StrategicAccount[] = [];
const plans: AccountPlan[] = [];
const scenarios: ScenarioModel[] = [];
const runs: ForecastRun[] = [];

async function fetchOk<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

export const planningService = {
  async createAccount(input: {
    accountName: string;
    ownerUserId?: string;
    sovereigntyTier?: StrategicAccount["sovereigntyTier"];
    crmAccountRef?: string;
    opportunityId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<StrategicAccount> {
    const a: StrategicAccount = {
      id: newId(),
      accountName: input.accountName,
      ownerUserId: input.ownerUserId || null,
      crmAccountRef: input.crmAccountRef || null,
      opportunityId: input.opportunityId || null,
      sovereigntyTier: input.sovereigntyTier || "commercial",
      status: "active",
      metadata: input.metadata || {},
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    accounts.push(a);
    await publishOutbox({
      id: newId(),
      eventType: "planning.account.created",
      aggregateId: a.id,
      aggregateType: "strategic_account",
      payload: { id: a.id, accountName: a.accountName, sovereigntyTier: a.sovereigntyTier },
      occurredAt: nowIso()
    });
    return a;
  },

  setAccountStatus(id: string, status: StrategicAccountStatus) {
    const a = accounts.find((x) => x.id === id);
    if (!a) return null;
    a.status = status;
    a.updatedAt = nowIso();
    return a;
  },

  async createPlan(input: {
    accountId: string;
    periodKey: string;
    milestones?: AccountPlanMilestone[];
    blockers?: string[];
    dependencies?: string[];
    authorUserId?: string;
  }): Promise<AccountPlan | null> {
    const account = accounts.find((a) => a.id === input.accountId);
    if (!account) return null;
    const milestones = input.milestones || [];
    const p: AccountPlan = {
      id: newId(),
      accountId: account.id,
      periodKey: input.periodKey,
      milestones,
      blockers: input.blockers || [],
      dependencies: input.dependencies || [],
      readinessScore: computeReadinessScore(milestones),
      authorUserId: input.authorUserId || null,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    plans.push(p);
    return p;
  },

  /** Patch milestones / blockers / dependencies on a plan. */
  updatePlan(input: {
    id: string;
    milestones?: AccountPlanMilestone[];
    blockers?: string[];
    dependencies?: string[];
  }) {
    const p = plans.find((x) => x.id === input.id);
    if (!p) return null;
    if (input.milestones) {
      p.milestones = input.milestones;
      p.readinessScore = computeReadinessScore(p.milestones);
    }
    if (input.blockers) p.blockers = input.blockers;
    if (input.dependencies) p.dependencies = input.dependencies;
    p.updatedAt = nowIso();
    return p;
  },

  async createScenario(input: {
    accountId: string;
    scenarioName: string;
    assumptions: ForecastAssumptions;
  }): Promise<ScenarioModel | null> {
    const account = accounts.find((a) => a.id === input.accountId);
    if (!account) return null;
    const s: ScenarioModel = {
      id: newId(),
      accountId: account.id,
      scenarioName: input.scenarioName,
      assumptions: input.assumptions,
      createdAt: nowIso()
    };
    scenarios.push(s);
    return s;
  },

  /**
   * Run a forecast bundle (best/base/conservative/worst by default).
   * If `scenarioModelId` is supplied, uses its assumptions; otherwise
   * caller can pass assumptions directly.
   *
   * Best-effort pulls a CRM baseline from `reporting-service` if reachable.
   */
  async runForecastBundle(input: {
    accountId: string;
    periodKey: string;
    scenarioModelId?: string;
    assumptions?: ForecastAssumptions;
    scenarioTypes?: ScenarioType[];
  }): Promise<ForecastRun | null> {
    const account = accounts.find((a) => a.id === input.accountId);
    if (!account) return null;

    let assumptions: ForecastAssumptions | undefined = input.assumptions;
    let scenarioModelId: string | null = input.scenarioModelId || null;
    if (input.scenarioModelId) {
      const s = scenarios.find((x) => x.id === input.scenarioModelId);
      if (s) assumptions = s.assumptions;
    }
    if (!assumptions) {
      // Default placeholder assumptions if none supplied
      assumptions = {
        baselineRevenueCents: 0,
        growthBps: 1500,
        readinessScore: 50,
        sovereigntyComplexity: 30,
        closeProbabilityBps: 5000,
        procurementCycleDays: 60
      };
    }

    // Best-effort CRM baseline pull (reporting-service for Wave 10; Wave 11 swaps to crm-revops-sync-service)
    const baseline = await fetchOk<{ projectedRevenueCents: number }>(
      `${reportingBase()}/reports/account-baseline?accountId=${account.id}`
    );
    let crmBaselineCents: number | null = null;
    if (baseline && typeof baseline.projectedRevenueCents === "number") {
      crmBaselineCents = baseline.projectedRevenueCents;
    }

    const types: ScenarioType[] = input.scenarioTypes || ["best_case", "base_case", "conservative", "worst_case"];
    const results: ForecastResult[] = types.map((t) => runForecast(t, assumptions!));

    // Pick "highest" confidence band across bundle (high > medium > low)
    const order: ConfidenceBand[] = ["high", "medium", "low"];
    let primaryConfidence: ConfidenceBand = "low";
    for (const c of order) {
      if (results.some((r) => r.confidenceBand === c)) { primaryConfidence = c; break; }
    }

    const baseCase = results.find((r) => r.scenarioType === "base_case");
    const variance = (crmBaselineCents !== null && baseCase)
      ? baseCase.expectedRevenueCents - crmBaselineCents
      : null;

    const run: ForecastRun = {
      id: newId(),
      accountId: account.id,
      periodKey: input.periodKey,
      scenarioModelId,
      scenarios: results,
      primaryConfidence,
      crmBaselineCents,
      varianceVsCrmCents: variance,
      createdAt: nowIso()
    };
    runs.push(run);
    await publishOutbox({
      id: newId(),
      eventType: "planning.forecast.completed",
      aggregateId: run.id,
      aggregateType: "forecast_run",
      payload: { runId: run.id, accountId: account.id, periodKey: run.periodKey, primaryConfidence: run.primaryConfidence },
      occurredAt: nowIso()
    });
    return run;
  },

  // Read APIs
  listAccounts: (status?: StrategicAccountStatus) =>
    accounts.filter((a) => !status || a.status === status).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  findAccount: (id: string) => accounts.find((a) => a.id === id) || null,
  listPlans: (accountId?: string) =>
    plans.filter((p) => !accountId || p.accountId === accountId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  findPlan: (id: string) => plans.find((p) => p.id === id) || null,
  listScenarios: (accountId?: string) =>
    scenarios.filter((s) => !accountId || s.accountId === accountId),
  listRuns: (accountId?: string) =>
    runs.filter((r) => !accountId || r.accountId === accountId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  findRun: (id: string) => runs.find((r) => r.id === id) || null,

  /** Executive forecast roll-up for the enterprise-planning-portal. */
  pipelineSummary() {
    const totalAccounts = accounts.length;
    const byStatus: Record<StrategicAccountStatus, number> = { active: 0, paused: 0, expansion: 0, renewal: 0, churned: 0 };
    const byTier: Record<StrategicAccount["sovereigntyTier"], number> = {
      commercial: 0, regulated_enterprise: 0, sovereign_dedicated: 0, air_gapped: 0
    };
    for (const a of accounts) { byStatus[a.status]++; byTier[a.sovereigntyTier]++; }

    // Sum the most recent base-case expected revenue for each account
    const accountsWithRuns = new Set(runs.map((r) => r.accountId));
    let totalExpectedRevenueCents = 0;
    let totalProjectedRevenueCents = 0;
    for (const accountId of accountsWithRuns) {
      const r = runs.filter((x) => x.accountId === accountId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      if (!r) continue;
      const baseCase = r.scenarios.find((s) => s.scenarioType === "base_case");
      if (baseCase) {
        totalExpectedRevenueCents += baseCase.expectedRevenueCents;
        totalProjectedRevenueCents += baseCase.projectedRevenueCents;
      }
    }
    const blockerCount = plans.reduce((sum, p) => sum + p.blockers.length, 0);
    const avgReadiness = plans.length === 0 ? 0 : Math.round(plans.reduce((s, p) => s + p.readinessScore, 0) / plans.length);
    return {
      totalAccounts,
      byStatus,
      byTier,
      totalForecastRuns: runs.length,
      totalExpectedRevenueCents,
      totalProjectedRevenueCents,
      blockerCount,
      avgReadinessScore: avgReadiness
    };
  }
};
