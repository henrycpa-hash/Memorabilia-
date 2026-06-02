/**
 * Wave 8 procurement automation primitives. Questionnaire libraries,
 * answer reuse, evidence attachment resolution, response status.
 */
export type QuestionnaireTemplateKey =
  | "soc2_lite"
  | "iso27001_lite"
  | "sig_lite"
  | "caiq_lite"
  | "vendor_security_general"
  | "data_processing_addendum"
  | "ferpa_questionnaire"
  | "nil_compliance_questionnaire";

export type QuestionnaireStatus = "draft" | "published" | "archived";

export type ResponseStatus = "draft" | "in_review" | "submitted" | "delivered";

export type Question = {
  questionKey: string;
  prompt: string;
  category: "security" | "privacy" | "compliance" | "operations" | "legal" | "commercial";
  /** Free-text by default; "yes_no" / "select" / "multi_select" supported. */
  type: "free_text" | "yes_no" | "select" | "multi_select";
  /** Used when type is select/multi_select. */
  options?: string[];
  /** Whether evidence attachment is required for a complete response. */
  evidenceRequired: boolean;
};

export type Answer = {
  questionKey: string;
  /** Free-text answer or chosen option(s). */
  value: string | string[];
  /** Evidence reference — typically an asset/audit/policy URL or packet ID. */
  evidenceRef?: string;
  /** True when the answer is reused from prior responses. */
  reusedFromResponseId?: string;
  /** Reviewer who last touched this answer. */
  lastReviewedByUserId?: string;
};

/**
 * Score a response on completeness and evidence coverage.
 */
export function scoreResponseCompleteness(
  questions: Question[],
  answers: Answer[]
): {
  totalQuestions: number;
  answered: number;
  evidenceRequired: number;
  evidenceProvided: number;
  completenessPct: number;
  evidenceCoveragePct: number;
} {
  const total = questions.length;
  const answeredKeys = new Set(answers.filter((a) => {
    if (Array.isArray(a.value)) return a.value.length > 0;
    return a.value && a.value.trim().length > 0;
  }).map((a) => a.questionKey));
  const answered = answeredKeys.size;

  const evidenceRequired = questions.filter((q) => q.evidenceRequired).length;
  const evidenceProvided = answers.filter((a) => {
    const q = questions.find((x) => x.questionKey === a.questionKey);
    return q?.evidenceRequired && a.evidenceRef && a.evidenceRef.length > 0;
  }).length;

  return {
    totalQuestions: total,
    answered,
    evidenceRequired,
    evidenceProvided,
    completenessPct: total === 0 ? 0 : Math.round((answered / total) * 100),
    evidenceCoveragePct: evidenceRequired === 0 ? 100 : Math.round((evidenceProvided / evidenceRequired) * 100)
  };
}

/**
 * Suggest reuse from prior responses: for each unanswered question, find
 * the most recent prior answer (if any) keyed by question identity.
 */
export function suggestReuse(
  questions: Question[],
  currentAnswers: Answer[],
  priorAnswers: Array<Answer & { responseId: string; createdAt: string }>
): Array<{ questionKey: string; suggestion: Answer }> {
  const haveKeys = new Set(currentAnswers.map((a) => a.questionKey));
  const out: Array<{ questionKey: string; suggestion: Answer }> = [];
  for (const q of questions) {
    if (haveKeys.has(q.questionKey)) continue;
    const candidates = priorAnswers
      .filter((p) => p.questionKey === q.questionKey)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (candidates.length === 0) continue;
    const top = candidates[0];
    out.push({
      questionKey: q.questionKey,
      suggestion: {
        questionKey: q.questionKey,
        value: top.value,
        evidenceRef: top.evidenceRef,
        reusedFromResponseId: top.responseId
      }
    });
  }
  return out;
}
