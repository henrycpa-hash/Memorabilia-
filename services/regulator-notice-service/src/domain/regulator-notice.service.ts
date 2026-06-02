import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";

export type NoticeSourceType =
  | "incident"
  | "data_breach"
  | "legal_escalation"
  | "compliance_finding"
  | "sovereign_event"
  | "tax_finding"
  | "voluntary_disclosure";

export type NoticeStatus =
  | "draft"
  | "approval_pending"
  | "approved"
  | "submitted"
  | "acknowledged"
  | "responded"
  | "rejected"
  | "closed";

export type SubmissionStatus = "queued" | "submitted" | "acknowledged" | "rejected" | "failed";

/** Routing rules pulled per (jurisdictionKey, sourceType) — Wave 10 deterministic seed. */
export type RoutingRule = {
  jurisdictionKey: string;
  sourceType: NoticeSourceType;
  regulatorKey: string;
  regulatorName: string;
  /** Standard deadline in days from notice triggerAt. */
  deadlineDays: number;
  /** Whether this jurisdiction requires a response packet on filing. */
  responsePackRequired: boolean;
};

export type RegulatorNotice = {
  id: string;
  jurisdictionKey: string;
  regulatorKey: string;
  regulatorName: string;
  sourceType: NoticeSourceType;
  sourceId: string;
  severity: "low" | "medium" | "high" | "critical";
  status: NoticeStatus;
  triggerAt: string;
  dueDate: string;
  title: string;
  payload: Record<string, unknown>;
  approverUserIds: string[];
  responsePackUri: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NoticeSubmission = {
  id: string;
  noticeId: string;
  status: SubmissionStatus;
  submissionRef: string | null;
  outputUri: string | null;
  acknowledgedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
};

const routing: RoutingRule[] = [];
const notices: RegulatorNotice[] = [];
const submissions: NoticeSubmission[] = [];

/** Seed cross-jurisdiction routing matrix on boot. */
function seed() {
  if (routing.length > 0) return;
  const seeds: RoutingRule[] = [
    { jurisdictionKey: "EU", sourceType: "data_breach", regulatorKey: "edpb", regulatorName: "European Data Protection Board", deadlineDays: 3, responsePackRequired: true },
    { jurisdictionKey: "GB", sourceType: "data_breach", regulatorKey: "ico", regulatorName: "Information Commissioner's Office", deadlineDays: 3, responsePackRequired: true },
    { jurisdictionKey: "DE", sourceType: "data_breach", regulatorKey: "bfdi", regulatorName: "Bundesbeauftragter für den Datenschutz", deadlineDays: 3, responsePackRequired: true },
    { jurisdictionKey: "US-CA", sourceType: "data_breach", regulatorKey: "ca_ag", regulatorName: "California Attorney General", deadlineDays: 30, responsePackRequired: false },
    { jurisdictionKey: "US-NY", sourceType: "data_breach", regulatorKey: "ny_dfs", regulatorName: "New York Department of Financial Services", deadlineDays: 3, responsePackRequired: true },
    { jurisdictionKey: "EU", sourceType: "incident", regulatorKey: "enisa", regulatorName: "European Union Agency for Cybersecurity", deadlineDays: 7, responsePackRequired: false },
    { jurisdictionKey: "GB", sourceType: "tax_finding", regulatorKey: "hmrc", regulatorName: "HM Revenue & Customs", deadlineDays: 30, responsePackRequired: true },
    { jurisdictionKey: "US-FED", sourceType: "tax_finding", regulatorKey: "irs", regulatorName: "Internal Revenue Service", deadlineDays: 30, responsePackRequired: true },
    { jurisdictionKey: "EU", sourceType: "sovereign_event", regulatorKey: "ec_dg_cnect", regulatorName: "European Commission DG-CNECT", deadlineDays: 14, responsePackRequired: true },
    { jurisdictionKey: "US-FED", sourceType: "sovereign_event", regulatorKey: "cisa", regulatorName: "Cybersecurity & Infrastructure Security Agency", deadlineDays: 7, responsePackRequired: true }
  ];
  routing.push(...seeds);
}
seed();

/** Look up routing rules matching a jurisdiction + source. Multiple may apply. */
export function lookupRouting(jurisdictionKey: string, sourceType: NoticeSourceType): RoutingRule[] {
  return routing.filter((r) => r.jurisdictionKey === jurisdictionKey && r.sourceType === sourceType);
}

export const regulatorNoticeService = {
  async addRoutingRule(rule: RoutingRule) {
    routing.push(rule);
    return rule;
  },

  /**
   * Generate a notice draft for a (jurisdiction, source) using routing rules.
   * If multiple rules match (e.g. EU + member state), one notice per regulator is
   * created. Returns all created notices.
   */
  async generate(input: {
    jurisdictionKey: string;
    sourceType: NoticeSourceType;
    sourceId: string;
    severity: RegulatorNotice["severity"];
    triggerAt?: string;
    title: string;
    payload?: Record<string, unknown>;
  }): Promise<RegulatorNotice[]> {
    const rules = lookupRouting(input.jurisdictionKey, input.sourceType);
    if (rules.length === 0) {
      // Fall back to a single placeholder notice tagged with the platform
      const trigger = input.triggerAt || nowIso();
      const due = new Date(new Date(trigger).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const fallback: RegulatorNotice = {
        id: newId(),
        jurisdictionKey: input.jurisdictionKey,
        regulatorKey: "unknown",
        regulatorName: "Manually routed",
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        severity: input.severity,
        status: "draft",
        triggerAt: trigger,
        dueDate: due,
        title: input.title,
        payload: input.payload || {},
        approverUserIds: [],
        responsePackUri: null,
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
      notices.push(fallback);
      await publishOutbox({
        id: newId(),
        eventType: "regulator.notice.created",
        aggregateId: fallback.id,
        aggregateType: "regulator_notice",
        payload: { id: fallback.id, jurisdictionKey: fallback.jurisdictionKey, regulatorKey: fallback.regulatorKey, sourceType: fallback.sourceType },
        occurredAt: nowIso()
      });
      return [fallback];
    }
    const trigger = input.triggerAt || nowIso();
    const created: RegulatorNotice[] = [];
    for (const r of rules) {
      const due = new Date(new Date(trigger).getTime() + r.deadlineDays * 24 * 60 * 60 * 1000).toISOString();
      const n: RegulatorNotice = {
        id: newId(),
        jurisdictionKey: r.jurisdictionKey,
        regulatorKey: r.regulatorKey,
        regulatorName: r.regulatorName,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        severity: input.severity,
        status: "draft",
        triggerAt: trigger,
        dueDate: due,
        title: input.title,
        payload: input.payload || {},
        approverUserIds: [],
        responsePackUri: null,
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
      notices.push(n);
      created.push(n);
      await publishOutbox({
        id: newId(),
        eventType: "regulator.notice.created",
        aggregateId: n.id,
        aggregateType: "regulator_notice",
        payload: { id: n.id, jurisdictionKey: n.jurisdictionKey, regulatorKey: n.regulatorKey, sourceType: n.sourceType, deadlineDays: r.deadlineDays },
        occurredAt: nowIso()
      });
    }
    return created;
  },

  requestApproval(id: string) {
    const n = notices.find((x) => x.id === id);
    if (!n) return null;
    n.status = "approval_pending";
    n.updatedAt = nowIso();
    return n;
  },

  approve(id: string, approverUserId: string) {
    const n = notices.find((x) => x.id === id);
    if (!n) return null;
    if (!n.approverUserIds.includes(approverUserId)) n.approverUserIds.push(approverUserId);
    n.status = "approved";
    n.updatedAt = nowIso();
    return n;
  },

  /** Submit an approved notice. Wave 10 simulates submission; Wave 11 wires the regulator-portal-connector-service. */
  async submit(id: string): Promise<{ notice: RegulatorNotice; submission: NoticeSubmission } | null> {
    const n = notices.find((x) => x.id === id);
    if (!n) return null;
    if (n.status !== "approved") return null;
    const sub: NoticeSubmission = {
      id: newId(),
      noticeId: n.id,
      status: "submitted",
      submissionRef: `sub_${n.id.slice(0, 12)}`,
      outputUri: `s3://crownx-regulator-notices/${n.id}/submission.pdf`,
      acknowledgedAt: null,
      rejectionReason: null,
      createdAt: nowIso()
    };
    submissions.push(sub);
    n.status = "submitted";
    n.updatedAt = nowIso();
    await publishOutbox({
      id: newId(),
      eventType: "regulator.notice.submitted",
      aggregateId: n.id,
      aggregateType: "regulator_notice",
      payload: { id: n.id, submissionRef: sub.submissionRef, jurisdictionKey: n.jurisdictionKey, regulatorKey: n.regulatorKey },
      occurredAt: nowIso()
    });
    return { notice: n, submission: sub };
  },

  async acknowledgeSubmission(input: { submissionId: string }) {
    const sub = submissions.find((x) => x.id === input.submissionId);
    if (!sub) return null;
    sub.status = "acknowledged";
    sub.acknowledgedAt = nowIso();
    const n = notices.find((x) => x.id === sub.noticeId);
    if (n) {
      n.status = "acknowledged";
      n.updatedAt = nowIso();
    }
    return sub;
  },

  recordResponse(input: { id: string; responsePackUri: string }) {
    const n = notices.find((x) => x.id === input.id);
    if (!n) return null;
    n.responsePackUri = input.responsePackUri;
    n.status = "responded";
    n.updatedAt = nowIso();
    return n;
  },

  reject(input: { submissionId: string; reason: string }) {
    const sub = submissions.find((x) => x.id === input.submissionId);
    if (!sub) return null;
    sub.status = "rejected";
    sub.rejectionReason = input.reason;
    const n = notices.find((x) => x.id === sub.noticeId);
    if (n) { n.status = "rejected"; n.updatedAt = nowIso(); }
    return sub;
  },

  close(id: string) {
    const n = notices.find((x) => x.id === id);
    if (!n) return null;
    n.status = "closed";
    n.updatedAt = nowIso();
    return n;
  },

  // Read APIs
  list: (status?: NoticeStatus) =>
    notices.filter((n) => !status || n.status === status).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  find: (id: string) => notices.find((n) => n.id === id) || null,
  bySource: (sourceType: NoticeSourceType, sourceId: string) =>
    notices.filter((n) => n.sourceType === sourceType && n.sourceId === sourceId),
  upcomingDeadlines(windowDays = 14) {
    const now = Date.now();
    const window = windowDays * 24 * 60 * 60 * 1000;
    return notices
      .filter((n) => n.status === "draft" || n.status === "approval_pending" || n.status === "approved")
      .filter((n) => {
        const d = new Date(n.dueDate).getTime();
        return d > now && d - now <= window;
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  },
  listSubmissions: (noticeId?: string) =>
    submissions.filter((s) => !noticeId || s.noticeId === noticeId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  listRouting: () => [...routing],
  pipelineSummary() {
    const byStatus: Record<NoticeStatus, number> = {
      draft: 0, approval_pending: 0, approved: 0, submitted: 0, acknowledged: 0, responded: 0, rejected: 0, closed: 0
    };
    let overdue = 0;
    const now = Date.now();
    for (const n of notices) {
      byStatus[n.status]++;
      if ((n.status === "draft" || n.status === "approval_pending" || n.status === "approved")
          && new Date(n.dueDate).getTime() < now) overdue++;
    }
    return { totalNotices: notices.length, byStatus, overdue, totalSubmissions: submissions.length };
  }
};
