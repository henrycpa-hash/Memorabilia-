import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import {
  evaluateRelease,
  type PrivacyClass,
  type PrivacyPolicyRule,
  type ReleaseDecision
} from "@crownx-jewel/shared-privacy";

const privacyBase = () => process.env.PRIVACY_GOVERNANCE_SERVICE_URL || "http://localhost:4049";

export type PrivacyComputeJobType =
  | "secure_aggregate"
  | "noisy_count"
  | "differential_release"
  | "federated_benchmark"
  | "k_anon_check";

export type PrivacyComputeJobStatus = "queued" | "running" | "completed" | "released" | "blocked" | "failed";

export type MetricSet = {
  metricKey: string;
  cohortSize: number;
  /** Raw aggregate value before any noise/protection. */
  rawValue: number;
  /** Optional k-anonymity for this aggregate. */
  kAnonymity?: number;
  privacyClass: PrivacyClass;
};

export type ReleaseArtifact = {
  id: string;
  computeJobId: string;
  metricKey: string;
  decision: ReleaseDecision;
  protectedValue: number | null;
  noiseAddedAbs: number;
  outputUri: string;
  createdAt: string;
};

export type PrivacyComputeJob = {
  id: string;
  jobType: PrivacyComputeJobType;
  metricSets: MetricSet[];
  /** Privacy budget — epsilon-style noise scale (lower = more noise). */
  epsilon: number;
  /** Resolved policy used by this job. */
  policyId: string | null;
  status: PrivacyComputeJobStatus;
  resultUri: string | null;
  artifacts: ReleaseArtifact[];
  createdAt: string;
  completedAt: string | null;
  errorMessage: string | null;
};

const jobs: PrivacyComputeJob[] = [];
const artifacts: ReleaseArtifact[] = [];

/**
 * Add Laplace-style noise to a numeric value. Smaller epsilon = larger noise.
 * Wave 9 implements a deterministic-seed sample; Wave 10 wires real DP libs.
 */
function addLaplaceNoise(value: number, epsilon: number, sensitivity = 1): { protected_: number; noiseAbs: number } {
  if (epsilon <= 0) return { protected_: value, noiseAbs: 0 };
  // Pseudorandom but deterministic based on value+epsilon for repeatability in tests
  const seed = Math.abs(Math.sin(value * 1000 + epsilon * 7919));
  const u = seed - 0.5;
  const noise = -(sensitivity / epsilon) * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  return { protected_: Math.round(value + noise), noiseAbs: Math.abs(Math.round(noise)) };
}

async function fetchOk<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

export const privacyComputeService = {
  async submitJob(input: {
    jobType: PrivacyComputeJobType;
    metricSets: MetricSet[];
    epsilon?: number;
    policyId?: string;
    /** When provided, the job resolves a tenant-scoped policy from privacy-governance-service. */
    scopeType?: "platform" | "tenant" | "partner";
    scopeId?: string;
  }): Promise<PrivacyComputeJob> {
    const job: PrivacyComputeJob = {
      id: newId(),
      jobType: input.jobType,
      metricSets: input.metricSets,
      epsilon: input.epsilon ?? 1.0,
      policyId: input.policyId || null,
      status: "running",
      resultUri: null,
      artifacts: [],
      createdAt: nowIso(),
      completedAt: null,
      errorMessage: null
    };
    jobs.push(job);

    // Resolve policy rules — try caller-supplied id, then scope, then platform default
    let rules: PrivacyPolicyRule[] = [];
    let policyId: string | null = job.policyId;

    if (policyId) {
      const p = await fetchOk<{ id: string; rules: PrivacyPolicyRule[] }>(`${privacyBase()}/privacy/policies/${policyId}`);
      if (p) rules = p.rules;
    } else if (input.scopeType) {
      const list = await fetchOk<Array<{ id: string; rules: PrivacyPolicyRule[]; status: string }>>(
        `${privacyBase()}/privacy/policies/by-scope/${input.scopeType}${input.scopeId ? `?scopeId=${input.scopeId}` : ""}`
      );
      const active = (list || []).find((p) => p.status === "active");
      if (active) { rules = active.rules; policyId = active.id; }
    }

    // Fallback to a sensible default if upstream unreachable
    if (rules.length === 0) {
      rules = [{
        ruleKey: "compute_default",
        description: "Default privacy-compute rule",
        minCohortSize: 5,
        kAnonymityThreshold: 3,
        maxPrivacyClass: "tenant_scoped"
      }];
    }
    job.policyId = policyId;

    let allBlocked = true;
    for (const m of job.metricSets) {
      const ranked = rules
        .map((r) => evaluateRelease({ metricKey: m.metricKey, cohortSize: m.cohortSize, kAnonymity: m.kAnonymity, privacyClass: m.privacyClass }, r))
        .sort((a, b) => severityRank(b.decision) - severityRank(a.decision));
      const top = ranked[0];

      let protectedValue: number | null = null;
      let noiseAbs = 0;
      if (top.decision === "allow") {
        const { protected_, noiseAbs: na } = addLaplaceNoise(m.rawValue, job.epsilon);
        protectedValue = protected_;
        noiseAbs = na;
        allBlocked = false;
      }

      const artifact: ReleaseArtifact = {
        id: newId(),
        computeJobId: job.id,
        metricKey: m.metricKey,
        decision: top.decision,
        protectedValue,
        noiseAddedAbs: noiseAbs,
        outputUri: `s3://crownx-privacy-compute/${job.id}/${m.metricKey}.json`,
        createdAt: nowIso()
      };
      artifacts.push(artifact);
      job.artifacts.push(artifact);
    }

    job.status = allBlocked ? "blocked" : "released";
    job.resultUri = `s3://crownx-privacy-compute/${job.id}/manifest.json`;
    job.completedAt = nowIso();

    await publishOutbox({
      id: newId(),
      eventType: "privacy.compute.completed",
      aggregateId: job.id,
      aggregateType: "privacy_compute_job",
      payload: { jobId: job.id, status: job.status, artifactCount: job.artifacts.length },
      occurredAt: nowIso()
    });

    return job;
  },

  // Read APIs
  listJobs: () => [...jobs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  findJob: (id: string) => jobs.find((j) => j.id === id) || null,
  jobsByStatus: (status: PrivacyComputeJobStatus) => jobs.filter((j) => j.status === status),
  listArtifacts: (jobId?: string) => artifacts.filter((a) => !jobId || a.computeJobId === jobId)
};

function severityRank(d: ReleaseDecision): number {
  switch (d) {
    case "deny": return 4;
    case "review_required": return 3;
    case "suppress": return 2;
    case "allow": return 1;
  }
}
