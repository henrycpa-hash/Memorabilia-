import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import { runForecast, type ForecastAssumptions, type ScenarioType } from "@crownx-jewel/shared-forecasting";

export type DriverCategory =
  | "revenue"
  | "usage"
  | "procurement"
  | "partner"
  | "residency"
  | "sovereignty"
  | "implementation"
  | "renewal";

export type ForecastDriver = {
  id: string;
  driverKey: string;
  category: DriverCategory;
  displayName: string;
  /** Default value used when caller does not supply an override. */
  defaultValue: number;
  /** Unit for documentation: bps, days, score, cents, count. */
  unit: "bps" | "days" | "score_0_100" | "cents" | "count" | "pct";
  /** Brief description for the planning portal. */
  description: string;
  createdAt: string;
};

export type DriverInput = {
  driverKey: string;
  value: number;
};

export type ForecastModelRun = {
  id: string;
  accountId: string;
  periodKey: string;
  scenarioType: ScenarioType;
  assumptions: ForecastAssumptions;
  /** Per-driver inputs that built the assumptions. */
  driverInputs: DriverInput[];
  result: ReturnType<typeof runForecast>;
  createdAt: string;
};

export type ForecastSensitivity = {
  id: string;
  runId: string;
  driverKey: string;
  /** Delta applied to the driver value. Either absolute or percent. */
  deltaType: "absolute" | "percent";
  deltaValue: number;
  /** Scenario used for sensitivity comparison. */
  scenarioType: ScenarioType;
  /** Result with the perturbed driver. */
  result: ReturnType<typeof runForecast>;
  /** Variance in expected revenue cents (perturbed - baseline). */
  varianceCents: number;
  createdAt: string;
};

const drivers: ForecastDriver[] = [];
const runs: ForecastModelRun[] = [];
const sensitivities: ForecastSensitivity[] = [];

/** Seed the canonical 8-driver model on boot. */
function seed() {
  if (drivers.length > 0) return;
  const seeds: Array<Omit<ForecastDriver, "id" | "createdAt">> = [
    { driverKey: "baseline_revenue_cents", category: "revenue", displayName: "Baseline annual revenue", defaultValue: 50_000_00, unit: "cents", description: "Pre-tax annualized revenue baseline" },
    { driverKey: "growth_bps", category: "revenue", displayName: "Annual growth (bps)", defaultValue: 1500, unit: "bps", description: "1500 bps = 15% growth" },
    { driverKey: "close_probability_bps", category: "revenue", displayName: "Close probability (bps)", defaultValue: 5000, unit: "bps", description: "5000 bps = 50% close prob" },
    { driverKey: "readiness_score", category: "implementation", displayName: "Implementation readiness", defaultValue: 70, unit: "score_0_100", description: "Higher = lower drag" },
    { driverKey: "sovereignty_complexity", category: "sovereignty", displayName: "Sovereignty complexity", defaultValue: 30, unit: "score_0_100", description: "Higher = more sovereign drag" },
    { driverKey: "procurement_cycle_days", category: "procurement", displayName: "Procurement cycle days", defaultValue: 60, unit: "days", description: "Longer = more drag" },
    { driverKey: "partner_uplift_bps", category: "partner", displayName: "Partner channel uplift (bps)", defaultValue: 0, unit: "bps", description: "Optional partner upside" },
    { driverKey: "residency_constraints_count", category: "residency", displayName: "Residency constraints", defaultValue: 0, unit: "count", description: "Count of region restrictions; informational only in v1" }
  ];
  for (const s of seeds) drivers.push({ id: newId(), createdAt: nowIso(), ...s });
}
seed();

/** Build ForecastAssumptions from driver inputs (with defaults filled in). */
function buildAssumptions(driverInputs: DriverInput[]): { assumptions: ForecastAssumptions; resolved: DriverInput[] } {
  const map = new Map(driverInputs.map((d) => [d.driverKey, d.value]));
  function pick(key: string): number {
    const v = map.get(key);
    if (v !== undefined) return v;
    const d = drivers.find((x) => x.driverKey === key);
    return d ? d.defaultValue : 0;
  }
  const assumptions: ForecastAssumptions = {
    baselineRevenueCents: pick("baseline_revenue_cents"),
    growthBps: pick("growth_bps"),
    readinessScore: pick("readiness_score"),
    sovereigntyComplexity: pick("sovereignty_complexity"),
    closeProbabilityBps: pick("close_probability_bps"),
    procurementCycleDays: pick("procurement_cycle_days"),
    partnerUpliftBps: pick("partner_uplift_bps")
  };
  // Resolved input list — what we actually used
  const resolved: DriverInput[] = drivers
    .filter((d) => ["baseline_revenue_cents", "growth_bps", "readiness_score", "sovereignty_complexity", "close_probability_bps", "procurement_cycle_days", "partner_uplift_bps"].includes(d.driverKey))
    .map((d) => ({ driverKey: d.driverKey, value: map.get(d.driverKey) ?? d.defaultValue }));
  return { assumptions, resolved };
}

