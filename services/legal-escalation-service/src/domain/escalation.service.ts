import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";

const legalConnectorBase = () => process.env.LEGAL_SYSTEMS_CONNECTOR_SERVICE_URL || "http://localhost:4051";
const legalPacketBase = () => process.env.LEGAL_PACKET_SERVICE_URL || "http://localhost:4042";

export type EscalationSourceType =
  | "dispute"
  | "claim"
  | "compliance_block"
  | "partner_economics"
  | "residency_breach"
  | "regulator_trigger"
  | "sovereign_restriction";

export type EscalationSeverity =
  | "advisory"
  | "urgent_review"
  | "legal_hold_candidate"
  | "regulator_sensitive"
  | "executive_escalation";

export type EscalationStatus =
  | "open"
  | "routed_internal"
  | "routed_external"
  | "matter_opened"
  | "packet_assembled"
  | "resolved"
  | "withdrawn";

export type CounselRoutingTarget = "internal_legal" | "external_counsel" | "executive_counsel";

export type EscalationEventType =
  | "created"
  | "severity_changed"
  | "routed"
  | "matter_linked"
  | "packet_linked"
  | "notice_obligation_flagged"
  | "legal_hold_recommended"
  | "executive_notified"
  | "resolved"
  | "withdrawn";

/** Playbook output decided when an escalation is created. */
export type PlaybookOutput = {
  routingTarget: CounselRoutingTarget;
  packetAssemblyRequired: boolean;
  noticeObligationCheck: boolean;
  legalHoldRecommended: boolean;
  executiveNotificationFlag: boolean;
  rationale: string[];
};

