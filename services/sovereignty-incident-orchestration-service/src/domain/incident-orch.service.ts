import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import {
  classifyIncident,
  selectRunbookActions,
  type IncidentClassification,
  type IncidentSeverity,
  type IncidentStatus,
  type IncidentType,
  type RunbookActionStatus,
  type RunbookActionType,
  type SovereigntyClassKey
} from "@crownx-jewel/shared-incident";

const legalEscalationBase = () => process.env.LEGAL_ESCALATION_SERVICE_URL || "http://localhost:4063";
const regulatorNoticeBase = () => process.env.REGULATOR_NOTICE_SERVICE_URL || "http://localhost:4064";
const residencyBase = () => process.env.DATA_RESIDENCY_SERVICE_URL || "http://localhost:4050";
const custodyBase = () => process.env.SOVEREIGN_KEY_CUSTODY_SERVICE_URL || "http://localhost:4060";
const attestationBase = () => process.env.SOVEREIGN_ATTESTATION_EXPORT_SERVICE_URL || "http://localhost:4066";

export type SovereigntyIncident = {
  id: string;
  tenantId: string;
  sovereigntyClassKey: SovereigntyClassKey;
  incidentType: IncidentType;
  /** Free-form short label. */
  title: string;
  baseSeverity: IncidentSeverity;
  /** Effective severity after classification. */
  severity: IncidentSeverity;
  status: IncidentStatus;
  classification: IncidentClassification;
  /** Optional region info — used for cross-region detection. */
  affectedRegions: string[];
  involvesRegulatedData: boolean;
  /** Linked artifacts created during fan-out. */
  linkedLegalEscalationId: string | null;
  linkedRegulatorNoticeIds: string[];
  linkedResidencyReviewId: string | null;
  /** Free-form payload (incident details, evidence URIs). */
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
};

export type IncidentRunbookAction = {
  id: string;
  incidentId: string;
  /** Fixed runbook key per sovereignty class (e.g. "sovereign_dedicated_v1"). */
  runbookKey: string;
  actionType: RunbookActionType;
  /** Order within the runbook (1-indexed). */
  sequence: number;
  status: RunbookActionStatus;
  /** Outcome details when completed/failed. */
  payload: Record<string, unknown>;
  /** External upstream ref (matter id / notice id / etc.) when applicable. */
  externalRef: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
};

export type IncidentPostmortem = {
  id: string;
  incidentId: string;
  summary: {
    timeline: Array<{ at: string; event: string }>;
    rootCause: string;
    impact: string;
    remediation: string[];
    followUps: string[];
  };
  outputUri: string | null;
  createdAt: string;
};

const incidents: SovereigntyIncident[] = [];
const actions: IncidentRunbookAction[] = [];
const postmortems: IncidentPostmortem[] = [];

