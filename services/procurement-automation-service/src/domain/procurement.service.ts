import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import {
  scoreResponseCompleteness,
  suggestReuse,
  type Answer,
  type Question,
  type QuestionnaireStatus,
  type QuestionnaireTemplateKey,
  type ResponseStatus
} from "@crownx-jewel/shared-procurement";

export type Questionnaire = {
  id: string;
  templateKey: QuestionnaireTemplateKey | string;
  title: string;
  questions: Question[];
  status: QuestionnaireStatus;
  createdAt: string;
};

export type ProcurementResponse = {
  id: string;
  questionnaireId: string;
  tenantId: string;
  buyerName: string;
  status: ResponseStatus;
  answers: Answer[];
  reviewerUserIds: string[];
  outputUri: string | null;
  createdAt: string;
  submittedAt: string | null;
};

export type EvidenceMap = {
  id: string;
  questionnaireId: string;
  questionKey: string;
  evidenceRef: string;
  evidenceType: "audit_packet" | "policy_pack" | "doc_url" | "asset" | "agreement";
  description: string;
  createdAt: string;
};

const questionnaires: Questionnaire[] = [];
const responses: ProcurementResponse[] = [];
const evidenceMaps: EvidenceMap[] = [];

/** Seed two starter templates on boot. */
function seed() {
  if (questionnaires.length > 0) return;
  questionnaires.push({
    id: newId(),
    templateKey: "vendor_security_general",
    title: "General Vendor Security Questionnaire",
    status: "published",
    questions: [
      { questionKey: "vsq_1", prompt: "Do you maintain SOC 2 Type II?", category: "security", type: "yes_no", evidenceRequired: true },
      { questionKey: "vsq_2", prompt: "Describe encryption-at-rest", category: "security", type: "free_text", evidenceRequired: false },
      { questionKey: "vsq_3", prompt: "Do you support SSO/SCIM?", category: "security", type: "yes_no", evidenceRequired: false },
      { questionKey: "vsq_4", prompt: "Where is customer data stored?", category: "privacy", type: "free_text", evidenceRequired: true },
      { questionKey: "vsq_5", prompt: "Sub-processors used", category: "privacy", type: "free_text", evidenceRequired: false },
      { questionKey: "vsq_6", prompt: "Incident response SLA?", category: "operations", type: "free_text", evidenceRequired: false }
    ],
    createdAt: nowIso()
  });
  questionnaires.push({
    id: newId(),
    templateKey: "nil_compliance_questionnaire",
    title: "NIL Compliance Questionnaire",
    status: "published",
    questions: [
      { questionKey: "nil_1", prompt: "How are minor athletes handled?", category: "compliance", type: "free_text", evidenceRequired: true },
      { questionKey: "nil_2", prompt: "Are sponsor categories restricted?", category: "compliance", type: "yes_no", evidenceRequired: false },
      { questionKey: "nil_3", prompt: "School/league policy enforcement model", category: "compliance", type: "free_text", evidenceRequired: true },
      { questionKey: "nil_4", prompt: "Data retention for athlete records", category: "privacy", type: "free_text", evidenceRequired: false }
    ],
    createdAt: nowIso()
  });
}
seed();

