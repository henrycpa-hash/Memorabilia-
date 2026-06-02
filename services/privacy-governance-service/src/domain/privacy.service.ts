import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import {
  evaluateRelease,
  type PrivacyClass,
  type PrivacyPolicyRule,
  type PrivacyPolicyStatus,
  type ReleaseDecision,
  type ReleaseEvaluation,
  type ReleaseRequestSubject
} from "@crownx-jewel/shared-privacy";

export type PrivacyPolicy = {
  id: string;
  name: string;
  scopeType: "platform" | "tenant" | "partner";
  scopeId: string | null;
  rules: PrivacyPolicyRule[];
  status: PrivacyPolicyStatus;
  createdAt: string;
};

export type ReleaseCheck = {
  id: string;
  policyId: string;
  subject: ReleaseRequestSubject;
  decision: ReleaseDecision;
  reasons: string[];
  suppressionReasons: string[];
  createdAt: string;
};

const policies: PrivacyPolicy[] = [];
const checks: ReleaseCheck[] = [];

/** Seed a default platform policy on boot. */
function seed() {
  if (policies.length > 0) return;
  policies.push({
    id: newId(),
    name: "Default platform privacy policy",
    scopeType: "platform",
    scopeId: null,
    status: "active",
    rules: [{
      ruleKey: "default_release",
      description: "Standard release with min cohort 5 and k-anon 3",
      minCohortSize: 5,
      kAnonymityThreshold: 3,
      maxPrivacyClass: "tenant_scoped"
    }],
    createdAt: nowIso()
  });
}
seed();

export const privacyService = {
  async createPolicy(input: {
    name: string;
    scopeType: "platform" | "tenant" | "partner";
    scopeId?: string;
    rules: PrivacyPolicyRule[];
  }): Promise<PrivacyPolicy> {
    const p: PrivacyPolicy = {
      id: newId(),
      name: input.name,
      scopeType: input.scopeType,
      scopeId: input.scopeId || null,
      status: "active",
      rules: input.rules,
      createdAt: nowIso()
    };
    policies.push(p);
    await publishOutbox({
      id: newId(),
      eventType: "privacy.policy.created",
      aggregateId: p.id,
      aggregateType: "privacy_policy",
      payload: { policyId: p.id, name: p.name, scopeType: p.scopeType },
      occurredAt: nowIso()
    });
    return p;
  },

  archivePolicy(id: string) {
    const p = policies.find((x) => x.id === id);
    if (!p) return null;
    p.status = "archived";
    return p;
  },

  /**
   * Resolve the most specific active policy for a subject. Tenant > Partner > Platform.
   */
  resolvePolicy(scopeType: "platform" | "tenant" | "partner", scopeId?: string): PrivacyPolicy | null {
    if (scopeType !== "platform" && scopeId) {
      const exact = policies.find((p) => p.status === "active" && p.scopeType === scopeType && p.scopeId === scopeId);
      if (exact) return exact;
    }
    return policies.find((p) => p.status === "active" && p.scopeType === "platform") || null;
  },

  /**
   * Evaluate a release request against the resolved policy. Iterates each
   * rule and returns the most-restrictive decision (deny > review_required >
   * suppress > allow).
   */
  async evaluate(input: {
    policyId?: string;
    scopeType?: "platform" | "tenant" | "partner";
    scopeId?: string;
    subject: ReleaseRequestSubject;
  }): Promise<ReleaseCheck | null> {
    const policy = input.policyId
      ? policies.find((p) => p.id === input.policyId && p.status === "active")
      : this.resolvePolicy(input.scopeType || "platform", input.scopeId);
    if (!policy) return null;

    const evaluations: ReleaseEvaluation[] = policy.rules.map((rule) => evaluateRelease(input.subject, rule));
    const ranked = evaluations.sort((a, b) => severityRank(b.decision) - severityRank(a.decision));
    const top = ranked[0];

    const check: ReleaseCheck = {
      id: newId(),
      policyId: policy.id,
      subject: input.subject,
      decision: top.decision,
      reasons: evaluations.flatMap((e) => e.reasons),
      suppressionReasons: evaluations.flatMap((e) => e.suppressionReasons),
      createdAt: nowIso()
    };
    checks.push(check);

    await publishOutbox({
      id: newId(),
      eventType: "privacy.release.checked",
      aggregateId: check.id,
      aggregateType: "release_check",
      payload: { checkId: check.id, decision: check.decision, metric: input.subject.metricKey },
      occurredAt: nowIso()
    });

    return check;
  },

  list: () => [...policies],
  findById: (id: string) => policies.find((p) => p.id === id) || null,
  byScope: (scopeType: string, scopeId?: string) =>
    policies.filter((p) => p.scopeType === scopeType && (!scopeId || p.scopeId === scopeId)),
  listChecks: (limit?: number) => {
    const sorted = [...checks].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return limit ? sorted.slice(0, limit) : sorted;
  },
  findCheck: (id: string) => checks.find((c) => c.id === id) || null
};

function severityRank(d: ReleaseDecision): number {
  switch (d) {
    case "deny": return 4;
    case "review_required": return 3;
    case "suppress": return 2;
    case "allow": return 1;
  }
}