export type LegalEscalation = {
  id: string;
  sourceType: EscalationSourceType;
  sourceId: string;
  severity: EscalationSeverity;
  status: EscalationStatus;
  matterId: string | null;
  packetId: string | null;
  playbook: PlaybookOutput;
  metadata: Record<string, unknown>;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EscalationEvent = {
  id: string;
  escalationId: string;
  eventType: EscalationEventType;
  payload: Record<string, unknown>;
  actorUserId: string | null;
  createdAt: string;
};

const escalations: LegalEscalation[] = [];
const events: EscalationEvent[] = [];

/**
 * Decide playbook output from severity + source. The matrix below is the
 * Wave 10 deterministic policy; later waves can swap in declarative rules.
 */
function decidePlaybook(severity: EscalationSeverity, sourceType: EscalationSourceType): PlaybookOutput {
  const rationale: string[] = [];
  let routingTarget: CounselRoutingTarget = "internal_legal";
  let packetAssemblyRequired = false;
  let noticeObligationCheck = false;
  let legalHoldRecommended = false;
  let executiveNotificationFlag = false;

  // Severity ladder
  if (severity === "advisory") {
    routingTarget = "internal_legal";
    rationale.push("advisory severity routes to internal legal");
  } else if (severity === "urgent_review") {
    routingTarget = "internal_legal";
    packetAssemblyRequired = true;
    rationale.push("urgent_review requires packet assembly");
  } else if (severity === "legal_hold_candidate") {
    routingTarget = "internal_legal";
    packetAssemblyRequired = true;
    legalHoldRecommended = true;
    rationale.push("legal_hold_candidate triggers legal hold review");
  } else if (severity === "regulator_sensitive") {
    routingTarget = "external_counsel";
    packetAssemblyRequired = true;
    noticeObligationCheck = true;
    rationale.push("regulator_sensitive routes to external counsel + notice obligation check");
  } else if (severity === "executive_escalation") {
    routingTarget = "executive_counsel";
    packetAssemblyRequired = true;
    noticeObligationCheck = true;
    legalHoldRecommended = true;
    executiveNotificationFlag = true;
    rationale.push("executive_escalation engages full playbook");
  }

  // Source type overrides
  if (sourceType === "regulator_trigger") {
    noticeObligationCheck = true;
    rationale.push("regulator_trigger source forces notice obligation check");
  }
  if (sourceType === "residency_breach" || sourceType === "sovereign_restriction") {
    noticeObligationCheck = true;
    legalHoldRecommended = true;
    rationale.push(`${sourceType} mandates notice + legal hold consideration`);
  }
  if (sourceType === "claim" && (severity === "regulator_sensitive" || severity === "executive_escalation")) {
    routingTarget = "external_counsel";
    rationale.push("high-severity claim routes to external counsel");
  }

  return {
    routingTarget,
    packetAssemblyRequired,
    noticeObligationCheck,
    legalHoldRecommended,
    executiveNotificationFlag,
    rationale
  };
}

async function postOk<T>(url: string, body: unknown): Promise<T | null> {
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

function recordEvent(input: { escalationId: string; eventType: EscalationEventType; payload?: Record<string, unknown>; actorUserId?: string }) {
  const e: EscalationEvent = {
    id: newId(),
    escalationId: input.escalationId,
    eventType: input.eventType,
    payload: input.payload || {},
    actorUserId: input.actorUserId || null,
    createdAt: nowIso()
  };
  events.push(e);
  return e;
}

export const escalationService = {
  async create(input: {
    sourceType: EscalationSourceType;
    sourceId: string;
    severity: EscalationSeverity;
    metadata?: Record<string, unknown>;
  }): Promise<LegalEscalation> {
    const playbook = decidePlaybook(input.severity, input.sourceType);
    const e: LegalEscalation = {
      id: newId(),
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      severity: input.severity,
      status: "open",
      matterId: null,
      packetId: null,
      playbook,
      metadata: input.metadata || {},
      resolvedAt: null,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    escalations.push(e);

    recordEvent({ escalationId: e.id, eventType: "created", payload: { severity: e.severity, sourceType: e.sourceType } });
    if (playbook.noticeObligationCheck) {
      recordEvent({ escalationId: e.id, eventType: "notice_obligation_flagged" });
    }
    if (playbook.legalHoldRecommended) {
      recordEvent({ escalationId: e.id, eventType: "legal_hold_recommended" });
    }
    if (playbook.executiveNotificationFlag) {
      recordEvent({ escalationId: e.id, eventType: "executive_notified" });
    }

    await publishOutbox({
      id: newId(),
      eventType: "legal.escalation.created",
      aggregateId: e.id,
      aggregateType: "legal_escalation",
      payload: {
        id: e.id,
        sourceType: e.sourceType,
        sourceId: e.sourceId,
        severity: e.severity,
        routingTarget: playbook.routingTarget,
        noticeObligationCheck: playbook.noticeObligationCheck,
        executiveNotificationFlag: playbook.executiveNotificationFlag
      },
      occurredAt: nowIso()
    });
    return e;
  },

  changeSeverity(id: string, severity: EscalationSeverity) {
    const e = escalations.find((x) => x.id === id);
    if (!e) return null;
    const oldSeverity = e.severity;
    e.severity = severity;
    e.playbook = decidePlaybook(severity, e.sourceType);
    e.updatedAt = nowIso();
    recordEvent({ escalationId: e.id, eventType: "severity_changed", payload: { from: oldSeverity, to: severity } });
    return e;
  },

  /** Mark routing as accepted (internal/external/executive); status transition only. */
  acceptRouting(id: string, target: CounselRoutingTarget) {
    const e = escalations.find((x) => x.id === id);
    if (!e) return null;
    e.status = target === "external_counsel" ? "routed_external" : "routed_internal";
    e.updatedAt = nowIso();
    recordEvent({ escalationId: e.id, eventType: "routed", payload: { routingTarget: target } });
    return e;
  },

  /**
   * Open or link a matter via legal-systems-connector-service. Wave 10 calls
   * the connector best-effort; if upstream is unreachable, we still record
   * the linkage attempt and let an operator retry.
   */
  async openOrLinkMatter(input: {
    id: string;
    matterRef?: string;
    /** Optional connector key — ironclad/legal-tracker/etc. */
    connectorKey?: string;
  }): Promise<LegalEscalation | null> {
    const e = escalations.find((x) => x.id === input.id);
    if (!e) return null;
    let matterId = input.matterRef || null;
    if (!matterId) {
      const m = await postOk<{ id: string; matterRef: string }>(
        `${legalConnectorBase()}/legal-connector/matters`,
        {
          connectorKey: input.connectorKey || "internal",
          matterType: "escalation",
          subjectType: "legal_escalation",
          subjectId: e.id,
          severity: e.severity
        }
      );
      if (m) matterId = m.id;
    }
    if (matterId) {
      e.matterId = matterId;
      e.status = "matter_opened";
      e.updatedAt = nowIso();
      recordEvent({ escalationId: e.id, eventType: "matter_linked", payload: { matterId } });
    }
    return e;
  },

  /** Trigger packet assembly via legal-packet-service. */
  async assemblePacket(input: { id: string; packetType?: string }): Promise<LegalEscalation | null> {
    const e = escalations.find((x) => x.id === input.id);
    if (!e) return null;
    if (!e.playbook.packetAssemblyRequired) return e;
    const p = await postOk<{ id: string }>(
      `${legalPacketBase()}/legal-packets`,
      {
        packetType: input.packetType || "escalation_summary",
        subjectType: "legal_escalation",
        subjectId: e.id,
        severity: e.severity
      }
    );
    if (p) {
      e.packetId = p.id;
      e.status = "packet_assembled";
      e.updatedAt = nowIso();
      recordEvent({ escalationId: e.id, eventType: "packet_linked", payload: { packetId: p.id } });
    }
    return e;
  },

  resolve(id: string, resolutionNotes?: string) {
    const e = escalations.find((x) => x.id === id);
    if (!e) return null;
    e.status = "resolved";
    e.resolvedAt = nowIso();
    e.updatedAt = nowIso();
    if (resolutionNotes) e.metadata._resolutionNotes = resolutionNotes;
    recordEvent({ escalationId: e.id, eventType: "resolved", payload: { resolutionNotes: resolutionNotes || null } });
    return e;
  },

  withdraw(id: string, reason: string) {
    const e = escalations.find((x) => x.id === id);
    if (!e) return null;
    e.status = "withdrawn";
    e.resolvedAt = nowIso();
    e.updatedAt = nowIso();
    e.metadata._withdrawnReason = reason;
    recordEvent({ escalationId: e.id, eventType: "withdrawn", payload: { reason } });
    return e;
  },

  // Read APIs
  list: (status?: EscalationStatus, severity?: EscalationSeverity) =>
    escalations
      .filter((e) => (!status || e.status === status) && (!severity || e.severity === severity))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  find: (id: string) => escalations.find((e) => e.id === id) || null,
  bySource: (sourceType: EscalationSourceType, sourceId: string) =>
    escalations.find((e) => e.sourceType === sourceType && e.sourceId === sourceId) || null,
  eventsForEscalation: (id: string) => events.filter((e) => e.escalationId === id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  /** Roll-up summary for the legal-collaboration-portal. */
  pipelineSummary() {
    const bySeverity: Record<EscalationSeverity, number> = {
      advisory: 0, urgent_review: 0, legal_hold_candidate: 0, regulator_sensitive: 0, executive_escalation: 0
    };
    const byStatus: Record<EscalationStatus, number> = {
      open: 0, routed_internal: 0, routed_external: 0, matter_opened: 0, packet_assembled: 0, resolved: 0, withdrawn: 0
    };
    let pendingNoticeObligations = 0;
    let pendingLegalHolds = 0;
    for (const e of escalations) {
      bySeverity[e.severity]++;
      byStatus[e.status]++;
      if (e.status !== "resolved" && e.status !== "withdrawn") {
        if (e.playbook.noticeObligationCheck) pendingNoticeObligations++;
        if (e.playbook.legalHoldRecommended) pendingLegalHolds++;
      }
    }
    return { totalEscalations: escalations.length, bySeverity, byStatus, pendingNoticeObligations, pendingLegalHolds };
  }
};