export const procurementService = {
  async createQuestionnaire(input: {
    templateKey: string;
    title: string;
    questions: Question[];
  }): Promise<Questionnaire> {
    const q: Questionnaire = {
      id: newId(),
      templateKey: input.templateKey,
      title: input.title,
      questions: input.questions,
      status: "published",
      createdAt: nowIso()
    };
    questionnaires.push(q);
    return q;
  },

  archiveQuestionnaire(id: string) {
    const q = questionnaires.find((x) => x.id === id);
    if (!q) return null;
    q.status = "archived";
    return q;
  },

  async createResponse(input: {
    questionnaireId: string;
    tenantId: string;
    buyerName: string;
    reviewerUserIds?: string[];
  }): Promise<ProcurementResponse | null> {
    const q = questionnaires.find((x) => x.id === input.questionnaireId);
    if (!q) return null;
    const r: ProcurementResponse = {
      id: newId(),
      questionnaireId: q.id,
      tenantId: input.tenantId,
      buyerName: input.buyerName,
      status: "draft",
      answers: [],
      reviewerUserIds: input.reviewerUserIds || [],
      outputUri: null,
      createdAt: nowIso(),
      submittedAt: null
    };
    responses.push(r);
    await publishOutbox({
      id: newId(),
      eventType: "procurement.response.created",
      aggregateId: r.id,
      aggregateType: "procurement_response",
      payload: { responseId: r.id, questionnaireId: q.id, buyerName: r.buyerName },
      occurredAt: nowIso()
    });
    return r;
  },

  saveAnswers(id: string, answers: Answer[]) {
    const r = responses.find((x) => x.id === id);
    if (!r) return null;
    // Merge by questionKey
    const map = new Map<string, Answer>();
    for (const a of r.answers) map.set(a.questionKey, a);
    for (const a of answers) map.set(a.questionKey, a);
    r.answers = Array.from(map.values());
    return r;
  },

  /** Suggest answer reuse based on the tenant's prior responses. */
  reuseSuggestions(responseId: string) {
    const current = responses.find((r) => r.id === responseId);
    if (!current) return [];
    const q = questionnaires.find((x) => x.id === current.questionnaireId);
    if (!q) return [];
    const prior: Array<Answer & { responseId: string; createdAt: string }> = [];
    for (const r of responses) {
      if (r.id === current.id) continue;
      if (r.tenantId !== current.tenantId) continue;
      for (const a of r.answers) prior.push({ ...a, responseId: r.id, createdAt: r.createdAt });
    }
    return suggestReuse(q.questions, current.answers, prior);
  },

  async submitResponse(id: string) {
    const r = responses.find((x) => x.id === id);
    if (!r) return null;
    const q = questionnaires.find((x) => x.id === r.questionnaireId);
    if (!q) return null;
    const score = scoreResponseCompleteness(q.questions, r.answers);
    r.status = score.completenessPct === 100 && score.evidenceCoveragePct === 100 ? "submitted" : "in_review";
    r.submittedAt = r.status === "submitted" ? nowIso() : null;
    r.outputUri = `s3://crownx-procurement/responses/${r.id}.pdf`;

    if (r.status === "submitted") {
      await publishOutbox({
        id: newId(),
        eventType: "procurement.response.submitted",
        aggregateId: r.id,
        aggregateType: "procurement_response",
        payload: { responseId: r.id, completenessPct: score.completenessPct, evidenceCoveragePct: score.evidenceCoveragePct },
        occurredAt: nowIso()
      });
    }
    return { response: r, score };
  },

  markDelivered(id: string) {
    const r = responses.find((x) => x.id === id);
    if (!r) return null;
    r.status = "delivered";
    return r;
  },

  /** Score a response without changing status. */
  score(id: string) {
    const r = responses.find((x) => x.id === id);
    if (!r) return null;
    const q = questionnaires.find((x) => x.id === r.questionnaireId);
    if (!q) return null;
    return scoreResponseCompleteness(q.questions, r.answers);
  },

  async addEvidenceMap(input: {
    questionnaireId: string;
    questionKey: string;
    evidenceRef: string;
    evidenceType: EvidenceMap["evidenceType"];
    description: string;
  }): Promise<EvidenceMap | null> {
    if (!questionnaires.find((q) => q.id === input.questionnaireId)) return null;
    const m: EvidenceMap = {
      id: newId(),
      ...input,
      createdAt: nowIso()
    };
    evidenceMaps.push(m);
    return m;
  },

  // Read APIs
  listQuestionnaires: () => questionnaires.filter((q) => q.status === "published"),
  findQuestionnaire: (id: string) => questionnaires.find((q) => q.id === id) || null,
  questionnaireByTemplate: (templateKey: string) => questionnaires.find((q) => q.templateKey === templateKey) || null,

  listResponses: (tenantId?: string) =>
    responses.filter((r) => !tenantId || r.tenantId === tenantId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  findResponse: (id: string) => responses.find((r) => r.id === id) || null,

  listEvidenceMaps: (questionnaireId?: string) =>
    evidenceMaps.filter((m) => !questionnaireId || m.questionnaireId === questionnaireId)
};
