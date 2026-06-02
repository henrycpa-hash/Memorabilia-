/**
 * Wave 10 enterprise planning + forecasting primitives. Account-plan
 * shape, scenario assumption modeling, deterministic forecast computation.
 *
 * Wave 10 ships a deterministic single-driver model
 * (revenue = baseline * (1 + growth) - readiness_drag - sovereignty_drag).
 * Wave 11 swaps in driver-forecast-model-service with multi-driver bottom-up
 * inputs and CRM/RevOps reconciliation.
 */
export type ScenarioType = "best_case" | "base_case" | "conservative" | "worst_case";

export type ConfidenceBand = "low" | "medium" | "high";

export type ForecastAssumptions = {
  /** Pre-tax revenue baseline (annualized cents). */
  baselineRevenueCents: number;
  /** Annual growth assumption in bps (1500 = 15%). */
  growthBps: number;
  /** Readiness score 0-100; high readiness = lower drag. */
  readinessScore: number;
  /** Sovereignty / residency complexity score 0-100. */
  sovereigntyComplexity: number;
  /** Probability of contract close in basis points. */
  closeProbabilityBps: number;
  /** Procurement cycle time in days; longer = more drag. */
  procurementCycleDays: number;
  /** Optional partner-channel uplift in bps. */
  partnerUpliftBps?: number;
};

export type ForecastResult = {
  scenarioType: ScenarioType;
  projectedRevenueCents: number;
  projectedUsageCents: number;
  /** Net of close probability, readiness drag, sovereignty drag. */
  expectedRevenueCents: number;
  /** Confidence band derived from inputs. */
  confidenceBand: ConfidenceBand;
  /** Reasons explaining material adjustments. */
  rationale: string[];
};

/**
 * Compute a deterministic forecast result for a given scenario type and
 * input assumptions.
 *
 *  - best_case applies +5% growth bonus
 *  - conservative applies -5% growth haircut
 *  - worst_case applies -10% growth haircut
 *  - base_case applies as-given
 */
export function runForecast(scenario: ScenarioType, a: ForecastAssumptions): ForecastResult {
  const rationale: string[] = [];
  let growthBps = a.growthBps;
  if (scenario === "best_case") { growthBps += 500; rationale.push("best_case: +5% growth bonus"); }
  else if (scenario === "conservative") { growthBps -= 500; rationale.push("conservative: -5% growth haircut"); }
  else if (scenario === "worst_case") { growthBps -= 1000; rationale.push("worst_case: -10% growth haircut"); }
  else { rationale.push("base_case: assumptions applied as-given"); }

  // Annualized revenue projection
  const grossProjected = Math.floor(a.baselineRevenueCents * (10000 + growthBps) / 10000);

  // Readiness drag: each missing 10 readiness points = -3% revenue
  const readinessDragPct = Math.max(0, (100 - a.readinessScore) * 0.003);
  const readinessDragCents = Math.floor(grossProjected * readinessDragPct);
  if (readinessDragCents > 0) rationale.push(`readiness drag: -${(readinessDragPct * 100).toFixed(1)}%`);

  // Sovereignty drag: each 10 complexity points = -2% revenue
  const sovDragPct = a.sovereigntyComplexity * 0.002;
  const sovDragCents = Math.floor(grossProjected * sovDragPct);
  if (sovDragCents > 0) rationale.push(`sovereignty drag: -${(sovDragPct * 100).toFixed(1)}%`);

  // Procurement cycle drag: every 30 days = -2% revenue
  const procDragPct = (a.procurementCycleDays / 30) * 0.02;
  const procDragCents = Math.floor(grossProjected * procDragPct);
  if (procDragCents > 0) rationale.push(`procurement cycle drag: -${(procDragPct * 100).toFixed(1)}%`);

  // Partner uplift bonus
  let partnerBonus = 0;
  if (a.partnerUpliftBps && a.partnerUpliftBps > 0) {
    partnerBonus = Math.floor(grossProjected * a.partnerUpliftBps / 10000);
    rationale.push(`partner uplift: +${(a.partnerUpliftBps / 100).toFixed(1)}%`);
  }

  const projectedRevenueCents = Math.max(0, grossProjected - readinessDragCents - sovDragCents - procDragCents + partnerBonus);
  const expectedRevenueCents = Math.floor(projectedRevenueCents * a.closeProbabilityBps / 10000);
  const projectedUsageCents = Math.floor(projectedRevenueCents * 0.6); // usage approximated as 60% of revenue

  // Confidence band heuristic
  let band: ConfidenceBand = "medium";
  if (a.readinessScore >= 80 && a.sovereigntyComplexity <= 20 && a.closeProbabilityBps >= 7000) band = "high";
  else if (a.readinessScore < 50 || a.sovereigntyComplexity >= 60 || a.closeProbabilityBps < 3000) band = "low";

  rationale.push(`close probability: ${(a.closeProbabilityBps / 100).toFixed(0)}%`);

  return {
    scenarioType: scenario,
    projectedRevenueCents,
    projectedUsageCents,
    expectedRevenueCents,
    confidenceBand: band,
    rationale
  };
}

export type AccountPlanMilestone = {
  milestoneKey: string;
  title: string;
  category: "commercial" | "compliance" | "implementation" | "expansion" | "renewal";
  targetDate: string;
  status: "planned" | "in_progress" | "complete" | "blocked";
};

export type AccountReadinessSummary = {
  readinessScore: number; // 0-100
  blockers: string[];
  dependencies: string[];
};

/** Compute an aggregate readiness score from a list of milestone statuses. */
export function computeReadinessScore(milestones: AccountPlanMilestone[]): number {
  if (milestones.length === 0) return 0;
  const weights = { complete: 1.0, in_progress: 0.5, planned: 0.2, blocked: 0.0 };
  const sum = milestones.reduce((acc, m) => acc + weights[m.status], 0);
  return Math.round((sum / milestones.length) * 100);
}
