import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import {
  evaluatePolicy,
  type ComplianceSubject,
  type PolicyPack,
  type PolicyResult
} from "@crownx-jewel/shared-policy";
import {
  explainVariance,
  type SimulationOutcome,
  type SimulationStatus,
  type SimulationVariant,
  type SimulationVariantResult
} from "@crownx-jewel/shared-sandbox";

const policyBase = () =>
  process.env.POLICY_COMPLIANCE_SERVICE_URL || "http://localhost:4037";

async function fetchOk<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

export type PolicySimulation = {
  id: string;
  policyPackId: string;
  policyType: string | null;
  subject: ComplianceSubject;
  variants: SimulationVariant[];
  status: SimulationStatus;
  outcome: SimulationOutcome | null;
  preparedByUserId: string | null;
  createdAt: string;
  completedAt: string | null;
};

const sims: PolicySimulation[] = [];

function applyOverrides(base: ComplianceSubject, overrides?: Record<string, unknown>): ComplianceSubject {
  if (!overrides) return base;
  return { ...base, ...overrides } as ComplianceSubject;
}

function toVariantResult(variantKey: string, ev: ReturnType<typeof evaluatePolicy>): SimulationVariantResult {
  return {
    variantKey,
    result: ev.result,
    reasons: ev.reasons,
    conditions: ev.conditions,
    matchedRules: ev.matchedRules
  };
}

export const sandboxService = {
  /**
   * Run a policy pack simulation against a subject and 0..N variants. Does
   * NOT call policy-compliance-service's persisted /evaluate (that produces a
   * binding evaluation); pulls the pack and evaluates locally so sandbox
   * runs never appear in the live evaluation feed.
   */
  async simulate(input: {
    policyPackId: string;
    subject: ComplianceSubject;
    variants?: SimulationVariant[];
    preparedByUserId?: string;
  }): Promise<PolicySimulation | null> {
    const pack = await fetchOk<PolicyPack>(`${policyBase()}/policies/packs/${input.policyPackId}`);
    if (!pack) return null;

    const sim: PolicySimulation = {
      id: newId(),
      policyPackId: pack.id,
      policyType: pack.policyType,
      subject: input.subject,
      variants: input.variants || [],
      status: "running",
      outcome: null,
      preparedByUserId: input.preparedByUserId || null,
      createdAt: nowIso(),
      completedAt: null
    };
    sims.push(sim);

    const baseEv = evaluatePolicy(pack, input.subject);
    const baseResult = toVariantResult("base", baseEv);

    const variantResults: SimulationVariantResult[] = (input.variants || []).map((v) => {
      const sub = applyOverrides(input.subject, v.subjectOverrides);
      return toVariantResult(v.variantKey, evaluatePolicy(pack, sub));
    });

    sim.outcome = {
      baseResult,
      variantResults,
      varianceExplanation: explainVariance(baseResult, variantResults)
    };
    sim.status = "completed";
    sim.completedAt = nowIso();

    await publishOutbox({
      id: newId(),
      eventType: "policy.simulation.completed",
      aggregateId: sim.id,
      aggregateType: "policy_simulation",
      payload: {
        simulationId: sim.id,
        policyPackId: pack.id,
        baseResult: baseResult.result,
        variantCount: variantResults.length
      },
      occurredAt: nowIso()
    });

    return sim;
  },

  /**
   * Convenience: simulate the same subject across every active pack of a
   * given policy type and return a side-by-side comparison.
   */
  async simulateAcrossType(input: {
    policyType: string;
    subject: ComplianceSubject;
    variants?: SimulationVariant[];
  }): Promise<{ simulationsByPack: PolicySimulation[]; verdict: PolicyResult }> {
    const packs = await fetchOk<PolicyPack[]>(`${policyBase()}/policies/packs/by-type/${input.policyType}`);
    const list = packs || [];
    const sims: PolicySimulation[] = [];
    for (const p of list) {
      const sim = await this.simulate({
        policyPackId: p.id,
        subject: input.subject,
        variants: input.variants
      });
      if (sim) sims.push(sim);
    }
    let verdict: PolicyResult = "approve";
    for (const s of sims) {
      if (!s.outcome) continue;
      const r = s.outcome.baseResult.result;
      if (r === "reject") { verdict = "reject"; break; }
      if (r === "review") verdict = "review";
      else if (r === "approve_with_conditions" && verdict === "approve") {
        verdict = "approve_with_conditions";
      }
    }
    return { simulationsByPack: sims, verdict };
  },

  list: () => [...sims].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  byPack: (packId: string) => sims.filter((s) => s.policyPackId === packId),
  bySubject: (subjectType: string, subjectId: string) =>
    sims.filter((s) => s.subject.subjectType === subjectType && s.subject.subjectId === subjectId),
  findById: (id: string) => sims.find((s) => s.id === id) || null
};
