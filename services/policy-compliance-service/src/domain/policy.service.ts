import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import {
  evaluatePolicy,
  type ComplianceEvaluation,
  type ComplianceSubject,
  type PolicyPack,
  type PolicyResult,
  type PolicyRule,
  type PolicyType
} from "@crownx-jewel/shared-policy";

export type StoredPolicyPack = PolicyPack & {
  tenantId: string | null;
  updatedAt: string;
};

export type StoredEvaluation = ComplianceEvaluation & {
  id: string;
  policyPackId: string;
  subject: ComplianceSubject;
  tenantId: string | null;
  createdAt: string;
};

const packs: StoredPolicyPack[] = [];
const evaluations: StoredEvaluation[] = [];

/** Seed a representative NIL pack on boot so downstream demos work. */
function seedNilPack(): StoredPolicyPack {
  const pack: StoredPolicyPack = {
    id: newId(),
    policyType: "nil_general",
    name: "NIL General — Demo Pack",
    version: "1.0.0",
    status: "active",
    tenantId: null,
    rules: [
      {
        ruleKey: "nil.no_alcohol_tobacco",
        description: "No alcohol or tobacco-linked deals",
        prohibitedTerms: ["alcohol", "tobacco", "vape", "casino", "sportsbook"]
      },
      {
        ruleKey: "nil.under_18_review",
        description: "Participants under 18 require parental approval",
        minAgeYears: 18
      },
      {
        ruleKey: "nil.reward_cap",
        description: "Single-deal reward capped at $100,000",
        maxRewardUsd: 100000
      },
      {
        ruleKey: "nil.us_only",
        description: "US territory only for this demo pack",
        allowedTerritories: ["US"]
      },
      {
        ruleKey: "nil.rights_window",
        description: "License window must be one year or less",
        rightsWindowDays: 365
      }
    ],
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  packs.push(pack);
  return pack;
}

seedNilPack();

export const policyService = {
  async createPack(input: {
    policyType: PolicyType;
    name: string;
    version?: string;
    rules: PolicyRule[];
    tenantId?: string;
  }): Promise<StoredPolicyPack> {
    const p: StoredPolicyPack = {
      id: newId(),
      policyType: input.policyType,
      name: input.name,
      version: input.version || "1.0.0",
      status: "active",
      rules: input.rules,
      tenantId: input.tenantId || null,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    packs.push(p);
    await publishOutbox({
      id: newId(),
      eventType: "policy.pack.created",
      aggregateId: p.id,
      aggregateType: "policy_pack",
      payload: p,
      occurredAt: nowIso()
    });
    return p;
  },

  archivePack(id: string) {
    const p = packs.find((x) => x.id === id);
    if (!p) return null;
    p.status = "archived";
    p.updatedAt = nowIso();
    return p;
  },

  list: () => [...packs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  byTenant: (tenantId: string) => packs.filter((p) => p.tenantId === tenantId || p.tenantId === null),
  findById: (id: string) => packs.find((p) => p.id === id) || null,
  byType: (t: PolicyType) => packs.filter((p) => p.policyType === t && p.status === "active"),

  /**
   * Evaluate a subject against a specific pack. Persists the result.
   */
  async evaluate(input: {
    policyPackId: string;
    subject: ComplianceSubject;
    tenantId?: string;
  }): Promise<StoredEvaluation | null> {
    const pack = packs.find((p) => p.id === input.policyPackId);
    if (!pack) return null;
    const result = evaluatePolicy(pack, input.subject);
    const stored: StoredEvaluation = {
      id: newId(),
      policyPackId: pack.id,
      subject: input.subject,
      tenantId: input.tenantId || null,
      result: result.result,
      reasons: result.reasons,
      matchedRules: result.matchedRules,
      conditions: result.conditions,
      createdAt: nowIso()
    };
    evaluations.push(stored);
    await publishOutbox({
      id: newId(),
      eventType: "policy.evaluated",
      aggregateId: stored.id,
      aggregateType: "compliance_evaluation",
      payload: { evaluationId: stored.id, result: stored.result, reasons: stored.reasons },
      occurredAt: nowIso()
    });
    return stored;
  },

  /**
   * Evaluate against every active pack of the same policy type. Returns a
   * combined verdict (worst-of) so the caller can route on it.
   */
  async evaluateAcrossType(input: {
    policyType: PolicyType;
    subject: ComplianceSubject;
    tenantId?: string;
  }): Promise<{
    verdict: PolicyResult;
    perPack: StoredEvaluation[];
  }> {
    const matches = packs.filter((p) => p.policyType === input.policyType && p.status === "active");
    const perPack: StoredEvaluation[] = [];
    for (const pack of matches) {
      const ev = await this.evaluate({ policyPackId: pack.id, subject: input.subject, tenantId: input.tenantId });
      if (ev) perPack.push(ev);
    }

    let verdict: PolicyResult = "approve";
    for (const r of perPack) {
      if (r.result === "reject") { verdict = "reject"; break; }
      if (r.result === "review") verdict = "review";
      else if (r.result === "approve_with_conditions" && verdict === "approve") {
        verdict = "approve_with_conditions";
      }
    }
    return { verdict, perPack };
  },

  listEvaluations: () => [...evaluations].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  evaluationsForSubject: (subjectType: string, subjectId: string) =>
    evaluations.filter((e) => e.subject.subjectType === subjectType && e.subject.subjectId === subjectId)
};