export const driverForecastService = {
  async addDriver(input: Omit<ForecastDriver, "id" | "createdAt">): Promise<ForecastDriver> {
    const d: ForecastDriver = { id: newId(), createdAt: nowIso(), ...input };
    drivers.push(d);
    return d;
  },

  async runModel(input: {
    accountId: string;
    periodKey: string;
    scenarioType: ScenarioType;
    driverInputs: DriverInput[];
  }): Promise<ForecastModelRun> {
    const { assumptions, resolved } = buildAssumptions(input.driverInputs);
    const result = runForecast(input.scenarioType, assumptions);
    const run: ForecastModelRun = {
      id: newId(),
      accountId: input.accountId,
      periodKey: input.periodKey,
      scenarioType: input.scenarioType,
      assumptions,
      driverInputs: resolved,
      result,
      createdAt: nowIso()
    };
    runs.push(run);
    await publishOutbox({
      id: newId(),
      eventType: "forecast.driver.run",
      aggregateId: run.id,
      aggregateType: "forecast_model_run",
      payload: {
        runId: run.id,
        accountId: run.accountId,
        periodKey: run.periodKey,
        scenarioType: run.scenarioType,
        expectedRevenueCents: result.expectedRevenueCents,
        confidenceBand: result.confidenceBand
      },
      occurredAt: nowIso()
    });
    return run;
  },

  /**
   * Sensitivity analysis: re-run the same scenario with one driver perturbed.
   * Variance reports the delta in expected revenue versus the baseline run.
   */
  async runSensitivity(input: {
    runId: string;
    driverKey: string;
    deltaType: "absolute" | "percent";
    deltaValue: number;
  }): Promise<ForecastSensitivity | null> {
    const baseRun = runs.find((r) => r.id === input.runId);
    if (!baseRun) return null;

    const newInputs = baseRun.driverInputs.map((d) => {
      if (d.driverKey !== input.driverKey) return { ...d };
      let newValue = d.value;
      if (input.deltaType === "absolute") newValue = d.value + input.deltaValue;
      else newValue = Math.round(d.value * (1 + input.deltaValue / 100));
      return { driverKey: d.driverKey, value: newValue };
    });
    const { assumptions } = buildAssumptions(newInputs);
    const perturbed = runForecast(baseRun.scenarioType, assumptions);

    const sens: ForecastSensitivity = {
      id: newId(),
      runId: baseRun.id,
      driverKey: input.driverKey,
      deltaType: input.deltaType,
      deltaValue: input.deltaValue,
      scenarioType: baseRun.scenarioType,
      result: perturbed,
      varianceCents: perturbed.expectedRevenueCents - baseRun.result.expectedRevenueCents,
      createdAt: nowIso()
    };
    sensitivities.push(sens);
    return sens;
  },

  // Read APIs
  listDrivers: (category?: DriverCategory) => drivers.filter((d) => !category || d.category === category),
  findDriver: (id: string) => drivers.find((d) => d.id === id) || null,
  driverByKey: (k: string) => drivers.find((d) => d.driverKey === k) || null,
  listRuns: (accountId?: string) =>
    runs.filter((r) => !accountId || r.accountId === accountId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  findRun: (id: string) => runs.find((r) => r.id === id) || null,
  sensitivitiesForRun: (runId: string) => sensitivities.filter((s) => s.runId === runId).sort((a, b) => a.driverKey.localeCompare(b.driverKey)),
  pipelineSummary() {
    return {
      totalDrivers: drivers.length,
      totalRuns: runs.length,
      totalSensitivities: sensitivities.length,
      uniqueAccounts: new Set(runs.map((r) => r.accountId)).size
    };
  }
};
