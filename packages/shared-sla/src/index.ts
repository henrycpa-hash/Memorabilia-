/**
 * Wave 7 SLA & usage governance primitives.
 *
 * SLA profiles attach to tenants or partners. Targets are typed; observations
 * compute breach status deterministically.
 */
export type SlaTargetKey =
  | "api_uptime_pct"
  | "partner_sync_freshness_minutes"
  | "settlement_completion_hours"
  | "dispute_response_hours"
  | "connector_recovery_minutes"
  | "report_generation_minutes";

export type SlaTargets = Partial<Record<SlaTargetKey, number>>;

export type SlaObservation = Partial<Record<SlaTargetKey, number>>;

export type SlaProfileStatus = "active" | "suspended" | "archived";

export type SlaBreachSeverity = "info" | "warning" | "critical";

export type SlaBreach = {
  targetKey: SlaTargetKey;
  observed: number;
  target: number;
  delta: number;
  severity: SlaBreachSeverity;
  reason: string;
};

/**
 * Compare an observation to targets. For "minutes/hours" targets, breach
 * occurs when observed > target. For uptime, breach occurs when observed < target.
 * Severity scales by how far off the observation is.
 */
export function detectBreaches(observation: SlaObservation, targets: SlaTargets): SlaBreach[] {
  const out: SlaBreach[] = [];
  for (const [k, observed] of Object.entries(observation) as Array<[SlaTargetKey, number]>) {
    const target = targets[k];
    if (target == null) continue;
    let breached = false;
    let delta = 0;
    if (k === "api_uptime_pct") {
      if (observed < target) {
        breached = true;
        delta = target - observed;
      }
    } else {
      if (observed > target) {
        breached = true;
        delta = observed - target;
      }
    }
    if (!breached) continue;
    let severity: SlaBreachSeverity = "info";
    const ratio = target > 0 ? delta / target : 1;
    if (ratio >= 0.5) severity = "critical";
    else if (ratio >= 0.15) severity = "warning";
    out.push({
      targetKey: k,
      observed,
      target,
      delta: Number(delta.toFixed(4)),
      severity,
      reason: `observed ${observed} vs target ${target} (delta ${delta.toFixed(2)})`
    });
  }
  return out;
}