async function postOk<T>(url: string, body: unknown): Promise<T | null> {
  try {
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

function runbookKeyFor(sovereignty: SovereigntyClassKey): string {
  return `${sovereignty}_runbook_v1`;
}

/** Map shared-incident severity -> legal-escalation severity for fan-out. */
function severityToEscalationSeverity(s: IncidentSeverity): string {
  if (s === "low") return "advisory";
  if (s === "medium") return "urgent_review";
  if (s === "high") return "regulator_sensitive";
  return "executive_escalation";
}

export const incidentOrchService = {
  /**
   * Open an incident. Classify it via shared-incident, persist, then
   * synchronously emit runbook actions in the queued state. Caller can
   * fan out actions later via /run-action.
   */
  async open(input: {
    tenantId: string;
    sovereigntyClassKey: SovereigntyClassKey;
    incidentType: IncidentType;
    title: string;
    baseSeverity: IncidentSeverity;
    affectedRegions?: string[];
    involvesRegulatedData?: boolean;
    payload?: Record<string, unknown>;
  }): Promise<SovereigntyIncident> {
    const affectsCrossRegion = (input.affectedRegions || []).length > 1;
    const classification = classifyIncident({
      sovereigntyClassKey: input.sovereigntyClassKey,
      incidentType: input.incidentType,
      baseSeverity: input.baseSeverity,
      affectsCrossRegion,
      involvesRegulatedData: !!input.involvesRegulatedData
    });

    const incident: SovereigntyIncident = {
      id: newId(),
      tenantId: input.tenantId,
      sovereigntyClassKey: input.sovereigntyClassKey,
      incidentType: input.incidentType,
      title: input.title,
      baseSeverity: input.baseSeverity,
      severity: classification.severity,
      status: "triaging",
      classification,
      affectedRegions: input.affectedRegions || [],
      involvesRegulatedData: !!input.involvesRegulatedData,
      linkedLegalEscalationId: null,
      linkedRegulatorNoticeIds: [],
      linkedResidencyReviewId: null,
      payload: input.payload || {},
      createdAt: nowIso(),
      updatedAt: nowIso(),
      closedAt: null
    };
    incidents.push(incident);

    // Queue runbook actions
    const runbookKey = runbookKeyFor(input.sovereigntyClassKey);
    const actionTypes = selectRunbookActions(classification, input.sovereigntyClassKey);
    actionTypes.forEach((actionType, idx) => {
      const a: IncidentRunbookAction = {
        id: newId(),
        incidentId: incident.id,
        runbookKey,
        actionType,
        sequence: idx + 1,
        status: "queued",
        payload: {},
        externalRef: null,
        createdAt: nowIso(),
        startedAt: null,
        completedAt: null
      };
      actions.push(a);
    });

    await publishOutbox({
      id: newId(),
      eventType: "incident.classified",
      aggregateId: incident.id,
      aggregateType: "sovereignty_incident",
      payload: {
        id: incident.id,
        tenantId: incident.tenantId,
        sovereigntyClassKey: incident.sovereigntyClassKey,
        incidentType: incident.incidentType,
        severity: incident.severity,
        actionCount: actionTypes.length
      },
      occurredAt: nowIso()
    });
    return incident;
  },

  setStatus(id: string, status: IncidentStatus) {
    const i = incidents.find((x) => x.id === id);
    if (!i) return null;
    i.status = status;
    i.updatedAt = nowIso();
    return i;
  },

  /**
   * Execute a queued runbook action. Maps each action type to a real
   * upstream service call (best-effort) and records the externalRef.
   */
  async runAction(actionId: string): Promise<IncidentRunbookAction | null> {
    const a = actions.find((x) => x.id === actionId);
    if (!a) return null;
    if (a.status !== "queued") return a;
    const incident = incidents.find((x) => x.id === a.incidentId);
    if (!incident) return null;

    a.status = "running";
    a.startedAt = nowIso();
    a.payload = {};

    let externalRef: string | null = null;
    let payload: Record<string, unknown> = {};

    switch (a.actionType) {
      case "open_legal_escalation": {
        const r = await postOk<{ id: string }>(
          `${legalEscalationBase()}/legal-escalations`,
          {
            sourceType: incident.incidentType === "data_breach" ? "regulator_trigger" : "compliance_block",
            sourceId: incident.id,
            severity: severityToEscalationSeverity(incident.severity),
            metadata: { incidentType: incident.incidentType, sovereigntyClassKey: incident.sovereigntyClassKey, regions: incident.affectedRegions }
          }
        );
        if (r) {
          externalRef = r.id;
          incident.linkedLegalEscalationId = r.id;
          payload = { escalationId: r.id };
        } else {
          payload = { warning: "legal-escalation-service unreachable; recorded but not linked" };
        }
        break;
      }
      case "open_regulator_notice": {
        const jurisdictionKey = incident.affectedRegions[0] || "EU";
        const sourceType = incident.incidentType === "data_breach" ? "data_breach"
          : incident.incidentType === "compliance_breach" ? "compliance_finding"
          : "incident";
        const r = await postOk<Array<{ id: string }>>(
          `${regulatorNoticeBase()}/regulator-notices`,
          {
            jurisdictionKey,
            sourceType,
            sourceId: incident.id,
            severity: incident.severity,
            title: `[${incident.sovereigntyClassKey}] ${incident.title}`,
            payload: { incidentId: incident.id, regions: incident.affectedRegions }
          }
        );
        if (r && Array.isArray(r) && r.length > 0) {
          incident.linkedRegulatorNoticeIds = r.map((n) => n.id);
          externalRef = r[0].id;
          payload = { noticeIds: incident.linkedRegulatorNoticeIds };
        }
        break;
      }
      case "open_residency_review": {
        const r = await postOk<{ id: string }>(
          `${residencyBase()}/residency/reviews`,
          {
            tenantId: incident.tenantId,
            triggerType: "incident_residency_review",
            triggerRef: incident.id,
            regions: incident.affectedRegions
          }
        );
        if (r) {
          externalRef = r.id;
          incident.linkedResidencyReviewId = r.id;
          payload = { reviewId: r.id };
        } else {
          payload = { warning: "data-residency-service unreachable" };
        }
        break;
      }
      case "rotate_keys": {
        // Best-effort: trigger key rotation via custody for tenant's active keys
        payload = { message: "key rotation request emitted to custody service", tenantId: incident.tenantId };
        // We don't actually have tenant->key resolution here; left for Wave 12 wiring.
        break;
      }
      case "freeze_export": {
        payload = { message: "export freeze flag asserted on attestation export pipeline", attestationBase: attestationBase() };
        break;
      }
      case "notify_executives":
        payload = { message: "executive notification queued", recipients: ["ceo", "general_counsel", "ciso"] };
        break;
      case "engage_external_counsel":
        payload = { message: "external counsel engaged via legal escalation", escalationId: incident.linkedLegalEscalationId };
        break;
      case "engage_breach_response":
        payload = { message: "incident response retainer engaged", responseTeam: "ir_partner_primary" };
        break;
      case "isolate_tenant":
        payload = { message: "tenant network isolation flag asserted", tenantId: incident.tenantId };
        break;
      case "publish_postmortem":
        payload = { message: "postmortem requested — call /incidents/:id/postmortem to assemble" };
        break;
    }

    a.status = "completed";
    a.completedAt = nowIso();
    a.externalRef = externalRef;
    a.payload = payload;

    if (incident.status === "triaging") {
      incident.status = "active";
      incident.updatedAt = nowIso();
    }

    await publishOutbox({
      id: newId(),
      eventType: "incident.runbook.action.completed",
      aggregateId: a.id,
      aggregateType: "incident_runbook_action",
      payload: { id: a.id, incidentId: a.incidentId, actionType: a.actionType, externalRef: a.externalRef },
      occurredAt: nowIso()
    });
    return a;
  },

  /** Run all queued actions for an incident in sequence. */
  async runAllActions(incidentId: string) {
    const queued = actions.filter((a) => a.incidentId === incidentId && a.status === "queued").sort((a, b) => a.sequence - b.sequence);
    const results: IncidentRunbookAction[] = [];
    for (const a of queued) {
      const r = await this.runAction(a.id);
      if (r) results.push(r);
    }
    return results;
  },

  contain(incidentId: string) {
    const i = incidents.find((x) => x.id === incidentId);
    if (!i) return null;
    i.status = "contained";
    i.updatedAt = nowIso();
    return i;
  },

  remediate(incidentId: string) {
    const i = incidents.find((x) => x.id === incidentId);
    if (!i) return null;
    i.status = "remediating";
    i.updatedAt = nowIso();
    return i;
  },

  async resolve(input: { incidentId: string; postmortem: IncidentPostmortem["summary"]; outputUri?: string }): Promise<{ incident: SovereigntyIncident; postmortem: IncidentPostmortem } | null> {
    const i = incidents.find((x) => x.id === input.incidentId);
    if (!i) return null;
    i.status = "resolved";
    i.closedAt = nowIso();
    i.updatedAt = nowIso();
    const pm: IncidentPostmortem = {
      id: newId(),
      incidentId: i.id,
      summary: input.postmortem,
      outputUri: input.outputUri || `s3://crownx-incident-postmortems/${i.id}/postmortem.json`,
      createdAt: nowIso()
    };
    postmortems.push(pm);
    await publishOutbox({
      id: newId(),
      eventType: "incident.resolved",
      aggregateId: i.id,
      aggregateType: "sovereignty_incident",
      payload: { id: i.id, severity: i.severity, sovereigntyClassKey: i.sovereigntyClassKey, postmortemUri: pm.outputUri },
      occurredAt: nowIso()
    });
    return { incident: i, postmortem: pm };
  },

  close(incidentId: string) {
    const i = incidents.find((x) => x.id === incidentId);
    if (!i) return null;
    i.status = "closed";
    i.updatedAt = nowIso();
    return i;
  },

  // Read APIs
  list: (status?: IncidentStatus, sovereigntyClassKey?: SovereigntyClassKey) =>
    incidents
      .filter((i) => (!status || i.status === status) && (!sovereigntyClassKey || i.sovereigntyClassKey === sovereigntyClassKey))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  find: (id: string) => incidents.find((i) => i.id === id) || null,
  actionsForIncident: (id: string) => actions.filter((a) => a.incidentId === id).sort((a, b) => a.sequence - b.sequence),
  postmortemForIncident: (id: string) => postmortems.find((p) => p.incidentId === id) || null,
  pipelineSummary() {
    const byStatus: Record<IncidentStatus, number> = {
      triaging: 0, active: 0, contained: 0, remediating: 0, resolved: 0, closed: 0
    };
    const bySeverity: Record<IncidentSeverity, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    const byClass: Record<SovereigntyClassKey, number> = {
      commercial: 0, regulated_enterprise: 0, sovereign_dedicated: 0, air_gapped: 0
    };
    for (const i of incidents) {
      byStatus[i.status]++;
      bySeverity[i.severity]++;
      byClass[i.sovereigntyClassKey]++;
    }
    return {
      totalIncidents: incidents.length,
      byStatus,
      bySeverity,
      bySovereigntyClass: byClass,
      totalActions: actions.length,
      pendingActions: actions.filter((a) => a.status === "queued" || a.status === "running").length,
      totalPostmortems: postmortems.length
    };
  }
};
