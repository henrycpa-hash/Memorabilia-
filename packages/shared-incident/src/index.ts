/**
 * Wave 11 sovereignty-class incident orchestration primitives. Incident
 * classification by sovereignty tier + region + data sensitivity, runbook
 * selection, escalation path resolution.
 */
export type SovereigntyClassKey =
  | "commercial"
  | "regulated_enterprise"
  | "sovereign_dedicated"
  | "air_gapped";

export type IncidentType =
  | "data_breach"
  | "service_outage"
  | "regulator_inquiry"
  | "key_compromise"
  | "residency_violation"
  | "subprocessor_failure"
  | "fraud_detected"
  | "compliance_breach";

export type IncidentSeverity = "low" | "medium" | "high" | "critical";

export type IncidentStatus =
  | "triaging"
  | "active"
  | "contained"
  | "remediating"
  | "resolved"
  | "closed";

export type RunbookActionType =
  | "isolate_tenant"
  | "rotate_keys"
  | "freeze_export"
  | "open_legal_escalation"
  | "open_regulator_notice"
  | "notify_executives"
  | "open_residency_review"
  | "publish_postmortem"
  | "engage_external_counsel"
  | "engage_breach_response";

export type RunbookActionStatus = "queued" | "running" | "completed" | "skipped" | "failed";

export type IncidentClassification = {
  /** Final incident severity after applying sovereignty escalations. */
  severity: IncidentSeverity;
  /** Whether legal escalation should be opened (regulator_sensitive+). */
  legalEscalationRequired: boolean;
  /** Whether a regulator notice should be drafted. */
  regulatorNoticeRequired: boolean;
  /** Whether export to external regions must be halted during response. */
  freezeExports: boolean;
  /** Whether residency review is required. */
  residencyReviewRequired: boolean;
  /** Reasoning for the classification decisions. */
  reasoning: string[];
};

/**
 * Classify an incident by sovereignty class, type, and base severity.
 * Sovereign tiers escalate: sovereign_dedicated and air_gapped automatically
 * raise severity by one band and force regulator/legal/residency hooks.
 */
export function classifyIncident(input: {
  sovereigntyClassKey: SovereigntyClassKey;
  incidentType: IncidentType;
  baseSeverity: IncidentSeverity;
  affectsCrossRegion: boolean;
  involvesRegulatedData: boolean;
}): IncidentClassification {
  const reasoning: string[] = [];

  // Severity escalation by sovereignty tier
  let severity: IncidentSeverity = input.baseSeverity;
  if (input.sovereigntyClassKey === "sovereign_dedicated" || input.sovereigntyClassKey === "air_gapped") {
    const order: IncidentSeverity[] = ["low", "medium", "high", "critical"];
    const idx = order.indexOf(severity);
    if (idx >= 0 && idx < order.length - 1) {
      severity = order[idx + 1];
      reasoning.push(`${input.sovereigntyClassKey}: severity bumped to ${severity}`);
    }
  }

  // Type-driven escalations
  let legalEscalationRequired = false;
  let regulatorNoticeRequired = false;
  let freezeExports = false;
  let residencyReviewRequired = false;

  if (input.incidentType === "data_breach" || input.incidentType === "compliance_breach") {
    regulatorNoticeRequired = true;
    legalEscalationRequired = true;
    reasoning.push(`${input.incidentType} requires regulator notice + legal escalation`);
  }
  if (input.incidentType === "key_compromise") {
    legalEscalationRequired = true;
    freezeExports = true;
    reasoning.push("key compromise: freeze exports + legal escalation");
  }
  if (input.incidentType === "residency_violation") {
    residencyReviewRequired = true;
    legalEscalationRequired = true;
    freezeExports = true;
    reasoning.push("residency_violation: freeze exports + residency review");
  }

  // Severity floors
  if (severity === "critical" || severity === "high") {
    legalEscalationRequired = true;
  }
  if (input.affectsCrossRegion) {
    residencyReviewRequired = true;
    reasoning.push("cross-region impact: residency review");
  }
  if (input.involvesRegulatedData && severity !== "low") {
    regulatorNoticeRequired = true;
    reasoning.push("regulated data + non-low severity: regulator notice");
  }

  return {
    severity,
    legalEscalationRequired,
    regulatorNoticeRequired,
    freezeExports,
    residencyReviewRequired,
    reasoning
  };
}

/** Select runbook actions for a classified incident. Order is preserved. */
export function selectRunbookActions(c: IncidentClassification, sovereignty: SovereigntyClassKey): RunbookActionType[] {
  const actions: RunbookActionType[] = [];
  if (c.severity === "critical" || c.severity === "high") {
    actions.push("notify_executives");
  }
  if (c.freezeExports) actions.push("freeze_export");
  if (c.residencyReviewRequired) actions.push("open_residency_review");
  if (c.legalEscalationRequired) {
    actions.push("open_legal_escalation");
    if (c.severity === "critical") actions.push("engage_external_counsel");
  }
  if (c.regulatorNoticeRequired) actions.push("open_regulator_notice");
  if (sovereignty === "sovereign_dedicated" || sovereignty === "air_gapped") {
    if (!actions.includes("rotate_keys") && c.severity !== "low") actions.push("rotate_keys");
  }
  if (c.severity === "critical") {
    actions.push("engage_breach_response");
    actions.push("isolate_tenant");
  }
  actions.push("publish_postmortem");
  return actions;
}
